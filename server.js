const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const JWT_SECRET = process.env.JWT_SECRET || 'ocgame_dev_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const DATABASE_URL = process.env.DATABASE_URL || '';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

let dbPool = null;
if (DATABASE_URL) {
  const { Pool } = require('pg');
  dbPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

async function initDB() {
  if (!dbPool) return;
  await dbPool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    nickname TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    picture TEXT NOT NULL DEFAULT '',
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    rank TEXT NOT NULL DEFAULT ''
  )`);
}
initDB().catch(e => console.error('DB init error:', e));

function loadDB() {
  if (dbPool) return null;
  try { return JSON.parse(fs.readFileSync('data.json', 'utf8')); } catch { return { users: [], nextId: 1 }; }
}
function saveDB(db) {
  if (dbPool) return;
  fs.writeFileSync('data.json', JSON.stringify(db, null, 2));
}

async function findUser(username) {
  if (dbPool) {
    const r = await dbPool.query('SELECT * FROM users WHERE username = $1', [username]);
    return r.rows[0] || null;
  }
  const db = loadDB();
  return db.users.find(u => u.username === username) || null;
}

async function createUser(username, password, extra) {
  extra = extra || {};
  if (dbPool) {
    const r = await dbPool.query(
      'INSERT INTO users (username, password, nickname, display_name, email, picture, xp, coins, rank) VALUES ($1,$2,$3,$4,$5,$6,0,0,\'\') RETURNING *',
      [username, password, extra.nickname || '', extra.display_name || extra.displayName || '', extra.email || '', extra.picture || '']
    );
    return r.rows[0];
  }
  const db = loadDB();
  const user = { id: db.nextId++, username, nickname: extra.nickname || '', password, xp: 0, coins: 0, rank: '' };
  if (extra.displayName) user.displayName = extra.displayName;
  if (extra.email) user.email = extra.email;
  if (extra.picture) user.picture = extra.picture;
  db.users.push(user);
  saveDB(db);
  return user;
}

async function updateUser(username, fields) {
  if (dbPool) {
    const sets = [], vals = [], i = 1;
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = $${i++}`);
      vals.push(v);
    }
    vals.push(username);
    if (sets.length) await dbPool.query(`UPDATE users SET ${sets.join(',')} WHERE username = $${i}`, vals);
    return;
  }
  const db = loadDB();
  const u = db.users.find(u => u.username === username);
  if (u) Object.assign(u, fields);
  saveDB(db);
}

// Auth
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || username.length < 2 || password.length < 4) return res.status(400).json({ error: '帳號至少2字，密碼至少4字' });
    const existing = await findUser(username);
    if (existing) return res.status(409).json({ error: '帳號已存在' });
    const hash = await bcrypt.hash(password, 6);
    const user = await createUser(username, hash);
    const token = jwt.sign({ username, userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username, picture: user.picture || '', needsName: true });
  } catch (e) { console.error('Register error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '請填寫帳號密碼' });
    const user = await findUser(username);
    if (!user) return res.status(401).json({ error: '帳號不存在' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: '密碼錯誤' });
    const token = jwt.sign({ username, userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username, picture: user.picture || '', xp: user.xp, coins: user.coins, rank: user.rank, needsName: !user.nickname });
  } catch (e) { console.error('Login error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: '未登入' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: '登入已過期' }); }
}

app.post('/api/save', auth, async (req, res) => {
  const { xp, coins, rank } = req.body;
  const fields = {};
  if (xp != null) fields.xp = xp;
  if (coins != null) fields.coins = coins;
  if (rank != null) fields.rank = rank;
  await updateUser(req.user.username, fields);
  res.json({ ok: true });
});

app.get('/api/profile', auth, async (req, res) => {
  const user = await findUser(req.user.username);
  if (!user) return res.status(404).json({ error: '找不到使用者' });
  res.json({ username: user.username, nickname: user.nickname || '', picture: user.picture || '', xp: user.xp, coins: user.coins, rank: user.rank, needsName: !user.nickname });
});

app.post('/api/setname', auth, async (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.length < 1 || nickname.length > 12) return res.status(400).json({ error: '名字長度需為1-12字' });
  const user = await findUser(req.user.username);
  if (!user) return res.status(404).json({ error: '找不到使用者' });
  if (user.nickname) return res.status(403).json({ error: '名字已設定，無法更改！' });
  const dup = await findUserByNickname(nickname);
  if (dup) return res.status(409).json({ error: '此名稱已被其他玩家使用' });
  await updateUser(req.user.username, { nickname });
  res.json({ ok: true, nickname });
});

async function findUserByNickname(nickname) {
  if (dbPool) {
    const r = await dbPool.query('SELECT * FROM users WHERE LOWER(nickname) = LOWER($1) AND nickname != \'\'', [nickname]);
    return r.rows[0] || null;
  }
  const db = loadDB();
  return db.users.find(u => u.nickname && u.nickname.toLowerCase() === nickname.toLowerCase()) || null;
}

// Google login
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: '缺少憑證' });
  if (!googleClient) return res.status(500).json({ error: 'Google 登入未設定（缺少 GOOGLE_CLIENT_ID）' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const gid = payload.sub, email = payload.email || gid, name = payload.name || email, picture = payload.picture || '';
    let user = await findUser('g_' + gid);
    if (!user) {
      const extra = { displayName: name, email, picture };
      user = await createUser('g_' + gid, '', extra);
    } else if (picture && user.picture !== picture) {
      await updateUser(user.username, { picture });
    }
    const token = jwt.sign({ username: user.username, userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username: user.username, picture: user.picture || '', xp: user.xp, coins: user.coins, rank: user.rank, needsName: !user.nickname });
  } catch (e) {
    console.error('Google auth error:', e);
    res.status(401).json({ error: 'Google 驗證失敗' });
  }
});

