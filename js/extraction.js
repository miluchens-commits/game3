
// ========== EXTRACTION MODE (embedded) ==========
// 全域 stub：保險箱關閉鈕在 startExtractionMode 執行前就可能存在於 HTML onclick
window.ext_closeSafeUI = function(){ if (typeof endSafeCrack === 'function' && _crackActive) { endSafeCrack(false); } var el=document.getElementById('safe-ui'); if(el) el.style.display='none'; };
window.ext_toggleBackpack = function(){};
window.ext_toggleMatchmaking = function(){};
window.ext_backToMenu = function(){ window.location.href = 'index.html'; };

// ========== 保險箱開鎖小遊戲（時機條） ==========
var _crackActive = false, _crackRAF = null, _crackPins = 0, _crackBar = 0, _crackDir = 1, _crackZoneC = 0.5, _crackZoneW = 0.22;
window._extCrackSuccess = null; // 由 openSafeUI 設定：3銷全解後要做的事
function startSafeCrack() {
  _crackActive = true; _crackPins = 0; _crackBar = 0; _crackDir = 1;
  _crackZoneC = 0.3 + Math.random() * 0.4; _crackZoneW = 0.22;
  var cp = document.getElementById('safe-crack-panel'); if (cp) cp.style.display = 'block';
  var lp = document.getElementById('safe-loot-panel'); if (lp) lp.style.display = 'none';
  var msg = document.getElementById('crack-msg'); if (msg) msg.textContent = '在黃條進入綠色區域時按 空白鍵 / 點擊（3個銷）';
  var pinsEl = document.getElementById('crack-pins'); if (pinsEl) pinsEl.innerHTML = '';
  var last = performance.now();
  function frame(now) {
    if (!_crackActive) { _crackRAF = null; return; }
    var d = Math.min((now - last) / 1000, 0.05); last = now;
    _crackBar += _crackDir * d * 0.85;
    if (_crackBar >= 1) { _crackBar = 1; _crackDir = -1; }
    if (_crackBar <= 0) { _crackBar = 0; _crackDir = 1; }
    var bar = document.getElementById('crack-bar'); if (bar) bar.style.left = (_crackBar * 100) + '%';
    var zone = document.getElementById('crack-zone');
    if (zone) { zone.style.left = ((_crackZoneC - _crackZoneW / 2) * 100) + '%'; zone.style.width = (_crackZoneW * 100) + '%'; }
    _crackRAF = requestAnimationFrame(frame);
  }
  if (_crackRAF) cancelAnimationFrame(_crackRAF);
  _crackRAF = requestAnimationFrame(frame);
}
function crackAttempt() {
  if (!_crackActive) return;
  var msg = document.getElementById('crack-msg');
  var pinsEl = document.getElementById('crack-pins');
  var hit = Math.abs(_crackBar - _crackZoneC) <= _crackZoneW / 2;
  if (hit) {
    _crackPins++;
    if (pinsEl) { var p = document.createElement('span'); p.textContent = '🔓'; p.style.fontSize = '18px'; pinsEl.appendChild(p); }
    if (_crackPins >= 3) { endSafeCrack(true); return; }
    _crackZoneC = 0.25 + Math.random() * 0.5; _crackZoneW = Math.max(0.1, _crackZoneW - 0.04);
    if (msg) msg.textContent = '銷 ' + _crackPins + '/3 已解 — 繼續！';
  } else {
    if (msg) msg.textContent = '❌ 失手！黃條偏了，再試一次';
    _crackBar = 0; _crackDir = 1;
  }
}
function endSafeCrack(success) {
  _crackActive = false;
  if (_crackRAF) { cancelAnimationFrame(_crackRAF); _crackRAF = null; }
  var cp = document.getElementById('safe-crack-panel'); if (cp) cp.style.display = 'none';
  if (success) {
    if (typeof window._extCrackSuccess === 'function') window._extCrackSuccess();
  } else {
    var el = document.getElementById('safe-ui'); if (el) el.style.display = 'none';
  }
}
document.addEventListener('keydown', function(e) {
  if (!_crackActive) return;
  if (e.code === 'Space') { e.preventDefault(); crackAttempt(); }
});
document.addEventListener('click', function(e) {
  if (!_crackActive) return;
  if (e.target && e.target.id === 'crack-btn') crackAttempt();
});
window.addEventListener('error', function(ev){
  try {
    var d = document.getElementById('ext-diag');
    if (!d) {
      d = document.createElement('div');
      d.id = 'ext-diag';
      d.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(140,0,0,.95);color:#ffd7d7;border:2px solid #f66;border-radius:10px;padding:10px 20px;font:600 14px Arial;letter-spacing:1px;max-width:84vw;box-shadow:0 6px 30px rgba(0,0,0,.5)';
      document.body.appendChild(d);
    }
    d.textContent = '⚠ ERROR ' + (ev.message || 'unknown') + ' @ ' + (ev.filename ? ev.filename.split('/').pop() + ':' + ev.lineno : '');
    d.style.display = 'block';
  } catch (e) {}
});
let _extRAF = null;
let _extActive = false;
Object.defineProperty(window, '_extActive', { get: function(){ return _extActive; }, set: function(v){ _extActive = v; } });
let _extGameStarted = false;


// ========== EXTRACTION MATCHMAKING ==========
let _extMMActive = false, _extMMTimer = null, _extMMStart = 0, _extMMCanceled = false, _extMMWs = null;
// ============ 小黃石階級（開啟時抽取；帳戶層 US 與局內共用） ============
const CRYSTAL_TIERS = [
  { key:'crystal_red',  name:'赤岩級礦晶', color:'#c7743f', sub:'普通', size:1, base:100 },
  { key:'crystal_amber',name:'琥珀級礦晶', color:'#e8a33d', sub:'少見', size:1, base:300 },
  { key:'crystal_gold', name:'曜金級礦晶', color:'#f0c63a', sub:'稀有', size:1, base:500 },
  { key:'crystal_jade', name:'翡翠級礦晶', color:'#3ac96f', sub:'卓越', size:2, purity:{S:1000,A:500,B:200,C:100} },
  { key:'crystal_ocean',name:'蒼海級礦晶', color:'#3aa0e8', sub:'極稀有', size:2, base:2000 },
  { key:'crystal_abyss',name:'深淵級礦晶', color:'#9b59b6', sub:'傳奇', size:2, base:5000 },
  { key:'crystal_oracle',name:'神諭級礦晶', color:'#ffffff', sub:'神話', size:3, purity:{S:10000000,A:5000000,B:2000000,C:500000} },
];
function rollPurity() {
  const r = Math.random();
  if (r < 0.05) return 'S';
  if (r < 0.20) return 'A';
  if (r < 0.50) return 'B';
  return 'C';
}
function rollCrystal() {
  const r = Math.random();
  let tier = 0;
  if (r < 0.0005) tier = 6;          // 神諭 0.05%
  else if (r < 0.0105) tier = 5;     // 深淵 1%
  else if (r < 0.0805) tier = 4;     // 蒼海 7%
  else if (r < 0.2005) tier = 3;     // 翡翠 12%
  else if (r < 0.3505) tier = 2;     // 曜金 15%
  else if (r < 0.6005) tier = 1;     // 琥珀 25%
  else tier = 0;                      // 赤岩 ~40%
  const t = CRYSTAL_TIERS[tier];
  let purity = null;
  let value = t.base;
  let name = t.name;
  if (t.purity) {
    purity = rollPurity();
    value = t.purity[purity];
    name = `${t.name}·${purity}級`;
  }
  return { key:t.key, name, rarity:Math.min(tier,4), size:t.size, value, color:t.color, purity, taken:false };
}

function startExtractionMatchmaking() {
  if (_extMMActive) return;
  _extMMActive = true; _extMMCanceled = false; _extMMStart = Date.now();
  var ind = document.getElementById('ext-mm-indicator');
  if (ind) ind.style.display = 'flex';
  var cl = document.getElementById('ext-mm-count');
  if (cl) cl.textContent = '0';
  var msgEl = ind ? ind.querySelector('.ext-mm-msg') : null;
  if (msgEl) msgEl.textContent = '⏳ 匹配中 · 等待 5 名玩家';
  var cancelBtn = document.getElementById('ext-mm-cancel');
  if (cancelBtn) cancelBtn.onclick = cancelExtMM;
  updateExtMMDisplay();
  var wsUrl = ocMultiWSURL('');
  try {
    _extMMWs = new WebSocket(wsUrl);
    _extMMWs.onopen = function() {
      _extMMWs.send(JSON.stringify({ type: 'join_extraction_queue', name: localStorage.getItem('oc_nickname') || 'Player' }));
    };
    _extMMWs.onerror = function() {
      // 伺服器離線 → 停止匹配，不自動開局
      _extMMActive = false;
      var msgEl3 = document.getElementById('ext-mm-indicator');
      if (msgEl3) {
        var m3 = msgEl3.querySelector('.ext-mm-msg');
        if (m3) m3.textContent = '❌ 伺服器未連線 — 請先啟動 node server.js';
      }
    };
    _extMMWs.onclose = function() {
      if (!_extMMCanceled && _extMMActive) {
        _extMMActive = false;
        var msgEl4 = document.getElementById('ext-mm-indicator');
        if (msgEl4) {
          var m4 = msgEl4.querySelector('.ext-mm-msg');
          if (m4) m4.textContent = '❌ 連線中斷 — 請重新按 GO 排隊';
        }
      }
    };
    _extMMWs.onmessage = function(e) {
      try {
        var m = JSON.parse(e.data);
        if (m.type === 'extraction_match_found') { clearTimeout(_extMMTimer); finishExtMM(true, m); }
        else if (m.type === 'extraction_queue_status' && m.position) {
          var cl2 = document.getElementById('ext-mm-count');
          if (cl2) cl2.textContent = Math.min(5, m.position);
          var ml2 = document.getElementById('ext-mm-indicator');
          var me2 = ml2 ? ml2.querySelector('.ext-mm-msg') : null;
          if (me2) me2.textContent = '⏳ 匹配中 · 你在佇列第 '+m.position+' 位';
        }
        else if (m.type !== 'extraction_queue_status') {
          // 配對成功後這條 socket 會被保留為對局連線（持有 server 的房間歸屬），
          // 對局期間的封包（remote_state / remote_safe_open / remote_loot_take /
          // remote_shoot / remote_hit ...）都會從這裡進來，必須交給共用處理器，
          // 否則收到的封包會被直接丟棄，導致看不到其他玩家。
          if (typeof window.onExtractionGameMessage === 'function') window.onExtractionGameMessage(m);
          else if (typeof processServerMessage === 'function') processServerMessage(m);
        }
      } catch(er) { console.error('[extraction] onmessage failed:', er); }
    };
  } catch(e) { console.error('[extraction] matchmaking setup failed:', e); }
}

function extMMRequeue() {
  if (_extMMCanceled) return;
  _extMMActive = false;
  var ind2 = document.getElementById('ext-mm-indicator');
  var ml3 = ind2 ? ind2.querySelector('.ext-mm-msg') : null;
  if (ml3) ml3.textContent = '⌛ 人數不足，重新搜尋玩家中…';
  setTimeout(function() {
    if (_extMMCanceled) return;
    startExtractionMatchmaking();
  }, 1500);
}

function updateExtMMDisplay() {
  var ind = document.getElementById('ext-mm-indicator');
  if (!ind) return;
  if (_extMMActive && !_extMMCanceled) setTimeout(updateExtMMDisplay, 1000);
}

function cancelExtMM() {
  _extMMActive = false; _extMMCanceled = true;
  clearTimeout(_extMMTimer);
  if (_extMMWs) { try { _extMMWs.close(); } catch(e) {} _extMMWs = null; }
  var ind = document.getElementById('ext-mm-indicator');
  if (ind) ind.style.display = 'none';
  // updateMMUI 宣告在 startExtractionMode 作用域內，必須透過 window 取得，
  // 否則這行 typeof 檢查永遠為 false，按鈕文字不會被還原。
  if (typeof window.updateMMUI === 'function') window.updateMMUI(); // Restore extraction matchmaking button text if visible
}

function finishExtMM(matched, msg) {
  if (!_extMMActive || _extMMCanceled) return;
  _extMMActive = false;
  clearTimeout(_extMMTimer);
  var ind = document.getElementById('ext-mm-indicator');
  if (ind) ind.style.display = 'none';
  // 配對成功時【不可】關閉連線：摸金房間歸屬綁在這條 socket 上（server.js 只對
  // 配對中的 socket 賦值 extractionRoomId）。關掉之後 sendExtractionState() 改走
  // 主連線就會被 server 無聲丟棄，導致所有玩家都看不到彼此。
  // 對局結束時再由 closeExtGameSocket() 釋放。
  if (matched && msg) {
    window._extGameWs = _extMMWs;
  } else {
    // closeExtGameSocket 宣告在 startExtractionMode 作用域內，只能透過 window 取得
    if (typeof window.closeExtGameSocket === 'function') window.closeExtGameSocket();
    if (window._extGameWs) window._extGameWs = null;
    if (_extMMWs) { try { _extMMWs.close(); } catch(e) {} }
    _extMMWs = null;
  }
  
  // Build match data（未配對成功 → 單人＋3 AI fallback）
  var players = {};
  var myId = 0;
  if (matched && msg && msg.players) {
    for (var i = 0; i < msg.players.length; i++) {
      players[msg.players[i].id] = msg.players[i];
      if (msg.players[i].id === msg.yourId) myId = i;
    }
  }
  var aiCount = matched ? 0 : 3; // fallback 時補 3 個 AI 玩家
  window._extMatchData = { matched: matched && !!msg, myPlayerId: (msg && msg.playerId !== undefined) ? msg.playerId : myId, players: players, aiCount: aiCount, spawn: (matched && msg && msg.spawn) ? msg.spawn : null };
  if (!matched) {
    if (window._floatMsg) window._floatMsg('🤖 未配對到真人 — 單人＋AI 模擬開局', '#8cf');
  }
  if (_extActive) {
    // Already running — clear 50s timeout, launch game
    if (_extMMTimer) clearTimeout(_extMMTimer);
    if (window._extLaunchTimer) { clearTimeout(window._extLaunchTimer); window._extLaunchTimer = null; }
    if (window._extCountdownInterval) { clearInterval(window._extCountdownInterval); window._extCountdownInterval = null; }
    launchExtractionGame();
  } else {
    startExtractionMode();
  }
}

function startExtractionMode(useMultiplayer, mpSpawn) {
  if (_extActive) return;
  _extActive = true;

  // （電力閘/列車/潰壩狀態已移除 — 撤離改用 EXT 電子鎖直升機流程）

  // Show matchmaking indicator (don't hide menu yet)
  var mmIndicator = document.getElementById('ext-mm-indicator');
  if (mmIndicator) mmIndicator.style.display = 'flex';
  var mmCount = document.getElementById('ext-mm-count');
  if (mmCount) mmCount.textContent = '50';

  // Read match data from global (set by finishExtMM)
var matchData = window._extMatchData || null;
var extIsMultiplayer = matchData ? matchData.matched : false;
var extMatchPlayers = matchData ? matchData.players : {};
var extMyPlayerId = matchData ? matchData.myPlayerId : 0;
var extAiPlayerCount = matchData ? matchData.aiCount : 0;
window._extMatchData = null; // Clean up

  // ---- ALL EXTRACTION CODE (scoped inside this function) ----

// ============ GAME STATE ============
const STATE = { LOADING:0, ARRIVAL:1, DEPLOYED:2, EXTRACTING:3, RESULTS:4 };
let gameState = STATE.LOADING;
let matchTime = 15 * 60; // 15 minutes
let playerHasExtracted = false;
let collectedItems = [];
let collectedCount = 0;
let totalLootValue = 0;
let matchKills = 0;
const BACKPACK_MAX = 10;
let backpackOpen = false;

// ============ PLAYER HEALTH ============
let playerHealth = 100;
let playerMaxHealth = 100;
let playerIsDead = false;

// ============ BOT SYSTEM ============
let bots = [];
const BOT_COUNT = 14;
const BOT_TYPES = [
  { name:'巡邏兵', health:40, speed:3, damage:1,  color:0xcc4444, detectRange:35, attackRange:18, attackCooldown:2.5, reward:10 },
  { name:'突擊兵', health:60, speed:5, damage:2, color:0xdd3333, detectRange:45, attackRange:22, attackCooldown:1.8, reward:20 },
  { name:'狙擊手', health:30, speed:2, damage:4, color:0xcc5544, detectRange:60, attackRange:40, attackCooldown:3.0, reward:30 },
  { name:'精英衛兵', health:80, speed:4, damage:3, color:0xbb3344, detectRange:50, attackRange:20, attackCooldown:1.5, reward:40 },
];
const BOT_SPAWNS = [
  { x:0, z:-45, type:0 }, { x:8, z:-38, type:1 }, { x:-8, z:-52, type:2 },
  { x:-70, z:45, type:0 }, { x:-60, z:55, type:1 }, { x:-50, z:40, type:2 },
  { x:70, z:45, type:0 }, { x:60, z:60, type:1 }, { x:50, z:40, type:3 },
  { x:0, z:75, type:0 }, { x:10, z:88, type:1 },
  { x:110, z:30, type:1 }, { x:-110, z:30, type:0 },
  { x:100, z:-30, type:2 }, { x:-100, z:-30, type:1 },
];

// ============ AI PLAYER BOTS ============
let _extAIPlayers = [];

function spawnAIPlayers(count) {
  if (count <= 0) return;
  var colors = [0x44ff44, 0x44dd44, 0x44bb44, 0x44aa44, 0x44ff66];
  var names = ['Alpha','Bravo','Charlie','Delta','Echo'];
  var spawns = SPAWNS || [{x:50,z:50,name:'A'},{x:100,z:100,name:'B'},{x:150,z:150,name:'C'},{x:200,z:200,name:'D'},{x:250,z:250,name:'E'}];
  var geoBody = new THREE.BoxGeometry(0.6, 0.9, 0.4);
  var geoHead = new THREE.SphereGeometry(0.15, 6, 6);
  for (var i = 0; i < count && i < 5; i++) {
    var sp = spawns[i % spawns.length];
    var by = terrainY(sp.x, sp.z);
    var g = new THREE.Group();
    g.position.set(sp.x, by, sp.z);
    var body = new THREE.Mesh(geoBody, new THREE.MeshLambertMaterial({ color: colors[i] }));
    body.position.set(0, 0.5, 0); g.add(body);
    var head = new THREE.Mesh(geoHead, new THREE.MeshLambertMaterial({ color: colors[i] + 0x222222 }));
    head.position.set(0, 1.0, 0); g.add(head);
    makeBotGun(g, 0.35, 0.45, -0.15);
    g.userData.noRaycast = true;  // AI 玩家：子彈已另外用獨立 raycast 判定，不列入靜態清單
    scene.add(g);
    var ai = {
      id: 999 + i, name: names[i] || 'Bot'+i,
      pos: new THREE.Vector3(sp.x, by, sp.z),
      yaw: Math.random() * Math.PI * 2, health: 100, maxHealth: 100,
      dead: false, extracted: false,
      state: 'patrol',
      mesh: g, color: colors[i],
      target: null, targetPos: null,
      shootTimer: 0, moveTimer: 0, interactTimer: 0,
      lootTarget: null, hasLooted: false,
      attackRange: 40, detectRange: 60,
      speed: 5 + Math.random() * 3,
      lastShot: 0,
      patrolTarget: null, patrolWait: 0,
    };
    _extAIPlayers.push(ai);
  }
}

function updateAIPlayers(dt) {
  for (var i = _extAIPlayers.length - 1; i >= 0; i--) {
    var ai = _extAIPlayers[i];
    if (ai.dead || ai.extracted || !ai.mesh) continue;
    var distToPlayer = ai.pos.distanceTo(playerPos);
    ai.moveTimer += dt;
    ai.shootTimer += dt;
    var nearestEnemy = null, nearestEnemyDist = Infinity;
    for (var bi = 0; bi < bots.length; bi++) {
      var b = bots[bi];
      if (b.dead) continue;
      var d = ai.pos.distanceTo(b.pos);
      if (d < ai.detectRange && d < nearestEnemyDist) { nearestEnemy = b; nearestEnemyDist = d; }
    }
    switch (ai.state) {
      case 'patrol':
        if (!ai.patrolTarget || ai.pos.distanceTo(ai.patrolTarget) < 5) {
          ai.patrolTarget = new THREE.Vector3(50+Math.random()*200,0,50+Math.random()*200);
          ai.yaw = Math.atan2(ai.patrolTarget.x-ai.pos.x, ai.patrolTarget.z-ai.pos.z);
        }
        moveToward(ai, ai.patrolTarget, ai.speed*0.5, dt);
        if (nearestEnemy && nearestEnemyDist < ai.detectRange) { ai.state='chase'; ai.target=nearestEnemy; }
        if (!ai.hasLooted) {
          for (var si=0;si<safes.length;si++){var s=safes[si];if(s.opened)continue;var sd=ai.pos.distanceTo(new THREE.Vector3(s.x,0,s.z));if(sd<15){ai.target=s;ai.state='loot';ai.lootTarget=s;break;}}
        }
        break;
      case 'chase':
        if(!ai.target||ai.target.dead){ai.state='patrol';ai.target=null;break;}
        var tpos=ai.target.pos||new THREE.Vector3(ai.target.x,0,ai.target.z);
        var td=ai.pos.distanceTo(tpos);
        if(td>ai.detectRange*1.5){ai.state='patrol';ai.target=null;break;}
        moveToward(ai,tpos,ai.speed,dt);ai.yaw=Math.atan2(tpos.x-ai.pos.x,tpos.z-ai.pos.z);
        if(td<ai.attackRange)ai.state='attack';
        break;
      case 'attack':
        if(!ai.target||ai.target.dead){ai.state='patrol';ai.target=null;break;}
        var atpos=ai.target.pos||new THREE.Vector3(ai.target.x,0,ai.target.z);
        var atd=ai.pos.distanceTo(atpos);
        if(atd>ai.attackRange*1.3){ai.state='chase';break;}
        ai.yaw=Math.atan2(atpos.x-ai.pos.x,atpos.z-ai.pos.z);
        if(ai.shootTimer>0.8+Math.random()*0.5){
          ai.shootTimer=0;
          // LOS check: AI 不穿牆射擊（箱型牆 slab test）
          var _losOk = extLosClear(ai.pos.x, ai.pos.y+1.2, ai.pos.z, atpos.x, atpos.y+1.2, atpos.z);
          if (_losOk && Math.random()<0.6){var dmg=10+Math.floor(Math.random()*10);if(ai.target.type){ai.target.health-=dmg;if(ai.target.health<=0&&typeof killBot==='function')killBot(ai.target);}else if(ai.target===nearestEnemy&&nearestEnemy){nearestEnemy.health-=dmg;if(nearestEnemy.health<=0&&typeof killBot==='function')killBot(nearestEnemy);}
          var fl=new THREE.PointLight(0xffff88,2,10);fl.position.copy(ai.pos);fl.position.y+=0.5;scene.add(fl);setTimeout(function(){scene.remove(fl);},80);}
        }
        break;
      case 'loot':
        if(!ai.lootTarget||ai.lootTarget.opened){ai.hasLooted=true;ai.state='patrol';ai.lootTarget=null;ai.patrolTarget=new THREE.Vector3(EXFIL_POS.x,0,EXFIL_POS.z);break;}
        var lpos=new THREE.Vector3(ai.lootTarget.x,0,ai.lootTarget.z);
        var ld=ai.pos.distanceTo(lpos);
        if(ld<3){ai.lootTarget.opened=true;ai.hasLooted=true;ai.state='patrol';ai.patrolTarget=new THREE.Vector3(EXFIL_POS.x,0,EXFIL_POS.z);}
        else{moveToward(ai,lpos,ai.speed,dt);ai.yaw=Math.atan2(lpos.x-ai.pos.x,lpos.z-ai.pos.z);}
        break;
    }
    var exDist=ai.pos.distanceTo(EXFIL_POS);
    if(ai.hasLooted&&exDist<5){ai.extracted=true;if(ai.mesh){scene.remove(ai.mesh);ai.mesh=null;}}
    if(ai.mesh){var by2=terrainY(ai.pos.x,ai.pos.z);ai.pos.y=by2;ai.mesh.position.copy(ai.pos);ai.mesh.rotation.y=ai.yaw;}
  }
}

function moveToward(ai, target, speed, dt) {
  var dx=target.x-ai.pos.x,dz=target.z-ai.pos.z,dist=Math.sqrt(dx*dx+dz*dz);
  if(dist<1)return;
  var step=speed*dt;if(step>dist)step=dist;
  ai.pos.x+=(dx/dist)*step;ai.pos.z+=(dz/dist)*step;
  ai.pos.y=terrainY(ai.pos.x,ai.pos.z);
}

// ============ WEB SOCKET / MATCHMAKING ============
const WS_HOST = window.location.hostname || 'localhost';
const WS_URL = ocMultiWSURL('');
let ws = null;
let mmState = 'idle'; // idle, connecting, in_queue, matched, in_game
let mmName = '玩家' + Math.floor(Math.random()*9000+1000);
let matchPlayers = [];
let myPlayerId = 0;
let matchSpawn = null;
const STATE_SYNC_INTERVAL = 0.1; // 100ms
// 節拍器：背景分頁的 requestAnimationFrame 會被瀏覽器凍結，
// 若只在 rAF 中送狀態，切到其他分頁的玩家就會從隊友視野中消失。
// 改用 setInterval 獨立驅動，確保對局狀態持續同步。
let _extStateSyncTimer = null;
function startExtractionStateSync() {
  if (_extStateSyncTimer) return;
  _extStateSyncTimer = setInterval(function () {
    if (mmState === 'in_game') sendExtractionState();
  }, STATE_SYNC_INTERVAL * 1000);
}
function stopExtractionStateSync() {
  if (_extStateSyncTimer) { clearInterval(_extStateSyncTimer); _extStateSyncTimer = null; }
}

// Remote players (other human players)
let remotePlayers = {}; // playerId -> { pos, yaw, pitch, health, state, mesh, name, color }

const REMOTE_COLORS = [0x4488ff, 0xff4444, 0x44ff44, 0xff8800, 0xaa44ff];
const REMOTE_NAMES = ['藍隊','紅隊','綠隊','橙隊','紫隊'];

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  mmState = 'connecting';
  updateMMUI();
  try {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      console.log('[WS] connected');
      document.getElementById('ws-status').textContent = '● 已連線';
      document.getElementById('ws-status').className = 'connected';
      mmState = 'idle';
      updateMMUI();
    };
    ws.onclose = () => {
      console.log('[WS] disconnected');
      document.getElementById('ws-status').textContent = '● 離線';
      document.getElementById('ws-status').className = '';
      mmState = 'idle';
      updateMMUI();
      // Auto-reconnect after 3s
      setTimeout(connectWebSocket, 3000);
    };
    ws.onerror = () => {
      document.getElementById('ws-status').textContent = '● 連線失敗';
      document.getElementById('ws-status').className = 'error';
      mmState = 'idle';
      updateMMUI();
    };
    ws.onmessage = (e) => {
      try { handleWSMessage(JSON.parse(e.data)); } catch(err) { console.error('[WS] parse error:', err); }
    };
  } catch(e) {
    console.error('[WS] connection error:', e);
    mmState = 'idle';
    updateMMUI();
  }
}

// 配對 socket (_extMMWs) 的 onmessage 需要把對局封包交給這支共用處理器；
// 由於 handleWSMessage 宣告在這支 socket 的 onmessage 之後（TDZ），
// 因此在這裡掛一個正式轉接點給它呼叫。
window.onExtractionGameMessage = function(m){ handleWSMessage(m); };
function handleWSMessage(msg) {
  switch (msg.type) {
    case 'extraction_queue_status':
      document.getElementById('mm-status').textContent = `排隊中 ... 第 ${msg.position} 位`;
      mmState = 'in_queue';
      updateMMUI();
      break;
    case 'extraction_match_found':
      mmState = 'matched';
      myPlayerId = msg.playerId;
      matchPlayers = msg.players || [];
      matchSpawn = msg.spawn;
      // 對局封包必須走持有房間歸屬的那條連線；沒有就讓 extGameSocket() 退回
      // _extMMWs，千萬不要用主連線 ws —— server 會無聲丟棄。
      if (window.multiWS && window.multiWS.readyState === WebSocket.OPEN) {
        window._extGameWs = window.multiWS;
      }
      // Start game with server-assigned spawn
      setTimeout(() => {
        launchExtractionGame();
        initRemotePlayers();
        setTimeout(() => {
          ocRequestPointerLock(renderer.domElement);
        }, 5800);
      }, 500);
      break;
    case 'extraction_queue_left':
      mmState = 'idle';
      updateMMUI();
      break;
    // State sync from other players
    case 'remote_state': {
      if (!remotePlayers[msg.playerId]) break;
      const rp = remotePlayers[msg.playerId];
      rp.targetPos = msg.pos;
      rp.targetYaw = msg.yaw;
      rp.yaw = msg.yaw;
      rp.pitch = msg.pitch;
      rp.health = msg.health;
      rp.state = msg.state;
      // 第一個封包直接定位，避免其他玩家從地圖原點一路插值過來
      if (rp.snapPending && msg.pos) {
        rp.pos.set(msg.pos.x, msg.pos.y, msg.pos.z);
        rp.snapPending = false;
      }
      break;
    }
    case 'remote_safe_open':
      // Mark safe as opened
      if (safes[msg.safeIdx]) safes[msg.safeIdx].opened = true;
      break;
    case 'remote_loot_take':
      // Remove taken loot item
      if (safes[msg.safeIdx] && safes[msg.safeIdx].loot[msg.itemIdx]) {
        safes[msg.safeIdx].loot[msg.itemIdx].taken = true;
      }
      break;
    case 'remote_door_toggle':
      if (doors[msg.doorIdx]) {
        doors[msg.doorIdx].open = msg.open;
        if (doors[msg.doorIdx].mesh) {
          doors[msg.doorIdx].mesh.rotation.y = msg.open ? Math.PI/2 : 0;
        }
      }
      break;
    case 'remote_shoot':
      // Visual feedback: flash at shooter position (pooled, no shader recompile)
      if (remotePlayers[msg.playerId] && remotePlayers[msg.playerId].mesh) {
        const rpMesh = remotePlayers[msg.playerId].mesh;
        _extBotFlashVec.copy(rpMesh.position);
        _extBotFlashVec.y += 0.6;
        popExtFlashLight(0xffaa44, 5, _extBotFlashVec, 1);
      }
      break;
    case 'you_were_hit':
      // Another player shot us
      damagePlayer(msg.damage);
      showHUD(`💥 受到 ${msg.damage} 點傷害 (來自 ${matchPlayers[msg.byPlayerId] ? matchPlayers[msg.byPlayerId].name : '對手'})`);
      break;
    case 'remote_player_death':
      if (remotePlayers[msg.playerId]) {
        remotePlayers[msg.playerId].health = 0;
        remotePlayers[msg.playerId].state = 'dead';
        showHUD(`💀 ${matchPlayers[msg.playerId] ? matchPlayers[msg.playerId].name : '玩家'} 已陣亡`);
      }
      break;
    case 'extraction_decrypt_started':
      if (msg.pendingId && msg.pendingId !== decryptPendingId) {
        if (!decryptActive) {
          decryptActive = true;
          decryptPendingId = msg.pendingId;
          decryptEndsAt = msg.endsAt || (Date.now() + DECRYPT_DURATION*1000);
          decryptLocalInitiator = false;
          decryptStoneId = msg.stoneId || null;
          const s2 = stones.find(x => x.id === decryptStoneId);
          if (s2){ s2.status = 'DECODING'; if (s2.mesh){ scene.remove(s2.mesh); s2.mesh = null; } }
          spawnDecryptBeam();
          showAnnounce(`🔓 ${matchPlayers[msg.playerId] ? matchPlayers[msg.playerId].name : '隊友'} 正在解析小黃石`, 'rgba(60,255,140,.6)');
        }
      } else if (msg.pendingId === decryptPendingId && msg.endsAt) {
        decryptEndsAt = msg.endsAt; // 伺服器權威時間
      }
      break;
    case 'extraction_decrypt_done':
      finishDecrypt(msg.pendingId);
      break;
    case 'remote_stone_pickup':
      {
        const s = stones.find(x => x.id === msg.stoneId);
        if (s && s.status === 'WORLD') {
          s.status = 'CARRIED'; s.owner = msg.playerId;
          if (s.mesh){ scene.remove(s.mesh); s.mesh = null; }
          showAnnounce(`🟣 ${matchPlayers[msg.playerId] ? matchPlayers[msg.playerId].name : '玩家'} 撿走了未鑑定小黃石`, 'rgba(155,89,182,.6)');
        }
      }
      break;
    case 'remote_stone_drop':
      {
        const s = stones.find(x => x.id === msg.stoneId);
        if (s) dropStoneAt(s, msg.x, msg.y, msg.z);
      }
      break;
    case 'remote_lever_pull':
      if (EXT && !EXT.on) {
        pullLever(msg.t);
        showHUD(`🚁 ${matchPlayers[msg.playerId] ? matchPlayers[msg.playerId].name : '玩家'} 拉下了電子鎖 — 撤離倒數開始`);
      }
      break;
    case 'remote_extracted':
      showHUD(`✅ ${matchPlayers[msg.playerId] ? matchPlayers[msg.playerId].name : '玩家'} 撤離成功`);
      if (remotePlayers[msg.playerId]) remotePlayers[msg.playerId].state = 'extracted';
      break;
    case 'remote_player_disconnected':
      showHUD(`🔌 ${msg.playerName || '玩家'} 已斷線`);
      if (remotePlayers[msg.playerId]) {
        if (remotePlayers[msg.playerId].mesh) scene.remove(remotePlayers[msg.playerId].mesh);
        delete remotePlayers[msg.playerId];
      }
      break;
    case 'extraction_room_players':
      document.getElementById('mm-status').textContent = `房間剩餘 ${msg.count}/5 人`;
      break;
  }
}

function updateMMUI() {
  const btn = document.getElementById('mm-btn');
  const status = document.getElementById('mm-status');
  const slots = document.querySelectorAll('.mm-slot');
  if (mmState === 'connecting') {
    btn.textContent = '連線中...';
    btn.disabled = true;
    btn.className = '';
    status.textContent = '正在連接伺服器...';
  } else if (mmState === 'idle') {
    btn.textContent = '🔍 匹配 5人';
    btn.disabled = false;
    btn.className = '';
    status.textContent = '點擊按鈕開始匹配';
    slots.forEach((s, i) => { s.className = 'mm-slot'; s.textContent = (i+1); });
  } else if (mmState === 'in_queue') {
    btn.textContent = '✕ 取消匹配';
    btn.disabled = false;
    btn.className = 'cancel';
  } else if (mmState === 'matched') {
    btn.textContent = '✓ 匹配成功';
    btn.disabled = true;
    btn.className = '';
    status.textContent = '遊戲即將開始...';
    // Show matched players in slots
    slots.forEach((s, i) => {
      if (i < matchPlayers.length) {
        s.className = 'mm-slot filled';
        s.textContent = matchPlayers[i].id === myPlayerId ? '我' : (i+1);
        if (matchPlayers[i].id === myPlayerId) s.classList.add('self');
      } else {
        s.className = 'mm-slot';
        s.textContent = (i+1);
      }
    });
  }
}

function toggleMatchmaking() {
  if (mmState === 'idle') {
    // Join queue
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'join_extraction_queue', name: mmName }));
      mmState = 'connecting';
      updateMMUI();
    }
  } else if (mmState === 'in_queue') {
    // Leave queue
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave_extraction_queue' }));
    }
    mmState = 'idle';
    updateMMUI();
  }
}

// 摸金房間歸屬綁在「配對連線」上（server.js 只會對 startExtractionMatch() 裡
// 的那條 socket 賦值 ws.extractionRoomId）。若改用主連線 ws 送出，server 的
// handleExtractionMessage() 會因為 roomId === undefined 走進佇列管理分支並
// 直接 return，把 extraction_state / safe_open / loot_take / door_toggle /
// shoot / hit_player / player_death / start_extract / extracted 全部無聲丟棄。
// 因此對局期間一律使用配對連線 _extGameWs。
// 對局連線只認配對 socket。若無可用的配對連線就回傳 null 讓呼叫端中止，
// 絕不退回主連線 ws —— 那會讓 server 無聲丟棄封包，比直接失敗更難排查。
function extGameSocket() {
  if (window._extGameWs && window._extGameWs.readyState === WebSocket.OPEN) return window._extGameWs;
  if (_extMMWs && _extMMWs.readyState === WebSocket.OPEN) return _extMMWs;
  return null;
}
function closeExtGameSocket() {
  if (window._extGameWs) { try { window._extGameWs.close(); } catch (e) {} window._extGameWs = null; }
}
function sendExtractionState() {
  var sock = extGameSocket();
  if (!sock) return;
  if (gameState !== STATE.DEPLOYED && gameState !== STATE.EXTRACTING) return;
  sock.send(JSON.stringify({
    type: 'extraction_state',
    pos: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
    yaw, pitch, health: playerHealth, state: gameState === STATE.EXTRACTING ? 'extracting' : 'alive'
  }));
}

function sendExtractionMessage(msg) {
  var sock = extGameSocket();
  if (sock) sock.send(JSON.stringify(msg));
}

// ============ REMOTE PLAYER RENDERING ============
function initRemotePlayers() {
  // Clear any existing remote players
  for (const pid in remotePlayers) {
    if (remotePlayers[pid].mesh) scene.remove(remotePlayers[pid].mesh);
  }
  remotePlayers = {};
  // Create a block character for each other player
  for (const p of matchPlayers) {
    if (p.id === myPlayerId) continue;
    const color = REMOTE_COLORS[p.id % REMOTE_COLORS.length];
    const name = REMOTE_NAMES[p.id % REMOTE_NAMES.length];
    const g = new THREE.Group();
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const bodyMat = M(color);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.4, 0);
    g.add(body);
    // Head
    const headGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const headMat = M(color + 0x222222);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.85, 0);
    g.add(head);
    // Gun
    const gunGeo = new THREE.BoxGeometry(0.4, 0.04, 0.04);
    const gun = new THREE.Mesh(gunGeo, M(0x333333));
    gun.position.set(0.25, 0.35, -0.15);
    g.add(gun);
    g.userData.noRaycast = true;  // 遠端玩家：已用獨立 raycast 做 PvP 判定
    scene.add(g);
    remotePlayers[p.id] = {
      pos: new THREE.Vector3(0, 0, 0),
      targetPos: null,
      snapPending: true,   // 收到第一個封包時直接跳到真實座標，不要從原點滑過來
      yaw: 0,
      targetYaw: 0,
      pitch: 0,
      health: 100,
      state: 'alive',
      mesh: g,
      name: p.name || name,
      color
    };
  }
}

