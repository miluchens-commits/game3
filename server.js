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
app.get('/favicon.ico', (req, res) => res.status(204).end());

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
    rank TEXT NOT NULL DEFAULT '',
    last_read INTEGER NOT NULL DEFAULT 0
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    friend_username TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(username, friend_username)
  )`);
  await dbPool.query(`CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    from_username TEXT NOT NULL,
    to_username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await dbPool.query(`CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_username, to_username)`);
  // Migration: add columns that may not exist on older schemas
  for (const col of ['last_read']) {
    try { await dbPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} INTEGER NOT NULL DEFAULT 0`); } catch(e) {}
  }
}
initDB().catch(e => console.error('DB init error:', e));

function loadDB() {
  if (dbPool) return null;
  try { const d = JSON.parse(fs.readFileSync('data.json', 'utf8')); if (!d.friends) d.friends = []; if (!d.messages) d.messages = []; return d; } catch { return { users: [], friends: [], messages: [], nextId: 1 }; }
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
    const sets = [], vals = []; let i = 1;
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
  try {
    const { xp, coins, rank } = req.body;
    const fields = {};
    if (xp != null) fields.xp = xp;
    if (coins != null) fields.coins = coins;
    if (rank != null) fields.rank = rank;
    await updateUser(req.user.username, fields);
    res.json({ ok: true });
  } catch (e) { console.error('Save error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.get('/api/profile', auth, async (req, res) => {
  try {
    const user = await findUser(req.user.username);
    if (!user) return res.status(404).json({ error: '找不到使用者' });
    res.json({ username: user.username, nickname: user.nickname || '', picture: user.picture || '', xp: user.xp, coins: user.coins, rank: user.rank, needsName: !user.nickname });
  } catch (e) { console.error('Profile error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/setname', auth, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.length < 1 || nickname.length > 12) return res.status(400).json({ error: '名字長度需為1-12字' });
    const user = await findUser(req.user.username);
    if (!user) return res.status(404).json({ error: '找不到使用者' });
    if (user.nickname) return res.status(403).json({ error: '名字已設定，無法更改！' });
    const dup = await findUserByNickname(nickname);
    if (dup) return res.status(409).json({ error: '此名稱已被其他玩家使用' });
    await updateUser(req.user.username, { nickname });
    res.json({ ok: true, nickname });
  } catch (e) { console.error('Setname error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

// Friends helpers
async function findFriend(username, friendUsername) {
  if (dbPool) {
    const r = await dbPool.query('SELECT * FROM friends WHERE username = $1 AND friend_username = $2', [username, friendUsername]);
    return r.rows[0] || null;
  }
  const db = loadDB();
  return (db.friends || []).find(f => f.username === username && f.friend_username === friendUsername) || null;
}
async function addFriendRecord(username, friendUsername, status) {
  if (dbPool) {
    await dbPool.query('INSERT INTO friends (username, friend_username, status) VALUES ($1,$2,$3) ON CONFLICT (username, friend_username) DO UPDATE SET status = $3', [username, friendUsername, status]);
    return;
  }
  const db = loadDB();
  if (!db.friends) db.friends = [];
  const existing = db.friends.findIndex(f => f.username === username && f.friend_username === friendUsername);
  if (existing !== -1) db.friends[existing].status = status;
  else db.friends.push({ username, friend_username: friendUsername, status, created_at: new Date().toISOString() });
  saveDB(db);
}
async function removeFriendRecord(username, friendUsername) {
  if (dbPool) {
    await dbPool.query('DELETE FROM friends WHERE (username = $1 AND friend_username = $2) OR (username = $2 AND friend_username = $1)', [username, friendUsername]);
    return;
  }
  const db = loadDB();
  if (!db.friends) return;
  db.friends = db.friends.filter(f => !((f.username === username && f.friend_username === friendUsername) || (f.username === friendUsername && f.friend_username === username)));
  saveDB(db);
}
async function getFriends(username, status) {
  if (dbPool) {
    const r = await dbPool.query('SELECT * FROM friends WHERE (username = $1 OR friend_username = $1) AND status = $2', [username, status]);
    return r.rows;
  }
  const db = loadDB();
  return (db.friends || []).filter(f => (f.username === username || f.friend_username === username) && f.status === status);
}
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

// Friends API
app.get('/api/users/search', auth, async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json({ users: [] });
    let users;
    if (dbPool) {
      const r = await dbPool.query('SELECT username, nickname FROM users WHERE LOWER(nickname) LIKE LOWER($1) AND nickname != \'\' AND username != $2 LIMIT 20', ['%' + q + '%', req.user.username]);
      users = r.rows;
    } else {
      const db = loadDB();
      users = db.users.filter(u => u.nickname && u.nickname.toLowerCase().includes(q.toLowerCase()) && u.username !== req.user.username).slice(0, 20).map(u => ({ username: u.username, nickname: u.nickname }));
    }
    // Check friendship status for each result
    const enriched = await Promise.all(users.map(async (u) => {
      const f1 = await findFriend(req.user.username, u.username);
      const f2 = await findFriend(u.username, req.user.username);
      let status = '';
      if (f1 && f1.status === 'blocked') status = 'blocked';
      else if (f2 && f2.status === 'blocked') status = 'blocked';
      else if (f1 && f1.status === 'accepted') status = 'friend';
      else if (f2 && f2.status === 'accepted') status = 'friend';
      else if (f1 && f1.status === 'pending') status = 'pending';
      else if (f2 && f2.status === 'pending') status = 'pending';
      return { username: u.username, nickname: u.nickname, status };
    }));
    res.json({ users: enriched });
  } catch (e) { console.error('Search error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/friends/request', auth, async (req, res) => {
  try {
    const { friendUsername } = req.body;
    if (!friendUsername || friendUsername === req.user.username) return res.status(400).json({ error: '無效的使用者' });
    const friend = await findUser(friendUsername);
    if (!friend) return res.status(404).json({ error: '找不到該玩家' });
    // Check if already blocked
    const f1 = await findFriend(req.user.username, friendUsername);
    const f2 = await findFriend(friendUsername, req.user.username);
    if (f2 && f2.status === 'blocked') return res.status(403).json({ error: '對方已將你封鎖' });
    if (f1 && f1.status === 'blocked') return res.status(400).json({ error: '你已封鎖該玩家' });
    if (f1 && f1.status === 'accepted') return res.status(400).json({ error: '已經是好友' });
    if (f1 && f1.status === 'pending') return res.status(400).json({ error: '已發送過邀請' });
    await addFriendRecord(req.user.username, friendUsername, 'pending');
    res.json({ ok: true });
  } catch (e) { console.error('Friend request error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.get('/api/friends/list', auth, async (req, res) => {
  try {
    const rows = await getFriends(req.user.username, 'accepted');
    const friends = rows.map(r => {
      const isMe = r.username === req.user.username;
      const friendUser = isMe ? r.friend_username : r.username;
      return { username: friendUser, nickname: '' };
    });
    // Get nicknames and online status for friends
    const enriched = await Promise.all(friends.map(async (f) => {
      const u = await findUser(f.username);
      return { username: f.username, nickname: u ? (u.nickname || u.username) : f.username, online: onlineUsers.has(u ? u.username : f.username) };
    }));
    res.json({ friends: enriched });
  } catch (e) { console.error('Friend list error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.get('/api/friends/requests', auth, async (req, res) => {
  try {
    let incoming = [], outgoing = [];
    if (dbPool) {
      const inR = await dbPool.query('SELECT * FROM friends WHERE friend_username = $1 AND status = $2', [req.user.username, 'pending']);
      incoming = inR.rows;
      const outR = await dbPool.query('SELECT * FROM friends WHERE username = $1 AND status = $2', [req.user.username, 'pending']);
      outgoing = outR.rows;
    } else {
      const db = loadDB();
      const all = db.friends || [];
      incoming = all.filter(f => f.friend_username === req.user.username && f.status === 'pending');
      outgoing = all.filter(f => f.username === req.user.username && f.status === 'pending');
    }
    const inEnriched = await Promise.all(incoming.map(async (f) => {
      const u = await findUser(f.username);
      return { username: f.username, nickname: u ? (u.nickname || u.username) : f.username };
    }));
    const outEnriched = await Promise.all(outgoing.map(async (f) => {
      const u = await findUser(f.friend_username);
      return { username: f.friend_username, nickname: u ? (u.nickname || u.friend_username) : f.friend_username };
    }));
    res.json({ incoming: inEnriched, outgoing: outEnriched });
  } catch (e) { console.error('Friend requests error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/friends/accept', auth, async (req, res) => {
  try {
    const { friendUsername } = req.body;
    if (!friendUsername) return res.status(400).json({ error: '缺少參數' });
    const f = await findFriend(friendUsername, req.user.username);
    if (!f || f.status !== 'pending') return res.status(400).json({ error: '沒有待處理的邀請' });
    await addFriendRecord(friendUsername, req.user.username, 'accepted');
    res.json({ ok: true });
  } catch (e) { console.error('Friend accept error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/friends/reject', auth, async (req, res) => {
  try {
    const { friendUsername } = req.body;
    if (!friendUsername) return res.status(400).json({ error: '缺少參數' });
    await removeFriendRecord(friendUsername, req.user.username);
    res.json({ ok: true });
  } catch (e) { console.error('Friend reject error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/friends/remove', auth, async (req, res) => {
  try {
    const { friendUsername } = req.body;
    if (!friendUsername) return res.status(400).json({ error: '缺少參數' });
    await removeFriendRecord(req.user.username, friendUsername);
    res.json({ ok: true });
  } catch (e) { console.error('Friend remove error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.get('/api/friends/blacklist', auth, async (req, res) => {
  try {
    let blocked;
    if (dbPool) {
      const r = await dbPool.query('SELECT * FROM friends WHERE username = $1 AND status = $2', [req.user.username, 'blocked']);
      blocked = r.rows;
    } else {
      const db = loadDB();
      blocked = (db.friends || []).filter(f => f.username === req.user.username && f.status === 'blocked');
    }
    const enriched = await Promise.all(blocked.map(async (f) => {
      const u = await findUser(f.friend_username);
      return { username: f.friend_username, nickname: u ? (u.nickname || u.friend_username) : f.friend_username };
    }));
    res.json({ blacklist: enriched });
  } catch (e) { console.error('Blacklist error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/friends/block', auth, async (req, res) => {
  try {
    const { friendUsername } = req.body;
    if (!friendUsername || friendUsername === req.user.username) return res.status(400).json({ error: '無效的使用者' });
    const friend = await findUser(friendUsername);
    if (!friend) return res.status(404).json({ error: '找不到該玩家' });
    await addFriendRecord(req.user.username, friendUsername, 'blocked');
    // Also remove any existing request from either side
    await removeFriendRecord(friendUsername, req.user.username);
    res.json({ ok: true });
  } catch (e) { console.error('Block error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/friends/unblock', auth, async (req, res) => {
  try {
    const { friendUsername } = req.body;
    if (!friendUsername) return res.status(400).json({ error: '缺少參數' });
    await removeFriendRecord(req.user.username, friendUsername);
    res.json({ ok: true });
  } catch (e) { console.error('Unblock error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

// Chat API
async function saveMessage(from, to, content) {
  if (dbPool) {
    await dbPool.query('INSERT INTO messages (from_username, to_username, content) VALUES ($1,$2,$3)', [from, to, content]);
    return;
  }
  const db = loadDB();
  if (!db.messages) db.messages = [];
  db.messages.push({ id: Date.now(), from_username: from, to_username: to, content, created_at: new Date().toISOString() });
  saveDB(db);
}
async function getMessages(user1, user2, afterId) {
  if (dbPool) {
    let query = 'SELECT * FROM messages WHERE ((from_username = $1 AND to_username = $2) OR (from_username = $2 AND to_username = $1))';
    const params = [user1, user2];
    if (afterId > 0) { query += ' AND id > $3'; params.push(afterId); }
    query += ' ORDER BY id ASC LIMIT 100';
    const r = await dbPool.query(query, params);
    return r.rows;
  }
  const db = loadDB();
  const msgs = (db.messages || []).filter(m =>
    (m.from_username === user1 && m.to_username === user2) ||
    (m.from_username === user2 && m.to_username === user1)
  );
  if (afterId > 0) return msgs.filter(m => m.id > afterId).sort((a, b) => a.id - b.id).slice(0, 100);
  return msgs.sort((a, b) => a.id - b.id).slice(0, 100);
}

app.post('/api/chat/send', auth, async (req, res) => {
  try {
    const { to, content } = req.body;
    if (!to || !content || content.length > 500) return res.status(400).json({ error: '訊息無效' });
    const friend = await findUser(to);
    if (!friend) return res.status(404).json({ error: '找不到該玩家' });
    await saveMessage(req.user.username, to, content);
    res.json({ ok: true });
  } catch (e) { console.error('Chat send error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.get('/api/chat/messages', auth, async (req, res) => {
  try {
    const friend = req.query.friend;
    const after = parseInt(req.query.after) || 0;
    if (!friend) return res.status(400).json({ error: '缺少參數' });
    const msgs = await getMessages(req.user.username, friend, after);
    res.json({ messages: msgs });
  } catch (e) { console.error('Chat messages error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.get('/api/chat/unread', auth, async (req, res) => {
  try {
    let unread = {};
    if (dbPool) {
      const r = await dbPool.query(
        'SELECT from_username, COUNT(*) as cnt FROM messages WHERE to_username = $1 AND id > COALESCE((SELECT last_read FROM users WHERE username = $1), 0) GROUP BY from_username',
        [req.user.username]
      );
      r.rows.forEach(row => { unread[row.from_username] = parseInt(row.cnt); });
    } else {
      const db = loadDB();
      const user = db.users.find(u => u.username === req.user.username);
      const lastRead = (user && user.last_read_msg) || 0;
      (db.messages || []).forEach(m => {
        if (m.to_username === req.user.username && m.id > lastRead) {
          unread[m.from_username] = (unread[m.from_username] || 0) + 1;
        }
      });
    }
    res.json({ unread });
  } catch (e) { console.error('Chat unread error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/chat/read', auth, async (req, res) => {
  try {
    const { friend } = req.body;
    if (!friend) return res.status(400).json({ error: '缺少參數' });
    // Mark messages from this friend as read by updating last_read timestamp
    if (dbPool) {
      await dbPool.query('UPDATE users SET last_read = (SELECT COALESCE(MAX(id),0) FROM messages WHERE from_username = $1 AND to_username = $2) WHERE username = $2', [friend, req.user.username]);
    } else {
      const db = loadDB();
      const user = db.users.find(u => u.username === req.user.username);
      if (user) {
        const msgs = (db.messages || []).filter(m => m.from_username === friend && m.to_username === req.user.username);
        const maxId = msgs.reduce((max, m) => Math.max(max, m.id), 0);
        user.last_read_msg = maxId;
        saveDB(db);
      }
    }
    res.json({ ok: true });
  } catch (e) { console.error('Chat read error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

// Team API
app.post('/api/team/invite', auth, async (req, res) => {
  try {
    const { friendUsername } = req.body;
    if (!friendUsername) return res.status(400).json({ error: '缺少參數' });
    const friend = await findUser(friendUsername);
    if (!friend) return res.status(404).json({ error: '找不到該玩家' });
    // Check if friend is already in a team
    for (const tid in teams) {
      if (teams[tid].members.includes(friendUsername)) return res.status(400).json({ error: '對方已在隊伍中' });
    }
    // Find or create team for inviter
    let myTeamId = null;
    for (const tid in teams) {
      if (teams[tid].members.includes(req.user.username)) { myTeamId = tid; break; }
    }
    if (!myTeamId) {
      myTeamId = 'team_' + Date.now();
      teams[myTeamId] = { leader: req.user.username, members: [req.user.username], created: Date.now() };
    }
    // Add friend to team
    teams[myTeamId].members.push(friendUsername);
    res.json({ ok: true, teamId: myTeamId, members: teams[myTeamId].members, friendNickname: friend.nickname || friend.username });
  } catch (e) { console.error('Team invite error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/team/create', auth, async (req, res) => {
  try {
    // Check if user already in a team
    for (const tid in teams) {
      if (teams[tid].members.includes(req.user.username)) return res.status(400).json({ error: '你已在隊伍中' });
    }
    const tid = 'team_' + Date.now();
    teams[tid] = { leader: req.user.username, members: [req.user.username], created: Date.now() };
    res.json({ ok: true, teamId: tid });
  } catch (e) { console.error('Team create error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/team/join', auth, async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId || !teams[teamId]) return res.status(404).json({ error: '隊伍不存在' });
    if (teams[teamId].members.includes(req.user.username)) return res.status(400).json({ error: '已在隊伍中' });
    teams[teamId].members.push(req.user.username);
    res.json({ ok: true, teamId, leader: teams[teamId].leader, members: teams[teamId].members });
  } catch (e) { console.error('Team join error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.get('/api/team/status', auth, async (req, res) => {
  try {
    for (const tid in teams) {
      if (teams[tid].members.includes(req.user.username)) {
        return res.json({ inTeam: true, teamId: tid, leader: teams[tid].leader, members: teams[tid].members });
      }
    }
    res.json({ inTeam: false });
  } catch (e) { console.error('Team status error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

app.post('/api/team/ping', auth, async (req, res) => {
  onlineUsers.add(req.user.username);
  res.json({ ok: true });
});

app.post('/api/team/leave', auth, async (req, res) => {
  try {
    for (const tid in teams) {
      const t = teams[tid];
      const idx = t.members.indexOf(req.user.username);
      if (idx !== -1) {
        t.members.splice(idx, 1);
        if (t.members.length === 0) delete teams[tid];
        else if (t.leader === req.user.username) t.leader = t.members[0];
        return res.json({ ok: true });
      }
    }
    res.status(400).json({ error: '你不在任何隊伍中' });
  } catch (e) { console.error('Team leave error:', e); res.status(500).json({ error: '伺服器錯誤' }); }
});

// HTTP map vote (fallback for Render WebSocket issues)
app.post('/api/map_vote', auth, (req, res) => {
  const { map } = req.body;
  if (!map) return res.status(400).json({ error: '缺少地圖' });
  // Find the WebSocket for this user by matching username
  let found = false;
  wss.clients.forEach((ws) => {
    if (ws.playerData && ws.playerData.username === req.user.username && ws.roomId) {
      handleMapVote(ws, map);
      found = true;
    }
  });
  if (!found) return res.status(400).json({ error: '不在房間中' });
  res.json({ ok: true });
});
app.get('/api/game_status', auth, (req, res) => {
  // Check if user is in a room with a decided map
  let result = { started: false };
  wss.clients.forEach((ws) => {
    if (ws.playerData && ws.playerData.username === req.user.username && ws.roomId) {
      const room = rooms[ws.roomId];
      if (room && room.gameStarted) {
        result = { started: true, map: room.chosenMap };
      }
    }
  });
  res.json(result);
});

// WebSocket multiplayer
const queue = [];
const rooms = {};
const onlineUsers = new Set();
const teams = {}; // teamId -> {leader, members:[]}
let nextRoomId = 1;

// ── Lobby State ──
const lobbyPlayers = new Map();
const lobbyColors = [0x4488ff,0xff4444,0x44ff44,0xff8800,0xaa44ff,0xff44aa,0x44ffaa,0xffaa44,0x44ccff,0xff6644];
function lobbyList() { const a = []; lobbyPlayers.forEach(p => a.push({ name: p.name, clientId: p.clientId, x: p.x, z: p.z, rot: p.rot, color: p.color })); return a; }
function broadcastLobby(except, data) { lobbyPlayers.forEach((p, w) => { if (w !== except && w.readyState === WebSocket.OPEN) try { w.send(JSON.stringify(data)); } catch(e){} }); }
function handleLobbyJoin(ws, msg) {
  if (ws.lobbyData) return;
  // Remove old connection with same clientId (reconnection)
  lobbyPlayers.forEach((p, w) => { if (p.clientId === msg.clientId && w !== ws) { try { w.close(); } catch(e){} } });
  const color = lobbyColors[lobbyPlayers.size % lobbyColors.length];
  ws.lobbyData = { name: msg.name || 'Player', clientId: msg.clientId || '', x: 0, z: 0, rot: 0, color };
  lobbyPlayers.set(ws, ws.lobbyData);
  console.log('[Lobby] handleLobbyJoin cid='+msg.clientId+' name='+msg.name+' lobbySize='+lobbyPlayers.size);
  broadcastLobby(ws, { type: 'lobby_player_join', name: ws.lobbyData.name, clientId: ws.lobbyData.clientId, x: 0, z: 0, rot: 0, color: ws.lobbyData.color });
  try { ws.send(JSON.stringify({ type: 'lobby_state', players: lobbyList() })); } catch(e) { console.log('[Lobby] send lobby_state error:', e.message); }
}
function handleLobbyLeave(ws) {
  if (!ws.lobbyData || !lobbyPlayers.has(ws)) return;
  const cid = ws.lobbyData.clientId;
  const name = ws.lobbyData.name;
  lobbyPlayers.delete(ws);
  ws.lobbyData = null;
  console.log('[Lobby] player_leave cid='+cid+' name='+name+' lobbySize='+lobbyPlayers.size);
  broadcastLobby(null, { type: 'lobby_player_leave', clientId: cid });
}
wss.on('connection', (ws) => {
  ws.playerData = null; ws.roomId = null; ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case 'ping': ws.send(JSON.stringify({ type: 'pong' })); break;
      case 'join_queue': ws.playerData = { name: msg.name || 'Player', username: msg.username || '', teamId: msg.teamId || '', gameMode: msg.gameMode || 'multi' }; onlineUsers.add(msg.name); ws.playerName = msg.name; addToQueue(ws); break;
      case 'online_ping': if (msg.name) { onlineUsers.add(msg.name); ws.playerName = msg.name; if (!ws.playerData) ws.playerData = {}; ws.playerData.username = msg.name; } break;
      case 'lobby_join': handleLobbyJoin(ws, msg); break;
      case 'lobby_pos': if (ws.lobbyData) { ws.lobbyData.x = msg.x; ws.lobbyData.z = msg.z; ws.lobbyData.rot = msg.rot; broadcastLobby(ws, { type: 'lobby_player_pos', clientId: ws.lobbyData.clientId, name: ws.lobbyData.name, x: msg.x, z: msg.z, rot: msg.rot }); } break;
      case 'lobby_leave': handleLobbyLeave(ws); break;
      case 'leave_queue': removeFromQueue(ws); ws.send(JSON.stringify({ type: 'queue_left' })); break;
      case 'state': relayToOpponent(ws, { type: 'opponent_state', playerId: ws.playerId, data: msg.data }); break;
      case 'shoot': relayToOpponent(ws, { type: 'enemy_shoot', origin: msg.origin, dir: msg.dir, gun: msg.gun }); break;
      case 'hit': relayToOpponent(ws, { type: 'opponent_hit', hp: msg.hp, armor: msg.armor }); break;
      case 'player_death': relayToOpponent(ws, { type: 'opponent_died' }); break;
      case 'round_clear': relayToOpponent(ws, { type: 'opponent_cleared', roundNum: msg.roundNum }); break;
      case 'round_continue': relayToOpponent(ws, { type: 'round_continue' }); break;
      case 'round_quit': relayToOpponent(ws, { type: 'round_quit' }); break;
      case 'map_vote': handleMapVote(ws, msg.map); break;
      default: break;
    }
  });
  ws.on('close', () => { handleDisconnect(ws); handleLobbyLeave(ws); });
});
// Heartbeat interval
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) { ws.terminate(); return; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 10000);
wss.on('close', () => clearInterval(heartbeatInterval));

function addToQueue(ws) {
  const gm = ws.playerData.gameMode || 'multi';
  // Check if any queued player is from the same team (same game mode)
  if (ws.playerData.teamId) {
    for (let i = 0; i < queue.length; i++) {
      const q = queue[i];
      if (q.playerData.gameMode === gm && q.playerData.teamId === ws.playerData.teamId && q.readyState === WebSocket.OPEN) {
        queue.splice(i, 1);
        startMatch(ws, q, gm);
        return;
      }
    }
  }
  // Find a queued player with the same game mode
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    if (q.playerData.gameMode === gm && q.readyState === WebSocket.OPEN) {
      queue.splice(i, 1);
      startMatch(ws, q, gm);
      return;
    }
  }
  queue.push(ws);
  ws.send(JSON.stringify({ type: 'in_queue', position: queue.length }));
}
function removeFromQueue(ws) { const i = queue.indexOf(ws); if (i !== -1) queue.splice(i, 1); }
function startMatch(p1, p2, gameMode) {
  const rid = nextRoomId++; rooms[rid] = { p1, p2, votes: {}, gameMode: gameMode || 'multi' }; p1.roomId = rid; p2.roomId = rid;
  p1.playerId = 0; p2.playerId = 1;
  var pc = (gameMode && gameMode.endsWith('4')) ? 4 : 2;
  // For 4-player mode, we still start with 2 — server needs 4-player queue support separately
  try{p1.send(JSON.stringify({ type: 'match_found', roomId: rid, opponent: p2.playerData.name, playerId: 0, playerCount: pc }));}catch(e){console.log('send to p1 failed');}
  try{p2.send(JSON.stringify({ type: 'match_found', roomId: rid, opponent: p1.playerData.name, playerId: 1, playerCount: pc }));}catch(e){console.log('send to p2 failed');}
  // Auto-pick map after 15s if not both voted
  const maps = ['base', 'rain', 'fog', 'dragonboat', 'nuclear', 'arena2'];
  rooms[rid].voteTimer = setTimeout(() => {
    const room = rooms[rid];
    if (!room) return;
    const v = room.votes;
    let chosenMap;
    if (v.p1 && v.p2) return; // already handled
    if (v.p1 && !v.p2) chosenMap = v.p1;
    else if (!v.p1 && v.p2) chosenMap = v.p2;
    else chosenMap = maps[Math.floor(Math.random() * maps.length)];
    room.chosenMap = chosenMap; room.gameStarted = true;
    const result = { type: 'map_result', map: chosenMap, votes: [v.p1, v.p2].filter(Boolean) };
    try{if (room.p1.readyState === WebSocket.OPEN) room.p1.send(JSON.stringify(result));}catch(e){}
    try{if (room.p2.readyState === WebSocket.OPEN) room.p2.send(JSON.stringify(result));}catch(e){}
  }, 15000);
}
function handleMapVote(ws, map) {
  const room = rooms[ws.roomId];
  if (!room) { console.log('MapVote: no room for', ws.playerName); return; }
  const isP1 = room.p1 === ws;
  const who = isP1 ? 'p1' : 'p2';
  room.votes[who] = map;
  console.log('MapVote:', who, 'voted', map, 'votes:', JSON.stringify(room.votes));
  // Relay opponent's vote so client can show "opponent selected"
  const opp = isP1 ? room.p2 : room.p1;
  try{if (opp.readyState === WebSocket.OPEN) opp.send(JSON.stringify({ type: 'opponent_vote', map }));}catch(e){console.log('opponent_vote send failed');}
  const v = room.votes;
  if (v.p1 && v.p2) {
    if (room.voteTimer) { clearTimeout(room.voteTimer); room.voteTimer = null; }
    // Both voted — determine result
    const votes = [v.p1, v.p2];
    const uniqueVotes = [...new Set(votes)];
    // If both same, use that; if different, pick randomly
    const chosenMap = uniqueVotes.length === 1 ? uniqueVotes[0] : uniqueVotes[Math.floor(Math.random() * uniqueVotes.length)];
    console.log('MapVote: both voted, chosenMap:', chosenMap);
    room.chosenMap = chosenMap; room.gameStarted = true;
    const result = { type: 'map_result', map: chosenMap, votes };
    try{room.p1.send(JSON.stringify(result));}catch(e){console.log('map_result p1 failed');}
    try{room.p2.send(JSON.stringify(result));}catch(e){console.log('map_result p2 failed');}
  }
}
function relayToOpponent(ws, msg) {
  const room = rooms[ws.roomId]; if (!room) return;
  const opp = room.p1 === ws ? room.p2 : room.p1;
  try{if (opp.readyState === WebSocket.OPEN) opp.send(JSON.stringify(msg));}catch(e){}
}
function handleDisconnect(ws) {
  removeFromQueue(ws);
  if (ws.playerName) onlineUsers.delete(ws.playerName);
  if (ws.roomId && rooms[ws.roomId]) { const room = rooms[ws.roomId]; if (room.voteTimer) { clearTimeout(room.voteTimer); room.voteTimer = null; } const opp = room.p1 === ws ? room.p2 : room.p1; delete rooms[ws.roomId]; if (opp && opp.readyState === WebSocket.OPEN) opp.send(JSON.stringify({ type: 'opponent_disconnected' })); }
}

process.on('uncaughtException', e => console.error('Uncaught:', e));
process.on('unhandledRejection', e => console.error('Unhandled:', e));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('OCGAME server running on port ' + PORT));
