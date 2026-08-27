const { Client } = require('pg');
const pass = process.env.PGTEST_PASS;
const c = new Client({
  host: 'dpg-d91maq7avr4c73fn1r80-a.ohio-postgres.render.com',
  port: 5432,
  user: 'ocgame_user',
  database: 'ocgame',
  password: pass,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000
});
c.connect()
  .then(() => c.query('SELECT COUNT(*) AS users FROM users'))
  .then((r) => { console.log('CONNECT OK, users table:', r.rows[0].users); return c.end(); })
  .catch((e) => { console.log('CONNECT FAIL:', e.message); process.exitCode = 1; try { c.end(); } catch (x) {} });