function updateRemotePlayers(dt) {
  for (const pid in remotePlayers) {
    const rp = remotePlayers[pid];
    if (!rp.mesh) continue;
    // Interpolate position
    if (rp.targetPos) {
      rp.pos.x += (rp.targetPos.x - rp.pos.x) * 0.2;
      rp.pos.y += (rp.targetPos.y - rp.pos.y) * 0.2;
      rp.pos.z += (rp.targetPos.z - rp.pos.z) * 0.2;
    }
    // Interpolate yaw
    rp.yaw += (rp.targetYaw - rp.yaw) * 0.2;
    // Update mesh
    rp.mesh.position.copy(rp.pos);
    rp.mesh.rotation.y = rp.yaw;
    // Dead state: tip over
    if (rp.state === 'dead') {
      rp.mesh.rotation.x = Math.PI / 2;
    }
    // Update nametag position (billboard sprite not implemented, skip)
  }
}

// ============ SPAWN POINTS ============
const SPAWNS = [
  { x:0,    z:20,  name:'中央廣場' },
  { x:-105, z:0,   name:'西側路口' },
  { x:105,  z:45,  name:'東側路口' },
  { x:-105, z:85,  name:'西南停車場' },
  { x:105,  z:95,  name:'東北路口' },
];
const EXFIL_POS = { x:15, z:-66 };
let playerSpawnIdx = -1;

// ============ SAFES & DOORS ============
let safes = [];
let doors = [];
let activeSafe = null;

function initSafes() {
  const safePositions = [
    { x:36,  z:-24, name:'總裁區金庫',   zone:'exec',    rarity:3 },
    { x:64,  z:-36, name:'總裁區保險櫃', zone:'exec',    rarity:3 },
    { x:-41, z:4,   name:'發電站控制箱', zone:'power',   rarity:2 },
    { x:41,  z:64,  name:'核能研究保險箱', zone:'nuclear', rarity:3 },
    { x:41,  z:4,   name:'生物樣本保險箱', zone:'bio',    rarity:2 },
    { x:-41, z:64,  name:'航天資料保險箱', zone:'aero',   rarity:3 },
    { x:14,  z:40,  name:'噴水池珠寶箱', zone:'fountain', rarity:2 },
    { x:0,   z:-45, name:'高速橋下物資箱', zone:'highway', rarity:1 },
  ];
  for (const sp of safePositions) {
    safes.push({
      ...sp,
      opened: false,
      loot: generateSafeLoot(sp.rarity),
      mesh: null,
      lidMesh: null,
      interactDist: 2.5
    });
  }
}

function initDoors() {
  // 西里高速公路地圖：四棟建築採開放式入口（world 內建牆洞），無可開合的門扇
  doors = [];
}

// ============ ITEM SYSTEM ============
const ITEM_DB = {
  // Common items (size 1)
  common_ammo:{name:'彈藥箱',rarity:0,size:1,value:100},
  common_med:{name:'醫療包',rarity:0,size:1,value:150},
  common_food:{name:'軍糧',rarity:0,size:1,value:80},
  common_battery:{name:'電池',rarity:0,size:1,value:120},
  common_tool:{name:'工具組',rarity:0,size:1,value:100},
  common_doc:{name:'文件碎片',rarity:0,size:1,value:50},
  // Rare items (size 1-2)
  rare_id:{name:'軍官證',rarity:1,size:1,value:300},
  rare_nv:{name:'夜視儀',rarity:1,size:2,value:450},
  rare_comms:{name:'加密通訊器',rarity:1,size:1,value:350},
  rare_part:{name:'精密零件',rarity:1,size:1,value:250},
  rare_map:{name:'軍用地圖',rarity:1,size:1,value:280},
  rare_medal:{name:'勳章',rarity:1,size:1,value:400},
  // Special items (size 2-4)
  special_intel:{name:'機密情報',rarity:2,size:2,value:800},
  special_gold:{name:'金條',rarity:2,size:2,value:1000},
  special_jewel:{name:'珠寶',rarity:2,size:1,value:700},
  special_proto:{name:'原型武器',rarity:2,size:4,value:1200},
  special_armor:{name:'特種裝甲板',rarity:2,size:2,value:600},
  // Legendary items (size 2-4)
  legend_flight:{name:'飛行記錄器',rarity:3,size:2,value:5000},
  legend_radar:{name:'雷達核心',rarity:3,size:2,value:8000},
  legend_cache:{name:'秘密儲藏室鑰匙',rarity:3,size:1,value:3000},
  legend_weapon:{name:'實驗性武器',rarity:3,size:4,value:10000},
  // Mythic items (size 3-5, ultra rare)
  mythic_goldstatue:{name:'純金雕像',rarity:4,size:4,value:1000000},
  mythic_crown:{name:'將軍皇冠',rarity:4,size:3,value:1500000},
  mythic_core:{name:'失落核心',rarity:4,size:5,value:3000000},
  mythic_artifact:{name:'古代神器',rarity:4,size:3,value:5000000},
};
const RARITY_NAMES = ['普通','稀有','特殊','傳說','神話'];
const RARITY_COLORS = ['#999','#38f','#fa0','#f36','#ff0'];
const RARITY_COLORS_HEX = [0x999999,0x3388ff,0xffaa00,0xff3366,0xffaa00];
const RARITY_ITEM_POOLS = {
  0: ['common_ammo','common_med','common_food','common_battery','common_tool','common_doc'],
  1: ['rare_id','rare_nv','rare_comms','rare_part','rare_map','rare_medal'],
  2: ['special_intel','special_gold','special_jewel','special_proto','special_armor'],
  3: ['legend_flight','legend_radar','legend_cache','legend_weapon'],
  4: ['mythic_goldstatue','mythic_crown','mythic_core','mythic_artifact'],
};

function generateSafeLoot(rarity) {
  const pool = [];
  for (const k of RARITY_ITEM_POOLS[rarity]) pool.push(k);
  if (rarity > 0) pool.push(...RARITY_ITEM_POOLS[0].slice(0,2));
  if (rarity > 1) pool.push(...RARITY_ITEM_POOLS[1].slice(0,2));
  // 8% chance to drop a mythic item in legendary safes
  if (rarity >= 3 && Math.random() < 0.08) {
    const mk = RARITY_ITEM_POOLS[4][Math.floor(Math.random() * RARITY_ITEM_POOLS[4].length)];
    pool.push(mk);
  }
  const count = 2 + Math.floor(Math.random() * Math.min(3, pool.length));
  const picked = [];
  const used = new Set();
  for (let i=0; i<count; i++) {
    let idx;
    do { idx = Math.floor(Math.random() * pool.length); } while(used.has(idx) && used.size < pool.length);
    used.add(idx);
    picked.push({ key:pool[idx], ...ITEM_DB[pool[idx]], taken:false });
  }
  return picked;
}

// ============ 未鑑定小黃石 / 破譯站 ============
let decryptStation = null;
let decryptStationMesh = null;
let decryptBeam = null;
let decryptActive = false;
let decryptEndsAt = 0;
let decryptPendingId = null;
let decryptLocalInitiator = false;
let decryptStoneId = null;
var decryptDoneIds = {};
const DECRYPT_DURATION = 60;
let stones = [];
let stoneSeq = 0;
let stoneRaidOn = false;
let carryStoneMesh = null;
let _extDropIdx = -1;

function showAnnounce(msg, color) {
  const el = document.getElementById('ext-announce');
  if (!el) return;
  el.textContent = msg;
  el.style.borderColor = color || 'rgba(150,255,150,.35)';
  el.style.display = 'block';
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'extAnnounceFade 4s ease-out forwards';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function makeStoneMesh(){
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55),
    new THREE.MeshStandardMaterial({color:0x9b59b6, emissive:0x7d3c98, emissiveIntensity:1.4, metalness:0.35, roughness:0.22}));
  core.castShadow = true;
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85,10,8),
    new THREE.MeshBasicMaterial({color:0xbb77dd, transparent:true, opacity:0.22, depthWrite:false}));
  g.add(halo);
  return g;
}

// 本局是否生成小黃石＋破譯站（兩種難度皆生成，確保玩家一定看得到）
function startStoneRaid(){
  stones = [];
  decryptActive = false; decryptEndsAt = 0; decryptPendingId = null;
  decryptLocalInitiator = false; decryptStoneId = null; decryptDoneIds = {};
  stoneRaidOn = true;
  const spots = [
    {x:0,z:-20},{x:70,z:40},{x:-70,z:40},{x:0,z:92},{x:110,z:0},{x:-110,z:0},
    {x:100,z:-40},{x:-100,z:-40},{x:70,z:92},{x:-70,z:92},{x:45,z:-58},{x:-45,z:-58},
  ];
  const order = spots.slice().sort(() => Math.random() - 0.5);
  let placed = 0;
  for (const sp of order) {
    if (placed >= 6) break;
    if (!stoneSpotFree(sp.x, sp.z)) continue;
    spawnStoneAt(sp.x, sp.z);
    placed++;
  }
  // 安全網：若全部點位被擋，強制在前 3 個點生成，確保一定有石頭
  if (placed === 0) {
    for (const sp of spots.slice(0, 3)) { spawnStoneAt(sp.x, sp.z); placed++; }
  }
  console.log('[StoneRaid] stones spawned:', stones.length, 'decrypt:', !!decryptStation);
  if (stones.length > 0) spawnDecryptStation();
  showAnnounce('🟣 本局偵測到未鑑定小黃石 ×' + stones.length + '（藍色破譯站解析後才會入帳）', 'rgba(155,89,182,.6)');
}

function stoneSpotFree(x, z){
  if (Math.abs(x) > W_HALF-2 || Math.abs(z) > W_HALF-2) return false;
  for (const c of colliders) {
    if (x > c.x0-0.6 && x < c.x1+0.6 && z > c.z0-0.6 && z < c.z1+0.6) return false;
  }
  const fdx = x-FT_X, fdz = z-FT_Z;
  if (fdx*fdx + fdz*fdz < (FT_R+2)*(FT_R+2)) return false;
  for (const s of safes) {
    if (Math.hypot(x-s.x, z-s.z) < 3) return false;
  }
  if (terrainY(x,z) > 2) return false;
  return true;
}

function spawnStoneAt(x, z){
  const id = 'st_' + Date.now().toString(36) + '_' + (stoneSeq++);
  const y = terrainY(x,z) + 0.7;
  const mesh = makeStoneMesh();
  mesh.position.set(x, y, z);
  scene.add(mesh);
  stones.push({ id, x, y, z, mesh, status:'WORLD', owner:null });
}

function removeStoneMesh(s){ if (s.mesh){ scene.remove(s.mesh); s.mesh = null; } }

function findStoneNear(dist){
  for (const s of stones) {
    if (s.status !== 'WORLD') continue;
    const dx = playerPos.x - s.x, dz = playerPos.z - s.z;
    if (dx*dx + dz*dz < dist*dist) return s;
  }
  return null;
}

function pickupStone(){
  if (gameState !== STATE.DEPLOYED) return;
  const s = findStoneNear(2.5);
  if (!s){ showHUD('附近沒有小黃石'); return; }
  if (collectedItems.length >= BACKPACK_MAX){ showHUD('⚠ 背包已滿！'); return; }
  s.status = 'CARRIED'; s.owner = 'me';
  if (s.mesh){ scene.remove(s.mesh); s.mesh = null; }
  collectedItems.push({ key:'unid_stone', name:'未鑑定小黃石', rarity:4, size:1, value:0, color:'#9b59b6', unid:true, stoneId:s.id, taken:true });
  collectedCount++;
  updateBackpackUI();
  showAnnounce('🟣 拾取未鑑定小黃石 — 送往藍色破譯站解析後才會入帳！', 'rgba(155,89,182,.6)');
  sendExtractionMessage({ type:'extraction_stone_pickup', stoneId: s.id });
}

function dropStoneAt(s, x, y, z){
  s.status = 'WORLD'; s.owner = null;
  s.x = x; s.y = y; s.z = z;
  if (!s.mesh){ s.mesh = makeStoneMesh(); scene.add(s.mesh); }
  s.mesh.position.set(x, y, z);
}

function dropStoneNearPlayer(s){
  const x = playerPos.x, z = playerPos.z, y = terrainY(x,z)+0.7;
  dropStoneAt(s, x, y, z);
  sendExtractionMessage({ type:'extraction_stone_drop', stoneId: s.id, x, y, z });
}

function carriedMine(){ return stones.filter(s => s.status==='CARRIED' && s.owner==='me'); }

// 背包格點擊 → 未鑑定小黃石走丟棄確認，一般物品直接丟
function openDropConfirm(idx){
  _extDropIdx = idx;
  const el = document.getElementById('ext-drop-confirm');
  if (!el){ doDropStoneItem(idx); return; }
  el.style.display = 'flex';
}
function closeDropConfirm(){
  const el = document.getElementById('ext-drop-confirm');
  if (el) el.style.display = 'none';
  _extDropIdx = -1;
}
function doDropStoneItem(idx){
  const item = collectedItems[idx];
  if (!item || !item.unid) return;
  collectedItems.splice(idx, 1);
  collectedCount--;
  const s = stones.find(x => x.id === item.stoneId);
  if (s && s.status === 'CARRIED') dropStoneNearPlayer(s);
  updateBackpackUI();
  showHUD('✕ 丟棄未鑑定小黃石（掉落原地，小地圖可見）');
}
window.extDropYes = function(){ doDropStoneItem(_extDropIdx); closeDropConfirm(); if (backpackOpen) updateBackpackUI(); };
window.extDropNo = function(){ closeDropConfirm(); };

// 攜帶中的小黃石跟隨視覺
function updateStoneCarry(dt){
  const list = carriedMine();
  if (list.length) {
    if (!carryStoneMesh) {
      carryStoneMesh = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28),
        new THREE.MeshStandardMaterial({color:0x9b59b6, emissive:0x7d3c98, emissiveIntensity:1.2, metalness:0.35, roughness:0.25}));
      carryStoneMesh.add(core);
      scene.add(carryStoneMesh);
    }
    while (carryStoneMesh.children.length < list.length) carryStoneMesh.add(carryStoneMesh.children[0].clone());
    while (carryStoneMesh.children.length > list.length) carryStoneMesh.remove(carryStoneMesh.children[carryStoneMesh.children.length-1]);
    carryStoneMesh.visible = true;
    carryStoneMesh.position.set(playerPos.x, playerPos.y + 0.5, playerPos.z - 0.3);
    carryStoneMesh.rotation.y += dt * 2;
    for (let i=0; i<carryStoneMesh.children.length; i++) {
      carryStoneMesh.children[i].position.x = (i - (list.length-1)/2) * 0.36;
      carryStoneMesh.children[i].rotation.x += dt * 3;
    }
  } else if (carryStoneMesh) {
    carryStoneMesh.visible = false;
  }
  // 世界中的小黃石浮空旋轉
  for (const s of stones) {
    if (s.status === 'WORLD' && s.mesh) {
      s.mesh.position.y = s.y + Math.sin(Date.now()*0.003 + s.x)*0.12;
      s.mesh.rotation.y += dt * 1.5;
    }
  }
}

function spawnDecryptStation() {
  if (decryptStation) return;
  const spots = [
    {x:0,z:-5},{x:-30,z:45},{x:30,z:45},{x:90,z:20},{x:-90,z:20},
    {x:10,z:80},{x:-10,z:-45},{x:100,z:-60},{x:-100,z:-60},{x:0,z:110},
  ];
  const order = spots.slice().sort(() => Math.random() - 0.5);
  let x = 150, z = 150, ok = false;
  for (const sp of order) {
    let bad = false;
    for (const c of colliders) {
      const hw = c.w / 2, hd = c.d / 2;
      if (sp.x > c.x - hw - 2 && sp.x < c.x + hw + 2 && sp.z > c.z - hd - 2 && sp.z < c.z + hd + 2) { bad = true; break; }
    }
    if (bad) continue;
    x = sp.x; z = sp.z; ok = true;
    break;
  }
  decryptStation = { x, z };
  buildDecryptStationMesh(x, z);
}

function buildDecryptStationMesh(x, z) {
  const g = new THREE.Group();
  const sy = terrainY(x, z);
  g.position.set(x, sy, z);
  scene.add(g);
  const base = new THREE.Mesh(geoBox, M(0x223355));
  base.scale.set(1.2, 0.12, 1.2);
  base.position.set(0, 0.06, 0);
  g.add(base);
  const core = new THREE.Mesh(geoBox, M(0x3355bb, {emissive:0x2244aa, emissiveIntensity:0.6, metalness:0.5, roughness:0.3}));
  core.scale.set(0.7, 0.9, 0.7);
  core.position.set(0, 0.45, 0);
  g.add(core);
  const screen = new THREE.Mesh(geoBox, M(0x1188ff, {emissive:0x0066ff, emissiveIntensity:0.9}));
  screen.scale.set(0.5, 0.3, 0.06);
  screen.position.set(0, 0.55, 0.36);
  g.add(screen);
  const light = new THREE.PointLight(0x2288ff, 0.9, 8);
  light.position.set(0, 1, 0);
  g.add(light);
  decryptStationMesh = g;
  decryptStation.light = light;
  decryptStation.g = g;
}

function updateDecryptStationVisual(dt) {
  if (!decryptStation || !decryptStationMesh) return;
  if (decryptStation.light) {
    decryptStation.light.intensity = (decryptActive ? 1.1 : 0.7) + Math.sin(Date.now() * 0.004) * 0.3;
    if (decryptActive) {
      decryptStation.light.color.setHSL(((Date.now() * 0.001) % 1), 1, 0.5);
    } else {
      decryptStation.light.color.setHSL(0.6, 1, 0.5);
    }
  }
  if (decryptStationMesh.children[2]) {
    decryptStationMesh.children[2].material.color.setHSL(0.6, 1, 0.5);
  }
  if (decryptActive && decryptBeam) {
    decryptBeam.material.opacity = 0.2 + Math.sin(Date.now() * 0.006) * 0.12;
    decryptBeam.rotation.y += dt * 1.2;
  }
}

function spawnDecryptBeam(){
  if (decryptBeam || !decryptStation) return;
  const beamGeo = new THREE.CylinderGeometry(0.25, 0.55, 18, 10, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({color:0x2288ff, transparent:true, opacity:0.22, side:THREE.DoubleSide, depthWrite:false});
  decryptBeam = new THREE.Mesh(beamGeo, beamMat);
  decryptBeam.position.set(decryptStation.x, terrainY(decryptStation.x, decryptStation.z) + 9, decryptStation.z);
  scene.add(decryptBeam);
}

function startDecrypt() {
  if (!decryptStation || decryptActive) return;
  const s = stones.find(x => x.status==='CARRIED' && x.owner==='me');
  if (!s){ showHUD('⚠ 需要攜帶未鑑定小黃石才能解析'); return; }
  const idx = collectedItems.findIndex(it => it.unid && it.stoneId === s.id);
  if (idx !== -1){ collectedItems.splice(idx, 1); collectedCount--; updateBackpackUI(); }
  s.status = 'DECODING';
  decryptActive = true;
  decryptStoneId = s.id;
  decryptPendingId = 'dp_' + Date.now().toString(36) + '_' + Math.floor(Math.random()*1e6).toString(36);
  decryptLocalInitiator = true;
  decryptEndsAt = Date.now() + DECRYPT_DURATION * 1000;
  spawnDecryptBeam();
  showAnnounce('🔓 解析開始！堅守破譯站 ' + DECRYPT_DURATION + ' 秒', 'rgba(60,255,140,.6)');
  sendExtractionMessage({ type:'extraction_decrypt_start', pendingId: decryptPendingId, stoneId: s.id });
}

function finishDecrypt(pendingId) {
  pendingId = pendingId || decryptPendingId;
  if (!pendingId || decryptDoneIds[pendingId]) return;
  decryptDoneIds[pendingId] = true;
  const wasInitiator = decryptLocalInitiator && pendingId === decryptPendingId;
  const s = stones.find(x => x.id === decryptStoneId) || stones.find(x => x.status === 'DECODING');
  if (s && s.status === 'DECODING'){
    removeStoneMesh(s);
    s.status = 'GONE';
  }
  if (wasInitiator && s) {
    window.US.addPending(pendingId);
    showAnnounce('✅ 解析完成！已放入「未開啟的小黃石」清單（摸金樞紐）', 'rgba(80,255,180,.7)');
  } else if (wasInitiator) {
    window.US.addPending(pendingId);
  }
  decryptActive = false;
  decryptPendingId = null;
  decryptLocalInitiator = false;
  decryptStoneId = null;
  decryptEndsAt = 0;
  if (decryptBeam){ scene.remove(decryptBeam); decryptBeam = null; }
  const remain = document.getElementById('extraction-status');
  if (remain){ remain.style.display = 'none'; remain.textContent = ''; }
}

// ============ THREE.JS SETUP ============
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4a6a8a);
scene.fog = new THREE.Fog(0x4a6a8a, 120, 280);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('extraction-root').prepend(renderer.domElement);

// FPS Weapon system
let extGunGroup = null;
let extGunType = 'ak47';
const _gunOffset = new THREE.Vector3();
function switchExtGun(type) {
  if (!type) return;
  if (extGunGroup && extGunType === type) return;
  // Swap animation
  if (extGunGroup) {
    extSwapOldGroup = extGunGroup; extSwapOldType = extGunType;
    extSwapAnim = extSwapDuration;
  }
  extGunType = type;
  var fn = window.createGunModel;
  extGunGroup = fn ? fn(type) : null;
  if (!extGunGroup) {
    extGunGroup = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({color:0x666666,metalness:0.5,roughness:0.4});
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.014,0.25,6),mat);
    barrel.rotation.x=Math.PI/2; barrel.position.set(0,0,-0.15);
    extGunGroup.add(barrel);
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.04,0.12),mat);
    body.position.set(0,0,0);
    extGunGroup.add(body);
  }
  extGunGroup.position.set(0,0,0);
  extGunGroup.scale.set(1.5,1.5,1.5);
  extGunGroup.rotation.set(0,0,0);
  scene.add(extGunGroup);
  // Barrel tip for muzzle flash
  extGunGroup.userData.barrelTip = new THREE.Vector3(0,0,-0.33);
  // 槍身不列入靜態 raycast 清單（子彈不應命中自己的槍）
  extGunGroup.traverse(function (o) { o.userData.noRaycast = true; });
  var bt = window.barrelTips ? window.barrelTips[type] : null;
  if (bt) extGunGroup.userData.barrelTip.copy(bt);
  // Magazine
  // MP7（OBJ 模型）自帶彈匣，不再疊灰色彈匣
  if (type!=='knife'&&type!=='grapple'&&type!=='grenade'&&!(type==='smg'&&extGunGroup.userData&&extGunGroup.userData.magMesh)) {
    var mgMat = new THREE.MeshStandardMaterial({color:0x444444,metalness:0.5,roughness:0.4});
    var mgBase = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.055,0.014),mgMat);
    mgBase.position.set(0,-0.04,0); extGunGroup.add(mgBase);
    for (var bi=0;bi<5;bi++) {
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.004,4,4),new THREE.MeshStandardMaterial({color:0xccaa44,metalness:0.6}));
      b.position.set(0.015,-0.058+bi*0.009,0.006); extGunGroup.add(b);
    }
  }
  // Init ammo if not yet tracked
  if (extAmmo[type] === undefined) initExtAmmo(type);
  extMaxAmmo = (window.gunData && window.gunData[type] ? window.gunData[type].mag : 30) || 30;
  var gd = window.gunData;
  showHUD('🔫 '+(gd&&gd[type]?gd[type].name||type:type));
}
window._testExtGun = function(){return {type:extGunType, group:extGunGroup};};

const ambient = new THREE.AmbientLight(0x404060, 0.4);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a2a1a, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
sun.position.set(100, 80, 50);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
fill.position.set(-50, 30, -80);
scene.add(fill);

const M = (c,o) => { const p=Object.assign({color:c},o||{}); delete p.metalness; delete p.roughness; return new THREE.MeshLambertMaterial(p); };
const mConcrete = M(0x404040);
const mRoof = M(0x2a2a2a);
const mRoad = M(0x555555);
const mCurb = M(0x666666);
const mTrunk = M(0x5a4030);
const mLeaves = M(0x2a7a2a);
const mRock = M(0x666060);
const mBarrel = M(0x3a4a3a);
const mPole = M(0x333338);
const mSandbag = M(0x8a7a4a);
const mBarbed = M(0x3a3028);
const mFence = M(0x4a4840);

const geoBox = new THREE.BoxGeometry(1,1,1);
function buildBox(g,x,y,z,w,h,d,mat){ var o=new THREE.Mesh(geoBox,mat); o.scale.set(w,h,d); o.position.set(x,y,z); g.add(o); return o; }
const geoCyl = new THREE.CylinderGeometry(0.5,0.5,1,8);
const geoSphere = new THREE.SphereGeometry(0.5,8,6);

function rng(seed) { let s=seed; return ()=> { s=(s*9301+49297)%233280; return s/233280; }; }
const rand = rng(42);
function randRange(min,max) { return min+rand()*(max-min); }

// ============ TERRAIN（世界為 ±150 平坦大地 + 箱頂踩踏） ============
const W_HALF = 150;
const terrainY = (x,z) => floorAt(x,z,0.5);

var exfilBeam = null, exfilGlow = null;
var SIRIT_GATE = { x:14, z:18 };        // 配電站電力閘
var SIRIT_DOOR = { x:10, z:2  };        // 列車登車口（南側平台邊）
var SIRIT_TEACUP = { x:-2.4, y:1.35, z:-0.6 }; // 車廂內茶水位置（局部）

const colliders = [];
function addCollider(x,y,z,w,h,d) { const co={x,y,z,w,h,d,bx:x, x0:x-w/2, x1:x+w/2, y0:y-h/2, y1:y+h/2, z0:z-d/2, z1:z+d/2}; colliders.push(co); return co; }
// 視線檢查：線段 (x0,y0,z0)->(x1,y1,z1) 是否被任何箱型牆擋住（slab test）
function extLosClear(x0,y0,z0,x1,y1,z1) {
  var dx=x1-x0, dy=y1-y0, dz=z1-z0;
  for (var i=0;i<colliders.length;i++) {
    var b=colliders[i], tmin=0, tmax=1, t1, t2, tt;
    if (Math.abs(dx)<1e-8) { if(x0<b.x0||x0>b.x1) continue; }
    else { t1=(b.x0-x0)/dx; t2=(b.x1-x0)/dx; if(t1>t2){tt=t1;t1=t2;t2=tt;} if(t1>tmin)tmin=t1; if(t2<tmax)tmax=t2; if(tmin>tmax) continue; }
    if (Math.abs(dy)<1e-8) { if(y0<b.y0||y0>b.y1) continue; }
    else { t1=(b.y0-y0)/dy; t2=(b.y1-y0)/dy; if(t1>t2){tt=t1;t1=t2;t2=tt;} if(t1>tmin)tmin=t1; if(t2<tmax)tmax=t2; if(tmin>tmax) continue; }
    if (Math.abs(dz)<1e-8) { if(z0<b.z0||z0>b.z1) continue; }
    else { t1=(b.z0-z0)/dz; t2=(b.z1-z0)/dz; if(t1>t2){tt=t1;t1=t2;t2=tt;} if(t1>tmin)tmin=t1; if(t2<tmax)tmax=t2; if(tmin>tmax) continue; }
    if (tmin>0.03 && tmin<0.97) return false;
  }
  return true;
}

// 踩踏/擋牆判定（移植自 sirit-base.html，支援站上箱頂、0.45 踏步、樓梯連續上升）
function floorAt(px,pz,py,cap){var best=0;for(var i=0;i<colliders.length;i++){var b=colliders[i];if(px>b.x0&&px<b.x1&&pz>b.z0&&pz<b.z1&&b.y1<=py+0.45&&(cap===void 0||b.y1<=cap)&&b.y1>best)best=b.y1;}return best;}
function blockedAxis(px,py,pz,r,hgt,ax,az){
  for(var i=0;i<colliders.length;i++){
    var b=colliders[i];
    if(b.y0<py+hgt&&b.y1>py+0.12){
      if(!(ax+r>b.x0&&ax-r<b.x1&&az+r>b.z0&&az-r<b.z1))continue;
      if(b.y1>b.y0&&b.y1<=py+0.45){
        var ok=true,rh=r*0.5;
        for(var j=0;j<colliders.length;j++){
          var c=colliders[j];
          if(c.y1>b.y1+0.45&&c.y0<b.y1+hgt&&ax+rh>c.x0&&ax-rh<c.x1&&az+rh>c.z0&&az-rh<c.z1){ok=false;break;}
        }
        if(ok)continue;
        return true;
      }
      if(floorAt(ax,az,b.y1,b.y1)>=b.y1-0.45)continue;
      return true;
    }
  }
  return false;
}

function sBox(w,h,d,col,px,py,pz,opt) { const m=new THREE.Mesh(geoBox, M(col,opt||{})); m.scale.set(w,h,d); m.position.set(px,py,pz); scene.add(m); return m; }
function sColl(w,h,d,px,py,pz) { return addCollider(px,py,pz,w,h,d); }
function sCyl(r1,r2,len,col,px,py,pz,opt) { const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,10), M(col,opt||{})); m.position.set(px,py,pz); scene.add(m); return m; }
// 大量重複物件用 InstancedMesh（等同 sirit-dam 的 mcInst/place）
function sInst(w,h,d,count) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(w,h,d), M(0xffffff), count);
  im.frustumCulled = false;
  scene.add(im);
  return im;
}
const _sIMtx = new THREE.Matrix4(), _sIQ = new THREE.Quaternion(), _sIPos = new THREE.Vector3(), _sIScl = new THREE.Vector3();
function sPlace(im, idx, x,y,z, sx,sy,sz, ry) {
  if (idx >= im.instanceMatrix.count) return;
  _sIPos.set(x,y,z); _sIScl.set(sx==null?1:sx, sy==null?1:sy, sz==null?1:sz);
  _sIQ.setFromAxisAngle(new THREE.Vector3(0,1,0), ry||0);
  _sIMtx.compose(_sIPos,_sIQ,_sIScl);
  im.setMatrixAt(idx, _sIMtx);
}
// 文字招牌（等同 sirit-dam 的 mcTex）
function sTex(str, fg, bg, x, y, z, sizeW) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const cx = cv.getContext('2d');
  cx.clearRect(0,0,256,64);
  cx.font = 'bold 34px "Microsoft JhengHei", sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.shadowColor = fg; cx.shadowBlur = 12;
  cx.fillStyle = fg; cx.fillText(str, 128, 34);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.MeshBasicMaterial({map:tex, transparent:true, side:THREE.DoubleSide, depthWrite:false});
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(sizeW, sizeW*0.25), mat);
  pl.position.set(x,y,z); scene.add(pl);
  return pl;
}

