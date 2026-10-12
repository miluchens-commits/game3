// 烘焙 mp7.obj → mp7data.js（window.OC_MP7_MODEL），座標對齊遊戲視模型慣例：
// 槍口朝 -Z、上為 +Y、置中 X/Y。用法：node bake_mp7.js
const fs = require('fs');

const src = fs.readFileSync('mp7/mp7.obj', 'utf8');
const pos = [], nrm = [], uv = [];
const faces = [];
for (const line of src.split('\n')) {
  if (line.startsWith('v ')) {
    const p = line.trim().split(/\s+/);
    pos.push(+p[1], +p[2], +p[3]);
  } else if (line.startsWith('vn ')) {
    const p = line.trim().split(/\s+/);
    nrm.push(+p[1], +p[2], +p[3]);
  } else if (line.startsWith('vt ')) {
    const p = line.trim().split(/\s+/);
    uv.push(+p[1], +p[2]);
  } else if (line.startsWith('f ')) {
    const p = line.trim().split(/\s+/).slice(1);
    const verts = [];
    for (const t of p) {
      const i = t.split('/');
      verts.push([i[0] ? +i[0] : 0, i[1] ? +i[1] : 0, i[2] ? +i[2] : 0]);
    }
    for (let k = 1; k < verts.length - 1; k++) faces.push([verts[0], verts[k], verts[k + 1]]);
  }
}
const nV = pos.length / 3;
console.log('v', nV, 'faces tri', faces.length);

// unified index (v/vt/vn key dedup)
const map = new Map();
const P = [], N = [], U = [], I = [];
const gi = (a) => {
  const key = a[0] + '/' + a[1] + '/' + a[2];
  let id = map.get(key);
  if (id !== undefined) return id;
  id = P.length / 3;
  const vi = (a[0] > 0 ? a[0] - 1 : nV + a[0]) * 3;
  P.push(pos[vi], pos[vi + 1], pos[vi + 2]);
  const ni = (a[2] > 0 ? a[2] - 1 : nrm.length / 3 + a[2]) * 3;
  if (nrm.length) N.push(nrm[ni] || 0, nrm[ni + 1] || 0, nrm[ni + 2] || 0);
  else N.push(0, 0, 1);
  const ti = (a[1] > 0 ? a[1] - 1 : uv.length / 2 + a[1]) * 2;
  if (uv.length && a[1]) U.push(uv[ti] || 0, uv[ti + 1] || 0);
  else U.push(0, 0);
  map.set(key, id);
  return id;
};
for (const f of faces) I.push(gi(f[0]), gi(f[1]), gi(f[2]));
console.log('out verts', P.length / 3, 'idx', I.length);

// bbox
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
  if (P[i + k] < mn[k]) mn[k] = P[i + k];
  if (P[i + k] > mx[k]) mx[k] = P[i + k];
}
const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
const len = mx[2] - mn[2];                     // 原始長軸 = Z（槍口 +Z）
const TARGET_LEN = 0.44;                      // 遊戲本地長度（AK ≈ 0.5）
const s = TARGET_LEN / len;
const MUZZLE_Z = -0.33;                       // 槍口目標位置（同舊程序模型槍口段）
const tz = MUZZLE_Z + (mx[2] - cz) * s;       // 旋轉後槍口 z = -(mx2-cz)*s + tz

// 旋轉 π about Y：(x,y,z)→(-x,y,-z)，再縮放平移
for (let i = 0; i < P.length; i += 3) {
  const x = (P[i] - cx) * s, y = (P[i + 1] - cy) * s, z = (P[i + 2] - cz) * s;
  P[i] = -x; P[i + 1] = y; P[i + 2] = -z + tz;
}
for (let i = 0; i < N.length; i += 3) { N[i] = -N[i]; N[i + 2] = -N[i + 2]; }

// new bbox + 推導彈匣/導軌位置
let mn2 = [1e9, 1e9, 1e9], mx2 = [-1e9, -1e9, -1e9];
for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
  if (P[i + k] < mn2[k]) mn2[k] = P[i + k];
  if (P[i + k] > mx2[k]) mx2[k] = P[i + k];
}
// 彈匣區：y 低於握把底部上方一點的頂點群（取 z 中心與 y 下緣）
let magY = 1e9, magZs = [];
for (let i = 0; i < P.length; i += 3) {
  if (P[i + 1] < mn2[1] + 0.075) { if (P[i + 1] < magY) magY = P[i + 1]; magZs.push(P[i + 2]); }
}
magZs.sort((a, b) => a - b);
const magZ = magZs.length ? magZs[Math.floor(magZs.length / 2)] : (mn2[2] + mx2[2]) / 2;
// 頂部導軌：|x| 小且 y 高的頂點
let railY = -1e9;
for (let i = 0; i < P.length; i += 3) {
  if (Math.abs(P[i]) < 0.012 && P[i + 1] > mx2[1] - 0.04) if (P[i + 1] > railY) railY = P[i + 1];
}
if (railY < -1e8) railY = mx2[1];
// 彈匣範圍統計（供遊戲 reload 直接拉動模型彈匣）
{
  const zs = [], ys = [];
  for (let i = 0; i < P.length; i += 3)
    if (P[i + 1] < mn2[1] + 0.09 && P[i + 2] < magZ) { zs.push(P[i + 2]); ys.push(P[i + 1]); }
  zs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  const q = (a, f) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * f))] : 0;
  console.log('magVerts', zs.length, 'z q02/q50/q98', q(zs, .02).toFixed(3), q(zs, .5).toFixed(3), q(zs, .98).toFixed(3),
    'y q02/q98', q(ys, .02).toFixed(3), q(ys, .98).toFixed(3));
}

