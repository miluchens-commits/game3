import asyncio, json, os, mimetypes
import websockets
from websockets.http11 import Response
from websockets.datastructures import Headers

# Shared game state
queue = []          # list of transport dicts: {type, player, room_id}
rooms = {}          # room_id -> {p1: tp, p2: tp}
next_room_id = 1
http_buf = {}       # client_id -> list of pending msg dicts
TYPE_MAP = {"state":"opponent_state","shoot":"enemy_shoot","hit":"opponent_hit","player_death":"opponent_died"}

async def send_to(tp, msg_dict):
    raw = json.dumps(msg_dict, ensure_ascii=False)
    if tp["type"] == "ws":
        try:
            await tp["player"].send(raw)
        except Exception:
            pass
    else:
        http_buf.setdefault(tp["player"], []).append(msg_dict)

async def try_match():
    while len(queue) >= 2:
        p1, p2 = queue.pop(0), queue.pop(0)
        def alive(tp):
            if tp["type"] == "ws":
                try: return tp["player"].state.name == "OPEN"
                except: return False
            return True
        a1, a2 = alive(p1), alive(p2)
        if not a1 and not a2: continue
        if not a1: queue.insert(0, p2); continue
        if not a2: queue.insert(0, p1); continue
        global next_room_id
        rid = next_room_id; next_room_id += 1
        rooms[rid] = {"p1": p1, "p2": p2}
        p1["room_id"] = rid; p2["room_id"] = rid
        m = {"type":"match_found","roomId":rid,"opponent":"u5c0du624b"}
        print(f"[ROOM] 配對成功 roomId={rid}")
        await send_to(p1, m); await send_to(p2, m)

async def relay(sender, msg_dict):
    rid = sender.get("room_id")
    if not rid or rid not in rooms: return
    room = rooms[rid]
    opp = room["p2"] if sender is room["p1"] else room["p1"]
    await send_to(opp, msg_dict)

# ---- HTTP processing ----

async def process_request(connection, request):
    try:
        path = request.path.split("?")[0]
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
    queue.append(tp)
    addr = ws.remote_address
    print(f"[WS] 連線: {addr}")
    try:
        await ws.send(json.dumps({"type":"in_queue","position":len(queue)}))
    except Exception:
        pass
    asyncio.ensure_future(try_match())
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            mt = msg.get("type")
            if mt in TYPE_MAP:
                msg["type"] = TYPE_MAP[mt]
                await relay(tp, msg)
            elif mt == "leave_queue":
                try: queue.remove(tp)
                except ValueError: pass
                try: await ws.send(json.dumps({"type":"queue_left"}))
                except: pass
    finally:
        print(f"[WS] 斷線: {addr}")
        try: queue.remove(tp)
        except ValueError: pass
        rid = tp.get("room_id")
        if rid and rid in rooms:
            room = rooms[rid]
            del rooms[rid]
            opp = room["p2"] if tp["player"] is room["p1"]["player"] else room["p1"]
            print(f"[ROOM] 解散 roomId={rid}")
            await send_to(opp, {"type":"opponent_disconnected"})

async def main():
    port = int(os.environ.get("PORT", "3000"))
    print(f"OCGAME server running at http://0.0.0.0:{port}")
    async with websockets.serve(handler, "0.0.0.0", port, process_request=process_request):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