// ═══════════ 西里高速公路世界（移植自 sirit-base.html，無外部素材） ═══════════
var T=THREE;
var MC={};
function mat(c,o){var k=c+'|'+(o?JSON.stringify(o):'');if(!MC[k]){var p={color:c,roughness:0.85,metalness:0.06};if(o)for(var q in o)p[q]=o[q];MC[k]=new T.MeshStandardMaterial(p);}return MC[k];}
var GB=geoBox;
function bx(w,h,d,c,x,y,z,o){var m=new T.Mesh(GB,mat(c,o));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function cyl(rt,rb,h,c,x,y,z,o,seg){var m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg||12),mat(c,o));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function inst(w,h,d,c,n,o){var im=new T.InstancedMesh(GB,mat(c,o||{}),n);im.frustumCulled=false;scene.add(im);return im;}
var _d=new T.Object3D();
function put(im,i,x,y,z,sx,sy,sz,ry){_d.position.set(x,y,z);_d.scale.set(sx||1,sy||1,sz||1);_d.rotation.set(0,ry||0,0);_d.updateMatrix();im.setMatrixAt(i,_d.matrix);}
function label(text,glow,x,y,z,size,ry){
  var cv=document.createElement('canvas');cv.width=1024;cv.height=256;
  var c=cv.getContext('2d');var fs=Math.min(140,Math.floor(880/Math.max(1,text.length)));
  c.font='900 '+fs+'px Arial';c.textAlign='center';c.textBaseline='middle';
  c.shadowColor=glow;c.shadowBlur=26;c.fillStyle=glow;c.fillText(text,512,128);
  var m=new T.Mesh(new T.PlaneGeometry(size,size*0.25),new T.MeshBasicMaterial({map:new T.CanvasTexture(cv),transparent:true,side:T.DoubleSide}));
  m.position.set(x,y,z);if(ry!==undefined)m.rotation.y=ry;scene.add(m);return m;
}
function addC(w,h,d,x,y,z){addCollider(x,y,z,w,h,d);}
// 主作用域預宣告：世界段內改為賦值，供引擎/互動/小地圖/撤離存取
var LADDERS=[],SPINS=[],EXT=null,leverBox=null,leverPanel=null,leverArm=null;
var sprayN=0,spray=null,sprayData=[],sprayT=0;
var FT_X=0,FT_Z=0,FT_R=0;
var PW=null,NU=null,BL=null,AE=null;
var EX_X=0,EX_Z=0,EX_Y=0,EXW=0,EXD=0,EXH=0;
var HWY_Y=0,HWY_Z=0,HWY_W=0,HWY_X0=0,HWY_X1=0;
(function(){
// ═══════════ 地面 ═══════════
var MS=160;
bx(MS*2,0.4,MS*2,0x6e6a5c,0,-0.2,0);addC(MS*2,0.4,MS*2,0,-0.2,0);
function road(w,d,x,z,c){bx(w,0.05,d,c||0x3a3d42,x,0.03,z);}
// 下層道路：高速樓梯口 → 噴水池
road(10,90,0,-5);
// 噴水池 → 四建築放射路
road(8,60,-16,40);road(8,60,16,40);road(44,8,0,12);road(44,8,0,68);

// ═══════════ A. 高架高速公路 ═══════════
HWY_Y=14,HWY_W=18,HWY_Z=-70,HWY_X0=-130,HWY_X1=130;
// 橋面
bx(HWY_X1-HWY_X0,0.5,HWY_W,0x4a4e54,0,HWY_Y-0.25,HWY_Z);addC(HWY_X1-HWY_X0,0.5,HWY_W,0,HWY_Y-0.25,HWY_Z);
// 車道標線：中央分隔黃線 + 兩側白線 + 虛線
bx(HWY_X1-HWY_X0,0.02,0.25,0xd8c840,0,HWY_Y+0.02,HWY_Z,{emissive:0xa89820,emissiveIntensity:0.15});
bx(HWY_X1-HWY_X0,0.02,0.18,0xe8e8e8,0,HWY_Y+0.02,HWY_Z-7.5);
bx(HWY_X1-HWY_X0,0.02,0.18,0xe8e8e8,0,HWY_Y+0.02,HWY_Z+7.5);
var dash=inst(3,0.02,0.16,0xe8e8e8,80);
for(var dx=-128,i4=0;dx<128&&i4<80;dx+=6.5,i4++)put(dash,i4,dx,HWY_Y+0.02,HWY_Z-3.7,1,1,1);
dash.count=i4;dash.instanceMatrix.needsUpdate=true;
var dash2=inst(3,0.02,0.16,0xe8e8e8,80);
for(var dx2=-128,i5=0;dx2<128&&i5<80;dx2+=6.5,i5++)put(dash2,i5,dx2,HWY_Y+0.02,HWY_Z+3.7,1,1,1);
dash2.count=i5;dash2.instanceMatrix.needsUpdate=true;
// 混凝土護欄（雙側，南側於 x44~56 留缺口給上坡橋道）
bx(HWY_X1-HWY_X0,1.1,0.5,0x8a8e94,0,HWY_Y+0.55,HWY_Z-HWY_W/2+0.25);addC(HWY_X1-HWY_X0,1.1,0.5,0,HWY_Y+0.55,HWY_Z-HWY_W/2+0.25);
bx(174,1.1,0.5,0x8a8e94,-43,HWY_Y+0.55,HWY_Z+HWY_W/2-0.25);addC(174,1.1,0.5,-43,HWY_Y+0.55,HWY_Z+HWY_W/2-0.25);
bx(74,1.1,0.5,0x8a8e94,93,HWY_Y+0.55,HWY_Z+HWY_W/2-0.25);addC(74,1.1,0.5,93,HWY_Y+0.55,HWY_Z+HWY_W/2-0.25);
// 中央分隔島
bx(HWY_X1-HWY_X0,0.7,0.8,0x7a7e84,0,HWY_Y+0.35,HWY_Z);addC(HWY_X1-HWY_X0,0.7,0.8,0,HWY_Y+0.35,HWY_Z);
// 橋墩（含支撐結構）
for(var px2=-120;px2<=120;px2+=24){
  cyl(1.8,2.2,HWY_Y-0.5,0x6a6e74,px2,(HWY_Y-0.5)/2,HWY_Z,{metalness:0.2,roughness:0.7});
  addC(4.4,HWY_Y-0.5,4.4,px2,(HWY_Y-0.5)/2,HWY_Z);
  bx(6,0.8,2.4,0xb8bcc4,px2,HWY_Y-0.9,HWY_Z);addC(6,0.8,2.4,px2,HWY_Y-0.9,HWY_Z);
}
// 擋車杆廢棄
for(var br=0;br<5;br++){bx(0.3,1.2,0.3,0xcc4433,-60+br*30,HWY_Y+0.6,HWY_Z+2,{emissive:0x882211,emissiveIntensity:0.2});addC(0.3,1.2,0.3,-60+br*30,HWY_Y+0.6,HWY_Z+2);}
label('西里高速公路','#7fd4ff',0,HWY_Y+6,HWY_Z-HWY_W/2-1,26,0);

// 車輛（真實停放/事故/廢棄）
function car(x,z,ry,col,ty){
  var y=HWY_Y+0.35;
  if(ty==='suv'){
    bx(4.2,1.1,1.9,col,x,y+0.55,z,{metalness:0.4,roughness:0.4});addC(4.2,1.1,1.9,x,y+0.55,z);
    bx(2.2,0.85,1.7,0x2a3038,x-0.2,y+1.45,z,{metalness:0.3}); 
  }else if(ty==='truck'){
    bx(6.5,1.6,2.3,col,x,y+0.8,z,{metalness:0.35,roughness:0.5});addC(6.5,1.6,2.3,x,y+0.8,z);
    bx(2.2,1.5,2.2,0x3a4048,x+2.8,y+1.5,z,{metalness:0.3});
    bx(4,1.8,2.2,0x5a4a3a,x-1,y+2.2,z);
  }else if(ty==='bus'){
    bx(9,2.4,2.5,col,x,y+1.2,z,{metalness:0.35,roughness:0.45});addC(9,2.4,2.5,x,y+1.2,z);
    for(var w=-3;w<=3;w+=1.5)bx(1.1,0.8,0.06,0x9ad0ff,x+w,y+1.7,z+1.26,{transparent:true,opacity:0.5,emissive:0x3a6a8a,emissiveIntensity:0.2});
  }else{
    bx(3.8,0.85,1.7,col,x,y+0.45,z,{metalness:0.45,roughness:0.35});addC(3.8,0.85,1.7,x,y+0.45,z);
    bx(1.8,0.6,1.5,0x2a3038,x-0.1,y+1.1,z,{metalness:0.3});
  }
  for(var wy2=-1;wy2<=1;wy2+=2){
    var wz2=(ty==='bus'||ty==='truck')?1.2:0.85;
    cyl(0.32,0.32,0.2,0x1a1e24,x+wy2*((ty==='bus'||ty==='truck')?3.5:1.3),y+0.15,z-wz2,null,10).rotation.x=Math.PI/2;
    cyl(0.32,0.32,0.2,0x1a1e24,x+wy2*((ty==='bus'||ty==='truck')?3.5:1.3),y+0.15,z+wz2,null,10).rotation.x=Math.PI/2;
  }
}
car(-90,HWY_Z-4.5,0.05,0x8a2a2a,'car');car(-70,HWY_Z+4.5,-0.03,0x2a4a8a,'suv');
car(-40,HWY_Z-4.8,0.35,0x6a6a6a,'truck'); // 事故橫擺
car(-20,HWY_Z+4.2,0,0x3a6a3a,'car');car(10,HWY_Z-4.5,0.02,0x8a7a2a,'bus');
car(40,HWY_Z+4.6,-0.04,0x5a3a6a,'suv');car(65,HWY_Z-4.3,0.5,0xcc6633,'car'); // 事故
car(90,HWY_Z+4.4,0,0x4a5a6a,'truck');car(110,HWY_Z-4.6,0.01,0x2a6a6a,'car');
// 事故殘骸堆
bx(3,1.2,2,0x4a3a30,-30,HWY_Y+0.6,HWY_Z+1,{flatShading:true,metalness:0.5});addC(3,1.2,2,-30,HWY_Y+0.6,HWY_Z+1);
bx(2,0.8,1.5,0x5a4030,-33,HWY_Y+0.4,HWY_Z-1,{flatShading:true});addC(2,0.8,1.5,-33,HWY_Y+0.4,HWY_Z-1);

// 中央樓梯（高架 → 下層）
var STL_X=0,STL_Z0=HWY_Z+HWY_W/2,STL_Y0=HWY_Y,STL_Z1=HWY_Z+HWY_W/2+22,STL_Y1=0.1;
var stN=36;
for(var st=0;st<=stN;st++){
  var t=st/stN,sy=STL_Y0+(STL_Y1-STL_Y0)*t,sz=STL_Z0+(STL_Z1-STL_Z0)*t;
  bx(6,0.35,1.2,0x6a6e74,STL_X,sy-0.15,sz);addC(6,0.35,1.2,STL_X,sy-0.15,sz);
}
bx(0.3,1.0,24,0x8a8e94,STL_X-3.1,HWY_Y/2+2,STL_Z0+11);addC(0.3,1.0,24,STL_X-3.1,HWY_Y/2+2,STL_Z0+11);
bx(0.3,1.0,24,0x8a8e94,STL_X+3.1,HWY_Y/2+2,STL_Z0+11);addC(0.3,1.0,24,STL_X+3.1,HWY_Y/2+2,STL_Z0+11);
label('中央樓梯','#ffd070',STL_X,HWY_Y+2.5,STL_Z0+2,8,0);

// 滑坡路線（左右各一，更陡、更寬）
function slide(x0,z0,y0,x1,z1,y1,w){
  var dx=x1-x0,dz=z1-z0,dy=y1-y0,len=Math.sqrt(dx*dx+dz*dz),steps=Math.max(Math.ceil(len/1.6),Math.ceil(Math.abs(dy)/0.4));
  for(var s=0;s<=steps;s++){
    var t=s/steps,x=x0+dx*t,z=z0+dz*t,y=y0+dy*t;
    bx(w,0.4,1.8,0x7a6a5a,x,y-0.2,z);addC(w,0.4,1.8,x,y-0.2,z);
  }
  bx(0.25,0.9,len,0x8a7a6a,x0+dx/2- w/2,(y0+y1)/2+0.5,z0+dz/2);addC(0.25,0.9,len,x0+dx/2-w/2,(y0+y1)/2+0.5,z0+dz/2);
  bx(0.25,0.9,len,0x8a7a6a,x0+dx/2+w/2,(y0+y1)/2+0.5,z0+dz/2);addC(0.25,0.9,len,x0+dx/2+w/2,(y0+y1)/2+0.5,z0+dz/2);
}
slide(-14,STL_Z0+1,HWY_Y-0.3,-20,STL_Z0+26,0.1,4.5);
slide(14,STL_Z0+1,HWY_Y-0.3,20,STL_Z0+26,0.1,4.5);
label('滑坡','#ff9a4a',-17,6,STL_Z0+14,6,0);
label('滑坡','#ff9a4a',17,6,STL_Z0+14,6,0);

// ═══════════ B. 總裁區（浮空 · 大型 · 玻璃幕牆）═══
EX_X=50,EX_Z=-30,EX_Y=24,EXW=60,EXD=40,EXH=10;
// 浮空平台（天空感：高支撐柱、底部厚實）— 北側留 x47~53 橋道槽給上坡橋道
bx(EXW+8,1.2,EXD+4,0xb8bcc4,EX_X,EX_Y-0.6,EX_Z+2);addC(EXW+8,1.2,EXD+4,EX_X,EX_Y-0.6,EX_Z+2);
bx(31,1.2,4,0xb8bcc4,EX_X-18.5,EX_Y-0.6,EX_Z-22);addC(31,1.2,4,EX_X-18.5,EX_Y-0.6,EX_Z-22);
bx(31,1.2,4,0xb8bcc4,EX_X+18.5,EX_Y-0.6,EX_Z-22);addC(31,1.2,4,EX_X+18.5,EX_Y-0.6,EX_Z-22);
bx(EXW+10,0.5,EXD+6,0xdcd7cc,EX_X,EX_Y-1.4,EX_Z+3);addC(EXW+10,0.5,EXD+6,EX_X,EX_Y-1.4,EX_Z+3);
bx(32,0.5,6,0xdcd7cc,EX_X-19,EX_Y-1.4,EX_Z-23);addC(32,0.5,6,EX_X-19,EX_Y-1.4,EX_Z-23);
bx(32,0.5,6,0xdcd7cc,EX_X+19,EX_Y-1.4,EX_Z-23);addC(32,0.5,6,EX_X+19,EX_Y-1.4,EX_Z-23);
// 高支撐柱（3×2 網格，全部落在平台投影內）
for(var ep=0;ep<6;ep++){
  var epx=EX_X-20+(ep%3)*20,epz=EX_Z-16+Math.floor(ep/3)*20;
  cyl(1.4,2.0,EX_Y-1.4,0x6a6e74,epx,(EX_Y-1.4)/2,epz,{metalness:0.2,roughness:0.7});
  addC(3.6,EX_Y-1.4,3.6,epx,(EX_Y-1.4)/2,epz);
  // 柱頂斜撐
  bx(4,0.7,4,0xb8bcc4,epx,EX_Y-1.8,epz);addC(4,0.7,4,epx,EX_Y-1.8,epz);
}
// 平台邊緣護欄燈帶（北排避開 x47~53 橋道槽）
for(var el=0;el<14;el++){
  var elx=EX_X-EXW/2-2+el*(EXW+4)/13;
  if(!(elx>46&&elx<54)){bx(0.5,0.3,0.5,0x7fd4ff,elx,EX_Y+0.4,EX_Z-EXD/2-3.5,{emissive:0x4ab0e0,emissiveIntensity:0.9});addC(0.5,0.3,0.5,elx,EX_Y+0.4,EX_Z-EXD/2-3.5);}
  bx(0.5,0.3,0.5,0x7fd4ff,elx,EX_Y+0.4,EX_Z+EXD/2+3.5,{emissive:0x4ab0e0,emissiveIntensity:0.9});addC(0.5,0.3,0.5,elx,EX_Y+0.4,EX_Z+EXD/2+3.5);
}
// 玻璃幕牆大樓
var glassM=mat(0x9ad0ff,{transparent:true,opacity:0.26,roughness:0.08,metalness:0.5,emissive:0x1a4a70,emissiveIntensity:0.12});
function glassWall(w,h,d,x,y,z){
  var m=new T.Mesh(GB,glassM);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;scene.add(m);
}
// 鋼骨架
for(var fx=-1;fx<=1;fx+=2)for(var fz=-1;fz<=1;fz+=2){
  bx(0.5,EXH,0.5,0x93a8bf,EX_X+fx*EXW/2,EX_Y+EXH/2,EX_Z+fz*EXD/2);addC(0.5,EXH,0.5,EX_X+fx*EXW/2,EX_Y+EXH/2,EX_Z+fz*EXD/2);
}
for(var mx2=-2;mx2<=2;mx2++){
  bx(0.35,EXH,0.35,0x93a8bf,EX_X+mx2*EXW/5,EX_Y+EXH/2,EX_Z-EXD/2);
  bx(0.35,EXH,0.35,0x93a8bf,EX_X+mx2*EXW/5,EX_Y+EXH/2,EX_Z+EXD/2);
}
for(var fy2=0;fy2<=2;fy2++)bx(EXW+0.4,0.3,0.3,0x93a8bf,EX_X,EX_Y+fy2*(EXH/2),EX_Z-EXD/2);
bx(EXW,0.5,EXD,0x4a5a6a,EX_X,EX_Y-0.1,EX_Z);addC(EXW,0.5,EXD,EX_X,EX_Y-0.1,EX_Z);
bx(EXW+1,0.4,EXD+1,0x93a8bf,EX_X,EX_Y+EXH+0.2,EX_Z);addC(EXW+1,0.4,EXD+1,EX_X,EX_Y+EXH+0.2,EX_Z);
// 屋頂機房
bx(10,3,8,0x4a5a6a,EX_X,EX_Y+EXH+1.7,EX_Z);addC(10,3,8,EX_X,EX_Y+EXH+1.7,EX_Z);
cyl(1.5,1.5,4,0x6a7a8a,EX_X+3,EX_Y+EXH+5,EX_Z,{metalness:0.5});
bx(0.6,0.6,0.6,0xff5a5a,EX_X+3,EX_Y+EXH+7.3,EX_Z,{emissive:0xff3030,emissiveIntensity:1.5});
// 玻璃幕牆：東西兩面整片
glassWall(0.14,EXH,EXD,EX_X-EXW/2,EX_Y+EXH/2,EX_Z);
glassWall(0.14,EXH,EXD,EX_X+EXW/2,EX_Y+EXH/2,EX_Z);
addC(0.3,EXH,EXD,EX_X-EXW/2,EX_Y+EXH/2,EX_Z);addC(0.3,EXH,EXD,EX_X+EXW/2,EX_Y+EXH/2,EX_Z);
// 南面牆：東段整片；西段含 2F 管道門洞(x27~33)；中留 9 寬大門洞（大階梯入口）
glassWall(7,EXH,0.14,23.5,EX_Y+EXH/2,EX_Z+EXD/2);
glassWall(12.5,EXH,0.14,39.25,EX_Y+EXH/2,EX_Z+EXD/2);
glassWall(25.5,EXH,0.14,67.25,EX_Y+EXH/2,EX_Z+EXD/2);
addC(7,EXH,0.3,23.5,EX_Y+EXH/2,EX_Z+EXD/2);
addC(12.5,EXH,0.3,39.25,EX_Y+EXH/2,EX_Z+EXD/2);
addC(25.5,EXH,0.3,67.25,EX_Y+EXH/2,EX_Z+EXD/2);
// 2F 管道門洞（x27~33，y28.3~31.8 開口）
glassWall(6,4.3,0.14,30,EX_Y+2.15,EX_Z+EXD/2);
addC(6,4.3,0.3,30,EX_Y+2.15,EX_Z+EXD/2);
glassWall(6,2.2,0.14,30,EX_Y+8.9,EX_Z+EXD/2);
addC(6,2.2,0.3,30,EX_Y+8.9,EX_Z+EXD/2);
bx(6,0.14,0.35,0xff7fd0,30,EX_Y+4.35,EX_Z+EXD/2,{emissive:0xff5ac0,emissiveIntensity:0.7});
bx(6,0.2,0.35,0x93a8bf,30,EX_Y+7.8,EX_Z+EXD/2);
bx(9,1.6,0.4,0x93a8bf,EX_X,EX_Y+EXH-0.8,EX_Z+EXD/2);addC(9,2.6,0.4,EX_X,33.6,EX_Z+EXD/2);
bx(9,0.3,0.5,0xff7fd0,EX_X,EX_Y+EXH-1.7,EX_Z+EXD/2,{emissive:0xff5ac0,emissiveIntensity:0.7});
// 北面牆：留 6 寬門洞（上坡橋道入口）
glassWall((EXW-6)/2,EXH,0.14,EX_X-(EXW+6)/4,EX_Y+EXH/2,EX_Z-EXD/2);
glassWall((EXW-6)/2,EXH,0.14,EX_X+(EXW+6)/4,EX_Y+EXH/2,EX_Z-EXD/2);
addC((EXW-6)/2,EXH,0.3,EX_X-(EXW+6)/4,EX_Y+EXH/2,EX_Z-EXD/2);
addC((EXW-6)/2,EXH,0.3,EX_X+(EXW+6)/4,EX_Y+EXH/2,EX_Z-EXD/2);
bx(6,1.4,0.4,0x93a8bf,EX_X,EX_Y+EXH-0.7,EX_Z-EXD/2);addC(6,2.6,0.4,EX_X,33.6,EX_Z-EXD/2);
// 內部：1F 大廳
function exFloorWithHole(fy,hx,hz,hw,hd){
  var w=EXW-1,d=EXD-1,x0=EX_X-w/2,x1=EX_X+w/2,z0=EX_Z-d/2,z1=EX_Z+d/2;
  var ox0=hx-hw/2,ox1=hx+hw/2,oz0=hz-hd/2,oz1=hz+hd/2;
  var segs=[
    [x0,z0,ox0-x0,d],           // 左
    [ox1,z0,x1-ox1,d],          // 右
    [ox0,z0,hw,oz0-z0],         // 後中
    [ox0,oz1,hw,z1-oz1]         // 前中
  ];
  for(var i=0;i<segs.length;i++){
    var s=segs[i];if(s[2]<=0.01||s[3]<=0.01)continue;
    var cx2=s[0]+s[2]/2,cz2=s[1]+s[3]/2;
    bx(s[2],0.25,s[3],0xc9cdd6,cx2,fy,cz2);addC(s[2],0.25,s[3],cx2,fy,cz2);
  }
}
exFloorWithHole(EX_Y+0.15,EX_X,EX_Z,0.01,0.01); // 1F 整片（無洞）
exFloorWithHole(EX_Y+4.15,67,-22.75,5,6.6);   // 2F：東側樓梯洞（z-26~-19.5 與樓梯齊邊）
exFloorWithHole(EX_Y+8.15,67,-37.25,5,6.6);   // 3F：東側樓梯洞（z-40.5~-34 與樓梯齊邊）
// 隔間
bx(0.3,3.6,12,0x6a7a8a,EX_X-8,EX_Y+2,EX_Z-4);addC(0.3,3.6,12,EX_X-8,EX_Y+2,EX_Z-4);
bx(14,3.6,0.3,0x6a7a8a,EX_X+8,EX_Y+2,EX_Z+4);addC(14,3.6,0.3,EX_X+8,EX_Y+2,EX_Z+4);
bx(0.3,3.6,10,0x6a7a8a,EX_X-4,EX_Y+6,EX_Z-6);addC(0.3,3.6,10,EX_X-4,EX_Y+6,EX_Z-6);
// 1F 櫃檯+沙發
bx(7,1.0,1.6,0x2a3a4a,EX_X,EX_Y+0.65,EX_Z+8);addC(7,1.0,1.6,EX_X,EX_Y+0.65,EX_Z+8);
bx(3,0.6,1.2,0x5a3a2a,EX_X-12,EX_Y+0.4,EX_Z);addC(3,0.6,1.2,EX_X-12,EX_Y+0.4,EX_Z);
bx(3,0.6,1.2,0x5a3a2a,EX_X+12,EX_Y+0.4,EX_Z);addC(3,0.6,1.2,EX_X+12,EX_Y+0.4,EX_Z);
bx(2,1.4,0.1,0x7fd4ff,EX_X,EX_Y+1.5,EX_Z+7.4,{transparent:true,opacity:0.5,emissive:0x4ab0e0,emissiveIntensity:0.4});
// 2F 辦公桌群
for(var ed=0;ed<6;ed++){
  var edx=EX_X-14+(ed%3)*10,edz=EX_Z-6+Math.floor(ed/3)*8;
  bx(3.2,0.8,1.4,0x3a2a1a,edx,EX_Y+4.6,edz);addC(3.2,0.8,1.4,edx,EX_Y+4.6,edz);
  bx(0.5,0.5,0.08,0x3dff8a,edx,EX_Y+5.2,edz-0.6,{emissive:0x2aaf6a,emissiveIntensity:0.4});
}
// 3F 會議室
bx(10,0.9,3,0x2a1a0a,EX_X,EX_Y+8.65,EX_Z);addC(10,0.9,3,EX_X,EX_Y+8.65,EX_Z);
// 內部樓梯 1F→2F→3F（東側 x67，16階×0.25=4.0，頂階與樓板齊平）
function exFlight(cx,zStart,dir,baseY){
  for(var es=0;es<16;es++){
    var sz=zStart+dir*0.4*es,sy=baseY+(es+1)*0.25;
    bx(3.2,0.5,0.6,0xb9c2cc,cx,sy-0.25,sz);addC(3.2,0.5,0.6,cx,sy-0.25,sz);
  }
}
exFlight(67,-19.75,-1,EX_Y+0.275); // 1F頂24.275 → 28.275（2F樓板面）
exFlight(67,-40.25,1,EX_Y+4.275);  // 2F頂28.275 → 32.275（3F樓板面）
label('總裁區','#ff7fd0',EX_X,EX_Y+EXH+4,EX_Z+EXD/2+0.5,18,0);
// ── 電子鎖拉閘（1F 西側）→ 拉下後高速公路出現直升機撤離區 ──
EXT={on:false,done:false,failed:false,t:0,x:28,z:-40,y:EX_Y+0.275,zx:15,zz:HWY_Z+4.5,zy:HWY_Y,r:8};
leverBox=bx(1.5,1.2,1.0,0x2f3946,EXT.x,EXT.y+0.6,EXT.z);addC(1.5,1.2,1.0,EXT.x,EXT.y+0.6,EXT.z);
leverPanel=bx(1.1,0.7,0.1,0xffaa33,EXT.x,EXT.y+1.55,EXT.z+0.46,{emissive:0xff8800,emissiveIntensity:0.9});
leverPanel.material=leverPanel.material.clone();
leverArm=bx(0.16,0.9,0.16,0xdde4ee,EXT.x,EXT.y+1.4,EXT.z-0.2);
leverArm.rotation.x=-0.85;
label('電子鎖拉閘','#ffd070',EXT.x,EXT.y+3.0,EXT.z,5,0);

// ── 連接道路1：高架高速 → 總裁區（上坡橋道：南護欄缺口 → 北門）──
(function(){
  function rampSeg(x,z0,y0,z1,y1,w){
    var dz=z1-z0,dy=y1-y0;
    var steps=Math.max(Math.ceil(Math.abs(dz)/1.4),Math.ceil(Math.abs(dy)/0.32));
    var n=0;
    for(var s=0;s<=steps;s++){
      var t=s/steps,z=z0+dz*t,y=y0+dy*t;
      var szr=Math.abs(dz)/steps+0.2;
      bx(w,0.4,szr,0x5a6a78,x,y-0.2,z);addC(w,0.4,szr,x,y-0.2,z);
      if(s%3===0){
        bx(0.3,1.0,0.3,0x8a9aa8,x-w/2-0.2,y+0.5,z);addC(0.3,1.0,0.3,x-w/2-0.2,y+0.5,z);
        bx(0.3,1.0,0.3,0x8a9aa8,x+w/2+0.2,y+0.5,z);addC(0.3,1.0,0.3,x+w/2+0.2,y+0.5,z);
        n++;
      }
    }
    return n;
  }
  var x0=50;
  rampSeg(x0,HWY_Z+HWY_W/2,HWY_Y,-52,EX_Y-0.5,6);      // 陡升段：高速南緣 → 橋道槽內
  rampSeg(x0,-52,EX_Y-0.5,-49.6,EX_Y+0.275,6);          // 平緩段：穿北門與1F樓板面齊平
  label('連通道','#ff9aff',x0+7,19,-57,7,0);
})();

// ── 連接道路2：地面 → 總裁區（大階梯，西移 x=18，頂端走道接東側平台）──
(function(){
  var x0=18,z0=EX_Z+EXD/2+34,y0=0.1;
  var x1=x0,z1=EX_Z+EXD/2+6,y1=EX_Y+0.25;
  var dz=z1-z0,dy=y1-y0;
  var steps=Math.max(Math.ceil(Math.abs(dz)/1.3),Math.ceil(Math.abs(dy)/0.32));
  var sdz=Math.abs(dz)/steps+0.2;   // 箱深=步距+0.2（避免被前方第二階誤判成牆）
  for(var s=0;s<=steps;s++){
    var t=s/steps,z=z0+dz*t,y=y0+dy*t;
    bx(10,0.4,sdz,0x6a6e74,x0,y-0.2,z);addC(10,0.4,sdz,x0,y-0.2,z);
  }
  // 大階梯兩側厚護牆（低矮護牆，不擋視野）
  bx(1.0,Math.abs(dy)*0.45,Math.abs(dz),0x7a7e84,x0-5.4,y0+Math.abs(dy)*0.25,(z0+z1)/2);addC(1.0,Math.abs(dy)*0.45,Math.abs(dz),x0-5.4,y0+Math.abs(dy)*0.25,(z0+z1)/2);
  bx(1.0,Math.abs(dy)*0.45,Math.abs(dz),0x7a7e84,x0+5.4,y0+Math.abs(dy)*0.25,(z0+z1)/2);addC(1.0,Math.abs(dy)*0.45,Math.abs(dz),x0+5.4,y0+Math.abs(dy)*0.25,(z0+z1)/2);
  // 入口平台（頂面與1F地板齊平）
  bx(16,0.5,8,0xb8bcc4,x0,EX_Y+0.0,EX_Z+EXD/2+2);addC(16,0.5,8,x0,EX_Y+0.0,EX_Z+EXD/2+2);
  // 頂端走道：向東接上浮空平台（x≥24），讓玩家能走到南面大門
  bx(22,0.5,8,0xb8bcc4,21,EX_Y+0.0,EX_Z+EXD/2+2);addC(22,0.5,8,21,EX_Y+0.0,EX_Z+EXD/2+2);
  // 走道護欄：北側全段；南側兩段（中間留樓梯口 x13~23）
  bx(22,0.8,0.4,0x7a7e84,21,EX_Y+0.65,EX_Z+EXD/2-2);addC(22,0.8,0.4,21,EX_Y+0.65,EX_Z+EXD/2-2);
  bx(3,0.8,0.4,0x7a7e84,11.5,EX_Y+0.65,EX_Z+EXD/2+6);addC(3,0.8,0.4,11.5,EX_Y+0.65,EX_Z+EXD/2+6);
  bx(9,0.8,0.4,0x7a7e84,27.5,EX_Y+0.65,EX_Z+EXD/2+6);addC(9,0.8,0.4,27.5,EX_Y+0.65,EX_Z+EXD/2+6);
  label('總裁區大階梯','#ffd070',x0,y0+Math.abs(dy)/2+2,(z0+z1)/2,9,0);
})();

// ═══════════ C. 中央噴水池 ═══════════
FT_X=0,FT_Z=40,FT_R=11;
// 水池底
cyl(FT_R,FT_R,0.4,0x3a5a6a,FT_X,0.2,FT_Z,{metalness:0.2,roughness:0.15});
cyl(FT_R-0.6,FT_R-0.6,0.5,0x2a4a5a,FT_X,0.25,FT_Z);
// 水面（透明）
(function(){
  var wm=new T.MeshStandardMaterial({color:0x2a7aaa,roughness:0.05,metalness:0.3,transparent:true,opacity:0.75});
  var w=new T.Mesh(new T.CircleGeometry(FT_R-0.8,28),wm);
  w.rotation.x=-Math.PI/2;w.position.set(FT_X,0.55,FT_Z);scene.add(w);
})();
// 池緣
cyl(FT_R+0.4,FT_R+0.4,0.5,0x8a8e94,FT_X,0.45,FT_Z,{});
addC(22,0.55,22,FT_X,0.275,FT_Z);
// 中央雕塑柱
cyl(1.2,1.6,4,0x7a8a9a,FT_X,2.4,FT_Z,{metalness:0.3,roughness:0.5});
addC(3.2,4.8,3.2,FT_X,2.4,FT_Z);
cyl(2,2,0.5,0x8a9aaa,FT_X,4.5,FT_Z,{metalness:0.3});
// 噴水效果（粒子柱）
sprayN=48;
spray=inst(0.12,0.12,0.12,0xaad8ff,sprayN,{transparent:true,opacity:0.7,emissive:0x6ab0dd,emissiveIntensity:0.4});
sprayData=[];
for(var sp=0;sp<sprayN;sp++){sprayData.push({a:Math.random()*Math.PI*2,sp:0.7+Math.random()*0.6,ph:Math.random()*6.28});put(spray,sp,FT_X,0.6,FT_Z,1,1,1);}
// 菱形幾何坡面（四周，不同高度鋪面）
function diamond(cx,cz,s,y,c){
  var m=bx(s,0.3,s,c,cx,y,cz);m.rotation.y=Math.PI/4;addC(s*0.72,0.3,s*0.72,cx,y,cz);
  return m;
}
diamond(FT_X-16,FT_Z-10,10,0.3,0x6a7a88);diamond(FT_X+16,FT_Z-10,10,0.5,0x6a7a88);
diamond(FT_X-16,FT_Z+10,10,0.5,0x6a7a88);diamond(FT_X+16,FT_Z+10,10,0.3,0x6a7a88);
diamond(FT_X,FT_Z-18,12,0.2,0x7a8a96);diamond(FT_X,FT_Z+18,12,0.2,0x7a8a96);
// 高度鋪面環
for(var rr=0;rr<8;rr++){
  var ra=rr*Math.PI/4;
  bx(4,0.2+rr*0.04,4,0x5a6a78,FT_X+Math.sin(ra)*(FT_R+6),0.1+rr*0.02,FT_Z+Math.cos(ra)*(FT_R+6));
  addC(4,0.2+rr*0.04,4,FT_X+Math.sin(ra)*(FT_R+6),0.1+rr*0.02,FT_Z+Math.cos(ra)*(FT_R+6));
}
label('中央噴水池','#7fd8ff',FT_X,7,FT_Z,10,0);

// ═══════════ D. 四座科研建築（方形排列 · 發電/核能對角）═══
// 位置：SW=發電(-55,10) NE=核能(55,70) NW=航天(-55,70) SE=生物(55,10)
function labBase(x,z,w,d,h,col,name,nameCol,rh){
  bx(w+2,0.3,d+2,0xb8bcc4,x,0.15,z);addC(w+2,0.3,d+2,x,0.15,z);
  // 牆（南面留門 4 寬）
  bx(w,h,0.4,col,x,h/2,z-d/2);addC(w,h,0.4,x,h/2,z-d/2);
  bx((w-4)/2,h,0.4,col,x-(w+4)/4,h/2,z+d/2);addC((w-4)/2,h,0.4,x-(w+4)/4,h/2,z+d/2);
  bx((w-4)/2,h,0.4,col,x+(w+4)/4,h/2,z+d/2);addC((w-4)/2,h,0.4,x+(w+4)/4,h/2,z+d/2);
  bx(6,1.6,0.5,col,x,h-0.8,z+d/2);
  bx(0.4,h,d,col,x-w/2,h/2,z);addC(0.4,h,d,x-w/2,h/2,z);
  bx(0.4,h,d,col,x+w/2,h/2,z);addC(0.4,h,d,x+w/2,h/2,z);
  // 屋頂（rh=[洞cx,洞cz,洞w,洞d] 時開樓梯出口洞）
  if(rh){
    var rx0=x-(w+0.6)/2,rx1=x+(w+0.6)/2,rz0=z-(d+0.6)/2,rz1=z+(d+0.6)/2;
    var ox0=rh[0]-rh[2]/2,ox1=rh[0]+rh[2]/2,oz0=rh[1]-rh[3]/2,oz1=rh[1]+rh[3]/2;
    var rsegs=[[rx0,rz0,ox0-rx0,rz1-rz0],[ox1,rz0,rx1-ox1,rz1-rz0],[ox0,rz0,rh[2],oz0-rz0],[ox0,oz1,rh[2],rz1-oz1]];
    for(var ri=0;ri<4;ri++){var rs=rsegs[ri];if(rs[2]<=0.01||rs[3]<=0.01)continue;
      bx(rs[2],0.4,rs[3],0x9aa4b0,rs[0]+rs[2]/2,h+0.2,rs[1]+rs[3]/2);
      addC(rs[2],0.4,rs[3],rs[0]+rs[2]/2,h+0.2,rs[1]+rs[3]/2);}
  }else{
    bx(w+0.6,0.4,d+0.6,0x9aa4b0,x,h+0.2,z);addC(w+0.6,0.4,d+0.6,x,h+0.2,z);
  }
  bx(w-1,0.15,d-1,0xdcd7cc,x,0.15,z);addC(w-1,0.15,d-1,x,0.15,z);
  // 窗（四面：北/南 直立、東西 轉90°）
  function labWin(sx,sz,ry){
    var gm=new T.Mesh(GB,mat(0x9ad0ff,{transparent:true,opacity:0.35,metalness:0.4,emissive:0x2a5a80,emissiveIntensity:0.2}));
    gm.scale.set(2.4,1.6,0.1);gm.position.set(sx,h*0.62,sz);gm.rotation.y=ry;scene.add(gm);
  }
  for(var wx=-w/2+4;wx<=w/2-4;wx+=5){
    labWin(x+wx,z-d/2-0.05,0);
    labWin(x+wx,z+d/2+0.05,0);
  }
  for(var wz=-d/2+5;wz<=d/2-5;wz+=6){
    labWin(x-w/2-0.05,z+wz,Math.PI/2);
    labWin(x+w/2+0.05,z+wz,Math.PI/2);
  }
  label(name,nameCol,x,h+1.8,z-d/2-0.5,12,0);
  return {x:x,z:z,w:w,d:d,h:h};
}
// 黃色固定式爬梯（實際可爬）
LADDERS=[];
function yellowLadder(x,z,y0,y1,face){
  // face: 0=南(+z) 1=北(-z) 2=東(+x) 3=西(-x)
  var railM=mat(0xffcc22,{metalness:0.5,roughness:0.35});
  var ox=0,oz=0;
  if(face===0)oz=0.25;else if(face===1)oz=-0.25;else if(face===2)ox=0.25;else ox=-0.25;
  var rx=x+ox,rz=z+oz;
  if(face===0||face===1){
    var m1=new T.Mesh(GB,railM);m1.scale.set(0.1,y1-y0,0.1);m1.position.set(rx-0.35,(y0+y1)/2,rz);scene.add(m1);
    var m2=new T.Mesh(GB,railM);m2.scale.set(0.1,y1-y0,0.1);m2.position.set(rx+0.35,(y0+y1)/2,rz);scene.add(m2);
  }else{
    var m3=new T.Mesh(GB,railM);m3.scale.set(0.1,y1-y0,0.1);m3.position.set(rx,(y0+y1)/2,rz-0.35);scene.add(m3);
    var m4=new T.Mesh(GB,railM);m4.scale.set(0.1,y1-y0,0.1);m4.position.set(rx,(y0+y1)/2,rz+0.35);scene.add(m4);
  }
  for(var ry2=y0+0.4;ry2<y1;ry2+=0.45){
    var rung=bx(0.7,0.07,0.07,0xffcc22,face===0||face===1?rx:x,ry2,face===0||face===1?rz:rz);
    if(face===2||face===3)rung.rotation.y=Math.PI/2;
  }
  LADDERS.push({x:x,z:z,y0:y0,y1:y1,face:face});
}
// 高處維修道路（航天基地風格高架通道）
function catwalk(x0,z0,x1,z1,y,w){
  var dx=x1-x0,dz=z1-z0,len=Math.sqrt(dx*dx+dz*dz),ang=Math.atan2(dx,dz);
  var mx=(x0+x1)/2,mz=(z0+z1)/2;
  var deck=bx(w,0.18,len,0x5a6a78,mx,y,mz);deck.rotation.y=ang;
  if(Math.abs(dz)>=Math.abs(dx))addC(w,0.2,len,mx,y,mz);else addC(len,0.2,w,mx,y,mz);
  var r1=bx(0.1,0.9,len,0x8a9aa8,mx-Math.cos(ang)*(w/2-0.05),y+0.55,mz+Math.sin(ang)*(w/2-0.05));r1.rotation.y=ang;
  var r2=bx(0.1,0.9,len,0x8a9aa8,mx+Math.cos(ang)*(w/2-0.05),y+0.55,mz-Math.sin(ang)*(w/2-0.05));r2.rotation.y=ang;
  if(Math.abs(dx)<0.01||Math.abs(dz)<0.01){
    var rw=Math.abs(dz)>=Math.abs(dx);
    addC(rw?0.1:len,0.9,rw?len:0.1,r1.position.x,y+0.55,r1.position.z);
    addC(rw?0.1:len,0.9,rw?len:0.1,r2.position.x,y+0.55,r2.position.z);
  }
  // 支撐
  var n=Math.max(1,Math.floor(len/8));
  for(var i=0;i<=n;i++){
    var t=i/n,bx2=x0+dx*t,bz2=z0+dz*t;
    cyl(0.12,0.15,y,0x6a7078,bx2,y/2,bz2);addC(0.3,y,0.3,bx2,y/2,bz2);
  }
}
// ═══════════ 內裝地面基準 & 旋轉物件 ═══════════
var GY=0.3;
SPINS=[];
// —— 通用（四棟統一幾何：60×40×16、3層、樓梯井東南角）——
function labSlab(B,fy,hz,hw,hd){
  var x0=B.x-(B.w-0.4)/2,x1=B.x+(B.w-0.4)/2,z0=B.z-(B.d-0.4)/2,z1=B.z+(B.d-0.4)/2;
  var hx=B.x+24.5,ox0=hx-hw/2,ox1=hx+hw/2,oz0=hz-hd/2,oz1=hz+hd/2;
  var segs=[[x0,z0,ox0-x0,z1-z0],[ox1,z0,x1-ox1,z1-z0],[ox0,z0,hw,oz0-z0],[ox0,oz1,hw,z1-oz1]];
  for(var i=0;i<4;i++){var s=segs[i];if(s[2]<=0.01||s[3]<=0.01)continue;
    bx(s[2],0.25,s[3],0xc9cdd6,s[0]+s[2]/2,fy,s[1]+s[3]/2);
    addC(s[2],0.25,s[3],s[0]+s[2]/2,fy,s[1]+s[3]/2);}
}
function labFlight(cx,zStart,dir,y0,y1){
  var gap=y1-y0,rise=gap>5?0.4:0.25,N=Math.round(gap/rise);
  for(var es=0;es<N;es++){
    var sz=zStart+dir*0.4*es,sy=y0+(es+1)*rise;
    bx(3.2,0.5,0.6,0xb9c2cc,cx,sy-0.25,sz);addC(3.2,0.5,0.6,cx,sy-0.25,sz);
  }
}
function labCore(B,fy2,fy3){
  var cx=B.x+24.5,zs=B.z+16.5,t2=fy2+0.125,t3=fy3+0.125;
  labSlab(B,fy2,B.z+12.7,4,8.2);        // 2F 樓梯洞（1F→2F 20階×0.4=8.0）
  labSlab(B,fy3,B.z+13.5,4,6.6);        // 3F 樓梯洞（2F→3F 16階×0.25=4.0）
  labFlight(cx,zs,-1,0.225,t2);
  labFlight(cx,zs,-1,t2,t3);
  yellowLadder(cx,B.z+10.2,t3,B.h+0.6,1);  // 3F→屋頂出口梯
  label('↑ 按E爬梯上屋頂','#ffd070',cx,t3+1.2,B.z+8.6,4.5,0);
  label('3F樓梯在南端 → 繞過井口','#9fd0ff',cx,t2+1.0,B.z+7.8,5.5,0);
}
function labPart(B,fy,px){   // 隔間牆（中留 6 寬門洞）
  var t=fy+0.125+1.7;
  bx(0.3,3.4,14,0xe4e9f0,px,t,B.z-8);addC(0.3,3.4,14,px,t,B.z-8);
  bx(0.3,3.4,12,0xe4e9f0,px,t,B.z+11);addC(0.3,3.4,12,px,t,B.z+11);
}
function labFloor2(B,fy2,col){   // 2F 通用：螢牆+控制台+桌×4
  var t=fy2+0.125;
  bx(12,3,0.3,0x2f3e4f,B.x-6,t+1.8,B.z-18.9);addC(12,3,0.3,B.x-6,t+1.8,B.z-18.9);
  for(var i=0;i<6;i++){var sx2=B.x-11+i*2;
    bx(1.6,1.2,0.1,col,sx2,t+1.9,B.z-18.7,{emissive:col,emissiveIntensity:0.7});
    addC(1.6,1.2,0.1,sx2,t+1.9,B.z-18.7);}
  bx(10,1.4,1.6,0x93a8bf,B.x-6,t+0.7,B.z-17);addC(10,1.4,1.6,B.x-6,t+0.7,B.z-17);
  for(var d2=0;d2<4;d2++){
    var dx=B.x-16+d2*7;
    bx(3.4,1.6,1.6,0xc09060,dx,t+0.8,B.z+4);addC(3.4,1.6,1.6,dx,t+0.8,B.z+4);
    bx(1.5,1.0,0.1,col,dx,t+1.7,B.z+3.25,{emissive:col,emissiveIntensity:0.55});
    books(dx+1.15,t+1.63,B.z+4.3);
  }
}
function labFloor3(B,fy3,col){   // 3F 通用：會議大桌+西側儲架
  var t=fy3+0.125;
  bx(8,0.9,2.6,0xc09060,B.x+16,t+0.45,B.z);addC(8,0.9,2.6,B.x+16,t+0.45,B.z);
  bx(6.6,0.1,1.4,col,B.x+16,t+0.95,B.z,{emissive:col,emissiveIntensity:0.4});
  books(B.x+14.2,t+1.06,B.z+0.5);books(B.x+17.8,t+1.06,B.z-0.5);
  for(var ch=0;ch<6;ch++)
    bx(0.7,0.9,0.7,0x8fb4e0,B.x+13+(ch%3)*3,t+0.45,B.z-2.2+Math.floor(ch/3)*4.4);addC(0.7,0.9,0.7,B.x+13+(ch%3)*3,t+0.45,B.z-2.2+Math.floor(ch/3)*4.4);
  bx(1.4,3,8,0xb08048,B.x-24,t+1.5,B.z-8);addC(1.4,3,8,B.x-24,t+1.5,B.z-8);
  bx(1.4,3,8,0xb08048,B.x-24,t+1.5,B.z+8);addC(1.4,3,8,B.x-24,t+1.5,B.z+8);
}
function labReception(B,cz,col){ // 1F 接待台（像總裁入口）
  bx(7,1,1.6,0x93a8bf,B.x,0.7,cz);addC(7,1,1.6,B.x,0.7,cz);
  bx(6,2,0.12,0x2f3e4f,B.x,2.2,cz-0.9);addC(6,2,0.12,B.x,2.2,cz-0.9);
  bx(5.4,1.5,0.1,col,B.x,2.2,cz-0.8,{emissive:col,emissiveIntensity:0.6});
}
// ═══════════ 明亮家具（沙發/桌/書櫃/書堆/地毯/盆栽）═══
function sofa(x,y,z,ry,w,col){
  w=w||3.5;ry=ry||0;
  var g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);
  var parts=[[w,0.35,1.1,0,0.32,0,col||0xff8a65],[w,0.72,0.3,0,0.66,-0.4,col||0xff7043],
             [0.3,0.52,1.1,-(w/2-0.15),0.58,0.05,col||0xff7043],[0.3,0.52,1.1,(w/2-0.15),0.58,0.05,col||0xff7043]];
  for(var i=0;i<4;i++){var p=parts[i];
    var m=new T.Mesh(GB,mat(p[6],{roughness:0.85}));
    m.scale.set(p[0],p[1],p[2]);m.position.set(p[3],p[4],p[5]);m.castShadow=true;g.add(m);}
  if(Math.abs(Math.sin(ry))>0.5)addC(1.3,1.0,w,x,y+0.5,z);else addC(w,1.0,1.3,x,y+0.5,z);
}
function tableF(x,y,z,w,d,ry){
  w=w||1.8;d=d||1;ry=ry||0;
  var g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);
  var top=new T.Mesh(GB,mat(0xd9a066,{roughness:0.6}));
  top.scale.set(w,0.12,d);top.position.set(0,0.72,0);top.castShadow=true;g.add(top);
  var lm=mat(0xb07840);
  var legs=[[-w/2+0.12,-d/2+0.12],[w/2-0.12,-d/2+0.12],[-w/2+0.12,d/2-0.12],[w/2-0.12,d/2-0.12]];
  for(var i=0;i<4;i++){var l=new T.Mesh(GB,lm);l.scale.set(0.12,0.7,0.12);l.position.set(legs[i][0],0.35,legs[i][1]);g.add(l);}
  if(Math.abs(Math.sin(ry))>0.5)addC(d,0.85,w,x,y+0.42,z);else addC(w,0.85,d,x,y+0.42,z);
}
function bookshelf(x,y,z,ry,w){
  w=w||4;ry=ry||0;
  var g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);
  var fw=new T.Mesh(GB,mat(0xc98a4b,{roughness:0.7}));
  fw.scale.set(w,2.2,0.5);fw.position.set(0,1.1,0);fw.castShadow=true;g.add(fw);
  var cols=[0xe05252,0x52a0e0,0x5ac878,0xf0c040,0xb070e0,0xff8a65];
  var n=Math.floor((w-0.5)/0.34);
  for(var s=0;s<4;s++)for(var bk=0;bk<n;bk++){
    var m=new T.Mesh(GB,mat(cols[(s*5+bk)%6],{roughness:0.8}));
    m.scale.set(0.24,0.4+((s*3+bk)%3)*0.06,0.34);
    m.position.set(-w/2+0.3+bk*0.34,0.42+s*0.52,0.1);
    g.add(m);
  }
  if(Math.abs(Math.sin(ry))>0.5)addC(0.6,2.2,w,x,y+1.1,z);else addC(w,2.2,0.6,x,y+1.1,z);
}
function books(x,y,z){
  var cols=[0xe05252,0x52a0e0,0x5ac878,0xf0c040];
  for(var i=0;i<3;i++){
    var m=new T.Mesh(GB,mat(cols[i],{roughness:0.8}));
    m.scale.set(0.5,0.07,0.36);m.position.set(x,y+0.04+i*0.075,z);m.rotation.y=(i-1)*0.2;
    scene.add(m);
  }
}
function rug(x,y,z,w,d,col){
  var m=new T.Mesh(GB,mat(col||0xffd9c0,{roughness:1}));
  m.scale.set(w,0.03,d);m.position.set(x,y+0.03,z);scene.add(m);
}
function plant(x,y,z){
  cyl(0.32,0.24,0.5,0xe07a5f,x,y+0.25,z);addC(0.6,0.5,0.6,x,y+0.25,z);
  var l=new T.Mesh(new T.SphereGeometry(0.55,8,6),mat(0x66bb6a,{roughness:0.9}));
  l.position.set(x,y+1.05,z);l.castShadow=true;scene.add(l);
  var l2=new T.Mesh(new T.SphereGeometry(0.38,8,6),mat(0x81c784,{roughness:0.9}));
  l2.position.set(x+0.25,y+1.5,z+0.1);scene.add(l2);
  addC(0.7,1.4,0.7,x,y+0.7,z);
}
// 1F 入口沙發區 + 北側閱讀角
function lounge1(B){
  sofa(B.x-9,GY,B.z+16.3,0,3.5,0x4db6ac);
  sofa(B.x+9,GY,B.z+16.3,0,3.5,0xff8a65);
  tableF(B.x-9,GY,B.z+14.4);books(B.x-9,GY+0.84,B.z+14.4);
  tableF(B.x+9,GY,B.z+14.4);books(B.x+9,GY+0.84,B.z+14.4);
  rug(B.x,GY,B.z+15.6,7,4.5,0xffe0c2);
  bookshelf(B.x+18,GY,B.z-18.6,0,4);
  sofa(B.x+18,GY,B.z-15.4,Math.PI,3.5,0x64b5f6);
  tableF(B.x+18,GY,B.z-13.4,1.6,1);books(B.x+18,GY+0.84,B.z-13.4);
  plant(B.x+23,GY,B.z-16.8);
  plant(B.x-5,GY,B.z+11.5);
  books(B.x+2.2,1.24,B.z+14.2);
}
// 2F：西南休息區 + 東側書牆
function lounge2(B){
  var y=8.225;
  sofa(B.x-20,y,B.z+14,0,3.5,0xff8a65);
  tableF(B.x-20,y,B.z+12,1.8,1);books(B.x-20,y+0.84,B.z+12);
  rug(B.x-20,y,B.z+15.5,6,4,0xcfe8ff);
  bookshelf(B.x-29.2,y,B.z+2,Math.PI/2,4);
  plant(B.x-24,y,B.z+16.5);
  sofa(B.x+16,y,B.z+12,0,3.5,0x4db6ac);
  tableF(B.x+16,y,B.z+10,1.6,1);books(B.x+16,y+0.84,B.z+10);
  bookshelf(B.x+29,y,B.z-6,-Math.PI/2,4);
  plant(B.x+27,y,B.z-14);
}
// 3F：北側書櫃閱讀區 + 東南沙發
function lounge3(B){
  var y=12.225;
  bookshelf(B.x-16,y,B.z-18.6,0,5);
  sofa(B.x-16,y,B.z-15.4,Math.PI,3.5,0x64b5f6);
  tableF(B.x-16,y,B.z-13.4,1.8,1);books(B.x-16,y+0.84,B.z-13.4);
  rug(B.x-16,y,B.z-15,7,4,0xd9f2d0);
  plant(B.x-26,y,B.z+16.5);
  sofa(B.x+20,y,B.z+14,0,3.5,0xff8a65);
  tableF(B.x+20,y,B.z+12,1.6,1);books(B.x+20,y+0.84,B.z+12);
  bookshelf(B.x+29,y,B.z-8,-Math.PI/2,4);
}
// —— A. 發電站（SW）60×40×16 ——
PW=labBase(-55,10,60,40,16,0x7fb5ea,'發電站','#ffb04a',[-30.5,23.5,4,6.6]);
labCore(PW,8.1,12.1);
// 橫置汽輪機（沿X軸）
(function(){
  bx(15,0.7,5,0x9aa4b0,PW.x,GY+0.35,PW.z+1);addC(15,0.7,5,PW.x,GY+0.35,PW.z+1);
  var tm=cyl(2.2,2.2,13,0x9aa0a8,PW.x,GY+2.9,PW.z+1,{metalness:0.5,roughness:0.3});
  tm.rotation.z=Math.PI/2;addC(13,4.6,4.6,PW.x,GY+2.9,PW.z+1);
  cyl(1.5,1.5,1.2,0x6a7078,PW.x-7.2,GY+2.9,PW.z+1,{metalness:0.5}).rotation.z=Math.PI/2;
  addC(1.2,3.0,3.0,PW.x-7.2,GY+2.9,PW.z+1);
  cyl(1.5,1.5,1.2,0x6a7078,PW.x+7.2,GY+2.9,PW.z+1,{metalness:0.5}).rotation.z=Math.PI/2;
  addC(1.2,3.0,3.0,PW.x+7.2,GY+2.9,PW.z+1);
  for(var rb2=-4;rb2<=4;rb2+=4)cyl(2.5,2.5,0.5,0x99a3ae,PW.x+rb2,GY+2.9,PW.z+1,{metalness:0.6}).rotation.z=Math.PI/2;
})();
// 3組發電機（北側）
for(var ge=0;ge<3;ge++){
  var gx=PW.x-12+ge*12;
  bx(4,3,3,0xb0b8c0,gx,GY+1.5,PW.z+5);addC(4,3,3,gx,GY+1.5,PW.z+5);
  bx(4.1,0.5,0.12,0x3dff8a,gx,GY+2.4,PW.z+6.55,{emissive:0x2aaf6a,emissiveIntensity:0.7});
  cyl(0.45,0.45,1.8,0x99a3ae,gx,GY+3.9,PW.z+5);
}
// 3組變電器+絕緣子（南側）
for(var tv=0;tv<3;tv++){
  var tx=PW.x-12+tv*12;
  bx(3,2.5,3,0x9fb4cc,tx,GY+1.25,PW.z-10);addC(3,2.5,3,tx,GY+1.25,PW.z-10);
  for(var ii=-1;ii<=1;ii++)cyl(0.2,0.28,1.5,0xc8b8d8,tx+ii*0.9,GY+3.25,PW.z-10);
}
// 東側監控大螢牆
bx(0.4,5,12,0x2f3e4f,PW.x+PW.w/2-0.7,GY+2.8,PW.z);addC(0.4,5,12,PW.x+PW.w/2-0.7,GY+2.8,PW.z);
for(var sc2=0;sc2<8;sc2++){
  var sy2=GY+1.5+(sc2%2)*1.8,sz3=PW.z-4.5+Math.floor(sc2/2)*3;
  bx(0.1,1.0,2.4,0x3dff8a,PW.x+PW.w/2-0.95,sy2,sz3,{emissive:0x2aaf6a,emissiveIntensity:0.7});
  if(sc2%2===0)addC(0.1,1.0,2.4,PW.x+PW.w/2-0.95,sy2,sz3);}