// WebSocket multiplayer (unchanged)
const queue = [];
const rooms = {};
let nextRoomId = 1;

wss.on('connection', (ws) => {
  ws.playerData = null; ws.roomId = null;
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case 'join_queue': ws.playerData = { name: msg.name || 'Player' }; addToQueue(ws); break;
      case 'leave_queue': removeFromQueue(ws); ws.send(JSON.stringify({ type: 'queue_left' })); break;
      case 'state': relayToOpponent(ws, { type: 'opponent_state', data: msg.data }); break;
      case 'shoot': relayToOpponent(ws, { type: 'enemy_shoot', origin: msg.origin, dir: msg.dir, gun: msg.gun }); break;
      case 'hit': relayToOpponent(ws, { type: 'opponent_hit', hp: msg.hp, armor: msg.armor }); break;
      case 'player_death': relayToOpponent(ws, { type: 'opponent_died' }); break;
      case 'round_clear': relayToOpponent(ws, { type: 'opponent_cleared', roundNum: msg.roundNum }); break;
    }
  });
  ws.on('close', () => handleDisconnect(ws));
});

function addToQueue(ws) {
  queue.push(ws);
  ws.send(JSON.stringify({ type: 'in_queue', position: queue.length }));
  if (queue.length >= 2) {
    const p1 = queue.shift(), p2 = queue.shift();
    if (p1.readyState === WebSocket.OPEN && p2.readyState === WebSocket.OPEN) startMatch(p1, p2);
    else { if (p1.readyState === WebSocket.OPEN) queue.unshift(p1); if (p2.readyState === WebSocket.OPEN) queue.unshift(p2); }
  }
}
function removeFromQueue(ws) { const i = queue.indexOf(ws); if (i !== -1) queue.splice(i, 1); }
function startMatch(p1, p2) {
  const rid = nextRoomId++; rooms[rid] = { p1, p2 }; p1.roomId = rid; p2.roomId = rid;
  p1.send(JSON.stringify({ type: 'match_found', roomId: rid, opponent: p2.playerData.name }));
  p2.send(JSON.stringify({ type: 'match_found', roomId: rid, opponent: p1.playerData.name }));
}
function relayToOpponent(ws, msg) {
  const room = rooms[ws.roomId]; if (!room) return;
  const opp = room.p1 === ws ? room.p2 : room.p1;
  if (opp.readyState === WebSocket.OPEN) opp.send(JSON.stringify(msg));
}
function handleDisconnect(ws) {
  removeFromQueue(ws);
  if (ws.roomId && rooms[ws.roomId]) { const room = rooms[ws.roomId]; const opp = room.p1 === ws ? room.p2 : room.p1; delete rooms[ws.roomId]; if (opp.readyState === WebSocket.OPEN) opp.send(JSON.stringify({ type: 'opponent_disconnected' })); }
}

process.on('uncaughtException', e => console.error('Uncaught:', e));
process.on('unhandledRejection', e => console.error('Unhandled:', e));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('OCGAME server running on port ' + PORT));
