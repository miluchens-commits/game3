const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OCGAME Multiplayer Server\n');
});

const wss = new WebSocket.Server({ server });
const queue = [];
const rooms = {};
let nextRoomId = 1;

wss.on('connection', (ws) => {
  ws.playerData = null;
  ws.roomId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    switch (msg.type) {
      case 'join_queue':
        ws.playerData = { name: msg.name || 'Player' };
        addToQueue(ws);
        break;

      case 'leave_queue':
        removeFromQueue(ws);
        ws.send(JSON.stringify({ type: 'queue_left' }));
        break;

      case 'state':
        relayToOpponent(ws, { type: 'opponent_state', data: msg.data });
        break;

      case 'shoot':
        relayToOpponent(ws, { type: 'enemy_shoot', origin: msg.origin, dir: msg.dir, gun: msg.gun });
        break;

      case 'hit':
        relayToOpponent(ws, { type: 'opponent_hit', hp: msg.hp, armor: msg.armor });
        break;

      case 'player_death':
        relayToOpponent(ws, { type: 'opponent_died' });
        break;

      case 'round_clear':
        relayToOpponent(ws, { type: 'opponent_cleared', roundNum: msg.roundNum });
        break;
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function addToQueue(ws) {
  queue.push(ws);
  ws.send(JSON.stringify({ type: 'in_queue', position: queue.length }));
  if (queue.length >= 2) {
    const p1 = queue.shift();
    const p2 = queue.shift();
    if (p1.readyState === WebSocket.OPEN && p2.readyState === WebSocket.OPEN) {
      startMatch(p1, p2);
    } else {
      if (p1.readyState === WebSocket.OPEN) queue.unshift(p1);
      if (p2.readyState === WebSocket.OPEN) queue.unshift(p2);
    }
  }
}

function removeFromQueue(ws) {
  const idx = queue.indexOf(ws);
  if (idx !== -1) queue.splice(idx, 1);
}

function startMatch(p1, p2) {
  const roomId = nextRoomId++;
  rooms[roomId] = { p1, p2 };
  p1.roomId = roomId; p2.roomId = roomId;
  p1.playerData.opponent = 'Opponent';
  p2.playerData.opponent = 'Opponent';
  p1.send(JSON.stringify({ type: 'match_found', roomId, opponent: p2.playerData.name }));
  p2.send(JSON.stringify({ type: 'match_found', roomId, opponent: p1.playerData.name }));
}

function relayToOpponent(ws, msg) {
  const room = rooms[ws.roomId];
  if (!room) return;
  const opponent = room.p1 === ws ? room.p2 : room.p1;
  if (opponent.readyState === WebSocket.OPEN) {
    opponent.send(JSON.stringify(msg));
  }
}

function handleDisconnect(ws) {
  removeFromQueue(ws);
  if (ws.roomId && rooms[ws.roomId]) {
    const room = rooms[ws.roomId];
    const opponent = room.p1 === ws ? room.p2 : room.p1;
    delete rooms[ws.roomId];
    if (opponent.readyState === WebSocket.OPEN) {
      opponent.send(JSON.stringify({ type: 'opponent_disconnected' }));
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('OCGAME server running on port ' + PORT);
});