// 西側控制台
bx(1.6,1.7,8,0x93a8bf,PW.x-16.5,GY+0.85,PW.z+6);addC(1.6,1.7,8,PW.x-16.5,GY+0.85,PW.z+6);
for(var scr2=0;scr2<6;scr2++){var sz4=PW.z+3+scr2*1.2;
  bx(0.1,0.8,1.1,0x3dff8a,PW.x-15.6,GY+1.3,sz4,{emissive:0x2aaf6a,emissiveIntensity:0.6});
  addC(0.1,0.8,1.1,PW.x-15.6,GY+1.3,sz4);}
labReception(PW,PW.z+14,0x3dff8a);
label('汽輪機組','#ffb04a',PW.x,GY+6.4,PW.z+1,6,0);
// 2F 發電控制中心 / 3F 倉儲
labFloor2(PW,8.1,0x3dff8a);labPart(PW,8.1,PW.x+10);
label('2F 發電控制中心','#ffb04a',PW.x-6,11.9,PW.z-14,7,0);
labFloor3(PW,12.1,0xffb04a);labPart(PW,12.1,PW.x-10);
label('3F 設備倉儲','#ffb04a',PW.x+16,15.9,PW.z,7,0);
lounge1(PW);lounge2(PW);lounge3(PW);

// —— B. 核能源研究站（NE）60×40×16 ——
NU=labBase(55,70,60,40,16,0xf09292,'核能源研究站','#ff5a5a',[79.5,83.5,4,6.6]);
labCore(NU,8.1,12.1);
// 半球安全殼（透明玻璃）
(function(){
  var dm=new T.Mesh(new T.SphereGeometry(6,22,12,0,Math.PI*2,0,Math.PI/2),
    mat(0x9ad0ff,{transparent:true,opacity:0.28,roughness:0.1,metalness:0.3,side:T.DoubleSide,emissive:0x2a5a80,emissiveIntensity:0.18}));
  dm.position.set(NU.x,GY,NU.z);scene.add(dm);
  cyl(6.4,6.6,0.8,0x99a3ae,NU.x,GY+0.4,NU.z,{metalness:0.4});addC(13,0.8,13,NU.x,GY+0.4,NU.z);
})();
// 反應爐核心（殼內）
cyl(2.4,2.8,5.4,0x8a4a3a,NU.x,GY+3.1,NU.z,{metalness:0.4,roughness:0.4});addC(5.6,5.4,5.6,NU.x,GY+3.1,NU.z);
cyl(1.9,1.9,0.9,0xff6a3a,NU.x,GY+6.1,NU.z,{emissive:0xff4411,emissiveIntensity:0.8});
// 輻射警示燈（南牆）
bx(2,2,0.12,0xffcc00,NU.x,3.2,NU.z+19.4,{emissive:0xaa8800,emissiveIntensity:0.6});
// 北側主控台+螢幕牆
bx(12,1.5,1.8,0x93a8bf,NU.x,GY+0.75,NU.z-17);addC(12,1.5,1.8,NU.x,GY+0.75,NU.z-17);
bx(11,3.2,0.3,0x2f3e4f,NU.x,GY+3.4,NU.z-18.6);
for(var ns=0;ns<6;ns++)
  bx(1.6,1.2,0.1,0xff5a5a,NU.x-4.5+ns*1.8,GY+3.6,NU.z-18.35,{emissive:0xcc2a2a,emissiveIntensity:0.7});
// 東側側控台×2（貼牆）
for(var sd=0;sd<2;sd++){
  var sz2=NU.z-6+sd*12;
  bx(1.6,1.3,5,0x93a8bf,NU.x+25,GY+0.65,sz2);addC(1.6,1.3,5,NU.x+25,GY+0.65,sz2);
  bx(0.1,0.9,4,0xff5a5a,NU.x+24.1,GY+1.2,sz2,{emissive:0xcc2a2a,emissiveIntensity:0.6});
  addC(0.1,0.9,4,NU.x+24.1,GY+1.2,sz2);
}
labReception(NU,NU.z+14,0xff5a5a);
label('反應爐安全殼','#ff5a5a',NU.x,GY+7.4,NU.z,7,0);
// 2F 主控室 / 3F 會議室
labFloor2(NU,8.1,0xff5a5a);labPart(NU,8.1,NU.x+10);
label('2F 主控室','#ff5a5a',NU.x-6,11.9,NU.z-14,7,0);
labFloor3(NU,12.1,0xff5a5a);labPart(NU,12.1,NU.x-10);
label('3F 核能會議室','#ff5a5a',NU.x+16,15.9,NU.z,7,0);
lounge1(NU);lounge2(NU);lounge3(NU);

// —— C. 生物實驗室（SE）60×40×16 ——
BL=labBase(55,10,60,40,16,0x7fd6a0,'生物實驗室','#3dff8a',[79.5,23.5,4,6.6]);
labCore(BL,8.1,12.1);
// 4座培養槽（玻璃+蒼白標本，靜止）
for(var bt=0;bt<4;bt++){
  var bx3=BL.x-9+bt*6;
  bx(3.6,0.7,3.6,0x9fb4c8,bx3,GY+0.35,BL.z-5);addC(3.6,0.7,3.6,bx3,GY+0.35,BL.z-5);
  cyl(1.5,1.5,3.2,0xaad8e8,bx3,GY+2.3,BL.z-5,{transparent:true,opacity:0.3,roughness:0.08,emissive:0x3a7a8a,emissiveIntensity:0.25});
  addC(3.0,3.4,3.0,bx3,GY+2.3,BL.z-5);
  bx(0.9,1.7,0.6,0xd8d4c8,bx3,GY+1.55,BL.z-5);
  var hd=new T.Mesh(new T.SphereGeometry(0.42,10,8),mat(0xd8d4c8));
  hd.position.set(bx3,GY+2.75,BL.z-5);scene.add(hd);
  cyl(1.5,1.5,0.3,0x6a8a9a,bx3,GY+4.05,BL.z-5,{metalness:0.4});
}
// 2張解剖台
for(var ds=0;ds<2;ds++){
  var dx2=BL.x-7+ds*14;
  bx(4,0.9,1.8,0xd0d8e0,dx2,GY+0.45,BL.z+5);addC(4,0.9,1.8,dx2,GY+0.45,BL.z+5);
  bx(2.6,0.5,1.0,0xd8d4c8,dx2,GY+1.15,BL.z+5);
}
// 西牆標本架（3層，標本靜止）
for(var sh=0;sh<3;sh++){
  bx(1.4,0.3,10,0xb08048,BL.x-27,GY+1.2+sh*1.5,BL.z);addC(1.4,0.3,10,BL.x-27,GY+1.2+sh*1.5,BL.z);
  for(var jr=0;jr<4;jr++)
    cyl(0.28,0.28,0.7,sh===1?0xd8d4c8:0x7ade98,BL.x-27,GY+1.7+sh*1.5,BL.z-3.6+jr*2.4,{transparent:true,opacity:0.7,emissive:0x1a5a3a,emissiveIntensity:0.3});
}
labReception(BL,BL.z+14,0x3dff8a);
label('死亡標本區','#3dff8a',BL.x,GY+6.2,BL.z-5,6,0);
// 2F 標本冷藏 / 3F 實驗區
labFloor2(BL,8.1,0x3dff8a);labPart(BL,8.1,BL.x+10);
for(var cf=0;cf<3;cf++){
  cyl(1.2,1.2,2.6,0x7ade98,BL.x-14+cf*6,8.225+1.3,BL.z+6,{transparent:true,opacity:0.4,emissive:0x1a5a3a,emissiveIntensity:0.4});
  addC(2.4,2.6,2.4,BL.x-14+cf*6,8.225+1.3,BL.z+6);
}
label('2F 標本冷藏','#3dff8a',BL.x-6,11.9,BL.z-14,7,0);
labFloor3(BL,12.1,0x3dff8a);labPart(BL,12.1,BL.x-10);
for(var lt=0;lt<3;lt++){
  bx(3.6,0.9,1.8,0xd0d8e0,BL.x-26+lt*7,12.675,BL.z+14);addC(3.6,0.9,1.8,BL.x-26+lt*7,12.675,BL.z+14);
}
label('3F 實驗區','#3dff8a',BL.x+16,15.9,BL.z,7,0);
lounge1(BL);lounge2(BL);lounge3(BL);

// —— D. 航天發展研究室（NW）60×40×16 ——
AE=labBase(-55,70,60,40,16,0xb39cf5,'航天發展研究室','#bb88ff',[-30.5,83.5,4,6.6]);
labCore(AE,8.1,12.1);
// 火箭 + 旋轉組裝轉盤（持續旋轉）
var rocketG=new T.Group();rocketG.position.set(AE.x,GY,AE.z);scene.add(rocketG);
(function(){
  var base=new T.Mesh(GB,mat(0x9aa4b0,{metalness:0.5,roughness:0.4}));
  base.scale.set(10,0.5,10);base.position.set(0,0.25,0);base.castShadow=true;rocketG.add(base);
  var ring=new T.Mesh(new T.TorusGeometry(4.4,0.2,8,32),mat(0xffcc22,{metalness:0.5,roughness:0.35}));
  ring.rotation.x=Math.PI/2;ring.position.set(0,0.55,0);rocketG.add(ring);
  var body=new T.Mesh(new T.CylinderGeometry(1.5,1.5,4.5,14),mat(0xdfe4ea,{metalness:0.4,roughness:0.35}));
  body.position.set(0,2.75,0);body.castShadow=true;rocketG.add(body);
  var band=new T.Mesh(new T.CylinderGeometry(1.56,1.56,0.5,14,1,true),mat(0x93a8bf));
  band.position.set(0,4.3,0);rocketG.add(band);
  var nose=new T.Mesh(new T.ConeGeometry(1.5,2.2,14),mat(0xcc4433,{metalness:0.3}));
  nose.position.set(0,6.1,0);rocketG.add(nose);
  for(var f=0;f<4;f++){
    var fin=new T.Mesh(GB,mat(0xcc4433));
    fin.scale.set(1.2,1.5,0.15);
    fin.position.set(Math.sin(f*Math.PI/2)*2.0,1.3,Math.cos(f*Math.PI/2)*2.0);
    fin.rotation.y=f*Math.PI/2;rocketG.add(fin);
  }
  SPINS.push({m:rocketG,v:0.25});
})();
addC(10,2,10,AE.x,GY+1,AE.z);
// 側向組裝環架（持續旋轉）
var rigG=new T.Group();rigG.position.set(AE.x+11,GY,AE.z);scene.add(rigG);
(function(){
  var rb3=new T.Mesh(GB,mat(0x9aa4b0));
  rb3.scale.set(3.4,0.4,3.4);rb3.position.set(0,0.2,0);rb3.castShadow=true;rigG.add(rb3);
  var hoop=new T.Mesh(new T.TorusGeometry(3,0.22,8,28),mat(0x8a9098,{metalness:0.5,roughness:0.35}));
  hoop.position.set(0,3.4,0);rigG.add(hoop);
  var arm=new T.Mesh(GB,mat(0xffcc22,{metalness:0.4}));
  arm.scale.set(0.35,0.35,5);arm.position.set(0,3.4,1.2);rigG.add(arm);
  var arm2=new T.Mesh(GB,mat(0x8a9098));
  arm2.scale.set(0.3,0.3,5);arm2.position.set(0,5.6,1.2);rigG.add(arm2);
  SPINS.push({m:rigG,v:-0.5});
})();
addC(6.8,6.8,6.8,AE.x+11,GY+3.4,AE.z);
// 設計工作台×3（北側）
for(var wk=0;wk<3;wk++){
  var wx2=AE.x+10-wk*10;
  bx(4,0.9,1.6,0xc09060,wx2,GY+0.45,AE.z-10);addC(4,0.9,1.6,wx2,GY+0.45,AE.z-10);
  bx(1.8,1.1,0.1,0x9ad0ff,wx2,GY+1.6,AE.z-10.85,{transparent:true,opacity:0.6,emissive:0x3a6aaa,emissiveIntensity:0.5});
  addC(1.8,1.1,0.1,wx2,GY+1.6,AE.z-10.85);
}
labReception(AE,AE.z+14,0xbb88ff);
label('火箭組裝區','#bb88ff',AE.x,GY+7.2,AE.z,7,0);
// 2F 設計室 / 3F 火箭展示
labFloor2(AE,8.1,0x9ad0ff);labPart(AE,8.1,AE.x+10);
label('2F 設計室','#bb88ff',AE.x-6,11.9,AE.z-14,7,0);
labFloor3(AE,12.1,0xbb88ff);labPart(AE,12.1,AE.x-10);
(function(){
  var t=12.225;
  bx(6,1,3,0xc09060,AE.x+16,t+0.5,AE.z);addC(6,1,3,AE.x+16,t+0.5,AE.z);
  var mb=new T.Mesh(new T.CylinderGeometry(0.5,0.5,2.2,10),mat(0xdfe4ea,{metalness:0.4}));
  mb.position.set(AE.x+16,t+2.1,AE.z);scene.add(mb);
  var mn=new T.Mesh(new T.ConeGeometry(0.5,0.9,10),mat(0xcc4433));
  mn.position.set(AE.x+16,t+3.65,AE.z);scene.add(mn);
})();
label('3F 火箭展示','#bb88ff',AE.x+16,15.9,AE.z,7,0);
lounge1(AE);lounge2(AE);lounge3(AE);

// ═══════════ 管道走道（生物屋頂 → 總裁2F）═══
(function(){
  var zc=-2.5,d0x=55,d1x=30,y0=16.4,y1=EX_Y+4.275;   // 頂=28.275 與總裁2F地板齊平
  var N=30,dx=(d1x-d0x)/N,dy=(y1-y0)/N;
  for(var s=0;s<=N;s++){
    var x=d0x+dx*s,y=y0+dy*s;
    bx(1.0,0.4,2.4,0x6a7a6a,x,y-0.2,zc);addC(1.0,0.4,2.4,x,y-0.2,zc);
    if(s%3===0&&s<N){
      bx(0.15,0.9,0.15,0xffcc22,x,y+0.45,zc+1.3);addC(0.15,0.9,0.15,x,y+0.45,zc+1.3);
      bx(0.15,0.9,0.15,0xffcc22,x,y+0.45,zc-1.3);addC(0.15,0.9,0.15,x,y+0.45,zc-1.3);
    }
  }
  var run=Math.abs(d1x-d0x),rise=y1-y0;
  var len=Math.sqrt(run*run+rise*rise),ang=Math.atan2(rise,d1x-d0x);
  for(var sg=0;sg<2;sg++){
    var m=bx(len,0.1,0.1,0xffcc22,(d0x+d1x)/2,(y0+y1)/2+0.9,zc+(sg?1.3:-1.3));
    m.rotation.z=ang;
    var pp=cyl(0.45,0.45,len,0x5a7a6a,(d0x+d1x)/2,(y0+y1)/2-1.0,zc+(sg?1.75:-1.75),{metalness:0.4});
    pp.rotation.z=ang;
  }
  // 屋頂平段管線
  for(var pz2=0;pz2<2;pz2++){
    var fp=cyl(0.45,0.45,20,0x5a7a6a,45,17.0,zc+(pz2?1.75:-1.75),{metalness:0.4});
    fp.rotation.z=Math.PI/2;
    addC(20,0.9,0.9,45,17.0,zc+(pz2?1.75:-1.75));
  }
  // 支撐柱（落在屋頂）
  bx(0.3,11.7,0.3,0x99a3ae,30,16.4+5.85,-3.2);addC(0.3,11.7,0.3,30,16.4+5.85,-3.2);
  bx(0.3,11.7,0.3,0x99a3ae,30,16.4+5.85,-8.5);addC(0.3,11.7,0.3,30,16.4+5.85,-8.5);
  bx(0.3,10.5,0.3,0x99a3ae,34,16.4+5.25,-2.5);addC(0.3,9.5,0.3,34,16.4+4.75,-2.5);
  // 橋面 → 總裁2F 管道門（x27~33 南牆）
  bx(2.4,0.18,8.4,0x6a7a6a,29.7,EX_Y+4.275-0.09,-6.5);addC(2.4,0.2,8.4,29.7,EX_Y+4.275-0.09,-6.5);
  bx(0.1,0.9,8.4,0xffcc22,29.7-1.15,EX_Y+4.275+0.45,-6.5);addC(0.1,0.9,8.4,29.7-1.15,EX_Y+4.275+0.45,-6.5);
  bx(0.1,0.9,7.0,0xffcc22,29.7+1.15,EX_Y+4.275+0.45,-7.2);addC(0.1,0.9,7.0,29.7+1.15,EX_Y+4.275+0.45,-7.2);
  label('管道走道 → 總裁區2F','#8ad0ff',30,y1+3.5,-6.5,7,0);
})();

// ═══════════ 高處維修道路（四棟互通環形 + 支道 + 黃梯）═══
var CATY=8.4;
(function(){
  var w=2.4;
  catwalk(-95,-14,-95,100,CATY,w);   // 西環（外擴避開 60 寬建築）
  catwalk(95,-14,95,100,CATY,w);     // 東環
  catwalk(-95,-14,95,-14,CATY,w);    // 南環
  catwalk(-95,100,95,100,CATY,w);    // 北環
  catwalk(PW.x-PW.w/2,PW.z,-95,PW.z,CATY,w);   // 支道 → 發電站西梯
  catwalk(AE.x-AE.w/2,AE.z,-95,AE.z,CATY,w);   // 支道 → 航天西梯
  catwalk(BL.x+BL.w/2,BL.z,95,BL.z,CATY,w);    // 支道 → 生物東梯
  catwalk(NU.x+NU.w/2,NU.z,95,NU.z,CATY,w);    // 支道 → 核能東梯
  yellowLadder(PW.x-PW.w/2,PW.z,0.2,CATY+0.4,3);
  yellowLadder(AE.x-AE.w/2,AE.z,0.2,CATY+0.4,3);
  yellowLadder(BL.x+BL.w/2,BL.z,0.2,CATY+0.4,2);
  yellowLadder(NU.x+NU.w/2,NU.z,0.2,CATY+0.4,2);
  label('高處維修道路','#8ad0ff',0,CATY+2.5,-14,14,0);
})();


// ═══════════ 遠山 ═══════════
var mtnM=mat(0x3a4a5a,{flatShading:true}),mtnM2=mat(0x2a3a48,{flatShading:true});
for(var mx=-200;mx<=200;mx+=40){
  var mh=14+Math.abs(Math.sin(mx*0.04))*18;
  var m1=new T.Mesh(new T.ConeGeometry(22,mh,5),mtnM);m1.position.set(mx,mh/2-1,180);scene.add(m1);
  var m2=new T.Mesh(new T.ConeGeometry(22,mh*0.85,5),mtnM);m2.position.set(mx+16,mh*0.42,-180);scene.add(m2);
  var m3=new T.Mesh(new T.ConeGeometry(30,mh*1.25,5),mtnM2);m3.position.set(mx-10,mh*0.62-2,220);scene.add(m3);
}

})();

// ============ SAFE MESHES ============
function createSafeMeshes() {
  for (const safe of safes) {
    const g = new THREE.Group();
    const sy = terrainY(safe.x, safe.z);
    g.position.set(safe.x, sy, safe.z);
    scene.add(g);
    // Safe body
    const body = new THREE.Mesh(geoBox, M(0x554433));
    body.scale.set(0.8, 0.6, 0.6);
    body.position.set(0, 0.3, 0);
    g.add(body);
    // Safe door/lid (the part that opens)
    const lid = new THREE.Mesh(geoBox, M(0x665544));
    lid.scale.set(0.75, 0.55, 0.05);
    lid.position.set(0, 0.3, 0.35);
    g.add(lid);
    safe.mesh = g;
    safe.lidMesh = lid;
    safe.baseY = sy;

    // Rarity glow
    if (safe.rarity >= 2) {
      const glow = new THREE.PointLight(RARITY_COLORS_HEX[safe.rarity], 0.3, 5);
      glow.position.set(0, 0.6, 0);
      g.add(glow);
    }
  }
}

function createDoorMeshes() {
  for (const door of doors) {
    const g = new THREE.Group();
    const dy = terrainY(door.x, door.z);
    g.position.set(door.x, dy, door.z);
    scene.add(g);
    const frame = new THREE.Mesh(geoBox, M(0x554433));
    frame.scale.set(0.9, 2.0, 0.08);
    frame.position.set(0, 1.0, 0);
    g.add(frame);
    door.mesh = g;
    door.baseY = dy;
  }
}

// ============ BOT MESHES ============
function makeBotGun(parent, x, y, z) {
  const gg = new THREE.Group();
  const gm = new THREE.MeshStandardMaterial({color:0x444455,metalness:0.4,roughness:0.6});
  const gd = new THREE.MeshStandardMaterial({color:0x333338,metalness:0.3,roughness:0.7});
  const barr = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.018,0.35,6), gm);
  barr.rotation.x = Math.PI/2; barr.position.set(0,0,-0.18); gg.add(barr);
  const bdy = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.04,0.12), gd);
  bdy.position.set(0,0,0); gg.add(bdy);
  const grp = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.04,0.02), gd);
  grp.position.set(0,-0.03,0.04); grp.rotation.x = 0.3; gg.add(grp);
  const stk = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.03,0.06), gd);
  stk.position.set(0,0.01,0.09); gg.add(stk);
  gg.position.set(x, y, z);
  if (parent) parent.add(gg);
  return gg;
}

function spawnBots() {
  const botGeoBody = new THREE.BoxGeometry(0.6, 0.9, 0.4);
  const botGeoHead = new THREE.SphereGeometry(0.15, 6, 6);
  for (const bs of BOT_SPAWNS) {
    if (bots.length >= BOT_COUNT) break;
    const type = BOT_TYPES[bs.type] || BOT_TYPES[0];
    const by = terrainY(bs.x, bs.z);
    const g = new THREE.Group();
    g.position.set(bs.x, by, bs.z);
    // Body
    const body = new THREE.Mesh(botGeoBody, M(type.color,{side:THREE.DoubleSide}));
    body.position.set(0, 0.5, 0);
    g.add(body);
    // Head
    const head = new THREE.Mesh(botGeoHead, M(type.color+0x222222,{side:THREE.DoubleSide}));
    head.position.set(0, 1.0, 0);
    g.add(head);
    // Gun (detailed model)
    makeBotGun(g, 0.35, 0.45, -0.15);
    g.userData.noRaycast = true;  // 敵人 bot：子彈已另外用獨立 raycast 判定
    scene.add(g);

    const bot = {
      pos: new THREE.Vector3(bs.x, by, bs.z),
      health: type.health,
      maxHealth: type.health,
      type: type,
      mesh: g,
      state: 'patrol', // patrol, chase, attack, dead
      patrolTarget: null,
      patrolWait: 0,
      attackTimer: 0,
      detectRange: type.detectRange,
      attackRange: type.attackRange,
      speed: type.speed,
      damage: type.damage,
      dead: false,
      deathTimer: 0,
      alertTimer: 0,
      yaw: Math.random() * Math.PI * 2,
    };
    // Initial patrol target
    pickPatrolTarget(bot);
    bots.push(bot);
  }
}

function pickPatrolTarget(bot) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 15 + Math.random() * 30;
  let tx = bot.pos.x + Math.cos(angle) * dist;
  let tz = bot.pos.z + Math.sin(angle) * dist;
  tx = Math.max(-W_HALF+5, Math.min(W_HALF - 5, tx));
  tz = Math.max(-W_HALF+5, Math.min(W_HALF - 5, tz));
  bot.patrolTarget = new THREE.Vector3(tx, 0, tz);
  bot.patrolWait = 2 + Math.random() * 4;
}

// ============ 撤離點（無直升機）============
// 撤離站以火車為主，無直升機相關狀態

// ============ PLAYER ============
const playerPos = new THREE.Vector3(45, 0, 270);
const playerRadius = 0.3;
const playerHeight = 1.8;
let yaw = 0, pitch = 0;
const euler = new THREE.Euler(0,0,0,'YXZ');
const PI_2 = Math.PI/2;
let verticalVel = 0;
var playerSpawn = {x:0,y:0,z:0};
const gravity = -50;      // 加倍：與 jumpSpeed 同步提升，讓跳躍高度約為原本 2 倍
const jumpSpeed = 16;     // 加倍
const walkSpeed = 20;     // 加倍
const runSpeed = 28;      // 加倍
let isLocked = false;

// 摸金世界碰撞由西里特壩建構區提供（含門廊缺口）
function collideWorld(pos) {
  for (const c of colliders) {
    const hw=c.w/2, hd=c.d/2;
    if (pos.x>c.x-hw-playerRadius && pos.x<c.x+hw+playerRadius &&
        pos.z>c.z-hd-playerRadius && pos.z<c.z+hd+playerRadius &&
        pos.y>c.y-0.5 && pos.y<c.y+c.h+playerHeight) {
      const dx=pos.x-c.x, dz=pos.z-c.z;
      const ox=Math.min(pos.x-(c.x-hw-playerRadius),(c.x+hw+playerRadius)-pos.x);
      const oz=Math.min(pos.z-(c.z-hd-playerRadius),(c.z+hd+playerRadius)-pos.z);
      if(ox<oz) pos.x=dx>0?c.x+hw+playerRadius:c.x-hw-playerRadius;
      else pos.z=dz>0?c.z+hd+playerRadius:c.z-hd-playerRadius;
    }
  }
}