// 彈匣遮罩：哪些頂點屬於可拆下的彈匣（y 低且 z 偏前），並記一個代表頂點作旋轉 pivot
const nIdx = P.length / 3;
let pivX = 0, pivY = 0, pivZ = 0;
const cand = [];
{
  let minY = 1e9, maxY = -1e9;
  for (let i = 0; i < nIdx; i++) {
    if (P[i * 3 + 1] < -0.06 && P[i * 3 + 2] > -0.20 && P[i * 3 + 2] < -0.038) {
      cand.push(i);
      if (P[i * 3 + 1] < minY) minY = P[i * 3 + 1];
      if (P[i * 3 + 1] > maxY) maxY = P[i * 3 + 1];
    }
  }
  for (const i of cand) { pivX += P[i * 3]; pivY += P[i * 3 + 1]; pivZ += P[i * 3 + 2]; }
  if (cand.length) { pivX /= cand.length; pivY /= cand.length; pivZ /= cand.length; }
  console.log('magMask verts', cand.length, 'piv', pivX.toFixed(3), pivY.toFixed(3), pivZ.toFixed(3), 'yrange', minY.toFixed(3), maxY.toFixed(3));
}

function b64f32(arr) {
  const f = new Float32Array(arr);
  return Buffer.from(f.buffer, f.byteOffset, f.byteLength).toString('base64');
}
function b64u16(arr) {
  const u = new Uint16Array(arr);
  return Buffer.from(u.buffer, u.byteOffset, u.byteLength).toString('base64');
}

// 分離彈匣幾何（照 AWP bolt 做法）：主體移除彈匣頂點，彈匣另存小幾何
const isMag = new Uint8Array(nIdx);
for (const i of cand) isMag[i] = 1;
const remap = new Int32Array(nIdx).fill(-1);
const bP = [], bN = [], bU = [];
const gP = [], gN = [], gU = [];
for (let i = 0; i < nIdx; i++) {
  if (isMag[i]) {
    remap[i] = -(gP.length / 3) - 1;
    gP.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    gN.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    gU.push(U[i * 2], U[i * 2 + 1]);
  } else {
    remap[i] = bP.length / 3;
    bP.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    bN.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    bU.push(U[i * 2], U[i * 2 + 1]);
  }
}
const bI = [], gI = [];
for (let t = 0; t < I.length; t += 3) {
  const a = remap[I[t]], b = remap[I[t + 1]], c = remap[I[t + 2]];
  if (a >= 0 && b >= 0 && c >= 0) bI.push(a, b, c);
  else if (a < 0 && b < 0 && c < 0) gI.push(-a - 1, -b - 1, -c - 1);
}
console.log('body verts', bP.length / 3, 'body idx', bI.length, 'mag verts', gP.length / 3, 'mag idx', gI.length);

if (bP.length / 3 > 65535) throw new Error('too many verts for u16');

const out = {
  p: b64f32(bP), n: b64f32(bN), u: b64f32(bU), i: b64u16(bI),
  gp: b64f32(gP), gn: b64f32(gN), gu: b64f32(gU), gi: b64u16(gI),
  pivot: [pivX, pivY, pivZ],
  zMax: mx2[2].toFixed(4) * 1, zMin: mn2[2].toFixed(4) * 1,
  scale: s, magZ: magZ, magY: magY, railY: railY
};
fs.writeFileSync('mp7data.js',
  '// AUTO-GENERATED by bake_mp7.js — MP7 model (oriented: muzzle -Z, up +Y, centered).\n' +
  'window.OC_MP7_MODEL=' + JSON.stringify(out) + ';\n');
console.log('bbox local min', mn2.map(v => v.toFixed(3)).join(','), 'max', mx2.map(v => v.toFixed(3)).join(','));
console.log('scale', s.toFixed(5), 'magZ', magZ.toFixed(3), 'magY', magY.toFixed(3), 'railY', railY.toFixed(3));
console.log('written mp7data.js', (fs.statSync('mp7data.js').size / 1024).toFixed(0) + 'KB');
