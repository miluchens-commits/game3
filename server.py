import asyncio, json, os, mimetypes, sys
import websockets
from websockets.http11 import Response
from websockets.datastructures import Headers

# Ensure UTF-8 output for Render
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Shared game state
queues = {2: [], 4: []}  # mode -> list of transport dicts: {type, player, room_id, player_id}
rooms = {}               # room_id -> list of [tp, tp, ...]
next_room_id = 1
TYPE_MAP = {"state":"opponent_state","shoot":"enemy_shoot","hit":"opponent_hit","player_death":"opponent_died"}

async def send_to(tp, msg_dict):
    raw = json.dumps(msg_dict, ensure_ascii=False)
    try:
        await tp["player"].send(raw)
    except Exception:
        pass

async def try_match():
    for mode, needed in [(4, 4), (2, 2)]:
        q = queues[mode]
        while len(q) >= needed:
            players = q[:needed]
            del q[:needed]
            def alive(tp):
                try: return tp["player"].state.name == "OPEN"
                except: return False
            if not all(alive(p) for p in players):
                for p in players:
                    if alive(p):
                        queues[p.get("mode", 2)].append(p)
                continue
            global next_room_id
            rid = next_room_id; next_room_id += 1
            room = []
            for i, p in enumerate(players):
                p["room_id"] = rid
                p["player_id"] = i
                room.append(p)
            rooms[rid] = room
            for p in players:
                m = {"type":"match_found","roomId":rid,"playerCount":mode,"playerId":p["player_id"]}
                print(f"[ROOM] matched roomId={rid} playerId={p['player_id']}")
                await send_to(p, m)

async def relay(sender, msg_dict):
    rid = sender.get("room_id")
    if not rid or rid not in rooms: return
    msg_dict["playerId"] = sender["player_id"]
    target_id = msg_dict.get("targetPlayerId")
    if target_id is not None:
        # Only send to the specific target player (e.g., hit damage)
        msg_dict.pop("targetPlayerId", None)
        for tp in rooms[rid]:
            if tp is not sender and tp.get("player_id") == target_id:
                await send_to(tp, msg_dict)
    else:
        # Broadcast to all other players (state, shoot, death)
        for tp in rooms[rid]:
            if tp is not sender:
                await send_to(tp, msg_dict)

def alive_transport(tp):
    try: return tp["player"].state.name == "OPEN"
    except: return False

# ---- HTTP processing ----

async def process_request(connection, request):
    try:
        path = request.path.split("?")[0]
        print(f"[REQ] {path}")
        # Version check
        if path == "/version":
            return Response(200,"OK",Headers({"Content-Type":"text/plain"}),b"game3-server 2p4p")
        # WebSocket upgrade path
        if path in ("/game", "/api"):
            return None
        # Static files
        if path == "/":
            path = "/index.html"
        fp = path.lstrip("/")
        if os.path.isfile(fp):
            mime, _ = mimetypes.guess_type(fp)
            with open(fp, "rb") as f:
                content = f.read()
            h = Headers({"Content-Type": mime or "application/octet-stream"})
            h["Access-Control-Allow-Origin"] = "*"
            return Response(200, "OK", h, content)
        return Response(404, "Not Found", Headers({"Content-Type":"text/plain"}), b"not found")
    except Exception as ex:
        print(f"[HTTP ERROR] {type(ex).__name__}: {ex}")
        import traceback
        traceback.print_exc()
        return Response(500, "Internal Server Error", Headers({"Content-Type":"text/plain"}), f"Server error: {ex}".encode())

# ---- WebSocket handler ----

async def handler(ws):
    tp = {"type":"ws","player":ws}
    addr = ws.remote_address
    print(f"[WS] connect: {addr}")
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            mt = msg.get("type")
            if mt == "join_queue":
                mode = msg.get("mode", 2)
                if mode not in queues:
                    mode = 2
                tp["mode"] = mode
                queues[mode].append(tp)
                try:
                    pos = len(queues[mode])
                    await ws.send(json.dumps({"type":"in_queue","position":pos}))
                except Exception:
                    pass
                asyncio.ensure_future(try_match())
            elif mt in TYPE_MAP:
                msg["type"] = TYPE_MAP[mt]
                await relay(tp, msg)
            elif mt in ("round_continue", "round_quit"):
                await relay(tp, msg)
            elif mt == "leave_queue":
                mode = tp.get("mode", 2)
                try: queues[mode].remove(tp)
                except ValueError: pass
                try: await ws.send(json.dumps({"type":"queue_left"}))
                except: pass
    finally:
        print(f"[WS] disconnect: {addr}")
        mode = tp.get("mode", 2)
        try: queues[mode].remove(tp)
        except ValueError: pass
        rid = tp.get("room_id")
        if rid and rid in rooms:
            room = rooms[rid]
            del rooms[rid]
            for other in room:
                if other is not tp and alive_transport(other):
                    print(f"[ROOM] disband roomId={rid}")
                    await send_to(other, {"type":"opponent_disconnected"})

async def main():
    port = int(os.environ.get("PORT", "3000"))
    print(f"OCGAME server running on port {port}")
    async with websockets.serve(handler, "0.0.0.0", port, process_request=process_request):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