// Input
const input={w:false,s:false,a:false,d:false,shift:false,space:false,e:false};
document.addEventListener('keydown',e=>{var pl=window.playerLoadout;switch(e.code){case'KeyW':input.w=true;break;case'KeyS':input.s=true;break;case'KeyA':input.a=true;break;case'KeyD':input.d=true;break;case'ShiftLeft':case'ShiftRight':input.shift=true;break;case'Space':input.space=true;e.preventDefault();break;case'KeyE':interact();break;case'KeyF':pickupStone();break;case'KeyI':case'KeyB':toggleBackpack();break;case'Digit1':case'Numpad1':if(pl&&pl[0])switchExtGun(pl[0]);break;case'Digit2':case'Numpad2':if(pl&&pl[1])switchExtGun(pl[1]);break;case'Digit3':case'Numpad3':if(pl&&pl[2])switchExtGun(pl[2]);break;case'Digit4':case'Numpad4':if(pl&&pl[3])switchExtGun(pl[3]);break;case'Digit5':case'Numpad5':if(pl&&pl[4])switchExtGun(pl[4]);break;case'KeyR':extReload();break;case'KeyJ':if(extGunType&&extGunType!=='knife'&&extGunType!=='grapple'&&extGunType!=='grenade'&&!extReloading&&extSwapAnim<=0)extInspectAnim=extInspectDuration;break;}});
document.addEventListener('keyup',e=>{switch(e.code){case'KeyW':input.w=false;break;case'KeyS':input.s=false;break;case'KeyA':input.a=false;break;case'KeyD':input.d=false;break;case'ShiftLeft':case'ShiftRight':input.shift=false;break;case'Space':input.space=false;break;}});

// Pointer lock
document.addEventListener('mousemove',e=>{if(!isLocked)return;const s=0.002;yaw-=e.movementX*s;pitch-=e.movementY*s;pitch=Math.max(-PI_2*0.9,Math.min(PI_2*0.9,pitch));euler.set(pitch,yaw,0);camera.quaternion.setFromEuler(euler);});
document.getElementById('ext-blocker').addEventListener('click',(e)=>{renderer.domElement.requestPointerLock().catch(()=>{});});
document.addEventListener('pointerlockchange',()=>{try{isLocked=!!document.pointerLockElement;var bl=document.getElementById('ext-blocker');if(!bl)return;var mm=document.getElementById('ext-minimap');var su=document.getElementById('safe-ui');var bu=document.getElementById('backpack-ui');var ro=document.getElementById('results-overlay');var dc=document.getElementById('ext-drop-confirm');var hasUI=(su&&su.style.display==='flex')||(bu&&bu.style.display==='flex')||(dc&&dc.style.display==='flex');var hasResults=ro&&ro.style.display==='flex';// 確認視窗（丟石頭等）開啟時屬於正常 UI 狀態，不可顯示「遊戲暫停」遮罩擋住按鈕
var extFail=document.getElementById('extfail');var hasFail=extFail&&extFail.parentNode;if(isLocked){bl.style.display='none';if(mm)mm.style.display='block';}else if(!hasUI&&!hasResults&&!hasFail&&gameState!==STATE.RESULTS){bl.style.display='flex';if(mm)mm.style.display='none';bl.querySelectorAll('.mm-only').forEach(function(el){el.style.display='none';});bl.querySelector('h1').textContent='遊戲暫停';bl.querySelector('.sub').textContent='點擊繼續遊戲';}}catch(e){console.error('ext pointerlockchange',e);}});

// ============ AMMO & RELOAD ============
var extAmmo = {};
var extReloading = false, extReloadTimer = 0, extReloadDuration = 0, extMaxAmmo = 30;
var extSwapAnim = 0, extSwapDuration = 0.3, extSwapOldGroup = null, extSwapOldType = '';
var extInspectAnim = 0, extInspectDuration = 1.5;
function initExtAmmo(type) {
  var gd = window.gunData ? window.gunData[type] : null;
  var mag = gd ? gd.mag : 30;
  extAmmo[type] = mag;
  extMaxAmmo = mag;
}
function extReload() {
  if (extGunType === 'knife' || extGunType === 'grapple' || extGunType === 'grenade') return;
  var gd = window.gunData ? window.gunData[extGunType] : null;
  if (!gd || extReloading || extInspectAnim > 0 || extSwapAnim > 0) return;
  var mag = gd.mag || 30;
  if ((extAmmo[extGunType]||0) >= mag) return;
  extReloading = true; extReloadTimer = gd.reloadTime || 2; extReloadDuration = extReloadTimer;
}
// ============ SHOOTING ============
let shootCooldown = 0;
let mouseDown = false;
document.addEventListener('mousedown', e => {
  if (!isLocked || e.button !== 0) return;
  mouseDown = true;
  if (gameState !== STATE.DEPLOYED) return;
  if (shootCooldown > 0) return;
  fireOnce();
});
document.addEventListener('mouseup', e => {
  if (e.button === 0) mouseDown = false;
});
// ADS (right-click)
var extADS = false;
document.addEventListener('contextmenu', e => { e.preventDefault(); });
document.addEventListener('mousedown', e => {
  if (!isLocked) return;
  if (e.button === 2) {
    if (extGunType !== 'knife' && extGunType !== 'grapple' && extGunType !== 'grenade') extADS = !extADS;
  }
});

// Reusable muzzle flash
var _extFlashMesh = null, _extFlashLight = null, _extFlashTimer = 0;
// Impact / bullet hole pools
var _extImpactPool = [], _extBulletHolePool = [], _extImpacts = [], _extBulletHoles = [];
function getExtImpactMesh() {
  for (var i=0;i<_extImpactPool.length;i++) { if (!_extImpactPool[i].parent) return _extImpactPool[i]; }
  var im = new THREE.Mesh(new THREE.SphereGeometry(0.02,4,4),new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff8800,emissiveIntensity:0.5}));
  im.userData.noRaycast = true;  // 彈著火花：不列入靜態 raycast 清單
  _extImpactPool.push(im); return im;
}
function getExtBulletHole() {
  for (var i=0;i<_extBulletHolePool.length;i++) { if (!_extBulletHolePool[i].parent) return _extBulletHolePool[i]; }
  var bh = new THREE.Mesh(new THREE.CircleGeometry(0.03,6),new THREE.MeshStandardMaterial({color:0x222222,side:THREE.DoubleSide,depthWrite:false}));
  bh.userData.noRaycast = true;  // 彈孔：不列入靜態 raycast 清單
  _extBulletHolePool.push(bh); return bh;
}
// 命中／著地／手雷閃光燈池：燈光常駐場景只切換 intensity。
// 每次 new PointLight + scene.remove 會改變場景光源數量，Three.js 會重新編譯
// 全場景材質 shader，導致開火瞬間嚴重卡頓。
var _extFlashLightPool = [];
var _extBotFlashVec = new THREE.Vector3();
// 破譯站提示旗標（主迴圈設定，讓 updateInteractPrompt 不覆蓋）
var _extDecryptPrompt = false;
function popExtFlashLight(color, dist, pos, intensity) {
  var fl = null;
  for (var i=0;i<_extFlashLightPool.length;i++) { if (_extFlashLightPool[i].intensity <= 0) { fl = _extFlashLightPool[i]; break; } }
  if (!fl) {
    if (_extFlashLightPool.length >= 8) { fl = _extFlashLightPool[0]; }
    else { fl = new THREE.PointLight(color, 0, dist); scene.add(fl); _extFlashLightPool.push(fl); }
  }
  fl.color.setHex(color); fl.distance = dist; fl.position.copy(pos);
  fl.userData.baseI = intensity == null ? 2 : intensity;
  fl.intensity = fl.userData.baseI;
}
function updateExtFlashLights(dt) {
  for (var i=0;i<_extFlashLightPool.length;i++) {
    var fl = _extFlashLightPool[i];
    if (fl.intensity > 0) { fl.intensity -= (fl.userData.baseI || 2) * dt / 0.1; if (fl.intensity < 0) fl.intensity = 0; }
  }
}
function fireOnce() {
  if (extReloading || extInspectAnim > 0) return;
  if (extGunType === 'knife' || extGunType === 'grapple') { shootCooldown = 0.4; playerShoot(); return; }
  if (extGunType === 'grenade') { shootCooldown = 0.8; playerShoot(); return; }
  var gd = window.gunData ? window.gunData[extGunType] : null;
  if (!gd) gd = {dmg:20,fireRate:0.1,spread:0.025,mag:30,damageRange:35};
  var cur = extAmmo[extGunType] || 0;
  if (cur <= 0) { extReload(); return; }
  extAmmo[extGunType] = cur - 1;
  shootCooldown = gd.fireRate || 0.1;
  playerShoot();
}

function playerShoot() {
  // Muzzle flash at barrel tip
  var tip = extGunGroup && extGunGroup.userData && extGunGroup.userData.barrelTip ? extGunGroup.userData.barrelTip.clone() : new THREE.Vector3(0,0,-0.495);
  var bt = tip;
  if (extGunGroup) { extGunGroup.updateMatrixWorld(true); extGunGroup.localToWorld(bt); }
  else { bt.set(0.2,-0.15,-0.6); bt.applyQuaternion(camera.quaternion); bt.add(camera.position); }
  if (!_extFlashMesh) {
    _extFlashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04,6,6),new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff8800,emissiveIntensity:4}));
    _extFlashMesh.userData.noRaycast = true;  // 槍口閃光：不列入靜態 raycast 清單
    _extFlashLight = new THREE.PointLight(0xffaa44,0,5);
    scene.add(_extFlashLight);  // 常駐場景：避免每發增刪光源造成 shader 重編譯
  }
  _extFlashMesh.position.copy(bt); scene.add(_extFlashMesh);
  _extFlashLight.position.copy(bt); _extFlashLight.intensity = 4;
  _extFlashTimer = 0.06;
  // Raycast from camera center
  const ray = new THREE.Raycaster();
  ray.camera = camera;  // Sprite raycast 需要 camera，避免 null.matrixWorld 崩潰
  ray.set(camera.position, camera.getWorldDirection(new THREE.Vector3()));
  // Send shoot event to server (for other players to see)
  sendExtractionMessage({ type: 'extraction_shoot', origin: [camera.position.x, camera.position.y, camera.position.z], dir: [0,0,0] });
  // Check against remote players (PvP)
  for (const pid in remotePlayers) {
    const rp = remotePlayers[pid];
    if (!rp.mesh || rp.state === 'dead' || rp.state === 'extracted') continue;
    const intersects = ray.intersectObjects(rp.mesh.children, true);
    if (intersects.length > 0 && intersects[0].distance < 80) {
      var gd = window.gunData ? window.gunData[extGunType] : null;
      const dmg = gd ? gd.dmg : 25;
      // Notify server we hit this player
      sendExtractionMessage({ type: 'extraction_hit_player', targetPlayerId: parseInt(pid), damage: dmg });
      // Hit effect
      popExtFlashLight(0xff4444, 3, intersects[0].point, 2);
      const hm = document.getElementById('hitmarker');
      hm.style.display = 'block';
      setTimeout(() => hm.style.display = 'none', 100);
      return; // Only hit one target per shot
    }
  }
  // Check against bot meshes
  for (const bot of bots) {
    if (bot.dead) continue;
    const intersects = ray.intersectObjects(bot.mesh.children, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const dist = hit.distance;
      var gd = window.gunData ? window.gunData[extGunType] : null;
      if (dist > (gd ? gd.damageRange || gd.damageFalloff*100 || 80 : 80)) continue;
      var gd = window.gunData ? window.gunData[extGunType] : null;
      var dmg = gd ? gd.dmg : 25;
      bot.health -= dmg;
      // Damage number
      showExtDmgNum(hit.point, dmg);
      // Hit effect: brief flash on bot + hit marker
      popExtFlashLight(0xffaa44, 3, hit.point, 2);
      const hm = document.getElementById('hitmarker');
      hm.style.display = 'block';
      setTimeout(() => hm.style.display = 'none', 100);

      if (bot.health <= 0) {
        killBot(bot);
      } else {
        // Alert bot to player position
        if (bot.state === 'patrol') {
          bot.state = 'alert';
          bot.alertTimer = 0.5;
        }
      }
      break;
    }
  }
  // Check against AI player meshes (摸金模式的 AI 玩家)
  for (const ai of _extAIPlayers) {
    if (ai.dead || ai.extracted || !ai.mesh) continue;
    const intersects = ray.intersectObjects(ai.mesh.children, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.distance > 80) continue;
      var gdAI = window.gunData ? window.gunData[extGunType] : null;
      var dmgAI = gdAI ? gdAI.dmg : 25;
      ai.health -= dmgAI;
      showExtDmgNum(hit.point, dmgAI);
      popExtFlashLight(0xffaa44, 3, hit.point, 2);
      const hmAI = document.getElementById('hitmarker');
      hmAI.style.display = 'block';
      setTimeout(() => { hmAI.style.display = 'none'; }, 100);
      if (ai.health <= 0) {
        ai.dead = true;
        if (ai.mesh) { scene.remove(ai.mesh); ai.mesh = null; }
      }
      break;
    }
  }
  // Terrain / wall impact (skip gun model)
  if (extGunGroup) extGunGroup.visible = false;
  // 對全場景做 raycast 取子彈著地點
  const terrainHits = ray.intersectObjects(scene.children, true);
  if (extGunGroup) extGunGroup.visible = (gameState === STATE.DEPLOYED || gameState === STATE.EXTRACTING);
  var terrainHit = null;
  for (var thi=0; thi<terrainHits.length; thi++) {
    if (terrainHits[thi].distance > 0.5) { terrainHit = terrainHits[thi]; break; }
  }
  if (terrainHit) {
    var hitPt = terrainHit.point;
    // Impact spark (reusable pool)
    var im = getExtImpactMesh();
    im.position.copy(hitPt); scene.add(im);
    _extImpacts.push({mesh:im,time:0});
    // Bullet hole (reusable pool)
    var bh = getExtBulletHole();
    bh.position.copy(hitPt); bh.lookAt(camera.position); scene.add(bh);
    _extBulletHoles.push(bh);
    if (_extBulletHoles.length > 50) { var old = _extBulletHoles.shift(); if (old.parent) scene.remove(old); }
    // Light flash (pooled, no shader recompile)
    popExtFlashLight(0xffaa44, 2, hitPt, 1);
  }
}

function killBot(bot) {
  bot.dead = true;
  bot.state = 'dead';
  bot.deathTimer = 5;
  matchKills++;
  document.getElementById('kill-count').textContent = matchKills;
  showHUD(`💀 擊殺 ${bot.type.name} (+${bot.type.reward}💰)`);
  // Drop reward as coin value
  totalLootValue += bot.type.reward;
  // Death animation: tip over
  if (bot.mesh) {
    bot.mesh.rotation.x = Math.PI / 2;
    bot.mesh.position.y -= 0.3;
    // Remove after delay
    setTimeout(() => {
      if (bot.mesh) scene.remove(bot.mesh);
    }, 5000);
  }
}

// ============ BOT AI ============
function updateBots(dt) {
  if (gameState !== STATE.DEPLOYED && gameState !== STATE.EXTRACTING) return;
  for (const bot of bots) {
    if (bot.dead) continue;
    const dx = playerPos.x - bot.pos.x;
    const dz = playerPos.z - bot.pos.z;
    const distToPlayer = Math.sqrt(dx*dx + dz*dz);
    const ty = terrainY(bot.pos.x, bot.pos.z);
    bot.pos.y = Math.max(bot.pos.y, ty);

    // State transitions
    switch (bot.state) {
      case 'patrol': {
        // Detect player
        const effDetect = bot.detectRange;
        if (distToPlayer < effDetect) {
          bot.state = 'alert';
          bot.alertTimer = 0.8;
        }
        // Move toward patrol target
        if (bot.patrolTarget) {
          const pdx = bot.patrolTarget.x - bot.pos.x;
          const pdz = bot.patrolTarget.z - bot.pos.z;
          const pDist = Math.sqrt(pdx*pdx + pdz*pdz);
          if (pDist > 2) {
            const s = bot.speed * 0.5 * dt;
            bot.pos.x += (pdx/pDist) * s;
            bot.pos.z += (pdz/pDist) * s;
            bot.yaw = Math.atan2(pdx, pdz);
          } else {
            bot.patrolWait -= dt;
            if (bot.patrolWait <= 0) pickPatrolTarget(bot);
          }
        } else {
          pickPatrolTarget(bot);
        }
        break;
      }
      case 'alert': {
        // Stop and face player
        bot.alertTimer -= dt;
        bot.yaw = Math.atan2(dx, dz);
        if (bot.alertTimer <= 0) {
          bot.state = 'chase';
        }
        break;
      }
      case 'chase': {
        // Move toward player
        const s = bot.speed * dt;
        if (distToPlayer > bot.attackRange) {
          bot.pos.x += (dx/distToPlayer) * s;
          bot.pos.z += (dz/distToPlayer) * s;
        }
        bot.yaw = Math.atan2(dx, dz);
        // Attack if in range
        if (distToPlayer < bot.attackRange) {
          bot.state = 'attack';
          bot.attackTimer = 0;
        }
        // Lose interest if player too far
        if (distToPlayer > bot.detectRange * 1.8) {
          bot.state = 'patrol';
          pickPatrolTarget(bot);
        }
        break;
      }
      case 'attack': {
        bot.yaw = Math.atan2(dx, dz);
        // Strafe slightly
        const strafeAngle = Math.atan2(dz, dx) + Math.sin(Date.now() * 0.002) * 0.5;
        const strafe = 0.3 * dt;
        bot.pos.x += Math.cos(strafeAngle) * strafe;
        bot.pos.z += Math.sin(strafeAngle) * strafe;
        // Shoot at player
        bot.attackTimer -= dt;
        if (bot.attackTimer <= 0 && distToPlayer < bot.attackRange * 1.3) {
          bot.attackTimer = bot.type.attackCooldown;
          // 不穿牆：被牆擋住就不造成傷害（仍顯示槍口閃光）
          const _losOk = extLosClear(bot.pos.x, bot.pos.y+1.2, bot.pos.z, camera.position.x, camera.position.y, camera.position.z);
          // Bot shoots player (hitscan with accuracy penalty)
          const accuracy = 0.45 + Math.random() * 0.35;
          if (_losOk && Math.random() < accuracy) {
            const dmg = bot.damage * (0.5 + Math.random() * 0.5);
            damagePlayer(Math.floor(dmg));
          }
          // Muzzle flash (pooled, no shader recompile)
          if (bot.mesh) {
            _extBotFlashVec.set(bot.pos.x, bot.pos.y + 0.6, bot.pos.z);
            popExtFlashLight(0xff6600, 4, _extBotFlashVec, 1.5);
          }
        }
        // Chase again if player escapes
        if (distToPlayer > bot.attackRange * 1.3) {
          bot.state = 'chase';
        }
        if (distToPlayer > bot.detectRange * 1.8) {
          bot.state = 'patrol';
          pickPatrolTarget(bot);
        }
        break;
      }
    }

    // Clamp to map
    bot.pos.x = Math.max(-W_HALF+2, Math.min(W_HALF - 2, bot.pos.x));
    bot.pos.z = Math.max(-W_HALF+2, Math.min(W_HALF - 2, bot.pos.z));

    // Update mesh position
    if (bot.mesh) {
      const nty = terrainY(bot.pos.x, bot.pos.z);
      bot.pos.y = nty;
      bot.mesh.position.set(bot.pos.x, nty, bot.pos.z);
      bot.mesh.rotation.y = bot.yaw;
    }
  }
}

// Damage number display
var _extDmgNums = [];
function showExtDmgNum(pos, dmg) {
  var c = document.getElementById('ext-hud');
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;font-size:18px;font-weight:bold;color:#ffaa44;text-shadow:0 0 10px rgba(255,170,68,0.8);pointer-events:none;font-family:Arial;z-index:30;transition:all 0.6s ease-out';
  el.textContent = '-' + dmg;
  c.appendChild(el);
  _extDmgNums.push({el:el,pos:pos,time:0});
}
// ============ PLAYER DAMAGE ============
function damagePlayer(amt) {
  if (playerIsDead || playerHasExtracted) return;
  playerHealth = Math.max(0, playerHealth - amt);
  updateHealthDisplay();
  // Red flash on damage
  document.body.style.transition = 'background-color 0.05s';
  document.body.style.backgroundColor = 'rgba(255,0,0,0.25)';
  setTimeout(() => {
    document.body.style.backgroundColor = '';
  }, 120);
  // Floating damage number near crosshair
  if(typeof extCrosshairEl!=='undefined'&&extCrosshairEl){
   showExtDmgNum({x:window.innerWidth/2+(Math.random()*30-15),y:window.innerHeight/2+(Math.random()*20-15),z:0},amt);
  }
  // Screen shake via camera offset
  if(camera){camera.position.x+=(Math.random()-0.5)*0.15;camera.position.y+=(Math.random()-0.5)*0.08;}
  // Hit sound
  try{var ac2=new(window.AudioContext||window.webkitAudioContext)();var osc2=ac2.createOscillator();var g2=ac2.createGain();osc2.type='square';osc2.frequency.setValueAtTime(200,ac2.currentTime);osc2.frequency.exponentialRampToValueAtTime(80,ac2.currentTime+0.12);g2.gain.setValueAtTime(0.12,ac2.currentTime);g2.gain.exponentialRampToValueAtTime(0.001,ac2.currentTime+0.12);osc2.connect(g2);g2.connect(ac2.destination);osc2.start();osc2.stop(ac2.currentTime+0.12);}catch(e){}
  if (playerHealth <= 0) {
    playerDie();
  }
}

function playerDie() {
  playerIsDead = true;
  stopExtractionStateSync();
  gameState = STATE.RESULTS;
  if (document.pointerLockElement) document.exitPointerLock();
  showHUD('💀 你已陣亡');
  // 攜帶中的小黃石掉落原地（可被追蹤拾取）
  const dropped = carriedMine();
  for (const s of dropped) {
    dropStoneAt(s, playerPos.x, terrainY(playerPos.x, playerPos.z)+0.7, playerPos.z);
    sendExtractionMessage({ type:'extraction_stone_drop', stoneId: s.id, x:s.x, y:s.y, z:s.z });
  }
  if (dropped.length) {
    showAnnounce('💀 未鑑定小黃石掉落！位置已顯示在小地圖', 'rgba(255,120,80,.7)');
    for (let i = collectedItems.length-1; i >= 0; i--) {
      if (collectedItems[i].unid) { collectedItems.splice(i,1); collectedCount--; }
    }
  }
  sendExtractionMessage({ type: 'extraction_player_death' });
  setTimeout(() => showResults(false), 1500);
}

function updateHealthDisplay() {
  const pct = (playerHealth / playerMaxHealth) * 100;
  document.getElementById('health-bar').style.width = pct + '%';
  document.getElementById('health-label').textContent = Math.ceil(playerHealth) + ' HP';
  if (pct < 25) {
    document.getElementById('health-bar').style.background = 'linear-gradient(90deg,#c33,#e66)';
  } else if (pct < 50) {
    document.getElementById('health-bar').style.background = 'linear-gradient(90deg,#ca3,#ea6)';
  } else {
    document.getElementById('health-bar').style.background = 'linear-gradient(90deg,#3c3,#6e6)';
  }
}

// ============ INTERACTION ============
let interactTarget = null;

function interact() {
  if (gameState !== STATE.DEPLOYED) return;
  if (climbing) return;
  if (activeSafe) { openSafeUI(activeSafe); return; }

  // Check safes nearby
  for (const safe of safes) {
    if (safe.opened) continue;
    const dx=playerPos.x-safe.x, dz=playerPos.z-safe.z;
    if (Math.sqrt(dx*dx+dz*dz) < safe.interactDist) {
      activeSafe = safe;
      const safeIdx = safes.indexOf(safe);
      sendExtractionMessage({ type: 'extraction_safe_open', safeIdx });
      if (safe.loot.some(l=>!l.taken)) {
        openSafeUI(safe);
      } else {
        showHUD('🔐 保險箱已空');
      }
      return;
    }
  }

  // Check doors nearby
  for (const door of doors) {
    const dx=playerPos.x-door.x, dz=playerPos.z-door.z;
    if (Math.sqrt(dx*dx+dz*dz) < door.interactDist) {
      door.open = !door.open;
      if (door.mesh) {
        door.mesh.rotation.y = door.open ? Math.PI/2 : 0;
      }
      const doorIdx = doors.indexOf(door);
      sendExtractionMessage({ type: 'extraction_door_toggle', doorIdx, open: door.open });
      showHUD(door.open ? '🚪 門打開了' : '🚪 門關上了');
      return;
    }
  }

  // 破譯站：放入手上的未鑑定小黃石
  if (decryptStation && !decryptActive) {
    const dx=playerPos.x-decryptStation.x, dz=playerPos.z-decryptStation.z;
    if (Math.sqrt(dx*dx+dz*dz) < 2.5) {
      if (stones.some(x => x.status==='CARRIED' && x.owner==='me')) {
        startDecrypt();
      } else {
        showHUD('⚠ 需要攜帶未鑑定小黃石才能解析');
      }
      return;
    }
  }

  // 黃色固定梯
  for (const L of LADDERS) {
    if (playerPos.y<L.y0-1||playerPos.y>L.y1+0.5) continue;
    const ldx=playerPos.x-L.x, ldz=playerPos.z-L.z;
    if (ldx*ldx+ldz*ldz<16) { startClimb(L); return; }
  }
  // 電子鎖拉閘（呼叫直升機撤離）
  if (EXT && !EXT.on && !EXT.done && !EXT.failed) {
    const ldx=playerPos.x-EXT.x, ldz=playerPos.z-EXT.z, ldy=Math.abs(playerPos.y-EXT.y);
    if (ldy<2.5 && ldx*ldx+ldz*ldz<9) { pullLever(); return; }
  }
}

function updateInteractPrompt() {
  const prompt = document.getElementById('interact-promp');
  if (gameState !== STATE.DEPLOYED) { prompt.style.display='none'; return; }
  // 破譯站提示已在主迴圈設定（且優先於此處），不要再覆蓋
  if (_extDecryptPrompt) return;

  // 小黃石拾取提示
  {
    const stn = findStoneNear(2.5);
    if (stn) {
      prompt.innerHTML = '🟡 <span style="color:#ffd23f">[F] 拾取未鑑定小黃石</span>';
      prompt.style.display='block'; return;
    }
  }

  for (const safe of safes) {
    if (safe.opened) continue;
    const dx=playerPos.x-safe.x, dz=playerPos.z-safe.z;
    if (Math.sqrt(dx*dx+dz*dz) < safe.interactDist) {
      prompt.innerHTML = `[E] 打開保險箱 <span style="color:${RARITY_COLORS[safe.rarity]}">(${RARITY_NAMES[safe.rarity]})</span>`;
      prompt.style.display='block'; return;
    }
  }

  for (const door of doors) {
    const dx=playerPos.x-door.x, dz=playerPos.z-door.z;
    if (Math.sqrt(dx*dx+dz*dz) < door.interactDist) {
      prompt.innerHTML = door.open ? '[E] 關上門' : '[E] 打開門';
      prompt.style.display='block'; return;
    }
  }

  if (climbing) { prompt.style.display='none'; return; }

  // 黃色固定梯
  for (const L of LADDERS) {
    if (playerPos.y<L.y0-1||playerPos.y>L.y1+0.5) continue;
    const ldx=playerPos.x-L.x, ldz=playerPos.z-L.z;
    if (ldx*ldx+ldz*ldz<16) {
      prompt.innerHTML = '🪜 <span style="color:#ffd040">[E] 攀爬黃色固定梯</span>';
      prompt.style.display='block'; return;
    }
  }
  // 電子鎖拉閘
  if (EXT && !EXT.on && !EXT.done && !EXT.failed) {
    const ldx=playerPos.x-EXT.x, ldz=playerPos.z-EXT.z, ldy=Math.abs(playerPos.y-EXT.y);
    if (ldy<2.5 && ldx*ldx+ldz*ldz<9) {
      prompt.innerHTML = '🚁 <span style="color:#ffd070">[E] 拉下電子鎖（呼叫直升機撤離）</span>';
      prompt.style.display='block'; return;
    }
  }

  prompt.style.display='none';
}

// ============ 西里高速公路撤離：電子鎖拉閘 → 直升機綠區（移植自 sirit-base.html） ============
var extEl=document.createElement('div');
extEl.style.cssText='position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:10;display:none;font-size:15px;font-weight:bold;background:rgba(0,0,0,.55);padding:5px 16px;border-radius:6px;pointer-events:none;letter-spacing:1px;color:#3dff8a';
document.body.appendChild(extEl);
var extG=null, extRotor=null, extTail=null, extLight=null, extT=0;

function pullLever(remoteT){
  if(!EXT || EXT.on) return;
  EXT.on=true; EXT.done=false; EXT.failed=false;
  EXT.t=(remoteT!=null)?remoteT:120;
  leverArm.rotation.x=0.7;
  leverPanel.material.color.setHex(0x9affc8);
  leverPanel.material.emissive.setHex(0x22dd77);
  leverPanel.material.emissiveIntensity=1.2;
  var zx=EXT.zx, zz=EXT.zz, zy=EXT.zy;
  var disc=cyl(EXT.r,EXT.r,0.14,0x3dff8a,zx,zy+0.08,zz,{transparent:true,opacity:0.5,emissive:0x1fbf66,emissiveIntensity:1.2});
  var beam=cyl(EXT.r,EXT.r,11,0x3dff8a,zx,zy+5.5,zz,{transparent:true,opacity:0.1,emissive:0x1fbf66,emissiveIntensity:0.6,depthWrite:false});
  beam.castShadow=false;
  EXT.disc=disc; EXT.beam=beam;
  EXT.hlabel=label('直升機撤離點','#3dff8a',zx,zy+15,zz,9,0);
  extG=new T.Group(); extG.position.set(zx,zy+8,zz); scene.add(extG);
  function gbx(w,h,d,c,x,y,z,o){var m=new T.Mesh(GB,mat(c,o));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;extG.add(m);return m;}
  gbx(4.4,1.6,1.7,0x5a6a7a,0,0,0);
  gbx(1.5,1.1,1.5,0x8ab6d0,1.8,0.05,0,{metalness:0.3,roughness:0.35});
  gbx(4.0,0.5,0.5,0x4a5a6a,-3.4,0.3,0);
  gbx(0.3,1.5,0.15,0xffaa33,-5.25,1.0,0);
  gbx(4.8,0.14,0.14,0x2f3946,0,-1.1,0.9);
  gbx(4.8,0.14,0.14,0x2f3946,0,-1.1,-0.9);
  gbx(0.14,1.0,0.14,0x2f3946,1.5,-0.55,0.9);
  gbx(0.14,1.0,0.14,0x2f3946,1.5,-0.55,-0.9);
  gbx(0.14,1.0,0.14,0x2f3946,-1.5,-0.55,0.9);
  gbx(0.14,1.0,0.14,0x2f3946,-1.5,-0.55,-0.9);
  extLight=gbx(0.3,0.3,0.3,0xff3344,0,1.35,0,{emissive:0xff3344,emissiveIntensity:1});
  extLight.material=extLight.material.clone();
  extRotor=new T.Group(); extRotor.position.set(0,1.1,0); extG.add(extRotor);
  for(var rb=0;rb<2;rb++){var bm=new T.Mesh(GB,mat(0x1f242c));bm.scale.set(9,0.05,0.35);bm.rotation.y=rb*Math.PI/2;bm.castShadow=true;extRotor.add(bm);}
  extTail=new T.Group(); extTail.position.set(-5.3,0.3,0.2); extG.add(extTail);
  var tb1=new T.Mesh(GB,mat(0x1f242c));tb1.scale.set(0.05,1.2,0.14);extTail.add(tb1);
  var tb2=new T.Mesh(GB,mat(0x1f242c));tb2.scale.set(0.05,0.14,1.2);extTail.add(tb2);
  if(remoteT==null){
    showAnnounce('⚡ 電子鎖已拉下！撤離倒數 120 秒開始 — 前往小地圖綠區（倒數見畫面頂部）');
    sendExtractionMessage({ type:'extraction_lever_pull', t: EXT.t });
  }
}

function extractionDone(){
  if(EXT.done) return;
  EXT.done=true; extEl.style.display='none';
  // 未破譯的小黃石：掉在撤離點（不入帳）——一定要破譯成功才進「未開啟」清單
  const carried = carriedMine();
  if (carried.length) {
    for (const s of carried) { removeStoneMesh(s); s.status = 'GONE'; s.owner = null; }
    for (let i = collectedItems.length-1; i >= 0; i--) {
      if (collectedItems[i].unid) { collectedItems.splice(i,1); collectedCount--; }
    }
    showAnnounce('⚠ 未破譯的未鑑定小黃石掉在撤離點！（破譯成功才會入帳）', 'rgba(255,180,80,.7)');
  }
  completeExtraction();
}

function updateExtract(dt){
  if(!EXT.on || EXT.done || EXT.failed) return;
  extT+=dt;
  if(extG){
    extRotor.rotation.y+=34*dt;
    extTail.rotation.x+=42*dt;
    extG.position.y=EXT.zy+8+Math.sin(extT*1.3)*0.35;
    extG.rotation.y=Math.sin(extT*0.4)*0.16;
    extLight.material.emissiveIntensity=0.5+Math.abs(Math.sin(extT*4))*1.5;
  }
  var dx=playerPos.x-EXT.zx, dz=playerPos.z-EXT.zz, r2=EXT.r*EXT.r;
  var inZ=dx*dx+dz*dz<r2+0.25 && Math.abs(playerPos.y-EXT.zy)<3;
  EXT.t-=dt;
  if(EXT.t<=0){
    if(inZ){extractionDone();}else{extractionFail();}
    return;
  }
  var left=Math.max(0,Math.ceil(EXT.t));
  extEl.style.display='block';
  if(inZ){extEl.style.color='#3dff8a';extEl.textContent='🚁 已在撤離區 — 倒數 '+left+' 秒';}
  else{extEl.style.color='#ffd070';extEl.textContent='⚠ 撤離倒數剩 '+left+' 秒 — 趕快前往綠區';}
}

function resetExtract(){
  if(!EXT) return;
  EXT.on=false; EXT.done=false; EXT.failed=false; EXT.t=0;
  if(leverArm) leverArm.rotation.x=0;
  if(leverPanel){
    leverPanel.material.color.setHex(0xffaa33);
    leverPanel.material.emissive.setHex(0xff8800);
    leverPanel.material.emissiveIntensity=0.9;
  }
  if(EXT.disc){scene.remove(EXT.disc); EXT.disc=null;}
  if(EXT.beam){scene.remove(EXT.beam); EXT.beam=null;}
  if(EXT.hlabel){scene.remove(EXT.hlabel); EXT.hlabel=null;}
  if(extG){scene.remove(extG); extG=null; extRotor=null; extTail=null; extLight=null;}
  extT=0; extEl.style.display='none';
}

function extractionFail(){
  if(EXT.failed) return;
  EXT.failed=true; extEl.style.display='none';
  var d=document.createElement('div'); d.id='extfail';
  d.style.cssText='position:fixed;inset:0;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(20,8,4,.88);color:#ffe9e0;font-family:sans-serif;text-align:center';
  d.innerHTML='<h1 style="color:#ff7a5a;letter-spacing:8px;font-size:44px;margin:0 0 10px">撤離失敗</h1>'+
    '<p style="opacity:.85;font-size:16px">🚁 倒數歸零時你不在撤離區 — 直升機已離開</p>'+
    '<p style="opacity:.7;font-size:13px">搜刮 '+collectedItems.length+' 件 ｜ 回電子鎖處重新拉閘可再次呼叫</p>';
  var row=document.createElement('div'); row.style.cssText='margin-top:22px;display:flex;gap:14px';
  var b1=document.createElement('button');
  b1.style.cssText='padding:10px 30px;font-size:16px;letter-spacing:3px;background:#ffd070;color:#140a02;border:0;border-radius:8px;cursor:pointer';
  b1.textContent='回電子鎖再挑戰';
  b1.addEventListener('click',function(){
    d.remove();
    resetExtract();
    var bl=document.getElementById('ext-blocker'); if(bl) bl.style.display='none';
    showAnnounce('⚡ 可再次拉下電子鎖，重新呼叫直升機（120 秒倒數）');
    renderer.domElement.requestPointerLock().catch(()=>{});
  });
  var b2=document.createElement('button');
  b2.style.cssText='padding:10px 36px;font-size:16px;letter-spacing:4px;background:#1fbf66;color:#04140c;border:0;border-radius:8px;cursor:pointer';
  b2.textContent='返回總裁區';
  b2.addEventListener('click',function(){backToMenu();});
  row.appendChild(b1); row.appendChild(b2); d.appendChild(row);
  document.body.appendChild(d);
  if(document.exitPointerLock) document.exitPointerLock();
}

function resetExtRaid(){
  resetExtract();
  climbing=false; climbL=null; verticalVel=0; onGround=true;
}

// 噴水池粒子更新（移植自 sirit-base.html）
function updateSpray(dt){
  sprayT+=dt;
  if(!spray) return;
  for(var i=0;i<sprayN;i++){
    var sd=sprayData[i]; if(!sd) continue;
    var tt=(sprayT*sd.sp+sd.ph)%2;
    var yy=0.6+tt*4.5-tt*tt*2.2;
    var rr=0.3+tt*1.8;
    put(spray,i,FT_X+Math.cos(sd.a)*rr,yy,FT_Z+Math.sin(sd.a)*rr,1,1,1);
  }
  spray.instanceMatrix.needsUpdate=true;
}

