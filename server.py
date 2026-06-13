import asyncio
import json
import os
import mimetypes
import websockets

queue = []
rooms = {}
next_room_id = 1

async def process_request(path, request_headers):
    if path == '/':
        path = '/index.html'
    file_path = path.lstrip('/')
    if not os.path.isfile(file_path):
        return 404, [('Content-Type', 'text/plain')], b'Not found'
    mime, _ = mimetypes.guess_type(file_path)
    with open(file_path, 'rb') as f:
        content = f.read()
    return 200, [('Content-Type', mime or 'application/octet-stream')], content

async def handler(ws):
    room_id = None

    async for raw in ws:
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            continue

        t = msg.get('type')

        if t == 'join_queue':
            await add_to_queue(ws)

        elif t == 'leave_queue':
            remove_from_queue(ws)
            await ws.send(json.dumps({'type': 'queue_left'}))

        elif t == 'state':
            await relay_to_opponent(ws, room_id, {'type': 'opponent_state', 'data': msg.get('data')})

        elif t == 'shoot':
            await relay_to_opponent(ws, room_id, {
                'type': 'enemy_shoot',
                'origin': msg.get('origin'),
                'dir': msg.get('dir'),
                'gun': msg.get('gun')
            })

        elif t == 'hit':
            await relay_to_opponent(ws, room_id, {
                'type': 'opponent_hit',
                'hp': msg.get('hp'),
                'armor': msg.get('armor')
            })

        elif t == 'player_death':
            await relay_to_opponent(ws, room_id, {'type': 'opponent_died'})

    remove_from_queue(ws)
    if room_id and room_id in rooms:
        p1, p2 = rooms[room_id]
        del rooms[room_id]
        opp = p2 if ws is p1 else p1
        if opp.open:
            try:
                await opp.send(json.dumps({'type': 'opponent_disconnected'}))
            except Exception:
                pass

async def add_to_queue(ws):
    queue.append(ws)
    await ws.send(json.dumps({'type': 'in_queue', 'position': len(queue)}))
    if len(queue) >= 2:
        p1 = queue.pop(0)
        p2 = queue.pop(0)
        if p1.open and p2.open:
            await start_match(p1, p2)
        else:
            if p1.open:
                queue.insert(0, p1)
            if p2.open:
                queue.insert(0, p2)

def remove_from_queue(ws):
    try:
        queue.remove(ws)
    except ValueError:
        pass

async def start_match(p1, p2):
    global next_room_id
    room_id = next_room_id
    next_room_id += 1
    rooms[room_id] = (p1, p2)
    p1.room_id = room_id
    p2.room_id = room_id
    await p1.send(json.dumps({'type': 'match_found', 'roomId': room_id, 'opponent': 'Opponent'}))
    await p2.send(json.dumps({'type': 'match_found', 'roomId': room_id, 'opponent': 'Opponent'}))

async def relay_to_opponent(ws, room_id, msg):
    if not room_id or room_id not in rooms:
        return
    p1, p2 = rooms[room_id]
    opp = p2 if ws is p1 else p1
    if opp.open:
        try:
            await opp.send(json.dumps(msg))
        except Exception:
            pass

async def main():
    print('OCGAME server running at http://localhost:3000')
    async with websockets.serve(handler, '0.0.0.0', 3000, process_request=process_request):
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())
