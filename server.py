import asyncio, json, os, mimetypes, sys, hashlib, secrets, time
import websockets
from websockets.http11 import Response
from websockets.datastructures import Headers
from urllib.parse import urlparse, parse_qs

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ---- In-memory data stores ----
users = {}               # username -> {password_hash, nickname, friends:[], blocked:[], pending:[]}
tokens = {}              # token -> username
messages = {}            # "user1:user2" (sorted) -> [{id, from_username, content, created_at}, ...]
next_msg_id = 1

# Game state
queues = {2: [], 4: []}
rooms = {}
next_room_id = 1
map_votes = {}
TYPE_MAP = {"state":"opponent_state","shoot":"enemy_shoot","hit":"opponent_hit","player_death":"opponent_died"}

# ---- Helpers ----
def json_response(data, status=200):
    body = json.dumps(data, ensure_ascii=False).encode()
    h = Headers({"Content-Type":"application/json; charset=utf-8", "Access-Control-Allow-Origin":"*"})
    return Response(status, "OK" if status==200 else "Error", h, body)

def get_token_user(request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        return tokens.get(token)
    return None

def make_token():
    return secrets.token_hex(32)

def chat_key(a, b):
    return ":".join(sorted([a, b]))

# ---- HTTP processing ----
async def process_request(connection, request):
    try:
        path = request.path.split("?")[0]
        method = request.method

        if path == "/version":
            return Response(200,"OK",Headers({"Content-Type":"text/plain"}),b"game3-server 2p4p")
        if path in ("/game",):
            return None

        # ---- API endpoints ----
        if path.startswith("/api/"):
            # GET /api/...
            if method == "GET":
                qs = parse_qs(urlparse(request.path).query)
                if path == "/api/friends/list":
                    u = get_token_user(request)
                    if not u: return json_response({"error":"not authenticated"}, 401)
                    user = users.get(u)
                    flist = []
                    for f in (user.get("friends") or []):
                        fu = users.get(f)
                        flist.append({"username":f,"nickname":fu.get("nickname",f) if fu else f,"online":f in tokens.values()})
                    return json_response(flist)

                if path == "/api/friends/requests":
                    u = get_token_user(request)
                    if not u: return json_response({"error":"not authenticated"}, 401)
                    user = users.get(u, {})
                    reqs = []
                    for r in (user.get("pending") or []):
                        ru = users.get(r)
                        reqs.append({"username":r,"nickname":ru.get("nickname",r) if ru else r})
                    return json_response(reqs)

                if path == "/api/friends/blacklist":
                    u = get_token_user(request)
                    if not u: return json_response({"error":"not authenticated"}, 401)
                    user = users.get(u, {})
                    return json_response(user.get("blocked", []))

                if path == "/api/users/search":
                    u = get_token_user(request)
                    if not u: return json_response({"error":"not authenticated"}, 401)
                    q = qs.get("q", [""])[0].lower()
                    results = []
                    for uname, data in users.items():
                        if q in uname.lower() or q in data.get("nickname","").lower():
                            if uname != u:
                                results.append({"username":uname,"nickname":data.get("nickname",uname)})
                    return json_response(results[:20])

                if path == "/api/profile":
                    u = get_token_user(request)
                    if not u: return json_response({"error":"not authenticated"}, 401)
                    user = users.get(u, {})
                    return json_response({"username":u,"nickname":user.get("nickname",u)})

                if path == "/api/team/status":
                    return json_response({"inTeam":False})

                if path == "/api/chat/messages":
                    u = get_token_user(request)
                    if not u: return json_response({"error":"not authenticated"}, 401)
                    friend = qs.get("friend", [""])[0]
                    after = int(qs.get("after", ["0"])[0])
                    if not friend: return json_response({"error":"no friend specified"}, 400)
                    key = chat_key(u, friend)
                    msgs = messages.get(key, [])
                    filtered = [m for m in msgs if m["id"] > after]
                    return json_response({"messages": filtered})

            # POST /api/...
            if method == "POST":
                raw = (await request.body).decode()
                try: body = json.loads(raw)
                except: body = {}

                # Auth endpoints (no token required)
                if path == "/api/register":
                    uname = (body.get("username") or "").strip()
                    pwd = body.get("password") or ""
                    if not uname or not pwd:
                        return json_response({"error":"請填寫帳號密碼"}, 400)
                    if uname in users:
                        return json_response({"error":"帳號已存在"}, 400)
                    users[uname] = {
                        "password_hash": hashlib.sha256(pwd.encode()).hexdigest(),
                        "nickname": uname,
                        "friends": [],
                        "blocked": [],
                        "pending": []
                    }
                    token = make_token()
                    tokens[token] = uname
                    print(f"[AUTH] register: {uname}")
                    return json_response({"token":token,"username":uname})

                if path == "/api/login":
                    uname = (body.get("username") or "").strip()
                    pwd = body.get("password") or ""
                    user = users.get(uname)
                    if not user or user["password_hash"] != hashlib.sha256(pwd.encode()).hexdigest():
                        return json_response({"error":"帳號或密碼錯誤"}, 401)
                    # Remove old token for this user
                    for t, u2 in list(tokens.items()):
                        if u2 == uname:
                            del tokens[t]
                            break
                    token = make_token()
                    tokens[token] = uname
                    print(f"[AUTH] login: {uname}")
                    return json_response({"token":token,"username":uname})

                if path == "/api/auth/google":
                    return json_response({"error":"Google auth not supported"}, 400)

                # Endpoints requiring auth
                u = get_token_user(request)
                if not u: return json_response({"error":"not authenticated"}, 401)

                if path == "/api/setname":
                    nm = (body.get("nickname") or "").strip()
                    if nm:
                        users[u]["nickname"] = nm
                    return json_response({"success":True})

                if path == "/api/friends/request":
                    target = body.get("friendUsername")
                    if not target: return json_response({"error":"no target"}, 400)
                    if target == u: return json_response({"error":"不能加自己為好友"}, 400)
                    if target not in users: return json_response({"error":"用戶不存在"}, 404)
                    if target in (users[u].get("friends") or []): return json_response({"error":"已是好友"}, 400)
                    if target in (users[u].get("blocked") or []): return json_response({"error":"已封鎖該用戶"}, 400)
                    # Add to target's pending list
                    if "pending" not in users[target]:
                        users[target]["pending"] = []
                    if u not in users[target]["pending"]:
                        users[target]["pending"].append(u)
                    return json_response({"success":True})

                if path == "/api/friends/accept":
                    target = body.get("friendUsername")
                    if not target: return json_response({"error":"no target"}, 400)
                    user = users[u]
                    pending = user.get("pending", [])
                    if target not in pending: return json_response({"error":"沒有此請求"}, 400)
                    user["pending"] = [p for p in pending if p != target]
                    if "friends" not in user: user["friends"] = []
                    if target not in user["friends"]: user["friends"].append(target)
                    if "friends" not in users[target]: users[target]["friends"] = []
                    if u not in users[target]["friends"]: users[target]["friends"].append(u)
                    return json_response({"success":True})

                if path == "/api/friends/reject":
                    target = body.get("friendUsername")
                    if not target: return json_response({"error":"no target"}, 400)
                    user = users[u]
                    user["pending"] = [p for p in user.get("pending", []) if p != target]
                    return json_response({"success":True})

                if path == "/api/friends/remove":
                    target = body.get("friendUsername")
                    if not target: return json_response({"error":"no target"}, 400)
                    user = users[u]
                    user["friends"] = [f for f in user.get("friends", []) if f != target]
                    if target in users:
                        users[target]["friends"] = [f for f in users[target].get("friends", []) if f != u]
                    return json_response({"success":True})

                if path == "/api/friends/block":
                    target = body.get("friendUsername")
                    if not target: return json_response({"error":"no target"}, 400)
                    user = users[u]
                    user["friends"] = [f for f in user.get("friends", []) if f != target]
                    if "blocked" not in user: user["blocked"] = []
                    if target not in user["blocked"]: user["blocked"].append(target)
                    if target in users:
                        users[target]["friends"] = [f for f in users[target].get("friends", []) if f != u]
                    return json_response({"success":True})

                if path == "/api/friends/unblock":
                    target = body.get("friendUsername")
                    if not target: return json_response({"error":"no target"}, 400)
                    user = users[u]
                    user["blocked"] = [b for b in user.get("blocked", []) if b != target]
                    return json_response({"success":True})

                if path == "/api/team/ping":
                    return json_response({"success":True})

                if path == "/api/team/leave":
                    return json_response({"success":True})

                if path == "/api/team/invite":
                    return json_response({"error":"team not implemented"}, 400)

                if path == "/api/chat/read":
                    friend = body.get("friend")
                    if friend:
                        key = chat_key(u, friend)
                        if key not in messages:
                            messages[key] = []
                    return json_response({"success":True})

                if path == "/api/chat/send":
                    to = body.get("to")
                    content = (body.get("content") or "").strip()
                    if not to or not content:
                        return json_response({"error":"missing fields"}, 400)
                    if to not in users:
                        return json_response({"error":"用戶不存在"}, 404)
                    key = chat_key(u, to)
                    if key not in messages:
                        messages[key] = []
                    global next_msg_id
                    msg = {"id": next_msg_id, "from_username": u, "content": content, "created_at": time.time()}
                    next_msg_id += 1
                    messages[key].append(msg)
                    # Keep only last 200 messages per conversation
                    if len(messages[key]) > 200:
                        messages[key] = messages[key][-200:]
                    return json_response({"success":True})

                return json_response({"error":"unknown endpoint"}, 404)

            return json_response({"error":"unsupported method"}, 405)

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
        return json_response({"error":f"Server error: {ex}"}, 500)

# ---- WebSocket handler (unchanged) ----
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
            map_votes[rid] = []
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
        msg_dict.pop("targetPlayerId", None)
        for tp in rooms[rid]:
            if tp is not sender and tp.get("player_id") == target_id:
                await send_to(tp, msg_dict)
    else:
        for tp in rooms[rid]:
            if tp is not sender:
                await send_to(tp, msg_dict)

def alive_transport(tp):
    try: return tp["player"].state.name == "OPEN"
    except: return False

async def resolve_map_vote(room_id):
    if room_id not in map_votes: return
    votes = map_votes[room_id]
    room = rooms.get(room_id)
    if not room or len(votes) < len(room): return
    unique = list(set(votes))
    if len(unique) == 1:
        final_map = unique[0]
    elif len(room) == 2:
        final_map = unique[int(__import__('random').random() * len(unique))]
    else:
        counts = {}
        for v in votes: counts[v] = counts.get(v, 0) + 1
        max_count = max(counts.values())
        top_maps = [m for m, c in counts.items() if c == max_count]
        final_map = top_maps[0] if len(top_maps) == 1 else top_maps[int(__import__('random').random() * len(top_maps))]
    print(f"[ROOM] map result roomId={room_id} map={final_map} votes={votes}")
    del map_votes[room_id]
    for tp in room:
        await send_to(tp, {"type":"map_result","map":final_map,"votes":votes})

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
            elif mt == "map_vote":
                rid = tp.get("room_id")
                if rid and rid in map_votes:
                    map_votes[rid].append(msg.get("map", "base"))
                    print(f"[VOTE] roomId={rid} playerId={tp.get('player_id')} map={msg.get('map')}")
                    asyncio.ensure_future(resolve_map_vote(rid))
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
            map_votes.pop(rid, None)
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