// ============ SAFE UI ============
function openSafeUI(safe) {
  if (safe.opened) return;
  activeSafe = safe;
  document.getElementById('safe-ui').style.display='flex';
  document.querySelector('#safe-right .title').textContent = '🔐 保險箱';
  if (safe.lidMesh) safe.lidMesh.rotation.x = -1.2;
  if (document.pointerLockElement) document.exitPointerLock();
  // 先玩開鎖小遊戲，3銷全解才顯示戰利品
  window._extCrackSuccess = function() {
    safe.opened = true;
    document.getElementById('safe-loot-panel').style.display='flex';
    document.getElementById('safe-backpack-status').textContent = `🎒 ${collectedItems.length}/${BACKPACK_MAX}`;
    const grid = document.getElementById('safe-items-grid');
    grid.innerHTML = '';
    for (let i=0; i<safe.loot.length; i++) {
      const item = safe.loot[i];
      if (item.taken) continue;
      const div = document.createElement('div');
      div.className = 'safe-item';
      div.innerHTML = `<div class="iname">${item.name}</div><div class="irarity" style="color:${item.color || RARITY_COLORS[item.rarity]}">${item.purity ? (item.purity+'級純度') : (RARITY_NAMES[item.rarity])}</div><div class="isize">📦 ${item.size}格</div>`;
      div.onclick = () => takeItemFromSafe(safe, i);
      grid.appendChild(div);
    }
    if (grid.children.length === 0) {
      grid.innerHTML = '<div style="color:rgba(255,255,255,.3);padding:20px;text-align:center">保險箱已空</div>';
    }
    drawCharacterPreview('safe-character', safe.rarity);
  };
  startSafeCrack();
}

function closeSafeUI() {
  _crackActive = false;
  if (_crackRAF) { cancelAnimationFrame(_crackRAF); _crackRAF = null; }
  var cp = document.getElementById('safe-crack-panel'); if (cp) cp.style.display = 'none';
  document.getElementById('safe-ui').style.display='none';
  if (activeSafe && !activeSafe.opened) activeSafe.opened = false;
  activeSafe = null;
  if (!document.pointerLockElement) {
    var bl=document.getElementById('ext-blocker'); bl.style.display='flex';
    bl.querySelectorAll('.mm-only').forEach(function(el){el.style.display='none';});
    bl.querySelector('h1').textContent='遊戲暫停'; bl.querySelector('.sub').textContent='點擊繼續遊戲';
  }
}

function takeItemFromSafe(safe, idx) {
  if (collectedItems.length >= BACKPACK_MAX) {
    showHUD('⚠ 背包已滿！');
    return;
  }
  const item = safe.loot[idx];
  if (item.taken) return;
  item.taken = true;
  collectedItems.push(item);
  collectedCount++;
  totalLootValue += item.value;
  // Sync to other players
  const safeIdx = safes.indexOf(safe);
  if (safeIdx !== -1) {
    sendExtractionMessage({ type: 'extraction_loot_take', safeIdx, itemIdx: idx, itemKey: item.key });
  }
  showHUD(`✓ 獲得 ${item.name} (+${item.value}💰)`);
  openSafeUI(safe); // Refresh
  updateBackpackUI();
}

// ============ BACKPACK UI ============
function toggleBackpack() {
  if (gameState !== STATE.DEPLOYED && gameState !== STATE.EXTRACTING) return;
  backpackOpen = !backpackOpen;
  document.getElementById('backpack-ui').style.display = backpackOpen ? 'flex' : 'none';
  if (backpackOpen) { updateBackpackUI(); if (document.pointerLockElement) document.exitPointerLock(); }
  else if (!document.pointerLockElement) {
    var bl=document.getElementById('ext-blocker'); bl.style.display='flex';
    bl.querySelectorAll('.mm-only').forEach(function(el){el.style.display='none';});
    bl.querySelector('h1').textContent='遊戲暫停'; bl.querySelector('.sub').textContent='點擊繼續遊戲';
  }
}

function updateBackpackUI() {
  const grid = document.getElementById('bp-grid');
  grid.innerHTML = '';
  document.getElementById('bp-count').textContent = `容量: ${collectedItems.length}/${BACKPACK_MAX}`;
  for (let i=0; i<BACKPACK_MAX; i++) {
    const cell = document.createElement('div');
    cell.className = 'bp-cell';
    if (i < collectedItems.length) {
      const item = collectedItems[i];
      cell.classList.add('has-item');
      const sz = item.size === 1 ? 'size1' : item.size === 2 ? 'size2' : 'size4';
      cell.innerHTML = `<div class="item-icon ${sz}" style="background:${item.color || RARITY_COLORS[item.rarity]}">${item.name}</div>`;
      cell.onclick = () => {
        if (item.unid) { openDropConfirm(i); return; }
        collectedItems.splice(i, 1);
        collectedCount--;
        totalLootValue -= item.value;
        updateBackpackUI();
        showHUD(`✕ 丟棄 ${item.name}`);
      };
    }
    grid.appendChild(cell);
  }
  // Stats
  let rarityCounts = [0,0,0,0];
  for (const item of collectedItems) rarityCounts[item.rarity]++;
  document.getElementById('bp-stats').innerHTML =
    `🎒 ${collectedItems.length}/${BACKPACK_MAX}<br>` +
    `💰 ${totalLootValue} 價值<br>` +
    `<span style="color:#999">●</span>${rarityCounts[0]} ` +
    `<span style="color:#38f">●</span>${rarityCounts[1]} ` +
    `<span style="color:#fa0">●</span>${rarityCounts[2]} ` +
    `<span style="color:#f36">●</span>${rarityCounts[3]}`;
  drawCharacterPreview('bp-character');
}

// ============ CHARACTER PREVIEW ============
function drawCharacterPreview(canvasId, rarity) {
  const c = document.getElementById(canvasId);
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  // Simple character silhouette
  ctx.fillStyle = '#334';
  ctx.fillRect(25,10, 50, 80);
  // Head
  ctx.beginPath(); ctx.arc(50, 8, 10, 0, Math.PI*2); ctx.fill();
  // Vest
  ctx.fillStyle = '#556';
  ctx.fillRect(28, 35, 44, 30);
  // Backpack indicator
  ctx.fillStyle = RARITY_COLORS[rarity||0];
  ctx.fillRect(68, 30, 12, 25);
  ctx.fillStyle = '#fff';
  ctx.font = '8px sans-serif';
  ctx.fillText('🎒', 70, 42);
}

// ============ ARRIVAL（無直升機）============
function startArrivalCutscene() {
  gameState = STATE.ARRIVAL;
  const overlay = document.getElementById('arrival-overlay');
  overlay.classList.add('show');
  const black = document.getElementById('arrival-black');

  // 抵達：無直升機，改為車站淡入（不再顯示標題文字）
  // Animation sequence
  black.style.transition = 'opacity 1s';
  black.style.opacity = '0.3';

  setTimeout(() => {
    black.style.opacity = '0';
  }, 4500);

  setTimeout(() => {
    overlay.classList.remove('show');
    gameState = STATE.DEPLOYED;
    document.getElementById('timer').style.display='block';
    document.getElementById('teammate-strip').style.display='flex';
    document.getElementById('info').textContent = `撤離點: 西里高速公路直升機綠區 (${EXFIL_POS.x}, ${EXFIL_POS.z})`;
    showHUD('🟢 已到達西里高速公路 · 拉下電子鎖後前往綠區撤離');
  }, 5500);
}

// ============ EXTRACTION（舊列車 10 秒流程已移除 — 撤離由 EXT 直升機倒數負責） ============

function completeExtraction() {
  playerHasExtracted = true;
  stopExtractionStateSync();
  gameState = STATE.RESULTS;
  if (document.pointerLockElement) document.exitPointerLock();
  showHUD('✅ 撤離成功！');
  document.getElementById('extraction-status').textContent = '✅ 撤離成功！';
  sendExtractionMessage({ type: 'extraction_extracted', items: collectedItems.map(i => i.key), value: totalLootValue });
  setTimeout(() => showResults(true), 1500);
}

// ============ RESULTS ============
function showResults(won) {
  gameState = STATE.RESULTS;
  var bl=document.getElementById('ext-blocker'); if(bl) bl.style.display='none';
  document.getElementById('results-overlay').style.display='flex';
  const title = document.getElementById('r-title');
  title.textContent = won ? '任 務 完 成' : '任 務 失 敗';
  title.className = 'rtitle ' + (won ? 'win' : 'lose');
  document.getElementById('r-sub').textContent = won ? '成功撤離西里高速公路' : '未能及時撤離';

  let html = '';
  html += `<div class="rrow"><span>📦 蒐集物品</span><span class="rval">${collectedCount} 件</span></div>`;
  html += `<div class="rrow"><span>💰 總價值</span><span class="rval good">${totalLootValue}</span></div>`;
  html += `<div class="rrow"><span>🎯 擊殺數</span><span class="rval">${matchKills}</span></div>`;
  html += `<div class="rrow"><span>⏱ 存活時間</span><span class="rval">${Math.floor((15*60-matchTime)/60)}分${Math.floor((15*60-matchTime)%60)}秒</span></div>`;
  html += `<div class="rrow"><span>🏆 撤離</span><span class="rval ${won?'good':'bad'}">${won?'成功':'失敗'}</span></div>`;

  // Item breakdown
  if (collectedItems.length > 0) {
    html += `<div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,.4);text-align:left;padding:6px 0;border-top:1px solid rgba(255,255,255,.05)">📋 物品清單:</div>`;
    for (const item of collectedItems) {
      html += `<div style="font-size:11px;color:rgba(255,255,255,.5);text-align:left;padding:1px 0"><span style="color:${item.color || RARITY_COLORS[item.rarity]}">●</span> ${item.name}${item.purity ? ` <span style="color:${item.color}">(${item.purity}級)</span>` : ''}</div>`;
    }
  }

  document.getElementById('r-details').innerHTML = html;

  // Update localStorage with earned value
  let coins = parseInt(localStorage.getItem('oc_coin')||'0');
  const earned = Math.floor(totalLootValue * (won ? 1.5 : 0.3));
  coins += earned;
  localStorage.setItem('oc_coin', coins.toString());

  html += `<div class="rrow" style="border-top:2px solid rgba(255,170,0,.2);margin-top:4px;padding-top:8px"><span>🪙 獲得特種幣</span><span class="rval good">+${earned}</span></div>`;
  document.getElementById('r-details').innerHTML = html;
}

function backToMenu() {
  if (ws) { try { ws.close(); } catch(e) {} }
  window.location.href = 'index.html';
}

// ============ HUD HELPER ============
function showHUD(msg) {
  const el = document.getElementById('ext-hud');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2500);
}

// ============ UPDATE ============
// ============ 爬梯 + 第一人稱物理（移植自 sirit-base.html） ============
var climbing=false, climbL=null, climbDir=1, onGround=true;
function startClimb(L){
  climbing=true; climbL=L; verticalVel=0;
  climbDir=playerPos.y>L.y1-0.8?-1:1;
  playerPos.x=L.x; playerPos.z=L.z;
  if(L.face===0)playerPos.z=L.z+0.55; else if(L.face===1)playerPos.z=L.z-0.55;
  else if(L.face===2)playerPos.x=L.x+0.55; else playerPos.x=L.x-0.55;
  showAnnounce(climbDir>0?'攀爬中 — 自動上升（S可下降）':'攀爬中 — 自動下降（W可上升）');
}

function updatePlayer(dt) {
  if (!isLocked || (gameState !== STATE.DEPLOYED && gameState !== STATE.EXTRACTING)) return;
  // 爬梯中：貼梯面升降，禁其他操作
  if (climbing) {
    const L=climbL;
    playerPos.x+=(L.x-playerPos.x)*0.3; playerPos.z+=(L.z-playerPos.z)*0.3;
    if(L.face===0)playerPos.z=L.z+0.55; else if(L.face===1)playerPos.z=L.z-0.55;
    else if(L.face===2)playerPos.x=L.x+0.55; else playerPos.x=L.x-0.55;
    let clSpd=3.5, cd=climbDir;
    if(input.w)cd=1; else if(input.s)cd=-1;
    playerPos.y+=clSpd*dt*cd;
    if(playerPos.y>=L.y1){playerPos.y=L.y1;climbing=false;onGround=true;showAnnounce('已到達平台頂端');}
    else if(playerPos.y<=L.y0){playerPos.y=L.y0;climbing=false;onGround=true;}
    if(input.space){climbing=false;verticalVel=0;onGround=false;}
    camera.position.set(playerPos.x, playerPos.y+1.6, playerPos.z);
    updateInteractPrompt();
    return;
  }
  const forward=new THREE.Vector3(); camera.getWorldDirection(forward); forward.y=0; forward.normalize();
  const right=new THREE.Vector3(); right.crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const speed=input.shift?runSpeed:walkSpeed;
  const move=new THREE.Vector3();
  if(input.w)move.add(forward); if(input.s)move.sub(forward); if(input.a)move.sub(right); if(input.d)move.add(right);
  if(move.length()>0){move.normalize();move.multiplyScalar(speed*dt);}

  verticalVel+=gravity*dt;
  if(input.space&&onGround)verticalVel=jumpSpeed;
  // 水平逐段：逐軸擋牆（blockedAxis 支援 0.45 踏步與樓梯連續上升）
  const dist=Math.hypot(move.x,move.z);
  const steps=Math.max(1,Math.ceil(dist/0.25));
  const sx=move.x/steps, sz=move.z/steps;
  for(let i=0;i<steps;i++){
    const nx=Math.max(-W_HALF+1,Math.min(W_HALF-1,playerPos.x+sx));
    if(!blockedAxis(nx,playerPos.y,playerPos.z,playerRadius,playerHeight,nx,playerPos.z))playerPos.x=nx;
    const nz=Math.max(-W_HALF+1,Math.min(W_HALF-1,playerPos.z+sz));
    if(!blockedAxis(playerPos.x,playerPos.y,nz,playerRadius,playerHeight,playerPos.x,nz))playerPos.z=nz;
  }
  // 垂直：floorAt 踩踏（箱頂/橋面）＋天花板擋頭
  let ny=playerPos.y+verticalVel*dt;
  const fl=floorAt(playerPos.x,playerPos.z,Math.max(playerPos.y,ny));
  if(ny<=fl+0.02&&verticalVel<=0){ny=fl;verticalVel=0;onGround=true;}
  else{
    onGround=false;
    if(verticalVel>0){
      for(let ci=0;ci<colliders.length;ci++){
        const b=colliders[ci];
        if(playerPos.x+playerRadius>b.x0&&playerPos.x-playerRadius<b.x1&&playerPos.z+playerRadius>b.z0&&playerPos.z-playerRadius<b.z1){
          if(playerPos.y+playerHeight>b.y0&&ny+playerHeight<b.y0+0.25){ny=b.y0-playerHeight;verticalVel=0;}
        }
      }
    }
  }
  playerPos.y=Math.max(ny,-3);
  if(playerPos.y<-10){playerPos.x=playerSpawn.x;playerPos.y=playerSpawn.y;playerPos.z=playerSpawn.z;verticalVel=0;}
  camera.position.set(playerPos.x, playerPos.y+1.6, playerPos.z);

  updateInteractPrompt();
}

// ============ MINIMAP（西里高速公路） ============
function drawMinimap() {
  const c=document.getElementById('ext-minimap-canvas'), ctx=c.getContext('2d'), s=150;
  ctx.fillStyle='rgba(8,12,18,0.88)'; ctx.fillRect(0,0,s,s);
  const sc = 75/175, ox=s/2, oz=s/2;
  const wx=(x)=>ox+x*sc, wz=(z)=>oz+z*sc;
  // 高速公路（y14 高架）
  ctx.fillStyle='#4a4e54'; ctx.fillRect(wx(HWY_X0-5), wz(HWY_Z-9), (HWY_X1-HWY_X0+10)*sc, 18*sc);
  ctx.fillStyle='#d8c840'; ctx.fillRect(wx(HWY_X0-5), wz(HWY_Z-0.5), (HWY_X1-HWY_X0+10)*sc, 1*sc);
  // 下層道路
  ctx.fillStyle='#3a3d42'; ctx.fillRect(wx(-5), wz(-48), 10*sc, 88*sc);
  ctx.fillRect(wx(-20), wz(36), 40*sc, 8*sc);
  ctx.fillRect(wx(-60), wz(36), 8*sc, 60*sc);
  ctx.fillRect(wx(52), wz(36), 8*sc, 60*sc);
  ctx.fillRect(wx(-22), wz(64), 44*sc, 8*sc);
  // 噴水池
  ctx.fillStyle='#2a7aaa'; ctx.beginPath(); ctx.arc(wx(FT_X), wz(FT_Z), FT_R*sc, 0, Math.PI*2); ctx.fill();
  // 四建築
  if (PW){ ctx.fillStyle='#5a6a7a'; ctx.fillRect(wx(PW.x-PW.w/2), wz(PW.z-PW.d/2), PW.w*sc, PW.d*sc); }
  if (NU){ ctx.fillStyle='#6a5a5a'; ctx.fillRect(wx(NU.x-NU.w/2), wz(NU.z-NU.d/2), NU.w*sc, NU.d*sc); }
  if (BL){ ctx.fillStyle='#4a6a5a'; ctx.fillRect(wx(BL.x-BL.w/2), wz(BL.z-BL.d/2), BL.w*sc, BL.d*sc); }
  if (AE){ ctx.fillStyle='#5a5a7a'; ctx.fillRect(wx(AE.x-AE.w/2), wz(AE.z-AE.d/2), AE.w*sc, AE.d*sc); }
  // 總裁區（高塔+停機坪）
  ctx.fillStyle='rgba(120,180,255,0.5)'; ctx.fillRect(wx(EX_X-34), wz(-56), 68*sc, 50*sc);
  // 高處維修道路（矩形環）
  ctx.strokeStyle='rgba(140,180,220,0.5)'; ctx.lineWidth=1.2;
  ctx.strokeRect(wx(-95), wz(-14), 190*sc, 114*sc);
  ctx.beginPath();
  ctx.moveTo(wx(-85), wz(10)); ctx.lineTo(wx(-95), wz(10));
  ctx.moveTo(wx(-85), wz(70)); ctx.lineTo(wx(-95), wz(70));
  ctx.moveTo(wx(85), wz(10)); ctx.lineTo(wx(95), wz(10));
  ctx.moveTo(wx(85), wz(70)); ctx.lineTo(wx(95), wz(70));
  ctx.stroke();
  // 保險箱（未開）
  ctx.fillStyle='#ffd070';
  for (const safe of safes) {
    if (safe.opened) continue;
    ctx.fillRect(wx(safe.x)-2, wz(safe.z)-2, 4, 4);
  }
  // 破譯站（藍點）
  if (decryptStation) {
    ctx.shadowColor='#08f'; ctx.shadowBlur=7;
    ctx.fillStyle=decryptActive ? '#0af' : '#48f';
    ctx.beginPath(); ctx.arc(wx(decryptStation.x), wz(decryptStation.z), 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='8px sans-serif'; ctx.fillText('破譯', wx(decryptStation.x)+6, wz(decryptStation.z)+4);
    ctx.shadowBlur=0;
  }
  // 未鑑定小黃石（世界/遠端攜帶）— 紫色
  ctx.font='8px sans-serif';
  for (const st of stones) {
    if (st.status === 'WORLD') {
      ctx.fillStyle='#9b59b6'; ctx.beginPath(); ctx.arc(wx(st.x), wz(st.z), 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.fillText('石', wx(st.x)+5, wz(st.z)+3);
    } else if (st.status === 'CARRIED' && st.owner && st.owner !== 'me' && remotePlayers[st.owner]) {
      const rp = remotePlayers[st.owner];
      const rx = rp.pos ? rp.pos.x : (rp.targetPos ? rp.targetPos.x : st.x);
      const rz = rp.pos ? rp.pos.z : (rp.targetPos ? rp.targetPos.z : st.z);
      ctx.strokeStyle='#9b59b6'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(wx(rx), wz(rz), 5, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle='#9b59b6'; ctx.fillText('持有', wx(rx)+6, wz(rz)+3);
    }
  }
  // 電子鎖拉閘 + 撤離區
  ctx.font='bold 15px sans-serif'; ctx.textAlign='center';
  if (EXT && !EXT.on && !EXT.done && !EXT.failed) {
    ctx.fillStyle='#ffd070'; ctx.fillText('!', wx(EXT.x), wz(EXT.z)+5);
  }
  if (EXT && EXT.on && !EXT.done && !EXT.failed) {
    ctx.strokeStyle='rgba(61,255,138,.85)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(wx(EXT.zx), wz(EXT.zz), EXT.r*sc, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle='#3dff8a'; ctx.fillText('!', wx(EXT.zx), wz(EXT.zz)+5);
    const exl = Math.max(0, Math.ceil(EXT.t));
    ctx.font='bold 12px sans-serif';
    ctx.fillStyle = exl>30 ? '#3dff8a' : (exl>10 ? '#ffd070' : '#ff5a44');
    ctx.textAlign='left';
    ctx.fillText('撤離剩 '+exl+' 秒', 6, 14);
    ctx.font='bold 15px sans-serif'; ctx.textAlign='center';
  }
  // 玩家（視角三角）
  ctx.save();
  ctx.translate(wx(playerPos.x), wz(playerPos.z));
  ctx.rotate(-yaw);
  ctx.fillStyle='#ff5a44';
  ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3,3); ctx.lineTo(-3,3); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.textAlign='left';
}

// ============ GAME LOOP ============
  const clock=new THREE.Clock();


function animate() {
  if (_extRAF) { cancelAnimationFrame(_extRAF); _extRAF = null; }
  _extRAF = requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  const elapsed = dt;

  // 世界動態：旋轉物件、噴水池粒子、直升機撤離倒數
  for (var spi=0; spi<SPINS.length; spi++){ SPINS[spi].m.rotation.y += SPINS[spi].v*dt; }
  updateSpray(dt);
  updateExtract(dt);

  // 小黃石：攜帶視覺 + 世界浮動
  updateStoneCarry(dt);

  // Decrypt station visual + countdown（endsAt 伺服器權威 / 離線本地倒數）
  if (decryptStation) {
    updateDecryptStationVisual(dt);
    if (decryptActive) {
      const remainMs = decryptEndsAt - Date.now();
      if (remainMs <= 0) {
        finishDecrypt();
      } else {
        const remain = document.getElementById('extraction-status');
        if (remain) {
          const total = Math.ceil(remainMs / 1000);
          const mins = Math.floor(total / 60);
          const secs = total % 60;
          remain.textContent = `🔓 解析中 ${mins}:${secs.toString().padStart(2,'0')}（守住！）`;
          remain.style.display = 'block';
        }
      }
    }
  }

  // Decrypt station prompt
  // 用 _extDecryptPrompt 旗標讓本提示優先顯示，並避免在此 return：
  // 若 return 會跳過後續 sendExtractionState / updateRemotePlayers /
  // updatePlayer / renderer.render，導致站在破譯站旁邊時整個遊戲凍結、
  // 其他玩家不動也看不到，且玩家本身無法移動。
  _extDecryptPrompt = false;
  if (gameState === STATE.DEPLOYED || gameState === STATE.EXTRACTING) {
    if (decryptStation && !decryptActive) {
      const ddx=playerPos.x-decryptStation.x, ddz=playerPos.z-decryptStation.z;
      if (Math.sqrt(ddx*ddx+ddz*ddz) < 3) {
        // 不可使用區域外的 prompt 變數（僅存在於 updateInteractPrompt 內），
        // 否則每幀都會拋 ReferenceError。
        const dprompt = document.getElementById('interact-promp');
        if (dprompt) {
          dprompt.innerHTML = stones.some(x => x.status==='CARRIED' && x.owner==='me')
            ? '<span style="color:#4f6">[E] 放入未鑑定小黃石解析</span>'
            : '<span style="color:#aaa">破譯站（需攜帶小黃石）</span>';
          dprompt.style.display='block';
        }
        _extDecryptPrompt = true;
      }
    }
  }

  // Timer
  if (gameState === STATE.DEPLOYED || gameState === STATE.EXTRACTING) {
    matchTime -= elapsed;
    if (matchTime <= 0) {
      matchTime = 0;
      if (!playerHasExtracted) {
        showHUD('💀 時間耗盡！');
        setTimeout(() => showResults(false), 2000);
      }
    }
    const mins=Math.floor(matchTime/60), secs=Math.floor(matchTime%60);
    const timerEl=document.getElementById('timer');
    timerEl.textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    timerEl.className=matchTime<120?'warning':'';
  }

  // Shoot cooldown
  if (shootCooldown > 0) shootCooldown -= elapsed;
  // Muzzle flash cleanup (light stays in scene; only intensity fades)
  if (_extFlashTimer > 0) {
    _extFlashTimer -= elapsed;
    if (_extFlashLight) _extFlashLight.intensity = Math.max(0, 4 * (_extFlashTimer / 0.06));
    if (_extFlashTimer <= 0) {
      if (_extFlashMesh && _extFlashMesh.parent) scene.remove(_extFlashMesh);
      if (_extFlashLight) _extFlashLight.intensity = 0;
    }
  }
  // Pooled hit/impact/grenade flash lights fade
  updateExtFlashLights(elapsed);
  // Auto-fire (skip melee/throwables)
  if (mouseDown && gameState === STATE.DEPLOYED && shootCooldown <= 0 && extGunType !== 'knife' && extGunType !== 'grapple' && extGunType !== 'grenade') fireOnce();
  // Impact cleanup
  for (var ii=_extImpacts.length-1; ii>=0; ii--) {
    _extImpacts[ii].time += elapsed;
    if (_extImpacts[ii].time > 2) {
      if (_extImpacts[ii].mesh.parent) scene.remove(_extImpacts[ii].mesh);
      _extImpacts.splice(ii,1);
    }
  }
  // Damage number update
  for (var dni=_extDmgNums.length-1; dni>=0; dni--) {
    _extDmgNums[dni].time += elapsed;
    if (_extDmgNums[dni].time > 0.6) {
      if (_extDmgNums[dni].el.parentNode) _extDmgNums[dni].el.parentNode.removeChild(_extDmgNums[dni].el);
      _extDmgNums.splice(dni,1);
      continue;
    }
    // Project 3D → screen
    var v = _extDmgNums[dni].pos.clone().add(new THREE.Vector3(0,0.3+_extDmgNums[dni].time*0.5,0));
    v.project(camera);
    var x = (v.x*0.5+0.5)*window.innerWidth;
    var y = (-v.y*0.5+0.5)*window.innerHeight;
    _extDmgNums[dni].el.style.transform = 'translate(-50%,-50%)';
    _extDmgNums[dni].el.style.left = x+'px';
    _extDmgNums[dni].el.style.top = y+'px';
    _extDmgNums[dni].el.style.opacity = 1 - _extDmgNums[dni].time/0.6;
  }

  // Reload timer
  if (extReloading) {
    extReloadTimer -= elapsed;
    if (extReloadTimer <= 0) {
      extReloading = false; extReloadTimer = 0;
      var gdR = window.gunData ? window.gunData[extGunType] : null;
      if (gdR) extAmmo[extGunType] = gdR.mag || 30;
    }
  }
  // Swap animation
  if (extSwapAnim > 0) {
    extSwapAnim -= elapsed;
    var sp = Math.max(0, 1 - extSwapAnim / extSwapDuration);
    if (extSwapOldGroup) {
      var st = sp;
      extSwapOldGroup.position.set(0.2-st*0.35, -0.15-st*0.2, -0.35+st*0.2);
      extSwapOldGroup.rotation.x = -st*0.3;
      extSwapOldGroup.rotation.z = st*0.5;
      if (extSwapAnim <= 0) {
        scene.remove(extSwapOldGroup); extSwapOldGroup = null;
        extSwapOldType = '';
      }
    }
  }
  // Inspect animation
  if (extInspectAnim > 0) {
    extInspectAnim -= elapsed;
    var ip = 1 - Math.abs(extInspectAnim / extInspectDuration - 0.5) * 2;
    if (extGunGroup) {
      _gunOffset.set(0.2,-0.15,-0.35).applyQuaternion(camera.quaternion).add(camera.position);
      extGunGroup.position.copy(_gunOffset);
      extGunGroup.quaternion.copy(camera.quaternion);
      extGunGroup.position.y += ip * 0.08;
      extGunGroup.rotation.x = ip * 0.4;
    }
    if (extInspectAnim <= 0) extInspectAnim = 0;
  }
  // Ammo HUD
  var hudAmmo = document.getElementById('ext-ammo-hud');
  if (hudAmmo) {
    if (extGunType === 'knife' || extGunType === 'grapple') {
      hudAmmo.innerHTML = '<span style="font-size:20px;color:'+(extGunType==='knife'?'#f84':'#4af')+';letter-spacing:2px">'+(extGunType==='knife'?'⚔ 刀':'∞ 勾爪')+'</span>';
    } else if (extGunType === 'grenade') {
      hudAmmo.innerHTML = '<span style="font-size:16px;color:#fa4;letter-spacing:2px">💣 手雷 ×1</span>';
    } else if (extReloading) {
      var pct = Math.max(0, 1 - extReloadTimer / extReloadDuration);
      hudAmmo.innerHTML = '<span style="color:#ff8;font-size:18px;letter-spacing:2px">換彈中... ' + Math.round(pct*100) + '%</span>';
    } else {
      var curAm = extAmmo[extGunType] || 0;
      hudAmmo.innerHTML = '<span style="color:'+(curAm===0?'#f44':'#fff')+'">'+curAm+'</span><span id="ext-ammo-sep"> / </span><span id="ext-ammo-max">'+extMaxAmmo+'</span>';
    }
  }

  // Remote player interpolation
  updateRemotePlayers(elapsed);

  // Bot AI
  updateBots(elapsed);
  if (_extAIPlayers.length > 0) updateAIPlayers(elapsed);

  // Extraction
  if (gameState === STATE.EXTRACTING) {
    updateExtraction();
  }

  // Player
  updatePlayer(elapsed);

  // Health bar / kill counter visibility
  const showCombat = (gameState === STATE.DEPLOYED || gameState === STATE.EXTRACTING);
  document.getElementById('health-bar-wrap').style.display = showCombat ? 'block' : 'none';
  document.getElementById('kill-counter').style.display = showCombat ? 'block' : 'none';

  // Weapon follow camera
  if (extGunGroup) {
    extGunGroup.visible = (gameState === STATE.DEPLOYED || gameState === STATE.EXTRACTING);
    if (extGunGroup.visible) {
      _gunOffset.set(0.2,-0.15,-0.35).applyQuaternion(camera.quaternion).add(camera.position);
      extGunGroup.position.copy(_gunOffset);
      extGunGroup.quaternion.copy(camera.quaternion);
    }
  }

  // ADS FOV
  if (gameState === STATE.DEPLOYED) {
    var gd2 = window.gunData ? window.gunData[extGunType] : null;
    var targetFov = extADS ? (gd2 && gd2.adsFov ? gd2.adsFov : 50) : 70;
    camera.fov += (targetFov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();
  } else {
    if (camera.fov !== 70) { camera.fov = 70; camera.updateProjectionMatrix(); }
    extADS = false;
  }

  // Minimap
  drawMinimap();



  renderer.render(scene, camera);
}

function easeInOut(t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }

// ============ START GAME ============
function startGame(isMultiplayer, mpSpawn) {
  playerHealth = playerMaxHealth;
  playerIsDead = false;
  playerHasExtracted = false;
  // Pick spawn (from server in multiplayer, random in single)
  if (isMultiplayer && mpSpawn) {
    playerPos.set(mpSpawn.x, 0, mpSpawn.z);
    playerSpawn.x = mpSpawn.x; playerSpawn.y = 0; playerSpawn.z = mpSpawn.z;
    document.getElementById('info').textContent = `多人模式 · 玩家 #${myPlayerId+1}`;
    mmState = 'in_game';
  } else {
    playerSpawnIdx = Math.floor(Math.random() * SPAWNS.length);
    const spawn = SPAWNS[playerSpawnIdx];
    playerPos.set(spawn.x, 0, spawn.z);
    playerSpawn.x = spawn.x; playerSpawn.y = 0; playerSpawn.z = spawn.z;
    document.getElementById('info').textContent = `出生點: ${spawn.name}`;
  }

  // Create FPS weapon from loadout
  var firstGun = 'ak47';
  var pl = window.playerLoadout;
  var gd = window.gunData;
  if (pl && gd) {
    for (var si=0; si<pl.length; si++) {
      if (pl[si] && pl[si] !== 'knife' && pl[si] !== 'grapple' && pl[si] !== 'grenade' && gd[pl[si]]) {
        firstGun = pl[si]; break;
      }
    }
  }
  switchExtGun(firstGun);

  // Init game world
  initSafes();
  initDoors();
  createSafeMeshes();
  createDoorMeshes();
  spawnBots();
  startStoneRaid();

  // Start arrival cutscene
  startArrivalCutscene();

  showHUD(`🔽 正在進入西里高速公路 ...`);
}

// 把全域配對資料帶入本場玩家清單／出生點（避免誤啟動單人）
if (matchData && extMatchPlayers) {
  matchPlayers = Object.keys(extMatchPlayers).map(function(k){ return extMatchPlayers[k]; });
  matchSpawn = matchData.spawn || null;
  myPlayerId = extMyPlayerId;
}
// If match data provided from global matchmaking, start game immediately
if (extIsMultiplayer && extMatchPlayers && Object.keys(extMatchPlayers).length > 0) {
  launchExtractionGame();
  return; // 已開局：不可再執行下方「顯示主選單」的收尾
} else if (extAiPlayerCount > 0) {
  // 離線／未配對 fallback：帶 AI 玩家直接開局
  launchExtractionGame();
  return;
} else {
  // 沒湊滿 5 真人且無 AI fallback：重新排隊
  extMMRequeue();
}

// Helper: show/hide matchmaking indicator
function showExtractionLoading() {
  var el = document.getElementById('ext-mm-indicator');
  if (el) el.style.display = 'flex';
}
function hideExtractionLoading() {
  var el = document.getElementById('ext-mm-indicator');
  if (el) el.style.display = 'none';
}

  // Launch the actual extraction game (hide menu, show game)
function launchExtractionGame() {
  if (_extGameStarted) return;
  _extGameStarted = true;
  if (window._extLaunchTimer) { clearTimeout(window._extLaunchTimer); window._extLaunchTimer = null; }
  if (window._extCountdownInterval) { clearInterval(window._extCountdownInterval); window._extCountdownInterval = null; }
  hideExtractionLoading();
  // Re-read match data (may have been updated by finishExtMM after startExtractionMode)
  var md = window._extMatchData;
  if (md) {
    extIsMultiplayer = md.matched || false;
    extMatchPlayers = md.players || {};
    extMyPlayerId = md.myPlayerId || 0;
    extAiPlayerCount = md.aiCount || 0;
  } else if (matchSpawn && matchPlayers.length > 0) {
    extIsMultiplayer = true;
    extMatchPlayers = {};
    for (var _mpi = 0; _mpi < matchPlayers.length; _mpi++) {
      extMatchPlayers[matchPlayers[_mpi].id] = matchPlayers[_mpi];
    }
    extMyPlayerId = myPlayerId;
  }
  var mainCanvas = document.querySelector('canvas');
  if (mainCanvas) mainCanvas.style.display = 'none';
  var menuEl = document.getElementById('menu');
  if (menuEl) menuEl.style.display = 'none';
  document.getElementById('extraction-root').style.display = 'block';
  var blInit=document.getElementById('ext-blocker');blInit.querySelectorAll('.mm-only').forEach(function(el){el.style.display='none';});blInit.querySelector('h1').textContent='🔥 摸 金 模 式';blInit.querySelector('.sub').textContent='LOST FACILITY · 西里高速公路';
  resetExtRaid();
  if (extIsMultiplayer && matchSpawn) {
    startGame(true, matchSpawn);
  } else {
    startGame(false, null);
  }
  // AI 玩家 fallback：補齊真人缺口
  if (extAiPlayerCount > 0) spawnAIPlayers(extAiPlayerCount);
  if (extIsMultiplayer) {
    initRemotePlayers();
    startExtractionStateSync();
  }
  animate();
}

window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});


  // ---- Expose functions for HTML onclick handlers ----
  window.ext_closeSafeUI = closeSafeUI;
  window.ext_toggleBackpack = toggleBackpack;
  window.ext_toggleMatchmaking = toggleMatchmaking;
  window.ext_backToMenu = backToMenu;
  // 頂層配對流程（finishExtMM）需要呼叫函式作用域內的 launchExtractionGame
  window.launchExtractionGame = launchExtractionGame;
  // 同理：closeExtGameSocket / extGameSocket 也宣告在 startExtractionMode 內，
  // 頂層的 finishExtMM 必須透過 window 存取，否則會出現 ReferenceError。
  window.closeExtGameSocket = closeExtGameSocket;
  window.updateMMUI = updateMMUI;

  // Hide matchmaking indicator
  var extMmInd = document.getElementById('ext-mm-indicator');
  if (extMmInd) extMmInd.style.display = 'none';

  // Show main menu
  var menuEl = document.getElementById('menu');
  if (menuEl) menuEl.style.display = 'flex';

  // Show main canvas
  var mainCanvas = document.querySelector('canvas');
  if (mainCanvas) mainCanvas.style.display = 'block';

  window._extMatchData = null;

  if(carryStoneMesh){ scene.remove(carryStoneMesh); carryStoneMesh=null; }
}

// ========== PARTY GAME SYSTEM ==========
var _partyActive = false;
var _partyPlayers = [];
var _partyGameType = '';
var _partyPlayerCount = 0;
var _partyTimer = null;
var _partyRAF = null;
var _partyScene = null;
var _partyCamera = null;
var _partyRenderer = null;

var PARTY_GAMES = {
  target: { name:'射靶得分', icon:'🎯', desc:'限時射靶，最高分獲勝' },
  obstacle: { name:'障礙賽跑', icon:'🏁', desc:'越過障礙，最先抵達終點' },
  battle: { name:'平台大亂鬥', icon:'⚔️', desc:'把對手推下平台，最後存活' },
  memory: { name:'記憶翻牌', icon:'🧠', desc:'翻牌配對，考驗記憶力' },
  coinrush: { name:'金幣搶奪', icon:'💰', desc:'限時收集最多金幣' },
};

var PARTY_AI_NAMES = ['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Golf','Hotel'];

