

// ========== EXTRACTION MODE (embedded) ==========
let _extRAF = null;
let _extActive = false;


// ========== EXTRACTION MATCHMAKING ==========
let _extMMActive = false, _extMMTimer = null, _extMMStart = 0, _extMMCanceled = false, _extMMWs = null;

function startExtractionMatchmaking() {
  if (_extMMActive) return;
  _extMMActive = true; _extMMCanceled = false; _extMMStart = Date.now();
  var ind = document.getElementById('ext-mm-indicator');
  if (ind) ind.style.display = 'flex';
  updateExtMMDisplay();
  var wsUrl = (window.location.protocol==='https:'?'wss://':'ws://') + (window.location.hostname||'localhost') + ':3000';
  try {
    _extMMWs = new WebSocket(wsUrl);
    _extMMWs.onopen = function() {
      _extMMWs.send(JSON.stringify({ type: 'join_extraction_queue', name: localStorage.getItem('oc_nickname') || 'Player' }));
    };
    _extMMWs.onmessage = function(e) {
      try {
        var m = JSON.parse(e.data);
        if (m.type === 'extraction_match_found') { clearTimeout(_extMMTimer); finishExtMM(true, m); }
      } catch(er) {}
    };
  } catch(e) {}
  _extMMTimer = setTimeout(function() { finishExtMM(false, null); }, 50000);
}

function updateExtMMDisplay() {
  var ind = document.getElementById('ext-mm-indicator');
  if (!ind) return;
  var elapsed = Math.floor((Date.now() - _extMMStart) / 1000);
  var remain = Math.max(0, 50 - elapsed);
  var timeEl = document.getElementById('ext-mm-count');
  if (timeEl) timeEl.textContent = remain;
  if (remain > 0 && _extMMActive && !_extMMCanceled) setTimeout(updateExtMMDisplay, 500);
}

function cancelExtMM() {
  _extMMActive = false; _extMMCanceled = true;
  clearTimeout(_extMMTimer);
  if (_extMMWs) { try { _extMMWs.close(); } catch(e) {} _extMMWs = null; }
  var ind = document.getElementById('ext-mm-indicator');
  if (ind) ind.style.display = 'none';
  updateMMUI(); // Restore extraction matchmaking button text if visible
}

function finishExtMM(matched, msg) {
  if (!_extMMActive || _extMMCanceled) return;
  _extMMActive = false;
  clearTimeout(_extMMTimer);
  var ind = document.getElementById('ext-mm-indicator');
  if (ind) ind.style.display = 'none';
  if (_extMMWs) { try { _extMMWs.close(); } catch(e) {} _extMMWs = null; }
  
  // Build match data
  var players = {};
  var myId = 0, aiCount = 0;
  if (matched && msg && msg.players) {
    for (var i = 0; i < msg.players.length; i++) {
      players[msg.players[i].id] = msg.players[i];
      if (msg.players[i].id === msg.yourId) myId = i;
    }
  }
  // Fill missing slots with AI
  var curCount = Object.keys(players).length;
  var aiNames = ['Alpha','Bravo','Charlie','Delta','Echo'];
  for (var i = curCount; i < 5; i++) {
    var aiId = 999 + i;
    players[aiId] = { id: aiId, name: 'AI ' + (aiNames[i] || 'Bot'+(i-2)), ai: true };
    aiCount++;
  }
  
  // Launch or update extraction mode
  window._extMatchData = { matched: matched, myPlayerId: myId, players: players, aiCount: aiCount };
  if (_extActive) {
    // Already running — clear 50s timeout, spawn AI, launch game
    if (_extMMTimer) clearTimeout(_extMMTimer);
    if (window._extLaunchTimer) { clearTimeout(window._extLaunchTimer); window._extLaunchTimer = null; }
    if (window._extCountdownInterval) { clearInterval(window._extCountdownInterval); window._extCountdownInterval = null; }
    spawnAIPlayers(aiCount);
    launchExtractionGame();
  } else {
    startExtractionMode();
  }
}