function showPartyCountSelect(gameType) {
  document.getElementById('mode-dropdown').classList.remove('show');
  var overlay = document.getElementById('party-lobby');
  document.getElementById('pl-title').textContent = PARTY_GAMES[gameType].icon + ' ' + PARTY_GAMES[gameType].name;
  document.getElementById('pl-game').textContent = '選擇玩家人數';
  document.getElementById('pl-players').style.display = 'none';
  document.getElementById('pl-status').innerHTML =
    '<button class="pl-btn" onclick="startPartyGame(\'' + gameType + '\',2)">👥 2 人對戰</button>' +
    '<br><br>' +
    '<button class="pl-btn" onclick="startPartyGame(\'' + gameType + '\',5)">👥 5 人大亂鬥</button>' +
    '<br><br>' +
    '<button class="pl-btn cancel" onclick="cancelParty()">✕ 取消</button>';
  overlay.className = 'show';
}

function startPartyGame(gameType, playerCount) {
  if (_partyActive) return;
  _partyActive = true;
  _partyGameType = gameType;
  _partyPlayerCount = playerCount || 5;

  var info = PARTY_GAMES[gameType] || { name:'未知', icon:'🎮', desc:'' };

  document.getElementById('pl-title').textContent = info.icon + ' ' + info.name;
  document.getElementById('pl-game').textContent = info.desc + ' (' + playerCount + '人)';
  document.getElementById('pl-players').style.display = 'flex';

  // Build player slots
  var slotsHtml = '';
  for (var i = 0; i < _partyPlayerCount; i++) {
    slotsHtml += '<div class="pl-slot" id="pl-slot-' + i + '">' + (i+1) + '</div>';
  }
  document.getElementById('pl-players').innerHTML = slotsHtml;

  _partyPlayers = [{ id: 0, name: '你', ai: false, score: 0 }];
  var slotEl = document.getElementById('pl-slot-0');
  if (slotEl) { slotEl.textContent = '👤'; slotEl.className = 'pl-slot self'; }
  document.getElementById('pl-status').innerHTML = '正在尋找玩家...';

  // Fill with AI over time
  var fillCount = 1;
  var fillInterval = setInterval(function() {
    if (!_partyActive) { clearInterval(fillInterval); return; }
    fillCount++;
    var fi = fillCount - 1;
    if (fi > 0 && fi < _partyPlayerCount) {
      var slotEl2 = document.getElementById('pl-slot-' + fi);
      if (slotEl2) {
        var aiName = PARTY_AI_NAMES[fi - 1] || ('Bot' + fi);
        _partyPlayers.push({ id: fi, name: aiName, ai: true, score: 0 });
        slotEl2.textContent = '🤖';
        slotEl2.className = 'pl-slot filled';
      }
    }
    document.getElementById('pl-status').textContent = '已找到 ' + fillCount + '/' + _partyPlayerCount + ' 人';
    if (fillCount >= _partyPlayerCount) {
      clearInterval(fillInterval);
      document.getElementById('pl-status').textContent = '🎮 遊戲即將開始！';
      _partyTimer = setTimeout(function() {
        if (!_partyActive) return;
        document.getElementById('party-lobby').className = '';
        launchPartyGame();
      }, 1500);
    }
  }, 800);
}

function cancelParty() {
  if (!_partyActive) return;
  _partyActive = false;
  _partyPlayers = [];
  document.getElementById('party-lobby').className = '';
  if (_partyTimer) { clearTimeout(_partyTimer); _partyTimer = null; }
  if (_partyRAF) { cancelAnimationFrame(_partyRAF); _partyRAF = null; }
}

function launchPartyGame() {
  if (!_partyActive) return;
  var mainCanvas = document.querySelector('canvas');
  if (mainCanvas) mainCanvas.style.display = 'none';
  var menuEl = document.getElementById('menu');
  if (menuEl) menuEl.style.display = 'none';

  _partyRenderer = new THREE.WebGLRenderer({ antialias: true });
  _partyRenderer.setSize(window.innerWidth, window.innerHeight);
  _partyRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _partyRenderer.shadowMap.enabled = true;
  _partyRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _partyRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  _partyRenderer.toneMappingExposure = 1.2;
  _partyRenderer.domElement.style.position = 'fixed';
  _partyRenderer.domElement.style.top = '0';
  _partyRenderer.domElement.style.left = '0';
  _partyRenderer.domElement.style.zIndex = '5';
  document.body.prepend(_partyRenderer.domElement);

  _partyScene = new THREE.Scene();
  _partyScene.background = new THREE.Color(0x1a1a2e);
  _partyScene.fog = new THREE.Fog(0x1a1a2e, 35, 50);

  _partyCamera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
  _partyCamera.position.set(0, 2, 3);

  window.addEventListener('resize', function resizeParty() {
    if (_partyCamera) { _partyCamera.aspect = window.innerWidth / window.innerHeight; _partyCamera.updateProjectionMatrix(); }
    if (_partyRenderer) _partyRenderer.setSize(window.innerWidth, window.innerHeight);
  });

  showPartyScoreboard();

  switch (_partyGameType) {
    case 'target': launchPartyTargetShoot(); break;
    case 'battle': launchPartyPlatformBattle(); break;
    case 'coinrush': launchPartyCoinRush(); break;
    case 'memory': launchPartyMemoryMatch(); break;
    default: launchPartyTargetShoot(); break;
  }
}

function showPartyScoreboard() {
  var sb = document.getElementById('party-scoreboard');
  sb.innerHTML = '';
  sb.className = 'show';
  var sorted = [];
  for (var i = 0; i < _partyPlayers.length; i++) sorted.push(_partyPlayers[i]);
  sorted.sort(function(a, b) { return b.score - a.score; });
  for (var i = 0; i < sorted.length; i++) {
    var p = sorted[i];
    var meClass = (p.id === 0) ? ' me' : '';
    var name = p.name || ('玩家' + p.id);
    if (p.id === 0) name = '👤 你';
    else if (p.ai) name = '🤖 ' + name;
    sb.innerHTML += '<div class="ps-row rank-' + (i+1) + meClass + '"><span class="ps-rank">' + (i+1) + '</span><span class="ps-name">' + name + '</span><span class="ps-score">' + p.score + '</span></div>';
  }
}

function updatePartyScoreboard() { showPartyScoreboard(); }

function hidePartyScoreboard() { document.getElementById('party-scoreboard').className = ''; }

function stopPartyGame() {
  if (!_partyActive) return;
  _partyActive = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (_partyRAF) { cancelAnimationFrame(_partyRAF); _partyRAF = null; }
  if (_partyRenderer && _partyRenderer.domElement && _partyRenderer.domElement.parentNode) {
    _partyRenderer.domElement.parentNode.removeChild(_partyRenderer.domElement);
  }
  _partyScene = null; _partyCamera = null; _partyRenderer = null;
  hidePartyScoreboard();
  var menuEl = document.getElementById('menu');
  if (menuEl) menuEl.style.display = 'flex';
  var mainCanvas = document.querySelector('canvas');
  if (mainCanvas) mainCanvas.style.display = 'block';
  cancelParty();
}

// ========== PARTY: TARGET SHOOT ==========
var _pts = {};

function launchPartyTargetShoot() {
  var pts = _pts;
  var scene = _partyScene;
  var camera = _partyCamera;
  var renderer = _partyRenderer;

  scene.add(new THREE.AmbientLight(0x404060, 0.5));
  var hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a2a1a, 0.6);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffeedd, 1.0);
  sun.position.set(30, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  var d = 25;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  scene.add(sun);

  var M = function(c, o) { return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.6,metalness:0.1}, o||{})); };
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), M(0x2a2a3a,{roughness:0.8,metalness:0}));
  ground.rotation.x = -Math.PI/2; ground.position.set(0, -0.01, 15); ground.receiveShadow = true;
  scene.add(ground);
  var wall = new THREE.Mesh(new THREE.BoxGeometry(24, 8, 0.5), M(0x222244,{roughness:0.9,metalness:0}));
  wall.position.set(0, 4, 28); scene.add(wall);
  var plat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2.5), M(0x333355,{roughness:0.5,metalness:0.2}));
  plat.position.set(0, 0, 0); scene.add(plat);

  pts.gun = new THREE.Group();
  var gMat = new THREE.MeshStandardMaterial({color:0x555577,metalness:0.5,roughness:0.3});
  var gMat2 = new THREE.MeshStandardMaterial({color:0x333344,metalness:0.3,roughness:0.5});
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.03,0.35,8),gMat);
  barrel.rotation.x=Math.PI/2; barrel.position.set(0,0,-0.2); pts.gun.add(barrel);
  var body=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.07,0.15),gMat2);
  body.position.set(0,0,0.05); pts.gun.add(body);
  pts.gun.position.set(0.25,-0.2,-0.4); camera.add(pts.gun);

  pts.score=0; pts.hits=0; pts.totalShots=0; pts.timeLeft=30; pts.targets=[];
  pts.spawnTimer=0; pts.running=true; pts.shootCooldown=0; pts.mouseDown=false;
  pts.yaw=0; pts.pitch=0; pts.input={w:false,s:false,a:false,d:false,shift:false};
  pts.euler=new THREE.Euler(0,0,0,'YXZ'); pts.moveVec=new THREE.Vector3();

  for (var i = 0; i < _partyPlayers.length; i++) _partyPlayers[i].score = 0;

  var TC = { gold:{color:0xffd700,emissive:0x886600,points:50,scale:0.5}, red:{color:0xff4444,emissive:0x882222,points:30,scale:0.45}, white:{color:0xcccccc,emissive:0x666666,points:10,scale:0.4} };
  var T_TYPES = ['gold','red','white'], T_WEIGHTS = [0.15,0.35,0.50];
  function pickType(){var r=Math.random(),c=0;for(var i=0;i<T_TYPES.length;i++){c+=T_WEIGHTS[i];if(r<c)return T_TYPES[i];}return'white';}
  function createTarget(){
    var type=pickType(),info=TC[type],g=new THREE.Group();
    var disc=new THREE.Mesh(new THREE.CircleGeometry(info.scale,24),new THREE.MeshStandardMaterial({color:info.color,emissive:info.emissive,emissiveIntensity:0.3,roughness:0.4,metalness:0.3,side:THREE.DoubleSide}));
    disc.position.set(0,0,0); g.add(disc);
    var pole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.3,6),new THREE.MeshStandardMaterial({color:0x444466,metalness:0.4,roughness:0.3}));
    pole.position.set(0,-info.scale-0.15,-0.05); g.add(pole);
    if(type==='gold'){var glow=new THREE.PointLight(0xffd700,0.5,4);glow.position.set(0,0,0.5);g.add(glow);}
    g.position.set((Math.random()-0.5)*8,1.5+Math.random()*3.5,10+Math.random()*18);
    g.lookAt(0,2,3); scene.add(g);
    pts.targets.push({mesh:g,type:type,points:info.points,lifetime:2+Math.random()*1.5,timer:0,alive:true});
  }

  function onMD(e){if(e.button!==0||document.pointerLockElement!==renderer.domElement)return;pts.mouseDown=true;if(pts.shootCooldown<=0){shootP();pts.shootCooldown=0.12;}}
  function onMU(e){if(e.button===0)pts.mouseDown=false;}
  function onMM(e){if(document.pointerLockElement!==renderer.domElement)return;pts.yaw-=e.movementX*0.002;pts.pitch-=e.movementY*0.002;pts.pitch=Math.max(-Math.PI/2.5,Math.min(Math.PI/2.5,pts.pitch));}
  function onKD(e){switch(e.code){case'KeyW':pts.input.w=true;break;case'KeyS':pts.input.s=true;break;case'KeyA':pts.input.a=true;break;case'KeyD':pts.input.d=true;break;case'ShiftLeft':case'ShiftRight':pts.input.shift=true;break;case'Escape':stopPartyGame();break;}}
  function onKU(e){switch(e.code){case'KeyW':pts.input.w=false;break;case'KeyS':pts.input.s=false;break;case'KeyA':pts.input.a=false;break;case'KeyD':pts.input.d=false;break;case'ShiftLeft':case'ShiftRight':pts.input.shift=false;break;}}
  function onCX(e){e.preventDefault();}
  document.addEventListener('mousedown',onMD); document.addEventListener('mouseup',onMU);
  document.addEventListener('mousemove',onMM); document.addEventListener('keydown',onKD);
  document.addEventListener('keyup',onKU); document.addEventListener('contextmenu',onCX);

  function shootP(){
    if(!pts.running)return; pts.totalShots++;
    var ray=new THREE.Raycaster(); ray.set(camera.position,camera.getWorldDirection(new THREE.Vector3()));
    var ht=null,hd=Infinity;
    for(var i=0;i<pts.targets.length;i++){var t=pts.targets[i];if(!t.alive)continue;var is=ray.intersectObjects(t.mesh.children,true);if(is.length>0&&is[0].distance<hd){ht=t;hd=is[0].distance;}}
    if(ht){pts.hits++;pts.score+=ht.points;for(var i=0;i<_partyPlayers.length;i++){if(_partyPlayers[i].id===0){_partyPlayers[i].score=pts.score;break;}}updatePartyScoreboard();
      var fl=new THREE.PointLight(ht.color,2,3);fl.position.copy(ht.mesh.position);scene.add(fl);setTimeout(function(){scene.remove(fl);},80);scene.remove(ht.mesh);ht.alive=false;}
  }

  renderer.domElement.requestPointerLock().catch(function(){});
  var lastTime=performance.now();
  function anim(t){
    if(!_partyActive){_partyRAF=null;return;}_partyRAF=requestAnimationFrame(anim);
    var el=Math.min((t-lastTime)/1000,0.05);lastTime=t;
    if(pts.shootCooldown>0)pts.shootCooldown-=el;
    if(pts.mouseDown&&pts.running&&pts.shootCooldown<=0){shootP();pts.shootCooldown=0.12;}
    if(pts.running){
      pts.timeLeft-=el;
      if(pts.timeLeft<=0){pts.running=false;setTimeout(function(){alert('🎯 得分: '+pts.score+' | 命中: '+pts.hits+'/'+pts.totalShots);stopPartyGame();},500);return;}
      pts.spawnTimer-=el;if(pts.spawnTimer<=0){createTarget();pts.spawnTimer=0.6+Math.random()*0.6;}
      for(var i=pts.targets.length-1;i>=0;i--){var t=pts.targets[i];if(!t.alive)continue;t.timer+=el;if(t.timer>=t.lifetime){scene.remove(t.mesh);pts.targets.splice(i,1);}}
      for(var i=0;i<_partyPlayers.length;i++){if(_partyPlayers[i].ai&&Math.random()<0.03){_partyPlayers[i].score+=Math.random()<0.6?(Math.random()<0.2?50:Math.random()<0.5?30:10):0;}}
      updatePartyScoreboard();
    }
    camera.position.y=2;
    if(document.pointerLockElement===renderer.domElement){
      var sp=(pts.input.shift?7:4)*el, fw=new THREE.Vector3(-Math.sin(pts.yaw),0,-Math.cos(pts.yaw)), rt=new THREE.Vector3(Math.cos(pts.yaw),0,-Math.sin(pts.yaw));
      pts.moveVec.set(0,0,0); if(pts.input.w)pts.moveVec.add(fw); if(pts.input.s)pts.moveVec.sub(fw); if(pts.input.a)pts.moveVec.sub(rt); if(pts.input.d)pts.moveVec.add(rt);
      if(pts.moveVec.length()>0){pts.moveVec.normalize().multiplyScalar(sp);camera.position.x+=pts.moveVec.x;camera.position.z+=pts.moveVec.z;camera.position.x=Math.max(-11,Math.min(11,camera.position.x));camera.position.z=Math.max(-2,Math.min(27,camera.position.z));}
      pts.euler.set(pts.pitch,pts.yaw,0); camera.quaternion.setFromEuler(pts.euler);
    }
    renderer.render(scene,camera);
  }
  anim(performance.now());

  pts.cleanup=function(){document.removeEventListener('mousedown',onMD);document.removeEventListener('mouseup',onMU);document.removeEventListener('mousemove',onMM);document.removeEventListener('keydown',onKD);document.removeEventListener('keyup',onKU);document.removeEventListener('contextmenu',onCX);};
}

// ========== PARTY: PLATFORM BATTLE ==========
var _pbat = {};

function launchPartyPlatformBattle() {
  var pb = _pbat;
  var scene = _partyScene;
  var camera = _partyCamera;
  var renderer = _partyRenderer;

  // Lights
  scene.add(new THREE.AmbientLight(0x334466, 0.4));
  scene.add(new THREE.HemisphereLight(0x88ccff, 0x442211, 0.5));
  var sun = new THREE.DirectionalLight(0xffeedd, 1.0);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  var sd = 22;
  sun.shadow.camera.left = -sd; sun.shadow.camera.right = sd;
  sun.shadow.camera.top = sd; sun.shadow.camera.bottom = -sd;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
  scene.add(sun);
  var fillLight=new THREE.DirectionalLight(0x8888ff,0.3);fillLight.position.set(-10,10,-10);scene.add(fillLight);

  function M(c, o) { return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.6,metalness:0.1}, o||{})); }

  // Walls
  var wallMat = new THREE.MeshStandardMaterial({color:0x222244,transparent:true,opacity:0.12,side:THREE.DoubleSide,roughness:0.9,metalness:0});
  function addWall(w, h, x, z, ry) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, h/2, z); m.rotation.y = ry || 0; scene.add(m);
  }
  addWall(26, 12, 0, -13, 0); addWall(26, 12, 0, 13, Math.PI);
  addWall(26, 12, -13, 0, -Math.PI/2); addWall(26, 12, 13, 0, Math.PI/2);

  // Floor
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), M(0x111122,{roughness:1,metalness:0}));
  floor.rotation.x = -Math.PI/2; floor.position.set(0, -0.1, 0); floor.receiveShadow = true; scene.add(floor);
  var grid = new THREE.GridHelper(24, 12, 0x4466aa, 0x223366);
  grid.position.y = 0; grid.material.transparent = true; grid.material.opacity = 0.15; scene.add(grid);

  // Center platform
  var center = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 0.4, 32), M(0x445577,{roughness:0.4,metalness:0.3}));
  center.position.set(0, 0.2, 0); center.receiveShadow = true; center.castShadow = true; scene.add(center);
  var ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.8, 48), M(0x6688bb,{roughness:0.3,metalness:0.4,emissive:0x224466,emissiveIntensity:0.2,side:THREE.DoubleSide}));
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.41; scene.add(ring);

  function platMat(c) { return M(c, {roughness:0.5,metalness:0.2,emissive:c,emissiveIntensity:0.05}); }
  function platMat2(c) { return M(c, {roughness:0.3,metalness:0.4,emissive:c,emissiveIntensity:0.08}); }

  var platforms = [
    [ -4.2, -4.2, 1.5, 2.5, 2.5, 0x44aaff, 'box' ],[  4.2, -4.2, 1.8, 2.5, 2.5, 0xff6644, 'box' ],
    [ -4.2,  4.2, 1.2, 2.5, 2.5, 0x66dd44, 'box' ],[  4.2,  4.2, 2.0, 2.5, 2.5, 0xff44aa, 'box' ],
    [ -7.5,  0,   3.0, 3.0, 1.8, 0x44ddff, 'cylinder' ],[  7.5,  0,   3.5, 3.0, 1.8, 0xff8844, 'cylinder' ],
    [  0,   -7.5, 2.8, 3.0, 1.8, 0x44ff88, 'cylinder' ],[  0,    7.5, 3.2, 3.0, 1.8, 0xaa44ff, 'cylinder' ],
    [ -11,  -5.5, 5.0, 2.0, 2.0, 0xffee44, 'box' ],[  11,  -5.5, 5.5, 2.0, 2.0, 0x44ffee, 'box' ],
    [ -11,   5.5, 4.5, 2.0, 2.0, 0xff44ee, 'box' ],[  11,   5.5, 5.2, 2.0, 2.0, 0xeeff44, 'box' ],
    [ -10, -10,  6.5, 1.5, 1.5, 0xff6666, 'cylinder' ],[  10, -10,  7.0, 1.5, 1.5, 0x66ff66, 'cylinder' ],
    [ -10,  10,  6.0, 1.5, 1.5, 0x6666ff, 'cylinder' ],[  10,  10,  6.8, 1.5, 1.5, 0xff66ff, 'cylinder' ],
  ];
  var platObjects = [];
  platforms.forEach(function(p) {
    var x=p[0],z=p[1],y=p[2],w=p[3],d=p[4],col=p[5],shape=p[6];
    var mesh = shape==='cylinder' ? new THREE.Mesh(new THREE.CylinderGeometry(w,w,0.25,24), platMat2(col)) : new THREE.Mesh(new THREE.BoxGeometry(w,0.25,d), platMat(col));
    mesh.position.set(x,y,z); mesh.receiveShadow=true; mesh.castShadow=true; scene.add(mesh);
    platObjects.push({mesh:mesh,x:x,y:y,z:z,w:w,d:d,shape:shape,col:col,h:0.25});
    var glow = new THREE.Mesh(shape==='cylinder' ? new THREE.RingGeometry(w*0.85,w*0.95,24) : new THREE.RingGeometry(w*0.42,w*0.47,4),
      M(col,{emissive:col,emissiveIntensity:0.4,transparent:true,opacity:0.4,side:THREE.DoubleSide}));
    glow.rotation.x=-Math.PI/2; glow.position.set(x,y+0.14,z); scene.add(glow);
  });
  // Add center platform to collision
  platObjects.push({mesh:center,x:0,y:0.2,z:0,w:5,d:5,shape:'cylinder',col:0x445577,h:0.4});

  // Pillars
  var pillarMat = M(0x333355, {roughness:0.3,metalness:0.5});
  for (var i = 0; i < 8; i++) {
    var angle = (i/8)*Math.PI*2;
    var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.2,8,8), pillarMat);
    pillar.position.set(Math.cos(angle)*11.5,4,Math.sin(angle)*11.5); pillar.castShadow=true; scene.add(pillar);
    var tl = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8), M(0x6688ff,{emissive:0x4466ff,emissiveIntensity:0.5}));
    tl.position.set(Math.cos(angle)*11.5,8,Math.sin(angle)*11.5); scene.add(tl);
  }
  var ceilLight=new THREE.PointLight(0x88aaff,0.5,20);ceilLight.position.set(0,8.5,0);scene.add(ceilLight);

  // Particles
  var pc=200; var pG=new THREE.BufferGeometry(); var pP=new Float32Array(pc*3);
  for (var i=0;i<pc;i++){pP[i*3]=(Math.random()-0.5)*30;pP[i*3+1]=Math.random()*12;pP[i*3+2]=(Math.random()-0.5)*30;}
  pG.setAttribute('position',new THREE.BufferAttribute(pP,3));
  var particles=new THREE.Points(pG,new THREE.PointsMaterial({color:0x6688ff,size:0.05,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending}));
  scene.add(particles);

  // Game state
  pb.ammo=100; pb.maxAmmo=100; pb.hp=100; pb.maxHp=100; pb.kills=0;
  pb.totalShots=0; pb.hits=0; pb.shootCooldown=0; pb.mouseDown=false;
  pb.yaw=0; pb.pitch=0; pb.running=true; pb.ended=false;
  pb.input={w:false,s:false,a:false,d:false,space:false};
  pb.euler=new THREE.Euler(0,0,0,'YXZ'); pb.moveVec=new THREE.Vector3();
  pb.velocityY=0; pb.gravity=-18; pb.jumpSpeed=9; pb.onGround=false; pb.playerHeight=1.7;
  pb.bots=[]; pb.botCount=3;

  // Ammo HUD
  var hudEl=document.getElementById('pb-hud');
  if(!hudEl){
    hudEl=document.createElement('div'); hudEl.id='pb-hud';
    hudEl.style.cssText='position:fixed;bottom:50px;right:50px;z-index:6;color:#fff;font-family:monospace;font-size:24px;text-shadow:0 0 8px rgba(0,0,0,0.8);pointer-events:none;';
    document.body.appendChild(hudEl);
  }

  // Player
  camera.position.set(0,2,6);
  pb.playerBody=new THREE.Group();
  var bM=new THREE.Mesh(new THREE.CapsuleGeometry(0.3,0.5,4,8), M(0x44aaff,{roughness:0.3,metalness:0.4}));
  bM.position.y=0.55; pb.playerBody.add(bM);
  var hM=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8), M(0xffcc88,{roughness:0.5,metalness:0}));
  hM.position.y=1.05; pb.playerBody.add(hM);
  pb.playerBody.position.set(0,0.5,6); scene.add(pb.playerBody);

  // AK-47 model from main game + reload state
  if (typeof createGunModel === 'function') {
    pb.gunGroup = createGunModel('ak47');
    pb.gunGroup.scale.set(1.5, 1.5, 1.5);
    pb.gunGroup.position.set(0.2, -0.15, -0.35);
  } else {
    pb.gunGroup = new THREE.Group();
  }
  camera.add(pb.gunGroup);
  pb.magazineMesh = null;
  pb.isReloading = false;
  pb.reloadTimer = 0;
  pb.reloadDuration = 2.0;
  pb.reloadAmmoAdded=false;

  // Score reset — sync scoreboard with actual game bots
  _partyPlayers.length=0;
  _partyPlayers.push({id:0,name:'你',ai:false,score:0});

  // Bot colors/names
  var botColors=[0xff4444,0x44ff44,0xff44ff];
  var botNames=['🔴 紅隊','🟢 綠隊','🟣 紫隊'];
  function createBot(index){
    var spawns=[platObjects[4],platObjects[5],platObjects[8],platObjects[10],platObjects[12],platObjects[14]];
    var sp=spawns[index%spawns.length];
    var group=new THREE.Group();
    var col=botColors[index];
    // 身體：跟單人 AI、雙人對手統一用方晶
    var cub=createCubelingMesh({body:col,accent:col,glow:col,core:col,
      visor:col,visorEm:col,visorEmI:1.2});
    group.add(cub);
    group.userData.cubeling=cub;
    var hpBar=new THREE.Group();
    var bg=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.06), new THREE.MeshBasicMaterial({color:0x333333,side:THREE.DoubleSide}));
    bg.position.y=0.95; hpBar.add(bg);
    var fill=new THREE.Mesh(new THREE.PlaneGeometry(0.58,0.04), new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide}));
    fill.position.y=0.95; fill.position.x=0; hpBar.add(fill);
    group.add(hpBar);
    group.position.set(sp.x,sp.y+0.5,sp.z);
    group.lookAt(0,group.position.y,0); scene.add(group);
    return {mesh:group,hpBarFill:fill,hp:50,maxHp:50,index:index,name:botNames[index],color:col,targetPlat:null,
      targetPos:new THREE.Vector3(sp.x,sp.y+0.5,sp.z),currentPos:new THREE.Vector3(sp.x,sp.y+0.5,sp.z),
      moveSpeed:1.5+Math.random()*0.5,state:'idle',stateTimer:0,shootTimer:0,accuracy:0.4+Math.random()*0.3,
      alive:true,respawnTimer:0};
  }
  for (var i=0;i<pb.botCount;i++){
    pb.bots.push(createBot(i));
    _partyPlayers.push({id:100+i,name:botNames[i],ai:true,score:0});
  }

  // Reload
  function pbCreateMagazine(){
    if(pb.magazineMesh){pb.gunGroup.remove(pb.magazineMesh);pb.magazineMesh=null;}
    var mg=new THREE.Group();
    var base=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.055,0.014),new THREE.MeshStandardMaterial({color:0x444444,metalness:0.5,roughness:0.4}));
    base.position.set(0,-0.04,0); mg.add(base);
    for(var bi=0;bi<5;bi++){
      var b=new THREE.Mesh(new THREE.SphereGeometry(0.004,4,4),new THREE.MeshStandardMaterial({color:0xccaa44,metalness:0.6}));
      b.position.set(0.015,-0.058+bi*0.009,0.006); mg.add(b);
    }
    mg.position.set(0,-0.005,0.02); mg.rotation.x=-0.08;
    pb.gunGroup.add(mg); pb.magazineMesh=mg;
  }
  function pbReload(){
    if(pb.isReloading||pb.ammo>=pb.maxAmmo||pb.ended) return;
    pb.isReloading=true; pb.reloadTimer=pb.reloadDuration;
    pbCreateMagazine();
    if(pb.magazineMesh)pb.magazineMesh.position.y=0;
  }

  function addKillfeed(killer,victim){
    var kf=document.getElementById('party-scoreboard');
    var e=document.createElement('div');
    e.style.cssText='padding:4px 10px;border-radius:4px;font-size:12px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.08);color:#fff;margin-bottom:2px;white-space:nowrap';
    e.innerHTML='<span style="color:#f8a">'+killer+'</span> 💀 <span style="color:#8cf">'+victim+'</span>';
    kf.appendChild(e);
    setTimeout(function(){e.style.opacity='0';e.style.transition='opacity .4s';},2000);
    setTimeout(function(){if(e.parentNode)e.parentNode.removeChild(e);},2500);
  }

  function botShoot(bot){
    var aimPos=new THREE.Vector3(pb.playerBody.position.x,pb.playerBody.position.y+0.7,pb.playerBody.position.z);
    var dir=new THREE.Vector3().copy(aimPos).sub(bot.mesh.position);
    var dist=dir.length(); dir.normalize();
    var inaccuracy=(1-bot.accuracy)*0.15;
    dir.x+=(Math.random()-0.5)*inaccuracy; dir.y+=(Math.random()-0.5)*inaccuracy*0.5; dir.z+=(Math.random()-0.5)*inaccuracy;
    dir.normalize();
    var flash=new THREE.PointLight(0xff4444,1,3);
    var muzzle=new THREE.Vector3().copy(bot.mesh.position); muzzle.y+=0.8;
    muzzle.add(dir.clone().multiplyScalar(0.5)); flash.position.copy(muzzle); scene.add(flash);
    setTimeout(function(){scene.remove(flash);},40);
    var ray=new THREE.Raycaster();
    var origin=new THREE.Vector3().copy(bot.mesh.position); origin.y+=0.8;
    ray.set(origin,dir);
    var hits=ray.intersectObjects(pb.playerBody.children,true);
    if(hits.length>0&&hits[0].distance<dist){
      var dmg=8+Math.floor(Math.random()*6); pb.hp-=dmg;
      if(pb.hp<=0){pb.hp=0;pb.running=false;pb.ended=true;
        setTimeout(function(){alert('💀 敗北... 擊殺: '+pb.kills);stopPartyGame();},300);}
      updatePartyScoreboard();
    }
  }

  function shoot(){
    if(!pb.running||pb.ended) return;
    if(pb.isReloading||pb.ammo<=0) return;
    pb.ammo--; pb.totalShots++;
    var flash=new THREE.PointLight(0xffffaa,3,5);
    var dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    flash.position.copy(camera.position).add(dir.clone().multiplyScalar(2)); scene.add(flash);
    setTimeout(function(){scene.remove(flash);},50);
    var ray=new THREE.Raycaster(); ray.set(camera.position,camera.getWorldDirection(new THREE.Vector3()));
    var hitBot=null,hitDist=Infinity;
    for(var i=0;i<pb.bots.length;i++){
      var b=pb.bots[i]; if(!b.alive) continue;
      var hits=ray.intersectObjects(b.mesh.children,true);
      if(hits.length>0&&hits[0].distance<hitDist){hitBot=b;hitDist=hits[0].distance;}
    }
    if(hitBot){
      pb.hits++;
      var dmg=15+Math.floor(Math.random()*10); hitBot.hp-=dmg;
      hitBot.state='hit'; hitBot.stateTimer=0.3;
      var kb=new THREE.Vector3().copy(hitBot.mesh.position).sub(camera.position).normalize();
      kb.y=0.3; hitBot.mesh.position.add(kb.multiplyScalar(0.5));
      var hpPct=Math.max(0,hitBot.hp/hitBot.maxHp);
      hitBot.hpBarFill.scale.x=hpPct; hitBot.hpBarFill.position.x=(1-hpPct)*-0.29;
      if(hitBot.hp<=0){
        pb.kills++; addKillfeed('👤 你',hitBot.name);
        for(var j=0;j<_partyPlayers.length;j++){if(_partyPlayers[j].id===0)_partyPlayers[j].score=pb.kills;}
        hitBot.alive=false; hitBot.mesh.visible=false; hitBot.respawnTimer=3;
        updatePartyScoreboard();
        // Check win
        var alive=0; for(var j=0;j<pb.bots.length;j++){if(pb.bots[j].alive)alive++;}
        if(alive===0){pb.running=false;pb.ended=true;
          setTimeout(function(){alert('🏆 勝利！擊殺: '+pb.kills);stopPartyGame();},500);}
      }
    }
    updatePartyScoreboard();
  }

  function updateBots(dt){
    for(var i=0;i<pb.bots.length;i++){
      var b=pb.bots[i];
      if(!b.alive){b.respawnTimer-=dt;if(b.respawnTimer<=0){
        var sp=[platObjects[4],platObjects[5],platObjects[8],platObjects[10],platObjects[12],platObjects[14]];
        var s=sp[Math.floor(Math.random()*sp.length)];
        b.mesh.position.set(s.x,s.y+0.5,s.z); b.hp=b.maxHp; b.alive=true; b.mesh.visible=true;
        b.state='idle'; b.stateTimer=0; b.targetPlat=null;
        b.hpBarFill.scale.x=1; b.hpBarFill.position.x=0;
      }continue;}
      b.stateTimer-=dt; b.shootTimer-=dt;
      // 方晶待機動畫
      if(b.mesh.userData.cubeling&&b.mesh.userData.cubeling.userData.tick)b.mesh.userData.cubeling.userData.tick(pb.time||(pb.time=0));
      switch(b.state){
        case'idle':
          if(b.stateTimer<=0){
            b.targetPlat=platObjects[Math.floor(Math.random()*platObjects.length)];
            b.targetPos.set(b.targetPlat.x,b.targetPlat.y+0.5,b.targetPlat.z);
            b.state='move'; b.stateTimer=3+Math.random()*2;
          }
          b.mesh.lookAt(camera.position.x,b.mesh.position.y,camera.position.z);
          var dist=b.mesh.position.distanceTo(camera.position);
          if(dist<18&&b.shootTimer<=0){botShoot(b);b.shootTimer=0.6+Math.random()*0.4;}
          break;
        case'move':
          var d=new THREE.Vector3().copy(b.targetPos).sub(b.mesh.position); d.y=0;
          if(d.length()<0.3){b.state='idle';b.stateTimer=0.5+Math.random()*1.5;}
          else{d.normalize().multiplyScalar(b.moveSpeed*dt);b.mesh.position.x+=d.x;b.mesh.position.z+=d.z;
            b.mesh.position.y+=(b.targetPos.y-b.mesh.position.y)*3*dt;
            b.mesh.lookAt(b.mesh.position.x+d.x*10,b.mesh.position.y,b.mesh.position.z+d.z*10);}
          var dist=b.mesh.position.distanceTo(camera.position);
          if(dist<18&&b.shootTimer<=0){botShoot(b);b.shootTimer=0.8+Math.random()*0.6;}
          break;
        case'hit':b.state='idle';b.stateTimer=0.5;break;
      }
    }
  }

  // Events
  function onMD(e){if(e.button!==0||!pb.running||pb.ended)return;pb.mouseDown=true;if(pb.shootCooldown<=0){shoot();pb.shootCooldown=0.15;}}
  function onMU(e){if(e.button===0)pb.mouseDown=false;}
  function onMM(e){if(document.pointerLockElement!==renderer.domElement)return;pb.yaw-=e.movementX*0.002;pb.pitch-=e.movementY*0.002;pb.pitch=Math.max(-Math.PI/2.5,Math.min(Math.PI/2.5,pb.pitch));}
  function onKD(e){switch(e.code){case'KeyW':pb.input.w=true;break;case'KeyS':pb.input.s=true;break;case'KeyA':pb.input.a=true;break;case'KeyD':pb.input.d=true;break;case'Space':pb.input.space=true;break;case'KeyR':pbReload();break;case'Escape':stopPartyGame();break;}}
  function onKU(e){switch(e.code){case'KeyW':pb.input.w=false;break;case'KeyS':pb.input.s=false;break;case'KeyA':pb.input.a=false;break;case'KeyD':pb.input.d=false;break;case'Space':pb.input.space=false;break;}}
  function onCX(e){e.preventDefault();}
  document.addEventListener('mousedown',onMD); document.addEventListener('mouseup',onMU);
  document.addEventListener('mousemove',onMM); document.addEventListener('keydown',onKD);
  document.addEventListener('keyup',onKU); document.addEventListener('contextmenu',onCX);

  renderer.domElement.requestPointerLock().catch(function(){});
  var pt=200; var ppos=particles.geometry.attributes.position.array;

  function anim(t){
    if(!_partyActive){pb._raf=null;return;}pb._raf=requestAnimationFrame(anim);
    var dt=Math.min((t-lastTime)/1000,0.05);lastTime=t;
    pb.time+=dt;
    if(pb.shootCooldown>0)pb.shootCooldown-=dt;
    // Reload
    if(pb.isReloading){
      pb.reloadTimer-=dt;
      var pct=1-pb.reloadTimer/pb.reloadDuration;
      if(pb.gunGroup){
        // Phase 1: drop magazine (first 35%)
        if(pct<0.35){
          var t=pct/0.35;
          pb.gunGroup.position.y=-0.15+t*0.03;
          pb.gunGroup.rotation.x=t*0.25;
          if(pb.magazineMesh)pb.magazineMesh.position.y=-t*0.06;
        }
        // Phase 2: insert new magazine (35-60%)
        else if(pct<0.60){
          var t=(pct-0.35)/0.25;
          pb.gunGroup.position.y=-0.12+t*0.02;
          pb.gunGroup.rotation.x=0.25*(1-t);
          if(pb.magazineMesh)pb.magazineMesh.position.y=-(1-t)*0.06;
        }
        // Phase 3: pull bolt (60-85%)
        else if(pct<0.85){
          var t=(pct-0.60)/0.25;
          pb.gunGroup.position.x=0.2+t*0.03;
          pb.gunGroup.rotation.z=t*0.15;
        }
        // Phase 4: settle (85-100%)
        else{
          var t=(pct-0.85)/0.15;
          pb.gunGroup.position.x=0.23-t*0.03;
          pb.gunGroup.rotation.z=(1-t)*0.15;
          if(t>0.5&&!pb.reloadAmmoAdded){
            pb.reloadAmmoAdded=true;
            if(pb.magazineMesh){pb.gunGroup.remove(pb.magazineMesh);pb.magazineMesh=null;}
          }
        }
      }
      if(pb.reloadTimer<=0){
        pb.isReloading=false; pb.ammo=pb.maxAmmo;
        pb.reloadAmmoAdded=false;
        pb.gunGroup.position.set(0.2,-0.15,-0.35);
        pb.gunGroup.rotation.set(0,0,0);
      }
    }
    if(pb.mouseDown&&pb.running&&!pb.ended&&pb.shootCooldown<=0&&!pb.isReloading){shoot();pb.shootCooldown=0.15;}
    if(pb.running&&!pb.ended) updateBots(dt);
    if(document.pointerLockElement===renderer.domElement&&pb.running&&!pb.ended){
      // Jump
      if(pb.input.space&&pb.onGround){pb.velocityY=pb.jumpSpeed;pb.onGround=false;}
      pb.velocityY+=pb.gravity*dt; camera.position.y+=pb.velocityY*dt;
      // Platform collision (feet check)
      var feetY=camera.position.y-pb.playerHeight;
      var groundY=-999;
      for(var i=0;i<platObjects.length;i++){
        var p=platObjects[i];
        var hw=p.shape==='cylinder'?p.w:p.w/2, hd=p.shape==='cylinder'?p.w:p.d/2;
        if(Math.abs(camera.position.x-p.x)<hw&&Math.abs(camera.position.z-p.z)<hd){
          var hh=(p.h||0.25)/2;
          var sy=p.y+hh+pb.playerHeight;
          if(feetY<=sy&&camera.position.y>=sy-0.3&&pb.velocityY<=0){groundY=sy;break;}
        }
      }
      if(groundY>-999){camera.position.y=groundY;pb.velocityY=0;pb.onGround=true;}
      // Fall off map
      if(camera.position.y<-5){camera.position.y=5;pb.velocityY=0;}
      // Horizontal movement
      var sp=3.5*dt;
      var fw=new THREE.Vector3(-Math.sin(pb.yaw),0,-Math.cos(pb.yaw));
      var rt=new THREE.Vector3(Math.cos(pb.yaw),0,-Math.sin(pb.yaw));
      pb.moveVec.set(0,0,0);
      if(pb.input.w)pb.moveVec.add(fw); if(pb.input.s)pb.moveVec.sub(fw);
      if(pb.input.a)pb.moveVec.sub(rt); if(pb.input.d)pb.moveVec.add(rt);
      if(pb.moveVec.length()>0){pb.moveVec.normalize().multiplyScalar(sp);
        camera.position.x+=pb.moveVec.x;camera.position.z+=pb.moveVec.z;
        camera.position.x=Math.max(-12,Math.min(12,camera.position.x));
        camera.position.z=Math.max(-12,Math.min(12,camera.position.z));}
      // Wall collision (push player away from walls)
      if(camera.position.x>11.5)camera.position.x-=0.5; if(camera.position.x<-11.5)camera.position.x+=0.5;
      if(camera.position.z>11.5)camera.position.z-=0.5; if(camera.position.z<-11.5)camera.position.z+=0.5;
      pb.playerBody.position.x=camera.position.x;pb.playerBody.position.z=camera.position.z;
      pb.playerBody.position.y=camera.position.y-pb.playerHeight;
      pb.euler.set(pb.pitch,pb.yaw,0); camera.quaternion.setFromEuler(pb.euler);
    }
    // Particles
    for(var i=0;i<pt;i++)ppos[i*3+1]+=Math.sin(pb.time+i)*0.001;
    particles.geometry.attributes.position.needsUpdate=true; particles.rotation.y+=0.0002;
    // Ammo HUD
    if(pb.isReloading)hudEl.textContent='⟳ 換彈中...';
    else hudEl.textContent=pb.ammo+' / '+pb.maxAmmo;
    renderer.render(scene,camera);
  }
  var lastTime=performance.now(); pb.time=0;
  anim(performance.now());

  pb.cleanup=function(){document.removeEventListener('mousedown',onMD);document.removeEventListener('mouseup',onMU);document.removeEventListener('mousemove',onMM);document.removeEventListener('keydown',onKD);document.removeEventListener('keyup',onKU);document.removeEventListener('contextmenu',onCX);var he=document.getElementById('pb-hud');if(he)he.parentNode.removeChild(he);};
}

// ========== PARTY: COIN RUSH ==========
var _pcoin = {};

function launchPartyCoinRush() {
  var pc = _pcoin;
  var scene = _partyScene;
  var camera = _partyCamera;
  var renderer = _partyRenderer;
  var M = function(c, o) { return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.6,metalness:0.1}, o||{})); };

  // Lights
  scene.add(new THREE.AmbientLight(0x404060, 0.5));
  var dir = new THREE.DirectionalLight(0xffeedd, 1.2);
  dir.position.set(10, 20, 10); dir.castShadow = true;
  dir.shadow.mapSize.width = 1024; dir.shadow.mapSize.height = 1024;
  dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 50;
  dir.shadow.camera.left = -20; dir.shadow.camera.right = 20;
  dir.shadow.camera.top = 20; dir.shadow.camera.bottom = -20;
  scene.add(dir);
  scene.add(new THREE.HemisphereLight(0x8888ff, 0x44aa44, 0.4));

  // Ground
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), M(0x2a2a3e, {roughness:1, metalness:0}));
  ground.rotation.x = -Math.PI/2; ground.position.set(0, -0.1, 0); ground.receiveShadow = true; scene.add(ground);

  // Colliders
  var colliders = [];

  // School building
  var build = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 6), M(0x445577, {roughness:0.4, metalness:0.2}));
  build.position.set(0, 1.5, -4); build.castShadow = true; build.receiveShadow = true; scene.add(build);
  colliders.push({x:0, z:-4, y:1.5, w:8, d:6, h:3});
  var roof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.2, 6.2), M(0x667799, {roughness:0.3, metalness:0.4}));
  roof.position.set(0, 3.1, -4); scene.add(roof);
  for (var wi = 0; wi < 4; wi++) {
    var wMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshStandardMaterial({color:0x88bbff, emissive:0x88bbff, emissiveIntensity:0.15, side:THREE.DoubleSide, transparent:true, opacity:0.7}));
    wMesh.position.set(-2.8+wi*1.8, 1.5, -7.01); scene.add(wMesh);
  }
  var door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2), M(0x554433, {roughness:0.8}));
  door.position.set(0, 1, -7.01); scene.add(door);

  // Platforms
  function makePlat(x, z, y, w, d, col) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), M(col, {roughness:0.5, metalness:0.2, emissive:col, emissiveIntensity:0.05}));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    return {x:x, z:z, y:y, w:w, d:d};
  }
  var plats = [
    makePlat(-5, -2, 1.2, 2.5, 2.5, 0x44aaff), makePlat(5, -2, 1.5, 2.5, 2.5, 0xff6644),
    makePlat(-5, 3, 1.8, 2.5, 2.5, 0x66dd44), makePlat(5, 3, 2.0, 2.5, 2.5, 0xff44aa),
    makePlat(-8, -6, 3.0, 2.0, 2.0, 0x44ddff), makePlat(8, -6, 3.5, 2.0, 2.0, 0xff8844),
    makePlat(-8, 7, 2.8, 2.0, 2.0, 0x44ff88), makePlat(8, 7, 3.2, 2.0, 2.0, 0xaa44ff),
    makePlat(0, -8, 4.0, 2.5, 2.5, 0xffee44), makePlat(0, 9, 4.5, 2.5, 2.5, 0x44ffee),
    makePlat(-3, 0, 0.5, 2.0, 2.0, 0xcc88ff), makePlat(3, 0, 0.7, 2.0, 2.0, 0xff88cc),
  ];

  // Trees
  function makeTree(x, z) {
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1, 6), M(0x554433, {roughness:0.9}));
    trunk.position.set(x, 0.5, z); scene.add(trunk);
    var crown = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), M(0x338833, {roughness:0.8}));
    crown.position.set(x, 1.4, z); scene.add(crown);
  }
  makeTree(-9, -7); makeTree(9, -7); makeTree(-9, 8); makeTree(9, 8);
  colliders.push({x:-9,z:-7,y:0,w:1.2,d:1.2,h:2},{x:9,z:-7,y:0,w:1.2,d:1.2,h:2},{x:-9,z:8,y:0,w:1.2,d:1.2,h:2},{x:9,z:8,y:0,w:1.2,d:1.2,h:2});

  // Coins
  var coins = [];
  var coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12);
  var coinMat = new THREE.MeshStandardMaterial({color:0xffcc00, metalness:0.7, roughness:0.2, emissive:0xffaa00, emissiveIntensity:0.15});
  var coinGlowMat = new THREE.MeshBasicMaterial({color:0xffcc00, transparent:true, opacity:0.15, side:THREE.DoubleSide});

  function spawnCoin() {
    var p = plats[Math.floor(Math.random() * plats.length)];
    var hw = (p.w - 0.4) / 2, hd = (p.d - 0.4) / 2;
    var x = p.x + (Math.random() - 0.5) * hw * 2;
    var z = p.z + (Math.random() - 0.5) * hd * 2;
    var y = p.y + 0.25;
    var group = new THREE.Group();
    var mesh = new THREE.Mesh(coinGeo, coinMat);
    mesh.rotation.x = Math.PI / 2; mesh.castShadow = true;
    group.add(mesh);
    var glow = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 12), coinGlowMat);
    glow.rotation.x = -Math.PI / 2; glow.position.y = -0.02;
    group.add(glow);
    group.position.set(x, y, z);
    scene.add(group);
    coins.push({group:group, mesh:mesh, x:x, y:y, z:z, alive:true, bobPhase:Math.random() * Math.PI * 2});
  }

  // Player
  camera.position.set(0, 1.0, 8);
  var playerBody = new THREE.Group();
  var bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 8), M(0x44aaff, {roughness:0.3, metalness:0.4}));
  bodyMesh.position.y = 0.5; playerBody.add(bodyMesh);
  var headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), M(0xffcc88, {roughness:0.5, metalness:0}));
  headMesh.position.y = 0.95; playerBody.add(headMesh);
  playerBody.position.set(0, 0.5, 8); scene.add(playerBody);

  pc.score = 0; pc.timeLeft = 60; pc.running = true; pc.ended = false;
  pc.yaw = 0; pc.pitch = 0;
  pc.input = {w:false, s:false, a:false, d:false, space:false};
  pc.euler = new THREE.Euler(0, 0, 0, 'YXZ');
  pc.moveVec = new THREE.Vector3();
  pc.velocityY = 0; pc.gravity = -18; pc.jumpSpeed = 9; pc.onGround = false; pc.playerHeight = 1.0;

  // Reset scoreboard
  for (var i = 0; i < _partyPlayers.length; i++) _partyPlayers[i].score = 0;

  // Initial coins
  for (var i = 0; i < 20; i++) spawnCoin();

  // Events
  function onMD(e) { if (e.button === 0 && pc.running && !pc.ended) ocRequestPointerLock(renderer.domElement); }
  function onMM(e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    pc.yaw -= e.movementX * 0.002; pc.pitch -= e.movementY * 0.002;
    pc.pitch = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, pc.pitch));
  }
  function onKD(e) {
    switch (e.code) {
      case 'KeyW': pc.input.w = true; break; case 'KeyS': pc.input.s = true; break;
      case 'KeyA': pc.input.a = true; break; case 'KeyD': pc.input.d = true; break;
      case 'Space': pc.input.space = true; break;
      case 'Escape': stopPartyGame(); break;
    }
  }
  function onKU(e) {
    switch (e.code) {
      case 'KeyW': pc.input.w = false; break; case 'KeyS': pc.input.s = false; break;
      case 'KeyA': pc.input.a = false; break; case 'KeyD': pc.input.d = false; break;
      case 'Space': pc.input.space = false; break;
    }
  }
  function onCX(e) { e.preventDefault(); }
  document.addEventListener('mousedown', onMD);
  document.addEventListener('mousemove', onMM);
  document.addEventListener('keydown', onKD);
  document.addEventListener('keyup', onKU);
  document.addEventListener('contextmenu', onCX);

  renderer.domElement.requestPointerLock().catch(function(){});

  // Coin rush HUD
  var timerEl = document.getElementById('pcoin-timer');
  if (!timerEl) {
    timerEl = document.createElement('div');
    timerEl.id = 'pcoin-timer';
    timerEl.style.cssText = 'position:fixed;top:20px;right:20px;z-index:6;color:#fff;font-family:monospace;font-size:28px;font-weight:bold;text-shadow:0 0 15px rgba(0,0,0,.8);pointer-events:none;letter-spacing:3px;';
    document.body.appendChild(timerEl);
  }
  var scoreEl = document.getElementById('pcoin-score');
  if (!scoreEl) {
    scoreEl = document.createElement('div');
    scoreEl.id = 'pcoin-score';
    scoreEl.style.cssText = 'position:fixed;top:20px;left:20px;z-index:6;color:#fd0;font-family:monospace;font-size:28px;font-weight:bold;text-shadow:0 0 15px rgba(0,0,0,.8);pointer-events:none;letter-spacing:2px;';
    document.body.appendChild(scoreEl);
  }
  timerEl.textContent = '60';
  scoreEl.textContent = '🪙 0';

  // Game loop
  var lastTime = performance.now();

  function anim(t) {
    if (!_partyActive) { pc._raf = null; return; }
    pc._raf = requestAnimationFrame(anim);
    var dt = Math.min((t - lastTime) / 1000, 0.05);
    lastTime = t;

    if (pc.running && !pc.ended) {
      pc.timeLeft -= dt;
      if (timerEl) {
        timerEl.textContent = Math.ceil(pc.timeLeft);
        timerEl.className = pc.timeLeft <= 10 ? 'warning' : '';
      }
      if (pc.timeLeft <= 0) {
        pc.ended = true; pc.running = false;
        if (document.pointerLockElement) document.exitPointerLock();
        setTimeout(function() { addXP(10 + pc.score); alert('🪙 金幣: '+pc.score+' 枚'); stopPartyGame(); }, 1500);
        return;
      }

      // Jump
      if (pc.input.space && pc.onGround) { pc.velocityY = pc.jumpSpeed; pc.onGround = false; }
      pc.velocityY += pc.gravity * dt;
      camera.position.y += pc.velocityY * dt;

      // Platform/ground collision
      var feetY = camera.position.y - pc.playerHeight;
      var groundY = -999;
      for (var i = 0; i < plats.length; i++) {
        var p = plats[i];
        var hw = p.w / 2, hd = p.d / 2;
        if (Math.abs(camera.position.x - p.x) < hw && Math.abs(camera.position.z - p.z) < hd) {
          var sy = p.y + 0.125 + pc.playerHeight;
          if (feetY <= sy && camera.position.y >= sy - 0.3 && pc.velocityY <= 0) { groundY = sy; break; }
        }
      }
      if (feetY <= 0 && camera.position.y >= 0 - 0.3 && pc.velocityY <= 0) { groundY = pc.playerHeight; }
      if (groundY > -999) { camera.position.y = groundY; pc.velocityY = 0; pc.onGround = true; }
      if (camera.position.y < -5) { camera.position.y = 2; pc.velocityY = 0; }

      // Movement
      var sp = 4 * dt;
      var fw = new THREE.Vector3(-Math.sin(pc.yaw), 0, -Math.cos(pc.yaw));
      var rt = new THREE.Vector3(Math.cos(pc.yaw), 0, -Math.sin(pc.yaw));
      pc.moveVec.set(0, 0, 0);
      if (pc.input.w) pc.moveVec.add(fw); if (pc.input.s) pc.moveVec.sub(fw);
      if (pc.input.a) pc.moveVec.sub(rt); if (pc.input.d) pc.moveVec.add(rt);
      if (pc.moveVec.length() > 0) {
        pc.moveVec.normalize().multiplyScalar(sp);
        camera.position.x += pc.moveVec.x;
        camera.position.z += pc.moveVec.z;
        camera.position.x = Math.max(-12, Math.min(12, camera.position.x));
        camera.position.z = Math.max(-12, Math.min(12, camera.position.z));
      }

      // Collider push
      var radius = 0.3;
      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        var hw = c.w / 2 + radius, hd = c.d / 2 + radius;
        var dx = camera.position.x - c.x, dz = camera.position.z - c.z;
        if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
          var ox = hw - Math.abs(dx), oz = hd - Math.abs(dz);
          if (ox < oz) camera.position.x += dx > 0 ? ox : -ox;
          else camera.position.z += dz > 0 ? oz : -oz;
        }
      }

      playerBody.position.x = camera.position.x;
      playerBody.position.z = camera.position.z;
      playerBody.position.y = camera.position.y - pc.playerHeight;
      pc.euler.set(pc.pitch, pc.yaw, 0);
      camera.quaternion.setFromEuler(pc.euler);

      // Coin collection
      for (var i = 0; i < coins.length; i++) {
        var c = coins[i];
        if (!c.alive) continue;
        var dx = camera.position.x - c.x;
        var dz = camera.position.z - c.z;
        var dy = camera.position.y - c.y;
        if (dx * dx + dz * dz + dy * dy < 0.8 * 0.8) {
          c.alive = false;
          scene.remove(c.group);
          pc.score++;
          if (scoreEl) scoreEl.textContent = '🪙 ' + pc.score;
          for (var j = 0; j < _partyPlayers.length; j++) {
            if (_partyPlayers[j].id === 0) { _partyPlayers[j].score = pc.score; break; }
          }
          setTimeout(spawnCoin, 2000 + Math.random() * 3000);
        }
      }
      var aliveCount = 0;
      for (var i = 0; i < coins.length; i++) if (coins[i].alive) aliveCount++;
      if (aliveCount < 15) spawnCoin();

      // AI score simulation
      for (var i = 0; i < _partyPlayers.length; i++) {
        if (_partyPlayers[i].ai && Math.random() < 0.02) _partyPlayers[i].score++;
      }
      updatePartyScoreboard();
    }

    // Animate coins
    for (var i = 0; i < coins.length; i++) {
      var c = coins[i];
      if (!c.alive) continue;
      c.bobPhase += dt * 2;
      c.group.position.y = c.y + Math.sin(c.bobPhase) * 0.08;
      c.group.rotation.y += dt * 1.5;
    }

    renderer.render(scene, camera);
  }
  anim(performance.now());

  pc.cleanup = function() {
    document.removeEventListener('mousedown', onMD);
    document.removeEventListener('mousemove', onMM);
    document.removeEventListener('keydown', onKD);
    document.removeEventListener('keyup', onKU);
    document.removeEventListener('contextmenu', onCX);
    ['pcoin-timer','pcoin-score'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.parentNode.removeChild(el);
    });
  };
}

// ========== PARTY: MEMORY MATCH ==========
var _pmem = {};

function launchPartyMemoryMatch(){
  var pm = _pmem;
  var cv = document.createElement('canvas');
  cv.id = 'pmem-canvas';
  cv.width = 800; cv.height = 600;
  cv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:6;max-width:100vw;max-height:100vh;cursor:pointer;';
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');

  if(!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
      if(r===undefined)r=0;
      this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.quadraticCurveTo(x+w,y,x+w,y+r);
      this.lineTo(x+w,y+h-r);this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      this.lineTo(x+r,y+h);this.quadraticCurveTo(x,y+h,x,y+h-r);
      this.lineTo(x,y+r);this.quadraticCurveTo(x,y,x+r,y);this.closePath();
      return this;
    };
  }

  var vals=[1,1,2,2,3,3,4,4];
  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  shuffle(vals);
  var cW=80,cH=100,gap=20,cols=4,rows=2;
  var sX=(800-cols*(cW+gap)-gap)/2,sY=(600-rows*(cH+gap)-gap)/2+30;
  var positions=[];
  for(var i=0;i<8;i++){var col=i%cols,row=Math.floor(i/cols);positions.push({x:sX+col*(cW+gap),y:sY+row*(cH+gap)});}
  pm.cards=[];
  for(var i=0;i<8;i++){pm.cards.push({value:vals[i],x:positions[i].x,y:positions[i].y,w:cW,h:cH,faceUp:true,matched:false});}
  pm.matched=0; pm.mistakes=0; pm.targetNum=0; pm.running=true; pm.ended=false; pm.canClick=false;
  pm.memorizeTimer=5; pm.memorizePhase=true; pm.foundThisRound=0; pm.totalFlips=0; pm.maxFlips=15;

  function pickTarget(){
    var seen={},uniq=[];
    for(var i=0;i<pm.cards.length;i++)if(!pm.cards[i].matched&&!seen[pm.cards[i].value]){seen[pm.cards[i].value]=true;uniq.push(pm.cards[i].value);}
    if(uniq.length===0)return;
    pm.targetNum=uniq[Math.floor(Math.random()*uniq.length)];
    pm.foundThisRound=0;
  }

  function draw(){
    ctx.clearRect(0,0,800,600);
    // Sky
    var g=ctx.createLinearGradient(0,0,0,600);g.addColorStop(0,'#1a1a3e');g.addColorStop(1,'#2a2a4e');
    ctx.fillStyle=g;ctx.fillRect(0,0,800,600);
    // House body
    ctx.fillStyle='#4a4a6a';ctx.strokeStyle='#333355';ctx.lineWidth=2;
    ctx.fillRect(100,200,600,350);ctx.strokeRect(100,200,600,350);
    // Roof
    ctx.beginPath();ctx.moveTo(50,200);ctx.lineTo(400,100);ctx.lineTo(750,200);ctx.closePath();
    ctx.fillStyle='#663333';ctx.strokeStyle='#442222';ctx.fill();ctx.stroke();
    // Windows
    ctx.fillStyle='#6688aa';ctx.strokeStyle='#555577';
    ctx.fillRect(160,250,100,80);ctx.strokeRect(160,250,100,80);
    ctx.fillRect(540,250,100,80);ctx.strokeRect(540,250,100,80);
    ctx.beginPath();ctx.moveTo(210,250);ctx.lineTo(210,330);ctx.stroke();
    ctx.moveTo(160,290);ctx.lineTo(260,290);ctx.stroke();
    ctx.moveTo(590,250);ctx.lineTo(590,330);ctx.stroke();
    ctx.moveTo(540,290);ctx.lineTo(640,290);ctx.stroke();
    // Door
    ctx.fillStyle='#554433';ctx.strokeStyle='#443322';
    ctx.fillRect(365,400,70,150);ctx.strokeRect(365,400,70,150);
    ctx.beginPath();ctx.arc(370,475,4,0,Math.PI*2);ctx.fillStyle='#ffcc44';ctx.fill();
    // Chimney
    ctx.fillStyle='#555577';ctx.fillRect(550,110,50,90);ctx.strokeRect(550,110,50,90);
    // Ground
    ctx.fillStyle='#2a3a2a';ctx.fillRect(0,540,800,60);

    ctx.textAlign='center';ctx.textBaseline='top';
    if(pm.memorizePhase){
      ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='bold 24px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.shadowColor='rgba(255,255,255,.3)';ctx.shadowBlur=15;
      ctx.fillText('\u23F3 \u8A18\u4F4F\u724C\u7684\u4F4D\u7F6E\uFF01',400,20);
      ctx.font='bold 48px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.fillStyle='#fd0';ctx.shadowColor='rgba(255,200,0,.4)';ctx.shadowBlur=25;
      ctx.fillText(Math.ceil(pm.memorizeTimer),400,55);
      ctx.shadowBlur=0;
    } else {
      ctx.fillStyle='#fd0';ctx.font='bold 36px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.shadowColor='rgba(255,200,0,.3)';ctx.shadowBlur=20;
      ctx.fillText('\u627E\u51FA  '+pm.targetNum,400,20);
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='18px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.textAlign='left';ctx.fillText('\u2705 '+pm.matched+' / 4',30,555);
      ctx.textAlign='right';ctx.fillText('\u274C '+pm.mistakes+'  \u2191 '+pm.totalFlips+'/'+pm.maxFlips,770,555);
    }

    for(var i=0;i<pm.cards.length;i++){
      var c=pm.cards[i];
      if(c.matched)continue;
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.roundRect(c.x-2,c.y-2,c.w+4,c.h+4,8);ctx.fill();
      if(c.faceUp){
        ctx.fillStyle='#f5f0e0';ctx.beginPath();ctx.roundRect(c.x,c.y,c.w,c.h,8);ctx.fill();
        ctx.strokeStyle='#ccaa44';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(c.x,c.y,c.w,c.h,8);ctx.stroke();
        ctx.fillStyle='#333';ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(c.value,c.x+c.w/2,c.y+c.h/2);
      } else {
        var grad=ctx.createLinearGradient(c.x,c.y,c.x+c.w,c.y);
        grad.addColorStop(0,'#4444aa');grad.addColorStop(0.5,'#5555cc');grad.addColorStop(1,'#4444aa');
        ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(c.x,c.y,c.w,c.h,8);ctx.fill();
        ctx.strokeStyle='#6666dd';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(c.x,c.y,c.w,c.h,8);ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.15)';ctx.font='28px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('?',c.x+c.w/2,c.y+c.h/2);
      }
    }
  }

  function flipCard(idx){
    if(!pm.canClick||!pm.running||pm.ended||pm.memorizePhase)return;
    var c=pm.cards[idx];
    if(c.matched||c.faceUp)return;
    pm.totalFlips++;
    if(pm.totalFlips>pm.maxFlips){pm.canClick=false;setTimeout(function(){endGame(false);},200);return;}
    c.faceUp=true; pm.canClick=false;

    if(c.value===pm.targetNum){
      pm.foundThisRound++;
      if(pm.foundThisRound>=2){
        setTimeout(function(){
          for(var i=0;i<pm.cards.length;i++){if(!pm.cards[i].matched&&pm.cards[i].value===pm.targetNum)pm.cards[i].matched=true;}
          pm.matched++;
          for(var j=0;j<_partyPlayers.length;j++){if(_partyPlayers[j].id===0){_partyPlayers[j].score=pm.matched;break;}}
          updatePartyScoreboard();
          if(pm.matched>=4){endGame(true);return;}
          pickTarget();pm.canClick=true;draw();
        },400);
      } else {
        setTimeout(function(){pm.canClick=true;draw();},200);
      }
    } else {
      pm.mistakes++;
      setTimeout(function(){c.faceUp=false;pm.canClick=true;draw();},600);
    }
    draw();
  }

  function endGame(won){
    pm.ended=true; pm.running=false;
    addXP(10+pm.matched);
    alert((won?'\u2764\uFE0F \u5168\u90E8\u5339\u914D\uFF01':'💀 \u6B21\u6578\u7528\u76E1...')+'  \u7FFB\u724C: '+pm.totalFlips+'/'+pm.maxFlips+'  \u932F\u8AA4: '+pm.mistakes+'\u6B21');
    stopPartyGame();
  }

  cv.addEventListener('click',function(e){
    var rect=cv.getBoundingClientRect();
    var mx=(e.clientX-rect.left)*(800/rect.width);
    var my=(e.clientY-rect.top)*(600/rect.height);
    for(var i=0;i<pm.cards.length;i++){
      var c=pm.cards[i];
      if(mx>=c.x&&mx<=c.x+c.w&&my>=c.y&&my<=c.y+c.h){flipCard(i);break;}
    }
  });
  cv.addEventListener('contextmenu',function(e){e.preventDefault();});

  draw();

  var lastTime=performance.now();
  function anim(t){
    requestAnimationFrame(anim);
    var dt=Math.min((t-lastTime)/1000,0.05);lastTime=t;
    if(pm.memorizePhase&&pm.running){
      pm.memorizeTimer-=dt;
      if(pm.memorizeTimer<=0){
        pm.memorizePhase=false;
        for(var i=0;i<pm.cards.length;i++)pm.cards[i].faceUp=false;
        pickTarget();
        pm.canClick=true;
      }
      draw();
    }
  }
  anim(performance.now());

  pm.cleanup = function(){
    var el=document.getElementById('pmem-canvas');
    if(el)el.parentNode.removeChild(el);
  };
}

var _origStop = stopPartyGame;
stopPartyGame = function(){if(_pts.cleanup)_pts.cleanup();if(_pbat.cleanup)_pbat.cleanup();if(_pcoin.cleanup)_pcoin.cleanup();if(_pmem.cleanup)_pmem.cleanup();_origStop();};

window.showPartyCountSelect = showPartyCountSelect;
window.startPartyGame = startPartyGame;
window.cancelParty = cancelParty;
window.stopPartyGame = stopPartyGame;

// ========== 未鑑定小黃石帳戶層（localStorage oc_us_list）+ 難度入口 ==========
(function(){
  var US_KEY = 'oc_us_list';
  function load(){ try { return JSON.parse(localStorage.getItem(US_KEY)||'[]'); } catch(e){ return []; } }
  function saveList(list){ localStorage.setItem(US_KEY, JSON.stringify(list)); }
  window.US = {
    list: load(),
    refresh: function(){ this.list = load(); return this.list; },
    save: function(){ saveList(this.list); this.refreshHub(); },
    pending: function(){ return this.list.filter(function(r){return r.st==='PENDING_OPEN';}); },
    revealed: function(){ return this.list.filter(function(r){return r.st==='REVEALED';}); },
    collected: function(){ return this.list.filter(function(r){return r.st==='COLLECTED';}); },
    addPending: function(id){
      if (!id) return false;
      this.refresh();
      if (this.list.some(function(r){return r.id===id;})) return false; // 防重複
      this.list.push({ id:id, st:'PENDING_OPEN', ts:Date.now() });
      this.save();
      return true;
    },
    open: function(id){
      this.refresh();
      var r = this.list.find(function(x){return x.id===id;});
      if (!r || r.st!=='PENDING_OPEN') return null; // 只能開啟一次
      r.roll = rollCrystal();
      r.st = 'REVEALED';
      r.ts = Date.now();
      this.save();
      return r.roll;
    },
    collect: function(id){
      this.refresh();
      var r = this.list.find(function(x){return x.id===id;});
      if (!r || r.st!=='REVEALED') return false;
      r.st = 'COLLECTED'; r.ts = Date.now();
      this.save();
      return true;
    },
    sell: function(id){
      this.refresh();
      var idx = -1;
      for (var i=0;i<this.list.length;i++){ if (this.list[i].id===id){ idx=i; break; } }
      if (idx === -1) return 0;
      var r = this.list[idx];
      if (r.st === 'PENDING_OPEN') return 0; // 未開啟不可出售
      var value = (r.roll && r.roll.value) || 0;
      this.list.splice(idx,1);
      var coins = parseInt(localStorage.getItem('oc_coin')||'0',10) + value;
      localStorage.setItem('oc_coin', coins.toString());
      this.save();
      return value;
    },
    refreshHub: function(){
      var p = document.getElementById('mm-us-pending');
      var c = document.getElementById('mm-us-collected');
      var pn = this.pending().length, cn = this.collected().length;
      if (p) p.textContent = '🟡 未開啟的小黃石（' + pn + '）';
      if (c) c.textContent = '💎 收藏小黃石（' + cn + '）';
      var mp = document.getElementById('mf-us-pending');
      var mc2 = document.getElementById('mf-us-collected');
      if (mp) mp.textContent = '🟡 未開啟（' + pn + '）';
      if (mc2) mc2.textContent = '💎 收藏（' + cn + '）';
      var mc = document.getElementById('menu-coins');
      if (mc) mc.textContent = localStorage.getItem('oc_coin')||'0';
    },
    openPending: function(){
      this.refresh();
      var el = document.getElementById('us-pending-overlay');
      var list = this.pending();
      var box = document.getElementById('us-pending-list');
      if (!box) return;
      box.innerHTML = list.length ? '' : '<div class="us-empty">尚無未開啟的小黃石 — 撤離前先到藍色破譯站解析！（未破譯就撤離會掉在撤離點）</div>';
      for (var i=0;i<list.length;i++){
        var r = list[i];
        var row = document.createElement('div');
        row.className = 'us-row';
        var when = '';
        try { when = ' · ' + new Date(r.ts).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch(e){}
        row.innerHTML = '<span class="us-id">🟡 未鑑定小黃石 #' + (i+1) + when + '</span><button class="us-btn" data-id="'+r.id+'">✨ 開啟</button>';
        box.appendChild(row);
      }
      var self = this;
      box.querySelectorAll('.us-btn').forEach(function(b){
        b.onclick = function(){ self.doOpen(b.dataset.id); };
      });
      if (el) el.style.display = 'flex';
    },
    doOpen: function(id){
      var roll = this.open(id);
      if (!roll){
        if (window._floatMsg) window._floatMsg('⚠ 無法開啟（可能已開啟過）','#f66');
        this.openPending();
        return;
      }
      var pe = document.getElementById('us-pending-overlay'); if (pe) pe.style.display='none';
      this._showReveal(id);
      this.refreshHub();
    },
    _showReveal: function(id){
      this.refresh();
      var r = null;
      for (var i=0;i<this.list.length;i++){ if (this.list[i].id===id){ r=this.list[i]; break; } }
      if (!r || r.st!=='REVEALED' || !r.roll) return false;
      var re = document.getElementById('us-reveal-overlay');
      if (!re) return false;
      document.getElementById('us-reveal-name').textContent = r.roll.name;
      document.getElementById('us-reveal-name').style.color = r.roll.color || '#ffd76a';
      document.getElementById('us-reveal-sub').textContent = r.roll.purity ? ('純度 ' + r.roll.purity + ' 級') : '';
      document.getElementById('us-reveal-value').textContent = '💰 ' + r.roll.value;
      re.dataset.id = id;
      re.style.display = 'flex';
      return true;
    },
    openCollection: function(){
      this.refresh();
      var el = document.getElementById('us-collection-overlay');
      var list = this.collected();
      var box = document.getElementById('us-collection-list');
      if (!box) return;
      box.innerHTML = list.length ? '' : '<div class="us-empty">收藏空空如也 — 開啟小黃石後按「加入收藏」。</div>';
      var self = this;
      for (var i=0;i<list.length;i++){
        var r = list[i];
        var row = document.createElement('div');
        row.className = 'us-row';
        row.innerHTML = '<span class="us-id" style="color:'+(r.roll?r.roll.color:'#fff')+'">💎 '+(r.roll?r.roll.name:r.id)+'</span>'+
          '<span class="us-val">💰 '+(r.roll?r.roll.value:0)+'</span>'+
          '<button class="us-btn us-sell" data-id="'+r.id+'">出售</button>';
        box.appendChild(row);
      }
      box.querySelectorAll('.us-sell').forEach(function(b){
        b.onclick = function(){ self.askSell(b.dataset.id, 'collection'); };
      });
      if (el) el.style.display='flex';
    },
    _sellId: null,
    _sellFrom: null,
    askSell: function(id, from){
      this.refresh();
      var r = null;
      for (var i=0;i<this.list.length;i++){ if (this.list[i].id===id){ r=this.list[i]; break; } }
      if (!r) return;
      this._sellId = id;
      this._sellFrom = from || 'collection';
      var el = document.getElementById('us-sell-confirm');
      if (!el){ this.confirmSell(); return; }
      document.getElementById('us-sell-name').textContent = (r.roll?r.roll.name:'未鑑定小黃石');
      document.getElementById('us-sell-value').textContent = (r.roll?r.roll.value:0);
      el.style.display='flex';
    },
    cancelSell: function(){
      var el = document.getElementById('us-sell-confirm'); if (el) el.style.display='none';
      var from = this._sellFrom || 'collection';
      var id = this._sellId;
      this._sellFrom = null; this._sellId = null;
      if (from==='reveal' && id && this._showReveal(id)) return;   // 回到揭示頁
      if (from==='collection'){ this.openCollection(); return; }   // 回到收藏頁
      this.openPending();
    },
    confirmSell: function(){
      var from = this._sellFrom || 'collection';
      var id = this._sellId;
      var v = this.sell(this._sellId);
      var el = document.getElementById('us-sell-confirm'); if (el) el.style.display='none';
      this._sellId = null; this._sellFrom = null;
      if (v>0){
        if (window._floatMsg) window._floatMsg('🪙 出售成功 +'+v,'#ffd76a');
        this.openCollection();   // 出售成功 → 回收藏頁看餘額變化
      } else {
        if (from==='reveal' && this._showReveal(id)) {} else if (from==='collection'){ this.openCollection(); } else { this.openPending(); }
      }
      this.refreshHub();
    },
    closeAll: function(){
      ['us-pending-overlay','us-reveal-overlay','us-collection-overlay','us-sell-confirm'].forEach(function(id){
        var el = document.getElementById(id); if (el) el.style.display='none';
      });
    }
  };
  window.US.refreshHub();

  // 揭示 overlay 按鈕
  window.usRevealCollect = function(){
    var re = document.getElementById('us-reveal-overlay'); if(!re) return;
    window.US.collect(re.dataset.id);
    re.style.display='none';
    if (window._floatMsg) window._floatMsg('💎 已加入收藏');
    window.US.refreshHub();
    window.US.openCollection();
  };
  window.usRevealSell = function(){
    var re = document.getElementById('us-reveal-overlay'); if(!re) return;
    var id = re.dataset.id;
    re.style.display='none';
    window.US.askSell(id, 'reveal');
  };

  // 摸金樞紐按鈕（事件委派，避免 DOM 時序問題；用 closest 兼容按鈕內的 span 子元素）
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#mm-us-pending') || t.closest('#mf-us-pending') || t.closest('#us-menu-btn')){ window.US.openPending(); }
    else if (t.closest('#mm-us-collected') || t.closest('#mf-us-collected')){ window.US.openCollection(); }
  });

  // GO 直接開始匹配（難度用 mf-panel 選的，沒選預設普通）
  window._extRequestStart = function(){
    window._extDiffMode = window._extDiffSelected || window._extDiffMode || 'normal';
    startExtractionMatchmaking();
  };
})();
// 版本標記：HTML 引用的版本（從自己的 script src 讀）；看不到這行 = 舊版沒載入
console.log('%c[ext] extraction.js 已載入 HTML版=' + (document.querySelector('script[src*="extraction.js"]').src.match(/v=([a-z0-9]+)/)||[,'無'])[1] + ' US=' + (typeof window.US), 'color:#b882e0;font-weight:bold');