function startExtractionMode(useMultiplayer, mpSpawn) {
  if (_extActive) return;
  _extActive = true;

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
// If match data has AI count, spawn AI player bots
if (extAiPlayerCount > 0) {
setTimeout(function() { spawnAIPlayers(extAiPlayerCount); }, 100);
}

  // ---- ALL EXTRACTION CODE (scoped inside this function) ----

// ============ GAME STATE ============
const STATE = { LOADING:0, ARRIVAL:1, DEPLOYED:2, EXTRACTING:3, RESULTS:4 };
let gameState = STATE.LOADING;
let matchTime = 15 * 60; // 15 minutes
let extractTimer = 0;
let isExtracting = false;
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
  { name:'巡邏兵', health:40, speed:3, damage:3,  color:0xcc4444, detectRange:35, attackRange:18, attackCooldown:1.8, reward:10 },
  { name:'突擊兵', health:60, speed:5, damage:5, color:0xdd3333, detectRange:45, attackRange:22, attackCooldown:1.2, reward:20 },
  { name:'狙擊手', health:30, speed:2, damage:8, color:0xcc5544, detectRange:60, attackRange:40, attackCooldown:2.5, reward:30 },
  { name:'精英衛兵', health:80, speed:4, damage:6, color:0xbb3344, detectRange:50, attackRange:20, attackCooldown:1.0, reward:40 },
];
const BOT_SPAWNS = [
  { x:115, z:145, type:3 }, { x:125, z:155, type:1 }, { x:108, z:138, type:0 },
  { x:205, z:85, type:1 }, { x:215, z:95, type:0 }, { x:212, z:78, type:2 },
  { x:55, z:225, type:0 }, { x:65, z:235, type:1 }, { x:62, z:218, type:2 },
  { x:175, z:195, type:0 }, { x:185, z:205, type:1 },
  { x:255, z:165, type:1 }, { x:265, z:175, type:0 },
  { x:140, z:80, type:0 }, { x:80, z:180, type:1 },
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
          if(Math.random()<0.6){var dmg=10+Math.floor(Math.random()*10);if(ai.target.type){ai.target.health-=dmg;if(ai.target.health<=0&&typeof killBot==='function')killBot(ai.target);}else if(ai.target===nearestEnemy&&nearestEnemy){nearestEnemy.health-=dmg;if(nearestEnemy.health<=0&&typeof killBot==='function')killBot(nearestEnemy);}
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
const WS_URL = (window.location.protocol==='https:'?'wss://':'ws://') + WS_HOST + ':3000';
let ws = null;
let mmState = 'idle'; // idle, connecting, in_queue, matched, in_game
let mmName = '玩家' + Math.floor(Math.random()*9000+1000);
let matchPlayers = [];
let myPlayerId = 0;
let matchSpawn = null;
let stateSyncTimer = 0;
const STATE_SYNC_INTERVAL = 0.1; // 100ms

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
      // Start game with server-assigned spawn
      setTimeout(() => {
        launchExtractionGame();
        initRemotePlayers();
        setTimeout(() => {
          try { renderer.domElement.requestPointerLock(); } catch(e) {}
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
      // Visual feedback: flash at shooter position
      if (remotePlayers[msg.playerId] && remotePlayers[msg.playerId].mesh) {
        const flash = new THREE.PointLight(0xffaa44, 1, 5);
        flash.position.copy(remotePlayers[msg.playerId].mesh.position);
        flash.position.y += 0.6;
        scene.add(flash);
        setTimeout(() => scene.remove(flash), 80);
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
    case 'remote_extraction_start':
      if (remotePlayers[msg.playerId]) {
        remotePlayers[msg.playerId].state = 'extracting';
        showHUD(`🚁 ${matchPlayers[msg.playerId] ? matchPlayers[msg.playerId].name : '玩家'} 正在撤離`);
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

function sendExtractionState() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (gameState !== STATE.DEPLOYED && gameState !== STATE.EXTRACTING) return;
  ws.send(JSON.stringify({
    type: 'extraction_state',
    pos: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
    yaw, pitch, health: playerHealth, state: gameState === STATE.EXTRACTING ? 'extracting' : 'alive'
  }));
}

function sendExtractionMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
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
    scene.add(g);
    remotePlayers[p.id] = {
      pos: new THREE.Vector3(0, 0, 0),
      targetPos: null,
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
  { x:45, z:270, name:'森林營地' },
  { x:85, z:50, name:'南側廢墟' },
  { x:270, z:80, name:'東側倉庫' },
  { x:40, z:70, name:'西側沼澤' },
  { x:270, z:260, name:'東北高台' },
];
const EXFIL_POS = { x:260, z:170 };
let playerSpawnIdx = -1;

// ============ SAFES & DOORS ============
let safes = [];
let doors = [];
let activeSafe = null;

function initSafes() {
  const safePositions = [
    { x:120, z:150, name:'指揮部保險箱', zone:'MilitaryBase', rarity:2 },
    { x:124, z:147, name:'軍官保險箱', zone:'MilitaryBase', rarity:1 },
    { x:120, z:140, name:'軍械庫保險箱', zone:'MilitaryBase', rarity:2 },
    { x:210, z:90, name:'倉庫保險箱', zone:'StorageArea', rarity:1 },
    { x:207, z:93, name:'特殊材料櫃', zone:'StorageArea', rarity:2 },
    { x:60, z:234, name:'雷達站保險箱', zone:'RadarStation', rarity:2 },
    { x:60, z:230, name:'雷達核心保險箱', zone:'RadarStation', rarity:3 },
    { x:175, z:207, name:'民居保險箱', zone:'Settlement', rarity:1 },
    { x:180, z:210, name:'教堂保險箱', zone:'Settlement', rarity:2 },
    { x:258, z:166, name:'直升機備用箱', zone:'Helipad', rarity:2 },
    { x:260, z:170, name:'飛行記錄器', zone:'Helipad', rarity:3 },
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
  maybeSpawnRainbowVault();
}

function maybeSpawnRainbowVault() {
  if (Math.random() >= 0.25) return;
  const houseSpots = [
    {x:120, z:150}, {x:124, z:147}, {x:120, z:140},
    {x:210, z:90}, {x:207, z:93},
    {x:60, z:234}, {x:60, z:230},
    {x:175, z:207}, {x:180, z:210},
    {x:258, z:166}, {x:260, z:170},
  ];
  const order = houseSpots.slice().sort(() => Math.random() - 0.5);
  let x = 0, z = 0, ok = false;
  for (const hs of order) {
    for (let attempt = 0; attempt < 12 && !ok; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * 4;
      x = hs.x + Math.cos(ang) * dist;
      z = hs.z + Math.sin(ang) * dist;
      const y = terrainY(x, z);
      if (y > 8) continue;
      let bad = false;
      for (const c of colliders) {
        const hw = c.w / 2, hd = c.d / 2;
        if (x > c.x - hw - 0.6 && x < c.x + hw + 0.6 && z > c.z - hd - 0.6 && z < c.z + hd + 0.6) { bad = true; break; }
      }
      if (bad) continue;
      for (const s of safes) {
        if (Math.sqrt((x - s.x) * (x - s.x) + (z - s.z) * (z - s.z)) < 4) { bad = true; break; }
      }
      if (bad) continue;
      ok = true;
    }
    if (ok) break;
  }
  if (!ok) return;
  safes.push({
    x, z, name:'虹晶保險庫', zone:'??', rarity:4, isRainbow:true,
    opened:false, loot: generateCrystalLoot(), mesh:null, lidMesh:null, interactDist:2.5
  });
  rainbowVaultActive = true;
}

function initDoors() {
  const doorPositions = [
    // Zone 1 - Military Base
    { x:120, z:155, name:'指揮部大門' },
    { x:120, z:142.5, name:'指揮部後門' },
    { x:106, z:161, name:'指揮部側門' },
    { x:134, z:161, name:'東側偏門' },
    { x:138, z:147.5, name:'東側倉庫門' },
    { x:102, z:148, name:'西側小門' },
    { x:120, z:167.5, name:'北部大門' },
    // Zone 2 - Storage
    { x:210, z:96, name:'倉庫大門' },
    { x:196, z:102, name:'倉庫西門' },
    { x:224, z:87, name:'倉庫東門' },
    { x:200, z:84.5, name:'倉庫後門' },
    { x:210, z:80.5, name:'倉庫南門' },
    // Zone 3 - Radar
    { x:68, z:239, name:'雷達站大門' },
    { x:52, z:237.5, name:'雷達站西門' },
    { x:60, z:224.5, name:'發電機房門' },
    { x:72, z:226.75, name:'雷達站工具間' },
    // Zone 4 - Settlement
    { x:174, z:200.5, name:'定居點西門' },
    { x:186, z:198.5, name:'定居點東門' },
    { x:175, z:209.25, name:'定居點北門' },
    { x:185, z:208.25, name:'定居點東北門' },
    { x:188, z:202.5, name:'定居點東中大門' },
    { x:180, z:193.5, name:'定居點大門' },
    { x:180, z:213, name:'定居點教堂門' },
    // Helipad
    { x:270, z:178, name:'機庫大門' },
    { x:252, z:178, name:'機庫側門' },
    { x:266, z:166, name:'機庫倉庫門' },
  ];
  for (const dp of doorPositions) {
    doors.push({
      ...dp,
      open: false,
      mesh: null,
      interactDist: 2.5,
      angle: 0
    });
  }
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

// ============ 虹晶階級系統 ============
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
function generateCrystalLoot() {
  const count = 1 + Math.floor(Math.random() * 2);
  const arr = [];
  for (let i=0; i<count; i++) arr.push(rollCrystal());
  return arr;
}

// ============ 虹晶奪取事件 ============
let rainbowVaultActive = false;
let crystalCarrier = null;
let carrierCrystal = null;
let decryptStation = null;
let decryptStationMesh = null;
let decryptBeam = null;
let decryptActive = false;
let decryptTime = 0;
let decryptTimer = null;
const DECRYPT_DURATION = 120;

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

function startCrystalCarry() {
  if (crystalCarrier) return;
  crystalCarrier = 0;
  showAnnounce('⚠️ 有人拿到了虹晶保險庫，趕快阻止他們！', 'rgba(255,120,60,.6)');
  spawnDecryptStation();
}

function spawnDecryptStation() {
  if (decryptStation) return;
  const spots = [
    {x:120, z:150}, {x:210, z:90}, {x:60, z:230}, {x:180, z:200}, {x:260, z:170},
    {x:85, z:50}, {x:270, z:80}, {x:40, z:70}, {x:270, z:260}, {x:45, z:270}, {x:150, z:150},
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
  const base = new THREE.Mesh(geoBox, M(0x225533));
  base.scale.set(1.2, 0.12, 1.2);
  base.position.set(0, 0.06, 0);
  g.add(base);
  const core = new THREE.Mesh(geoBox, M(0x33bb55, {emissive:0x22aa44, emissiveIntensity:0.6, metalness:0.5, roughness:0.3}));
  core.scale.set(0.7, 0.9, 0.7);
  core.position.set(0, 0.45, 0);
  g.add(core);
  const screen = new THREE.Mesh(geoBox, M(0x11ff66, {emissive:0x00ff88, emissiveIntensity:0.9}));
  screen.scale.set(0.5, 0.3, 0.06);
  screen.position.set(0, 0.55, 0.36);
  g.add(screen);
  const light = new THREE.PointLight(0x22ff66, 0.9, 8);
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
      decryptStation.light.color.setHSL(0.37, 1, 0.5);
    }
  }
  if (decryptStationMesh.children[2]) {
    decryptStationMesh.children[2].material.color.setHSL(0.37, 1, 0.5);
  }
  if (decryptActive && decryptBeam) {
    decryptBeam.material.opacity = 0.2 + Math.sin(Date.now() * 0.006) * 0.12;
    decryptBeam.rotation.y += dt * 1.2;
  }
}

function startDecrypt() {
  if (!decryptStation) return;
  decryptActive = true;
  decryptTime = DECRYPT_DURATION;
  showAnnounce('🔓 破譯開始！請守住破譯站 2 分鐘', 'rgba(60,255,140,.6)');
  const beamGeo = new THREE.CylinderGeometry(0.25, 0.55, 18, 10, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({color:0x22ff66, transparent:true, opacity:0.22, side:THREE.DoubleSide, depthWrite:false});
  decryptBeam = new THREE.Mesh(beamGeo, beamMat);
  decryptBeam.position.set(decryptStation.x, terrainY(decryptStation.x, decryptStation.z) + 9, decryptStation.z);
  scene.add(decryptBeam);
}

function finishDecrypt() {
  decryptActive = false;
  if (decryptBeam) { scene.remove(decryptBeam); decryptBeam = null; }
  if (carrierCrystal) {
    const c = carrierCrystal;
    showAnnounce(`✅ 破譯完成！獲得 ${c.name} (+${c.value}💰)`, 'rgba(80,255,180,.7)');
    const coins = parseInt(localStorage.getItem('oc_coin') || '0') + c.value;
    localStorage.setItem('oc_coin', coins.toString());
    const ci = collectedItems.indexOf(c);
    if (ci !== -1) {
      collectedItems.splice(ci, 1);
      collectedCount--;
      totalLootValue -= c.value;
    }
    updateBackpackUI();
    carrierCrystal = null;
  }
  crystalCarrier = null;
  if (decryptStationMesh) { scene.remove(decryptStationMesh); decryptStationMesh = null; }
  decryptStation = null;
  rainbowVaultActive = false;
  if (decryptTimer) { clearInterval(decryptTimer); decryptTimer = null; }
  const remain = document.getElementById('extraction-status');
  if (remain) { remain.style.display = 'none'; remain.textContent = ''; }
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
  var bt = window.barrelTips ? window.barrelTips[type] : null;
  if (bt) extGunGroup.userData.barrelTip.copy(bt);
  // Magazine
  if (type!=='knife'&&type!=='grapple'&&type!=='grenade') {
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

const M = (c,o) => new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}));
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
const geoCyl = new THREE.CylinderGeometry(0.5,0.5,1,8);
const geoSphere = new THREE.SphereGeometry(0.5,8,6);

function rng(seed) { let s=seed; return ()=> { s=(s*9301+49297)%233280; return s/233280; }; }
const rand = rng(42);
function randRange(min,max) { return min+rand()*(max-min); }

// ============ TERRAIN ============
const T_SIZE = 300;
const T_SEG = 150;
const T_MAX_H = 20;
const HILL_COUNT = 18;

const hills = [];
for (let i=0; i<HILL_COUNT; i++) {
  const angle = i*137.5*Math.PI/180;
  const radius = 40 + (i*27%110);
  const cx = T_SIZE/2 + Math.cos(angle)*radius;
  const cz = T_SIZE/2 + Math.sin(angle)*radius;
  hills.push({cx:Math.max(10,Math.min(T_SIZE-10,cx)),cz:Math.max(10,Math.min(T_SIZE-10,cz)),r:randRange(10,35),h:randRange(3,12)});
}

function getTerrainHeight(wx, wz) {
  let h = 0;
  for (const hill of hills) {
    const dx = wx-hill.cx, dz = wz-hill.cz;
    const dist = Math.sqrt(dx*dx+dz*dz);
    if (dist < hill.r) { const t=1-dist/hill.r; h+=Math.sin(t*Math.PI*0.5)*hill.h; }
  }
  const flats = [[120,150],[210,90],[60,230],[180,200],[260,170],[45,270]];
  for (const f of flats) {
    const dx = wx-f[0], dz = wz-f[1];
    const dist = Math.sqrt(dx*dx+dz*dz);
    if (dist<25) { const t=dist/25; h*=t*t*(3-2*t); }
  }
  const edge = Math.min(wx,wz,T_SIZE-wx,T_SIZE-wz)/15;
  h*=Math.min(1,edge);
  return Math.max(0,Math.min(T_MAX_H,h));
}
const terrainY = (x,z) => getTerrainHeight(x,z);

const terrainGeo = new THREE.PlaneGeometry(T_SIZE,T_SIZE,T_SEG,T_SEG);
terrainGeo.rotateX(-Math.PI/2);
const tpos = terrainGeo.attributes.position;
for (let i=0; i<tpos.count; i++) {
  const wx=tpos.getX(i)+T_SIZE/2, wz=tpos.getZ(i)+T_SIZE/2;
  tpos.setY(i,getTerrainHeight(wx,wz));
  tpos.setX(i,wx); tpos.setZ(i,wz);
}
tpos.needsUpdate = true;
terrainGeo.computeVertexNormals();
terrainGeo.computeBoundingSphere();
const terrain = new THREE.Mesh(terrainGeo, M(0x5a8a4a, {side:THREE.DoubleSide}));
scene.add(terrain);

const colliders = [];
function addCollider(x,y,z,w,h,d) { colliders.push({x,y,z,w,h,d}); }

// ============ BUILDINGS ============
const BLDG_COLORS = [0x66666a,0x595959,0x4d4d4d,0x6a6159,0x616168,0x6a6661,0x80736a,0x736b61,0x6a6a59,0x736b6a,0x8a7a4a,0x6a6b73,0x807a73,0x737378];
function buildBox(parent, x,y,z, sx,sy,sz, mat) {
  const m = new THREE.Mesh(geoBox, mat);
  m.scale.set(sx,sy,sz);
  m.position.set(x,y,z);
  if (parent) parent.add(m);
  return m;
}
function makeBuilding(px,py,pz, w,h,d, color, hasRoof) {
  const g = new THREE.Group();
  g.position.set(px,py,pz);
  scene.add(g);
  const mat = M(color);
  const wt=0.15, gap=1.0;
  // Back wall (full)
  buildBox(g,0,h/2,-d/2,w,h,wt,mat);
  addCollider(px,py+h/2,pz-d/2,w,h,wt);
  // Left wall
  buildBox(g,-w/2,h/2,0,wt,h,d,mat);
  addCollider(px-w/2,py+h/2,pz,wt,h,d);
  // Right wall
  buildBox(g,w/2,h/2,0,wt,h,d,mat);
  addCollider(px+w/2,py+h/2,pz,wt,h,d);
  // Front wall - left & right sections with door gap in middle
  const hw2=(w-gap)/2, hg=gap/2;
  buildBox(g,-hw2-hg,h/2,d/2,hw2,h,wt,mat);
  addCollider(px-hw2-hg,py+h/2,pz+d/2,hw2,h,wt);
  buildBox(g,hw2+hg,h/2,d/2,hw2,h,wt,mat);
  addCollider(px+hw2+hg,py+h/2,pz+d/2,hw2,h,wt);
  // Floor
  buildBox(g,0,0,0,w,wt,d,mConcrete);
  if (hasRoof!==false) {
    buildBox(g,0,h,0,w+0.4,0.08,d+0.4,mRoof);
    buildBox(g,randRange(-w*0.15,w*0.15),h+0.15,randRange(-d*0.15,d*0.15),1,0.3,0.7,M(0x4a4a4a));
  }
  // Rolling door covering the 1.0 gap
  if (gap > 0.6) {
    const rdMat = new THREE.MeshStandardMaterial({color:0x8899aa,metalness:0.6,roughness:0.3});
    buildBox(g,0,h/2,d/2+0.06,gap-0.1,h,0.06,rdMat);
    for (let i=0;i<7;i++) {
      const sy=(i+0.5)/7*h;
      buildBox(g,0,sy,d/2+0.09,gap-0.2,0.015,0.015,M(0x667788));
    }
    buildBox(g,-gap/2-0.02,h/2,d/2+0.05,0.04,h,0.08,M(0x556677));
    buildBox(g,gap/2+0.02,h/2,d/2+0.05,0.04,h,0.08,M(0x556677));
  }
  // Step
  buildBox(g,0,0.04,d/2+0.12,1.0,0.08,0.25,mConcrete);
  return g;
}
function buildBuilding(xx,zz, w,h,d,color,roof) {
  const yy = terrainY(xx,zz);
  makeBuilding(xx,yy,zz,w,h,d,color,roof);
}
function zoneFence(cx,cz,radius) {
  const hr=radius*0.75, posts=5;
  const corners=[[-hr,-hr],[hr,-hr],[hr,hr],[-hr,hr]];
  let avgY=0; for(const c of corners) avgY+=terrainY(cx+c[0],cz+c[1]); avgY/=4;
  const mat=M(0x4a4840);
  for(let s=0;s<4;s++) {
    const a=corners[s],b=corners[(s+1)%4];
    const sideLen=Math.sqrt((b[0]-a[0])**2+(b[1]-a[1])**2);
    for(let i=0;i<posts;i++) {
      const t=i/(posts-1), fx=a[0]+(b[0]-a[0])*t, fz=a[1]+(b[1]-a[1])*t;
      buildBox(scene,cx+fx,avgY+0.9,cz+fz,0.12,1.8,0.12,mat);
    }
    for(let i=0;i<posts-1;i++) {
      const t=(i+0.5)/posts, fx=a[0]+(b[0]-a[0])*t, fz=a[1]+(b[1]-a[1])*t;
      const segLen=sideLen/posts*0.85;
      for(const bh of[1.3,0.4]) buildBox(scene,cx+fx,avgY+bh,cz+fz,segLen,0.06,0.06,mat);
    }
  }
}
function regZone(cx,cz, bldgs) {
  for(const b of bldgs) buildBuilding(cx+b[0],cz+b[1], b[2],b[3],b[4], b[5], b[6]!==false);
  zoneFence(cx,cz,22);
}

// Zones
regZone(120,150, [[0,0,14,5,10,0x66666a],[-14,8,10,3.5,6,0x595959],[14,8,10,3.5,6,0x595959],[0,-10,8,3.5,5,0x4d4d4d],[18,-6,9,3.5,7,0x6a6159],[-18,-4,4,2.5,4,0x616168],[0,14,10,3,7,0x6a6661]]);
regZone(210,90, [[0,0,18,6,12,0x80736a],[-14,8,12,4,8,0x736b61],[14,-6,8,3,6,0x6a6a59],[-10,-8,6,2.5,5,0x736b6a],[0,-12,5,3,5,0x8a7a4a]]);
regZone(60,230, [[8,6,7,3.5,6,0x6a6b73],[-8,5,6,3,5,0x616168],[0,-8,5,2.5,5,0x595959],[12,-4,1.5,3.5,1.5,0x9999a8,false]]);
regZone(180,200, [[-6,-2,5,3,5,0x80736a],[6,-4,5,3,5,0x736b61],[-5,7,4.5,3,4.5,0x7a6e61],[5,6,4.5,3,4.5,0x6a6661],[8,0,6,3,5,0x6a6161],[0,-9,6,3,5,0x595959],[0,10,5,5,6,0x807a73]]);

// Helipad
(function(){
  const cx=260,cz=170;
  const hy=terrainY(cx,cz);
  buildBox(scene,cx,hy+0.07,cz,12,0.15,12,mConcrete);
  const hMat=M(0xffffff);
  buildBox(scene,cx-2,hy+0.1,cz,0.7,0.04,4.5,hMat);
  buildBox(scene,cx+2,hy+0.1,cz,0.7,0.04,4.5,hMat);
  buildBox(scene,cx,hy+0.1,cz,5,0.04,0.7,hMat);
  for(let i=0;i<20;i++) { const a=i*Math.PI*2/20; buildBox(scene,cx+Math.cos(a)*5.5,hy+0.1,cz+Math.sin(a)*5.5,0.25,0.04,0.25,hMat); }
  buildBuilding(cx+10,cz+4,10,4,8,0x6a6a6b);
  buildBuilding(cx-8,cz+6,4,6,4,0x737378);
  buildBuilding(cx+6,cz-6,5,2.5,4,0x59594a);
  zoneFence(cx,cz,18);
})();
// Exfil beam
const exfilBeamMat = new THREE.MeshBasicMaterial({ color:0x22ff44, transparent:true, opacity:0.25, depthWrite:false, side:THREE.DoubleSide });
const exfilBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.6,30,8), exfilBeamMat);
exfilBeam.position.set(EXFIL_POS.x, terrainY(EXFIL_POS.x,EXFIL_POS.z)+15, EXFIL_POS.z);
scene.add(exfilBeam);
const exfilGlow = new THREE.PointLight(0x22ff44, 0.5, 40);
exfilGlow.position.set(EXFIL_POS.x, terrainY(EXFIL_POS.x,EXFIL_POS.z)+2, EXFIL_POS.z);
scene.add(exfilGlow);

// Base walls
(function(){
  const cx=120,cz=150,hw=25,hz=22.5,wh=3.5;
  const wy=terrainY(cx,cz);
  buildBox(scene,cx-hw/2-6.5,wy+wh/2,cz-hz,24,wh,0.3,mConcrete);
  buildBox(scene,cx+hw/2+6.5,wy+wh/2,cz-hz,24,wh,0.3,mConcrete);
  buildBox(scene,cx-hw/2-6.5,wy+wh/2,cz+hz,24,wh,0.3,mConcrete);
  buildBox(scene,cx+hw/2+6.5,wy+wh/2,cz+hz,24,wh,0.3,mConcrete);
  buildBox(scene,cx+hw,wy+wh/2,cz,0.3,wh,hz*2,mConcrete);
  buildBox(scene,cx-hw,wy+wh/2,cz,0.3,wh,hz*2,mConcrete);
  for(const gz of[-hz,hz]) buildBox(scene,cx,wy+1.75,cz+gz,2.2,3.5,0.4,M(0x333333));
  // Barbed
  for(let i=0;i<6;i++) {
    const t=(i+0.5)/6, bx=cx-25+50*t, by=terrainY(bx,cz-hz-1.5);
    buildBox(scene,bx,by+0.1,cz-hz-1.5,1.2,0.2,0.4,mBarbed);
  }
})();

// Watchtowers
(function(){
  const c=[[120-25,150-22.5],[120+25,150-22.5],[120-25,150+22.5],[120+25,150+22.5]];
  for(const[wx,wz] of c) {
    const wy=terrainY(wx,wz), g=new THREE.Group(); g.position.set(wx,wy,wz); scene.add(g);
    for(let i=0;i<4;i++) buildBox(g,i%2===0?-0.7:0.7,2,i<2?-0.7:0.7,0.1,2,0.1,mPole);
    buildBox(g,0,4,0,1.8,0.12,1.8,M(0x595959));
  }
})();

// Roads
const roadPaths = [[[45,270],[120,150]],[[45,270],[180,200]],[[120,150],[210,90]],[[120,150],[60,230]],[[210,90],[180,200]],[[210,90],[260,170]],[[180,200],[60,230]],[[120,150],[260,170]]];
const ROAD_SEG=15;
for(const p of roadPaths) {
  const ax=p[0][0],az=p[0][1],bx=p[1][0],bz=p[1][1];
  const dx=bx-ax,dz=bz-az;
  const totalLen=Math.sqrt(dx*dx+dz*dz), nx=-dz/totalLen, nz=dx/totalLen;
  const segs=Math.max(5,Math.floor(totalLen/ROAD_SEG));
  for(let s=0;s<segs;s++) {
    const t0=s/segs,t1=(s+1)/segs;
    const mx=ax+dx*(t0+t1)/2, mz=az+dz*(t0+t1)/2;
    const sdx=dx/segs, sdz=dz/segs;
    const slen=totalLen/segs, ry=terrainY(mx,mz), roadY=Math.max(ry,0.03)+0.03;
    const angle=Math.atan2(sdx,sdz);
    const road=new THREE.Mesh(geoBox,mRoad); road.scale.set(4,0.08,slen); road.position.set(mx,roadY,mz); road.rotation.y=angle; scene.add(road);
    for(const side of[-1,1]) {
      const curb=new THREE.Mesh(geoBox,mCurb); curb.scale.set(0.1,0.15,slen); curb.position.set(mx+nx*side*2.05,roadY+0.04,mz+nz*side*2.05); curb.rotation.y=angle; scene.add(curb);
    }
  }
}

// Trees (instanced)
(function(){
  const isZone=(x,z)=>{for(const zc of[[120,150],[210,90],[60,230],[180,200],[260,170],[45,270]])if(Math.sqrt((x-zc[0])**2+(z-zc[1])**2)<25)return true; return false;};
  const nearRoad=(x,z)=>{for(const p of roadPaths){const ax=p[0][0],az=p[0][1],bx=p[1][0],bz=p[1][1],dx=bx-ax,dz=bz-az,lenSq=dx*dx+dz*dz;if(lenSq===0)continue;let t=((x-ax)*dx+(z-az)*dz)/lenSq;t=Math.max(0,Math.min(1,t));if(Math.sqrt((x-(ax+t*dx))**2+(z-(az+t*dz))**2)<3)return true;}return false;};
  const trunkGeo=new THREE.CylinderGeometry(0.08,0.12,1,5), canopyGeo=new THREE.SphereGeometry(0.5,6,5);
  const treePos=[], dummy=new THREE.Object3D();
  for(let i=0;i<60;i++){let tx,tz;do{tx=randRange(5,295);tz=randRange(5,295);}while(isZone(tx,tz)||nearRoad(tx,tz));treePos.push([tx,tz]);}
  const trunkMesh=new THREE.InstancedMesh(trunkGeo,mTrunk,treePos.length);
  const canopyMesh=new THREE.InstancedMesh(canopyGeo,mLeaves,treePos.length);
  for(let i=0;i<treePos.length;i++){const[tx,tz]=treePos[i],ty=terrainY(tx,tz),h=1.5+rand()*2,r=0.8+rand()*1.2;dummy.position.set(tx,ty+h/2,tz);dummy.scale.set(1,h,1);dummy.updateMatrix();trunkMesh.setMatrixAt(i,dummy.matrix);dummy.position.set(tx,ty+h+r*0.3,tz);dummy.scale.set(r,r*0.8,r);dummy.updateMatrix();canopyMesh.setMatrixAt(i,dummy.matrix);}
  trunkMesh.instanceMatrix.needsUpdate=true; canopyMesh.instanceMatrix.needsUpdate=true; scene.add(trunkMesh); scene.add(canopyMesh);
})();

// Rocks
(function(){
  const isZone=(x,z)=>{for(const zc of[[120,150],[210,90],[60,230],[180,200],[260,170],[45,270]])if(Math.sqrt((x-zc[0])**2+(z-zc[1])**2)<25)return true;return false;};
  const nearRoad=(x,z)=>{for(const p of roadPaths){const ax=p[0][0],az=p[0][1],bx=p[1][0],bz=p[1][1],dx=bx-ax,dz=bz-az,lenSq=dx*dx+dz*dz;if(lenSq===0)continue;let t=((x-ax)*dx+(z-az)*dz)/lenSq;t=Math.max(0,Math.min(1,t));if(Math.sqrt((x-(ax+t*dx))**2+(z-(az+t*dz))**2)<3)return true;}return false;};
  const rockPos=[]; for(let i=0;i<40;i++){let rx,rz;do{rx=randRange(5,295);rz=randRange(5,295);}while(isZone(rx,rz)||nearRoad(rx,rz));rockPos.push([rx,rz]);}
  const rockGeo=new THREE.SphereGeometry(0.5,5,4), rockMesh=new THREE.InstancedMesh(rockGeo,mRock,rockPos.length);
  const dummy=new THREE.Object3D();
  for(let i=0;i<rockPos.length;i++){const[rx,rz]=rockPos[i],ry=terrainY(rx,rz),s=0.3+rand()*0.8;dummy.position.set(rx,ry+s*0.2,rz);dummy.scale.set(s*(0.7+rand()*0.6),s*(0.5+rand()*0.5),s*(0.7+rand()*0.6));dummy.updateMatrix();rockMesh.setMatrixAt(i,dummy.matrix);}
  rockMesh.instanceMatrix.needsUpdate=true; scene.add(rockMesh);
})();

// ============ SAFE MESHES ============
function createSafeMeshes() {
  for (const safe of safes) {
    const g = new THREE.Group();
    const sy = terrainY(safe.x, safe.z);
    g.position.set(safe.x, sy, safe.z);
    scene.add(g);
    if (safe.isRainbow) {
      const cols = [0xff4455, 0xffaa33, 0xffdd44, 0x44ff66, 0x44ccff, 0xbb66ff];
      for (let i=0; i<6; i++) {
        const strip = new THREE.Mesh(geoBox, M(cols[i]));
        strip.scale.set(0.72, 0.09, 0.72);
        strip.position.set(0, 0.05 + i*0.11, 0);
        g.add(strip);
      }
      const core = new THREE.Mesh(geoBox, M(0xffffff, {emissive:0xffffff, emissiveIntensity:0.25, metalness:0.6, roughness:0.2}));
      core.scale.set(0.66, 0.4, 0.5);
      core.position.set(0, 0.42, 0);
      g.add(core);
      const gl = new THREE.PointLight(0xffffff, 0.9, 8);
      gl.position.set(0, 0.7, 0);
      g.add(gl);
      safe.mesh = g;
      safe.rainbowLight = gl;
      safe.rainbowT = 0;
      safe.baseY = sy;
      safe.lidMesh = core;
      continue;
    }
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
  tx = Math.max(5, Math.min(T_SIZE - 5, tx));
  tz = Math.max(5, Math.min(T_SIZE - 5, tz));
  bot.patrolTarget = new THREE.Vector3(tx, 0, tz);
  bot.patrolWait = 2 + Math.random() * 4;
}

// ============ HELICOPTER ============
let heliGroup = null;
function createHelicopter(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  // Body
  buildBox(g, 0, 0.8, 0, 2.5, 0.6, 1.2, M(0x444433));
  // Tail
  buildBox(g, -2.5, 0.7, 0, 1.5, 0.3, 0.3, M(0x444433));
  // Cockpit
  buildBox(g, 1.0, 0.9, 0, 0.8, 0.4, 0.7, M(0x6688aa,{transparent:true,opacity:0.6}));
  // Rotor
  buildBox(g, 0, 1.3, 0, 3.5, 0.04, 0.2, M(0x666666));
  buildBox(g, 0, 1.3, 0, 0.2, 0.04, 3.5, M(0x666666));
  // Skids
  buildBox(g, 0.3, -0.2, 0.5, 0.05, 0.05, 0.8, M(0x555555));
  buildBox(g, 0.3, -0.2, -0.5, 0.05, 0.05, 0.8, M(0x555555));
  // Landing light
  const light = new THREE.SpotLight(0xffffaa, 2, 15, Math.PI/6);
  light.position.set(1.5, -0.3, 0);
  g.add(light);
  const target = new THREE.Object3D();
  target.position.set(1.5, -5, 0);
  g.add(target);
  light.target = target;
  scene.add(g);
  return g;
}

let heliTargetY = 0;
let heliArrived = false;

// ============ PLAYER ============
const playerPos = new THREE.Vector3(45, 0, 270);
const playerRadius = 0.3;
const playerHeight = 1.8;
let yaw = 0, pitch = 0;
const euler = new THREE.Euler(0,0,0,'YXZ');
const PI_2 = Math.PI/2;
let verticalVel = 0;
const gravity = -25;
const jumpSpeed = 8;
const walkSpeed = 10;
const runSpeed = 14;
let isLocked = false;

// Building colliders now registered in makeBuilding() with door gaps
// Base walls
const bw=terrainY(120,150);
addCollider(120-6.5-12,bw,150-22.5,24,3.5,0.3); addCollider(120+6.5+12,bw,150-22.5,24,3.5,0.3);
addCollider(120-6.5-12,bw,150+22.5,24,3.5,0.3); addCollider(120+6.5+12,bw,150+22.5,24,3.5,0.3);
addCollider(145,bw,150,0.3,3.5,45); addCollider(95,bw,150,0.3,3.5,45);
// Watchtowers
for(const[tx,tz] of[[95,127.5],[145,127.5],[95,172.5],[145,172.5]]) addCollider(tx,terrainY(tx,tz),tz,1.5,4,1.5);

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
document.addEventListener('keydown',e=>{var pl=window.playerLoadout;switch(e.code){case'KeyW':input.w=true;break;case'KeyS':input.s=true;break;case'KeyA':input.a=true;break;case'KeyD':input.d=true;break;case'ShiftLeft':case'ShiftRight':input.shift=true;break;case'Space':input.space=true;e.preventDefault();break;case'KeyE':interact();break;case'KeyI':case'KeyB':toggleBackpack();break;case'Digit1':case'Numpad1':if(pl&&pl[0])switchExtGun(pl[0]);break;case'Digit2':case'Numpad2':if(pl&&pl[1])switchExtGun(pl[1]);break;case'Digit3':case'Numpad3':if(pl&&pl[2])switchExtGun(pl[2]);break;case'Digit4':case'Numpad4':if(pl&&pl[3])switchExtGun(pl[3]);break;case'Digit5':case'Numpad5':if(pl&&pl[4])switchExtGun(pl[4]);break;case'KeyR':extReload();break;case'KeyJ':if(extGunType&&extGunType!=='knife'&&extGunType!=='grapple'&&extGunType!=='grenade'&&!extReloading&&extSwapAnim<=0)extInspectAnim=extInspectDuration;break;}});
document.addEventListener('keyup',e=>{switch(e.code){case'KeyW':input.w=false;break;case'KeyS':input.s=false;break;case'KeyA':input.a=false;break;case'KeyD':input.d=false;break;case'ShiftLeft':case'ShiftRight':input.shift=false;break;case'Space':input.space=false;break;}});

// Pointer lock
document.addEventListener('mousemove',e=>{if(!isLocked)return;const s=0.002;yaw-=e.movementX*s;pitch-=e.movementY*s;pitch=Math.max(-PI_2*0.9,Math.min(PI_2*0.9,pitch));euler.set(pitch,yaw,0);camera.quaternion.setFromEuler(euler);});
document.getElementById('ext-blocker').addEventListener('click',(e)=>{renderer.domElement.requestPointerLock().catch(()=>{});});
document.addEventListener('pointerlockchange',()=>{try{isLocked=!!document.pointerLockElement;var bl=document.getElementById('ext-blocker');if(!bl)return;var mm=document.getElementById('ext-minimap');var su=document.getElementById('safe-ui');var bu=document.getElementById('backpack-ui');var ro=document.getElementById('results-overlay');var hasUI=(su&&su.style.display==='flex')||(bu&&bu.style.display==='flex');var hasResults=ro&&ro.style.display==='flex';if(isLocked){bl.style.display='none';if(mm)mm.style.display='block';}else if(!hasUI&&!hasResults&&gameState!==STATE.RESULTS){bl.style.display='flex';if(mm)mm.style.display='none';bl.querySelectorAll('.mm-only').forEach(function(el){el.style.display='none';});bl.querySelector('h1').textContent='遊戲暫停';bl.querySelector('.sub').textContent='點擊繼續遊戲';}}catch(e){console.error('ext pointerlockchange',e);}});

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
  _extImpactPool.push(im); return im;
}
function getExtBulletHole() {
  for (var i=0;i<_extBulletHolePool.length;i++) { if (!_extBulletHolePool[i].parent) return _extBulletHolePool[i]; }
  var bh = new THREE.Mesh(new THREE.CircleGeometry(0.03,6),new THREE.MeshStandardMaterial({color:0x222222,side:THREE.DoubleSide,depthWrite:false}));
  _extBulletHolePool.push(bh); return bh;
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
  var tip = extGunGroup && extGunGroup.userData ? extGunGroup.userData.barrelTip : new THREE.Vector3(0,0,-0.495);
  var bt = new THREE.Vector3(0.2,-0.15,-0.35).add(tip.clone().multiplyScalar(1.5)).applyQuaternion(camera.quaternion).add(camera.position);
  if (!_extFlashMesh) {
    _extFlashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04,6,6),new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff8800,emissiveIntensity:4}));
    _extFlashLight = new THREE.PointLight(0xffaa44,4,5);
  }
  _extFlashMesh.position.copy(bt); scene.add(_extFlashMesh);
  _extFlashLight.position.copy(bt); scene.add(_extFlashLight);
  _extFlashTimer = 0.06;
  // Raycast from camera center
  const ray = new THREE.Raycaster();
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
      const flash = new THREE.PointLight(0xff4444, 2, 3);
      flash.position.copy(intersects[0].point);
      scene.add(flash);
      setTimeout(() => scene.remove(flash), 100);
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
      const flash = new THREE.PointLight(0xffaa44, 2, 3);
      flash.position.copy(hit.point);
      scene.add(flash);
      setTimeout(() => scene.remove(flash), 100);
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
  // Terrain / wall impact (skip gun model)
  if (extGunGroup) extGunGroup.visible = false;
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
    // Light flash
    var flash2 = new THREE.PointLight(0xffaa44,1,2);
    flash2.position.copy(hitPt); scene.add(flash2);
    setTimeout(function(){scene.remove(flash2);},100);
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
        const effDetect = (crystalCarrier !== null) ? bot.detectRange * 2.2 : bot.detectRange;
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
          // Bot shoots player (hitscan with accuracy penalty)
          const accuracy = 0.7 + Math.random() * 0.3;
          if (Math.random() < accuracy) {
            const dmg = bot.damage * (0.5 + Math.random() * 0.5);
            damagePlayer(Math.floor(dmg));
          }
          // Muzzle flash
          if (bot.mesh) {
            const flash = new THREE.PointLight(0xff6600, 1.5, 4);
            flash.position.set(bot.pos.x, bot.pos.y + 0.6, bot.pos.z);
            scene.add(flash);
            setTimeout(() => scene.remove(flash), 80);
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
    bot.pos.x = Math.max(2, Math.min(T_SIZE - 2, bot.pos.x));
    bot.pos.z = Math.max(2, Math.min(T_SIZE - 2, bot.pos.z));

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
  document.body.style.backgroundColor = 'rgba(255,0,0,0.15)';
  setTimeout(() => {
    document.body.style.backgroundColor = '';
  }, 100);
  if (playerHealth <= 0) {
    playerDie();
  }
}

function playerDie() {
  playerIsDead = true;
  gameState = STATE.RESULTS;
  if (document.pointerLockElement) document.exitPointerLock();
  showHUD('💀 你已陣亡');
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

  // Check decrypt station
  if (decryptStation && !decryptActive) {
    const dx=playerPos.x-decryptStation.x, dz=playerPos.z-decryptStation.z;
    if (Math.sqrt(dx*dx+dz*dz) < 2.5) {
      if (crystalCarrier === 0) {
        startDecrypt();
      } else {
        showHUD('⚠ 需要攜帶虹晶才能啟動破譯');
      }
      return;
    }
  }

  // Check extraction
  const exDx=playerPos.x-EXFIL_POS.x, exDz=playerPos.z-EXFIL_POS.z;
  if (Math.sqrt(exDx*exDx+exDz*exDz) < 8 && !playerHasExtracted) {
    startExtraction();
  }
}

function updateInteractPrompt() {
  const prompt = document.getElementById('interact-promp');
  if (gameState !== STATE.DEPLOYED) { prompt.style.display='none'; return; }

  for (const safe of safes) {
    if (safe.opened) continue;
    const dx=playerPos.x-safe.x, dz=playerPos.z-safe.z;
    if (Math.sqrt(dx*dx+dz*dz) < safe.interactDist) {
      prompt.innerHTML = safe.isRainbow
        ? `[E] 打開虹晶保險庫 <span style="color:#fff">🌈 (虹晶)</span>`
        : `[E] 打開保險箱 <span style="color:${RARITY_COLORS[safe.rarity]}">(${RARITY_NAMES[safe.rarity]})</span>`;
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

  const exDx=playerPos.x-EXFIL_POS.x, exDz=playerPos.z-EXFIL_POS.z;
  if (Math.sqrt(exDx*exDx+exDz*exDz) < 10 && !playerHasExtracted && gameState !== STATE.EXTRACTING) {
    prompt.innerHTML = `[E] 撤離 (${Math.round(Math.sqrt(exDx*exDx+exDz*exDz))}m)`;
    prompt.style.display='block'; return;
  }

  prompt.style.display='none';
}

// ============ SAFE UI ============
function openSafeUI(safe) {
  if (safe.opened) return;
  document.getElementById('safe-ui').style.display='flex';
  document.querySelector('#safe-right .title').textContent = safe.isRainbow ? '🌈 虹晶保險庫' : '🔐 保險箱';
  if (safe.lidMesh) safe.lidMesh.rotation.x = -1.2;
  if (document.pointerLockElement) document.exitPointerLock();
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
}

function closeSafeUI() {
  document.getElementById('safe-ui').style.display='none';
  if (activeSafe) activeSafe.opened = true;
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
  // Rainbow crystal pickup triggers the carry event
  if (item.key && item.key.indexOf('crystal_') === 0 && rainbowVaultActive && !crystalCarrier) {
    carrierCrystal = item;
    startCrystalCarry();
  }
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

// ============ HELICOPTER ARRIVAL ============
function startArrivalCutscene() {
  gameState = STATE.ARRIVAL;
  const overlay = document.getElementById('arrival-overlay');
  overlay.classList.add('show');
  const black = document.getElementById('arrival-black');
  const txt = document.getElementById('arrival-txt');
  const subtxt = document.getElementById('arrival-subtxt');

  // Helicopter far away, flying in
  const heliX = 150, heliZ = -100;
  heliGroup = createHelicopter(heliX, 60, heliZ);
  heliTargetY = terrainY(EXFIL_POS.x, EXFIL_POS.z) + 3;

  // Animation sequence
  black.style.transition = 'opacity 1s';
  black.style.opacity = '0.3';

  setTimeout(() => {
    txt.style.transition = 'opacity 1s';
    txt.style.opacity = '1';
  }, 500);

  setTimeout(() => {
    subtxt.style.transition = 'opacity 1s';
    subtxt.style.opacity = '1';
  }, 1200);

  setTimeout(() => {
    txt.style.opacity = '0';
    subtxt.style.opacity = '0';
  }, 3500);

  setTimeout(() => {
    black.style.opacity = '0';
  }, 4500);

  setTimeout(() => {
    overlay.classList.remove('show');
    gameState = STATE.DEPLOYED;
    document.getElementById('timer').style.display='block';
    document.getElementById('teammate-strip').style.display='flex';
    document.getElementById('heli-icon').style.display='flex';
    document.getElementById('info').textContent = `撤離點: (${EXFIL_POS.x}, ${EXFIL_POS.z})`;
    heliArrived = true;
    showHUD('🟢 已到達失落基地 · 找到寶物後撤離');
  }, 5500);
}

// ============ EXTRACTION ============
function startExtraction() {
  if (playerHasExtracted) return;
  isExtracting = true;
  gameState = STATE.EXTRACTING;
  document.getElementById('extraction-status').style.display='block';
  document.getElementById('extraction-status').textContent = '⏳ 直升機即將抵達 · 請堅守位置';
  extractTimer = 10;
  sendExtractionMessage({ type: 'extraction_start_extract' });
  showHUD('🔴 請求撤離中 ...');
}

function updateExtraction() {
  if (!isExtracting) return;

  const exDx = playerPos.x - EXFIL_POS.x;
  const exDz = playerPos.z - EXFIL_POS.z;
  const dist = Math.sqrt(exDx*exDx + exDz*exDz);

  if (dist > 12) {
    isExtracting = false;
    gameState = STATE.DEPLOYED;
    document.getElementById('extraction-status').style.display='none';
    document.getElementById('extraction-status').textContent = '';
    showHUD('✕ 撤離取消 — 離開撤離點');
    return;
  }

  extractTimer -= 1/60;
  if (extractTimer <= 0) {
    completeExtraction();
  } else {
    document.getElementById('extraction-status').textContent =
      `🚁 直升機即將抵達 ... ${Math.ceil(extractTimer)}s`;
  }
}

function completeExtraction() {
  playerHasExtracted = true;
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
  document.getElementById('r-sub').textContent = won ? '成功撤離失落基地' : '未能及時撤離';

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
function updatePlayer(dt) {
  if (!isLocked || (gameState !== STATE.DEPLOYED && gameState !== STATE.EXTRACTING)) return;
  const forward=new THREE.Vector3(); camera.getWorldDirection(forward); forward.y=0; forward.normalize();
  const right=new THREE.Vector3(); right.crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const speed=input.shift?runSpeed:walkSpeed;
  const move=new THREE.Vector3();
  if(input.w)move.add(forward); if(input.s)move.sub(forward); if(input.a)move.sub(right); if(input.d)move.add(right);
  if(move.length()>0){move.normalize();move.multiplyScalar(speed*dt);}

  verticalVel+=gravity*dt;
  if(input.space&&playerPos.y<=terrainY(playerPos.x,playerPos.z)+0.1)verticalVel=jumpSpeed;
  const ty=terrainY(playerPos.x,playerPos.z);
  const newY=playerPos.y+verticalVel*dt; playerPos.y=Math.max(newY,ty);
  if(playerPos.y<=ty+0.01&&verticalVel<0)verticalVel=0;
  playerPos.x+=move.x; playerPos.z+=move.z;
  playerPos.x=Math.max(2,Math.min(T_SIZE-2,playerPos.x)); playerPos.z=Math.max(2,Math.min(T_SIZE-2,playerPos.z));
  collideWorld(playerPos);
  const nty=terrainY(playerPos.x,playerPos.z); playerPos.y=Math.max(playerPos.y,nty);
  camera.position.copy(playerPos); camera.position.y+=1.6;

  updateInteractPrompt();
}

// ============ MINIMAP ============
function drawMinimap() {
  const c=document.getElementById('ext-minimap-canvas'), ctx=c.getContext('2d'), s=150;
  ctx.fillStyle='rgba(10,15,10,0.85)'; ctx.fillRect(0,0,s,s);
  const scale=s/T_SIZE;
  // Zones
  for(const z of[[120,150,'#555'],[210,90,'#777'],[60,230,'#557'],[180,200,'#755'],[260,170,'#575']]){
    ctx.fillStyle=z[2]; ctx.fillRect((z[0]-15)*scale,(z[1]-15)*scale,30*scale,30*scale);
  }
  // Roads
  ctx.strokeStyle='#444'; ctx.lineWidth=2;
  for(const p of roadPaths){ctx.beginPath();ctx.moveTo(p[0][0]*scale,p[0][1]*scale);ctx.lineTo(p[1][0]*scale,p[1][1]*scale);ctx.stroke();}
  // Safes
  for(const safe of safes){
    if(safe.opened) continue;
    if(safe.isRainbow){
      const hue=(Date.now()*0.004)%360;
      ctx.fillStyle=`hsl(${hue},100%,60%)`;
      ctx.beginPath(); ctx.arc(safe.x*scale,safe.z*scale,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(safe.x*scale,safe.z*scale,1.6,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle=RARITY_COLORS[safe.rarity];ctx.beginPath();ctx.arc(safe.x*scale,safe.z*scale,3,0,Math.PI*2);ctx.fill();
    }
  }
  // Remote players (other humans)
  for (const pid in remotePlayers) {
    const rp = remotePlayers[pid];
    if (rp.state === 'dead' || rp.state === 'extracted') continue;
    ctx.fillStyle = '#48f';
    ctx.beginPath(); ctx.arc(rp.pos.x * scale, rp.pos.z * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crystal carrier position (visible to everyone when someone holds the rainbow crystal)
  if (crystalCarrier !== null && decryptStation) {
    const cp = (crystalCarrier === 0) ? playerPos : null;
    if (cp) {
      ctx.shadowColor='#f0f'; ctx.shadowBlur=8;
      ctx.fillStyle='#f0f'; ctx.beginPath(); ctx.arc(cp.x*scale, cp.z*scale, 4, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
  }
  // Decrypt station (green dot)
  if (decryptStation) {
    ctx.shadowColor='#0f0'; ctx.shadowBlur=7;
    ctx.fillStyle=decryptActive ? '#0f0' : '#4f4';
    ctx.beginPath(); ctx.arc(decryptStation.x*scale, decryptStation.z*scale, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='7px sans-serif'; ctx.fillText('破譯', (decryptStation.x-7)*scale, (decryptStation.z+8)*scale);
    ctx.shadowBlur=0;
  }
    // Bots (enemy dots) - hidden
  // Helipad
  ctx.shadowColor='#fa0'; ctx.shadowBlur=8;
  ctx.fillStyle='#fa0'; ctx.beginPath(); ctx.arc(EXFIL_POS.x*scale,EXFIL_POS.z*scale,6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='8px sans-serif'; ctx.fillText('EXFIL',(EXFIL_POS.x-10)*scale,(EXFIL_POS.z+8)*scale);
  ctx.shadowBlur=0;
  // Player
  ctx.shadowColor='#0f0'; ctx.shadowBlur=6;
  ctx.fillStyle='#0f0'; ctx.beginPath(); ctx.arc(playerPos.x*scale,playerPos.z*scale,5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
}

// ============ GAME LOOP ============
const clock=new THREE.Clock();
let arrivalHeliProgress = 0;

function animate() {
  _extRAF = requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  const elapsed = 1/60;

  // Helicopter arrival animation
  if (heliGroup && !heliArrived) {
    arrivalHeliProgress += elapsed * 0.3;
    const t = Math.min(arrivalHeliProgress, 1);
    // Fly from far to landing position
    const sx = 150 + (EXFIL_POS.x-150) * easeInOut(t);
    const sz = -100 + (EXFIL_POS.z+100) * easeInOut(t);
    const sy = 60 + (heliTargetY-60) * easeInOut(t);
    heliGroup.position.set(sx, sy, sz);
    // Rotor rotation
    heliGroup.children[3].rotation.y += dt * 30;
    heliGroup.children[4].rotation.y += dt * 30;
  }

  // Deployed helicopter rotor
  if (heliGroup && heliArrived) {
    heliGroup.children[3].rotation.y += dt * 20;
    heliGroup.children[4].rotation.y += dt * 20;
  }

  // Exfil beam pulse
  if (exfilBeam) {
    exfilBeam.material.opacity = 0.15 + Math.sin(Date.now()*0.003)*0.1;
    exfilBeam.rotation.y += dt * 0.5;
  }

  // Rainbow vault light cycle
  for (const safe of safes) {
    if (!safe.isRainbow || !safe.rainbowLight) continue;
    safe.rainbowT += dt;
    const hue = (safe.rainbowT * 0.35) % 1;
    safe.rainbowLight.color.setHSL(hue, 1, 0.55);
    safe.rainbowLight.intensity = 0.7 + Math.sin(safe.rainbowT * 3) * 0.25;
  }

  // Decrypt station visual + countdown
  if (decryptStation) {
    updateDecryptStationVisual(dt);
    if (decryptActive) {
      decryptTime -= dt;
      if (decryptTime <= 0) {
        finishDecrypt();
      } else {
        const remain = document.getElementById('extraction-status');
        if (remain) {
          const mins = Math.floor(decryptTime / 60);
          const secs = Math.floor(decryptTime % 60);
          remain.textContent = `🔓 破譯中 ${mins}:${secs.toString().padStart(2,'0')}`;
          remain.style.display = 'block';
        }
      }
    }
  }

  // Exfil distance update
  if (gameState === STATE.DEPLOYED || gameState === STATE.EXTRACTING) {
if (decryptStation && !decryptActive) {
    const ddx=playerPos.x-decryptStation.x, ddz=playerPos.z-decryptStation.z;
    if (Math.sqrt(ddx*ddx+ddz*ddz) < 3) {
      prompt.innerHTML = crystalCarrier === 0
        ? '<span style="color:#4f6">[E] 放入破譯站</span>'
        : '<span style="color:#aaa">破譯站（需攜帶虹晶）</span>';
      prompt.style.display='block'; return;
    }
  }

  const exDx=playerPos.x-EXFIL_POS.x, exDz=playerPos.z-EXFIL_POS.z;
    document.getElementById('exfil-dist').textContent = Math.round(Math.sqrt(exDx*exDx+exDz*exDz))+'m';
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
  // Muzzle flash cleanup
  if (_extFlashTimer > 0) {
    _extFlashTimer -= elapsed;
    if (_extFlashTimer <= 0) {
      if (_extFlashMesh && _extFlashMesh.parent) scene.remove(_extFlashMesh);
      if (_extFlashLight && _extFlashLight.parent) scene.remove(_extFlashLight);
    }
  }
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

  // State sync (send to server every ~100ms)
  if (mmState === 'in_game') {
    stateSyncTimer += elapsed;
    if (stateSyncTimer >= STATE_SYNC_INTERVAL) {
      stateSyncTimer = 0;
      sendExtractionState();
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
  // Pick spawn (from server in multiplayer, random in single)
  if (isMultiplayer && mpSpawn) {
    playerPos.set(mpSpawn.x, 0, mpSpawn.z);
    document.getElementById('info').textContent = `多人模式 · 玩家 #${myPlayerId+1}`;
    mmState = 'in_game';
  } else {
    playerSpawnIdx = Math.floor(Math.random() * SPAWNS.length);
    const spawn = SPAWNS[playerSpawnIdx];
    playerPos.set(spawn.x, 0, spawn.z);
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

  // Start arrival cutscene
  startArrivalCutscene();

  showHUD(`🔽 直升機正在進入 ...`);
}

// If match data provided from global matchmaking, start game immediately
if (extAiPlayerCount > 0 && extMatchPlayers && Object.keys(extMatchPlayers).length > 0) {
  launchExtractionGame();
} else {
  // Connect WebSocket and setup matchmaking
  document.getElementById('mm-btn').addEventListener('click', toggleMatchmaking);
  connectWebSocket();

  // 50s countdown, then fill with AI and launch game
  window._extCountdownInterval = setInterval(function() {
    var el = document.getElementById('ext-mm-count');
    if (el) { var v = parseInt(el.textContent); if (v > 0) el.textContent = v - 1; }
  }, 1000);
  window._extLaunchTimer = setTimeout(function() {
    if (window._extCountdownInterval) { clearInterval(window._extCountdownInterval); window._extCountdownInterval = null; }
    if (extAiPlayerCount <= 0) spawnAIPlayers(4);
    launchExtractionGame();
  }, 50000);
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
  hideExtractionLoading();
  // Re-read match data (may have been updated by finishExtMM after startExtractionMode)
  var md = window._extMatchData;
  if (md) {
    extIsMultiplayer = md.matched || false;
    extMatchPlayers = md.players || {};
    extMyPlayerId = md.myPlayerId || 0;
    extAiPlayerCount = md.aiCount || 0;
  }
  var mainCanvas = document.querySelector('canvas');
  if (mainCanvas) mainCanvas.style.display = 'none';
  var menuEl = document.getElementById('menu');
  if (menuEl) menuEl.style.display = 'none';
  document.getElementById('extraction-root').style.display = 'block';
  var blInit=document.getElementById('ext-blocker');blInit.querySelectorAll('.mm-only').forEach(function(el){el.style.display='none';});blInit.querySelector('h1').textContent='🔥 摸 金 模 式';blInit.querySelector('.sub').textContent='LOST FACILITY · 撤離射擊';
  startGame(false, null);
  animate();
  setTimeout(() => {
    if (rainbowVaultActive) {
      showAnnounce('🌈 發現虹晶保險庫！快去搶！', 'rgba(255,200,80,.6)');
    }
  }, 1000);
}

window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});


  // ---- Expose functions for HTML onclick handlers ----
  window.ext_closeSafeUI = closeSafeUI;
  window.ext_toggleBackpack = toggleBackpack;
  window.ext_toggleMatchmaking = toggleMatchmaking;
  window.ext_backToMenu = function() {
    stopExtractionMode();
  };

  // Game starts via launchExtractionGame()
}

function stopExtractionMode() {
  if (!_extActive) return;
  _extActive = false;
  if (_extMMActive) cancelExtMM();
  if (document.pointerLockElement) document.exitPointerLock();

  // Cancel timers
  if (_extRAF) { cancelAnimationFrame(_extRAF); _extRAF = null; }
  if (window._extLaunchTimer) { clearTimeout(window._extLaunchTimer); window._extLaunchTimer = null; }
  if (window._extCountdownInterval) { clearInterval(window._extCountdownInterval); window._extCountdownInterval = null; }

  // Clean up extraction renderer
  var extRoot = document.getElementById('extraction-root');
  var extCanvas = extRoot ? extRoot.querySelector('canvas') : null;
  if (extCanvas && extCanvas.parentNode) {
    extCanvas.parentNode.removeChild(extCanvas);
  }

  // Hide extraction UI
  if (extRoot) extRoot.style.display = 'none';

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

  // Clean up global extraction handlers
  delete window.ext_closeSafeUI;
  delete window.ext_toggleBackpack;
  delete window.ext_toggleMatchmaking;
  delete window.ext_backToMenu;
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
    var bMat=M(col,{roughness:0.4,metalness:0.3});
    var bBody=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,0.45,4,8),bMat);
    bBody.position.y=0.5; group.add(bBody);
    var bHead=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,8), M(0xffcc88,{roughness:0.5,metalness:0}));
    bHead.position.y=0.95; group.add(bHead);
    var hpBar=new THREE.Group();
    var bg=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.06), new THREE.MeshBasicMaterial({color:0x333333,side:THREE.DoubleSide}));
    bg.position.y=1.3; hpBar.add(bg);
    var fill=new THREE.Mesh(new THREE.PlaneGeometry(0.58,0.04), new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide}));
    fill.position.y=1.3; fill.position.x=0; hpBar.add(fill);
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
  function onMD(e) { if (e.button === 0 && pc.running && !pc.ended) renderer.domElement.requestPointerLock(); }
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
