function bootGame() {
if(window._bootGameDone){console.log('[bootGame] skipped');return;}
window._bootGameDone=true;
var THREE = window.THREE;
if (!THREE) { document.getElementById('error').style.display='block'; document.getElementById('start-msg').style.display='none'; return; }

// ═════════ 方晶共用常數（必須在 createEnemy 之前，開機時就會用到）═════════
var CUBELING_H=0.72;          // 整體高度（血條位置要用）
var CUBELING_BAR=0.86;        // 血條基準高度
var CUBELING_AI_SCALE=1.20;   // 敵人 AI 放大一點點
// 只有藍色跟綠色兩組。藍色＝玩家自己看到的（選單、隊伍、對手預覽）
//                        綠色＝敵人 AI 全員
var CUBELING_PAL={
  blue :{body:0x6fa8d8,accent:0x9ef0ff,glow:0x7ffff0,core:0x3f6f9e},
  green:{body:0x74c46a,accent:0xb8f57e,glow:0x8affd0,core:0x3f7f2f}
};
var P_RADIUS = 0.3, P_HEIGHT = 1.2, EYE_H = 0.85;
var SPEED = 10, AIR_SPEED = 6, JUMP_V = 6.4, GRAVITY = 14.8;
var WALL_CLING_TIME = 1.5, WALL_SLIDE = 0.5, WALL_JUMP_F = 10, WALL_JUMP_U = 6;
var pos = new THREE.Vector3(-10, P_HEIGHT/2 - 0.01, -10);
var vel = new THREE.Vector3();
var yaw = 0, pitch = 0, onGround = false, wallClinging = false, wallTimer = 0, wallJumpCD = 0;
var wallNormal = new THREE.Vector3();
var pSize = new THREE.Vector3(P_RADIUS*2, P_HEIGHT, P_RADIUS*2);
// countdown=0 → 指標鎖定後直接開打（原本是 5；倒數已移到新角色頁 #char-cd）
var keys = {}, moveX = 0, moveZ = 0, locked = false, countdown = 0, gameStarted = false;
var playerHP = 100, playerArmor = 100, sbTimer = 0, sbActive = false, projectiles = [], enemies = [], hitMarkerTimer = 0, roundNum = 1, clearTimer = -1, roundEarnings = 0, playerXP = parseInt(localStorage.getItem('oc_level')) || 0;
var pickups=[],buffTimer=0,buffType='',screenShake=0,didPlayGame=false;
var smokeParticles=[],incendiaryZones=[],smokeZoneCenters=[];
var bulletHoles=[],maxBulletHoles=50,impactPool=[],bulletHolePool=[],flashMesh=null,flashLight=null,flashTimer=0,dmgNumPool=[];
var dailyChallenge=false,dailyKills=0,dailyRounds=0;
var dailyBest=(function(){try{return JSON.parse(localStorage.getItem('oc_daily_best'))||{}}catch(e){return{}}})();
var radWattage=0,radImmuneTimer=0,nuclearClears=0,nuclearWave=1,bossActive=false,bossSpawned=false,boss=null,reactorGlow=null,radZoneRadius=5,bossRushMode=false,bossRushWave=0,bossRushMaxWave=0,bossType='nuclear',bossChargeTimer=0,bossTeleportCD=0,bossLaserAngle=0,bossTurretAngle=0,bossSummoned=[];
var floodedWave=1,floodedClears=0,abyssalMaw=null,bossFloodedActive=false,bossFloodedSpawned=false,airBubbles=[],floodedBossPhase=1,harpoonProjectiles=[],floodedBossPhaseCD=0,bubbleTimer=0,isUnderwater=false,playerO2=100,maxO2=100,waterLevel=3.0,floodedMapElements=[],underwaterAmbient=null,oxyVents=[];
var radRifleCharge=0,radRifleCharging=false,radRifleChargeTouchId=null,radiationZones=[];
var sliding=false,slideTimer=0,slideCD=0,slidePromptTimer=0,slideSpeed=16,slideKeyWas=false,slowTimer=0;
var isDowned=false,downTimer=0;
var scene = new THREE.Scene();
var currentMap='base';
var gameDifficulty='normal';
var diffMult=1;
var bombMode=false,ufoMode=false,ufo=null,ufoHP=300,ufoMaxHP=300,ufoTargetIdx=0,ufoAttackTimer=0,ufoLaserCD=0,ufoActive=false,ufoSpawned=false,ufoTargetSwitchCD=0,ufoBeamMesh=null,ufoBeamRing=null,ufoProjectiles=[],requestedPlayerCount=0;
var rangeMode=false,rangeScore=0,rangeShots=0,rangeHits=0,rangeTime=0,rangeTargets=[],rangeDrones=[],rangeWalkwayTarget=null,rangeWalkwayDir=1,rangeWalkwayPos=2;
updateLevelDisplay();
(function(){try{
var canvas=document.getElementById('menu-character-canvas'),parent=document.getElementById('character-stage');
if(!canvas||!parent)return;
var ren=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
ren.setSize(parent.offsetWidth,parent.offsetHeight);
ren.setPixelRatio(devicePixelRatio);
ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.5;
window._menuCharScene=new THREE.Scene();window._menuCharScene.background=null;
var cam=new THREE.PerspectiveCamera(35,parent.offsetWidth/parent.offsetHeight,0.1,100);
cam.position.set(0,2.5,4.2);cam.lookAt(0,1.0,0);
window._menuCharCam=cam;window._menuCharRen=ren;
window._menuCharScene.add(new THREE.AmbientLight(0x446688,0.8));
var dl=new THREE.DirectionalLight(0xffeedd,2.5);dl.position.set(3,6,4);window._menuCharScene.add(dl);
var rm=new THREE.DirectionalLight(0x4488ff,1);rm.position.set(-3,2,-4);window._menuCharScene.add(rm);
var fl=new THREE.DirectionalLight(0xff8844,0.5);fl.position.set(-1,1,3);window._menuCharScene.add(fl);
var floor=new THREE.Mesh(new THREE.CircleGeometry(2.2,24),new THREE.MeshStandardMaterial({color:0x222244,roughness:0.7,metalness:0.2,transparent:true,opacity:0.35,side:THREE.DoubleSide}));
floor.rotation.x=-Math.PI/2;floor.position.y=-0.01;window._menuCharScene.add(floor);
var grp=createOpponentMesh();
grp.scale.set(1.3,1.3,1.3);grp.position.y=0.35;
applyCharSkin(grp);
window._menuCharScene.add(grp);
window._menuCharMain=grp;
window._menuCharTeammates=[];
window._menuCharPet=null;
window._menuCharPetType=null;
window.updateMenuPet=function(){
  var pt=null;try{pt=localStorage.getItem('oc_pet_equip');}catch(e){}
  if(pt===window._menuCharPetType&&window._menuCharPet)return;
  if(window._menuCharPet){window._menuCharScene.remove(window._menuCharPet);disposeMesh(window._menuCharPet);window._menuCharPet=null;}
  window._menuCharPetType=pt;
  if(pt){
    var pm=createPetMesh(pt);pm.scale.set(1.2,1.2,1.2);pm.position.set(1.0,0.35,0);window._menuCharScene.add(pm);window._menuCharPet=pm;
  }
}
updateMenuPet();
var mt=0;
(function anim(){requestAnimationFrame(anim);mt+=0.016;grp.rotation.y=mt*0.4;if(grp.userData.tick)grp.userData.tick(mt);grp.position.y=0.35+Math.sin(mt*1.5)*0.015;if(grp.userData.visor)grp.userData.visor.material.emissiveIntensity=0.2+0.15*Math.sin(mt*2);window._menuCharTeammates.forEach(function(t){if(t.mesh){t.mesh.rotation.y=mt*0.4+1;if(t.mesh.userData.tick)t.mesh.userData.tick(mt);t.mesh.position.y=0.35+Math.sin(mt*1.5+1)*0.015;}if(t.tag&&window._menuCharCam){var p=new THREE.Vector3().copy(t.mesh.position);p.y+=1.05;p.project(window._menuCharCam);var r=parent.getBoundingClientRect();t.tag.style.left=((p.x*0.5+0.5)*r.width)+'px';t.tag.style.top=((-p.y*0.5+0.5)*r.height)+'px';}});if(window._menuCharPet){window._menuCharPet.rotation.y=mt*0.4;window._menuCharPet.position.y=0.35+Math.sin(mt*1.5+0.5)*0.015;window._menuCharPet.position.x=1.0+Math.sin(mt*0.5)*0.05;}ren.render(window._menuCharScene,cam);})();
new ResizeObserver(function(){var r=parent.getBoundingClientRect();canvas.width=r.width*devicePixelRatio;canvas.height=r.height*devicePixelRatio;canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';ren.setSize(r.width,r.height);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();}).observe(parent);
}catch(e){console.log('menu char:',e);}})();
// Sky gradient
// Sky gradient
var skyCanvas=document.createElement('canvas');skyCanvas.width=2;skyCanvas.height=512;
var sctx=skyCanvas.getContext('2d');
var sgrd=sctx.createLinearGradient(0,0,0,512);
sgrd.addColorStop(0,'#1a1a3e');sgrd.addColorStop(0.2,'#2a4a6a');sgrd.addColorStop(0.4,'#3a6a9a');
sgrd.addColorStop(0.6,'#5a8aba');sgrd.addColorStop(0.8,'#8abadd');sgrd.addColorStop(1,'#aaccee');
sctx.fillStyle=sgrd;sctx.fillRect(0,0,2,512);
scene.background=new THREE.CanvasTexture(skyCanvas);
scene.fog=new THREE.Fog(0x8899aa,25,50);
// Clouds
function addCloud(x,z){
  var g=new THREE.Group();
  for(var ci=0;ci<6;ci++){
    var cr=0.4+Math.random()*0.6,ch=0.15+Math.random()*0.2;
    var c=new THREE.Mesh(new THREE.SphereGeometry(cr,6,6),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,transparent:true,opacity:0.25+Math.random()*0.2}));
    c.position.set((Math.random()-0.5)*1.5,(Math.random()-0.5)*0.3,(Math.random()-0.5)*1.5);
    c.scale.y=ch/cr;g.add(c);
  }
  g.position.set(x,7+Math.random()*0.8,z);scene.add(g);
}
addCloud(-8,-8);addCloud(8,-7);addCloud(-6,9);addCloud(10,6);addCloud(0,-12);addCloud(-12,0);addCloud(12,2);
// Menu particles
for(var pi=0;pi<60;pi++){
  var pd=document.createElement('div');pd.className='menu-particle';
  var sz=1+Math.random()*3;pd.style.width=sz+'px';pd.style.height=sz+'px';
  pd.style.left=Math.random()*100+'%';pd.style.bottom='-5%';
  var colors=['rgba(255,68,170,','rgba(68,170,255,','rgba(68,255,170,','rgba(170,68,255,','rgba(255,136,68,'];pd.style.background=colors[Math.floor(Math.random()*colors.length)]+(0.1+Math.random()*0.3)+')';
  var dur=8+Math.random()*12;pd.style.animationDuration=dur+'s';
  pd.style.animationDelay=Math.random()*dur+'s';
  document.body.appendChild(pd);
}
var cam = new THREE.PerspectiveCamera(80, window.innerWidth/window.innerHeight, 0.1, 100);
var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.prepend(renderer.domElement);

var amb = new THREE.AmbientLight(0x556070, 0.6);
scene.add(amb);
var dir = new THREE.DirectionalLight(0xffeedd, 1.2);
dir.position.set(15, 20, 10);
dir.castShadow = true;
dir.shadow.mapSize.width = 1024;
dir.shadow.mapSize.height = 1024;
scene.add(dir);
var hem = new THREE.HemisphereLight(0x88bbff, 0x445566, 0.5);
scene.add(hem);
var mapBoxes = [];
function addBox(p,s,c,shadows){
  if(shadows===undefined)shadows=true;
  var g=new THREE.BoxGeometry(s.x,s.y,s.z);
  var m=new THREE.MeshStandardMaterial({color:c,roughness:0.7});
  var mesh=new THREE.Mesh(g,m);
  mesh.position.copy(p);mesh.castShadow=shadows;mesh.receiveShadow=true;
  scene.add(mesh);
  mapBoxes.push({pos:p.clone(),size:s.clone(),mesh:mesh});
}
// 基本地圖場地大小：只改 BASE_HALF 就能整體縮放（地板/外牆/邊界/出生點/小地圖都跟著變）
var BASE_HALF=24;
addBox(new THREE.Vector3(0,-0.1,0),new THREE.Vector3(BASE_HALF*2,0.2,BASE_HALF*2),0x333333);mapBoxes[mapBoxes.length-1].isPermanent=true;mapBoxes[mapBoxes.length-1].isFloor=true;
var bw=1.0,bh=4,bc=0x4a4a55;
addBox(new THREE.Vector3(0,bh/2,-BASE_HALF),new THREE.Vector3(BASE_HALF*2,bh,bw),bc);mapBoxes[mapBoxes.length-1].isPermanent=true;
addBox(new THREE.Vector3(0,bh/2,BASE_HALF),new THREE.Vector3(BASE_HALF*2,bh,bw),bc);mapBoxes[mapBoxes.length-1].isPermanent=true;
addBox(new THREE.Vector3(-BASE_HALF,bh/2,0),new THREE.Vector3(bw,bh,BASE_HALF*2),bc);mapBoxes[mapBoxes.length-1].isPermanent=true;
addBox(new THREE.Vector3(BASE_HALF,bh/2,0),new THREE.Vector3(bw,bh,BASE_HALF*2),bc);mapBoxes[mapBoxes.length-1].isPermanent=true;
// Thickened corners
var cc=0x556677;addBox(new THREE.Vector3(BASE_HALF,bh/2,-BASE_HALF),new THREE.Vector3(1.5,bh,1.5),cc);mapBoxes[mapBoxes.length-1].isPermanent=true;
addBox(new THREE.Vector3(BASE_HALF,bh/2,BASE_HALF),new THREE.Vector3(1.5,bh,1.5),cc);mapBoxes[mapBoxes.length-1].isPermanent=true;
addBox(new THREE.Vector3(-BASE_HALF,bh/2,-BASE_HALF),new THREE.Vector3(1.5,bh,1.5),cc);mapBoxes[mapBoxes.length-1].isPermanent=true;
addBox(new THREE.Vector3(-BASE_HALF,bh/2,BASE_HALF),new THREE.Vector3(1.5,bh,1.5),cc);mapBoxes[mapBoxes.length-1].isPermanent=true;
var centerStruct=[];
addBox(new THREE.Vector3(0,0.75,0),new THREE.Vector3(5,1.5,5),0x8899aa);centerStruct.push(mapBoxes[mapBoxes.length-1]);
addBox(new THREE.Vector3(0,1.55,0),new THREE.Vector3(3.5,0.8,3.5),0x9999aa);centerStruct.push(mapBoxes[mapBoxes.length-1]);
addBox(new THREE.Vector3(0,2.15,0),new THREE.Vector3(2,0.5,2),0x6688aa);centerStruct.push(mapBoxes[mapBoxes.length-1]);
addBox(new THREE.Vector3(-7,0.8,-6),new THREE.Vector3(5,1.6,0.4),0x777777);
addBox(new THREE.Vector3(4,0.8,-5),new THREE.Vector3(3,1.6,0.4),0x777777);
addBox(new THREE.Vector3(-5,0.8,7),new THREE.Vector3(4,1.6,0.4),0x777777);
addBox(new THREE.Vector3(0,0.8,-9),new THREE.Vector3(6,1.6,0.4),0x777777);
addBox(new THREE.Vector3(9,0.8,5),new THREE.Vector3(2,1.6,2),0x777777);
addBox(new THREE.Vector3(-3,0.8,-8),new THREE.Vector3(2,1.6,0.4),0x777777);
// Wall-cling surfaces (orange, floating, thickened to prevent clipping)
var wc=0xcc8844;
addBox(new THREE.Vector3(7,2.3,3),new THREE.Vector3(4,1.6,0.6),wc);
addBox(new THREE.Vector3(-8,2.3,-8),new THREE.Vector3(2.5,1.6,2.5),wc);
addBox(new THREE.Vector3(-11,2.3,5),new THREE.Vector3(3,1.6,0.6),wc);
addBox(new THREE.Vector3(0,2.3,7),new THREE.Vector3(3,1.6,0.6),wc);
// Extra floating wall-cling panels (raised higher)
addBox(new THREE.Vector3(-4,4,12),new THREE.Vector3(3,1.6,0.6),wc);
addBox(new THREE.Vector3(5,4,-12),new THREE.Vector3(3,1.6,0.6),wc);
addBox(new THREE.Vector3(12,4,-4),new THREE.Vector3(0.6,1.6,3),wc);
addBox(new THREE.Vector3(-12,4,7),new THREE.Vector3(0.6,1.6,3),wc);
// Low floating ledges (raised higher)
var ml=0xcc9955;
addBox(new THREE.Vector3(-3,4,10),new THREE.Vector3(2.5,1.2,0.6),ml);
addBox(new THREE.Vector3(10,4,-3),new THREE.Vector3(0.6,1.2,2.5),ml);
addBox(new THREE.Vector3(3,4,-10),new THREE.Vector3(2.5,1.2,0.6),ml);
addBox(new THREE.Vector3(-10,4,3),new THREE.Vector3(0.6,1.2,2.5),ml);
p=[[-11,0,-11],[-11,0,11],[11,0,-11],[11,0,11]];
for(var i=0;i<p.length;i++){addBox(new THREE.Vector3(p[i][0],1.5,p[i][2]),new THREE.Vector3(0.6,3,0.6),0x555566);}
var pd=[[8,0,-8,2,1.5,2,8,1.6,-8,2.5,0.2,2.5],[-12,0,-5,1.5,1.5,1.5,-12,1.6,-5,2,0.2,2],[4,0,8,2,1.5,2,4,1.6,8,2.5,0.2,2.5]];
for(var i=0;i<pd.length;i++){var d=pd[i];addBox(new THREE.Vector3(d[0],d[1]+d[4]/2,d[2]),new THREE.Vector3(d[3],d[4],d[5]),0x555566);addBox(new THREE.Vector3(d[6],d[7]+d[9]/2,d[8]),new THREE.Vector3(d[9],d[10],d[11]),0x558855);}
function addRamp(p,s,ang,axis,c){addBox(p,s,c);var mesh=mapBoxes[mapBoxes.length-1].mesh;if(axis==='z')mesh.rotation.z=ang*Math.PI/180;else if(axis==='x')mesh.rotation.x=ang*Math.PI/180;}
addRamp(new THREE.Vector3(8,0.25,-6),new THREE.Vector3(0.5,0.5,3),20,'z',0x774444);
addRamp(new THREE.Vector3(-5,0.25,5),new THREE.Vector3(0.5,0.5,3),20,'x',0x774444);
addBox(new THREE.Vector3(-3,0.4,-3),new THREE.Vector3(1,0.8,1),0x555566);
addBox(new THREE.Vector3(0,0.4,5),new THREE.Vector3(1.5,0.8,1.5),0x555566);
addBox(new THREE.Vector3(-8,0.4,0),new THREE.Vector3(1,0.8,2),0x555566);
addBox(new THREE.Vector3(10,0.4,0),new THREE.Vector3(1.5,0.8,1),0x555566);
addBox(new THREE.Vector3(3,0.4,-3),new THREE.Vector3(1.2,0.8,1.2),0x555566);
// Sniper towers (tall columns with platform at top)
var sniperTowers=[];var stPoses=[[-14,0,-14],[14,0,14],[-14,0,14],[14,0,-14],
  [-BASE_HALF+2,0,-BASE_HALF+2],[BASE_HALF-2,0,BASE_HALF-2],[-BASE_HALF+2,0,BASE_HALF-2],[BASE_HALF-2,0,-BASE_HALF+2]];
stPoses.forEach(function(sp){
  addBox(new THREE.Vector3(sp[0],2.5,sp[2]),new THREE.Vector3(1.5,5,1.5),0x555566);
  addBox(new THREE.Vector3(sp[0],5.5,sp[2]),new THREE.Vector3(3,0.3,3),0x558855);
  sniperTowers.push({pos:new THREE.Vector3(sp[0],5.7,sp[2]),plat:mapBoxes[mapBoxes.length-1]});});
// 換地圖時 applyMapSettings 會把 base 建材隱藏，但 sniperTowers 仍非空。
// 挑塔時要真的「塔平台還在場上」，否則狙擊兵會駐紮在半空中。
function ocPickSniperTower(ei){
  if(!sniperTowers.length)return null;
  for(var i=0;i<sniperTowers.length;i++){
    var st=sniperTowers[(ei+i)%sniperTowers.length];
    if(st.plat&&st.plat.mesh&&st.plat.mesh.visible)return st;
  }
  return null;
}

// ── 外圈場地：沿用原本的建材與配色（灰牆／牆掛板／矮台／斜坡／木箱／平台），
// 以 90° 旋轉四份對稱生成，維持原本的手放布局風格。
(function(){
  // 每筆 = [x, y, z, 寬, 高, 深, 顏色]；y 為方塊中心點（跟 addBox 用法一致）
  var ring=[
    [16,0.8,19,   7,1.6,0.4,0x777777],   // 長灰牆
    [20.5,0.8,16, 0.4,1.6,7 ,0x777777],   // 長灰牆（轉 90°）
    [17,0.4,17, 1.6,0.8,1.6,0x555566],   // 木箱
    [21.5,0.4,17,1.0,0.8,2.0,0x555566],  // 木箱
    [19,0.4,22, 2.0,0.8,1.0,0x555566],   // 木箱
    [18,2.3,23,   4,1.6,0.6,wc],         // 牆掛板（浮空）
    [16,4  ,21, 2.5,1.2,0.6,ml]          // 矮浮台
  ];
  var rampSeeds=[[18,12],[12,17]];        // 斜坡（旋轉時連軸別一起轉）
  // 用整數表做 90° 旋轉，避免三角函式把 .5 座標四捨五入掉
  var ROT=[[1,0],[0,1],[-1,0],[0,-1]];
  for(var r=0;r<4;r++){
    var rm=ROT[r],flip=(r%2===0);        // 0/180 度不換寬深，90/270 度要換
    function place(x,z,cb){return cb(x*rm[0]+z*rm[1],-x*rm[1]+z*rm[0]);}
    for(var k=0;k<ring.length;k++){
      var d=ring[k];
      place(d[0],d[2],function(rx,rz){
        addBox(new THREE.Vector3(rx,d[1],rz),new THREE.Vector3(flip?d[3]:d[5],d[4],flip?d[5]:d[3]),d[6]);
      });
    }
    // 平台 + 垂降板（跟內圈 pd 的做法一致）
    place(16,21,function(px,pz){
      addBox(new THREE.Vector3(px,0.75,pz),new THREE.Vector3(2.5,1.5,2.5),0x555566);
      addBox(new THREE.Vector3(px,1.6,pz),new THREE.Vector3(3,0.2,3),0x558855);
    });
    for(var q=0;q<rampSeeds.length;q++){
      (function(rs){
        place(rs[0],rs[1],function(rx,rz){
          // 跟著整體旋轉一起換軸，斜坡才會朝向場地內側
          addRamp(new THREE.Vector3(rx,0.25,rz),new THREE.Vector3(0.5,0.5,3),20,flip?'z':'x',0x774444);
        });
      })(rampSeeds[q]);
    }
  }
})();
// ── Dragon Boat Festival map elements ──
var dragonBoatElements=[];
function addDB(p,s,c){addBox(p,s,c);var b=mapBoxes[mapBoxes.length-1];b.isDragonBoat=true;dragonBoatElements.push(b);}
function addZongzi(p,s){
  var zo=0x4a7a2a,zo2=0x5a8a3a,str=0x886644;
  var g=new THREE.ConeGeometry(s*0.35,s*0.65,4);g.rotateY(Math.PI/4);
  var m=new THREE.MeshStandardMaterial({color:zo,roughness:0.8,flatShading:true});
  var mesh=new THREE.Mesh(g,m);mesh.position.set(p.x,p.y+s*0.15,p.z);
  mesh.castShadow=true;mesh.receiveShadow=true;var ry=Math.random()*Math.PI*2;mesh.rotation.y=ry;
  scene.add(mesh);var e={pos:mesh.position.clone(),size:new THREE.Vector3(s,s,s),mesh:mesh,isDragonBoat:true};
  mapBoxes.push(e);dragonBoatElements.push(e);
  // Leaf overlap (slightly rotated second layer)
  var g2=new THREE.ConeGeometry(s*0.3,s*0.5,4);g2.rotateY(Math.PI/4+0.3);
  var m2=new THREE.MeshStandardMaterial({color:zo2,roughness:0.8,flatShading:true});
  var mesh2=new THREE.Mesh(g2,m2);mesh2.position.set(p.x,p.y+s*0.24,p.z);
  mesh2.castShadow=true;mesh2.receiveShadow=true;mesh2.rotation.y=ry+0.4;
  scene.add(mesh2);var e2={pos:mesh2.position.clone(),size:new THREE.Vector3(s*0.8,s*0.5,s*0.8),mesh:mesh2,isDragonBoat:true};
  mapBoxes.push(e2);dragonBoatElements.push(e2);
  // Wrapping string (two crossing thin boxes)
  var sg=new THREE.BoxGeometry(0.02,0.02,s*0.5);
  var sm=new THREE.MeshStandardMaterial({color:str,roughness:0.9});
  var s1=new THREE.Mesh(sg,sm);s1.position.set(p.x,p.y+s*0.18,p.z);s1.rotation.y=ry;s1.castShadow=true;
  scene.add(s1);dragonBoatElements.push({pos:s1.position.clone(),size:new THREE.Vector3(0.04,0.04,s*0.5),mesh:s1,isDragonBoat:true});
  var s2=new THREE.Mesh(sg,sm);s2.position.set(p.x,p.y+s*0.18,p.z);s2.rotation.y=ry+Math.PI/2;s2.castShadow=true;
  scene.add(s2);dragonBoatElements.push({pos:s2.position.clone(),size:new THREE.Vector3(0.04,0.04,s*0.5),mesh:s2,isDragonBoat:true});
  // Knot on top
  var kg=new THREE.SphereGeometry(0.03,4,4);
  var km=new THREE.MeshStandardMaterial({color:str,roughness:0.9});
  var knot=new THREE.Mesh(kg,km);knot.position.set(p.x,p.y+s*0.35+0.02,p.z);knot.castShadow=true;
  scene.add(knot);dragonBoatElements.push({pos:knot.position.clone(),size:new THREE.Vector3(0.06,0.06,0.06),mesh:knot,isDragonBoat:true});
}
// River (blue panel)
addDB(new THREE.Vector3(0,0.01,0),new THREE.Vector3(20,0.02,10),0x2266aa);
// ── Detailed Dragon Boat ──
var dbCol=0x884422,dbCol2=0xaa6633,dbCol3=0xcc6644,dbAcc=0xcc4444,dbGold=0xddaa44;
// Hull layered
addDB(new THREE.Vector3(0,0.08,0),new THREE.Vector3(8,0.16,1.5),0x663311);
addDB(new THREE.Vector3(0,0.22,0),new THREE.Vector3(7.5,0.12,1.4),0x774422);
addDB(new THREE.Vector3(0,0.34,0),new THREE.Vector3(7,0.12,1.3),dbCol);
addDB(new THREE.Vector3(0,0.46,0),new THREE.Vector3(6.5,0.12,1.2),dbCol2);
addDB(new THREE.Vector3(0,0.56,0),new THREE.Vector3(6,0.08,1.1),dbCol3);
// Deck
addDB(new THREE.Vector3(0,0.62,0),new THREE.Vector3(5.5,0.04,1.0),0xddbb88);
// Bow curve (front, +X)
addDB(new THREE.Vector3(3.6,0.3,0),new THREE.Vector3(0.5,0.6,1.1),dbCol);
addDB(new THREE.Vector3(3.9,0.5,0),new THREE.Vector3(0.3,0.4,0.9),dbCol2);
// Stern curve (back, -X)
addDB(new THREE.Vector3(-3.6,0.3,0),new THREE.Vector3(0.5,0.6,1.1),dbCol);
addDB(new THREE.Vector3(-3.9,0.5,0),new THREE.Vector3(0.3,0.4,0.9),dbCol2);
// Dragon head at front
addDB(new THREE.Vector3(4.1,0.55,0),new THREE.Vector3(0.25,0.15,0.6),dbAcc); // neck base
addDB(new THREE.Vector3(4.15,0.7,0),new THREE.Vector3(0.2,0.2,0.5),0xcc4422); // neck
addDB(new THREE.Vector3(4.3,0.8,0),new THREE.Vector3(0.35,0.25,0.4),0x33aa22); // head green
addDB(new THREE.Vector3(4.55,0.75,0),new THREE.Vector3(0.2,0.12,0.25),0x33aa22); // snout
// Dragon head details
addDB(new THREE.Vector3(4.35,0.9,0.14),new THREE.Vector3(0.08,0.08,0.08),0xffffff); // left eye
addDB(new THREE.Vector3(4.35,0.9,-0.14),new THREE.Vector3(0.08,0.08,0.08),0xffffff); // right eye
addDB(new THREE.Vector3(4.35,0.92,0.14),new THREE.Vector3(0.04,0.04,0.04),0x000000); // left pupil
addDB(new THREE.Vector3(4.35,0.92,-0.14),new THREE.Vector3(0.04,0.04,0.04),0x000000); // right pupil
addDB(new THREE.Vector3(4.3,1.0,0),new THREE.Vector3(0.06,0.12,0.06),dbAcc); // horn
addDB(new THREE.Vector3(4.55,0.82,0),new THREE.Vector3(0.04,0.06,0.04),0x222222); // nose
// Mane
addDB(new THREE.Vector3(4.1,0.85,0.25),new THREE.Vector3(0.08,0.12,0.06),dbAcc);
addDB(new THREE.Vector3(4.1,0.85,-0.25),new THREE.Vector3(0.08,0.12,0.06),dbAcc);
addDB(new THREE.Vector3(4.0,0.9,0.2),new THREE.Vector3(0.06,0.1,0.05),0xff6644);
addDB(new THREE.Vector3(4.0,0.9,-0.2),new THREE.Vector3(0.06,0.1,0.05),0xff6644);
// Dragon tail at back
addDB(new THREE.Vector3(-4.1,0.45,0),new THREE.Vector3(0.3,0.15,0.5),dbAcc); // tail base
addDB(new THREE.Vector3(-4.3,0.55,0),new THREE.Vector3(0.25,0.12,0.35),0xcc4422); // tail mid
addDB(new THREE.Vector3(-4.55,0.65,0),new THREE.Vector3(0.2,0.08,0.2),0x33aa22); // tail tip green
addDB(new THREE.Vector3(-4.7,0.7,0),new THREE.Vector3(0.15,0.06,0.1),dbAcc); // tail end
// Oars (4 per side)
var oarPositions=[[-2.5,0.3,0.75],[-1.0,0.3,0.75],[1.0,0.3,0.75],[2.5,0.3,0.75],[-2.5,0.3,-0.75],[-1.0,0.3,-0.75],[1.0,0.3,-0.75],[2.5,0.3,-0.75]];
oarPositions.forEach(function(op){
  addDB(new THREE.Vector3(op[0],op[1],op[2]),new THREE.Vector3(0.04,0.04,0.35),0xccaa66);
});
// Decorative stripes along hull
addDB(new THREE.Vector3(0,0.5,0.58),new THREE.Vector3(6,0.02,0.02),dbGold);
addDB(new THREE.Vector3(0,0.5,-0.58),new THREE.Vector3(6,0.02,0.02),dbGold);
addDB(new THREE.Vector3(0,0.3,0.65),new THREE.Vector3(7,0.02,0.02),dbAcc);
addDB(new THREE.Vector3(0,0.3,-0.65),new THREE.Vector3(7,0.02,0.02),dbAcc);
// Bamboo poles
var bc=0x55aa44;
addDB(new THREE.Vector3(-9,1.5,-4),new THREE.Vector3(0.2,3,0.2),bc);
addDB(new THREE.Vector3(-9,1.5,4),new THREE.Vector3(0.2,3,0.2),bc);
addDB(new THREE.Vector3(9,1.5,-4),new THREE.Vector3(0.2,2.5,0.2),bc);
addDB(new THREE.Vector3(9,1.5,4),new THREE.Vector3(0.2,2.5,0.2),bc);
addDB(new THREE.Vector3(-5,1,8),new THREE.Vector3(0.15,2,0.15),bc);
addDB(new THREE.Vector3(5,1,8),new THREE.Vector3(0.15,2,0.15),bc);
addDB(new THREE.Vector3(-5,1,-8),new THREE.Vector3(0.15,2,0.15),bc);
addDB(new THREE.Vector3(5,1,-8),new THREE.Vector3(0.15,2,0.15),bc);
// Zongzi (realistic pyramid)
addZongzi(new THREE.Vector3(-6,0.14,-5),0.8);
addZongzi(new THREE.Vector3(6,0.16,-5),0.9);
addZongzi(new THREE.Vector3(-6,0.14,5),0.8);
addZongzi(new THREE.Vector3(6,0.18,5),1.0);
addZongzi(new THREE.Vector3(0,0.12,-6),0.7);
addZongzi(new THREE.Vector3(0,0.12,6),0.7);
addZongzi(new THREE.Vector3(-3,0.12,3),0.7);
addZongzi(new THREE.Vector3(3,0.12,-3),0.7);
// Lanterns (floating above) with glow lights
var ln=0xff4422;
addDB(new THREE.Vector3(-4,2.5,0),new THREE.Vector3(0.3,0.4,0.3),ln);
addDB(new THREE.Vector3(4,2.5,0),new THREE.Vector3(0.3,0.4,0.3),ln);
addDB(new THREE.Vector3(0,2.8,-4),new THREE.Vector3(0.3,0.4,0.3),ln);
addDB(new THREE.Vector3(0,2.8,4),new THREE.Vector3(0.3,0.4,0.3),ln);
// Lantern glow lights
var lanternLights=[];
[[-4,2.5,0],[4,2.5,0],[0,2.8,-4],[0,2.8,4]].forEach(function(p){
  var ll=new THREE.PointLight(0xff4422,1.2,6);ll.position.set(p[0],p[1],p[2]);scene.add(ll);lanternLights.push(ll);
});
// Rope between bamboo poles (zipline ropes)
addDB(new THREE.Vector3(-9,2.8,0),new THREE.Vector3(0.05,0.05,8),0x886644);
addDB(new THREE.Vector3(9,2.3,0),new THREE.Vector3(0.05,0.05,8),0x886644);
// Small flags on rope
addDB(new THREE.Vector3(-9,2.8,-3),new THREE.Vector3(0.4,0.3,0.02),0xff6644);
addDB(new THREE.Vector3(-9,2.8,3),new THREE.Vector3(0.4,0.3,0.02),0xff6644);
addDB(new THREE.Vector3(9,2.3,-3),new THREE.Vector3(0.4,0.3,0.02),0x44aaff);
addDB(new THREE.Vector3(9,2.3,3),new THREE.Vector3(0.4,0.3,0.02),0x44aaff);
// Zipline data
var ziplines=[{start:new THREE.Vector3(-9,2.8,-4),end:new THREE.Vector3(-9,2.8,4)},{start:new THREE.Vector3(9,2.3,-4),end:new THREE.Vector3(9,2.3,4)}];
var ziplineActive=false,ziplineData=null,ziplineProgress=0,ziplineDir=1;
var boatRideActive=false,boatRideTime=0;
// Hide dragon boat elements by default
dragonBoatElements.forEach(function(b){b.mesh.visible=false;});
// Nuclear map elements
var nuclearMapElements=[];
function addNukeBox(p,s,c,shadows,collide){
  if(shadows===undefined)shadows=true;
  var g=new THREE.BoxGeometry(s.x,s.y,s.z);
  var m=new THREE.MeshStandardMaterial({color:c,roughness:0.7,metalness:0.3});
  var mesh=new THREE.Mesh(g,m);
  mesh.position.copy(p);mesh.castShadow=shadows;mesh.receiveShadow=true;
  scene.add(mesh);
  var entry={pos:p.clone(),size:s.clone(),mesh:mesh,isNuclear:true};
  nuclearMapElements.push(entry);
  if(collide!==false)mapBoxes.push(entry);
}
// Nuclear floor
addNukeBox(new THREE.Vector3(0,-0.1,0),new THREE.Vector3(40,0.2,40),0x1a3a1a);
// Nuclear walls (thick concrete)
var nwH=10,nwT=1;
addNukeBox(new THREE.Vector3(0,nwH/2,-20),new THREE.Vector3(40,nwH,nwT),0x2a3a2a);
addNukeBox(new THREE.Vector3(0,nwH/2,20),new THREE.Vector3(40,nwH,nwT),0x2a3a2a);
addNukeBox(new THREE.Vector3(-20,nwH/2,0),new THREE.Vector3(nwT,nwH,40),0x2a3a2a);
addNukeBox(new THREE.Vector3(20,nwH/2,0),new THREE.Vector3(nwT,nwH,40),0x2a3a2a);
// Reactor base platform
addNukeBox(new THREE.Vector3(0,0.5,0),new THREE.Vector3(12,1,12),0x444444);
// Reactor core: large cylinder
function addNukeCyl(px,py,pz,r,h,c,em){
  var g=new THREE.CylinderGeometry(r,r,h,24,1);
  var m=new THREE.MeshStandardMaterial({color:c,emissive:em||0,emissiveIntensity:0.3});
  var mesh=new THREE.Mesh(g,m);
  mesh.position.set(px,py,pz);
  scene.add(mesh);
  nuclearMapElements.push({pos:new THREE.Vector3(px,py,pz),size:new THREE.Vector3(r*2,h,r*2),mesh:mesh,cyl:true});
}
addNukeCyl(0,3,0,5,5,0x555555,0x222222);
addNukeCyl(0,5.5,0,3.5,3,0x666666,0x333333);
addNukeCyl(0,7.5,0,2,1.5,0x777777,0x444444);
// Reactor glow core
var rcMat=new THREE.MeshStandardMaterial({color:0x44ff88,emissive:0x44ff88,emissiveIntensity:1.5});
var reactorGlow=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.8,16),rcMat);
reactorGlow.position.set(0,8.4,0);
scene.add(reactorGlow);
nuclearMapElements.push({pos:new THREE.Vector3(0,8.4,0),size:new THREE.Vector3(3,0.8,3),mesh:reactorGlow});
var rglow2=new THREE.PointLight(0x44ff88,2,15);
rglow2.position.set(0,8.4,0);
scene.add(rglow2);
nuclearMapElements.push({mesh:rglow2,light:true});
// Reactor pipes
var pipeMat=new THREE.MeshStandardMaterial({color:0x888888,metalness:0.6});
[0,90,180,270].forEach(function(deg){
  var rad=deg*Math.PI/180;
  var px=Math.cos(rad)*3.5, pz=Math.sin(rad)*3.5;
  var g=new THREE.CylinderGeometry(0.3,0.3,3,8);
  var m=new THREE.Mesh(g,pipeMat);
  m.position.set(px,4.5,pz);
  scene.add(m);
  nuclearMapElements.push({pos:new THREE.Vector3(px,4.5,pz),size:new THREE.Vector3(0.6,3,0.6),mesh:m});
});
// Hide nuclear elements by default
nuclearMapElements.forEach(function(b){b.mesh.visible=false;});
// ── Arena2 map elements ──
var arena2Tex=function(){var c=document.createElement('canvas');c.width=256;c.height=256;var cx=c.getContext('2d');cx.fillStyle='#e8e8e8';cx.fillRect(0,0,256,256);cx.strokeStyle='rgba(0,0,0,0.18)';cx.lineWidth=2;for(var i=0;i<40;i++){cx.beginPath();var x=Math.random()*256,y=Math.random()*256;cx.moveTo(x,y);cx.lineTo(x+(Math.random()-0.5)*100,y+(Math.random()-0.5)*100);cx.stroke()}cx.strokeStyle='rgba(0,0,0,0.08)';cx.lineWidth=4;for(var i=0;i<20;i++){cx.beginPath();var x=Math.random()*256,y=Math.random()*256;cx.moveTo(x,y);cx.lineTo(x+(Math.random()-0.5)*60,y+(Math.random()-0.5)*60);cx.stroke()}var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);t.anisotropy=4;return t}();
var arena2Elements=[];
function addA2Box(p,s,c,shadows){
  if(shadows===undefined)shadows=true;
  var g=new THREE.BoxGeometry(s.x,s.y,s.z);
  var m=new THREE.MeshStandardMaterial({color:c,roughness:0.85,metalness:0,map:arena2Tex});
  var mesh=new THREE.Mesh(g,m);
  mesh.position.copy(p);mesh.castShadow=shadows;mesh.receiveShadow=true;
  scene.add(mesh);
  var entry={pos:p.clone(),size:s.clone(),mesh:mesh,isArena2:true};
  arena2Elements.push(entry);
  mapBoxes.push(entry);
  mesh.visible=false;
}
function addA2Cyl(px,py,pz,r,h,c){
  var g=new THREE.CylinderGeometry(r,r,h,10);
  var m=new THREE.MeshStandardMaterial({color:c,roughness:0.85,metalness:0});
  var mesh=new THREE.Mesh(g,m);
  mesh.position.set(px,py,pz);mesh.castShadow=true;mesh.receiveShadow=true;
  scene.add(mesh);
  var entry={pos:new THREE.Vector3(px,py,pz),size:new THREE.Vector3(r*2,h,r*2),mesh:mesh,isArena2:true};
  arena2Elements.push(entry);
  mapBoxes.push(entry);
  mesh.visible=false;
}
function addA2Ramp(p,s,ang,axis,c){
  addBox(p,s,c);
  var b=mapBoxes[mapBoxes.length-1];
  b.isArena2=true;
  arena2Elements.push(b);
  var mesh=b.mesh;
  if(axis==='z')mesh.rotation.z=ang*Math.PI/180;
  else if(axis==='x')mesh.rotation.x=ang*Math.PI/180;
  mesh.visible=false;
}
// ═══════════════ 斷層競技場 (Fault Arena) ═══════════════
var faultElements=[];
var faultLights=[];
function buildFaultMap(){
  if(faultElements.length)return;
  var FCLR={
    ground:0x2a2d3a, wall:0x6a7086, wallH:0x5f6b82, ruin:0x8a736b,
    indoor:0x54646f, white:0xaab0c0, dark:0x3a3e4c,
    core:0xffc93f, green:0x35e08a, blue:0x3da5ff,
    red:0xff5a44, purple:0xb85cff, orange:0xff8a3d, teal:0x2fd8c8,
    plat:0x6b6f80, concrete:0x8a8d98, groundAccent:0x4a5470
  };
  var FM={
    ground:new THREE.MeshStandardMaterial({color:FCLR.ground,roughness:0.9,metalness:0.2}),
    groundAccent:new THREE.MeshStandardMaterial({color:FCLR.groundAccent,roughness:0.75,metalness:0.3}),
    wall:new THREE.MeshStandardMaterial({color:FCLR.wall,roughness:0.85,metalness:0.15}),
    wallH:new THREE.MeshStandardMaterial({color:FCLR.wallH,roughness:0.85,metalness:0.1}),
    ruin:new THREE.MeshStandardMaterial({color:FCLR.ruin,roughness:0.9}),
    indoor:new THREE.MeshStandardMaterial({color:FCLR.indoor,roughness:0.85,metalness:0.2}),
    white:new THREE.MeshStandardMaterial({color:FCLR.white,roughness:0.7,metalness:0.35}),
    dark:new THREE.MeshStandardMaterial({color:FCLR.dark,roughness:0.85,metalness:0.25}),
    plat:new THREE.MeshStandardMaterial({color:FCLR.plat,roughness:0.8,metalness:0.25}),
    conc:new THREE.MeshStandardMaterial({color:FCLR.concrete,roughness:0.85,metalness:0.2}),
    purple:new THREE.MeshStandardMaterial({color:FCLR.purple,emissive:FCLR.purple,emissiveIntensity:0.35,roughness:0.6}),
    orange:new THREE.MeshStandardMaterial({color:FCLR.orange,emissive:0xff5500,emissiveIntensity:0.35,roughness:0.6}),
    teal:new THREE.MeshStandardMaterial({color:FCLR.teal,emissive:FCLR.teal,emissiveIntensity:0.35,roughness:0.6}),
    neonC:new THREE.MeshBasicMaterial({color:FCLR.teal,transparent:true,opacity:0.85}),
    neonG:new THREE.MeshBasicMaterial({color:FCLR.green,transparent:true,opacity:0.85}),
    neonP:new THREE.MeshBasicMaterial({color:FCLR.purple,transparent:true,opacity:0.85}),
    neonO:new THREE.MeshBasicMaterial({color:FCLR.orange,transparent:true,opacity:0.85}),
    coreM:new THREE.MeshStandardMaterial({color:FCLR.core,emissive:FCLR.core,emissiveIntensity:1.2,roughness:0.3,metalness:0.6}),
    coreRing:new THREE.MeshBasicMaterial({color:FCLR.core,transparent:true,opacity:0.4,side:THREE.DoubleSide}),
    greenM:new THREE.MeshStandardMaterial({color:FCLR.green,emissive:FCLR.green,emissiveIntensity:0.7,roughness:0.5}),
    blueM:new THREE.MeshStandardMaterial({color:FCLR.blue,emissive:FCLR.blue,emissiveIntensity:0.6,roughness:0.5}),
    redM:new THREE.MeshStandardMaterial({color:FCLR.red,emissive:0xaa2211,emissiveIntensity:0.7,roughness:0.5}),
    crack:new THREE.MeshBasicMaterial({color:FCLR.teal,transparent:true,opacity:0.6}),
    crackDim:new THREE.MeshBasicMaterial({color:0x33ccee,transparent:true,opacity:0.3}),
    uDark:new THREE.MeshStandardMaterial({color:0x33373f,roughness:0.9}),
    uWall:new THREE.MeshStandardMaterial({color:0x5a6170,roughness:0.92}),
    pipe:new THREE.MeshStandardMaterial({color:0x2c2f38,roughness:0.6,metalness:0.5})
  };
  function fbx(x,y,z,sx,sy,sz,m){
    var g=new THREE.BoxGeometry(sx,sy,sz);
    var mesh=new THREE.Mesh(g,m);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    scene.add(mesh);
    var entry={pos:new THREE.Vector3(x,y,z),size:new THREE.Vector3(sx,sy,sz),mesh:mesh,isFault:true};
    faultElements.push(entry);mapBoxes.push(entry);
    mesh.visible=false;
  }
  function fcy(x,y,z,r,hh,m){
    var g=new THREE.CylinderGeometry(r,r,hh,14);
    var mesh=new THREE.Mesh(g,m);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    scene.add(mesh);
    var entry={pos:new THREE.Vector3(x,y,z),size:new THREE.Vector3(r*2,hh,r*2),mesh:mesh,isFault:true};
    faultElements.push(entry);mapBoxes.push(entry);
    mesh.visible=false;
  }
  function fneon(x,y,z,sx,sy,sz,m){ // non-collision neon decoration
    var mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);
    mesh.position.set(x,y,z);scene.add(mesh);
    var entry={pos:new THREE.Vector3(x,y,z),size:new THREE.Vector3(sx,sy,sz),mesh:mesh,isFault:true,noCollide:true};
    faultElements.push(entry);mesh.visible=false;
  }
  function fright(x,y,z,c,intensity,distance){
    var l=new THREE.PointLight(c,intensity||1,distance||26);
    l.position.set(x,y,z);scene.add(l);
    faultLights.push(l);l.visible=false;
  }
  // ── A. 地表本體 ──
  fbx(0,-0.5,0,70,1.0,66,FM.ground);
  fneon(0,0.02,0,70,0.04,66,FM.groundAccent);
  // 外框霓虹
  fneon(0,0.06,-33,70,0.06,0.2,FM.neonC);
  fneon(0,0.06,33,70,0.06,0.2,FM.neonC);
  fneon(-35,0.06,0,0.2,0.06,66,FM.neonC);
  fneon(35,0.06,0,0.2,0.06,66,FM.neonC);
  // ── B. 斷層溝槽（南半部，中心 z=16，與核心塔分離）──
  var trZ=16,tW=6.5;
  fneon(0,0.05,trZ-tW,40,0.12,0.2,FM.crack);
  fneon(0,0.05,trZ+tW,40,0.12,0.2,FM.crack);
  fbx(-10,-2.2,trZ-tW,40,4.5,0.6,FM.uWall);
  fbx(-10,-2.2,trZ+tW,40,4.5,0.6,FM.uWall);
  fbx(-10,-4.4,trZ,40,0.4,13,FM.uDark);
  fneon(-10,-4.0,trZ,30,0.08,10,FM.crackDim);
  // ── C. 階梯下溝 ──
  function fs(cx,dir){
    for(var i=0;i<5;i++){
      var y=-0.5-i*0.75;
      var z=dir<0?(trZ-tW+i*1.2):(trZ+tW-i*1.2);
      fbx(cx,y,z,4.5,0.75,1.2,FM.conc);
    }
  }
  fs(0,-1);fs(0,1);fs(-18,-1);fs(-18,1);fs(18,-1);fs(18,1);
  // ── D. B1 地下網路 ──
  fbx(-10,-2.9,trZ,40,0.4,13,FM.uDark);
  fbx(-10,-3.6,trZ-2,40,1.0,0.5,FM.uWall);
  fbx(-10,-3.6,trZ+2,40,1.0,0.5,FM.uWall);
  fbx(-10,-3.6,trZ-2,8,1.0,0.5,FM.uWall);fbx(18,-3.6,trZ-2,8,1.0,0.5,FM.uWall);
  fbx(-10,-3.6,trZ+2,8,1.0,0.5,FM.uWall);fbx(18,-3.6,trZ+2,8,1.0,0.5,FM.uWall);
  fbx(-18,-4.0,trZ,3,0.3,8,FM.uDark);
  fbx(18,-4.0,trZ,3,0.3,8,FM.uDark);
  fbx(-24,-4.0,trZ-4,3.5,0.3,5,FM.uDark);
  fbx(-25.5,-3.0,trZ-4,0.5,2.5,5,FM.uWall);
  fbx(24,-4.0,trZ+4,3.5,0.3,5,FM.uDark);
  fbx(25.5,-3.0,trZ+4,0.5,2.5,5,FM.uWall);
  for(var px=-16;px<=16;px+=8){fcy(px,-3.3,trZ-2,0.35,1.5,FM.uDark);fcy(px,-3.3,trZ+2,0.35,1.5,FM.uDark);}
  fneon(-10,-2.6,trZ-2,30,0.05,0.06,FM.crackDim);
  fneon(-10,-2.6,trZ+2,30,0.05,0.06,FM.crackDim);
  fbx(-10,-3.5,trZ,2.4,0.8,2.4,FM.uDark);
  fbx(-10,-2.8,trZ,1.4,0.6,1.4,FM.greenM);
  fbx(0,-3.3,trZ-4,3,2.2,0.4,FM.greenM);fbx(0,-3.3,trZ+4,3,2.2,0.4,FM.greenM);
  fright(-10,-2.5,trZ,0x33ff99,1.3,14);
  fright(-10,2,trZ-8,(function(){return 0x33ff99})(),0.6,20);
  // ── E. 通風豎井 ──
  var vents=[[-20,trZ],[-20,trZ+4],[20,trZ],[20,trZ+4],[8,trZ-3],[-8,trZ-3]];
  vents.forEach(function(v){
    var vx=v[0],vz=v[1];
    fbx(vx,-0.8,vz,1.9,3.4,0.15,FM.pipe);
    fbx(vx,-0.8,vz+0.8,1.9,3.4,0.15,FM.pipe);
    fbx(vx,-0.8,vz,1.9,3.4,-0.15,FM.pipe);
    fbx(vx,-0.8,vz-0.8,0.15,3.4,1.4,FM.pipe);
    fbx(vx,-3.3,vz,0.15,0.4,1.4,FM.pipe);
    fbx(vx,0.15,vz,0.15,0.4,1.4,FM.pipe);
    for(var r=0;r<4;r++){fbx(vx,-1.2-r*0.6,vz,1.4,0.05,0.05,FM.pipe);}
  });
  // ── F. 中央能量核心塔 ──
  fbx(0,0.6,0,6,1.2,6,FM.plat);
  fbx(0,1.3,0,4.5,0.4,4.5,FM.white);
  for(var a=0;a<4;a++){
    var ang=a*Math.PI/2+Math.PI/4;
    fcy(Math.cos(ang)*2.4,2.6,Math.sin(ang)*2.4,0.4,3.0,FM.dark);
  }
  fbx(0,3.6,0,2,1.2,2,FM.coreM);
  fbx(0,4.4,0,1.2,0.6,1.2,FM.coreM);
  fneon(-3.2,0.6,-2,0.5,1.2,1.2,FM.wall);fneon(3.2,0.6,2,0.5,1.2,1.2,FM.wall);
  fneon(-2,0.6,3.2,1.2,1.2,0.5,FM.wall);fneon(2,0.6,-3.2,1.2,1.2,0.5,FM.wall);
  fright(0,5,0,0xffcc33,1.8,26);
  // ── G. 左翼廢墟 ──
  fbx(-30,0.4,0,4,0.8,5,FM.redM);
  fbx(-28,0.9,-2.3,0.5,1.8,2.4,FM.redM);fbx(-28,0.9,2.3,0.5,1.8,2.4,FM.redM);
  fbx(-27,1.2,-5,5.5,2.4,0.5,FM.ruin);fbx(-27,1.2,5,4.5,2.4,0.5,FM.ruin);
  fbx(-25,1.6,9,3.2,3.2,0.5,FM.ruin);fbx(-23,0.5,-8,1.4,1,1.4,FM.dark);
  fbx(-24,0.5,-1,1.4,1,1.4,FM.dark);fbx(-20,0.5,8,1.4,1,1.4,FM.dark);
  fbx(-21,1.2,-12,3.6,2.4,0.5,FM.ruin);
  fbx(-17,0.5,-4,1.2,1,1.2,FM.dark);fbx(-15,0.5,11,1.2,1,1.2,FM.dark);
  fcy(-21,1.5,-10,0.55,3,FM.ruin);fcy(-25,1.5,6,0.55,3,FM.ruin);
  fbx(-15,1.2,-16,3,0.5,3,FM.ruin);
  fright(-30,2,0,FCLR.red,0.9,24);
  // ── H. 右翼室內 ──
  fbx(30,0.4,0,4,0.8,5,FM.blueM);
  fbx(28,0.9,-2.3,0.5,1.8,2.4,FM.blueM);fbx(28,0.9,2.3,0.5,1.8,2.4,FM.blueM);
  fbx(26,1.3,-4,2.8,2.6,0.4,FM.indoor);fbx(26,1.3,4,2.8,2.6,0.4,FM.indoor);
  fbx(27.4,1.3,-12,3.2,2.6,0.5,FM.indoor);fbx(27.4,1.3,12,3.2,2.6,0.5,FM.indoor);
  fbx(24,1.2,-9,0.5,2.4,3,FM.indoor);fbx(24,1.2,9,0.5,2.4,3,FM.indoor);
  fbx(25.5,1.2,-7,3.6,2.4,0.5,FM.indoor);fbx(25.5,1.2,7,3.6,2.4,0.5,FM.indoor);
  fbx(22,0.4,-1.5,1.2,0.8,1.2,FM.dark);fbx(22,0.4,1.5,1.2,0.8,1.2,FM.dark);
  fbx(20,0.4,6,1.2,0.8,1.2,FM.dark);
  fbx(18,1.2,11,3,2.4,0.4,FM.indoor);fbx(17,0.4,8,1.2,0.8,1.2,FM.dark);
  fbx(20,0.6,14,2,1.2,2,FM.conc);fbx(20,1.2,14,2,0.6,2,FM.conc);
  fright(30,2,0,FCLR.blue,0.9,24);
  // ── I. 中央要塞 ──
  fbx(-4,1.6,-10,7,3.2,0.5,FM.wallH);fbx(7,1.6,-10,7,3.2,0.5,FM.wallH);
  fbx(-6,1.6,10,5,3.2,0.5,FM.wallH);fbx(6,1.6,10,7,3.2,0.5,FM.wallH);
  fbx(-13,1.6,-2,0.5,3.2,8,FM.wallH);fbx(-13,1.6,6,0.5,3.2,8,FM.wallH);
  fbx(13,1.6,-2,0.5,3.2,8,FM.wallH);fbx(13,1.6,6,0.5,3.2,8,FM.wallH);
  fcy(-12,0.7,-9,1.2,1.4,FM.wall);fcy(12,0.7,-9,1.2,1.4,FM.wall);
  fcy(-12,0.7,9,1.2,1.4,FM.wall);fcy(12,0.7,9,1.2,1.4,FM.wall);
  fbx(0,1.5,-5,0.5,3.0,8,FM.wall);
  fbx(0,1.5,5,0.5,3.0,8,FM.wall);
  fbx(-6,1.5,0,8,3.0,0.5,FM.wall);
  fbx(6,1.5,0,8,3.0,0.5,FM.wall);
  fbx(-7,0.5,-6,1.5,1.0,1.5,FM.dark);fbx(7,0.5,-6,1.5,1.0,1.5,FM.dark);
  fbx(-7,0.5,6,1.5,1.0,1.5,FM.dark);fbx(7,0.5,6,1.5,1.0,1.5,FM.dark);
  fbx(-9,1.0,-3,0.8,2.0,0.8,FM.dark);fbx(9,1.0,3,0.8,2.0,0.8,FM.dark);
  fbx(-9,0.8,-7,2.5,1.6,0.4,FM.wall);fbx(9,0.8,7,2.5,1.6,0.4,FM.wall);
  fbx(-3,0.45,7,1.3,0.9,1.3,FM.dark);fbx(-3,1.15,7,1.3,0.5,1.3,FM.dark);
  fbx(3,0.45,-7,1.3,0.9,1.3,FM.dark);fbx(3,1.15,-7,1.3,0.5,1.3,FM.dark);
  fbx(-5,0.45,-8,1.3,0.9,1.3,FM.dark);
  fbx(5,0.45,8,1.3,0.9,1.3,FM.dark);
  fbx(-15,0.5,0,2.4,1.0,2.4,FM.dark);fcy(-17,0.5,0,0.8,1.0,FM.orange);
  fbx(15,0.5,0,2.4,1.0,2.4,FM.dark);fcy(17,0.5,0,0.8,1.0,FM.orange);
  fbx(-3,0.5,-3.5,2,1.0,0.5,FM.wall);fbx(-6,0.5,-3,1,1.0,0.6,FM.wall);
  fbx(3,0.5,3.5,2,1.0,0.5,FM.wall);fbx(6,0.5,3,1,1.0,0.6,FM.wall);
  fbx(-1,3.2,-5,8,0.3,1.6,FM.plat);
  fbx(-1,3.2,-13,6,0.3,1.6,FM.plat);
  fbx(-1,3.4,-6,8,0.25,0.15,FM.dark);fbx(-1,3.4,-4,8,0.25,0.15,FM.dark);
  fcy(-4,1.6,-5,0.3,3.2,FM.dark);fcy(3,1.6,-5,0.3,3.2,FM.dark);
  fbx(-9,3.2,3,1.6,0.3,5,FM.plat);
  fcy(-9,1.6,3,0.3,3.2,FM.dark);
  fbx(-4,0.7,-5,2,0.4,1.4,FM.conc);fbx(-4,1.3,-5,2,0.5,1.4,FM.conc);
  fbx(-4,1.95,-5,2,0.5,1.4,FM.conc);
  fbx(-16,0.6,-6,3,1.2,0.6,FM.teal);fbx(-17,0.6,8,3,1.2,0.6,FM.teal);
  fbx(16,0.6,-6,3,1.2,0.6,FM.teal);fbx(17,0.6,8,3,1.2,0.6,FM.teal);
  fright(-12,3,18,FCLR.purple,0.8,26);
  fright(12,3,-16,FCLR.orange,0.8,26);
  fright(0,2,-8,FCLR.teal,0.7,20);
  // ── I2. 密度填充：北/南走廊 ──
  fbx(-22,0.6,-24,5,1.2,0.6,FM.indoor);fbx(-16,0.9,-22,4,1.8,0.5,FM.indoor);
  fbx(-11,0.6,-24,4,1.2,0.6,FM.indoor);fbx(-5,0.9,-21,4,1.8,0.5,FM.indoor);
  fbx(4,0.6,-24,6,1.2,0.6,FM.indoor);fbx(11,0.9,-22,5,1.8,0.5,FM.indoor);
  fbx(17,0.6,-24,4,1.2,0.6,FM.indoor);fbx(23,0.9,-21,4,1.8,0.5,FM.indoor);
  fbx(-19,0.4,-26,1.3,0.8,1.3,FM.dark);fbx(-9,0.4,-26,1.3,0.8,1.3,FM.dark);
  fbx(8,0.4,-25,1.3,0.8,1.3,FM.dark);fbx(20,0.4,-26,1.3,0.8,1.3,FM.dark);
  fbx(-20,0.6,26,6,1.2,0.6,FM.indoor);fbx(-13,0.9,24,4,1.8,0.5,FM.indoor);
  fbx(-6,0.6,26,5,1.2,0.6,FM.indoor);fbx(2,0.9,24,5,1.8,0.5,FM.indoor);
  fbx(10,0.6,26,5,1.2,0.6,FM.indoor);fbx(18,0.9,24,5,1.8,0.5,FM.indoor);
  fbx(-16,0.4,28,1.3,0.8,1.3,FM.dark);fbx(4,0.4,28,1.3,0.8,1.3,FM.dark);
  fbx(14,0.4,27,1.3,0.8,1.3,FM.dark);
  fbx(-20,0.7,-14,4,1.4,0.6,FM.ruin);fbx(-16,1.0,-10,3,2.0,0.6,FM.ruin);
  fbx(-19,0.7,12,4,1.4,0.6,FM.ruin);fbx(-15,1.0,8,3,2.0,0.6,FM.ruin);
  fbx(-22,0.5,-18,2,1.0,2,FM.dark);fbx(-18,0.5,16,2,1.0,2,FM.dark);
  fbx(-29,0.5,-10,2.4,1.0,2.4,FM.ruin);fbx(-29,0.9,-10,2.4,0.4,2.4,FM.white);
  fbx(-29,0.5,10,2.4,1.0,2.4,FM.ruin);fbx(-29,0.9,10,2.4,0.4,2.4,FM.white);
  fbx(18,0.7,-14,4,1.4,0.6,FM.indoor);fbx(15,1.0,-10,3,2.0,0.6,FM.indoor);
  fbx(19,0.7,12,4,1.4,0.6,FM.indoor);fbx(16,1.0,8,3,2.0,0.6,FM.indoor);
  fbx(22,0.5,-18,2,1.0,2,FM.dark);fbx(18,0.5,16,2,1.0,2,FM.dark);
  fbx(29,0.5,-10,2.4,1.0,2.4,FM.indoor);fbx(29,0.9,-10,2.4,0.4,2.4,FM.white);
  fbx(29,0.5,10,2.4,1.0,2.4,FM.indoor);fbx(29,0.9,10,2.4,0.4,2.4,FM.white);
  fbx(-14,0.55,-4,1.5,1.1,1.5,FM.dark);fbx(-14,0.5,9,1.5,1.0,1.5,FM.dark);
  fbx(-17,0.6,3,2,1.2,0.5,FM.wall);fbx(-11,0.7,-9,2,1.4,0.5,FM.wall);
  fbx(14,0.55,-4,1.5,1.1,1.5,FM.dark);fbx(14,0.5,9,1.5,1.0,1.5,FM.dark);
  fbx(17,0.6,3,2,1.2,0.5,FM.wall);fbx(11,0.7,-9,2,1.4,0.5,FM.wall);
  fbx(-5,0.5,20,1.6,1.0,1.6,FM.dark);fbx(6,0.5,20,1.6,1.0,1.6,FM.dark);
  fbx(0,0.8,17,3,1.6,0.5,FM.wall);
  [[-21,-17],[-18,14],[-14,-16],[14,-16],[18,14],[21,-17],
   [-21,19],[-16,22],[16,22],[21,19],[-6,-18],[6,-18],
   [-24,22],[24,22],[-24,-22],[24,-22]].forEach(function(p){
     fbx(p[0],0.5,p[1],1,1.0,1,FM.dark);
     fbx(p[0],0.5,p[1]+4,1,0.7,1,FM.dark);
   });
  // ── J. 上層高台 ──
  fbx(-1,3.0,-20,13,0.4,4.5,FM.plat);
  fbx(-11,5.1,-16,4.5,0.35,4,FM.plat);
  fbx(11,5.1,-16,4.5,0.35,4,FM.plat);
  fbx(15,3.0,3,4.5,0.35,4.5,FM.plat);
  fbx(-1,3.0,15,11,0.35,4,FM.plat);
  fcy(-3,2.8,-20,0.4,5.6,FM.dark);fcy(3,2.8,-20,0.4,5.6,FM.dark);
  fcy(15,1.5,3,0.4,3.0,FM.dark);
  fcy(-5,1.5,15,0.4,3.0,FM.dark);fcy(5,1.5,15,0.4,3.0,FM.dark);
  fbx(-12,1.6,-20,4,0.5,2.4,FM.plat);
  fbx(12,4.6,-18,4,0.5,2.4,FM.plat);
  fbx(18,1.1,3,3,0.5,2.5,FM.conc);
  fbx(-7,1.1,15,3,0.5,2.5,FM.conc);
  fbx(-1,3.2,-22.3,13,0.3,0.2,FM.dark);fbx(-1,3.2,-17.7,13,0.3,0.2,FM.dark);
  fbx(-13.3,5.3,-16,0.2,0.3,4,FM.dark);fbx(-8.7,5.3,-16,0.2,0.3,4,FM.dark);
  fbx(13.3,5.3,-16,0.2,0.3,4,FM.dark);fbx(8.7,5.3,-16,0.2,0.3,4,FM.dark);
  fneon(-1,3.2,-20,13,0.06,0.1,FM.crack);
  // ── J2. 錯層地形 ──
  fbx(-7,0.55,15,6,1.1,4,FM.plat);
  fbx(-7,1.35,13,5,0.6,3,FM.plat);
  fbx(-8,2.05,-11,3.4,0.8,2.4,FM.plat);
  fbx(-4,2.35,-10,2,0.6,2,FM.white);
  fbx(-5.5,0.2,18,2.5,0.4,2,FM.dark);
  fbx(-18,0.35,6,5,0.7,5,FM.purple);
  fbx(-16,0.55,4,3,1.1,0.4,FM.wall);
  fbx(-16,0.3,8,0.5,0.6,2,FM.dark);
  fbx(-16,0.2,2,2,0.4,1.4,FM.conc);fbx(-15,0.6,1,2,0.4,1.4,FM.conc);
  fbx(13,0.5,-15,5,1.0,5,FM.plat);
  fbx(13,1.25,-15,4,0.5,4,FM.purple);
  fbx(14,1.9,-15,2.5,0.8,2.5,FM.white);
  fbx(9,0.25,-18,2,0.5,2,FM.conc);fbx(9,0.75,-17,2,0.5,2,FM.conc);
  fbx(9,1.3,-15,2,0.6,2,FM.conc);
  for(var sl=0;sl<4;sl++){fbx(17+sl*1.3,0.25+sl*0.6,3,1.3,0.6,3,FM.orange);}
  for(var sl2=0;sl2<4;sl2++){fbx(-17-sl2*1.3,-0.15+sl2*0.6,-16,1.3,0.6,3,FM.orange);}
  fbx(-2,0.35,-13,1.3,0.7,1.3,FM.ruin);
  fbx(2,0.55,-14,1,1.1,1,FM.ruin);
  fbx(-1,0.8,-12,1.4,0.5,1.4,FM.dark);
  fbx(3,0.3,-12,1.2,0.6,1.2,FM.ruin);
  fbx(2,0.9,8,6,1.8,0.4,FM.teal);
  fbx(-2,0.55,-3,5,1.1,0.4,FM.teal);
  fcy(-2,0.6,5,1.1,1.2,FM.orange);
  fcy(-2,1.4,5,1.1,1.2,FM.orange);
  fcy(-2,2.2,5,0.9,0.7,FM.orange);
  fbx(-2,2.55,5,1.6,0.3,1.6,FM.white);
  fbx(-24,0.4,-18,2.6,0.8,2.6,FM.purple);
  fbx(-26,0.9,-16,1.6,0.5,1.6,FM.dark);
  fbx(24,0.4,18,2.6,0.8,2.6,FM.orange);
  fbx(26,0.9,16,1.6,0.5,1.6,FM.dark);
  fneon(-2,0.05,18,10,0.06,0.25,FM.neonG);
  fneon(-18,0.05,6,5,0.06,0.25,FM.neonP);
  fneon(13,0.05,-15,5,0.06,0.25,FM.neonO);
  // ── K. 外圍圍牆 ──
  fbx(-20,2.5,-32,16,5,1.2,FM.wallH);fbx(0,2.5,-32,7,5,1.2,FM.wallH);fbx(18,2.5,-32,12,5,1.2,FM.wallH);
  fbx(-13,1.2,-32,4,2.4,1.2,FM.dark);fbx(13,1.2,-32,4,2.4,1.2,FM.dark);
  fbx(-22,2.5,32,14,5,1.2,FM.wallH);fbx(-2,2.5,32,9,5,1.2,FM.wallH);fbx(16,2.5,32,14,5,1.2,FM.wallH);
  fbx(7,1.2,32,4,2.4,1.2,FM.dark);
  [-16,0,18].forEach(function(z){fbx(-35,2.5,z,1.2,5,8,FM.wallH);});
  [-16,0,18].forEach(function(z){fbx(35,2.5,z,1.2,5,8,FM.wallH);});
  [[-35,-32],[35,-32],[-35,32],[35,32]].forEach(function(p){fbx(p[0],2.5,p[1],2,5,2,FM.dark);});
  // 隱藏捷徑 / 玻璃跳台
  fneon(-34.2,1.8,11,0.2,1.4,3,FM.crack);
  fneon(34,1.3,14,0.2,2.6,3,FM.crack);
  fbx(-2,4.8,10,2,0.25,2,FM.white);
  fbx(-6,1.2,31,3.4,2.4,0.8,FM.ruin);
  faultFog();
}
function faultFog(){
  if(window._faultFogApplied)return;
  window._faultFogApplied=true;
  var fogL={
    base:function(){scene.fog=new THREE.Fog(0x12142a,90,220);},
    dense:function(){scene.fog=new THREE.Fog(0x12142a,30,80);}
  };
  var bg=document.createElement('canvas');bg.width=2;bg.height=512;
  var bc=bg.getContext('2d');
  var grd=bc.createLinearGradient(0,0,0,512);
  grd.addColorStop(0,'#0a0a14');grd.addColorStop(0.3,'#1a1a34');
  grd.addColorStop(0.6,'#2a2a52');grd.addColorStop(0.85,'#4a4a7a');grd.addColorStop(1,'#60608f');
  bc.fillStyle=grd;bc.fillRect(0,0,2,512);
  window._faultBg=new THREE.CanvasTexture(bg);
}
// ═══════════════ 競技場 ARENA3 (Smooth Parkour Arena) ═══════════════
var arena3Elements=[];
var arena3Lights=[];
function buildArena3Map(){
  if(arena3Elements.length)return;
  var A3={
    ground:new THREE.MeshStandardMaterial({color:0x2d3242,roughness:0.35,metalness:0.15}),
    wall:new THREE.MeshStandardMaterial({color:0x6a7086,roughness:0.4,metalness:0.2}),
    wallLight:new THREE.MeshStandardMaterial({color:0x8a92a8,roughness:0.35,metalness:0.2}),
    wallDark:new THREE.MeshStandardMaterial({color:0x3a3e4c,roughness:0.5,metalness:0.15}),
    accent:new THREE.MeshStandardMaterial({color:0x4a8cff,roughness:0.4,metalness:0.3}),
    accentRed:new THREE.MeshStandardMaterial({color:0xff5a44,roughness:0.4,metalness:0.25}),
    floorLight:new THREE.MeshStandardMaterial({color:0x3a4054,roughness:0.45,metalness:0.2}),
    white:new THREE.MeshStandardMaterial({color:0xc8cede,roughness:0.3,metalness:0.35}),
    glass:new THREE.MeshStandardMaterial({color:0x6fb6ff,transparent:true,opacity:0.22,roughness:0.1,metalness:0.6}),
    green:new THREE.MeshStandardMaterial({color:0x35e08a,emissive:0x35e08a,emissiveIntensity:0.8,roughness:0.4}),
    purple:new THREE.MeshStandardMaterial({color:0xb85cff,emissive:0xb85cff,emissiveIntensity:0.6,roughness:0.4}),
    blue:new THREE.MeshStandardMaterial({color:0x3da5ff,emissive:0x3da5ff,emissiveIntensity:0.6,roughness:0.4}),
    red:new THREE.MeshStandardMaterial({color:0xff6a54,emissive:0xff5040,emissiveIntensity:0.5,roughness:0.4})
  };
  function abx(x,y,z,sx,sy,sz,m){ // solid box (collide)
    var g=new THREE.BoxGeometry(sx,sy,sz);
    var mesh=new THREE.Mesh(g,m);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    scene.add(mesh);
    var entry={pos:new THREE.Vector3(x,y,z),size:new THREE.Vector3(sx,sy,sz),mesh:mesh,isArena3:true};
    arena3Elements.push(entry);mapBoxes.push(entry);
    mesh.visible=false;
  }
  function anc(x,y,z,sx,sy,sz,m){ // non-collide decoration
    var mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);
    mesh.position.set(x,y,z);scene.add(mesh);
    var entry={pos:new THREE.Vector3(x,y,z),size:new THREE.Vector3(sx,sy,sz),mesh:mesh,isArena3:true,noCollide:true};
    arena3Elements.push(entry);mesh.visible=false;
  }
  function acy(x,y,z,r,hh,m){ // solid cylinder
    var g=new THREE.CylinderGeometry(r,r,hh,14);
    var mesh=new THREE.Mesh(g,m);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    scene.add(mesh);
    var entry={pos:new THREE.Vector3(x,y,z),size:new THREE.Vector3(r*2,hh,r*2),mesh:mesh,isArena3:true};
    arena3Elements.push(entry);mapBoxes.push(entry);
    mesh.visible=false;
  }
  function alt(x,y,z,c,intensity,distance){
    var l=new THREE.PointLight(c,intensity||0.8,distance||20);
    l.position.set(x,y,z);scene.add(l);
    arena3Lights.push(l);l.visible=false;
  }
  function neonDisc(x,y,z,r,m){
    var disc=new THREE.Mesh(new THREE.CircleGeometry(r,24),m);
    disc.rotation.x=-Math.PI/2;disc.position.set(x,y,z);scene.add(disc);
    var entry={pos:new THREE.Vector3(x,y,z),size:new THREE.Vector3(r*2,0.05,r*2),mesh:disc,isArena3:true,noCollide:true};
    arena3Elements.push(entry);disc.visible=false;
  }
  // ── 地板 + 外牆（120x120，外牆高 14）──
  abx(0,-0.5,0,120,1.0,120,A3.ground);
  anc(0,0.01,0,120,0.05,120,A3.floorLight);
  abx(0,7,-59.5,120,14,1,A3.wallDark);
  abx(0,7,59.5,120,14,1,A3.wallDark);
  abx(-59.5,7,0,1,14,120,A3.wallDark);
  abx(59.5,7,0,1,14,120,A3.wallDark);
  // 牆緣導引霓虹
  anc(0,0.06,-59,118,0.06,0.2,new THREE.MeshBasicMaterial({color:0x35e08a,transparent:true,opacity:0.35}));
  anc(0,0.06,59,118,0.06,0.2,new THREE.MeshBasicMaterial({color:0x35e08a,transparent:true,opacity:0.35}));
  anc(-59,0.06,0,0.2,0.06,118,new THREE.MeshBasicMaterial({color:0x35e08a,transparent:true,opacity:0.35}));
  anc(59,0.06,0,0.2,0.06,118,new THREE.MeshBasicMaterial({color:0x35e08a,transparent:true,opacity:0.35}));
  // 地面十字導引線
  anc(0,0.02,0,0.15,0.02,108,new THREE.MeshBasicMaterial({color:0x3da5ff,transparent:true,opacity:0.25}));
  anc(0,0.02,0,108,0.02,0.15,new THREE.MeshBasicMaterial({color:0x3da5ff,transparent:true,opacity:0.25}));

  // ── 高架環形貓道（高度 7.15，四牆內側一圈）──
  abx(0,7.3,-50,104,0.3,2.4,A3.wallLight);
  abx(0,7.3,50,104,0.3,2.4,A3.wallLight);
  abx(-50,7.3,0,2.4,0.3,104,A3.wallLight);
  abx(50,7.3,0,2.4,0.3,104,A3.wallLight);
  // 貓道欄杆（細柱 + 橫桿，不碰撞）
  [50,-50].forEach(function(rz){
    [-52,-46,-40,-34,-28,-22,-16,-10,-4,0,4,10,16,22,28,34,40,46,52].forEach(function(px){
      anc(px-1.9,7.52,rz,0.14,1.6,0.14,A3.white);
      anc(px+1.9,7.52,rz,0.14,1.6,0.14,A3.white);
      anc(px-1.9,8.52,rz,0.1,0.08,0.1,A3.white);
      anc(px+1.9,8.52,rz,0.1,0.08,0.1,A3.white);
    });
  });
  [50,-50].forEach(function(rx){
    [-52,-46,-40,-34,-28,-22,-16,-10,-4,0,4,10,16,22,28,34,40,46,52].forEach(function(pz){
      anc(rx,pz-1.9,7.52,0.14,1.6,0.14,A3.white);
      anc(rx,pz+1.9,7.52,0.14,1.6,0.14,A3.white);
      anc(rx,pz-1.9,8.52,0.08,0.1,0.1,A3.white);
      anc(rx,pz+1.9,8.52,0.08,0.1,0.1,A3.white);
    });
  });
  // 貓道轉角高台
  [[-50,-50],[50,-50],[-50,50],[50,50]].forEach(function(cp){
    abx(cp[0],7.65,cp[1],5,0.5,5,A3.white);
    alt(cp[0],9.6,cp[1],0x35e08a,0.5,10);
  });
  // 四角牆緣跳台（高 4，連結貓道與地面）
  [{x:-50,z:0},{x:50,z:0},{x:0,z:-50},{x:0,z:50}].forEach(function(t){
    abx(t.x,4,t.z,5,0.4,5,A3.wallLight);
    neonDisc(t.x,4.22,t.z,1.1,A3.green);
    alt(t.x,4.9,t.z,0x35e08a,0.5,9);
  });
  // 牆緣跳台→貓道 平滑坡
  abx(0,5.6,-44,2,0.3,9,A3.wallLight);
  abx(0,5.6,44,2,0.3,9,A3.wallLight);
  abx(-44,5.6,0,9,0.3,2,A3.wallLight);
  abx(44,5.6,0,9,0.3,2,A3.wallLight);

  // ── 中央多層核心塔 ──
  abx(0,0.45,0,18,0.9,18,A3.floorLight);
  abx(0,1.7,0,13,0.8,13,A3.wallLight);
  abx(0,2.9,0,9,0.8,9,A3.white);
  abx(0,4.15,0,5,0.7,5,A3.accent);
  acy(0,6.65,0,1.5,6.0,A3.accent); // 核心柱（碰撞）
  abx(0,9.85,0,2.6,0.5,2.6,A3.white); // 頂冠
  alt(0,11,0,0xffc93f,1.6,26);
  // 中場控制點光柱（裝飾）
  neonDisc(0,9.9,0,1.9,new THREE.MeshStandardMaterial({color:0xffc93f,emissive:0xffc93f,emissiveIntensity:1.1,side:THREE.DoubleSide}));
  anc(0,11.4,0,0.7,3.5,0.7,new THREE.MeshStandardMaterial({color:0xffc93f,emissive:0xffc93f,emissiveIntensity:1.2,transparent:true,opacity:0.3}));
  // 玻璃罩（不碰撞）
  var aglass=new THREE.Mesh(new THREE.CylinderGeometry(4.5,5,7,20,1,true),A3.glass);
  aglass.position.set(0,5,0);scene.add(aglass);
  var agEntry={pos:new THREE.Vector3(0,5,0),size:new THREE.Vector3(9,7,10),mesh:aglass,isArena3:true,noCollide:true};
  arena3Elements.push(agEntry);aglass.visible=false;
  // 中央塔四向平滑坡（登塔）
  abx(0,0.9,-11.5,2.6,1.2,14,A3.wallLight);
  abx(0,0.9,11.5,2.6,1.2,14,A3.wallLight);
  abx(-11.5,0.9,0,14,1.2,2.6,A3.wallLight);
  abx(11.5,0.9,0,14,1.2,2.6,A3.wallLight);
  // 二→三層 坡
  abx(0,2.3,-6.9,2.2,1.1,7,A3.white);
  abx(0,2.3,6.9,2.2,1.1,7,A3.white);
  abx(-6.9,2.3,0,7,1.1,2.2,A3.white);
  abx(6.9,2.3,0,7,1.1,2.2,A3.white);
  // 三→核平台 坡
  abx(0,3.5,-4.6,2,0.9,5,A3.accent);
  abx(0,3.5,4.6,2,0.9,5,A3.accent);

  // ── 跑酷漂浮跳台（紫色，兩圈對稱）──
  [[-34,-34],[34,-34],[-34,34],[34,34]].forEach(function(p){
    abx(p[0],5.85,p[1],4,0.5,4,A3.wallLight);
    neonDisc(p[0],5.9,p[1],1.2,A3.purple);
  });
  [[-22,-22],[22,-22],[-22,22],[22,22]].forEach(function(p){
    abx(p[0],4.05,p[1],4,0.5,4,A3.wallLight);
    neonDisc(p[0],4.1,p[1],1.2,A3.purple);
  });

  // ── 跑酷新地形（壁跑踏條 / 空中走廊 / 訓練階梯 / 中繼台）──
  // 壁跑踏條：貼牆內側，高度 3.0 與 6.2 交替
  [
    [-57.6,24,3.0,'h'],[-57.6,40,6.2,'h'],[-57.6,-24,3.0,'h'],[-57.6,-40,6.2,'h'],
    [57.6,24,3.0,'h'],[57.6,40,6.2,'h'],[57.6,-24,3.0,'h'],[57.6,-40,6.2,'h'],
    [-24,-57.6,3.0,'v'],[-40,-57.6,6.2,'v'],[24,-57.6,3.0,'v'],[40,-57.6,6.2,'v'],
    [-24,57.6,3.0,'v'],[-40,57.6,6.2,'v'],[24,57.6,3.0,'v'],[40,57.6,6.2,'v']
  ].forEach(function(v){
    if(v[3]==='h')abx(v[0],v[2],v[1],7,0.5,0.7,A3.wallLight);
    else abx(v[1],v[2],v[0],0.7,0.5,7,A3.wallLight);
  });
  // 空中走廊（十字低空平滑長台）
  abx(0,1.65,-30,26,0.6,3,A3.floorLight);
  abx(0,1.65,30,26,0.6,3,A3.floorLight);
  abx(-30,1.65,0,3,0.6,26,A3.floorLight);
  abx(30,1.65,0,3,0.6,26,A3.floorLight);
  // 四角訓練階梯
  [[41,41],[-41,41],[41,-41],[-41,-41]].forEach(function(p){
    var x=p[0],z=p[1];
    abx(x,0.27,z,4,0.55,4,A3.floorLight);
    abx(x,0.85,z,3.2,0.6,3.2,A3.wallLight);
    abx(x,1.6,z,2.4,0.7,2.4,A3.white);
    alt(x,2.4,z,0x35e08a,0.4,8);
  });
  // 中央塔外圈中繼浮空台
  [[-9,-24],[9,-24],[-9,24],[9,24],[-24,-9],[-24,9],[24,-9],[24,9]].forEach(function(p){
    abx(p[0],1.9,p[1],0.6,0.55,3.4,A3.wallLight);
  });
  [[-24,-16],[24,-16],[-24,16],[24,16],[-16,-24],[-16,24],[16,-24],[16,24]].forEach(function(p){
    abx(p[0],1.0,p[1],3.4,0.6,0.6,A3.wallLight);
  });

  // ── 重生點 A（藍北）與 B（紅南）──
  function asp(team,x,z){
    var col=team==='A'?A3.blue:A3.red;
    neonDisc(x,0.05,z,3,new THREE.MeshStandardMaterial({color:team==='A'?0x3da5ff:0xff5a44,transparent:true,opacity:0.2,side:THREE.DoubleSide}));
    anc(x,0.06,z,6.8,0.02,6.8,new THREE.MeshBasicMaterial({color:team==='A'?0x3da5ff:0xff5a44,transparent:true,opacity:0.25}));
    abx(x,3,z+(team==='A'?-2:2),12,6,1,team==='A'?A3.accent:A3.accentRed);
    abx(x-5,2,z,2.5,4,2.5,A3.wallLight);
    abx(x+5,2,z,2.5,4,2.5,A3.wallLight);
    alt(x,7,z,team==='A'?0x3da5ff:0xff5a44,0.8,13);
  }
  asp('A',0,-48);
  asp('B',0,48);

  // ── 地面掩體（少量平滑牆）──
  [[-22,10],[-22,-10],[22,10],[22,-10]].forEach(function(p){
    abx(p[0],1.1,p[1],6,2.2,1.2,A3.wallLight);
  });
  [[-10,22],[-10,-22],[10,22],[10,-22]].forEach(function(p){
    abx(p[0],1.1,p[1],1.2,2.2,6,A3.wallLight);
  });
  [[-40,-16],[40,-16],[-40,16],[40,16]].forEach(function(p){
    abx(p[0],1.7,p[1],2.4,3.4,2.4,A3.wallLight);
  });
  // 中央四目標點（地面霓虹）
  [[-14,-14],[-14,14],[14,-14],[14,14]].forEach(function(p){
    neonDisc(p[0],0.05,p[1],1.1,A3.green);
  });

  // ── 地圖燈光 ──
  alt(0,9,0,0x5577aa,0.6,40);
  alt(-30,6,-30,0x4466aa,0.5,30);
  alt(30,6,-30,0x4466aa,0.5,30);
  alt(-30,6,30,0x4466aa,0.5,30);
  alt(30,6,30,0x4466aa,0.5,30);
}
// Arena2 arena: 44x32, bright whitebox style
var A2=0xeeeeee,A2L=0xdddddd,A2M=0xcccccc,A2A=0xbbbbbb,A2D=0xaaaaaa;
var A2X=22,A2Z=16;
// Ground
addA2Box(new THREE.Vector3(0,-0.15,0),new THREE.Vector3(A2X*2,0.3,A2Z*2),A2D);
addA2Box(new THREE.Vector3(0,0.05,0),new THREE.Vector3(A2X*2,0.1,A2Z*2),A2);
// Outer walls
addA2Box(new THREE.Vector3(0,2.5,-A2Z),new THREE.Vector3(A2X*2,5,0.8),A2L);
addA2Box(new THREE.Vector3(0,2.5,A2Z),new THREE.Vector3(A2X*2,5,0.8),A2L);
addA2Box(new THREE.Vector3(-A2X,2.5,0),new THREE.Vector3(0.8,5,A2Z*2),A2L);
addA2Box(new THREE.Vector3(A2X,2.5,0),new THREE.Vector3(0.8,5,A2Z*2),A2L);
// Corner pillars
addA2Box(new THREE.Vector3(-A2X,2.5,-A2Z),new THREE.Vector3(1.2,5,1.2),A2D);
addA2Box(new THREE.Vector3(A2X,2.5,-A2Z),new THREE.Vector3(1.2,5,1.2),A2D);
addA2Box(new THREE.Vector3(-A2X,2.5,A2Z),new THREE.Vector3(1.2,5,1.2),A2D);
addA2Box(new THREE.Vector3(A2X,2.5,A2Z),new THREE.Vector3(1.2,5,1.2),A2D);
// Spawn platforms
addA2Box(new THREE.Vector3(-17,0.5,0),new THREE.Vector3(6,1,5),A2M);
addA2Box(new THREE.Vector3(-20,1.0,0),new THREE.Vector3(0.4,2,5.6),A2D);
addA2Box(new THREE.Vector3(-17,1.0,-2.8),new THREE.Vector3(6,2,0.4),A2D);
addA2Box(new THREE.Vector3(-17,1.0,2.8),new THREE.Vector3(6,2,0.4),A2D);
addA2Box(new THREE.Vector3(17,0.5,0),new THREE.Vector3(6,1,5),A2M);
addA2Box(new THREE.Vector3(20,1.0,0),new THREE.Vector3(0.4,2,5.6),A2D);
addA2Box(new THREE.Vector3(17,1.0,-2.8),new THREE.Vector3(6,2,0.4),A2D);
addA2Box(new THREE.Vector3(17,1.0,2.8),new THREE.Vector3(6,2,0.4),A2D);
// Ramp-top platforms
addA2Box(new THREE.Vector3(-12.25,0.5,0),new THREE.Vector3(3.5,1,6),A2M);
addA2Box(new THREE.Vector3(12.25,0.5,0),new THREE.Vector3(3.5,1,6),A2M);
// Spawn ramps (using rotated boxes for collision)
addA2Ramp(new THREE.Vector3(-12,0.25,0),new THREE.Vector3(4,0.5,6),-7.2,'z',A2L);
addA2Ramp(new THREE.Vector3(12,0.25,0),new THREE.Vector3(4,0.5,6),7.2,'z',A2L);
// Central 4 pillars + platform
var CPH=3,CPS=0.5,CPWt=6,CPDp=5,CPTh=0.5;
var cpx=CPWt/2-CPS/2,cpz=CPDp/2-CPS/2;
addA2Box(new THREE.Vector3(-cpx,CPH/2,-cpz),new THREE.Vector3(CPS,CPH,CPS),A2M);
addA2Box(new THREE.Vector3(cpx,CPH/2,-cpz),new THREE.Vector3(CPS,CPH,CPS),A2M);
addA2Box(new THREE.Vector3(-cpx,CPH/2,cpz),new THREE.Vector3(CPS,CPH,CPS),A2M);
addA2Box(new THREE.Vector3(cpx,CPH/2,cpz),new THREE.Vector3(CPS,CPH,CPS),A2M);
addA2Box(new THREE.Vector3(0,CPH+CPTh/2,0),new THREE.Vector3(CPWt,CPTh,CPDp),A2);
var cRy=CPH+CPTh+0.1;
addA2Box(new THREE.Vector3(0,cRy,-CPDp/2-0.05),new THREE.Vector3(CPWt+0.4,0.2,0.35),A2A);
addA2Box(new THREE.Vector3(0,cRy,CPDp/2+0.05),new THREE.Vector3(CPWt+0.4,0.2,0.35),A2A);
addA2Box(new THREE.Vector3(-CPWt/2-0.05,cRy,0),new THREE.Vector3(0.35,0.2,CPDp+0.4),A2A);
addA2Box(new THREE.Vector3(CPWt/2+0.05,cRy,0),new THREE.Vector3(0.35,0.2,CPDp+0.4),A2A);
// Central ramp (east side)
addA2Ramp(new THREE.Vector3(5.8,CPH/2+CPTh/2+0.3,0),new THREE.Vector3(7,0.5,3),-27,'z',A2L);
// Skywalks (smooth flat platforms)
var SWH=2.5,SWT=0.3;
addA2Box(new THREE.Vector3(-9.5,SWH,-3),new THREE.Vector3(9,SWT,2.5),A2);
addA2Box(new THREE.Vector3(9.5,SWH,-3),new THREE.Vector3(9,SWT,2.5),A2);
addA2Box(new THREE.Vector3(0,SWH+0.5,7),new THREE.Vector3(20,SWT,2.5),A2);
addA2Box(new THREE.Vector3(0,SWH+0.5,-7),new THREE.Vector3(20,SWT,2.5),A2);
// Skywalk support pillars
for(var sx=-12;sx<=12;sx+=4){if(sx<-5||sx>5)addA2Cyl(sx,SWH/2,-3,0.15,SWH,A2M);}
for(var sx=-10;sx<=10;sx+=4){addA2Cyl(sx,(SWH+0.5)/2,7,0.15,SWH+0.5,A2M);addA2Cyl(sx,(SWH+0.5)/2,-7,0.15,SWH+0.5,A2M);}
// Skywalk access ramps
addA2Ramp(new THREE.Vector3(-16,1,0),new THREE.Vector3(4,0.5,2.4),-5,'z',A2L);
addA2Ramp(new THREE.Vector3(16,1,0),new THREE.Vector3(4,0.5,2.4),5,'z',A2L);
addA2Ramp(new THREE.Vector3(4,0.5,-3),new THREE.Vector3(4,0.5,2.4),-18,'z',A2L);
addA2Ramp(new THREE.Vector3(-4,0.5,-3),new THREE.Vector3(4,0.5,2.4),18,'z',A2L);
addA2Ramp(new THREE.Vector3(-11.5,1.5,7),new THREE.Vector3(3,0.5,2.4),-3,'z',A2L);
addA2Ramp(new THREE.Vector3(11.5,1.5,7),new THREE.Vector3(3,0.5,2.4),3,'z',A2L);
addA2Ramp(new THREE.Vector3(-11.5,1.5,-7),new THREE.Vector3(3,0.5,2.4),-3,'z',A2L);
addA2Ramp(new THREE.Vector3(11.5,1.5,-7),new THREE.Vector3(3,0.5,2.4),3,'z',A2L);
// Side flank corridors
addA2Box(new THREE.Vector3(-7,0.15,-11),new THREE.Vector3(6,0.3,1.8),A2);
addA2Box(new THREE.Vector3(-7,0.15,11),new THREE.Vector3(6,0.3,1.8),A2);
addA2Box(new THREE.Vector3(-7,0.9,-12),new THREE.Vector3(6,1.8,0.4),A2L);
addA2Box(new THREE.Vector3(-7,0.9,12),new THREE.Vector3(6,1.8,0.4),A2L);
addA2Box(new THREE.Vector3(7,0.15,-11),new THREE.Vector3(6,0.3,1.8),A2);
addA2Box(new THREE.Vector3(7,0.15,11),new THREE.Vector3(6,0.3,1.8),A2);
addA2Box(new THREE.Vector3(7,0.9,-12),new THREE.Vector3(6,1.8,0.4),A2L);
addA2Box(new THREE.Vector3(7,0.9,12),new THREE.Vector3(6,1.8,0.4),A2L);
// Cover objects
addA2Box(new THREE.Vector3(-5,0.35,-1.5),new THREE.Vector3(0.6,0.7,3),A2A);
addA2Box(new THREE.Vector3(5,0.35,-1.5),new THREE.Vector3(0.6,0.7,3),A2A);
addA2Box(new THREE.Vector3(-5,0.35,1.5),new THREE.Vector3(0.6,0.7,3),A2A);
addA2Box(new THREE.Vector3(5,0.35,1.5),new THREE.Vector3(0.6,0.7,3),A2A);
addA2Cyl(-7,1.5,-6,0.35,3,A2M);
addA2Cyl(7,1.5,-6,0.35,3,A2M);
addA2Cyl(-7,1.5,6,0.35,3,A2M);
addA2Cyl(7,1.5,6,0.35,3,A2M);
var targets=[];
function addTarget(px,py,pz,clr){
  addBox(new THREE.Vector3(px,py,pz),new THREE.Vector3(0.8,1,0.8),clr);
  var e=mapBoxes[mapBoxes.length-1];
  e.armor=100;e.hp=100;e.isTarget=true;e.maxArmor=100;e.maxHp=100;e.baseColor=clr;
  targets.push(e);
}
var lastShotPos=null;
function saveGame(){
  var ed=[];
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];if(e.hp<=0)continue;
    if(e.isZombie)continue;
    ed.push({color:e.color,hp:e.hp,armor:e.armor,maxHp:e.maxHp,maxArmor:e.maxArmor,px:e.pos.x,pz:e.pos.z,weaponType:e.weaponType,state:e.state,type:e.type});
  }
  var save={playerHP:playerHP,playerArmor:playerArmor,px:pos.x,py:pos.y,pz:pos.z,roundNum:roundNum,loadout:playerLoadout,ammo:gunAmmo,enemies:ed,coins:specialCoins,inventory:weaponInventory,map:currentMap,slotFlashlight:slotFlashlight,grenadeStacks:grenadeStacks,grenadeTypes:grenadeTypes};
  try{localStorage.setItem('ocgame_save',JSON.stringify(save))}catch(ex){}
}
function loadGame(data){
  if(data.map)currentMap=data.map;
  playerHP=data.playerHP;playerArmor=data.playerArmor;pos.set(data.px,data.py,data.pz);roundNum=data.roundNum;
  if(data.loadout){for(var i=0;i<data.loadout.length;i++)playerLoadout[i]=data.loadout[i];}
  if(data.ammo){for(var k in data.ammo)gunAmmo[k]=data.ammo[k];}
  if(data.slotFlashlight){for(var si=0;si<5;si++)slotFlashlight[si]=!!data.slotFlashlight[si];}
  if(data.grenadeStacks){for(var si=0;si<5;si++)grenadeStacks[si]=data.grenadeStacks[si]||0;}
  if(data.grenadeTypes){for(var si=0;si<5;si++)grenadeTypes[si]=data.grenadeTypes[si]||'frag';}
  recalcProdBonuses();
  switchToSlot(currentSlot);
  applyMapSettings();
  // Restore enemies
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(data.enemies&&i<data.enemies.length){
      var ed=data.enemies[i];
      e.hp=ed.hp;e.armor=ed.armor;e.maxHp=ed.maxHp;e.maxArmor=ed.maxArmor;
      e.pos.set(ed.px,0,ed.pz);e.mesh.position.set(ed.px,0,ed.pz);e.mesh.visible=true;e.towerPerch=null;
      if(e.hBar){e.hBar.visible=true;e.hBar.position.set(ed.px,0.95,ed.pz);}
      if(e.aBar){e.aBar.visible=true;e.aBar.position.set(ed.px,0.88,ed.pz);}
      e.state=ed.state||'patrol';e.type=ed.type||'normal';e.knifeHits=0;
      setEnemyGun(e,e.type==='sniper'?'sniper':'ak47');
    }else{e.hp=0;e.mesh.visible=false;if(e.hBar)e.hBar.visible=false;if(e.aBar)e.aBar.visible=false;}
  }
  // Update HUD
  document.getElementById('hp-fill').style.width=playerHP+'%';document.getElementById('hp-txt').textContent=playerHP;
  document.getElementById('armor-fill').style.width=Math.min(100,playerArmor)+'%';document.getElementById('armor-txt').textContent=playerArmor;
  if(data.coins!==undefined)specialCoins=data.coins;
  if(data.inventory)for(var k in data.inventory)weaponInventory[k]=data.inventory[k];
  if(data.map){currentMap=data.map;applyMapSettings();}
  updateCoinsDisplay();updateArmoryGunCounts();
}
addTarget(-6,0.5,-5,0xff4444);
addTarget(7,0.5,0,0xff6644);
addTarget(-8,0.5,6,0xff8844);
// ── Among Us style enemies ──
// 敵人手上的武器：一般 AI = AK，狙擊手 = 狙擊槍
// （createGunModel 沒有 'sniper' 分支，狙擊槍模型對應 'awp'；
//   彈道參數仍用 gunData.sniper，跟原本狙擊手一致）
function setEnemyGun(e,kind){
  var want=(kind==='sniper')?'awp':'ak47';
  if(e.gun&&e.gunKind===want)return;      // 同一款就不用重建
  if(e.gun){e.mesh.remove(e.gun);disposeMesh(e.gun);e.gun=null;}
  // gunPivot：Object3D.lookAt 會把 pivot 的 +Z 對準目標，
  // 所以槍在 pivot 內轉 180°，讓槍口(-Z) 變成沿 pivot 的 +Z → 正確朝前（純轉向，非鏡射）
  var pivot=new THREE.Group();
  pivot.position.set(-0.2,0.45,0.18);      // 右手邊、胸口高度、稍微身前
  var gm=createGunModel(want,true);
  gm.rotation.y=Math.PI;
  pivot.add(gm);
  pivot.userData.model=gm;
  e.mesh.add(pivot);
  e.gun=pivot;e.gunKind=want;
  e.weaponType=(kind==='sniper')?'sniper':'ak47';
}
// 障礙物 mesh 清單，供 AI 之間的視線判定。
// 原本宣告在 updateEnemies 函式內（區域變數），aiHasLOS 在頂層取不到會拋 ReferenceError。
var mapMeshes=[];
// 兩個敵人之間有沒有視線（被牆擋住就看不到）
function aiHasLOS(a,b){
  var from=new THREE.Vector3(a.pos.x,a.pos.y+0.45,a.pos.z);
  var to=new THREE.Vector3(b.pos.x,b.pos.y+0.45,b.pos.z);
  var dir=to.clone().sub(from);var len=dir.length();
  if(len<0.001)return true;
  var rc=new THREE.Raycaster(from,dir.clone().normalize());
  var hits=rc.intersectObjects(mapMeshes);
  for(var i=0;i<hits.length;i++){if(hits[i].distance<len-0.35)return false;}
  return true;
}
// ── 通用牆面視線判定（Hybrid 的 AI 打真人也要用）──────────────────
// 為什麼不能直接用 aiHasLOS：
//  1) mapMeshes 原本只在 updateEnemies() 第一行填充，而 animate 裡的順序是
//     hybridHostAiTick() → updateEnemies()，所以在 hybridAiAttackPlayers 裡
//     讀到的是上一幀快照，開場前甚至是空陣列 → intersectObjects([]) 回傳 []
//     → 一律判定有視線（fail-open）→ AI 直接穿牆扣血。
//  2) aiHasLOS 高度寫死 +0.45，沒辦法表達「AI 胸口 → 真人眼睛」的不同高度。
function ocSyncMapMeshes(){
  mapMeshes.length=0;
  for(var i=0;i<mapBoxes.length;i++){
    var bx=mapBoxes[i];
    if(!bx.mesh||bx.isDragonBoat||bx.mesh.visible===false)continue;
    mapMeshes.push(bx.mesh);
  }
  return mapMeshes;
}
// ── 射線 vs AI 站立直柱（解析式，不用 mesh raycast）───────────────
// 為什麼不用 mesh raycast：Hybrid 的 hybrid_shoot 是在 WebSocket 訊息回呼裡跑的，
// 不在 rAF 之中，而 intersectObjects 依賴 matrixWorld／boundingSphere 是否剛好更新過。
// 實測 19 發全部 hits=0（收19/mesh312/中0），312 剛好是 8×39 代表只有 AI 的 mesh，
// mapBoxes 在 Hybrid 是空的 → 整個集合裡沒有任何可撞的東西。
// 這裡直接用「XZ 半徑 + y 範圍」算，和 updateEnemies 裡 AI 打AI 的數學一致。
// 回傳沿射線最近的 {idx, dist, horiz}，horiz 是射線與該 AI 中心的水平距離。
function ocHybridRayAi(o,d,maxDist){
  var best=-1,bd=1e9,bh=1e9,by=0;
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(!e||!e.hybridAI||e.hp<=0||e.mesh.visible===false)continue;
    var px=e.pos.x-o.x, pz=e.pos.z-o.z;
    var t=px*d.x+pz*d.z;
    if(t<0.30||t>maxDist)continue;          // 0.30 = 子彈起點不能貼在靶上
    var cx=px-d.x*t, cz=pz-d.z*t;
    // ★ 這裡就是打牆會打到 31 公尺外 AI 的原因。
    //   horiz 是射線與 AI 中心的水平距離，原本只拿來印在 log 上，
    //   沒有任何 reject → 只要前方某個 AI 落在高度範圍內就一律算命中。
    //   log 實測「偏31.44」仍然 hits 累加到 78 就是這裡漏了。
    var horiz=Math.sqrt(cx*cx+cz*cz);
    if(horiz>0.5)continue;                  // AI 直柱半徑 0.5m，超出就是打偏
    var y=o.y+d.y*t;
    if(y<0.05||y>1.85)continue;             // 直柱高度：0~1.85（含頭）
    if(t<bd){bd=t;best=i;bh=horiz;by=y;}
  }
  return {idx:best,dist:bd,horiz:bh,y:by};
}
// a/b 只要有 .pos。本機玩家的 pos 是裸 Vector3，要包成 {pos:pos}。
// yA/yB 預設 0.45（AI 胸口），真人請傳 0.85（EYE_H）。slack：牆離末端多近才算擋。
function ocLosClear(a,b,yA,yB,slack){
  if(!mapMeshes.length)ocSyncMapMeshes();   // 自我修復，不依賴呼叫順序
  if(!mapMeshes.length)return true;         // 真的沒有任何牆 → 放行
  var ha=(yA===undefined)?0.45:yA, hb=(yB===undefined)?0.45:yB;
  var from=new THREE.Vector3(a.pos.x,a.pos.y+ha,a.pos.z);
  var to=new THREE.Vector3(b.pos.x,b.pos.y+hb,b.pos.z);
  var d=to.clone().sub(from);
  var len=d.length();
  if(len<0.001)return true;
  var hits=new THREE.Raycaster(from,d.multiplyScalar(1/len),0,len).intersectObjects(mapMeshes,false);
  var lim=len-((slack===undefined)?0.35:slack);
  for(var i=0;i<hits.length;i++){if(hits[i].distance<lim)return false;}
  return true;
}
// ── 頭頂血條／護甲條 ──
// 用 Group(底 + 填充)；填充的幾何原點平移到左緣，scale.x 從 0~1 變化時左邊不動
function makeBarGroup(fillColor,height,thick){
  var grp=new THREE.Group();
  var bg=new THREE.Mesh(new THREE.PlaneGeometry(0.6,height),
    new THREE.MeshBasicMaterial({color:0x111111,depthTest:false,transparent:true,opacity:0.75}));
  grp.add(bg);
  var fg=new THREE.PlaneGeometry(0.58,thick);
  fg.translate(0.29,0,0);                       // 原點＝左緣
  var fill=new THREE.Mesh(fg,new THREE.MeshBasicMaterial({color:fillColor,depthTest:false}));
  fill.position.x=-0.29;                         // 左緣對齊底條左緣
  grp.add(fill);
  bg.renderOrder=998;fill.renderOrder=999;
  grp.userData.fill=fill;grp.userData.bg=bg;
  return grp;
}
// 統一更新位置/朝向/比例（原本 aBar 從來沒被更新過，永遠是滿的）
function updateEnemyBars(e){
  if(!e||!e.mesh)return;
  // 這支函式是在 updateEnemies 的迴圈內呼叫的，一旦丟例外會中斷整個 AI 更新
  // （AI 不動、不射擊、沒有傷害判定），所以整包起來並給 cam 安全取值。
  try{
  var cp=(typeof cam!=='undefined'&&cam&&cam.position)?cam.position:null;
  var by=e.pos.y+CUBELING_BAR;
  if(e.hBar){
    e.hBar.visible=e.mesh.visible&&e.hp>0;
    e.hBar.position.set(e.pos.x,by,e.pos.z);
    if(cp)e.hBar.lookAt(cp);
    // 沒有 fill 的舊血條（潛水員等）退回縮放整條
    if(e.hBarFill)e.hBarFill.scale.x=Math.max(0,e.hp/e.maxHp);
    else if(e.hBar.scale)e.hBar.scale.x=Math.max(0.001,Math.max(0,e.hp/e.maxHp));
  }
  if(e.aBar){
    e.aBar.visible=e.mesh.visible&&e.hp>0&&e.armor>0;
    e.aBar.position.set(e.pos.x,by-0.075,e.pos.z);
    if(cp)e.aBar.lookAt(cp);
    if(e.aBarFill)e.aBarFill.scale.x=Math.max(0,e.armor/e.maxArmor);
    else if(e.aBar.scale)e.aBar.scale.x=Math.max(0.001,Math.max(0,e.armor/e.maxArmor));
  }
  // 頭頂名稱（AI-001…）：活的時候顯示，死掉就藏起來
  if(e.namePlate&&window._updateNamePlate)window._updateNamePlate(e.namePlate,e.pos,e.mesh.visible&&e.hp>0);
  }catch(err){window.__ocLastErr='updateEnemyBars: '+(err&&err.message);}
}
// 替所有敵人補上頭頂名稱。enemies 陣列會因為讀檔(9333)或重新生成而增減，
// 所以不只在 createEnemy 內設定，而是統一用這個函式依陣列位置補齊編號。
function syncEnemyNameplates(){
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(!e||e.namePlate||e.isZombie)continue;
    e.aiIndex=i;
    // 注意：這裡和 aiNameFor() 不在同一個作用域（它被包在別的 IIFE 裡），
    // 所以直接算字串，避免 ReferenceError: aiNameFor is not defined
    e.aiName='AI-'+String(i+1).padStart(3,'0');
    if(!window._makeNamePlate)continue;
    e.namePlate=window._makeNamePlate(e.aiName,true);
    scene.add(e.namePlate);
  }
}
// 統一扣血扣甲：護甲先吸收，溢出才進血。回傳實際扣掉的量
// killer: {name,type,id,weapon}，可省略（預設算本機玩家）。
// AI 對 AI 的擊殺必須帶，否則 Kill Feed 會把 AI 的戰果記成玩家。
function damageEnemy(e,dmg,killer){
  if(!e||e.hp<=0||dmg<=0)return 0;
  var dealt=0;
  if(e.armor>0){
    var od=dmg;e.armor-=dmg;
    if(e.armor<0){od=-e.armor;e.armor=0}else od=0;
    dealt+=od;
  }else{dealt=dmg;}
  e.hp-=dealt;if(e.hp<0)e.hp=0;
  e.hitTimer=0.3;
  if(e.hp<=0){
    e.mesh.visible=false;if(e.hBar)e.hBar.visible=false;if(e.aBar)e.aBar.visible=false;
    if(e.hybridAI&&window._hybridAiDown)window._hybridAiDown(e,killer);   // 跨作用域：AI 死亡回呼
  }
  return dealt;
}
function createEnemy(color,px,pz,type){
  var g=new THREE.Group();
  var isRusher=type==='rusher',isGrenadier=type==='grenadier',isSniper=type==='sniper',isShield=type==='shield';
  // 身體：統一改成方晶。外殼一律綠色，只有寶石/內輝用類型色（玩家才分辨得出敵人種類）
  var bodyClr=CUBELING_PAL.green.body;
  var vsClr=isRusher?0xff0000:(isGrenadier?0xffcc44:(isSniper?0x88ff44:(isShield?0x44ddff:0x88ddff)));
  var vsEm=isRusher?0xff2200:(isGrenadier?0xffaa00:(isSniper?0x44ff22:(isShield?0x22aaff:0x66aaff)));
  var bodyGrp=createCubelingMesh({body:bodyClr,accent:CUBELING_PAL.green.accent,glow:vsEm,
    core:isRusher?0x4a1414:(isGrenadier?0x4a3d10:(isSniper?0x18300f:(isShield?0x12304a:0x0a1410))),
    visor:vsClr,visorEm:vsEm,visorEmI:isRusher?1.6:0.7,
    face:isRusher?0x140404:0x14171e});
  bodyGrp.scale.setScalar(CUBELING_AI_SCALE);   // 敵人放大一點點
  g.add(bodyGrp);
  g.userData.cubeling=bodyGrp;        // randomizeEnemyType 靠這個換色
  var vs=bodyGrp.userData.visor;      // 舊程式碼用 e.visor 改類型顏色
  // Shield (for shield type)
  var shieldMesh=null;
  if(isShield){
    var sMat=new THREE.MeshStandardMaterial({color:0x4488ff,metalness:0.3,roughness:0.4,transparent:true,opacity:0.85});
    shieldMesh=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.04),sMat);
    shieldMesh.position.set(0,0.4,0.3);g.add(shieldMesh);
    var sBrd=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.32,0.02),new THREE.MeshStandardMaterial({color:0x88bbff,emissive:0x4488ff,emissiveIntensity:0.3,transparent:true,opacity:0.5}));
    sBrd.position.set(0,0.4,0.31);g.add(sBrd);
  }
  // Backpack for grenadier
  if(isGrenadier){
    var pk=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.22,0.14),new THREE.MeshStandardMaterial({color:0x886633}));
    pk.position.set(-0.15,0.32,-0.1);g.add(pk);
  }
  g.position.set(px,0,pz);
  scene.add(g);
  var hBar=makeBarGroup(0x44cc44,0.07,0.052);
  hBar.position.set(px,CUBELING_BAR,pz);scene.add(hBar);
  var aBar=makeBarGroup(0x4488ff,0.045,0.032);
  aBar.position.set(px,CUBELING_BAR-0.075,pz);scene.add(aBar);
  var eo={
    mesh:g,    pos:new THREE.Vector3(px,0,pz),towerPerch:null,    hp:60,armor:60,maxHp:60,maxArmor:60,
    state:'patrol',waypoint:new THREE.Vector3(px+8-16*Math.random(),0,pz+8-16*Math.random()),
    shootCD:0,detectCD:0,walkTime:0,gun:null,gunKind:null,visor:vs,color:color,
    hBar:hBar,aBar:aBar,hBarFill:hBar.userData.fill,aBarFill:aBar.userData.fill,
    aiTarget:null,aiTargetCD:0,aiHitFlash:0,knifeHits:0,type:type||'normal',
    // 移動平滑化用：目前速度／目標速度／目標朝向／本幀是否正在開火
    vel:new THREE.Vector3(),desiredVel:new THREE.Vector3(),aimYaw:0,firingNow:false,
    strafeSign:1,respawnT:0,
    weaponType:'ak47',
    investigateTarget:null,searchTimer:0,shieldMesh:shieldMesh,chargeTimer:0,burnTimer:0
  };
  enemies.push(eo);
  setEnemyGun(eo,isSniper?'sniper':'ak47');
}
var enemyColors=[0xff4444,0x44aaff,0xffaa44,0x44ffaa,0xaa44ff,0xff44aa,0x44aaff,0xaaff44,0x44ff88,0xff8844];
var maxEnemies=10;
for(var ei=0;ei<maxEnemies;ei++){
  var sp=getRandomSpawnPos(true,pos,8);
  createEnemy(enemyColors[ei%enemyColors.length],sp.x,sp.z);
}
var activeCount=Math.min(2+Math.floor(roundNum*0.8),maxEnemies);
for(var ei=0;ei<maxEnemies;ei++){
  if(ei>=activeCount){enemies[ei].hp=0;enemies[ei].mesh.visible=false;if(enemies[ei].hBar)enemies[ei].hBar.visible=false;if(enemies[ei].aBar)enemies[ei].aBar.visible=false;}
}
var sl=new THREE.SpotLight(0xffffff,3);sl.position.set(pos.x,5,pos.z);sl.target.position.copy(pos);sl.angle=0.5;sl.penumbra=0.5;sl.decay=1;sl.distance=20;scene.add(sl);scene.add(sl.target);
// ── Flashlight (per-slot binding, always-on) ──
var flashlightLight=null,flashlightMesh=null;
(function(){
  var fl=new THREE.SpotLight(0xffeecc,6);fl.angle=0.35;fl.penumbra=0.5;fl.decay=0.3;fl.distance=30;
  fl.position.set(0.2,-0.08,-0.35);cam.add(fl);cam.add(fl.target);fl.target.position.set(0,0,-5);
  fl.visible=false;flashlightLight=fl;
})();
function attachFlashlightMesh(){
  detachFlashlightMesh();
  if(!gunGroup||!slotFlashlight[currentSlot]||currentGun==='knife')return;
  var flMat=new THREE.MeshStandardMaterial({color:0x666666,metalness:0.4,roughness:0.5});
  var body=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.015,0.05,8),flMat);
  body.rotation.x=Math.PI/2;body.position.set(0.035,0.005,-0.14);gunGroup.add(body);
  var head=new THREE.Mesh(new THREE.CylinderGeometry(0.017,0.012,0.012,8),new THREE.MeshStandardMaterial({color:0x888888,metalness:0.6,roughness:0.3}));
  head.rotation.x=Math.PI/2;head.position.set(0.035,0.005,-0.165);gunGroup.add(head);
  var lens=new THREE.Mesh(new THREE.CircleGeometry(0.014,8),new THREE.MeshBasicMaterial({color:0xffeecc}));
  lens.position.set(0.035,0.005,-0.172);gunGroup.add(lens);
  var mount=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.006,0.01),new THREE.MeshStandardMaterial({color:0x555555,metalness:0.5,roughness:0.5}));
  mount.position.set(0.02,0.005,-0.14);gunGroup.add(mount);
  flashlightMesh={body:body,head:head,lens:lens,mount:mount};
  flashlightLight.visible=true;
}
function detachFlashlightMesh(){
  if(flashlightMesh){
    if(flashlightMesh.body&&gunGroup)gunGroup.remove(flashlightMesh.body);
    if(flashlightMesh.head&&gunGroup)gunGroup.remove(flashlightMesh.head);
    if(flashlightMesh.lens&&gunGroup)gunGroup.remove(flashlightMesh.lens);
    if(flashlightMesh.mount&&gunGroup)gunGroup.remove(flashlightMesh.mount);
    flashlightMesh=null;
  }
  if(flashlightLight)flashlightLight.visible=false;
}
function updateSlotFlashlightUI(){
  document.querySelectorAll('.slot-fl-btn').forEach(function(b){
    var si=parseInt(b.dataset.slot);
    b.textContent=slotFlashlight[si]?'🔦 ON':'🔦 OFF';
    b.style.color=slotFlashlight[si]?'#ff4':'#884';
    b.style.borderColor=slotFlashlight[si]?'rgba(255,255,68,.4)':'#442';
  });
}
// ── Gun system ──
var knifeSwingCount=0,knifeAnim=0,grenadeAnim=0,grenadeThrown=false,recoilKick=0,recoilRotX=0,boltOffset=0,boltTarget=0,awpBoltTimer=0,swapAnimTimer=0,swapAnimDuration=0.4,swapOutGroup=null,swapTargetSlot=-1,swapTargetGun='';
var gunData={ak47:{name:'AK-47',dmg:20,fireRate:0.1,spread:0.025,adsFov:50,zoom:1.5,mag:30,reloadTime:2,accuracyDecay:0.006,accuracyRecovery:10,maxSpread:0.08,damageRange:35,damageFalloff:0.5},deagle:{name:'沙鷹',dmg:40,fireRate:0.32,spread:0.015,adsFov:55,zoom:1.8,mag:7,reloadTime:1.5,accuracyDecay:0.015,accuracyRecovery:7,maxSpread:0.06,damageRange:45,damageFalloff:0.55},awp:{name:'AWP',dmg:85,fireRate:1.1,spread:0.003,adsFov:20,zoom:4,mag:5,reloadTime:2.8,accuracyDecay:0,accuracyRecovery:0,maxSpread:0.003,damageRange:100,damageFalloff:1},grapple:{name:'勾爪槍',dmg:0,fireRate:0,spread:0,adsFov:80,zoom:1,mag:1},knife:{name:'刀',dmg:50,fireRate:0.45,spread:0,adsFov:80,zoom:1,mag:1},watergun:{name:'水槍',dmg:10,fireRate:0.35,spread:0.04,adsFov:80,zoom:1,mag:999},sniper:{name:'狙擊槍',dmg:80,fireRate:2,spread:0.005,adsFov:80,zoom:1,mag:1},shotgun:{name:'龍息霰彈',dmg:15,fireRate:0.7,spread:0.15,adsFov:60,zoom:1.2,mag:6,reloadTime:2.2,accuracyDecay:0.12,accuracyRecovery:5,maxSpread:0.35,damageRange:15,damageFalloff:0.3},radrifle:{name:'輻射步槍',dmg:12,fireRate:0.3,spread:0.008,adsFov:50,zoom:1.5,mag:20,reloadTime:2.4,chargeable:true,chargeTime:1.2,chargeMaxDmg:50,accuracyDecay:0.01,accuracyRecovery:8,maxSpread:0.07,damageRange:40,damageFalloff:0.6},smg:{name:'MP7',dmg:14,fireRate:0.07,spread:0.035,adsFov:55,zoom:1.4,mag:40,reloadTime:1.6,accuracyDecay:0.012,accuracyRecovery:12,maxSpread:0.12,damageRange:25,damageFalloff:0.4},grenade:{name:'手雷',dmg:50,fireRate:0.8,spread:0,adsFov:80,zoom:1,mag:1}};
var currentGun='ak47',gunGroup=null,isADS=false,shootCD=0,autoFire=false,isReloading=false,reloadTimer=0,inspectTimer=0,reloadDuration=0,magazineMesh=null,grenadeStacks=[0,0,0,0,0],currentSpread=0,currentSpreadGun='';
var footstepTimer=0,lastMoving=false;
var gunKills={};
var gunAmmo={ak47:30,deagle:7,awp:5,grapple:1,knife:1,watergun:999,sniper:999,shotgun:6,radrifle:20,smg:40,grenade:1};
var barrelTips={ak47:new THREE.Vector3(0,0,-0.495),deagle:new THREE.Vector3(0,0,-0.21),awp:new THREE.Vector3(0,0,-0.585),grapple:new THREE.Vector3(0,0,-0.2),knife:new THREE.Vector3(0,0,-0.25),sniper:new THREE.Vector3(0,0,-0.3),shotgun:new THREE.Vector3(0,0,-0.35),radrifle:new THREE.Vector3(0,0,-0.4),smg:new THREE.Vector3(0,0,-0.30),grenade:new THREE.Vector3(0,0,-0.25),grenade_frag:new THREE.Vector3(0,0,-0.25),grenade_flashbang:new THREE.Vector3(0,0,-0.25),grenade_smoke:new THREE.Vector3(0,0,-0.25),grenade_incendiary:new THREE.Vector3(0,0,-0.25)};
// ── Economy system ──
var specialCoins=parseInt(localStorage.getItem('oc_coin'))||50000;
var weaponInventory={ak47:1,deagle:1,awp:1,knife:1,grapple:999,shotgun:1,radrifle:1,smg:1};
try{var inv=localStorage.getItem('oc_inv');if(inv){var parsed=JSON.parse(inv);for(var k in parsed)weaponInventory[k]=parsed[k];delete weaponInventory.grenade;delete weaponInventory.grenade_frag;delete weaponInventory.grenade_flashbang;delete weaponInventory.grenade_smoke;delete weaponInventory.grenade_incendiary;}}catch(e){}
function saveWeaponInventory(){try{localStorage.setItem('oc_inv',JSON.stringify(weaponInventory));}catch(e){}}
var weaponPrices={ak47:10000,deagle:5000,awp:30000,knife:1000,grapple:0,shotgun:100000,radrifle:0,smg:20000};
var weaponNames={ak47:'AK-47',deagle:'沙鷹',awp:'AWP',knife:'刀',grapple:'勾爪槍',sniper:'狙擊槍',shotgun:'龍息霰彈',radrifle:'輻射步槍',smg:'MP7'};
var killCounter=0;
// ── Attachment system ──
var attachData={suppressor:{name:'滅音器',type:'muzzle',price:800,desc:'降低開火聲,降低被發現機率',effects:{noise:0.5,damage:0.97,range:0.9}},compensator:{name:'制退器',type:'muzzle',price:600,desc:'後座力-20%',effects:{recoil:0.8,noise:1.3}},red_dot:{name:'紅點鏡',type:'sight',price:500,desc:'精準度+15%',effects:{accuracy:1.15,adsSpeed:0.97}},scope_2x:{name:'2倍鏡',type:'sight',price:700,desc:'中距離更準',effects:{zoomFov:50,adsSpeed:0.9}},quick_mag:{name:'快速彈匣',type:'mag',price:400,desc:'換彈速度+25%',effects:{reloadSpeed:1.25}},extended_mag:{name:'擴充彈匣',type:'mag',price:500,desc:'彈量+15發',effects:{ammoBonus:15,reloadSpeed:0.9}},quick_ext_mag:{name:'快速擴充彈匣',type:'mag',price:900,desc:'彈量增加+換彈加快',effects:{ammoBonus:15,reloadSpeed:1.15,adsSpeed:0.95,moveSpeed:0.98}}};
var attachGuns=['ak47','deagle','awp','shotgun','smg'];
var ownedGuns=['ak47'];try{var og=localStorage.getItem('oc_guns');if(og)ownedGuns=JSON.parse(og);}catch(e){}
var gunSelectedGun='ak47';
function saveOwnedGuns(){try{localStorage.setItem('oc_guns',JSON.stringify(ownedGuns));}catch(e){}}
function ownGun(gun){if(ownedGuns.indexOf(gun)===-1){ownedGuns.push(gun);saveOwnedGuns();}}
function getAttachments(gun){try{var a=JSON.parse(localStorage.getItem('oc_attach_'+gun));return a||[];}catch(e){return[];}}
function setAttachments(gun,list){try{localStorage.setItem('oc_attach_'+gun,JSON.stringify(list));}catch(e){}}
function hasAttachment(gun,id){var a=getAttachments(gun);return a.indexOf(id)!==-1;}
function getAttachEffects(gun){var a=getAttachments(gun);var e={};for(var i=0;i<a.length;i++){var d=attachData[a[i]];if(d)for(var k in d.effects)e[k]=(e[k]||1)*d.effects[k];}return e;}
var slotFlashlight=[false,false,false,false,false];
function updateCoinsDisplay(){
  try{localStorage.setItem('oc_coin',specialCoins);}catch(e){}
  document.getElementById('menu-coins').textContent=specialCoins;
}
var achDefs=[
  {id:'range_clear',name:'靶場清場',desc:'一次擊落全部 8 架無人機',icon:'🎯',reward:75000},
  {id:'nuclear_god',name:'核電不敗',desc:'在核電廠連續獲勝 3 次（普通/機密）',icon:'☢',reward:200000},
  {id:'first_blood',name:'初出茅廬',desc:'擊殺第一個敵人',icon:'💀',reward:1000},
  {id:'century',name:'百人斬',desc:'累計擊殺 100 個敵人',icon:'⚔',reward:10000},
  {id:'millionaire',name:'百萬富翁',desc:'累計獲得 1,000,000 特種幣',icon:'💰',reward:100000},
  {id:'round30',name:'持久戰',desc:'單局達到第 30 波',icon:'🛡',reward:50000}
];
var achData={};
try{var ad=localStorage.getItem('oc_achievements');if(ad)achData=JSON.parse(ad);}catch(e){}
achData.kills=achData.kills||0;achData.nuclearStreak=achData.nuclearStreak||0;achData.totalEarned=achData.totalEarned||0;
function saveAch(){try{localStorage.setItem('oc_achievements',JSON.stringify(achData));}catch(e){}}
function achDone(id){return achData[id]&&achData[id].done;}
function awardAch(id){
  if(achDone(id))return;
  if(!achData[id])achData[id]={};
  achData[id].done=true;
  var a=achDefs.find(function(x){return x.id===id;});
  specialCoins+=a.reward;achData.totalEarned+=a.reward;
  updateCoinsDisplay();saveAch();
  var el=document.getElementById('ach-popup');
  el.innerHTML='<div style="font-size:14px;color:rgba(255,255,255,.5);letter-spacing:2px">🏅 成就解鎖</div><div style="font-size:28px;margin:4px 0">'+a.icon+'</div><div style="font-size:18px;font-weight:bold;color:#ffd700;letter-spacing:2px">'+a.name+'</div><div style="font-size:12px;color:rgba(255,255,255,.4);margin:4px 0">'+a.desc+'</div><div style="font-size:14px;color:#4f4;letter-spacing:1px">+'+a.reward+' 特種幣</div>';
  el.style.display='flex';setTimeout(function(){el.style.display='none';},4000);
}
function earnCoins(amt){
  specialCoins+=amt;achData.totalEarned=(achData.totalEarned||0)+amt;
  saveAch();updateCoinsDisplay();
  if(!achDone('millionaire')&&achData.totalEarned>=1000000)awardAch('millionaire');
}
function checkKillAch(){
  achData.kills++;saveAch();
  if(!achDone('first_blood')&&achData.kills>=1)awardAch('first_blood');
  if(!achDone('century')&&achData.kills>=100)awardAch('century');
}
function updateAchUI(){
  var el=document.getElementById('ach-list');if(!el)return;
  var html='';
  achDefs.forEach(function(a){
    var done=achDone(a.id);
    html+='<div class="ach-item'+(done?' ach-done':'')+'"><div class="ach-icon">'+(done?'✅':a.icon)+'</div><div class="ach-info"><div class="ach-name">'+a.name+'</div><div class="ach-desc">'+a.desc+'</div><div class="ach-reward">'+(done?'✓ 已完成':'獎勵 $'+a.reward)+'</div></div></div>';
  });
  el.innerHTML=html;
}
document.getElementById('ach-btn').onclick=function(){updateAchUI();document.getElementById('ach-panel').style.display='flex';};
document.getElementById('ach-close').onclick=function(){document.getElementById('ach-panel').style.display='none';};
var lbEl=document.getElementById('lb-btn');if(lbEl)lbEl.onclick=function(){updateLeaderboard();document.getElementById('lb-overlay').style.display='flex';};
var lbcEl=document.getElementById('lb-close-btn');if(lbcEl)lbcEl.onclick=function(){document.getElementById('lb-overlay').style.display='none';};
function lbSave(mode,score,rounds,extra){
  var key='oc_lb_'+mode;
  var list=[];try{var r=JSON.parse(localStorage.getItem(key));if(r)list=r;}catch(e){}
  var name=localStorage.getItem('oc_nickname')||localStorage.getItem('oc_user')||'玩家';
  var entry={name:name,score:score,rounds:rounds,date:new Date().toISOString().slice(0,10)};
  if(extra)for(var k in extra)entry[k]=extra[k];
  list.push(entry);
  list.sort(function(a,b){return b.score-a.score;});
  if(list.length>10)list=list.slice(0,10);
  try{localStorage.setItem(key,JSON.stringify(list));}catch(e){}
}
function lbTop3(mode){
  var key='oc_lb_'+mode;
  var list=[];try{var r=JSON.parse(localStorage.getItem(key));if(r)list=r;}catch(e){}
  list.sort(function(a,b){return b.score-a.score;});
  var medals=['🥇','🥈','🥉'];
  var html='<div style="display:flex;flex-direction:column;gap:4px">';
  for(var i=0;i<Math.min(3,list.length);i++){
    var e=list[i];
    var medal=i<3?medals[i]:'';
    var nm=e.name.length>6?e.name.slice(0,6)+'..':e.name;
    html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:4px;background:rgba(255,255,255,'+(0.04-i*0.01)+');border:1px solid rgba(255,255,255,'+(0.08-i*0.02)+')"><span>'+medal+' '+nm+'</span><span style="font-family:monospace;color:#4fa">'+e.rounds+' 波</span><span style="font-family:monospace;color:#ff8">'+e.score+'分</span></div>';
  }
  if(list.length===0)html+='<div style="text-align:center;color:rgba(255,255,255,.2);padding:14px 0;font-size:13px">暫無數據</div>';
  html+='</div>';
  return html;
}
function updateLeaderboard(){
  var html='';
  html+='<div style="margin-bottom:10px"><div style="font-size:14px;color:#88ccff;letter-spacing:2px;margin-bottom:6px">👹 Boss大戰</div>'+lbTop3('bossrush')+'</div>';
  html+='<div style="margin-bottom:10px"><div style="font-size:14px;color:#fa4;letter-spacing:2px;margin-bottom:6px">🎯 單人模式</div>'+lbTop3('single')+'</div>';
  html+='<div style="margin-bottom:6px"><div style="font-size:14px;color:#fa4;letter-spacing:2px;margin-bottom:6px">🔥 每日挑戰</div>'+lbTop3('daily')+'</div>';
  var el=document.getElementById('lb-list');
  if(el)el.innerHTML=html;
}


var weaponProf={};
try{var wp=localStorage.getItem('oc_prof');if(wp)weaponProf=JSON.parse(wp);}catch(e){}
function addProficiency(){
  if(sessionSP>0){
    seasonPoints=(seasonPoints||0)+sessionSP;
    try{localStorage.setItem('oc_sp',seasonPoints);}catch(e){}
    document.getElementById('menu-sp-val').textContent=seasonPoints;
    document.getElementById('ssp-display').textContent='SP '+seasonPoints;
  }
  var loadout=playerLoadout||[];
  var anyGain=false;
  for(var si=0;si<loadout.length;si++){
    var gun=loadout[si];if(!gun||gun==='knife'||gun==='grapple')continue;
    weaponProf[gun]=(weaponProf[gun]||0)+1;
    anyGain=true;
    if(weaponProf[gun]%10===0){
      seasonPoints=(seasonPoints||0)+10;
      try{localStorage.setItem('oc_sp',seasonPoints);}catch(e){}
      document.getElementById('menu-sp-val').textContent=seasonPoints;
      document.getElementById('ssp-display').textContent='SP '+seasonPoints;
    }
  }
  if(anyGain){try{localStorage.setItem('oc_prof',JSON.stringify(weaponProf));}catch(e){}}
  recalcProdBonuses();
}
function openProficiencyPanel(){
  document.getElementById('prof-overlay').style.display='flex';document.getElementById('menu').style.display='none';
  var list=document.getElementById('prof-list');list.innerHTML='';
  var tracked=['ak47','deagle','awp','shotgun','smg'];
  tracked.forEach(function(gun){
    var prof=weaponProf[gun]||0;
    var lvl=Math.floor(prof/10)+1;
    var cur=prof%10;
    var spEarned=Math.floor(prof/10)*10;
    var name=gunData[gun]?gunData[gun].name:gun;
    var totalSp=seasonPoints||0;
    var bonusText='';
    if(lvl>=20)bonusText='<span style="color:#f84;font-size:10px;display:block">🔥 黯焰解鎖</span>';
    else if(lvl>=10)bonusText='<span style="color:#4af;font-size:10px;display:block">⚡ 換彈 +20%</span>';
    else if(lvl>=5)bonusText='<span style="color:#4f4;font-size:10px;display:block">⬆ 傷害 +10%</span>';
    var item=document.createElement('div');item.className='prof-item';
    item.innerHTML='<span class="pi-name">'+name+'</span><span class="pi-lvl">Lv.'+lvl+'</span><div class="pi-bar-wrap"><div class="pi-bar" style="width:'+(cur*10)+'%"></div><span class="pi-bar-text">'+cur+' / 10</span></div><span class="pi-sp">'+bonusText+'+'+spEarned+' SP</span>';
    list.appendChild(item);
  });
  var spInfo=document.createElement('div');spInfo.style.cssText='margin-top:12px;font-size:11px;color:rgba(255,255,255,.3);letter-spacing:1px;text-align:center';
  spInfo.textContent='每 10 熟練度 = 10 SP　目前 SP：'+(seasonPoints||0);
  list.appendChild(spInfo);
}
function updateProficiencyDisplay(){
  if(document.getElementById('prof-overlay').style.display==='flex')openProficiencyPanel();
}
function updateArmoryGunCounts(){
  document.querySelectorAll('.a-gun-btn').forEach(function(b){
    var gun=b.dataset.gun;
    var cnt=weaponInventory[gun]||0;
    b.textContent=weaponNames[gun]+(cnt>0?' (×'+cnt+')':'');b.style.color=cnt>0?'rgba(255,255,255,.9)':'rgba(100,100,100,.4)';
  });
}
function showShop(){
  document.getElementById('shop').style.display='flex';
  renderShopList();
}
function renderShopList(){
  document.getElementById('shop-coins').textContent='特種幣 $'+specialCoins;
  var list=document.getElementById('shop-list');list.innerHTML='';
  var guns=['ak47','deagle','awp','shotgun','knife','smg'];
  guns.forEach(function(gun){
    var price=weaponPrices[gun];
    var cnt=weaponInventory[gun]||0;
    var item=document.createElement('div');item.className='shop-item';
    item.innerHTML='<span class="s-name">'+weaponNames[gun]+'</span><span class="s-count">×'+cnt+'</span><span class="s-price">$'+price+'</span><button data-gun="'+gun+'"'+(specialCoins<price?' disabled':'')+'>購買</button>';
    item.querySelector('button').onclick=function(){
      if(specialCoins>=price){specialCoins-=price;weaponInventory[gun]=(weaponInventory[gun]||0)+1;saveWeaponInventory();if(gun!=='grapple'&&gun!=='knife'&&weaponInventory[gun]===1){ownGun(gun);saveOwnedGuns();}renderShopList();updateCoinsDisplay();updateArmoryGunCounts();}
    };
    list.appendChild(item);
  });
}
function showToast(text,duration){
  var el=document.getElementById('toast-notify');
  if(!el){
    el=document.createElement('div');el.id='toast-notify';
    el.style.cssText='position:fixed;bottom:16%;left:50%;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,.7);padding:8px 18px;border-radius:6px;font-size:16px;letter-spacing:1px;z-index:20;pointer-events:none;transition:opacity 0.15s;opacity:0;text-shadow:0 1px 3px rgba(0,0,0,.8)';
    document.body.appendChild(el);
  }
  el.textContent=text;el.style.opacity='1';
  if(el._toast)clearTimeout(el._toast);
  el._toast=setTimeout(function(){el.style.opacity='0';},(duration||1)*1000);
}
function ocAwpTex(){
  if(window._ocAwpTex)return window._ocAwpTex;
  var tex=new THREE.TextureLoader().load('awp_diff.jpg');
  try{tex.colorSpace=THREE.SRGBColorSpace;}catch(e){}
  try{tex.anisotropy=renderer.capabilities.getMaxAnisotropy();}catch(e){}
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  window._ocAwpTex=tex;
  return tex;
}
// 程序生成的環境貼圖（天空漸層）給瞄準鏡鏡片反射用
function ocAwpEnv(){
  if(window._ocAwpEnv!==undefined)return window._ocAwpEnv;
  try{
    var c=document.createElement('canvas');c.width=512;c.height=256;var g=c.getContext('2d');
    var grad=g.createLinearGradient(0,0,0,256);
    grad.addColorStop(0,'#9cc4ee');grad.addColorStop(0.45,'#eef3f8');grad.addColorStop(0.55,'#c8d2dc');grad.addColorStop(1,'#2b2f36');
    g.fillStyle=grad;g.fillRect(0,0,512,256);
    g.fillStyle='rgba(90,110,130,.5)';g.fillRect(0,150,512,18);
    g.fillStyle='#ffffff';g.beginPath();g.arc(400,50,22,0,7);g.fill();
    var t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;
    if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;
    window._ocAwpEnv=t;   // 直接用 equirect 貼圖當 envMap：任何 renderer 皆可用（不含跨 context 的 PMREM render target）
  }catch(e){window._ocAwpEnv=null;}
  return window._ocAwpEnv;
}
// 用烘焙好的 AWP OBJ 模型（awpdata.js）建立槍身網格；沒有資料就回傳 null（回退程序生成）
// 三材質群組：槍身(metal色)、瞄準鏡(scope色)、鏡片(鏡面反光)
function ocBuildAwpMesh(skinC){
  if(!window.OC_AWP_MODEL)return null;
  var geo=window._ocAwpGeo;
  if(!geo){
    var M=window.OC_AWP_MODEL;
    geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(M.p),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(M.n),3));
    geo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(M.u),2));
    var idx=ocB64u16(M.i);geo.setIndex(new THREE.BufferAttribute(idx,1));
    var g1=(M.g|0),g2=(M.g2|0);
    if(g1>0&&g2>g1&&g2<=idx.length){geo.addGroup(0,g1,0);geo.addGroup(g1,g2-g1,1);geo.addGroup(g2,idx.length-g2,2);}
    else{geo.addGroup(0,idx.length,0);}
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    window._ocAwpGeo=geo;
  }
  var tex=ocAwpTex();
  var metalCol=skinC&&skinC.metal!==undefined?skinC.metal:0x666666;
  var scopeCol=skinC&&skinC.scope!==undefined?skinC.scope:0x111111;
  var bodyMat=new THREE.MeshStandardMaterial({map:tex,color:metalCol,metalness:0.35,roughness:0.6,side:THREE.DoubleSide});
  var scopeMat=new THREE.MeshStandardMaterial({map:tex,color:scopeCol,metalness:0.5,roughness:0.4,side:THREE.DoubleSide});
  if(!window._ocAwpLensMat){window._ocAwpLensMat=new THREE.MeshStandardMaterial({color:0xdfeaf2,metalness:1.0,roughness:0.05,envMap:ocAwpEnv(),envMapIntensity:1.4,side:THREE.DoubleSide});}
  var mesh=new THREE.Mesh(geo,[bodyMat,scopeMat,window._ocAwpLensMat]);
  var grp=new THREE.Group();
  grp.add(mesh);
  var MM=window.OC_AWP_MODEL;
  if(MM.bp&&MM.bi){
    var bgeo=new THREE.BufferGeometry();
    bgeo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(MM.bp),3));
    bgeo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(MM.bn),3));
    bgeo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(MM.bu),2));
    bgeo.setIndex(new THREE.BufferAttribute(ocB64u16(MM.bi),1));
    bgeo.computeVertexNormals();
    bgeo.computeBoundingSphere();
    var boltMesh=new THREE.Mesh(bgeo,bodyMat);
    grp.add(boltMesh);
    grp.userData.boltMesh=boltMesh;
  }
  grp.userData.skinMats={metal:bodyMat,scope:scopeMat};
  return grp;
}
// MP7 貼圖（單張 diffuse）
function ocMp7Tex(){
  if(window._ocMp7Tex)return window._ocMp7Tex;
  var tex=new THREE.TextureLoader().load('mp7/mp7_color.png');
  try{tex.colorSpace=THREE.SRGBColorSpace;}catch(e){}
  try{tex.anisotropy=renderer.capabilities.getMaxAnisotropy();}catch(e){}
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  window._ocMp7Tex=tex;return tex;
}
// 用烘焙好的 MP7 OBJ 模型（mp7data.js）建立槍身；沒有資料回傳 null（回退程序生成）
function ocBuildMp7Mesh(skinC){
  if(!window.OC_MP7_MODEL)return null;
  var geo=window._ocMp7Geo;
  if(!geo){
    var M=window.OC_MP7_MODEL;
    geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(M.p),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(M.n),3));
    geo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(M.u),2));
    geo.setIndex(new THREE.BufferAttribute(ocB64u16(M.i),1));
    geo.computeBoundingSphere();
    window._ocMp7Geo=geo;
  }
  // 全黑亮面：去掉貼圖，用亮黑底 + 輕微自發光，避免看起來太暗
  var bodyMat=new THREE.MeshStandardMaterial({color:0x141414,emissive:0x161616,emissiveIntensity:1.2,metalness:0.1,roughness:0.55,side:THREE.DoubleSide});
  var scopeMat=new THREE.MeshStandardMaterial({color:0x141414,emissive:0x161616,emissiveIntensity:1.2,metalness:0.1,roughness:0.55,side:THREE.DoubleSide});
  var mesh=new THREE.Mesh(geo,bodyMat);
  var grp=new THREE.Group();
  grp.add(mesh);
  // MP7 稍微縮小
  grp.scale.setScalar(0.9);
  // 彈匣做成獨立 mesh（模型自帶），reload 動畫直接拉動它，不再疊灰色彈匣
  var M=window.OC_MP7_MODEL;
  if(M.gi&&M.gp){
    var mgeo=new THREE.BufferGeometry();
    mgeo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(M.gp),3));
    mgeo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(M.gn),3));
    mgeo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(M.gu),2));
    mgeo.setIndex(new THREE.BufferAttribute(ocB64u16(M.gi),1));
    mgeo.computeBoundingSphere();
    var magMesh=new THREE.Mesh(mgeo,bodyMat);
    grp.add(magMesh);
    grp.userData.magMesh=magMesh;
    grp.userData.magBaseY=magMesh.position.y;
  }
  grp.userData.skinMats={dark:scopeMat,metal:bodyMat,wood:bodyMat,scope:scopeMat};
  return grp;
}
// Deagle 貼圖（basecolor + normal + roughness，1024 JPEG）
function ocDeagleTex(name){
  if(!window._ocDeagleTex)window._ocDeagleTex={};
  if(window._ocDeagleTex[name])return window._ocDeagleTex[name];
  var tex=new THREE.TextureLoader().load('deagle/tex/'+name+'.jpg');
  try{if(name==='base')tex.colorSpace=THREE.SRGBColorSpace;}catch(e){}
  try{tex.anisotropy=renderer.capabilities.getMaxAnisotropy();}catch(e){}
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  window._ocDeagleTex[name]=tex;return tex;
}
// 用烘焙好的 Deagle OBJ 模型（deagledata.js）建立槍身；沒有資料回傳 null（回退程序生成）
function ocBuildDeagleMesh(skinC){
  if(!window.OC_DEAGLE_MODEL)return null;
  var geo=window._ocDeagleGeo;
  if(!geo){
    var M=window.OC_DEAGLE_MODEL;
    geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(M.p),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(M.n),3));
    geo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(M.u),2));
    geo.setIndex(new THREE.BufferAttribute(ocB64u16(M.i),1));
    var gi=ocB64u16(M.i);
    var g1=(M.g|0);
    if(g1>0&&g1<gi.length){geo.addGroup(0,g1,0);geo.addGroup(g1,gi.length-g1,1);}
    else geo.addGroup(0,gi.length,0);
    geo.computeBoundingSphere();
    window._ocDeagleGeo=geo;
  }
  var texBase=ocDeagleTex('base'),texNrm=ocDeagleTex('normal'),texRgh=ocDeagleTex('rough');
  // 貼圖為主、膚色只做色調：保留色相飽和，亮度拉高避免整把變黑
  function _tint(col){
    var c=new THREE.Color(col===undefined?0xffffff:col),h={h:0,s:0,l:0};
    c.getHSL(h);c.setHSL(h.h,h.s,Math.max(h.l,0.78));return c;
  }
  var bodyTint=_tint(skinC&&skinC.metal!==undefined?skinC.metal:0xffffff);
  var env=ocAwpEnv?ocAwpEnv():null;
  var bodyMat=new THREE.MeshStandardMaterial({map:texBase,normalMap:texNrm,roughnessMap:texRgh,color:bodyTint,metalness:0.45,roughness:0.75,envMap:env,envMapIntensity:0.8,emissive:0xffffff,emissiveMap:texBase,emissiveIntensity:0.22,side:THREE.DoubleSide});
  // 鏡片：模型自帶的透明玻璃（用模型貼圖，無自訂紅點）
  var lensMat=new THREE.MeshStandardMaterial({color:0x1a2228,metalness:0.1,roughness:0.08,transparent:true,opacity:0.22,depthWrite:false,side:THREE.DoubleSide});
  var mesh=new THREE.Mesh(geo,[bodyMat,lensMat]);
  var grp=new THREE.Group();
  grp.add(mesh);
  // 模型含紅點鏡與戰術燈，整體比舊程序模型高，內縮 0.82 對齊舊視模型比例
  grp.scale.setScalar(0.82);
  // 彈匣（握把底板）獨立 mesh，reload 直接拉動
  var M=window.OC_DEAGLE_MODEL;
  if(M.gi&&M.gp){
    var mgeo=new THREE.BufferGeometry();
    mgeo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(M.gp),3));
    mgeo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(M.gn),3));
    mgeo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(M.gu),2));
    mgeo.setIndex(new THREE.BufferAttribute(ocB64u16(M.gi),1));
    mgeo.computeBoundingSphere();
    var magMesh=new THREE.Mesh(mgeo,bodyMat);
    grp.add(magMesh);
    grp.userData.magMesh=magMesh;
    grp.userData.magBaseY=magMesh.position.y;
  }
  grp.userData.skinMats={dark:bodyMat,metal:bodyMat,wood:bodyMat,scope:lensMat};
  // 瞄準鏡中心（遊戲 ADS 用，讓鏡片對齊畫面中央）；含內縮 scale
  var _sl=M.lens, _sc=0.82;
  grp.userData.sightLens=_sl?[_sl[0]*_sc,_sl[1]*_sc,_sl[2]*_sc]:null;
  // 槍口位置（OBJ 模型內縮後），同步給子彈起點/火光
  if(barrelTips&&barrelTips.deagle)barrelTips.deagle.set(0,0,(M.muzzleZ||-0.21)*_sc);
  return grp;
}
function createGunModel(type,plain){
  var g=new THREE.Group();
  var skinC=plain?null:getSkinColors(type);
  var matDark=new THREE.MeshStandardMaterial({color:skinC&&skinC.dark!==undefined?skinC.dark:0x222222,metalness:0.3,roughness:0.7});
  var matMetal=new THREE.MeshStandardMaterial({color:skinC&&skinC.metal!==undefined?skinC.metal:0x666666,metalness:0.6,roughness:0.4});
  var matWood=new THREE.MeshStandardMaterial({color:skinC&&skinC.wood!==undefined?skinC.wood:0x8B5E3C,roughness:0.9});
  var matScope=new THREE.MeshStandardMaterial({color:skinC&&skinC.scope!==undefined?skinC.scope:0x111111,metalness:0.5,roughness:0.3});
  var matLens=new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x4488ff,emissiveIntensity:0.15});
  if(type==='flamethrower'){
    var flBody=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.034,0.24,10),matDark);flBody.rotation.x=Math.PI/2;flBody.position.set(0,0,-0.02);g.add(flBody);
    var flTankMat=new THREE.MeshStandardMaterial({color:0xcc5522,metalness:0.6,roughness:0.4});
    var flTank=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.14,10),flTankMat);flTank.position.set(0,0.058,0.02);g.add(flTank);
    var flTank2=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.14,10),flTankMat);flTank2.position.set(0,0.058,0.17);g.add(flTank2);
    var flHose=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.008,6,12,Math.PI),matDark);flHose.position.set(-0.05,0.02,-0.04);flHose.rotation.y=Math.PI/2;g.add(flHose);
    var flNoz=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.014,0.22,8),matMetal);flNoz.rotation.x=Math.PI/2;flNoz.position.set(0,-0.005,-0.24);g.add(flNoz);
    var flNozTip=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.01,0.03,8),matDark);flNozTip.rotation.x=Math.PI/2;flNozTip.position.set(0,-0.005,-0.35);g.add(flNozTip);
    var flFlame=new THREE.Mesh(new THREE.ConeGeometry(0.02,0.1,8),new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:0.9}));flFlame.rotation.x=-Math.PI/2;flFlame.position.set(0,-0.005,-0.42);g.add(flFlame);g.userData.flameTip=flFlame;
    var flGrip=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.05,0.02),matDark);flGrip.position.set(0,-0.035,0.02);g.add(flGrip);
    var flBar=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.03,0.014),matMetal);flBar.position.set(0,0.006,-0.07);g.add(flBar);
    g.userData.skinMats={dark:matDark,metal:matMetal,wood:matWood,scope:matScope};
    return g;
  }
  if(type==='ak47'){
    var b1=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.014,0.28,6),matMetal);b1.rotation.x=Math.PI/2;b1.position.set(0,0,-0.19);g.add(b1);
    var gt=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.18,6),matDark);gt.rotation.x=Math.PI/2;gt.position.set(0,0.025,-0.15);g.add(gt);
    var fs=new THREE.Mesh(new THREE.BoxGeometry(0.01,0.03,0.01),matDark);fs.position.set(0,0.02,-0.31);g.add(fs);
    var rcv=new THREE.Mesh(new THREE.BoxGeometry(0.036,0.045,0.14),matDark);rcv.position.set(0,0,-0.01);g.add(rcv);
    var rail=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.004,0.06),matMetal);rail.position.set(0,0.026,-0.04);g.add(rail);
    var scp=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.04,8),matScope);scp.rotation.x=Math.PI/2;scp.position.set(0,0.04,-0.06);g.add(scp);
    var sl=new THREE.Mesh(new THREE.CircleGeometry(0.01,8),matLens);sl.position.set(0,0.04,-0.08);g.add(sl);
    var pg=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.04,0.02),matWood);pg.position.set(0,-0.03,0.06);pg.rotation.x=0.2;g.add(pg);
    var stk=new THREE.Mesh(new THREE.BoxGeometry(0.028,0.035,0.08),matWood);stk.position.set(0,0.01,0.1);g.add(stk);
    var hg=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.022,0.1),matWood);hg.position.set(0,-0.015,-0.15);g.add(hg);
    var fh=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.012,0.025,6),matDark);fh.rotation.x=Math.PI/2;fh.position.set(0,0,-0.33);g.add(fh);g.userData.flashHider=fh;
  }else if(type==='deagle'){
    var ocDe=ocBuildDeagleMesh(skinC);
    if(ocDe){
      g.add(ocDe);
      if(ocDe.userData){
        if(ocDe.userData.skinMats)g.userData.skinMats=ocDe.userData.skinMats;
        if(ocDe.userData.magMesh){g.userData.magMesh=ocDe.userData.magMesh;g.userData.magBaseY=ocDe.userData.magBaseY;}
        if(ocDe.userData.sightLens)g.userData.sightLens=ocDe.userData.sightLens;
      }
    }
    else{
    // Barrel (thicker, longer)
    var b2=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.015,0.14,8),matMetal);b2.rotation.x=Math.PI/2;b2.position.set(0,0,-0.12);g.add(b2);
    // Barrel ribs (ventilation cuts on top)
    for(var ri=0;ri<4;ri++){var rib=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.012,0.014),matDark);rib.position.set(0,0.014,-0.08-ri*0.022);g.add(rib);}
    // Slide (wider)
    var sd=new THREE.Mesh(new THREE.BoxGeometry(0.032,0.035,0.14),matDark);sd.position.set(0,0,-0.05);g.add(sd);
    // Front sight
    var fs2=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.018,0.006),matDark);fs2.position.set(0,0.028,-0.13);g.add(fs2);
    // Rear sight
    var rs2=new THREE.Mesh(new THREE.BoxGeometry(0.008,0.015,0.006),matDark);rs2.position.set(0,0.026,0.02);g.add(rs2);
    // Frame
    var fm=new THREE.Mesh(new THREE.BoxGeometry(0.028,0.02,0.08),matMetal);fm.position.set(0,-0.025,0.02);g.add(fm);
    // Trigger guard (larger arc)
    var tg=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.012,0.03),matDark);tg.position.set(0,-0.035,0);g.add(tg);
    // Grip (larger, angled)
    var grp=new THREE.Mesh(new THREE.BoxGeometry(0.028,0.055,0.04),new THREE.MeshStandardMaterial({color:0x332211}));grp.position.set(0,-0.06,0.07);grp.rotation.x=0.2;g.add(grp);
    // Grip texture lines
    for(var ti=0;ti<3;ti++){var tl=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.003,0.002),matDark);tl.position.set(0,-0.045+ti*0.015,0.09);g.add(tl);}
    // Scope rail
    var rail2=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.003,0.05),matMetal);rail2.position.set(0,0.02,-0.06);g.add(rail2);
    // Red dot scope
    var rds=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.028,8),matScope);rds.rotation.x=Math.PI/2;rds.position.set(0,0.034,-0.07);g.add(rds);
    var rdl=new THREE.Mesh(new THREE.SphereGeometry(0.004,6,6),new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff0000,emissiveIntensity:0.5}));
    rdl.position.set(0,0.034,-0.085);g.add(rdl);
    // Muzzle brake
    var mz=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.014,0.018,8),matDark);mz.rotation.x=Math.PI/2;mz.position.set(0,0,-0.15);g.add(mz);g.userData.flashHider=mz;
    // Slide serrations (rear)
    for(var si=0;si<3;si++){var serr=new THREE.Mesh(new THREE.BoxGeometry(0.024,0.004,0.004),matMetal);serr.position.set(0,0.016,0.01+si*0.008);g.add(serr);}
    }
  }else if(type==='awp'){
    var ocAwp=ocBuildAwpMesh(skinC);
    if(ocAwp){g.add(ocAwp);if(ocAwp.userData){if(ocAwp.userData.skinMats)g.userData.skinMats=ocAwp.userData.skinMats;if(ocAwp.userData.boltMesh)g.userData.boltMesh=ocAwp.userData.boltMesh;}}
    else{
    var b3=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.013,0.34,6),matMetal);b3.rotation.x=Math.PI/2;b3.position.set(0,0,-0.22);g.add(b3);
    var bs=new THREE.Mesh(new THREE.CylinderGeometry(0.017,0.018,0.12,6),matDark);bs.rotation.x=Math.PI/2;bs.position.set(0,0,-0.13);g.add(bs);
    var bd2=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.05,0.16),matDark);bd2.position.set(0,0,-0.02);g.add(bd2);
    var bh2=new THREE.Mesh(new THREE.SphereGeometry(0.012,6,6),matMetal);bh2.position.set(0.026,0.01,0);g.add(bh2);
    var scp2=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.08,8),matScope);scp2.rotation.x=Math.PI/2;scp2.position.set(0,0.048,-0.06);g.add(scp2);
    var stk2=new THREE.Mesh(new THREE.BoxGeometry(0.032,0.04,0.14),matDark);stk2.position.set(0,0.01,0.13);g.add(stk2);
    var pg2=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.045,0.025),matDark);pg2.position.set(0,-0.035,0.07);pg2.rotation.x=0.3;g.add(pg2);
    var bp1=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.06,4),matMetal);bp1.position.set(0.015,-0.025,-0.18);bp1.rotation.z=0.3;g.add(bp1);
    var bp2=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.06,4),matMetal);bp2.position.set(-0.015,-0.025,-0.18);bp2.rotation.z=-0.3;g.add(bp2);
    }
  }else if(type==='knife'){
    var fireMat=new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff2200,emissiveIntensity:2});
    var fireGlow=new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:3,transparent:true,opacity:0.7});
    // Blade
    var blGeo=new THREE.BufferGeometry();
    var verts=new Float32Array([0,0,-0.22, -0.018,0,-0.1, 0.018,0,-0.1, 0,0.008,-0.22, -0.018,0.008,-0.1, 0.018,0.008,-0.1]);
    blGeo.setAttribute('position',new THREE.BufferAttribute(verts,3));
    blGeo.setIndex([0,1,2, 0,2,4,4,2,5, 0,4,3, 3,4,5, 3,5,1, 1,5,2, 0,3,1]);
    blGeo.computeVertexNormals();
    var blade=new THREE.Mesh(blGeo,fireMat);g.add(blade);
    // Flame aura particles
    for(var pi=0;pi<8;pi++){
      var fp=new THREE.Mesh(new THREE.SphereGeometry(0.005+Math.random()*0.008,4,4),fireGlow);
      fp.position.set((Math.random()-0.5)*0.04,0,(Math.random()-0.5)*0.08-0.12);
      g.add(fp);
    }
    // Crossguard
    var cg=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.004,0.012),matDark);cg.position.set(0,0,-0.08);g.add(cg);
    var cg2=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.018,0.012),matDark);cg2.position.set(0,0.005,-0.08);g.add(cg2);
    // Handle
    var hdl=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.018,0.06,6),new THREE.MeshStandardMaterial({color:0x552211}));hdl.rotation.x=Math.PI/2;hdl.position.set(0,0,-0.03);g.add(hdl);
    // Pommel
    var pml=new THREE.Mesh(new THREE.SphereGeometry(0.012,6,6),matMetal);pml.position.set(0,0,0.015);g.add(pml);
  }else if(type==='grapple'){
    // Main barrel tube
    var gb1=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.025,0.15,8),matMetal);gb1.rotation.x=Math.PI/2;gb1.position.set(0,0,-0.12);g.add(gb1);
    // Body/receiver
    var gb2=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.05,0.1),matDark);gb2.position.set(0,0,0);g.add(gb2);
    // Hook prongs at front
    var hookMat=new THREE.MeshStandardMaterial({color:0x999999,metalness:0.6,roughness:0.3});
    for(var hi=-1;hi<=1;hi+=2){
      var hk=new THREE.Mesh(new THREE.TorusGeometry(0.028,0.007,6,8,Math.PI*0.55),hookMat);
      hk.rotation.y=Math.PI/2;hk.rotation.z=hi*0.25;hk.position.set(hi*0.014,0,-0.175);g.add(hk);
      var ht=new THREE.Mesh(new THREE.SphereGeometry(0.009,4,4),hookMat);ht.position.set(hi*0.022,0,-0.205);g.add(ht);
    }
    // Grip
    var ggr=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.06,0.025),matDark);ggr.position.set(0,-0.045,0.04);ggr.rotation.x=0.3;g.add(ggr);
    // Gas canister on top
    var can=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.02,0.06,8),matMetal);can.position.set(0,0.045,-0.05);g.add(can);
    // Trigger guard
    var tgg=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.023,0.018),matDark);tgg.position.set(0,-0.02,0.02);g.add(tgg);
    // Muzzle ring
    var mr2=new THREE.Mesh(new THREE.TorusGeometry(0.026,0.005,6,8),matDark);mr2.rotation.x=Math.PI/2;mr2.position.set(0,0,-0.195);g.add(mr2);
    // Indicator light
    var ind=new THREE.Mesh(new THREE.SphereGeometry(0.005,6,6),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x44ff44,emissiveIntensity:1}));
    ind.position.set(0.026,0.02,-0.05);g.add(ind);
  }else if(type==='shotgun'){
    var b1=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.022,0.16,8),matMetal);b1.rotation.x=Math.PI/2;b1.position.set(-0.012,0,-0.15);g.add(b1);
    var b2=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.022,0.16,8),matMetal);b2.rotation.x=Math.PI/2;b2.position.set(0.012,0,-0.15);g.add(b2);
    var rec=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.12),matDark);rec.position.set(0,0,-0.02);g.add(rec);
    var mt=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.12,6),matDark);mt.rotation.x=Math.PI/2;mt.position.set(0,-0.03,-0.14);g.add(mt);
    var pg3=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.04,0.05),matWood);pg3.position.set(0,-0.015,-0.18);g.add(pg3);
    var pg4=new THREE.Mesh(new THREE.BoxGeometry(0.024,0.055,0.03),matWood);pg4.position.set(0,-0.04,0.05);pg4.rotation.x=0.3;g.add(pg4);
    var stk3=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.04,0.1),matWood);stk3.position.set(0,0.01,0.1);g.add(stk3);
  }else if(type==='smg'){
    var ocMp7=ocBuildMp7Mesh(skinC);
    if(ocMp7){
      g.add(ocMp7);
      if(ocMp7.userData){
        if(ocMp7.userData.skinMats)g.userData.skinMats=ocMp7.userData.skinMats;
        if(ocMp7.userData.magMesh){magazineMesh=ocMp7.userData.magMesh;g.userData.magMesh=ocMp7.userData.magMesh;g.userData.magBaseY=ocMp7.userData.magBaseY;}
      }
    }
    else{
    // MP7：緊湊 PDW 外型（程序化備援），持槍/動畫與 AK-47 共用同一套
    var rcvs=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.05,0.16),matDark);rcvs.position.set(0,0,-0.02);g.add(rcvs);
    var railT=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.005,0.16),matMetal);railT.position.set(0,0.028,-0.02);g.add(railT);
    var barrs=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.013,0.10,8),matMetal);barrs.rotation.x=Math.PI/2;barrs.position.set(0,0,-0.14);g.add(barrs);
    var fhs=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.011,0.025,8),matDark);fhs.rotation.x=Math.PI/2;fhs.position.set(0,0,-0.20);g.add(fhs);g.userData.flashHider=fhs;
    var shroud=new THREE.Mesh(new THREE.BoxGeometry(0.032,0.03,0.09),matDark);shroud.position.set(0,-0.004,-0.13);g.add(shroud);
    var fsMp7=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.016,0.006),matDark);fsMp7.position.set(0,0.036,-0.165);g.add(fsMp7);
    // 內建紅點瞄準鏡（原本紅點樣式）
    var rdss=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.028,8),matScope);rdss.rotation.x=Math.PI/2;rdss.position.set(0,0.046,-0.03);g.add(rdss);
    var rdlens=new THREE.Mesh(new THREE.SphereGeometry(0.004,6,6),matLens);rdlens.position.set(0,0.046,-0.045);g.add(rdlens);
    var rsMp7=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.014,0.006),matDark);rsMp7.position.set(0,0.034,0.045);g.add(rsMp7);
    // 伸縮托桿 + 槍托底板
    var rodL=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.06,8),matMetal);rodL.rotation.x=Math.PI/2;rodL.position.set(0.011,0.008,0.085);g.add(rodL);
    var rodR=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.06,8),matMetal);rodR.rotation.x=Math.PI/2;rodR.position.set(-0.011,0.008,0.085);g.add(rodR);
    var butt=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.05,0.014),matDark);butt.position.set(0,0.004,0.12);g.add(butt);
    // 握把（AK 同角度）
    var grips=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.05,0.024),matDark);grips.position.set(0,-0.048,0.045);grips.rotation.x=0.3;g.add(grips);
    // 彈匣（MP7 直插式）
    var mags=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.06,0.018),matMetal);mags.position.set(0,-0.055,-0.005);g.add(mags);
    var magBase=new THREE.Mesh(new THREE.BoxGeometry(0.024,0.01,0.022),matDark);magBase.position.set(0,-0.088,-0.005);g.add(magBase);
    // 折疊前握把
    var fgs=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.045,0.018),matDark);fgs.position.set(0,-0.048,-0.115);g.add(fgs);
    // 扳機護弓 + 扳機
    var tgs=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.01,0.024),matDark);tgs.position.set(0,-0.028,0.02);g.add(tgs);
    var trs=new THREE.Mesh(new THREE.BoxGeometry(0.003,0.008,0.004),matMetal);trs.position.set(0,-0.022,0.02);g.add(trs);
    // 拉機柄
    var chs=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.016,6),matMetal);chs.rotation.z=Math.PI/2;chs.position.set(0,0.02,0.03);g.add(chs);
    }
  }else if(type==='radrifle'){
    var rMat=new THREE.MeshStandardMaterial({color:0x226622,metalness:0.6,roughness:0.3});
    var rGlow=new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x22ff22,emissiveIntensity:0.8});
    var rDark=new THREE.MeshStandardMaterial({color:0x113311,metalness:0.4,roughness:0.6});
    var rb=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.022,0.28,8),rMat);rb.rotation.x=Math.PI/2;rb.position.set(0,0,-0.22);g.add(rb);
    for(var rfi=0;rfi<5;rfi++){var rf=new THREE.Mesh(new THREE.TorusGeometry(0.024,0.004,6,8),rDark);rf.rotation.x=Math.PI/2;rf.position.set(0,0,-0.12-rfi*0.04);g.add(rf);}
    var rr=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.05,0.14),rDark);rr.position.set(0,0,-0.02);g.add(rr);
    var rc=new THREE.Mesh(new THREE.SphereGeometry(0.012,8,8),rGlow);rc.position.set(0,0.012,-0.06);g.add(rc);
    var rri=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.003,0.06),rMat);rri.position.set(0,0.028,-0.04);g.add(rri);
    var rsc=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.03,8),new THREE.MeshStandardMaterial({color:0x111111}));rsc.rotation.x=Math.PI/2;rsc.position.set(0,0.04,-0.06);g.add(rsc);
    var rl=new THREE.Mesh(new THREE.CircleGeometry(0.01,8),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x22ff22,emissiveIntensity:0.3}));rl.position.set(0,0.04,-0.076);g.add(rl);
    var mr3=new THREE.Mesh(new THREE.TorusGeometry(0.025,0.006,6,8),rGlow);mr3.rotation.x=Math.PI/2;mr3.position.set(0,0,-0.36);g.add(mr3);
    var rg=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.05,0.025),rDark);rg.position.set(0,-0.035,0.06);rg.rotation.x=0.3;g.add(rg);
    var rs=new THREE.Mesh(new THREE.BoxGeometry(0.028,0.035,0.1),rDark);rs.position.set(0,0.01,0.12);g.add(rs);
    var rm=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.04,0.02),rGlow);rm.position.set(0,-0.03,-0.16);g.add(rm);
    for(var rpi=0;rpi<6;rpi++){var rp_=new THREE.Mesh(new THREE.SphereGeometry(0.004,4,4),rGlow);rp_.position.set((Math.random()-0.5)*0.04,0.01+(Math.random()-0.5)*0.03,(Math.random()-0.5)*0.06-0.12);g.add(rp_);}
    var mb=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.024,0.025,8),new THREE.MeshStandardMaterial({color:skinC&&skinC.dark!==undefined?skinC.dark:0x444444,metalness:0.5,roughness:0.5}));mb.rotation.x=Math.PI/2;mb.position.set(0,0,-0.24);g.add(mb);
    for(var vi=0;vi<5;vi++){var vt=new THREE.Mesh(new THREE.BoxGeometry(0.005,0.008,0.005),new THREE.MeshStandardMaterial({color:skinC&&skinC.dark!==undefined?skinC.dark:0x444444,metalness:0.5,roughness:0.5}));vt.position.set(0,0.03,-0.13-vi*0.025);g.add(vt);}
  }else if(type==='grenade'){
    var gBody=new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8),new THREE.MeshStandardMaterial({color:0x4a6b3d,roughness:0.7,metalness:0.1}));gBody.position.set(0,0,-0.03);g.add(gBody);
    var gFuse=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.008,0.025,5),new THREE.MeshStandardMaterial({color:0x666666,roughness:0.5,metalness:0.6}));gFuse.position.set(0,0.043,-0.03);g.add(gFuse);
    var gTopRing=new THREE.Mesh(new THREE.TorusGeometry(0.024,0.005,5,8),new THREE.MeshStandardMaterial({color:0x888888,roughness:0.4,metalness:0.7}));gTopRing.rotation.x=Math.PI/2;gTopRing.position.set(0,0.038,-0.03);g.add(gTopRing);
    var gPin=new THREE.Mesh(new THREE.CylinderGeometry(0.002,0.002,0.028,4),new THREE.MeshStandardMaterial({color:0xdddddd,roughness:0.2,metalness:0.9}));gPin.rotation.z=Math.PI/2;gPin.position.set(0.018,0.034,-0.03);g.add(gPin);
    var gPullRing=new THREE.Mesh(new THREE.TorusGeometry(0.01,0.003,5,8),new THREE.MeshStandardMaterial({color:0xcccccc,roughness:0.3,metalness:0.9}));gPullRing.position.set(0.032,0.034,-0.03);gPullRing.rotation.z=Math.PI/4;g.add(gPullRing);
    var gSpoon=new THREE.Mesh(new THREE.TorusGeometry(0.032,0.004,4,8,Math.PI*0.5),new THREE.MeshStandardMaterial({color:0xbbaa88,roughness:0.3,metalness:0.8}));gSpoon.rotation.x=Math.PI*0.6;gSpoon.position.set(0,0.003,0.012);g.add(gSpoon);
    var gBottomRing=new THREE.Mesh(new THREE.TorusGeometry(0.014,0.003,5,6),new THREE.MeshStandardMaterial({color:0x777777,roughness:0.5,metalness:0.6}));gBottomRing.rotation.x=Math.PI/2;gBottomRing.position.set(0,-0.04,-0.03);g.add(gBottomRing);
  }
  // Charging handle mesh per gun type
  var boltMat=new THREE.MeshStandardMaterial({color:0x666666,metalness:0.7,roughness:0.3});
  if(type==='ak47'){var bolt=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.014,6),boltMat);bolt.rotation.x=Math.PI/2;bolt.position.set(0.021,0.03,-0.02);g.add(bolt);g.userData.boltMesh=bolt;}
  else if(type==='deagle'&&!g.userData.magMesh){var bolt=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.008,0.004),boltMat);bolt.position.set(0,0.02,0.035);g.add(bolt);g.userData.boltMesh=bolt;}
  else if(type==='awp'){if(!window.OC_AWP_MODEL){var bolt=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.006,0.025,6),boltMat);bolt.rotation.x=Math.PI/2;bolt.position.set(0.024,0.015,-0.03);g.add(bolt);g.userData.boltMesh=bolt;}}
  else if(type==='shotgun'){var bolt=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.008,0.02,6),boltMat);bolt.rotation.x=Math.PI/2;bolt.position.set(0,-0.015,-0.18);g.add(bolt);g.userData.boltMesh=bolt;}
  else if(type==='smg'){var bolt=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.012,6),boltMat);bolt.position.set(0.022,0.018,0.025);g.add(bolt);g.userData.boltMesh=bolt;}
  else if(type==='radrifle'){var bolt=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.008,0.005),boltMat);bolt.position.set(0,0.038,-0.03);g.add(bolt);g.userData.boltMesh=bolt;}
  // Attachment meshes
  var attachList=plain?[]:getAttachments(type);var aMat=new THREE.MeshStandardMaterial({color:0x444444,metalness:0.6,roughness:0.3});var aMat2=new THREE.MeshStandardMaterial({color:0x222222,metalness:0.4,roughness:0.5});var aMatG=new THREE.MeshStandardMaterial({color:0x666666,metalness:0.5,roughness:0.4});
  if(attachList.indexOf('suppressor')!==-1){var sup=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.016,0.04,8),aMat);sup.rotation.x=Math.PI/2;if(type==='ak47')sup.position.set(0,0,-0.36);else if(type==='deagle')sup.position.set(0,0,-0.22);else if(type==='awp')sup.position.set(0,0,-0.39);else if(type==='shotgun')sup.position.set(0,0,-0.23);else if(type==='smg')sup.position.set(0,0,-0.18);else if(type==='radrifle')sup.position.set(0,0,-0.38);g.add(sup);}
  if(attachList.indexOf('compensator')!==-1){var comp=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.014,0.025,8),aMat2);comp.rotation.x=Math.PI/2;if(type==='ak47')comp.position.set(0,0,-0.355);else if(type==='deagle')comp.position.set(0,0,-0.22);else if(type==='awp')comp.position.set(0,0,-0.38);else if(type==='shotgun')comp.position.set(0,0,-0.23);else if(type==='smg')comp.position.set(0,0,-0.18);else if(type==='radrifle')comp.position.set(0,0,-0.37);g.add(comp);for(var ci=0;ci<4;ci++){var ch=new THREE.Mesh(new THREE.BoxGeometry(0.002,0.018,0.004),aMatG);ch.position.set(0,0,-0.355-ci*0.006);if(type==='ak47')ch.position.z=-0.355-ci*0.006;g.add(ch);}}
  if(attachList.indexOf('red_dot')!==-1){var rd=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.02,8),aMat);rd.rotation.x=Math.PI/2;if(type==='ak47')rd.position.set(0,0.048,-0.06);else if(type==='deagle')rd.position.set(0,0.095,-0.06);else if(type==='awp')rd.position.set(0,0.055,-0.06);else if(type==='shotgun')rd.position.set(0,0.035,-0.04);else if(type==='smg')rd.position.set(0,0.046,-0.02);else if(type==='radrifle')rd.position.set(0,0.048,-0.06);g.add(rd);var rdl=new THREE.Mesh(new THREE.SphereGeometry(0.003,6,6),new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:0.8}));rdl.position.copy(rd.position);rdl.position.z-=0.013;g.add(rdl);}
  if(attachList.indexOf('scope_2x')!==-1){var sc2=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.014,0.025,8),aMat2);sc2.rotation.x=Math.PI/2;if(type==='ak47')sc2.position.set(0,0.048,-0.06);else if(type==='deagle')sc2.position.set(0,0.095,-0.06);else if(type==='awp')sc2.position.set(0,0.055,-0.06);else if(type==='shotgun')sc2.position.set(0,0.035,-0.04);else if(type==='smg')sc2.position.set(0,0.046,-0.02);else if(type==='radrifle')sc2.position.set(0,0.048,-0.06);g.add(sc2);var scl=new THREE.Mesh(new THREE.CircleGeometry(0.006,8),new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x4488ff,emissiveIntensity:0.2}));scl.position.copy(sc2.position);scl.position.z-=0.015;g.add(scl);}
  if(attachList.indexOf('extended_mag')!==-1||attachList.indexOf('quick_ext_mag')!==-1){if(type==='ak47'){var em=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.065,0.025),aMat2);em.position.set(0,-0.048,0.006);g.add(em);}else if(type==='deagle'){var em=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.06,0.028),aMat2);em.position.set(0,-0.12,0.06);g.add(em);}else if(type==='awp'){var em=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.035,0.015),aMat2);em.position.set(0,-0.04,-0.15);g.add(em);}else if(type==='shotgun'){var em=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.04,0.02),aMat2);em.position.set(0,-0.045,-0.18);g.add(em);}else if(type==='smg'){var em=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.07,0.016),aMat2);em.position.set(0,-0.075,-0.01);g.add(em);}else if(type==='radrifle'){var em=new THREE.Mesh(new THREE.BoxGeometry(0.014,0.05,0.018),aMat2);em.position.set(0,-0.05,-0.18);g.add(em);}}
  if(attachList.indexOf('quick_mag')!==-1){if(type==='ak47'){var qm=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.015,0.006),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x44ff44,emissiveIntensity:0.3}));qm.position.set(0,-0.055,0.025);g.add(qm);}else if(type==='deagle'){var qm=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.012,0.006),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x44ff44,emissiveIntensity:0.3}));qm.position.set(0,-0.115,0.07);g.add(qm);}else if(type==='awp'){var qm=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.01,0.004),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x44ff44,emissiveIntensity:0.3}));qm.position.set(0,-0.04,-0.14);g.add(qm);}else if(type==='shotgun'){var qm=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.012,0.004),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x44ff44,emissiveIntensity:0.3}));qm.position.set(0,-0.045,-0.17);g.add(qm);}else if(type==='smg'){var qm=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.015,0.004),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x44ff44,emissiveIntensity:0.3}));qm.position.set(0,-0.075,-0.005);g.add(qm);}else if(type==='radrifle'){var qm=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.012,0.004),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x44ff44,emissiveIntensity:0.3}));qm.position.set(0,-0.05,-0.17);g.add(qm);}}
  if((attachList.indexOf('suppressor')!==-1||attachList.indexOf('compensator')!==-1)&&g.userData.flashHider)g.userData.flashHider.visible=false;
  g.userData.skinMats={dark:matDark,metal:matMetal,wood:matWood,scope:matScope};
  return g;
}
// ── Loadout system ──
var playerLoadout=['ak47',null,null,null,null],currentSlot=0,selectedArmorySlot=0;
try{var _lo=JSON.parse(localStorage.getItem('oc_loadout'));if(_lo&&_lo.loadout){for(var _li=0;_li<5;_li++){if(_lo.loadout[_li]!==undefined)playerLoadout[_li]=_lo.loadout[_li];}}}catch(e){}
// 手雷已從遊戲移除：把存檔裡殘留的 grenade 換掉，避免切到不存在的武器當機
(function(){
  var _fallback=['ak47','deagle','smg','awp','knife'];
  for(var _li=0;_li<5;_li++){
    var _t=playerLoadout[_li];
    if(_t&&(_t==='grenade'||_t==='grenade_frag'||_t==='grenade_flashbang'||_t==='grenade_smoke'||_t==='grenade_incendiary')){
      playerLoadout[_li]=_fallback[_li]||null;
    }
  }
  try{localStorage.setItem('oc_loadout',JSON.stringify({loadout:playerLoadout}));}catch(e){}
})();
function switchToSlot(slot){
  if(isDowned)return;
  inspectTimer=0;
  if(slot<0||slot>4)return;
  var type=playerLoadout[slot];
  if(!type)return;
  // 手雷只有「無限炸彈」模式還能用，一般模式直接跳過
  if(type==='grenade'&&!bombMode){playerLoadout[slot]=null;switchToSlot(slot<1?0:slot-1);return;}
  if(type==='grenade'&&grenadeStacks[slot]<=0){playerLoadout[slot]=null;switchToSlot(slot<1?0:slot-1);return;}
  currentSlot=slot;
  detachFlashlightMesh();
  // 清理鏡頭上殘留的舊槍：快速連按切換或換槍撞上死亡/暫停時，
  // 上次的 swapOutGroup 可能沒被動畫移除而被孤兒化，全部先清掉。
  for(var _ci=cam.children.length-1;_ci>=0;_ci--){
    var _ch=cam.children[_ci];
    if(_ch&&_ch!==gunGroup&&_ch.userData&&_ch.userData.oldGun&&typeof _ch.remove==='function')cam.remove(_ch);
  }
  if(swapOutGroup&&swapOutGroup!==gunGroup){
    if(swapOutGroup.parent)cam.remove(swapOutGroup);
    swapOutGroup=null;
  }
  if(gunGroup){
    swapOutGroup=gunGroup;
    swapOutGroup.userData.oldGun=true;
  }
  currentGun=type;
  stopAutoLoop(); // 換槍停止連發音效
  gunGroup=createGunModel(type);
  if(type==='grenade'){gunGroup.position.set(0.2,-0.15,-0.35);}else{gunGroup.position.set(0.55,-0.4,-0.05);}
  gunGroup.scale.set(1.5,1.5,1.5);
  gunGroup.visible=true;
  cam.add(gunGroup);
  swapAnimTimer=swapAnimDuration;swapTargetSlot=slot;swapTargetGun=type;currentSpread=(gunData[type]||{}).spread||0;currentSpreadGun=type;
  shootCD=0;isADS=false;isReloading=false;reloadTimer=0;cam.fov=80;cam.updateProjectionMatrix();knifeAnim=0;gunGroup.rotation.set(0.3,0,0);
  document.getElementById('scope-overlay').style.display='none';
  attachFlashlightMesh();createMagazine();
  document.querySelectorAll('.loadout-slot').forEach(function(s,i){
    s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';
  });
}
function updateArmoryUI(){
  for(var si=0;si<5;si++){
    var el=document.querySelector('.a-slot[data-slot="'+si+'"]');
    el.querySelector('.a-slot-gun').textContent=playerLoadout[si]?getSlotGunText(si):'─';
    el.classList.toggle('active',si===selectedArmorySlot);
  }
  updateSlotFlashlightUI();
}
// Armory events
document.getElementById('armory-btn').onclick=function(){
 var ar=document.getElementById('armory');
 ar.style.display='flex';
 window._pnlArmoryGlobal(document.getElementById('armory-box'));
 ar.onclick=function(e){if(e.target===ar)ar.style.display='none';};
};
document.addEventListener('keydown',function(e){if(e.key==='Escape'){var ar=document.getElementById('armory');if(ar&&ar.style.display==='flex')ar.style.display='none';}});
document.getElementById('friends-btn').onclick=function(){
  document.getElementById('friend-panel').style.display='flex';
  document.getElementById('friend-search-bar').style.display='none';
  switchFriendTab('friends');
  checkTeamStatus();
  fetchFriendList();
  if(!window.fpTeamInt)window.fpTeamInt=setInterval(function(){if(document.getElementById('friend-panel').style.display==='flex')checkTeamStatus();},3000);
};
document.getElementById('friend-bg').onclick=function(){
  document.getElementById('friend-panel').style.display='none';
  if(window.fpTeamInt){clearInterval(window.fpTeamInt);window.fpTeamInt=null;}
};
document.querySelectorAll('#friend-tabs .f-tab').forEach(function(t){
  t.onclick=function(){
    document.querySelectorAll('#friend-tabs .f-tab').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active');
    var view=t.dataset.view;
    if(view==='friends'){document.getElementById('friend-search-bar').style.display='none';fetchFriendList();}
    else if(view==='requests'){document.getElementById('friend-search-bar').style.display='none';fetchFriendRequests();}
    else if(view==='blacklist'){document.getElementById('friend-search-bar').style.display='none';fetchBlacklist();}
  };
});
document.getElementById('friend-add-btn').onclick=function(){
  document.querySelectorAll('#friend-tabs .f-tab').forEach(function(x){x.classList.remove('active');});
  document.getElementById('friend-search-bar').style.display='flex';
  document.getElementById('friend-list').innerHTML='<div class="f-empty">輸入名稱搜尋玩家</div>';
};
window.showTeamBlockTip=function(){
  var tip=document.getElementById('team-block-tip');
  tip.style.display='block';
  setTimeout(function(){tip.style.display='none';},2500);
}
window.teamCharRens=[];window.teamCharFrames=[];
function clearTeamPreviews(){
  window.teamCharFrames.forEach(function(d){cancelAnimationFrame(d.id)});window.teamCharFrames=[];
  window.teamCharRens.forEach(function(r){try{r.dispose()}catch(e){}});window.teamCharRens=[];
  var tc=document.getElementById('team-chars');if(tc)tc.innerHTML='';
}
window.checkTeamStatus=function(){
  authFetch('/api/team/status').then(function(d){
    var info=document.getElementById('team-info');
    var members=document.getElementById('team-members');
    var ts=document.getElementById('team-status');
    var blocked=!!(d.inTeam&&d.members);
    // 雙人／四人模式本來就是要跟隊友一起玩，組隊中不應封鎖 GO（可跟好友 1v1）
    var modeSel=document.querySelector('#mode-dropdown .mode-opt.selected');
    var modeVal=modeSel?modeSel.dataset.mode:'';
    if(modeVal==='multi2'||modeVal==='multi4') blocked=false;
    if(blocked){
      info.style.display='block';
      members.textContent=d.members.join(', ');
      ts.style.display='flex';
      document.getElementById('team-status-text').textContent='組隊中 '+d.members.join(', ');
      currentTeamId=d.teamId||null;
      clearTeamPreviews();
      // Add teammate characters on main stage
      window._menuCharTeammates.forEach(function(t){if(t.mesh&&window._menuCharScene)window._menuCharScene.remove(t.mesh);if(t.tag&&t.tag.parentNode)t.tag.parentNode.removeChild(t.tag);});
      window._menuCharTeammates=[];
      var tc=document.getElementById('team-chars');
      d.members.forEach(function(name,i){
        var tm=createOpponentMesh();
        tm.scale.set(1.2,1.2,1.2);tm.position.set(1.0+(i*0.9),0.35,0);
        tm.traverse(function(c){if(c.isMesh){c.material=new THREE.MeshStandardMaterial({color:0x222222,roughness:0.8,metalness:0.3,emissive:0x222244,emissiveIntensity:0.05});}});
        if(window._menuCharScene)window._menuCharScene.add(tm);
        // Name tag div
        var tag=document.createElement('div');tag.className='team-char-tag';tag.textContent=name;
        tag.style.cssText='position:absolute;color:#8cf;font-size:11px;font-weight:bold;letter-spacing:2px;text-shadow:0 0 8px rgba(68,170,255,.6),0 0 16px rgba(68,170,255,.3),0 0 30px rgba(0,0,0,.8);pointer-events:none;white-space:nowrap;font-family:Arial;transform:translateX(-50%);z-index:5';
        document.getElementById('character-stage').appendChild(tag);
        window._menuCharTeammates.push({mesh:tm,name:name,tag:tag});
        // Also keep the small canvas preview
        var wrap=document.createElement('div');wrap.className='team-char-wrap';
        var cv=document.createElement('canvas');cv.width=40;cv.height=58;cv.style.cssText='width:100%;height:100%;display:block';
        wrap.appendChild(cv);tc.appendChild(wrap);
        var ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
        ren.setSize(40,58);ren.setPixelRatio(1);ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.2;
        var sc2=new THREE.Scene();sc2.background=null;
        var ca2=new THREE.PerspectiveCamera(30,40/58,0.1,10);ca2.position.set(0,1.2,2.8);ca2.lookAt(0,0.5,0);
        sc2.add(new THREE.AmbientLight(0x446688,0.6));
        var dl2=new THREE.DirectionalLight(0xffeedd,1.5);dl2.position.set(2,4,3);sc2.add(dl2);
        var mg=createOpponentMesh();mg.scale.set(0.5,0.5,0.5);mg.position.y=-0.1;
        mg.traverse(function(c){if(c.isMesh){c.material=new THREE.MeshStandardMaterial({color:0x222222,roughness:0.8,metalness:0.3,emissive:0x222244,emissiveIntensity:0.05});}});
        sc2.add(mg);
        var ad={id:0},tm2=0;
        (function anim2(){ad.id=requestAnimationFrame(anim2);tm2+=0.016;mg.rotation.y=Math.sin(tm2*0.2)*0.3;ren.render(sc2,ca2);})();
        window.teamCharFrames.push(ad);
        window.teamCharRens.push(ren);
      });
    }else{
      info.style.display='none';
      ts.style.display='none';
      currentTeamId=null;
      clearTeamPreviews();
      window._menuCharTeammates.forEach(function(t){if(t.mesh&&window._menuCharScene)window._menuCharScene.remove(t.mesh);if(t.tag&&t.tag.parentNode)t.tag.parentNode.removeChild(t.tag);});
      window._menuCharTeammates=[];
    }
    document.getElementById('play-btn').classList.toggle('team-blocked',blocked);
    document.getElementById('daily-btn').classList.toggle('team-blocked',blocked);
  });
}
document.getElementById('team-leave-btn').onclick=function(){
  authFetch('/api/team/leave',{method:'POST'}).then(function(d){
    if(!d.error)checkTeamStatus();
    else alert(d.error);
  });
};
document.getElementById('friend-ban-btn').onclick=function(){
  document.querySelectorAll('#friend-tabs .f-tab').forEach(function(x){x.classList.remove('active');});
  document.querySelector('#friend-tabs .f-tab[data-view="blacklist"]').classList.add('active');
  document.getElementById('friend-search-bar').style.display='none';
  fetchBlacklist();
};
document.getElementById('friend-search-btn').onclick=function(){
  var q=document.getElementById('friend-search-input').value.trim();
  if(!q)return;
  searchUsers(q);
};
document.getElementById('friend-search-input').onkeydown=function(e){
  if(e.key==='Enter')document.getElementById('friend-search-btn').click();
};
var chatFriend=null,chatPollInt=null;
window.openChat=function(friendUsername,friendNickname){
  chatFriend=friendUsername;
  var cm=document.getElementById('chat-messages');
  cm.innerHTML='';
  cm.dataset.lastId='0';
  document.getElementById('chat-panel').style.display='flex';
  document.getElementById('chat-input').value='';
  document.getElementById('chat-input').focus();
  // Mark as read
  authFetch('/api/chat/read',{method:'POST',body:{friend:friendUsername}});
  // Load messages
  window.loadChatMessages();
  // Start polling
  if(chatPollInt)clearInterval(chatPollInt);
  chatPollInt=setInterval(window.loadChatMessages,2000);
};
window.closeChat=function(){
  if(chatPollInt){clearInterval(chatPollInt);chatPollInt=null;}
  chatFriend=null;
  document.getElementById('chat-panel').style.display='none';
};
window.loadChatMessages=function(){
  if(!chatFriend)return;
  var container=document.getElementById('chat-messages');
  var lastId=container.dataset.lastId||'0';
  authFetch('/api/chat/messages?friend='+encodeURIComponent(chatFriend)+'&after='+lastId).then(function(d){
    if(d.error)return;
    if(d.messages&&d.messages.length){
      d.messages.forEach(function(m){
        var isMine=m.from_username===authUser;
        var div=document.createElement('div');div.className='cm-msg '+(isMine?'cm-mine':'cm-theirs');
        div.textContent=m.content;
        var timeDiv=document.createElement('div');timeDiv.className='cm-time';
        var d2=new Date(m.created_at);
        timeDiv.textContent=d2.getHours().toString().padStart(2,'0')+':'+d2.getMinutes().toString().padStart(2,'0');
        div.appendChild(timeDiv);
        container.appendChild(div);
        container.dataset.lastId=m.id;
      });
      container.scrollTop=container.scrollHeight;
    }
  });
};
document.getElementById('chat-bg').onclick=function(){window.closeChat();};
document.getElementById('chat-close').onclick=function(){window.closeChat();};
document.getElementById('chat-send-btn').onclick=function(){
  window.sendChatMessage();
};
document.getElementById('chat-input').onkeydown=function(e){
  if(e.key==='Enter')window.sendChatMessage();
};
window.sendChatMessage=function(){
  if(!chatFriend)return;
  var input=document.getElementById('chat-input');
  var text=input.value.trim();
  if(!text)return;
  input.value='';
  authFetch('/api/chat/send',{method:'POST',body:{to:chatFriend,content:text}}).then(function(d){
    if(!d.error)window.loadChatMessages();
    else alert(d.error);
  });
}
document.getElementById('armory-bg').onclick=function(){document.getElementById('armory').style.display='none';};
document.getElementById('shop-btn').onclick=function(){document.getElementById('menu').style.display='none';showShop();};
document.getElementById('shop-bg').onclick=function(){document.getElementById('shop').style.display='none';document.getElementById('menu').style.display='flex';updateCoinsDisplay();};
document.getElementById('shop-close').onclick=function(){document.getElementById('shop').style.display='none';document.getElementById('menu').style.display='flex';updateCoinsDisplay();};
// ── Skin system ──
var gunSkins={ak47:[{id:'default',name:'原廠',colors:{dark:0x222222,metal:0x666666,wood:0x8B5E3C}},{id:'red_dragon',name:'赤龍',colors:{dark:0x441111,metal:0xcc2222,wood:0x441111}},{id:'ice',name:'寒冰',colors:{dark:0x113355,metal:0x66aadd,wood:0x224466}},{id:'gold',name:'黃金',colors:{dark:0x443311,metal:0xddaa33,wood:0x664422}},{id:'neon',name:'霓虹',colors:{dark:0x224411,metal:0x44ff44,wood:0x224411}},{id:'dark_flame',name:'黯焰',locked:true,colors:{dark:0x0a0a0a,metal:0x881111,wood:0x0a0a0a}},{id:'cosmic',name:'✨ 宇宙星塵',locked:true,colors:{dark:0x0a0a2a,metal:0x9966ff,wood:0x220044}}],deagle:[{id:'default',name:'原廠',colors:{dark:0x222222,metal:0x666666}},{id:'chrome',name:'鉻銀',colors:{dark:0x888888,metal:0xcccccc}},{id:'fire',name:'烈焰',colors:{dark:0x662200,metal:0xff4400}},{id:'midnight',name:'暗夜',colors:{dark:0x111133,metal:0x223366}},{id:'dark_flame',name:'黯焰',locked:true,colors:{dark:0x0a0a0a,metal:0x881111}},{id:'cosmic',name:'✨ 宇宙星塵',locked:true,colors:{dark:0x0a0a2a,metal:0x9966ff,wood:0x220044}}],awp:[{id:'default',name:'原廠',colors:{dark:0x222222,metal:0xd8d8d8,scope:0x666666}},{id:'carbon',name:'碳纖',colors:{dark:0x111111,metal:0x555555,scope:0x333333}},{id:'arctic',name:'極地',colors:{dark:0xeeeeee,metal:0xffffff,scope:0xcccccc}},{id:'tiger',name:'猛虎',colors:{dark:0x442200,metal:0xd99933,scope:0x6b4a22}},{id:'dark_flame',name:'黯焰',locked:true,colors:{dark:0x0a0a0a,metal:0x993322,scope:0x551100}},{id:'cosmic',name:'✨ 宇宙星塵',locked:true,colors:{dark:0x0a0a2a,metal:0xaa88ff,scope:0x5522cc}}],shotgun:[{id:'default',name:'原廠',colors:{dark:0x444444,metal:0x666666,wood:0x6B3E1C}},{id:'rust',name:'鐵鏽',colors:{dark:0x553322,metal:0x884422,wood:0x553322}},{id:'storm',name:'風暴',colors:{dark:0x223344,metal:0x4477aa,wood:0x223344}},{id:'dark_flame',name:'黯焰',locked:true,colors:{dark:0x0a0a0a,metal:0x881111,wood:0x0a0a0a}},{id:'cosmic',name:'✨ 宇宙星塵',locked:true,colors:{dark:0x0a0a2a,metal:0x9966ff,wood:0x220044}}],smg:[{id:'default',name:'黑色MP7',colors:{dark:0x1a1a1a,metal:0xffffff,wood:0x1a1a1a,scope:0x111111}},{id:'biohazard',name:'生化危機',colors:{dark:0x14301a,metal:0x66dd66,wood:0x244d22,scope:0x0f2a12}}]};
function getEquippedSkin(type){var s;try{s=localStorage.getItem('oc_skin_'+type);}catch(e){}return s||'default';}
function setSkin(type,id){try{localStorage.setItem('oc_skin_'+type,id);}catch(e){}if(type===currentGun&&gunGroup){detachFlashlightMesh();cam.remove(gunGroup);gunGroup=createGunModel(type);gunGroup.position.set(0.2,-0.15,-0.35);gunGroup.scale.set(1.5,1.5,1.5);cam.add(gunGroup);gunGroup.rotation.set(0,0,0);attachFlashlightMesh();createMagazine();}}
function unlockCosmicSkin(){var guns=['ak47','deagle','awp','shotgun','smg'];guns.forEach(function(g){var sk=gunSkins[g];if(!sk)return;for(var i=0;i<sk.length;i++){if(sk[i].id==='cosmic'){sk[i].locked=false;}}});}
function getProfLevel(gun){return Math.floor((weaponProf[gun]||0)/10)+1;}
function getSkinColors(type){
  var sk=gunSkins[type];if(!sk)return null;
  var id=getEquippedSkin(type);
  if(id==='dark_flame'&&getProfLevel(type)<20)id='default';
  var colors=null;
  for(var i=0;i<sk.length;i++){if(sk[i].id===id){colors={};for(var k in sk[i].colors)colors[k]=sk[i].colors[k];break;}}
  if(!colors&&sk[0]){colors={};for(var k in sk[0].colors)colors[k]=sk[0].colors[k];}
  try{var custom=JSON.parse(localStorage.getItem('oc_custom_'+type));if(custom)for(var k in custom)if(custom[k]!==undefined)colors[k]=custom[k];}catch(e){}
  return colors;
}
function recalcProdBonuses(){
  var dmgMult=1,reloadMult=1;
  for(var si=0;si<playerLoadout.length;si++){
    var g=playerLoadout[si];if(!g||g==='knife'||g==='grapple'||g==='grenade')continue;
    var lv=getProfLevel(g);
    if(lv>=10)reloadMult=Math.min(reloadMult,0.8);
    if(lv>=5)dmgMult=Math.max(dmgMult,1.10);
  }
  window.dmgMult=dmgMult;
  window.reloadSpeedMult=reloadMult;
}
var skinSelectedGun='ak47',skinMode='gun';
var skinPreviewScene=null,skinPreviewCam=null,skinPreviewRen=null,skinPreviewGun=null,skinPreviewChar=null,skinPreviewRotX=0,skinPreviewRotY=0,skinPreviewDrag=false,skinPreviewLastX=0,skinPreviewLastY=0,skinCustomColors={dark:0x222222,metal:0x666666,wood:0x8B5E3C,scope:0x111111},skinSelectedPart='dark';
var skinPartNames={dark:'暗色',metal:'金屬',wood:'木質',scope:'瞄具'};
var skinCharParts={body:'身體',feet:'腳',shoulders:'手部'};
var skinCharDefault={body:0x111111,feet:0x111111,shoulders:0x111111};
var presetColors=[
  0x222222,0x333333,0x444444,0x555555,0x666666,0x777777,0x888888,0x999999,
  0x111111,0x1a1a1a,0x2a2a2a,0x3a3a3a,0x4a4a4a,0x5a5a5a,0xaaaaaa,0xcccccc,
  0x441111,0x661111,0x882222,0xaa3333,0xcc4444,0x224411,0x336622,0x448833,
  0x114466,0x226688,0x3388aa,0x44aacc,0x111122,0x222244,0x333366,0x444488,
  0x553311,0x774422,0x885533,0x996644,0x332211,0x554422,0x443322,0x665533,
  0x111100,0x222200,0x333300,0x444400,0xffaa00,0xff6600,0x88ccff,0x22cc66
];
var lockedColors=[0x555555,0x888888,0x1a1a1a,0xcccccc,0xaa3333,0xcc4444,0x336622,0x448833,0x226688,0x44aacc,0x222244,0x444488,0x774422,0x996644,0x554422,0x665533,0x444400,0xffaa00];
var unlockedColors=new Set();
try{var uc=JSON.parse(localStorage.getItem('oc_unlocked_colors'));if(uc)uc.forEach(function(c){unlockedColors.add(c);});}catch(e){}
function isColorLocked(c){return lockedColors.indexOf(c)>=0&&!unlockedColors.has(c);}
var sessionSP=0;
function initSkinPreview(){
  var canvas=document.getElementById('skin-canvas');
  if(!canvas||skinPreviewRen)return;
  skinPreviewScene=new THREE.Scene();
  // Dark gradient background via CSS (canvas bg is transparent)
  skinPreviewCam=new THREE.PerspectiveCamera(25,canvas.parentElement.clientWidth/canvas.parentElement.clientHeight,0.1,10);
  skinPreviewCam.position.set(0,0.04,0.7);
  skinPreviewRen=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true});
  skinPreviewRen.setSize(canvas.parentElement.clientWidth,canvas.parentElement.clientHeight);
  skinPreviewRen.setPixelRatio(Math.min(devicePixelRatio,2));
  skinPreviewRen.toneMapping=THREE.ACESFilmicToneMapping;skinPreviewRen.toneMappingExposure=1.2;
  var al=new THREE.AmbientLight(0x8888ff,0.3);skinPreviewScene.add(al);
  var dl=new THREE.DirectionalLight(0xffeedd,1.5);dl.position.set(1.5,2.5,1);skinPreviewScene.add(dl);
  var dl2=new THREE.DirectionalLight(0x8888ff,0.6);dl2.position.set(-1,1.5,-1);skinPreviewScene.add(dl2);
  var rim=new THREE.DirectionalLight(0x4488ff,0.8);rim.position.set(-0.5,0,-1);skinPreviewScene.add(rim);
  // Floor glow ring
  var ringGeo=new THREE.RingGeometry(0.12,0.2,32);var ringMat=new THREE.MeshBasicMaterial({color:0x8844aa,transparent:true,opacity:0.15,side:THREE.DoubleSide});
  var ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=-0.08;skinPreviewScene.add(ring);
  // Mouse drag
  var wrap=canvas.parentElement;
  wrap.addEventListener('mousedown',function(e){skinPreviewDrag=true;skinPreviewLastX=e.clientX;skinPreviewLastY=e.clientY;});
  window.addEventListener('mousemove',function(e){if(!skinPreviewDrag)return;var dx=e.clientX-skinPreviewLastX,dy=e.clientY-skinPreviewLastY;skinPreviewRotY+=dx*0.01;skinPreviewRotX+=dy*0.01;skinPreviewRotX=Math.max(-1,Math.min(1,skinPreviewRotX));skinPreviewLastX=e.clientX;skinPreviewLastY=e.clientY;});
  window.addEventListener('mouseup',function(){skinPreviewDrag=false;});
  wrap.addEventListener('touchstart',function(e){var t=e.touches[0];skinPreviewDrag=true;skinPreviewLastX=t.clientX;skinPreviewLastY=t.clientY;},{passive:true});
  wrap.addEventListener('touchmove',function(e){if(!skinPreviewDrag||!e.touches.length)return;var t=e.touches[0];var dx=t.clientX-skinPreviewLastX,dy=t.clientY-skinPreviewLastY;skinPreviewRotY+=dx*0.01;skinPreviewRotX+=dy*0.01;skinPreviewRotX=Math.max(-1,Math.min(1,skinPreviewRotX));skinPreviewLastX=t.clientX;skinPreviewLastY=t.clientY;},{passive:true});
  wrap.addEventListener('touchend',function(){skinPreviewDrag=false;},{passive:true});
  // Animate
  function skinAnim(){requestAnimationFrame(skinAnim);
    var obj=skinPreviewGun||skinPreviewChar;
    if(obj&&!skinPreviewDrag){
      skinPreviewRotY+=0.008;
    }
    if(obj){
      obj.rotation.y=skinPreviewRotY;
      obj.rotation.x=skinPreviewRotX;
    }
    if(skinPreviewRen&&skinPreviewScene&&skinPreviewCam)skinPreviewRen.render(skinPreviewScene,skinPreviewCam);
  }
  skinAnim();
}
function buildSkinPreviewGun(){
  if(skinPreviewGun){skinPreviewScene.remove(skinPreviewGun);skinPreviewGun=null;}
  if(skinPreviewChar){skinPreviewScene.remove(skinPreviewChar);skinPreviewChar=null;}
  var orig=window.getSkinColors;
  window.getSkinColors=function(type){return type===skinSelectedGun?skinCustomColors:(orig?orig(type):{dark:0x222222,metal:0x666666,wood:0x8B5E3C,scope:0x111111});};
  var g=createGunModel(skinSelectedGun);
  window.getSkinColors=orig;
  if(g){skinPreviewScene.add(g);skinPreviewGun=g;}
}
function updateSkinPreviewColors(){
  if(skinMode==='gun'){
    if(!skinPreviewGun)return;
    var mats=skinPreviewGun.userData.skinMats;
    if(!mats)return;
    if(skinCustomColors.dark!==undefined&&mats.dark)mats.dark.color.setHex(skinCustomColors.dark);
    if(skinCustomColors.metal!==undefined&&mats.metal)mats.metal.color.setHex(skinCustomColors.metal);
    if(skinCustomColors.wood!==undefined&&mats.wood)mats.wood.color.setHex(skinCustomColors.wood);
    if(skinCustomColors.scope!==undefined&&mats.scope)mats.scope.color.setHex(skinCustomColors.scope);
  }else{
    updateCharPreviewColors();
  }
}
function buildSkinPreviewChar(){
  if(skinPreviewChar){skinPreviewScene.remove(skinPreviewChar);skinPreviewChar=null;}
  if(skinPreviewGun){skinPreviewScene.remove(skinPreviewGun);skinPreviewGun=null;}
  var g=createOpponentMesh();
  g.scale.set(0.3,0.3,0.3);
  g.position.y=-0.08;
  skinPreviewScene.add(g);
  skinPreviewChar=g;
  updateCharPreviewColors();
}
function updateCharPreviewColors(){
  if(!skinPreviewChar)return;
  // 方晶沒有舊模型的背包／腳／肩膀零件，改成調整外殼與內核色
  var u=skinPreviewChar.userData||{};
  if(skinCustomColors.body!==undefined){
    if(u.body){u.body.material.color.setHex(skinCustomColors.body);u.body.material.emissive.setHex(skinCustomColors.body);}
    if(u.core)u.core.material.emissive.setHex(skinCustomColors.body);
  }
  if(skinCustomColors.visor!==undefined){
    if(u.visor)u.visor.material.color.setHex(skinCustomColors.visor);
    if(u.coreEdge)u.coreEdge.material.color.setHex(skinCustomColors.visor);
    if(u.halo)u.halo.material.color.setHex(skinCustomColors.visor);
    if(u.edge)u.edge.material.color.setHex(skinCustomColors.visor);
  }
  if(skinCustomColors.backpack!==undefined&&u.core)u.core.material.color.setHex(skinCustomColors.backpack);
  if(skinCustomColors.feet!==undefined&&u.core)u.core.material.color.lerp(new THREE.Color(skinCustomColors.feet),0.35);
  if(skinCustomColors.shoulders!==undefined&&u.core)u.core.material.emissiveIntensity=0.5;
}

function renderSkinPartPicker(){
  var p=document.getElementById('skin-part-picker');p.innerHTML='';
  if(skinMode==='gun'){
    var parts=['dark','metal','wood','scope'];
    for(var i=0;i<parts.length;i++){
      var btn=document.createElement('button');btn.className='skin-part-btn'+(parts[i]===skinSelectedPart?' active':'');btn.textContent=skinPartNames[parts[i]];
      btn.onclick=function(pp){return function(){skinSelectedPart=pp;renderSkinPartPicker();renderSkinColorGrid();};}(parts[i]);
      p.appendChild(btn);
    }
  }else{
    var cparts=['body','feet','shoulders'];
    for(var i=0;i<cparts.length;i++){
      var btn=document.createElement('button');btn.className='skin-part-btn'+(cparts[i]===skinSelectedPart?' active':'');btn.textContent=skinCharParts[cparts[i]];
      btn.onclick=function(pp){return function(){skinSelectedPart=pp;renderSkinPartPicker();renderSkinColorGrid();};}(cparts[i]);
      p.appendChild(btn);
    }
  }
}
function renderSkinColorGrid(){
  var g=document.getElementById('skin-color-grid');g.innerHTML='';
  for(var i=0;i<presetColors.length;i++){
    var sw=document.createElement('div');sw.className='skin-color-swatch';
    var c=presetColors[i];sw.style.background='#'+c.toString(16).padStart(6,'0');
    if(isColorLocked(c))sw.classList.add('locked');
    if(c===skinCustomColors[skinSelectedPart])sw.classList.add('active');
    sw.onclick=function(col){return function(){
      if(isColorLocked(col)){
        showUnlockDialog(col);
        return;
      }
      skinCustomColors[skinSelectedPart]=col;
      renderSkinColorGrid();
      updateSkinPreviewColors();
    };}(c);
    g.appendChild(sw);
  }
}
var _pendingUnlockColor=null;
function showUnlockDialog(col){
  _pendingUnlockColor=col;
  document.getElementById('unlock-dialog').style.display='flex';
}
document.getElementById('unlock-confirm').onclick=function(){
  if(_pendingUnlockColor===null)return;
  if((seasonPoints||0)<5){document.getElementById('unlock-dialog').style.display='none';_pendingUnlockColor=null;return;}
  seasonPoints-=5;
  try{localStorage.setItem('oc_sp',seasonPoints);}catch(e){}
  document.getElementById('menu-sp-val').textContent=seasonPoints;
  document.getElementById('ssp-display').textContent='SP '+seasonPoints;
  unlockedColors.add(_pendingUnlockColor);
  try{localStorage.setItem('oc_unlocked_colors',JSON.stringify(Array.from(unlockedColors)));}catch(e){}
  document.getElementById('unlock-dialog').style.display='none';
  skinCustomColors[skinSelectedPart]=_pendingUnlockColor;
  renderSkinColorGrid();
  updateSkinPreviewColors();
  _pendingUnlockColor=null;
};
document.getElementById('unlock-cancel').onclick=function(){document.getElementById('unlock-dialog').style.display='none';_pendingUnlockColor=null;};
document.getElementById('unlock-bg').onclick=function(){document.getElementById('unlock-dialog').style.display='none';_pendingUnlockColor=null;};
function openSkinPanel(){
  document.getElementById('skin-overlay').style.display='flex';document.getElementById('menu').style.display='none';
  initSkinPreview();
  var wrap=document.getElementById('skin-preview-wrap');
  if(skinPreviewRen)skinPreviewRen.setSize(wrap.clientWidth,wrap.clientHeight);
  if(skinMode==='gun'){
    document.getElementById('skin-gun-tabs').style.display='flex';document.getElementById('skin-list').style.display='flex';
    var tabs=document.getElementById('skin-gun-tabs');var list=document.getElementById('skin-list');
    tabs.innerHTML='';list.innerHTML='';
    var guns=['ak47','deagle','awp','shotgun','smg'];var gunNames={ak47:'AK-47',deagle:'沙鷹',awp:'AWP',shotgun:'霰彈槍',smg:'MP7'};
    for(var i=0;i<guns.length;i++){var g=guns[i];if(!gunSkins[g])continue;var tab=document.createElement('button');
      tab.className='skin-gun-tab'+(g===skinSelectedGun?' active':'');tab.textContent=gunNames[g];
      tab.onclick=function(gg){return function(){skinSelectedGun=gg;openSkinPanel();};}(g);tabs.appendChild(tab);}
    var cur=getEquippedSkin(skinSelectedGun);
    if(cur&&gunSkins[skinSelectedGun]){
      for(var si=0;si<gunSkins[skinSelectedGun].length;si++){
        var sk=gunSkins[skinSelectedGun][si];
        if(sk.id===cur){skinCustomColors={};for(var k in sk.colors)skinCustomColors[k]=sk.colors[k];break;}
      }
    }else{skinCustomColors={dark:0x222222,metal:0x666666,wood:0x8B5E3C,scope:0x111111};}
    try{var custom=JSON.parse(localStorage.getItem('oc_custom_'+skinSelectedGun));if(custom)for(var k in custom)if(custom[k]!==undefined)skinCustomColors[k]=custom[k];}catch(e){}
    renderSkinPartPicker();renderSkinColorGrid();
    setTimeout(function(){buildSkinPreviewGun();},50);
    renderSkinList();
  }else{
    document.getElementById('skin-gun-tabs').style.display='none';document.getElementById('skin-list').style.display='none';
    skinSelectedPart='body';
    try{var cs=JSON.parse(localStorage.getItem('oc_char_skin'));if(cs)skinCustomColors=cs;else skinCustomColors=JSON.parse(JSON.stringify(skinCharDefault));}catch(e){skinCustomColors=JSON.parse(JSON.stringify(skinCharDefault));}
    renderSkinPartPicker();renderSkinColorGrid();
    setTimeout(function(){buildSkinPreviewChar();},50);
  }
}
function renderSkinList(){
  var list=document.getElementById('skin-list');list.innerHTML='';
  var skins=gunSkins[skinSelectedGun];if(!skins)return;
  var current=getEquippedSkin(skinSelectedGun);
  for(var i=0;i<skins.length;i++){var s=skins[i];
    var card=document.createElement('div');card.className='skin-card'+(s.id===current?' active':'');
    var swatch=document.createElement('div');swatch.className='skin-card-swatch';
    var gradParts=[];var cols=s.colors;
    if(cols.dark!==undefined)gradParts.push('#'+cols.dark.toString(16).padStart(6,'0'));
    if(cols.metal!==undefined)gradParts.push('#'+cols.metal.toString(16).padStart(6,'0'));
    if(cols.wood!==undefined)gradParts.push('#'+cols.wood.toString(16).padStart(6,'0'));
    if(cols.scope!==undefined)gradParts.push('#'+cols.scope.toString(16).padStart(6,'0'));
    if(gradParts.length>0)swatch.style.background='linear-gradient(135deg,'+gradParts.join(',')+')';else swatch.style.background='#444';
    var name=document.createElement('div');name.className='skin-card-name';name.textContent=s.name;
    var label=document.createElement('label');
    var locked=s.locked&&getProfLevel(skinSelectedGun)<20;
    if(locked){card.style.opacity='0.25';card.style.cursor='default';label.textContent='🔒 Lv.20 解鎖';}else{label.textContent=s.id==='default'?'已裝備':'點擊裝備';}
    card.appendChild(swatch);card.appendChild(name);card.appendChild(label);
    if(!locked)card.onclick=function(skinId){return function(){
      setSkin(skinSelectedGun,skinId);
      // Also update custom colors from selected skin
      for(var si=0;si<gunSkins[skinSelectedGun].length;si++){
        var sk=gunSkins[skinSelectedGun][si];
        if(sk.id===skinId){skinCustomColors={};for(var k in sk.colors)skinCustomColors[k]=sk.colors[k];break;}
      }
      renderSkinPartPicker();renderSkinColorGrid();updateSkinPreviewColors();
      renderSkinList();
    };}(s.id);
    list.appendChild(card);
  }
}
document.getElementById('skin-btn').onclick=function(){skinMode='gun';openSkinPanel();};
document.getElementById('gun-btn').onclick=function(){openGunPanel();};
function openGunPanel(){document.getElementById('gun-overlay').style.display='flex';document.getElementById('menu').style.display='none';var canvas=document.getElementById('gun-canvas');var wrap=document.getElementById('gun-preview');if(!window.gunPreviewRen){window.gunPreviewRen=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true});window.gunPreviewRen.setPixelRatio(Math.min(devicePixelRatio,2));window.gunPreviewRen.toneMapping=THREE.ACESFilmicToneMapping;window.gunPreviewRen.toneMappingExposure=1.2;window.gunPreviewRotY=0;window.gunPreviewRotX=0;window.gunPreviewDrag=false;window.gunPreviewLastX=0;window.gunPreviewLastY=0;wrap.addEventListener('mousedown',function(e){window.gunPreviewDrag=true;window.gunPreviewLastX=e.clientX;window.gunPreviewLastY=e.clientY;});window.addEventListener('mousemove',function(e){if(!window.gunPreviewDrag)return;var dx=e.clientX-window.gunPreviewLastX,dy=e.clientY-window.gunPreviewLastY;window.gunPreviewRotY+=dx*0.01;window.gunPreviewRotX+=dy*0.01;window.gunPreviewRotX=Math.max(-1,Math.min(1,window.gunPreviewRotX));window.gunPreviewLastX=e.clientX;window.gunPreviewLastY=e.clientY;});window.addEventListener('mouseup',function(){window.gunPreviewDrag=false;});wrap.addEventListener('touchstart',function(e){var t=e.touches[0];window.gunPreviewDrag=true;window.gunPreviewLastX=t.clientX;window.gunPreviewLastY=t.clientY;},{passive:true});wrap.addEventListener('touchmove',function(e){if(!window.gunPreviewDrag||!e.touches.length)return;var t=e.touches[0];var dx=t.clientX-window.gunPreviewLastX,dy=t.clientY-window.gunPreviewLastY;window.gunPreviewRotY+=dx*0.01;window.gunPreviewRotX+=dy*0.01;window.gunPreviewRotX=Math.max(-1,Math.min(1,window.gunPreviewRotX));window.gunPreviewLastX=t.clientX;window.gunPreviewLastY=t.clientY;},{passive:true});wrap.addEventListener('touchend',function(){window.gunPreviewDrag=false;},{passive:true});(function gunAnim(){if(window.gunPreviewRen&&window.gunPreviewScene&&window.gunPreviewCam){var obj=window.gunPreviewGun;if(obj&&!window.gunPreviewDrag)window.gunPreviewRotY+=0.008;if(obj){obj.rotation.y=window.gunPreviewRotY;obj.rotation.x=window.gunPreviewRotX;}window.gunPreviewRen.render(window.gunPreviewScene,window.gunPreviewCam);}requestAnimationFrame(gunAnim);})();}window.gunPreviewRen.setSize(wrap.clientWidth,wrap.clientHeight);if(!window.gunPreviewScene){window.gunPreviewScene=new THREE.Scene();window.gunPreviewCam=new THREE.PerspectiveCamera(25,wrap.clientWidth/wrap.clientHeight,0.1,10);window.gunPreviewCam.position.set(0,0.04,0.7);var al=new THREE.AmbientLight(0x8888ff,0.3);window.gunPreviewScene.add(al);var dl=new THREE.DirectionalLight(0xffeedd,1.5);dl.position.set(1.5,2.5,1);window.gunPreviewScene.add(dl);var dl2=new THREE.DirectionalLight(0x8888ff,0.6);dl2.position.set(-1,1.5,-1);window.gunPreviewScene.add(dl2);var rim=new THREE.DirectionalLight(0x4488ff,0.8);rim.position.set(-0.5,0,-1);window.gunPreviewScene.add(rim);var ringGeo=new THREE.RingGeometry(0.12,0.2,32);var ringMat=new THREE.MeshBasicMaterial({color:0x8844aa,transparent:true,opacity:0.15,side:THREE.DoubleSide});var ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=-0.08;window.gunPreviewScene.add(ring);}window.gunPreviewGun=null;renderGunList();renderGunPreview();}
function renderGunList(){var list=document.getElementById('gun-left-list');list.innerHTML='';document.getElementById('gun-own-count').textContent=ownedGuns.length;for(var i=0;i<ownedGuns.length;i++){var g=ownedGuns[i];var gd=gunData[g];if(!gd)continue;var item=document.createElement('div');item.className='gun-item'+(g===gunSelectedGun?' active':'');item.textContent=gd.name;var attachInfo=getAttachments(g);if(attachInfo.length>0){var sub=document.createElement('span');sub.className='gi-attach';sub.textContent='+'+attachInfo.length+'配件';item.appendChild(sub);}item.onclick=function(gg){return function(){gunSelectedGun=gg;renderGunList();renderGunPreview();};}(g);list.appendChild(item);}}
function renderGunPreview(){if(!window.gunPreviewRen||!window.gunPreviewScene)return;if(window.gunPreviewGun){window.gunPreviewScene.remove(window.gunPreviewGun);window.gunPreviewGun=null;}var orig=window.getSkinColors;window.getSkinColors=function(type){return type===gunSelectedGun?skinCustomColors:(orig?orig(type):{dark:0x222222,metal:0x666666,wood:0x8B5E3C,scope:0x111111});};var g=createGunModel(gunSelectedGun);window.getSkinColors=orig;if(g){window.gunPreviewScene.add(g);window.gunPreviewGun=g;}renderGunAttachments();}
function renderGunAttachments(){var a=getAttachments(gunSelectedGun);var slots={muzzle:'muzzle',sight:'sight',mag:'mag'};var slotNames={muzzle:'槍口',sight:'瞄具',mag:'彈匣'};for(var sk in slots){var slotEl=document.getElementById('gun-slot-'+sk);var type=slots[sk];slotEl.innerHTML='';var avail=[];for(var id in attachData){if(attachData[id].type===type)avail.push(id);}for(var i=0;i<avail.length;i++){var id=avail[i];var d=attachData[id];var btn=document.createElement('button');btn.className='gun-a-btn'+(a.indexOf(id)!==-1?' equipped':'');btn.innerHTML='<div>'+d.name+'</div>';var priceSpan=document.createElement('span');priceSpan.className='gab-price';priceSpan.textContent='$'+d.price;btn.appendChild(priceSpan);btn.onclick=function(aid,aprice){return function(){var aa=getAttachments(gunSelectedGun);var idx=aa.indexOf(aid);if(idx!==-1){aa.splice(idx,1);setAttachments(gunSelectedGun,aa);}else{if(aa.length>=3)return;if(specialCoins<aprice){alert('特種幣不足！需要 $'+aprice+'，持有 $'+specialCoins);return;}var sameType=null;for(var k=0;k<aa.length;k++){if(attachData[aa[k]].type===attachData[aid].type){sameType=k;break;}}if(sameType!==null)aa.splice(sameType,1);specialCoins-=aprice;updateCoinsDisplay();aa.push(aid);setAttachments(gunSelectedGun,aa);}renderGunPreview();renderGunList();};}(id,d.price);slotEl.appendChild(btn);}if(avail.length===0){var empty=document.createElement('div');empty.className='gun-a-btn';empty.textContent='無可用';empty.style.cursor='default';slotEl.appendChild(empty);}}var buyAllBtn=document.getElementById('gun-buy-all');var toBuy=[];var curAttach=getAttachments(gunSelectedGun);for(var id in attachData){var ct=attachData[id].type;var alreadyHas=false;for(var j=0;j<curAttach.length;j++){if(attachData[curAttach[j]].type===ct){alreadyHas=true;break;}}if(!alreadyHas){toBuy.push(id);}}if(toBuy.length>0){buyAllBtn.style.display='block';buyAllBtn.disabled=false;var totalCost=0;for(var i=0;i<toBuy.length;i++)totalCost+=attachData[toBuy[i]].price;buyAllBtn.textContent='一 鍵 購 買  $'+totalCost;buyAllBtn.onclick=function(){if(specialCoins<totalCost){alert('特種幣不足！需要 $'+totalCost+'，持有 $'+specialCoins);return;}specialCoins-=totalCost;updateCoinsDisplay();var na=getAttachments(gunSelectedGun);for(var i=0;i<toBuy.length;i++){if(na.indexOf(toBuy[i])===-1)na.push(toBuy[i]);}setAttachments(gunSelectedGun,na);renderGunPreview();renderGunList();renderGunAttachments();};}else{buyAllBtn.style.display='block';buyAllBtn.disabled=false;buyAllBtn.style.background='linear-gradient(135deg,#4f4,#4fa)';var isEquipped=playerLoadout[selectedArmorySlot]===gunSelectedGun;buyAllBtn.textContent=isEquipped?'已 裝 備':'裝 備 至 插 槽 '+(selectedArmorySlot+1);buyAllBtn.onclick=function(){if(playerLoadout[selectedArmorySlot]===gunSelectedGun){playerLoadout[selectedArmorySlot]=null;}else{playerLoadout[selectedArmorySlot]=gunSelectedGun;}if(currentSlot===selectedArmorySlot)switchToSlot(selectedArmorySlot);document.querySelectorAll('.loadout-slot').forEach(function(s,i){s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';});updateArmoryUI();buyAllBtn.textContent=playerLoadout[selectedArmorySlot]===gunSelectedGun?'已 裝 備':'裝 備 至 插 槽 '+(selectedArmorySlot+1);};}}
document.getElementById('gun-close').onclick=function(){document.getElementById('gun-overlay').style.display='none';document.getElementById('menu').style.display='flex';document.querySelectorAll('.loadout-slot').forEach(function(s,i){s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';});};
document.getElementById('gun-bg').onclick=function(){document.getElementById('gun-overlay').style.display='none';document.getElementById('menu').style.display='flex';document.querySelectorAll('.loadout-slot').forEach(function(s,i){s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';});};
document.getElementById('charskin-btn').onclick=function(){skinMode='char';openSkinPanel();};
document.getElementById('prof-btn').onclick=function(){openProficiencyPanel();};
document.getElementById('skill-btn').onclick=function(){
  document.getElementById('menu').style.display='none';
  var el=document.getElementById('skill-tree-class');var html='';
  if(playerClass){var cData=null;for(var i=0;i<classData.length;i++){if(classData[i].id===playerClass){cData=classData[i];break;}}if(cData)html='<div style="font-size:13px;color:rgba(255,255,255,.4);letter-spacing:1px;margin-bottom:4px">目前職業</div><div style="font-size:22px">'+cData.icon+'</div><div style="font-size:18px;font-weight:bold;color:#4f4;letter-spacing:2px;margin:4px 0">'+cData.name+'</div><div style="font-size:12px;color:rgba(255,255,255,.5)">'+cData.passive+'</div>';}else{html='<div style="font-size:16px;color:rgba(255,255,255,.3);letter-spacing:2px">尚未選擇職業</div><div style="font-size:12px;color:rgba(255,255,255,.2);margin-top:4px">請先開始遊戲以選擇職業</div>';}
  html+='<div style="margin-top:10px;font-size:14px;color:#ffdd44">⭐ 技能點: '+skillPoints+'</div>';
  el.innerHTML=html;
  // Perks display
  var pkEl=document.getElementById('skill-tree-perks');pkEl.innerHTML='';
  if(playerClass){var cData2=null;for(var i=0;i<classData.length;i++){if(classData[i].id===playerClass){cData2=classData[i];break;}}if(cData2){cData2.perks.forEach(function(pid){var pl=classPerkLabels[pid]||pid;var parts=pl.split(' ');var pIcon=parts[0]||'';var pName=parts.slice(1).join(' ')||pid;var pDesc=perkPool.filter(function(p){return p.id===pid;})[0];var active=playerPerks.indexOf(pid)>=0;var d=document.createElement('div');d.className='st-perk'+(active?' st-active':'');d.innerHTML='<div class="st-p-icon">'+pIcon+'</div><div class="st-p-name">'+pName+'</div><div class="st-p-desc">'+(pDesc?pDesc.desc:'')+'</div>';pkEl.appendChild(d);});}}
  // Skill tree upgrades
  var treeContainer=document.getElementById('skill-tree-perks');
  if(playerClass&&skillTreeData[playerClass]){
    var treeDiv=document.createElement('div');treeDiv.style.cssText='width:100%;margin-top:12px';
    treeDiv.innerHTML='<div style="font-size:13px;color:rgba(255,255,255,.4);letter-spacing:1px;margin-bottom:8px;text-align:center">── 升級天賦 ──</div>';
    var upgrades=skillTreeData[playerClass];
    var playerUpgrades=skillTreeUpgrades[playerClass]||[];
    for(var ti=0;ti<upgrades.length;ti++){
      var tier=upgrades[ti];
      var tierDiv=document.createElement('div');tierDiv.style.cssText='margin-bottom:10px';
      tierDiv.innerHTML='<div style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:4px">第 '+tier.tier+' 層 (消耗 '+tier.skills[0].cost+' 點)</div>';
      var skillRow=document.createElement('div');skillRow.style.cssText='display:flex;gap:8px;justify-content:center';
      for(var si=0;si<tier.skills.length;si++){
        var skill=tier.skills[si];
        var unlocked=playerUpgrades.indexOf(skill.id)>=0;
        var canAfford=skillPoints>=skill.cost;
        var tierUnlocked=ti===0||playerUpgrades.indexOf(upgrades[ti-1].skills[0].id)>=0||playerUpgrades.indexOf(upgrades[ti-1].skills[1].id)>=0;
        var btn=document.createElement('div');
        btn.className='st-perk'+(unlocked?' st-active':'');
        btn.style.cssText='flex:1;cursor:pointer;min-width:120px;'+(!unlocked&&!canAfford||!tierUnlocked?'opacity:0.4;':'');
        btn.innerHTML='<div class="st-p-icon">'+skill.icon+'</div><div class="st-p-name">'+skill.name+'</div><div class="st-p-desc">'+skill.desc+'</div><div style="font-size:10px;color:'+(unlocked?'#4f4':canAfford?'#fa4':'#f44')+';margin-top:3px">'+(unlocked?'✓ 已解鎖':skill.cost+' 點')+'</div>';
        if(!unlocked&&canAfford&&tierUnlocked){
          (function(s,cost){
            btn.onclick=function(){
              if(skillPoints<cost)return;
              skillPoints-=cost;
              if(!skillTreeUpgrades[playerClass])skillTreeUpgrades[playerClass]=[];
              skillTreeUpgrades[playerClass].push(s.id);
              s.apply();saveSkillTree();
              document.getElementById('skill-btn').onclick();
            };
          })(skill,skill.cost);
        }
        skillRow.appendChild(btn);
      }
      tierDiv.appendChild(skillRow);
      treeDiv.appendChild(tierDiv);
    }
    treeContainer.appendChild(treeDiv);
  }
  document.getElementById('skill-tree-overlay').style.display='flex';
};
document.getElementById('skill-tree-close').onclick=function(){document.getElementById('skill-tree-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('skill-tree-bg').onclick=function(){document.getElementById('skill-tree-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
var petShopData=[
  {id:'mech_dog',name:'機械犬',icon:'🐕',desc:'自動拾取半徑 6m 內的補給品',price:5000,color:0x888888},
  {id:'ghost_orb',name:'幽靈球',icon:'👻',desc:'標記半徑 15m 內的隱藏敵人',price:8000,color:0x4488ff},
  {id:'healer_bee',name:'治療蜂',icon:'🐝',desc:'每 3 秒自動回復 2 HP',price:12000,color:0xffcc00},
  {id:'guardian',name:'守護盾',icon:'🛡',desc:'15% 機率格擋傷害',price:15000,color:0x44aaff},
  {id:'scavenger',name:'拾荒機器人',icon:'🤖',desc:'自動拾取彈藥',price:6000,color:0x888866},
  {id:'mini_dragon',name:'迷你龍',icon:'🐉',desc:'自動攻擊附近敵人（每次 5 傷）',price:20000,color:0xff4400}
  ,
  {id:'cat',name:'貓',icon:'🐱',desc:'近戰撲咬（每次 4 傷）',price:4000,color:0xffaa66,atk:{d:4,cd:1.6,r:4,s:'melee',c:0xffaa66}},
  {id:'dog',name:'狗',icon:'🐶',desc:'近戰撲咬（每次 5 傷）',price:5000,color:0xcc8844,atk:{d:5,cd:1.5,r:4.5,s:'melee',c:0xdc9a55}},
  {id:'fox',name:'狐狸',icon:'🦊',desc:'近戰撕咬（每次 5 傷）',price:6000,color:0xff7722,atk:{d:5,cd:1.5,r:4.5,s:'melee',c:0xff8a33}},
  {id:'tiger',name:'老虎',icon:'🐯',desc:'猛撲攻擊（每次 9 傷）',price:14000,color:0xffaa00,atk:{d:9,cd:2.0,r:4.5,s:'melee',c:0xffbb22}},
  {id:'lion',name:'獅子',icon:'🦁',desc:'猛撲攻擊（每次 9 傷）',price:14000,color:0xffcc44,atk:{d:9,cd:2.0,r:4.5,s:'melee',c:0xffd466}},
  {id:'monkey',name:'猴子',icon:'🐵',desc:'快速抓擊（每次 5 傷）',price:5000,color:0xcc9966,atk:{d:5,cd:1.3,r:4,s:'melee',c:0xd9a877}},
  {id:'deer',name:'鹿',icon:'🦌',desc:'衝撞攻擊（每次 5 傷）',price:6000,color:0xbb8844,atk:{d:5,cd:1.6,r:5,s:'melee',c:0xcc9955}},
  {id:'hog',name:'野豬',icon:'🐗',desc:'狂暴衝撞（每次 8 傷）',price:10000,color:0x996644,atk:{d:8,cd:1.9,r:4,s:'melee',c:0xaa7755}},
  {id:'pig',name:'豬',icon:'🐷',desc:'憨撞攻擊（每次 6 傷）',price:6000,color:0xffbbcc,atk:{d:6,cd:1.7,r:4,s:'melee',c:0xffc3d4}},
  {id:'cow',name:'牛',icon:'🐮',desc:'頂撞攻擊（每次 7 傷）',price:8000,color:0xcc4444,atk:{d:7,cd:1.8,r:4.5,s:'melee',c:0xdd5555}},
  {id:'giraffe',name:'長頸鹿',icon:'🦒',desc:'遠距吐擊（每次 6 傷）',price:9000,color:0xffcc66,atk:{d:6,cd:1.6,r:7,s:'ranged',c:0xffd477,ps:14}},
  {id:'elephant',name:'大象',icon:'🐘',desc:'重踏攻擊（每次 12 傷）',price:15000,color:0x8899aa,atk:{d:12,cd:2.6,r:5,s:'melee',c:0x99aabb}},
  {id:'polar',name:'北極熊',icon:'🐻',desc:'巨掌猛擊（每次 10 傷）',price:14000,color:0xaaddff,atk:{d:10,cd:2.2,r:4.5,s:'melee',c:0xbbeeff}},
  {id:'panda',name:'熊貓',icon:'🐼',desc:'熊掌攻擊（每次 7 傷）',price:8000,color:0xffffff,atk:{d:7,cd:1.8,r:4.5,s:'melee',c:0xf2f2f2}},
  {id:'koala',name:'無尾熊',icon:'🐨',desc:'抓抓攻擊（每次 6 傷）',price:6000,color:0xaaaaaa,atk:{d:6,cd:1.7,r:4,s:'melee',c:0xbbbbbb}},
  {id:'bunny',name:'兔子',icon:'🐰',desc:'遠距踢擊（每次 4 傷）',price:4000,color:0xffffff,atk:{d:4,cd:1.2,r:6,s:'ranged',c:0xffffff,ps:16}},
  {id:'chick',name:'小雞',icon:'🐤',desc:'啄擊彈（每次 4 傷）',price:4000,color:0xffdd44,atk:{d:4,cd:1.3,r:6,s:'ranged',c:0xffe055,ps:15}},
  {id:'penguin',name:'企鵝',icon:'🐧',desc:'投擲攻擊（每次 5 傷）',price:6000,color:0x88ccff,atk:{d:5,cd:1.5,r:6,s:'ranged',c:0x99ddff,ps:15}},
  {id:'parrot',name:'鸚鵡',icon:'🦜',desc:'俯衝攻擊（每次 5 傷）',price:6000,color:0xff4444,atk:{d:5,cd:1.4,r:7,s:'ranged',c:0xff5555,ps:17}},
  {id:'fish',name:'魚',icon:'🐟',desc:'水彈攻擊（每次 5 傷）',price:6000,color:0x44ccff,atk:{d:5,cd:1.4,r:6,s:'ranged',c:0x55ddff,ps:15}},
  {id:'crab',name:'螃蟹',icon:'🦀',desc:'鉗擊攻擊（每次 6 傷）',price:6000,color:0xff6644,atk:{d:6,cd:1.6,r:3.5,s:'melee',c:0xff7755}},
  {id:'bee',name:'蜜蜂',icon:'🐝',desc:'高速螫針（每次 3 傷）',price:5000,color:0xffcc00,atk:{d:3,cd:1.0,r:6,s:'ranged',c:0xffdd11,ps:18}},
  {id:'caterpillar',name:'毛毛蟲',icon:'🐛',desc:'吐絲彈（每次 4 傷）',price:4000,color:0x88dd44,atk:{d:4,cd:1.4,r:5,s:'ranged',c:0x99ee55,ps:13}},
  {id:'beaver',name:'河狸',icon:'🦫',desc:'啃咬攻擊（每次 7 傷）',price:8000,color:0xaa7744,atk:{d:7,cd:1.8,r:4.5,s:'melee',c:0xbb8855}}
];
var ocPetAtk={},ocPetName={};petShopData.forEach(function(p){ocPetName[p.id]=p.name;if(p.atk)ocPetAtk[p.id]=p.atk;});
var petInventory=[];try{var pi=JSON.parse(localStorage.getItem('oc_pets'));if(pi)petInventory=pi;}catch(e){}
var equippedPet=null;try{var ep=localStorage.getItem('oc_pet_equip');if(ep)equippedPet=ep;}catch(e){}
function savePetInv(){try{localStorage.setItem('oc_pets',JSON.stringify(petInventory));}catch(e){}}
function savePetEquip(){if(equippedPet)try{localStorage.setItem('oc_pet_equip',equippedPet);}catch(e){}else try{localStorage.removeItem('oc_pet_equip');}catch(e){}}
document.getElementById('pet-btn').onclick=function(){
  document.getElementById('menu').style.display='none';
  var coins=0;try{coins=parseInt(localStorage.getItem('oc_coin'))||0;}catch(e){}
  document.getElementById('pet-shop-coins').textContent='🪙 持有特種幣：$'+coins;
  var list=document.getElementById('pet-list');list.innerHTML='';
  petShopData.forEach(function(p){
    var owned=petInventory.indexOf(p.id)>=0;
    var isEquip=equippedPet===p.id;
    var card=document.createElement('div');card.className='pet-card'+(isEquip?' equipped':'');
    card.innerHTML='<div class="pet-card-icon">'+p.icon+'</div><div class="pet-card-info"><div class="pet-card-name">'+p.name+'</div><div class="pet-card-desc">'+p.desc+'</div></div><div class="pet-card-price">$'+p.price+'</div>';
    var btn=document.createElement('button');
    if(owned&&isEquip){btn.className='pet-card-btn own';btn.textContent='✓ 使用中';btn.disabled=true;}
    else if(owned){btn.className='pet-card-btn own';btn.textContent='裝備';btn.onclick=function(){equippedPet=p.id;savePetEquip();if(window.updateMenuPet)window.updateMenuPet();document.getElementById('pet-btn').onclick();};}
    else{var canBuy=coins>=p.price;btn.className='pet-card-btn buy';btn.textContent=canBuy?'購買':'$不足';btn.disabled=!canBuy;
      if(canBuy)btn.onclick=function(){if(!confirm('花費 $'+p.price+' 購買 '+p.name+'？'))return;coins-=p.price;try{localStorage.setItem('oc_coin',String(coins));}catch(e){}petInventory.push(p.id);savePetInv();document.getElementById('pet-btn').onclick();};}
    card.appendChild(btn);list.appendChild(card);
  });
  document.getElementById('pet-shop').style.display='flex';
};
document.getElementById('pet-shop-close').onclick=function(){document.getElementById('pet-shop').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('pet-shop-bg').onclick=function(){document.getElementById('pet-shop').style.display='none';document.getElementById('menu').style.display='flex';};
var dailyRewards=[
  {day:1,rewards:[{type:'coin',amt:500}]},
  {day:2,rewards:[{type:'coin',amt:800}]},
  {day:3,rewards:[{type:'coin',amt:1000},{type:'sp',amt:50}]},
  {day:4,rewards:[{type:'coin',amt:1500}]},
  {day:5,rewards:[{type:'coin',amt:2000},{type:'sp',amt:100}]},
  {day:6,rewards:[{type:'coin',amt:2500}]},
  {day:7,rewards:[{type:'coin',amt:5000},{type:'sp',amt:200},{type:'pet_random',amt:1}]}
];
var rewardLabels={coin:'$',sp:'⚡ SP',pet_random:'🎁 隨機寵物'};
function getDailyData(){var d={last:'',streak:0};try{var r=JSON.parse(localStorage.getItem('oc_daily'));if(r&&r.last)d=r;}catch(e){}return d;}
function saveDailyData(d){try{localStorage.setItem('oc_daily',JSON.stringify(d));}catch(e){}}
function getDateStr(){var t=new Date();return t.getFullYear()+'-'+(t.getMonth()+1).toString().padStart(2,'0')+'-'+t.getDate().toString().padStart(2,'0');}
function openDailyLogin(){
  document.getElementById('menu').style.display='none';
  var dd=getDailyData();var today=getDateStr();
  var claimedToday=dd.last===today;var streak=claimedToday?dd.streak:0;
  var dayIdx=(streak%7)||7;var canClaim=!claimedToday;
  document.getElementById('daily-login-streak').textContent='連續登入 '+(claimedToday?streak:(dd.last===today.substr(0,10)+'-'?'?':streak))+' 天';
  var grid=document.getElementById('daily-login-grid');grid.innerHTML='';
  for(var di=0;di<7;di++){
    var rw=dailyRewards[di];var el=document.createElement('div');el.className='dl-day';
    var st='locked';if(di<dayIdx-1||(claimedToday&&di<dayIdx))st='done';else if(di===dayIdx-1&&canClaim)st='current';else if(di===dayIdx-1&&claimedToday)st='done';
    el.className='dl-day dl-'+st;
    var html='<div class="dl-day-num">第'+(di+1)+'天</div>';
    rw.rewards.forEach(function(r){var lbl=rewardLabels[r.type]||'';html+='<div class="dl-day-reward'+(r.type==='sp'||r.type==='pet_random'?' sub':'')+'">'+lbl+ (r.type==='pet_random'?'':r.amt)+'</div>';});
    el.innerHTML=html;grid.appendChild(el);
  }
  var claimBtn=document.getElementById('daily-login-claim');claimBtn.style.display=canClaim?'inline-block':'none';
  claimBtn.className=canClaim?'dl-claim-yes':'dl-claim-no';
  claimBtn.textContent=canClaim?'🎁 領取第 '+(dayIdx)+' 天獎勵':'✅ 今日已領取';
  claimBtn.onclick=function(){
    if(!canClaim)return;
    var dd2=getDailyData();var today2=getDateStr();
    if(dd2.last===today2)return;
    var newStreak=1;if(dd2.last){var lastD=new Date(dd2.last);var now=new Date(today2);var diff=Math.round((now-lastD)/86400000);if(diff===1)newStreak=dd2.streak+1;else newStreak=1;}
    if(newStreak>7)newStreak=1;
    var idx=newStreak-1;var rw2=dailyRewards[idx];
    rw2.rewards.forEach(function(r){
      if(r.type==='coin'){var c=parseInt(localStorage.getItem('oc_coin'))||0;c+=r.amt;try{localStorage.setItem('oc_coin',String(c));}catch(e){}}
      else if(r.type==='sp'){var s=parseInt(localStorage.getItem('oc_sp'))||0;s+=r.amt;try{localStorage.setItem('oc_sp',String(s));}catch(e){}}
      else if(r.type==='pet_random'&&petShopData.length>0){
        var owned=[];try{owned=JSON.parse(localStorage.getItem('oc_pets'))||[];}catch(e){}
        var avail=petShopData.filter(function(p){return owned.indexOf(p.id)<0;});
        if(avail.length>0){var pick=avail[Math.floor(Math.random()*avail.length)];owned.push(pick.id);try{localStorage.setItem('oc_pets',JSON.stringify(owned));}catch(e){}petInventory=owned;alert('🎁 獲得寵物：'+pick.name+'！');}
        else{var c2=parseInt(localStorage.getItem('oc_coin'))||0;c2+=3000;try{localStorage.setItem('oc_coin',String(c2));}catch(e){}alert('🎁 已擁有全部寵物，獲得 $3,000 補償！');}
      }
    });
    saveDailyData({last:today2,streak:newStreak});
    alert('🎉 領取成功！連續登入 '+newStreak+' 天');
    openDailyLogin();
  };
  document.getElementById('daily-login-overlay').style.display='flex';
}
document.getElementById('daily-login-btn').onclick=openDailyLogin;
document.getElementById('daily-login-close').onclick=function(){document.getElementById('daily-login-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('daily-login-bg').onclick=function(){document.getElementById('daily-login-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('range-btn').onclick=function(){
  if(currentTeamId){window.showTeamBlockTip();return;}
  rangeMode=true;currentMap='range';rangeScore=0;rangeShots=0;rangeHits=0;rangeTime=0;
  document.getElementById('menu').style.display='none';
  document.getElementById('range-hud').style.display='block';
  document.getElementById('range-exit').style.display='block';
  gameStarted=false;countdown=3;roundNum=0;
  playerHP=100;playerArmor=0;
  for(var i=0;i<enemies.length;i++){enemies[i].hp=0;enemies[i].mesh.visible=false;if(enemies[i].hBar)enemies[i].hBar.visible=false;if(enemies[i].aBar)enemies[i].aBar.visible=false;}
  for(var i=0;i<mapBoxes.length;i++){if(mapBoxes[i]&&mapBoxes[i].mesh&&!mapBoxes[i].isRange)mapBoxes[i].mesh.visible=false;}
  scene.background=new THREE.Color(0x2a3a4a);scene.fog=new THREE.Fog(0x2a3a4a,20,40);
  amb.color.setHex(0x8899aa);amb.intensity=0.5;dir.color.setHex(0xffffff);dir.intensity=1.5;
    buildRangeScene();pos.set(0,0.8,1.5);vel.set(0,0,0);yaw=0;pitch=0;
  cam.position.copy(pos);cam.rotation.set(0,0,0);
  onGround=true;locked=false;
  if(localStorage.getItem('oc_ui_mode')==='mobile'){locked=true;document.getElementById('mobile-controls').style.display='block';document.getElementById('mobile-slots').style.display='flex';}
  if(window.playerClass)playerClass=null;
  document.body.requestPointerLock().catch(function(){});
};
document.getElementById('range-exit').onclick=function(){
  if(document.pointerLockElement)document.exitPointerLock();
  rangeMode=false;gameStarted=false;currentMap='base';
  document.getElementById('range-hud').style.display='none';
  document.getElementById('range-exit').style.display='none';
  document.getElementById('menu').style.display='flex';
  clearRangeScene();
  for(var i=0;i<mapBoxes.length;i++){if(mapBoxes[i]&&mapBoxes[i].mesh)mapBoxes[i].mesh.visible=true;}
  scene.background=null;scene.fog=null;
  amb.color.setHex(0x556070);amb.intensity=0.6;dir.color.setHex(0xffeedd);dir.intensity=1.2;
  applyMapSettings();pos.set(-10,0.8,-10);vel.set(0,0,0);cam.position.copy(pos);
};
document.getElementById('prof-close').onclick=function(){document.getElementById('prof-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('prof-bg').onclick=function(){document.getElementById('prof-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('skin-bg').onclick=function(){document.getElementById('skin-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
function saveSkinCustomColors(){
  if(skinMode==='char'){try{localStorage.setItem('oc_char_skin',JSON.stringify(skinCustomColors));}catch(e){}}
  else if(skinMode==='gun'){try{localStorage.setItem('oc_custom_'+skinSelectedGun,JSON.stringify(skinCustomColors));}catch(e){}}
}
document.getElementById('skin-close').onclick=function(){
  document.getElementById('skin-overlay').style.display='none';document.getElementById('menu').style.display='flex';
  saveSkinCustomColors();
};
document.getElementById('skin-bg').onclick=function(){
  document.getElementById('skin-overlay').style.display='none';document.getElementById('menu').style.display='flex';
  saveSkinCustomColors();
};
var eventEndDate=(function(){try{var d=localStorage.getItem('oc_event_end');if(d)return new Date(d);}catch(e){}var nd=new Date(Date.now()+30*86400000);try{localStorage.setItem('oc_event_end',nd.toISOString());}catch(e){}return nd;})();
var seasonPoints=parseInt(localStorage.getItem('oc_sp'))||0;
function getDateKey(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function getWeekKey(){var d=new Date();var day=d.getDay();var diff=d.getDate()-day+(day===0?-6:1);var mon=new Date(d.getFullYear(),d.getMonth(),diff);return mon.getFullYear()+'-'+(mon.getMonth()+1)+'-'+mon.getDate();}
function seedRand(seedStr){var s=0;for(var i=0;i<seedStr.length;i++)s=(s*31+seedStr.charCodeAt(i))%2147483647;return function(){s=(s*1103515245+12345)%2147483647;return s/2147483647;};}
function pickQuests(pool,seedStr,count,coinR,spR){var r=seedRand(seedStr);var p=pool.slice();var q=[];for(var i=0;i<count&&p.length>0;i++){var idx=Math.floor(r()*p.length);var t=p.splice(idx,1)[0];var target=t[1]+Math.floor(r()*(t[2]-t[1]+1));var coins=coinR[0]+Math.floor(r()*(coinR[1]-coinR[0]));var sp=spR[0]+Math.floor(r()*(spR[1]-spR[0]));q.push({type:t[0],target:target,prog:0,coins:coins,sp:sp});}return q;}
var dailyPool=[['kill',8,20],['kill_sniper',2,5],['slide_kill',2,6],['headshot',3,8],['pistol_rounds',1,3],['round',2,4]];
var weeklyPool=[['kill',40,80],['kill_sniper',8,15],['slide_kill',6,12],['headshot',10,20],['pistol_rounds',3,6],['round',8,15]];
// ── Dragonboat event system ──
var dragonboatEndDate=eventEndDate;
var questProgress={kill:0,round:0};
var questTargets={kill:20,round:3};
var questRewards={kill:5000,round:10000};
var questClaimed={kill:false,round:false};
var questDate='';
(function(){
  try{var qd=JSON.parse(localStorage.getItem('oc_event'));if(qd){
    questProgress=qd.p||questProgress;questClaimed=qd.c||questClaimed;
    questDate=qd.d||'';var today=getDateKey();
    if(questDate!==today){questProgress={kill:0,round:0};questClaimed={kill:false,round:false};questDate=today;}
    questTargets=qd.t||questTargets;questRewards=qd.r||questRewards;
  }else{questDate=getDateKey();}}catch(e){}
})();
function saveDragonboatProgress(){
  try{localStorage.setItem('oc_event',JSON.stringify({p:questProgress,c:questClaimed,d:questDate,t:questTargets,r:questRewards}));}catch(e){}
}
function updateDragonboatUI(){
  var cdEl=document.getElementById('event-countdown');
  var qsEl=document.getElementById('event-quests');
  var diff=Math.max(0,eventEndDate-Date.now());var days=Math.floor(diff/86400000);var hrs=Math.floor((diff%86400000)/3600000);var mins=Math.floor((diff%3600000)/60000);
  cdEl.innerHTML='活動倒數：<span>'+days+'天 '+hrs+'小時 '+mins+'分</span><br><small style="color:rgba(255,255,255,.3);font-size:11px">每日任務每天刷新</small>';
  var q1Desc=document.querySelector('.event-quest:nth-child(1) .event-quest-desc');
  if(q1Desc)q1Desc.textContent='擊殺 '+questTargets.kill+' 名敵人（每日刷新）';
  var q2Desc=document.querySelector('.event-quest:nth-child(2) .event-quest-desc');
  if(q2Desc)q2Desc.textContent='累積完成 '+questTargets.round+' 波（每日刷新）';
  var q1Rew=document.querySelector('.event-quest:nth-child(1) .event-quest-reward');
  if(q1Rew)q1Rew.textContent='+$'+questRewards.kill.toLocaleString();
  var q2Rew=document.querySelector('.event-quest:nth-child(2) .event-quest-reward');
  if(q2Rew)q2Rew.textContent='+$'+questRewards.round.toLocaleString();
  var q1Fill=document.getElementById('quest1-fill');
  if(q1Fill){var pct=Math.min(100,questProgress.kill/questTargets.kill*100);q1Fill.style.width=pct+'%';q1Fill.className='event-quest-progress-fill '+(questProgress.kill>=questTargets.kill?'done':'pending');}
  var q1Icon=document.querySelector('.event-quest:nth-child(1) .event-quest-icon');
  if(q1Icon){q1Icon.className='event-quest-icon '+(questClaimed.kill?'done':(questProgress.kill>=questTargets.kill?'done':'pending'));if(questClaimed.kill)q1Icon.textContent='✓';}
  var q1Btn=document.querySelector('.event-quest:nth-child(1) .event-claim-btn');
  if(q1Btn)q1Btn.style.display=(questProgress.kill>=questTargets.kill&&!questClaimed.kill)?'block':'none';
  var q2Fill=document.getElementById('quest2-fill');
  if(q2Fill){var pct=Math.min(100,questProgress.round/questTargets.round*100);q2Fill.style.width=pct+'%';q2Fill.className='event-quest-progress-fill '+(questProgress.round>=questTargets.round?'done':'pending');}
  var q2Icon=document.querySelector('.event-quest:nth-child(2) .event-quest-icon');
  if(q2Icon){q2Icon.className='event-quest-icon '+(questClaimed.round?'done':(questProgress.round>=questTargets.round?'done':'pending'));if(questClaimed.round)q2Icon.textContent='✓';}
  var q2Btn=document.querySelector('.event-quest:nth-child(2) .event-claim-btn');
  if(q2Btn)q2Btn.style.display=(questProgress.round>=questTargets.round&&!questClaimed.round)?'block':'none';
}
document.getElementById('event-btn').onclick=function(){document.getElementById('menu').style.display='none';document.getElementById('event-overlay').style.display='flex';updateDragonboatUI();};
document.getElementById('event-close').onclick=function(){document.getElementById('event-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('event-bg').onclick=function(){document.getElementById('event-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.querySelectorAll('.event-claim-btn').forEach(function(btn){
  btn.onclick=function(){
    var q=this.dataset.quest;
    if(!questClaimed[q]&&questProgress[q]>=questTargets[q]){
      questClaimed[q]=true;earnCoins(questRewards[q]);
      showDmgNum(new THREE.Vector3(0,1.5,0),questRewards[q],'#fa4');
      saveDragonboatProgress();updateDragonboatUI();
    }
  };
});
// ── Season quest system ──
var seasonDefs={kill:{label:'擊殺敵人',icon:'💀',desc:'擊殺 %n 名敵人'},kill_sniper:{label:'擊殺狙擊兵',icon:'🎯',desc:'擊殺 %n 名狙擊兵'},slide_kill:{label:'滑壘擊殺',icon:'💨',desc:'滑壘擊殺 %n 名敵人'},headshot:{label:'爆頭擊殺',icon:'💥',desc:'爆頭 %n 次'},pistol_rounds:{label:'手槍波',icon:'🔫',desc:'用手槍完成 %n 個波'},round:{label:'完成波',icon:'🏁',desc:'累積完成 %n 個波'}};
var seasonProgress={kill:0,kill_sniper:0,slide_kill:0,headshot:0,pistol_rounds:0,round:0};
var seasonDaily=[],seasonWeekly=[],seasonClaimedDaily=[],seasonClaimedWeekly=[];
var seasonDate='',seasonWeek='';
var questTab='daily';
(function(){
  try{var qd=JSON.parse(localStorage.getItem('oc_season'));if(qd){
    seasonProgress=qd.p||seasonProgress;seasonClaimedDaily=qd.cd||[];seasonClaimedWeekly=qd.cw||[];
    var today=getDateKey(),thisWeek=getWeekKey();
    seasonDate=qd.d||'';seasonWeek=qd.w||'';
    if(seasonDate!==today){seasonDaily=pickQuests(dailyPool,today+'d',3,[3000,8000],[5,15]);seasonDate=today;for(var i=0;i<seasonDaily.length;i++)seasonClaimedDaily[i]=false;}else seasonDaily=qd.dq||[];
    if(seasonWeek!==thisWeek){seasonWeekly=pickQuests(weeklyPool,thisWeek+'w',3,[15000,35000],[20,40]);seasonWeek=thisWeek;for(var i=0;i<seasonWeekly.length;i++)seasonClaimedWeekly[i]=false;}else seasonWeekly=qd.wq||[];
  }else{var today=getDateKey(),thisWeek=getWeekKey();seasonDate=today;seasonWeek=thisWeek;
    seasonDaily=pickQuests(dailyPool,today+'d',3,[3000,8000],[5,15]);seasonWeekly=pickQuests(weeklyPool,thisWeek+'w',3,[15000,35000],[20,40]);
  }}catch(e){}
  if(seasonDaily.length===0)seasonDaily=pickQuests(dailyPool,getDateKey()+'d',3,[3000,8000],[5,15]);
  if(seasonWeekly.length===0)seasonWeekly=pickQuests(weeklyPool,getWeekKey()+'w',3,[15000,35000],[20,40]);
})();
function saveSeasonProgress(){
  try{localStorage.setItem('oc_season',JSON.stringify({p:seasonProgress,cd:seasonClaimedDaily,cw:seasonClaimedWeekly,d:seasonDate,w:seasonWeek,dq:seasonDaily,wq:seasonWeekly}));}catch(e){}
  try{localStorage.setItem('oc_sp',String(seasonPoints));}catch(e){}
}
function renderSeasonQuests(){
  var qs=document.getElementById('season-quests');var tab=document.getElementById('stab-'+(questTab==='daily'?'daily':'weekly'));
  if(tab){document.querySelectorAll('.seasontab').forEach(function(t){t.classList.remove('active');});tab.classList.add('active');}
  var list=questTab==='daily'?seasonDaily:seasonWeekly;
  var claimed=questTab==='daily'?seasonClaimedDaily:seasonClaimedWeekly;
  var html='';
  for(var i=0;i<list.length;i++){
    var q=list[i];var d=seasonDefs[q.type];var pct=Math.min(100,seasonProgress[q.type]/q.target*100);
    var done=seasonProgress[q.type]>=q.target;var clm=claimed[i];
    html+='<div class="event-quest"><div class="event-quest-icon '+(clm?'done':(done?'done':'pending'))+'">'+(clm?'✓':d.icon)+'</div><div class="event-quest-info"><div class="event-quest-title">'+d.label+'</div><div class="event-quest-desc">'+d.desc.replace('%n',q.target)+'</div><div class="event-quest-progress"><div class="event-quest-progress-fill '+(done?'done':'pending')+'" style="width:'+pct+'%"></div></div></div><div class="event-quest-rewards"><div class="eqr-coin">+$'+q.coins.toLocaleString()+'</div><div class="eqr-sp">+'+q.sp+' SP</div></div><button class="sclaim-btn" data-sidx="'+i+'" data-stab="'+questTab+'" style="display:'+(done&&!clm?'block':'none')+'">領取</button></div>';
  }
  qs.innerHTML=html;
}
function updateSeasonUI(){
  var cdEl=document.getElementById('season-countdown');
  var diff=Math.max(0,eventEndDate-Date.now());var days=Math.floor(diff/86400000);var hrs=Math.floor((diff%86400000)/3600000);
  cdEl.innerHTML='賽季倒數：<span>'+days+'天 '+hrs+'小時</span><br><small style="color:rgba(255,255,255,.3);font-size:11px">每日任務每天刷新 &bull; 每週重置</small>';
  renderSeasonQuests();updateSeasonPointsDisplay();
}
function updateSeasonPointsDisplay(){var el=document.getElementById('ssp-display');if(el)el.textContent='SP '+seasonPoints.toLocaleString();var mel=document.getElementById('menu-sp-val');if(mel)mel.textContent=seasonPoints.toLocaleString();}
document.getElementById('season-btn').onclick=function(){document.getElementById('menu').style.display='none';document.getElementById('season-overlay').style.display='flex';updateSeasonUI();};
document.getElementById('season-close').onclick=function(){document.getElementById('season-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('season-bg').onclick=function(){document.getElementById('season-overlay').style.display='none';document.getElementById('menu').style.display='flex';};
document.getElementById('stab-daily').onclick=function(){questTab='daily';renderSeasonQuests();};
document.getElementById('stab-weekly').onclick=function(){questTab='weekly';renderSeasonQuests();};
document.addEventListener('click',function(e){
  var btn=e.target.closest('.sclaim-btn');if(!btn)return;
  var idx=parseInt(btn.dataset.sidx);var tab=btn.dataset.stab;
  var list=tab==='daily'?seasonDaily:seasonWeekly;
  var claimed=tab==='daily'?seasonClaimedDaily:seasonClaimedWeekly;
  if(idx>=0&&idx<list.length&&!claimed[idx]&&seasonProgress[list[idx].type]>=list[idx].target){
    claimed[idx]=true;var q=list[idx];
    earnCoins(q.coins);seasonPoints+=q.sp;
    showDmgNum(new THREE.Vector3(0,1.5,0),q.coins,'#fa4');saveSeasonProgress();updateSeasonUI();
  }
});
var prevSeasonRound=roundNum;
window._seasonInt=setInterval(function(){
  if(roundNum>prevSeasonRound&&!isMultiplayer){seasonProgress.round++;questProgress.round++;prevSeasonRound=roundNum;saveSeasonProgress();saveDragonboatProgress();}
  if(roundNum<prevSeasonRound)prevSeasonRound=roundNum;
},2000);
// ── Perk system ──
var perkPool=[
  {id:'dmg',name:'火力強化',icon:'🔥',desc:'傷害 +25%'},
  {id:'reload',name:'快手裝填',icon:'⚡',desc:'換彈速度 x2'},
  {id:'pen',name:'穿甲彈',icon:'🔩',desc:'子彈穿透 +1'},
  {id:'hs_heal',name:'爆頭回血',icon:'💚',desc:'爆頭回復 10 HP'},
  {id:'speed',name:'輕量化',icon:'💨',desc:'移動速度 +20%'},
  {id:'armor',name:'鋼板',icon:'🛡',desc:'護甲 +50'},
  {id:'lifesteal',name:'吸血',icon:'🩸',desc:'擊殺回 10 HP'},
  {id:'spread',name:'精準射擊',icon:'🎯',desc:'擴散 -40%'},
];
var playerPerks=[];
function showPerkSelection(){
  var pool=perkPool.slice();var chosen=[];
  for(var i=0;i<3&&pool.length>0;i++){var idx=Math.floor(Math.random()*pool.length);chosen.push(pool.splice(idx,1)[0]);}
  var html='';
  for(var i=0;i<chosen.length;i++){
    var p=chosen[i];
    html+='<div class="perk-card" data-perk="'+p.id+'"><div class="perk-card-icon">'+p.icon+'</div><div class="perk-card-name">'+p.name+'</div><div class="perk-card-desc">'+p.desc+'<div class="mm-indicator" style="display:none;font-size:12px;color:#4af;letter-spacing:2px;align-items:center;gap:6px;margin-left:10px"><span class="mm-spinner" style="display:inline-block;animation:mmSpin 1s linear infinite">⟳</span><span>匹配中 <span class="mm-time">0</span>s</span></div></div></div>';
  }
  document.getElementById('perk-cards').innerHTML=html;
  document.getElementById('perk-overlay').style.display='flex';
  document.querySelectorAll('.perk-card').forEach(function(card){
    card.onclick=function(){
      var id=this.dataset.perk;
      playerPerks.push(id);
      applyPerk(id);
      var pName=this.querySelector('.perk-card-name').textContent;
      document.getElementById('perk-overlay').style.display='none';
      var ntf=document.createElement('div');ntf.textContent='✅ '+pName;ntf.style.cssText='position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);color:#4f4;font-size:28px;font-weight:bold;z-index:45;font-family:Arial;text-shadow:0 0 20px rgba(50,255,50,.8);pointer-events:none;transition:all 1s ease-out;opacity:1';document.body.appendChild(ntf);requestAnimationFrame(function(){ntf.style.transform='translate(-50%,-70px)';ntf.style.opacity='0';});setTimeout(function(){ntf.remove();},1100);
      startNextRound();
    };
  });
}
function applyPerk(id){
  if(id==='dmg'){Object.keys(gunData).forEach(function(g){if(gunData[g].dmg>0)gunData[g].dmg=Math.round(gunData[g].dmg*1.25);});}
  else if(id==='reload'){window.reloadSpeedMult=0.5;}
  else if(id==='pen'){window.bulletPen=2;}
  else if(id==='hs_heal'){window.hsHeal=true;}
  else if(id==='speed'){SPEED*=1.2;}
  else if(id==='armor'){playerArmor=Math.min(150,playerArmor+50);}
  else if(id==='lifesteal'){window.lifesteal=true;}
  else if(id==='spread'){Object.keys(gunData).forEach(function(g){gunData[g].spread*=0.6;});}
}
var pendingPerk=false;
function startNextRound(){
  pendingPerk=false;
  document.getElementById('round-clear').style.display='none';
  document.getElementById('round-num').style.display='none';
  roundNum++;
  if(!achDone('round30')&&roundNum>=30)awardAch('round30');
  if(window.waveArmor)playerArmor=Math.min(150,playerArmor+50);
  if(currentGun==='deagle'){seasonProgress.pistol_rounds++;saveSeasonProgress();}
  earnCoins(10000);roundEarnings+=10000;
  showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10000,'#fa4');
  var targetCount=Math.min(2+Math.floor(roundNum*0.8),maxEnemies);
  for(var ei=0;ei<maxEnemies;ei++){
    var e=enemies[ei];
    if(ei<targetCount){
      e.hp=e.maxHp*(1+roundNum*0.15);e.armor=e.maxArmor*(1+roundNum*0.1);
      e.knifeHits=0;e.burnTimer=0;randomizeEnemyType(e);
      var stT=(e.type==='sniper')?ocPickSniperTower(ei):null;
      var sp=stT?stT.pos.clone():getRandomSpawnPos(true,pos,8);
      e.pos.copy(sp);e.mesh.position.copy(sp);
      e.towerPerch=stT?sp.clone():null;e.aiTarget=null;e.vel.set(0,0,0);e.desiredVel.set(0,0,0);
if(currentMap==='basemap3'){e.towerPerch=null;if(e.type==='sniper'||ei%3===0){e.pos.set(3+Math.random()*8,36,3+Math.random()*8);e.mesh.position.copy(e.pos);e.roofTop=true;e.climbL=null;}else{e.pos.y=0;e.mesh.position.y=e.pos.y;e.roofTop=false;e.climbL=null;}if(e.hBar)e.hBar.position.copy(e.pos);if(e.aBar)e.aBar.position.copy(e.pos);if(e.hBar)e.hBar.position.y+=CUBELING_BAR;if(e.aBar)e.aBar.position.y+=CUBELING_BAR-0.07;}
e.mesh.visible=true;
      if(e.hBar&&currentMap!=='basemap3'){e.hBar.visible=true;e.hBar.position.copy(sp);e.hBar.position.y+=CUBELING_BAR;}
      if(e.aBar&&currentMap!=='basemap3'){e.aBar.visible=true;e.aBar.position.copy(sp);e.aBar.position.y+=CUBELING_BAR-0.07;}
    }else{e.hp=0;e.mesh.visible=false;if(e.hBar)e.hBar.visible=false;if(e.aBar)e.aBar.visible=false;}
  }
}
// ── Rank system ──
var rankRanks=['青銅','白銀','黃金','大師','超凡入聖'];
var rankSubs=[2,3,4,5,6];
var rankStage=0,rankGames=0,rankStreak=0,rankBestStreak=0,rankMatchKills=0,rankMatchDeaths=0,rankMatchShots=0,rankMatchHits=0;
(function(){
  try{
    var rd=JSON.parse(localStorage.getItem('oc_rank'));
    if(rd){rankStage=rd.s||0;rankGames=rd.g||0;rankStreak=rd.st||0;rankBestStreak=rd.bs||0;}
  }catch(e){}
})();
function saveRank(){try{localStorage.setItem('oc_rank',JSON.stringify({s:rankStage,g:rankGames,st:rankStreak,bs:rankBestStreak}));}catch(e){}}
function getRankInfo(stage){
  var s=0;
  for(var r=0;r<rankRanks.length;r++){
    for(var sb=0;sb<rankSubs[r];sb++){
      if(s===stage)return {name:rankRanks[r],sub:sb+1,rankIdx:r,subIdx:sb,total:rankSubs[r]};
      s++;
    }
  }
  return {name:'超凡入聖',sub:6,rankIdx:4,subIdx:5,total:6};
}
function updateRankUI(){
  var info=getRankInfo(rankStage);
  var badge=document.getElementById('rank-badge');
  if(badge){
    var colors=['#c6f','#4af','#fa4','#f44','#ff0'];
    badge.textContent=info.name+' '+numChinese(info.sub)+'階';
    badge.style.color=colors[info.rankIdx]||'#fff';
  }
  var fill=document.getElementById('rank-progress-fill');
  if(fill)fill.style.width=(info.subIdx/info.total*100)+'%';
  var gamesEl=document.getElementById('rank-games');
  if(gamesEl)gamesEl.textContent=rankGames;
  var streakEl=document.getElementById('rank-streak');
  if(streakEl)streakEl.textContent=rankBestStreak;
}
function numChinese(n){return['零','一','二','三','四','五','六','七','八','九','十'][n]||n;}
function rankAddStage(delta){
  var oldInfo=getRankInfo(rankStage);
  rankStage=Math.max(0,Math.min(19,rankStage+delta));
  var newInfo=getRankInfo(rankStage);
  if(delta>0){
    earnCoins(10000);
    showDmgNum(new THREE.Vector3(0,1.5,0),10000,'#c6f');
  }
  if(newInfo.rankIdx>oldInfo.rankIdx){
    showDmgNum(new THREE.Vector3(0,2.5,0),0,'#c6f');
    var badge=document.getElementById('rank-badge');
    if(badge){badge.style.animation='none';setTimeout(function(){badge.style.animation='rankPulse 1s ease-in-out 3';},10);}
  }
  saveRank();updateRankUI();
}
function rankEvaluateMatch(outcome){
  if(!isMultiplayer&&outcome===0)return; // only eval in MP
  var logic=rankEvalLogic(rankMatchKills,rankMatchDeaths,rankMatchShots,rankMatchHits);
  rankGames++;
  if(outcome<0){
    // Early quit = penalty
    rankStreak=0;
    rankAddStage(-1);
  }else if(logic>0){
    // Good performance
    rankStreak++;
    if(rankStreak>rankBestStreak)rankBestStreak=rankStreak;
    rankAddStage(1);
  }else if(logic<0){
    // Bad performance
    rankStreak=0;
    rankAddStage(-1);
  }else{
    // Neutral - no change
  }
  // Reset match stats
  rankMatchKills=0;rankMatchDeaths=0;rankMatchShots=0;rankMatchHits=0;
  saveRank();updateRankUI();
}
document.getElementById('rank-btn').onclick=function(){
  document.getElementById('menu').style.display='none';
  document.getElementById('rank-overlay').style.display='flex';
  updateRankUI();
};
document.getElementById('rank-close').onclick=function(){
  document.getElementById('rank-overlay').style.display='none';
  document.getElementById('menu').style.display='flex';
};
document.getElementById('rank-bg').onclick=function(){
  document.getElementById('rank-overlay').style.display='none';
  document.getElementById('menu').style.display='flex';
};
// Track match stats for logic evaluation
var rankLogicTimers={};
function rankEvalLogic(kills,deaths,shots,hit){
  if(shots===0)return 0; // no data, no change
  var acc=hit/shots;
  if(kills>deaths&&acc>0.15)return 1; // good logic
  if(kills<deaths)return -1; // bad logic
  return 0; // neutral
}
document.querySelectorAll('.a-slot').forEach(function(sl){
  sl.onclick=function(){
    var si=parseInt(sl.dataset.slot);
    if(playerLoadout[si]&&selectedArmorySlot===si&&si>0){
      if(playerLoadout[si]==='grenade'&&grenadeStacks[si]>0){
        var retKey='grenade_'+(grenadeTypes[si]||'frag');
        weaponInventory[retKey]=(weaponInventory[retKey]||0)+grenadeStacks[si];grenadeStacks[si]=0;saveWeaponInventory();
      }else if(playerLoadout[si]!=='grapple'&&weaponInventory[playerLoadout[si]]!==undefined){weaponInventory[playerLoadout[si]]++;saveWeaponInventory();}
      playerLoadout[si]=null;updateArmoryUI();updateArmoryGunCounts();
      document.querySelectorAll('.loadout-slot').forEach(function(s,i){s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';});
    }
    else{selectedArmorySlot=si;updateArmoryUI();}
  };
});
document.querySelectorAll('.a-gun-btn').forEach(function(b){
  b.onclick=function(){
    var gun=b.dataset.gun;
    var cnt=weaponInventory[gun]||0;
    if(cnt<1&&gun!=='grapple')return;
    var isGrenadeType=gun.indexOf('grenade_')===0;
    var gTypeTag=isGrenadeType?gun.slice(8):null; // 'frag','flashbang','smoke','incendiary'
    // Grenade stacking: same type into same slot
    if(isGrenadeType&&playerLoadout[selectedArmorySlot]==='grenade'&&grenadeTypes[selectedArmorySlot]===gTypeTag){
      weaponInventory[gun]--;grenadeStacks[selectedArmorySlot]++;saveWeaponInventory();
      if(currentSlot===selectedArmorySlot)switchToSlot(selectedArmorySlot);
      updateArmoryUI();updateArmoryGunCounts();
      document.querySelectorAll('.loadout-slot').forEach(function(s,i){
        s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';
      });
      return;
    }
    var prevGun=playerLoadout[selectedArmorySlot];
    // Return previous gun to inventory
    if(prevGun&&prevGun!=='grapple'){
      if(prevGun==='grenade'&&grenadeStacks[selectedArmorySlot]>0){
        var prevTypeKey='grenade_'+(grenadeTypes[selectedArmorySlot]||'frag');
        weaponInventory[prevTypeKey]=(weaponInventory[prevTypeKey]||0)+grenadeStacks[selectedArmorySlot];
        grenadeStacks[selectedArmorySlot]=0;
      }else if(weaponInventory[prevGun]!==undefined){
        weaponInventory[prevGun]++;
      }
    }
    // Equip new gun
    if(isGrenadeType){
      playerLoadout[selectedArmorySlot]='grenade';
      grenadeTypes[selectedArmorySlot]=gTypeTag;
      grenadeStacks[selectedArmorySlot]=3;
      weaponInventory[gun]--;saveWeaponInventory();
    }else if(gun!=='grapple'){
      playerLoadout[selectedArmorySlot]=gun;
      weaponInventory[gun]--;saveWeaponInventory();
    }else{
      playerLoadout[selectedArmorySlot]=gun;
    }
    if(currentSlot===selectedArmorySlot)switchToSlot(selectedArmorySlot);
    updateArmoryUI();updateArmoryGunCounts();
    document.querySelectorAll('.loadout-slot').forEach(function(s,i){
      s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';
    });
  };
});
// Per-slot flashlight toggle
document.querySelectorAll('.slot-fl-btn').forEach(function(b){
  b.onclick=function(){
    var si=parseInt(b.dataset.slot);
    if(!playerLoadout[si]||playerLoadout[si]==='knife'||playerLoadout[si]==='grenade')return;
    slotFlashlight[si]=!slotFlashlight[si];
    if(si===currentSlot&&locked&&gameStarted){
      if(slotFlashlight[si])attachFlashlightMesh();else detachFlashlightMesh();
    }
    updateSlotFlashlightUI();
  };
});
// Initial loadout display
document.querySelectorAll('.loadout-slot').forEach(function(s,i){
  s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';
});
updateCoinsDisplay();updateArmoryGunCounts();
switchToSlot(0);
// ── Sky Platform ──
var skyPlat=null,platTimer=0,platActive=true,platRespawnTimer=0;
(function(){
  var pg=new THREE.BoxGeometry(6,0.2,6);
  var pm=new THREE.MeshStandardMaterial({color:0x44aaff,emissive:0x4488ff,emissiveIntensity:0.3,transparent:true,opacity:0.6});
  var pMesh=new THREE.Mesh(pg,pm);
  pMesh.position.set(0,10,0);pMesh.receiveShadow=true;pMesh.castShadow=true;scene.add(pMesh);
  var bg=new THREE.EdgesGeometry(new THREE.BoxGeometry(6.4,0.05,6.4));
  var bm=new THREE.LineBasicMaterial({color:0x88ddff});
  var border=new THREE.LineSegments(bg,bm);
  border.position.set(0,10.1,0);scene.add(border);
  // Pulsing glow plane instead of ring (avoids player collision issues)
  var glowPlane=new THREE.Mesh(new THREE.PlaneGeometry(6.6,6.6),new THREE.MeshBasicMaterial({color:0x88ddff,transparent:true,opacity:0.15,side:THREE.DoubleSide,depthWrite:false}));
  glowPlane.rotation.x=-Math.PI/2;glowPlane.position.set(0,10.05,0);scene.add(glowPlane);
  mapBoxes.push({pos:new THREE.Vector3(0,10,0),size:new THREE.Vector3(6,0.2,6),mesh:pMesh,isPlatform:true,border:border,glow:glowPlane});
  skyPlat=mapBoxes[mapBoxes.length-1];
})();
// ── Grappling Hook ──
var grappleActive=false,grapplePoint=null,grappleLine=null,grappleSpeed=22,grappleShot=null,grappleEnemy=null,grapplePullDmgAccum=0;
function fireGrapple(){
  if(grappleActive){releaseGrapple();return;}
  if(window.ghostInvis)window.ghostInvis=false;
  var rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(0,0),cam);
  var meshes=[];for(var i=0;i<mapBoxes.length;i++){if(mapBoxes[i].mesh.visible!==false)meshes.push(mapBoxes[i].mesh);}
  for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].mesh&&enemies[ei].mesh.visible!==false)enemies[ei].mesh.traverse(function(c){if(c.isMesh)meshes.push(c)});}
  var hits=rc.intersectObjects(meshes);
  if(hits.length>0&&hits[0].distance<25&&hits[0].distance>1){
    var hitMesh=hits[0].object;
    var grabbedEnemy=null;
    for(var ei=0;ei<enemies.length;ei++){
      var e=enemies[ei];
      if(e.mesh.visible===false)continue;
      var found=false;
      e.mesh.traverse(function(c){if(c===hitMesh)found=true;});
      if(found){grabbedEnemy=e;break;}
    }
    if(grabbedEnemy){
      grappleEnemy=grabbedEnemy;
      grappleActive=true;
      hitMarkerTimer=0.2;
      var gHit=document.createElement('div');gHit.textContent='⚡ 勾爪命中';gHit.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-80px);color:#4af;font-size:20px;font-weight:bold;font-family:Arial;pointer-events:none;z-index:7;text-shadow:0 0 15px rgba(68,170,255,.6),0 0 30px rgba(68,170,255,.3);opacity:1;transition:all 0.5s ease-out';document.body.appendChild(gHit);requestAnimationFrame(function(){gHit.style.transform='translate(-50%,-100px)';gHit.style.opacity='0';});setTimeout(function(){gHit.remove();},600);
      grapplePoint=grabbedEnemy.pos.clone();
      grapplePullDmgAccum=0;
      var startPos=(gunGroup&&currentGun==='grapple')?cam.position.clone().add(new THREE.Vector3(0.2,-0.15,-0.35).applyQuaternion(cam.quaternion)):cam.position.clone();
      var gsMat=new THREE.MeshStandardMaterial({color:0xff4444,emissive:0xff2222,emissiveIntensity:2});
      var gsMesh=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),gsMat);
      gsMesh.position.copy(startPos);scene.add(gsMesh);
      grappleShot={mesh:gsMesh,start:startPos,end:grapplePoint.clone(),progress:0};
      if(grappleLine){scene.remove(grappleLine);}
      var lGeo=new THREE.BufferGeometry().setFromPoints([startPos,startPos]);
      grappleLine=new THREE.Line(lGeo,new THREE.LineBasicMaterial({color:0xff4444,linewidth:2}));
      scene.add(grappleLine);
    }else{
      grapplePoint=hits[0].point.clone();
      grappleActive=true;
      var startPos=(gunGroup&&currentGun==='grapple')?cam.position.clone().add(new THREE.Vector3(0.2,-0.15,-0.35).applyQuaternion(cam.quaternion)):cam.position.clone();
      var gsMat=new THREE.MeshStandardMaterial({color:0x88ddff,emissive:0x4488ff,emissiveIntensity:2});
      var gsMesh=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),gsMat);
      gsMesh.position.copy(startPos);scene.add(gsMesh);
      grappleShot={mesh:gsMesh,start:startPos,end:grapplePoint.clone(),progress:0};
      if(grappleLine){scene.remove(grappleLine);}
      var lGeo=new THREE.BufferGeometry().setFromPoints([startPos,startPos]);
      grappleLine=new THREE.Line(lGeo,new THREE.LineBasicMaterial({color:0x88ddff,linewidth:2}));
      scene.add(grappleLine);
    }
  }
}
function releaseGrapple(){
  grappleActive=false;grapplePoint=null;grappleEnemy=null;grapplePullDmgAccum=0;
  if(grappleLine){disposeMesh(grappleLine);grappleLine=null;}
  if(grappleShot){disposeMesh(grappleShot.mesh);grappleShot=null;}
}
// ── Zipline system ──
function tryGrabZipline(){
  if(currentMap!=='dragonboat')return;
  document.getElementById('zipline-prompt').style.opacity='0';
  for(var zi=0;zi<ziplines.length;zi++){
    var z=ziplines[zi];
    var dS=pos.distanceTo(z.start);
    var dE=pos.distanceTo(z.end);
    if(dS<2.5){ziplineActive=true;ziplineData=z;ziplineProgress=0;ziplineDir=1;return;}
    if(dE<2.5){ziplineActive=true;ziplineData=z;ziplineProgress=z.start.distanceTo(z.end);ziplineDir=-1;return;}
  }
}
function releaseZipline(){
  ziplineActive=false;ziplineData=null;ziplineProgress=0;ziplineDir=1;
  onGround=true;
  document.getElementById('zipline-prompt').style.opacity='0';
}
function tryGrabBoat(){
  if(currentMap!=='dragonboat')return false;
  document.getElementById('boat-prompt').style.opacity='0';
  if(pos.distanceTo(new THREE.Vector3(0,0.62,0))<3){
    boatRideActive=true;boatRideTime=0;
    pos.set(0,0.8,0);vel.set(0,0,0);onGround=true;
    document.getElementById('boat-prompt').textContent='按 E 下船';
    document.getElementById('boat-prompt').style.opacity='1';
    return true;
  }
  return false;
}
function releaseBoat(){
  boatRideActive=false;
  pos.set(0,1.2,1.5);vel.set(0,0,0);
  document.getElementById('boat-prompt').style.opacity='0';
  // Reset boat mesh positions
  for(var i=0;i<mapBoxes.length;i++){
    var bx=mapBoxes[i];
    if(bx.isDragonBoat&&bx.mesh){
      bx.mesh.position.copy(bx.pos);
    }
  }
}
function updateBoatRide(dt){
  if(!boatRideActive)return;
  boatRideTime+=dt;
  var driftX=Math.sin(boatRideTime*0.12)*0.5;
  var driftZ=Math.cos(boatRideTime*0.15)*0.3;
  var bobY=Math.sin(boatRideTime*1.5)*0.03;
  var posY=0.75+bobY;
  pos.set(driftX,posY,driftZ);vel.set(0,0,0);onGround=true;
  cam.position.set(pos.x,pos.y+EYE_H,pos.z);
  // Move all dragon boat meshes with the player
  for(var i=0;i<mapBoxes.length;i++){
    var bx=mapBoxes[i];
    if(bx.isDragonBoat&&bx.mesh){
      bx.mesh.position.x=(bx.pos.x||0)+driftX;
      bx.mesh.position.z=(bx.pos.z||0)+driftZ;
      bx.mesh.position.y=(bx.pos.y||0)+bobY;
    }
  }
}
function updateZipline(dt){
  if(!ziplineActive||!ziplineData)return;
  var dir=new THREE.Vector3().copy(ziplineData.end).sub(ziplineData.start);
  var len=dir.length();
  dir.normalize();
  ziplineProgress+=ziplineDir*8*dt;
  if(ziplineProgress>=len||ziplineProgress<=0){releaseZipline();return;}
  var newPos=new THREE.Vector3().copy(ziplineData.start).add(dir.clone().multiplyScalar(ziplineProgress));
  newPos.y+=0.6;
  pos.copy(newPos);vel.set(0,0,0);onGround=false;
  cam.position.set(pos.x,pos.y+EYE_H,pos.z);
}
function updateGrapple(dt){
  if(!grappleActive||!grapplePoint){releaseGrapple();return;}
  if(grappleEnemy&&grappleEnemy.mesh.visible===false){releaseGrapple();return;}
  if(grappleEnemy){
    grapplePoint.copy(grappleEnemy.pos);
    var dir=new THREE.Vector3().copy(pos).sub(grapplePoint);
    var dist=dir.length();
    if(dist<1.2){
      var pd=30;
      grappleEnemy.hp-=pd;
      if(grappleEnemy.hitTimer)grappleEnemy.hitTimer=0.5;
      showDmgNum(grapplePoint,pd,'#ff4444');
      grappleEnemy.pos.x+=dir.x*4;grappleEnemy.pos.z+=dir.z*4;
      grappleEnemy.stunTimer=1.5;
      releaseGrapple();return;
    }
    dir.normalize();
    var pullSpd=15;
    grappleEnemy.pos.x+=dir.x*pullSpd*dt;
    grappleEnemy.pos.z+=dir.z*pullSpd*dt;
    if(grappleEnemy.mesh)grappleEnemy.mesh.position.copy(grappleEnemy.pos);
    if(grappleEnemy.hBar){grappleEnemy.hBar.position.copy(grappleEnemy.pos);grappleEnemy.hBar.position.y+=CUBELING_BAR;}
    if(grappleEnemy.aBar){grappleEnemy.aBar.position.copy(grappleEnemy.pos);grappleEnemy.aBar.position.y+=CUBELING_BAR-0.07;}
    grapplePullDmgAccum+=dt*5;
    if(grapplePullDmgAccum>=1){
      grapplePullDmgAccum-=1;
      grappleEnemy.hp-=5;
      if(grappleEnemy.hitTimer)grappleEnemy.hitTimer=0.2;
    }
  }else{
    var dir=new THREE.Vector3().copy(grapplePoint).sub(pos);
    var dist=dir.length();
    if(dist<0.6){releaseGrapple();return;}
    dir.normalize();
    if(dir.y>=0)dir.y+=0.06;
    dir.normalize();
    var newPos=pos.clone();newPos.x+=dir.x*grappleSpeed*dt;newPos.z+=dir.z*grappleSpeed*dt;newPos.y+=dir.y*grappleSpeed*dt;
    if(newPos.y>25){releaseGrapple();return;}
    pos.copy(newPos);onGround=false;
    for(var gi=0;gi<2;gi++){var gr=resolveCollisions();if(gr.gnd)onGround=true;}
    if(pos.y<0.6){pos.y=0.6;vel.y=0;onGround=true;}
  }
  if(grappleLine&&!grappleShot){
    var start=pos.clone();start.y+=0.5;
    var pts=[start,grapplePoint.clone()];
    grappleLine.geometry.dispose();
    grappleLine.geometry=new THREE.BufferGeometry().setFromPoints(pts);
  }
}
scene.add(cam);
document.getElementById('blocker').style.display='none';
document.getElementById('blocker').onclick=function(){
  if(isDowned)return;
  if(document.getElementById('resume-prompt').style.display==='flex')return;
  document.body.requestPointerLock().catch(function(){});
};
document.getElementById('save-exit-btn').onclick=function(){
  if(rangeMode){document.getElementById('range-exit').click();return;}
  saveGame();location.reload();
};
document.getElementById('back-menu-btn').onclick=function(){
  document.getElementById('mobile-controls').style.display='none';document.getElementById('mobile-slots').style.display='none';
  if(rangeMode){
    document.getElementById('range-exit').click();return;
  }
  var finalRound=roundNum;
  gameStarted=false;isMultiplayer=false;roundNum=1;
  document.getElementById('blocker').style.display='none';
  if(didPlayGame){
    didPlayGame=false;
    addProficiency();
    var xpEarned=10+Math.max(0,(finalRound-1)*2);
    addXP(xpEarned);
    document.getElementById('settlement-xp').textContent='+'+xpEarned;
    var li=getLevelInfo(playerXP);
    document.getElementById('settlement-level').textContent='Lv.'+li.level+' ('+li.current+' / '+li.needed+')';
    document.getElementById('settlement-progress-fill').style.width=(li.current/li.needed*100)+'%';
    if(dailyChallenge){
      dailyChallenge=false;
      dailyRounds=finalRound;
      var todayKey=new Date();todayKey=todayKey.getFullYear()+'-'+(todayKey.getMonth()+1)+'-'+todayKey.getDate();
      var score=dailyRounds*1000+dailyKills;
      var isNew=!dailyBest[todayKey]||score>dailyBest[todayKey].score;
      if(isNew){dailyBest[todayKey]={score:score,rounds:dailyRounds,kills:dailyKills,date:todayKey};try{localStorage.setItem('oc_daily_best',JSON.stringify(dailyBest));}catch(e){}}lbSave('daily',score,dailyRounds,{kills:dailyKills});
      var best=dailyBest[todayKey];
      document.getElementById('settlement-daily').style.display='block';
      document.getElementById('settlement-daily-stats').innerHTML='波數：'+dailyRounds+'<br>擊殺：'+dailyKills+'<br>得分：'+(dailyRounds*1000+dailyKills);
      document.getElementById('settlement-daily-best').textContent=isNew?'🏆 新紀錄！':'最佳：'+best.rounds+' 波 / '+best.kills+' 擊殺（'+best.score+' 分）';
      document.getElementById('settlement-xp-label').textContent='每 日 挑 戰';
    }else{
      document.getElementById('settlement-daily').style.display='none';
      document.getElementById('settlement-xp-label').textContent='經 驗 值';
      if(!isMultiplayer&&!rangeMode&&!bossRushMode){var bestSingle=(function(){try{return JSON.parse(localStorage.getItem('oc_best_single'))||{}}catch(e){return{}}})();if(!bestSingle.rounds||finalRound>bestSingle.rounds){bestSingle={rounds:finalRound,score:finalRound*200+roundEarnings,date:new Date().toISOString().slice(0,10)};try{localStorage.setItem('oc_best_single',JSON.stringify(bestSingle));}catch(e){}}lbSave('single',finalRound*200+roundEarnings,finalRound,{kills:dailyKills||0});}
    }
    document.getElementById('settlement').style.display='flex';
  }else{
    document.getElementById('menu').style.display='flex';
    updateCoinsDisplay();updateArmoryGunCounts();
  }
  currentMap='base';applyMapSettings();
  document.getElementById('nuclear-ui').style.display='none';
  document.getElementById('nuclear-wave').style.display='none';
  document.getElementById('boss-hp-wrap').style.display='none';
  if(ufo&&ufo.mesh){scene.remove(ufo.mesh);disposeMesh(ufo.mesh);ufo=null;ufoActive=false;ufoSpawned=false;}if(ufoBeamMesh){scene.remove(ufoBeamMesh);disposeMesh(ufoBeamMesh);ufoBeamMesh=null;}ufoProjectiles.forEach(function(up){if(up.mesh){scene.remove(up.mesh);disposeMesh(up.mesh);}if(up.trail){scene.remove(up.trail);disposeMesh(up.trail);}});ufoProjectiles=[];bombMode=false;ufoMode=false;
  try{var sv=JSON.parse(localStorage.getItem('ocgame_save'));if(sv&&sv.loadout){for(var si=0;si<sv.loadout.length;si++)playerLoadout[si]=sv.loadout[si];}}catch(e){}
  // 手雷已移除：存檔殘留的 grenade 換成其他武器
  if(!bombMode){for(var _sl=0;_sl<5;_sl++){var _st=playerLoadout[_sl];if(_st&&(_st==='grenade'||_st==='grenade_frag'||_st==='grenade_flashbang'||_st==='grenade_smoke'||_st==='grenade_incendiary')){playerLoadout[_sl]=['ak47','deagle','smg','awp','knife'][_sl]||null;}}}
  grenadeStacks=[0,0,0,0,0];grenadeTypes=['frag','frag','frag','frag','frag'];
  // 還原炸彈模式覆蓋的第一格武器，避免殘留炸彈99卡住切武器
  if(window._savedSlot0!==undefined){playerLoadout[0]=window._savedSlot0;window._savedSlot0=undefined;}
  currentSlot=0;if(playerLoadout[0])try{switchToSlot(0)}catch(e){}
  if(boss&&boss.mesh){disposeMesh(boss.mesh);boss=null;bossActive=false;bossSpawned=false;}
  if(window.radRifleDrop){disposeMesh(window.radRifleDrop.mesh);disposeMesh(window.radRifleDrop.glow);disposeMesh(window.radRifleDrop.light);window.radRifleDrop=null;}
  radiationZones.forEach(function(rz){disposeMesh(rz.mesh);if(rz.light)disposeMesh(rz.light);});radiationZones=[];
  projectiles.forEach(function(rp){disposeMesh(rp.mesh);if(rp.warnMesh)scene.remove(rp.warnMesh);if(rp.light)disposeMesh(rp.light);});projectiles=[];
  smokeParticles.forEach(function(sp){if(sp.light)disposeMesh(sp.light);else disposeMesh(sp);});smokeParticles=[];smokeZoneCenters=[];
  incendiaryZones.forEach(function(iz){disposeMesh(iz.mesh);disposeMesh(iz.mesh2);disposeMesh(iz.light);});incendiaryZones=[];
  if(window.opponentBars){window.opponentBars.forEach(function(b){disposeMesh(b.h);disposeMesh(b.a);});window.opponentBars=[];}
  if(petMesh){scene.remove(petMesh);disposeMesh(petMesh);petMesh=null;}
  enemies.forEach(function(pe){if(pe.mesh.userData&&pe.mesh.userData._ghostGlow){pe.mesh.remove(pe.mesh.userData._ghostGlow);disposeMesh(pe.mesh.userData._ghostGlow);delete pe.mesh.userData._ghostGlow;}});
  if(window.multiSI)clearInterval(window.multiSI);
  if(window.multiWS)try{window.multiWS.close()}catch(e){}
  if(window._teamPingInt)clearInterval(window._teamPingInt);
  if(window._teamStatusInt)clearInterval(window._teamStatusInt);
  if(window.fpTeamInt)clearInterval(window.fpTeamInt);
  if(window._seasonInt)clearInterval(window._seasonInt);
  if(window.wsHB)clearInterval(window.wsHB);
  if(window.multiPInt)clearInterval(window.multiPInt);
  if(window.votePoll)clearInterval(window.votePoll);
  if(window.voteTimer)clearInterval(window.voteTimer);
};
document.getElementById('settlement-btn').onclick=function(){
  document.getElementById('mobile-controls').style.display='none';
  document.getElementById('settlement').style.display='none';
  document.getElementById('settlement-daily').style.display='none';
  if(document.getElementById('multi-end-options').style.display==='flex'){
    // Already showing multi-end-options, just go to menu
    document.getElementById('menu').style.display='flex';
    if(authToken)checkTeamStatus();
    updateCoinsDisplay();updateArmoryGunCounts();
  }else if(window._pendingMultiEnd){
    window._pendingMultiEnd=false;
    document.getElementById('multi-end-options').style.display='flex';
  }else{
    document.getElementById('menu').style.display='flex';
    if(authToken)checkTeamStatus();
    updateCoinsDisplay();updateArmoryGunCounts();
  }
  document.getElementById('session-sp').style.display='none';
  updateLevelDisplay();
  var dbEl=document.getElementById('daily-best');
  var todayKey=new Date();todayKey=todayKey.getFullYear()+'-'+(todayKey.getMonth()+1)+'-'+todayKey.getDate();
  if(dailyBest[todayKey]){dbEl.style.display='block';dbEl.textContent='🔥 今日最佳：'+dailyBest[todayKey].rounds+' 波 / '+dailyBest[todayKey].score+' 分';}
};
document.getElementById('daily-share-btn').onclick=function(){
  var txt='🔥 每日挑戰 '+dailySeed+'\n波數：'+dailyRounds+'　擊殺：'+dailyKills+'　得分：'+(dailyRounds*1000+dailyKills)+'\n來挑戰我的紀錄！';
  navigator.clipboard.writeText(txt).then(function(){var s=document.getElementById('daily-share-btn');s.textContent='✅ 已複製';setTimeout(function(){s.textContent='📋 複製分享';},2000);}).catch(function(){prompt('複製分享文字：',txt);});
};
document.getElementById('resume-yes').onclick=function(){
  document.getElementById('resume-prompt').style.display='none';
  document.getElementById('menu').style.display='none';
  document.getElementById('scanlines').style.display='none';
  document.getElementById('scope-overlay').style.display='none';
  isADS=false;isReloading=false;reloadTimer=0;cam.fov=80;cam.updateProjectionMatrix();
  var sd;try{sd=JSON.parse(localStorage.getItem('ocgame_save'))}catch(e){sd=null}
  if(sd){loadGame(sd);
    // 殭屍老巢不可還原：存檔不含殭屍狀態，直接還原會「跳過選單進殭屍模式」→ 改回基本圖
    if(currentMap==='zombielair'){currentMap='base';applyMapSettings();}
    gameStarted=true;didPlayGame=true;countdown=0;}
  if(localStorage.getItem('oc_ui_mode')==='mobile'){locked=true;document.getElementById('mobile-controls').style.display='block';document.getElementById('blocker').style.display='none';}
  else{document.body.requestPointerLock().catch(function(){});}
};
document.getElementById('resume-no').onclick=function(){
  document.getElementById('resume-prompt').style.display='none';
  localStorage.removeItem('ocgame_save');
};
function applyMapSettings(){
  stopRain();
  // 離開殭屍老巢：清掉殭屍/魔王與 HUD（所有地圖共用，含 base/dragonboat/flooded 等）
  if(currentMap!=='zombielair'){
    try{stopZlMusic();}catch(e){}
    for(var zi=enemies.length-1;zi>=0;zi--){var ze=enemies[zi];if(ze&&ze.isZombie){if(ze.mesh){try{disposeMesh(ze.mesh);}catch(eb){}}if(ze.hBar){try{scene.remove(ze.hBar);}catch(eb){}}if(ze.aBar){try{scene.remove(ze.aBar);}catch(eb){}}if(ze.namePlate){try{scene.remove(ze.namePlate);}catch(eb){}}enemies.splice(zi,1);}}
    if(boss&&boss.isZl){try{if(boss.mesh)disposeMesh(boss.mesh);}catch(eb){}boss=null;bossActive=false;bossSpawned=false;}
    zlState.wave=1;zlState.phase='wave';zlState.collapsed=false;zlState.collapseT=0;
    var zhh=document.getElementById('zl-virus-hud'); if(zhh)zhh.style.display='none';
    var nww=document.getElementById('nuclear-wave'); if(nww)nww.style.display='none';
    var bhh=document.getElementById('boss-hp-wrap'); if(bhh)bhh.style.display='none';
  }
  // Toggle dragon boat elements
  if(dragonBoatElements)dragonBoatElements.forEach(function(b){b.mesh.visible=currentMap==='dragonboat';});
  if(lanternLights)lanternLights.forEach(function(l){l.visible=currentMap==='dragonboat';});
  if(centerStruct)centerStruct.forEach(function(c){c.mesh.visible=currentMap!=='dragonboat'&&currentMap!=='nuclear'&&currentMap!=='arena2'&&currentMap!=='flooded'&&currentMap!=='basemap3'&&currentMap!=='fault'&&currentMap!=='arena3'&&currentMap!=='zombielair';});
  // Toggle nuclear elements
  if(nuclearMapElements)nuclearMapElements.forEach(function(b){b.mesh.visible=currentMap==='nuclear';});
  // Toggle arena2 elements
  if(arena2Elements)arena2Elements.forEach(function(b){b.mesh.visible=currentMap==='arena2';});
  // Toggle fault arena elements
  if(currentMap==='fault'){
    if(!faultElements.length)buildFaultMap();
    faultElements.forEach(function(b){b.mesh.visible=true;b.mesh.castShadow = true;});
    faultLights.forEach(function(l){l.visible=true;});
  }else{
    if(faultLights)faultLights.forEach(function(l){l.visible=false;});
    if(faultElements)faultElements.forEach(function(b){b.mesh.visible=false;});
  }
  // Toggle arena3 (parkour arena) elements
  if(currentMap==='arena3'){
    if(!arena3Elements.length)buildArena3Map();
    arena3Elements.forEach(function(b){b.mesh.visible=true;b.mesh.castShadow=true;});
    arena3Lights.forEach(function(l){l.visible=true;});
  }else{
    if(arena3Lights)arena3Lights.forEach(function(l){l.visible=false;});
    if(arena3Elements)arena3Elements.forEach(function(b){b.mesh.visible=false;});
  }
  // Default-hide BasicMap3 extras; shown again in basemap3 branch below
  if(basic3MapElements.length)basic3MapElements.forEach(function(b){if(b.mesh)b.mesh.visible=false;});
  if(b3Airdrop&&b3Airdrop.light)b3Airdrop.light.visible=false;
  // Hide non-arena2 mapBoxes when arena2 is active
  if(currentMap==='arena2'){
    for(var mxi2=0;mxi2<mapBoxes.length;mxi2++){
      var bx2=mapBoxes[mxi2];
      if(!bx2.isArena2)bx2.mesh.visible=false;
    }
  }
  // Hide all non-nuclear mapBoxes when nuclear is active
  if(currentMap==='nuclear'){
    for(var mxi=0;mxi<mapBoxes.length;mxi++){
      var bx=mapBoxes[mxi];
      if(!bx.isNuclear)bx.mesh.visible=false;
    }
  }
  // Hide all non-fault mapBoxes when fault is active
  if(currentMap==='fault'){
    for(var mxiF=0;mxiF<mapBoxes.length;mxiF++){
      var bxF=mapBoxes[mxiF];
      if(!bxF.isFault)bxF.mesh.visible=false;
    }
  }
  // Hide all non-arena3 mapBoxes when arena3 is active
  if(currentMap==='arena3'){
    for(var mxiA=0;mxiA<mapBoxes.length;mxiA++){
      var bxA=mapBoxes[mxiA];
      if(!bxA.isArena3)bxA.mesh.visible=false;
    }
  }
  // Base map: show all non-special mapBoxes
  if(currentMap!=='arena2'&&currentMap!=='nuclear'&&currentMap!=='dragonboat'&&currentMap!=='flooded'&&currentMap!=='basemap3'&&currentMap!=='fault'&&currentMap!=='arena3'&&currentMap!=='zombielair'){
    for(var mxi3=0;mxi3<mapBoxes.length;mxi3++){
      var bx3=mapBoxes[mxi3];
      if(!bx3.isArena2&&!bx3.isNuclear&&!bx3.isDragonBoat&&!bx3.isBasic3&&!bx3.isFault&&!bx3.isArena3&&!bx3.isZombieLair)bx3.mesh.visible=true;
      else bx3.mesh.visible=false;
    }
    basic3MapElements.forEach(function(b){if(b.mesh)b.mesh.visible=false;});
  }
  // BasicMap3: show only isBasic3 boxes, hide everything else
  if(currentMap==='basemap3'){
    if(!basic3MapElements.length)createBasic3MapElements();
    for(var mxi7=0;mxi7<mapBoxes.length;mxi7++){
      var bx7=mapBoxes[mxi7];
      bx7.mesh.visible=!!bx7.isBasic3;
    }
  }
  // Hide non-dragonBoat mapBoxes when dragonboat is active (walls/floor kept via isPermanent)
  if(currentMap==='dragonboat'){
    for(var mxi5=0;mxi5<mapBoxes.length;mxi5++){
      var bx5=mapBoxes[mxi5];
      if(!bx5.isDragonBoat&&!bx5.isPermanent&&!bx5.isRange)bx5.mesh.visible=false;
    }
  }
  if(currentMap==='dragonboat'){
    var skyCanvas=document.createElement('canvas');skyCanvas.width=2;skyCanvas.height=512;
    var sctx=skyCanvas.getContext('2d');
    var sgrd=sctx.createLinearGradient(0,0,0,512);
    sgrd.addColorStop(0,'#2a0a00');sgrd.addColorStop(0.2,'#4a1a00');sgrd.addColorStop(0.4,'#6a3a10');
    sgrd.addColorStop(0.6,'#8a5a20');sgrd.addColorStop(0.8,'#aa7a30');sgrd.addColorStop(1,'#cc9944');
    sctx.fillStyle=sgrd;sctx.fillRect(0,0,2,512);
    scene.background=new THREE.CanvasTexture(skyCanvas);
    scene.fog=new THREE.Fog(0x8a5a20,20,40);
    amb.color.setHex(0x664422);amb.intensity=0.7;
    dir.color.setHex(0xffcc88);dir.intensity=1.4;
  }else if(currentMap==='rain'){
    scene.background=new THREE.Color(0x0a0a1a);
    scene.fog=new THREE.Fog(0x0a0a1a,8,22);
    amb.color.setHex(0x334466);amb.intensity=0.4;
    dir.color.setHex(0x99aacc);dir.intensity=0.6;
    startRain();
  }else if(currentMap==='fog'){
    scene.background=new THREE.Color(0x1a1a2a);
    scene.fog=new THREE.Fog(0x1a1a2a,3,14);
    amb.color.setHex(0x445577);amb.intensity=0.35;
    dir.color.setHex(0x8899bb);dir.intensity=0.6;
  }else if(currentMap==='nuclear'){
    scene.background=new THREE.Color(0x0a2a0a);
    scene.fog=new THREE.Fog(0x0a2a0a,8,25);
    amb.color.setHex(0x224422);amb.intensity=0.3;
    dir.color.setHex(0x88dd88);dir.intensity=0.5;
  }else if(currentMap==='arena2'){
    scene.background=new THREE.Color(0x2a2a3e);
    scene.fog=new THREE.Fog(0x2a2a3e,40,60);
    amb.color.setHex(0xccccff);amb.intensity=0.7;
    dir.color.setHex(0xffffff);dir.intensity=2.0;
  }else if(currentMap==='fault'){
    isUnderwater=false;stopUnderwaterAmbient();
    document.getElementById('o2-wrap').style.display='none';
    document.getElementById('underwater-overlay').style.display='none';
    scene.background=new THREE.Color(0x12142a);
    scene.fog=new THREE.Fog(0x12142a,90,220);
    amb.color.setHex(0x9fb0ff);amb.intensity=0.55;
    dir.color.setHex(0xffffff);dir.intensity=1.0;
    if(!faultElements.length)buildFaultMap();
  }else if(currentMap==='arena3'){
    isUnderwater=false;stopUnderwaterAmbient();
    document.getElementById('o2-wrap').style.display='none';
    document.getElementById('underwater-overlay').style.display='none';
    scene.background=new THREE.Color(0x14182a);
    scene.fog=new THREE.Fog(0x14182a,80,200);
    amb.color.setHex(0xb0c4ff);amb.intensity=0.6;
    dir.color.setHex(0xffffff);dir.intensity=1.3;
    if(!arena3Elements.length)buildArena3Map();
  }else if(currentMap==='flooded'){
    scene.background=new THREE.Color(0x0a1a2a);
    scene.fog=new THREE.Fog(0x0a1a2a,6,18);
    amb.color.setHex(0x224466);amb.intensity=0.25;
    dir.color.setHex(0x4488bb);dir.intensity=0.3;
    if(!floodedMapElements.length)createFloodedMapElements();
    floodedMapElements.forEach(function(b){b.mesh.visible=true;});
    for(var mxi4=0;mxi4<mapBoxes.length;mxi4++){
      var bx4=mapBoxes[mxi4];
      if(!bx4.isFlooded&&!bx4.isRange)bx4.mesh.visible=false;
    }
    isUnderwater=true;startUnderwaterAmbient();
    document.getElementById('o2-wrap').style.display='flex';
    document.getElementById('underwater-overlay').style.display='block';
  }else if(currentMap==='basemap3'){
    isUnderwater=false;stopUnderwaterAmbient();
    document.getElementById('o2-wrap').style.display='none';
    document.getElementById('underwater-overlay').style.display='none';
    scene.background=new THREE.Color(0x9fd4ff);
    scene.fog=new THREE.Fog(0x9fd4ff,80,200);
    amb.color.setHex(0x8aa7cc);amb.intensity=0.85;
    dir.color.setHex(0xfff0d8);dir.intensity=1.6;
    if(!basic3MapElements.length)createBasic3MapElements();
    basic3MapElements.forEach(function(b){if(b.mesh)b.mesh.visible=true;});
    if(b3Airdrop&&b3Airdrop.light)b3Airdrop.light.visible=true;
  }else if(currentMap==='zombielair'){
    isUnderwater=false;stopUnderwaterAmbient();
    document.getElementById('o2-wrap').style.display='none';
    document.getElementById('underwater-overlay').style.display='none';
    scene.background=new THREE.Color(0x142814);
    scene.fog=new THREE.Fog(0x1c291c,30,60);
    amb.color.setHex(0x223322);amb.intensity=0.55;
    dir.color.setHex(0xd6ffbe);dir.intensity=0.95;    if(!zlMapElements.length)createZombieLairMap();
    for(var mxiZ=0;mxiZ<mapBoxes.length;mxiZ++){var bxZ=mapBoxes[mxiZ];bxZ.mesh.visible=!!bxZ.isZombieLair;}
    document.getElementById('zl-virus-hud').style.display='none';
    for(var seZ=0;seZ<enemies.length;seZ++){var eZ=enemies[seZ];if(!eZ||eZ.isZombie)continue;eZ.hp=0;eZ.mesh.visible=false;if(eZ.hBar)eZ.hBar.visible=false;if(eZ.aBar)eZ.aBar.visible=false;}
  }else{
    isUnderwater=false;stopUnderwaterAmbient();
    document.getElementById('o2-wrap').style.display='none';
    document.getElementById('underwater-overlay').style.display='none';
    document.getElementById('nuclear-wave').style.display='none';
    document.getElementById('boss-hp-wrap').style.display='none';
    airBubbles.forEach(function(b){try{disposeMesh(b.mesh);}catch(eb){}});airBubbles=[];
    harpoonProjectiles.forEach(function(h){try{scene.remove(h.mesh);}catch(eh){}});harpoonProjectiles=[];
    oxyVents.forEach(function(v){if(v.base)try{scene.remove(v.base);}catch(e){}if(v.glow)try{scene.remove(v.glow);}catch(e){}});oxyVents=[];
    var skyCanvas=document.createElement('canvas');skyCanvas.width=2;skyCanvas.height=512;
    var sctx=skyCanvas.getContext('2d');
    var sgrd=sctx.createLinearGradient(0,0,0,512);
    sgrd.addColorStop(0,'#1a1a3e');sgrd.addColorStop(0.2,'#2a4a6a');sgrd.addColorStop(0.4,'#3a6a9a');
    sgrd.addColorStop(0.6,'#5a8aba');sgrd.addColorStop(0.8,'#8abadd');sgrd.addColorStop(1,'#aaccee');
    sctx.fillStyle=sgrd;sctx.fillRect(0,0,2,512);
    scene.background=new THREE.CanvasTexture(skyCanvas);
    // 霧的遠近跟著場地大小等比放大（原 ±15 → 25/50），視角不變
    scene.fog=new THREE.Fog(0x8899aa,Math.round(BASE_HALF*25/15),Math.round(BASE_HALF*50/15));
    amb.color.setHex(0x556070);amb.intensity=0.6;
    dir.color.setHex(0xffeedd);dir.intensity=1.2;
  }
}
var rangeElements=[];
function buildRangeScene(){
  rangeElements=[];rangeTargets=[];rangeDrones=[];
  function addRE(p,s,c,sh){
    var g=new THREE.BoxGeometry(s.x,s.y,s.z);var m=new THREE.MeshStandardMaterial({color:c,roughness:0.7});
    var mesh=new THREE.Mesh(g,m);mesh.position.copy(p);if(sh)mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    mapBoxes.push({pos:p.clone(),size:s.clone(),mesh:mesh,isRange:true});
    rangeElements.push(mesh);return mesh;
  }
  addRE(new THREE.Vector3(0,-0.1,-12.5),new THREE.Vector3(14,0.2,29),0x556677,false);
  for(var i=-1;i<=1;i+=2){addRE(new THREE.Vector3(i*6,2,-12),new THREE.Vector3(0.3,4,30),0x445566,true);}
  addRE(new THREE.Vector3(0,2,-27),new THREE.Vector3(14,4,0.3),0x445566,true);
  addRE(new THREE.Vector3(0,1.5,-2),new THREE.Vector3(1.5,3,1.5),0x445566,true);
  for(var i=-1;i<=1;i+=2){addRE(new THREE.Vector3(i*1.5,0.6,-13.5),new THREE.Vector3(0.1,1.2,1),0x8899aa,false);}
  var tPositions=[[-3.5,0.6,-3],[-3.5,0.6,-6],[-3.5,0.6,-9],[3.5,0.6,-3],[3.5,0.6,-6],[3.5,0.6,-9],[0,0.6,-15],[-3.5,0.6,-12],[3.5,0.6,-12],[0,0.6,-6],[0,0.6,-9],[-3.5,0.6,-18],[3.5,0.6,-18],[0,0.6,-12],[0,0.6,-18],[0,0.6,-21],[-3.5,0.6,-15],[3.5,0.6,-15],[-3.5,0.6,-21],[3.5,0.6,-21]];
  tPositions.forEach(function(tp){
    var tMat2=new THREE.MeshStandardMaterial({color:0xaa8866,roughness:0.5});
    var body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,1.2,6),tMat2);
    body.position.set(tp[0],tp[1],tp[2]);body.castShadow=true;body.receiveShadow=true;scene.add(body);
    var head=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6),tMat2);
    head.position.set(tp[0],tp[1]+0.65,tp[2]);head.castShadow=true;head.receiveShadow=true;scene.add(head);
    rangeElements.push(body);rangeElements.push(head);
    rangeTargets.push({pos:new THREE.Vector3(tp[0],tp[1],tp[2]),origPos:new THREE.Vector3(tp[0],tp[1],tp[2]),size:new THREE.Vector3(0.5,1.2,0.5),meshBody:body,meshHead:head,hitTimer:0,down:false,downRot:0,respawnTimer:0});
  });
  for(var i=0;i<8;i++){
    var dPos=new THREE.Vector3(-5+Math.random()*10,2+Math.random()*4,-3-Math.random()*20);
    var dGroup=new THREE.Group();dGroup.position.copy(dPos);
    var bodyMat2=new THREE.MeshStandardMaterial({color:0x88aadd,roughness:0.3,metalness:0.3});
    var dBody2=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.08,0.4),bodyMat2);
    dBody2.position.set(0,0,0);dBody2.castShadow=true;dBody2.receiveShadow=true;dGroup.add(dBody2);
    var armMat2=new THREE.MeshStandardMaterial({color:0x667788,roughness:0.5});
    [[-0.22,0,-0.22],[0.22,0,-0.22],[-0.22,0,0.22],[0.22,0,0.22]].forEach(function(ap){
      var am=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.02,0.02),armMat2);
      am.position.set(ap[0],ap[1],ap[2]);am.rotation.y=Math.atan2(ap[2],ap[0]);
      am.castShadow=true;dGroup.add(am);
    });
    var rotorMat2=new THREE.MeshStandardMaterial({color:0xcccccc,roughness:0.7,transparent:true,opacity:0.5,side:THREE.DoubleSide});
    [[-0.35,0.02,-0.35],[0.35,0.02,-0.35],[-0.35,0.02,0.35],[0.35,0.02,0.35]].forEach(function(rp){
      var rm=new THREE.Mesh(new THREE.CircleGeometry(0.13,8),rotorMat2);
      rm.position.set(rp[0],rp[1],rp[2]);rm.rotation.x=-Math.PI/2;dGroup.add(rm);
    });
    var dGlow2=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),new THREE.MeshBasicMaterial({color:0x44aaff}));
    dGlow2.position.set(0,-0.05,0);dGroup.add(dGlow2);
    scene.add(dGroup);rangeElements.push(dGroup);
    rangeDrones.push({mesh:dGroup,bodyMat:bodyMat2,glow:dGlow2,pos:dPos.clone(),vel:new THREE.Vector3((Math.random()-0.5)*3,(Math.random()-0.5)*0.5,(Math.random()-0.5)*3),timer:0,hitTimer:0,crashed:false,crashVel:new THREE.Vector3(0,0,0),respawnTimer:0});
  }
  var wMat2=new THREE.MeshStandardMaterial({color:0x884466,roughness:0.5});
  rangeWalkwayTarget=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.8,0.5),wMat2);
  rangeWalkwayTarget.position.set(0,0.4,2);rangeWalkwayTarget.castShadow=true;rangeWalkwayTarget.receiveShadow=true;scene.add(rangeWalkwayTarget);
  rangeElements.push(rangeWalkwayTarget);
  rangeWalkwayDir=-1;rangeWalkwayPos=2;
}
function clearRangeScene(){
  for(var i=mapBoxes.length-1;i>=0;i--){
    if(mapBoxes[i].isRange){mapBoxes.splice(i,1);}
  }
  rangeElements.forEach(function(m){scene.remove(m);});
  rangeElements=[];rangeTargets=[];rangeDrones=[];rangeWalkwayTarget=null;
}
var playerClass=null;
var classData=[
  {id:'berserker',name:'狂戰士',icon:'🔴',desc:'近戰衝鋒',passive:'小刀傷害x2，擊殺回5HP',perks:['speed','lifesteal','armor']},
  {id:'medic',name:'醫護兵',icon:'🟢',desc:'持續回復',passive:'每秒回1HP，戰鬥中減半',perks:['hs_heal','lifesteal','armor']},
  {id:'assault',name:'突擊兵',icon:'🔵',desc:'火力壓制',passive:'快速換彈 2.0s→1.2s',perks:['dmg','reload','spread']},
  {id:'sniper',name:'神射手',icon:'🟡',desc:'一發入魂',passive:'爆頭傷害+30%',perks:['dmg','pen','hs_heal']},
  {id:'tank',name:'鐵壁',icon:'🟣',desc:'堅不可摧',passive:'每波+50臨時護甲（上限150）',perks:['armor','lifesteal','hs_heal']},
  {id:'ghost',name:'幽靈',icon:'⚪',desc:'高速游擊',passive:'移速+10%，滑鏟距離x1.5',perks:['speed','reload','spread']},
  {id:'engineer',name:'工程師',icon:'🟠',desc:'破壞控制',passive:'燒牆回HP/甲，近戰定身破甲',perks:['armor','lifesteal','hs_heal']}
];
var classPerkLabels={dmg:'🔥傷害+25%',reload:'⚡換彈x2',pen:'🔩穿透+1',hs_heal:'💚爆頭回血',speed:'💨速度+20%',armor:'🛡護甲+50',lifesteal:'🩸擊殺回血',spread:'🎯擴散-40%'};
// ── Skill Tree Upgrade System ──
var skillPoints=parseInt(localStorage.getItem('oc_skillpoints'))||0;
var skillTreeUpgrades={};
try{var st=localStorage.getItem('oc_skilltree');if(st)skillTreeUpgrades=JSON.parse(st);}catch(e){}
function saveSkillTree(){try{localStorage.setItem('oc_skillpoints',skillPoints);localStorage.setItem('oc_skilltree',JSON.stringify(skillTreeUpgrades));}catch(e){}}
function awardSkillPoints(pts){skillPoints+=pts;saveSkillTree();var ntf=document.createElement('div');ntf.textContent='⭐ +'+pts+' 技能點';ntf.style.cssText='position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);color:#ffdd44;font-size:28px;font-weight:bold;z-index:45;font-family:Arial;text-shadow:0 0 20px rgba(255,220,68,.8);pointer-events:none;transition:all 1.2s ease-out;opacity:1';document.body.appendChild(ntf);requestAnimationFrame(function(){ntf.style.transform='translate(-50%,-80px)';ntf.style.opacity='0';});setTimeout(function(){ntf.remove();},1300);}
var skillTreeData={
  berserker:[
    {tier:1,skills:[{id:'b1a',name:'狂暴之怒',icon:'⚔',desc:'小刀傷害 +30%',cost:1,apply:function(){if(window.knifeMult)window.knifeMult*=1.3;}},{id:'b1b',name:'嗜血本能',icon:'🩸',desc:'擊殺回血 +5 HP',cost:1,apply:function(){window.bonusLifesteal=5;}}]},
    {tier:2,skills:[{id:'b2a',name:'連鎖殺戮',icon:'🔥',desc:'擊殺重置技能冷卻',cost:2,apply:function(){window.chainKill=true;}},{id:'b2b',name:'狂戰之躯',icon:'💪',desc:'護甲上限 +50',cost:2,apply:function(){window.bonusArmorCap=50;}}]},
    {tier:3,skills:[{id:'b3a',name:'血怒',icon:'💢',desc:'HP<30% 時傷害 x1.5',cost:3,apply:function(){window.bloodRage=true;}},{id:'b3b',name:'不死戰魂',icon:'💀',desc:'致命傷害時保留 1 HP（60 秒冷卻）',cost:3,apply:function(){window.undying=true;}}]}
  ],
  medic:[
    {tier:1,skills:[{id:'m1a',name:'強效注射',icon:'💉',desc:'治療波 +50% 效果',cost:1,apply:function(){window.healBoost=1.5;}},{id:'m1b',name:'急救包',icon:'📦',desc:'每 30 秒自動回 10 HP',cost:1,apply:function(){window.autoHeal=10;window.autoHealCD=30;}}]},
    {tier:2,skills:[{id:'m2a',name:'戰場醫療',icon:'🏥',desc:'射擊時緩慢回血（每秒 2 HP）',cost:2,apply:function(){window.combatRegen=2;}},{id:'m2b',name:'腎上腺素',icon:'⚡',desc:'HP<25% 時移速 +30%',cost:2,apply:function(){window.adrenaline=true;}}]},
    {tier:3,skills:[{id:'m3a',name:'群體治療',icon:'💚',desc:'治療波範圍 x2',cost:3,apply:function(){window.healRadius=2;}},{id:'m3b',name:'起死回生',icon:'✨',desc:'致命傷害時回 50 HP（120 秒冷卻）',cost:3,apply:function(){window.revive=true;}}]}
  ],
  assault:[
    {tier:1,skills:[{id:'a1a',name:'快速裝填',icon:'⚡',desc:'換彈速度 +25%',cost:1,apply:function(){window.reloadBoost=0.8;}},{id:'a1b',name:'火力壓制',icon:'🔫',desc:'射速 +15%',cost:1,apply:function(){window.fireRateBoost=0.85;}}]},
    {tier:2,skills:[{id:'a2a',name:'擴充彈匣',icon:'📦',desc:'彈匣容量 +50%',cost:2,apply:function(){Object.keys(gunData).forEach(function(g){if(gunData[g].mag>1)gunData[g].mag=Math.round(gunData[g].mag*1.5);});}},{id:'a2b',name:'戰術.reload',icon:'🔄',desc:'換彈完成後 3 秒內射速 +20%',cost:2,apply:function(){window.tacticalReload=true;}}]},
    {tier:3,skills:[{id:'a3a',name:'全自動模式',icon:'💥',desc:'射速 x1.5',cost:3,apply:function(){window.fullAutoMode=true;}},{id:'a3b',name:'爆裂彈',icon:'💣',desc:'子彈有 15% 機率爆炸（範圍 2m）',cost:3,apply:function(){window.explosiveRounds=0.15;}}]}
  ],
  sniper:[
    {tier:1,skills:[{id:'s1a',name:'致命精準',icon:'🎯',desc:'爆頭傷害 +40%',cost:1,apply:function(){window.hsMult=1.4;}},{id:'s1b',name:'遠程狙擊',icon:'🔭',desc:'傷害衰減 -30%',cost:1,apply:function(){window.rangeBoost=0.7;}}]},
    {tier:2,skills:[{id:'s2a',name:'穩定瞄準',icon:'👁',desc:'ADS 精準度 +30%',cost:2,apply:function(){window.steadyAim=1.3;}},{id:'s2b',name:'致命視線',icon:'💀',desc:'20% 機率暴擊（x2 傷害）',cost:2,apply:function(){window.critChance=0.2;}}]},
    {tier:3,skills:[{id:'s3a',name:'一槍斃命',icon:'⚡',desc:'爆頭傷害 x2',cost:3,apply:function(){window.hsMult=(window.hsMult||1.3)*2;}},{id:'s3b',name:'穿甲狙擊',icon:'🔩',desc:'穿透目標 +2',cost:3,apply:function(){window.bulletPen=(window.bulletPen||1)+2;}}]}
  ],
  tank:[
    {tier:1,skills:[{id:'t1a',name:'重裝護甲',icon:'🛡',desc:'護甲上限 +50',cost:1,apply:function(){window.bonusArmorCap=50;}},{id:'t1b',name:'韌性',icon:'💪',desc:'受到傷害 -15%',cost:1,apply:function(){window.damageReduction=0.85;}}]},
    {tier:2,skills:[{id:'t2a',name:'嘲諷',icon:'😡',desc:'靠近敵人時吸引仇恨',cost:2,apply:function(){window.taunt=true;}},{id:'t2b',name:'堡壘',icon:'🏰',desc:'靜止時護甲回復 +100%',cost:2,apply:function(){window.fortress=true;}}]},
    {tier:3,skills:[{id:'t3a',name:'不屈意志',icon:'🛡',desc:'致命傷害時保留 1 HP（90 秒冷卻）',cost:3,apply:function(){window.undying=true;}},{id:'t3b',name:'反擊',icon:'⚡',desc:'反彈 20% 傷害給近戰攻擊者',cost:3,apply:function(){window.reflectDamage=0.2;}}]}
  ],
  ghost:[
    {tier:1,skills:[{id:'g1a',name:'疾風步',icon:'💨',desc:'移速 +20%',cost:1,apply:function(){SPEED*=1.2;}},{id:'g1b',name:'靈活閃避',icon:'🌀',desc:'滑鏟無敵時間 +0.3s',cost:1,apply:function(){window.slideInvuln=0.3;}}]},
    {tier:2,skills:[{id:'g2a',name:'暗影步',icon:'👻',desc:'擊殺後瞬移 3m',cost:2,apply:function(){window.shadowStep=true;}},{id:'g2b',name:'煙霧彈',icon:'💨',desc:'滑鏟時產生煙霧（致盲 2s）',cost:2,apply:function(){window.smokeSlide=true;}}]},
    {tier:3,skills:[{id:'g3a',name:'幻影殺手',icon:'👁',desc:'隱形中击杀不破隱',cost:3,apply:function(){window.phantomKill=true;}},{id:'g3b',name:'相位行走',icon:'🌀',desc:'滑鏟穿過敵人（無碰撞）',cost:3,apply:function(){window.phaseWalk=true;}}]}
  ]
};
// ══════════════════════════════════════════════════════════════════
//  角色選擇系統 —— 藍色介面下方的「角色框框」
//  現階段有突擊兵／醫護兵（方晶造型），之後會越來越多
//  → 畫面所有內容都由 OC_CHARS 自動生出來，加角色只要往陣列塞一筆
// ══════════════════════════════════════════════════════════════════
var OC_CHARS=[
  // 身體造型一律用遊戲原本的方晶 createCubelingMesh，配色參數同敵人/對手那套
  {id:'assault',cls:'assault',name:'突擊兵',tag:'突進',desc:'火力壓制',passive:'快速換彈 2.0s→1.2s',
   weapon:'ak47',weaponName:'AK-47',
   cub:{body:0xffcc22,accent:0xfff0a0,glow:0xffaa00,core:0x8a5c00,visor:0xffe066,visorEm:0xffcc22}},
  {id:'medic',cls:'medic',name:'醫護兵',tag:'煙霧',desc:'煙霧控場',passive:'每秒+2HP+1甲',
   weapon:'ak47',weaponName:'AK-47',
   cub:{body:0x55ff99,accent:0xd9fff0,glow:0x33ff88,core:0x0a7a45,visor:0x99ffcc,visorEm:0x44ffaa}},
  {id:'engineer',cls:'engineer',name:'工程師',tag:'破壞',desc:'焚牆破甲',passive:'Z燒牆 Q定身 X破甲 E聲波',
   weapon:'flamethrower',weaponName:'火焰噴射槍',eng:true,
   cub:{body:0xff8a3c,accent:0xffd9a0,glow:0xff6a00,core:0x7a3a00,visor:0xffcc88,visorEm:0xff8822}},
  // ↓ 之後的角色照這格式繼續加，框框會自己長出來 ↓
  // ↓ 例：{id:'mystic',cls:'mystic',name:'法師',tag:'範圍',desc:'…',passive:'…',
  // ↓     weapon:'ak47',weaponName:'AK-47',cub:{body:0x8a66ff,...}},
];
var OC_CD_SEC=5;      // 這一頁的倒數秒數
var OC_HOP_N=3;       // 你說「至少跳兩步」→ 實際彈 3 下
var OC_HOP_DT=0.32;   // 每一下的時間
var OC_OVER_DT=0.6;   // 「跳過來」衝向鏡頭的時間
var OC_BASE_SC=1.15;  // 3D 裡方晶的基準大小（方晶本身高約 0.72）
function ocLerp(a,b,t){return a+(b-a)*t;}

// ── 角色本體：方晶（跟遊戲裡對手/敵人同一套 createCubelingMesh）──
function ocCharMesh(def){
  var opt=def.cub||{};
  if(opt.body===undefined)opt.body=0x6fa8d8;
  var g=createCubelingMesh(opt);
  g.userData.tick&&(g.userData.tick(0));
  if(def&&def.eng){
    var eHat=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.22,0.14,16),new THREE.MeshStandardMaterial({color:0x2a3b66,roughness:0.6,metalness:0.1}));
    eHat.position.y=0.86;g.add(eHat);
    var eBrim=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.03,0.3),new THREE.MeshStandardMaterial({color:0x22304f,roughness:0.6}));
    eBrim.position.set(0,0.79,0.17);g.add(eBrim);
    var eVisor=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.08,0.05),new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:0.5,roughness:0.12}));
    eVisor.position.set(0,0.53,0.24);g.add(eVisor);
    var eTank=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.36,12),new THREE.MeshStandardMaterial({color:0xcc5522,metalness:0.6,roughness:0.4}));
    eTank.position.set(0,0.42,-0.29);g.add(eTank);
    var eTankTop=new THREE.Mesh(new THREE.SphereGeometry(0.09,12,8),new THREE.MeshStandardMaterial({color:0xb04418,metalness:0.6,roughness:0.4}));
    eTankTop.position.set(0,0.6,-0.29);g.add(eTankTop);
  }
  return g;
}
// ── 手上那把槍：掛在方晶右前方，槍口(-Z)朝下前方 ──
function ocCharGun(ch,def){
  var w=null;
  try{w=createGunModel(def.weapon||'ak47',true);}catch(e){w=null;}
  if(!w)return null;
  w.scale.setScalar(1.5);
  w.position.set(0.30,0.46,0.16);
  w.rotation.set(0.22,-0.45,0.12);
  ch.add(w);ch.userData.gun=w;
  return w;
}

// ── 所有卡片共用一個 WebGL context，畫完貼到各張 2D canvas ──
//    這樣之後角色加到十幾隻也不會開爆瀏覽器
var ocCS={open:false,mode:null,ren:null,scene:null,cam:null,items:[],raf:0,t0:0,_lt:0,
  anim:null,cdTimer:null,busy:false,spin:0};
function ocCsGL(){
  if(ocCS.ren)return true;
  try{
    ocCS.ren=new THREE.WebGLRenderer({alpha:true,antialias:true});
    ocCS.ren.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    ocCS.ren.setSize(340,300,false);
    ocCS.ren.toneMapping=THREE.ACESFilmicToneMapping;
    ocCS.ren.toneMappingExposure=1.25;
    ocCS.scene=new THREE.Scene();
    ocCS.cam=new THREE.PerspectiveCamera(30,340/300,.1,60);
    ocCS.cam.position.set(0,.36,2.15);
    ocCS.cam.lookAt(0,.28,0);
    ocCS.scene.add(new THREE.AmbientLight(0x6688cc,.6));
    var k=new THREE.DirectionalLight(0xfff0d0,1.5);k.position.set(1.6,2.6,1.4);ocCS.scene.add(k);
    var f=new THREE.DirectionalLight(0x7fc0ff,.9);f.position.set(-1.4,1.2,-1.6);ocCS.scene.add(f);
    var r=new THREE.DirectionalLight(0x3a7cff,1.15);r.position.set(-.4,.3,-1.8);ocCS.scene.add(r);
    var rg=new THREE.Mesh(new THREE.RingGeometry(.30,.42,36),
      new THREE.MeshBasicMaterial({color:0x4aa8ff,transparent:true,opacity:.22,side:THREE.DoubleSide}));
    rg.rotation.x=-Math.PI/2;ocCS.scene.add(rg);
    return true;
  }catch(e){ocCS.ren=null;return false;}
}
function ocCsItem(def){
  var g=ocCharMesh(def);
  ocCharGun(g,def);
  ocCS.scene.add(g);
  return {def:def,grp:g,cv:null};
}
function ocCsFind(id){for(var i=0;i<ocCS.items.length;i++)if(ocCS.items[i].def.id===id)return ocCS.items[i];return null;}
function ocCsOnly(it){for(var i=0;i<ocCS.items.length;i++)ocCS.items[i].grp.visible=(ocCS.items[i]===it);}
function ocCsBlit(cv,w,h,wide){
  if(!cv||!ocCS.ren)return;
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  // 渲染緩衝跟目標 canvas 同大，不然 drawImage 會把 340x300 拉大 → 模糊
  if(ocCS.ren.domElement.width!==w||ocCS.ren.domElement.height!==h)ocCS.ren.setSize(w,h,false);
  ocCS.cam.aspect=w/h;ocCS.cam.updateProjectionMatrix();
  // 卡片預覽貼近拍；蹦跳畫面要往後拉並抬高注視點，留頭頂空間，
  // 否則方晶一跳起來頭頂就被畫布裁掉（「頭皮看不到」）。
  if(wide){ocCS.cam.position.set(0,.45,3.1);ocCS.cam.lookAt(0,.42,0);}
  else{ocCS.cam.position.set(0,.36,2.15);ocCS.cam.lookAt(0,.28,0);}
  ocCS.ren.render(ocCS.scene,ocCS.cam);
  var c2=cv.getContext('2d');
  // WebGL 是 alpha:true → 清成透明；source-over 貼透明像素不會蓋掉舊畫面，
  // 於是上一幀的方晶會留在原地（轉一圈疊一層鬼影）。這裡先清掉。
  c2.clearRect(0,0,w,h);
  c2.drawImage(ocCS.ren.domElement,0,0,w,h);
}

// ── 主迴圈 ──
function ocCsLoop(){
  ocCS.raf=requestAnimationFrame(ocCsLoop);
  if(!ocCS.open||!ocCS.ren)return;
  var now=performance.now();
  if(!ocCS.t0)ocCS.t0=now;
  var dt=ocCS._lt?(now-ocCS._lt)/1000:0;ocCS._lt=now;
  if(dt>0.1)dt=0.1;
  var tt=(now-ocCS.t0)/1000;
  ocCS.spin+=0.006;
  var a=ocCS.anim,it,g;
  var J=document.getElementById('char-jumper');
  var Jc=document.getElementById('char-jump-cv');
  if(a)a.t+=dt;

  if(a&&a.phase!=='idle'&&a.phase!=='done'&&(it=ocCsFind(a.def.id))){
    // ── 方晶蹦蹦跳跳跳出來 ──
    g=it.grp;ocCsOnly(it);
    if(a.phase==='hop'){
      var hopAll=OC_HOP_N*OC_HOP_DT;
      var k=a.t/hopAll;if(k>1)k=1;
      var h=k*OC_HOP_N,idx=Math.floor(h);if(idx>=OC_HOP_N)idx=OC_HOP_N-1;
      var fr=h-idx;                       // 這一 下 的進度 0→1
      var arc=Math.sin(Math.PI*fr)*0.30;   // 拋物線高度（太高會衝出畫布）
      g.position.set(0,ocLerp(-0.2,0.06,k)+arc,ocLerp(0.12,-0.05,k));
      var sq=1-Math.cos(Math.PI*2*fr)*0.17; // 落地擠壓 / 空中拉長
      g.scale.set(OC_BASE_SC*(1+(1-sq)*0.85),OC_BASE_SC*sq,OC_BASE_SC*(1+(1-sq)*0.85));
      g.rotation.y=Math.PI*0.16+Math.sin(a.t*8)*0.13;
      g.rotation.z=Math.sin(a.t*8)*0.07;
      if(k>=1){a.phase='over';a.t=0;}
    }else if(a.phase==='over'){
      // ── 「跳過來」：往前站一步。大小維持不變（原本一路放大＋貼近鏡頭，
      //     疊加上面元素的 scale，看起來就是「越來越大」）──
      var k2=a.t/OC_OVER_DT;if(k2>1)k2=1;
      var e=k2*k2*(3-2*k2);
      g.position.set(0,0.06+e*0.06,-0.05+e*0.15);
      g.scale.set(OC_BASE_SC,OC_BASE_SC,OC_BASE_SC);
      g.rotation.y=Math.PI*0.16;
      if(k2>=1){a.phase='done';ocCsCountdown();}
    }
    J.style.opacity=1;
    ocCsBlit(Jc,(J.clientWidth||190)*3,(J.clientHeight||210)*3,true);
  }else{
    // ── 框框裡的卡片：待機呼吸 + 慢慢轉 ──
    J.style.opacity=0;
    for(var i=0;i<ocCS.items.length;i++){
      it=ocCS.items[i];g=it.grp;
      ocCsOnly(it);
      g.position.set(0,Math.sin(tt*2+i*1.3)*0.03,0);
      g.rotation.y=ocCS.spin+i*1.7;
      g.scale.set(OC_BASE_SC,OC_BASE_SC,OC_BASE_SC);
      ocCsBlit(it.cv,158,132);
    }
  }
}

// ── 畫框框 ──
function ocCsRender(){
  var box=document.getElementById('char-slots');
  box.innerHTML='';
  box.classList.toggle('empty',OC_CHARS.length===0);
  box.classList.remove('dropping');
  for(var i=0;i<OC_CHARS.length;i++){
    var o=OC_CHARS[i];
    var d=document.createElement('div');
    d.className='char-slot';d.dataset.char=o.id;
    var cv=document.createElement('canvas');
    var tag=document.createElement('div');tag.className='cs-tag';tag.textContent=o.tag||'';
    var nm=document.createElement('div');nm.className='cs-name';nm.textContent=o.name;
    var wp=document.createElement('div');wp.className='cs-wpn';
    wp.textContent=(o.weaponName||'')+(o.passive?' · '+o.passive:'');
    d.appendChild(cv);d.appendChild(tag);d.appendChild(nm);d.appendChild(wp);
    d.onclick=function(def,el){return function(){ocCsPick(def,el);};}(o,d);
    box.appendChild(d);
    var it=ocCsFind(o.id);
    if(it)it.cv=cv;
  }
  // 新框框從右邊滑進來
  if(OC_CHARS.length)setTimeout(function(){box.classList.add('dropping');},20);
}

// ── 開啟這一頁 ──
function ocCsOpen(mode){
  ocCS.mode=mode;ocCS.open=true;ocCS.busy=false;ocCS.t0=0;ocCS._lt=0;
  ocCS.anim=null;
  if(ocCS.cdTimer){clearInterval(ocCS.cdTimer);ocCS.cdTimer=null;}
  var cd=document.getElementById('char-cd');
  cd.style.display='none';cd.innerHTML='';
  var J=document.getElementById('char-jumper');
  J.style.transition='none';J.style.opacity=0;J.style.transform='none';
  var Jc0=document.getElementById('char-jump-cv');
  Jc0.style.transition='none';Jc0.style.transform='none';
  document.getElementById('char-select').style.display='flex';
  if(ocCsGL()){
    for(var i=0;i<ocCS.items.length;i++)ocCS.scene.remove(ocCS.items[i].grp);
    ocCS.items=[];
    for(var j=0;j<OC_CHARS.length;j++)ocCS.items.push(ocCsItem(OC_CHARS[j]));
  }
  ocCsRender();
  if(!ocCS.raf)ocCS.raf=requestAnimationFrame(ocCsLoop);
  document.getElementById('char-hint').textContent=
    OC_CHARS.length?'點擊角色即可出發':'目前沒有可用角色';
}

// ── 點擊角色 → 跳出來蹦跳 ──
function ocCsPick(def,cardEl){
  if(ocCS.busy)return;
  ocCS.busy=true;
  playerClass=def.cls||def.id;      // 技能先沿用原本的職業邏輯
  var J=document.getElementById('char-jumper');
  var Jc=document.getElementById('char-jump-cv');
  Jc.width=190;Jc.height=210;
  var r=cardEl.getBoundingClientRect();
  J.style.left=r.left+'px';J.style.top=(r.top+6)+'px';
  J.style.width=r.width+'px';J.style.height=(r.height-30)+'px';
  J.style.transition='none';J.style.transform='none';J.style.opacity=1;
  J.offsetHeight;   // 先讀一次版面，避免 transition 不觸發
  var tx=window.innerWidth/2-r.left-r.width/2;
  var ty=window.innerHeight*0.5-r.top-r.height/2;   // 落在畫面正中間，不要飛到上方
  var dur=(OC_HOP_N*OC_HOP_DT+0.2).toFixed(2);
  J.style.transition='transform '+dur+'s cubic-bezier(.32,.05,.2,1),opacity .3s';
  J.style.transform='translate('+tx+'px,'+ty+'px)';
  // 放大放在內層 canvas，而且用很短的 transition：
  // 跟位移共用同一条長 transition 的話，整個蹦跳過程都在放大 →「越來越大」。
  Jc.style.transition='none';Jc.style.transform='none';Jc.offsetHeight;
  Jc.style.transition='transform .4s cubic-bezier(.2,.8,.3,1)';
  Jc.style.transform='scale(1.6)';
  ocCS.anim={phase:'hop',t:0,def:def};
  document.getElementById('char-hint').style.display='none';
  document.getElementById('char-back').style.display='none';
  var cards=document.querySelectorAll('.char-slot');
  for(var i=0;i<cards.length;i++)cards[i].style.pointerEvents='none';
}

// ── 這一頁的 5 秒倒數 ──
function ocCsCountdown(){
  var el=document.getElementById('char-cd');
  var J=document.getElementById('char-jumper');
  J.style.transition='opacity .35s,transform .35s';
  J.style.opacity=0;
  el.style.display='block';
  el.innerHTML='準 備 出 發 &nbsp;<b>'+OC_CD_SEC+'</b>';
  var n=OC_CD_SEC;
  ocCS.cdTimer=setInterval(function(){
    n--;
    if(n>0){el.innerHTML='準 備 出 發 &nbsp;<b>'+n+'</b>';}
    else{clearInterval(ocCS.cdTimer);ocCS.cdTimer=null;el.innerHTML='出 發 ！';ocCsEnter();}
  },1000);
}

// ── 進場（跟原本點職業之後走同一條路）──
function ocCsEnter(){
  var m=ocCS.mode;
  ocCsClose();
  if(gameStarted)return;   // 遊戲已開始（倒數計時器延遲觸發）→ 不再跳出選擇畫面
  if(m==='hybrid4'){
    startHybridMode();
  }else if(m==='multi2'||m==='multi4'){
    document.getElementById('multi-connecting').style.display='flex';
    connectMultiplayer(m==='multi2'?2:4);
  }else{
    document.getElementById('map-select').style.display='flex';
  }
}
function ocCsClose(){
  ocCS.open=false;ocCS.anim=null;ocCS.busy=false;
  if(ocCS.cdTimer){clearInterval(ocCS.cdTimer);ocCS.cdTimer=null;}
  var el=document.getElementById('char-select');
  if(el)el.style.display='none';
  var back=document.getElementById('char-back');
  if(back)back.style.display='block';
  document.getElementById('char-hint').style.display='block';
  var cards=document.querySelectorAll('.char-slot');
  for(var i=0;i<cards.length;i++)cards[i].style.pointerEvents='';
}
document.getElementById('char-back').onclick=function(){
  ocCsClose();
  document.getElementById('menu').style.display='flex';
};
function renderCharSelect(){ocCsRender();}
function renderClassSelect(){
  var html='';
  for(var i=0;i<classData.length;i++){
    var c=classData[i];
    var perkStr='';for(var pi=0;pi<c.perks.length;pi++){perkStr+=classPerkLabels[c.perks[pi]]+(pi<c.perks.length-1?' ':'')}
    html+='<div class="class-card" data-class="'+c.id+'"><div class="class-card-icon">'+c.icon+'</div><div class="class-card-name">'+c.name+'</div><div class="class-card-desc">'+c.desc+'</div><div class="class-card-passive">'+c.passive+'</div><div class="class-card-perks">'+perkStr+'</div></div>';
  }
  document.getElementById('class-grid').innerHTML=html;
  document.querySelectorAll('.class-card').forEach(function(card){
    card.onclick=function(){
      playerClass=this.dataset.class;
      document.getElementById('class-select').style.display='none';
      var csEl=document.getElementById('class-select');
      var hybrid=csEl.dataset.hybrid;
      var multi=csEl.dataset.multi;
      if(hybrid){
        // 單多混合：不顯示「連線中」頁面，直接把基本地圖架起來進場
        csEl.removeAttribute('data-hybrid');
        startHybridMode();
      }else if(multi){csEl.removeAttribute('data-multi');document.getElementById('multi-connecting').style.display='flex';connectMultiplayer(parseInt(multi));}
      else{document.getElementById('map-select').style.display='flex';}
    };
  });
}
function applyClassPassives(){
  if(!window.baseSPEED)window.baseSPEED=10;
  SPEED=window.baseSPEED;
  window.knifeMult=null;window.lifesteal=null;window.regenHP=null;window.regenAccum=0;
  window.reloadSpeedMult=null;window.hsMult=null;window.hsHeal=null;window.waveArmor=null;window.slideMult=null;
  if(!playerClass)return;
  var cData=null;for(var i=0;i<classData.length;i++){if(classData[i].id===playerClass){cData=classData[i];break;}}
  if(!cData)return;
  if(playerClass==='berserker'){window.knifeMult=2;window.lifesteal=true;}
  else if(playerClass==='medic'){window.regenHP=true;window.regenAccum=0;}
  else if(playerClass==='assault'){window.reloadSpeedMult=Math.min(window.reloadSpeedMult||1,0.6);}
  else if(playerClass==='sniper'){window.hsMult=1.3;window.hsHeal=true;}
  else if(playerClass==='tank'){window.waveArmor=50;}
  else if(playerClass==='ghost'){SPEED*=1.1;window.slideMult=1.5;}
  for(var pi=0;pi<cData.perks.length;pi++)applyPerk(cData.perks[pi]);
  // Apply skill tree upgrades
  var upgList=skillTreeUpgrades[playerClass]||[];
  for(var ui=0;ui<upgList.length;ui++){
    var tree=skillTreeData[playerClass];if(!tree)continue;
    for(var ti=0;ti<tree.length;ti++){
      for(var si=0;si<tree[ti].skills.length;si++){
        if(tree[ti].skills[si].id===upgList[ui]){tree[ti].skills[si].apply();break;}
      }
    }
  }
}
var mapOptions=document.querySelectorAll('.map-option');
mapOptions.forEach(function(opt){
  opt.onclick=function(){
    if(dailyChallenge){
      currentMap='base';gameDifficulty='normal';diffMult=1;
      document.getElementById('map-select').style.display='none';
      document.getElementById('scanlines').style.display='none';
      document.getElementById('scope-overlay').style.display='none';
      isADS=false;isReloading=false;reloadTimer=0;cam.fov=80;cam.updateProjectionMatrix();
      try{localStorage.removeItem('ocgame_save')}catch(ex){}
      applyClassPassives();
      applyMapSettings();
      document.body.requestPointerLock().catch(function(){});
      var today=new Date();dailySeed=today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
      return;
    }
    if(opt.dataset.map==='nuclear'||opt.dataset.map==='flooded'||opt.dataset.map==='zombielair'){
      document.getElementById('map-select').style.display='none';
      var _m=opt.dataset.map;document.getElementById('diff-title').textContent=_m==='nuclear'?'☢ 核電站 — 難度選擇':(_m==='flooded'?'🌊 淹水房子 — 難度選擇':'🧟 殭屍老巢 — 難度選擇');
      var isFloodedM=opt.dataset.map==='flooded';
      document.querySelectorAll('.diff-option').forEach(function(dopt){
        var desc=dopt.querySelector('.diff-desc');
        if(!desc)return;
        var dname=dopt.dataset.diff;
        if(dname==='normal'){desc.textContent=_m==='zombielair'?'抗病毒倒數 150 秒 • 三波殭屍':'敵人強度 ×1.0 • 分數 ×1.0';}
        else if(dname==='conf'){desc.textContent=_m==='zombielair'?'抗病毒倒數 140 秒 • 三波殭屍 • 分數 ×1.5':(isFloodedM?'敵人強度 ×1.5 • 分數 ×1.5 • 氧氣加速消耗':'敵人強度 ×1.5 • 分數 ×1.5 • 輻射加速');}
        else{desc.textContent=_m==='zombielair'?'':(isFloodedM?'敵人強度 ×2.0 • 分數 ×2.5 • 氧氣加速消耗':'敵人強度 ×2.0 • 分數 ×2.5 • 輻射加速');}
        dopt.style.display=(dname==='extreme'&&_m==='zombielair')?'none':'';
      });
      document.getElementById('diff-select').style.display='flex';
      window.pendingMap=opt.dataset.map;
      return;
    }
    currentMap=opt.dataset.map;
    gameDifficulty='normal';diffMult=1;
    if(window.radRifleDrop){disposeMesh(window.radRifleDrop.mesh);disposeMesh(window.radRifleDrop.glow);disposeMesh(window.radRifleDrop.light);window.radRifleDrop=null;}
    radiationZones.forEach(function(rz){disposeMesh(rz.mesh);if(rz.light)disposeMesh(rz.light);});radiationZones=[];
    projectiles.forEach(function(rp){disposeMesh(rp.mesh);if(rp.warnMesh)scene.remove(rp.warnMesh);if(rp.light)disposeMesh(rp.light);});projectiles=[];
    smokeParticles.forEach(function(sp){if(sp.light)disposeMesh(sp.light);else disposeMesh(sp);});smokeParticles=[];smokeZoneCenters=[];
    incendiaryZones.forEach(function(iz){disposeMesh(iz.mesh);disposeMesh(iz.mesh2);disposeMesh(iz.light);});incendiaryZones=[];
    document.getElementById('map-select').style.display='none';
    document.getElementById('scanlines').style.display='none';
    document.getElementById('scope-overlay').style.display='none';
    isADS=false;isReloading=false;reloadTimer=0;cam.fov=80;cam.updateProjectionMatrix();
    try{localStorage.removeItem('ocgame_save')}catch(ex){}
    applyClassPassives();
    if(currentMap==='arena2')pos.set(-17,1.9,0);
    if(currentMap==='flooded')pos.set(0,2,0);
    if(currentMap==='zombielair')pos.set(0,0.8,26);
    if(currentMap==='basemap3')pos.set(0,0.8,14);
    if(currentMap==='arena3')pos.set(0,1.63,42);
    applyMapSettings();
    if(bossRushMode){
      bossRushWave=1;bossRushMaxWave=0;bossActive=false;bossSpawned=false;boss=null;bossType='nuclear';
      bossProjectiles.forEach(function(bp){disposeMesh(bp.mesh);disposeMesh(bp.trail);});
      bossProjectiles.length=0;
      if(!window._savedEnemies)window._savedEnemies=enemies.slice();
      enemies.forEach(function(e){e.mesh.visible=false;if(e.hBar)e.hBar.visible=false;if(e.aBar)e.aBar.visible=false;});
      enemies.length=0;
      document.getElementById('nuclear-ui').style.display='none';
      document.getElementById('nuclear-wave').style.display='none';
      document.getElementById('boss-hp-wrap').style.display='none';
      document.getElementById('round-clear').textContent='';document.getElementById('round-clear').style.color='#4f4';
      document.getElementById('start-msg').innerHTML='準備迎戰 Boss !';
    }
    if(localStorage.getItem('oc_ui_mode')==='mobile'){locked=true;document.getElementById('mobile-controls').style.display='block';document.getElementById('blocker').style.display='none';}
    else{document.body.requestPointerLock().catch(function(){});}
  };
});
document.getElementById('diff-back').onclick=function(){document.getElementById('diff-select').style.display='none';document.getElementById('map-select').style.display='flex';};
document.querySelectorAll('.diff-option').forEach(function(opt){
  opt.onclick=function(){
    gameDifficulty=opt.dataset.diff;
    diffMult=gameDifficulty==='normal'?1:(gameDifficulty==='conf'?1.5:2);
    currentMap=window.pendingMap||'nuclear';
    if(window.radRifleDrop){disposeMesh(window.radRifleDrop.mesh);disposeMesh(window.radRifleDrop.glow);disposeMesh(window.radRifleDrop.light);window.radRifleDrop=null;}
    radiationZones.forEach(function(rz){disposeMesh(rz.mesh);if(rz.light)disposeMesh(rz.light);});radiationZones=[];
    projectiles.forEach(function(rp){disposeMesh(rp.mesh);if(rp.warnMesh)scene.remove(rp.warnMesh);if(rp.light)disposeMesh(rp.light);});projectiles=[];
    smokeParticles.forEach(function(sp){if(sp.light)disposeMesh(sp.light);else disposeMesh(sp);});smokeParticles=[];smokeZoneCenters=[];
    incendiaryZones.forEach(function(iz){disposeMesh(iz.mesh);disposeMesh(iz.mesh2);disposeMesh(iz.light);});incendiaryZones=[];
    document.getElementById('diff-select').style.display='none';
    document.getElementById('scanlines').style.display='none';
    document.getElementById('scope-overlay').style.display='none';
    isADS=false;isReloading=false;reloadTimer=0;cam.fov=80;cam.updateProjectionMatrix();
    try{localStorage.removeItem('ocgame_save')}catch(ex){}
    applyClassPassives();
    if(currentMap==='flooded')pos.set(0,2,0);
    if(currentMap==='zombielair')pos.set(0,0.8,26);
    applyMapSettings();
    document.body.requestPointerLock().catch(function(){});
  };
});
document.getElementById('map-select-bg').onclick=function(){
  document.getElementById('map-select').style.display='none';
  document.getElementById('menu').style.display='flex';
};
document.getElementById('class-back').onclick=function(){
  document.getElementById('class-select').style.display='none';
  document.getElementById('class-select').removeAttribute('data-multi');
  document.getElementById('menu').style.display='flex';
};
document.getElementById('daily-btn').onclick=function(){
  if(currentTeamId){window.showTeamBlockTip();return;}
  document.getElementById('menu').style.display='none';
  dailyChallenge=true;dailyKills=0;dailyRounds=0;
  renderClassSelect();
  document.getElementById('class-select').style.display='flex';
};
document.addEventListener('mousemove',function(e){
  var m=document.getElementById('menu');if(m.style.display==='none')return;
  var x=(e.clientX/window.innerWidth-0.5)*20,y=(e.clientY/window.innerHeight-0.5)*10;
  var mt=document.getElementById('logo')||document.getElementById('menu-title');if(mt)mt.style.transform='translate('+x+'px,'+y+'px)';
});

(function(){
'use strict';
if(window.ocIslandOpen)return;
var inited=false;
var scene,camera,renderer,clock,islandLoop=null,tickFn=null;
var playerPos,playerYaw=0,camDist=7,camTheta=0,camPhi=0.38;
var camTarget=new THREE.Vector3();
var keys={},animT=0,isWalk=false;
var selectedMode=null;
var npcs=[],butterflies=[],petals=[],birds=[],droplets=[],clouds=[];
var waterGeo,waterVerts,fallSheet=null,mistPuffs=[];
var MOON=(localStorage.getItem('oc_isl_map')==='moon');
var islVelY=0,islOnGround=true,moonFlag=null,moonEarth=null,moonTick=null;
var jpFuel=100,jpMaxFuel=100,jpThrust=28,jpDrift=10,jpRechargeRate=10,jpFuelDrain=8;
var rootEl=document.getElementById('island-root');
// ═══ MULTIPLAYER STATE ═══
var remotePlayers={};
var wsSocket=null,wsConnected=false,wsReconnectTimer=null,wsSendTimer=0;
var clientId='isl_'+Date.now()+'_'+Math.random().toString(36).substr(2,8);
var localNick=localStorage.getItem('oc_nickname')||'玩家';
// ═══ ISLAND PANEL UTILS (global for 2D menu) ═══
var islPanelOpen=false;
function _pnlLS(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
function _pnlTag(text,color){return '<span class="ip-tag" style="background:'+color+'22;color:'+color+';border:1px solid '+color+'44">'+text+'</span>';}
(function(){
 var allGuns=['ak47','deagle','awp','shotgun','knife','smg','watergun','radrifle','grapple'];
 var og=_pnlLS('oc_guns')||[];
 var inv=_pnlLS('oc_inv')||{};
 var changed=false;
 allGuns.forEach(function(g){
  if(og.indexOf(g)===-1){og.push(g);changed=true;}
  if(!inv[g]||inv[g]<1){inv[g]=1;changed=true;}
 });
 // 手雷／閃光彈／煙霧彈／燃燒彈已全面移除：清掉舊擁有清單與庫存殘留
 ['grenade','grenade_frag','grenade_flashbang','grenade_smoke','grenade_incendiary'].forEach(function(g){
  var oi=og.indexOf(g);if(oi!==-1){og.splice(oi,1);changed=true;}
  if(inv[g]!==undefined){delete inv[g];changed=true;}
 });
 if(changed){
  try{localStorage.setItem('oc_guns',JSON.stringify(og));}catch(e){}
  try{localStorage.setItem('oc_inv',JSON.stringify(inv));}catch(e){}
 }
})();
function pnlArmoryGlobal(el){
window._pnlArmoryGlobal=pnlArmoryGlobal;   // 跨作用域
 var inv=_pnlLS('oc_inv')||{};
 var owned=_pnlLS('oc_guns')||['ak47'];
 var coin=parseInt(localStorage.getItem('oc_coin'))||0;
 var gunNames={ak47:'AK-47',deagle:'沙漠之鷹',awp:'AWP',shotgun:'龍息霰彈',knife:'軍刀',smg:'MP7',watergun:'水槍',radrifle:'輻射步槍',grapple:'鉤爪'};
 var gunIcons={ak47:'🔫',deagle:'🔫',awp:'🔭',shotgun:'💥',knife:'🔪',smg:'🔫',watergun:'💦',radrifle:'☢',grapple:'🪝'};
 var gunDescs={ak47:'全自動突擊步槍，均衡穩定',deagle:'高傷害手槍，後坐力大',awp:'重型狙擊槍，一擊必殺',shotgun:'近距離毀滅，遠距無力',knife:'近戰武器，快速切り',smg:'MP7，射速極快',watergun:'夏日限定，清涼一夏',radrifle:'蓄力發射輻射彈',grapple:'快速位移工具'};
 var gunStats={ak47:'DMG:25 | FR:100ms',deagle:'DMG:55 | FR:400ms',awp:'DMG:120 | FR:1200ms',shotgun:'DMG:15x8 | FR:800ms',knife:'DMG:40 | FR:350ms',smg:'DMG:18 | FR:70ms',watergun:'DMG:12 | FR:150ms',radrifle:'DMG:40-90 | 蓄力',grapple:'位移工具'};
 var guns=['ak47','deagle','awp','shotgun','knife','smg','watergun','radrifle','grapple'];
 var loadout=_pnlLS('oc_loadout');
 var loadoutArr=(loadout&&loadout.loadout)?loadout.loadout:['ak47',null,null,null,null];
 var ownedSet={};owned.forEach(function(g){ownedSet[g]=true;});
 guns.forEach(function(g){if(inv[g]&&inv[g]>0)ownedSet[g]=true;});
 function saveLoadout(){try{localStorage.setItem('oc_loadout',JSON.stringify({loadout:loadoutArr}));}catch(e){}try{for(var si=0;si<5;si++)window.playerLoadout[si]=loadoutArr[si]||null;}catch(e){}document.querySelectorAll('.loadout-slot').forEach(function(s,i){var gn=loadoutArr[i];s.querySelector('.slot-gun').textContent=gn?(gunNames[gn]||gn):'─';});}
 function renderPanel(){
  var html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">';
  html+='<div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:6px">🔫 武 器 庫</div>';
  html+='<div style="display:flex;align-items:center;gap:16px"><span style="font-size:15px;font-weight:bold;letter-spacing:3px;color:#ffd97a">💰 $'+coin+'</span>';
  html+='<button onclick="document.getElementById(\'armory\').style.display=\'none\'" style="all:unset;cursor:pointer;font-size:20px;color:rgba(255,255,255,.5);padding:4px 10px;border-radius:8px;transition:all .2s" onmouseover="this.style.color=\'#fff\';this.style.background=\'rgba(255,255,255,.1)\'" onmouseout="this.style.color=\'rgba(255,255,255,.5)\';this.style.background=\'transparent\'">✕</button></div></div>';
  html+='<div class="ip-section"><div class="ip-section-title">📋 目前裝備</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">';
  for(var i=0;i<5;i++){
   var g=loadoutArr[i];
   var has=g&&ownedSet[g];
   html+='<div class="ip-card" data-slot="'+i+'" style="text-align:center;padding:14px 6px;min-height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;border-color:'+(has?'rgba(68,255,170,.4)':'rgba(255,255,255,.05)')+'">';
   html+='<div style="color:rgba(255,255,255,.3);font-size:10px;letter-spacing:2px">SLOT '+(i+1)+'</div>';
   html+='<div style="font-size:32px">'+(has?(gunIcons[g]||'🔫'):'<span style="font-size:22px;color:rgba(255,255,255,.15)">+</span>')+'</div>';
   html+='<div style="color:'+(has?'#4fa':'rgba(255,255,255,.25)')+';font-size:12px;font-weight:bold;letter-spacing:1px">'+(has?(gunNames[g]||g):'空')+'</div>';
   html+='</div>';
  }
  html+='</div></div>';
  html+='<div class="ip-section"><div class="ip-section-title">🗄 武器倉庫（點擊裝備）</div><div class="ip-grid">';
  guns.forEach(function(g){
   var isOwned=ownedSet[g];
   var count=inv[g]||0;
   var equipIdx=loadoutArr.indexOf(g);
   var borderColor=equipIdx!==-1?'rgba(68,255,170,.4)':'rgba(255,255,255,.08)';
   html+='<div class="ip-card armory-weapon" data-gun="'+g+'" style="border-color:'+borderColor+';cursor:'+(isOwned?'pointer':'default')+'">';
   html+='<div class="ip-card-head">';
   html+='<span class="ip-card-icon" style="font-size:28px">'+(gunIcons[g]||'🔫')+'</span>';
   html+='<span class="ip-card-name">'+(gunNames[g]||g)+'</span>';
   if(equipIdx!==-1)html+=_pnlTag('⭐ 裝備中 Slot'+(equipIdx+1),'#4fa');
   html+='</div>';
   html+='<div class="ip-card-desc">'+(gunDescs[g]||'')+'</div>';
   html+='<div class="ip-card-stats">';
   html+='<span class="ip-stat"><b>'+(gunStats[g]||'')+'</b></span>';
   if(count>0)html+='<span class="ip-stat">x'+count+'</span>';
   html+='</div>';
   html+='</div>';
  });
  html+='</div></div>';
  el.innerHTML=html;
  el.querySelectorAll('.armory-weapon').forEach(function(card){
   card.onclick=function(){
    var g=card.dataset.gun;
    if(!ownedSet[g])return;
    var existSlot=loadoutArr.indexOf(g);
    if(existSlot!==-1)return;
    for(var s=0;s<5;s++){if(!loadoutArr[s]||!ownedSet[loadoutArr[s]]){loadoutArr[s]=g;saveLoadout();renderPanel();return;}}
    loadoutArr[4]=g;saveLoadout();renderPanel();
   };
  });
  el.querySelectorAll('[data-slot]').forEach(function(slot){
   slot.onclick=function(){
    var si=parseInt(slot.dataset.slot);
    if(loadoutArr[si]){loadoutArr[si]=null;saveLoadout();renderPanel();}
   };
  });
 }
 renderPanel();
}
window.pnlArmoryGlobal=pnlArmoryGlobal;
window._pnlArmoryGlobal=pnlArmoryGlobal;
// ═══ DRAG ROTATION STATE ═══
var isDragging=false,dragSX=0,dragSY=0,dragMoved=false;
// ═══ END ═══
var MODES=[
 {id:'solo',name:'單人模式',desc:'solo 戰役',icon:'⚔',c1:'#5b8cff',c2:'#7fd0ff'},
 {id:'multi2',name:'多人 2P',desc:'1v1 對戰',icon:'👥',c1:'#ff6b81',c2:'#ffa07a'},
 {id:'multi4',name:'多人 4P',desc:'4 人混戰',icon:'⚔️',c1:'#e84a6f',c2:'#ff8fa3'},
 {id:'bossrush',name:'Boss Rush',desc:'Boss 連戰',icon:'💀',c1:'#8b2f4f',c2:'#d95d87'},
 {id:'ufo',name:'UFO 模式',desc:'UFO 來襲',icon:'🛸',c1:'#8a5be0',c2:'#c39bff'},
 {id:'bomb',name:'炸彈模式',desc:'炸彈大作戰',icon:'💣',c1:'#f2953f',c2:'#ffc46b'},
 {id:'party_obstacle',name:'障礙賽跑',desc:'趣味障礙賽',icon:'🏁',c1:'#ff7ab8',c2:'#ffb3de',partyType:'obstacle'},
 {id:'party_battle',name:'平台大亂鬥',desc:'平台混戰',icon:'⚔️',c1:'#ff6b81',c2:'#ffa07a',partyType:'battle'},
 {id:'party_target',name:'射擊得分',desc:'射靶挑戰',icon:'🎯',c1:'#e8c94a',c2:'#ffe98a',partyType:'target'},
 {id:'party_memory',name:'記憶翻牌',desc:'翻牌配對',icon:'🧠',c1:'#8a5be0',c2:'#c39bff',partyType:'memory'},
 {id:'party_coinrush',name:'金幣搶奪',desc:'搶金幣',icon:'💰',c1:'#3fbf7f',c2:'#7fe8b0',partyType:'coinrush'},
 {id:'extraction',name:'摸金模式',desc:'搜刮撤離',icon:'⛏',c1:'#a07a4a',c2:'#d4af7a',extraction:true},
 {id:'daily',name:'每日挑戰',desc:'每日隨機挑戰',icon:'📅',c1:'#e8c94a',c2:'#ffe98a'},
 {id:'range',name:'射擊靶場',desc:'訓練射擊技巧',icon:'🎯',c1:'#3fbf7f',c2:'#7fe8b0'}
];
var FN_MAP={'武器庫':'armory-btn','活動':'event-btn','賽季':'season-btn','排位':'rank-btn','商店':'shop-btn','技能':'skill-btn','成就':'ach-btn','排行榜':'lb-btn'};
function act(){return window._ocIslActive===true;}
function floatMsg(txt,color){
window._floatMsg=floatMsg;   // 跨作用域（floatMsg 在 doc 4816~6941 的 IIFE 內）
 var el=document.createElement('div');el.textContent=txt;
 el.style.cssText='position:fixed;top:70px;left:50%;transform:translateX(-50%);color:'+(color||'#4f4')+';font-size:18px;font-weight:bold;z-index:120;font-family:Arial;text-shadow:0 0 15px rgba(68,255,68,.4);letter-spacing:3px;pointer-events:none;transition:opacity .5s;background:rgba(10,10,30,.75);padding:10px 26px;border-radius:12px;border:1px solid rgba(255,255,255,.15)';
 document.body.appendChild(el);
 setTimeout(function(){el.style.opacity='0';},1600);
 setTimeout(function(){el.remove();},2200);
}
function launchSelected(){
 if(!selectedMode){window._ocIslOpenMode();return;}
 var nm=selectedMode.name,idv=selectedMode.id;
 window.ocIslandClose();
 var lbl=document.getElementById('menu-mode-btn-label');
 if(lbl)lbl.innerHTML=nm+' <span class="mode-arrow">▶</span>';
 floatMsg('🚀 正在進入 '+nm+' ...','#ffd97a');
 setTimeout(function(){
 if(idv==='extraction'){
   // 一律先開難度選擇（普通50%／機密100% 生成小黃石＋破譯站）
   if(window._extRequestStart)window._extRequestStart();else startExtractionMatchmaking();
   return;
  }
   if(idv==='party_obstacle'||idv==='party_battle'||idv==='party_target'||idv==='party_memory'||idv==='party_coinrush'){
    var ptype=selectedMode.partyType||idv.replace('party_','');
    if(window.showPartyCountSelect){window.showPartyCountSelect(ptype);return;}
   }
  if(idv==='range'){var rb=document.getElementById('range-btn');if(rb){rb.click();return;}}
  var mv={ufo:'ufo2',bomb:'bomb2'}[idv]||idv;
  var opt=document.querySelector('#mode-dropdown .mode-opt[data-mode="'+mv+'"]');
  var pb=document.getElementById('play-btn');
  if(opt&&pb){opt.click();pb.click();return;}
  window._floatMsg('⚠ 找不到 '+nm+' 的入口','#f66');
 },80);
}
function refreshIslInfo(){
 try{
  var c=document.getElementById('menu-coins'),lv=document.getElementById('level-num-menu');
  var pc=document.getElementById('isl-pi-coin'),pl=document.getElementById('isl-pi-lv'),pn=document.getElementById('isl-pi-name');
  if(pc)pc.textContent='🪙 $'+((c&&c.textContent)||'0');
  if(pl)pl.textContent='Lv.'+((lv&&lv.textContent)||'1');
  localNick=localStorage.getItem('oc_nickname')||'玩家';
  if(pn)pn.textContent=localNick;
 }catch(e){}
}
// ═══ REMOTE PLAYER MESH (cute big-head style) ═══
var REMOTE_SKINS=[0xffe0c8,0xf5cba0,0xe8b890];
var REMOTE_HAIRS=[0x5a4632,0x2f2a38,0xc88a4a,0x8a4a5a,0x4a6b8a,0xd8b878];
var REMOTE_OUTFITS=[0xff8ab8,0x7fa8ff,0x8ae0b0,0xffcf7a,0xc39bff,0xff9c7a,0x7fd6e8,0x4a7bff,0x4488ff,0xff4444,0x44ff44,0xff8800];
function nameSprite(txt){
 var cv=document.createElement('canvas');cv.width=256;cv.height=64;
 var cx=cv.getContext('2d');
 cx.font='bold 30px Arial';cx.textAlign='center';cx.textBaseline='middle';
 cx.shadowColor='rgba(0,0,0,0.5)';cx.shadowBlur=6;
 cx.fillStyle='#fff';cx.fillText(txt,128,32);
 var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
 sp.scale.set(1.6,0.4,1);return sp;
}
// ── 頭頂名稱（Nameplate）────────────────────────────────────
// 需求：顯示在角色頭頂、隨角色移動、始終朝向鏡頭、不可被地圖遮住、
//       與地圖背景保持足夠對比。
// 作法：canvas 文字 + 深色描邊（亮字/深描邊），再用 Sprite 掛在頭頂。
//   · Sprite 天生永遠面向鏡頭，不需要每幀 lookAt
//   · depthTest:false + renderOrder 999 → 不會被牆壁/箱子遮住
//   · depthWrite:false → 不會擋住後面的人
// AI 用綠色，真人用白色，並在名稱前加一個小標記方便一眼分辨。
var NAMEPLATE_Y=1.30;   // 頭頂高度（方晶身高約 0.87 + 留白）
window.NAMEPLATE_Y=NAMEPLATE_Y;   // 跨作用域（doc 4816~6941 的 IIFE 外看不到）
function makeNamePlate(txt,isAi){
  var label=String(txt||'?');
  var cv=document.createElement('canvas');
  cv.width=512;cv.height=128;
  var cx=cv.getContext('2d');
  cx.textAlign='center';cx.textBaseline='middle';
  cx.font='bold 54px "PingFang TC","Microsoft JhengHei",Arial,sans-serif';
  var main=isAi?'#7dff9e':'#ffffff';
  // 先畫粗描邊（深色），再畫本體 → 任何地圖背景上都讀得到
  cx.lineJoin='round';cx.miterLimit=2;
  cx.strokeStyle='rgba(0,0,0,0.92)';cx.lineWidth=12;
  cx.strokeText(label,256,64);
  cx.strokeStyle='rgba(0,0,0,0.55)';cx.lineWidth=4;
  cx.strokeText(label,256,64);
  // AI 在名字左邊加一個小方塊標記，跟真人有明顯外觀差異
  if(isAi){
    cx.fillStyle='rgba(0,0,0,0.92)';
    var w=cx.measureText(label).width;
    var bx=256-w/2-46;
    cx.fillRect(bx-6,46,26,36);
    cx.fillStyle='#7dff9e';
    cx.fillRect(bx,52,14,24);
  }
  cx.fillStyle=main;
  cx.fillText(label,256,64);
  var tex=new THREE.CanvasTexture(cv);
  tex.minFilter=THREE.LinearFilter;tex.generateMipmaps=false;
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({
    map:tex,transparent:true,depthTest:false,depthWrite:false,sizeAttenuation:true
  }));
  sp.renderOrder=999;
  sp.userData.baseScale=1.15;
  sp.scale.set(1.15,0.2875,1);
  return sp;
}
// 更新頭頂名稱：跟著角色走，並依距離微調大小（太遠時不要縮到看不見）
function updateNamePlate(sp,worldPos,visible){
  if(!sp)return;
  sp.visible=visible!==false;
  if(sp.visible){
    sp.position.set(worldPos.x,worldPos.y+NAMEPLATE_Y,worldPos.z);
    if(cam&&sp.userData.baseScale){
      var d=cam.position.distanceTo(sp.position);
      // 15m 以內維持原大小，之後緩慢變大避免遠處消失，但不超過 2.2 倍
      var k=Math.min(2.2,Math.max(1,d/15));
      var b=sp.userData.baseScale;
      sp.scale.set(b*k,b*0.25*k,1);
    }
  }
}

window._makeNamePlate=makeNamePlate;
window._updateNamePlate=updateNamePlate;   // 跨作用域保險（syncEnemyNameplates 在外層）
// AI 依建立順序取得穩定編號：AI-001、AI-002 …
function aiNameFor(index){return 'AI-'+String((index|0)+1).padStart(3,'0');}
window.aiNameFor=aiNameFor;   // 跨作用域也能取用
function createRemoteMesh(name,color){
  console.log('[Island] createRemoteMesh:',name,color);
 var g=new THREE.Group();
 var ci=Math.abs(hashStr(name))%REMOTE_SKINS.length;
 var hi=Math.abs(hashStr(name+1))%REMOTE_HAIRS.length;
 var oi=Math.abs(hashStr(name+2))%REMOTE_OUTFITS.length;
 var skin=new THREE.MeshStandardMaterial({color:REMOTE_SKINS[ci],roughness:0.65});
 var outfit=new THREE.MeshStandardMaterial({color:color||REMOTE_OUTFITS[oi],roughness:0.7});
 var hairM=new THREE.MeshStandardMaterial({color:REMOTE_HAIRS[hi],roughness:0.8});
 var body=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.36,0.66,10),outfit);
 body.position.y=0.58;body.castShadow=true;g.add(body);
 var head=new THREE.Mesh(new THREE.SphereGeometry(0.31,12,12),skin);
 head.position.y=1.16;head.castShadow=true;g.add(head);
 var hair=new THREE.Mesh(new THREE.SphereGeometry(0.325,12,10,0,6.28,0,1.7),hairM);
 hair.position.y=1.2;g.add(hair);
 for(var e=-1;e<=1;e+=2){
  var eye=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,6),new THREE.MeshBasicMaterial({color:0x303048}));
  eye.position.set(e*0.11,1.14,0.28);g.add(eye);
  var blush=new THREE.Mesh(new THREE.CircleGeometry(0.045,8),new THREE.MeshBasicMaterial({color:0xffb0c0,transparent:true,opacity:0.75}));
  blush.position.set(e*0.17,1.08,0.245);blush.rotation.y=e*-0.4;g.add(blush);
 }
 var smile=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.014,6,10,Math.PI),new THREE.MeshBasicMaterial({color:0xa05a5a}));
 smile.position.set(0,1.06,0.28);smile.rotation.z=Math.PI;g.add(smile);
 var armL=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.42,6),skin);
 armL.position.set(-0.32,0.75,0);armL.castShadow=true;g.add(armL);
 var armR=armL.clone();armR.position.x=0.32;g.add(armR);
 var legL=new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.065,0.32,6),new THREE.MeshStandardMaterial({color:0x2f3a5c}));
 legL.position.set(-0.12,0.17,0);legL.castShadow=true;g.add(legL);
 var legR=legL.clone();legR.position.x=0.12;g.add(legR);
 var tag=nameSprite(name);tag.position.y=1.85;g.add(tag);
 g.userData={armL:armL,armR:armR,legL:legL,legR:legR,body:body,head:head,
  targetX:0,targetZ:0,targetRot:0,ph:Math.random()*6.28};
 g.position.set(0,5,0);
 console.log('[Island] mesh added to scene, children:',g.children.length);
  scene.add(g);return g;
}
function hashStr(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return h;}
// ═══ WEBSOCKET LOBBY ═══
function wsConnect(){
 if(wsSocket&&wsSocket.readyState<=1)return;
 var proto=location.protocol==='https:'?'wss:':'ws:';
 var host=location.hostname||'localhost';
 var port=location.port||'8080';
 try{
  wsSocket=new WebSocket(proto+'//'+host+':'+port);
  wsSocket.onopen=function(){
   wsConnected=true;
   wsSend({type:'lobby_join',name:localNick,clientId:clientId});
   console.log('[Island WS] connected');
  };
  wsSocket.onmessage=function(ev){
   var d;try{d=JSON.parse(ev.data);}catch(e){return;}
   handleWsMsg(d);
  };
  wsSocket.onclose=function(){
   wsConnected=false;wsSocket=null;
   if(act())wsReconnectTimer=setTimeout(wsConnect,3000);
   console.log('[Island WS] disconnected');
  };
  wsSocket.onerror=function(){};
 }catch(e){console.log('[Island WS] connect error',e);}
}
function wsSend(obj){
 if(wsSocket&&wsSocket.readyState===1)wsSocket.send(JSON.stringify(obj));
}
function wsDisconnect(){
 clearTimeout(wsReconnectTimer);wsReconnectTimer=null;
 if(wsSocket){try{wsSocket.send(JSON.stringify({type:'lobby_leave'}));}catch(e){}}
 if(wsSocket){try{wsSocket.close();}catch(e){}}
 wsSocket=null;wsConnected=false;
 Object.keys(remotePlayers).forEach(function(cid){
  if(remotePlayers[cid]&&remotePlayers[cid].mesh)scene.remove(remotePlayers[cid].mesh);
  delete remotePlayers[cid];
 });
}
function handleWsMsg(d){
 switch(d.type){
  case 'lobby_state':
   console.log('[Island] lobby_state',d.players?.length,'players',d.players);
   (d.players||[]).forEach(function(p){
    if(p.clientId===clientId)return;
    if(!remotePlayers[p.clientId]){
     var m=createRemoteMesh(p.name,p.color);
     m.position.set(p.x||0,0,p.z||0);
     m.userData.targetX=p.x||0;m.userData.targetZ=p.z||0;m.userData.targetRot=p.rot||0;
     remotePlayers[p.clientId]={mesh:m,name:p.name};
    }
   });
   break;
  case 'lobby_player_join':
   console.log('[Island] player_join',d.name,d.clientId,d.color,'self=',clientId);
   if(d.clientId===clientId)break;
   if(!remotePlayers[d.clientId]){
    var m=createRemoteMesh(d.name,d.color);
    m.position.set(d.x||0,0,d.z||0);
    m.userData.targetX=d.x||0;m.userData.targetZ=d.z||0;m.userData.targetRot=d.rot||0;
    remotePlayers[d.clientId]={mesh:m,name:d.name};
    floatMsg('👋 '+d.name+' 來到了島嶼','#a78bff');
   }
   break;
  case 'lobby_player_pos':
   if(d.clientId===clientId)break;
   var rp=remotePlayers[d.clientId];
   if(rp){
    rp.mesh.userData.targetX=d.x;
    rp.mesh.userData.targetZ=d.z;
    rp.mesh.userData.targetRot=d.rot;
   }
   break;
  case 'lobby_player_leave':
   var rp=remotePlayers[d.clientId];
   if(rp){scene.remove(rp.mesh);delete remotePlayers[d.clientId];}
   break;
 }
}
function updateRemotePlayers(dt){
 Object.keys(remotePlayers).forEach(function(cid){
  var rp=remotePlayers[cid];if(!rp||!rp.mesh)return;
  var ud=rp.mesh.userData;
  var tx=ud.targetX,tz=ud.targetZ,tr=ud.targetRot;
  var cx=rp.mesh.position.x,cz=rp.mesh.position.z;
  var dx=tx-cx,dz=tz-cz;
  var dist=Math.sqrt(dx*dx+dz*dz);
  var moving=dist>0.05;
  rp.mesh.position.x+=(dx)*Math.min(1,dt*10);
  rp.mesh.position.z+=(dz)*Math.min(1,dt*10);
  rp.mesh.position.y=(window._ocIslTerrainH||function(){return 0;})(rp.mesh.position.x,rp.mesh.position.z)+0.02;
  var curRot=rp.mesh.rotation.y;
  var rd=tr-curRot;
  while(rd>Math.PI)rd-=6.283;while(rd<-Math.PI)rd+=6.283;
  rp.mesh.rotation.y+=rd*Math.min(1,dt*8);
  var t=clock.getElapsedTime();
  var s=1;
  if(moving){
   var wt=t*7*s;
   ud.armL.rotation.x=Math.sin(wt)*0.5;ud.armR.rotation.x=-Math.sin(wt)*0.5;
   ud.legL.rotation.x=-Math.sin(wt)*0.5;ud.legR.rotation.x=Math.sin(wt)*0.5;
  }else{
   ud.armL.rotation.x*=0.9;ud.armR.rotation.x*=0.9;
   ud.legL.rotation.x*=0.9;ud.legR.rotation.x*=0.9;
   ud.body.position.y=0.58+Math.sin(t*2+ud.ph)*0.015;
  }
 });
}
// ═══ MAIN BOOT ═══
function boot(){
 MOON=(localStorage.getItem('oc_isl_map')==='moon');
 renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setSize(window.innerWidth,window.innerHeight);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.15;
 renderer.domElement.className='gl';
 rootEl.insertBefore(renderer.domElement,rootEl.firstChild);

 scene=new THREE.Scene();
 if(MOON){
  scene.background=new THREE.Color(0x020308);
  var starGeo=new THREE.BufferGeometry();
  var sp=[];for(var i=0;i<1800;i++){var t=Math.random()*Math.PI*2,p=Math.acos(Math.random()*2-1),r=400;sp.push(r*Math.sin(p)*Math.cos(t),r*Math.cos(p),r*Math.sin(p)*Math.sin(t));}
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:1.3,sizeAttenuation:false,transparent:true,opacity:0.9})));
  moonEarth=new THREE.Mesh(new THREE.SphereGeometry(15,40,40),new THREE.MeshStandardMaterial({color:0x2a6fc8,roughness:0.7}));
  moonEarth.position.set(-100,85,-150);scene.add(moonEarth);
  var landM=new THREE.Mesh(new THREE.SphereGeometry(15.06,18,18),new THREE.MeshStandardMaterial({color:0x3d8f4e,roughness:0.8}));
  landM.scale.set(0.99,0.72,1.01);landM.rotation.z=0.42;moonEarth.add(landM);
  var atm=new THREE.Mesh(new THREE.SphereGeometry(16.3,40,40),new THREE.MeshBasicMaterial({color:0x66aaff,transparent:true,opacity:0.16,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  atm.position.copy(moonEarth.position);scene.add(atm);
  var gCv=document.createElement('canvas');gCv.width=gCv.height=128;var gg=gCv.getContext('2d');
  var gr=gg.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,250,230,1)');gr.addColorStop(0.3,'rgba(255,240,200,0.8)');gr.addColorStop(1,'rgba(255,220,160,0)');
  gg.fillStyle=gr;gg.fillRect(0,0,128,128);
  var sunSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(gCv),transparent:true,depthWrite:false}));
  sunSpr.scale.set(46,46,1);sunSpr.position.set(120,130,-90);scene.add(sunSpr);
  scene.add(new THREE.AmbientLight(0x8899bb,0.55));
  var sunL=new THREE.DirectionalLight(0xfff4e0,1.5);
  sunL.position.set(-60,80,60);sunL.castShadow=true;
  sunL.shadow.mapSize.set(2048,2048);
  sunL.shadow.camera.near=10;sunL.shadow.camera.far=260;
  sunL.shadow.camera.left=-70;sunL.shadow.camera.right=70;
  sunL.shadow.camera.top=70;sunL.shadow.camera.bottom=-70;
  scene.add(sunL);
 }else{
  scene.fog=new THREE.Fog(0xcfe3ff,70,190);
  var skyM=new THREE.ShaderMaterial({
   uniforms:{top:{value:new THREE.Color(0x7fb2ff)},mid:{value:new THREE.Color(0xb8dcff)},bot:{value:new THREE.Color(0xffdcec)}},
   vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform vec3 top,mid,bot;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(bot,mid,smoothstep(-0.05,0.25,h));c=mix(c,top,smoothstep(0.25,0.85,h));gl_FragColor=vec4(c,1.0);}',
   side:THREE.BackSide,depthWrite:false});
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(220,32,16),skyM));
  var sun=new THREE.Mesh(new THREE.SphereGeometry(6,16,16),new THREE.MeshBasicMaterial({color:0xfff3c8}));
  sun.position.set(90,80,-110);scene.add(sun);
  var halo=new THREE.Mesh(new THREE.SphereGeometry(11,16,16),new THREE.MeshBasicMaterial({color:0xfff3c8,transparent:true,opacity:0.18}));
  halo.position.copy(sun.position);scene.add(halo);
  scene.add(new THREE.AmbientLight(0xfff0e0,0.75));
  var sunL=new THREE.DirectionalLight(0xffeedd,1.35);
  sunL.position.set(60,80,-70);sunL.castShadow=true;
  sunL.shadow.mapSize.set(2048,2048);
  sunL.shadow.camera.near=10;sunL.shadow.camera.far=260;
  sunL.shadow.camera.left=-70;sunL.shadow.camera.right=70;
  sunL.shadow.camera.top=70;sunL.shadow.camera.bottom=-70;
  scene.add(sunL);
  scene.add(new THREE.HemisphereLight(0xbfe0ff,0x88bb77,0.55));
 }

 var flatSpots=[
  {x:0,z:0,r:10,y:0.6},{x:0,z:42,r:8,y:0.5},
  {x:19,z:-6,r:8,y:1.4},{x:-17,z:8,r:8,y:0.7},
  {x:8,z:-27,r:7,y:2.2},{x:-10,z:-20,r:6,y:1.6},
  {x:26,z:14,r:5,y:1.2},{x:-26,z:-12,r:5,y:1.5},
  {x:0,z:-34,r:9,y:5.2},{x:30,z:-20,r:5,y:2.0},{x:-30,z:22,r:5,y:1.0}
 ];
  function terrainH(x,z){
   var d=Math.sqrt(x*x+z*z);
   if(d>78)return -2.5+(78-d)*0.06;
   var falloff=Math.max(0,1-Math.pow(d/76,2.2));
   var h=(Math.sin(x*0.055)*Math.cos(z*0.048)*2.6+Math.sin(x*0.1+z*0.07)*1.3+Math.cos(z*0.09-x*0.03)*1.6+3.2)*falloff-0.6;
  var md=Math.sqrt(Math.max(0,(x)*(x+2)+(z+36)*(z+36)));
  h+=Math.max(0,1-md/20)*7.5;
  for(var i=0;i<flatSpots.length;i++){
   var f=flatSpots[i],fd=Math.sqrt((x-f.x)*(x-f.x)+(z-f.z)*(z-f.z));
   if(fd<f.r){var t=1-fd/f.r;t=t*t*(3-2*t);h=h*(1-t)+f.y*t;}
  }
  return h;
 }
 window._ocIslTerrainH=terrainH;
 var terrGeo=new THREE.PlaneGeometry(150,150,110,110);
 terrGeo.rotateX(-Math.PI/2);
 var posA=terrGeo.attributes.position;
 var colA=new Float32Array(posA.count*3);
 var cSand,cGrass1,cGrass2,cHi,cRock;
 if(MOON){cSand=new THREE.Color(0x8a8a90);cGrass1=new THREE.Color(0x9a9aa2);cGrass2=new THREE.Color(0x77777e);cHi=new THREE.Color(0xb0b0b8);cRock=new THREE.Color(0x5c5c64);}
 else{cSand=new THREE.Color(0xf5e6bd);cGrass1=new THREE.Color(0x8fdc8f);cGrass2=new THREE.Color(0x53b96e);cHi=new THREE.Color(0xa8d8a0);cRock=new THREE.Color(0xb9aed0);}
 for(var i=0;i<posA.count;i++){
  var x=posA.getX(i),z=posA.getZ(i);
  var h=terrainH(x,z);
  posA.setY(i,h);
  var c;
  if(h<0.55)c=cSand.clone();
  else{
   var t=Math.min(1,(h-0.55)/4);
   c=cGrass1.clone().lerp(cGrass2,t);
   if(h>6)c.lerp(cHi,Math.min(1,(h-6)/4));
   if(h>9)c.lerp(cRock,Math.min(1,(h-9)/4));
  }
  c.offsetHSL(0,0,(Math.random()-0.5)*0.035);
  colA[i*3]=c.r;colA[i*3+1]=c.g;colA[i*3+2]=c.b;
 }
 terrGeo.setAttribute('color',new THREE.BufferAttribute(colA,3));
 terrGeo.computeVertexNormals();
 var terrain=new THREE.Mesh(terrGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95}));
 terrain.receiveShadow=true;
 scene.add(terrain);

 waterGeo=new THREE.PlaneGeometry(600,600,56,56);
 var clouds=[];
 function buildMoonDecor(){
  var y0=terrainH(0,0);
  var metalM=new THREE.MeshStandardMaterial({color:0x9aa3b5,metalness:0.72,roughness:0.32});
  var darkM=new THREE.MeshStandardMaterial({color:0x39404e,metalness:0.55,roughness:0.42});
  var whiteM=new THREE.MeshStandardMaterial({color:0xe8ecf4,roughness:0.45,metalness:0.25});
  var R=11;
  var gridCv=document.createElement('canvas');gridCv.width=gridCv.height=256;
  var gc=gridCv.getContext('2d');gc.fillStyle='#494f5c';gc.fillRect(0,0,256,256);
  gc.strokeStyle='rgba(120,200,255,0.25)';gc.lineWidth=1.5;
  for(var i=0;i<=4;i++){gc.beginPath();gc.moveTo(i*64,0);gc.lineTo(i*64,256);gc.stroke();gc.beginPath();gc.moveTo(0,i*64);gc.lineTo(256,i*64);gc.stroke();}
  var floor=new THREE.Mesh(new THREE.CircleGeometry(R,48),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(gridCv),roughness:0.5,metalness:0.35}));
  floor.rotation.x=-Math.PI/2;floor.position.set(0,y0+0.06,0);floor.receiveShadow=true;scene.add(floor);
  var dome=new THREE.Mesh(new THREE.SphereGeometry(R,40,20,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xbfd8ff,transparent:true,opacity:0.12,roughness:0.08,side:THREE.DoubleSide}));
  dome.position.y=y0+0.05;scene.add(dome);
  var rim=new THREE.Mesh(new THREE.TorusGeometry(R,0.22,10,48),metalM);
  rim.rotation.x=Math.PI/2;rim.position.y=y0+0.08;rim.castShadow=true;scene.add(rim);
  for(var i=0;i<10;i++){
   var rib=new THREE.Mesh(new THREE.TorusGeometry(R,0.07,6,30,Math.PI/2),metalM);
   rib.position.y=y0+0.06;rib.rotation.set(Math.PI/2,0,i/10*Math.PI*2-Math.PI/2);scene.add(rib);
  }
  var cap=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),new THREE.MeshStandardMaterial({color:0x88ddff,emissive:0x2288aa,emissiveIntensity:0.8,metalness:0.6,roughness:0.2}));
  cap.position.set(0,y0+R*0.92,0);scene.add(cap);
  var capL=new THREE.PointLight(0xaaddff,0.8,26);capL.position.copy(cap.position);capL.position.y-=1;scene.add(capL);
  for(var i=0;i<4;i++){
   var aa=i/4*Math.PI*2+0.4;
   var lt=new THREE.PointLight(0xfff2dd,0.6,16);
   lt.position.set(Math.cos(aa)*5,y0+3.6,Math.sin(aa)*5);scene.add(lt);
   var bulb=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8),new THREE.MeshBasicMaterial({color:0xfff4cf}));
   bulb.position.copy(lt.position);scene.add(bulb);
  }
  var desk=new THREE.Mesh(new THREE.BoxGeometry(3.6,1,1.1),darkM);
  desk.position.set(0,y0+0.55,-6.2);desk.castShadow=true;scene.add(desk);
  var scrCols=[0x33ccff,0xff9944,0x66ff99];
  for(var i=-1;i<=1;i++){
   var fr=new THREE.Mesh(new THREE.BoxGeometry(1.18,0.85,0.06),new THREE.MeshStandardMaterial({color:0x23272f}));
   fr.position.set(i*1.18,y0+1.4,-6.32);fr.rotation.x=-0.28;scene.add(fr);
   var sc=new THREE.Mesh(new THREE.PlaneGeometry(1.02,0.68),new THREE.MeshBasicMaterial({color:scrCols[i+1]}));
   sc.position.set(i*1.18,y0+1.41,-6.28);sc.rotation.x=-0.28;scene.add(sc);
   var gl=new THREE.PointLight(scrCols[i+1],0.5,4);gl.position.set(i*1.18,y0+1.5,-5.8);scene.add(gl);
  }
  var stripCv=document.createElement('canvas');stripCv.width=512;stripCv.height=48;
  var wc=stripCv.getContext('2d');wc.fillStyle='#06101f';wc.fillRect(0,0,512,48);
  for(var i=0;i<22;i++){wc.fillStyle=i%3?'rgba(80,200,255,'+(0.3+Math.random()*0.5)+')':'rgba(255,170,80,0.85)';wc.fillRect(i*23+4,6+Math.random()*8,14,5+Math.random()*16);}
  var strip=new THREE.Mesh(new THREE.PlaneGeometry(8,0.75),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(stripCv)}));
  strip.position.set(0,y0+2.7,-10.6);scene.add(strip);
  for(var bi=0;bi<2;bi++){
   var bed=new THREE.Group();
   var bf=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.4,0.94),darkM);bed.add(bf);
   var mt=new THREE.Mesh(new THREE.BoxGeometry(1.76,0.16,0.82),whiteM);mt.position.y=0.28;bed.add(mt);
   var pw=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.12,0.58),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.95}));pw.position.set(-0.58,0.42,0);bed.add(pw);
   var bl=new THREE.Mesh(new THREE.BoxGeometry(1.05,0.06,0.84),new THREE.MeshStandardMaterial({color:0x4477cc,roughness:0.9}));bl.position.set(0.3,0.38,0);bed.add(bl);
   bed.position.set(-7.6,y0+0.25+bi*1.25,-3.4);bed.rotation.y=Math.PI/2;
   bed.traverse(function(o){if(o.isMesh)o.castShadow=true;});scene.add(bed);
  }
  var tbl=new THREE.Group();
  var tt=new THREE.Mesh(new THREE.CylinderGeometry(1,1,0.09,24),whiteM);tt.position.y=0.76;tt.castShadow=true;tbl.add(tt);
  var lg=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.14,0.74,12),metalM);lg.position.y=0.36;tbl.add(lg);
  tbl.position.set(2.6,y0+0.05,3.4);scene.add(tbl);
  for(var ci=0;ci<2;ci++){
   var ch=new THREE.Group();
   var cs=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.07,0.46),metalM);ch.add(cs);
   var cb=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.52,0.07),metalM);cb.position.set(0,0.28,-0.19);ch.add(cb);
   ch.position.set(2.6+(ci===0?-1.5:1.5),y0+0.24,3.4);
   ch.lookAt(2.6,y0+0.24,3.4);
   ch.traverse(function(o){if(o.isMesh)o.castShadow=true;});scene.add(ch);
  }
  var hydLegs=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.95,0.7),darkM);
  hydLegs.position.set(7.4,y0+0.53,1.5);hydLegs.castShadow=true;scene.add(hydLegs);
  var shelf=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.1,0.9),metalM);
  shelf.position.set(7.4,y0+1.06,1.5);shelf.castShadow=true;scene.add(shelf);
  var grow=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.05,0.7),new THREE.MeshBasicMaterial({color:0xff66dd}));
  grow.position.set(7.4,y0+1.85,1.5);scene.add(grow);
  var glowL=new THREE.PointLight(0xff66dd,0.9,6);glowL.position.set(7.4,y0+1.65,1.5);scene.add(glowL);
  for(var pi=-1;pi<=1;pi++){
   var pot=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.12,0.22,10),new THREE.MeshStandardMaterial({color:0x8a6a4a,roughness:0.8}));
   pot.position.set(7.4+pi*0.8,y0+1.22,1.5);pot.castShadow=true;scene.add(pot);
   var leaf=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8),new THREE.MeshStandardMaterial({color:0x44bb55,roughness:0.7,flatShading:true}));
   leaf.position.set(7.4+pi*0.8,y0+1.48,1.5);leaf.scale.y=1.5;leaf.castShadow=true;scene.add(leaf);
  }
  for(var li=0;li<4;li++){
   var lk=new THREE.Mesh(new THREE.BoxGeometry(0.7,2.1,0.5),li%2?darkM:whiteM);
   lk.position.set(-4.5+(li-1.5)*0.76,y0+1.1,-7.6);lk.castShadow=true;scene.add(lk);
  }
  var fg=new THREE.Group();
  var pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,4.2,8),metalM);
  pole.position.y=2.1;pole.castShadow=true;fg.add(pole);
  var clothGeo=new THREE.PlaneGeometry(1.7,1.05,10,5);clothGeo.translate(0.85,0,0);
  var cloth=new THREE.Mesh(clothGeo,new THREE.MeshStandardMaterial({color:0xff4444,side:THREE.DoubleSide,roughness:0.8}));
  cloth.position.y=3.45;cloth.castShadow=true;fg.add(cloth);
  moonFlag={mesh:cloth,base:clothGeo.attributes.position.clone()};
  fg.position.set(14,terrainH(14,18),18);fg.rotation.y=0.5;scene.add(fg);
  var padY=terrainH(0,-34);
  var pad=new THREE.Mesh(new THREE.CylinderGeometry(8,8.6,0.5,32),new THREE.MeshStandardMaterial({color:0x3a3f4a,roughness:0.6,metalness:0.5}));
  pad.position.set(0,padY+0.2,-34);pad.receiveShadow=true;scene.add(pad);
  var padRing=new THREE.Mesh(new THREE.TorusGeometry(7.2,0.14,8,40),new THREE.MeshBasicMaterial({color:0xffaa33}));
  padRing.rotation.x=Math.PI/2;padRing.position.set(0,padY+0.48,-34);scene.add(padRing);
  for(var i=0;i<8;i++){
   var aa=i/8*Math.PI*2;
   var pb=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8),new THREE.MeshBasicMaterial({color:0xffcc66}));
   pb.position.set(Math.cos(aa)*6.6,padY+0.55,-34+Math.sin(aa)*6.6);scene.add(pb);
  }
  var rv=new THREE.Group();
  var rb=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.55,1.5),new THREE.MeshStandardMaterial({color:0xd8b23a,metalness:0.45,roughness:0.5}));
  rb.position.y=0.75;rb.castShadow=true;rv.add(rb);
  var rc=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.6,1.3),darkM);rc.position.set(-0.2,1.28,0);rc.castShadow=true;rv.add(rc);
  for(var wi=0;wi<4;wi++){
   var wg=new THREE.CylinderGeometry(0.42,0.42,0.3,12);wg.rotateZ(Math.PI/2);
   var w=new THREE.Mesh(wg,new THREE.MeshStandardMaterial({color:0x2c2f36,roughness:0.9}));
   w.position.set(wi%2===0?0.95:-0.95,0.42,(wi<2?0.82:-0.82));w.castShadow=true;rv.add(w);
  }
   rv.position.set(2.2,padY+0.05,-31);rv.rotation.y=0.6;scene.add(rv);
   window._moonRover={mesh:rv,pos:new THREE.Vector3(2.2,padY+0.05,-31),yaw:0.6,speed:0,roty:0};
  var ghY=terrainH(19,-6);
  var ghShell=new THREE.Mesh(new THREE.SphereGeometry(4.4,24,14,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xaaffcc,transparent:true,opacity:0.15,roughness:0.1,side:THREE.DoubleSide}));
  ghShell.position.set(19,ghY,-6);scene.add(ghShell);
  var ghRing=new THREE.Mesh(new THREE.TorusGeometry(4.4,0.12,8,36),metalM);
  ghRing.rotation.x=Math.PI/2;ghRing.position.set(19,ghY+0.05,-6);scene.add(ghRing);
  for(var gi=0;gi<2;gi++){
   var soil=new THREE.Mesh(new THREE.BoxGeometry(5.6,0.35,0.85),new THREE.MeshStandardMaterial({color:0x4a3828,roughness:1}));
   soil.position.set(19,ghY+0.2,-7.2+gi*2.4);soil.receiveShadow=true;scene.add(soil);
   for(var pj=0;pj<6;pj++){
    var pl=new THREE.Mesh(new THREE.SphereGeometry(0.17,8,8),new THREE.MeshStandardMaterial({color:(gi+pj)%2?0xff6688:0x44bb55,roughness:0.7,flatShading:true}));
    pl.position.set(16.8+pj*0.88,ghY+0.55,-7.2+gi*2.4);pl.scale.y=1.4;pl.castShadow=true;scene.add(pl);
   }
  }
  var gb=new THREE.Mesh(new THREE.BoxGeometry(5,0.05,0.4),new THREE.MeshBasicMaterial({color:0xff88ee}));
  gb.position.set(19,ghY+2.2,-6);scene.add(gb);
  var gp=new THREE.PointLight(0xff88ee,0.9,10);gp.position.set(19,ghY+2,-6);scene.add(gp);
  var rockM=new THREE.MeshStandardMaterial({color:0x777779,roughness:1,flatShading:true});
  for(var ri=0;ri<26;ri++){
   var ra=Math.random()*6.28,rr=14+Math.random()*40;
   var rx=Math.cos(ra)*rr,rz=Math.sin(ra)*rr;
   if(Math.hypot(rx-19,rz+6)<6||Math.hypot(rx,rz+34)<11)continue;
   var rs=0.5+Math.random()*1.8;
   var rk=new THREE.Mesh(new THREE.DodecahedronGeometry(rs,0),rockM);
   rk.position.set(rx,terrainH(rx,rz)+rs*0.3,rz);
   rk.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
   rk.castShadow=true;rk.receiveShadow=true;scene.add(rk);
  }
  var crateCols=[0xff8833,0xffbb33,0x66aaff];
  for(var cri=0;cri<6;cri++){
   var cx=10+(Math.random()-0.5)*8,cz=-27+(Math.random()-0.5)*6;
   var cs=0.7+Math.random()*0.6;
   var crate=new THREE.Mesh(new THREE.BoxGeometry(cs,cs,cs),new THREE.MeshStandardMaterial({color:crateCols[cri%3],roughness:0.7,metalness:0.2}));
   crate.position.set(cx,terrainH(cx,cz)+cs/2,cz);
   crate.rotation.y=Math.random()*3;crate.castShadow=true;crate.receiveShadow=true;scene.add(crate);
  }
  for(var ai=0;ai<12;ai++){
   var pa=ai/12*Math.PI*2;
   var px=Math.cos(pa)*13,pz=Math.sin(pa)*13;
   var post=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.7,6),metalM);
   post.position.set(px,terrainH(px,pz)+0.35,pz);post.castShadow=true;scene.add(post);
   var pbulb=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshBasicMaterial({color:0x66ddff}));
   pbulb.position.set(px,terrainH(px,pz)+0.76,pz);scene.add(pbulb);
   }
   window._moonInteractPos={
    rover:new THREE.Vector3(2.2,padY+0.05,-31),
    pad:new THREE.Vector3(0,padY+0.2,-34),
    greenhouse:new THREE.Vector3(19,terrainH(19,-6),-6),
    flag:new THREE.Vector3(14,terrainH(14,18),18)
   };
   moonTick=function(t,dt){
   if(moonEarth)moonEarth.rotation.y+=dt*0.03;
   if(moonFlag){
    var p=moonFlag.mesh.geometry.attributes.position,b=moonFlag.base;
    for(var i=0;i<p.count;i++){var bx=b.getX(i);p.setZ(i,Math.sin(bx*3+t*3.2)*0.09*(bx/1.7+0.05)*1.6);}
    p.needsUpdate=true;
   }
   if(cap)cap.material.emissiveIntensity=0.7+Math.sin(t*2)*0.25;
  };
 }

 if(!MOON){
   waterGeo=new THREE.PlaneGeometry(600,600,56,56);
  waterVerts=waterGeo.attributes.position;
  var ocean=new THREE.Mesh(waterGeo,new THREE.MeshStandardMaterial({color:0x4db8e8,transparent:true,opacity:0.82,roughness:0.12,metalness:0.15}));
  ocean.rotation.x=-Math.PI/2;ocean.position.y=-0.35;
  scene.add(ocean);

  function farIsland(x,z,s,pinkish){
   var g=new THREE.Group();
   var base=new THREE.Mesh(new THREE.ConeGeometry(10*s,9*s,7),new THREE.MeshStandardMaterial({color:pinkish?0xd8b8d8:0xa8c8a8,roughness:1}));
   base.position.y=2*s;g.add(base);
   for(var i=0;i<4;i++){
    var a=Math.random()*6.28,r=Math.random()*6*s;
    var blob=new THREE.Mesh(new THREE.SphereGeometry((1.5+Math.random()*1.5)*s,6,5),new THREE.MeshStandardMaterial({color:pinkish?0xe8b8d0:0x88c888,roughness:1}));
    blob.position.set(Math.cos(a)*r,7.5*s,Math.sin(a)*r);g.add(blob);
   }
   g.position.set(x,-1.5,z);return g;
  }
  scene.add(farIsland(95,-70,1.6,false));
  scene.add(farIsland(-105,-40,1.2,true));
  scene.add(farIsland(-80,75,1.4,false));
  scene.add(farIsland(70,95,1.1,true));
  scene.add(farIsland(130,30,1.8,false));
  scene.add(farIsland(-140,10,1.5,true));

  clouds.length=0;
  for(var i=0;i<16;i++){
   var cg=new THREE.Group();
   var cm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:0.85});
   for(var j=0;j<5;j++){
    var s=new THREE.Mesh(new THREE.SphereGeometry(1+Math.random()*2,7,6),cm);
    s.position.set((Math.random()-0.5)*6,(Math.random()-0.5)*1.2,(Math.random()-0.5)*4);
    s.scale.y=0.5;cg.add(s);
   }
   cg.position.set((Math.random()-0.5)*300,32+Math.random()*26,(Math.random()-0.5)*300);
   cg.userData={sx:cg.position.x,sp:0.4+Math.random()*0.8};
   scene.add(cg);clouds.push(cg);
  }

  var M={
   trunk:new THREE.MeshStandardMaterial({color:0x9a6b4f,roughness:0.85}),
   leafG:new THREE.MeshStandardMaterial({color:0x66cc77,roughness:0.8}),
   leafD:new THREE.MeshStandardMaterial({color:0x44aa66,roughness:0.8}),
   sakura:new THREE.MeshStandardMaterial({color:0xffb7d5,roughness:0.75}),
   sakuraD:new THREE.MeshStandardMaterial({color:0xff9cc4,roughness:0.75}),
   rock:new THREE.MeshStandardMaterial({color:0xb0a8c8,roughness:0.9}),
   wood:new THREE.MeshStandardMaterial({color:0xc99a6a,roughness:0.8}),
   woodD:new THREE.MeshStandardMaterial({color:0xa87b52,roughness:0.8}),
   white:new THREE.MeshStandardMaterial({color:0xfff6f0,roughness:0.55}),
   cream:new THREE.MeshStandardMaterial({color:0xfdf3df,roughness:0.7}),
   path:new THREE.MeshStandardMaterial({color:0xf2e8d5,roughness:0.85}),
   stone:new THREE.MeshStandardMaterial({color:0xd8d2e8,roughness:0.8}),
   lampGlow:new THREE.MeshBasicMaterial({color:0xffe9a8}),
   water:new THREE.MeshStandardMaterial({color:0x58c8ee,transparent:true,opacity:0.85,roughness:0.1}),
   waterfall:new THREE.MeshBasicMaterial({color:0xbfeaff,transparent:true,opacity:0.55}),
   foam:new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85})
  };

  function addPath(x1,z1,x2,z2,w){
   var dx=x2-x1,dz=z2-z1,len=Math.sqrt(dx*dx+dz*dz);
   var segs=Math.ceil(len/1.6);
   for(var i=0;i<=segs;i++){
    var t=i/segs,px=x1+dx*t,pz=z1+dz*t;
    var st=new THREE.Mesh(new THREE.BoxGeometry(w*(0.85+Math.random()*0.3),0.1,w*(0.7+Math.random()*0.4)),M.path);
    st.position.set(px+(Math.random()-0.5)*0.2,terrainH(px,pz)+0.03,pz+(Math.random()-0.5)*0.2);
    st.rotation.y=Math.atan2(dz,dx)+Math.random()*0.25;
    st.receiveShadow=true;scene.add(st);
   }
  }
  addPath(0,38,0,4,2.2);addPath(0,4,17,-4,1.8);addPath(0,4,-15,7,1.8);
  addPath(0,4,7,-24,1.8);addPath(0,4,-9,-18,1.6);addPath(17,-4,25,12,1.4);
  addPath(-15,7,-24,20,1.4);addPath(0,4,0,-30,1.8);

  var plaza=new THREE.Mesh(new THREE.CircleGeometry(9,36),M.stone);
  plaza.rotation.x=-Math.PI/2;plaza.position.y=terrainH(0,0)+0.06;plaza.receiveShadow=true;scene.add(plaza);

  function tree(x,z,type,s){
   s=s||(0.8+Math.random()*0.6);
   var g=new THREE.Group();
   var h=(2.2+Math.random()*1.2)*s;
   var trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.16*s,0.24*s,h,6),M.trunk);
   trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);
   var mats=type==='sakura'?[M.sakura,M.sakuraD]:[M.leafG,M.leafD];
   var n=type==='sakura'?4:3;
   for(var i=0;i<n;i++){
    var r=(1.1+Math.random()*0.9)*s;
    var blob=new THREE.Mesh(new THREE.SphereGeometry(r,8,7),mats[i%mats.length]);
    blob.position.set((Math.random()-0.5)*r,h+r*0.55+(Math.random()-0.5)*0.5,(Math.random()-0.5)*r);
    blob.castShadow=true;g.add(blob);
   }
   g.position.set(x,terrainH(x,z)-0.05,z);return g;
  }
  var treeSpots=[
   [12,10],[14,7,'sakura'],[-12,12],[-13,9,'sakura'],[9,-12],[-9,-13,'sakura'],
   [22,-2],[23,-9],[-22,-4],[-21,3],[6,20],[-6,21],[16,16],[-16,17],
   [28,-16],[30,-24],[-28,-18],[33,6],[-31,10],[10,30],[24,26],[-24,28],
   [-8,-28,'sakura'],[14,-30],[-18,-26],[36,-8],[-36,-2],[4,-40]
  ];
  treeSpots.forEach(function(t){scene.add(tree(t[0],t[1],t[2]));});

  for(var i=0;i<55;i++){
   var a=Math.random()*6.28,r=6+Math.random()*40;
   var x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(Math.abs(x)<3&&z>2&&z<40)continue;
   var b=new THREE.Mesh(new THREE.SphereGeometry(0.35+Math.random()*0.4,6,5),Math.random()<0.25?M.sakura:M.leafG);
   b.scale.y=0.7;b.position.set(x,terrainH(x,z)+0.2,z);b.castShadow=true;scene.add(b);
  }
  var flowerCols=[0xff8ab8,0xffd36f,0xa78bff,0x7fd6ff,0xffffff,0xff9c9c];
  for(var i=0;i<110;i++){
   var a=Math.random()*6.28,r=5+Math.random()*42;
   var x=Math.cos(a)*r,z=Math.sin(a)*r;
   var fl=new THREE.Group();
   var stem=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.02,0.3,4),M.leafG);
   stem.position.y=0.15;fl.add(stem);
   var head=new THREE.Mesh(new THREE.SphereGeometry(0.07,5,4),new THREE.MeshBasicMaterial({color:flowerCols[i%flowerCols.length]}));
   head.position.y=0.32;fl.add(head);
   fl.position.set(x,terrainH(x,z),z);scene.add(fl);
  }
  for(var i=0;i<26;i++){
   var a=Math.random()*6.28,r=8+Math.random()*38;
   var x=Math.cos(a)*r,z=Math.sin(a)*r;
   var rk=new THREE.Mesh(new THREE.DodecahedronGeometry(0.3+Math.random()*0.7,0),M.rock);
   rk.position.set(x,terrainH(x,z)+0.15,z);
   rk.rotation.set(Math.random(),Math.random(),Math.random());
   rk.castShadow=true;scene.add(rk);
  }

  (function(){
   var g=new THREE.Group();var y=terrainH(0,0);
   var basin=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.9,0.7,20),M.cream);
   basin.position.y=y+0.35;basin.castShadow=true;g.add(basin);
   var wtr=new THREE.Mesh(new THREE.CircleGeometry(2.3,20),M.water);
   wtr.rotation.x=-Math.PI/2;wtr.position.y=y+0.68;g.add(wtr);
   var pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.3,1.6,10),M.cream);
   pillar.position.y=y+1.4;pillar.castShadow=true;g.add(pillar);
   var bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.5,0.3,12),M.cream);
   bowl.position.y=y+2.2;g.add(bowl);
   var orb=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,10),new THREE.MeshBasicMaterial({color:0x9fd8ff}));
   orb.position.y=y+2.7;g.add(orb);
   for(var i=0;i<14;i++){
    var d=new THREE.Mesh(new THREE.SphereGeometry(0.05,4,4),M.foam.clone());
    d.userData={ph:i/14*6.28,r:0.5+Math.random()*0.7};
    g.add(d);droplets.push(d);
   }
   var lt=new THREE.PointLight(0x9fd8ff,1.2,10);lt.position.y=y+3;g.add(lt);
   scene.add(g);
  })();

  function house(x,z,ry,bodyC,roofC,s){
   s=s||1;
   var g=new THREE.Group();
   var body=new THREE.Mesh(new THREE.BoxGeometry(4*s,2.6*s,3.4*s),new THREE.MeshStandardMaterial({color:bodyC,roughness:0.7}));
   body.position.y=1.3*s;body.castShadow=true;body.receiveShadow=true;g.add(body);
   var roof=new THREE.Mesh(new THREE.ConeGeometry(3.1*s,2*s,4),new THREE.MeshStandardMaterial({color:roofC,roughness:0.65}));
   roof.position.y=3.2*s;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
   var door=new THREE.Mesh(new THREE.BoxGeometry(0.8*s,1.4*s,0.08),M.woodD);
   door.position.set(0,0.7*s,1.71*s);g.add(door);
   for(var i=-1;i<=1;i+=2){
    var win=new THREE.Mesh(new THREE.BoxGeometry(0.7*s,0.7*s,0.06),new THREE.MeshStandardMaterial({color:0xbfe8ff,emissive:0x88ccdd,emissiveIntensity:0.25}));
    win.position.set(i*1.1*s,1.6*s,1.71*s);g.add(win);
   }
   var chim=new THREE.Mesh(new THREE.BoxGeometry(0.4*s,1*s,0.4*s),M.stone);
   chim.position.set(1.2*s,3.6*s,-0.6*s);g.add(chim);
   g.position.set(x,terrainH(x,z),z);g.rotation.y=ry||0;return g;
  }
  scene.add(house(19,-8,0.4,0xfff0f0,0xff9cb8,1));
  scene.add(house(23,-2,-0.3,0xf0f5ff,0x8fb8f5,0.9));
  scene.add(house(16,-14,0.9,0xfff8e8,0xffcf7a,0.85));
  scene.add(house(26,10,-0.6,0xf0fff4,0x7fd6a0,0.95));

  (function(){
   var g=new THREE.Group();
   var counter=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.9,0.8),M.wood);
   counter.position.y=0.45;counter.castShadow=true;g.add(counter);
   for(var i=-1;i<=1;i+=2){
    var pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4,5),M.woodD);
    pole.position.set(i*1,1.2,-0.3);g.add(pole);
   }
   var awning=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.08,1.2),new THREE.MeshStandardMaterial({color:0xff9cb8,side:THREE.DoubleSide,roughness:0.7}));
   awning.position.y=2.45;awning.rotation.x=0.12;g.add(awning);
   var stripe=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.09,0.25),new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide}));
   stripe.position.set(0,2.46,0.3);stripe.rotation.x=0.12;g.add(stripe);
   for(var i=0;i<4;i++){
    var it=new THREE.Mesh(new THREE.SphereGeometry(0.11,6,5),new THREE.MeshBasicMaterial({color:[0xff6b6b,0xffd36f,0x7fd6a0,0xa78bff][i]}));
    it.position.set(-0.7+i*0.47,1.02,0);g.add(it);
   }
   g.position.set(11,terrainH(11,2),2);g.rotation.y=-0.7;scene.add(g);
  })();

  var pondC={x:-17,z:8};
  (function(){
   var y=terrainH(pondC.x,pondC.z);
   var pond=new THREE.Mesh(new THREE.CircleGeometry(5.2,28),M.water);
   pond.rotation.x=-Math.PI/2;pond.position.set(pondC.x,y+0.18,pondC.z);scene.add(pond);
   var rim=new THREE.Mesh(new THREE.TorusGeometry(5.2,0.22,8,28),M.cream);
   rim.rotation.x=Math.PI/2;rim.position.set(pondC.x,y+0.15,pondC.z);rim.castShadow=true;scene.add(rim);
   for(var i=0;i<6;i++){
    var a=Math.random()*6.28,r=Math.random()*3.8;
    var lp=new THREE.Mesh(new THREE.CircleGeometry(0.3+Math.random()*0.25,8),M.leafG);
    lp.rotation.x=-Math.PI/2;
    lp.position.set(pondC.x+Math.cos(a)*r,y+0.24,pondC.z+Math.sin(a)*r);scene.add(lp);
   }
  })();
  function bridge(x,z,len,ry){
   var g=new THREE.Group();
   var arch=new THREE.Mesh(new THREE.BoxGeometry(len,0.18,2),M.wood);
   arch.position.y=1;g.add(arch);
   var n=7;
   for(var i=0;i<n;i++){
    var t=i/(n-1),lx=-len/2+len*t;
    var plank=new THREE.Mesh(new THREE.BoxGeometry(len/n-0.08,0.12,2.1),i%2?M.wood:M.woodD);
    var hy=1+Math.sin(t*Math.PI)*0.55;
    plank.position.set(lx,hy,0);plank.rotation.z=-Math.cos(t*Math.PI)*0.28;
    plank.castShadow=true;g.add(plank);
    if(i%2===0){for(var s=-1;s<=1;s+=2){
     var rail=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.7,5),M.woodD);
     rail.position.set(lx,hy+0.4,s*1);g.add(rail);
    }}
   }
   for(var r2=0;r2<2;r2++){
    var railB=new THREE.Mesh(new THREE.BoxGeometry(len*0.94,0.08,0.08),M.woodD);
    railB.position.set(0,1.85,(r2===0?-1:1));g.add(railB);
   }
   g.position.set(x,terrainH(x,z)+0.15,z);g.rotation.y=ry||0;return g;
  }
  scene.add(bridge(-17,8,12.5,0));

  var fallBase={x:7,z:-27};
  (function(){
   var y=terrainH(fallBase.x,fallBase.z);
   var cliff=new THREE.Mesh(new THREE.DodecahedronGeometry(2.6,1),M.rock);
   cliff.position.set(fallBase.x,y+2.6,fallBase.z-1);cliff.castShadow=true;scene.add(cliff);
   var cliff2=new THREE.Mesh(new THREE.DodecahedronGeometry(1.8,1),M.rock);
   cliff2.position.set(fallBase.x-1.6,y+1.6,fallBase.z-0.5);cliff2.castShadow=true;scene.add(cliff2);
   var tp=new THREE.Mesh(new THREE.CircleGeometry(1.4,14),M.water);
   tp.rotation.x=-Math.PI/2;tp.position.set(fallBase.x,y+4.35,fallBase.z-0.6);scene.add(tp);
   fallSheet=new THREE.Mesh(new THREE.PlaneGeometry(1.6,4.4),M.waterfall);
   fallSheet.position.set(fallBase.x,y+2.2,fallBase.z+0.55);scene.add(fallSheet);
   var bp=new THREE.Mesh(new THREE.CircleGeometry(2.4,18),M.water);
   bp.rotation.x=-Math.PI/2;bp.position.set(fallBase.x,y+0.2,fallBase.z+1.6);scene.add(bp);
   for(var i=0;i<4;i++){
    var m=new THREE.Mesh(new THREE.SphereGeometry(0.3+Math.random()*0.25,6,5),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.35}));
    m.position.set(fallBase.x+(Math.random()-0.5)*1.6,y+0.5,fallBase.z+1.8+(Math.random()-0.5));
    m.userData.ph=i*1.6;mistPuffs.push(m);scene.add(m);
   }
   var glow=new THREE.PointLight(0xaaddff,0.9,8);
   glow.position.set(fallBase.x,y+1.5,fallBase.z+1.5);scene.add(glow);
  })();

  function lamp(x,z,bigLight){
   var g=new THREE.Group();
   var y=terrainH(x,z);
   var pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,2.6,6),M.stone);
   pole.position.y=y+1.3;pole.castShadow=true;g.add(pole);
   var arm=new THREE.Mesh(new THREE.TorusGeometry(0.28,0.045,6,12,Math.PI),M.stone);
   arm.position.y=y+2.6;arm.rotation.z=Math.PI;g.add(arm);
   var orb=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,10),M.lampGlow);
   orb.position.set(0.28,y+2.55,0);g.add(orb);
   if(bigLight){var lt=new THREE.PointLight(0xffe9a8,1.1,9);lt.position.copy(orb.position);g.add(lt);}
   g.position.set(x,y,z);return g;
  }
  [[3,30],[-3,30],[3,18],[-3,18],[3,8,true],[-3,8],[8,-1],[-8,-1],[13,6],[-13,10]].forEach(function(p){scene.add(lamp(p[0],p[1],p[2]));});

  function bench(x,z,ry){
   var g=new THREE.Group();
   var seat=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.08,0.42),M.wood);
   seat.position.y=0.42;seat.castShadow=true;g.add(seat);
   var back=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.36,0.07),M.wood);
   back.position.set(0,0.66,-0.2);g.add(back);
   for(var i=-1;i<=1;i+=2){
    var leg=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.42,0.36),M.woodD);
    leg.position.set(i*0.52,0.21,0);g.add(leg);
   }
   g.position.set(x,terrainH(x,z),z);g.rotation.y=ry||0;scene.add(g);return g;
  }
  bench(5,5,-2.2);bench(-5,6,2.2);bench(-13,3,1.2);bench(9,-6,0.6);

  (function(){
   var g=new THREE.Group();
   for(var i=0;i<8;i++){
    var p=new THREE.Mesh(new THREE.BoxGeometry(3,0.12,1.05),i%2?M.wood:M.woodD);
    p.position.set(0,0.55,-i*1.15);p.castShadow=true;p.receiveShadow=true;g.add(p);
   }
   for(var i=0;i<4;i++){for(var s=-1;s<=1;s+=2){
    var post=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.08,1.6,5),M.woodD);
    post.position.set(s*1.35,-0.2,-i*2.3);g.add(post);
   }}
   for(var i=0;i<2;i++){for(var s=-1;s<=1;s+=2){
    var lp=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,5),M.woodD);
    lp.position.set(s*1.3,1.3,-i*4-1);g.add(lp);
    var lo=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8),M.lampGlow);
    lo.position.set(s*1.3,2.05,-i*4-1);g.add(lo);
   }}
   g.position.set(0,terrainH(0,40)-0.1,41);scene.add(g);
  })();

  var SKINS=[0xffe0c8,0xf5cba0,0xe8b890];
  var HAIRS=[0x5a4632,0x2f2a38,0xc88a4a,0x8a4a5a,0x4a6b8a,0xd8b878];
  var OUTFITS=[0xff8ab8,0x7fa8ff,0x8ae0b0,0xffcf7a,0xc39bff,0xff9c7a,0x7fd6e8];
  var NPC_NAMES=['小美','阿明','阿海大叔','莉莉','村長','豆豆','妞妞','商人老王','詩人小雨'];
  function npcNameSprite(txt){
   var cv=document.createElement('canvas');cv.width=256;cv.height=64;
   var cx=cv.getContext('2d');
   cx.font='bold 30px Arial';cx.textAlign='center';cx.textBaseline='middle';
   cx.shadowColor='rgba(0,0,0,0.5)';cx.shadowBlur=6;
   cx.fillStyle='#fff';cx.fillText(txt,128,32);
   var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
   sp.scale.set(1.6,0.4,1);return sp;
  }
  function makeNPC(o){
   var g=new THREE.Group();
   var skin=new THREE.MeshStandardMaterial({color:o.skin,roughness:0.65});
   var outfit=new THREE.MeshStandardMaterial({color:o.outfit,roughness:0.7});
   var hairM=new THREE.MeshStandardMaterial({color:o.hair,roughness:0.8});
   var s=o.size||1;
   var body=new THREE.Mesh(new THREE.CylinderGeometry(0.22*s,0.34*s,0.62*s,10),outfit);
   body.position.y=0.55*s;body.castShadow=true;g.add(body);
   var head=new THREE.Mesh(new THREE.SphereGeometry(0.3*s,12,12),skin);
   head.position.y=1.12*s;head.castShadow=true;g.add(head);
   var hair=new THREE.Mesh(new THREE.SphereGeometry(0.315*s,12,10,0,6.28,0,1.7),hairM);
   hair.position.y=1.16*s;g.add(hair);
   for(var e=-1;e<=1;e+=2){
    var eye=new THREE.Mesh(new THREE.SphereGeometry(0.035*s,6,6),new THREE.MeshBasicMaterial({color:0x303048}));
    eye.position.set(e*0.11*s,1.15*s,0.27*s);g.add(eye);
    var blush=new THREE.Mesh(new THREE.CircleGeometry(0.045*s,8),new THREE.MeshBasicMaterial({color:0xffb0c0,transparent:true,opacity:0.75}));
    blush.position.set(e*0.17*s,1.08*s,0.245*s);blush.rotation.y=e*-0.4;g.add(blush);
   }
   var smile=new THREE.Mesh(new THREE.TorusGeometry(0.06*s,0.014*s,6,10,Math.PI),new THREE.MeshBasicMaterial({color:0xa05a5a}));
   smile.position.set(0,1.06*s,0.27*s);smile.rotation.z=Math.PI;g.add(smile);
   var armL=new THREE.Mesh(new THREE.CylinderGeometry(0.05*s,0.05*s,0.4*s,6),skin);
   armL.position.set(-0.3*s,0.72*s,0);armL.castShadow=true;g.add(armL);
   var armR=armL.clone();armR.position.x=0.3*s;g.add(armR);
   var legL=new THREE.Mesh(new THREE.CylinderGeometry(0.06*s,0.06*s,0.3*s,6),skin);
   legL.position.set(-0.11*s,0.16*s,0);legL.castShadow=true;g.add(legL);
   var legR=legL.clone();legR.position.x=0.11*s;g.add(legR);
   var tag=npcNameSprite(o.name);tag.position.y=1.75*s;g.add(tag);
   g.position.set(o.x,o.y,o.z);
   g.userData={state:o.state,name:o.name,ph:Math.random()*6.28,wp:o.wp||null,wpi:0,speed:o.speed||1.2,size:s,
    head:head,armL:armL,armR:armR,legL:legL,legR:legR,rod:o.rod||false};
   scene.add(g);npcs.push(g);return g;
  }
  makeNPC({x:3.5,z:3,y:terrainH(3.5,3),skin:SKINS[0],hair:HAIRS[0],outfit:OUTFITS[0],name:NPC_NAMES[0],state:'wave'});
  makeNPC({x:-3,z:-2.5,y:terrainH(-3,-2.5),skin:SKINS[1],hair:HAIRS[1],outfit:OUTFITS[1],name:NPC_NAMES[1],state:'walk',wp:[[0,-8],[0,-30],[6,-20],[0,-8]]});
  makeNPC({x:0,z:37,y:terrainH(0,37),skin:SKINS[2],hair:HAIRS[2],outfit:OUTFITS[2],name:NPC_NAMES[2],state:'fish'});
  makeNPC({x:-19,z:4,y:terrainH(-19,4),skin:SKINS[0],hair:HAIRS[3],outfit:OUTFITS[3],name:NPC_NAMES[3],state:'sit'});
  makeNPC({x:21,z:-4,y:terrainH(21,-4),skin:SKINS[1],hair:HAIRS[4],outfit:OUTFITS[4],name:NPC_NAMES[4],state:'idleLook',size:1.15});
  makeNPC({x:5,z:-2,y:terrainH(5,-2),skin:SKINS[0],hair:HAIRS[5],outfit:OUTFITS[5],name:NPC_NAMES[5],state:'jump',size:0.72});
  makeNPC({x:-6,z:1,y:terrainH(-6,1),skin:SKINS[2],hair:HAIRS[0],outfit:OUTFITS[6],name:NPC_NAMES[6],state:'walk',wp:[[8,4],[-8,4],[-8,-4],[8,-4]],speed:1.8});
  makeNPC({x:12.2,z:1.2,y:terrainH(12.2,1.2),skin:SKINS[1],hair:HAIRS[2],outfit:OUTFITS[2],name:NPC_NAMES[7],state:'idleLook'});
  makeNPC({x:-10,z:-17,y:terrainH(-10,-17),skin:SKINS[0],hair:HAIRS[3],outfit:OUTFITS[4],name:NPC_NAMES[8],state:'idleLook'});
  (function(){
   var f=npcs[2];var ud=f.userData;
   var rod=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.03,1.5,4),M.woodD);
   rod.position.set(0.35,0.9,0.4);rod.rotation.x=0.9;f.add(rod);ud.rodMesh=rod;
   var line=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,1.6,3),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.6}));
   line.position.set(0.95,0.1,1.05);f.add(line);ud.lineMesh=line;
   var bobber=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshBasicMaterial({color:0xff5555}));
   bobber.position.set(0.95,-0.72,1.05);f.add(bobber);ud.bobber=bobber;
  })();
  (function(){
   var l=npcs[3];var ud=l.userData;
   l.position.y-=0.18;ud.legL.rotation.x=-1.4;ud.legR.rotation.x=-1.4;
   ud.legL.position.z=0.14;ud.legR.position.z=0.14;ud.legL.position.y=0.3;ud.legR.position.y=0.3;
  })();

  } else { buildMoonDecor(); }

  // ═══ ROCKET BASE (garden only) ═══
  var rocketBase=null,rocketLaunched=false,rocketFlashTimer=0;
  if(!MOON){
   var rg=new THREE.Group();
   var launchpad=new THREE.Mesh(new THREE.CylinderGeometry(4.5,5,0.5,32),new THREE.MeshStandardMaterial({color:0x3a3f4a,metalness:0.5,roughness:0.5}));
   launchpad.position.y=-0.1;launchpad.receiveShadow=true;rg.add(launchpad);
   var padRing=new THREE.Mesh(new THREE.TorusGeometry(4.2,0.12,8,32),new THREE.MeshBasicMaterial({color:0xff4444}));
   padRing.rotation.x=Math.PI/2;padRing.position.y=0.16;rg.add(padRing);
   for(var pi=0;pi<8;pi++){
    var pa=pi/8*Math.PI*2;
    var pb=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,8),new THREE.MeshBasicMaterial({color:0xff6644}));
    pb.position.set(Math.cos(pa)*3.8,0.3,Math.sin(pa)*3.8);rg.add(pb);
   }
   var rocket=new THREE.Group();
   var rBody=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,8,16),new THREE.MeshStandardMaterial({color:0xe8ecf4,metalness:0.4,roughness:0.4}));
   rBody.position.y=4.5;rBody.castShadow=true;rocket.add(rBody);
   var rCone=new THREE.Mesh(new THREE.ConeGeometry(0.9,2.2,16),new THREE.MeshStandardMaterial({color:0xff4444,metalness:0.3,roughness:0.5}));
   rCone.position.y=9.6;rCone.castShadow=true;rocket.add(rCone);
   var rWind=new THREE.Mesh(new THREE.SphereGeometry(0.45,10,8,0,Math.PI*2,0,1.2),new THREE.MeshPhysicalMaterial({color:0x88ccff,transparent:true,opacity:0.5,roughness:0.05}));
   rWind.position.set(0,8.5,0.7);rocket.add(rWind);
   for(var fi=0;fi<3;fi++){
    var fa=fi/3*Math.PI*2;
    var fin=new THREE.Mesh(new THREE.BoxGeometry(1.8,2.2,0.15),new THREE.MeshStandardMaterial({color:0xff4444,metalness:0.3,roughness:0.5}));
    fin.position.set(Math.cos(fa)*1.1,1.8,Math.sin(fa)*1.1);
    fin.rotation.y=-fa;rocket.add(fin);
   }
   var rWindow=new THREE.Mesh(new THREE.CircleGeometry(0.3,12),new THREE.MeshBasicMaterial({color:0x88ddff}));
   rWindow.position.set(0,7.8,0.92);rocket.add(rWindow);
   rocket.add(new THREE.PointLight(0x88ddff,0.6,8).translateY(7.8).translateZ(1.5));
   var flagPole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.04,3,6),new THREE.MeshStandardMaterial({color:0xccc,metalness:0.7}));
   flagPole.position.set(3,1.5,0);rg.add(flagPole);
   var flagCloth=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.7,8,4),new THREE.MeshStandardMaterial({color:0xff4444,side:THREE.DoubleSide,roughness:0.8}));
   flagCloth.position.set(3.6,2.5,0);rg.add(flagCloth);
    rg.add(rocket);
    var beacon=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,18,6),new THREE.MeshBasicMaterial({color:0xffcc00,transparent:true,opacity:0.35}));
    beacon.position.y=11;rg.add(beacon);
    var beaconLight=new THREE.PointLight(0xffcc00,1.5,30);
    beaconLight.position.y=20;rg.add(beaconLight);
    var beaconRing=new THREE.Mesh(new THREE.RingGeometry(1.5,2,24),new THREE.MeshBasicMaterial({color:0xffcc00,transparent:true,opacity:0.3,side:THREE.DoubleSide}));
    beaconRing.rotation.x=-Math.PI/2;beaconRing.position.y=0.25;rg.add(beaconRing);
    var rpx=28,rpz=-22;
    rg.position.set(rpx,terrainH(rpx,rpz),rpz);
    scene.add(rg);
    rocketBase={pos:new THREE.Vector3(rpx,terrainH(rpx,rpz)+1,rpz),radius:6,mesh:rg,rocket:rocket,flagCloth:flagCloth,beacon:beacon,beaconRing:beaconRing,beaconLight:beaconLight};
  }
  var islLaunchActive=false;
    function triggerRocketLaunch(){
     if(rocketLaunched||!rocketBase)return;
     rocketLaunched=true;islLaunchActive=true;window._rocketLaunchAnim=true;
     keys={};
    var rocket=rocketBase.rocket;
    var startY=rocket.position.y+10.5;
    playerGroup.position.set(rocketBase.pos.x,startY,rocketBase.pos.z);
    var launchT=0;
    var flameGeo=new THREE.ConeGeometry(1.2,3,8);
    var flameMat=new THREE.MeshBasicMaterial({color:0xff6622,transparent:true,opacity:0.85});
    var flame=new THREE.Mesh(flameGeo,flameMat);
    flame.position.set(rocketBase.pos.x,startY-1.5,rocketBase.pos.z);
    flame.rotation.x=Math.PI;scene.add(flame);
    var launchAni=function(){
     launchT+=0.016;
     if(launchT<1.2){
      rocket.position.y+=launchT*18*0.016;
      playerGroup.position.y=rocket.position.y+10.5;
      flame.position.y=playerGroup.position.y-2;
      flame.scale.setScalar(0.8+launchT*1.5);
      flameMat.opacity=0.6+Math.sin(launchT*30)*0.3;
      camera.position.set(rocketBase.pos.x,playerGroup.position.y+4,rocketBase.pos.z+12);
      camera.lookAt(playerGroup.position);
     }else{
      scene.remove(flame);
      var flashEl=document.createElement('div');
      flashEl.style.cssText='position:fixed;inset:0;z-index:40;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .8s;pointer-events:none;font-family:Arial';
      flashEl.innerHTML='<div style="text-align:center"><div style="font-size:28px;color:#fff;letter-spacing:4px;opacity:0;transition:opacity 1s .8s">🚀 正在前往月球基地…</div><div style="font-size:20px;color:rgba(255,255,255,.5);letter-spacing:3px;margin-top:20px;opacity:0;transition:opacity 1s 2s">一天後…</div></div>';
      document.body.appendChild(flashEl);
      setTimeout(function(){flashEl.style.opacity='1';},50);
      setTimeout(function(){flashEl.querySelector('div').children[0].style.opacity='1';},400);
      setTimeout(function(){flashEl.querySelector('div').children[1].style.opacity='1';},1800);
      setTimeout(function(){
       localStorage.setItem('oc_isl_map','moon');
       flashEl.remove();islLaunchActive=false;
       window._ocIslReboot();
      },3600);
      return;
     }
     requestAnimationFrame(launchAni);
    };
    requestAnimationFrame(launchAni);
   }
  // ═══ HIDDEN TREASURE PLATFORM (garden only) ═══
  var treasurePlatform=null,treasureChest=null,treasureOpened=false;
  if(!MOON){
   var tpx=-42,tpz=-38;
   var tpy=32;
   var tPlatform=new THREE.Group();
   var tBase=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.2,0.35,16),new THREE.MeshStandardMaterial({color:0x3a3530,roughness:0.9,metalness:0.2,transparent:true,opacity:0.55}));
   tBase.receiveShadow=true;tPlatform.add(tBase);
   var tRing=new THREE.Mesh(new THREE.TorusGeometry(3,0.08,8,24),new THREE.MeshBasicMaterial({color:0x9966ff,transparent:true,opacity:0.3}));
   tRing.rotation.x=Math.PI/2;tRing.position.y=0.2;tPlatform.add(tRing);
   var tGlow=new THREE.PointLight(0x9966ff,1.2,12);tGlow.position.y=1.5;tPlatform.add(tGlow);
   for(var ti=0;ti<6;ti++){
    var ta=ti/6*Math.PI*2;
    var tSpire=new THREE.Mesh(new THREE.ConeGeometry(0.12,1.8,6),new THREE.MeshStandardMaterial({color:0x6644aa,transparent:true,opacity:0.4,emissive:0x4422aa,emissiveIntensity:0.3}));
    tSpire.position.set(Math.cos(ta)*2.6,0.9,Math.sin(ta)*2.6);tPlatform.add(tSpire);
   }
   treasureChest=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.5),new THREE.MeshStandardMaterial({color:0x884400,roughness:0.7,metalness:0.3}));
   treasureChest.position.set(0,0.42,0);treasureChest.castShadow=true;tPlatform.add(treasureChest);
   var chestLid=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.12,0.52),new THREE.MeshStandardMaterial({color:0xaa5500,roughness:0.6,metalness:0.4}));
   chestLid.position.y=0.31;treasureChest.add(chestLid);treasureChest._lid=chestLid;
   var chestGlow=new THREE.PointLight(0xffdd44,0.8,5);chestGlow.position.y=0.5;treasureChest.add(chestGlow);
   var chestLock=new THREE.Mesh(new THREE.SphereGeometry(0.04,6,6),new THREE.MeshBasicMaterial({color:0xffdd44}));
   chestLock.position.set(0,0.05,0.26);treasureChest.add(chestLock);
   tPlatform.position.set(tpx,tpy,tpz);scene.add(tPlatform);
   treasurePlatform={pos:new THREE.Vector3(tpx,tpy,tpz),radius:4,mesh:tPlatform,opened:false,sparkles:[]};
   for(var si=0;si<12;si++){
    var sp=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4),new THREE.MeshBasicMaterial({color:0xccaaff,transparent:true,opacity:0.6+Math.random()*0.3}));
    sp.userData={a:si/12*Math.PI*2,r:1.5+Math.random()*1.5,sp:0.3+Math.random()*0.4,by:Math.random()*2};
    tPlatform.add(sp);treasurePlatform.sparkles.push(sp);
   }
  }
  var playerGroup=new THREE.Group();
 (function(){
  var outfit=new THREE.MeshStandardMaterial({color:0x4a7bff,roughness:0.55});
  var skin=new THREE.MeshStandardMaterial({color:0xffe0c8,roughness:0.65});
  var visorM=new THREE.MeshStandardMaterial({color:0x7fd6ff,emissive:0x4aa8e8,emissiveIntensity:0.5,metalness:0.4,roughness:0.2});
  var body=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.36,0.66,10),outfit);
  body.position.y=0.58;body.castShadow=true;playerGroup.add(body);
  var head=new THREE.Mesh(new THREE.SphereGeometry(0.31,12,12),skin);
  head.position.y=1.16;head.castShadow=true;playerGroup.add(head);
  var hair=new THREE.Mesh(new THREE.SphereGeometry(0.325,12,10,0,6.28,0,1.7),new THREE.MeshStandardMaterial({color:0x3a3244,roughness:0.8}));
  hair.position.y=1.2;playerGroup.add(hair);
  var visor=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.1,0.1),visorM);
  visor.position.set(0,1.2,0.26);playerGroup.add(visor);
  for(var e=-1;e<=1;e+=2){
   var eye=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,6),new THREE.MeshBasicMaterial({color:0x303048}));
   eye.position.set(e*0.11,1.14,0.28);playerGroup.add(eye);
  }
  var armL=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.42,6),skin);
  armL.position.set(-0.32,0.75,0);armL.castShadow=true;playerGroup.add(armL);
  var armR=armL.clone();armR.position.x=0.32;playerGroup.add(armR);
  var legL=new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.065,0.32,6),new THREE.MeshStandardMaterial({color:0x2f3a5c}));
  legL.position.set(-0.12,0.17,0);legL.castShadow=true;playerGroup.add(legL);
  var legR=legL.clone();legR.position.x=0.12;playerGroup.add(legR);
   playerGroup._armL=armL;playerGroup._armR=armR;playerGroup._legL=legL;playerGroup._legR=legR;playerGroup._body=body;
   var jetpack=new THREE.Group();
   var jpBack=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.45,0.22),new THREE.MeshStandardMaterial({color:0x555566,metalness:0.7,roughness:0.3}));
   jpBack.position.set(0,0.68,-0.2);jetpack.add(jpBack);
   var jpTank1=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.35,8),new THREE.MeshStandardMaterial({color:0x33aa55,metalness:0.5,roughness:0.4}));
   jpTank1.position.set(-0.1,0.65,-0.28);jetpack.add(jpTank1);
   var jpTank2=jpTank1.clone();jpTank2.position.x=0.1;jetpack.add(jpTank2);
   var jpNozzle=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.08,0.12,8),new THREE.MeshStandardMaterial({color:0x888899,metalness:0.8,roughness:0.2}));
   jpNozzle.position.set(0,0.38,-0.28);jetpack.add(jpNozzle);
   var jpFlame=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.5,6),new THREE.MeshBasicMaterial({color:0xff6622,transparent:true,opacity:0}));
   jpFlame.position.set(0,0.08,-0.28);jpFlame.rotation.x=Math.PI;jetpack.add(jpFlame);
   playerGroup.add(jetpack);
   playerGroup._jetpack=jetpack;jpFlame.material._baseColor=new THREE.Color(0xff6622);
   playerGroup._armL=armL;playerGroup._armR=armR;playerGroup._legL=legL;playerGroup._legR=legR;playerGroup._body=body;
  })();
 var spawnY=terrainH(0,40)+0.6;
 playerPos=new THREE.Vector3(0,spawnY,40);
 playerGroup.position.copy(playerPos);scene.add(playerGroup);

 for(var i=0;i<14;i++){
  var b=new THREE.Group();
  var wm=new THREE.MeshBasicMaterial({color:[0xffb7d5,0xffe08a,0xa78bff,0x8ae0ff][i%4],side:THREE.DoubleSide,transparent:true,opacity:0.9});
  var w1=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.12),wm);w1.position.x=-0.07;
  var w2=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.12),wm);w2.position.x=0.07;
  b.add(w1);b.add(w2);
  b.userData={w1:w1,w2:w2,a:Math.random()*6.28,r:4+Math.random()*26,h:1+Math.random()*3,sp:0.15+Math.random()*0.25,by:0};
  scene.add(b);butterflies.push(b);
 }

 for(var i=0;i<26;i++){
  var pt=new THREE.Mesh(new THREE.PlaneGeometry(0.09,0.09),new THREE.MeshBasicMaterial({color:0xffc4da,side:THREE.DoubleSide,transparent:true,opacity:0.85}));
  pt.userData={x:(Math.random()<0.5?-13:14)+(Math.random()-0.5)*6,z:(Math.random()<0.5?9:7)+(Math.random()-0.5)*6,y:3+Math.random()*4,vy:0.35+Math.random()*0.4,rs:1+Math.random()*2};
  scene.add(pt);petals.push(pt);
 }

 for(var i=0;i<5;i++){
  var bd=new THREE.Group();
  var bw=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
  var bw1=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.16),bw);bw1.position.x=-0.22;
  var bw2=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.16),bw);bw2.position.x=0.22;
  bd.add(bw1);bd.add(bw2);
  bd.userData={cx:(Math.random()-0.5)*60,cz:(Math.random()-0.5)*60,r:18+Math.random()*22,h:22+Math.random()*12,sp:0.12+Math.random()*0.1,ph:Math.random()*6.28,w1:bw1,w2:bw2};
  scene.add(bd);birds.push(bd);
 }

 // ═══ DRAG-ROTATION INPUT (no pointer lock) ═══
 var modeOverlay=document.getElementById('isl-mode-overlay');
 var grid=document.getElementById('isl-card-grid');
 var goBtn=document.getElementById('isl-go-btn');
 var moGo=document.getElementById('isl-mo-go');

 document.addEventListener('keydown',function(e){
  if(!act())return;
  keys[e.code]=true;
  if(e.code==='Escape'){e.preventDefault();if(modeOverlay.classList.contains('open'))closeIslMode();else openIslMode();}
 });
 document.addEventListener('keyup',function(e){if(!act())return;keys[e.code]=false;});

 renderer.domElement.addEventListener('mousedown',function(e){
  if(!act())return;
  if(modeOverlay.classList.contains('open'))return;
  isDragging=true;dragMoved=false;dragSX=e.clientX;dragSY=e.clientY;
 });
 document.addEventListener('mousemove',function(e){
  if(!act()||!isDragging)return;
  var dx=e.clientX-dragSX,dy=e.clientY-dragSY;
  if(Math.abs(dx)+Math.abs(dy)>4)dragMoved=true;
  if(dragMoved){
   camTheta-=dx*0.004;
   camPhi=Math.max(-0.25,Math.min(1.15,camPhi-dy*0.004));
   dragSX=e.clientX;dragSY=e.clientY;
  }
 });
 document.addEventListener('mouseup',function(){isDragging=false;});
 renderer.domElement.addEventListener('contextmenu',function(e){e.preventDefault();});

  document.addEventListener('wheel',function(e){if(!act())return;camDist=Math.max(3,Math.min(16,camDist+e.deltaY*0.008));},{passive:true});

  // ── Island tablet/mobile controls ──
  (function(){
   var jZone=document.getElementById('isl-mob-joystick');
   var jKnob=jZone?jZone.querySelector('.jknob'):null;
   var lookArea=document.getElementById('isl-mob-look');
   var eBtn=document.getElementById('isl-mob-e');
    var jpBtn=document.getElementById('isl-mob-jp');
    if(jpBtn)jpBtn.style.display=MOON?'flex':'none';
   var menuBtn=document.getElementById('isl-mob-menu');
   var jTouchId=null;
   var lTouchId=null,lX=0,lY=0;
   var islMobile=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
   function updateJoystick(t){
    if(!jZone)return;
    var r=jZone.getBoundingClientRect();
    var cx=r.left+r.width/2,cy=r.top+r.height/2;
    var dx=t.clientX-cx,dy=t.clientY-cy;
    var dist=Math.sqrt(dx*dx+dy*dy);
    var maxR=r.width/2;
    if(dist>maxR){dx=dx/dist*maxR;dy=dy/dist*maxR;dist=maxR;}
    var nx=dx/maxR,ny=dy/maxR;
    if(jKnob){jKnob.style.left=(50+nx*40)+'%';jKnob.style.top=(50+ny*40)+'%';}
    keys['KeyW']=ny<-0.2;keys['KeyS']=ny>0.2;keys['KeyA']=nx<-0.2;keys['KeyD']=nx>0.2;
   }
   function resetJoystick(){
    jTouchId=null;
    if(jKnob){jKnob.style.left='50%';jKnob.style.top='50%';}
    keys['KeyW']=false;keys['KeyS']=false;keys['KeyA']=false;keys['KeyD']=false;
   }
   if(jZone){
    jZone.addEventListener('touchstart',function(e){e.preventDefault();jTouchId=e.changedTouches[0].identifier;updateJoystick(e.changedTouches[0]);},{passive:false});
    jZone.addEventListener('touchmove',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===jTouchId){updateJoystick(e.changedTouches[i]);break;}}},{passive:false});
    jZone.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===jTouchId){resetJoystick();break;}}e.preventDefault();},{passive:false});
    jZone.addEventListener('touchcancel',resetJoystick);
   }
   if(lookArea){
    lookArea.addEventListener('touchstart',function(e){e.preventDefault();lTouchId=e.changedTouches[0].identifier;lX=e.changedTouches[0].clientX;lY=e.changedTouches[0].clientY;},{passive:false});
    lookArea.addEventListener('touchmove',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===lTouchId){var t=e.changedTouches[i];var dx=t.clientX-lX,dy=t.clientY-lY;camTheta-=dx*0.006;camPhi=Math.max(-0.25,Math.min(1.15,camPhi-dy*0.006));lX=t.clientX;lY=t.clientY;break;}}},{passive:false});
    lookArea.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===lTouchId){lTouchId=null;break;}}e.preventDefault();},{passive:false});
    lookArea.addEventListener('touchcancel',function(){lTouchId=null;});
   }
   if(eBtn){
    eBtn.addEventListener('touchstart',function(e){e.preventDefault();keys['KeyE']=true;},{passive:false});
    eBtn.addEventListener('touchend',function(e){keys['KeyE']=false;e.preventDefault();},{passive:false});
    eBtn.addEventListener('touchcancel',function(){keys['KeyE']=false;});
   }
   if(jpBtn){
    jpBtn.addEventListener('touchstart',function(e){e.preventDefault();keys['Space']=true;},{passive:false});
    jpBtn.addEventListener('touchend',function(e){keys['Space']=false;e.preventDefault();},{passive:false});
    jpBtn.addEventListener('touchcancel',function(){keys['Space']=false;});
   }
   if(menuBtn){
    menuBtn.addEventListener('touchstart',function(e){e.preventDefault();var dd=document.getElementById('isl-mode-overlay');if(dd){if(dd.classList.contains('open'))closeIslMode();else openIslMode();}},{passive:false});
   }
   // Free-look: any touch outside buttons on right half rotates camera
   var freeLookTouch=null,freeLookX=0,freeLookY=0;
   document.addEventListener('touchstart',function(e){
    if(!act())return;
    if(e.target.closest('#isl-mob-joystick,#isl-mob-e,#isl-mob-jp,#isl-mob-menu,#isl-bot-bar,#isl-top-bar,#isl-panel,#isl-mode-overlay'))return;
    var t=e.changedTouches[0];
    if(t.clientX>window.innerWidth*0.4){freeLookTouch=t.identifier;freeLookX=t.clientX;freeLookY=t.clientY;}
   },{passive:true});
   document.addEventListener('touchmove',function(e){
    if(!act()||freeLookTouch===null)return;
    for(var i=0;i<e.changedTouches.length;i++){
     if(e.changedTouches[i].identifier===freeLookTouch){
      var t=e.changedTouches[i];camTheta-=(t.clientX-freeLookX)*0.006;camPhi=Math.max(-0.25,Math.min(1.15,camPhi-(t.clientY-freeLookY)*0.006));freeLookX=t.clientX;freeLookY=t.clientY;break;
     }
    }
   },{passive:true});
   document.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===freeLookTouch){freeLookTouch=null;break;}}},{passive:true});
   document.addEventListener('touchcancel',function(){freeLookTouch=null;},{passive:true});
  })();

 grid.innerHTML='';
 MODES.forEach(function(m){
  var c=document.createElement('button');c.className='isl-card';
  c.style.setProperty('--c1',m.c1);c.style.setProperty('--c2',m.c2);
  c.innerHTML='<span class="cico">'+m.icon+'</span><span class="cname">'+m.name+'</span><span class="cdesc">'+m.desc+'</span>';
  c.onclick=function(){
   var prev=grid.querySelector('.sel');if(prev)prev.classList.remove('sel');
   c.classList.add('sel');selectedMode=m;
   goBtn.classList.add('ready');moGo.classList.add('ready');
  };
  grid.appendChild(c);
 });
 function openIslMode(){modeOverlay.classList.add('open');rootEl.classList.add('blurred');}
 function closeIslMode(){modeOverlay.classList.remove('open');rootEl.classList.remove('blurred');}
 window._ocIslCloseMode=closeIslMode;
 window._ocIslOpenMode=openIslMode;
 document.getElementById('isl-mode-btn').onclick=openIslMode;
 document.getElementById('isl-map-btn').onclick=function(){openIslPanel('🌍 選擇地圖',pnlMapSelect);};
 document.getElementById('isl-mo-cancel').onclick=closeIslMode;
 document.getElementById('isl-back-btn').onclick=function(){window.ocIslandClose();};
 goBtn.onclick=launchSelected;moGo.onclick=launchSelected;
  document.querySelectorAll('#isl-bot-bar .isl-fbtn').forEach(function(b){
   b.onclick=function(){openIslPanelByFn(b.dataset.fn);};
  });
  var toastTimer=null;
  function toast(msg){
   var el=document.getElementById('isl-toast');
   el.textContent=msg;el.classList.add('show');
   clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove('show');},2200);
  }
  window._ocIslToast=toast;

  // ═══ ISLAND PANEL SYSTEM ═══
  var islPanelOpen=false;
  var pnlEl=document.getElementById('isl-panel');
  var pnlTitle=document.getElementById('isl-panel-title');
  var pnlBody=document.getElementById('isl-panel-body');
  document.getElementById('isl-panel-close').onclick=function(){closeIslPanel();};
  function openIslPanel(title,renderFn){
   islPanelOpen=true;
   pnlTitle.textContent=title;
   pnlBody.innerHTML='';
   if(renderFn)renderFn(pnlBody);
   pnlEl.classList.add('open');
  }
  function closeIslPanel(){
   islPanelOpen=false;
   pnlEl.classList.remove('open');
  }
  function pnlLS(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
  function pnlTag(text,color){return '<span class="ip-tag" style="background:'+color+'22;color:'+color+';border:1px solid '+color+'44">'+text+'</span>';}

  function openIslPanelByFn(fn){
   var map={'武器庫':pnlArmory,'活動':pnlEvents,'賽季':pnlSeason,'排位':pnlRank,'商店':pnlShop,'技能':pnlSkills,'成就':pnlAch,'排行榜':pnlLB};
   if(map[fn])openIslPanel(fn,map[fn]);
  }

  function pnlMapSelect(el){
   var cur=localStorage.getItem('oc_isl_map')||'garden';
   var maps=[
    {id:'garden',name:'夢幻花園',icon:'🌸',desc:'櫻花樹、池塘、小屋與瀑布',c1:'#ff9ecf',c2:'#b8a6ff'},
    {id:'moon',name:'月球基地',icon:'🌕',desc:'低重力跳躍 · 噴射背包 · 地球星空',c1:'#88bbff',c2:'#6677aa'}
   ];
   var html='<div class="ip-section"><div class="ip-section-title">選擇島嶼地圖（下次登島生效）</div><div class="ip-grid" style="grid-template-columns:repeat(2,1fr);max-width:520px">';
   maps.forEach(function(m){
    var sel=m.id===cur;
    html+='<div class="ip-card isl-mapcard'+(sel?' sel':'')+'" data-map="'+m.id+'" style="cursor:pointer;text-align:center;padding:22px 14px;border-color:'+(sel?'#fff':'rgba(255,255,255,.08)')+'">';
    html+='<div style="font-size:44px;margin-bottom:10px">'+m.icon+'</div>';
    html+='<div style="color:#fff;font-size:16px;font-weight:bold;letter-spacing:2px;margin-bottom:6px">'+m.name+'</div>';
    html+='<div class="ip-card-desc">'+m.desc+'</div>';
    if(sel)html+='<div style="margin-top:10px">'+pnlTag('目前使用','#4fa')+'</div>';
    else html+='<div style="margin-top:10px;color:#ffd97a;font-size:11px;letter-spacing:1px">點擊切換 →</div>';
    html+='</div>';
   });
   html+='</div></div>';
   el.innerHTML=html;
   el.querySelectorAll('.isl-mapcard').forEach(function(c){
    c.onclick=function(){
     localStorage.setItem('oc_isl_map',c.dataset.map);
     closeIslPanel();
     window._ocIslReboot();
    };
   });
  }

  // ─── 武器庫 ───
  function pnlArmory(el){
   var inv=pnlLS('oc_inv')||{};
   var owned=pnlLS('oc_guns')||['ak47'];
   var coin=parseInt(localStorage.getItem('oc_coin'))||0;
   var gunNames={ak47:'AK-47',deagle:'沙漠之鷹',awp:'AWP',shotgun:'龍息霰彈',knife:'軍刀',smg:'MP7',watergun:'水槍',radrifle:'輻射步槍',grenade:'手榴彈',grapple:'鉤爪'};
   var gunIcons={ak47:'🔫',deagle:'🔫',awp:'🔭',shotgun:'💥',knife:'🔪',smg:'🔫',watergun:'💦',radrifle:'☢',grenade:'💣',grapple:'🪝'};
   var gunDescs={ak47:'全自動突擊步槍，均衡穩定',deagle:'高傷害手槍，後坐力大',awp:'重型狙擊槍，一擊必殺',shotgun:'近距離毀滅，遠距無力',knife:'近戰武器，快速切り',smg:'MP7，射速極快',watergun:'夏日限定，清涼一夏',radrifle:'蓄力發射輻射彈',grenade:'投擲爆炸物',grapple:'快速位移工具'};
   var gunStats={ak47:'DMG:25 | FR:100ms',deagle:'DMG:55 | FR:400ms',awp:'DMG:120 | FR:1200ms',shotgun:'DMG:15x8 | FR:800ms',knife:'DMG:40 | FR:350ms',smg:'DMG:18 | FR:70ms',watergun:'DMG:12 | FR:150ms',radrifle:'DMG:40-90 | 蓄力',grenade:'DMG:80 | 範圍',grapple:'位移工具'};
   var guns=['ak47','deagle','awp','shotgun','knife','smg','watergun','radrifle','grenade','grapple'];
   var loadout=pnlLS('oc_loadout');
   var loadoutArr=(loadout&&loadout.loadout)?loadout.loadout:['ak47',null,null,null,null];
   var ownedSet={};owned.forEach(function(g){ownedSet[g]=true;});
   guns.forEach(function(g){if(inv[g]&&inv[g]>0)ownedSet[g]=true;});
   function saveLoadout(){try{localStorage.setItem('oc_loadout',JSON.stringify({loadout:loadoutArr}));}catch(e){}try{for(var si=0;si<5;si++)window.playerLoadout[si]=loadoutArr[si]||null;}catch(e){}document.querySelectorAll('.loadout-slot').forEach(function(s,i){var gn=loadoutArr[i];s.querySelector('.slot-gun').textContent=gn?(gunNames[gn]||gn):'─';});}
   function renderPanel(){
    var html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
    html+='<div style="font-size:16px;font-weight:bold;letter-spacing:4px;color:#fff">💰 金幣: $'+coin+'</div></div>';
    html+='<div class="ip-section"><div class="ip-section-title">📋 目前裝備</div>';
    html+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">';
    for(var i=0;i<5;i++){
     var g=loadoutArr[i];
     var has=g&&ownedSet[g];
     html+='<div class="ip-card" data-slot="'+i+'" style="text-align:center;padding:14px 6px;min-height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;border-color:'+(has?'rgba(68,255,170,.4)':'rgba(255,255,255,.05)')+'">';
     html+='<div style="color:rgba(255,255,255,.3);font-size:10px;letter-spacing:2px">SLOT '+(i+1)+'</div>';
     html+='<div style="font-size:32px">'+(has?(gunIcons[g]||'🔫'):'<span style="font-size:22px;color:rgba(255,255,255,.15)">+</span>')+'</div>';
     html+='<div style="color:'+(has?'#4fa':'rgba(255,255,255,.25)')+';font-size:12px;font-weight:bold;letter-spacing:1px">'+(has?(gunNames[g]||g):'空')+'</div>';
     html+='</div>';
    }
    html+='</div></div>';
    html+='<div class="ip-section"><div class="ip-section-title">🗄 武器倉庫（點擊裝備）</div><div class="ip-grid">';
    guns.forEach(function(g){
     var isOwned=ownedSet[g];
     var count=inv[g]||0;
     var equipIdx=loadoutArr.indexOf(g);
     var borderColor=equipIdx!==-1?'rgba(68,255,170,.4)':'rgba(255,255,255,.08)';
     html+='<div class="ip-card armory-weapon" data-gun="'+g+'" style="border-color:'+borderColor+'">';
     html+='<div class="ip-card-head">';
     html+='<span class="ip-card-icon" style="font-size:28px">'+(gunIcons[g]||'🔫')+'</span>';
     html+='<span class="ip-card-name">'+(gunNames[g]||g)+'</span>';
     if(equipIdx!==-1)html+=pnlTag('⭐ 裝備中 Slot'+(equipIdx+1),'#4fa');
     html+='</div>';
     html+='<div class="ip-card-desc">'+(gunDescs[g]||'')+'</div>';
     html+='<div class="ip-card-stats">';
     html+='<span class="ip-stat"><b>'+(gunStats[g]||'')+'</b></span>';
     if(count>0)html+='<span class="ip-stat">x'+count+'</span>';
     html+='</div>';
     html+='</div>';
    });
    html+='</div></div>';
    el.innerHTML=html;
    el.querySelectorAll('.armory-weapon').forEach(function(card){
     card.onclick=function(){
      var g=card.dataset.gun;
      if(!ownedSet[g])return;
      var existSlot=loadoutArr.indexOf(g);
      if(existSlot!==-1)return;
      for(var s=0;s<5;s++){if(!loadoutArr[s]||!ownedSet[loadoutArr[s]]){loadoutArr[s]=g;saveLoadout();renderPanel();return;}}
      loadoutArr[4]=g;saveLoadout();renderPanel();
     };
    });
    el.querySelectorAll('[data-slot]').forEach(function(slot){
     slot.onclick=function(){
      var si=parseInt(slot.dataset.slot);
      if(loadoutArr[si]){loadoutArr[si]=null;saveLoadout();renderPanel();}
     };
    });
   }
   renderPanel();
  }

  // ─── 活動 ───
  function pnlEvents(el){
   var ev=pnlLS('oc_event')||{};
   var prog=ev.p||{};
   var claimed=ev.c||{};
   var targets=ev.t||{kill:20,round:3};
   var rewards=ev.r||{kill:5000,round:10000};
   var endDate=null;
   try{endDate=new Date(localStorage.getItem('oc_event_end'));}catch(e){}
   var remaining='';
   if(endDate&&!isNaN(endDate.getTime())){
    var diff=endDate-Date.now();
    if(diff>0){
     var d=Math.floor(diff/864e5),h=Math.floor((diff%864e5)/36e5),m=Math.floor((diff%36e5)/6e4);
     remaining=d+'天 '+h+'時 '+m+'分';
    }else remaining='已結束';
   }
   var html='<div class="ip-section"><div class="ip-section-title">🎋 端午節限定活動</div>';
   if(remaining)html+='<div class="ip-card"><div class="ip-card-desc">⏰ 剩餘時間: <b style="color:#ffb36f">'+remaining+'</b></div></div>';
   html+='<div class="ip-card">';
   html+='<div class="ip-card-head"><span class="ip-card-icon">⚔️</span><span class="ip-card-name">任務一：粽葉飄香</span></div>';
   html+='<div class="ip-card-desc">擊殺 '+targets.kill+' 名敵人</div>';
   var kp=prog.kill||0,kt=targets.kill||20;
   html+='<div class="ip-progress"><div class="ip-progress-fill" style="width:'+Math.min(100,kp/kt*100)+'%;background:linear-gradient(90deg,#ff9ecf,#ffb36f)"></div></div>';
   html+='<div class="ip-card-stats"><span class="ip-stat"><b>'+kp+'</b>/'+kt+'</span><span class="ip-stat">獎勵: $'+(rewards.kill||5000)+'</span>';
   if(claimed.kill)html+=' '+pnlTag('已領取','#4fa');
   else if(kp>=kt)html+=' <button class="ip-btn ip-btn-primary" onclick="document.getElementById(\'event-btn\').click();closeIslPanel()">領取</button>';
   html+='</div></div>';
   html+='<div class="ip-card">';
   html+='<div class="ip-card-head"><span class="ip-card-icon">🎮</span><span class="ip-card-name">任務二：划龍舟</span></div>';
   html+='<div class="ip-card-desc">完成 '+targets.round+' 回合</div>';
   var rp=prog.round||0,rt=targets.round||3;
   html+='<div class="ip-progress"><div class="ip-progress-fill" style="width:'+Math.min(100,rp/rt*100)+'%;background:linear-gradient(90deg,#68ffaa,#4af)"></div></div>';
   html+='<div class="ip-card-stats"><span class="ip-stat"><b>'+rp+'</b>/'+rt+'</span><span class="ip-stat">獎勵: $'+(rewards.round||10000)+'</span>';
   if(claimed.round)html+=' '+pnlTag('已領取','#4fa');
   else if(rp>=rt)html+=' <button class="ip-btn ip-btn-primary" onclick="document.getElementById(\'event-btn\').click();closeIslPanel()">領取</button>';
   html+='</div></div></div>';
   el.innerHTML=html;
  }

  // ─── 賽季 ───
  function pnlSeason(el){
   var sp=parseInt(localStorage.getItem('oc_sp'))||0;
   var sn=pnlLS('oc_season')||{};
   var daily=sn.dq||[];
   var weekly=sn.wq||[];
   var claimedD=sn.cd||[];
   var claimedW=sn.cw||[];
   var endDate=null;
   try{endDate=new Date(localStorage.getItem('oc_event_end'));}catch(e){}
   var remaining='';
   if(endDate&&!isNaN(endDate.getTime())){
    var diff=endDate-Date.now();
    if(diff>0){var d=Math.floor(diff/864e5),h=Math.floor((diff%864e5)/36e5);remaining=d+'天 '+h+'時';}
    else remaining='已結束';
   }
   var questDefs={kill:'擊殺敵人',kill_sniper:'狙擊擊殺',slide_kill:'滑鏟擊殺',headshot:'爆頭擊殺',pistol_rounds:'手槍回合',round:'完成回合'};
   var html='<div class="ip-section"><div class="ip-section-title">☢ 賽季系統</div>';
   html+='<div class="ip-card"><div class="ip-card-head"><span class="ip-card-icon">⚡</span><span class="ip-card-name">賽季點數 (SP): <b style="color:#ffb36f">'+sp+'</b></span></div>';
   if(remaining)html+='<div class="ip-card-desc">⏰ 剩餘: '+remaining+'</div>';
   html+='</div></div>';
   if(daily.length>0){
    html+='<div class="ip-section"><div class="ip-section-title">📅 每日任務</div>';
    daily.forEach(function(q,i){
     var prog=sn.d?((sn.d[i])||0):0;
     var pct=Math.min(100,prog/q.target*100);
     html+='<div class="ip-card">';
     html+='<div class="ip-card-head"><span class="ip-card-icon">📋</span><span class="ip-card-name">'+(questDefs[q.type]||q.type)+'</span>';
     if(claimedD&&claimedD[i])html+=' '+pnlTag('已領取','#4fa');
     html+='</div>';
     html+='<div class="ip-card-desc">'+q.desc+'</div>';
     html+='<div class="ip-progress"><div class="ip-progress-fill" style="width:'+pct+'%;background:linear-gradient(90deg,#ff9ecf,#ffb36f)"></div></div>';
     html+='<div class="ip-card-stats"><span class="ip-stat"><b>'+prog+'</b>/'+q.target+'</span><span class="ip-stat">$'+q.coins+' + '+q.sp+'SP</span></div>';
     html+='</div>';
    });
    html+='</div>';
   }
   if(weekly.length>0){
    html+='<div class="ip-section"><div class="ip-section-title">📆 每週任務</div>';
    weekly.forEach(function(q,i){
     var prog=sn.w?((sn.w[i])||0):0;
     var pct=Math.min(100,prog/q.target*100);
     html+='<div class="ip-card">';
     html+='<div class="ip-card-head"><span class="ip-card-icon">📋</span><span class="ip-card-name">'+(questDefs[q.type]||q.type)+'</span>';
     if(claimedW&&claimedW[i])html+=' '+pnlTag('已領取','#4fa');
     html+='</div>';
     html+='<div class="ip-card-desc">'+q.desc+'</div>';
     html+='<div class="ip-progress"><div class="ip-progress-fill" style="width:'+pct+'%;background:linear-gradient(90deg,#68ffaa,#4af)"></div></div>';
     html+='<div class="ip-card-stats"><span class="ip-stat"><b>'+prog+'</b>/'+q.target+'</span><span class="ip-stat">$'+q.coins+' + '+q.sp+'SP</span></div>';
     html+='</div>';
    });
    html+='</div>';
   }
   if(daily.length===0&&weekly.length===0)html+='<div class="ip-card"><div class="ip-card-desc" style="text-align:center;padding:20px">暫無任務，開始遊玩即可獲取</div></div>';
   el.innerHTML=html;
  }

  // ─── 排位 ───
  function pnlRank(el){
   var rk=pnlLS('oc_rank')||{};
   var stage=rk.s||0;
   var games=rk.g||0;
   var streak=rk.st||0;
   var best=rk.bs||0;
   var rankNames=['青銅','白銀','黃金','大師','超凡入聖'];
   var rankColors=['#cd7f32','#c0c0c0','#ffd700','#b45fff','#ff4466'];
   var rankSubs=[2,3,4,5,6];
   var total=0,ri=0,si=0;
   for(var i=0;i<rankSubs.length;i++){if(stage<total+rankSubs[i]){ri=i;si=stage-total;break;}total+=rankSubs[i];}
   if(ri>=rankNames.length)ri=rankNames.length-1;
   var rc=rankColors[ri]||'#fff';
   var html='<div class="ip-section"><div class="ip-section-title">🏆 排位賽</div>';
   html+='<div class="ip-card" style="text-align:center;padding:24px">';
   html+='<div class="ip-rank-badge" style="background:'+rc+'22;color:'+rc+';border:1px solid '+rc+'44;font-size:22px;margin-bottom:12px">'+rankNames[ri]+'</div>';
   html+='<div style="color:rgba(255,255,255,.5);font-size:13px;margin-bottom:4px">階段 '+(si+1)+'/'+rankSubs[ri]+'</div>';
   var pct=(si/rankSubs[ri])*100;
   html+='<div class="ip-progress" style="max-width:300px;margin:10px auto"><div class="ip-progress-fill" style="width:'+pct+'%;background:'+rc+'"></div></div>';
   html+='</div></div>';
   html+='<div class="ip-section"><div class="ip-section-title">📊 統計</div>';
   html+='<div class="ip-grid">';
   html+='<div class="ip-card" style="text-align:center"><div style="font-size:24px;font-weight:bold;color:#ffb36f">'+games+'</div><div class="ip-card-desc">總場次</div></div>';
   html+='<div class="ip-card" style="text-align:center"><div style="font-size:24px;font-weight:bold;color:#ff9ecf">'+streak+'</div><div class="ip-card-desc">當前連勝</div></div>';
   html+='<div class="ip-card" style="text-align:center"><div style="font-size:24px;font-weight:bold;color:#68ffaa">'+best+'</div><div class="ip-card-desc">最高連勝</div></div>';
   html+='</div></div>';
   el.innerHTML=html;
  }

  // ─── 商店 ───
  function pnlShop(el){
   var coin=parseInt(localStorage.getItem('oc_coin'))||0;
   var inv=pnlLS('oc_inv')||{};
   var shopItems=[
    {id:'ak47',name:'AK-47',icon:'🔫',price:0,desc:'全自動突擊步槍'},
    {id:'deagle',name:'沙漠之鷹',icon:'🔫',price:800,desc:'高傷害手槍'},
    {id:'awp',name:'AWP',icon:'🔭',price:1500,desc:'重型狙擊槍'},
    {id:'shotgun',name:'龍息霰彈',icon:'💥',price:600,desc:'近距離毀滅'},
     {id:'smg',name:'MP7',icon:'🔫',price:500,desc:'MP7，射速極快'},
     {id:'knife',name:'軍刀',icon:'🔪',price:300,desc:'近戰快速武器'},
    {id:'watergun',name:'水槍',icon:'💦',price:200,desc:'夏日限定水槍'}
   ];
   var html='<div class="ip-section"><div class="ip-section-title">💰 金幣: $'+coin+'</div></div>';
   html+='<div class="ip-section"><div class="ip-section-title">🏪 商店</div>';
   html+='<div class="ip-grid">';
   shopItems.forEach(function(item){
    var count=inv[item.id]||0;
    var owned=count>0;
    var canBuy=coin>=item.price;
    html+='<div class="ip-card">';
    html+='<div class="ip-card-head"><span class="ip-card-icon">'+item.icon+'</span><span class="ip-card-name">'+item.name+'</span></div>';
    html+='<div class="ip-card-desc">'+item.desc+'</div>';
    html+='<div class="ip-card-stats"><span class="ip-stat"><b>$'+item.price+'</b></span>';
    if(owned)html+='<span class="ip-stat">x'+count+'</span>';
    html+='</div>';
    if(owned)html+='<div style="margin-top:8px">'+pnlTag('已擁有','#4fa')+'</div>';
    else if(item.price===0)html+='<div style="margin-top:8px">'+pnlTag('免費','#4af')+'</div>';
     else html+='<div style="margin-top:8px"><button class="ip-btn '+(canBuy?'ip-btn-primary':'ip-btn-disabled')+'" onclick="if(confirm(\'購買 '+item.name+' $'+item.price+'?\')){var c=parseInt(localStorage.getItem(\'oc_coin\'))||0;if(c>='+item.price+'){localStorage.setItem(\'oc_coin\',c-'+item.price+');var inv=JSON.parse(localStorage.getItem(\'oc_inv\'))||{};inv[\''+item.id+'\']=(inv[\''+item.id+'\']||0)+1;localStorage.setItem(\'oc_inv\',JSON.stringify(inv));var og=JSON.parse(localStorage.getItem(\'oc_guns\'))||[\'ak47\'];if(og.indexOf(\''+item.id+'\')===-1){og.push(\''+item.id+'\');localStorage.setItem(\'oc_guns\',JSON.stringify(og));}openIslPanelByFn(\'商店\');}else alert(\'金幣不足！\');}">'+(canBuy?'購買':'金幣不足')+'</button></div>';
    html+='</div>';
   });
   html+='</div></div>';
   el.innerHTML=html;
  }

  // ─── 技能 ───
  function pnlSkills(el){
   var classes=[
    {id:'berserker',name:'狂戰士',icon:'⚔️',desc:'近戰專家',passive:'近戰傷害+30%',color:'#ff6b6b'},
    {id:'medic',name:'醫護兵',icon:'💊',desc:'團隊治療',passive:'每回合回復HP',color:'#68ffaa'},
    {id:'assault',name:'突擊兵',icon:'🎖',desc:'全能戰士',passive:'全武器傷害+10%',color:'#4af'},
    {id:'sniper',name:'狙擊手',icon:'🎯',desc:'精準射手',passive:'爆頭傷害+50%',color:'#ffb36f'},
    {id:'tank',name:'重裝兵',icon:'🛡',desc:'防禦專家',passive:'減傷+25%',color:'#a78bff'},
    {id:'ghost',name:'幽靈',icon:'👻',desc:'隱匿大師',passive:'移動速度+20%',color:'#ccc'}
   ];
   var curClass=localStorage.getItem('oc_class')||'berserker';
   var sp=parseInt(localStorage.getItem('oc_skillpoints'))||0;
   var tree=pnlLS('oc_skilltree')||{};
   var html='<div class="ip-section"><div class="ip-section-title">🔮 職業選擇 (技能點: <b style="color:#ffb36f">'+sp+'</b>)</div>';
   classes.forEach(function(c){
    var isActive=c.id===curClass;
    html+='<div class="ip-card" style="border-color:'+(isActive?c.color+'66':'rgba(255,255,255,.08)')+'">';
    html+='<div class="ip-card-head">';
    html+='<span class="ip-card-icon">'+c.icon+'</span>';
    html+='<span class="ip-card-name" style="color:'+(isActive?c.color:'#fff')+'">'+c.name+'</span>';
    if(isActive)html+=pnlTag('已裝備',c.color);
    html+='</div>';
    html+='<div class="ip-card-desc">'+c.desc+'</div>';
    html+='<div class="ip-card-desc" style="margin-top:4px">被動: <b style="color:'+c.color+'">'+c.passive+'</b></div>';
    if(!isActive)html+='<div style="margin-top:8px"><button class="ip-btn ip-btn-secondary cls-pick" data-cls="'+c.id+'" data-cname="'+c.name+'">裝備</button></div>';
    html+='</div>';
   });
   html+='</div>';
   el.innerHTML=html;
   el.querySelectorAll('.cls-pick').forEach(function(b){
    b.onclick=function(){
     localStorage.setItem('oc_class',b.dataset.cls);
     window._ocIslToast('已裝備職業：'+b.dataset.cname);
     openIslPanelByFn('技能');
    };
   });
  }

  // ─── 成就 ───
  function pnlAch(el){
   var achDefs=[
    {id:'first_blood',name:'First Blood',desc:'首次擊殺敵人',icon:'🔫',reward:500},
    {id:'century',name:'百人斬',desc:'累計擊殺100名敵人',icon:'💀',reward:2000},
    {id:'range_clear',name:'靶場之王',desc:'通過靶場挑戰',icon:'🎯',reward:3000},
    {id:'nuclear_god',name:'核子之神',desc:'核電廠連勝3次',icon:'☢',reward:5000},
    {id:'millionaire',name:'百萬富翁',desc:'累計獲得$1,000,000',icon:'💰',reward:10000},
    {id:'round30',name:'生存專家',desc:'單局存活30回合',icon:'⏱',reward:5000}
   ];
   var achData=pnlLS('oc_achievements')||{};
   var html='<div class="ip-section"><div class="ip-section-title">🏅 成就系統</div>';
   achDefs.forEach(function(a){
    var done=achData[a.id]&&achData[a.id].done;
    html+='<div class="ip-card" style="opacity:'+(done?1:0.7)+'">';
    html+='<div class="ip-card-head">';
    html+='<span class="ip-card-icon">'+a.icon+'</span>';
    html+='<span class="ip-card-name">'+a.name+'</span>';
    if(done)html+=pnlTag('已完成','#4fa');
    html+='</div>';
    html+='<div class="ip-card-desc">'+a.desc+'</div>';
    html+='<div class="ip-card-stats"><span class="ip-stat">獎勵: <b>$'+a.reward+'</b></span></div>';
    html+='</div>';
   });
   html+='</div>';
   el.innerHTML=html;
  }

  // ─── 排行榜 ───
  function pnlLB(el){
   var modes=[
    {key:'bossrush',name:'Boss Rush',icon:'👹'},
    {key:'single',name:'單人模式',icon:'🎮'},
    {key:'daily',name:'每日挑戰',icon:'📅'}
   ];
   var html='<div class="ip-section"><div class="ip-section-title">📊 排行榜</div>';
   modes.forEach(function(m){
    var entries=[];
    try{entries=JSON.parse(localStorage.getItem('oc_lb_'+m.key))||[];}catch(e){}
    html+='<div class="ip-section-title" style="margin-top:14px">'+m.icon+' '+m.name+'</div>';
    if(entries.length===0){
     html+='<div class="ip-card"><div class="ip-card-desc" style="text-align:center;padding:12px">尚無紀錄</div></div>';
    }else{
     entries.slice(0,10).forEach(function(e,i){
      var medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1);
      html+='<div class="ip-card" style="display:flex;align-items:center;gap:10px;padding:10px 14px">';
      html+='<span style="font-size:14px;min-width:30px;text-align:center">'+medal+'</span>';
      html+='<span style="color:#fff;font-size:13px;flex:1">'+(e.name||'Anonymous')+'</span>';
      html+='<span style="color:#ffb36f;font-size:13px;font-weight:bold">'+e.score+'</span>';
      html+='</div>';
     });
    }
   });
   html+='</div>';
    el.innerHTML=html;
   }
   window.openIslPanelByFn=openIslPanelByFn;
   window.closeIslPanel=closeIslPanel;

  function updatePlayer(dt){
   if(islPanelOpen||islLaunchActive||window._moonRoverActive){return;}
   var fwd=new THREE.Vector3(-Math.sin(camTheta),0,-Math.cos(camTheta));
   var rgt=new THREE.Vector3(Math.cos(camTheta),0,-Math.sin(camTheta));
   var md=new THREE.Vector3();
   if(keys['KeyW'])md.add(fwd);if(keys['KeyS'])md.sub(fwd);
   if(keys['KeyA'])md.sub(rgt);if(keys['KeyD'])md.add(rgt);
   isWalk=md.length()>0.1;
   if(isWalk){md.normalize();playerYaw=Math.atan2(-md.x,-md.z);}
   var spd=isWalk?6.5:0;
   var nx=playerPos.x+md.x*spd*dt,nz=playerPos.z+md.z*spd*dt;
    playerPos.x=nx;playerPos.z=nz;
   var gh=terrainH(playerPos.x,playerPos.z);
    if(MOON){
     var jpActive=keys['Space']&&jpFuel>0&&!islOnGround;
     var jpGroundThrust=keys['Space']&&jpFuel>0&&islOnGround;
     if(islOnGround&&jpGroundThrust){islVelY=8;islOnGround=false;jpFuel=Math.max(0,jpFuel-jpFuelDrain*dt*2);}
     if(islOnGround&&!keys['Space']){jpFuel=Math.min(jpMaxFuel,jpFuel+jpRechargeRate*dt);}
     if(!islOnGround){
      if(jpActive){islVelY=Math.min(islVelY+jpThrust*dt,jpDrift);jpFuel=Math.max(0,jpFuel-jpFuelDrain*dt);}
      else if(islOnGround&&keys['Space']){islVelY=6.8;}
      else islVelY-=3.3*dt;
      playerPos.y+=islVelY*dt;
      if(playerPos.y<=gh){playerPos.y=gh;islVelY=0;islOnGround=true;}
     }else playerPos.y=gh+0.02;
    }else{
     if(islOnGround&&keys['Space']){islVelY=7;islOnGround=false;}
     if(!islOnGround){islVelY-=9*dt;playerPos.y+=islVelY*dt;if(playerPos.y<=gh){playerPos.y=gh;islVelY=0;islOnGround=true;}}
     else playerPos.y=gh+0.02;
    }
    var jp=playerGroup._jetpack;
    if(jp){
     var nozzle=jp.children[3];
     var flame=jp.children[4];
     if(MOON&&(jpActive||jpGroundThrust)){
      flame.material.opacity=0.7+Math.sin(t*40)*0.3;
      flame.scale.setScalar(0.6+jpFuel*0.008);
      flame.material.color.setHex(jpFuel<20?0xff3322:0xff8833);
      if(typeof startJetSound==='function')startJetSound();
     }else{
      flame.material.opacity*=0.85;
      if(typeof stopJetSound==='function')stopJetSound();
     }
     var fBar=document.getElementById('jp-fuel-bar');
     if(fBar){
      fBar.style.display=MOON?'block':'none';
      var pct=Math.round(jpFuel/jpMaxFuel*100);
      var fill=document.getElementById('jp-fuel-fill');
      var pctEl=document.getElementById('jp-fuel-pct');
      if(fill){fill.style.width=pct+'%';fill.style.background=pct<20?'linear-gradient(90deg,#f33,#f66)':pct<50?'linear-gradient(90deg,#fa3,#fc3)':'linear-gradient(90deg,#2f6,#4f8)';}
      if(pctEl)pctEl.textContent=pct+'%';
     }
    }else{var fBar2=document.getElementById('jp-fuel-bar');if(fBar2)fBar2.style.display='none';if(typeof stopJetSound==='function')stopJetSound();}
  playerGroup.position.copy(playerPos);
  playerGroup.rotation.y=playerYaw+Math.PI;
  animT+=dt;
  var al=playerGroup._armL,ar=playerGroup._armR,ll=playerGroup._legL,lr=playerGroup._legR,bd=playerGroup._body;
  if(isWalk){
   var wt=animT*9;
   al.rotation.x=Math.sin(wt)*0.55;ar.rotation.x=-Math.sin(wt)*0.55;
   ll.rotation.x=-Math.sin(wt)*0.55;lr.rotation.x=Math.sin(wt)*0.55;
  }else{
   al.rotation.x*=0.9;ar.rotation.x*=0.9;ll.rotation.x*=0.9;lr.rotation.x*=0.9;
   bd.position.y=0.58+Math.sin(animT*2)*0.015;
  }
 }
 function updateNPCs(t,dt){
  npcs.forEach(function(n,i){
   var ud=n.userData,s=ud.size;
   if(ud.state==='walk'&&ud.wp){
    var tgt=ud.wp[ud.wpi];
    var dx=tgt[0]-n.position.x,dz=tgt[1]-n.position.z;
    var d=Math.sqrt(dx*dx+dz*dz);
    if(d<0.4){ud.wpi=(ud.wpi+1)%ud.wp.length;}
    else{
     var vx=dx/d*ud.speed*dt,vz=dz/d*ud.speed*dt;
     n.position.x+=vx;n.position.z+=vz;
     var targetRot=Math.atan2(vx,vz);
     var cur=n.rotation.y;var diff=targetRot-cur;
     while(diff>Math.PI)diff-=6.283;while(diff<-Math.PI)diff+=6.283;
     n.rotation.y+=diff*0.1;
     var wt=t*7*s;
     ud.armL.rotation.x=Math.sin(wt)*0.5;ud.armR.rotation.x=-Math.sin(wt)*0.5;
     ud.legL.rotation.x=-Math.sin(wt)*0.5;ud.legR.rotation.x=Math.sin(wt)*0.5;
     n.position.y=terrainH(n.position.x,n.position.z);
    }
   }else if(ud.state==='jump'){
    var jy=Math.abs(Math.sin(t*4+ud.ph))*0.5;
    n.position.y=terrainH(n.position.x,n.position.z)+jy;
    ud.armL.rotation.z=0.4+jy;ud.armR.rotation.z=-0.4-jy;
   }else if(ud.state==='wave'){
    var cyc=(t+ud.ph)%4;
    if(cyc<1.4){ud.armR.rotation.z=-2.4+Math.sin(t*12)*0.3;}
    else ud.armR.rotation.z*=0.9;
    ud.head.rotation.y=Math.sin(t*0.6+ud.ph)*0.3;
   }else if(ud.state==='sit'){
    ud.head.rotation.y=Math.sin(t*0.4+ud.ph)*0.5;
    n.position.y=terrainH(n.position.x,n.position.z)-0.18+Math.sin(t*1.5+ud.ph)*0.01;
   }else if(ud.state==='fish'){
    ud.head.rotation.y=Math.sin(t*0.3+ud.ph)*0.15;
    if(ud.bobber)ud.bobber.position.y=-0.72+Math.sin(t*2.2+ud.ph)*0.06;
    if(ud.rodMesh)ud.rodMesh.rotation.x=0.9+Math.sin(t*2.2+ud.ph)*0.04;
   }else{
    ud.head.rotation.y=Math.sin(t*0.5+ud.ph)*0.45;
    n.position.y=terrainH(n.position.x,n.position.z)+Math.abs(Math.sin(t*2+ud.ph))*0.012;
   }
  });
 }
  function updateCam(){
   if(window._rocketLaunchAnim)return;
   var tgt=new THREE.Vector3(playerPos.x,playerPos.y+1.6,playerPos.z);
  var off=new THREE.Vector3(Math.sin(camTheta)*Math.cos(camPhi)*camDist,Math.sin(camPhi)*camDist+0.5,Math.cos(camTheta)*Math.cos(camPhi)*camDist);
  var desired=tgt.clone().add(off);
  var gy=terrainH(desired.x,desired.z)+0.5;
  if(desired.y<gy)desired.y=gy;
  camera.position.lerp(desired,0.09);
  camTarget.lerp(tgt,0.09);
  camera.lookAt(camTarget);
 }
 function updateOcean(t){
  for(var i=0;i<waterVerts.count;i++){
   var x=waterVerts.getX(i),y=waterVerts.getY(i);
   waterVerts.setZ(i,Math.sin(x*0.06+t*0.8)*0.35+Math.cos(y*0.05+t*0.6)*0.28);
  }
  waterVerts.needsUpdate=true;
 }
 function updateAmbient(t,dt){
  clouds.forEach(function(c){c.position.x=c.userData.sx+Math.sin(t*c.userData.sp*0.1)*8;});
  butterflies.forEach(function(b){
   var u=b.userData;
   u.a+=dt*u.sp*0.5;
   b.position.set(Math.cos(u.a)*u.r,terrainH(Math.cos(u.a)*u.r,Math.sin(u.a)*u.r)+u.h+Math.sin(t*2+u.a)*0.4,Math.sin(u.a)*u.r);
   b.rotation.y=-u.a;
   var flap=Math.sin(t*14+u.a*3)*0.9;
   u.w1.rotation.y=flap;u.w2.rotation.y=-flap;
  });
  petals.forEach(function(p){
   var u=p.userData;
   u.y-=u.vy*dt;if(u.y<terrainH(u.x,u.z))u.y=3.5+Math.random()*4;
   p.position.set(u.x+Math.sin(t+u.y)*0.4,u.y,u.z);
   p.rotation.x+=u.rs*dt;p.rotation.z+=u.rs*dt;
  });
  birds.forEach(function(b){
   var u=b.userData;
   var a=t*u.sp+u.ph;
   b.position.set(u.cx+Math.cos(a)*u.r,u.h+Math.sin(t*0.7)*1.5,u.cz+Math.sin(a)*u.r);
   b.rotation.y=-a;
   var flap=Math.sin(t*9+u.ph)*0.7;
   u.w1.rotation.y=flap;u.w2.rotation.y=-flap;
  });
  droplets.forEach(function(d){
   var u=d.userData;
   var cyc=(t*1.2+u.ph)%1;
   var ang=u.ph*3+cyc*2;
   d.position.set(Math.cos(ang)*u.r*(1-cyc*0.4),2.7+cyc*2.2-(cyc*cyc*3.4),Math.sin(ang)*u.r*(1-cyc*0.4));
   d.material.opacity=1-cyc*0.6;
  });
  if(fallSheet)fallSheet.material.opacity=0.45+Math.sin(t*6)*0.12;
  mistPuffs.forEach(function(m){
   m.position.y+=Math.sin(t*2+m.userData.ph)*0.002;
   m.material.opacity=0.25+Math.sin(t*1.5+m.userData.ph)*0.15;
   m.scale.setScalar(1+Math.sin(t+m.userData.ph)*0.15);
  });
 }

 camera=new THREE.PerspectiveCamera(55,window.innerWidth/window.innerHeight,0.1,400);
 camera.position.set(0,10,55);
 clock=new THREE.Clock();
 tickFn=function(){
  if(!act()){islandLoop=null;return;}
  if(!islandLoop)return;
  requestAnimationFrame(islandLoop);
  var dt=Math.min(clock.getDelta(),0.05);
  var t=clock.getElapsedTime();
   updatePlayer(dt);
   if(window._moonRoverActive&&window._moonRover){
    var rv=window._moonRover;
    var fwd=new THREE.Vector3(-Math.sin(camTheta),0,-Math.cos(camTheta));
    var rgt=new THREE.Vector3(Math.cos(camTheta),0,-Math.sin(camTheta));
    var md=new THREE.Vector3();
    if(keys['KeyW']||keys['ArrowUp'])md.add(fwd);
    if(keys['KeyS']||keys['ArrowDown'])md.sub(fwd);
    if(keys['KeyA']||keys['ArrowLeft'])md.add(rgt);
    if(keys['KeyD']||keys['ArrowRight'])md.sub(rgt);
    var isMoving=md.length()>0.01;
    if(isMoving){md.normalize();rv.yaw=Math.atan2(-md.x,-md.z);}
    var spd=isMoving?10:0;
    rv.speed+=(spd-rv.speed)*Math.min(1,dt*6);
    var nx=rv.mesh.position.x+md.x*rv.speed*dt;
     var nz=rv.mesh.position.z+md.z*rv.speed*dt;
     rv.mesh.position.x=nx;rv.mesh.position.z=nz;
    rv.mesh.position.y=terrainH(rv.mesh.position.x,rv.mesh.position.z)+0.05;
    rv.mesh.rotation.y+=((rv.yaw-Math.PI/2)-rv.mesh.rotation.y)*0.1;
    playerPos.set(rv.mesh.position.x,rv.mesh.position.y+1.4,rv.mesh.position.z);
    playerGroup.position.copy(playerPos);
   if(playerGroup._jetpack)playerGroup._jetpack.visible=MOON;
    playerGroup.rotation.y=rv.mesh.rotation.y+Math.PI;
    if(isMoving){
     var wt=t*8;
     playerGroup._armL.rotation.x=Math.sin(wt)*0.55;
     playerGroup._armR.rotation.x=-Math.sin(wt)*0.55;
     playerGroup._legL.rotation.x=-Math.sin(wt)*0.4;
     playerGroup._legR.rotation.x=Math.sin(wt)*0.4;
    }else{
     playerGroup._armL.rotation.x*=0.9;playerGroup._armR.rotation.x*=0.9;
     playerGroup._legL.rotation.x*=0.9;playerGroup._legR.rotation.x*=0.9;
    }
   }
   updateNPCs(t,dt);
   updateCam();
  if(!MOON)updateOcean(t);
  if(moonTick)moonTick(t,dt);
  if(rocketBase&&rocketBase.beacon){
   rocketBase.beacon.material.opacity=0.15+Math.sin(t*3)*0.25;
   rocketBase.beaconRing.material.opacity=0.15+Math.sin(t*3)*0.2;
   rocketBase.beaconLight.intensity=1+Math.sin(t*3)*0.8;
  }
  updateAmbient(t,dt);
  updateRemotePlayers(dt);
    if(!MOON&&rocketBase&&!islLaunchActive){
     var rdx=playerPos.x-rocketBase.pos.x,rdz=playerPos.z-rocketBase.pos.z;
     var rdist=Math.sqrt(rdx*rdx+rdz*rdz);
     var islPrompt=document.getElementById('isl-help');
     if(rdist<rocketBase.radius){
       islPrompt.innerHTML='按 <b style="color:#ff6644">E</b> 搭乘火箭前往月球基地 🚀';
       islPrompt.style.bottom='130px';
       if(keys['KeyE']){triggerRocketLaunch();}
      }else if(treasurePlatform&&!treasurePlatform.opened&&playerPos.distanceTo(treasurePlatform.pos)<treasurePlatform.radius){
       islPrompt.innerHTML='按 <b style="color:#ffdd44">E</b> 開啟神秘寶箱 ✨';
       islPrompt.style.bottom='130px';
       if(keys['KeyE']&&!window._chestCD){
        window._chestCD=true;treasurePlatform.opened=true;
        treasureChest._lid.rotation.x=-1.2;
        var tMat=treasureChest.material.clone();tMat.emissive=new THREE.Color(0xffaa00);tMat.emissiveIntensity=0.5;treasureChest.material=tMat;
        unlockCosmicSkin();
        toast('✨ 寶箱已開啟！「宇宙星塵」槍皮已解鎖！（前往武器庫裝備）');
        setTimeout(function(){window._chestCD=false;},1000);
       }
      }else{
       islPrompt.innerHTML='WASD 移動 ｜ 滑鼠旋轉 ｜ 滾輪縮放 ｜ ESC 開啟模式選單';
       islPrompt.style.bottom='76px';
      }
    }
   if(MOON&&window._moonInteractPos){
    var islPrompt=document.getElementById('isl-help');
    var mp=window._moonInteractPos;
    var nearRover=playerPos.distanceTo(mp.rover);
    var nearPad=playerPos.distanceTo(mp.pad);
    var nearGreenhouse=playerPos.distanceTo(mp.greenhouse);
    var nearFlag=playerPos.distanceTo(mp.flag);
     if(nearRover<4&&!window._moonRoverActive){
     islPrompt.innerHTML='按 <b style="color:#ffcc33">E</b> 乘坐探險車 🚗';
     islPrompt.style.bottom='130px';
     if(keys['KeyE']&&!window._moonRideCD){
      window._moonRideCD=true;window._moonRoverActive=true;
      var rv=window._moonRover;playerPos.copy(rv.mesh.position);playerPos.y+=1.4;
      toast('🚗 WASD 開車 ｜ E 下車');
      setTimeout(function(){window._moonRideCD=false;},500);
     }
    }else if(window._moonRoverActive){
     islPrompt.innerHTML='按 <b style="color:#ffcc33">E</b> 下車 🚗';
     islPrompt.style.bottom='130px';
      if(keys['KeyE']&&!window._moonRideCD){
       window._moonRideCD=true;window._moonRoverActive=false;
       var rv=window._moonRover;
       playerPos.set(rv.mesh.position.x+3,terrainH(rv.mesh.position.x+3,rv.mesh.position.z)+0.1,rv.mesh.position.z+3);
       playerGroup.position.copy(playerPos);
       rv.speed=0;
       setTimeout(function(){window._moonRideCD=false;},1200);
      }
    }else if(nearPad<9&&nearRover>=4){
     islPrompt.innerHTML='按 <b style="color:#44ddff">E</b> 搭乘火箭返回地球 🌍';
     islPrompt.style.bottom='130px';
     if(keys['KeyE']&&!window._moonBackCD){window._moonBackCD=true;keys={};setTimeout(function(){localStorage.removeItem('oc_isl_map');window._ocIslReboot();},200);}
    }else if(nearGreenhouse<5){
     islPrompt.innerHTML='🌱 月球溫室 — 太空農場實驗區';
     islPrompt.style.bottom='130px';
    }else if(nearFlag<3){
     islPrompt.innerHTML='🚩 OC 島旗幟 — 月球基地已插旗！';
     islPrompt.style.bottom='130px';
    }else{
     islPrompt.innerHTML='WASD 移動 ｜ 空白鍵跳躍 ｜ 滑鼠旋轉 ｜ 滾輪縮放';
     islPrompt.style.bottom='76px';
    }
   }
  // Send position to lobby at ~10Hz
  wsSendTimer+=dt;
  if(wsSendTimer>0.1&&wsConnected){
   wsSendTimer=0;
    wsSend({type:'lobby_pos',x:playerPos.x,z:playerPos.z,rot:playerYaw});
   }
   if(treasurePlatform&&treasurePlatform.sparkles){
    treasurePlatform.sparkles.forEach(function(sp){
     var u=sp.userData;u.a+=u.sp*0.02;
     sp.position.set(Math.cos(u.a)*u.r,u.by+Math.sin(t*2+u.a)*0.4,Math.sin(u.a)*u.r);
     sp.material.opacity=0.4+Math.sin(t*3+u.a)*0.3;
    });
   }
   renderer.render(scene,camera);
 };
 islandLoop=tickFn;
 requestAnimationFrame(islandLoop);

 window.addEventListener('resize',function(){
  if(!act())return;
  camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
 });
  setTimeout(function(){
   toast('🏝 歡迎來到 OC 島！拖曳旋轉視角，WASD 移動');
   wsConnect();
   if(MOON){
    var fuelBar=document.createElement('div');
    fuelBar.id='jp-fuel-bar';
    fuelBar.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);width:200px;z-index:10;display:none;pointer-events:none;font-family:Arial';
    fuelBar.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:13px;color:#3a3;color:#8f8;letter-spacing:2px;text-shadow:0 0 6px rgba(100,255,100,.4)">🚀 噴射燃料</span><span id="jp-fuel-pct" style="font-size:11px;color:rgba(255,255,255,.5)">100%</span></div><div style="width:100%;height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden"><div id="jp-fuel-fill" style="width:100%;height:100%;background:linear-gradient(90deg,#2f6,#4f8);border-radius:3px;transition:width .15s,background .3s"></div></div><div style="font-size:10px;color:rgba(255,255,255,.3);margin-top:3px;letter-spacing:1px;text-align:center">按住 <b style="color:#8f8">空白鍵</b> 噴射飛行</div>';
    document.getElementById('island-root').appendChild(fuelBar);
   }
  },800);
}
window._ocIslReboot=function(){
 if(islandLoop){islandLoop=null;}
 if(clock){try{clock.stop();}catch(e){}}
 try{wsDisconnect();}catch(e){}
 if(renderer&&renderer.dispose)renderer.dispose();
 if(rootEl){var oldCv=rootEl.querySelector('canvas');if(oldCv)oldCv.remove();}
 if(scene){scene.traverse(function(o){
  if(o.geometry&&o.geometry.dispose)o.geometry.dispose();
  if(o.material){
   if(Array.isArray(o.material))o.material.forEach(function(m){if(m.map)m.map.dispose();m.dispose();});
   else{if(o.material.map)o.material.map.dispose();o.material.dispose();}
  }
 });}
 scene=null;camera=null;
 npcs=[];butterflies=[];petals=[];birds=[];droplets=[];clouds=[];
 waterGeo=null;waterVerts=null;fallSheet=null;mistPuffs=[];
   remotePlayers={};moonFlag=null;moonEarth=null;moonTick=null;
   islOnGround=true;islVelY=0;jpFuel=jpMaxFuel;
  inited=false;
 boot();
 inited=true;
};
 window.ocIslandOpen=function(){
  var r=rootEl;if(!r)return;
  if(!inited&&!window.THREE){alert('3D 引擎尚未載入，請稍後再試');return;}
  r.style.display='block';r.classList.remove('blurred');
  window._ocIslActive=true;keys={};isDragging=false;
 var dd=document.getElementById('mode-dropdown'),ps=document.getElementById('party-submenu'),exs=document.getElementById('ext-submenu');
 if(dd)dd.classList.remove('show');if(ps)ps.classList.remove('show');if(exs)exs.classList.remove('show');
 if(!inited){inited=true;boot();}
 else{
  if(clock)clock.getDelta();
  refreshIslInfo();
  if(window._ocIslCloseMode)window._ocIslCloseMode();
  if(islandLoop===null&&tickFn){islandLoop=tickFn;requestAnimationFrame(islandLoop);}
  if(!wsConnected)wsConnect();
 }
 refreshIslInfo();
};
window.ocIslandClose=function(){
 window._ocIslActive=false;
 if(rootEl)rootEl.style.display='none';
 if(islandLoop){islandLoop=null;}
 wsDisconnect();
 if(window._ocIslCloseMode)window._ocIslCloseMode();
};
})();
(function(){
var MENU_MODES=[
 {id:'solo',name:'單人模式',desc:'經典模式',icon:'🎮',c1:'#4a90d9',c2:'#6bb5ff'},
 {id:'multi2',name:'雙人連線',desc:'2人合作',icon:'👥',c1:'#4ac29a',c2:'#7be8c0'},
 {id:'multi4',name:'四人連線',desc:'4人合作',icon:'👥',c1:'#4ac29a',c2:'#7be8c0'},
 {id:'hybrid4',name:'單多混合',desc:'真人+AI 自由混戰',icon:'🤖',c1:'#7a5ce0',c2:'#b48bff'},
 {id:'daily',name:'每日挑戰',desc:'限時挑戰',icon:'🔥',c1:'#e85d3a',c2:'#ff9a6c'},
 {id:'bossrush',name:'Boss大戰',desc:'挑戰Boss',icon:'💀',c1:'#8b2252',c2:'#c44a7f'},
 {id:'ufo2',name:'UFO大戰2人',desc:'太空射擊',icon:'🛸',c1:'#6b5ce7',c2:'#9b8bff'},
 {id:'ufo4',name:'UFO大戰4人',desc:'太空射擊',icon:'🛸',c1:'#6b5ce7',c2:'#9b8bff'},
 {id:'bomb2',name:'炸彈2人',desc:'炸彈大作戰',icon:'💣',c1:'#f2953f',c2:'#ffc46b'},
 {id:'bomb4',name:'炸彈4人',desc:'炸彈大作戰',icon:'💣',c1:'#f2953f',c2:'#ffc46b'},
 {id:'party_obstacle',name:'障礙賽跑',desc:'趣味障礙賽',icon:'🏁',c1:'#ff7ab8',c2:'#ffb3de',partyType:'obstacle'},
 {id:'party_battle',name:'平台大亂鬥',desc:'平台混戰',icon:'⚔️',c1:'#ff6b81',c2:'#ffa07a',partyType:'battle'},
 {id:'party_target',name:'射擊得分',desc:'射靶挑戰',icon:'🎯',c1:'#e8c94a',c2:'#ffe98a',partyType:'target'},
 {id:'party_memory',name:'記憶翻牌',desc:'翻牌配對',icon:'🧠',c1:'#8a5be0',c2:'#c39bff',partyType:'memory'},
 {id:'party_coinrush',name:'金幣搶奪',desc:'搶金幣',icon:'💰',c1:'#3fbf7f',c2:'#7fe8b0',partyType:'coinrush'},
 {id:'extraction',name:'摸金模式',desc:'搜刮撤離',icon:'⛏',c1:'#a07a4a',c2:'#d4af7a',extraction:true},
 {id:'range',name:'射擊訓練',desc:'練習射擊',icon:'🎯',c1:'#44aacc',c2:'#77ddee'}
];
var _mmSelected=null;
var ov=document.getElementById('menu-mode-overlay');
var grid=document.getElementById('mm-card-grid');
var goBtn=document.getElementById('mm-go');
var mb=document.getElementById('mode-btn');
if(grid){grid.innerHTML='';MENU_MODES.forEach(function(m){
  var c=document.createElement('button');c.className='mm-card';c.dataset.mid=m.id;
  c.style.setProperty('--c1',m.c1);c.style.setProperty('--c2',m.c2);
 c.innerHTML='<span class="cico">'+m.icon+'</span><span class="cname">'+m.name+'</span><span class="cdesc">'+m.desc+'</span>';
 c.onclick=function(){var prev=grid.querySelector('.sel');if(prev)prev.classList.remove('sel');c.classList.add('sel');_mmSelected=m;goBtn.classList.add('ready');var es=document.getElementById('mm-ext-sub');if(es)es.style.display=(m.extraction?'flex':'none');if(m.extraction){var opt2=document.querySelector('#mode-dropdown .mode-opt[data-mode="extraction"]');if(opt2){document.querySelectorAll('#mode-dropdown .mode-opt').forEach(function(x){x.classList.remove('selected');});opt2.classList.add('selected');}var lbl2=document.getElementById('menu-mode-btn-label');if(lbl2)lbl2.innerHTML='⛏ 摸金模式 <span class="mode-arrow">▶</span>';}};
 grid.appendChild(c);
});}
function openMenuOverlay(){if(!ov)return;ov.classList.add('open');if(window.US)window.US.refreshHub();var es=document.getElementById('mm-ext-sub');if(es){es.style.display='none';var btns=es.querySelectorAll('.mm-ext-opt');for(var bi=0;bi<btns.length;bi++)btns[bi].classList.remove('sel');var pk=es.querySelector('.mm-ext-pick');if(pk)pk.textContent='';}var selOpt=document.querySelector('#mode-dropdown .mode-opt.selected');var preId=selOpt?selOpt.dataset.mode:null;if(preId){var match=MENU_MODES.find(function(m){return m.id===preId;});if(match){var card=grid.querySelector('.mm-card[data-mid=\"'+preId+'\"]');if(card){grid.querySelectorAll('.mm-card').forEach(function(x){x.classList.remove('sel');});card.classList.add('sel');_mmSelected=match;goBtn.classList.add('ready');var es2=document.getElementById('mm-ext-sub');if(es2)es2.style.display=(match.extraction?'flex':'none');}}}}
function closeMenuOverlay(){if(!ov)return;ov.classList.remove('open');_mmSelected=null;goBtn.classList.remove('ready');}
window._openMenuOverlay=openMenuOverlay;
window._closeMenuOverlay=closeMenuOverlay;
if(mb)mb.addEventListener('click',function(e){e.stopPropagation();openMenuOverlay();});
if(goBtn)goBtn.addEventListener('click',function(){
 if(!_mmSelected){var so=document.querySelector('#mode-dropdown .mode-opt.selected');if(so){var pre=MENU_MODES.find(function(m){return m.id===so.dataset.mode;});if(pre)_mmSelected=pre;}}
 if(!_mmSelected)return;
 var idv=_mmSelected.id,nm=_mmSelected.name,pt=_mmSelected.partyType;
 closeMenuOverlay();
 document.getElementById('menu-mode-btn-label').innerHTML=nm+' <span class="mode-arrow">▶</span>';
 if(pt){if(window.showPartyCountSelect){window.showPartyCountSelect(pt);}return;}
 if(idv==='extraction'){
   // 按 GO → 難度選擇 modal → 開始匹配
   if(window._extRequestStart)window._extRequestStart();else startExtractionMatchmaking();
   return;
  }
 if(idv==='range'){var rb=document.getElementById('range-btn');if(rb){rb.click();return;}}
 var pb=document.getElementById('play-btn');
 var opt=document.querySelector('#mode-dropdown .mode-opt[data-mode="'+idv+'"]');
  if(opt){document.querySelectorAll('#mode-dropdown .mode-opt').forEach(function(x){x.classList.remove('selected');});opt.classList.add('selected');document.getElementById('menu-mode-btn-label').innerHTML=(opt.textContent||nm)+' <span class="mode-arrow">▶</span>';closeMenuOverlay();return;}
 window._floatMsg('⚠ 找不到 '+nm+' 的入口','#f66');
 });
// 模式選單內嵌 普通/機密 子選單按鈕（點選只記錄難度，按 GO 才開始匹配）
document.querySelectorAll('#mm-ext-sub .mm-ext-opt').forEach(function(btn){
 btn.addEventListener('click',function(){
  var mode=btn.dataset.extmode;
  var sib=btn.parentNode.querySelectorAll('.mm-ext-opt');
  for(var si=0;si<sib.length;si++)sib[si].classList.remove('sel');
  btn.classList.add('sel');
  window._extDiffSelected=mode;
  var pk=btn.parentNode.parentNode.querySelector('.mm-ext-pick');
  if(pk)pk.textContent='已選：'+(mode==='classified'?'💎 機密摸金模式':'⛏ 普通摸金模式')+'　→ 按「選擇此模式」開始匹配';
 });
});
if(document.getElementById('mm-cancel'))document.getElementById('mm-cancel').onclick=closeMenuOverlay;
if(ov)ov.addEventListener('click',function(e){if(e.target===ov)closeMenuOverlay();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov&&ov.classList.contains('open'))closeMenuOverlay();});
})();
(function(){var ib=document.getElementById('island-btn');if(ib)ib.addEventListener('click',function(){if(window.ocIslandOpen)window.ocIslandOpen();});})();

document.getElementById('play-btn').onclick=function(){
  var mode=document.querySelector('#mode-dropdown .mode-opt.selected');
  var modeVal=mode?mode.dataset.mode:'solo';
  // 雙人／四人模式本來就是要跟好友一起玩，組隊中不應該封鎖 GO
  if(currentTeamId && modeVal!=='multi2' && modeVal!=='multi4'){window.showTeamBlockTip();return;}
  var modeVal=mode?mode.dataset.mode:'solo';
  if(modeVal==='extraction'){
    document.getElementById('mode-dropdown').classList.remove('show');
    if(window._extRequestStart)window._extRequestStart();else startExtractionMatchmaking();
    return;
  }
  if(modeVal==='party'){
    document.getElementById('mode-dropdown').classList.remove('show');
    var ps=document.getElementById('party-submenu');
    if(ps)ps.style.display='flex';
    return;
  }
  document.getElementById('menu').style.display='none';
  dailyChallenge=false;bossRushMode=false;ufoMode=false;bombMode=false;
  if(modeVal==='hybrid4'||modeVal==='multi2'||modeVal==='multi4'||modeVal==='solo'){
    // 新角色選擇頁取代「選擇職業」：框框選角色 → 方晶跳出來蹦跳 → 這頁倒數 5 秒 → 直接開打
    ocCsOpen(modeVal);
  }else if(modeVal==='daily'){
    dailyChallenge=true;dailyKills=0;dailyRounds=0;
    renderClassSelect();
    document.getElementById('class-select').style.display='flex';
  }else if(modeVal==='bossrush'){
    bossRushMode=true;
    renderClassSelect();
    document.getElementById('class-select').style.display='flex';
  }else if(modeVal==='ufo2'||modeVal==='ufo4'){
    ufoMode=true;
    renderClassSelect();
    document.getElementById('class-select').style.display='flex';
    document.getElementById('class-select').dataset.multi=modeVal==='ufo2'?'2':'4';
  }else if(modeVal==='bomb2'||modeVal==='bomb4'){
    bombMode=true;
    renderClassSelect();
    document.getElementById('class-select').style.display='flex';
    document.getElementById('class-select').dataset.multi=modeVal==='bomb2'?'2':'4';
  }else if(modeVal==='extraction'){
    if(window._extRequestStart)window._extRequestStart();else startExtractionMatchmaking();
    return;
  }else{
    renderClassSelect();
    document.getElementById('class-select').style.display='flex';
  }
};
// ── 側邊模式框架切換（派對 / 摸金） ──
(function(){
  var menuEl=document.getElementById('menu');
  var tog=document.getElementById('mf-toggle');
  var panel=document.getElementById('mf-panel');
  if(!menuEl||!tog||!panel)return;
  window._ocMenuFrame=localStorage.getItem('oc_menu_frame')||'party';
  function applyFrame(f){
    window._ocMenuFrame=f;
    localStorage.setItem('oc_menu_frame',f);
    document.body.classList.toggle('mf-party',f==='party');
    document.body.classList.toggle('mf-ext',f==='ext');
    panel.querySelectorAll('.mf-card').forEach(function(c){c.classList.toggle('sel',c.dataset.mf===f);});
    // 摸金框架：自動選中摸金模式；派對框架：若選中摸金則退回單人
    var extOpt=document.querySelector('#mode-dropdown .mode-opt[data-mode="extraction"]');
    var soloOpt=document.querySelector('#mode-dropdown .mode-opt[data-mode="solo"]');
    var lbl=document.getElementById('menu-mode-btn-label');
    if(f==='ext'&&extOpt){
      document.querySelectorAll('#mode-dropdown .mode-opt').forEach(function(x){x.classList.remove('selected');});
      extOpt.classList.add('selected');
      if(lbl)lbl.innerHTML='⛏ 摸金模式 <span class="mode-arrow">▶</span>';
    }else if(f==='party'){
      var sel=document.querySelector('#mode-dropdown .mode-opt.selected');
      if(sel&&sel.dataset.mode==='extraction'&&soloOpt){
        document.querySelectorAll('#mode-dropdown .mode-opt').forEach(function(x){x.classList.remove('selected');});
        soloOpt.classList.add('selected');
        if(lbl)lbl.innerHTML='🎮 單人模式 <span class="mode-arrow">▶</span>';
      }
    }
  }
  applyFrame(window._ocMenuFrame);
  tog.addEventListener('click',function(e){
    e.stopPropagation();
    menuEl.classList.toggle('mf-open');
  });
  panel.querySelectorAll('.mf-card').forEach(function(c){
    c.addEventListener('click',function(e){
      e.stopPropagation();
      applyFrame(c.dataset.mf);
      menuEl.classList.remove('mf-open');
    });
  });
  panel.querySelectorAll('.mf-diff-opt').forEach(function(b){
    b.addEventListener('click',function(e){
      e.stopPropagation();
      panel.querySelectorAll('.mf-diff-opt').forEach(function(x){x.classList.remove('sel');});
      b.classList.add('sel');
      window._extDiffSelected=b.dataset.mfdiff;
      window._extDiffMode=b.dataset.mfdiff;
    });
  });
  document.addEventListener('click',function(e){
    if(menuEl.classList.contains('mf-open')&&!panel.contains(e.target)&&!tog.contains(e.target)){
      menuEl.classList.remove('mf-open');
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&menuEl.classList.contains('mf-open'))menuEl.classList.remove('mf-open');
  });
})();
document.getElementById('bossrush-btn').onclick=function(){
  document.getElementById('menu').style.display='none';
  dailyChallenge=false;bossRushMode=true;
  renderClassSelect();
  document.getElementById('class-select').style.display='flex';
};
document.getElementById('multi-btn').onclick=function(){
  if(location.protocol==='file:'){document.getElementById('menu').style.display='none';document.getElementById('multi-connecting').style.display='flex';document.getElementById('multi-status').innerHTML='<span style="color:#f84">無法從 file:// 進行多人連線</span><br><small style="color:rgba(255,255,255,.3)">請改用 http://localhost:3000 開啟遊戲</small>';return;}
  document.getElementById('menu').style.display='none';
  dailyChallenge=false;
  ocCsOpen('multi2');
};
document.getElementById('multi4-btn').onclick=function(){
  if(location.protocol==='file:'){document.getElementById('menu').style.display='none';document.getElementById('multi-connecting').style.display='flex';document.getElementById('multi-status').innerHTML='<span style="color:#f84">無法從 file:// 進行多人連線</span><br><small style="color:rgba(255,255,255,.3)">請改用 http://localhost:3000 開啟遊戲</small>';return;}
  document.getElementById('menu').style.display='none';
  dailyChallenge=false;
  ocCsOpen('multi4');
};
document.getElementById('multi-cancel').onclick=function(){
  if(window.multiPInt)clearInterval(window.multiPInt);
  if(window.multiSI)clearInterval(window.multiSI);
  if(window.wsHB)clearInterval(window.wsHB);
  if(window.votePoll)clearInterval(window.votePoll);
  if(window.multiWS)try{window.multiWS.close()}catch(e){}
  if(relayIframe){document.body.removeChild(relayIframe);relayIframe=null;}
  document.getElementById('multi-connecting').style.display='none';
  document.getElementById('menu').style.display='flex';
  if(authToken)checkTeamStatus();
};
function showMultiSettlement(reason){
  // 對局結束：關閉多人連線與心跳/定時器，避免舊 socket 殘留繼續收到訊息而誤彈死亡/重生/A/B隊等 UI
  if(window.multiWS)try{window.multiWS.close()}catch(e){window.multiWS=null;}
  if(window.multiSI){clearInterval(window.multiSI);window.multiSI=null;}
  if(window.wsHB){clearInterval(window.wsHB);window.wsHB=null;}
  // 對局結束時停止射擊與連發音效，避免離開後仍持續槍聲
  autoFire=false;isReloading=false;
  if(window._autoLoop)stopAutoLoop();
  // 還原炸彈模式覆蓋的第一格武器，避免殘留炸彈99
  if(window._savedSlot0!==undefined){playerLoadout[0]=window._savedSlot0;window._savedSlot0=undefined;}
  grenadeStacks=[0,0,0,0,0];grenadeTypes=['frag','frag','frag','frag','frag'];
  currentSlot=0;if(playerLoadout[0])try{switchToSlot(0)}catch(e){}
  // 對局結束時隱藏 TDM 計分 HUD，避免回到選單仍顯示 A/B 隊分
  var hudEl=document.getElementById('tdm-score-hud');if(hudEl)hudEl.style.display='none';
  if(didPlayGame){
    didPlayGame=false;
    var xp=10+Math.max(0,(roundNum-1)*2);
    addXP(xp);
    document.getElementById('settlement-xp').textContent='+'+xp;
    var li=getLevelInfo(playerXP);
    document.getElementById('settlement-level').textContent='Lv.'+li.level+' ('+li.current+' / '+li.needed+')';
    document.getElementById('settlement-progress-fill').style.width=(li.current/li.needed*100)+'%';
    document.getElementById('settlement-daily').style.display='none';
    document.getElementById('settlement-xp-label').textContent='經 驗 值';
    document.getElementById('multi-end-reason').textContent=reason;
    window._pendingMultiEnd=true;
    document.getElementById('settlement').style.display='flex';
  }else{
    document.getElementById('multi-end-reason').textContent=reason;
    document.getElementById('multi-end-options').style.display='flex';
  }
}
document.getElementById('multi-quit-btn').onclick=function(){_stopAutoResume();
  document.getElementById('multi-death-prompt').style.display='none';
  relaySend({type:'round_quit'});
  isMultiplayer=false;
  rankEvaluateMatch(-1);
  showMultiSettlement('你選擇結束比賽');
  if(window.multiSI)clearInterval(window.multiSI);
};
document.getElementById('multi-continue-btn').onclick=function(){_stopAutoResume();
  document.getElementById('multi-death-prompt').style.display='none';
  if(tdmMode){tdmRespawnLocal();return;}
  playerHP=100;playerArmor=100;
  var rp=getRandomSpawnPos(false);pos.copy(rp);vel.set(0,0,0);
  document.body.requestPointerLock().catch(function(){});
  relaySend({type:'round_continue'});
};
document.getElementById('multi-to-single').onclick=function(){
  document.getElementById('multi-end-options').style.display='none';
  isMultiplayer=false;location.reload();
};
document.getElementById('multi-to-menu').onclick=function(){
  document.getElementById('multi-end-options').style.display='none';
  isMultiplayer=false;gameStarted=false;
  document.getElementById('menu').style.display='flex';
  if(authToken)checkTeamStatus();
  updateCoinsDisplay();updateArmoryGunCounts();
  document.getElementById('multi-status').textContent='正在尋找其他玩家...';
};
// Map voting
document.getElementById('vote-base').onclick=function(){sendMapVote('base');};
document.getElementById('vote-rain').onclick=function(){sendMapVote('rain');};
document.getElementById('vote-fog').onclick=function(){sendMapVote('fog');};
document.getElementById('vote-dragonboat').onclick=function(){sendMapVote('dragonboat');};
document.getElementById('vote-nuclear').onclick=function(){sendMapVote('nuclear');};
document.getElementById('vote-arena2').onclick=function(){sendMapVote('arena2');};
document.getElementById('vote-flooded').onclick=function(){sendMapVote('flooded');};
document.getElementById('vote-basemap3').onclick=function(){sendMapVote('basemap3');};
document.getElementById('vote-fault').onclick=function(){sendMapVote('fault');};
document.getElementById('vote-arena3').onclick=function(){sendMapVote('arena3');};
function sendMapVote(map){
  document.getElementById('multi-vote-status').textContent='已選擇，等待對手...';
  document.querySelectorAll('#multi-map-vote .map-option').forEach(function(el){el.style.pointerEvents='none';el.style.opacity='0.5';});
  console.log('sendMapVote:',map,'ws:',window.multiWS?'open='+(window.multiWS.readyState===1):'null');
  relaySend({type:'map_vote',map:map});
  // WebSocket 模式：地圖由伺服器 settleTeamVote/handleMapVote 廣播 map_result 決定，
  // 無需 HTTP 投票/輪詢（避免 token 過期造成 401 刷屏）
  if(window.multiWS&&window.multiWS.readyState===1)return;
  authFetch('/api/map_vote',{method:'POST',body:{map:map}}).catch(function(){});
  window._voteResolved=false;
  if(window.votePoll)clearInterval(window.votePoll);
  window.votePoll=setInterval(function(){
    authFetch('/api/game_status').then(function(d){
      if(d.started&&d.map&&!window._voteResolved){window._voteResolved=true;clearInterval(window.votePoll);processServerMessage({type:'map_result',map:d.map,votes:[]});}
    }).catch(function(){});
  },500);
}
var opponentName='',opponentNames=[];
// ── 統一擊殺事件系統（KillEvent）────────────────────────────────
// 所有擊殺都必須走 fireKillEvent()，不管方向是：
//   玩家→AI、AI→AI、玩家→玩家、AI→玩家
// 這樣每一筆擊殺都會產生同一種資料結構，並進入同一個 Kill Feed。
//
// KillEvent 欄位（依需求規格，未來可繼續擴充武器圖示／助攻／連殺／
// 擊殺距離／隊伍／爆頭）：
//   KillerID, KillerName, KillerType, VictimID, VictimName, VictimType,
//   Weapon, Timestamp
// KillerType / VictimType 只會是 'PLAYER' 或 'AI'
var KT_PLAYER='PLAYER',KT_AI='AI';
var killEventLog=[];      // 本場最近 50 筆，供結算/擴充用
var killEventSeq=0;
// 誰殺了誰的統計：id → 次數（單多混合的勝負結算會用到）
var killTally={};
function makeKillEvent(o){
  o=o||{};
  return {
    KillerID:(o.killerId===undefined||o.killerId===null)?('unknown'):o.killerId,
    KillerName:String(o.killerName||'未知'),
    KillerType:(o.killerType===KT_AI)?KT_AI:KT_PLAYER,
    VictimID:(o.victimId===undefined||o.victimId===null)?('unknown'):o.victimId,
    VictimName:String(o.victimName||'未知'),
    VictimType:(o.victimType===KT_AI)?KT_AI:KT_PLAYER,
    Weapon:String(o.weapon||'??'),
    Timestamp:Date.now(),
    seq:++killEventSeq
  };
}
// 觸發一次擊殺事件：記錄 →（多人時）轉發給伺服器廣播 → 顯示在 Kill Feed
function fireKillEvent(o){
  var ev=makeKillEvent(o);
  killEventLog.push(ev);
  if(killEventLog.length>50)killEventLog.shift();
  if(ev.KillerType===KT_PLAYER&&ev.KillerID!=='unknown')killTally[ev.KillerID]=(killTally[ev.KillerID]||0)+1;
  // 單多混合：交給轉發器廣播給整個房間，讓所有人的 Kill Feed 一致
  if(typeof window.forwardKillEvent==='function'){try{window.forwardKillEvent(ev);}catch(e){}}
  renderKillFeed(ev);
  return ev;
}
// 收到（自己或別人的）擊殺事件，只負責顯示，不重複計分與轉發
function renderKillFeed(ev){
  var kf=document.getElementById('killfeed');
  if(!kf||!ev)return;
  var myName=authUser||'你';
  var entry=document.createElement('div');
  entry.className='kf-entry';
  var kAI=(ev.KillerType===KT_AI),vAI=(ev.VictimType===KT_AI);
  if(kAI)entry.classList.add('kf-killer-ai');
  if(vAI)entry.classList.add('kf-victim-ai');
  if(ev.KillerName===myName||ev.VictimName===myName)entry.classList.add('kf-self');
  entry.innerHTML='<span class="kf-killer'+(kAI?' kf-ai':'')+'">'+escH(ev.KillerName)+'</span>'
    +'<span class="kf-sword">⚔</span>'
    +'<span class="kf-victim'+(vAI?' kf-ai':'')+'">'+escH(ev.VictimName)+'</span>'
    +((ev.Weapon&&ev.Weapon!=='??')?'<span class="kf-wpn">'+escH(ev.Weapon)+'</span>':'');
  entry.title=ev.KillerName+' → '+ev.VictimName+'　武器：'+ev.Weapon;
  if(kf.children.length>=5)kf.removeChild(kf.lastChild);
  kf.insertBefore(entry,kf.firstChild);   // 最新一筆永遠在最上方
  setTimeout(function(){entry.style.opacity='0';setTimeout(function(){if(entry.parentNode)kf.removeChild(entry);},400);},2500);
}
// 舊的相容入口：讓既有的三個呼叫端（tdmEnemyDown / tdmFinalDeath / onPlayerDeath）
// 不用大改也能進新的統一系統
// AI 的名稱一律是 AI-001 這種格式，用它來判斷是 AI 還是真人
function isAiName(n){return /^AI-\d+$/.test(String(n||''));}
function addKillFeed(killer,victim,gun){
  fireKillEvent({
    killerName:killer,victimName:victim,weapon:gun,
    killerType:isAiName(killer)?KT_AI:KT_PLAYER,
    victimType:isAiName(victim)?KT_AI:KT_PLAYER
  });
}
 // Auto-detect server IP
 // OC_SERVER_DEFAULT：線上（非本機）時要連哪台伺服器（例：Render / 隧道網址）。
 // 留空=沿用目前頁面網址（開發模式）。itch 是 HTTPS 頁面，若沒設會誤連 itch 網域:3000
 // 而失敗，所以 itch 版會把這值設定成公開伺服器網址。
 window.OC_SERVER_DEFAULT=window.OC_SERVER_DEFAULT||'';
 (function(){
   var si=document.getElementById('server-ip');
   if(location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'&&location.hostname!==''){
     si.value=window.OC_SERVER_DEFAULT||location.hostname;
     si.placeholder=si.value;
   }
 })();
// ── Multiplayer ──
var isMultiplayer=false,playerCount=2,opponentMeshes=[],opponentStates=[],opponentPlayerIds=[],multiStateTimer=0;
var tdmMode=false,useDowned=false,myTeam='A',myPlayerId=0,tdmSpawn={x:0,z:0},teamScore={A:0,B:0},tdmWinSubmitted=false,tdmDead=false;
var teamMates=[{id:0,downed:false,reviveProgress:0,reviving:false}];
var teammateMeshes=[],teammateStates=[];
var reviveTargetIdx=-1,reviveTimer=0,reviving=false,beingRevived=false;
var relayIframe=null,httpClientId=null;
function connectMultiplayer(mode){
  if(window.opponentBars){window.opponentBars.forEach(function(b){scene.remove(b.h);scene.remove(b.a);});window.opponentBars=[];}
  if(window.opponentPlates){window.opponentPlates.forEach(function(p){if(p)scene.remove(p);});window.opponentPlates=[];}
  if(window.teammatePlates){window.teammatePlates.forEach(function(p){if(p)scene.remove(p);});window.teammatePlates=[];}
  requestedPlayerCount=mode||2;isMultiplayer=false;playerCount=requestedPlayerCount;opponentMeshes=[];opponentStates=[];relayReady=false;
  tdmMode=false;useDowned=false;myTeam='A';myPlayerId=0;tdmSpawn={x:0,z:0};teamScore={A:0,B:0};tdmWinSubmitted=false;tdmDead=false;
  isMultiplayer=false;playerCount=mode||2;opponentMeshes=[];opponentStates=[];relayReady=false;
  var ip=document.getElementById('server-ip').value.trim()||'localhost';
  if(location.protocol==='file:'){
    document.getElementById('multi-status').innerHTML='<span style="color:#f84">無法從 file:// 進行多人連線</span><br><small style="color:rgba(255,255,255,.3)">請改用 http://'+ip+':3000 開啟遊戲</small>';
  }else{
    var statusIcon='';if(ufoMode)statusIcon='🛸 UFO大戰 — ';else if(bombMode)statusIcon='💣 無限炸彈 — ';document.getElementById('multi-status').innerHTML=statusIcon+'正在尋找其他玩家...<br><small style="color:rgba(255,255,255,.3)">需要 '+playerCount+' 位玩家</small>';
    connectMultiplayerDirect(ip, mode);
  }
}
var classColors={berserker:0xff3333,medic:0x33ff33,assault:0x3388ff,sniper:0xffcc44,tank:0xcc44ff,ghost:0x88cccc};
var classBodyColors={berserker:0x441111,medic:0x114411,assault:0x111144,sniper:0x443311,tank:0x331144,ghost:0x222222};
// ══════════════════════════════════════════════════════════════════════
// 方晶 Cubeling — 全遊戲共用的角色模型
// 透明外殼 + 內部實體正方體 + 火柴人臉（圓點眼 + 上彎笑線）+ 稜線
// 單人 AI、派對 AI、雙人對手、隊友、選單預覽全部走這裡。
// userData 掛載的 handle 給 recolor / skin / 動畫使用，不要改名字。
// ══════════════════════════════════════════════════════════════════════
function _cubelingNoRay(o){o.raycast=function(){};return o;}   // 裝飾件不參與子彈判定
function createCubelingMesh(opt){
  opt=opt||{};
  var g=new THREE.Group();
  var bodyClr=opt.body!==undefined?opt.body:0x6fa8d8;
  var accent=opt.accent!==undefined?opt.accent:0x9ef0ff;
  var glowClr=opt.glow!==undefined?opt.glow:0x7ffff0;
  var face=opt.face!==undefined?opt.face:0x14171e;
  var W=0.44,DY=0.40,INK=face;

  // 外殼（半透明玻璃）
  var ss=new THREE.Shape();
  ss.moveTo(-W/2,-W/2);ss.lineTo(W/2,-W/2);ss.lineTo(W/2,W/2);ss.lineTo(-W/2,W/2);ss.closePath();
  var shellGeo=new THREE.ExtrudeGeometry(ss,{depth:0.32,bevelEnabled:true,
    bevelThickness:0.055,bevelSize:0.055,bevelSegments:2});
  shellGeo.center();
  var shell=new THREE.Mesh(shellGeo,new THREE.MeshStandardMaterial({
    color:bodyClr,roughness:0.08,metalness:0.0,emissive:bodyClr,emissiveIntensity:0.30,
    transparent:true,opacity:opt.shellOpacity!==undefined?opt.shellOpacity:0.34,side:THREE.DoubleSide,depthWrite:false}));
  shell.position.y=DY;g.add(shell);g.userData.body=shell;

  // 外殼稜線
  var edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W+0.02,W+0.02,W+0.02)),
    new THREE.LineBasicMaterial({color:accent,transparent:true,opacity:0.95}));
  edge.position.y=DY;g.add(_cubelingNoRay(edge));g.userData.edge=edge;

  // 內部實體正方體（完全不透明）
  var iw=0.27,ID=iw*0.8,is2=new THREE.Shape();
  is2.moveTo(-iw/2,-iw/2);is2.lineTo(iw/2,-iw/2);is2.lineTo(iw/2,iw/2);is2.lineTo(-iw/2,iw/2);is2.closePath();
  var ig=new THREE.ExtrudeGeometry(is2,{depth:ID,bevelEnabled:true,
    bevelThickness:0.028,bevelSize:0.028,bevelSegments:2});
  ig.center();
  var core=new THREE.Mesh(ig,new THREE.MeshStandardMaterial({
    color:opt.core!==undefined?opt.core:0x3f6f9e,roughness:0.26,metalness:0.18,
    emissive:bodyClr,emissiveIntensity:0.30}));
  core.position.y=DY;g.add(core);g.userData.core=core;

  var iEdge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(iw+0.02,iw+0.02,ID)),
    new THREE.LineBasicMaterial({color:glowClr,transparent:true,opacity:0.75}));
  iEdge.position.y=DY;g.add(_cubelingNoRay(iEdge));g.userData.coreEdge=iEdge;

  var halo=new THREE.Mesh(new THREE.SphereGeometry(0.205,14,10),
    new THREE.MeshBasicMaterial({color:glowClr,transparent:true,opacity:0.20,depthWrite:false}));
  halo.position.y=DY;g.add(_cubelingNoRay(halo));g.userData.halo=halo;

  // 殼與實體之間游走的碎晶
  var shards=[];
  for(var i=0;i<3;i++){
    var sm=new THREE.Mesh(new THREE.OctahedronGeometry(0.046,0),
      new THREE.MeshStandardMaterial({color:accent,roughness:0.25,metalness:0.2,emissive:accent,emissiveIntensity:0.6}));
    g.add(sm);shards.push(sm);
  }
  g.userData.shards=shards;

  // 火柴人臉：兩顆圓點眼 + 淺弧笑線 + 圓頭端點
  var zf=W/2+0.006;
  var inkMat=new THREE.MeshStandardMaterial({color:INK,roughness:0.35,metalness:0.1});
  var eyeG=new THREE.SphereGeometry(0.038,12,8);
  var eL=new THREE.Mesh(eyeG,inkMat);eL.position.set(-0.085,DY+0.055,zf);
  var eR=new THREE.Mesh(eyeG,inkMat);eR.position.set( 0.085,DY+0.055,zf);
  g.add(eL);g.add(eR);g.userData.eyes=[eL,eR];

  var curve=new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.080,DY-0.028,zf),
    new THREE.Vector3( 0.000,DY-0.082,zf),
    new THREE.Vector3( 0.080,DY-0.028,zf));
  var smile=new THREE.Mesh(new THREE.TubeGeometry(curve,14,0.0125,6,false),inkMat);
  g.add(smile);g.userData.smile=smile;
  var capG=new THREE.SphereGeometry(0.0135,8,6);
  var capM=new THREE.Mesh(capG,inkMat);capM.position.set(-0.080,DY-0.028,zf);
  var capR=new THREE.Mesh(capG,inkMat);capR.position.set( 0.080,DY-0.028,zf);
  g.add(capM);g.add(capR);

  var faceGlow=new THREE.Mesh(new THREE.CircleGeometry(0.155,20),
    new THREE.MeshBasicMaterial({color:glowClr,transparent:true,opacity:0.13,depthWrite:false}));
  faceGlow.position.set(0,DY+0.01,W/2+0.002);g.add(_cubelingNoRay(faceGlow));

  // 隊伍／類型識別用的發光小寶石（放在兩眼之間，像鼻子）。
  // 舊程式碼用 userData.visor 改類型顏色，這顆就是新的「visor」。
  var visor=new THREE.Mesh(new THREE.OctahedronGeometry(0.028,0),
    new THREE.MeshStandardMaterial({color:opt.visor!==undefined?opt.visor:accent,
      emissive:opt.visorEm!==undefined?opt.visorEm:glowClr,emissiveIntensity:opt.visorEmI!==undefined?opt.visorEmI:0.9,
      roughness:0.2,metalness:0.3}));
  visor.position.set(0,DY+0.005,W/2+0.004);g.add(visor);g.userData.visor=visor;

  // 待機動畫：整顆懸浮 + 內核脈動 + 碎晶繞行
  var t0=Math.random()*10;
  g.userData.tick=function(t){
    var tt=(t||0)+t0;
    g.position.y=CUBELING_H*0.08+Math.sin(tt*1.5)*0.045;
    shell.rotation.y=Math.sin(tt*0.45)*0.40;
    shell.rotation.x=Math.cos(tt*0.31)*0.10;
    edge.rotation.copy(shell.rotation);
    core.rotation.y=tt*0.62;core.rotation.x=tt*0.34;
    iEdge.rotation.copy(core.rotation);
    var pulse=1+Math.sin(tt*2.4)*0.05;
    core.scale.setScalar(pulse);iEdge.scale.setScalar(pulse);
    halo.scale.setScalar(1+Math.sin(tt*2.4)*0.13);
    halo.material.opacity=0.16+Math.sin(tt*2.4)*0.08;
    for(var si=0;si<shards.length;si++){
      var a=tt*0.75+si*2.094;
      shards[si].position.set(Math.cos(a)*0.183,DY+Math.sin(a*1.3)*0.14,Math.sin(a)*0.183);
      shards[si].rotation.x=tt*1.3+si;shards[si].rotation.z=tt*0.9;
    }
  };

  g.traverse(function(c){if(c.isMesh){c.frustumCulled=false;c.renderOrder=1;}});
  shell.renderOrder=2;
  return g;
}
// 派對模式（第二個 <script> 區塊）看不到 bootGame 內的函式，這裡掛到 window
window.createCubelingMesh=createCubelingMesh;
window.setCubelingColors=setCubelingColors;
window.CUBELING_H=CUBELING_H;
window.CUBELING_BAR=CUBELING_BAR;
window.CUBELING_AI_SCALE=CUBELING_AI_SCALE;
window.CUBELING_PAL=CUBELING_PAL;
// 換色：把舊的「改 children[0] / visor.material」邏輯統一轉到這裡
function setCubelingColors(g,bodyClr,visorClr,visorEm,accentClr){
  if(!g||!g.userData)return;
  var u=g.userData;
  if(u.body&&bodyClr!==undefined){u.body.material.color.setHex(bodyClr);u.body.material.emissive.setHex(bodyClr);}
  if(u.core&&bodyClr!==undefined)u.core.material.emissive.setHex(bodyClr);
  if(u.visor&&visorClr!==undefined){u.visor.material.color.setHex(visorClr);
    if(visorEm!==undefined)u.visor.material.emissive.setHex(visorEm);}
  if(u.coreEdge&&visorEm!==undefined)u.coreEdge.material.color.setHex(visorEm);
  if(u.halo&&visorEm!==undefined)u.halo.material.color.setHex(visorEm);
  // 稜線預設跟著 visor 色走；傳了 accentClr 就固定成 accent 色（AI 保持綠色外殼）
  if(u.edge){
    u.edge.material.color.setHex(accentClr!==undefined?accentClr:(visorClr!==undefined?visorClr:0x9ef0ff));
  }
}
// 讓舊程式碼拿得到 visor（randomizeEnemyType 會用到 e.visor.material）
function cubelingVisor(g){
  return (g&&g.userData&&(g.userData.coreEdge||g.userData.visor))||null;
}

function createOpponentMesh(classId){
  // 沒有 classId（選單主角色、隊伍預覽、自己的預覽）→ 藍色
  // 有 classId（多人對手）→ 沿用職業色，方便分辨對手
  var isClass=!!classId;
  var og=isClass
    ? createCubelingMesh({body:classBodyColors[classId]||0x111111,
        accent:classBodyColors[classId]||0x111111,glow:0x9ef0ff})
    : createCubelingMesh(CUBELING_PAL.blue);
  // 拿槍（沿用原本的位置，只換了身體）
  var ogg=new THREE.Group();
  var ogb=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,0.2),new THREE.MeshStandardMaterial({color:0x333333}));
  ogb.position.set(0,0,0.12);ogg.add(ogb);
  ogg.position.set(0.18,0.16,0.20);og.add(ogg);
  og.userData.gun=ogg;
  // 判定框補齊。createCubelingMesh 的外殼只有 0.55x0.72x0.65，頂端只到 pos.y+0.615，
  // 但 HP/護甲條在 +0.86、名牌在 +1.30，自己的視線在 +0.85(EYE_H)、
  // 槍口在 +0.45(腰射)/+0.70(ADS)。也就是「看得到的東西」整個在判定框上方，
  // 瞄著打會從頭頂 0.245m 飛過去；AK 散布在 10m 處就有 ±0.40m 垂直抖動，比判定框還高。
  // 用 material.visible=false：不會渲染，但仍然是 isMesh，會被 traverse 收進射線列表。
  var hitbox=new THREE.Mesh(new THREE.BoxGeometry(0.72,1.75,0.72),new THREE.MeshBasicMaterial({visible:false}));
  hitbox.position.y=0.88;
  og.add(hitbox);
  og.userData.hitbox=hitbox;
  return og;
}
function createUFOMesh(){
  var g=new THREE.Group();
  var disc=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,0.2,24),new THREE.MeshStandardMaterial({color:0x334466,emissive:0x224488,emissiveIntensity:0.2,metalness:0.7,roughness:0.3}));
  disc.position.y=0;g.add(disc);
  var rim=new THREE.Mesh(new THREE.TorusGeometry(1.45,0.06,8,24),new THREE.MeshStandardMaterial({color:0x66aaff,emissive:0x4488ff,emissiveIntensity:0.5}));
  rim.position.y=0;rim.rotation.x=1.57;g.add(rim);
  var dome=new THREE.Mesh(new THREE.SphereGeometry(0.5,16,16,0,Math.PI*2,0,Math.PI*0.5),new THREE.MeshStandardMaterial({color:0x4488cc,emissive:0x2266aa,emissiveIntensity:0.3,transparent:true,opacity:0.6}));
  dome.position.y=0.12;dome.scale.set(1,0.5,1);g.add(dome);
  var core=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),new THREE.MeshBasicMaterial({color:0x88ddff}));
  core.position.y=0.03;g.add(core);
  for(var i=0;i<16;i++){
    var angle=(i/16)*Math.PI*2;
    var bl=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,6),new THREE.MeshStandardMaterial({color:0x44aaff,emissive:0x44ccff,emissiveIntensity:1.5}));
    bl.position.set(Math.cos(angle)*1.3,0.02,Math.sin(angle)*1.3);g.add(bl);
  }
  var glow=new THREE.Mesh(new THREE.CircleGeometry(1.0,16),new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x4488ff,emissiveIntensity:0.2,transparent:true,opacity:0.15,side:THREE.DoubleSide}));
  glow.position.y=-0.1;glow.rotation.x=-1.57;g.add(glow);
  g.scale.set(0.7,0.7,0.7);
  g.traverse(function(c){if(c.isMesh){c.frustumCulled=false;c.castShadow=true;}});
  return g;
}
function spawnUFO(){
  if(ufoSpawned||!ufoMode)return;
  ufoSpawned=true;ufoActive=true;
  ufoHP=ufoMaxHP=300+50*(playerCount||1);
  ufoTargetIdx=0;
  ufoAttackTimer=2;
  ufoLaserCD=0;
  ufoTargetSwitchCD=15;
  var mesh=createUFOMesh();
  mesh.position.set(0,6,-3);
  scene.add(mesh);
  ufo={mesh:mesh,pos:new THREE.Vector3(0,6,-3),hp:ufoHP,maxHp:ufoMaxHP,hitTimer:0,phase:0,chargeTimer:0};
  document.getElementById('boss-hp-wrap').style.display='flex';
  document.getElementById('boss-label').textContent='🛸 UFO';document.getElementById('boss-hp-fill').style.width='100%';
}
function updateUFO(dt){
  if(!ufoActive||!ufo||!ufo.mesh)return;
  if(ufo.hp<=0){
    ufoActive=false;
    if(ufo.mesh){scene.remove(ufo.mesh);disposeMesh(ufo.mesh);}
    ufoProjectiles.forEach(function(up){if(up.mesh){scene.remove(up.mesh);disposeMesh(up.mesh);}if(up.trail){scene.remove(up.trail);disposeMesh(up.trail);}});ufoProjectiles=[];
    if(ufoBeamMesh){scene.remove(ufoBeamMesh);disposeMesh(ufoBeamMesh);ufoBeamMesh=null;}
    document.getElementById('boss-hp-wrap').style.display='none';
    playerHP=Math.min(100,playerHP+40);playerArmor=Math.min(100,playerArmor+30);
    for(var gk in gunAmmo){if(gunData[gk]&&gunData[gk].mag)gunAmmo[gk]=gunData[gk].mag;}
    document.getElementById('round-clear').textContent='🎉 UFO 擊破！';document.getElementById('round-clear').style.color='#4f4';document.getElementById('round-clear').style.display='block';
    setTimeout(function(){document.getElementById('round-clear').style.display='none';},3000);
    earnCoins(3000);
    roundEarnings+=3000;
    if(isMultiplayer){
      rankEvaluateMatch(1);
      showMultiSettlement('UFO 被擊敗，你贏了！');
    }else{
      gameStarted=false;
      document.getElementById('back-menu-btn').click();
    }
    return;
  }
  var allDead=playerHP<=0;
  if(isMultiplayer){
    var anyAlive=playerHP>0;
    opponentStates.forEach(function(s){if(s.alive)anyAlive=true;});
    if(!anyAlive)allDead=true;
  }
  if(allDead){
    ufoActive=false;
    if(ufo.mesh){scene.remove(ufo.mesh);disposeMesh(ufo.mesh);}
    ufoProjectiles.forEach(function(up){if(up.mesh){scene.remove(up.mesh);disposeMesh(up.mesh);}if(up.trail){scene.remove(up.trail);disposeMesh(up.trail);}});ufoProjectiles=[];
    if(ufoBeamMesh){scene.remove(ufoBeamMesh);disposeMesh(ufoBeamMesh);ufoBeamMesh=null;}
    document.getElementById('boss-hp-wrap').style.display='none';
    if(isMultiplayer){
      rankEvaluateMatch(-1);
      showMultiSettlement('全員陣亡，UFO 獲勝！');
    }else{
      gameStarted=false;
      document.getElementById('back-menu-btn').click();
    }
    return;
  }
  var patAngle=Date.now()/4000;
  var targetY=6+Math.sin(Date.now()/3000)*0.4;
  ufo.pos.x=Math.sin(patAngle)*9;
  ufo.pos.z=Math.cos(patAngle)*9-2;
  ufo.pos.y+=(targetY-ufo.pos.y)*dt*2;
  ufo.mesh.position.copy(ufo.pos);
  ufo.mesh.rotation.y=patAngle+Math.PI;
  ufo.mesh.rotation.z=Math.sin(Date.now()/2000)*0.05;
  ufoTargetSwitchCD-=dt;
  if(ufoTargetSwitchCD<=0){
    ufoTargetSwitchCD=10+Math.random()*4;
    if(isMultiplayer&&playerCount>1){
      var alive=[];
      if(playerHP>0)alive.push(0);
      opponentStates.forEach(function(s,i){if(s.alive)alive.push(i+1);});
      if(alive.length>1){
        var curIdx=alive.indexOf(ufoTargetIdx);
        ufoTargetIdx=alive[(curIdx+1)%alive.length];
      }else if(alive.length===1){
        ufoTargetIdx=alive[0];
      }
    }else{ufoTargetIdx=0;}
  }
  var tpos=ufoTargetIdx===0?pos.clone():(opponentStates[ufoTargetIdx-1]?opponentStates[ufoTargetIdx-1].pos.clone():pos.clone());
  // Show who is abducted
  var biEl=document.getElementById('buff-indicator');
  if(biEl&&ufoActive){
    if(ufoTargetIdx===0)biEl.textContent='🛸 你被 UFO 綁架了！';
    else biEl.textContent='🛸 '+playerCount+'號 玩家被 UFO 綁架了！';
    biEl.style.opacity='1';biEl.style.color='#f44';
  }
  // UFO abduction: lift player toward UFO
  if(ufoTargetIdx===0&&playerHP>0){
    var liftPhase=Date.now()/500;
    var liftY=1.2+Math.sin(liftPhase)*0.5;
    vel.y=9.8*dt+liftY;
    var toUfoDir=new THREE.Vector3(ufo.pos.x-pos.x,0,ufo.pos.z-pos.z);
    var toUfoDist=toUfoDir.length();
    if(toUfoDist>1){
      toUfoDir.normalize();
      vel.x+=toUfoDir.x*dt*3;
      vel.z+=toUfoDir.z*dt*3;
    }
    if(pos.y>3.5){pos.y=3.5;if(vel.y>0)vel.y=0;}
    // Prevent ground clamp when above ground
    if(pos.y>0.8&&onGround){onGround=false;}
  }
  if(ufoBeamMesh){scene.remove(ufoBeamMesh);disposeMesh(ufoBeamMesh);}
  var beamColor=ufoTargetIdx===0?0xff4444:0x44aaff;
  var beamEnd=new THREE.Vector3(tpos.x,Math.min(tpos.y+0.5,0.6),tpos.z);
  var beamGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ufo.pos.x,ufo.pos.y-0.3,ufo.pos.z),beamEnd]);
  ufoBeamMesh=new THREE.Line(beamGeo,new THREE.LineBasicMaterial({color:beamColor,transparent:true,opacity:0.5+Math.sin(Date.now()/200)*0.2}));
  scene.add(ufoBeamMesh);
  // Glow ring at beam end
  if(ufoBeamRing)scene.remove(ufoBeamRing);
  ufoBeamRing=new THREE.Mesh(new THREE.RingGeometry(0.15,0.25,16),new THREE.MeshBasicMaterial({color:beamColor,transparent:true,opacity:0.4,side:THREE.DoubleSide}));
  ufoBeamRing.position.set(beamEnd.x,beamEnd.y+0.05,beamEnd.z);
  ufoBeamRing.lookAt(ufo.pos.x,ufo.pos.y,ufo.pos.z);
  scene.add(ufoBeamRing);
  ufoAttackTimer-=dt;
  if(ufoAttackTimer<=0){
    ufoAttackTimer=1.2+Math.random()*0.8;
    var bDir=new THREE.Vector3(tpos.x-ufo.pos.x+0.3*(Math.random()-0.5),tpos.y+0.6-ufo.pos.y+0.3*(Math.random()-0.5),tpos.z-ufo.pos.z+0.3*(Math.random()-0.5)).normalize();
    spawnUFOProj(ufo.pos.clone().add(new THREE.Vector3(0,-0.1,0)),bDir,12,20,Math.round(10*(1+diffMult*0.3)),0x44ff88,0.07);
  }
  updateUFOProj(dt);
  if(ufo.hitTimer>0){ufo.hitTimer-=dt;ufo.mesh.children.forEach(function(c){if(c.material&&c.material.emissive){c.material.emissiveIntensity=0.5+Math.sin(ufo.hitTimer*30)*0.5;}});}
  var pct=ufo.hp/ufo.maxHp*100;document.getElementById('boss-hp-fill').style.width=Math.max(0,pct)+'%';
}
var ufoProjectiles=[];
function spawnUFOProj(origin,dir,speed,maxRange,dmg,color,size){
  var sz=size||0.06;
  var mesh=new THREE.Mesh(new THREE.SphereGeometry(sz,6,6),new THREE.MeshBasicMaterial({color:color||0x44ff88}));
  mesh.position.copy(origin);scene.add(mesh);
  var trail=new THREE.Mesh(new THREE.SphereGeometry(sz*0.5,4,4),new THREE.MeshBasicMaterial({color:color||0x44ff88,transparent:true,opacity:0.4}));
  trail.position.copy(origin);scene.add(trail);
  ufoProjectiles.push({mesh:mesh,trail:trail,pos:origin.clone(),vel:dir.clone().multiplyScalar(speed),range:maxRange,dist:0,dmg:dmg,alive:true});
}
function updateUFOProj(dt){
  for(var i=ufoProjectiles.length-1;i>=0;i--){
    var up=ufoProjectiles[i];
    if(!up.alive)continue;
    up.trail.position.copy(up.pos);
    up.pos.x+=up.vel.x*dt;up.pos.y+=up.vel.y*dt;up.pos.z+=up.vel.z*dt;
    up.mesh.position.copy(up.pos);
    up.dist+=up.vel.length()*dt;
    if(up.pos.distanceTo(pos)<0.6&&playerHP>0){up.alive=false;disposeMesh(up.mesh);disposeMesh(up.trail);hitMarkerTimer=0.15;playerDamage(up.dmg,up.pos);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),up.dmg,'#44ff88');ufoProjectiles.splice(i,1);continue;}
    if(isMultiplayer&&opponentStates.length>0){
      for(var oi=0;oi<opponentStates.length;oi++){
        var os=opponentStates[oi];if(!os.alive)continue;
        if(up.pos.distanceTo(os.pos)<0.8){up.alive=false;disposeMesh(up.mesh);disposeMesh(up.trail);os.hp-=up.dmg;if(os.hp<=0){os.hp=0;os.alive=false;}showDmgNum(os.pos.clone(),up.dmg,'#44ff88');ufoProjectiles.splice(i,1);break;}
      }
    }
    if(up.dist>up.range){up.alive=false;disposeMesh(up.mesh);disposeMesh(up.trail);ufoProjectiles.splice(i,1);}
  }
}
var petMesh=null;
function ocB64f32(s){var b=atob(s);var n=b.length;var u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=b.charCodeAt(i);return new Float32Array(u.buffer);}
function ocB64u16(s){var b=atob(s);var n=b.length;var u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=b.charCodeAt(i);return new Uint16Array(u.buffer);}
// ADS 槍位基準：有瞄準鏡模型的槍（deagle）把鏡片對齊畫面中央，其餘沿用固定位置
function ocAdsBase(){
  if(currentGun==='deagle'&&gunGroup&&gunGroup.userData&&gunGroup.userData.sightLens){
    var L=gunGroup.userData.sightLens,sc=gunGroup.scale.x||1.5;
    return new THREE.Vector3(-L[0]*sc,-L[1]*sc,-0.25-L[2]*sc);
  }
  return new THREE.Vector3(0.15,-0.08,-0.28);
}
function ocPetTexture(){if(window._ocPetTex)return window._ocPetTex;if(!window.OC_PET_TEX)return null;var t=new THREE.TextureLoader().load(window.OC_PET_TEX);try{t.colorSpace=THREE.SRGBColorSpace;}catch(e){try{t.encoding=THREE.sRGBEncoding;}catch(e2){}}window._ocPetTex=t;return t;}
// 用烘焙好的 Kenney Cube Pets 幾何建立動物寵物（世界座標幾何 + 共用 colormap 貼圖）
function ocBuildAnimalPet(id){
  var md=window.OC_PET_MODELS&&window.OC_PET_MODELS[id];if(!md)return null;
  var g=new THREE.Group();
  var mat=new THREE.MeshStandardMaterial({map:ocPetTexture(),metalness:0.0,roughness:0.85,side:THREE.DoubleSide});
  for(var i=0;i<md.parts.length;i++){
    var part=md.parts[i];
    var geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(part.p),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(part.n),3));
    geo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(part.u),2));
    geo.setIndex(new THREE.BufferAttribute(ocB64u16(part.i),1));
    g.add(new THREE.Mesh(geo,mat));
  }
  var box=new THREE.Box3().setFromObject(g),size=new THREE.Vector3();box.getSize(size);
  var k=0.7/(size.y||1);
  g.scale.setScalar(k);
  g.position.set(-(box.min.x+box.max.x)*0.5*k,-box.min.y*k,-(box.min.z+box.max.z)*0.5*k);
  var wrap=new THREE.Group();wrap.add(g);
  return wrap;
}
// 寵物攻擊特效池
var petFx=[];
function ocPetHitFx(p,color){
  var m=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:0.75,depthWrite:false}));
  m.position.copy(p);scene.add(m);
  petFx.push({kind:'burst',mesh:m,t:0,life:0.3,s0:0.6,s1:1.9,o0:0.75});
}
function createPetMesh(type){
  if(window.OC_PET_MODELS&&window.OC_PET_MODELS[type]){
    var ap=ocBuildAnimalPet(type);
    if(ap){ap.traverse(function(c){if(c.isMesh){c.frustumCulled=false;c.castShadow=true;}});return ap;}
  }
  var g=new THREE.Group();var mat=function(c,em){return new THREE.MeshStandardMaterial({color:c,emissive:em||0,emissiveIntensity:em?0.4:0});};
  if(type==='mech_dog'){
    var body=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.15,0.5),mat(0x666666));body.position.y=0.08;g.add(body);
    var head=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.12,0.14),mat(0x777777));head.position.set(0,0.16,0.28);g.add(head);
    for(var s=-1;s<=1;s+=2){var leg=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.1,0.04),mat(0x444444));leg.position.set(s*0.1,0,0.12+s*0.1);g.add(leg);}
    var tail=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.02,0.12),mat(0x555555));tail.position.set(0,0.12,-0.28);tail.rotation.x=0.3;g.add(tail);
    for(var s=-1;s<=1;s+=2){var eye=new THREE.Mesh(new THREE.SphereGeometry(0.025,6,6),mat(0xff0000,0xff0000));eye.position.set(s*0.05,0.19,0.33);g.add(eye);}
  }else if(type==='ghost_orb'){
    var core=new THREE.Mesh(new THREE.SphereGeometry(0.15,12,12),new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x4488ff,emissiveIntensity:0.8,transparent:true,opacity:0.7}));g.add(core);
    var glow=new THREE.Mesh(new THREE.SphereGeometry(0.22,12,12),new THREE.MeshBasicMaterial({color:0x4488ff,transparent:true,opacity:0.15}));g.add(glow);
    g.userData.orbitalAngle=0;
  }else if(type==='healer_bee'){
    var bodyB=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),mat(0xffcc00));bodyB.scale.set(1,1.2,1);bodyB.position.y=0.05;g.add(bodyB);
    for(var s=-1;s<=1;s+=2){var stripe=new THREE.Mesh(new THREE.TorusGeometry(0.08,0.015,4,8),mat(0x222222));stripe.position.y=0.05;stripe.rotation.x=1.57;stripe.scale.set(1,1,0.6);g.add(stripe);}
    for(var s=-1;s<=1;s+=2){var wing=new THREE.Mesh(new THREE.PlaneGeometry(0.08,0.12),new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.3,side:THREE.DoubleSide}));wing.position.set(s*0.08,0.12,0);wing.rotation.z=s*0.4;g.add(wing);}
    var e1=new THREE.Mesh(new THREE.SphereGeometry(0.015,6,6),mat(0x000000));e1.position.set(-0.04,0.1,0.07);g.add(e1);
    var e2=new THREE.Mesh(new THREE.SphereGeometry(0.015,6,6),mat(0x000000));e2.position.set(0.04,0.1,0.07);g.add(e2);
  }else if(type==='guardian'){
    var shield=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,0.04,16),new THREE.MeshStandardMaterial({color:0x44aaff,emissive:0x4488ff,emissiveIntensity:0.3,transparent:true,opacity:0.8}));shield.position.y=0.3;g.add(shield);
    var rim=new THREE.Mesh(new THREE.TorusGeometry(0.25,0.015,8,16),mat(0x66ccff,0x4488ff));rim.position.y=0.3;rim.rotation.x=1.57;g.add(rim);
    g.userData.bobPhase=0;
  }else if(type==='scavenger'){
    var box=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.16,0.2),mat(0x888866));box.position.y=0.08;g.add(box);
    for(var s=-1;s<=1;s+=2){var wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.03,8),mat(0x444444));wheel.rotation.z=1.57;wheel.position.set(s*0.13,0.04,0);g.add(wheel);}
    var antenna=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.1,4),mat(0xaaaaaa));antenna.position.set(0,0.2,0.06);g.add(antenna);
    var tip=new THREE.Mesh(new THREE.SphereGeometry(0.015,6,6),mat(0xff4400,0xff4400));tip.position.set(0,0.25,0.06);g.add(tip);
  }else if(type==='mini_dragon'){
    var bodyD=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.25,8),mat(0xcc4400));bodyD.position.y=0.1;g.add(bodyD);
    var headD=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),mat(0xdd5500));headD.position.set(0,0.22,0.08);g.add(headD);
    for(var s=-1;s<=1;s+=2){var wingD=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.12,4),new THREE.MeshStandardMaterial({color:0xcc4400,transparent:true,opacity:0.7}));wingD.position.set(s*0.1,0.15,0);wingD.rotation.x=-0.3;wingD.rotation.z=s*0.6;g.add(wingD);}
    var tailD=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.1,4),mat(0xcc4400));tailD.position.set(0,0.05,-0.12);tailD.rotation.x=0.5;g.add(tailD);
    for(var s=-1;s<=1;s+=2){var eyeD=new THREE.Mesh(new THREE.SphereGeometry(0.015,6,6),mat(0xff2200,0xff2200));eyeD.position.set(s*0.03,0.24,0.11);g.add(eyeD);}
  }
  g.scale.set(0.6,0.6,0.6);g.traverse(function(c){if(c.isMesh){c.frustumCulled=false;c.castShadow=true;}});
  return g;
}
function applyOpponentClass(om,classId){
  if(!om||!classId)return;
  var cub=om.userData&&om.userData.cubeling?om.userData.cubeling:om;
  var clr=classBodyColors[classId]||0x111111;
  // 方晶：同時更新外殼色與內核輝光
  setCubelingColors(cub,clr);
  if(om.userData.body){om.userData.body.material.color.setHex(clr);}
}
function applyCharSkin(om){
  if(!om)return;
  try{var cs=JSON.parse(localStorage.getItem('oc_char_skin'));if(!cs)return;}catch(e){return;}
  var cub=om.userData&&om.userData.cubeling?om.userData.cubeling:om;
  var u=cub.userData||{};
  // body → 透明外殼 + 內部實體
  if(cs.body!==undefined){
    if(u.body){u.body.material.color.setHex(cs.body);u.body.material.emissive.setHex(cs.body);}
    if(u.core){u.core.material.emissive.setHex(cs.body);}
  }
  // visor → 發光小寶石 + 內核稜線 + 光暈 + 外殼稜線
  if(cs.visor!==undefined){
    if(u.visor)u.visor.material.color.setHex(cs.visor);
    if(u.coreEdge)u.coreEdge.material.color.setHex(cs.visor);
    if(u.halo)u.halo.material.color.setHex(cs.visor);
    if(u.edge)u.edge.material.color.setHex(cs.visor);
  }
  // 舊的背包／腳／肩膀是綁死在舊模型的外形上（BoxGeometry@y=0.35、SphereGeometry@y=0 之類），
  // 方晶沒有這些零件，改成調整殼層／內核的色差，讓自訂色仍然看得出來。
  if(cs.backpack!==undefined&&u.core)u.core.material.color.setHex(cs.backpack);
  if(cs.feet!==undefined&&u.core)u.core.material.color.lerp(new THREE.Color(cs.feet),0.35);
  if(cs.shoulders!==undefined&&u.core)u.core.material.emissiveIntensity=0.5;
}
function processServerMessage(data){
  // 通用訊息種類計數器（診斷用）：確認伺服器「實際送了哪些 type 給這個分頁」。
  // hybrid_shoot 是關鍵——伺服器有送但這裡沒長數，就代表訊息在WS 層面就沒進來。
  try{window.__mc=window.__mc||{};window.__mc[data.type]=(window.__mc[data.type]||0)+1;}catch(_e){}
  switch(data.type){
    case 'in_queue':
      document.getElementById('multi-status').innerHTML='佇列中 ('+data.position+')...<br><small style="color:rgba(255,255,255,.3)">需要 '+playerCount+' 位玩家</small>';
      break;
    case 'build_mismatch':
      // 舊分頁進入多人對局：自動重新載入一次拿到最新程式碼。
      // 一定要自動處理，因為舊分頁沒有「重新載入」按鈕，
      // 使用者只會看到一片全螢幕紅色覆蓋層，感覺就是「按了 go 完全動不了」。
      try{
        var ocRk='oc_reloaded_'+msg.server,ocRn=+(sessionStorage.getItem(ocRk)||0);
        if(ocRn<1){
          sessionStorage.setItem(ocRk,String(ocRn+1));
          if(window.__ocBuildBanner)window.__ocBuildBanner(msg.server,'正在自動重新載入最新版本…');
          setTimeout(function(){location.reload();},600);
          return;
        }
      }catch(e){}
      if(window.__ocBuildBanner)window.__ocBuildBanner(msg.server);
      try{ws.close();}catch(e){}
      break;
    case 'hybrid_match_found':
      window._reconnectAttempts=0;
      if(gameStarted&&isMultiplayer)break;
      startHybridGame(data);
      break;
    case 'hybrid_ai_state':
      hybridApplyAiState(data.states);
      break;
    case 'hybrid_ai_hit':
      if(data.targetId===hybridMyId){
        // ★★★ 這個訊息有兩種用途，原本混在一起會讓玩家「打自己」★★★
        //  (a) AI→真人傷害：aiIdx=攻擊者、沒有 byRemoteShot → 要扣自己護甲/血
        //  (b) 玩家→AI 命中回饋：byRemoteShot=true → 只出音效
        // 原本 (b) 也走扣血流程，於是每打中 AI 一發就扣自己 20~25 點，
        // 打得越準死得越快。實測 44 發命中 = 1100 點，正好等於自己的死因。
        // 命中回饋的正規管道是 hybrid_shoot_hit（會在 AI 身上跳傷害數字）。
        if(data.byRemoteShot){playGunSound(data.weapon);break;}
        // 收端再驗一次視線（主機端 mapMeshes 可能來不及刷新，不能只靠它）
        var _ocRa=hybridRemoteAi[data.aiIdx];
        if(_ocRa&&!ocLosClear({pos:_ocRa.mesh.position},{pos:pos},0.45,0.85,0.8))break;
        window._hybridLastAttacker=data.aiName||'AI';window._hybridLastAttackerId=1000+(data.aiIdx|0);
        playGunSound(data.weapon);
        var od=data.dmg||10,ld=od;
        if(playerArmor>0){
          playerArmor-=ld;
          if(playerArmor<0){ld=-playerArmor;playerArmor=0;}else ld=0;
        }
        if(ld>0){playerHP-=ld;if(playerHP<0)playerHP=0;showDmgNum(pos.clone().add(new THREE.Vector3(0,0.5,0)),Math.round(ld),'#ff4444');}
        // AI 的子彈與槍口火光是在主機端算的，非主機只收到這一筆命中。
        // 補一段曳光與轉向，否則自己畫面上 AI 會站著不動、像沒有在攻擊
        var ra=hybridRemoteAi[data.aiIdx];
        if(ra){
          ra.mesh.rotation.y=Math.atan2(pos.x-ra.mesh.position.x,pos.z-ra.mesh.position.z);
          ra.firingT=0.09;
          hybridAiTracer(ra.mesh.position,pos);
        }
        hybridCheckLocalDeath(data.aiName||'AI',1000+(data.aiIdx|0),true,data.weapon);
      }
      break;
    case 'hybrid_ai_killed':
      // 非主機端：AI 只收到血條同步，本機不會跑 damageEnemy，
      // 所以這裡要自己補一筆 Kill Feed，否則別人殺 AI 時自己畫面上什麼都沒出現
      if(!hostAiSim()){
        fireKillEvent({killerName:data.byName||'未知',killerType:(data.byType===KT_AI?KT_AI:KT_PLAYER),
          killerId:data.byId,victimName:data.aiName||'AI',victimType:KT_AI,
          victimId:1000+(data.aiIdx|0),weapon:data.weapon||'ak47'});
      }
      break;
    case 'hybrid_shoot':
      // 主機權威：把其他真人的子彈線拿來對 AI 做傷害判定
      var _sg=window._hybridShootDbg||(window._hybridShootDbg={recv:0,meshes:0,hits:0,dealt:0,idx:-1,guard:0,noHit:0,gate:0,gated:0});
      _sg.recv++;
      if(!hostAiSim()||!data.origin||!data.dir){_sg.guard++;break;}
      (function(){
        var o=new THREE.Vector3(data.origin[0],data.origin[1],data.origin[2]);
        // 槍口相對眼睛有偏移（腰射右0.20/下0.15，換槍瞬間右0.55/下0.40），
        // AI 碰撞盒只有 0.66m 寬，用槍口當起點會「明明瞄到卻沒傷害」。
        if(data.eye)o.set(data.eye[0],data.eye[1],data.eye[2]);
        var dv=new THREE.Vector3(data.dir[0],data.dir[1],data.dir[2]);
        if(dv.lengthSq()<0.0001){dv.set(0,0,-1).applyQuaternion(cam.quaternion);}
        dv.normalize();
        // 主機端限速：非主機的射擊頻率不得超過武器本身的 fireRate。
        // 否則客戶端本地冷卻一旦失效或被改，就能以 10 倍射速灌主機
        // （log 實測 38 發命中造成 760 傷害，AK 只有 200 DPS，這就是過量來源）。
        var _fr=(gunData[data.gun]&&gunData[data.gun].fireRate)||0.1;
        var _gate=window._hybridShotGate||(window._hybridShotGate={});
        var _now=performance.now(),_pid=data.playerId;
        var _last=_gate[_pid]||0;
        if(_now-_last<_fr*1000*0.85){_sg.gate++;_sg.gated++;return;}   // 太快 → 丟棄
        _gate[_pid]=_now;
        // ── 解析式命中判定 ────────────────────────────────
        // 順序很重要：先算射線會不會先撞到牆，AI 必須比牆近才算命中，
        // 否則玩家又可以隔著牆打 AI（也就是原本的穿牆 bug）。
        var wD=1e9;
        if(mapMeshes.length){
          var wh=new THREE.Raycaster(o,dv,0,300).intersectObjects(mapMeshes,false);
          if(wh.length)wD=wh[0].distance;
        }
        var rA=ocHybridRayAi(o,dv,Math.min(300,wD>0?wD:300));
        _sg.ray=(o.x.toFixed(1)+','+o.y.toFixed(1)+','+o.z.toFixed(1)
          +'->'+dv.x.toFixed(2)+','+dv.y.toFixed(2)+','+dv.z.toFixed(2)
          +' 牆'+wD.toFixed(1)+' 最近AI'+rA.idx
          +' t'+(rA.idx>=0?rA.dist.toFixed(1):'-')+' 偏'+(rA.idx>=0?rA.horiz.toFixed(2):'-')
          +' y'+(rA.idx>=0?rA.y.toFixed(2):'-'));
        if(rA.idx<0){_sg.noHit++;return;}
        var aiIdx=rA.idx;
        var wg=data.gun||'ak47';
        var base=(gunData[wg]&&gunData[wg].dmg)||25;
        var spd=window._hybridLastSpread||1;
        var dealt=damageEnemy(enemies[aiIdx],Math.max(3,Math.round(base*spd)));
        _sg.hits++;_sg.idx=aiIdx;_sg.dealt+=dealt;
        relaySend({type:'hybrid_ai_hit',targetId:(data.playerId!==undefined?data.playerId:hybridMyId),aiIdx:aiIdx,dmg:dealt,weapon:wg,byRemoteShot:true});
        relaySend({type:'hybrid_shoot_hit',toId:data.playerId,aiIdx:aiIdx,dmg:dealt});
        return;
        /* eslint-disable no-unreachable */
        var rcs=new THREE.Raycaster(o,dv);
        // ★ 先把牆放進射線集合：如果第一個命中是牆，下面的 aiIdx 就會是 -1 而直接
        //   return，等於「隔牆打不到 AI」。原本只收集 enemy mesh，所以玩家→AI 也穿牆。
        var am=ocSyncMapMeshes().slice(0);
        for(var ei2=0;ei2<enemies.length;ei2++){
          var e2=enemies[ei2];
          if(!e2||!e2.hybridAI||e2.hp<=0||e2.mesh.visible===false)continue;
          e2.mesh.traverse(function(c){if(c.isMesh)am.push(c);});
        }
        _sg.meshes=am.length;
        if(!am.length)return;
        var hh=rcs.intersectObjects(am);
        if(!hh.length){_sg.noHit++;return;}
        var hm=hh[0].object,aiIdx=-1;
        for(var ei3=0;ei3<enemies.length;ei3++){
          var found=false,ee=enemies[ei3];
          if(!ee||!ee.hybridAI)continue;
          ee.mesh.traverse(function(ch){if(ch===hm)found=true;});
          if(found){aiIdx=ee.hybridIdx!==undefined?ee.hybridIdx:ei3;break;}
        }
        if(aiIdx<0)return;
        _sg.hits++;_sg.idx=aiIdx;
        var wg=data.gun||'ak47';
        var base=(gunData[wg]&&gunData[wg].dmg)||25;
        var spd=window._hybridLastSpread||1;
        var dealt=damageEnemy(enemies[aiIdx],Math.max(3,Math.round(base*spd)));
        _sg.idx=aiIdx;_sg.dealt+=dealt;
        // targetId 必須是「開槍的人」，否則射手端 if(data.targetId===hybridMyId) 不成立
        relaySend({type:'hybrid_ai_hit',targetId:(data.playerId!==undefined?data.playerId:hybridMyId),aiIdx:aiIdx,dmg:dealt,weapon:wg,byRemoteShot:true});
        relaySend({type:'hybrid_shoot_hit',toId:data.playerId,aiIdx:aiIdx,dmg:dealt});
      })();
      break;
    case 'hybrid_roster':
      // 中途有真人加入既有房間 → 更新名單並重建對手 mesh，否則雙方都看不到對方
      if(!hybridMode)break;
      if(data.aiCount!==undefined)hybridAiCount=Math.max(0,data.aiCount|0);
      hybridRoster=(data.players||[]).map(function(p){return {id:p.id,name:p.name||('玩家'+(p.id+1))};});
      window._mpRosterData={playerId:hybridMyId,playerCount:hybridRoster.length,team:'F'+hybridMyId,
        teamMate:null,players:hybridRoster.map(function(p){return {id:p.id,name:p.name,team:'F'+p.id};})};
      playerCount=hybridRoster.length;
      opponentNames=hybridRoster.filter(function(p){return p.id!==hybridMyId;}).map(function(p){return p.name;});
      opponentName=opponentNames[0]||'對手';
      rebuildOpponentVisuals(opponentNames);
      hybridRemoteAi.forEach(function(a){scene.remove(a.mesh);scene.remove(a.plate);});
      hybridRemoteAi=[];
      hybridResizeAi(hybridSpawnRing(hybridRoster.length+hybridAiCount));
      if(window._floatMsg)window._floatMsg('對局人數更新：'+hybridRoster.length+' 真人 ＋ '+hybridAiCount+' AI');
      break;
    case 'hybrid_ai_count':
      // 主機要讓 AI 數收斂到 10 - 真人數
      if(!hybridMode||!hostAiSim())break;
      hybridAiCount=Math.max(0,data.aiCount|0);
      hybridResizeAi(hybridSpawnRing(hybridRoster.length+hybridAiCount));
      break;
    case 'hybrid_respawn':
      // 其他真人重生完成（血條回到 100 後 opponent_state 也會把 alive 拉回 true）
      break;
    case 'hybrid_host_changed':
      // 主機轉移：接手 AI 模擬權
      if(hybridMode&&data.hostId===hybridMyId){
        hybridHost=true;
        for(var hi=0;hi<hybridRemoteAi.length;hi++){scene.remove(hybridRemoteAi[hi].mesh);scene.remove(hybridRemoteAi[hi].plate);}
        hybridRemoteAi=[];
        hybridSpawnHostAi(hybridSpawnRing(hybridRoster.length+hybridAiCount));
      }else if(hybridMode){
        hybridHost=false;
        for(var hi2=0;hi2<enemies.length;hi2++){var he=enemies[hi2];if(he&&he.hybridAI){scene.remove(he.mesh);if(he.hBar)scene.remove(he.hBar);if(he.aBar)scene.remove(he.aBar);}}
        hybridSpawnRemoteAi(hybridSpawnRing(hybridRoster.length+hybridAiCount));
      }
      break;
    case 'hybrid_player_left':
      if(hybridMode){
        var lidx=opponentPlayerIds.indexOf(data.playerId);
        if(lidx>=0&&opponentMeshes[lidx]){scene.remove(opponentMeshes[lidx]);opponentMeshes[lidx]=null;}
        addKillFeed('系統',hybridNameOf(data.playerId),'離開對局');
      }
      break;
    case 'hybrid_kill':
      // 只負責顯示（renderKillFeed 不轉發也不計分）。
      // 自己的死亡已經在 hybridLocalDeath 本地渲染過一次，這裡要跳過，
      // 否則自己的 Kill Feed 會出現兩筆重複的。
      if(!hybridMode)break;
      if(data.victimId===hybridMyId)break;
      renderKillFeed(makeKillEvent(data));
      if(data.killerId===hybridMyId){
        killCounter++;
        if(typeof window._hybridBumpScore==='function'){try{window._hybridBumpScore();}catch(e){}}
      }
      break;
    case 'hybrid_shoot_hit':
      if(data.toId===hybridMyId){
        hitMarkerTimer=0.15;rankMatchHits++;
        if(data.dmg>0&&hybridRemoteAi[data.aiIdx]){
          showDmgNum(hybridRemoteAi[data.aiIdx].mesh.position.clone().add(new THREE.Vector3(0,0.9,0)),Math.round(data.dmg),'#ffaa44');
        }
      }
      break;
    case 'match_found':
      window._reconnectAttempts=0;
      // 若已進入對局卻又收到新的 match_found(重連/重複配對)，忽略以避免選地圖 UI 蓋住進行中的對局
      if(gameStarted&&isMultiplayer)break;
      isMultiplayer=true;playerCount=data.playerCount||requestedPlayerCount||2;opponentName=data.opponent||'對手';
      if(data.opponents){opponentNames=data.opponents.slice();}else{opponentNames=[];for(var ni=0;ni<playerCount-1;ni++){opponentNames.push((data.opponent||'對手')+(playerCount>2?' '+(ni+2)+' 號':''));}}
      opponentMeshes.forEach(function(m){if(m)scene.remove(m);});
      if(window.opponentBars)window.opponentBars.forEach(function(b){scene.remove(b.h);scene.remove(b.a);});
      if(window.opponentPlates){window.opponentPlates.forEach(function(p){if(p)scene.remove(p);});window.opponentPlates=[];}
      if(window.teammatePlates){window.teammatePlates.forEach(function(p){if(p)scene.remove(p);});window.teammatePlates=[];}
      opponentMeshes=[];opponentStates=[];opponentPlayerIds=[];window.opponentBars=[];
      teammateMeshes.forEach(function(m){if(m)scene.remove(m);});
      teammateMeshes=[];teammateStates=[];
      var myId=data.playerId;
      tdmMode=true;
      myPlayerId=myId;
      myTeam=data.team||(myId<Math.ceil(playerCount/2)?'A':'B');
      useDowned=(playerCount>=3);
      if(data.spawn){tdmSpawn={x:data.spawn.x,z:data.spawn.z};}
      teamScore={A:0,B:0};tdmWinSubmitted=false;tdmDead=false;
      // 記下名單，startMultiGame() 要靠它重建狀態陣列
      window._mpRosterData = { playerId:myId, playerCount:playerCount, team:myTeam,
                               teamMate:data.teamMate||null, players:data.players||null };
      teamMates=[];
      if(data.teamMate){teamMates.push({id:data.teamMate.id,name:data.teamMate.name||'',downed:false,reviveProgress:0,reviving:false});}
      if(data.players){data.players.forEach(function(pl){if(pl.id!==myId&&pl.team===myTeam&&pl.id!==(data.teamMate?data.teamMate.id:-1)){teamMates.push({id:pl.id,name:pl.name||'',downed:false,reviveProgress:0,reviving:false});}});}
      teammateStates=[];teammateMeshes=[];
      teamMates.forEach(function(){
        teammateStates.push({pos:new THREE.Vector3(0,0,0),yaw:0,pitch:0,gun:'ak47',shooting:false,alive:true,hp:100,armor:100,cls:null,downed:false,reviveProgress:0,reviving:false});
        teammateMeshes.push(null);
      });
      var otherCount=playerCount-1;
      for(var oi=0;oi<otherCount;oi++){
        var opId=(oi<myId?oi:oi+1);
        var opTeam=null;
        if(data.players){for(var di=0;di<data.players.length;di++){if(data.players[di].id===opId)opTeam=data.players[di].team;}}
        opponentMeshes.push(null);
        opponentStates.push({pos:new THREE.Vector3(0,0,0),yaw:0,pitch:0,gun:'ak47',shooting:false,alive:true,hp:100,armor:100,cls:null,team:opTeam||(opId<Math.ceil(playerCount/2)?'A':'B'),downed:false,reviveProgress:0,reviving:false});
        opponentPlayerIds.push(opId);
      }
      if(ufoMode||bombMode){
        document.getElementById('multi-map-vote').style.display='none';
        if(requestedPlayerCount>2&&playerCount<requestedPlayerCount){document.getElementById('multi-status').innerHTML='⚠️ 伺服器不支援 '+(requestedPlayerCount)+' 人配對<br><small style="color:rgba(255,255,255,.3)">以 '+(playerCount)+' 人模式開始</small>';setTimeout(function(){document.getElementById('multi-connecting').style.display='none';startMultiGame('base');},2000);}else{document.getElementById('multi-connecting').style.display='none';setTimeout(function(){startMultiGame('base');},500);}
        break;
      }
      document.getElementById('multi-connecting').style.display='none';
      document.getElementById('multi-map-vote').style.display='flex';
      document.getElementById('multi-vote-status').textContent='請選擇地圖';
      document.getElementById('multi-vote-timer').textContent='';
      window._voteResolved=false;
      if(window.voteTimer)clearInterval(window.voteTimer);
      var voteSecs=15;
      document.getElementById('multi-vote-timer').textContent='⏱ '+voteSecs+'s';
      window.voteTimer=setInterval(function(){voteSecs--;if(voteSecs>0)document.getElementById('multi-vote-timer').textContent='⏱ '+voteSecs+'s';else{clearInterval(window.voteTimer);document.getElementById('multi-vote-timer').textContent='⏱ 決定中...';setTimeout(function(){if(document.getElementById('multi-map-vote').style.display==='flex'){var maps=['base','rain','fog','dragonboat','nuclear','arena2','flooded','basemap3','fault','arena3'];var pick=maps[Math.floor(Math.random()*maps.length)];processServerMessage({type:'map_result',map:pick,votes:[]});}},2000);}},1000);
      break;
    case 'opponent_vote':
      document.getElementById('multi-vote-status').textContent='對手已選擇，等待中...';
      break;
    case 'map_result':
      if(bombMode||ufoMode){break;}
      var chosenMap=data.map||'base';
      var votedMaps=data.votes||[];
      var uniqueVotes=[];
      votedMaps.forEach(function(v){if(uniqueVotes.indexOf(v)===-1)uniqueVotes.push(v);});
      if(window.voteTimer){clearInterval(window.voteTimer);window.voteTimer=null;}
      if(window.votePoll){clearInterval(window.votePoll);window.votePoll=null;}
      document.getElementById('multi-vote-timer').textContent='';
      document.getElementById('multi-vote-status').textContent='';
      document.querySelectorAll('#multi-map-vote .map-option').forEach(function(el){el.style.pointerEvents='none';el.style.opacity='0.5';});
      var mapLabels={'base':'基本地圖','rain':'雨天','fog':'迷霧','dragonboat':'端午節','nuclear':'核電站','arena2':'基本地圖(2)','flooded':'淹水房子','basemap3':'基本地圖(3)','fault':'斷層競技場','arena3':'競技場'};
      var mapEls={'base':document.getElementById('vote-base'),'rain':document.getElementById('vote-rain'),'fog':document.getElementById('vote-fog'),'dragonboat':document.getElementById('vote-dragonboat'),'nuclear':document.getElementById('vote-nuclear'),'arena2':document.getElementById('vote-arena2'),'flooded':document.getElementById('vote-flooded'),'basemap3':document.getElementById('vote-basemap3'),'fault':document.getElementById('vote-fault'),'arena3':document.getElementById('vote-arena3')};
      if(uniqueVotes.length<=1){
        // All votes same — skip animation, start game directly
        Object.keys(mapEls).forEach(function(k){mapEls[k].style.borderColor='rgba(68,170,255,.12)';mapEls[k].style.background='rgba(255,255,255,.04)';});
        mapEls[chosenMap].style.borderColor='#4f4';
        mapEls[chosenMap].style.background='rgba(68,255,68,.15)';
        document.getElementById('multi-vote-status').textContent='決定地圖：'+mapLabels[chosenMap];
        setTimeout(function(){startMultiGame(chosenMap);},800);
      }else{
        // Roulette: only flash voted maps
        var delay=80,step=0,totalSteps=uniqueVotes.length*6+5;
        function spinStep(){
          var idx=step%uniqueVotes.length;
          var m=uniqueVotes[idx];
          Object.keys(mapEls).forEach(function(k){mapEls[k].style.borderColor='rgba(68,170,255,.12)';mapEls[k].style.background='rgba(255,255,255,.04)';});
          mapEls[m].style.borderColor='#4af';
          mapEls[m].style.background='rgba(68,170,255,.2)';
          step++;
          if(step<totalSteps){
            delay+=25;
            setTimeout(spinStep,delay);
          }else{
            Object.keys(mapEls).forEach(function(k){mapEls[k].style.borderColor='rgba(68,170,255,.12)';mapEls[k].style.background='rgba(255,255,255,.04)';});
            mapEls[chosenMap].style.borderColor='#4f4';
            mapEls[chosenMap].style.background='rgba(68,255,68,.15)';
            document.getElementById('multi-vote-status').textContent='決定地圖：'+mapLabels[chosenMap];
            setTimeout(function(){startMultiGame(chosenMap);},800);
          }
        }
        spinStep();
      }
      break;
    case 'opponent_state':
      if(data.data&&data.playerId!==undefined&&data.playerId!==myPlayerId){
        var tmIdx=-1;
        for(var tmi=0;tmi<teamMates.length;tmi++){if(teamMates[tmi].id===data.playerId){tmIdx=tmi;break;}}
        if(tmIdx>=0&&tmIdx<teammateStates.length){
          var ts=teammateStates[tmIdx];
          ts.pos.set(data.data.px||0,data.data.py||0,data.data.pz||0);
          ts.yaw=data.data.yaw||0;
          ts.pitch=data.data.pitch||0;
          ts.gun=data.data.gun||'ak47';
          ts.shooting=data.data.shooting||false;
          if(data.data.hp!==undefined)ts.hp=data.data.hp;
          if(data.data.armor!==undefined)ts.armor=data.data.armor;
          ts.alive=ts.hp>0;
          if(data.data.cls&&data.data.cls!==ts.cls){
            ts.cls=data.data.cls;
            if(teammateMeshes[tmIdx]){applyOpponentClass(teammateMeshes[tmIdx],data.data.cls);}
          }
        }else{
          var oidx=opponentPlayerIds.indexOf(data.playerId);
          if(oidx>=0&&oidx<opponentStates.length){
            opponentStates[oidx].pos.set(data.data.px||0,data.data.py||0,data.data.pz||0);
            opponentStates[oidx].yaw=data.data.yaw||0;
            opponentStates[oidx].pitch=data.data.pitch||0;
            opponentStates[oidx].gun=data.data.gun||'ak47';
            opponentStates[oidx].shooting=data.data.shooting||false;
            if(data.data.hp!==undefined)opponentStates[oidx].hp=data.data.hp;
            if(data.data.armor!==undefined)opponentStates[oidx].armor=data.data.armor;
            opponentStates[oidx].alive=opponentStates[oidx].hp>0;
            if(opponentStates[oidx].hp>0&&opponentStates[oidx].downed)opponentStates[oidx].downed=false;
            if(data.data.cls&&data.data.cls!==opponentStates[oidx].cls){
              opponentStates[oidx].cls=data.data.cls;
              if(opponentMeshes[oidx]){applyOpponentClass(opponentMeshes[oidx],data.data.cls);applyCharSkin(opponentMeshes[oidx]);}
            }
          }
        }
      }
      break;
    case 'footstep':
      playFootstep();
      break;
    case 'enemy_shoot':
      playGunSound(data.gun);
      if(opponentMeshes.length>0){
        var shooterIdx=data.playerId!==undefined?opponentPlayerIds.indexOf(data.playerId):0;
        if(shooterIdx<0)shooterIdx=0;
        var op=opponentStates[shooterIdx]?opponentStates[shooterIdx].pos:new THREE.Vector3(0,0,0);
        var fl2=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff8800,emissiveIntensity:3}));
        fl2.position.copy(op);fl2.position.y+=0.6;scene.add(fl2);
        var fll2=new THREE.PointLight(0xffaa44,3,4);fll2.position.copy(fl2.position);scene.add(fll2);
        setTimeout(function(){scene.remove(fl2);scene.remove(fll2);},60);
        var dmg=data.gun==='knife'?50:(data.gun==='awp'?999:(gunData[data.gun]?gunData[data.gun].dmg:25));
        if(data.gun==='knife'){
          var dist=pos.distanceTo(op);
          if(dist<2.5){var od2=dmg;if(playerArmor>0){playerArmor-=od2;if(playerArmor<0){od2=-playerArmor;playerArmor=0}else od2=0}if(od2>0){playerHP-=od2;if(playerHP<0)playerHP=0}if(playerHP<=0){if(hybridMode)hybridLocalDeath(data.playerId!==undefined?hybridNameOf(data.playerId):'真人',data.playerId,false,data.gun);else tdmLocalDown();}}
        }else if(data.dir){
          var rd=new THREE.Raycaster(fl2.position,new THREE.Vector3(data.dir[0],data.dir[1],data.dir[2]));
          var playerMeshes=[];cam.traverse(function(c){if(c.isMesh)playerMeshes.push(c)});
          var ph=rd.intersectObjects(playerMeshes);
          if(ph.length>0&&ph[0].distance<0.8){
            var od2=dmg;
            if(playerArmor>0){playerArmor-=od2;if(playerArmor<0){od2=-playerArmor;playerArmor=0}else od2=0}
            if(od2>0){playerHP-=od2;if(playerHP<0)playerHP=0}
            if(playerHP<=0){if(hybridMode)hybridLocalDeath(data.playerId!==undefined?hybridNameOf(data.playerId):'真人',data.playerId,false,data.gun);else tdmLocalDown();}
          }
        }
      }
      break;
    case 'opponent_hit':
      if(data.hp&&(data.targetPlayerId===undefined||Number(data.targetPlayerId)===myPlayerId)){
        var od=data.hp;
        var _shp=null;
        if(data.shooterPlayerId!==undefined){var _sidx=opponentPlayerIds.indexOf(data.shooterPlayerId);if(_sidx>=0&&_sidx<opponentStates.length)_shp=opponentStates[_sidx].pos;}
        // 穿甲部分直入血量，其餘照常走護甲
        var odPierce=Math.min(playerHP,+data.pierce||0);
        if(odPierce>0)playerHP=Math.max(0,playerHP-odPierce);
        var odRest=od-odPierce;
        if(odRest>0){if(_shp){playerDamage(odRest,_shp);}else{playerDamage(odRest);}}
        if(playerHP<=0){if(hybridMode)hybridLocalDeath(data.shooterPlayerId!==undefined?hybridNameOf(data.shooterPlayerId):'真人',data.shooterPlayerId,false,'?');else tdmLocalDown();}
      }
      break;
    case 'oc_medzone':{
      var roz=new THREE.Vector3(+data.x||pos.x,(+data.y!==undefined?+data.y:0.3)||0.3,+data.z||pos.z);
      var ror=+data.r||4;
      var rown=data.owner;
      if(data.kind==='green'){
        var rd1=new THREE.Mesh(new THREE.CircleGeometry(Math.min(4,ror),20),new THREE.MeshBasicMaterial({color:0x44ff88,transparent:true,opacity:0.14,depthWrite:false}));
        rd1.rotation.x=-Math.PI/2;rd1.position.set(roz.x,0.04,roz.z);scene.add(rd1);
        var rd2=new THREE.Mesh(new THREE.CircleGeometry(Math.min(3,ror*0.7),20),new THREE.MeshBasicMaterial({color:0x88ffcc,transparent:true,opacity:0.12,depthWrite:false}));
        rd2.rotation.x=-Math.PI/2;rd2.position.set(roz.x,0.05,roz.z);scene.add(rd2);
        ocGreenSmokes.push({pos:roz,timer:8,radius:ror,owner:rown,mesh:rd1,mesh2:rd2});
      }else if(data.kind==='smoke'){
        ocSmokeZones.push({pos:roz,timer:7,radius:ror,owner:rown});
        for(var rq=0;rq<10;rq++)ocCloudAt(new THREE.Vector3(roz.x+(Math.random()-0.5)*3,roz.y+Math.random()*2,roz.z+(Math.random()-0.5)*3),0xd8dce0,1.7,7,0.9,0.1);
      }else if(data.kind==='long'){
        ocLongSmokes.push({pos:roz,timer:8,radius:ror,owner:rown});
        ocCloudAt(roz,0xccd3d9,1.4,8,0.8,0.06);
      }
      break;
    }
    case 'oc_knock':{
      // 突擊兵範圍爆炸的擊倒同步：aiIdx=打 AI，targetPlayerId=打真人
      var kkdur=Math.max(0.6,Math.min(2.6,+data.dur||1.5));
      var kkdx=+data.dx||0,kkdz=+data.dz||0;
      var kklen=Math.sqrt(kkdx*kkdx+kkdz*kkdz)||1;
      var kkdir=new THREE.Vector3(kkdx/kklen,0,kkdz/kklen);
      if(data.aiIdx!==undefined&&data.aiIdx!==null){
        if(!hybridMode||hybridHost){
          var kke=enemies[data.aiIdx|0];
          if(kke&&kke.hp>0){
            var kkdmg=+data.dmg||0;
            if(kkdmg>0){ocHurt(kke,kkdmg);showDmgNum(kke.pos.clone().add(new THREE.Vector3(0,1.5,0)),Math.round(kkdmg),'#ffaa44');}
            ocKnock(kke,kkdir,kkdur);
          }
        }
        var kkr=hybridRemoteAi[data.aiIdx|0];
        if(kkr&&kkr.alive){
          var kkdmg2=+data.dmg||0;
          if(kkdmg2>0){kkr.hp=Math.max(0,kkr.hp-kkdmg2);showDmgNum(kkr.mesh.position.clone().add(new THREE.Vector3(0,1.5,0)),Math.round(kkdmg2),'#ffaa44');}
          ocKnockRemote(kkr,kkdir,kkdur);
        }
      }
      if(data.targetPlayerId!==undefined&&data.targetPlayerId!==null){
        if(+data.targetPlayerId===+myPlayerId){
          if(!isDowned&&playerHP>0)ocSelfKnock(kkdir,kkdur);
        }else{
          var kkoi=opponentPlayerIds.indexOf(+data.targetPlayerId);
          if(kkoi>=0)ocKnockOpponent(kkoi,kkdir,kkdur);
        }
      }
      break;
    }
    case 'oc_root':{
      // 工程師 Q 強化轉頭：定身 3s（不扣護甲），期間每秒 1 傷
      var rtDur=Math.max(0.5,Math.min(6,+data.dur||3));
      if(data.aiIdx!==undefined&&data.aiIdx!==null){
        if(!hybridMode||hybridHost){var rte=enemies[data.aiIdx|0];if(rte&&rte.hp>0)rte.rootT=rtDur;}
        var rtr=hybridRemoteAi[data.aiIdx|0];if(rtr&&rtr.alive)rtr.rootT=rtDur;
      }
      if(data.targetPlayerId!==undefined&&data.targetPlayerId!==null&&Number(data.targetPlayerId)===myPlayerId){
        if(!isDowned&&playerHP>0){ocEngRootT=rtDur;showToast('⚠ 強化轉頭！被定身 '+Math.round(rtDur)+'s',1.4);}
      }
      break;
    }
    case 'oc_armorbreak':{
      // 工程師 X 強化錘子：直接扣護甲
      var abAmt=Math.max(0,+data.amount||80);
      if(data.aiIdx!==undefined&&data.aiIdx!==null){
        if(!hybridMode||hybridHost){var abe=enemies[data.aiIdx|0];if(abe&&abe.hp>0){abe.armor=Math.max(0,(abe.armor||0)-abAmt);abe.hitTimer=0.3;}}
        var abr=hybridRemoteAi[data.aiIdx|0];if(abr&&abr.alive){abr.armor=Math.max(0,(abr.armor||0)-abAmt);}
      }
      if(data.targetPlayerId!==undefined&&data.targetPlayerId!==null){
        if(Number(data.targetPlayerId)===myPlayerId){playerArmor=Math.max(0,playerArmor-abAmt);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),abAmt,'#66ccff');showToast('🛡 護甲被擊碎 -'+abAmt,1.2);}
        else{var abidx=opponentPlayerIds.indexOf(+data.targetPlayerId);}
      }
      break;
    }
    case 'oc_sonic':{
      // 工程師 E 聲波發射器：干擾區同步（半徑 5m、8s）
      var sox=+data.x||0,soz=+data.z||0,sor=+data.r||5,sodur=+data.dur||8;
      var sodome=new THREE.Mesh(new THREE.SphereGeometry(sor,20,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0x33aaff,transparent:true,opacity:0.12,side:THREE.DoubleSide,depthWrite:false}));
      sodome.position.set(sox,0.1,soz);scene.add(sodome);
      var soring=new THREE.Mesh(new THREE.RingGeometry(sor*0.92,sor,32),new THREE.MeshBasicMaterial({color:0x66ddff,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false}));
      soring.rotation.x=-Math.PI/2;soring.position.set(sox,0.06,soz);scene.add(soring);
      ocEngSonicZones.push({pos:new THREE.Vector3(sox,0.1,soz),timer:sodur,radius:sor,owner:data.owner,dome:sodome,ring:soring});
      break;
    }
    case 'opponent_died':
      if(data.playerId!==undefined){
        var deadIdx=opponentPlayerIds.indexOf(data.playerId);
        if(deadIdx>=0&&deadIdx<opponentStates.length){opponentStates[deadIdx].alive=false;opponentStates[deadIdx].downed=false;}
        if(tdmMode){
          // 單一事實來源：真正死亡（非倒地）。死者本人維持死亡按鈕，其餘玩家（含擊殺者）重生重整回合。
          if(data.playerId!==myPlayerId){
            tdmRoundRespawnLocal();
          }
          break;
        }
      }
      if(hybridMode)break;   // Hybrid FFA：對手會自己重生，不顯示「等待對手決定」
      var aliveCount=opponentStates.filter(function(s){return s.alive}).length;
      if(aliveCount===0||playerCount===2){
        document.getElementById('multi-waiting').style.display='flex';
      }else{
        document.getElementById('multi-waiting').style.display='flex';
        document.querySelector('#multi-waiting div').innerHTML='消滅一名對手！剩餘 '+aliveCount+' 人<br><small style="font-size:12px;color:rgba(255,255,255,.3)">等待對手決定...</small>';
      }
      if(document.pointerLockElement)document.exitPointerLock();
      break;
    case 'round_continue':
      document.getElementById('multi-death-prompt').style.display='none';_stopAutoResume();
      document.getElementById('multi-waiting').style.display='none';
      // Respawn
      playerHP=100;playerArmor=100;
      var rp=getRandomSpawnPos(false);pos.copy(rp);vel.set(0,0,0);
      document.body.requestPointerLock().catch(function(){});
      // Re-create alive opponents list
      opponentStates.forEach(function(s){s.alive=true;});
      break;
      case 'round_quit':
        document.getElementById('multi-death-prompt').style.display='none';
        document.getElementById('multi-waiting').style.display='none';
        rankEvaluateMatch(1);
        isMultiplayer=false;
        showMultiSettlement('對手選擇結束比賽');
        if(document.pointerLockElement)document.exitPointerLock();
        break;
      case 'opponent_disconnected':
        if(window.multiSI)clearInterval(window.multiSI);
        document.getElementById('multi-death-prompt').style.display='none';
        document.getElementById('multi-waiting').style.display='none';
        rankEvaluateMatch(1);
        isMultiplayer=false;
        showMultiSettlement('對手已離開對局');
        if(document.pointerLockElement)document.exitPointerLock();
        if(window.opponentBars){window.opponentBars.forEach(function(b){scene.remove(b.h);scene.remove(b.a);});window.opponentBars=[];}
        break;
    case 'tdm_down':
      if(data.playerId!==undefined)tdmRemoteDown(data.playerId);
      break;
    case 'tdm_bleedout':
      if(data.playerId!==undefined)tdmRemoteBleedout(data.playerId);
      break;
    case 'tdm_revive_start':
      if(data.playerId!==undefined&&data.targetPlayerId!==undefined)tdmRemoteReviveStart(data.targetPlayerId);
      break;
    case 'tdm_revive_cancel':
      if(data.playerId!==undefined&&data.targetPlayerId!==undefined)tdmRemoteReviveCancel(data.targetPlayerId);
      break;
    case 'tdm_revive_done':
      if(data.playerId!==undefined&&data.targetPlayerId!==undefined)tdmRemoteReviveDone(data.targetPlayerId);
      break;
    case 'tdm_respawn':
      if(data.playerId!==undefined)tdmRemoteSpawn(data.playerId);
      break;
    case 'tdm_round_respawn':
      // 擊殺後雙方重生：關閉敵人的倒地狀態，並讓本機重生
      if(data.playerId!==undefined&&data.playerId!==myPlayerId){tdmRemoteBleedout(data.playerId);}
      tdmRoundRespawnLocal();
      break;
    case 'tdm_score':
      if(data.scores){teamScore={A:data.scores.A||0,B:data.scores.B||0};tdmScoreHud();}
      break;
    case 'tdm_win':
      if(data.winner){
        tdmWinSubmitted=true;
        document.getElementById('multi-death-prompt').style.display='none';
        document.getElementById('multi-waiting').style.display='none';
        document.getElementById('down-overlay').style.display='none';
        isDowned=false;downTimer=0;reviving=false;beingRevived=false;
        var wonMatch=data.winner===myTeam;
        rankEvaluateMatch(wonMatch?1:0);
        isMultiplayer=false;
        if(data.scores)teamScore={A:data.scores.A||0,B:data.scores.B||0};
        showMultiSettlement(wonMatch?'🎉 勝利！我方 ('+myTeam+' 隊) 率先取得三分':'💀 敗北 ('+data.winner+' 隊率先取得三分)');
        if(document.pointerLockElement)document.exitPointerLock();
      }
      break;
    case 'ufo_hit':
      if(data.dmg&&ufoActive&&ufo){ufo.hp-=data.dmg;ufo.hitTimer=0.3;}
      break;
    case 'ufo_hit':
      if(data.dmg&&ufoActive&&ufo){ufo.hp-=data.dmg;ufo.hitTimer=0.3;}
      break;
    case 'flashbang':
      if(data.pos){
        var fbDist=pos.distanceTo(new THREE.Vector3(data.pos[0],data.pos[1],data.pos[2]));
        if(fbDist<8){
          var fbOverlay=document.createElement('div');fbOverlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:12;pointer-events:none;opacity:0;transition:opacity 0.1s';document.body.appendChild(fbOverlay);
          requestAnimationFrame(function(){fbOverlay.style.opacity='0.7';});
          setTimeout(function(){fbOverlay.style.opacity='0';setTimeout(function(){fbOverlay.remove();},300);},800);
        }
      }
      break;
  }
}
// 依房間名單重建「隊友 / 對手」的狀態陣列。
// 為什麼需要共用：startMultiGame() 會清空 opponentStates / opponentPlayerIds /
// teammateStates 後只重建 mesh，卻從不重建這三個狀態陣列。造成的後果是
//   1) opponent_state 封包抵達時 opponentPlayerIds.indexOf() 回傳 -1 → 位置被丟棄
//   2) 渲染迴圈的 if(omE && osE) 永遠不成立 → 對手 mesh 卡在世界原點 (0,0,0)
// 因此 match_found 與 startMultiGame 都必須呼叫本函式。
function buildMultiRoster(data){
  data = data || {};
  var myId = (data.playerId !== undefined) ? data.playerId : myPlayerId;
  var pc = data.playerCount || playerCount || 2;
  var myT = data.team || myTeam || 'A';

  var mates = [];
  if (data.teamMate && data.teamMate.id !== undefined && data.teamMate.id !== myId) mates.push(data.teamMate);
  if (data.players) data.players.forEach(function(pl){
    if (pl.id === myId) return;
    if (pl.team !== myT) return;
    if (data.teamMate && pl.id === data.teamMate.id) return;
    for (var k = 0; k < mates.length; k++) if (mates[k].id === pl.id) return;
    mates.push(pl);
  });
  teamMates = mates.map(function(m){
    return { id:m.id, name:m.name||'', downed:false, reviveProgress:0, reviving:false };
  });
  teammateStates = teamMates.map(function(){
    return { pos:new THREE.Vector3(0,0,0), yaw:0, pitch:0, gun:'ak47', shooting:false,
             alive:true, hp:100, armor:100, cls:null, downed:false, reviveProgress:0, reviving:false };
  });

  var oppIds = [], oppTeams = [];
  if (data.players && data.players.length) {
    data.players.forEach(function(pl){
      if (pl.id === myId) return;
      if (pl.team === myT) return;
      oppIds.push(pl.id); oppTeams.push(pl.team);
    });
  } else {
    // 伺服器未送 players 名單 → 依序號推導隊伍
    for (var oi = 0; oi < pc - 1; oi++) {
      var opId = (oi < myId ? oi : oi + 1);
      oppIds.push(opId);
      oppTeams.push(opId < Math.ceil(pc / 2) ? 'A' : 'B');
    }
  }
  opponentPlayerIds = oppIds;
  opponentStates = oppIds.map(function(id, i){
    return { pos:new THREE.Vector3(0,0,0), yaw:0, pitch:0, gun:'ak47', shooting:false,
             alive:true, hp:100, armor:100, cls:null,
             team: oppTeams[i] || (id < Math.ceil(pc / 2) ? 'A' : 'B'),
             downed:false, reviveProgress:0, reviving:false };
  });
  return { playerId:myId, playerCount:pc, team:myT, teamMate:data.teamMate||null, players:data.players||null };
}

// ══════════════════════════════════════════════════════════════════════
function rebuildOpponentVisuals(names){
  opponentMeshes.forEach(function(m){if(m)scene.remove(m);});
  if(window.opponentBars)window.opponentBars.forEach(function(b){scene.remove(b.h);scene.remove(b.a);});
  if(window.opponentPlates)window.opponentPlates.forEach(function(p){if(p)scene.remove(p);});
  opponentMeshes=[];window.opponentBars=[];window.opponentPlates=[];
  opponentStates=[];opponentPlayerIds=[];
  buildMultiRoster(window._mpRosterData);
  for(var oi=0;oi<opponentStates.length;oi++){
    var om=createOpponentMesh();scene.add(om);applyCharSkin(om);opponentMeshes.push(om);
    var onm=(names&&names[oi])||('玩家'+(oi+2));
    opponentStates[oi].name=onm;
    var opPlate=window._makeNamePlate(onm,false);scene.add(opPlate);
    window.opponentPlates[oi]=opPlate;
    var ohBar=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.06),new THREE.MeshBasicMaterial({color:0x44cc44,depthTest:false}));
    ohBar.renderOrder=998;scene.add(ohBar);
    var oaBar=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.04),new THREE.MeshBasicMaterial({color:0x4488ff,depthTest:false}));
    oaBar.renderOrder=998;scene.add(oaBar);
    window.opponentBars.push({h:ohBar,a:oaBar});
  }
  return opponentStates.length;
}
// 單多混合 Hybrid：真人 + AI 自由混戰（FFA）
//  · 目標 4 真人 + 6 AI（總戰鬥員 10 人），固定「基本地圖」
//  · 沒有配對頁／選地圖頁，點職業就靜默進房
//  · 沒有隊伍、倒地救援、計分；真人與 AI 互相殺
//  · AI 由第一位真人（主機）客戶端模擬，主機以 10Hz 廣播 AI 狀態
//  · 真人死亡 10 秒倒數重生，AI 死亡 5 秒後滿血重生
// ══════════════════════════════════════════════════════════════════════
var hybridMode=false,hybridHost=false,hybridMyId=0,hybridRoomId=null;
var hybridRoster=[],hybridAiCount=6,hybridRemoteAi=[],hybridAiSyncT=0;
var hybridDead=false,hybridRespawnT=0,hybridKillerName='??',hybridKillerId=-1,hybridKillerIsAi=true;
var HYBRID_TOTAL=10,HYBRID_HUMAN_MAX=4,HYBRID_RESPAWN_SEC=10,HYBRID_AI_RESPAWN_SEC=5;
var HYBRID_AI_TYPES=['rusher','normal','sniper','grenadier','shield','healer','rusher','normal','sniper','grenadier'];
// 只有主機跑本地 AI 模擬；其他人的 AI 只是主機同步過來的模型
function hostAiSim(){return hybridMode&&hybridHost;}
function hybridPad3(n){return String(n).padStart(3,'0');}
function hybridR2(v){return Math.round(v*100)/100;}
function hybridNameOf(id){
  for(var i=0;i<hybridRoster.length;i++)if(hybridRoster[i].id===id)return hybridRoster[i].name;
  return '玩家'+((id|0)+1);
}
// FFA 不分隊：關掉所有 TDM / Boss / 選圖 UI
function hybridHideUi(){
  ['multi-death-prompt','down-overlay','multi-map-vote','multi-waiting','multi-end-options',
   'revive-prompt','revive-progress','nuclear-ui','boss-hp-wrap','round-clear'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display='none';
  });
  if(window.voteTimer){clearInterval(window.voteTimer);window.voteTimer=null;}
  window._voteResolved=true;
}
// 環狀散開的出生點（避開大box／地板／平台），真人與 AI 共用同一圈
function hybridSpawnRing(n){
  var out=[],b=getMapBounds();
  var cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
  // 半徑必須小於 AI 的 ±14 夾制，否則真人出生在 AI 巡邆範圍外，AI 永遠走不過去
  var R=Math.max(5,Math.min(b.maxX-b.minX,b.maxZ-b.minZ)*0.22);
  for(var i=0;i<n;i++){
    var a=(i/Math.max(1,n))*Math.PI*2+Math.random()*0.5;
    var bx0=Math.max(b.minX+2,Math.min(b.maxX-2,cx+Math.cos(a)*R));
    var bz0=Math.max(b.minZ+2,Math.min(b.maxZ-2,cz+Math.sin(a)*R));
    var found=null;
    for(var att=0;att<24;att++){
      var tx=att?bx0+(Math.random()-0.5)*7:bx0, tz=att?bz0+(Math.random()-0.5)*7:bz0;
      tx=Math.max(b.minX+2,Math.min(b.maxX-2,tx));
      tz=Math.max(b.minZ+2,Math.min(b.maxZ-2,tz));
      var bad=false;
      for(var bi=0;bi<mapBoxes.length;bi++){
        var bxs=mapBoxes[bi];
        if(!bxs.mesh||bxs.mesh.visible===false||bxs.isPlatform||bxs.isDragonBoat)continue;
        if(bxs.isFloor||(bxs.size.x>=29&&bxs.size.z>=29))continue;
        if(Math.abs(tx-bxs.pos.x)<bxs.size.x/2+1.2&&Math.abs(tz-bxs.pos.z)<bxs.size.z/2+1.2){bad=true;break;}
      }
      if(!bad){found=new THREE.Vector3(tx,0.6,tz);break;}
    }
    if(!found)found=getRandomSpawnPos(true);
    out.push(found);
  }
  return out;
}
// ── 進入 hybrid：靜默連線，不顯示配對頁 ──
// 純靜態伺服器（python -m http.server / 任意無 WebSocket 的主機）無法跑多人，
// 先在這裡擋掉並說明要用哪個指令，避免使用者只看到一堆 404。
function gameServerUnreachable(){
  var isLocal=/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);
  return location.protocol==='file:'||(isLocal&&!!location.port&&location.port!=='3000');
}
function showGameServerHint(){
  var box=document.getElementById('multi-connecting'),st=document.getElementById('multi-status');
  if(box)box.style.display='flex';
  if(st)st.innerHTML='<span style="color:#f84">⚠ 單多混合需要後端伺服器</span><br>'+
    '<small style="line-height:1.7">目前是純靜態網頁，無法連線。<br>'+
    '請在專案資料夾執行：<br><code style="color:#8f8">node server.js</code><br>'+
    '再開 <code style="color:#8f8">http://localhost:3000</code><br>'+
    '<span style="opacity:.6">(python -m http.server 8080 只能跑單機模式)</span></small>';
}
function startHybridMode(){
  var ipEl=document.getElementById('server-ip');
  if(gameServerUnreachable()){showGameServerHint();return;}
  hybridMode=true;hybridHost=false;hybridDead=false;hybridRespawnT=0;hybridAiSyncT=0;hybridRoomId=null;
  hybridRoster=[];hybridRemoteAi=[];
  // processServerMessage 的 'hybrid_match_found' 有 `if(gameStarted&&isMultiplayer)break;`
  // 的防重入保護。若上一場單機/多人把 gameStarted 留在 true，Hybrid 配對完成時會被
  // 整段跳過 → startHybridGame 不執行 → 名單、AI 視覺、spawn 全部沒建立。
  // 進 Hybrid 模式時重置，讓第一次配對一定會初始化。
  gameStarted=false;
  isMultiplayer=true;tdmMode=false;useDowned=false;playerCount=HYBRID_TOTAL;
  bossRushMode=false;ufoMode=false;bombMode=false;
  connectMultiplayerDirect(ipEl?ipEl.value.trim():'localhost',HYBRID_TOTAL);
}
function startHybridGame(data){
  hybridMode=true;hybridRoomId=data.roomId||null;hybridMyId=data.playerId|0;hybridHost=!!data.isHost;
  hybridAiCount=Math.max(0,Math.min(HYBRID_TOTAL-1,data.aiCount||6));
  hybridRoster=(data.players||[]).map(function(p){return {id:p.id,name:p.name||('玩家'+(p.id+1))};});
  hybridHideUi();
  // 其他真人沿用既有的對手 mesh＋頭頂名稱流程（每人自成一隊 = FFA）
  window._mpRosterData={playerId:hybridMyId,playerCount:hybridRoster.length,team:'F'+hybridMyId,
    teamMate:null,players:hybridRoster.map(function(p){return {id:p.id,name:p.name,team:'F'+p.id};})};
  myPlayerId=hybridMyId;myTeam='F'+hybridMyId;
  // 頭頂名稱順序必須和 buildMultiRoster 產生的 opponentStates 對齊（排除自己）
  opponentNames=hybridRoster.filter(function(p){return p.id!==hybridMyId;}).map(function(p){return p.name;});
  opponentName=opponentNames[0]||'對手';
  applyClassPassives();
  startMultiGame('base');
  var ring=hybridSpawnRing(hybridRoster.length+hybridAiCount);
  if(data.spawn)pos.set(data.spawn.x,0.6,data.spawn.z);
  if(hostAiSim())hybridSpawnHostAi(ring);else hybridSpawnRemoteAi(ring);
  var bd=document.querySelector('#blocker div');
  if(bd)bd.innerHTML='點擊開始混戰（'+hybridRoster.length+' 真人 ＋ '+hybridAiCount+' AI）';
}
// ── 主機：生成 AI，掛在既有的 enemies 陣列上（單人 AI 邏輯直接沿用）──
function hybridSpawnHostAi(ring){
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(e.namePlate){scene.remove(e.namePlate);e.namePlate=null;}
    scene.remove(e.mesh);if(e.hBar)scene.remove(e.hBar);if(e.aBar)scene.remove(e.aBar);
  }
  enemies.length=0;hybridRemoteAi=[];
  for(var i=0;i<hybridAiCount;i++){
    var p=ring[hybridRoster.length+i]||getRandomSpawnPos(true);
    createEnemy(0x66dd88,p.x,p.z,HYBRID_AI_TYPES[i%HYBRID_AI_TYPES.length]);
    var e=enemies[enemies.length-1];
    e.hybridAI=true;e.hybridIdx=i;e.respawnT=0;
    e.maxHp=160;e.hp=160;e.maxArmor=0;e.armor=0;
  }
  syncEnemyNameplates();
}
// 名單變動時「只增減差額」，不要整批重生。
// 整批重生會把每隻 AI 的偵測狀態、巡邆點、正在瞄準的目標全部清成初始值，
// 玩家的體感就是「有人一進來，AI 就突然不攻擊我了」。
// 這裡保留既有 AI 的狀態，只在數量真的變多時補新的、變少時從尾端移除
// （從尾端移除可讓既有索引不位移，hybrid_ai_state 的廣播才不會錯位）。
function hybridResizeAi(ring){
  if(hostAiSim()){
    while(enemies.length>hybridAiCount){
      var le=enemies.pop();
      if(le){scene.remove(le.mesh);if(le.hBar)scene.remove(le.hBar);if(le.aBar)scene.remove(le.aBar);}
    }
    for(var i=enemies.length;i<hybridAiCount;i++){
      var p=ring[hybridRoster.length+i]||getRandomSpawnPos(true);
      createEnemy(0x66dd88,p.x,p.z,HYBRID_AI_TYPES[i%HYBRID_AI_TYPES.length]);
      var e=enemies[enemies.length-1];
      e.hybridAI=true;e.hybridIdx=i;e.respawnT=0;
      e.maxHp=160;e.hp=160;e.maxArmor=0;e.armor=0;
    }
    syncEnemyNameplates();
  }else{
    hybridSpawnRemoteAi(ring);   // 非主機只有視覺模型，重建成本低
  }
}
// ── 非主機：AI 只是網路同步過來的方晶模型 ──
// 非主機的 AI 也要有手上的槍，不然和主機看到的世界差很多。
// 注意：a.gun 是主機廣播過來的「武器種類字串」（'ak47'/'sniper'），
// 沒有 .lookAt()；要轉向必須用真的 Object3D，所以另外存成 a.gunMesh。
function hybridRemoteSetGun(a,kind){
  var want=(kind==='sniper')?'awp':'ak47';
  if(a.gunMesh&&a.gunKind===want)return;
  if(a.gunMesh){try{a.mesh.remove(a.gunMesh);disposeMesh(a.gunMesh);}catch(e){}a.gunMesh=null;}
  try{
    var pivot=new THREE.Group();
    pivot.position.set(-0.2,0.45,0.18);
    var gm=createGunModel(want,true);
    gm.rotation.y=Math.PI;
    pivot.add(gm);pivot.userData.model=gm;
    a.mesh.add(pivot);
    a.gunMesh=pivot;
  }catch(e){a.gunMesh=null;}
  a.gunKind=want;
}
function hybridSpawnRemoteAi(ring){
  for(var i=0;i<hybridRemoteAi.length;i++){scene.remove(hybridRemoteAi[i].mesh);scene.remove(hybridRemoteAi[i].plate);}
  hybridRemoteAi=[];
  for(var i=0;i<hybridAiCount;i++){
    var p=ring[hybridRoster.length+i]||new THREE.Vector3(0,0.6,0);
    var g=new THREE.Group();
    var body=createCubelingMesh({body:CUBELING_PAL.green.body,accent:CUBELING_PAL.green.accent,
      glow:0x66ff88,core:0x0a2010,visor:0x88ddff,visorEm:0x66aaff,visorEmI:0.7,face:0x14171e});
    body.scale.setScalar(CUBELING_AI_SCALE);
    g.add(body);g.userData.cubeling=body;
    g.position.set(p.x,p.y,p.z);
    scene.add(g);
    var plate=window._makeNamePlate('AI-'+hybridPad3(i+1),true);
    plate.position.set(p.x,p.y+window.NAMEPLATE_Y,p.z);
    scene.add(plate);
    var ra={mesh:g,plate:plate,name:'AI-'+hybridPad3(i+1),hp:100,alive:true,firing:false,
      gun:'ak47',gunMesh:null,gunKind:null,tx:p.x,ty:p.y,tz:p.z,tyaw:0};
    hybridRemoteSetGun(ra,'ak47');
    hybridRemoteAi.push(ra);
  }
}
// Hybrid：AI 死亡 → 排 5 秒重生、播 Kill Feed、通知其他人
function hybridAiDown(e,killer){
  var idx=e.hybridIdx===undefined?enemies.indexOf(e):e.hybridIdx;
  var nm='AI-'+hybridPad3((idx|0)+1);
  // 沒帶擊殺者（玩家打死 AI）才算本機玩家的功勞；
  // AI 互相擊殺時 killer 是那隻 AI，否則 Kill Feed 會全部記成「你擊殺」
  killer=killer||{name:authUser||'你',type:KT_PLAYER,id:hybridMyId,weapon:currentGun};
  e.respawnT=HYBRID_AI_RESPAWN_SEC;
  fireKillEvent({killerName:killer.name,killerType:killer.type,killerId:killer.id,
    victimName:nm,victimType:KT_AI,victimId:1000+(idx|0),weapon:killer.weapon||currentGun});
  if(killer.type===KT_PLAYER)killCounter++;
  relaySend({type:'hybrid_ai_killed',aiIdx:idx|0,aiName:nm,
    byName:killer.name,byId:killer.id,byType:killer.type,weapon:killer.weapon||currentGun});
}
window._hybridAiDown=hybridAiDown;   // damageEnemy() 在外層作用域，用 window 回呼

// 看門狗：Hybrid 主機端若某隻 AI 連續 1.5 秒幾乎沒移動，就判定它被
// moveTarget/速度邏輯卡住，強制推向地圖中心並讓它重新偵測、重新選目標。
// 這種「無聲凍結」很難從畫面看出根因寧可多此一舉也不要讓整間房的 AI 停擺。
function hybridAiUnstickWatchdog(dt){
  if(!hostAiSim())return;
  var b=getMapBounds(),cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(!e.stuckT)e.stuckT=0;
    if(e.hp<=0){e.lastX=e.pos.x;e.lastZ=e.pos.z;continue;}
    var moved=(e.lastX===undefined)?99:Math.abs(e.pos.x-e.lastX)+Math.abs(e.pos.z-e.lastZ);
    if(moved<0.02)e.stuckT+=dt;else e.stuckT=0;   // 門檻必須高於原地抖動量(約0.007/幀)，否則永遠不觸發
    e.lastX=e.pos.x;e.lastZ=e.pos.z;
    if(e.stuckT>1.5){
      e.stuckT=0;
      var away=new THREE.Vector3(e.pos.x-cx,0,e.pos.z-cz);
      if(away.length()<0.5)away.set(Math.random()-0.5,0,Math.random()-0.5);
      e.vel.add(away.normalize().multiplyScalar(6));
      e.hasDetected=false;e.detectCD=0;e.hybridOrbit=0;
      e.hybridCD=0;   // 立刻重新取得開火權
    }
  }
}
// ── Hybrid 推進迴圈：rAF + setInterval 雙驅動 ──
// 問題背景：AI 的權威來源是「第一位玩家的瀏覽器」。Chrome 對背景分頁的
// requestAnimationFrame 會近乎完全暫停，於是只要主機分頁失焦／被切換／最小化，
// AI 就不再生成也不再廣播，其他人的世界直接凍結。
// setInterval 在背景分頁仍會執行（降頻到 1Hz），所以拿它當備援，
// 並且用時間戳算 dt，兩條路徿共用同一份邏輯、不會重複推進。
var ocHybridTickAt=0;
function ocHybridPush(){
  if(!hybridMode||!gameStarted)return;
  var now=performance.now();
  if(ocHybridTickAt===0){ocHybridTickAt=now;return;}
  var dt=(now-ocHybridTickAt)/1000;
  if(dt<0.05)return;                 // rAF 還在正常跑 → 讓它處理
  if(dt>0.5)dt=0.5;                  // 背景降頻時夾住，避免一步跳太遠穿牆
  ocHybridTickAt=now;
  if(hostAiSim()){
    hybridRespawnTick(dt);
    hybridHostAiTick(dt);            // 含 AI 傷害判定與 hybrid_ai_state 廣播
    updateEnemies(dt);
  }else{
    hybridRespawnTick(dt);
    hybridRemoteAiTick(dt);
  }
  hybridDebugBeacon(dt);
}
setInterval(ocHybridPush,120);

// ── 診斷信標：把執行緒真實狀態回報給伺服器寫進 log ──
// 這些 bug 發生在別人的瀏覽器裡，光讀程式碼猜錯了三次。
// 讓 log 變成事實來源：誰是主機、AI 座標每 2 秒實際有沒有在變、
// 遠端玩家座標與 hp 是否正確、收到的 AI 目標與實際顯示差多少。
var hybridBeaconT=0;
function hybridDebugBeacon(dt){
  if(!hybridMode)return;
  hybridBeaconT-=dt;
  if(hybridBeaconT>0)return;
  hybridBeaconT=2;
  var snap={me:hybridMyId,host:hybridHost?'Y':'N',room:hybridRoomId,
    roster:hybridRoster.length,aiCount:hybridAiCount,
    mx:+pos.x.toFixed(1),mz:+pos.z.toFixed(1),hp:Math.round(playerHP),ar:Math.round(playerArmor),
    dead:hybridDead?'Y':'N',gun:currentGun,opp:[],ai:[]};
  for(var oi=0;oi<opponentStates.length;oi++){
    var o=opponentStates[oi];
    if(!o)continue;
    snap.opp.push(opponentPlayerIds[oi]+'@'+o.pos.x.toFixed(0)+','+o.pos.z.toFixed(0)
      +' hp'+Math.round(o.hp)+' ar'+Math.round(o.armor)+(o.alive?' ALIVE':' DEAD'));
  }
  if(hostAiSim()){
    for(var i=0;i<enemies.length&&i<10;i++){
      var e=enemies[i];
      // 量測實際移動速度(m/s)：_lx/_lz 是 0.5 秒前的位置
      // 信標週期是 2s，量測視窗必須大於 2s 才跨得過兩次，否則每次都只會重置
      var _now=performance.now();
      if(!e._mt){e._mt=_now;e._lx=e.pos.x;e._lz=e.pos.z;e._spd=0;}
      else{var _dd=Math.sqrt((e.pos.x-e._lx)*(e.pos.x-e._lx)+(e.pos.z-e._lz)*(e.pos.z-e._lz));
        e._spd=(_dd/((_now-e._mt)/1000)).toFixed(1);e._mt=_now;e._lx=e.pos.x;e._lz=e.pos.z;}
      snap.ai.push(i+e.type.charAt(0)+'@'+e.pos.x.toFixed(0)+','+e.pos.y.toFixed(0)+','+e.pos.z.toFixed(0)
        +' hp'+Math.round(e.hp)+' '+e.state+(e.hybridTarget?'->P'+(e.hybridTarget.idx+1):'')
        +(e.aiTarget?'>>A'+((e.aiTarget.hybridIdx!==undefined?e.aiTarget.hybridIdx:enemies.indexOf(e.aiTarget))+1):'>>A-')
        +' v'+(e._spd===undefined?'?':e._spd));
    }
  }else{
    for(var k=0;k<hybridRemoteAi.length&&k<10;k++){
      var a=hybridRemoteAi[k];
      snap.ai.push(k+'@'+a.mesh.position.x.toFixed(0)+','+a.mesh.position.z.toFixed(0)
        +' tgt'+a.tx.toFixed(0)+','+a.tz.toFixed(0)+(a.alive?'':' DEAD'));
    }
  }
  var _sd=window._hybridShootDbg;
  snap.shot=_sd?(_sd.recv+'/'+_sd.meshes+'/'+_sd.hits+'/'+_sd.dealt+' 限速丟棄'+(_sd.gated||0)):'-';
  snap.ray=_sd&&_sd.ray?_sd.ray:'-';
  var _mc=window.__mc||{},_ml=[];
  for(var _k in _mc){if(_mc[_k]&&_k.indexOf('hybrid')>=0)_ml.push(_k+'='+_mc[_k]);}
  snap.msg=_ml.sort().join(',');
  relaySend({type:'hybrid_debug_report',snap:snap});
}
// ── 主機每幀：AI 重生 → AI 打其他真人 → 脫離看門狗 → 10Hz 廣播 ──
function hybridHostAiTick(dt){
  if(!hostAiSim())return;
  hybridAiRespawnTick(dt);
  hybridAiAttackPlayers(dt);
  hybridAiUnstickWatchdog(dt);
  hybridAiSyncT-=dt;
  if(hybridAiSyncT>0)return;
  hybridAiSyncT=0.1;
  var arr=[];
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    arr.push({i:i,x:hybridR2(e.pos.x),y:hybridR2(e.pos.y),z:hybridR2(e.pos.z),
      yaw:hybridR2(e.mesh.rotation.y),hp:Math.max(0,Math.round(e.hp)),alive:e.hp>0,
      f:e.firingNow?1:0,g:e.weaponType||'ak47',t:e.type||'normal'});
  }
  relaySend({type:'hybrid_ai_state',states:arr});
}
// AI 死亡 5 秒後滿血重生（換一個離真人遠的點）
function hybridAiRespawnTick(dt){
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(!e||!e.hybridAI||e.hp>0)continue;
    e.respawnT-=dt;
    if(e.respawnT>0)continue;
    var sp=hybridSpawnRing(1)[0];
    e.pos.copy(sp);e.mesh.position.copy(sp);e.towerPerch=null;
    e.hp=e.maxHp;e.armor=e.maxArmor;
    e.vel.set(0,0,0);e.desiredVel.set(0,0,0);e.aimYaw=0;e.firingNow=false;
    e.state='patrol';e.shootCD=1+Math.random();e.knifeHits=0;e.burnTimer=0;e.chargeTimer=0;
    e.aiTarget=null;e.aiTargetCD=0;e.aiHitFlash=0;e.investigateTarget=null;e.searchTimer=0;
    e.waypoint.set(sp.x+(Math.random()-0.5)*14,0,sp.z+(Math.random()-0.5)*14);
    e.mesh.visible=true;
    if(e.hBar){e.hBar.visible=true;e.hBar.position.set(sp.x,CUBELING_BAR,sp.z);}
    if(e.aBar)e.aBar.visible=true;
    if(e.namePlate)e.namePlate.visible=true;
    e.respawnT=0;
  }
}
// 主機端：AI 轉向並對「其他真人」開火（護甲優先），命中後由伺服器轉寄給對方
// Hybrid：AI 主動追其他真人玩家。
// 否則 AI 只會朝「本機玩家 / 其他 AI / 巡邆點」移動，中途加入的真人站在
// 巡邆範圍外，就永遠走不進 34 公尺的攻擊距離，看起來像 AI 不攻擊他。
function hybridAiRemoteTarget(e,maxDist){
  if(!hostAiSim())return null;
  var best=-1,bd=1e9;
  for(var oi=0;oi<opponentStates.length;oi++){
    var os=opponentStates[oi];
    if(!os||!os.alive)continue;
    if(opponentPlayerIds[oi]===hybridMyId)continue;
    if(!ocLosClear(e,os,0.45,0.85))continue;   // 隔牆的真人不能當目標
    var d=e.pos.distanceTo(os.pos);
    if(d<bd){bd=d;best=oi;}
  }
  if(best<0||bd>maxDist)return null;
  return {idx:best,dist:bd,pos:opponentStates[best].pos};
}
function hybridAiAttackPlayers(dt){
  // mapMeshes 只在 updateEnemies 開頭填充，而這裡跑在它之前，先同步一次
  ocSyncMapMeshes();
  var _slots={};               // 每個遠端真人最多同時被 3 隻 AI 鎖定
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(!e||e.hp<=0)continue;
    var best=-1,bd=1e9;
    for(var oi=0;oi<opponentStates.length;oi++){
      var os=opponentStates[oi];
      if(!os||!os.alive)continue;
      if(opponentPlayerIds[oi]===hybridMyId)continue;   // 本機玩家走單機 projectile 路徑
      // ★ 原本這裡只有距離比較，完全沒有視線判定 → AI 隔著牆照樣造成傷害。
      //   改成只鎖定「看得見」的真人，AI 自然會放棄牆後的人。
      if(!ocLosClear(e,os,0.45,0.85))continue;
      var d=e.pos.distanceTo(os.pos);
      if(d<bd){bd=d;best=oi;}
    }
    if(best<0||bd>34)continue;
    var _pid=opponentPlayerIds[best];
    _slots[_pid]=(_slots[_pid]||0)+1;
    if(_slots[_pid]>3)continue;   // 超過 3 隻就不再加入這輪集火
    var tp=opponentStates[best].pos;
    e.mesh.rotation.y=Math.atan2(tp.x-e.pos.x,tp.z-e.pos.z);
    if(e.gun)e.gun.lookAt(new THREE.Vector3(tp.x,tp.y+0.5,tp.z));
    // 用獨立冷卻 e.hybridCD，不要搶 updateEnemies 的 e.shootCD，
    // 否則 AI 對「遠端玩家」與「本機玩家」會互相搶開火權而整個停火
    e.hybridCD=(e.hybridCD||0)-1;
    if(e.hybridCD<0)e.hybridCD=0;
    if(e.hybridCD>0)continue;
    var wpn=e.weaponType||'ak47';
    // ★ 平衡：原本冷卻 24 幀(0.4s)、命中 45%、傷害 base*0.3。
    //   8 隻 AI 一起打同一個真人 ≈ 9 hits/s × 6 ≈ 54 DPS 灌一個人，
    //   200 有效血量撐不到 4 秒 → 玩家「一下就被秒」。
    //   現在拉長到 ~1.2s、命中 28%、傷害 base*0.15，8 隻合計 ≈ 7.7 DPS。
    e.hybridCD=Math.max(70,(gunData[wpn]?gunData[wpn].fireRate:0.12)*1.6+Math.random()*0.4);
    e.firingNow=true;
    if(Math.random()>0.28)continue;                       // 約 28% 命中率
    var base=(gunData[wpn]&&gunData[wpn].dmg)||25;
    var dmg=Math.max(4,Math.round(base*0.15*(bd>18?0.6:1)));
    relaySend({type:'hybrid_ai_hit',targetId:opponentPlayerIds[best],dmg:dmg,weapon:wpn,
      aiIdx:i,aiName:'AI-'+hybridPad3(i+1)});
  }
}
// ── 非主機：套用主機同步過來的 AI 狀態 ──
function hybridApplyAiState(list){
  if(!hybridMode||hybridHost||!list)return;
  for(var i=0;i<list.length&&i<hybridRemoteAi.length;i++){
    var s=list[i],a=hybridRemoteAi[i];
    if(s.i!==undefined&&s.i!==i)continue;
    a.tx=s.x;a.ty=s.y;a.tz=s.z;a.tyaw=s.yaw;
    a.hp=s.hp;a.alive=!!s.alive;a.firing=!!s.f;a.gun=s.g||a.gun;
    if(s.g)hybridRemoteSetGun(a,s.g);
  }
}
var hybridTracers=[];
window._hybridDebugOn=false;  // 診斷面板預設關閉；要查 AI 問題時按 F9，或 console 執行 __hybridDebug(true)
window.__hybridDebug=function(on){window._hybridDebugOn=(on===undefined?!window._hybridDebugOn:!!on);};
document.addEventListener('keydown',function(e){if(e.code==='F9'){e.preventDefault();window.__hybridDebug();}});
// 非主機端補一段曳光，讓「AI 正在打你」在自己畫面看得出來。
// AI 的子彈與槍口火光是在主機端模擬的，非主機只收到 hybrid_ai_hit 這一筆，
// 不補的話自己畫面上 AI 會站著不動，看起來完全沒有在攻擊。
var _hybridAiSndAt=0;
function hybridAiGunSound(w){
  var n=performance.now();
  if(n-_hybridAiSndAt<130)return;   // 8 隻 AI 同時開火會疊成噪音
  _hybridAiSndAt=n;
  try{playGunSound(w||'ak47');}catch(e){}
}
function hybridAiTracer(from,to){
  var full=new THREE.Vector3().subVectors(to,from);
  var len=full.length();
  if(len<0.3)return;
  // 曳光本來是純視覺物件、沒有任何碰撞判定，所以直接畫到目標會穿牆。
  // 先對地圖射線，撞到牆就截斷在牆面上，否則子彈會從牆裡面冒出來。
  var dir=full.clone().normalize();
  try{
    var boxes=[];
    for(var mi=0;mi<mapBoxes.length;mi++){if(mapBoxes[mi].mesh.visible!==false)boxes.push(mapBoxes[mi].mesh);}
    if(boxes.length){
      var wrc=new THREE.Raycaster(from,dir,0.05,len);
      var whit=wrc.intersectObjects(boxes,false);
      if(whit.length&&whit[0].distance<len)len=Math.max(0.05,whit[0].distance-0.08);
    }
  }catch(e){}
  if(len<0.3)return;
  var d=dir;
  // 使用者指定：曳光要橘色。原本 0xffcc55 是黃色，在灰暗的設施場景裡幾乎看不見。
  var mesh=new THREE.Mesh(new THREE.CylinderGeometry(0.024,0.024,len,4,1,true),
    new THREE.MeshBasicMaterial({color:0xff7711,transparent:true,opacity:0.95,depthWrite:false}));
  mesh.position.copy(from).addScaledVector(d,len*0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);
  scene.add(mesh);
  hybridTracers.push({mesh:mesh,t:0.07});
  while(hybridTracers.length>40){var old=hybridTracers.shift();scene.remove(old.mesh);old.mesh.geometry.dispose();old.mesh.material.dispose();}
}
// ── Hybrid 診斷面板（F9 切換）────────────────────────────────
// 之前只能靠讀程式碼猜「AI 到底有沒有鎖定到人」，這裡把房間與 AI 的真實狀態
// 直接顯示出來：AI 數、遠端玩家座標、每隻 AI 的血量/狀態/瞄準對象與距離。
function hybridDebugPanel(){
  var el=document.getElementById('hybrid-debug');
  if(!window._hybridDebugOn){if(el)el.style.display='none';return;}
  if(!el){
    el=document.createElement('div');el.id='hybrid-debug';
    el.style.cssText='position:fixed;left:8px;top:8px;z-index:9999;background:rgba(0,0,0,.82);color:#9f9;border:1px solid rgba(120,255,160,.35);border-radius:6px;padding:8px 10px;font:11px/1.5 Menlo,monospace;white-space:pre;pointer-events:none;max-height:90vh;overflow:hidden';
    document.body.appendChild(el);
  }
  el.style.display='block';
  var L=[];
  L.push('房間 '+(hybridRoomId||'-')+'  我='+hybridMyId+'  '+(hybridHost?'主機':'客戶端'));
  L.push('真人 '+hybridRoster.length+'  AI '+hybridAiCount+'  模擬='+(hostAiSim()?'主機':'網路同步'));
  L.push('我 ('+pos.x.toFixed(1)+','+pos.z.toFixed(1)+')  HP'+Math.round(playerHP));
  L.push('--- 遠端真人 (opponentStates) ---');
  for(var i=0;i<opponentStates.length;i++){
    var o=opponentStates[i],pid=opponentPlayerIds[i];
    var d=Math.round(pos.distanceTo(o.pos));
    L.push('  id'+pid+' '+(o.alive?'活':'死')+' ('+o.pos.x.toFixed(1)+','+o.pos.z.toFixed(1)+') 距我 '+d
      +' HP'+Math.round(o.hp)+' 判定'+(hybridAiRemoteTarget({pos:pos},1e9)?'AI會打他':'AI不選他'));
  }
  L.push('--- AI ---');
  if(hostAiSim()){
    for(var j=0;j<enemies.length;j++){
      var e=enemies[j];
      var tgt=e.hybridTarget?('AI-'+hybridPad3((e.hybridTarget.idx|0)+1)):(e.aiTarget?('AI-'+hybridPad3((e.aiTarget.hybridIdx!==undefined?e.aiTarget.hybridIdx:enemies.indexOf(e.aiTarget))+1)):(e.hasDetected?'我':'—'));
      L.push('  '+hybridPad3(j+1)+' '+e.type+' HP'+Math.round(e.hp)+'/'+e.maxHp+' 狀態'+e.state+' 瞄'+tgt);
    }
  }else{
    L.push('  視覺模型 '+hybridRemoteAi.length+' 顆（傷害由主機計算，本機只收 hybrid_ai_hit）');
  }
  el.textContent=L.join('\n');
}
function hybridTracerTick(dt){
  for(var i=hybridTracers.length-1;i>=0;i--){
    var t=hybridTracers[i];
    t.t-=dt;
    if(t.t<=0){scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();hybridTracers.splice(i,1);continue;}
    t.mesh.material.opacity=0.85*(t.t/0.07);
  }
  for(var j=0;j<hybridRemoteAi.length;j++){
    var a=hybridRemoteAi[j];
    if(!a.firingT)continue;
    a.firingT-=dt;
    var cu=a.mesh.userData&&a.mesh.userData.cubeling;
    var vs=cu&&cu.userData&&cu.userData.visor;
    if(!vs)continue;
    vs.material.emissiveIntensity=(a.firingT>0)?2.0:0.7;   // 材質是每顆 AI 各自 new，不會互相影響
  }
}
function hybridRemoteAiTick(dt){
  if(!hybridMode||hybridHost)return;
  for(var i=0;i<hybridRemoteAi.length;i++){
    var a=hybridRemoteAi[i];
    // dt*12 幾乎是硬追目標，AI 每收到一次廣播就瞬間到位，看起來像在瞬移/抽動。
    var k=Math.min(1,dt*7);
    a.mesh.position.x+=(a.tx-a.mesh.position.x)*k;
    a.mesh.position.y+=(a.ty-a.mesh.position.y)*k;
    a.mesh.position.z+=(a.tz-a.mesh.position.z)*k;
    if(a.cyaw===undefined)a.cyaw=a.mesh.rotation.y;
    var dy=((a.tyaw-a.cyaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    a.cyaw+=dy*Math.min(1,dt*9);
    a.mesh.rotation.y=a.cyaw;
    a.mesh.visible=a.alive;
    if(window._updateNamePlate)window._updateNamePlate(a.plate,a.mesh.position,a.alive);
    // AI 開火：主機廣播過來的 firing 旗號要轉成曳光／槍口火光／音效。
    // 舊碼在這裡完全沒處理 firing，所以第二人只看到 AI 靜靜地走，
    // 感受不到「AI 在開火」，跟第一個人（本地模擬）看到的畫面完全不同。
    if(a.firing&&!a.wasFiring&&a.alive){
      var fp2=a.mesh.position,tp2=null,tpn2=1e9;
      for(var oi2=0;oi2<opponentStates.length;oi2++){
        var os2=opponentStates[oi2];
        if(!os2||!os2.alive)continue;
        var dd2=fp2.distanceToSquared(os2.pos);
        if(dd2<tpn2){tpn2=dd2;tp2=os2.pos;}
      }
      tp2=tp2?tp2.clone().add(new THREE.Vector3(0,0.5,0)):pos.clone();
      var mg2=fp2.clone().add(new THREE.Vector3(0,1.15,0));
      a.mesh.rotation.y=Math.atan2(tp2.x-mg2.x,tp2.z-mg2.z);
      if(a.gunMesh)a.gunMesh.lookAt(tp2);   // a.gun 是字串，不能拿來 lookAt
      hybridAiTracer(mg2,tp2);
      a.firingT=0.09;
      hybridAiGunSound(a.gun||'ak47');
    }
    a.wasFiring=!!a.firing;
    ocRemoteKnockTick(a,dt);
  }
}
// ── 死亡／重生（真人 10 秒）──
function hybridLocalDeath(killerName,killerId,killerIsAi,weapon){
  if(hybridDead)return;
  hybridDead=true;hybridRespawnT=HYBRID_RESPAWN_SEC;
  isDowned=false;downTimer=0;_stopAutoResume();
  var _dl=document.getElementById('down-overlay');if(_dl)_dl.style.display='none';
  hybridKillerName=killerName||'??';
  hybridKillerId=(killerId===undefined||killerId===null)?-1:killerId;
  hybridKillerIsAi=!!killerIsAi;
  fireKillEvent({killerName:hybridKillerName,killerType:hybridKillerIsAi?KT_AI:KT_PLAYER,
    killerId:hybridKillerId,victimName:'你',victimType:KT_PLAYER,victimId:hybridMyId,
    weapon:weapon||currentGun||'??'});
  // ★ 擊殺事件一定要廣播整個房間。原本 fireKillEvent 裡的 window.forwardKillEvent
  //   從未被實作，所以事件純粹是本機的：只有「死者自己」看得到，
  //   「殺人的那個人」永遠看不到自己殺了人（雙方都覺得對方沒顯示擊殺）。
  //   AI 擊殺之所以每個人都看得到，是因為另外走了 hybrid_ai_killed 廣播。
  relaySend({type:'hybrid_kill',
    killerName:hybridKillerName,killerType:hybridKillerIsAi?KT_AI:KT_PLAYER,killerId:hybridKillerId,
    victimName:hybridNameOf(hybridMyId),victimType:KT_PLAYER,victimId:hybridMyId,
    weapon:weapon||currentGun||'??'});
  relaySend({type:'hybrid_death',playerId:hybridMyId});
  var dp=document.getElementById('multi-death-prompt');
  if(dp)dp.style.display='flex';
  var t=document.getElementById('multi-death-title');if(t)t.textContent='💀 陣 亡';
  var d=document.getElementById('multi-death-desc');
  if(d)d.textContent='被 '+hybridKillerName+' 擊殺，'+HYBRID_RESPAWN_SEC+' 秒後重生';
  var cb=document.getElementById('multi-continue-btn');if(cb)cb.style.display='block';   // 沒有它又沒有指標鎖定就完全卡死
  if(document.pointerLockElement)document.exitPointerLock();
}
function hybridRespawnTick(dt){
  if(!hybridDead)return;
  hybridRespawnT-=dt;
  var d=document.getElementById('multi-death-desc');
  if(d)d.textContent='被 '+hybridKillerName+' 擊殺，'+Math.max(0,Math.ceil(hybridRespawnT))+' 秒後重生';
  if(hybridRespawnT<=0)hybridRespawnLocal();
}
function hybridRespawnLocal(){
  if(!hybridDead)return;
  hybridDead=false;hybridRespawnT=0;
  playerHP=100;playerArmor=100;isDowned=false;downTimer=0;reviving=false;beingRevived=false;
  var sp=hybridSpawnRing(1)[0];
  pos.copy(sp);vel.set(0,0,0);
  if(document.getElementById('multi-death-prompt'))document.getElementById('multi-death-prompt').style.display='none';
  relaySend({type:'hybrid_respawn',playerId:hybridMyId});
  ocRequestPointerLock();   // 安全重鎖：冷卻期內會自動補鎖，不再丟 SecurityError
}
// 真人／AI 造成本機玩家傷害後的統一死亡判定（Hybrid 用）
function hybridCheckLocalDeath(killerName,killerId,killerIsAi,weapon){
  if(playerHP>0||!hybridMode)return;
  hybridLocalDeath(killerName,killerId,killerIsAi,weapon);
}

function startMultiGame(mapName){
  if(window.voteTimer){clearInterval(window.voteTimer);window.voteTimer=null;}document.getElementById('multi-map-vote').style.display='none';
  currentMap=mapName||'base';
  document.getElementById('scanlines').style.display='none';
  document.getElementById('scope-overlay').style.display='none';
  isADS=false;isReloading=false;reloadTimer=0;cam.fov=80;cam.updateProjectionMatrix();
  try{localStorage.removeItem('ocgame_save')}catch(ex){}
  applyMapSettings();
  for(var ei=0;ei<enemies.length;ei++){enemies[ei].hp=0;enemies[ei].mesh.visible=false;if(enemies[ei].hBar)enemies[ei].hBar.visible=false;if(enemies[ei].aBar)enemies[ei].aBar.visible=false;}
  playerHP=100;playerArmor=100;
  opponentMeshes.forEach(function(m){if(m)scene.remove(m);});
  if(window.opponentBars)window.opponentBars.forEach(function(b){scene.remove(b.h);scene.remove(b.a);});
  if(window.opponentPlates){window.opponentPlates.forEach(function(p){if(p)scene.remove(p);});window.opponentPlates=[];}
  if(window.teammatePlates){window.teammatePlates.forEach(function(p){if(p)scene.remove(p);});window.teammatePlates=[];}
  opponentMeshes=[];opponentStates=[];opponentPlayerIds=[];window.opponentBars=[];
  teammateMeshes.forEach(function(m){if(m)scene.remove(m);});
  teammateMeshes=[];teammateStates=[];
  // 重建狀態陣列（清空後必須補回，否則收不到對手位置、mesh 也不會被更新）
  buildMultiRoster(window._mpRosterData);
  var otherCount=opponentStates.length;
  for(var oi=0;oi<otherCount;oi++){
    var om=createOpponentMesh();scene.add(om);
    applyCharSkin(om);
    opponentMeshes.push(om);
    // 頭頂名稱：其他真人玩家的名稱（白色＋深色描邊）
    var onm=(opponentNames&&opponentNames[oi])||('玩家'+(oi+2));
    opponentStates[oi].name=onm;
    var opPlate=window._makeNamePlate(onm,false);   // 跨作用域：makeNamePlate 在 IIFE 內
    scene.add(opPlate);
    window.opponentPlates=window.opponentPlates||[];
    window.opponentPlates[oi]=opPlate;
    var ohBar=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.06),new THREE.MeshBasicMaterial({color:0x44cc44,depthTest:false}));
    ohBar.renderOrder=998;scene.add(ohBar);
    var oaBar=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.04),new THREE.MeshBasicMaterial({color:0x4488ff,depthTest:false}));
    oaBar.renderOrder=998;scene.add(oaBar);
    window.opponentBars.push({h:ohBar,a:oaBar});
  }
  teammateMeshes.forEach(function(m){if(m)scene.remove(m);});
  teammateMeshes=[];
  window.teammatePlates=[];
  teamMates.forEach(function(tm,ti){
    var tmm=createOpponentMesh();scene.add(tmm);
    applyCharSkin(tmm);
    teammateMeshes.push(tmm);
    // 隊友也是真人玩家，一樣要顯示頭頂名稱
    var tPlate=window._makeNamePlate((tm&&tm.name)||('隊友'+(ti+1)),false);   // 跨作用域
    scene.add(tPlate);
    window.teammatePlates[ti]=tPlate;
  });
  tdmResetState();
  if(bombMode){
    if(window._savedSlot0===undefined)window._savedSlot0=playerLoadout[0]||'ak47';
    playerLoadout[0]='grenade';
    grenadeStacks[0]=99;
    grenadeTypes[0]='frag';
    currentSlot=-1;
    switchToSlot(0);
    if(!rangeMode)document.getElementById('ammo-hud').innerHTML='∞';
  }
  if(ufoMode){
  ufoActive=false;ufoSpawned=false;
    for(var ei=0;ei<enemies.length;ei++){enemies[ei].hp=0;enemies[ei].mesh.visible=false;if(enemies[ei].hBar)enemies[ei].hBar.visible=false;if(enemies[ei].aBar)enemies[ei].aBar.visible=false;}
    var bosshp=document.getElementById('boss-hp-wrap');if(bosshp){bosshp.style.display='none';}
    // 移除可能殘留的上一台 UFO mesh，避免 spawnUFO 疊出第兩台
    if(ufo&&ufo.mesh){scene.remove(ufo.mesh);disposeMesh(ufo.mesh);ufo=null;}
    if(ufoBeamRing){scene.remove(ufoBeamRing);ufoBeamRing=null;}
    if(ufoBeamMesh){scene.remove(ufoBeamMesh);disposeMesh(ufoBeamMesh);ufoBeamMesh=null;}
    ufoProjectiles.forEach(function(up){if(up.mesh){scene.remove(up.mesh);disposeMesh(up.mesh);}if(up.trail){scene.remove(up.trail);disposeMesh(up.trail);}});ufoProjectiles=[];
  }
  if(ufoMode){spawnUFO();document.getElementById('round-clear').textContent='🛸 UFO 來襲！';document.getElementById('round-clear').style.color='#4df';document.getElementById('round-clear').style.display='block';setTimeout(function(){document.getElementById('round-clear').style.display='none';},2000);}
  gameStarted=true;
  var rp=getRandomSpawnPos(false);pos.copy(rp);vel.set(0,0,0);
  document.getElementById('blocker').style.display='flex';
  document.querySelector('#blocker div').innerHTML='點擊開始對戰';
}
window.addEventListener('message',function(e){
  var msg=e.data;
  if(msg.type==='relay_status'){
    if(msg.connected){
      if(location.protocol==='file:')return;
      relayReady=true;
      document.getElementById('multi-status').textContent='正在尋找其他玩家...';
      relaySend({type:'join_queue',name:authUser||'Player'+Math.floor(Math.random()*1000),username:authUser||'',teamId:currentTeamId||''});
    }else if(msg.error){
      if(location.protocol==='file:')return;
      document.getElementById('multi-status').innerHTML='無法連線到伺服器<br><small style="color:rgba(255,255,255,.3)">請確認伺服器已啟動</small>';
    }
  }
  if(msg.type==='relay_msg'){
    if(location.protocol==='file:')return;
    try{var data=JSON.parse(msg.data);}catch(ex){return;}
    processServerMessage(data);
  }
  if(msg.type==='req_state'){
    e.source.postMessage({type:'state_data',data:{px:pos.x,py:pos.y,pz:pos.z,yaw:yaw,pitch:pitch,gun:currentGun,shooting:autoFire,cls:playerClass}},'*');
  }
});
function httpSend(payload){
  fetch(ocHttpBase(null)+'/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client:httpClientId,msg:payload})});
}
function relaySend(payload){
  if(location.protocol==='file:'){httpSend(payload);return;}
  if(window.multiWS&&window.multiWS.readyState===1){
    window.multiWS.send(JSON.stringify(payload));
    return;
  }
  if(relayIframe&&relayIframe.contentWindow){
    relayIframe.contentWindow.postMessage({type:'relay_send',payload:payload},'*');
  }
}
function connectMultiplayerDirect(ip, mode){
  if(window.multiWS)try{window.multiWS.close()}catch(e){}
  // 開始新多人連線前，清理上一場(可能不同模式)殘留的對局 UI 與狀態，
  // 避免切換模式時彈出舊的死亡重生鈕/UFO/A/B隊計分等
  ['multi-death-prompt','down-overlay','multi-map-vote','multi-waiting','multi-end-options'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
  if(window.voteTimer){clearInterval(window.voteTimer);window.voteTimer=null;}
  window._reconnectAttempts=0;
  mode=mode||2;
  var url=ocMultiWSURL(ip);
  window.multiWS=new WebSocket(url);
  var ws=window.multiWS;
  ws.onopen=function(){
    relayReady=true;
    // 單多混合：不顯示「正在尋找玩家」頁面，直接靜默排隊
    if(mode===HYBRID_TOTAL){
      // 等指紋算出來再排隊，否則 clientBuild 會是空值而被閘門擋掉
      var ocSendQueue=function(){
        try{ws.send(JSON.stringify({type:'join_hybrid_queue',name:authUser||'Player'+Math.floor(Math.random()*1000),username:authUser||'',clientBuild:window.OC_BUILD||''}));}catch(e){}
      };
      if(window.OC_BUILD)ocSendQueue();
      else{
        var ocWait=0;
        var ocTimer=setInterval(function(){
          if(window.OC_BUILD||ocWait>40){clearInterval(ocTimer);ocSendQueue();}
          ocWait++;
        },100);
      }
    }else{
      document.getElementById('multi-status').innerHTML='正在尋找其他玩家...<br><small style="color:rgba(255,255,255,.3)">需要 '+mode+' 位玩家</small>';
      var gameType='multi';if(ufoMode)gameType='ufo';else if(bombMode)gameType='bomb';
      ws.send(JSON.stringify({type:'join_queue',name:authUser||'Player'+Math.floor(Math.random()*1000),username:authUser||'',teamId:currentTeamId||'',mode:mode,gameMode:gameType+mode}));
    }
    if(window.multiSI)clearInterval(window.multiSI);
    window.multiSI=setInterval(function(){
      if(isMultiplayer&&ws.readyState===1)ws.send(JSON.stringify({type:'state',data:{px:pos.x,py:pos.y,pz:pos.z,yaw:yaw,pitch:pitch,gun:currentGun,shooting:autoFire,hp:playerHP,armor:playerArmor,cls:playerClass}}));
    },100);
  };
  // Heartbeat to keep WS alive through Render proxy
  if(window.wsHB)clearInterval(window.wsHB);
  window.wsHB=setInterval(function(){if(ws.readyState===1){try{ws.send(JSON.stringify({type:'ping'}));}catch(e){}}},15000);
  ws.onmessage=function(e){
    try{var data=JSON.parse(e.data);processServerMessage(data);}catch(ex){}
  };
  ws.onerror=function(){
    console.log('WS error');
    if(hybridMode&&!relayReady)showGameServerHint();   // 混合模式連不上時直接說明原因
  };
  ws.onclose=function(){
    if(window.multiSI)clearInterval(window.multiSI);
    if(isMultiplayer&&!tdmWinSubmitted&&!window._pendingMultiEnd&&!gameStarted){
      // 尚未進入對局（排隊/選單）時的意外斷線：嘗試自動重連回配對
      // 若已進入對局(gameStarted)則不重連，避免重連重新配對並彈出選地圖 UI 蓋住進行中的對局
      var attempts=window._reconnectAttempts=(window._reconnectAttempts||0)+1;
      if(attempts<=3){
        document.getElementById('multi-status').innerHTML='連線中斷，嘗試重新連線 ('+attempts+'/3)...';
        setTimeout(function(){
          if(!isMultiplayer||tdmWinSubmitted||window._pendingMultiEnd||gameStarted)return;
          var ip=document.getElementById('server-ip').value.trim()||'localhost';
          connectMultiplayerDirect(ip,requestedPlayerCount||playerCount||2);
        },1500*attempts);
        return;
      }
      window._reconnectAttempts=0;
      try{processServerMessage({type:'opponent_disconnected'});}catch(e){}
    }else if(!isMultiplayer){
      document.getElementById('multi-status').innerHTML='無法連線到伺服器<br><small style="color:rgba(255,255,255,.3)">請確認伺服器已啟動</small>';
    }
  };
}

function connectMultiplayerHTTP(ip){
  httpClientId='';
  var base=ocHttpBase(ip);
  // Join queue via HTTP
  fetch(base+'/api/join')
    .then(function(r){return r.json()})
    .then(function(data){
      httpClientId=data.client;
      // Process any immediate messages (match_found, etc.)
      if(data.messages&&data.messages.length){
        data.messages.forEach(function(m){processServerMessage(m);});
      }
      // Start polling
      if(window.multiPInt)clearInterval(window.multiPInt);
      window.multiPInt=setInterval(function(){
        fetch(base+'/api/poll?client='+encodeURIComponent(httpClientId))
          .then(function(r){return r.json()})
          .then(function(data){
            if(data.messages&&data.messages.length){
              data.messages.forEach(function(m){processServerMessage(m);});
            }
          });
      },200);
      // Set up state send interval
      if(window.multiSI)clearInterval(window.multiSI);
      window.multiSI=setInterval(function(){
        if(isMultiplayer)relaySend({type:'state',data:{px:pos.x,py:pos.y,pz:pos.z,yaw:yaw,pitch:pitch,gun:currentGun,shooting:autoFire,hp:playerHP,armor:playerArmor}});
      },100);
    });
}
// ── 指標鎖定安全層 ──
// Chrome 規定：退出鎖定後約 1 秒內拒絕重新取得，requestPointerLock() 會回傳
// 拒絕的 Promise，丟 SecurityError。舊版 try/catch 接不到 Promise 例外，
// 造成未處理錯誤；鎖定失敗時滑鼠瞄準完全停擺，看起來就像「開槍沒反應」。
var ocLockUntil=0,ocLockWanted=false,ocLockRetry=false;
function ocLockCoolDown(){ocLockUntil=performance.now()+1300;}
function ocRequestPointerLock(target){
  ocLockWanted=true;
  var el=target||document.body;
  if(!el||!el.requestPointerLock)return;
  if(performance.now()<ocLockUntil){ocLockRetry=true;return;}   // 冷卻中 → 排隊稍後自動補鎖
  ocLockRetry=false;
  try{
    var pr=el.requestPointerLock();
    if(pr&&typeof pr.catch==='function')pr.catch(function(){ocLockCoolDown();ocLockRetry=true;});
  }catch(err){ocLockCoolDown();ocLockRetry=true;}
}
document.addEventListener('pointerlockchange',function(){
  if(!document.pointerLockElement){ocLockCoolDown();ocLockWanted=false;ocLockRetry=false;}
});
// 冷卻結束後自動補鎖，不必玩家再點一次
setInterval(function(){
  if(ocLockRetry&&ocLockWanted&&performance.now()>=ocLockUntil)ocRequestPointerLock();
},350);

document.addEventListener('pointerlockchange',function(){
  var mobile=localStorage.getItem('oc_ui_mode')==='mobile';
  locked=!!document.pointerLockElement;
  if(mobile){locked=true;document.getElementById('mobile-controls').style.display=gameStarted?'block':'none';document.getElementById('mobile-slots').style.display=gameStarted?'flex':'none';}
  var menuShown=document.getElementById('menu').style.display!=='none';
  document.getElementById('blocker').style.display=locked||menuShown?'none':'flex';
  document.getElementById('save-exit-btn').style.display=(!locked&&gameStarted&&!menuShown&&!mobile)?'block':'none';
  document.getElementById('back-menu-btn').style.display=(!locked&&gameStarted&&!menuShown&&!mobile)?'block':'none';
});
document.addEventListener('visibilitychange',function(){
  if(!document.hidden&&!document.pointerLockElement&&(gameStarted||isMultiplayer)&&localStorage.getItem('oc_ui_mode')!=='mobile'){
    document.querySelector('#blocker div').innerHTML='點擊繼續遊戲';
  }
});
document.addEventListener('mousedown',function(e){
  if(!locked&&(gameStarted||isMultiplayer)&&document.getElementById('menu').style.display==='none'&&document.getElementById('perk-overlay').style.display==='none'&&document.getElementById('resume-prompt').style.display!=='flex'&&document.getElementById('multi-death-prompt').style.display!=='flex'&&document.getElementById('multi-waiting').style.display!=='flex'&&document.getElementById('multi-end-options').style.display!=='flex'&&document.getElementById('multi-map-vote').style.display!=='flex'){
    ocRequestPointerLock();
  }
});
document.addEventListener('keydown',function(e){
  keys[e.code]=true;
  if(e.code==='Space'){
    e.preventDefault();
    if(climbT){detachClimb(true);return;}
    if(onGround&&!sliding&&gameStarted&&locked){vel.y=JUMP_V;onGround=false;}
  }
  if(e.code==='KeyV'){
    if(climbT){detachClimb(true);}
    else if(currentMap==='basemap3'&&gameStarted&&locked){tryClimb();}
  }
  if(bombMode&&e.code.indexOf('Digit')===0)return;
  if(e.code==='Digit1'||e.code==='Numpad1')switchToSlot(0);
  if(e.code==='Digit2'||e.code==='Numpad2')switchToSlot(1);
  if(e.code==='Digit3'||e.code==='Numpad3')switchToSlot(2);
  if(e.code==='Digit4'||e.code==='Numpad4')switchToSlot(3);
  if(e.code==='Digit5'||e.code==='Numpad5')switchToSlot(4);
  if(e.code==='KeyR'&&!bombMode)reload();
  if(e.code==='KeyF'&&gameStarted&&locked&&!isDowned)useClassSkill();
  if(e.code==='KeyQ'&&gameStarted&&locked&&!isDowned){if(ocEngineer()){if(!e.repeat)ocEngRootStrike();}else ocUseDash();}
  if(e.code==='KeyG'&&currentGun!=='grapple'&&playerClass==='assault'&&gameStarted&&locked&&!isDowned)ocThrowArmorNade();
  if(e.code==='KeyC'&&gameStarted&&locked&&!isDowned&&ocMedic())ocMedSmokeNade();
  if(e.code==='KeyB'&&gameStarted&&locked&&!isDowned&&ocMedic())ocMedThrowDart();
  if(e.code==='KeyT'&&gameStarted&&locked&&!isDowned&&ocMedic())ocMedLongSmoke();
  if(e.code==='KeyZ'&&gameStarted&&locked&&!isDowned&&ocEngineer()&&!e.repeat)ocEngStartBurn();
  if(e.code==='KeyX'&&gameStarted&&locked&&!isDowned&&ocEngineer()){if(!e.repeat)ocEngHammerStrike();return;}
if(bombMode)return;
      if(e.code==='KeyG'&&currentGun==='grapple')fireGrapple();
  if(e.code==='KeyJ'&&gameStarted&&locked&&!inspectTimer&&currentGun!=='knife'&&currentGun!=='grapple'&&currentGun!=='grenade')inspectTimer=1.8;
  if(e.code==='Space'&&grappleActive)releaseGrapple();
  if(e.code==='KeyX'&&playerLoadout[currentSlot]==='grenade'&&bombMode){
    var types=['frag','flashbang','smoke','incendiary'];
    var ci=types.indexOf(grenadeTypes[currentSlot]);
    grenadeTypes[currentSlot]=types[(ci+1)%types.length];
    var nn=grenadeTypeNames[grenadeTypes[currentSlot]]||'手雷';
    var ic=grenadeTypeIcons[grenadeTypes[currentSlot]]||'💣';
    showToast('切換: '+ic+' '+nn,0.8);
  }
  if(e.code==='KeyE'){
    if(ocEngineer()&&gameStarted&&locked&&!isDowned){if(!e.repeat)ocEngSonic();}
    else if(boatRideActive){releaseBoat();}
    else if(ziplineActive){releaseZipline();}
    else if(!tryGrabBoat()){tryGrabZipline();}
  }
});
document.addEventListener('keyup',function(e){keys[e.code]=false;});
document.addEventListener('mousemove',function(e){
  if(!locked)return;
  yaw-=e.movementX*0.004;pitch-=e.movementY*0.004;
  if(pitch>1.4)pitch=1.4;if(pitch<-1.4)pitch=-1.4;
});
document.addEventListener('mousedown',function(e){
  if(!locked)return;
  if(e.button===0){
    if(isDowned){if(currentGun!=='knife'&&currentGun!=='grapple')shoot();return;}
    if(currentGun==='grapple'){fireGrapple();}
    else if(currentGun==='knife'){shoot();}
    else{shoot();autoFire=true;}
  }
  if(e.button===2&&currentGun!=='grapple'&&currentGun!=='knife'&&currentGun!=='grenade'){isADS=!isADS;}
});
document.addEventListener('mouseup',function(e){if(e.button===0)autoFire=false;});
document.addEventListener('contextmenu',function(e){e.preventDefault();});
// ── Mobile touch controls ──
var mobileMoveX=0,mobileMoveZ=0,mobileShooting=false,mobileJumping=false,mobileSlide=false;
var mobileLookX=0,mobileLookY=0,mobileLooking=false,mobileLookId=null;
(function(){
  var jZone=document.getElementById('joystick-zone'),jKnob=document.getElementById('joystick-knob');
  var sBtn=document.getElementById('mobile-shoot-btn'),jBtn=document.getElementById('mobile-jump-btn'),rBtn=document.getElementById('mobile-reload-btn'),slBtn=document.getElementById('mobile-slide-btn'),aBtn=document.getElementById('mobile-aim-btn'),skBtn=document.getElementById('mobile-skill-btn');
  var mc=document.getElementById('mobile-controls'),msc=document.getElementById('mobile-slots');
  var jTouchId=null,sTouchId=null,jumpTouchId=null,reloadTouchId=null,slTouchId=null,aimTouchId=null;
  function jRect(){return jZone.getBoundingClientRect();}
  jZone.addEventListener('touchstart',function(e){e.preventDefault();var t=e.changedTouches[0];jTouchId=t.identifier;updateJoystick(t);},{passive:false});
  jZone.addEventListener('touchmove',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===jTouchId){updateJoystick(e.changedTouches[i]);break;}}},{passive:false});
  jZone.addEventListener('touchend',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===jTouchId){jTouchId=null;mobileMoveX=0;mobileMoveZ=0;jKnob.style.transform='translate(-50%,-50%)';break;}}},{passive:false});
  jZone.addEventListener('touchcancel',function(e){jTouchId=null;mobileMoveX=0;mobileMoveZ=0;jKnob.style.transform='translate(-50%,-50%)';});
  function updateJoystick(t){
    var r=jRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,radius=r.width/2;
    var dx=t.clientX-cx,dy=t.clientY-cy,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>radius){dx=dx/dist*radius;dy=dy/dist*radius;}
    var dead=12;if(dist<dead){dx=0;dy=0;}
    mobileMoveX=dx/radius;mobileMoveZ=-dy/radius;
    if(mobileMoveX>1)mobileMoveX=1;if(mobileMoveX<-1)mobileMoveX=-1;
    if(mobileMoveZ>1)mobileMoveZ=1;if(mobileMoveZ<-1)mobileMoveZ=-1;
    jKnob.style.transform='translate(-50%,-50%) translate('+dx+'px,'+dy+'px)';
  }
  sBtn.addEventListener('touchstart',function(e){e.preventDefault();sTouchId=e.changedTouches[0].identifier;if(!locked)locked=true;if(locked){if(isDowned){if(currentGun!=='knife'&&currentGun!=='grapple'&&currentGun!=='grenade')shoot();}else if(currentGun==='grapple'){fireGrapple();}else if(currentGun==='knife'){shoot();}else if(currentGun==='grenade'){shoot();}else{shoot();autoFire=true;}}mobileShooting=true;},{passive:false});
  sBtn.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===sTouchId){sTouchId=null;mobileShooting=false;autoFire=false;break;}}e.preventDefault();},{passive:false});
  sBtn.addEventListener('touchcancel',function(){sTouchId=null;mobileShooting=false;autoFire=false;});
  jBtn.addEventListener('touchstart',function(e){e.preventDefault();jumpTouchId=e.changedTouches[0].identifier;mobileJumping=true;if(gameStarted&&!locked)locked=true;if(locked&&gameStarted&&onGround&&!sliding){vel.y=JUMP_V;onGround=false;}if(grappleActive)releaseGrapple();},{passive:false});
  jBtn.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===jumpTouchId){jumpTouchId=null;mobileJumping=false;break;}}e.preventDefault();},{passive:false});
  jBtn.addEventListener('touchcancel',function(){jumpTouchId=null;mobileJumping=false;});
  rBtn.addEventListener('touchstart',function(e){e.preventDefault();reloadTouchId=e.changedTouches[0].identifier;if(locked)reload();},{passive:false});
  rBtn.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===reloadTouchId){reloadTouchId=null;break;}}e.preventDefault();},{passive:false});
  rBtn.addEventListener('touchcancel',function(){reloadTouchId=null;});
  slBtn.addEventListener('touchstart',function(e){e.preventDefault();slTouchId=e.changedTouches[0].identifier;if(gameStarted&&!locked)locked=true;mobileSlide=true;if(onGround&&!sliding&&slideCD<=0&&gameStarted){sliding=true;slideTimer=0.7*(window.slideMult||1);vel.y=-2;slideCD=2.2;}},{passive:false});
  slBtn.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===slTouchId){slTouchId=null;mobileSlide=false;break;}}e.preventDefault();},{passive:false});
  slBtn.addEventListener('touchcancel',function(){slTouchId=null;mobileSlide=false;});
  // Aim button
  aBtn.addEventListener('touchstart',function(e){e.preventDefault();aimTouchId=e.changedTouches[0].identifier;if(locked&&currentGun!=='grapple'&&currentGun!=='knife'&&currentGun!=='grenade'){isADS=!isADS;aBtn.classList.toggle('active',isADS);}},{passive:false});
  if(skBtn)skBtn.addEventListener('touchstart',function(e){e.preventDefault();if(locked&&gameStarted)useClassSkill();},{passive:false});
  aBtn.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===aimTouchId){aimTouchId=null;break;}}e.preventDefault();},{passive:false});
  aBtn.addEventListener('touchcancel',function(){aimTouchId=null;});
  // Weapon slot touch handlers
  var slotBtns=[];
  for(var msi=0;msi<5;msi++){
    (function(idx){
      var el=document.createElement('div');el.className='ms-slot'+(idx===currentSlot?' active':'');el.textContent=(idx+1)+' -';msc.appendChild(el);
      slotBtns.push(el);
      el.addEventListener('touchstart',function(e){e.preventDefault();if(locked&&!bombMode)switchToSlot(idx);},{passive:false});
      el.addEventListener('touchmove',function(e){e.preventDefault();},{passive:false});
      el.addEventListener('touchend',function(e){e.preventDefault();},{passive:false});
      el.addEventListener('touchcancel',function(){});
    })(msi);
  }
  // Camera look on non-control areas
  document.addEventListener('touchstart',function(e){if(localStorage.getItem('oc_ui_mode')!=='mobile')return;if(mc.style.display==='none')return;for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];var el=document.elementFromPoint(t.clientX,t.clientY);if(el&&(el===jZone||jZone.contains(el)||el===sBtn||el===jBtn||el===rBtn||el===slBtn||el===aBtn||el===skBtn||el.parentElement===msc))continue;mobileLookId=t.identifier;mobileLooking=true;mobileLookX=t.clientX;mobileLookY=t.clientY;}if(gameStarted&&!locked){locked=true;}},{passive:true});
  document.addEventListener('touchmove',function(e){if(localStorage.getItem('oc_ui_mode')!=='mobile'||!mobileLooking)return;for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.identifier===mobileLookId){yaw-=(t.clientX-mobileLookX)*0.008;pitch-=(t.clientY-mobileLookY)*0.008;if(pitch>1.4)pitch=1.4;if(pitch<-1.4)pitch=-1.4;mobileLookX=t.clientX;mobileLookY=t.clientY;break;}}},{passive:false});
  document.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===mobileLookId){mobileLookId=null;mobileLooking=false;break;}}},{passive:true});
  document.addEventListener('touchcancel',function(){mobileLookId=null;mobileLooking=false;});
  // Prevent page scroll/zoom on mobile game
  document.addEventListener('touchmove',function(e){if(localStorage.getItem('oc_ui_mode')==='mobile'&&mc.style.display!=='none')e.preventDefault();},{passive:false});
})();
window.addEventListener('resize',function(){cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
function aabbOverlap(ap,asz,bp,bsz){
  return ap.x-asz.x/2<bp.x+bsz.x/2&&ap.x+asz.x/2>bp.x-bsz.x/2&&
         ap.y-asz.y/2<bp.y+bsz.y/2&&ap.y+asz.y/2>bp.y-bsz.y/2&&
          ap.z-asz.z/2<bp.z+bsz.z/2&&ap.z+asz.z/2>bp.z-bsz.z/2;
}
function xpForLevel(l){return l*100;}
function getLevel(xp){var l=1;while(xp>=xpForLevel(l)){xp-=xpForLevel(l);l++;}return l;}
function getLevelInfo(xp){var l=getLevel(xp),cur=xp,prev=0;for(var i=1;i<l;i++){cur-=xpForLevel(i);prev+=xpForLevel(i);}return{level:l,current:cur,needed:xpForLevel(l),prevTotal:prev};}
function updateLevelDisplay(){var li=getLevelInfo(playerXP);document.getElementById('level-num').textContent=li.level;var lmn=document.getElementById('level-num-menu');if(lmn)lmn.textContent=li.level;document.getElementById('settlement-level').textContent='Lv.'+li.level+' ('+li.current+' / '+li.needed+')';document.getElementById('settlement-progress-fill').style.width=(li.current/li.needed*100)+'%';var dbEl=document.getElementById('daily-best');var todayKey=new Date();todayKey=todayKey.getFullYear()+'-'+(todayKey.getMonth()+1)+'-'+todayKey.getDate();if(dailyBest[todayKey]){dbEl.style.display='block';dbEl.textContent='🔥 今日最佳：'+dailyBest[todayKey].rounds+' 波 / '+dailyBest[todayKey].score+' 分';}else{dbEl.style.display='none';}}
function addXP(amt){playerXP+=amt;localStorage.setItem('oc_level',playerXP+'');updateLevelDisplay();}
var seasonDays=30;
function updateSeasonDisplay(){
  var saved=localStorage.getItem('oc_season_start');
  if(!saved||(Date.now()-parseInt(saved))/86400000>seasonDays){
    var freshStart=Date.now()-2*86400000;
    localStorage.setItem('oc_season_start',freshStart+'');
    seasonStart=freshStart;
  }else{seasonStart=parseInt(saved);}
  var elapsed=Date.now()-seasonStart;
  var remaining=Math.max(0,seasonDays-Math.floor(elapsed/86400000));
  document.getElementById('season-timer').textContent=remaining+' 天';var sd=document.getElementById('season-display');if(sd)if(sd){sd.innerHTML='🧟 S3 屍變 &nbsp;'+remaining+' 天';}
}
updateSeasonDisplay();
function getRandomSpawnPos(forEnemy,avoidPos,minDist){
  var hF=forEnemy?0.5:0.3,hH=forEnemy?0.5:0.6,minD=minDist||0;
  // 範圍跟著 getMapBounds() 走，改地圖大小不用再回來改這裡
  var sb=getMapBounds(),inset=2;
  var sx0=sb.minX+inset,sz0=sb.minZ+inset;
  var sxW=sb.maxX-sb.minX-inset*2,szH=sb.maxZ-sb.minZ-inset*2;
  for(var att=0;att<100;att++){
    var x=sx0+sxW*Math.random(),z=sz0+szH*Math.random();
    var y=forEnemy?0:0.6;
    if(avoidPos){var dx=x-avoidPos.x,dz=z-avoidPos.z;if(dx*dx+dz*dz<minD*minD)continue;}
    var ok=true;
    for(var b=0;b<mapBoxes.length;b++){
      var bx=mapBoxes[b];
      if(bx.isPlatform||bx.isDragonBoat||!bx.mesh.visible)continue;
      if(bx.isFloor||(bx.size.x>=29&&bx.size.z>=29))continue;
      if(aabbOverlap(new THREE.Vector3(x,y,z),new THREE.Vector3(hF*2,hH*2,hF*2),bx.pos,bx.size)){ok=false;break;}
    }
    if(ok)return new THREE.Vector3(x,y,z);
  }
  return new THREE.Vector3(sx0+sxW*Math.random(),forEnemy?0:0.6,sz0+szH*Math.random());
}
function resolveCollisions(){
  var gnd=false,wall=false,wN=new THREE.Vector3();
  for(var b=0;b<mapBoxes.length;b++){
    var bx=mapBoxes[b],hS=bx.size.clone().multiplyScalar(0.5),pH=pSize.clone().multiplyScalar(0.5);
    if(bx.isDragonBoat||!bx.mesh.visible)continue;
    // One-way platform: skip when player head is below platform top
    if(bx.isPlatform&&pos.y+0.6<bx.pos.y+bx.size.y/2)continue;
    // On platform top: only push up, never sideways (avoid edge tripping)
    if(bx.isPlatform&&pos.y+0.6>bx.pos.y+bx.size.y/2){
      var oxP=hS.x+pH.x-Math.abs(pos.x-bx.pos.x);
      var ozP=hS.z+pH.z-Math.abs(pos.z-bx.pos.z);
      if(oxP>0&&ozP>0){
        var oyP=hS.y+pH.y-Math.abs(pos.y-bx.pos.y);
        if(oyP>0){pos.y+=oyP;vel.y=0;gnd=true;}
      }
      continue;
    }
    var dx=Math.abs(pos.x-bx.pos.x),dy=Math.abs(pos.y-bx.pos.y),dz=Math.abs(pos.z-bx.pos.z);
    var ox=hS.x+pH.x-dx,oy=hS.y+pH.y-dy,oz=hS.z+pH.z-dz;
    if(ox<=0||oy<=0||oz<=0)continue;
    if(ox<=oy&&ox<=oz){var sgn=pos.x<bx.pos.x?-1:1;pos.x+=sgn*ox;var dot=vel.x*sgn;vel.x-=sgn*dot;wN.set(sgn,0,0);wall=true;}
    else if(oy<=ox&&oy<=oz){pos.y+=(pos.y<bx.pos.y?-1:1)*oy;vel.y=0;if(pos.y<bx.pos.y||pos.y-pH.y>=bx.pos.y+hS.y-0.01)gnd=true;}
    else{var sgnZ=pos.z<bx.pos.z?-1:1;pos.z+=sgnZ*oz;var dotZ=vel.z*sgnZ;vel.z-=sgnZ*dotZ;wN.set(0,0,sgnZ);wall=true;}
  }
  return{gnd:gnd,wall:wall,wN:wN};
}
function checkWallContact(){
  for(var b=0;b<mapBoxes.length;b++){
    var bx=mapBoxes[b];
    if(bx.isDragonBoat||!bx.mesh.visible)continue;
    var hS=bx.size.clone().multiplyScalar(0.5),pH=pSize.clone().multiplyScalar(0.5);
    var dx=Math.abs(pos.x-bx.pos.x),dy=Math.abs(pos.y-bx.pos.y),dz=Math.abs(pos.z-bx.pos.z);
    if(dy<hS.y+pH.y-0.05){
      var ox=hS.x+pH.x-dx,oz=hS.z+pH.z-dz;
      if(ox>0&&ox<0.2&&oz>-pH.z&&oz<hS.z+pH.z)return{onWall:true,n:new THREE.Vector3(pos.x<bx.pos.x?-1:1,0,0)};
      if(oz>0&&oz<0.2&&ox>-pH.x&&ox<hS.x+pH.x)return{onWall:true,n:new THREE.Vector3(0,0,pos.z<bx.pos.z?-1:1)};
    }
  }
  return{onWall:false,n:new THREE.Vector3()};
}
function closestLadder(){
  var best=null,db=2.6;
  if(!b3Ladders.length)return null;
  for(var i=0;i<b3Ladders.length;i++){
    var L=b3Ladders[i];
    var dx=pos.x-L.x,dz=pos.z-L.z;
    var d=Math.sqrt(dx*dx+dz*dz);
    if(d<db){db=d;best=L;}
  }
  return best;
}
function tryClimb(){
  if(climbT||currentMap!=='basemap3')return;
  var L=closestLadder();
  if(!L)return;
  climbT=L;
  pos.x=L.x;pos.z=L.z;
  vel.x=0;vel.z=0;vel.y=0;
  if(pos.y<L.baseY+0.2)pos.y=L.baseY;
  climbPhase=0;
  climbAuto=true;
  document.getElementById('ladder-prompt').style.opacity='0';
}
function detachClimb(jump){
  var L=climbT;
  climbT=null;
  if(jump&&L){vel.y=JUMP_V*0.5;if(pos.y<L.baseY)pos.y=L.baseY;}
  else if(L&&pos.y>=L.topY){
    pos.y=L.topY;
  }
  if(pos.y<0.6)pos.y=0.6;
}
function updateClimbPhysics(dt){
  var L=climbT;
  if(!L){climbT=null;return;}
  var up=(keys['KeyW']?1:0)-(keys['KeyS']?1:0);
  if(up===0)up=climbAuto?1:0;
  var cs=2.6;
  if(up!==0)climbPhase+=dt*(up>0?4:-4);
  pos.y+=up*cs*dt;
  pos.x=L.x;pos.z=L.z;
  if(pos.y>=L.topY-0.05){
    pos.y=L.topY;
    var landed=true;
    climbT=null;
    pos.y=36;
    vel.y=0;
    if(keys['Space']){vel.y=JUMP_V*0.4;}
  }
  if(pos.y<=L.baseY&&up<0){
    pos.y=L.baseY;
    climbT=null;
    climbAuto=true;
  }
  if(pos.y<0.6)pos.y=0.6;
}
function updatePhysics(dt){
  if(boatRideActive)return;
  if(climbT){updateClimbPhysics(dt);return;}
  var fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  var rgt=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  var mDir=new THREE.Vector3();
  mDir.addScaledVector(rgt,moveX);mDir.addScaledVector(fwd,moveZ);
  if(mDir.length()>1)mDir.normalize();
  if(isDowned){vel.x=mDir.x*2;vel.z=mDir.z*2;vel.y-=GRAVITY*dt;pos.x+=vel.x*dt;pos.y+=vel.y*dt;pos.z+=vel.z*dt;if(pos.y<=0.6){pos.y=0.6;vel.y=0;}resolveCollisions();return;}
  if(isUnderwater&&currentMap==='flooded'){
    if(!bossFloodedActive)playerO2-=3*dt;
    if(playerO2<=0){playerO2=0;playerHP-=5*dt;if(playerHP<=0){onPlayerDeath();}}
    var swSpd=(SPEED*(window.skillMoveSpeed||1))*0.55;
    if(isADS)swSpd*=0.45;
    if(slowTimer>0)swSpd*=0.55;
    if(ocEngSonicLocal>0)swSpd*=0.5;
    if(ocEngRootT>0)swSpd=0;
    vel.x=mDir.x*swSpd;vel.z=mDir.z*swSpd;
    if(keys['Space']||mobileJumping){vel.y=4;mobileJumping=false;}
    var swSlideKey=keys['ShiftLeft']||keys['ShiftRight']||mobileSlide;
    if(swSlideKey&&!sliding){vel.y=-3.5;sliding=true;slideTimer=0.1;}else if(!swSlideKey)sliding=false;
    if(sliding){slideTimer-=dt;if(slideTimer<=0)sliding=false;}
    vel.y-=3*dt;
    pos.x+=vel.x*dt;pos.y+=vel.y*dt;pos.z+=vel.z*dt;
    if(pos.y>waterLevel-0.2){pos.y=waterLevel-0.2;vel.y=0;}
    if(pos.y<=0.6){pos.y=0.6;vel.y=0;onGround=true;}
    resolveCollisions();
    if(pos.y<-10||pos.x<-18||pos.x>18||pos.z<-18||pos.z>18){pos.set(0,2,0);vel.set(0,0,0);playerHP-=5;showDmgNum(pos.clone(),5,'#ff4444');if(playerHP<=0){onPlayerDeath();}}
    if(!bossFloodedActive)playerO2-=3*dt;
    if(playerO2<=0){playerO2=0;playerHP-=5*dt;if(playerHP<=0){onPlayerDeath();}}
    return;
  }
  if(wallJumpCD>0)wallJumpCD-=dt;
  // Slide
  if(slideCD>0)slideCD-=dt;
  if(slidePromptTimer>0)slidePromptTimer-=dt;else document.getElementById('slide-prompt').style.opacity='0';
  var slideKey=keys['ShiftLeft']||keys['ShiftRight']||mobileSlide;
  if(slideKey&&onGround&&!sliding&&slideCD<=0&&gameStarted){
    sliding=true;slideTimer=0.7*(window.slideMult||1);vel.y=-2;
    slideCD=2.2;
  }
  if(!slideKey)slideKeyWas=false;else if(!slideKeyWas&&slideKey&&!sliding&&slideCD>0){slideKeyWas=true;slidePromptTimer=1;document.getElementById('slide-prompt').textContent='滑鏟冷卻 '+Math.ceil(slideCD)+'秒';document.getElementById('slide-prompt').style.opacity='1';}
  if(sliding){
    slideTimer-=dt;
    if(slideTimer<=0){sliding=false;document.getElementById('slide-prompt').style.opacity='0';}
    vel.x=mDir.x*slideSpeed;vel.z=mDir.z*slideSpeed;
    if(!onGround)sliding=false;
  }
  // Speed modifier from ADS + hit slowdown
  var spdMul=1;
  if(isADS)spdMul*=0.45;
  if(slowTimer>0)spdMul*=0.55;
  if(window.rageActive)spdMul*=1.3;
  if(ocEngSonicLocal>0)spdMul*=0.5;
  if(ocEngRootT>0)spdMul=0;
  var attachEffSpd=getAttachEffects(currentGun);spdMul*=(attachEffSpd.moveSpeed||1);
  if(onGround){
    wallClinging=false;wallTimer=0;
    if(!sliding){vel.x=mDir.x*SPEED*spdMul;vel.z=mDir.z*SPEED*spdMul;}
    if(keys['Space']){vel.y=JUMP_V;onGround=false;}
  }else{
    var canCling=!keys['Space']&&wallJumpCD<=0;
    if(canCling){var ws=checkWallContact();if(ws.onWall&&!wallClinging){wallClinging=true;wallTimer=0;wallNormal.copy(ws.n);}}
    if(wallClinging){
      wallTimer+=dt;vel.y=-WALL_SLIDE;
      vel.x=mDir.x*SPEED*0.7;vel.z=mDir.z*SPEED*0.7;
      if(keys['Space']){vel.copy(wallNormal.clone().multiplyScalar(-WALL_JUMP_F));vel.y=WALL_JUMP_U;wallClinging=false;wallJumpCD=0.3;}
      if(wallTimer>WALL_CLING_TIME)wallClinging=false;
    }else{
      vel.x+=(mDir.x*AIR_SPEED-vel.x)*0.1;vel.z+=(mDir.z*AIR_SPEED-vel.z)*0.1;
      vel.y-=GRAVITY*dt;
    }
  }
  //突擊兵 Q：氣能輔助 — 真位移（約10m），非瞬移
  if(ocDashT>0){ocDashT=Math.max(0,ocDashT-dt);vel.x=ocDashDir.x*20;vel.z=ocDashDir.z*20;vel.y=Math.max(vel.y,0.8);ocDashContact();}
  // 被炸倒：強制滑開一段距離，這段時間不能操控
  if(ocSelfKnockT>0){
    ocSelfKnockT=Math.max(0,ocSelfKnockT-dt);
    if(ocSelfKnockT<=0){ocSelfKnockT=0;ocSelfKnockStand=0.5;}
    vel.x=ocSelfKnockDX;vel.z=ocSelfKnockDZ;
    ocSelfKnockDX*=Math.max(0,1-dt*5);ocSelfKnockDZ*=Math.max(0,1-dt*5);
    if(vel.y>0)vel.y=0;
    sliding=false;
    wallClinging=false;
  }
  pos.x+=vel.x*dt;pos.y+=vel.y*dt;pos.z+=vel.z*dt;
  var gndFl=false;for(var i=0;i<3;i++){var r=resolveCollisions();if(r.gnd)gndFl=true;onGround=r.gnd;if(r.wall&&!onGround&&!wallClinging&&wallJumpCD<=0&&!keys['Space']){wallClinging=true;wallTimer=0;wallNormal.copy(r.wN);}}onGround=gndFl;
  if(pos.y>0&&pos.y<=0.605){pos.y=0.6;vel.y=0;onGround=true;}
  if(!sliding&&onGround&&gameStarted&&(Math.abs(vel.x)>0.1||Math.abs(vel.z)>0.1)){footstepTimer-=dt;if(footstepTimer<=0){playFootstep();footstepTimer=0.4;if(isMultiplayer)relaySend({type:'footstep'});}}else{footstepTimer=0;}
  var fb=getMapBounds();
  if(pos.y<-5||pos.x<fb.minX-2||pos.x>fb.maxX+2||pos.z<fb.minZ-2||pos.z>fb.maxZ+2){
    var rp=getRandomSpawnPos(false);pos.copy(rp);vel.set(0,0,0);
    var fDmg=5;
    if(playerArmor>0){var ad=Math.min(playerArmor,fDmg);playerArmor-=ad;fDmg-=ad;}
    playerHP-=fDmg;
    if(playerHP<=0){onPlayerDeath();}
    showDmgNum(new THREE.Vector3(-10,1.5,-10),5,'#ff4444');
  }
}
var impacts=[];
function getImpactMesh(){
  for(var i=0;i<impactPool.length;i++){if(!impactPool[i].parent){impactPool[i].material.color.setHex(0xff4422);impactPool[i].material.emissive.setHex(0xff4422);return impactPool[i];}}
  var im=new THREE.Mesh(new THREE.SphereGeometry(0.04,8,8),new THREE.MeshStandardMaterial({color:0xff4422,emissive:0xff4422,emissiveIntensity:0.5}));
  impactPool.push(im);return im;
}
function getBulletHoleMesh(){
  for(var i=0;i<bulletHolePool.length;i++){if(!bulletHolePool[i].parent)return bulletHolePool[i];}
  var bh=new THREE.Mesh(new THREE.CircleGeometry(0.04,6),new THREE.MeshBasicMaterial({color:0x111111,depthWrite:false,side:THREE.DoubleSide}));
  bulletHolePool.push(bh);return bh;
}
function shoot(){
  if(ocUltAiming){ocUltCancel();return;}   // 瞄準中按左鍵＝取消（確定請按 F）
  if(shootCD>0||isReloading||isDowned||inspectTimer>0)return;
  if(ocUltShowT>0)return;
  if(ocSelfKnockT>0)return;   // 被炸倒時不能開火
  if(hybridDead)return;   // Hybrid FFA：死亡倒數中不能開火
  if(window.ghostInvis)window.ghostInvis=false;
  // AWP blocked during boss fight
  if(currentGun==='awp'&&bossActive){
    var blk=document.getElementById('awp-block');
    blk.textContent='⚠ Boss 已截取你的 AWP 系統，無法使用 AWP';
    blk.style.display='block';
    setTimeout(function(){blk.style.display='none';},1500);
    shootCD=0.5;return;
  }
  // Grapple hook gun
  if(currentGun==='grapple'){fireGrapple();shootCD=gunData.grapple.fireRate;autoFire=false;return;}
  // Knife melee
  if(currentGun==='knife'){
    knifeSwingCount=(knifeSwingCount+1)%3;
    knifeAnim=gunData.knife.fireRate;
    shootCD=gunData.knife.fireRate;
    playKnife();
    if(isMultiplayer){relaySend({type:'shoot',gun:'knife'});rankMatchShots++;}
    // Melee hit check (short range)
    var rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(0,0),cam);
    var meshes=[];for(var i=0;i<mapBoxes.length;i++){if(mapBoxes[i].mesh.visible!==false)meshes.push(mapBoxes[i].mesh);}
    if(!isMultiplayer||hostAiSim())for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].mesh.visible!==false)enemies[ei].mesh.traverse(function(c){if(c.isMesh)meshes.push(c)});}
    if(!isMultiplayer&&bossActive&&boss&&boss.mesh)boss.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});
    if(!isMultiplayer)for(var si=0;si<bossSummoned.length;si++){if(bossSummoned[si].mesh)bossSummoned[si].mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});}
    if(!isMultiplayer&&bossFloodedActive&&abyssalMaw&&abyssalMaw.mesh)abyssalMaw.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});
    if(ufoActive&&ufo&&ufo.mesh)ufo.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});
    if(isMultiplayer)opponentMeshes.forEach(function(om){if(om)om.traverse(function(c){if(c.isMesh)meshes.push(c)});});
    if(rangeMode){rangeTargets.forEach(function(rt){meshes.push(rt.meshBody);meshes.push(rt.meshHead);});rangeDrones.forEach(function(rd){rd.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});});if(rangeWalkwayTarget)meshes.push(rangeWalkwayTarget);}
    var hits=rc.intersectObjects(meshes);
    if(hits.length>0&&hits[0].distance<2.5){
      var hitMesh=hits[0].object;
      // Multiplayer opponent melee hit
      if(isMultiplayer&&opponentMeshes.length>0){
        opponentMeshes.forEach(function(om,oidx){
          if(!om||!opponentStates[oidx]||!opponentStates[oidx].alive)return;
          om.traverse(function(child){if(child===hitMesh){hitMarkerTimer=0.15;rankMatchHits++;relaySend({type:'hit',hp:50,targetPlayerId:opponentPlayerIds[oidx],shooterPlayerId:myPlayerId});var ld=50;if(opponentStates[oidx].armor>0){opponentStates[oidx].armor-=ld;if(opponentStates[oidx].armor<0){ld=-opponentStates[oidx].armor;opponentStates[oidx].armor=0}else ld=0}if(ld>0){opponentStates[oidx].hp-=ld;if(opponentStates[oidx].hp<0)opponentStates[oidx].hp=0}if(opponentStates[oidx].hp<=0){tdmEnemyDown(oidx,'🔪');}showDmgNum(hits[0].point,50,'#ff4444');}});
        });
      }
      for(var ei=0;ei<enemies.length;ei++){
        var e=enemies[ei];if(e.mesh.visible===false)continue;
        var hitEnemy=false;
        e.mesh.traverse(function(child){if(child===hitMesh)hitEnemy=true;});
        if(hitEnemy){
          if(e.type==='shield'&&e.shieldMesh){
            var fwd=new THREE.Vector3(0,0,1);fwd.applyQuaternion(e.mesh.quaternion);
            var toHit=new THREE.Vector3().copy(hits[0].point).sub(e.pos).normalize();
            if(fwd.dot(toHit)>0.3){showDmgNum(hits[0].point,0,'#44ddff');break;}
          }
          hitMarkerTimer=0.15;e.hitTimer=0.3;
          if(sliding){e.hp=0;e.armor=0;showDmgNum(hits[0].point,999,'#ff0000');seasonProgress.slide_kill++;saveSeasonProgress();}
          else{var knM=window.knifeMult||1;if(window.rageActive)knM=6;var knReq=Math.ceil(3/knM);e.knifeHits++;if(e.knifeHits>=knReq){e.hp=0;e.armor=0;showDmgNum(hits[0].point,999,'#ff4400')}else{showDmgNum(hits[0].point,50,'#ff6600')}}
        if(e.hp<=0){e.mesh.visible=false;e.hp=0;if(e.hybridAI&&window._hybridAiDown)window._hybridAiDown(e);if(currentMap==='nuclear'&&e.isCleaner)nuclearClears++;earnCoins(1000);checkKillAch();roundEarnings+=1000;showDmgNum(hits[0].point,1000,'#fa4');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}}
          break;
        }
      }
      // Melee hit on summoned minions
      for(var si=0;si<bossSummoned.length;si++){
        var sm=bossSummoned[si];if(!sm.mesh)continue;
        var hitMinion=false;
        sm.mesh.traverse(function(child){if(child===hitMesh)hitMinion=true;});
        if(hitMinion){
          hitMarkerTimer=0.15;
          var knM=window.knifeMult||1;if(window.rageActive)knM=6;
          var knReq=Math.ceil(3/knM);sm.knifeHits=(sm.knifeHits||0)+1;
          if(sm.knifeHits>=knReq){sm.hp=0;showDmgNum(hits[0].point,999,'#ff4400');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);}}
          else showDmgNum(hits[0].point,50,'#ff6600');
          break;
        }
      }
      if(rangeMode)checkRangeHit(hitMesh);
    }
    return;
  }
  // Grenade throw
  if(currentGun==='grenade'){
    if(bombMode||(grenadeAnim<=0&&grenadeStacks[currentSlot]>0)){grenadeAnim=0.35;grenadeThrown=false;shootCD=gunData.grenade.fireRate;autoFire=false;}
    return;
  }
  var gd=gunData[currentGun];
  if(gunAmmo[currentGun]<=0&&buffType!=='infammo'){reload();return;}
  if(buffType!=='infammo')gunAmmo[currentGun]--;
  shootCD=buffType==='atkspeed'?gd.fireRate*0.5:gd.fireRate;
  recoilKick=0.04;recoilRotX=-0.025;
  playGunSound(currentGun);
  if(currentGun==='awp')awpBoltTimer=0.5;   // 自動拉栓動畫（不需手動）
  // Bullet origin from actual barrel tip (accounts for scale + ADS position)
  var bt=barrelTips[currentGun].clone();
  if(gunGroup){gunGroup.updateMatrixWorld(true);gunGroup.localToWorld(bt);}else{bt.set(0.2,-0.15,-0.6);bt.applyQuaternion(cam.quaternion);bt.add(cam.position);}
  // Shotgun: fire 8 pellets with spread + dragon's breath
  if(currentGun==='shotgun'){
    var shotHit=false;
    for(var pi=0;pi<8;pi++){
      var sDir=new THREE.Vector3(0,0,-1);sDir.applyQuaternion(cam.quaternion);
      sDir.x+=(Math.random()-0.5)*0.18;sDir.y+=(Math.random()-0.5)*0.18;sDir.normalize();
      var src=new THREE.Raycaster(bt,sDir);
      lastShotPos=bt.clone();
      var smeshes=[];for(var i=0;i<mapBoxes.length;i++){if(mapBoxes[i].mesh.visible!==false)smeshes.push(mapBoxes[i].mesh);}
      if(!isMultiplayer||hostAiSim())for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].mesh.visible!==false)enemies[ei].mesh.traverse(function(c){if(c.isMesh)smeshes.push(c)});}
      if(!isMultiplayer&&bossActive&&boss&&boss.mesh)boss.mesh.traverse(function(c){if(c.isMesh)smeshes.push(c);});
      if(!isMultiplayer)for(var si=0;si<bossSummoned.length;si++){if(bossSummoned[si].mesh)bossSummoned[si].mesh.traverse(function(c){if(c.isMesh)smeshes.push(c);});}
      if(!isMultiplayer&&bossFloodedActive&&abyssalMaw&&abyssalMaw.mesh)abyssalMaw.mesh.traverse(function(c){if(c.isMesh)smeshes.push(c);});
      if(ufoActive&&ufo&&ufo.mesh)ufo.mesh.traverse(function(c){if(c.isMesh)smeshes.push(c);});
      if(rangeMode){rangeTargets.forEach(function(rt){smeshes.push(rt.meshBody);smeshes.push(rt.meshHead);});rangeDrones.forEach(function(rd){rd.mesh.traverse(function(c){if(c.isMesh)smeshes.push(c);});});if(rangeWalkwayTarget)smeshes.push(rangeWalkwayTarget);}
      if(isMultiplayer)opponentMeshes.forEach(function(om){if(om)om.traverse(function(c){if(c.isMesh)smeshes.push(c)});});
      var shits=src.intersectObjects(smeshes);
      if(shits.length>0){
        shotHit=true;
        var hitMesh=shits[0].object;
        if(!isMultiplayer||hostAiSim()){
          for(var ei=0;ei<enemies.length;ei++){
            var e=enemies[ei];
            if(e.mesh.visible===false)continue;
            var hitE=false;
            e.mesh.traverse(function(child){if(child===hitMesh)hitE=true;});
            if(hitE){
              if(e.type==='shield'&&e.shieldMesh){
                var fwd=new THREE.Vector3(0,0,1);fwd.applyQuaternion(e.mesh.quaternion);
                var toHit=new THREE.Vector3().copy(shits[0].point).sub(e.pos).normalize();
                if(fwd.dot(toHit)>0.3)break;
              }
              var sgd=gunData.shotgun;var sDist=shits[0].distance;var sFall=1;
              if(sgd.damageRange!==undefined&&sDist>sgd.damageRange){var sEx=sDist-sgd.damageRange;sFall=Math.max(sgd.damageFalloff||0.3,1-sEx/(sgd.damageRange*3));}
              var pd=Math.round(sgd.dmg*sFall*(window.hsMult||1)*(window.dmgMult||1));
              if(window.sniperMarked&&window.sniperMarked===e){pd=Math.round(pd*2.5);window.sniperMarked=null;}
              hitMarkerTimer=0.15;e.hitTimer=0.3;
              if(e.armor>0){var od=pd;e.armor-=pd;if(e.armor<0){od=-e.armor;e.armor=0}else od=0;if(e.armor===0)showDmgNum(shits[0].point,pd,'#f62',true);else showDmgNum(shits[0].point,pd,'#4488ff');if(od>0){e.hp-=od;if(e.hp<0)e.hp=0;showDmgNum(shits[0].point,od,'#ff4444')}}
              else{e.hp-=pd;if(e.hp<0)e.hp=0;showDmgNum(shits[0].point,pd,'#ff4444')}
              e.burnTimer=3;
              if(e.hp<=0){e.mesh.visible=false;e.hp=0;if(e.hybridAI&&window._hybridAiDown)window._hybridAiDown(e);if(currentMap==='nuclear'&&e.isCleaner)nuclearClears++;earnCoins(1000);checkKillAch();roundEarnings+=1000;showDmgNum(shits[0].point,1000,'#fa4');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}}
              break;
            }
          }
        }
        // 多人：散彈槍命中遠端真人（8 顆彈丸同一槍只結算一次，避免 8 倍傷害）
        if(isMultiplayer&&opponentMeshes.length>0){
          for(var so2=0;so2<opponentMeshes.length;so2++){
            var som=opponentMeshes[so2];
            if(!som||!opponentStates[so2]||!opponentStates[so2].alive)continue;
            var sopHit=false;
            som.traverse(function(c){if(c===hitMesh)sopHit=true;});
            if(!sopHit)continue;
            var sgd2=gunData.shotgun,sD2=shits.distance,sF2=1;
            if(sgd2.damageRange!==undefined&&sD2>sgd2.damageRange){var sE2=sD2-sgd2.damageRange;sF2=Math.max(sgd2.damageFalloff||0.3,1-sE2/(sgd2.damageRange*3));}
            var pd2=Math.round(sgd2.dmg*sF2*(window.hsMult||1)*(window.dmgMult||1));
            hitMarkerTimer=0.15;rankMatchHits++;
            relaySend({type:'hit',hp:pd2,targetPlayerId:opponentPlayerIds[so2],shooterPlayerId:myPlayerId});
            var ld2=pd2;
            if(opponentStates[so2].armor>0){opponentStates[so2].armor-=ld2;if(opponentStates[so2].armor<0){ld2=-opponentStates[so2].armor;opponentStates[so2].armor=0}else ld2=0}
            if(ld2>0){opponentStates[so2].hp-=ld2;if(opponentStates[so2].hp<0)opponentStates[so2].hp=0}
            showDmgNum(shits.point,pd2,'#ff4444');
            break;
          }
        }
        // Shotgun hit on summoned minions
        if(!isMultiplayer){
          for(var si=0;si<bossSummoned.length;si++){
            var sm=bossSummoned[si];if(!sm.mesh)continue;
            var hitMinion=false;
            sm.mesh.traverse(function(child){if(child===hitMesh)hitMinion=true;});
            if(hitMinion){
              var sgd=gunData.shotgun;var sDist=shits[0].distance;var sFall=1;
              if(sgd.damageRange!==undefined&&sDist>sgd.damageRange){var sEx=sDist-sgd.damageRange;sFall=Math.max(sgd.damageFalloff||0.3,1-sEx/(sgd.damageRange*3));}
              var pd=Math.round(sgd.dmg*sFall*(window.dmgMult||1));
              hitMarkerTimer=0.15;sm.hp-=pd;
              showDmgNum(shits[0].point,pd,'#ff4444');
              if(sm.hp<=0){earnCoins(500);roundEarnings+=500;showDmgNum(shits[0].point,500,'#fa4');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);}}
              break;
            }
          }
        }
        // Boss hit check for shotgun
        if(!isMultiplayer&&bossActive&&boss&&boss.mesh){
          var hitBoss=false;
          boss.mesh.traverse(function(child){if(child===hitMesh)hitBoss=true;});
          if(hitBoss){
            var sgd=gunData.shotgun;var sDist=shits[0].distance;var sFall=1;
            if(sgd.damageRange!==undefined&&sDist>sgd.damageRange){var sEx=sDist-sgd.damageRange;sFall=Math.max(sgd.damageFalloff||0.3,1-sEx/(sgd.damageRange*3));}
            var pd=Math.round(sgd.dmg*sFall*(window.dmgMult||1));
            hitMarkerTimer=0.15;bossApplyDmg(pd);boss.hitTimer=0.3;
            showDmgNum(shits[0].point,pd,'#ff4444');
          }
        }
        if(ufoActive&&ufo&&ufo.mesh){
          var hitUFOS=false;
          ufo.mesh.traverse(function(child){if(child===hitMesh)hitUFOS=true;});
          if(hitUFOS){
            var sgd=gunData.shotgun;var sDist=shits[0].distance;var sFall=1;
            if(sgd.damageRange!==undefined&&sDist>sgd.damageRange){var sEx=sDist-sgd.damageRange;sFall=Math.max(sgd.damageFalloff||0.3,1-sEx/(sgd.damageRange*3));}
            var pd=Math.round(sgd.dmg*sFall*(window.dmgMult||1));
            hitMarkerTimer=0.15;ufo.hp-=pd;ufo.hitTimer=0.3;
            showDmgNum(shits[0].point,pd,'#44ff88');
            if(isMultiplayer)relaySend({type:'ufo_hit',dmg:pd});
          }
        }
        if(rangeMode)checkRangeHit(hitMesh);
        var im=getImpactMesh();im.position.copy(shits[0].point);im.material.color.setHex(0xff6600);im.material.emissive.setHex(0xff4400);scene.add(im);impacts.push({mesh:im,time:0});
        var bh=getBulletHoleMesh();bh.position.copy(shits[0].point);bh.lookAt(cam.position);scene.add(bh);bulletHoles.push(bh);
        if(bulletHoles.length>maxBulletHoles){var old=bulletHoles.shift();if(old)disposeMesh(old);}
      }
    }
    if(shotHit)playShort('deejaycoxknot-vinyl-scratches-430214.mp3',0.15,0.5);
    // Shoot flash for shotgun (reusable)
    if(!flashMesh){flashMesh=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6),new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:4}));flashLight=new THREE.PointLight(0xff6600,5,5);}
    flashMesh.position.copy(bt);scene.add(flashMesh);
    flashLight.position.copy(bt);scene.add(flashLight);
    flashTimer=0.08;
    if(isMultiplayer){relaySend({type:'shoot',origin:[bt.x,bt.y,bt.z],dir:[0,0,0],gun:'shotgun'});rankMatchShots++;}
    // 原本送 dir:[0,0,0]，主機會用它自己的相機朝向補方向 → 只要兩人看的方向不同
    // 就是 100% miss。改成送真實方向，並附上眼睛位置當權威射線起點。
    if(hybridMode&&!hybridHost){var _sd0=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);
      relaySend({type:'hybrid_shoot',origin:[bt.x,bt.y,bt.z],dir:[_sd0.x,_sd0.y,_sd0.z],gun:'shotgun',eye:[cam.position.x,cam.position.y,cam.position.z]});}
    return;
  }
  // Dynamic spread bloom
  var dir=new THREE.Vector3(0,0,-1);dir.applyQuaternion(cam.quaternion);
  if(!isADS){
    var sprd=currentSpread||gd.spread;
    dir.x+=(Math.random()-0.5)*sprd;dir.y+=(Math.random()-0.5)*sprd;dir.normalize();
    if(gd.accuracyDecay!==undefined)currentSpread=Math.min(gd.maxSpread||gd.spread*2,(currentSpread||gd.spread)+gd.accuracyDecay);
  }
  // Reusable muzzle flash
  if(!flashMesh){flashMesh=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff8800,emissiveIntensity:3}));flashLight=new THREE.PointLight(0xffaa44,3,4);}
  flashMesh.material.color.setHex(0xffaa44);flashMesh.material.emissive.setHex(0xff8800);
  flashLight.color.setHex(0xffaa44);
  flashMesh.position.copy(bt);scene.add(flashMesh);
  flashLight.position.copy(bt);scene.add(flashLight);
  flashTimer=0.06;
  // Send shoot event to opponent
  if(isMultiplayer){relaySend({type:'shoot',origin:[bt.x,bt.y,bt.z],dir:[dir.x,dir.y,dir.z],gun:currentGun});rankMatchShots++;}
  // Hybrid 非主機：把射擊轉給主機，由主機對 AI 做權威傷害判定
  if(hybridMode&&!hybridHost)relaySend({type:'hybrid_shoot',origin:[bt.x,bt.y,bt.z],dir:[dir.x,dir.y,dir.z],gun:currentGun,eye:[cam.position.x,cam.position.y,cam.position.z]});
  var rc=new THREE.Raycaster(bt,dir);
  lastShotPos=bt.clone();
    var meshes=[];for(var i=0;i<mapBoxes.length;i++){if(mapBoxes[i].mesh.visible!==false)meshes.push(mapBoxes[i].mesh);}
    if(!isMultiplayer||hostAiSim())for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].mesh.visible!==false)enemies[ei].mesh.traverse(function(c){if(c.isMesh)meshes.push(c)});}
    if(!isMultiplayer&&bossActive&&boss&&boss.mesh)boss.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});
    if(!isMultiplayer)for(var si=0;si<bossSummoned.length;si++){if(bossSummoned[si].mesh)bossSummoned[si].mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});}
    if(!isMultiplayer&&bossFloodedActive&&abyssalMaw&&abyssalMaw.mesh)abyssalMaw.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});
    if(ufoActive&&ufo&&ufo.mesh)ufo.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});
    if(isMultiplayer)opponentMeshes.forEach(function(om){if(om)om.traverse(function(c){if(c.isMesh)meshes.push(c)});});
    if(rangeMode){rangeTargets.forEach(function(rt){meshes.push(rt.meshBody);meshes.push(rt.meshHead);});rangeDrones.forEach(function(rd){rd.mesh.traverse(function(c){if(c.isMesh)meshes.push(c);});});if(rangeWalkwayTarget)meshes.push(rangeWalkwayTarget);}
    var hits=rc.intersectObjects(meshes);
    if(hits.length>0){
      var im=getImpactMesh();im.position.copy(hits[0].point);scene.add(im);impacts.push({mesh:im,time:0});
      var bh=getBulletHoleMesh();bh.position.copy(hits[0].point);bh.lookAt(cam.position);scene.add(bh);bulletHoles.push(bh);
      if(bulletHoles.length>maxBulletHoles){var old=bulletHoles.shift();if(old.parent)scene.remove(old);}
      var hitMesh=hits[0].object;
    // Damage enemies (skip in multiplayer)
    if(!isMultiplayer||hostAiSim()){
    for(var ei=0;ei<enemies.length;ei++){
      var e=enemies[ei];
      if(e.mesh.visible===false)continue;
      var hitEnemy=false;
      e.mesh.traverse(function(child){if(child===hitMesh)hitEnemy=true;});
      if(hitEnemy){
        // Shield check: block front hits
        if(e.type==='shield'&&e.shieldMesh){
          var fwd=new THREE.Vector3(0,0,1);fwd.applyQuaternion(e.mesh.quaternion);
          var toHit=new THREE.Vector3().copy(hits[0].point).sub(e.pos).normalize();
          if(fwd.dot(toHit)>0.3){
            showDmgNum(hits[0].point,0,'#44ddff');
            var spk=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),new THREE.MeshBasicMaterial({color:0x44ddff}));
            spk.position.copy(hits[0].point);scene.add(spk);
            setTimeout(function(){scene.remove(spk);},100);
            break;
          }
        }
        var dist=hits[0].distance;
        var falloff=1;
        if(gd.damageRange!==undefined&&dist>gd.damageRange){var excess=dist-gd.damageRange;var maxRd=gd.damageRange*3;falloff=Math.max(gd.damageFalloff||0.3,1-excess/maxRd);}
        var attachEff=getAttachEffects(currentGun);
        var dmgMult=(attachEff.damage||1)*(window.dmgMult||1);
        var dmg=currentGun==='awp'?999:Math.round((gunData[currentGun].dmg||0)*falloff*dmgMult);
        if(window.critChance&&Math.random()<window.critChance){dmg*=2;showDmgNum(hits[0].point,'暴擊!','#ffdd44');}
        if(window.bloodRage&&playerHP<30)dmg=Math.round(dmg*1.5);
        if(window.sniperMarked&&window.sniperMarked===e){dmg=Math.round(dmg*2.5);window.sniperMarked=null;}
        hitMarkerTimer=0.15;
        e.hitTimer=0.3;
        if(e.armor>0){var od=dmg;e.armor-=dmg;if(e.armor<0){od=-e.armor;e.armor=0}else od=0;if(e.armor===0)showDmgNum(hits[0].point,dmg,'#f62',true);else showDmgNum(hits[0].point,dmg,'#4488ff');if(od>0){e.hp-=od;if(e.hp<0)e.hp=0;showDmgNum(hits[0].point,od,'#ff4444')}}
        else{e.hp-=dmg;if(e.hp<0)e.hp=0;showDmgNum(hits[0].point,dmg,'#ff4444')}
        if(window.explosiveRounds&&Math.random()<window.explosiveRounds){for(var ei2=0;ei2<enemies.length;ei2++){var e2=enemies[ei2];if(e2.hp<=0||e2===e)continue;var ed=e2.pos.distanceTo(hits[0].point);if(ed<2){var edmg=Math.round(dmg*0.5*(1-ed/2));e2.hp-=edmg;showDmgNum(e2.pos.clone(),edmg,'#ff8844');}}screenShake=Math.max(screenShake||0,2);}
        if(e.hp<=0){e.mesh.visible=false;e.hp=0;if(e.hybridAI&&window._hybridAiDown)window._hybridAiDown(e);if(currentMap==='nuclear'&&e.isCleaner)nuclearClears++;earnCoins(1000);checkKillAch();roundEarnings+=1000;showDmgNum(hits[0].point,1000,'#fa4');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}if(window.shadowStep){var sAng=Math.random()*Math.PI*2;pos.add(new THREE.Vector3(Math.cos(sAng)*3,0,Math.sin(sAng)*3));showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),'暗影步','#8844ff');}}
        break;
      }
    }
    } // end !isMultiplayer
    // Boss hit check
    if(!isMultiplayer&&bossActive&&boss&&boss.mesh){
      var hitBoss=false;
      boss.mesh.traverse(function(child){if(child===hitMesh)hitBoss=true;});
      if(hitBoss&&currentGun!=='awp'){
        var dist=hits[0].distance;
        var falloff=1;
        if(gd.damageRange!==undefined&&dist>gd.damageRange){var excess=dist-gd.damageRange;var maxRd=gd.damageRange*3;falloff=Math.max(gd.damageFalloff||0.3,1-excess/maxRd);}
        var dmg=Math.round(gunData[currentGun].dmg*falloff*(window.dmgMult||1));
        hitMarkerTimer=0.15;
        bossApplyDmg(dmg);
        boss.hitTimer=0.3;
        showDmgNum(hits[0].point,dmg,'#ff4444');
      }
    }
    // Summoned minion hit check
    if(!isMultiplayer){
      for(var si=0;si<bossSummoned.length;si++){
        var sm=bossSummoned[si];if(!sm.mesh)continue;
        var hitMinion=false;
        sm.mesh.traverse(function(child){if(child===hitMesh)hitMinion=true;});
        if(hitMinion){
          var dist=hits[0].distance;var falloff=1;
          if(gd.damageRange!==undefined&&dist>gd.damageRange){var excess=dist-gd.damageRange;var maxRd=gd.damageRange*3;falloff=Math.max(gd.damageFalloff||0.3,1-excess/maxRd);}
          var dmg=Math.round(gunData[currentGun].dmg*falloff*(window.dmgMult||1));
          hitMarkerTimer=0.15;sm.hp-=dmg;
          showDmgNum(hits[0].point,dmg,'#ff4444');
          if(sm.hp<=0){earnCoins(500);roundEarnings+=500;showDmgNum(hits[0].point,500,'#fa4');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);}}
          break;
        }
      }
    }
    // Flooded boss hit check
    if(!isMultiplayer&&bossFloodedActive&&abyssalMaw&&abyssalMaw.mesh){
      var hitBossF=false;
      abyssalMaw.mesh.traverse(function(child){if(child===hitMesh)hitBossF=true;});
      if(hitBossF){
        var dist=hits[0].distance;
        var falloff=1;
        if(gd.damageRange!==undefined&&dist>gd.damageRange){var excess=dist-gd.damageRange;var maxRd=gd.damageRange*3;falloff=Math.max(gd.damageFalloff||0.3,1-excess/maxRd);}
        var dmg=Math.round(gunData[currentGun].dmg*falloff*(window.dmgMult||1));
        hitMarkerTimer=0.15;
        abyssalMaw.hp-=dmg;
        abyssalMaw.hitTimer=0.3;
        showDmgNum(hits[0].point,dmg,'#ff4444');
      }
    }
    // UFO hit check
    if(ufoActive&&ufo&&ufo.mesh&&currentGun!=='awp'){
      var hitUFO=false;
      ufo.mesh.traverse(function(child){if(child===hitMesh)hitUFO=true;});
      if(hitUFO){
        var dist=hits[0].distance;
        var falloff=1;
        if(gd.damageRange!==undefined&&dist>gd.damageRange){var excess=dist-gd.damageRange;var maxRd=gd.damageRange*3;falloff=Math.max(gd.damageFalloff||0.3,1-excess/maxRd);}
        var dmg=Math.round(gunData[currentGun].dmg*falloff*(window.dmgMult||1));
        hitMarkerTimer=0.15;
        ufo.hp-=dmg;
        ufo.hitTimer=0.3;
        showDmgNum(hits[0].point,dmg,'#44ff88');
        if(isMultiplayer)relaySend({type:'ufo_hit',dmg:dmg});
      }
    }
    // Multiplayer: check opponent hit
    if(isMultiplayer&&opponentMeshes.length>0){
      opponentMeshes.forEach(function(om,oidx){
        if(!om||!opponentStates[oidx]||!opponentStates[oidx].alive)return;
        var hitOp=false;
        om.traverse(function(c){if(c===hitMesh)hitOp=true;});
        if(hitOp){
          hitMarkerTimer=0.15;
          var mpGd=gunData[currentGun];var mpDist=hits[0].distance;var mpFall=1;
          if(mpGd&&mpGd.damageRange!==undefined&&mpDist>mpGd.damageRange){var mpEx=mpDist-mpGd.damageRange;mpFall=Math.max(mpGd.damageFalloff||0.3,1-mpEx/(mpGd.damageRange*3));}
        var dmg=currentGun==='awp'?999:Math.round((mpGd?mpGd.dmg:0)*mpFall*(window.hsMult||1)*(window.dmgMult||1));
          rankMatchHits++;
          relaySend({type:'hit',hp:dmg,targetPlayerId:opponentPlayerIds[oidx],shooterPlayerId:myPlayerId});
          var ld=dmg;if(opponentStates[oidx].armor>0){opponentStates[oidx].armor-=ld;if(opponentStates[oidx].armor<0){ld=-opponentStates[oidx].armor;opponentStates[oidx].armor=0}else ld=0}if(ld>0){opponentStates[oidx].hp-=ld;if(opponentStates[oidx].hp<0)opponentStates[oidx].hp=0}
          if(opponentStates[oidx].hp<=0){tdmEnemyDown(oidx,gunData[currentGun]?gunData[currentGun].name:'??');}
          showDmgNum(hits[0].point,Math.round(dmg),'#ff4444');
        }
      });
    }
    // Damage targets
    for(var ti=0;ti<targets.length;ti++){
      var t=targets[ti];
      if(t.mesh===hitMesh){
        var dmg=25;
        hitMarkerTimer=0.15;
        if(t.armor>0){
          t.armor-=dmg;if(t.armor<0)t.armor=0;
          if(t.armor===0){sbActive=true;sbTimer=0;document.getElementById('sb').style.display='block';}
          showDmgNum(hits[0].point,dmg,'#4488ff');
        }else{
          t.hp-=dmg;if(t.hp<0)t.hp=0;showDmgNum(hits[0].point,dmg,'#ff4444');
          var pct=t.hp/t.maxHp;
          t.mesh.material.color.setHex(t.baseColor).multiplyScalar(pct);
          if(t.hp<=0){t.mesh.visible=false;t.isTarget=false;}
        }
        if(t.isTarget&&t.maxArmor>0){
          var ap=t.armor/t.maxArmor;
          if(!t.armorMesh){
            var ag=new THREE.BoxGeometry(0.6,0.04,0.1);
            var am=new THREE.MeshBasicMaterial({color:0x4488ff});
            t.armorMesh=new THREE.Mesh(ag,am);
            t.armorMesh.position.set(t.pos.x,t.pos.y+t.size.y/2+0.1,t.pos.z);
            scene.add(t.armorMesh);
          }
          t.armorMesh.scale.x=Math.max(ap,0);
          t.armorMesh.position.x=t.pos.x-(1-Math.max(ap,0))*0.3;
        }
        break;
      }
    }
    // Range mode hit detection
    if(rangeMode&&!checkRangeHit(hitMesh))rangeShots++;
  }
}
function checkRangeHit(hitMesh){
  if(!rangeMode)return false;
  for(var rti=0;rti<rangeTargets.length;rti++){
    var rt=rangeTargets[rti];
    if(rt.down)continue;
    if(rt.meshBody===hitMesh||rt.meshHead===hitMesh){
      rangeShots++;rangeHits++;rangeScore+=10;
      rt.meshBody.material.color.setHex(0xff4444);rt.meshHead.material.color.setHex(0xff4444);
      rt.down=true;rt.downRot=0;rt.respawnTimer=2;
      hitMarkerTimer=0.15;return true;
    }
  }
  for(var rdi=0;rdi<rangeDrones.length;rdi++){
    var rd2=rangeDrones[rdi];
    if(rd2.crashed)continue;
    var hitDrone=false;rd2.mesh.traverse(function(c){if(c===hitMesh)hitDrone=true;});
    if(hitDrone){
      rangeShots++;rangeHits++;rangeScore+=50;
      rd2.bodyMat.color.setHex(0xff4444);
      rd2.crashed=true;rd2.crashVel.set(0,-5,0);rd2.respawnTimer=3;
      rd2.glow.visible=false;
      hitMarkerTimer=0.15;return true;
    }
  }
  if(rangeWalkwayTarget&&rangeWalkwayTarget===hitMesh){
    rangeShots++;rangeHits++;rangeScore+=25;
    rangeWalkwayTarget.hitTimer=0.3;rangeWalkwayTarget.material.color.setHex(0xff4444);
    hitMarkerTimer=0.15;return true;
  }
  return false;
}
function fireRadRifle(){
  if(isReloading||isDowned||shootCD>0)return;
  var gd=gunData.radrifle;
  if(gunAmmo.radrifle<=0&&buffType!=='infammo'){reload();return;}
  if(buffType!=='infammo')gunAmmo.radrifle--;
  shootCD=gd.fireRate;
  var chargeMult=Math.min(1,radRifleCharge/gd.chargeTime);
  var dmg=gd.dmg+Math.round((gd.chargeMaxDmg-gd.dmg)*chargeMult);
  var bt=barrelTips.radrifle.clone();
  if(gunGroup){gunGroup.updateMatrixWorld(true);gunGroup.localToWorld(bt);}else{bt.set(0.2,-0.15,-0.6);bt.applyQuaternion(cam.quaternion);bt.add(cam.position);}
  var dir=new THREE.Vector3(0,0,-1);dir.applyQuaternion(cam.quaternion);
  if(!isADS){dir.x+=(Math.random()-0.5)*gd.spread;dir.y+=(Math.random()-0.5)*gd.spread;dir.normalize();}
  // Green projectile
  var pSize=0.04+chargeMult*0.06;
  var pMat=new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x22ff22,emissiveIntensity:1.5+chargeMult*2});
  var pMesh=new THREE.Mesh(new THREE.SphereGeometry(pSize,8,8),pMat);
  pMesh.position.copy(bt);scene.add(pMesh);
  // Projectile glow light
  var pLight=new THREE.PointLight(0x44ff44,1.5+chargeMult,6);pLight.position.copy(bt);scene.add(pLight);
  // Muzzle flash
  var fl=new THREE.Mesh(new THREE.SphereGeometry(0.08+chargeMult*0.06,6,6),new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x22ff22,emissiveIntensity:4}));
  fl.position.copy(bt);scene.add(fl);
  setTimeout(function(){scene.remove(fl);},80);
  projectiles.push({mesh:pMesh,light:pLight,dir:dir,pos:bt.clone(),speed:18,hitEnemies:[],dmg:dmg,chargeMult:chargeMult,life:3});
  if(isMultiplayer){relaySend({type:'shoot',origin:[bt.x,bt.y,bt.z],dir:[dir.x,dir.y,dir.z],gun:'radrifle'});rankMatchShots++;}
  if(hybridMode&&!hybridHost)relaySend({type:'hybrid_shoot',origin:[bt.x,bt.y,bt.z],dir:[dir.x,dir.y,dir.z],gun:'radrifle',eye:[cam.position.x,cam.position.y,cam.position.z]});}
function spawnRadZone(pos,duration,size,dmgPerSec){
  var mat=new THREE.MeshStandardMaterial({color:0x33cc33,emissive:0x22ff22,emissiveIntensity:0.8,transparent:true,opacity:0.5});
  var mesh=new THREE.Mesh(new THREE.SphereGeometry(size,12,12),mat);
  mesh.position.copy(pos);scene.add(mesh);
  var light=new THREE.PointLight(0x44ff44,1,size*1.5);light.position.copy(pos);scene.add(light);
  var zone={mesh:mesh,light:light,pos:pos.clone(),size:size,dmgPerSec:dmgPerSec,timer:duration,life:duration};
  radiationZones.push(zone);
}
function randomizeEnemyType(e){
  var roll=Math.random();
  var newType=roll<0.12?'rusher':(roll<0.22?'grenadier':(roll<0.32?'suicider':(roll<0.42?'healer':(roll<0.57?'sniper':(roll<0.72?'shield':'normal')))));
  e.type=newType;
  var isRusher=newType==='rusher',isGrenadier=newType==='grenadier',isSuicider=newType==='suicider',isHealer=newType==='healer',isSniper=newType==='sniper',isShield=newType==='shield';
  // Update body color
  var bodyClr=CUBELING_PAL.green.body;   // 外殼一律綠色
  // Update visor color
  var vsClr=isRusher?0xff0000:(isGrenadier?0xffcc44:(isSuicider?0xff6600:(isHealer?0x66ff88:(isSniper?0x88ff44:(isShield?0x44ddff:0x88ddff)))));
  var vsEm=isRusher?0xff2200:(isGrenadier?0xffaa00:(isSuicider?0xff4400:(isHealer?0x44ff66:(isSniper?0x44ff22:(isShield?0x22aaff:0x66aaff)))));
  // 身體換色：方晶統一入口（原本寫 children[0].material，現在 children[0] 是 Group 會爆）
  setCubelingColors(e.mesh.userData.cubeling||e.mesh,bodyClr,vsClr,vsEm,CUBELING_PAL.green.accent);
  if(e.visor&&e.visor.material){
    e.visor.material.color.setHex(vsClr);
    e.visor.material.emissive.setHex(vsEm);
    e.visor.material.emissiveIntensity=isRusher||isSuicider?1.0:0.3;
  }
  // Gun visibility
  setEnemyGun(e,isSniper?'sniper':'ak47');   // 狙擊手換狙擊槍，其餘 AK
  if(e.gun)e.gun.visible=true;
  // Shield visibility
  if(e.shieldMesh)e.shieldMesh.visible=isShield;
  // Remove old attachments
  for(var ci=e.mesh.children.length-1;ci>=0;ci--){
    if(e.mesh.children[ci].userData&&(e.mesh.children[ci].userData.isBackpack||e.mesh.children[ci].userData.isCore||e.mesh.children[ci].userData.isStaff)){
      e.mesh.remove(e.mesh.children[ci]);
    }
  }
  // Suicider core
  if(isSuicider){
    var cr=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshStandardMaterial({color:0xff8800,emissive:0xff4400,emissiveIntensity:2}));
    cr.position.set(0,0.42,0.35);cr.userData={isCore:true};e.mesh.add(cr);
  }
  // Healer staff
  if(isHealer){
    var sg=new THREE.Group();
    var rod=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.035,0.45,6),new THREE.MeshStandardMaterial({color:0x886644}));
    rod.position.y=0.2;sg.add(rod);
    var orb=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),new THREE.MeshStandardMaterial({color:0x44ff88,emissive:0x22ff66,emissiveIntensity:1.5}));
    orb.position.y=0.42;sg.add(orb);
    var orbGlow=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,8),new THREE.MeshBasicMaterial({color:0x44ff88,transparent:true,opacity:0.2,depthWrite:false}));
    orbGlow.position.y=0.42;sg.add(orbGlow);
    sg.position.set(0.3,0.28,0.2);sg.userData={isStaff:true};e.mesh.add(sg);
  }
  // Grenadier backpack
  if(isGrenadier){
    var pk=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.22,0.14),new THREE.MeshStandardMaterial({color:0x886633}));
    pk.position.set(-0.15,0.32,-0.1);pk.userData={isBackpack:true};e.mesh.add(pk);
  }
  // weaponType 由 setEnemyGun 設定（狙擊手 'sniper'，其餘 'ak47'）
}
// tp = 目標位置；不傳就是打玩家。傳別的敵人位置 → AI 互相攻擊
function enemyShoot(e,tp,tgtEnemy){
  var wd=(e.weaponType&&gunData[e.weaponType])?gunData[e.weaponType]:gunData.ak47;
  var tgt=tp||pos;
  var isAiShot=!!tp;
  var sp=wd.spread*0.6||0.02;
  var dir=new THREE.Vector3().copy(tgt);dir.y+=0.5;dir.sub(e.pos).normalize();
  var spFactor=Math.min(1,6/e.pos.distanceTo(tgt));
  dir.x+=(Math.random()-0.5)*sp*spFactor;dir.z+=(Math.random()-0.5)*sp*spFactor;
  dir.normalize();
  var gp=e.pos.clone();gp.y+=0.45;
  gp.add(dir.clone().multiplyScalar(0.5));   // 從槍口出膛
  var p=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:0.5}));
  p.position.copy(gp);scene.add(p);
  projectiles.push({mesh:p,pos:gp,vel:dir.clone().multiplyScalar(16),life:3,
    dmg:Math.round(wd.dmg*0.25||5),fromEnemy:true,shooter:e,vsEnemy:isAiShot,
    // AI 對 AI 專用傷害與目標：原本沿用「打玩家」的 0.25× 傷害再 ×0.8，
    // AK47 一發只有 5 點，AI 滿血 100＋護甲 50 幾乎打不死 → 獨立給一個打得穿的數值
    aiDmg:isAiShot?Math.max(14,Math.round((wd.dmg||25)*0.6)):0,
    vsTarget:isAiShot?(tgtEnemy||null):null});
  var fl=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4),new THREE.MeshStandardMaterial({color:0xffaa44,emissive:0xff8800,emissiveIntensity:2}));
  fl.position.copy(gp);scene.add(fl);
  setTimeout(function(){scene.remove(fl);},40);
}
var sniperLaser=null;
function updateSniperLasers(){
  if(sniperLaser){disposeMesh(sniperLaser);sniperLaser=null;}
  document.getElementById('sniper-warn').style.display='none';
  for(var si=0;si<enemies.length;si++){
    var e=enemies[si];if(e.type!=='sniper'||e.hp<=0||!e.mesh.visible)continue;
    var toP=new THREE.Vector3().copy(pos);toP.y=0.5;toP.sub(e.pos);
    var d=toP.length();
    if(d<35&&e.shootCD<1.2&&e.state==='chase'&&e.chargeTimer>0){
      var pts=[new THREE.Vector3(e.pos.x,e.pos.y+0.5,e.pos.z),new THREE.Vector3(pos.x,pos.y+0.5,pos.z)];
      var g=new THREE.BufferGeometry().setFromPoints(pts);
      var m=new THREE.LineBasicMaterial({color:0xff0000,transparent:true,opacity:0.3+Math.sin(Date.now()*0.01)*0.2});
      sniperLaser=new THREE.Line(g,m);scene.add(sniperLaser);
      document.getElementById('sniper-warn').style.display='block';
      break;
    }
  }
}
function sniperShoot(e){
  var dir=new THREE.Vector3().copy(pos);dir.y+=0.85;dir.sub(e.pos).normalize();
  dir.x+=(Math.random()-0.5)*0.02;dir.y+=(Math.random()-0.5)*0.02;dir.normalize();
  var gp=e.pos.clone();gp.y+=0.5;
  var p=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,6),new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff2200,emissiveIntensity:2}));
  p.position.copy(gp);scene.add(p);
  projectiles.push({mesh:p,pos:gp,vel:dir.clone().multiplyScalar(30),life:5,dmg:40,isSniper:true,fromEnemy:true,shooter:e,vsEnemy:false});
  var fl=new THREE.Mesh(new THREE.SphereGeometry(0.1,4,4),new THREE.MeshBasicMaterial({color:0xff2200}));
  fl.position.copy(gp);scene.add(fl);
  var fll=new THREE.PointLight(0xff2200,5,8);fll.position.copy(gp);scene.add(fll);
  setTimeout(function(){scene.remove(fl);scene.remove(fll);},80);
}
function throwGrenade(e){
  var gp=e.pos.clone();gp.y+=0.35;
  var dir=new THREE.Vector3().copy(pos);dir.y+=0.3;dir.sub(e.pos).normalize();
  dir.x+=(Math.random()-0.5)*0.08;dir.z+=(Math.random()-0.5)*0.08;dir.y+=0.2;
  var gMesh=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8),new THREE.MeshStandardMaterial({color:0x886633,emissive:0x442200,emissiveIntensity:0.3}));
  gMesh.position.copy(gp);scene.add(gMesh);
  projectiles.push({mesh:gMesh,pos:gp,vel:dir.clone().multiplyScalar(8),life:99,dmg:30,isGrenade:true,fromEnemy:true,shooter:e,vsEnemy:false,friendlyFire:true});
}
var grenadeTypes=['frag','frag','frag','frag','frag'];
var grenadeTypeIcons={frag:'💣',flashbang:'💥',smoke:'🌫',incendiary:'🔥'};
var grenadeTypeColors={frag:0x4a6b3d,flashbang:0xffffff,smoke:0x888888,incendiary:0xff4400};
var grenadeTypeNames={frag:'手雷',flashbang:'閃光彈',smoke:'煙霧彈',incendiary:'燃燒弹'};
function getGunDisplayName(gun,slot){
  if(!gun)return '─';
  if(gun==='grenade')return grenadeTypeNames[grenadeTypes[slot]]||'手雷';
  var name=weaponNames[gun]||gunData[gun]&&gunData[gun].name||gun;
  var attachCount=getAttachments(gun).length;
  return name;
}
function getSlotGunText(slot){
  var g=playerLoadout[slot];
  if(!g)return '─';
  var name=getGunDisplayName(g,slot);
  if(g==='grenade'&&grenadeStacks[slot])return name+' ×'+grenadeStacks[slot];
  return name;
}
function throwPlayerGrenade(){
  if(!bombMode&&grenadeStacks[currentSlot]<=0){switchToSlot(currentSlot);return;}
  if(!bombMode)grenadeStacks[currentSlot]--;
  var gtype=grenadeTypes[currentSlot]||'frag';
  var gp=new THREE.Vector3(0.2,-0.15,-0.45);gp.applyQuaternion(cam.quaternion);gp.add(cam.position);
  var dir=new THREE.Vector3(0,0,-1);dir.applyQuaternion(cam.quaternion);
  dir.x+=(Math.random()-0.5)*0.03;dir.z+=(Math.random()-0.5)*0.03;dir.y+=0.15;dir.normalize();
  var gMesh=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshStandardMaterial({color:grenadeTypeColors[gtype]}));
  gMesh.position.copy(gp);scene.add(gMesh);
  var fdmg=gtype==='frag'?gunData.grenade.dmg:(gtype==='incendiary'?20:0);
  projectiles.push({mesh:gMesh,pos:gp,vel:dir.clone().multiplyScalar(10),life:99,dmg:fdmg,isGrenade:true,fuse:gtype==='frag'?3:2,subType:gtype});
  if(!bombMode&&grenadeStacks[currentSlot]<=0&&playerLoadout[currentSlot]==='grenade'){playerLoadout[currentSlot]=null;switchToSlot(currentSlot<1?0:currentSlot-1);}
  document.querySelectorAll('.loadout-slot').forEach(function(s,i){
    s.querySelector('.slot-gun').textContent=playerLoadout[i]?getSlotGunText(i):'─';
  });
}
function reload(){
  if(isReloading||gunAmmo[currentGun]>=gunData[currentGun].mag||isDowned||inspectTimer>0)return;
  var gd=gunData[currentGun];
  var attachEff=getAttachEffects(currentGun);var ammoBonus=(attachEff.ammoBonus||0);var reloadMult=(attachEff.reloadSpeed||1);
  isReloading=true;reloadTimer=window.reloadSpeedMult?gd.reloadTime*window.reloadSpeedMult/reloadMult:gd.reloadTime/reloadMult;
  reloadDuration=reloadTimer;currentSpread=gd.spread||0;createMagazine();
  if(magazineMesh)magazineMesh.position.y=0;
  if(currentGun==='smg'){var sr=new Audio('ElevenLabs_快节奏现代冲锋枪换弹，清晰的弹匣释放，快速插弹，干脆的枪机撞击声，逼真的金属与聚合物点击声，带有细微未来感伺服声，竞技射击风格，无语音，无音乐。.mp3');sr.volume=0.4;sr.play().catch(function(){});}
  else{var sr=new Audio('freesound_community-assault-rifle-reload-104296.mp3');sr.volume=0.4;sr.play().catch(function(){});}
}
function goDowned(){
  isDowned=true;downTimer=5;
}
// ─── Team Deathmatch (2v2 / 1v1) helpers ───
function tdmScoreHud(){
  var el=document.getElementById('tdm-score-hud');if(!el)return;
  var a=document.getElementById('tdm-score-a');if(a)a.textContent=teamScore.A;
  var b=document.getElementById('tdm-score-b');if(b)b.textContent=teamScore.B;
  var sa=document.getElementById('tdm-slots-a'),sb=document.getElementById('tdm-slots-b');
  if(sa){sa.innerHTML='';for(var i=0;i<3;i++){var d=document.createElement('span');d.style.cssText='width:14px;height:14px;border-radius:3px;background:'+(i<teamScore.A?'#4af':'rgba(255,255,255,.12)')+';border:1px solid rgba(68,170,255,.4);display:inline-block';sa.appendChild(d);}}
  if(sb){sb.innerHTML='';for(var j=0;j<3;j++){var d2=document.createElement('span');d2.style.cssText='width:14px;height:14px;border-radius:3px;background:'+(j<teamScore.B?'#f44':'rgba(255,255,255,.12)')+';border:1px solid rgba(255,68,68,.4);display:inline-block';sb.appendChild(d2);}}
}
function tdmResetHud(){teamScore={A:0,B:0};tdmScoreHud();var el=document.getElementById('tdm-score-hud');if(el)el.style.display=tdmMode?'flex':'none';}
function tdmResetState(){
  isDowned=false;downTimer=0;reviving=false;beingRevived=false;reviveTargetIdx=-1;reviveTimer=0;
  teamMates.forEach(function(tm){tm.downed=false;tm.reviveProgress=0;tm.reviving=false;});
  tdmResetHud();
}
// Called when a LOCAL client downs an enemy -> notify peers (downed) + score by server on death broadcast.
// Respawn is driven by the opponent_died broadcast (single source of truth), not local raycast.
function tdmEnemyDown(oidx,weaponName){
  if(!tdmMode||oidx<0||oidx>=opponentStates.length)return;
  var os=opponentStates[oidx];
  os.hp=0;os.alive=false;
  var name=opponentNames[oidx]||opponentName;
  if(useDowned){
    os.downed=true;
    relaySend({type:'tdm_down',playerId:opponentPlayerIds[oidx]});
  }
  if(!tdmWinSubmitted){
    rankMatchKills++;sessionSP++;document.getElementById('session-sp-val').textContent=sessionSP;
    addKillFeed(authUser||'你',name,weaponName||'??');
  }
  // 重生與計分由伺服器的死亡廣播（opponent_died/player_death）統一驅動，確保擊殺者與被殺者皆正確重整
}
// Local player reached 0 HP in TDM -> downed (4p) or death (2p)
var _autoResumeCD=0;
function _startAutoResume(){
  _autoResumeCD=5;
  var el=document.getElementById('auto-resume-timer');
  el.style.display='block';
}
function _stopAutoResume(){
  _autoResumeCD=0;
  document.getElementById('auto-resume-timer').style.display='none';
}
function tdmLocalDown(){
  if(!tdmMode||hybridMode){onPlayerDeath();return;}
  if(tdmDead)return; // 已死亡，避免重複觸發死亡廣播造成伺服器重複計分
  if(useDowned&&!isDowned){
    goDowned();
    relaySend({type:'tdm_down',playerId:myPlayerId});
    document.getElementById('down-overlay').style.display='flex';
    return;
  }
  tdmFinalDeath();
}
function tdmFinalDeath(){
  if(tdmWinSubmitted)return;
  if(tdmDead)return;
  tdmDead=true;
  rankMatchDeaths++;
  addProficiency();
  relaySend({type:'player_death',playerId:myPlayerId});
  addKillFeed(opponentNames.length?opponentNames[0]||opponentName:'??','你','??');
  document.getElementById('multi-death-prompt').style.display='flex';_startAutoResume();
  var t=document.getElementById('multi-death-title');if(t)t.textContent='💀 陣 亡';
  var d=document.getElementById('multi-death-desc');if(d)d.textContent='我已倒下，等待下一場交戰…';
  var cBtn=document.getElementById('multi-continue-btn');if(cBtn)cBtn.textContent='🔁 重生';
  if(document.pointerLockElement)document.exitPointerLock();
}
function tdmRespawnLocal(){
  document.getElementById('multi-death-prompt').style.display='none';_stopAutoResume();
  playerHP=100;playerArmor=100;isDowned=false;downTimer=0;reviving=false;beingRevived=false;tdmDead=false;
  if(tdmSpawn&&tdmSpawn.x!==undefined){pos.set(tdmSpawn.x,0.8,tdmSpawn.z);}else{var rp=getRandomSpawnPos(false);pos.copy(rp);}
  vel.set(0,0,0);
  relaySend({type:'tdm_respawn',playerId:myPlayerId});
  document.body.requestPointerLock().catch(function(){});
}
// 擊殺後雙邊重生：本機重生到出生點（不廣播，廣播由 tdmEnemyDown 統一發出）
function tdmRoundRespawnLocal(){
  document.getElementById('multi-death-prompt').style.display='none';_stopAutoResume();
  document.getElementById('multi-waiting').style.display='none';
  document.getElementById('down-overlay').style.display='none';
  document.getElementById('revive-prompt').style.display='none';
  document.getElementById('revive-progress').style.display='none';
  playerHP=100;playerArmor=100;isDowned=false;downTimer=0;reviving=false;beingRevived=false;reviveTargetIdx=-1;reviveTimer=0;tdmDead=false;
  if(tdmSpawn&&tdmSpawn.x!==undefined){pos.set(tdmSpawn.x,0.8,tdmSpawn.z);}else{var rp=getRandomSpawnPos(false);pos.copy(rp);}
  vel.set(0,0,0);
  teamMates.forEach(function(tm){tm.reviveProgress=0;});
  if(document.pointerLockElement)document.exitPointerLock();
  document.body.requestPointerLock().catch(function(){});
}
// Remote messaging used by processServerMessage
function tdmRemoteDown(playerId){
  var oi=opponentPlayerIds.indexOf(playerId);
  if(oi>=0&&oi<opponentStates.length){opponentStates[oi].hp=0;opponentStates[oi].alive=false;if(useDowned)opponentStates[oi].downed=true;}
  var mt=teamMates.find(function(t){return t.id===playerId;});
  if(mt){mt.downed=true;mt.reviveProgress=0;mt.reviving=false;}
}
function tdmRemoteBleedout(playerId){
  var oi=opponentPlayerIds.indexOf(playerId);
  if(oi>=0&&oi<opponentStates.length)opponentStates[oi].downed=false;
  var mt=teamMates.find(function(t){return t.id===playerId;});
  if(mt){mt.downed=false;}
}
function tdmRemoteReviveStart(playerId){
  var mt=teamMates.find(function(t){return t.id===playerId;});
  if(mt){mt.reviving=true;}
  if(playerId===myPlayerId){beingRevived=true;downTimer=Math.max(downTimer,999);document.getElementById('down-overlay').style.display='flex';var dt=document.getElementById('down-timer');if(dt)dt.textContent='救援中';}
}
function tdmRemoteReviveCancel(playerId){
  var mt=teamMates.find(function(t){return t.id===playerId;});
  if(mt){mt.reviving=false;}
  if(playerId===myPlayerId){beingRevived=false;downTimer=Math.min(downTimer,5);}
}
function tdmRemoteReviveDone(playerId){
  var oi=opponentPlayerIds.indexOf(playerId);
  if(oi>=0&&oi<opponentStates.length){if(useDowned){opponentStates[oi].downed=false;}opponentStates[oi].hp=100;opponentStates[oi].armor=0;}
  var mt=teamMates.find(function(t){return t.id===playerId;});
  if(mt){mt.downed=false;mt.reviveProgress=0;mt.reviving=false;}
  if(playerId===myPlayerId){isDowned=false;downTimer=0;beingRevived=false;playerHP=100;playerArmor=0;}
}
function tdmRemoteSpawn(playerId){
  var mt=teamMates.find(function(t){return t.id===playerId;});
  if(mt){mt.downed=false;mt.reviveProgress=0;mt.reviving=false;}
}

function createMagazine(){
  if(magazineMesh){if(gunGroup&&magazineMesh.parent===gunGroup)gunGroup.remove(magazineMesh);magazineMesh=null;}
  var g=currentGun;
  if(g==='knife'||g==='grapple'||g==='grenade'||!gunGroup)return;
  // MP7（OBJ 模型）用自帶彈匣，不再疊灰色彈匣
  if((g==='smg'||g==='deagle')&&gunGroup.userData&&gunGroup.userData.magMesh){magazineMesh=gunGroup.userData.magMesh;return;}
  var mg=new THREE.Group();
  var base=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.055,0.014),new THREE.MeshStandardMaterial({color:0x444444,metalness:0.5,roughness:0.4}));
  base.position.set(0,-0.04,0);mg.add(base);
  for(var bi=0;bi<5;bi++){
    var b=new THREE.Mesh(new THREE.SphereGeometry(0.004,4,4),new THREE.MeshStandardMaterial({color:0xccaa44,metalness:0.6}));
    b.position.set(0.015,-0.058+bi*0.009,0.006);mg.add(b);
  }
  if(g==='awp'){mg.position.set(0,-0.04,0.03);}else{mg.position.set(0,-0.005,0.02);mg.rotation.x=-0.08;}
  gunGroup.add(mg);
  magazineMesh=mg;
}
function removeMagazine(){
  if(magazineMesh){if(gunGroup&&magazineMesh.parent===gunGroup)gunGroup.remove(magazineMesh);magazineMesh=null;}
}
function onPlayerDeath(){
  if(currentMap==='nuclear'){achData.nuclearStreak=0;saveAch();}
  if(currentMap==='flooded'){
    isUnderwater=false;stopUnderwaterAmbient();
    document.getElementById('o2-wrap').style.display='none';
    document.getElementById('underwater-overlay').style.display='none';
    bossFloodedActive=false;bossFloodedSpawned=false;abyssalMaw=null;
    airBubbles.forEach(function(b){disposeMesh(b.mesh);});airBubbles=[];
    harpoonProjectiles.forEach(function(h){scene.remove(h.mesh);});harpoonProjectiles=[];
    oxyVents.forEach(function(v){if(v.base)scene.remove(v.base);if(v.glow)scene.remove(v.glow);});oxyVents=[];
    document.getElementById('boss-hp-wrap').style.display='none';
  }
  if(rangeMode){playerHP=100;playerArmor=0;pos.set(0,0.8,1.5);vel.set(0,0,0);isDowned=false;downTimer=0;return;}
  if(isMultiplayer){
    rankMatchDeaths++;
    addProficiency();
    if(hybridMode){
      // Hybrid FFA：找出場上最近的 AI（或真人）當擊殺者，10 秒後自動重生
      var kn='??',kIsAi=true,kId=-1;
      if(window._hybridLastAttacker!==undefined&&window._hybridLastAttacker!==null){
        kn=window._hybridLastAttacker;kIsAi=false;kId=window._hybridLastAttackerId;
      }else{
        var bd2=1e9;
        for(var hi=0;hi<enemies.length;hi++){
          var he=enemies[hi];if(!he||he.hp<=0)continue;
          var hd=he.pos.distanceTo(pos);
          if(hd<bd2){bd2=hd;kId=1000+(he.hybridIdx!==undefined?he.hybridIdx:hi);kn='AI-'+hybridPad3((he.hybridIdx!==undefined?he.hybridIdx:hi)+1);}
        }
      }
      hybridLocalDeath(kn,kId,kIsAi,currentGun);
      return;
    }
    relaySend({type:'player_death'});
    addKillFeed(opponentName,'你','??');
    document.getElementById('multi-death-prompt').style.display='flex';
    if(document.pointerLockElement)document.exitPointerLock();
    _startAutoResume();
    return;
  }
  if(bossRushMode){
    bossRushMode=false;bossActive=false;bossSpawned=false;
    bossProjectiles.forEach(function(bp){scene.remove(bp.mesh);scene.remove(bp.trail);});
    bossProjectiles.length=0;
    if(boss&&boss.mesh){scene.remove(boss.mesh);boss=null;}
    for(var si=bossSummoned.length-1;si>=0;si--){var sm=bossSummoned[si];if(sm.mesh)scene.remove(sm.mesh);if(sm.hBar)scene.remove(sm.hBar);}bossSummoned.length=0;
    for(var fi=bossFrostPatches.length-1;fi>=0;fi--){if(bossFrostPatches[fi].mesh)scene.remove(bossFrostPatches[fi].mesh);}bossFrostPatches.length=0;
    document.getElementById('boss-hp-wrap').style.display='none';
    if(window._savedEnemies){enemies.length=0;enemies.push.apply(enemies,window._savedEnemies);window._savedEnemies=null;
      for(var ei2=0;ei2<enemies.length;ei2++){var ee=enemies[ei2];ee.mesh.visible=true;if(ee.hBar)ee.hBar.visible=true;if(ee.aBar)ee.aBar.visible=true;}
    }
    var brWave=bossRushWave;
    lbSave('bossrush',brWave*1000,brWave,{maxWave:brWave});
    var xpEarned=50+brWave*15;
    addXP(xpEarned);
    document.getElementById('settlement-xp').textContent='+'+xpEarned;
    var li=getLevelInfo(playerXP);
    document.getElementById('settlement-progress-fill').style.width=(li.current/li.needed*100)+'%';
    document.getElementById('settlement-title').textContent='⚔ Boss大戰 — 結算';
    document.getElementById('settlement-level').textContent='到達第 '+brWave+' 波 | Lv.'+li.level+' ('+li.current+' / '+li.needed+')';
    document.getElementById('settlement').style.display='flex';
    playerHP=100;playerArmor=100;
    isDowned=false;downTimer=0;
    return;
  }
  playerHP=100;playerArmor=100;gameStarted=false;
  if(document.pointerLockElement)document.exitPointerLock();
  // 殭屍老巢死掉後不要停在 zl：清場回基本圖，避免「點擊繼續」直接重開殭屍模式
  if(currentMap==='zombielair'){currentMap='base';applyMapSettings();}
  ['map-select','diff-select','char-select','class-select'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
  document.getElementById('blocker').style.display='flex';
  document.getElementById('start-msg').innerHTML='點擊繼續遊戲';
  if(didPlayGame){
    didPlayGame=false;
    addProficiency();
    var finalRound=roundNum;
    var xpEarned=10+Math.max(0,(finalRound-1)*2);
    addXP(xpEarned);
    document.getElementById('settlement-xp').textContent='+'+xpEarned;
    var li=getLevelInfo(playerXP);
    document.getElementById('settlement-level').textContent='Lv.'+li.level+' ('+li.current+' / '+li.needed+')';
    document.getElementById('settlement-progress-fill').style.width=(li.current/li.needed*100)+'%';
    if(dailyChallenge){
      dailyChallenge=false;
      dailyRounds=finalRound;
      var todayKey=new Date();todayKey=todayKey.getFullYear()+'-'+(todayKey.getMonth()+1)+'-'+todayKey.getDate();
      var score=dailyRounds*1000+dailyKills;
      var isNew=!dailyBest[todayKey]||score>dailyBest[todayKey].score;
      if(isNew){dailyBest[todayKey]={score:score,rounds:dailyRounds,kills:dailyKills,date:todayKey};try{localStorage.setItem('oc_daily_best',JSON.stringify(dailyBest));}catch(e){}}
      var best=dailyBest[todayKey];
      document.getElementById('settlement-daily').style.display='block';
      document.getElementById('settlement-daily-stats').innerHTML='波數：'+dailyRounds+'<br>擊殺：'+dailyKills+'<br>得分：'+(dailyRounds*1000+dailyKills);
      document.getElementById('settlement-daily-best').textContent=isNew?'🏆 新紀錄！':'最佳：'+best.rounds+' 波 / '+best.kills+' 擊殺（'+best.score+' 分）';
      document.getElementById('settlement-xp-label').textContent='每 日 挑 戰';
    }else{
      document.getElementById('settlement-daily').style.display='none';
      document.getElementById('settlement-xp-label').textContent='經 驗 值';
    }
    document.getElementById('settlement').style.display='flex';
  }
  var doEl=document.getElementById('death-overlay');doEl.style.display='flex';setTimeout(function(){doEl.style.display='none';},2000);
}
var hitDirTimer=0,hitDirAngle=0;
function showHitDir(angle){
  hitDirTimer=0.35;hitDirAngle=angle;
  document.getElementById('hit-dir-wrap').style.display='block';
}
var _resumeTimerID=null;
function playerDamage(dmg,fromPos){
  if(isDowned)return;
  if(fromPos){
    // 計算受擊方向：視角正前方為0°，右為+，左為-（在水平面上）
    var _fx=-Math.sin(yaw),_fz=-Math.cos(yaw); // 前方單位向量
    var _rx=-_fz,_rz=_fx; // 右方單位向量
    var _dx=fromPos.x-pos.x,_dz=fromPos.z-pos.z;
    var _rcomp=_dx*_rx+_dz*_rz; // 左右分量(右為正)
    var _fcomp=_dx*_fx+_dz*_fz; // 前後分量(前為正)
    showHitDir(Math.atan2(_rcomp,_fcomp));
  }
  inspectTimer=0;
  if(equippedPet==='guardian'&&Math.random()<0.15){showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),dmg,'#44aaff');return;}
  if(window.rageActive)dmg=Math.round(dmg*0.6);
  if(window.damageReduction)dmg=Math.round(dmg*window.damageReduction);
  if(playerHP<=dmg&&window.undying&&!window._undyingCD){playerHP=1;window._undyingCD=true;setTimeout(function(){window._undyingCD=false;},60000*(playerClass==='tank'?0.67:1));showDmgNum(pos.clone().add(new THREE.Vector3(0,2,0)),'不屈','#ffdd44');return;}
  if(playerHP<=dmg&&window.revive&&!window._reviveCD){playerHP=50;window._reviveCD=true;setTimeout(function(){window._reviveCD=false;},120000);showDmgNum(pos.clone().add(new THREE.Vector3(0,2,0)),'起死回生','#44ff88');return;}
  if(playerArmor>0){
    var od=dmg;
    playerArmor-=dmg;
    if(playerArmor<0){playerHP+=playerArmor;playerArmor=0}
    if(playerArmor===0){sbActive=true;sbTimer=0;document.getElementById('sb').style.display='block'}
  }else{
    playerHP-=dmg;
  }
  if(playerHP<=0){playerHP=0;if(hybridMode){onPlayerDeath();}else if(!isDowned)goDowned();}
}
function dropPickup(p){
  if(Math.random()>0.4)return;
  var types=['health','atkspeed','infammo'];
  var colors=[0x44ff44,0xff6622,0x44aaff];
  var emColors=[0x22ff22,0xff4400,0x2288ff];
  var ti=Math.floor(Math.random()*types.length);
  var g=new THREE.Group();
  var sph=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8),new THREE.MeshStandardMaterial({color:colors[ti],emissive:emColors[ti],emissiveIntensity:0.5,transparent:true,opacity:0.9}));
  sph.position.y=0.15;g.add(sph);
  var glow=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,8),new THREE.MeshBasicMaterial({color:colors[ti],transparent:true,opacity:0.15,depthWrite:false}));
  glow.position.y=0.15;g.add(glow);
  g.position.set(p.x,0.3,p.z);scene.add(g);
  pickups.push({mesh:g,pos:new THREE.Vector3(p.x,0.3,p.z),type:types[ti],life:15,time:0});
}
function updateAirdrop(dt){
  if(!b3Airdrop||currentMap!=='basemap3')return;
  var ad=b3Airdrop;
  if(ad.state==='waiting'){
    ad.time+=dt;
    ad.mesh.position.y=ad.baseY+Math.sin(ad.time*2)*0.15;
    ad.mesh.rotation.y+=dt*1.2;
    ad.glow.material.opacity=0.45+Math.sin(ad.time*3)*0.2;
    if(ad.light)ad.light.position.y=ad.mesh.position.y+0.8;
    if(gameStarted&&pos.distanceTo(ad.pos)<1.6){
      grantAirdrop(ad);
    }
  }else{
    ad.cd-=dt;
    ad.glow.material.opacity=Math.max(0,Math.min(0.45,ad.cd/45*0.45));
    if(ad.cd<=0){
      ad.state='waiting';ad.time=0;ad.mesh.visible=true;ad.mesh.position.y=ad.baseY;ad.mesh.rotation.y=0;
    }
  }
}
function grantAirdrop(ad){
  ad.state='cooldown';ad.cd=45;ad.mesh.visible=false;
  var pick=Math.random();
  var msg='';
  if(pick<0.28){playerHP=Math.min(100,playerHP+40);msg='+40 血量';showDmgNum(pos.clone(),40,'#44ff88');}
  else if(pick<0.52){playerArmor=Math.min(150,playerArmor+40);msg='+40 護甲';showDmgNum(pos.clone(),40,'#4488ff');}
  else if(pick<0.68){buffTimer=5;buffType='atkspeed';msg='⚡ 攻速x2';showDmgNum(pos.clone(),1,'#ff6622');}
  else if(pick<0.82){buffTimer=5;buffType='infammo';msg='🔷 無限子彈';showDmgNum(pos.clone(),1,'#44aaff');}
  else{earnCoins(3000);msg='+3000 特種幣';showDmgNum(pos.clone(),3000,'#fa4');}
  showAirdropMsg(ad.pos,msg);
  for(var i=0;i<10;i++){
    var pn=new THREE.Mesh(new THREE.SphereGeometry(0.06,5,5),new THREE.MeshBasicMaterial({color:0xffcc44,transparent:true,opacity:0.9}));
    pn.position.copy(ad.pos);pn.position.y+=0.4;
    pn.userData={vy:2+Math.random()*3};pn.lifetime=1;
    scene.add(pn);smokeParticles.push(pn);
  }
}
function showAirdropMsg(p,msg){
  var v=p.clone();v.y+=1.2;v.project(cam);
  var x=(v.x*0.5+0.5)*window.innerWidth,y=(-v.y*0.5+0.5)*window.innerHeight;
  var el=document.createElement('div');
  el.textContent=msg;
  el.style.cssText='position:fixed;left:'+x+'px;top:'+y+'px;pointer-events:none;z-index:7;font-size:24px;font-weight:bold;color:#ffcc44;font-family:Arial;text-shadow:-1px -1px 2px #000,1px -1px 2px #000,-1px 1px 2px #000,1px 1px 2px #000,0 0 8px #000;opacity:1;transition:all 1s ease-out';
  document.body.appendChild(el);
  requestAnimationFrame(function(){el.style.transform='translateY(-45px)';el.style.opacity='0';});
  setTimeout(function(){el.remove();},1000);
}
function updatePickups(dt){
  for(var i=pickups.length-1;i>=0;i--){
    var pk=pickups[i];
    pk.time+=dt;
    // Bob
    pk.mesh.position.y=0.3+Math.sin(pk.time*3)*0.08;
    pk.mesh.rotation.y+=dt*2;
    // Lifetime
    pk.life-=dt;
    if(pk.life<=0){scene.remove(pk.mesh);pickups.splice(i,1);continue;}
    // Auto-fade in last 5 sec
    if(pk.life<5)pk.mesh.children[0].material.opacity=Math.min(1,pk.life);
    // Player pickup
    if(pos.distanceTo(pk.pos)<1.2){
      if(pk.type==='health'){playerHP=Math.min(100,playerHP+40);showDmgNum(pos.clone(),40,'#44ff88')}
      else if(pk.type==='atkspeed'){buffTimer=5;buffType='atkspeed';showDmgNum(pos.clone(),1,'#ff6622')}
      else if(pk.type==='infammo'){buffTimer=5;buffType='infammo';showDmgNum(pos.clone(),1,'#44aaff')}
      scene.remove(pk.mesh);pickups.splice(i,1);
    }
  }
}
function updateEnemies(dt){
  ocSyncMapMeshes();
  syncEnemyNameplates();
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];if(e.hp<=0){if(e.mesh.visible!==false){e.mesh.visible=false;if(e.hBar){e.hBar.visible=false;e.aBar.visible=false}dropPickup(e.pos);if(currentMap==='nuclear'&&e.isCleaner)nuclearClears++;if(e.type!=='suicider'){earnCoins(1000);checkKillAch();roundEarnings+=1000;sessionSP++;document.getElementById('session-sp-val').textContent=sessionSP;killCounter++;if(killCounter%10===0)awardSkillPoints(1);showDmgNum(e.pos.clone(),1000,'#fa4');if(window.bonusLifesteal){playerHP=Math.min(100,playerHP+window.bonusLifesteal);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),window.bonusLifesteal,'#44ff88');}if(window.chainKill)classSkillCD=0;if(e.type==='sniper')seasonProgress.kill_sniper++;seasonProgress.kill++;gunKills[currentGun]=(gunKills[currentGun]||0)+1;if(dailyChallenge)dailyKills++;questProgress.kill++;saveSeasonProgress();saveDragonboatProgress();if(window.lifesteal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}}}continue}else if(e.isZombie){zombieTick(e,dt);continue;}else if(!e.mesh.visible)e.mesh.visible=true;
    e.shootCD-=dt*(ocEngSonicAt(e.pos.x,e.pos.z)?0.5:1);e.detectCD-=dt;e.walkTime+=dt;
    // 方晶待機動畫（原本靠走路的腿部動畫，現在改成懸浮 + 內核脈動）
    if(e.mesh.userData&&e.mesh.userData.cubeling&&e.mesh.userData.cubeling.userData.tick)e.mesh.userData.cubeling.userData.tick(e.walkTime);
    if(!e.strafeCD)e.strafeCD=0;else e.strafeCD-=dt;
    if(!e.hitTimer)e.hitTimer=0;else e.hitTimer-=dt;
    if(!e.stunTimer)e.stunTimer=0;else e.stunTimer-=dt;
    //高壓氣縮彈擊倒：倒地期間不移動、不攻擊（可被擊殺），1.5s 後起身
    if(e.hp>0&&(e.knockT>0||e.knockStand>0||e.knockAngle>0)){ocUpdateKnocked(e,dt);continue;}
    // Detect player (LOS)
    if(window.ghostInvis){e.hasDetected=false;}
    else if(e.detectCD<=0){
      var toP=new THREE.Vector3().copy(pos);toP.y+=0.3;toP.sub(e.pos);var dist=toP.length();
      if(dist<40){
        var canSee=false;
        if(e.type==='sniper'){
          canSee=true;
        }else{
          var rc=new THREE.Raycaster(e.pos,toP.clone().normalize());var hits=rc.intersectObjects(mapMeshes);var blocked=false;
          for(var hi=0;hi<hits.length;hi++){if(hits[hi].distance<dist-0.3){blocked=true;break}}
          if(!blocked)canSee=true;
        }
        if(canSee){e.hasDetected=true;e.detectCD=0.2}else{e.hasDetected=false}
      }else{e.hasDetected=false}
    }
    // State
    // ── 找其他 AI 當目標（單人模式也要 AI 互相打）──
    if(!e.aiTargetCD)e.aiTargetCD=0;else e.aiTargetCD-=dt;   // 讀檔還原的敵人沒有這個值
    if(e.aiTargetCD<=0){
      e.aiTargetCD=0.3+Math.random()*0.35;
      // 只有「正常拿 AK 的敵人」才參與互相攻擊：醫療專職治療、潛水員走自己的 AI
      if(e.hp<=0||e.type==='healer'||e.type==='diver'||!e.gun||e.towerPerch||window.disableAiVsAi){e.aiTarget=null;}
      else{
        var tBest=null,tBestD=24;
        for(var ai=0;ai<enemies.length;ai++){
          var o=enemies[ai];
          if(o===e||o.hp<=0||!o.mesh.visible||o.type==='diver')continue;
          var od=e.pos.distanceTo(o.pos);
          if(od>=tBestD)continue;
          if(Math.abs(o.pos.y-e.pos.y)>3)continue;
          if(!aiHasLOS(e,o))continue;
          tBest=o;tBestD=od;
        }
        e.aiTarget=tBest;
      }
    }
    // ── Hybrid：把「玩家優先」換成「最近戰鬥員優先」──────────────
    // 下面 AI 互毆的閘門要求「沒在追玩家」(!hasDetected && state!=='chase')，
    // 但 Hybrid 競技場 AI 被夾在 ±14、偵測半徑 40 → 兩者距離最多約 39.6 < 40，
    // hasDetected 幾乎恆為 true → AI 互毆那段從來沒有執行過。
    // 整段以 hybridMode && e.hybridAI 保護，單人模式完全不受影響。
    e.aimNoPlayer=false;
    if(hybridMode&&e.hybridAI&&e.aiTarget&&e.type!=='suicider'&&e.type!=='healer'&&e.stunTimer<=0){
      var _hbA=e.pos.distanceTo(e.aiTarget.pos);
      var _hbP=e.hasDetected?e.pos.distanceTo(pos):1e9;
      var _hbR=e.hybridTarget?(e.hybridTarget.dist!==undefined?e.hybridTarget.dist:1e9):1e9;
      if(_hbA<_hbP*0.6&&(_hbA<_hbR*0.75||e.hybridTarget===null)){
        e.hasDetected=false;      // ★ 讓狀態機與互毆閘門都放行
        e.aimNoPlayer=true;
      }
    }
    if(e.hasDetected){e.state='chase'}
    else if(e.state==='chase'){e.state='search';e.searchTimer=2}
    else if(e.state==='search'){e.searchTimer-=dt;if(e.searchTimer<=0){e.state='patrol';e.waypoint.set(e.pos.x+8-16*Math.random(),0,e.pos.z+8-16*Math.random())}}
    // React to gunshot sounds
    if(lastShotPos&&e.state!=='chase'){
      var shotDist=lastShotPos.distanceTo(e.pos);
      if(shotDist<25){e.state='investigate';e.investigateTarget=lastShotPos.clone();e.searchTimer=3}
    }
    if(e.state==='investigate'){
      e.searchTimer-=dt;
      if(e.searchTimer<=0||!e.investigateTarget){e.state='patrol';e.waypoint.set(e.pos.x+8-16*Math.random(),0,e.pos.z+8-16*Math.random())}
    }
    // Movement
    var isRusher=e.type==='rusher',isGrenadier=e.type==='grenadier',isSuicider=e.type==='suicider',isHealer=e.type==='healer',isSniper=e.type==='sniper',isShield=e.type==='shield';
    var spd=(e.state==='chase'?(isRusher?7:(isSuicider?9:(isSniper?1.2:(isShield?2.5:4.5)))):1.5);   // isSniper 原本是 0 → sniper 偵測到人後完全無法移動
    if(ocEngSonicAt(e.pos.x,e.pos.z))spd*=0.5;
    if(e.rootT>0)spd=0;
    var moveTarget=null,aimAtPlayer=false;
    if(currentMap==='basemap3'&&e.hp>0){
      if(e.roofTop){
        e.pos.y=36;
        e.pos.x=Math.max(-11,Math.min(11,e.pos.x));e.pos.z=Math.max(-11,Math.min(11,e.pos.z));
        if(e.state==='chase'&&pos.y>32){
          var rv=new THREE.Vector3(pos.x-e.pos.x,0,pos.z-e.pos.z);
          var rl=rv.length();
          if(rl>1.2){rv.normalize();e.pos.x+=rv.x*spd*dt;e.pos.z+=rv.z*spd*dt;e.mesh.rotation.y=Math.atan2(rv.x,rv.z);}
        }else{
          e.waypoint.set(e.pos.x+8-16*Math.random(),36,e.pos.z+8-16*Math.random());
          e.pos.x=Math.max(-11,Math.min(11,e.pos.x+(e.waypoint.x-e.pos.x)*dt*0.8));e.pos.z=Math.max(-11,Math.min(11,e.pos.z+(e.waypoint.z-e.pos.z)*dt*0.8));
        }
        e.mesh.position.set(e.pos.x,36,e.pos.z);
        updateEnemyBars(e);
        continue;
      }
      if(pos.y>32&&e.pos.y<1){
        var bestL=null,bdst2=1e9;
        for(var li2=0;li2<b3Ladders.length;li2++){
          var lad2=b3Ladders[li2];
          var d2=(e.pos.x-lad2.x)*(e.pos.x-lad2.x)+(e.pos.z-lad2.z)*(e.pos.z-lad2.z);
          if(d2<bdst2){bdst2=d2;bestL=lad2;}
        }
        if(bestL){
          var baseD2=Math.sqrt(bdst2);
          if(baseD2>1.5){
            var ldir2=new THREE.Vector3(bestL.x-e.pos.x,0,bestL.z-e.pos.z).normalize();
            e.pos.x+=ldir2.x*3.4*dt;e.pos.z+=ldir2.z*3.4*dt;
            e.mesh.rotation.y=Math.atan2(ldir2.x,ldir2.z);
            e.mesh.position.set(e.pos.x,0,e.pos.z);
            if(e.hBar){e.hBar.position.set(e.pos.x,0.95,e.pos.z);}
            if(e.aBar){e.aBar.position.set(e.pos.x,0.88,e.pos.z);}
            continue;
          }else{
            e.pos.x=bestL.x;e.pos.z=bestL.z;
            e.pos.y+=dt*3;
            e.mesh.position.set(e.pos.x,e.pos.y,e.pos.z);
            if(e.hBar){e.hBar.position.set(e.pos.x,e.pos.y+0.95,e.pos.z);}
            if(e.aBar){e.aBar.position.set(e.pos.x,e.pos.y+0.88,e.pos.z);}
            if(e.pos.y>=35.5){e.pos.y=36;e.roofTop=true;e.pos.x=Math.max(-11,Math.min(11,e.pos.x));e.pos.z=Math.max(-11,Math.min(11,e.pos.z));e.mesh.position.set(e.pos.x,36,e.pos.z);}
            continue;
          }
        }
      }
    }
      if(e.state==='chase'){
        aimAtPlayer=true;
        var toPlayer=new THREE.Vector3().copy(pos);toPlayer.y=0;toPlayer.sub(e.pos);
        var d=toPlayer.length();
        // 換方向時只在左右之間翻轉(±1)，且間隔拉長，避免每幀/每 0.3 秒就換一個
        // 「隨機大小」的方向造成貼臉時左右抽動
        if(e.strafeCD<=0){e.strafeSign=-(e.strafeSign||-1);e.strafeDir=e.strafeSign;e.strafeCD=0.9+Math.random()*0.9}
        var fwd=toPlayer.clone().normalize();
        var rgt=new THREE.Vector3(-fwd.z,0,fwd.x);
        var desired=new THREE.Vector3();
        // React to being shot: dodge
        if(e.hitTimer>0){desired.add(rgt.clone().multiplyScalar((e.strafeDir>0?1:-1)*1.5)).add(fwd.clone().multiplyScalar(-0.8));}
        else if(isRusher||isSuicider){
          if(d>2.5)desired.add(fwd);
        }else if(isSniper){
          if(d<18)desired.sub(fwd);
          if(d>25)desired.add(fwd);
          desired.add(rgt.clone().multiplyScalar(e.strafeDir*1.5));
        }else if(isShield){
          if(d>3)desired.add(fwd);
          if(d<8)desired.add(rgt.clone().multiplyScalar(e.strafeDir*0.6));
        }else if(isHealer){
          if(d<14)desired.sub(fwd);
          desired.add(rgt.clone().multiplyScalar(e.strafeDir*0.8));
        }else{
          var idealDist=isGrenadier?10+Math.random()*3:5+Math.random()*5;
          if(d>idealDist+2)desired.add(fwd);
          else if(d<idealDist-3)desired.sub(fwd);
          desired.add(rgt.clone().multiplyScalar(e.strafeDir*0.6));
          // Flanking: add forward+side mix for surround
          if(d<12&&d>4)desired.add(rgt.clone().multiplyScalar(e.strafeDir*0.6));
        }
      // Avoid walls
      var avoidDir=new THREE.Vector3();
      for(var bi=0;bi<mapBoxes.length;bi++){
        var bx=mapBoxes[bi];
    if(bx.isDragonBoat||!bx.mesh.visible)continue;
        var toBox=new THREE.Vector3().copy(bx.pos).sub(e.pos);var bd=toBox.length();
        if(bd<4&&bd>0.1)avoidDir.sub(toBox.normalize().multiplyScalar(4/bd));
      }
      desired.add(avoidDir);
      if(desired.length()>1)desired.normalize();
      if(!isRusher&&!isSuicider||d>2.5)moveTarget=e.pos.clone().add(desired.multiplyScalar(3));
      else moveTarget=e.pos.clone();
      // Attack
      if(isRusher){
        if(d<2.5&&e.shootCD<=0){e.firingNow=true;playerDamage(15,e.pos);slowTimer=0.3;showDmgNum(pos.clone(),15,'#ff4444');e.shootCD=0.6;}
      }else if(isSuicider){
        if(d<2.5){screenShake=2;playerDamage(40,e.pos);slowTimer=0.8;showDmgNum(pos.clone(),40,'#ff4400');e.hp=0;e.mesh.visible=false;if(e.hBar){e.hBar.visible=false;e.aBar.visible=false}dropPickup(e.pos);continue;}
      }else if(isGrenadier){
        if(e.shootCD<=0&&d<20){e.firingNow=true;enemyShoot(e);e.shootCD=0.5+Math.random()*0.4;e.state='shoot'}
      }else if(isSniper){
        if(d<40&&e.shootCD<=0){
          e.chargeTimer=(e.chargeTimer||0)+dt;
          if(e.chargeTimer>=1.5){e.firingNow=true;sniperShoot(e);e.shootCD=3+Math.random()*0.5;e.chargeTimer=0;e.state='shoot'}
        }else{e.chargeTimer=0;}
      }else if(isShield){
        if(e.shootCD<=0&&d<12){e.firingNow=true;enemyShoot(e);e.shootCD=1.2+Math.random()*0.4;e.state='shoot'}
      }else{
        if(e.shootCD<=0&&d<25){e.firingNow=true;enemyShoot(e);var wfr=e.weaponType?gunData[e.weaponType].fireRate:0.2;e.shootCD=Math.max(0.3,wfr*1.2+Math.random()*wfr);e.state='shoot'}
      }
    }else if(e.state==='shoot'){
      aimAtPlayer=true;
      var toP2=new THREE.Vector3().copy(pos);toP2.y=0;toP2.sub(e.pos);
      if(isGrenadier){
        if(e.shootCD<=0&&toP2.length()<20){e.firingNow=true;enemyShoot(e);e.shootCD=0.5+Math.random()*0.4}
        var idealG=10+Math.random()*3;
        var rgtG=new THREE.Vector3(-toP2.x,0,toP2.z).normalize();
        if(toP2.length()>idealG+3)moveTarget=e.pos.clone().add(toP2.clone().normalize());
        else if(toP2.length()<idealG-3)moveTarget=e.pos.clone().sub(toP2.clone().normalize());
        else moveTarget=e.pos.clone().add(rgtG.multiplyScalar((Math.random()-0.5)*2));
      }else if(isSniper){
        moveTarget=e.pos.clone().add(toP2.clone().normalize().multiplyScalar(-5));
      }else if(isShield){
        moveTarget=e.pos.clone().add(toP2.clone().normalize().multiplyScalar(2));
      }else if(!isRusher&&!isSuicider&&!isHealer){
        var rgtN=new THREE.Vector3(-toP2.z,0,toP2.x).normalize();
        moveTarget=e.pos.clone().add(rgtN.multiplyScalar((Math.random()-0.5)*4)).add(toP2.clone().normalize().multiplyScalar((Math.random()-0.5)*2));
        if(e.shootCD<=0&&toP2.length()<25){e.firingNow=true;enemyShoot(e);var wfr=e.weaponType?gunData[e.weaponType].fireRate:0.2;e.shootCD=Math.max(0.3,wfr*1.2+Math.random()*wfr);}
      }
      e.state='chase';
    }else if(e.state==='patrol'){
      moveTarget=e.waypoint;
      if(e.pos.distanceTo(e.waypoint)<2){
        e.waypoint.set(e.pos.x+8-16*Math.random(),0,e.pos.z+8-16*Math.random());
        e.waypoint.x=Math.max(-13,Math.min(13,e.waypoint.x));e.waypoint.z=Math.max(-13,Math.min(13,e.waypoint.z));
      }
    }else if(e.state==='search'){
      var toP3=new THREE.Vector3().copy(pos);toP3.y=0;toP3.sub(e.pos);
      if(isHealer)moveTarget=e.pos.clone().sub(toP3.normalize().multiplyScalar(5));
      else moveTarget=e.pos.clone().add(toP3.normalize().multiplyScalar(5));
    }else if(e.state==='investigate'&&e.investigateTarget){
      if(isHealer)moveTarget=e.pos.clone().sub(e.investigateTarget.clone().sub(e.pos).normalize().multiplyScalar(5));
      else moveTarget=e.investigateTarget;
      if(e.pos.distanceTo(e.investigateTarget)<2){e.searchTimer=0;}
    }
    if(e.stunTimer>0){moveTarget=null;aimAtPlayer=false;}
    // 駐塔狙擊兵：死守在塔頂平台上（不移動）。原本每幀把 mesh 強制壓回 y=0，
    // 於是整隻埋進塔柱裡 → 看不到、射擊 ray 也先打中塔柱 → 完全沒有傷害。
    if(e.towerPerch){moveTarget=null;e.vel.set(0,0,0);e.desiredVel.set(0,0,0);e.pos.copy(e.towerPerch);}
    // Hybrid：AI 若比本機玩家更靠近某個遠端真人，就改去追他。
    // 開火與傷害由 hybridAiAttackPlayers 判定（這裡不重複扣血）。
    //
    // 舊code在進入 9 公尺後把 moveTarget 直接設成 e.pos 自己：
    //   dir.length()===0 → desiredVel.set(0,0,0) → AI 完全靜止
    // 而且它停在後加入者 9m 內時，hrt.dist < e.pos.distanceTo(pos) 會永遠成立，
    //   於是「不動」又讓條件繼續成立 → 永久鎖死，AI 再也不會走。
    //   （晚加入前 opponentStates 為空、hybridAiRemoteTarget 回傳 null，所以只有
    //     有人加入後才會發作 —— 正是「第二個人一進來小怪就不動」的原因。）
    // 現在改成真的維持「9 公尺包圍圈」並沿切線繞行，AI 站定後仍會繼續移動。
    var hrt=hybridMode?hybridAiRemoteTarget(e,20):null;
    e.hybridTarget=hrt;
    if(hrt&&hrt.dist<e.pos.distanceTo(pos)){
      var hdv=new THREE.Vector3().copy(hrt.pos).sub(e.pos);hdv.y=0;
      var hdl=hdv.length();
      if(hdl>0.001){
        var standoff=9;
        if(hdl>standoff+2){
          moveTarget=e.pos.clone().add(hdv.normalize().multiplyScalar(Math.min(hdl-standoff,4)));
        }else{
          // 包圍圈：目標點沿半徑 standoff 的圓周「持續掃動」。
          // 舊code在這裡用 e.hybridOrbit=-sgn 每幀左右翻轉，兩個目標點相隔 10.3m
          // 交替出現，而移動是一階落後(1-exp(-9dt))，兩個方向的速度互相抵消 →
          // AI 走過去之後就會在原地以每幀 0.0067m 抖動，看起來跟凍結一樣，
          // 而且因為抖動量高於看門狗門檻(0.004)連看門狗都不會觸發。
          if(e.hybridAng===undefined)e.hybridAng=Math.atan2(e.pos.z-hrt.pos.z,e.pos.x-hrt.pos.x);
          if(!e.hybridDir)e.hybridDir=1;
          e.hybridAng+=dt*0.55*e.hybridDir;      // dt 是 updateEnemies(dt) 的參數
          moveTarget=hrt.pos.clone().add(new THREE.Vector3(Math.cos(e.hybridAng)*standoff,0,Math.sin(e.hybridAng)*standoff));
        }
        // 安全網：目標點不能等於自己，否則 dir 長度為 0 又會靜止；往前推一格角度
        if(moveTarget.distanceTo(e.pos)<0.5){
          e.hybridAng=(e.hybridAng===undefined?0:e.hybridAng)+0.8;
          moveTarget=hrt.pos.clone().add(new THREE.Vector3(Math.cos(e.hybridAng)*standoff,0,Math.sin(e.hybridAng)*standoff));
        }
      }
    }
    // AI 決定打另一隻 AI 時，移動目標也要換成那隻 AI，否則上面 chase/search 分支
    // 還是會把 moveTarget 指向本機玩家，跟 AI 互毆那段直接改寫 e.pos 互相拉扯。
    if(e.aimNoPlayer&&e.aiTarget){
      e.state='patrol';
      var _tb=e.aiTarget.pos;
      var _hd=new THREE.Vector3(_tb.x-e.pos.x,0,_tb.z-e.pos.z);
      var _hl=_hd.length()||0.001;
      var _want=(e.type==='rusher')?2:11;
      if(_hl>_want+1)e.waypoint.copy(_tb);
      else e.waypoint.set(e.pos.x-_hd.x/_hl*4,0,e.pos.z-_hd.z/_hl*4);
    }
    // ── 移動平滑化 ──────────────────────────────────────
    // 原本是每幀直接 pos += dir*spd*dt：方向一變位置就瞬移，而貼臉時
    // 前進/後退/走位/避牆幾個向量互相抵消再歸一化，AI 就會左右抽動。
    // 現在改成「目標速度 → 指數逼近」的平滑加速／減速；開火時把目標速度
    // 歸零，讓 AI 開槍當下站定不動。
    if(moveTarget){
      var dir=new THREE.Vector3().copy(moveTarget).sub(e.pos);dir.y=0;
      if(dir.length()>0.3){
        dir.normalize();
        var finalDir=dir.clone();
        if(e.hitTimer>0&&e.state==='chase'){
          var rgt3=new THREE.Vector3(-dir.z,0,dir.x);
          finalDir.add(rgt3.multiplyScalar(2*e.hitTimer));
          if(finalDir.length()>1)finalDir.normalize();
        }
        e.desiredVel.set(finalDir.x*spd,0,finalDir.z*spd);
        e.aimYaw=(aimAtPlayer)?Math.atan2(pos.x-e.pos.x,pos.z-e.pos.z):Math.atan2(finalDir.x,finalDir.z);
      }else{
        e.desiredVel.set(0,0,0);
      }
    }else{
      e.desiredVel.set(0,0,0);
    }
    // 開火中（含衝鋒者近戰揮擊）→ 目標速度歸零，AI 站定不動
    if(e.firingNow)e.desiredVel.set(0,0,0);
    // 平滑逼近：1-exp(-k*dt) 與幀率無關，60/144/240Hz 表現一致
    var hbAccel=1-Math.exp(-9*dt);
    e.vel.x+=(e.desiredVel.x-e.vel.x)*hbAccel;
    e.vel.z+=(e.desiredVel.z-e.vel.z)*hbAccel;
    // 死區：慢到一定程度就完全停住，避免「幾乎不動卻一直在微微抽動」
    if(e.vel.x*e.vel.x+e.vel.z*e.vel.z<0.0025){e.vel.x=0;e.vel.z=0;}
    if(e.vel.x!==0||e.vel.z!==0){
      e.pos.x+=e.vel.x*dt;e.pos.z+=e.vel.z*dt;
      // Enemy-wall collision
      var eR=0.3;
      for(var bi=0;bi<mapBoxes.length;bi++){
        var bx=mapBoxes[bi];if(bx.size.y<0.3||bx.isDragonBoat||!bx.mesh.visible)continue;
        // Only collide if Y ranges overlap (skip floating panels above enemy)
        if(e.pos.y>bx.pos.y+bx.size.y/2||e.pos.y+0.5<bx.pos.y-bx.size.y/2)continue;
        var dx=e.pos.x-bx.pos.x,dz=e.pos.z-bx.pos.z;
        var ox=bx.size.x/2+eR-Math.abs(dx),oz=bx.size.z/2+eR-Math.abs(dz);
        if(ox>0&&oz>0){
          if(ox<oz){e.pos.x+=dx>0?ox:-ox;}
          else{e.pos.z+=dz>0?oz:-oz;}
        }
      }
      e.pos.x=Math.max(-14,Math.min(14,e.pos.x));e.pos.z=Math.max(-14,Math.min(14,e.pos.z));
    }
    e.mesh.position.set(e.pos.x,e.towerPerch?e.pos.y:0,e.pos.z);
    // 轉身也做平滑，不要每幀硬切成新角度
    if(e.vel.x!==0||e.vel.z!==0||aimAtPlayer){
      var hbYaw=((e.aimYaw-e.mesh.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;
      e.mesh.rotation.y+=hbYaw*Math.min(1,dt*9);
    }
      if(aimAtPlayer&&e.gun){
        // lookAt 吃的是「世界座標點」，舊寫法拿 gun.position(局部) 去算，
        // 等於瞄準世界原點 → 槍會亂指。這裡直接給玩家的世界座標。
        e.gun.lookAt(new THREE.Vector3(pos.x,pos.y+0.5,pos.z));
      }
      // Healer staff glow pulse
      if(e.type==='healer'&&e.shootCD<0.4){
        for(var ci=0;ci<e.mesh.children.length;ci++){
          var ch=e.mesh.children[ci];
          if(ch.userData&&ch.userData.isStaff&&ch.children[1]){
            ch.children[1].material.emissiveIntensity=0.5+Math.sin(e.walkTime*6)*0.5;
          }
        }
      }
    // ── AI 互相攻擊（沒在追玩家時才執行，玩家優先）──
    if(e.aiTarget&&(e.aiTarget.hp<=0||!e.aiTarget.mesh.visible)){e.aiTarget=null;}
    // e.hybridTarget 有值＝這隻 AI 正在追遠端真人。AI 對 AI 這段是直接改寫 e.pos 的
    // （繞過上面的速度平滑），兩者同時跑會互相拉，所以優先讓追真人。
    // 舊碼要求「完全沒有 hybridTarget」才准 AI 互毆，但競技場只有 ±14，
    // 45 距離內永遠存在遠端真人 → hybridTarget 永遠有值 → AI 永遠只打真人。
    // 改成距離競爭：AI 目標明顯更近就允許互毆，保留一點隨機性避免行為死板。
    var _hrtD=e.hybridTarget?(e.hybridTarget.dist!==undefined?e.hybridTarget.dist:e.pos.distanceTo(e.hybridTarget.pos)):1e9;
    var _aiTD=e.aiTarget?e.pos.distanceTo(e.aiTarget.pos):1e9;
    var _hbAi=(hybridMode&&e.hybridAI);
    if(e.aiTarget&&e.type!=='suicider'&&e.type!=='healer'&&e.stunTimer<=0
       &&(_hbAi?(_aiTD<_hrtD*0.75||e.hybridTarget===null)
                :(!e.hasDetected&&e.state!=='chase'&&(_aiTD<_hrtD*0.75||e.hybridTarget===null)))){
      var tg=e.aiTarget;
      var toT=new THREE.Vector3().copy(tg.pos).sub(e.pos);toT.y=0;
      var dT=toT.length();
      if(dT>0.01){
        var dirT=toT.clone().normalize();
        var wantA=Math.atan2(dirT.x,dirT.z);
        var dfA=((wantA-e.mesh.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;
        e.mesh.rotation.y+=dfA*Math.min(1,dt*5);      // 平滑轉身
        var wantD=(e.type==='rusher')?2.0:11;
        var step=(dT>wantD+1?1:(dT<wantD-1?-0.7:0))*spd*0.7*dt;
        var nx2=e.pos.x+dirT.x*step,nz2=e.pos.z+dirT.z*step;
        for(var wb=0;wb<mapBoxes.length;wb++){
          var wbx=mapBoxes[wb];
          if(wbx.size.y<0.3||wbx.isDragonBoat||!wbx.mesh.visible)continue;
          if(e.pos.y>wbx.pos.y+wbx.size.y/2||e.pos.y+0.5<wbx.pos.y-wbx.size.y/2)continue;
          var wdx=nx2-wbx.pos.x,wdz=nz2-wbx.pos.z;
          var wox=wbx.size.x/2+0.3-Math.abs(wdx),woz=wbx.size.z/2+0.3-Math.abs(wdz);
          if(wox>0&&woz>0){if(wox<woz)nx2+=wdx>0?wox:-wox;else nz2+=wdz>0?woz:-woz;}
        }
        e.pos.x=Math.max(-14,Math.min(14,nx2));
        e.pos.z=Math.max(-14,Math.min(14,nz2));
        e.mesh.position.set(e.pos.x,e.pos.y,e.pos.z);
      }
      if(e.shootCD<=0&&dT<26){
        enemyShoot(e,tg.pos,tg);
        var wfr=(e.weaponType&&gunData[e.weaponType]?gunData[e.weaponType].fireRate:0.1)||0.2;
        e.shootCD=Math.max(0.3,wfr*1.6+Math.random()*wfr);
      }
      if(e.gun)e.gun.lookAt(new THREE.Vector3(tg.pos.x,tg.pos.y+0.45,tg.pos.z));
    }
    // 血條／護甲條：統一在這裡更新
    updateEnemyBars(e);
    // Healer: heal nearby damaged allies (unconditional)
    if(e.type==='healer'&&e.shootCD<=0){
      var nearest=null,nearestDist=99;
      for(var hi=0;hi<enemies.length;hi++){
        var he=enemies[hi];if(he===e||he.hp<=0)continue;
        var hd=e.pos.distanceTo(he.pos);
        if(hd<12&&he.hp<he.maxHp&&hd<nearestDist){nearest=he;nearestDist=hd;}
      }
      if(nearest){
        nearest.hp=Math.min(nearest.maxHp,nearest.hp+12);
        nearest.armor=Math.min(nearest.maxArmor,nearest.armor+6);
        showDmgNum(nearest.pos.clone(),12,'#44ff88');
        e.shootCD=0.8;
        // Green glow on healed enemy
        var hl=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),new THREE.MeshBasicMaterial({color:0x44ff88,transparent:true,opacity:0.3,depthWrite:false}));
        hl.position.copy(nearest.pos);hl.position.y=0.4;scene.add(hl);
        setTimeout(function(){scene.remove(hl);},300);
      }
    }
    // Burn damage from dragon's breath
    if(e.burnTimer>0){e.burnTimer-=dt;var bd=3;e.hp-=bd;if(e.hp<0)e.hp=0;showDmgNum(e.pos.clone().add(new THREE.Vector3(0,1,0)),bd,'#ff6600');}
    // firingNow 供移動邏輯判斷「開火時站定不動」，用完在迴圈最後才重設
    // （Hybrid 主機會在 updateEnemies 之前先由 hybridAiAttackPlayers 設定）
    e.firingNow=false;
  }
}
function showDmgNum(p3d,dmg,clr,shield,label){
  if(!clr)clr='#ff4444';
  var v=p3d.clone();v.project(cam);
  var x=(v.x*0.5+0.5)*window.innerWidth,y=(-v.y*0.5+0.5)*window.innerHeight;
  var el=document.createElement('div');
  var prefix= (clr==='#fa4'||clr==='#44ff88'||clr==='#44ff44')?'+':'-';
  el.textContent=(label?label+' ':'')+(shield?'🛡 ':'')+prefix+dmg;
  el.style.cssText='position:fixed;left:'+x+'px;top:'+y+'px;pointer-events:none;z-index:7;font-size:'+(shield?'28':'22')+'px;font-weight:bold;color:'+clr+';font-family:Arial;text-shadow:-1px -1px 2px #000,1px -1px 2px #000,-1px 1px 2px #000,1px 1px 2px #000,0 0 8px #000;opacity:1;transition:all 0.7s ease-out';
  document.body.appendChild(el);
  requestAnimationFrame(function(){el.style.transform='translateY(-35px)';el.style.opacity='0';});
  setTimeout(function(){el.remove();},750);
}
// ── Rain system ──
var rainDrops=null,rainVelocities=[];
function startRain(){
  if(rainDrops){scene.remove(rainDrops);}
  var count=2000;
  var geo=new THREE.BufferGeometry();
  var positions=new Float32Array(count*3);
  rainVelocities=[];
  for(var i=0;i<count;i++){
    positions[i*3]=(Math.random()-0.5)*50;
    positions[i*3+1]=Math.random()*20;
    positions[i*3+2]=(Math.random()-0.5)*50;
    rainVelocities.push(8+Math.random()*6);
  }
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  var mat=new THREE.PointsMaterial({color:0x6699ff,size:0.06,transparent:true,opacity:0.6});
  rainDrops=new THREE.Points(geo,mat);
  scene.add(rainDrops);
}
function stopRain(){
  if(rainDrops){scene.remove(rainDrops);rainDrops=null;rainVelocities=[];}
}
function updateRain(dt){
  if(!rainDrops)return;
  var pos=rainDrops.geometry.attributes.position.array;
  for(var i=0;i<pos.length/3;i++){
    pos[i*3+1]-=rainVelocities[i]*dt;
    if(pos[i*3+1]<-1){pos[i*3+1]=19;pos[i*3]=(Math.random()-0.5)*50;pos[i*3+2]=(Math.random()-0.5)*50;}
  }
  rainDrops.geometry.attributes.position.needsUpdate=true;
}
// ── Nuclear Map System ──
var radWaterList=[];
function spawnRadWater(){
  var corners=[[-16,0.6,-16],[16,0.6,-16],[16,0.6,16],[-16,0.6,16]];
  corners.forEach(function(c){
    var g=new THREE.Group();
    var bottle=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.1,0.3,6),new THREE.MeshStandardMaterial({color:0x44ddff,emissive:0x44ddff,emissiveIntensity:0.5}));
    bottle.position.y=0.15;
    var cap=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.05,6),new THREE.MeshStandardMaterial({color:0xffffff}));
    cap.position.y=0.3;
    var glow=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,6),new THREE.MeshBasicMaterial({color:0x44ddff,transparent:true,opacity:0.15}));
    glow.position.y=0.15;
    g.add(bottle);g.add(cap);g.add(glow);
    g.position.set(c[0],c[1],c[2]);
    scene.add(g);
    radWaterList.push({mesh:g,pos:new THREE.Vector3(c[0],c[1],c[2]),alive:true,respawnTimer:30});
  });
}
function updateRadWater(dt){
  for(var i=0;i<radWaterList.length;i++){
    var rw=radWaterList[i];
    if(!rw.alive){rw.respawnTimer-=dt;if(rw.respawnTimer<=0){rw.alive=true;rw.mesh.visible=true;}continue;}
    rw.mesh.rotation.y+=dt*2;
    if(pos.distanceTo(rw.pos)<1.2){
      radImmuneTimer=120;
      rw.alive=false;rw.mesh.visible=false;
      showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),120,'#44ddff');
    }
  }
}
function spawnCleanerWave(){
  var count=nuclearWave<=4?5:0;
  if(count===0)return;
  for(var ei=0,spawned=0;ei<enemies.length&&spawned<count;ei++){
    var e=enemies[ei];
    if(e.hp<=0){
      e.hp=e.maxHp*0.8*diffMult;e.armor=e.maxArmor*0.8*diffMult;
      e.type='cleaner';
      e.mesh.children[0].material.color.setHex(0x22aa44);
      e.visor.material.color.setHex(0x88ff44);
      e.visor.material.emissive.setHex(0x44ff22);
      e.visor.material.emissiveIntensity=0.5;
      if(e.gun)e.gun.visible=true;
      e.weaponType='watergun';
      e.isCleaner=true;
      var sp=new THREE.Vector3((Math.random()-0.5)*36,0.3,(Math.random()-0.5)*36);
      var a=Math.random()*Math.PI*2;
      sp.x+=Math.cos(a)*(8+Math.random()*6);
      sp.z+=Math.sin(a)*(8+Math.random()*6);
      sp.x=Math.max(-18,Math.min(18,sp.x));sp.z=Math.max(-18,Math.min(18,sp.z));
      e.pos.copy(sp);e.mesh.position.copy(sp);e.mesh.visible=true;e.towerPerch=null;
      if(e.hBar){e.hBar.visible=true;e.hBar.position.copy(sp);e.hBar.position.y+=CUBELING_BAR;}
      if(e.aBar){e.aBar.visible=true;e.aBar.position.copy(sp);e.aBar.position.y+=CUBELING_BAR-0.07;}
      e.knifeHits=0;e.burnTimer=0;
      e.shootCD=0;
      spawned++;
    }
  }
  document.getElementById('nuclear-wave').textContent='第 '+nuclearWave+' 波 — 0/'+5;
  document.getElementById('nuclear-wave').style.display='block';
}
function spawnBoss(){
  if(bossSpawned)return;
  bossSpawned=true;bossActive=true;
  var bg=new THREE.Group();
  // Big Among Us body
  var bodyMat=new THREE.MeshStandardMaterial({color:0xcc2222,roughness:0.3,metalness:0.2,emissive:0x440000,emissiveIntensity:0.3});
  var body=new THREE.Mesh(new THREE.SphereGeometry(0.7,14,14),bodyMat);
  body.scale.set(0.85,1.0,0.85);body.position.y=0.5;
  // Glowing red visor
  var visorMat=new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff2200,emissiveIntensity:2});
  var visor=new THREE.Mesh(new THREE.SphereGeometry(0.35,14,14,0,Math.PI*2,0,Math.PI*0.55),visorMat);
  visor.scale.set(1.1,1.4,0.55);visor.position.set(0,0.78,0.52);visor.rotation.x=-0.15;
  // White eye dot
  var eye=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));
  eye.position.set(0.09,0.83,0.57);
  // Backpack (metal box)
  var bpkMat=new THREE.MeshStandardMaterial({color:0x444444,metalness:0.6});
  var bpk=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.25),bpkMat);
  bpk.position.set(-0.35,0.55,-0.15);
  // Shoulder pads
  var padMat=new THREE.MeshStandardMaterial({color:0x555555,metalness:0.8,roughness:0.2});
  var padL=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,8),padMat);
  padL.position.set(-0.6,0.85,0);padL.scale.set(0.8,0.35,0.55);
  var padR=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,8),padMat);
  padR.position.set(0.6,0.85,0);padR.scale.set(0.8,0.35,0.55);
  // Dual gun barrels (larger)
  var gMat=new THREE.MeshStandardMaterial({color:0x777777,metalness:0.9});
  var gunL=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.7,8),gMat);gunL.rotation.x=Math.PI/2;gunL.position.set(-0.2,0.55,-0.55);
  var gunR=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.7,8),gMat);gunR.rotation.x=Math.PI/2;gunR.position.set(0.2,0.55,-0.55);
  // Gun tips glow
  var tipMat=new THREE.MeshBasicMaterial({color:0xff6600});
  var tipL=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),tipMat);tipL.position.set(-0.2,0.55,-0.9);
  var tipR=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),tipMat);tipR.position.set(0.2,0.55,-0.9);
  // Legs (two small spheres)
  var legMat=new THREE.MeshStandardMaterial({color:0x991111});
  for(var s=-1;s<=1;s+=2){var leg=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,6),legMat);leg.position.set(s*0.25,0.05,0.08);bg.add(leg);}
  bg.add(body);bg.add(visor);bg.add(eye);bg.add(bpk);bg.add(padL);bg.add(padR);bg.add(gunL);bg.add(gunR);bg.add(tipL);bg.add(tipR);
  // Spawn in front of player
  var bp=pos.clone();bp.x+=Math.cos(yaw)*8;bp.z+=Math.sin(yaw)*8;bp.y=0.3;
  bg.position.copy(bp);
  // Boss HP bar
  document.getElementById('boss-hp-wrap').style.display='flex';
  scene.add(bg);
  boss={mesh:bg,pos:bp.clone(),hp:500,maxHp:500,shootCD:0,hitTimer:0,moveTimer:0,dir:new THREE.Vector3(1,0,0),visor:visor};
  document.getElementById('nuclear-wave').textContent='☠ 核子特攻 降臨！';
  document.getElementById('nuclear-wave').style.color='#f44';
}
function updateNuclear(dt){
  if(currentMap!=='nuclear'||!gameStarted)return;
  // Radiation timer decrease
  if(radImmuneTimer>0)radImmuneTimer-=dt;
  // Wattage increase (paused during boss)
  if(!bossActive&&!bossSpawned){
    radWattage+=500/60*dt*diffMult;
    radZoneRadius=5+radWattage/200;
  }
  // Radiation damage
  if(currentMap==='nuclear'){
    var distToCenter=Math.sqrt(pos.x*pos.x+pos.z*pos.z);
    if(distToCenter<radZoneRadius&&radImmuneTimer<=0){
      // 10 HP per minute
      radDamageAccum=(radDamageAccum||0)+dt;
      var dmgInterval=6;
      if(radDamageAccum>=dmgInterval){
        radDamageAccum-=dmgInterval;
        playerHP-=1;
        if(playerHP<=0){playerHP=0;showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),1,'#ff4444');}
        else showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),1,'#44ff44');
      }
    }else{
      radDamageAccum=0;
    }
  }
  // UI update
  var pct=Math.min(100,radWattage/1200*100);
  document.getElementById('rad-bar-fill').style.width=pct+'%';
  var rw=document.getElementById('rad-watt');
  rw.textContent=Math.floor(radWattage)+' / 1200 W';
  rw.className=radWattage>1000?'critical':'';
  if(radImmuneTimer>0){
    document.getElementById('rad-label').textContent='☢ 免疫 '+(Math.ceil(radImmuneTimer))+'s';
    document.getElementById('rad-label').style.color='#4df';
  }else{
    document.getElementById('rad-label').textContent='☢ 輻射';
    document.getElementById('rad-label').style.color=distToCenter<radZoneRadius?'#f44':'rgba(0,255,100,.7)';
  }
  // Wave / Boss management
  if(!bossSpawned){
    var waveTotal=nuclearWave*5;
    if(nuclearClears>=waveTotal&&nuclearWave<4){
      nuclearWave++;
      spawnCleanerWave();
    }else if(nuclearClears>=20){
      spawnBoss();
    }
    var killsInWave=nuclearClears-((nuclearWave-1)*5);
    document.getElementById('nuclear-wave').textContent='第 '+nuclearWave+' 波 — '+Math.min(5,Math.max(0,killsInWave))+'/'+5;
  }
  // Boss HP check
  if(bossActive&&boss){
    if(boss.hp<=0){
      bossActive=false;
      achData.nuclearStreak++;saveAch();
      if(!achDone('nuclear_god')&&achData.nuclearStreak>=3)awardAch('nuclear_god');
      if(boss.mesh){scene.remove(boss.mesh);}
      document.getElementById('boss-hp-wrap').style.display='none';
      document.getElementById('nuclear-wave').textContent='☢ 核電站淨化完成！';
      document.getElementById('nuclear-wave').style.color='#4f4';
      document.getElementById('round-clear').textContent='任務成功 — 輻射步槍已解鎖！';
      document.getElementById('round-clear').style.display='block';
      // Auto-grant radrifle to all players
      weaponInventory.radrifle=(weaponInventory.radrifle||0)+1;
      try{localStorage.setItem('oc_inv',JSON.stringify(weaponInventory));}catch(e){}
      updateArmoryGunCounts();
      // Visual drop at boss position
      var dropPos=boss.pos.clone();dropPos.y=0.6;
      var dropMat=new THREE.MeshStandardMaterial({color:0x44ff44,emissive:0x22ff22,emissiveIntensity:1.5});
      var dropMesh=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.04,0.25),dropMat);
      dropMesh.position.copy(dropPos);scene.add(dropMesh);
      var dropGlow=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,8),new THREE.MeshBasicMaterial({color:0x44ff44,transparent:true,opacity:0.2,depthWrite:false}));
      dropGlow.position.copy(dropPos);scene.add(dropGlow);
      var dropLight=new THREE.PointLight(0x44ff44,1.5,4);dropLight.position.copy(dropPos);scene.add(dropLight);
      window.radRifleDrop={mesh:dropMesh,glow:dropGlow,light:dropLight,pos:dropPos};
      setTimeout(function(){
        document.getElementById('round-clear').style.display='none';
      },2500);
      gameStarted=false;
      didPlayGame=false;
      if(document.pointerLockElement)document.exitPointerLock();
      document.getElementById('blocker').style.display='flex';
      document.getElementById('start-msg').innerHTML='獲得 輻射步槍！<br><small style="color:#4f4">已解鎖至武器庫</small>';
      var xpEarned=10+Math.max(0,(roundNum-1)*2)+50;
      addXP(xpEarned);
      addProficiency();
      return;
    }
  }
  // Boss HP UI
  if(bossActive&&boss){
    var bpct=boss.hp/boss.maxHp*100;
    document.getElementById('boss-hp-fill').style.width=bpct+'%';
    document.getElementById('boss-hp-wrap').style.display='flex';
    // Boss movement
    boss.moveTimer-=dt;
    var toPos=new THREE.Vector3().copy(pos);toPos.y=0;
    var distToPlayer=boss.pos.distanceTo(toPos);
    if(distToPlayer>3){
      var moveDir=new THREE.Vector3().copy(toPos).sub(boss.pos).normalize();
      boss.pos.x+=moveDir.x*3*dt;
      boss.pos.z+=moveDir.z*3*dt;
    }
    // Strafe when close
    if(distToPlayer<8&&boss.moveTimer<=0){
      boss.moveTimer=0.5+Math.random()*0.5;
      var rgt=new THREE.Vector3(-(pos.x-boss.pos.x),0,pos.z-boss.pos.z).normalize();
      boss.dir=rgt.clone().multiplyScalar(Math.random()<0.5?1:-1);
    }
    if(distToPlayer<8){
      boss.pos.x+=boss.dir.x*2*dt;
      boss.pos.z+=boss.dir.z*2*dt;
    }
    // Boss melee damage when very close
    if(distToPlayer<1.5&&boss.shootCD<=0.4){
      playerDamage(Math.round(10*diffMult),boss.pos);slowTimer=0.3;showDmgNum(pos.clone(),Math.round(10*diffMult),'#ff4444');
    }
    // Clamp to map
    boss.pos.x=Math.max(-18,Math.min(18,boss.pos.x));
    boss.pos.z=Math.max(-18,Math.min(18,boss.pos.z));
    boss.mesh.position.copy(boss.pos);
    boss.mesh.rotation.y=Math.atan2(pos.x-boss.pos.x,pos.z-boss.pos.z);
    // Boss shoot AI — aim at player camera
    boss.shootCD-=dt;
    if(boss.shootCD<=0){
      boss.shootCD=0.6;
      for(var bi=-1;bi<=1;bi+=2){
        var eyeH=EYE_H||0.85;
        var bDir=new THREE.Vector3(pos.x-boss.pos.x+bi*0.3,pos.y+eyeH-boss.pos.y-0.6,pos.z-boss.pos.z).normalize();
        bDir.x+=(Math.random()-0.5)*0.1;
        bDir.y+=(Math.random()-0.5)*0.08;
        bDir.normalize();
        var bRay=new THREE.Raycaster(boss.pos.clone().add(new THREE.Vector3(bi*0.18,0.6,0)),bDir);
        var bHit=bRay.intersectObject(cam,true);
        if(bHit.length>0&&bHit[0].distance<35){
          hitMarkerTimer=0.15;
          var bDmg=18;
          if(playerArmor>0){var od=bDmg;playerArmor-=bDmg;if(playerArmor<0){od=-playerArmor;playerArmor=0}else od=0;if(playerArmor===0)showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),bDmg,'#f62',true);else showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),bDmg,'#4488ff');if(od>0){playerHP-=od;if(playerHP<0)playerHP=0;showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),od,'#ff4444')}}
          else{playerHP-=bDmg;if(playerHP<0)playerHP=0;showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),bDmg,'#ff4444')}
        }
      }
      // Muzzle flash
      var mf=new THREE.Mesh(new THREE.SphereGeometry(0.12,4,4),new THREE.MeshBasicMaterial({color:0xff8800}));
      mf.position.copy(boss.pos);mf.position.y+=0.6;scene.add(mf);
      setTimeout(function(){scene.remove(mf);},50);
    }
    // Boss visor glow pulse
    if(boss.visor&&boss.visor.material){
      boss.visor.material.emissiveIntensity=1.5+Math.sin(Date.now()*0.004)*0.8;
    }
    // Boss hit timer (visual feedback)
    if(boss.hitTimer>0){boss.hitTimer-=dt;boss.mesh.children.forEach(function(c){c.material&&c.material.emissive&&(c.material.emissiveIntensity=0.5+Math.sin(boss.hitTimer*30)*0.5);});}
  }
  // Check reactor explosion (at 1200W)
  if(radWattage>=1200){
    var explPos=new THREE.Vector3(0,0.5,0);
    var flash=new THREE.Mesh(new THREE.SphereGeometry(2,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1}));
    flash.position.copy(explPos);scene.add(flash);
    var shockwave=new THREE.Mesh(new THREE.RingGeometry(0.2,2,24),new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:1,side:THREE.DoubleSide}));
    shockwave.position.copy(explPos);shockwave.rotation.x=-Math.PI/2;scene.add(shockwave);
    playerHP=0;
    showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),999,'#ff4400');
    document.getElementById('round-clear').textContent='☢ 反應爐爆炸 — 任務失敗';
    document.getElementById('round-clear').style.color='#f44';
    document.getElementById('round-clear').style.display='block';
    gameStarted=false;
    var explTime=0;
    var shakeAccum=0;
    var explInt=setInterval(function(){
      explTime+=0.033;
      var p=explTime/2;
      flash.material.opacity=1-p;
      shockwave.material.opacity=1-p;
      var swScale=1+p*8;
      shockwave.scale.set(swScale,swScale,swScale);
      shakeAccum+=0.033;
      if(shakeAccum>0.05){
        shakeAccum=0;
        cam.position.x+=(Math.random()-0.5)*0.6;
        cam.position.y+=(Math.random()-0.5)*0.6;
      }
      if(p>=1){
        scene.remove(flash);scene.remove(shockwave);
        clearInterval(explInt);
        document.getElementById('round-clear').style.display='none';
        document.getElementById('round-clear').style.color='#4f4';
        onPlayerDeath();
      }
    },33);
  }
}
// ── Boss Rush System ──
var bossAtkLabelEl=null;
function showBossAtkLabel(name){
  if(!bossAtkLabelEl){
    bossAtkLabelEl=document.createElement('div');
    bossAtkLabelEl.style.cssText='position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);z-index:20;font-size:26px;font-weight:bold;color:#ff8844;font-family:Arial;text-shadow:0 0 20px rgba(255,136,68,.8),0 0 40px rgba(255,68,0,.4);pointer-events:none;opacity:0;transition:opacity 0.5s ease-out';
    document.body.appendChild(bossAtkLabelEl);
  }
  bossAtkLabelEl.textContent=name;
  bossAtkLabelEl.style.opacity='1';
  if(bossAtkLabelEl._atkTimer)clearTimeout(bossAtkLabelEl._atkTimer);
  bossAtkLabelEl._atkTimer=setTimeout(function(){if(bossAtkLabelEl)bossAtkLabelEl.style.opacity='0';},600);
}
var bossFlashMesh=null;
function bossMuzzleFlash(worldPos){
  if(!bossFlashMesh){
    bossFlashMesh=new THREE.Mesh(new THREE.SphereGeometry(0.09,4,4),new THREE.MeshBasicMaterial({color:0xff8800}));
    scene.add(bossFlashMesh);
  }
  bossFlashMesh.position.copy(worldPos);
  bossFlashMesh.visible=true;
  bossFlashMesh.scale.setScalar(1);
  if(bossFlashMesh._fTimer)clearTimeout(bossFlashMesh._fTimer);
  bossFlashMesh._fTimer=setTimeout(function(){if(bossFlashMesh)bossFlashMesh.visible=false;},120);
}
// ── Boss Summon Helper ──
var bossFrostPatches=[];
function spawnBossMinion(origin,hp){
  var g=new THREE.Group();
  var bm=new THREE.MeshStandardMaterial({color:0x8844aa,roughness:0.4,metalness:0.3});
  var bd=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,8),bm);bd.scale.set(0.85,1,0.85);bd.position.y=0.3;g.add(bd);
  var vs=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8,0,Math.PI*2,0,Math.PI*0.55),new THREE.MeshStandardMaterial({color:0xcc66ff,emissive:0xaa44ff,emissiveIntensity:0.8}));vs.scale.set(1,1.3,0.6);vs.position.set(0,0.42,0.28);g.add(vs);
  g.position.copy(origin);g.position.y=0;scene.add(g);
  var hBar=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.05),new THREE.MeshBasicMaterial({color:0xcc44ff,depthTest:false}));hBar.position.set(origin.x,0.8,origin.z);scene.add(hBar);
  var m={mesh:g,pos:origin.clone(),hp:hp||40,maxHp:hp||40,state:'chase',shootCD:0,walkTime:0,hBar:hBar,aBar:null,knifeHits:0,type:'summon',weaponType:'deagle',investigateTarget:null,searchTimer:0,shieldMesh:null,chargeTimer:0,burnTimer:0};
  bossSummoned.push(m);
}
function spawnFrostPatch(worldPos,radius){
  var geo=new THREE.CircleGeometry(radius||2.5,16);
  var mat=new THREE.MeshBasicMaterial({color:0x88ccff,transparent:true,opacity:0.2,side:THREE.DoubleSide,depthWrite:false});
  var mesh=new THREE.Mesh(geo,mat);mesh.rotation.x=-Math.PI/2;mesh.position.copy(worldPos);mesh.position.y=0.02;scene.add(mesh);
  bossFrostPatches.push({mesh:mesh,pos:worldPos.clone(),radius:radius||2.5,timer:5});
}
var bossProjectiles=[];
function spawnBossProj(origin,dir,speed,maxRange,dmg,color,size){
  var sz=size||0.08;
  var mesh=new THREE.Mesh(new THREE.SphereGeometry(sz,6,6),new THREE.MeshBasicMaterial({color:color||0xff4400}));
  mesh.position.copy(origin);
  scene.add(mesh);
  var trail=new THREE.Mesh(new THREE.SphereGeometry(sz*0.5,4,4),new THREE.MeshBasicMaterial({color:color||0xff4400,transparent:true,opacity:0.4}));
  trail.position.copy(origin);
  scene.add(trail);
  bossProjectiles.push({mesh:mesh,trail:trail,pos:origin.clone(),vel:dir.clone().multiplyScalar(speed),range:maxRange,dist:0,dmg:dmg,alive:true});
}
function updateBossProjectiles(dt){
  for(var i=bossProjectiles.length-1;i>=0;i--){
    var bp=bossProjectiles[i];
    if(!bp.alive)continue;
    bp.trail.position.copy(bp.pos);
    bp.pos.x+=bp.vel.x*dt;bp.pos.y+=bp.vel.y*dt;bp.pos.z+=bp.vel.z*dt;
    bp.mesh.position.copy(bp.pos);
    bp.dist+=bp.vel.length()*dt;
    if(bp.pos.distanceTo(pos)<0.6){bp.alive=false;disposeMesh(bp.mesh);disposeMesh(bp.trail);hitMarkerTimer=0.15;playerDamage(bp.dmg,bp.pos);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),bp.dmg,'#ff4444');bossProjectiles.splice(i,1);continue;}
    if(bp.dist>bp.range){bp.alive=false;disposeMesh(bp.mesh);disposeMesh(bp.trail);bossProjectiles.splice(i,1);}
  }
}
var bossRushList=[
  {id:'nuclear',name:'核子特攻',hp:500,color:0xcc2222},
  {id:'crusher',name:'粉碎者',hp:800,color:0x884422},
  {id:'turret',name:'旋轉砲台',hp:400,color:0x226688},
  {id:'ghost',name:'相位幽靈',hp:350,color:0x22aa66},
  {id:'laser',name:'雷射監視者',hp:650,color:0x8822aa},
  {id:'gemini',name:'雙子',hp:500,color:0xaa44aa},
  {id:'summoner',name:'召喚者',hp:450,color:0x8844aa},
  {id:'splitter',name:'分裂者',hp:600,color:0xaa8822},
  {id:'frost',name:'冰霜領主',hp:550,color:0x4488cc}
];
function getBossRushType(wave){
  return bossRushList[(wave-1)%bossRushList.length];
}
function spawnBossRush(){
  if(bossSpawned||!bossRushMode)return;
  bossSpawned=true;bossActive=true;
  var bt=getBossRushType(bossRushWave);
  bossType=bt.id;
  var scaleMult=1+Math.floor((bossRushWave-1)/bossRushList.length)*0.3;
  var hp=Math.round(bt.hp*scaleMult);
  var bg=new THREE.Group();
  var bm=new THREE.MeshStandardMaterial({color:bt.color,roughness:0.3,metalness:0.3});
  var gm=new THREE.MeshStandardMaterial({color:0xcccccc,metalness:0.8});
  var em=new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff2200,emissiveIntensity:2});
  if(bt.id==='nuclear'){
    var body=new THREE.Mesh(new THREE.SphereGeometry(0.65,12,12),bm);body.scale.set(0.85,1,0.85);body.position.y=0.5;bg.add(body);
    var visor=new THREE.Mesh(new THREE.SphereGeometry(0.3,12,12,0,Math.PI*2,0,Math.PI*0.55),em);visor.scale.set(1.1,1.4,0.55);visor.position.set(0,0.75,0.5);visor.rotation.x=-0.15;bg.add(visor);
    var eye=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),new THREE.MeshBasicMaterial({color:0xffffff}));eye.position.set(0.08,0.8,0.55);bg.add(eye);
    var gl=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.6,6),gm);gl.rotation.x=Math.PI/2;gl.position.set(-0.18,0.5,-0.5);bg.add(gl);
    var gr=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.6,6),gm);gr.rotation.x=Math.PI/2;gr.position.set(0.18,0.5,-0.5);bg.add(gr);
    for(var s=-1;s<=1;s+=2){var leg=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,6),bm);leg.position.set(s*0.22,0.05,0.06);bg.add(leg);}
  }else if(bt.id==='crusher'){
    var body=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.7,0.8),bm);body.position.y=0.4;bg.add(body);
    var head=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.25,0.35),bm);head.position.set(0,0.78,0.2);bg.add(head);
    var eye2=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,6),em);eye2.position.set(0,0.8,0.35);bg.add(eye2);
    for(var s=-1;s<=1;s+=2){var arm=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.35,6),bm);arm.rotation.z=s*0.4;arm.position.set(s*0.5,0.5,-0.1);bg.add(arm);}
    for(var s=-1;s<=1;s+=2){var leg2=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.2,0.18),bm);leg2.position.set(s*0.28,0.04,0);bg.add(leg2);}
  }else if(bt.id==='turret'){
    var base=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.2,10),gm);base.position.y=0.1;bg.add(base);
    var body2=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.35,0.4,10),bm);body2.position.y=0.35;bg.add(body2);
    var ring=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.04,6,12),em);ring.rotation.x=Math.PI/2;ring.position.y=0.4;bg.add(ring);
    var core=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:3}));core.position.y=0.4;bg.add(core);
    for(var ai=0;ai<6;ai++){var ang=ai/6*Math.PI*2;var tb=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.12,4),gm);tb.rotation.x=Math.PI/2;tb.position.set(Math.cos(ang)*0.35,0.4,Math.sin(ang)*0.35);bg.add(tb);}
  }else if(bt.id==='ghost'){
    var body3=new THREE.Mesh(new THREE.SphereGeometry(0.45,10,10),new THREE.MeshStandardMaterial({color:bt.color,transparent:true,opacity:0.6,roughness:0.2}));body3.position.y=0.45;bg.add(body3);
    var inner=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8),em);inner.position.set(0,0.5,0.35);bg.add(inner);
    var trail1=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,6),new THREE.MeshStandardMaterial({color:bt.color,transparent:true,opacity:0.3}));trail1.position.set(0.2,0.2,-0.3);bg.add(trail1);
    var trail2=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,6),new THREE.MeshStandardMaterial({color:bt.color,transparent:true,opacity:0.2}));trail2.position.set(-0.15,0.15,-0.35);bg.add(trail2);
  }else if(bt.id==='laser'){
    var base2=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,0.15,8),gm);base2.position.y=0.08;bg.add(base2);
    var pyr=new THREE.Mesh(new THREE.ConeGeometry(0.35,0.55,6),bm);pyr.position.y=0.4;bg.add(pyr);
    var lens2=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),em);lens2.position.set(0,0.55,-0.25);bg.add(lens2);
    var glowRing=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.025,6,12),new THREE.MeshStandardMaterial({color:0xff00ff,emissive:0xff00aa,emissiveIntensity:1}));glowRing.position.set(0,0.55,-0.25);bg.add(glowRing);
  }else if(bt.id==='gemini'){
    var colA=bt.color,colB=new THREE.Color(bt.color).multiplyScalar(0.6).getHex();
    for(var gi=-1;gi<=1;gi+=2){
      var gBody=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,8),new THREE.MeshStandardMaterial({color:gi<0?colA:colB,roughness:0.3,metalness:0.4}));gBody.position.set(gi*0.35,0.35,0);bg.add(gBody);
      var gEye2=new THREE.Mesh(new THREE.SphereGeometry(0.04,6,6),em);gEye2.position.set(gi*0.35+gi*0.08,0.4,0.2);bg.add(gEye2);
    }
    var beamLine=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.5),new THREE.MeshStandardMaterial({color:0xff88ff,emissive:0xff44ff,emissiveIntensity:0.5}));beamLine.position.set(0,0.35,0);bg.add(beamLine);
  }else if(bt.id==='summoner'){
    var body=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,0.7,8),bm);body.position.y=0.35;bg.add(body);
    var hood=new THREE.Mesh(new THREE.ConeGeometry(0.4,0.5,8),new THREE.MeshStandardMaterial({color:0x6633aa,roughness:0.5}));hood.position.y=0.95;bg.add(hood);
    var orb=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshStandardMaterial({color:0xcc66ff,emissive:0xaa44ff,emissiveIntensity:2}));orb.position.set(0,0.5,0.4);bg.add(orb);
    var staff=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.8,6),gm);staff.position.set(0.3,0.4,0.15);staff.rotation.z=0.15;bg.add(staff);
    var staffOrb=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),new THREE.MeshStandardMaterial({color:0xff66ff,emissive:0xff44ff,emissiveIntensity:1.5}));staffOrb.position.set(0.3,0.82,0.15);bg.add(staffOrb);
  }else if(bt.id==='splitter'){
    var body=new THREE.Mesh(new THREE.DodecahedronGeometry(0.45,0),bm);body.position.y=0.45;bg.add(body);
    var core=new THREE.Mesh(new THREE.OctahedronGeometry(0.18,0),new THREE.MeshStandardMaterial({color:0xffcc44,emissive:0xffaa00,emissiveIntensity:1.5}));core.position.y=0.45;bg.add(core);
    var ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.03,6,12),new THREE.MeshStandardMaterial({color:0xddaa22,emissive:0xcc8800,emissiveIntensity:0.5}));ring.rotation.x=Math.PI/2;ring.position.y=0.45;bg.add(ring);
  }else if(bt.id==='frost'){
    var body=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.5,0.8,6),new THREE.MeshStandardMaterial({color:0x6699cc,roughness:0.2,metalness:0.5}));body.position.y=0.4;bg.add(body);
    var crown1=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.25,4),new THREE.MeshStandardMaterial({color:0xaaddff,emissive:0x88ccff,emissiveIntensity:0.8}));crown1.position.set(-0.15,0.9,0);bg.add(crown1);
    var crown2=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.3,4),new THREE.MeshStandardMaterial({color:0xaaddff,emissive:0x88ccff,emissiveIntensity:0.8}));crown2.position.set(0.15,0.92,0);bg.add(crown2);
    var crown3=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.2,4),new THREE.MeshStandardMaterial({color:0xccddff,emissive:0x88ccff,emissiveIntensity:0.6}));crown3.position.set(0,0.95,0.1);bg.add(crown3);
    var eyeL=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshBasicMaterial({color:0x88ddff}));eyeL.position.set(-0.1,0.55,0.35);bg.add(eyeL);
    var eyeR=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6),new THREE.MeshBasicMaterial({color:0x88ddff}));eyeR.position.set(0.1,0.55,0.35);bg.add(eyeR);
  }
  var bp=pos.clone();bp.x+=Math.cos(yaw)*7;bp.z+=Math.sin(yaw)*7;bp.y=0.3;
  bg.position.copy(bp);
  bg.scale.setScalar(scaleMult);
  boss={mesh:bg,pos:bp.clone(),hp:hp,maxHp:hp,shootCD:1,hitTimer:0,moveTimer:0,chargeCD:0,teleportCD:0,laserTimer:0,turretAngle:0,phase:0,type:bt.id};
  document.getElementById('boss-hp-wrap').style.display='flex';
  document.getElementById('boss-hp-wrap').querySelector('#boss-label').textContent='☠ '+bt.name+' Lv.'+bossRushWave;
  scene.add(bg);
}
function updateBossRush(dt){
  if(!bossActive||!boss||!bossRushMode)return;
  // Boss HP bar
  var bpct=boss.hp/boss.maxHp*100;
  document.getElementById('boss-hp-fill').style.width=bpct+'%';
  if(boss.mesh)boss.mesh.position.copy(boss.pos);
  var toPos2=new THREE.Vector3().copy(pos);toPos2.y=0;
  var dist2=boss.pos.distanceTo(toPos2);
  // Shared: face player
  if(boss.mesh)boss.mesh.rotation.y=Math.atan2(pos.x-boss.pos.x,pos.z-boss.pos.z);
  boss.shootCD-=dt;
  if(bossType==='nuclear'){
    if(dist2>2.5){var md2=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss.pos.x+=md2.x*2.8*dt;boss.pos.z+=md2.z*2.8*dt;}
    if(boss.shootCD<=0){
      boss.shootCD=1.2;
      showBossAtkLabel('🔫 雙槍掃射');
      var recoilDir2=new THREE.Vector3().copy(boss.pos).sub(toPos2).normalize();
      for(var bi=-1;bi<=1;bi+=2){
        var bDir2=new THREE.Vector3(pos.x-boss.pos.x+bi*0.25,pos.y+0.6-boss.pos.y,pos.z-boss.pos.z).normalize();
        bDir2.x+=(Math.random()-0.5)*0.1;bDir2.y+=(Math.random()-0.5)*0.08;bDir2.normalize();
        spawnBossProj(boss.pos.clone().add(new THREE.Vector3(bi*0.16,0.55,0)),bDir2,14,25,Math.round(15*diffMult),0xff4400,0.06);
        var mzPos=new THREE.Vector3(bi*0.16,0.55,0);if(boss.mesh)mzPos.applyQuaternion(boss.mesh.quaternion);mzPos.add(boss.pos);bossMuzzleFlash(mzPos);
      }
      boss.pos.x+=recoilDir2.x*0.12;boss.pos.z+=recoilDir2.z*0.12;
    }
  }else if(bossType==='crusher'){
    boss.chargeCD-=dt;
    if(boss.chargeCD<=0&&dist2>3&&dist2<12){
      boss.chargeCD=3+Math.random()*2;
      boss.phase=1;
      boss._chTime=0.6;
      var chDir=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();
      boss._chDir=chDir;
      showBossAtkLabel('💥 暴衝撞擊');
    }
    if(boss.phase===1){
      if(boss._chTime>0){boss._chTime-=dt;boss.pos.x+=boss._chDir.x*12*dt;boss.pos.z+=boss._chDir.z*12*dt;if(dist2<2||boss._chTime<=0){boss.phase=0;if(dist2<2.5){showBossAtkLabel('👊 震地重擊');var slamDmg=Math.round(25*diffMult);playerDamage(slamDmg,boss.pos);slowTimer=1;showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),slamDmg,'#ff4444');var mzPos2=boss.pos.clone();mzPos2.y+=0.3;bossMuzzleFlash(mzPos2);}}}
    }else{
      if(dist2>2.5){var md2=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss.pos.x+=md2.x*2.8*dt;boss.pos.z+=md2.z*2.8*dt;}
    }
    if(boss.shootCD<=0&&boss.phase===0){
      boss.shootCD=1.2;
      if(dist2<3){showBossAtkLabel('✊ 近戰揮擊');var sd=Math.round(12*diffMult);playerDamage(sd,boss.pos);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),sd,'#ff4444');var mzPos3=boss.pos.clone();mzPos3.y+=0.3;bossMuzzleFlash(mzPos3);}
      else if(dist2<10){showBossAtkLabel('🔶 衝擊波');var wDir3=new THREE.Vector3(pos.x-boss.pos.x,pos.y+0.6-boss.pos.y,pos.z-boss.pos.z).normalize();wDir3.x+=(Math.random()-0.5)*0.08;wDir3.y+=(Math.random()-0.5)*0.06;wDir3.normalize();spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.5,0)),wDir3,10,16,Math.round(15*diffMult),0xff8844,0.1);var mzPos4=boss.pos.clone();mzPos4.y+=0.4;bossMuzzleFlash(mzPos4);var recoilDir2=new THREE.Vector3().copy(boss.pos).sub(toPos2).normalize();boss.pos.x+=recoilDir2.x*0.1;boss.pos.z+=recoilDir2.z*0.1;}
    }
  }else if(bossType==='turret'){
    boss.turretAngle+=dt*1.5;
    if(boss.mesh)boss.mesh.rotation.y=boss.turretAngle;
    boss._gunCD=(boss._gunCD||0)-dt;
    if(boss.shootCD<=0){
      boss.shootCD=1.6;
      showBossAtkLabel('🌀 旋轉彈幕');
      for(var ri=0;ri<8;ri++){
        var ra=boss.turretAngle+ri/8*Math.PI*2;
        var rDir2=new THREE.Vector3(Math.sin(ra),-0.1,Math.cos(ra)).normalize();
        spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.4,0)),rDir2,10,20,Math.round(8*diffMult),0x4488ff,0.05);
      }
      var mzPos5=boss.pos.clone();mzPos5.y+=0.4;bossMuzzleFlash(mzPos5);
      // Also fire an aimed shot
      if(boss._gunCD<=0){
        boss._gunCD=0.8;
        var taDir2=new THREE.Vector3(pos.x-boss.pos.x,pos.y+0.5-boss.pos.y,pos.z-boss.pos.z).normalize();
        taDir2.x+=(Math.random()-0.5)*0.06;taDir2.y+=(Math.random()-0.5)*0.05;taDir2.normalize();
        spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.4,0)),taDir2,12,24,Math.round(12*diffMult),0x66aaff,0.07);
        var mzPos6=boss.pos.clone();mzPos6.y+=0.45;bossMuzzleFlash(mzPos6);
      }
    }
  }else if(bossType==='ghost'){
    boss.teleportCD-=dt;
    if(boss.teleportCD<=0&&dist2>4){
      boss.teleportCD=2.5+Math.random()*1.5;
      var tpPos=getRandomSpawnPos(true,pos,6);
      boss.pos.copy(tpPos);
      if(boss.mesh)boss.mesh.position.copy(boss.pos);
      showBossAtkLabel('👻 相位轉移');
    }
    if(dist2>3){var md2=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss.pos.x+=md2.x*3.5*dt;boss.pos.z+=md2.z*3.5*dt;}
    if(boss.shootCD<=0){
      boss.shootCD=1.0;
      showBossAtkLabel('🔮 靈能連射');
      for(var bi=-1;bi<=1;bi+=2){
        var gDir2=new THREE.Vector3(pos.x-boss.pos.x+bi*0.2,pos.y+0.5-boss.pos.y,pos.z-boss.pos.z).normalize();
        gDir2.x+=(Math.random()-0.5)*0.12;gDir2.y+=(Math.random()-0.5)*0.1;gDir2.normalize();
        spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.4,0)),gDir2,12,22,Math.round(12*diffMult),0x44ff88,0.06);
      }
      var mzPos7=boss.pos.clone();mzPos7.y+=0.4;bossMuzzleFlash(mzPos7);
    }
  }else if(bossType==='laser'){
    boss.laserTimer+=dt*0.6;
    var lAng=boss.laserTimer;
    if(dist2<3){showBossAtkLabel('⚡ 電擊脈衝');var ld=Math.round(10*diffMult);playerDamage(ld,boss.pos);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),ld,'#ff4444');}
    if(boss.shootCD<=0){
      boss.shootCD=0.6;
      var lDir=new THREE.Vector3(Math.sin(lAng)*0.4,Math.sin(lAng*0.5)*0.15,Math.cos(lAng)).normalize();
      var lRay=new THREE.Raycaster(boss.pos.clone().add(new THREE.Vector3(0,0.4,0)),lDir);
      var lHit=lRay.intersectObject(cam,true);
      if(lHit.length>0&&lHit[0].distance<30){showBossAtkLabel('⚡ 雷射掃射');var ld2=Math.round(6*diffMult);hitMarkerTimer=0.15;playerDamage(ld2,boss.pos);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),ld2,'#ff4444');}
      var mzPos8=boss.pos.clone();mzPos8.y+=0.45;bossMuzzleFlash(mzPos8);
    }
  }else if(bossType==='gemini'){
    if(dist2>3){var md2=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss.pos.x+=md2.x*2.5*dt;boss.pos.z+=md2.z*2.5*dt;}
    if(boss.shootCD<=0){
      boss.shootCD=0.9;
      showBossAtkLabel('🔮 雙子射擊');
      var gDir3=new THREE.Vector3(pos.x-boss.pos.x,pos.y+0.6-boss.pos.y,pos.z-boss.pos.z).normalize();
      gDir3.x+=(Math.random()-0.5)*0.08;gDir3.y+=(Math.random()-0.5)*0.08;gDir3.normalize();
      spawnBossProj(boss.pos.clone().add(new THREE.Vector3(-0.35,0.3,0)),gDir3,11,22,Math.round(10*diffMult),0xaa44ff,0.07);
      spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0.35,0.3,0)),gDir3,11,22,Math.round(10*diffMult),0xcc66ff,0.07);
      var mzPos9=new THREE.Vector3(-0.35,0.3,0);if(boss.mesh)mzPos9.applyQuaternion(boss.mesh.quaternion);mzPos9.add(boss.pos);bossMuzzleFlash(mzPos9);
      var mzPos10=new THREE.Vector3(0.35,0.3,0);if(boss.mesh)mzPos10.applyQuaternion(boss.mesh.quaternion);mzPos10.add(boss.pos);bossMuzzleFlash(mzPos10);
    }
  }else if(bossType==='summoner'){
    if(dist2>4){var md2=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss.pos.x+=md2.x*2.2*dt;boss.pos.z+=md2.z*2.2*dt;}
    boss._summonCD=(boss._summonCD||0)-dt;
    if(boss._summonCD<=0&&bossSummoned.length<4){
      boss._summonCD=4+Math.random()*2;
      showBossAtkLabel('👻 召喚仆從');
      for(var si=0;si<2;si++){
        var ang=Math.random()*Math.PI*2;
        var sp2=boss.pos.clone().add(new THREE.Vector3(Math.cos(ang)*2,0,Math.sin(ang)*2));
        spawnBossMinion(sp2,30+bossRushWave*5);
      }
    }
    if(boss.shootCD<=0){
      boss.shootCD=1.4;
      showBossAtkLabel('🔮 奧術飛彈');
      for(var bi=-1;bi<=1;bi+=2){
        var sDir=new THREE.Vector3(pos.x-boss.pos.x+bi*0.2,pos.y+0.5-boss.pos.y,pos.z-boss.pos.z).normalize();
        sDir.x+=(Math.random()-0.5)*0.1;sDir.y+=(Math.random()-0.5)*0.08;sDir.normalize();
        spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.5,0)),sDir,10,22,Math.round(12*diffMult),0xcc66ff,0.06);
      }
      var mzPos=boss.pos.clone();mzPos.y+=0.5;bossMuzzleFlash(mzPos);
    }
  }else if(bossType==='splitter'){
    if(dist2>3){var md2=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss.pos.x+=md2.x*3*dt;boss.pos.z+=md2.z*3*dt;}
    boss.chargeCD-=dt;
    if(boss.chargeCD<=0&&dist2>3&&dist2<12){
      boss.chargeCD=3+Math.random()*2;boss.phase=1;boss._chTime=0.5;
      var chDir=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss._chDir=chDir;
      showBossAtkLabel('💥 蓄力衝撞');
    }
    if(boss.phase===1){
      if(boss._chTime>0){boss._chTime-=dt;boss.pos.x+=boss._chDir.x*14*dt;boss.pos.z+=boss._chDir.z*14*dt;if(dist2<2||boss._chTime<=0){boss.phase=0;if(dist2<2.5){var sd=Math.round(20*diffMult);playerDamage(sd,boss.pos);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),sd,'#ff4444');}}}
    }
    if(boss.shootCD<=0&&boss.phase===0){
      boss.shootCD=1.0;
      showBossAtkLabel('💣 分裂彈幕');
      for(var ri=0;ri<6;ri++){
        var ra=ri/6*Math.PI*2;
        var rDir=new THREE.Vector3(Math.sin(ra),0.1,Math.cos(ra)).normalize();
        spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.4,0)),rDir,8,18,Math.round(10*diffMult),0xddaa22,0.07);
      }
      var mzPos=boss.pos.clone();mzPos.y+=0.4;bossMuzzleFlash(mzPos);
    }
  }else if(bossType==='frost'){
    if(dist2>5){var md2=new THREE.Vector3().copy(toPos2).sub(boss.pos).normalize();boss.pos.x+=md2.x*2*dt;boss.pos.z+=md2.z*2*dt;}
    boss._frostCD=(boss._frostCD||0)-dt;
    if(boss._frostCD<=0){
      boss._frostCD=6+Math.random()*3;
      showBossAtkLabel('❄ 冰霜結界');
      spawnFrostPatch(boss.pos.clone(),3);
      for(var fi=0;fi<8;fi++){
        var fa=fi/8*Math.PI*2;
        var fDir=new THREE.Vector3(Math.sin(fa),0.05,Math.cos(fa)).normalize();
        spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.5,0)),fDir,7,20,Math.round(8*diffMult),0x88ccff,0.08);
      }
      var mzPos=boss.pos.clone();mzPos.y+=0.5;bossMuzzleFlash(mzPos);
    }
    if(boss.shootCD<=0){
      boss.shootCD=0.8;
      showBossAtkLabel('🧊 寒冰箭');
      var fDir=new THREE.Vector3(pos.x-boss.pos.x,pos.y+0.5-boss.pos.y,pos.z-boss.pos.z).normalize();
      fDir.x+=(Math.random()-0.5)*0.12;fDir.y+=(Math.random()-0.5)*0.1;fDir.normalize();
      spawnBossProj(boss.pos.clone().add(new THREE.Vector3(0,0.5,0)),fDir,9,25,Math.round(10*diffMult),0xaaddff,0.07);
      var mzPos=boss.pos.clone();mzPos.y+=0.5;bossMuzzleFlash(mzPos);
      slowTimer=Math.max(slowTimer||0,0.8);
    }
  }
  // Clamp to map bounds
  var mb=getMapBounds();
  boss.pos.x=Math.max(mb.minX+1,Math.min(mb.maxX-1,boss.pos.x));
  boss.pos.z=Math.max(mb.minZ+1,Math.min(mb.maxZ-1,boss.pos.z));
  // Update frost patches
  for(var fi=bossFrostPatches.length-1;fi>=0;fi--){
    var fp=bossFrostPatches[fi];fp.timer-=dt;
    if(fp.timer<=0){scene.remove(fp.mesh);bossFrostPatches.splice(fi,1);continue;}
    if(fp.timer<1&&fp.mesh)fp.mesh.material.opacity=0.2*(fp.timer);
    var pDist=fp.pos.distanceTo(pos);
    if(pDist<fp.radius){slowTimer=Math.max(slowTimer||0,0.3);playerDamage(Math.round(3*diffMult));}
  }
  // Update summoned minions
  for(var si=bossSummoned.length-1;si>=0;si--){
    var sm=bossSummoned[si];
    if(sm.hp<=0){if(sm.mesh)scene.remove(sm.mesh);if(sm.hBar)scene.remove(sm.hBar);bossSummoned.splice(si,1);continue;}
    var toP=new THREE.Vector3().copy(pos);toP.y=0;
    var sDist=sm.pos.distanceTo(toP);
    if(sDist>2){var sDir=new THREE.Vector3().copy(toP).sub(sm.pos).normalize();sm.pos.x+=sDir.x*4*dt;sm.pos.z+=sDir.z*4*dt;}
    if(sm.mesh)sm.mesh.position.copy(sm.pos);
    if(sm.hBar){sm.hBar.position.set(sm.pos.x,0.8,sm.pos.z);sm.hBar.lookAt(cam.position);}
    sm.shootCD-=dt;
    if(sm.shootCD<=0&&sDist<15){
      sm.shootCD=1.2+Math.random();
      var sProjDir=new THREE.Vector3(pos.x-sm.pos.x,pos.y+0.4-sm.pos.y,pos.z-sm.pos.z).normalize();
      sProjDir.x+=(Math.random()-0.5)*0.15;sProjDir.y+=(Math.random()-0.5)*0.1;sProjDir.normalize();
      spawnBossProj(sm.pos.clone().add(new THREE.Vector3(0,0.4,0)),sProjDir,8,18,Math.round(6*diffMult),0xcc66ff,0.05);
    }
  }
  // Hit flash
  if(boss.hitTimer>0){boss.hitTimer-=dt;if(boss.mesh)boss.mesh.children.forEach(function(c){c.material&&c.material.emissive&&(c.material.emissiveIntensity=0.5+Math.sin(boss.hitTimer*30)*0.5);});}
  // Death check
  if(boss.hp<=0){
    // Splitter death: split into 2 mini bosses
    if(bossType==='splitter'&&!boss._split){
      boss._split=true;boss.hp=Math.round(boss.maxHp*0.3);boss.maxHp=boss.hp;
      var bp1=boss.pos.clone().add(new THREE.Vector3(2,0,0));var bp2=boss.pos.clone().add(new THREE.Vector3(-2,0,0));
      spawnBossMinion(bp1,boss.hp);spawnBossMinion(bp2,boss.hp);
      boss.pos.add(new THREE.Vector3(0,0,3));
      showBossAtkLabel('💥 分裂！');
      return;
    }
    bossActive=false;
    // Clean up summoned minions
    for(var si=bossSummoned.length-1;si>=0;si--){
      var sm=bossSummoned[si];if(sm.mesh)scene.remove(sm.mesh);if(sm.hBar)scene.remove(sm.hBar);
    }bossSummoned.length=0;
    // Clean up frost patches
    for(var fi=bossFrostPatches.length-1;fi>=0;fi--){
      if(bossFrostPatches[fi].mesh)scene.remove(bossFrostPatches[fi].mesh);
    }bossFrostPatches.length=0;
    if(boss.mesh){scene.remove(boss.mesh);}
    bossProjectiles.forEach(function(bp){scene.remove(bp.mesh);scene.remove(bp.trail);});
    bossProjectiles.length=0;
    document.getElementById('boss-hp-wrap').style.display='none';
    bossRushMaxWave=Math.max(bossRushMaxWave,bossRushWave);
    try{localStorage.setItem('oc_bossrush',JSON.stringify({maxWave:bossRushMaxWave}));}catch(e){}
    // Heal + ammo refill on kill
    playerHP=Math.min(100,playerHP+40);playerArmor=Math.min(100,playerArmor+30);
    for(var gk in gunAmmo){if(gunData[gk]&&gunData[gk].mag)gunAmmo[gk]=gunData[gk].mag;}
    awardSkillPoints(2);
    // Next boss
    bossRushWave++;
    document.getElementById('round-clear').textContent='⚔ 第 '+(bossRushWave-1)+' 波 BOSS 擊敗！';
    document.getElementById('round-clear').style.color='#4f4';document.getElementById('round-clear').style.display='block';
    bossSpawned=false;
    setTimeout(function(){
      document.getElementById('round-clear').style.display='none';
      if(!bossActive&&!bossSpawned&&bossRushMode){
        var bt2=getBossRushType(bossRushWave);
        document.getElementById('round-clear').textContent='⚔ 第 '+bossRushWave+' 波 — '+bt2.name;
        document.getElementById('round-clear').style.color='#f84';document.getElementById('round-clear').style.display='block';
        setTimeout(function(){document.getElementById('round-clear').style.display='none';spawnBossRush();},1500);
      }
    },2000);
  }
}
// ── Class Skill System ──
var classSkillCD=0,classSkillTimer=0,classSkillActive=false;
var classSkillData={
  berserker:{name:'狂怒',cd:20,dur:6,desc:'速度+30% 小刀x3 減傷40%'},
  medic:{name:'長煙',cd:30,dur:0,desc:'被動每秒+2HP+1甲；C煙霧彈 B煙霧針 T長煙15m'},
  assault:{name:'高壓氣縮彈',cd:90,dur:0,desc:'橘色高壓彈 範圍6m爆+擊倒1.5s'},
  sniper:{name:'狙擊標記',cd:20,dur:0,desc:'標記敵人 下一發x2.5'},
  tank:{name:'震地擊',cd:18,dur:0,desc:'範圍30傷+緩速50% 3s'},
  ghost:{name:'相位閃現',cd:16,dur:0,desc:'瞬移10m+隱形2s'},
  engineer:{name:'勤儉持家',cd:30,dur:0,desc:'Z燒牆回HP/甲 Q定身3s X破80甲 E聲波干擾'}
};
  // ═════════ 突擊兵專屬：Q 氣能輔助 / G 碎甲破片手雷 / F 高壓氣縮彈 ═════════
  var ocDashMax=20,ocDashCD=0,ocDashT=0,ocDashDir=new THREE.Vector3();
  var ocNadeMax=2,ocNades=2,ocNadeCD=20,ocNadeTimer=0;
  var ocUltShowT=0,ocUltFireT=0,ocUltRecoil=0,ocUltMesh=null,ocLIE=1.45;
  var ocUltAiming=false,ocUltTraj=null,ocUltTrajGeo=null,OC_TRAJ_MAX=300;
  var OC_ULT_FUSE=1.8,OC_ULT_BOUNCE=0.72,OC_ULT_KNOCK=3.0;
  function ocAssault(){return playerClass==='assault';}
  function ocCamDir(){return new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();}
  function ocFromCam(off){var v=off.clone();v.applyQuaternion(cam.quaternion);return v.add(cam.position);}
  function ocNadeMesh(){
    var g=new THREE.Group();
    var body=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.058,0.13,12),new THREE.MeshStandardMaterial({color:0x39412f,roughness:0.75,metalness:0.35}));
    g.add(body);
    var band=new THREE.Mesh(new THREE.CylinderGeometry(0.061,0.061,0.028,12),new THREE.MeshStandardMaterial({color:0xff2b1a,emissive:0xff2200,emissiveIntensity:0.9,roughness:0.5}));
    band.position.y=0.015;g.add(band);
    var neck=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.034,0.05,10),new THREE.MeshStandardMaterial({color:0xa8aeb6,metalness:0.9,roughness:0.28}));
    neck.position.y=0.09;g.add(neck);
    var lever=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.085,0.012),new THREE.MeshStandardMaterial({color:0xb9bfc6,metalness:0.9,roughness:0.3}));
    lever.position.set(0.04,0.07,0);g.add(lever);
    var pin=new THREE.Mesh(new THREE.TorusGeometry(0.018,0.004,6,14),new THREE.MeshStandardMaterial({color:0xffcc33,metalness:0.8,roughness:0.35}));
    pin.position.set(-0.036,0.1,0);pin.rotation.y=Math.PI/2;g.add(pin);
    return g;
  }
  function ocWarnMesh(p,R){
    var g=new THREE.Group();g.position.set(p.x,Math.max(0.03,p.y-0.07),p.z);
    var ring=new THREE.Mesh(new THREE.RingGeometry(R-0.2,R,48),new THREE.MeshBasicMaterial({color:0xff2222,transparent:true,opacity:0.85,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;g.add(ring);
    var fc=document.createElement('canvas');fc.width=fc.height=256;var fx=fc.getContext('2d');
    var grd=fx.createRadialGradient(128,128,4,128,128,126);
    grd.addColorStop(0,'rgba(255,0,0,0.80)');
    grd.addColorStop(0.35,'rgba(255,40,20,0.45)');
    grd.addColorStop(0.75,'rgba(255,60,30,0.16)');
    grd.addColorStop(1,'rgba(255,80,40,0.04)');
    fx.fillStyle=grd;fx.fillRect(0,0,256,256);
    var fill=new THREE.Mesh(new THREE.PlaneGeometry(R*2,R*2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(fc),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    fill.rotation.x=-Math.PI/2;fill.position.y=-0.01;g.add(fill);
    var cv=document.createElement('canvas');cv.width=cv.height=128;var cx=cv.getContext('2d');
    cx.fillStyle='#ff2222';cx.beginPath();cx.moveTo(64,14);cx.lineTo(118,110);cx.lineTo(10,110);cx.closePath();cx.fill();
    cx.fillStyle='#ffffff';cx.font='bold 66px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('!',64,80);
    var ic=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
    ic.rotation.x=-Math.PI/2;ic.position.y=0.02;g.add(ic);
    g.userData={ring:ring,fill:fill,ic:ic,t:0};
    scene.add(g);return g;
  }
  function ocBlastFX(p,R,col){
    var m=new THREE.Mesh(new THREE.SphereGeometry(R*0.12,10,10),new THREE.MeshBasicMaterial({color:0xffaa33,transparent:true,opacity:0.95,depthWrite:false}));
    m.position.copy(p);m.position.y+=0.4;scene.add(m);
    var glow=new THREE.Mesh(new THREE.SphereGeometry(R*0.2,10,10),new THREE.MeshBasicMaterial({color:0xff5500,transparent:true,opacity:0.4,depthWrite:false}));
    glow.position.copy(m.position);scene.add(glow);
    var light=new THREE.PointLight(col||0xff7722,6,R);light.position.copy(m.position);scene.add(light);
    var wave=new THREE.Mesh(new THREE.RingGeometry(0.3,R,32),new THREE.MeshBasicMaterial({color:0xffcc88,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false}));
    wave.rotation.x=-Math.PI/2;wave.position.set(p.x,0.06,p.z);scene.add(wave);
    var t=0;var iv=setInterval(function(){t+=0.033;
      if(t>=0.55){clearInterval(iv);scene.remove(m);scene.remove(glow);scene.remove(light);scene.remove(wave);return;}
      var k=t/0.55;m.scale.setScalar(1+k*3.5);m.material.opacity=0.95*(1-k);
      glow.scale.setScalar(1+k*4.5);glow.material.opacity=0.4*(1-k);
      wave.scale.setScalar(0.4+k*1.6);wave.material.opacity=0.5*(1-k);
      light.intensity=6*(1-k);
    },33);
    playShort('soundreality-explosion-fx-343683.mp3',null,0.5);
  }
  function ocUseDash(){
    if(!ocAssault()||ocDashCD>0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
    ocDashCD=ocDashMax;ocDashT=0.5;ocDashHit={};
    ocDashDir.set(-Math.sin(yaw),0,-Math.cos(yaw));
    if(onGround)vel.y=Math.max(vel.y,1.5);
    var ring=new THREE.Mesh(new THREE.RingGeometry(0.25,1.4,24),new THREE.MeshBasicMaterial({color:0x88ddff,transparent:true,opacity:0.55,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.set(pos.x,pos.y+0.06,pos.z);scene.add(ring);
    (function(m){var t=0,iv=setInterval(function(){t+=0.033;if(t>=0.45){clearInterval(iv);scene.remove(m);return;}m.scale.setScalar(1+t*2.2);m.material.opacity=0.55*(1-t/0.45);},33);})(ring);
    for(var i=0;i<6;i++){
      var puff=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,6),new THREE.MeshBasicMaterial({color:0xbfe9ff,transparent:true,opacity:0.5,depthWrite:false}));
      puff.position.set(pos.x+(Math.random()-0.5)*0.4,pos.y+0.12,pos.z+(Math.random()-0.5)*0.4);scene.add(puff);
      (function(m,d){var t=0,iv=setInterval(function(){t+=0.033;if(t>=0.4){clearInterval(iv);scene.remove(m);return;}m.position.addScaledVector(d,0.045);m.material.opacity=0.5*(1-t/0.4);m.scale.setScalar(1+t*3);},33);})(puff,new THREE.Vector3(-ocDashDir.x*(1.5+Math.random()),0.6+Math.random(),-ocDashDir.z*(1.5+Math.random())));
    }
    screenShake=Math.max(screenShake,1.2);
    showToast('氣能輔助 已發動',0.6);
  }
  function ocThrowArmorNade(){
    if(!ocAssault()||ocNades<=0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
    ocNades--;if(ocNades<ocNadeMax&&ocNadeTimer<=0)ocNadeTimer=ocNadeCD;
    var fwd=ocCamDir();
    var sp=ocFromCam(new THREE.Vector3(0.18,-0.12,-0.45));
    var m=ocNadeMesh();m.position.copy(sp);scene.add(m);
    projectiles.push({mesh:m,pos:sp.clone(),vel:fwd.clone().multiplyScalar(11).add(new THREE.Vector3(0,3,0)),life:99,dmg:0,isGrenade:true,fuse:2.6,subType:'armorfrag',armorNade:true,fromEnemy:false});
  }
  // 傷害：先吃甲再扣血，但不隱藏 mesh（保留 10937 那段的擊殺獎勵/掉落）
  function ocHurt(e,dmg){
    if(!e||e.hp<=0||dmg<=0)return 0;
    var hpDmg=dmg;
    if(e.armor>0){
      var od=dmg;e.armor-=dmg;
      if(e.armor<0){od=-e.armor;e.armor=0}else od=0;
      hpDmg=od;
      if(e.aBarFill)e.aBarFill.scale.x=Math.max(0.001,e.armor/e.maxArmor);
      else if(e.aBar&&e.aBar.scale)e.aBar.scale.x=Math.max(0.001,e.armor/e.maxArmor);
    }
    e.hp-=hpDmg;if(e.hp<0)e.hp=0;
    e.hitTimer=0.3;
    return hpDmg;
  }
  // ── 真人被擊倒：對手 mesh 躺平（多人／單多混合共用） ──
  function ocKnockOpponent(oi,dir,dur){
    var os=opponentStates[oi];
    if(!os||!os.alive||os.hp<=0)return;
    if(os.ocKnockT>0||os.ocKnockStand>0)return;
    os.ocKnockDur=dur;os.ocKnockT=dur;os.ocKnockStand=0.5;os.ocKnockAngle=0;
    os.ocKnockYaw=os.yaw||0;
    var ax=new THREE.Vector3(dir.z,0,-dir.x);
    if(ax.lengthSq()<0.0001)ax.set(1,0,0);
    os.ocKnockAxis=ax.normalize();
    os.ocKnockOX=0;os.ocKnockOZ=0;
    os.ocKnockDX=dir.x*7;os.ocKnockDZ=dir.z*7;
  }
  // ── 非主機的 Hybrid AI：躺平只是視覺，血量仍由主機 hybrid_ai_state 同步 ──
  function ocKnockRemote(a,dir,dur){
    if(!a||!a.alive||!a.mesh)return;
    if(a.ocKnockT>0||a.ocKnockStand>0)return;
    a.ocKnockDur=dur;a.ocKnockT=dur;a.ocKnockStand=0.5;a.ocKnockAngle=0;
    a.ocKnockYaw=(a.cyaw!==undefined)?a.cyaw:a.mesh.rotation.y;
    var ax=new THREE.Vector3(dir.z,0,-dir.x);
    if(ax.lengthSq()<0.0001)ax.set(1,0,0);
    a.ocKnockAxis=ax.normalize();
    a.ocKnockDX=dir.x*7;a.ocKnockDZ=dir.z*7;
  }
  function ocRemoteKnockTick(a,dt){
    if(!a||!a.mesh)return;
    var active=a.ocKnockT>0||a.ocKnockStand>0||a.ocKnockAngle>0;
    if(active){
      if(a.ocKnockT>0){
        a.ocKnockT-=dt;
        if(a.ocKnockT<=0){a.ocKnockT=0;a.ocKnockStand=0.5;}
        a.mesh.position.x+=a.ocKnockDX*dt;a.mesh.position.z+=a.ocKnockDZ*dt;
        a.ocKnockDX*=Math.max(0,1-dt*5);a.ocKnockDZ*=Math.max(0,1-dt*5);
        a.ocKnockAngle=ocLIE*Math.min(1,(1-a.ocKnockT/Math.max(0.01,a.ocKnockDur))*2.4);
      }else{
        a.ocKnockStand-=dt;
        a.ocKnockAngle=ocLIE*Math.max(0,a.ocKnockStand/0.5);
        if(a.ocKnockStand<=0){a.ocKnockStand=0;a.ocKnockAngle=0;}
      }
      if(a.ocKnockAngle>0.01){
        var qa=new THREE.Quaternion().setFromAxisAngle(a.ocKnockAxis||new THREE.Vector3(1,0,0),a.ocKnockAngle);
        var qy=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,a.ocKnockYaw||0,0));
        a.mesh.quaternion.copy(qa).multiply(qy);
        a.ocWasKnocked=true;
      }
    }else if(a.ocWasKnocked){
      a.ocWasKnocked=false;a.ocKnockAngle=0;
      a.mesh.rotation.set(0,(a.cyaw!==undefined?a.cyaw:a.mesh.rotation.y),0);
    }
  }
  // ── 自己被炸倒：1.5s 鎖移動／開火 ＋ 鏡頭側傾 ──
  var ocSelfKnockT=0,ocSelfKnockDur=0,ocSelfKnockStand=0,ocSelfKnockDX=0,ocSelfKnockDZ=0;
  function ocSelfKnock(dir,dur){
    if(ocSelfKnockT>0||ocSelfKnockStand>0)return;
    ocSelfKnockDur=dur;ocSelfKnockT=dur;ocSelfKnockStand=0.5;
    ocSelfKnockDX=dir.x*7;ocSelfKnockDZ=dir.z*7;
    showToast('💥 你被炸倒了',1.1);
    screenShake=Math.max(screenShake,4);
  }
  function ocSelfRoll(){
    if(ocSelfKnockT>0&&ocSelfKnockDur>0){
      var k=1-ocSelfKnockT/ocSelfKnockDur;
      return 1.0*Math.min(1,k*2.4);
    }
    if(ocSelfKnockStand>0)return 1.0*Math.max(0,ocSelfKnockStand/0.5);
    return 0;
  }
  // ── 範圍傷害：真人（本機先套傷害＋擊倒，再廣播給其他人） ──
  function ocHitOpponents(p,R,dmgAt,dur,doKnock,killIcon,onceSet,pierce){
    if(!opponentStates.length)return;
    var pp=pierce||0;
    for(var oi=0;oi<opponentStates.length;oi++){
      var os=opponentStates[oi];
      if(!os||!os.alive||os.hp<=0||!os.pos)continue;
      var d=os.pos.distanceTo(p);if(d>R)continue;
      if(onceSet){if(onceSet['o'+oi])continue;onceSet['o'+oi]=1;}
      var dir=os.pos.clone().sub(p);dir.y=0;
      if(dir.lengthSq()<0.0001)dir.set(Math.random()-0.5,0,Math.random()-0.5);else dir.normalize();
      var odmg=Math.max(1,Math.round(dmgAt(d,os)));
      // 穿甲部分直接扣血，其餘仍走護甲
      var pierceDmg=pp>0?Math.min(os.hp,Math.round(odmg*pp)):0;
      os.hp=Math.max(0,os.hp-pierceDmg);
      var ld=odmg-pierceDmg;
      if(ld>0&&os.armor>0){os.armor-=ld;if(os.armor<0){ld=-os.armor;os.armor=0}else ld=0;}
      if(ld>0){os.hp-=ld;if(os.hp<0)os.hp=0;}
      if(os.hp<=0&&typeof tdmEnemyDown==='function')tdmEnemyDown(oi,killIcon||'💥');
      hitMarkerTimer=0.15;
      showDmgNum(os.pos.clone().add(new THREE.Vector3(0,1.3,0)),odmg,'#ffaa44');
      var pid=opponentPlayerIds[oi];
      try{relaySend({type:'hit',hp:odmg,pierce:pierceDmg,targetPlayerId:pid,shooterPlayerId:myPlayerId});}catch(e0){}
      if(doKnock){
        ocKnockOpponent(oi,dir,dur);
        ocVoiceKnock();
        try{relaySend({type:'oc_knock',targetPlayerId:pid,dx:dir.x*7,dz:dir.z*7,dur:dur});}catch(e1){}
      }
    }
  }
  // ── 範圍傷害：本機 AI（主機／單人／一般多人）；Hybrid 主機同時廣播給非主機畫面 ──
  function ocBlastLocalAi(p,R,fn,dur,doKnock,onceSet){
    if(!enemies.length)return;
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(!e||e.hp<=0||!e.pos)continue;
      var d=e.pos.distanceTo(p);if(d>R)continue;
      if(onceSet){if(onceSet['e'+i])continue;onceSet['e'+i]=1;}
      var dir=e.pos.clone().sub(p);dir.y=0;
      if(dir.lengthSq()<0.0001)dir.set(Math.random()-0.5,0,Math.random()-0.5);else dir.normalize();
      var dealt=fn(e,d,dir)||0;
      if(doKnock){ocKnock(e,dir,dur);ocVoiceKnock();}
      if(hybridMode&&dealt>0){
        try{relaySend({type:'oc_knock',aiIdx:i,dmg:Math.round(dealt),dx:dir.x*7,dz:dir.z*7,dur:dur});}catch(e2){}
      }
    }
  }
  // ── 範圍傷害：Hybrid 非主機的視覺 AI；權威傷害經 oc_knock 交給主機 ──
  function ocHitRemoteAi(p,R,fn,dur,doKnock,onceSet){
    if(!hybridMode||hybridHost||!hybridRemoteAi.length)return;
    for(var i=0;i<hybridRemoteAi.length;i++){
      var a=hybridRemoteAi[i];
      if(!a||!a.alive||!a.mesh)continue;
      var d=a.mesh.position.distanceTo(p);if(d>R)continue;
      if(onceSet){if(onceSet['r'+i])continue;onceSet['r'+i]=1;}
      var dir=a.mesh.position.clone().sub(p);dir.y=0;
      if(dir.lengthSq()<0.0001)dir.set(Math.random()-0.5,0,Math.random()-0.5);else dir.normalize();
      var dealt=fn(a,d,dir)||0;
      if(doKnock){ocKnockRemote(a,dir,dur);ocVoiceKnock();}
      try{relaySend({type:'oc_knock',aiIdx:i,dmg:Math.round(dealt),dx:dir.x*7,dz:dir.z*7,dur:dur});}catch(e3){}
    }
  }
  // ── 碎甲雷傷害：先破甲（越近破甲越多），破不掉的溢出轉成血傷 ──
  function ocArmorDmg(t,d,isRemote){
    var k=Math.max(0,1-d/5);
    var dealt=0;
    if(!isRemote&&t.armor>0){
      var need=d<1?99999:(d<2?80:(d<3?70:(d<4?60:50)));
      var real=Math.min(t.armor,need);
      t.armor=Math.max(0,t.armor-need);
      if(t.aBarFill)t.aBarFill.scale.x=Math.max(0.001,t.armor/t.maxArmor);
      else if(t.aBar&&t.aBar.scale)t.aBar.scale.x=Math.max(0.001,t.armor/t.maxArmor);
      showDmgNum(t.pos.clone().add(new THREE.Vector3(0,1.5,0)),Math.round(real),'#66ddff');
      dealt+=real;
      var spill=need-real;
      if(spill>0){
        var hs=Math.max(10,Math.min(spill,Math.round(30+25*k)));
        var gh=ocHurt(t,hs);
        if(gh>0){dealt+=gh;showDmgNum(t.pos.clone().add(new THREE.Vector3(0,1.2,0)),gh,'#ffcc44');}
      }
    }else if(isRemote&&t.armor>0){
      var rr=Math.min(t.armor,Math.round(60*k)+10);t.armor=Math.max(0,t.armor-rr);
      showDmgNum(t.mesh.position.clone().add(new THREE.Vector3(0,1.5,0)),Math.round(rr),'#66ddff');
      dealt+=rr;
      var rv=Math.min(t.hp,Math.round(30+25*k));t.hp-=rv;
      showDmgNum(t.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),Math.round(30+25*k),'#ffcc44');
      dealt+=rv;
    }else{
      var hd=Math.max(18,Math.round(45*k));
      if(isRemote){
        t.hp=Math.max(0,t.hp-hd);
        showDmgNum(t.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),hd,'#ffcc44');
        dealt=hd;
      }else{
        var g2=ocHurt(t,hd);
        dealt=g2;
        showDmgNum(t.pos.clone().add(new THREE.Vector3(0,1.2,0)),Math.max(1,Math.round(hd)),'#ffcc44');
      }
    }
    return dealt;
  }
  // ── 高壓氣縮彈傷害：中心 90，邊緣 18；40% 穿甲直入血量，其餘仍走護甲 ──
  var OC_ULT_PIERCE=0.4;
  var ocVoiceGate=0;
  function ocVoiceKnock(){
    try{
      if(!window.speechSynthesis)return;
      var now=Date.now();
      if(now-ocVoiceGate<500)return;
      ocVoiceGate=now;
      window.speechSynthesis.cancel();
      var u=new SpeechSynthesisUtterance('炸倒！');
      u.lang='zh-CN';u.rate=1.65;u.pitch=1.3;u.volume=1;
      window.speechSynthesis.speak(u);
    }catch(e){}
  }
  function ocUltDmg(t,d,isRemote){
    var dd=Math.max(18,Math.round(90*(1-d/6)));
    var pierce=Math.round(dd*OC_ULT_PIERCE);
    if(!t)return 0;
    if(isRemote){
      t.hp=Math.max(0,t.hp-pierce);
      var rest=dd-pierce;
      if(t.hp>0&&t.armor>0){var arm=Math.min(t.armor,rest);t.armor=Math.max(0,t.armor-arm);rest-=arm;}
      if(rest>0)t.hp=Math.max(0,t.hp-rest);
      showDmgNum(t.mesh.position.clone().add(new THREE.Vector3(0,1.6,0)),dd,'#ffaa44');
      return dd;
    }
    if(t.hp<=0)return 0;
    var direct=Math.min(t.hp,pierce);
    t.hp=Math.max(0,t.hp-direct);
    t.hitTimer=0.3;
    var rest=dd-pierce;
    if(rest>0&&t.hp>0&&t.armor>0){var arm2=Math.min(t.armor,rest);t.armor=Math.max(0,t.armor-arm2);rest-=arm2;}
    if(rest>0&&t.hp>0){var got=ocHurt(t,rest);direct+=got||0;}
    showDmgNum(t.pos.clone().add(new THREE.Vector3(0,1.6,0)),dd,'#ffaa44');
    return Math.max(dd,direct);
  }
  // ── 氣能輔助衝撞傷害：每位目標每次衝刺只打一次 ──
  var ocDashHit={};
  function ocDashContact(){
    if(!locked||!gameStarted||isDowned)return;
    var R=1.9,dmg=30;
    ocBlastLocalAi(pos,R,function(t){
      ocHurt(t,dmg);
      showDmgNum(t.pos.clone().add(new THREE.Vector3(0,1.4,0)),dmg,'#aee6ff');
      return dmg;
    },0.9,true,ocDashHit);
    ocHitRemoteAi(pos,R,function(t){
      t.hp=Math.max(0,t.hp-dmg);
      showDmgNum(t.mesh.position.clone().add(new THREE.Vector3(0,1.4,0)),dmg,'#aee6ff');
      return dmg;
    },0.9,true,ocDashHit);
    ocHitOpponents(pos,R,function(){return dmg;},0.9,true,'⚡',ocDashHit);
  }
  function ocArmorBlast(p,R){
    ocBlastLocalAi(p,R,function(t,d){
      if(t.hitTimer!==undefined)t.hitTimer=0.35;
      t.stunTimer=Math.max(t.stunTimer||0,0.4);
      return ocArmorDmg(t,d,false);
    },1.1,true);
    ocHitRemoteAi(p,R,function(t,d){return ocArmorDmg(t,d,true);},1.1,true);
    ocHitOpponents(p,R,function(d){return Math.max(20,Math.round(55*(1-d/R)));},1.1,true,'💥');
    var adp=p.distanceTo(pos);
    if(adp<R*0.5&&playerHP>0){
      var dirp=pos.clone().sub(p);dirp.y=0;
      if(dirp.lengthSq()<0.0001)dirp.set(Math.random()-0.5,0,Math.random()-0.5);else dirp.normalize();
      ocSelfKnock(dirp,1.0);
    }
  }
  function ocUltStart(){
    if(!ocAssault()||!gameStarted||isDowned||!locked)return;
    ocUltAiming=true;ocUltRecoil=0;
    if(!ocUltMesh){ocUltMesh=ocMakeLauncher();cam.add(ocUltMesh);ocUltMesh.visible=false;}
    ocUltMesh.visible=true;
    showToast('瞄準中：再按 F 發射　左鍵取消',1.4);
  }
  function ocUltCancel(){
    ocUltAiming=false;ocUltShowT=0;ocUltRecoil=0;
    if(ocUltMesh)ocUltMesh.visible=false;
    if(ocUltTraj)ocUltTraj.visible=false;
  }
  function ocUltFireNow(){
    if(!ocUltAiming)return;
    ocUltAiming=false;
    if(ocUltTraj)ocUltTraj.visible=false;
    ocUltShowT=0.5;ocUltRecoil=1;
    classSkillCD=(classSkillData.assault&&classSkillData.assault.cd)||90;   // CD 從「真的發射」才開始算
    ocFireUlt();
  }
  // ── 拋物線預覽：與 projectiles 的 ocburst 用同一套物理（同速、同重力、同反彈） ──
  function ocTrajGroup(){
    if(ocUltTraj)return ocUltTraj;
    ocUltTrajGeo=new THREE.BufferGeometry();
    ocUltTrajGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(OC_TRAJ_MAX*3),3));
    ocUltTrajGeo.setDrawRange(0,0);
    var g=new THREE.Group();
    var ln=new THREE.Line(ocUltTrajGeo,new THREE.LineBasicMaterial({color:0xffbb55,transparent:true,opacity:0.95,depthTest:false}));
    ln.frustumCulled=false;ln.renderOrder=999;
    var dt2=new THREE.Points(ocUltTrajGeo,new THREE.PointsMaterial({color:0xfff2cc,size:0.15,transparent:true,opacity:0.95,depthTest:false}));
    dt2.frustumCulled=false;dt2.renderOrder=1000;
    g.add(ln);g.add(dt2);g.visible=false;
    scene.add(g);ocUltTraj=g;
    return g;
  }
  function ocTrajUpdate(){
    var g=ocTrajGroup();
    if(!ocUltAiming){g.visible=false;return;}
    g.visible=true;
    var p=ocFromCam(new THREE.Vector3(0.2,-0.12,-0.55));
    var vel=ocCamDir().multiplyScalar(32);
    var arr=ocUltTrajGeo.attributes.position.array;
    var n=0,dt=1/60,fuse=OC_ULT_FUSE,fb=getMapBounds();
    for(var s=0;s<OC_TRAJ_MAX;s++){
      if(n>=OC_TRAJ_MAX)break;
      arr[n*3]=p.x;arr[n*3+1]=p.y;arr[n*3+2]=p.z;n++;
      p.x+=vel.x*dt;p.y+=vel.y*dt;p.z+=vel.z*dt;
      vel.y-=9.8*dt;
      if(p.y<0.1){p.y=0.1;vel.y*=-0.55;vel.x*=0.92;vel.z*=0.92;}
      for(var bi=0;bi<mapBoxes.length;bi++){
        var b=mapBoxes[bi];
        if(b.isPlatform||b.isDragonBoat||!b.mesh.visible)continue;
        if(Math.abs(p.x-b.pos.x)<b.size.x/2+0.1&&Math.abs(p.y-b.pos.y)<b.size.y/2+0.1&&Math.abs(p.z-b.pos.z)<b.size.z/2+0.1){
          var ox=b.size.x/2+0.1-Math.abs(p.x-b.pos.x);
          var oz=b.size.z/2+0.1-Math.abs(p.z-b.pos.z);
          if(ox<oz){vel.x*=-OC_ULT_BOUNCE;p.x+=p.x<b.pos.x?-ox:ox;}
          else{vel.z*=-OC_ULT_BOUNCE;p.z+=p.z<b.pos.z?-oz:oz;}
          if(n<OC_TRAJ_MAX){arr[n*3]=p.x;arr[n*3+1]=p.y;arr[n*3+2]=p.z;n++;}
          break;
        }
      }
      fuse-=dt;
      if(fuse<=0)break;
      if(p.x<fb.minX||p.x>fb.maxX||p.z<fb.minZ||p.z>fb.maxZ)break;
      if(p.y<=0.101&&(Math.abs(vel.x)+Math.abs(vel.z))<0.6)break;
    }
    ocUltTrajGeo.setDrawRange(0,n);
    ocUltTrajGeo.attributes.position.needsUpdate=true;
  }
  function ocMakeLauncher(){
    var g=new THREE.Group();
    var metal=new THREE.MeshStandardMaterial({color:0x3a4149,metalness:0.8,roughness:0.35});
    var tube=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.06,0.62,14),metal);
    tube.rotation.x=Math.PI/2;g.add(tube);
    var rim=new THREE.Mesh(new THREE.TorusGeometry(0.058,0.01,6,16),new THREE.MeshStandardMaterial({color:0x20242a,metalness:0.7,roughness:0.4}));
    rim.position.z=-0.31;g.add(rim);
    var can=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.2,14),new THREE.MeshStandardMaterial({color:0xff8822,emissive:0xff5500,emissiveIntensity:1.2,roughness:0.5}));
    can.rotation.x=Math.PI/2;can.position.z=0.06;g.add(can);
    var band=new THREE.Mesh(new THREE.CylinderGeometry(0.073,0.073,0.03,14),metal);
    band.rotation.x=Math.PI/2;band.position.z=-0.02;g.add(band);
    var grip=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.14,0.05),metal);
    grip.position.set(0,-0.1,0.12);grip.rotation.x=-0.25;g.add(grip);
    var sight=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.05,0.12),metal);
    sight.position.set(0,0.07,0.02);g.add(sight);
    var led=new THREE.Mesh(new THREE.SphereGeometry(0.014,8,8),new THREE.MeshBasicMaterial({color:0xffcc33}));
    led.position.set(0.04,0.05,0.1);g.add(led);
    return g;
  }
  function ocFireUlt(){
    var fwd=ocCamDir();
    var m=new THREE.Group();
    m.add(new THREE.Mesh(new THREE.SphereGeometry(0.08,10,10),new THREE.MeshStandardMaterial({color:0xffaa33,emissive:0xff6600,emissiveIntensity:2.4,roughness:0.4})));
    var tip=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.2,10),new THREE.MeshStandardMaterial({color:0xffdd88,emissive:0xff8800,emissiveIntensity:1.6}));
    tip.rotation.x=-Math.PI/2;tip.position.z=-0.12;m.add(tip);
    m.add(new THREE.PointLight(0xff9933,2.5,8));
    var sp=ocFromCam(new THREE.Vector3(0.2,-0.12,-0.55));
    m.position.copy(sp);m.lookAt(sp.clone().add(fwd));scene.add(m);
    projectiles.push({mesh:m,pos:sp.clone(),vel:fwd.clone().multiplyScalar(32),life:99,dmg:55,isGrenade:true,fuse:OC_ULT_FUSE,subType:'ocburst',fromEnemy:false});
    ocUltRecoil=1;screenShake=3;
    playShort('soundreality-explosion-fx-343683.mp3',null,0.35);
  }
  function ocExplodeUlt(p){
    var R=6;
    ocBlastFX(p,R,0xff9922);
    screenShake=Math.max(screenShake,7);
    ocBlastLocalAi(p,R,function(t,d){return ocUltDmg(t,d,false);},OC_ULT_KNOCK,true);
    ocHitRemoteAi(p,R,function(t,d){return ocUltDmg(t,d,true);},OC_ULT_KNOCK,true);
    ocHitOpponents(p,R,function(d){return Math.max(18,Math.round(90*(1-d/R)));},OC_ULT_KNOCK,true,'💥',null,OC_ULT_PIERCE);
    var pd=pos.distanceTo(p);
    if(pd<R){
      var sd=Math.round(30*(1-pd/R));
      if(sd>0){playerDamage(sd,p);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.4,0)),sd,'#ff8844');}
      if(playerHP>0){
        var dirp=pos.clone().sub(p);dirp.y=0;
        if(dirp.lengthSq()<0.0001)dirp.set(Math.random()-0.5,0,Math.random()-0.5);else dirp.normalize();
        ocSelfKnock(dirp,1.4);
      }
    }
  }
  function ocKnock(e,dir,dur){
    if(!e||!e.mesh||!e.pos||!dir)return;
    if(e.hp<=0||e.roofTop||e.towerPerch){e.stunTimer=Math.max(e.stunTimer||0,dur);return;}
    e.knockT=dur;e.knockDur=dur;e.knockStand=0.5;e.knockAngle=0;
    e.knockYaw=e.mesh.rotation.y;
    var ax=new THREE.Vector3(dir.z,0,-dir.x);
    if(ax.lengthSq()<0.0001)ax.set(1,0,0);
    e.knockAxis=ax.normalize();
    e.knockVel=dir.clone().multiplyScalar(8);
    e.stunTimer=0;e.state='patrol';e.aiTarget=null;e.hasDetected=false;
    if(e.vel)e.vel.set(0,0,0);
    if(e.desiredVel)e.desiredVel.set(0,0,0);
  }
  function ocUpdateKnocked(e,dt){
    if(e.knockT>0){
      e.knockT-=dt;
      if(e.knockT<=0){e.knockT=0;e.knockStand=0.5;}
      if(!e.towerPerch){
        e.pos.x+=e.knockVel.x*dt;e.pos.z+=e.knockVel.z*dt;
        var fb=getMapBounds();
        e.pos.x=Math.max(fb.minX+0.6,Math.min(fb.maxX-0.6,e.pos.x));
        e.pos.z=Math.max(fb.minZ+0.6,Math.min(fb.maxZ-0.6,e.pos.z));
        e.knockVel.multiplyScalar(Math.max(0,1-dt*5));
      }
      var k=1-e.knockT/e.knockDur;
      e.knockAngle=ocLIE*Math.min(1,k*2.4);
    }else if(e.knockStand>0){
      e.knockStand-=dt;
      e.knockAngle=ocLIE*Math.max(0,e.knockStand/0.5);
      if(e.knockStand<=0){e.knockStand=0;e.knockAngle=0;e.knockAxis=null;}
    }
    if(e.knockAngle>0.01&&e.knockAxis){
      e.mesh.position.set(e.pos.x,0,e.pos.z);
      var qa=new THREE.Quaternion().setFromAxisAngle(e.knockAxis,e.knockAngle);
      var qy=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,e.knockYaw,0));
      e.mesh.quaternion.copy(qa).multiply(qy);
    }else{
      e.mesh.position.set(e.pos.x,0,e.pos.z);
      e.mesh.rotation.set(0,e.knockYaw,0);
    }
    updateEnemyBars(e);
    if(e.knockAngle>0.3){
      if(e.hBar)e.hBar.position.set(e.pos.x,e.pos.y+0.4,e.pos.z);
      if(e.aBar)e.aBar.position.set(e.pos.x,e.pos.y+0.33,e.pos.z);
    }
  }
  function ocTickAssault(dt){
    if(ocDashCD>0)ocDashCD=Math.max(0,ocDashCD-dt);
    if(ocSelfKnockT<=0&&ocSelfKnockStand>0){
      ocSelfKnockStand=Math.max(0,ocSelfKnockStand-dt);
      if(ocSelfKnockStand<=0){ocSelfKnockDX=0;ocSelfKnockDZ=0;}
    }
    if(ocNades<ocNadeMax){
      ocNadeTimer-=dt;
      if(ocNadeTimer<=0){ocNades++;ocNadeTimer=(ocNades<ocNadeMax)?ocNadeCD:0;}
    }
    // 倒地／斷線就自動取消瞄準，不然會卡在發射器狀態
    if(ocUltAiming&&(isDowned||!locked||hybridDead||playerHP<=0))ocUltCancel();
    if(ocUltShowT>0){
      ocUltShowT-=dt;
      if(ocUltShowT<=0){ocUltShowT=0;ocUltRecoil=0;}
    }
    if(ocUltAiming||ocUltShowT>0){
      if(ocUltMesh){
        ocUltRecoil=Math.max(0,ocUltRecoil-dt*3);
        ocUltMesh.position.set(0.24,-0.2,-0.5+ocUltRecoil*0.13);
        ocUltMesh.rotation.set(0.06+ocUltRecoil*0.28,-0.1,ocUltRecoil*0.1);
      }
    }
    if(ocUltAiming)ocTrajUpdate();
    else if(ocUltTraj)ocUltTraj.visible=false;
    // 碎甲手雷警示：玩家離爆心越近，螢幕四周泛紅越深
    var vig=document.getElementById('oc-nade-vig');
    if(vig){
      var best=99;
      for(var wi=0;wi<projectiles.length;wi++){
        var wpj=projectiles[wi];
        if(!wpj.armorNade||!wpj.warnMesh)continue;
        var wdx=wpj.warnMesh.position.x-pos.x,wdz=wpj.warnMesh.position.z-pos.z;
        var wd=Math.sqrt(wdx*wdx+wdz*wdz);
        if(wd<best)best=wd;
      }
      vig.style.opacity=best<5?String((0.12+0.78*(1-best/5)).toFixed(3)):'0';
    }
  }
  // ═════════ 醫療兵專屬：C 爆破型煙霧彈 / B 治療煙霧針 / T 長煙 ═════════
  var ocMedSmokeMax=2,ocMedSmokeCh=2,ocMedSmokeCD=20,ocMedSmokeTimer=0;
  var ocMedDartMax=3,ocMedDartCh=3,ocMedDartCD=25,ocMedDartTimer=0;
  var ocMedLongCh=1,ocMedLongCD=30,ocMedLongTimer=0;
  var ocSmokeZones=[],ocGreenSmokes=[],ocLongSmokes=[],ocMedOutlineCache={};
  var ocMedCanFly=null,ocMedCoughCD=0,ocMedLastCough=0;
  function ocMedic(){return playerClass==='medic';}
  function ocCloudAt(p,col,sz,life,op,vy){
    var pm=new THREE.Mesh(new THREE.SphereGeometry(sz,8,8),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op||0.8,depthWrite:false}));
    pm.position.set(p.x+(Math.random()-0.5)*0.8,p.y+0.3+(Math.random()-0.25),p.z+(Math.random()-0.5)*0.8);
    pm.userData={vy:vy||0.12,lifetime:life};
    scene.add(pm);smokeParticles.push(pm);
    return pm;
  }
  function ocMedCanMesh(){
    var g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.07,0.17,12),new THREE.MeshStandardMaterial({color:0xb9c2c9,metalness:0.8,roughness:0.3})));
    var top=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.055,0.05,12),new THREE.MeshStandardMaterial({color:0x555c63,metalness:0.9,roughness:0.25}));
    top.position.y=0.11;g.add(top);
    var ring=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.008,6,16),new THREE.MeshStandardMaterial({color:0xff9922,emissive:0xff6600,emissiveIntensity:0.8}));
    ring.position.y=0.015;ring.rotation.x=Math.PI/2;g.add(ring);
    return g;
  }
  function ocMedDartMesh(){
    var g=new THREE.Group();
    var nd=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.02,0.36,8),new THREE.MeshStandardMaterial({color:0xcfd6dd,metalness:0.95,roughness:0.2}));
    nd.rotation.x=Math.PI/2;g.add(nd);
    var tip=new THREE.Mesh(new THREE.ConeGeometry(0.013,0.06,8),new THREE.MeshStandardMaterial({color:0x22cc66,emissive:0x11aa44,emissiveIntensity:0.9}));
    tip.rotation.x=Math.PI/2;tip.position.z=0.19;g.add(tip);
    for(var fi=0;fi<3;fi++){
      var ff=new THREE.Mesh(new THREE.PlaneGeometry(0.05,0.09),new THREE.MeshStandardMaterial({color:0x3a4a3f,side:THREE.DoubleSide}));
      ff.position.z=-0.16;ff.rotation.y=fi*2.094;ff.rotation.x=0.1;g.add(ff);
    }
    return g;
  }
  function ocMedZoneMine(z){return z.owner==='self'||z.owner===undefined||z.owner===null||String(z.owner)===String(myPlayerId);}
  function ocSmokeInAny(tx,ty,tz){
    var dx=tx,dz=tz;
    for(var i=0;i<ocSmokeZones.length;i++){var z=ocSmokeZones[i];var dd=(dx-z.pos.x)*(dx-z.pos.x)+(dz-z.pos.z)*(dz-z.pos.z);if(dd<z.radius*z.radius)return true;}
    for(var i=0;i<ocGreenSmokes.length;i++){var gz=ocGreenSmokes[i];var d2=(dx-gz.pos.x)*(dx-gz.pos.x)+(dz-gz.pos.z)*(dz-gz.pos.z);if(d2<gz.radius*gz.radius)return true;}
    for(var i=0;i<ocLongSmokes.length;i++){var lz2=ocLongSmokes[i];var d3=(dx-lz2.pos.x)*(dx-lz2.pos.x)+(dz-lz2.pos.z)*(dz-lz2.pos.z);if(d3<lz2.radius*lz2.radius)return true;}
    return false;
  }
  function ocOutlineSet(obj,on){
    if(!obj)return;
    obj.traverse(function(m){
      if(!m.isMesh||!m.material)return;
      if(on){
        if(!m.userData._ocM){m.userData._ocM=m.material;m.material=m.material.clone();}
        var mt=m.material;
        if(mt.emissive){mt.emissive.set(0xff8800);mt.emissiveIntensity=0.9;}
        else if(mt.color)mt.color.set(0xff8800);
      }else if(m.userData._ocM){
        m.material=m.userData._ocM;m.userData._ocM=null;
      }
    });
  }
  // 每幀同步橘色輪廓：在任一煙霧範圍內 → 亮橘，離開 → 還原
  function ocMedOutlineSync(){
    var onE={},onO={},onR={};
    for(var i=0;i<enemies.length;i++){var e=enemies[i];if(!e||e.hp<=0||!e.pos)continue;if(ocSmokeInAny(e.pos.x,e.pos.y+0.45,e.pos.z))onE[i]=1;}
    for(var i=0;i<opponentStates.length;i++){var os=opponentStates[i];if(!os||!os.alive||!os.pos)continue;if(ocSmokeInAny(os.pos.x,os.pos.y+0.7,os.pos.z))onO[i]=1;}
    if(hybridRemoteAi){for(var i=0;i<hybridRemoteAi.length;i++){var a=hybridRemoteAi[i];if(!a||!a.alive||!a.mesh)continue;if(ocSmokeInAny(a.mesh.position.x,a.mesh.position.y+0.5,a.mesh.position.z))onR[i]=1;}}
    for(var k in onE){if(!ocMedOutlineCache['e'+k]&&enemies[k]){ocOutlineSet(enemies[k].mesh,true);ocMedOutlineCache['e'+k]=1;}}
    for(var k in onO){if(!ocMedOutlineCache['o'+k]&&opponentMeshes[k]){ocOutlineSet(opponentMeshes[k],true);ocMedOutlineCache['o'+k]=1;}}
    for(var k in onR){if(!ocMedOutlineCache['r'+k]&&hybridRemoteAi[k]){ocOutlineSet(hybridRemoteAi[k].mesh,true);ocMedOutlineCache['r'+k]=1;}}
    for(var k in ocMedOutlineCache){
      var p=k.charAt(0),idx=+k.slice(1);
      var keep=(p==='e'&&onE[idx])||(p==='o'&&onO[idx])||(p==='r'&&onR[idx]);
      if(keep)continue;
      if(p==='e'&&enemies[idx])ocOutlineSet(enemies[idx].mesh,false);
      else if(p==='o'&&opponentStates[idx]&&opponentMeshes[idx])ocOutlineSet(opponentMeshes[idx],false);
      else if(p==='r'&&hybridRemoteAi[idx]&&hybridRemoteAi[idx].mesh)ocOutlineSet(hybridRemoteAi[idx].mesh,false);
      delete ocMedOutlineCache[k];
    }
  }
  // C：爆破型煙霧彈（20s/顆、最多2顆）
  function ocMedSmokeNade(){
    if(!ocMedic()||ocMedSmokeCh<=0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
    ocMedSmokeCh--;
    if(ocMedSmokeCh<ocMedSmokeMax&&ocMedSmokeTimer<=0)ocMedSmokeTimer=ocMedSmokeCD;
    var fwd=ocCamDir(),m=ocMedCanMesh(),sp=ocFromCam(new THREE.Vector3(0.28,-0.16,-0.45));
    m.position.copy(sp);scene.add(m);
    projectiles.push({mesh:m,pos:sp.clone(),vel:fwd.clone().multiplyScalar(19).add(new THREE.Vector3(0,3.4,0)),life:99,isGrenade:true,subType:'medSmoke',fuse:1.3,fromEnemy:false});
  }
  function ocDeployMedSmoke(p){
    var q=new THREE.Vector3(p.x,0.3,p.z);
    ocSmokeZones.push({pos:q,timer:7,radius:5,owner:'self'});
    for(var i=0;i<14;i++)ocCloudAt(new THREE.Vector3(q.x+(Math.random()-0.5)*3,q.y+Math.random()*2,q.z+(Math.random()-0.5)*3),0xd8dce0,1.7,7,0.9,0.1);
    var light=new THREE.PointLight(0x888899,0.5,6);light.position.set(q.x,1.2,q.z);scene.add(light);
    smokeParticles.push({light:light,pos:q.clone(),lifetime:7});
    try{relaySend({type:'oc_medzone',kind:'smoke',x:q.x,y:q.y,z:q.z,r:5,owner:myPlayerId});}catch(e){}
  }
  // B：治療煙霧針（25s/根、最多3根；命中 -50HP 不扣護甲＋綠色薄霧）
  function ocMedThrowDart(){
    if(!ocMedic()||ocMedDartCh<=0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
    ocMedDartCh--;
    if(ocMedDartCh<ocMedDartMax&&ocMedDartTimer<=0)ocMedDartTimer=ocMedDartCD;
    var fwd=ocCamDir(),m=ocMedDartMesh(),sp=ocFromCam(new THREE.Vector3(0.28,-0.18,-0.5));
    m.position.copy(sp);m.lookAt(sp.clone().add(fwd));scene.add(m);
    projectiles.push({mesh:m,pos:sp.clone(),vel:fwd.clone().multiplyScalar(48),life:99,isGrenade:false,subType:'medDart',fromEnemy:false,medDart:true});
  }
  function ocSpawnGreen(p){
    var gp=new THREE.Vector3(p.x,Math.max(0.05,(p.y!==undefined?p.y:0)),p.z);
    var disc1=new THREE.Mesh(new THREE.CircleGeometry(3.4,20),new THREE.MeshBasicMaterial({color:0x44ff88,transparent:true,opacity:0.14,depthWrite:false}));
    disc1.rotation.x=-Math.PI/2;disc1.position.set(gp.x,0.04,gp.z);scene.add(disc1);
    var disc2=new THREE.Mesh(new THREE.CircleGeometry(2.4,20),new THREE.MeshBasicMaterial({color:0x88ffcc,transparent:true,opacity:0.12,depthWrite:false}));
    disc2.rotation.x=-Math.PI/2;disc2.position.set(gp.x,0.05,gp.z);scene.add(disc2);
    ocGreenSmokes.push({pos:gp,timer:8,radius:3.6,owner:'self',mesh:disc1,mesh2:disc2});
    for(var i=0;i<8;i++)ocCloudAt(gp,0x88ffbb,1.2,8,0.35,0.04);
    try{relaySend({type:'oc_medzone',kind:'green',x:gp.x,y:gp.y,z:gp.z,r:3.6,owner:myPlayerId});}catch(e){}
  }
  // T：長煙（30s/次、最多1次；15m 煙牆＋敵方咳嗽＋輪廓）
  function ocMedLongSmoke(){
    if(!ocMedic()||ocMedLongCh<=0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
    ocMedLongCh=0;ocMedLongTimer=ocMedLongCD;
    var fwd=ocCamDir();fwd.y=Math.max(0.08,fwd.y);
    var seg=1.6,steps=Math.floor(15/seg),cur=pos.clone();cur.y=0.25;
    var depl=[];
    for(var s=1;s<=steps;s++){
      var nx=cur.x+fwd.x*seg,nz=cur.z+fwd.z*seg;
      var ny=cur.y+fwd.y*6*seg;if(ny<0.3)ny=0.3;
      var blocked=false;
      for(var bj=0;bj<mapBoxes.length;bj++){
        var bb=mapBoxes[bj];
        if(bb.isPlatform||bb.isDragonBoat||!bb.mesh.visible)continue;
        if(Math.abs(nx-bb.pos.x)<bb.size.x/2&&Math.abs(ny-bb.pos.y)<bb.size.y/2&&Math.abs(nz-bb.pos.z)<bb.size.z/2){blocked=true;break;}
      }
      cur.set(nx,ny,nz);depl.push(cur.clone());
      if(blocked)break;
    }
    var can=ocMedCanMesh();can.position.copy(pos);can.position.y+=1.1;scene.add(can);
    ocMedCanFly={mesh:can,pos:can.position.clone(),to:cur.clone(),t:0};
    for(var i=0;i<depl.length;i++){ocLongSmokes.push({pos:depl[i],timer:8,radius:2.4,owner:'self'});}
    for(var i=0;i<depl.length;i++){ocCloudAt(depl[i],0xccd3d9,1.4,8,0.8,0.06);ocCloudAt(new THREE.Vector3(depl[i].x-1.2,depl[i].y,depl[i].z),0xccd3d9,1.2,8,0.7,0.06);}
    try{relaySend({type:'oc_medzone',kind:'long',x:cur.x,y:cur.y,z:cur.z,r:2.4,owner:myPlayerId});}catch(e){}
  }
  // 合成咳嗽音效（純 Web Audio，無音檔）
  function ocMedCough(){
    try{
      if(!audioCtx)initAudio();
      if(!audioCtx||audioCtx.state!=='running')return;
      var t0=audioCtx.currentTime;
      for(var c=0;c<2;c++){
        var dur=0.16;
        var buf=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*dur),audioCtx.sampleRate);
        var d=buf.getChannelData(0);
        for(var i=0;i<d.length;i++){var en=Math.pow(1-i/d.length,2.5)*(0.6+0.4*Math.random());d[i]=(Math.random()*2-1)*en*0.7;}
        var src=audioCtx.createBufferSource();src.buffer=buf;
        var f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=500;f.Q.value=1.1;
        var g=audioCtx.createGain();g.gain.setValueAtTime(0.85,t0+c*0.24);
        src.connect(f);f.connect(g);g.connect(audioCtx.destination);
        src.start(t0+c*0.24);
      }
    }catch(e){}
  }
  function ocTickMedic(dt){
    if(playerClass!=='medic'){
      for(var k in ocMedOutlineCache){
        var p=k.charAt(0),idx=+k.slice(1);
        if(p==='e'&&enemies[idx])ocOutlineSet(enemies[idx].mesh,false);
        else if(p==='o'&&opponentStates[idx]&&opponentMeshes[idx])ocOutlineSet(opponentMeshes[idx],false);
        else if(p==='r'&&hybridRemoteAi[idx]&&hybridRemoteAi[idx].mesh)ocOutlineSet(hybridRemoteAi[idx].mesh,false);
      }
      ocMedOutlineCache={};ocSmokeZones=[];ocGreenSmokes=[];ocLongSmokes=[];
      if(ocMedCanFly){scene.remove(ocMedCanFly.mesh);ocMedCanFly=null;}
      return;
    }
    if(!gameStarted||playerHP<=0)return;
    // 被動：每秒 +2 HP +1 護甲（不超過上限）
    if(playerHP<100)playerHP=Math.min(100,playerHP+2*dt);
    if(playerArmor<100)playerArmor=Math.min(100,playerArmor+1*dt);
    // 充能
    if(ocMedSmokeCh<ocMedSmokeMax){ocMedSmokeTimer-=dt;if(ocMedSmokeTimer<=0){ocMedSmokeCh++;ocMedSmokeTimer=(ocMedSmokeCh<ocMedSmokeMax)?ocMedSmokeCD:0;}}
    if(ocMedDartCh<ocMedDartMax){ocMedDartTimer-=dt;if(ocMedDartTimer<=0){ocMedDartCh++;ocMedDartTimer=(ocMedDartCh<ocMedDartMax)?ocMedDartCD:0;}}
    if(ocMedLongCh<1){ocMedLongTimer-=dt;if(ocMedLongTimer<=0){ocMedLongCh=1;ocMedLongTimer=0;}}
    // B：治療煙霧針飛行與命中
    for(var di=projectiles.length-1;di>=0;di--){
      var dp=projectiles[di];
      if(!dp.medDart)continue;
      var od=dp.pos.clone();
      dp.pos.add(dp.vel.clone().multiplyScalar(dt));
      dp.vel.y-=5.5*dt;
      dp.mesh.position.copy(dp.pos);
      dp.mesh.lookAt(dp.pos.clone().add(dp.vel));
      var hitE=null,hitO=null,hitOI=-1,hitR=null,hitRI=-1,ground=false,wall=false;
      for(var ei=0;ei<enemies.length;ei++){var e=enemies[ei];if(!e||e.hp<=0||!e.mesh.visible)continue;var cen=new THREE.Vector3(e.pos.x,e.pos.y+0.45,e.pos.z);if(dp.pos.distanceTo(cen)<0.6||od.distanceTo(cen)<0.6){hitE=e;break;}}
      if(!hitE)for(var oi=0;oi<opponentStates.length;oi++){var os=opponentStates[oi];if(!os||!os.alive)continue;if(dp.pos.distanceTo(os.pos)<0.9){hitO=os;hitOI=oi;break;}}
      if(!hitE&&!hitO&&hybridRemoteAi)for(var hi=0;hi<hybridRemoteAi.length;hi++){var ha=hybridRemoteAi[hi];if(!ha||!ha.alive||!ha.mesh)continue;if(dp.pos.distanceTo(ha.mesh.position)<0.9){hitR=ha;hitRI=hi;break;}}
      if(dp.pos.y<0.12)ground=true;
      if(!hitE&&!hitO&&!hitR&&!ground)for(var bj=0;bj<mapBoxes.length;bj++){var bw=mapBoxes[bj];if(bw.isPlatform||bw.isDragonBoat||!bw.mesh.visible)continue;if(Math.abs(dp.pos.x-bw.pos.x)<bw.size.x/2+0.05&&Math.abs(dp.pos.y-bw.pos.y)<bw.size.y/2+0.05&&Math.abs(dp.pos.z-bw.pos.z)<bw.size.z/2+0.05){wall=true;break;}}
      if(hitE){
        var dh=50;hitE.hp=Math.max(0,hitE.hp-dh);if(hitE.hitTimer)hitE.hitTimer=0.3;
        showDmgNum(hitE.pos.clone().add(new THREE.Vector3(0,1.4,0)),dh,'#66ff88');
        if(hitE.hp<=0)hitE.hp=0;
        ocSpawnGreen(hitE.pos);
        disposeMesh(dp.mesh);projectiles.splice(di,1);continue;
      }
      if(hitO){
        hitO.hp=Math.max(0,hitO.hp-50);hitMarkerTimer=0.15;
        showDmgNum(hitO.pos.clone().add(new THREE.Vector3(0,1.3,0)),50,'#66ff88');
        try{relaySend({type:'hit',hp:50,pierce:50,targetPlayerId:opponentPlayerIds[hitOI],shooterPlayerId:myPlayerId});}catch(e){}
        ocSpawnGreen(hitO.pos);
        disposeMesh(dp.mesh);projectiles.splice(di,1);continue;
      }
      if(hitR){
        hitR.hp=Math.max(0,hitR.hp-50);
        showDmgNum(hitR.mesh.position.clone().add(new THREE.Vector3(0,1.4,0)),50,'#66ff88');
        try{relaySend({type:'oc_knock',aiIdx:hitRI,dmg:50,dx:0,dz:0,dur:0.5});}catch(e){}
        ocSpawnGreen(hitR.mesh.position);
        disposeMesh(dp.mesh);projectiles.splice(di,1);continue;
      }
      if(ground||wall){
        ocSpawnGreen(dp.pos);
        disposeMesh(dp.mesh);projectiles.splice(di,1);
      }
    }
    // 長煙裝置飛行
    if(ocMedCanFly){
      var cf=ocMedCanFly;cf.t+=dt*2.2;
      cf.mesh.position.lerpVectors(cf.pos,cf.to,Math.min(1,cf.t));
      if(cf.t>=1){scene.remove(cf.mesh);ocMedCanFly=null;}
    }
    // 區域更新與區域傷害／咳嗽
    for(var zi=ocSmokeZones.length-1;zi>=0;zi--){var sz=ocSmokeZones[zi];sz.timer-=dt;if(sz.timer<=0)ocSmokeZones.splice(zi,1);}
    for(var li=ocLongSmokes.length-1;li>=0;li--){var ls=ocLongSmokes[li];ls.timer-=dt;if(ls.timer<=0)ocLongSmokes.splice(li,1);}
    ocMedLastCough-=dt;
    for(var gi=ocGreenSmokes.length-1;gi>=0;gi--){
      var gz=ocGreenSmokes[gi];gz.timer-=dt;
      if(gz.timer<=0){if(gz.mesh)scene.remove(gz.mesh);if(gz.mesh2)scene.remove(gz.mesh2);ocGreenSmokes.splice(gi,1);continue;}
      var mine=ocMedZoneMine(gz);
      for(var ei=0;ei<enemies.length;ei++){var e2=enemies[ei];if(!e2||e2.hp<=0||!e2.pos)continue;if(e2.pos.distanceTo(gz.pos)<gz.radius){e2.hp=Math.max(0,e2.hp-1*dt);if(e2.hitTimer)e2.hitTimer=0.12;var n2=Date.now();if(!gz._nt||n2-gz._nt>500){gz._nt=n2;showDmgNum(e2.pos.clone().add(new THREE.Vector3(0,1.4,0)),1,'#88ffbb');}}}
      for(var oi=0;oi<opponentStates.length;oi++){var os2=opponentStates[oi];if(!os2||!os2.alive||!os2.pos)continue;if(os2.pos.distanceTo(gz.pos)<gz.radius)os2.hp=Math.max(0,os2.hp-1*dt);}
      if(!mine&&playerHP>0&&pos.distanceTo(gz.pos)<gz.radius){
        playerHP=Math.max(0,playerHP-1*dt);
        if(ocMedCoughCD<=0){ocMedCoughCD=0.6;showDmgNum(pos.clone().add(new THREE.Vector3(0,1.4,0)),1,'#88ffbb');}
      }
      if(gz.mesh)gz.mesh.material.opacity=0.12+0.05*Math.sin(Date.now()*0.008);
      if(gz.mesh2)gz.mesh2.material.opacity=0.10+0.04*Math.sin(Date.now()*0.007);
    }
    ocMedCoughCD-=dt;
    for(var i=0;i<ocLongSmokes.length;i++){
      var ls2=ocLongSmokes[i];
      if(!ocMedZoneMine(ls2)&&pos.distanceTo(ls2.pos)<ls2.radius&&ocMedLastCough<=0){
        ocMedLastCough=2.0;ocMedCough();
        showToast('😷 咳咳…',1.2);
      }
    }
    ocMedOutlineSync();
  }
  function ocSkillHudText(){
    if(ocEngineer()){
      var zT=ocEngBurnCD>0?(Math.ceil(ocEngBurnCD)+'s'):'就緒';
      var qT=ocEngRootCD>0?(Math.ceil(ocEngRootCD)+'s'):'就緒';
      var xT=ocEngHammerCD>0?(Math.ceil(ocEngHammerCD)+'s'):'就緒';
      var eT=ocEngSonicCD>0?(Math.ceil(ocEngSonicCD)+'s'):'就緒';
      return 'Z 焚牆 '+zT+' ｜ Q 定身 '+qT+' ｜ X 破甲 '+xT+' ｜ E 聲波 '+eT;
    }
    if(ocMedic()){
      var cT=ocMedSmokeCh>0?(ocMedSmokeCh+' 顆'):(ocMedSmokeTimer>0?(Math.ceil(ocMedSmokeTimer)+'s'):'0 顆');
      var bT=ocMedDartCh>0?(ocMedDartCh+' 根'):(ocMedDartTimer>0?(Math.ceil(ocMedDartTimer)+'s'):'0 根');
      var tT=ocMedLongCh>0?'就緒':(ocMedLongTimer>0?(Math.ceil(ocMedLongTimer)+'s'):'充能中');
      return 'C 煙霧 '+cT+' ｜ B 煙針 '+bT+' ｜ T 長煙 '+tT;
    }
    var qT=ocDashCD>0?('冷卻 '+Math.ceil(ocDashCD)+'s'):'就緒';
    var gT=ocNades>0?(ocNades+' 顆'):(ocNadeTimer>0?(Math.ceil(ocNadeTimer)+'s'):'0 顆');
    var fT=ocUltAiming?'瞄準中':(classSkillCD>0?(Math.ceil(classSkillCD)+'s'):'就緒');
    return 'Q 氣能 '+qT+' ｜ G 碎甲 '+gT+' ｜ F 高壓氣縮彈 '+fT;
  }
function useClassSkill(){
  if(!playerClass||classSkillCD>0||classSkillActive||!gameStarted||isDowned||ocSelfKnockT>0)return;
  var cd=0;
  if(playerClass==='berserker'){
    classSkillActive=true;classSkillTimer=6;cd=20;
    window.rageActive=true;
    var rg=new THREE.Mesh(new THREE.SphereGeometry(0.6,12,12),new THREE.MeshBasicMaterial({color:0xff2222,transparent:true,opacity:0.3,depthWrite:false}));
    rg.position.copy(pos);rg.position.y+=0.3;scene.add(rg);
    (function(m){setTimeout(function(){scene.remove(m);},600);})(rg);
    showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),0,'#ff4444');
  }else if(playerClass==='medic'){
    playerHP=Math.min(100,playerHP+40);cd=18;
    document.getElementById('hp-fill').style.width=playerHP+'%';
    document.getElementById('hp-txt').textContent=Math.ceil(playerHP);
    var ring=new THREE.Mesh(new THREE.RingGeometry(0.1,3,24),new THREE.MeshBasicMaterial({color:0x44ff88,transparent:true,opacity:0.4,side:THREE.DoubleSide,depthWrite:false}));
    ring.position.copy(pos);ring.position.y+=0.05;ring.rotation.x=-Math.PI/2;scene.add(ring);
    (function(m){var t=0,i=setInterval(function(){t+=0.05;if(t>=1){clearInterval(i);scene.remove(m);}else{m.scale.setScalar(1+t*4);m.material.opacity=0.4*(1-t);}},50);})(ring);
    showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),40,'#44ff88');
  }else if(playerClass==='assault'){
    if(ocUltAiming){ocUltFireNow();return;}   // 再按一次 F＝確定發射
    ocUltStart();
    return;   // CD 在真正發射時才開始
  }else if(playerClass==='sniper'){
    cd=20;
    window.sniperMarked=null;
    var nearest=null,nd=99;
    for(var ei=0;ei<enemies.length;ei++){
      var ee=enemies[ei];if(ee.hp<=0)continue;
      var d2=ee.pos.distanceTo(pos);
      if(d2<nd){nd=d2;nearest=ee;}
    }
    if(nearest){
      window.sniperMarked=nearest;
      var mark=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),new THREE.MeshBasicMaterial({color:0xff0000,transparent:true,opacity:0.6,depthWrite:false}));
      mark.position.copy(nearest.pos);mark.position.y+=1.2;scene.add(mark);
      (function(m,target){var i=setInterval(function(){if(!target.mesh.visible){clearInterval(i);scene.remove(m);}else{m.position.copy(target.pos);m.position.y+=1.2+Math.sin(Date.now()*0.01)*0.1;}},30);setTimeout(function(){if(m.parent)scene.remove(m);clearInterval(i);window.sniperMarked=null;},8000);})(mark,nearest);
    }
    if(!nearest)cd=2;
  }else if(playerClass==='tank'){
    cd=18;
    for(var ei=0;ei<enemies.length;ei++){
      var ee=enemies[ei];if(ee.hp<=0)continue;
      var d=ee.pos.distanceTo(pos);
      if(d<5){
        var slamDmg=Math.round(30*(1-d/5));
        ee.hp-=slamDmg;
        ee.stunTimer=1.5;
        if(ee.hitTimer)ee.hitTimer=0.5;
        showDmgNum(ee.pos.clone(),slamDmg,'#ff8844');
      }
    }
    screenShake=4;
    var slamRing=new THREE.Mesh(new THREE.RingGeometry(0.2,5,24),new THREE.MeshBasicMaterial({color:0xcc8844,transparent:true,opacity:0.3,side:THREE.DoubleSide,depthWrite:false}));
    slamRing.position.copy(pos);slamRing.position.y+=0.05;slamRing.rotation.x=-Math.PI/2;scene.add(slamRing);
    (function(m){var t=0,i=setInterval(function(){t+=0.05;if(t>=1){clearInterval(i);scene.remove(m);}else{m.scale.setScalar(1+t*2);m.material.opacity=0.3*(1-t);}},50);})(slamRing);
  }else if(playerClass==='ghost'){
    cd=16;
    var fDir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    var newPos=pos.clone().add(fDir.multiplyScalar(10));
    if(newPos.y<0.6)newPos.y=0.6;
    pos.copy(newPos);vel.set(0,0,0);
    window.ghostInvis=true;
    setTimeout(function(){window.ghostInvis=false;},2000);
    var flash=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,8),new THREE.MeshBasicMaterial({color:0x4488ff,transparent:true,opacity:0.4,depthWrite:false}));
    flash.position.copy(pos);flash.position.y+=0.3;scene.add(flash);
    (function(m){setTimeout(function(){scene.remove(m);},400);})(flash);
    showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),0,'#4488ff');
  }
  classSkillCD=cd;
}
// ═════════ 工程師專屬：Z 勤儉持家(焚牆) / Q 強化轉頭(定身) / X 強化錘子(破甲) / E 聲波發射器 ═════════
var ocEngBurnCD=0,ocEngRootCD=0,ocEngHammerCD=0,ocEngSonicCD=0;
var ocEngBurnActive=false,ocEngBurnT=0,ocEngTargetBox=null,ocEngFlameMesh=null;
var ocEngRootT=0,ocEngSwingT=0,ocEngHammerMesh=null,ocEngDrone=null;
var ocEngSonicZones=[],ocEngSonicLocal=0,ocEngVigEl=null,ocEngVigOn=false,ocEngVigT=0;
function ocEngineer(){return playerClass==='engineer';}
function ocEngCanBurn(bx){
  if(!bx||!bx.mesh||!bx.mesh.visible)return false;
  if(bx.isPermanent||bx.isFloor||bx.isPlatform||bx.isDragonBoat||bx.isTarget||bx.border||bx.cyl||bx.light||bx.isRange)return false;
  if(bx.size&&bx.size.y<0.6)return false;
  return true;
}
function ocEngNearest(maxD,minDot){
  var fwd=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);fwd.y=0;
  var fl=Math.sqrt(fwd.x*fwd.x+fwd.z*fwd.z)||1;fwd.x/=fl;fwd.z/=fl;
  var best=null,bd=maxD;
  for(var i=0;i<enemies.length;i++){var e=enemies[i];if(!e||e.hp<=0||!e.mesh||!e.mesh.visible)continue;var dx=e.pos.x-pos.x,dz=e.pos.z-pos.z,d=Math.sqrt(dx*dx+dz*dz);if(d>maxD)continue;var dt0=d>0.001?(dx*fwd.x+dz*fwd.z)/d:1;if(dt0<minDot)continue;if(d<bd){bd=d;best={kind:'e',idx:i,obj:e,pos:new THREE.Vector3(e.pos.x,e.pos.y+0.45,e.pos.z)};}}
  for(var j=0;j<opponentStates.length;j++){var os=opponentStates[j];if(!os||!os.alive||!os.pos)continue;var dx2=os.pos.x-pos.x,dz2=os.pos.z-pos.z,d2=Math.sqrt(dx2*dx2+dz2*dz2);if(d2>maxD)continue;var dt1=d2>0.001?(dx2*fwd.x+dz2*fwd.z)/d2:1;if(dt1<minDot)continue;if(d2<bd){bd=d2;best={kind:'o',idx:j,obj:os,pos:new THREE.Vector3(os.pos.x,os.pos.y+0.7,os.pos.z)};}}
  if(hybridRemoteAi){for(var k=0;k<hybridRemoteAi.length;k++){var a=hybridRemoteAi[k];if(!a||!a.alive||!a.mesh)continue;var mp=a.mesh.position,dx3=mp.x-pos.x,dz3=mp.z-pos.z,d3=Math.sqrt(dx3*dx3+dz3*dz3);if(d3>maxD)continue;var dt2=d3>0.001?(dx3*fwd.x+dz3*fwd.z)/d3:1;if(dt2<minDot)continue;if(d3<bd){bd=d3;best={kind:'r',idx:k,obj:a,pos:new THREE.Vector3(mp.x,mp.y+0.5,mp.z)};}}}
  return best;
}
function ocEngFlameGunMesh(){
  var g=new THREE.Group();
  var body=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.055,0.34,10),new THREE.MeshStandardMaterial({color:0x2b2f33,metalness:0.6,roughness:0.5}));
  body.rotation.x=Math.PI/2;g.add(body);
  var tMat=new THREE.MeshStandardMaterial({color:0xcc5522,metalness:0.6,roughness:0.4});
  var tank=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.2,10),tMat);tank.position.set(0,0.09,0.06);g.add(tank);
  var tank2=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.2,10),tMat);tank2.position.set(0,0.09,0.28);g.add(tank2);
  var noz=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.026,0.3,8),new THREE.MeshStandardMaterial({color:0x9aa0a6,metalness:0.8,roughness:0.3}));
  noz.rotation.x=Math.PI/2;noz.position.set(0,0,-0.3);g.add(noz);
  var tip=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.02,0.04,8),new THREE.MeshStandardMaterial({color:0x222222,metalness:0.7,roughness:0.4}));
  tip.rotation.x=Math.PI/2;tip.position.set(0,0,-0.46);g.add(tip);
  var pilot=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.12,8),new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:0.9}));
  pilot.rotation.x=-Math.PI/2;pilot.position.set(0,0,-0.55);g.add(pilot);g.userData.tip=pilot;
  return g;
}
function ocEngHammerModel(){
  var g=new THREE.Group();
  var handle=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.024,0.5,8),new THREE.MeshStandardMaterial({color:0x5a3a22,roughness:0.8}));
  handle.rotation.z=Math.PI/2.2;g.add(handle);
  var head=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.12,0.12),new THREE.MeshStandardMaterial({color:0x777d84,metalness:0.85,roughness:0.3}));
  head.position.set(0.3,0.11,0);g.add(head);
  var spike=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.1,6),new THREE.MeshStandardMaterial({color:0x9aa0a6,metalness:0.9,roughness:0.25}));
  spike.position.set(0.3,0.22,0);g.add(spike);
  return g;
}
function ocEngDroneMesh(){
  var g=new THREE.Group();
  var core=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,10),new THREE.MeshStandardMaterial({color:0x3a3f45,metalness:0.8,roughness:0.3}));g.add(core);
  var ring=new THREE.Mesh(new THREE.TorusGeometry(0.16,0.02,6,16),new THREE.MeshStandardMaterial({color:0x66ddff,emissive:0x22aaff,emissiveIntensity:0.9}));ring.rotation.x=Math.PI/2;g.add(ring);
  var ant=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.14,6),new THREE.MeshStandardMaterial({color:0x9aa0a6,metalness:0.8}));ant.position.y=0.16;g.add(ant);
  var tip=new THREE.Mesh(new THREE.SphereGeometry(0.02,6,6),new THREE.MeshBasicMaterial({color:0xff3333}));tip.position.y=0.24;g.add(tip);
  return g;
}
function ocEngFlameFX(p){
  if(Math.random()<0.75){
    var fl=new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.07,6,6),new THREE.MeshBasicMaterial({color:(Math.random()<0.5?0xff5a00:0xffaa22),transparent:true,opacity:0.85,depthWrite:false}));
    fl.position.set(p.x+(Math.random()-0.5)*0.2,p.y+(Math.random()-0.5)*0.2,p.z+(Math.random()-0.5)*0.2);
    fl.userData={vy:0.7,lifetime:0.5};scene.add(fl);smokeParticles.push(fl);
  }
}
function ocEngImpactFX(p,big){
  var ring=new THREE.Mesh(new THREE.RingGeometry(0.1,big?0.7:0.4,20),new THREE.MeshBasicMaterial({color:0xffcc44,transparent:true,opacity:0.85,side:THREE.DoubleSide,depthWrite:false}));
  ring.position.copy(p);ring.rotation.x=-Math.PI/2;scene.add(ring);
  (function(m){var t=0,iv=setInterval(function(){t+=0.033;if(t>=0.5){clearInterval(iv);scene.remove(m);return;}m.scale.setScalar(1+t*5);m.material.opacity=0.85*(1-t/0.5);},33);})(ring);
  var n=big?12:7;
  for(var i=0;i<n;i++){
    var sp=new THREE.Mesh(new THREE.SphereGeometry(0.03,5,5),new THREE.MeshBasicMaterial({color:0xffdd55,transparent:true,opacity:0.9}));
    sp.position.copy(p);scene.add(sp);
    var dd=new THREE.Vector3(Math.random()-0.5,Math.random()*0.8,Math.random()-0.5).normalize().multiplyScalar(2+Math.random()*2);
    (function(m,d2){var t=0,iv=setInterval(function(){t+=0.033;if(t>=0.5){clearInterval(iv);scene.remove(m);return;}m.position.addScaledVector(d2,0.05);m.material.opacity=0.9*(1-t/0.5);},33);})(sp,dd);
  }
}
// Q 強化轉頭：近戰定身 3s（不扣護甲），期間每秒 1 傷
function ocEngRootStrike(){
  if(!ocEngineer()||ocEngRootCD>0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
  ocEngRootCD=20;
  var tgt=ocEngNearest(2.8,0.2);
  if(!tgt){showToast('強化轉頭 落空',0.6);return;}
  ocEngImpactFX(tgt.pos,false);screenShake=Math.max(screenShake,0.8);
  if(tgt.kind==='e'){tgt.obj.rootT=3;showDmgNum(tgt.pos.clone(),0,'#88ddff');}
  else if(tgt.kind==='r'){try{relaySend({type:'oc_root',aiIdx:tgt.idx,dur:3,shooterPlayerId:myPlayerId});}catch(e){}showDmgNum(tgt.pos.clone(),0,'#88ddff');}
  else if(tgt.kind==='o'){var rpid=opponentPlayerIds[tgt.idx];try{relaySend({type:'oc_root',targetPlayerId:rpid,dur:3,shooterPlayerId:myPlayerId});}catch(e){}showDmgNum(tgt.pos.clone(),0,'#88ddff');}
  showToast('強化轉頭！定身 3s',0.8);
}
// X 強化錘子：近戰破 80 護甲 + 重擊特效
function ocEngHammerStrike(){
  if(!ocEngineer()||ocEngHammerCD>0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
  ocEngHammerCD=25;
  if(!ocEngHammerMesh){ocEngHammerMesh=ocEngHammerModel();scene.add(ocEngHammerMesh);}
  ocEngSwingT=0.35;
  var tgt=ocEngNearest(2.8,0.15);
  if(!tgt){showToast('強化錘子 落空',0.6);return;}
  ocEngImpactFX(tgt.pos,true);screenShake=Math.max(screenShake,1.6);
  if(tgt.kind==='e'){tgt.obj.armor=Math.max(0,(tgt.obj.armor||0)-80);tgt.obj.hitTimer=0.3;showDmgNum(tgt.pos.clone(),80,'#66ccff');}
  else if(tgt.kind==='r'){try{relaySend({type:'oc_armorbreak',aiIdx:tgt.idx,amount:80,shooterPlayerId:myPlayerId});}catch(e){}showDmgNum(tgt.pos.clone(),80,'#66ccff');}
  else if(tgt.kind==='o'){var hpid=opponentPlayerIds[tgt.idx];try{relaySend({type:'oc_armorbreak',targetPlayerId:hpid,amount:80,shooterPlayerId:myPlayerId});}catch(e){}showDmgNum(tgt.pos.clone(),80,'#66ccff');}
  showToast('強化錘子！-80 護甲',0.8);
}
// Z 勤儉持家：持續焚燒可燃牆 5 秒 → 摧毀 + 回 50HP/10甲
function ocEngStartBurn(){
  if(!ocEngineer()||ocEngBurnCD>0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
  ocEngBurnActive=true;ocEngBurnT=0;ocEngTargetBox=null;
  if(!ocEngFlameMesh){ocEngFlameMesh=ocEngFlameGunMesh();scene.add(ocEngFlameMesh);}
  showToast('持續噴火 5 秒焚毀牆壁',1.2);
}
function ocEngBurnCancel(){ocEngBurnActive=false;ocEngBurnT=0;ocEngTargetBox=null;if(ocEngFlameMesh){scene.remove(ocEngFlameMesh);ocEngFlameMesh=null;}}
function ocEngDestroyWall(bx){
  if(!bx||!bx.mesh)return;
  scene.remove(bx.mesh);disposeMesh(bx.mesh);
  var idx=mapBoxes.indexOf(bx);if(idx>=0)mapBoxes.splice(idx,1);
  playerHP=Math.min(100,playerHP+50);
  playerArmor=Math.min(100,playerArmor+10);
  showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),50,'#ffaa44');
  showToast('🔥 牆壁焚毀！+50HP +10甲',1.6);
  screenShake=Math.max(screenShake,1.0);
  ocEngBurnCD=30;ocEngBurnCancel();
}
// E 聲波發射器：發射干擾無人機 → 半徑 5m 干擾區
function ocEngSonic(){
  if(!ocEngineer()||ocEngSonicCD>0||!gameStarted||isDowned||!locked||ocSelfKnockT>0)return;
  ocEngSonicCD=35;
  var fwd=ocCamDir();fwd.y=Math.max(0.06,fwd.y);fwd.normalize();
  var start=ocFromCam(new THREE.Vector3(0.22,-0.05,-0.45));
  var drone=ocEngDroneMesh();drone.position.copy(start);scene.add(drone);
  var to=start.clone().add(fwd.multiplyScalar(10));to.y=Math.max(0.5,to.y);
  ocEngDrone={mesh:drone,from:start.clone(),to:to,t:0};
  showToast('聲波發射器 已發射',0.8);
}
function ocEngDeploySonic(p){
  var q=new THREE.Vector3(p.x,0.1,p.z);
  var dome=new THREE.Mesh(new THREE.SphereGeometry(5,20,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0x33aaff,transparent:true,opacity:0.12,side:THREE.DoubleSide,depthWrite:false}));
  dome.position.copy(q);scene.add(dome);
  var ring=new THREE.Mesh(new THREE.RingGeometry(4.6,5,32),new THREE.MeshBasicMaterial({color:0x66ddff,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(q.x,0.06,q.z);scene.add(ring);
  ocEngSonicZones.push({pos:q,timer:8,radius:5,owner:'self',dome:dome,ring:ring});
  try{relaySend({type:'oc_sonic',x:q.x,y:q.y,z:q.z,r:5,owner:myPlayerId,dur:8});}catch(e){}
}
function ocEngSonicAt(x,z){
  for(var i=0;i<ocEngSonicZones.length;i++){var zn=ocEngSonicZones[i];var dx=x-zn.pos.x,dz=z-zn.pos.z;if(dx*dx+dz*dz<zn.radius*zn.radius)return true;}
  return false;
}
function ocEngVigUpdate(inSonic,dt){
  if(inSonic&&!ocEngVigOn){
    ocEngVigOn=true;
    if(!ocEngVigEl){
      ocEngVigEl=document.createElement('div');
      ocEngVigEl.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:11;pointer-events:none;opacity:0;transition:opacity .15s;overflow:hidden';
      var scan=document.createElement('div');
      scan.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,rgba(90,205,255,.20) 0px,rgba(90,205,255,.20) 2px,rgba(0,0,0,0) 2px,rgba(0,0,0,0) 5px)';
      var rip=document.createElement('div');
      rip.style.cssText='position:absolute;left:50%;top:50%;width:0;height:0;border-radius:50%;border:2px solid rgba(120,225,255,.55);transform:translate(-50%,-50%);will-change:width,height,opacity';
      var vig=document.createElement('div');
      vig.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 30%,rgba(10,60,120,.55) 100%)';
      var gl=document.createElement('div');
      gl.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;background:linear-gradient(90deg,rgba(255,60,60,.18),rgba(60,255,120,.14),rgba(60,140,255,.20),rgba(255,60,60,.18));mix-blend-mode:screen';
      ocEngVigEl.appendChild(vig);ocEngVigEl.appendChild(scan);ocEngVigEl.appendChild(rip);ocEngVigEl.appendChild(gl);
      ocEngVigEl._scan=scan;ocEngVigEl._rip=rip;ocEngVigEl._gl=gl;ocEngVigEl._ripP=0;
      document.body.appendChild(ocEngVigEl);
    }
    ocEngVigEl.style.opacity='1';
  }else if(!inSonic&&ocEngVigOn){
    ocEngVigOn=false;
    if(ocEngVigEl)ocEngVigEl.style.opacity='0';
    if(renderer&&renderer.domElement){renderer.domElement.style.filter='';renderer.domElement.style.transform='';}
  }
  if(inSonic){
    ocEngVigT+=dt;
    var t=ocEngVigT;
    var wob=Math.sin(t*11)*26+Math.sin(t*23)*10;
    var blur=1.4+Math.abs(Math.sin(t*15))*2.6;
    if(renderer&&renderer.domElement){
      renderer.domElement.style.filter='hue-rotate('+wob.toFixed(1)+'deg) blur('+blur.toFixed(2)+'px) saturate(1.9) contrast(1.18)';
      var jx=Math.sin(t*17.3)*3.2, jy=Math.sin(t*13.7)*2.6;
      renderer.domElement.style.transform='perspective(620px) translate('+jx.toFixed(2)+'px,'+jy.toFixed(2)+'px) rotateY('+(Math.sin(t*9.1)*4.5).toFixed(2)+'deg) rotateX('+(Math.sin(t*7.3)*3.5).toFixed(2)+'deg) skewX('+(Math.sin(t*11.7)*3).toFixed(2)+'deg) scale('+(1.02+Math.abs(Math.sin(t*6))*0.03).toFixed(3)+')';
    }
    if(ocEngVigEl){
      ocEngVigEl._scan.style.backgroundPositionY=(t*46%10).toFixed(1)+'px';
      ocEngVigEl._gl.style.opacity=(0.35+Math.abs(Math.sin(t*19))*0.65).toFixed(2);
      ocEngVigEl._ripP+=dt/0.9;
      if(ocEngVigEl._ripP>1){ocEngVigEl._ripP=0;}
      var rp=ocEngVigEl._ripP;
      if(ocEngVigEl._rip){ocEngVigEl._rip.style.width=(rp*70)+'vmax';ocEngVigEl._rip.style.height=(rp*70)+'vmax';ocEngVigEl._rip.style.opacity=((1-rp)*0.8).toFixed(2);}
    }
    screenShake=Math.max(screenShake,0.5);
  }
}
function ocTickEngineer(dt){
  if(ocEngBurnCD>0)ocEngBurnCD=Math.max(0,ocEngBurnCD-dt);
  if(ocEngRootCD>0)ocEngRootCD=Math.max(0,ocEngRootCD-dt);
  if(ocEngHammerCD>0)ocEngHammerCD=Math.max(0,ocEngHammerCD-dt);
  if(ocEngSonicCD>0)ocEngSonicCD=Math.max(0,ocEngSonicCD-dt);
  // 被定身（被其他工程師）→ 每秒 1 傷
  if(ocEngRootT>0){ocEngRootT-=dt;if(playerHP>0)playerHP=Math.max(0,playerHP-1*dt);if(ocEngRootT<0)ocEngRootT=0;}
  for(var i=0;i<enemies.length;i++){var e=enemies[i];if(e&&e.rootT>0){e.rootT-=dt;if(e.hp>0)e.hp=Math.max(0,e.hp-1*dt);if(e.rootT<0)e.rootT=0;}}
  if(hybridRemoteAi){for(var j=0;j<hybridRemoteAi.length;j++){var a=hybridRemoteAi[j];if(a&&a.rootT>0){a.rootT-=dt;if(a.alive&&a.hp>0)a.hp=Math.max(0,a.hp-1*dt);if(a.rootT<0)a.rootT=0;}}}
  // 錘子揮擊顯示
  if(ocEngSwingT>0){ocEngSwingT-=dt;if(ocEngSwingT<=0&&ocEngHammerMesh){scene.remove(ocEngHammerMesh);ocEngHammerMesh=null;}}
  // Z 焚牆通道
  if(ocEngineer()&&ocEngBurnActive){
    if(!keys['KeyZ']||isDowned||!gameStarted||ocSelfKnockT>0){ocEngBurnCancel();}
    else{
      if(ocEngFlameMesh){ocEngFlameMesh.position.copy(ocFromCam(new THREE.Vector3(0.22,-0.2,-0.5)));ocEngFlameMesh.quaternion.copy(cam.quaternion);if(ocEngFlameMesh.userData.tip)ocEngFlameMesh.userData.tip.scale.setScalar(0.8+Math.random()*0.6);}
      var fwd=ocCamDir();
      var ray=new THREE.Raycaster(cam.position,fwd,0.1,3.6);
      var cand=[];for(var b=0;b<mapBoxes.length;b++){if(ocEngCanBurn(mapBoxes[b]))cand.push(mapBoxes[b].mesh);}
      var hits=ray.intersectObjects(cand,false);
      if(hits.length){
        var hitBox=null;for(var k=0;k<mapBoxes.length;k++){if(mapBoxes[k].mesh===hits[0].object){hitBox=mapBoxes[k];break;}}
        if(hitBox){
          if(hitBox===ocEngTargetBox)ocEngBurnT+=dt;else{ocEngTargetBox=hitBox;ocEngBurnT=dt;}
          ocEngFlameFX(hits[0].point);
          if(ocEngBurnT>=5)ocEngDestroyWall(hitBox);
        }
      }else{ocEngBurnT=0;ocEngTargetBox=null;}
    }
  }else if(!ocEngineer()&&ocEngFlameMesh){ocEngBurnCancel();}
  // 無人機飛行
  if(ocEngDrone){
    var dr=ocEngDrone;dr.t+=dt*1.05;
    if(dr.t>=1){scene.remove(dr.mesh);ocEngDeploySonic(dr.to);ocEngDrone=null;}
    else{dr.mesh.position.lerpVectors(dr.from,dr.to,dr.t);dr.mesh.rotation.y+=dt*6;}
  }
  // 聲波區更新
  for(var zi=ocEngSonicZones.length-1;zi>=0;zi--){
    var zn=ocEngSonicZones[zi];zn.timer-=dt;
    if(zn.dome&&zn.dome.material)zn.dome.material.opacity=0.10+0.05*Math.sin(Date.now()*0.006);
    if(zn.ring)zn.ring.rotation.z+=dt*1.6;
    if(zn.timer<=0){if(zn.dome)scene.remove(zn.dome);if(zn.ring)scene.remove(zn.ring);ocEngSonicZones.splice(zi,1);}
  }
  // 自己是否身處（非自己發射的）聲波區
  var inSonic=false;
  for(var si=0;si<ocEngSonicZones.length;si++){
    var sz=ocEngSonicZones[si];
    if(ocMedZoneMine(sz))continue;
    if(pos.distanceTo(sz.pos)<sz.radius){inSonic=true;break;}
  }
  if(isDowned||playerHP<=0)inSonic=false;
  ocEngSonicLocal=inSonic?1:0;
  ocEngVigUpdate(inSonic,dt);
}
function getMapBounds(){
  if(currentMap==='nuclear')return{minX:-20,maxX:20,minZ:-20,maxZ:20};
  if(currentMap==='arena2')return{minX:-22,maxX:22,minZ:-16,maxZ:16};
  if(currentMap==='flooded')return{minX:-16,maxX:16,minZ:-16,maxZ:16};
  if(currentMap==='basemap3')return{minX:-30,maxX:30,minZ:-30,maxZ:30};
  if(currentMap==='arena3')return{minX:-58,maxX:58,minZ:-58,maxZ:58};
  if(currentMap==='zombielair')return{minX:-28.8,maxX:28.8,minZ:-28.8,maxZ:28.8};
  return{minX:-BASE_HALF,maxX:BASE_HALF,minZ:-BASE_HALF,maxZ:BASE_HALF};
}
function drawMinimap(){
  var cv=document.getElementById('minimap');
  if(!cv||cv.style.display!=='block')return;
  var ctx=cv.getContext('2d');var W=140,H=140;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,.55)';
  ctx.fillRect(0,0,W,H);
  var b=getMapBounds();
  var mw=b.maxX-b.minX,mh=b.maxZ-b.minZ;
  var pad=6,mapW=W-pad*2,mapH=H-pad*2;
  var scale=Math.min(mapW/mw,mapH/mh);
  var offX=(W-mw*scale)/2,offY=(H-mh*scale)/2;
  function m2c(pX,pZ){
    return{x:offX+(pX-b.minX)*scale,y:offY+(b.maxZ-pZ)*scale};
  }
  ctx.strokeStyle='rgba(255,255,255,.15)';
  ctx.lineWidth=0.5;
  ctx.strokeRect(offX,offY,mw*scale,mh*scale);
  // Enemies
  for(var ei=0;ei<enemies.length;ei++){
    var ee=enemies[ei];if(ee.hp<=0)continue;
    var ep=m2c(ee.pos.x,ee.pos.z);
    ctx.beginPath();ctx.arc(ep.x,ep.y,3,0,Math.PI*2);
    ctx.fillStyle=ee.hitTimer>0?'#ff6644':'#ff2222';
    ctx.fill();
  }
  // Multiplayer opponents
  if(isMultiplayer&&opponentStates){
    for(var oi=0;oi<opponentStates.length;oi++){
      var os=opponentStates[oi];
      if(!os||!os.alive||!os.pos)continue;
      // opponentStates 存的是 pos 物件。舊碼讀 os.x/os.z 永遠是 undefined，
      // 被 ||0 兜成 0，綠點就永遠釘在地圖原點不動（你看到只有一個不動的綠點）。
      var op=m2c(os.pos.x,os.pos.z);
      ctx.beginPath();ctx.arc(op.x,op.y,3,0,Math.PI*2);
      ctx.fillStyle='#44ff44';ctx.fill();
    }
  }
  // Hybrid 非主機：AI 放在 hybridRemoteAi，enemies 是空的。
  // 不補這個迴圈，非主機的小地圖上會一個 AI 點都沒有。
  if(hybridMode&&hybridRemoteAi){
    for(var ha=0;ha<hybridRemoteAi.length;ha++){
      var hac=hybridRemoteAi[ha];
      if(!hac||!hac.alive)continue;
      var hap=m2c(hac.mesh.position.x,hac.mesh.position.z);
      ctx.beginPath();ctx.arc(hap.x,hap.y,2.5,0,Math.PI*2);
      ctx.fillStyle='#ff6666';ctx.fill();
    }
  }
  // Boss
  if(!isMultiplayer&&bossActive&&boss){
    var bp=m2c(boss.pos.x,boss.pos.z);
    ctx.beginPath();ctx.arc(bp.x,bp.y,5,0,Math.PI*2);
    ctx.strokeStyle='#ff6600';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='rgba(255,102,0,.3)';ctx.fill();
  }
  // Player
  var pp=m2c(pos.x,pos.z);
  ctx.save();ctx.translate(pp.x,pp.y);ctx.rotate(-yaw);
  ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();
  ctx.fillStyle='#ffffff';ctx.fill();
  ctx.restore();
  // Border
  ctx.strokeStyle='rgba(200,170,70,.35)';ctx.lineWidth=1;
  ctx.strokeRect(0,0,W,H);
}
// ZOMBIE LAIR S3
var zlState={wave:1,timeLeft:150,phase:'wave',collapsed:false,collapseT:0};
var zlMapElements=[],zlHouseParts=[],zlDebris=[];
function bossApplyDmg(dmg){
  if(!boss||dmg<=0)return 0;
  var dealt=0;
  if(boss.armor&&boss.armor>0){
    var od=dmg; boss.armor-=dmg;
    if(boss.armor<0){od=-boss.armor;boss.armor=0;}else od=0;
    dealt+=od;
  }else dealt=dmg;
  boss.hp-=dealt; if(boss.hp<0)boss.hp=0;
  return dealt;
}
function createZombieLairMap(){
  if(zlMapElements.length)return;
  var Z=28.8,bw=0.5,bh=5.5,bc=0x3a5a3a;
  // floor
  var fg=new THREE.Mesh(new THREE.BoxGeometry(Z*2,0.2,Z*2),new THREE.MeshStandardMaterial({color:0x2a3a2a,roughness:0.8}));
  fg.position.set(0,-0.1,0); scene.add(fg); zlMapElements.push({mesh:fg,isZombieLair:true});
  mapBoxes.push({pos:fg.position.clone(),size:new THREE.Vector3(Z*2,0.2,Z*2),mesh:fg,isZombieLair:true});
  // perimeter walls
  var pw=0.6;
  function addW(p,s,c){var g=new THREE.BoxGeometry(s.x,s.y,s.z);var m=new THREE.MeshStandardMaterial({color:c,roughness:0.8});var mesh=new THREE.Mesh(g,m);mesh.position.copy(p);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);zlMapElements.push({mesh:mesh,isZombieLair:true});mapBoxes.push({pos:p.clone(),size:s.clone(),mesh:mesh,isZombieLair:true});}
  addW(new THREE.Vector3(0,bh/2,-Z),new THREE.Vector3(Z*2,bh,pw),0x2f4f2f);
  addW(new THREE.Vector3(0,bh/2,Z),new THREE.Vector3(Z*2,bh,pw),0x2f4f2f);
  addW(new THREE.Vector3(-Z,bh/2,0),new THREE.Vector3(pw,bh,Z*2),0x2f4f2f);
  addW(new THREE.Vector3(Z,bh/2,0),new THREE.Vector3(pw,bh,Z*2),0x2f4f2f);
  // central house
  function addHW(p,s,c){var g=new THREE.BoxGeometry(s.x,s.y,s.z);var m=new THREE.MeshStandardMaterial({color:c,roughness:0.7});var mesh=new THREE.Mesh(g,m);mesh.position.copy(p);scene.add(mesh);zlHouseParts.push(mesh);zlMapElements.push({mesh:mesh,isZombieLair:true});mapBoxes.push({pos:p.clone(),size:s.clone(),mesh:mesh,isZombieLair:true});}
  // each wall split into 2 segments around door gap 3.6 (±1.8)
  var hhw=9,hhh=5.5,dg=3.6,d=9,d2=dg/2;
  addHW(new THREE.Vector3(-(hhw-d2)/2,hhh/2,-d),new THREE.Vector3(hhw-d2,hhh,bw),0x4a6a4a); // south left
  addHW(new THREE.Vector3((hhw-d2)/2,hhh/2,-d),new THREE.Vector3(hhw-d2,hhh,bw),0x4a6a4a); // south right
  addHW(new THREE.Vector3(-(hhw-d2)/2,hhh/2,d),new THREE.Vector3(hhw-d2,hhh,bw),0x4a6a4a);  // north left
  addHW(new THREE.Vector3((hhw-d2)/2,hhh/2,d),new THREE.Vector3(hhw-d2,hhh,bw),0x4a6a4a);   // north right
  addHW(new THREE.Vector3(-d,hhh/2,-(hhw-d2)/2),new THREE.Vector3(bw,hhh,hhw-d2),0x4a6a4a);// west bottom
  addHW(new THREE.Vector3(-d,hhh/2,(hhw-d2)/2),new THREE.Vector3(bw,hhh,hhw-d2),0x4a6a4a); // west top
  addHW(new THREE.Vector3(d,hhh/2,-(hhw-d2)/2),new THREE.Vector3(bw,hhh,hhw-d2),0x4a6a4a); // east bottom
  addHW(new THREE.Vector3(d,hhh/2,(hhw-d2)/2),new THREE.Vector3(bw,hhh,hhw-d2),0x4a6a4a);  // east top
  // roof
  addHW(new THREE.Vector3(0,hhh+bw/2,0),new THREE.Vector3(2*hhw,bw,2*hhw),0x4a6a4a);
}
// 殭屍 OBJ 模型（zombiedata.js，Y-up、面向 +Z、腳在 y=0、高 1.15）。
// geometry / material 全部殭屍共用一份 → mesh 必須標 sharedGeo/sharedMat，
// 否則第一隻被 disposeMesh 清掉就會把共用資源毀掉（auth.js 有配合檢查）。
function ocZombieTex(){
  if(window._ocZombieTex)return window._ocZombieTex;
  var tex=new THREE.TextureLoader().load('zombie/lowpoly_tex.png');
  try{tex.colorSpace=THREE.SRGBColorSpace;}catch(e){}
  // 色板貼圖：用 Nearest 避免取樣到隔壁色塊
  tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
  tex.generateMipmaps=false;
  try{tex.anisotropy=renderer.capabilities.getMaxAnisotropy();}catch(e){}
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  window._ocZombieTex=tex;return tex;
}
function ocZombieGeo(){
  if(window._ocZombieGeo)return window._ocZombieGeo;
  if(!window.OC_ZOMBIE_MODEL)return null;
  var M=window.OC_ZOMBIE_MODEL;
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(ocB64f32(M.p),3));
  geo.setAttribute('normal',new THREE.BufferAttribute(ocB64f32(M.n),3));
  geo.setAttribute('uv',new THREE.BufferAttribute(ocB64f32(M.u),2));
  geo.setIndex(new THREE.BufferAttribute(ocB64u16(M.i),1));
  geo.computeBoundingSphere();
  window._ocZombieGeo=geo;return geo;
}
function ocZombieMat(){
  if(window._ocZombieMat)return window._ocZombieMat;
  var m=new THREE.MeshStandardMaterial({map:ocZombieTex(),roughness:0.85,metalness:0.05,side:THREE.DoubleSide});
  window._ocZombieMat=m;return m;
}
// 回傳 OBJ 殭屍 mesh（共用資源）；沒有資料回傳 null（回退程序生成）
function ocBuildZombieMesh(){
  var geo=ocZombieGeo();
  if(!geo)return null;
  var mesh=new THREE.Mesh(geo,ocZombieMat());
  mesh.userData.sharedGeo=true;mesh.userData.sharedMat=true;
  return mesh;
}
function createZombieMesh(){
  var g=new THREE.Group();
  var modelMesh=ocBuildZombieMesh();
  if(modelMesh){
    modelMesh.rotation.y=Math.PI;   // 模型實際朝 -Z，轉 180° 才面向玩家
    g.add(modelMesh);
    g.userData.modelMesh=modelMesh;
    // 程序版的 legL/armL 旋轉對單一網格無效 → zombieTick 改用整體搖擺
  }else{
    var body=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.6,0.25),new THREE.MeshStandardMaterial({color:0x5a7a4a,roughness:0.8}));
    body.position.y=0.55; g.add(body);
    var head=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.28,0.28),new THREE.MeshStandardMaterial({color:0x7a8a5a,roughness:0.7,emissive:0x334d22,emissiveIntensity:0.3}));
    head.position.set(0,0.94,0.08); g.add(head);
    var armL=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,0.12),new THREE.MeshStandardMaterial({color:0x5a7a4a}));
    armL.position.set(-0.32,0.5,0.05); armL.rotation.x=0.6; g.add(armL);
    var armR=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,0.12),new THREE.MeshStandardMaterial({color:0x5a7a4a}));
    armR.position.set(0.32,0.5,0.05); armR.rotation.x=0.6; g.add(armR);
    var legL=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.5,0.14),new THREE.MeshStandardMaterial({color:0x445533}));
    legL.position.set(-0.13,0.25,0); g.add(legL);
    var legR=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.5,0.14),new THREE.MeshStandardMaterial({color:0x445533}));
    legR.position.set(0.13,0.25,0); g.add(legR);
    g.userData.legL=legL; g.userData.legR=legR; g.userData.armL=armL; g.userData.armR=armR;
  }
  g.userData.t=0;
  scene.add(g);
  return g;
}
function spawnZombieWave(wave){
  var counts=[2,3,5]; var c=counts[wave-1]||5;
  var pts=[[0,10.5],[0,-10.5],[10.5,0],[-10.5,0],[9,9],[-9,9],[9,-9],[-9,-9]];
  for(var i=0;i<c;i++){
    var p=pts[i%pts.length];
    var g=createZombieMesh();
    g.position.set(p[0],0,p[1]);
    var hBar=makeBarGroup(0x44cc44,0.07,0.052);
    hBar.position.set(p[0],0.86,p[1]); scene.add(hBar);
    var aBar=makeBarGroup(0x4488ff,0.045,0.032);
    aBar.position.set(p[0],0.79,p[1]); scene.add(aBar);
    var e={mesh:g,pos:new THREE.Vector3(p[0],0,p[1]),hp:100,maxHp:100,armor:20,maxArmor:20,isZombie:true,type:'zombie',
          hBar:hBar,aBar:aBar,hBarFill:hBar.userData.fill,aBarFill:aBar.userData.fill,
          vel:new THREE.Vector3(),desiredVel:new THREE.Vector3(),hitTimer:0,shootCD:0,knifeHits:0,burnTimer:0,
          state:'chase',zlSide:1};
    enemies.push(e);
    if(window._makeNamePlate){
      var np=window._makeNamePlate('ZOMB-'+String(enemies.length),true);
      if(np){scene.add(np);e.namePlate=np;}
    }
  }
}
function zombieTick(e,dt){
  if(!e||e.hp<=0){e.mesh.visible=false;if(e.hBar){e.hBar.visible=false;e.aBar.visible=false;}return;}
  if(e.hitTimer>0)e.hitTimer-=dt;
  if(e.shootCD>0)e.shootCD-=dt;
  e.mesh.userData.t=(e.mesh.userData.t||0)+dt;
  var legL=e.mesh.userData.legL,legR=e.mesh.userData.legR,armL=e.mesh.userData.armL,armR=e.mesh.userData.armR;
  if(legL){legL.rotation.x=Math.sin(e.mesh.userData.t*8)*0.4;}
  if(legR){legR.rotation.x=-Math.sin(e.mesh.userData.t*8)*0.4;}
  if(armL){armL.rotation.x=0.6+Math.sin(e.mesh.userData.t*6)*0.2;}
  if(armR){armR.rotation.x=0.6-Math.sin(e.mesh.userData.t*6)*0.2;}
  // OBJ 模型：單一網格 → 用整體上下浮動 + 左右搖擺模擬走路
  var mm=e.mesh.userData.modelMesh;
  if(mm){
    var tt=e.mesh.userData.t;
    mm.position.y=Math.abs(Math.sin(tt*7))*0.06;
    mm.rotation.z=Math.sin(tt*7)*0.06;
    mm.rotation.x=0.1+Math.sin(tt*5)*0.04;
  }
  var to=new THREE.Vector3(pos.x-e.pos.x,0,pos.z-e.pos.z); var d=to.length();
  if(d>0.05){var dir=to.normalize(); e.pos.x+=dir.x*3.2*dt; e.pos.z+=dir.z*3.2*dt;}
  // collision with mapBoxes
  var eR=0.25;
  for(var bi=0;bi<mapBoxes.length;bi++){
    var bx=mapBoxes[bi];if(bx.size.y<0.3||!bx.mesh.visible)continue;
    if(e.pos.y>bx.pos.y+bx.size.y/2||e.pos.y+0.5<bx.pos.y-bx.size.y/2)continue;
    var dx=e.pos.x-bx.pos.x,dz=e.pos.z-bx.pos.z;
    var ox=bx.size.x/2+eR-Math.abs(dx),oz=bx.size.z/2+eR-Math.abs(dz);
    if(ox>0&&oz>0){if(ox<oz)e.pos.x+=dx>0?ox:-ox;else e.pos.z+=dz>0?oz:-oz;}
  }
  var b=getMapBounds(); e.pos.x=Math.max(b.minX+1,Math.min(b.maxX-1,e.pos.x)); e.pos.z=Math.max(b.minZ+1,Math.min(b.maxZ-1,e.pos.z));
  e.mesh.position.set(e.pos.x,e.pos.y,e.pos.z);
  e.mesh.rotation.y=Math.atan2(pos.x-e.pos.x,pos.z-e.pos.z);
  // update bars
  try{updateEnemyBars(e);}catch(ex){}
  // melee
  if(d<1.8&&e.shootCD<=0){e.shootCD=1.0; playerDamage(12,e.pos); showDmgNum(pos.clone(),12,'#ff4400');}
}
function initZombieLair(){
  // clear base enemies
  for(var i=0;i<enemies.length;i++){
    var ee=enemies[i];
    if(!ee||ee.isZombie)continue;
    ee.hp=0; ee.mesh.visible=false;
    if(ee.hBar){ee.hBar.visible=false;} if(ee.aBar){ee.aBar.visible=false;}
  }
  // remove zombies
  for(var zi=enemies.length-1;zi>=0;zi--){
    var ze=enemies[zi];
    if(ze&&ze.isZombie){
      if(ze.mesh){try{disposeMesh(ze.mesh);}catch(eb){}}
      if(ze.hBar){try{scene.remove(ze.hBar);}catch(eb){}}
      if(ze.aBar){try{scene.remove(ze.aBar);}catch(eb){}}
      if(ze.namePlate){try{scene.remove(ze.namePlate);}catch(eb){}}
      enemies.splice(zi,1);
    }
  }
  zlState.wave=1; zlState.phase='wave'; zlState.collapsed=false; zlState.collapseT=0; zlState.timeLeft=(gameDifficulty==='conf'?140:150);
  var zh=document.getElementById('zl-virus-hud'); if(zh)zh.style.display='block';
  var zlt=document.getElementById('zl-time-left'); if(zlt)zlt.textContent=zlState.timeLeft;
  var nw=document.getElementById('nuclear-wave'); if(nw){nw.style.display='block'; nw.textContent='🧟 第 1 波 · 2隻殭屍'; nw.style.color='#8dff6a';}
  var bh=document.getElementById('boss-hp-wrap'); if(bh)bh.style.display='none';
  bossActive=false; bossSpawned=false; boss=null;
  // reset collapse parts if needed
  for(var kp=0;kp<zlHouseParts.length;kp++){
    var mp=zlHouseParts[kp]; mp.position.set(mp.position.x, (mp.position.y>0?5.5:mp.position.y), mp.position.z); mp.rotation.set(0,0,0); mp.visible=true;
  }
  spawnZombieWave(1);
  try{startZlMusic();}catch(e){}
}
function zlSpawnBoss(){
  if(bossSpawned)return;
  bossSpawned=true; bossActive=true;
  var g=new THREE.Group();
  var BOSS_SCALE=3.6;   // 殭屍模型高 1.15 → 放大成 4.14 的巨大殭屍王
  var modelMesh=ocBuildZombieMesh();
  if(modelMesh){
    modelMesh.scale.setScalar(BOSS_SCALE);
    // 王要更凶：整體微微前傾 + 發紅光（模型朝 -Z → 先轉 180° 面向玩家）
    modelMesh.rotation.y=Math.PI;
    modelMesh.rotation.x=0.12;
    try{
      var glowMat=ocZombieMat().clone();
      glowMat.emissive=new THREE.Color(0x661111);
      glowMat.emissiveIntensity=0.55;
      glowMat.userData=(glowMat.userData||{});
      modelMesh.material=glowMat;
      modelMesh.userData.sharedMat=false;   // 獨立材質，可安全 dispose
    }catch(ex){}
    g.add(modelMesh);
    g.userData.modelMesh=modelMesh;
  }else{
    var body=new THREE.Mesh(new THREE.BoxGeometry(2.4,3.2,1.0),new THREE.MeshStandardMaterial({color:0x4a6a4a,roughness:0.6,emissive:0x335533,emissiveIntensity:0.4}));
    body.position.y=1.9; g.add(body);
    var head=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),new THREE.MeshStandardMaterial({color:0x7a8a5a,roughness:0.5,emissive:0x444d33,emissiveIntensity:0.5}));
    head.position.set(0,3.2,0.2); g.add(head);
    var armL=new THREE.Mesh(new THREE.BoxGeometry(0.5,2.8,0.5),new THREE.MeshStandardMaterial({color:0x4a6a4a}));
    armL.position.set(-1.2,1.6,0); armL.rotation.x=0.4; g.add(armL);
    var armR=new THREE.Mesh(new THREE.BoxGeometry(0.5,2.8,0.5),new THREE.MeshStandardMaterial({color:0x4a6a4a}));
    armR.position.set(1.2,1.6,0); armR.rotation.x=0.4; g.add(armR);
    var legL=new THREE.Mesh(new THREE.BoxGeometry(0.6,2.2,0.6),new THREE.MeshStandardMaterial({color:0x445533}));
    legL.position.set(-0.5,1.1,0); g.add(legL);
    var legR=new THREE.Mesh(new THREE.BoxGeometry(0.6,2.2,0.6),new THREE.MeshStandardMaterial({color:0x445533}));
    legR.position.set(0.5,1.1,0); g.add(legR);
    g.userData.armL=armL; g.userData.armR=armR;
  }
  g.userData.t=0;
  var bp=new THREE.Vector3(0,0,0);
  g.position.set(bp.x,0,bp.z); scene.add(g);
  var bh=document.getElementById('boss-hp-wrap'); if(bh)bh.style.display='flex';
  document.getElementById('boss-label').textContent='🧟 巨大殭屍王';
  document.getElementById('boss-hp-fill').style.width='100%';
  boss={mesh:g,pos:bp.clone(),hp:500,maxHp:500,armor:40,hitTimer:0,attackCD:0,isZl:true,bossScale:BOSS_SCALE};
}
function zlVictory(){
  if(!gameStarted)return;                 // 玩家已死亡/已回主選單 → 不重複跳結算
  gameStarted=false;didPlayGame=false;locked=false;
  stopZlMusic();
  if(document.pointerLockElement)document.exitPointerLock();
  document.getElementById('mobile-controls').style.display='none';
  document.getElementById('blocker').style.display='none';
  currentMap='base';applyMapSettings();
  var xpEarned=10+50;
  addXP(xpEarned);addProficiency();
  document.getElementById('settlement-xp').textContent='+'+xpEarned;
  var li=getLevelInfo(playerXP);
  document.getElementById('settlement-level').textContent='Lv.'+li.level+' ('+li.current+' / '+li.needed+')';
  document.getElementById('settlement-progress-fill').style.width=(li.current/li.needed*100)+'%';
  document.getElementById('settlement-daily').style.display='none';
  document.getElementById('settlement-xp-label').textContent='經 驗 值';
  document.getElementById('settlement-title').textContent='🧟 殭屍老巢 通關！';
  document.getElementById('session-sp').style.display='none';
  document.getElementById('settlement').style.display='flex';
  updateLevelDisplay();updateCoinsDisplay();updateArmoryGunCounts();
}
function zlBossTick(dt){
  if(!bossActive||!boss)return;
  if(boss.hp<=0){
    bossActive=false;
    try{if(boss.mesh)boss.mesh.visible=false;}catch(ex){}
    var bhf=document.getElementById('boss-hp-fill'); if(bhf)bhf.style.width='0%';
    var nw=document.getElementById('nuclear-wave'); if(nw){nw.textContent='🧟 殭屍王 已被擊敗！'; nw.style.color='#4f4';}
    try{earnCoins(30000);}catch(ex){}
    showDmgNum(pos.clone(),30000,'#fa4');
    zlState.phase='done';
    zlState.timeLeft=99999;   // 勝利後停掉抗病毒倒數，避免結算前被計時器弄死
    var zh=document.getElementById('zl-virus-hud'); if(zh)zh.style.display='none';
    document.getElementById('round-clear').textContent='🧟 殭屍老巢 通關！';
    document.getElementById('round-clear').style.color='#4f4';
    document.getElementById('round-clear').style.display='block';
    setTimeout(function(){var rc=document.getElementById('round-clear');if(rc)rc.style.display='none';},1600);
    if(!window._zlVictoryTimer)window._zlVictoryTimer=setTimeout(function(){window._zlVictoryTimer=null;zlVictory();},1700);
    return;
  }
  if(boss.hitTimer>0)boss.hitTimer-=dt;
  if(boss.attackCD>0)boss.attackCD-=dt;
  boss.mesh.userData.t=(boss.mesh.userData.t||0)+dt;
  var al=boss.mesh.userData.armL,ar=boss.mesh.userData.armR;
  if(al)al.rotation.x=0.4+Math.sin(boss.mesh.userData.t*5)*0.3;
  if(ar)ar.rotation.x=0.4-Math.sin(boss.mesh.userData.t*5)*0.3;
  // OBJ 模型：整體沉重步伐（上下浮動 + 前後搖）
  var bmm=boss.mesh.userData.modelMesh;
  if(bmm){
    var bt=boss.mesh.userData.t;
    bmm.position.y=Math.abs(Math.sin(bt*3.2))*0.18;
    bmm.rotation.x=0.12+Math.sin(bt*3.2)*0.05;
    bmm.rotation.z=Math.sin(bt*3.2)*0.07;
  }
  var to=new THREE.Vector3(pos.x-boss.pos.x,0,pos.z-boss.pos.z); var d=to.length();
  if(d>0.08){var dir=to.normalize(); boss.pos.x+=dir.x*2.5*dt; boss.pos.z+=dir.z*2.5*dt;}
  boss.pos.x=Math.max(-27,Math.min(27,boss.pos.x)); boss.pos.z=Math.max(-27,Math.min(27,boss.pos.z));
  boss.mesh.position.set(boss.pos.x,0,boss.pos.z);
  boss.mesh.rotation.y=Math.atan2(pos.x-boss.pos.x,pos.z-boss.pos.z);
  var bpct=boss.hp/boss.maxHp*100; document.getElementById('boss-hp-fill').style.width=Math.max(0,bpct)+'%';
  if(d<3&&boss.attackCD<=0){boss.attackCD=1.2; playerDamage(15,boss.pos); showDmgNum(pos.clone(),15,'#ff4444'); showBossAtkLabel('👊 殭屍王重擊');}
}
function updateZombieLair(dt){
  if(!gameStarted)return;
  // ensure HUDs stay visible (CSS default is display:none)
  var nwEl=document.getElementById('nuclear-wave'); if(nwEl&&zlState.phase!=='done'&&nwEl.style.display!=='block')nwEl.style.display='block';
  if(zlState.phase!=='done'){var zvh=document.getElementById('zl-virus-hud'); if(zvh&&zvh.style.display!=='flex')zvh.style.display='flex';}
  // timer
  zlState.timeLeft-=dt;
  var zlt=document.getElementById('zl-time-left'); if(zlt){zlt.textContent=Math.max(0,Math.floor(zlState.timeLeft+0.999)); if(zlState.timeLeft<30)zlt.style.color='#ff4444'; else zlt.style.color='#8dff6a';}
  if(zlState.timeLeft<=0){
    zlState.timeLeft=0;
    try{playerDamage(99999,pos);}catch(ex){}
  }
  // waves
  if(zlState.phase==='wave'){
    // count alive zombies
    var alive=0; for(var i=0;i<enemies.length;i++)if(enemies[i].isZombie&&enemies[i].hp>0)alive++;
    if(alive===0){
      zlState.timeLeft+=10;
      if(zlState.wave<3){
        zlState.wave+=1;
        var nw=document.getElementById('nuclear-wave'); if(nw)nw.textContent='🧟 第 '+zlState.wave+' 波 · '+[2,3,5][zlState.wave-1]+'隻殭屍';
        spawnZombieWave(zlState.wave);
      }else{
        // collapse
        zlState.phase='collapse'; zlState.collapseT=0; screenShake=8;
        var nw=document.getElementById('nuclear-wave'); if(nw){nw.textContent='⚠ 房屋崩塌！殭屍王即將現身...'; nw.style.color='#ffaa44';}
      }
    }
  }else if(zlState.phase==='collapse'){
    zlState.collapseT+=dt;
    for(var kp=0;kp<zlHouseParts.length;kp++){
      var mp=zlHouseParts[kp];
      if(mp.visible!==false){
        mp.rotation.x+=dt*1.2*(kp%3+1)*0.2;
        mp.rotation.z+=dt*1.8*(kp%5+1)*0.3;
        mp.position.y-=dt*4;
        if(mp.position.y<-8)mp.visible=false;
      }
    }
    if(zlState.collapseT>=2.5){
      // hide house parts and spawn boss
      for(var kp2=0;kp2<zlHouseParts.length;kp2++)zlHouseParts[kp2].visible=false;
      zlState.phase='boss';
      zlSpawnBoss();
    }
  }else if(zlState.phase==='boss'){
    zlBossTick(dt);
  }
}
// end zl

var lastTime=0;
function animate(time){try{
  if(window._extActive){requestAnimationFrame(animate);return;}
  var dt=Math.min((time-lastTime)/1000,0.05);lastTime=time;
  moveX=0;moveZ=0;
  if(!reviving){if(keys['KeyA']||keys['ArrowLeft'])moveX-=1;
  if(keys['KeyD']||keys['ArrowRight'])moveX+=1;
if(keys['KeyW']||keys['ArrowUp'])moveZ+=1;
if(keys['KeyS']||keys['ArrowDown'])moveZ-=1;}
if(localStorage.getItem('oc_ui_mode')==='mobile'){moveX+=mobileMoveX;moveZ+=mobileMoveZ;}
  if(locked&&!gameStarted){countdown-=dt;sl.position.set(pos.x,5,pos.z);sl.target.position.copy(pos);    if(countdown<=0){gameStarted=true;didPlayGame=true;countdown=0;['map-select','diff-select','char-select','class-select'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});onGround=true;scene.remove(sl);scene.remove(sl.target);roundEarnings=0;sessionSP=0;recalcProdBonuses();if(!rangeMode){document.getElementById('session-sp').style.display='block';document.getElementById('session-sp-val').textContent='0';}attachFlashlightMesh(); if(ufoMode){spawnUFO();document.getElementById('round-clear').textContent='🛸 UFO 來襲！';document.getElementById('round-clear').style.color='#4df';document.getElementById('round-clear').style.display='block';setTimeout(function(){document.getElementById('round-clear').style.display='none';},2000);}if(!isMultiplayer&&!rangeMode){if(bossRushMode){spawnBossRush();}else if(currentMap==='nuclear'){for(var nxi=0;nxi<enemies.length;nxi++){var nx=enemies[nxi];nx.hp=0;nx.mesh.visible=false;if(nx.hBar)nx.hBar.visible=false;if(nx.aBar)nx.aBar.visible=false;}radWattage=0;radImmuneTimer=0;nuclearClears=0;nuclearWave=1;bossActive=false;bossSpawned=false;radDamageAccum=0;spawnRadWater();spawnCleanerWave();document.getElementById('nuclear-ui').style.display='flex';document.getElementById('nuclear-wave').style.display='block';document.getElementById('boss-hp-wrap').style.display='none';document.getElementById('boss-hp-fill').style.width='100%';}else if(currentMap==='flooded'){playerO2=100;floodedWave=1;floodedClears=0;bossFloodedActive=false;bossFloodedSpawned=false;abyssalMaw=null;floodedBossPhase=1;airBubbles=[];harpoonProjectiles=[];oxyVents=[];bubbleTimer=2;spawnOxyVents();for(var fxi=0;fxi<enemies.length;fxi++){var fx=enemies[fxi];fx.hp=0;fx.mesh.visible=false;if(fx.hBar)fx.hBar.visible=false;if(fx.aBar)fx.aBar.visible=false;}document.getElementById('boss-hp-wrap').style.display='none';document.getElementById('o2-wrap').style.display='flex';spawnDiverWave();}else if(currentMap==='zombielair'){initZombieLair();}else{var tgt=Math.min(2+Math.floor(roundNum*0.8),maxEnemies);for(var ei=0;ei<maxEnemies;ei++){var e=enemies[ei];if(ei<tgt){e.hp=e.maxHp;e.armor=e.maxArmor;randomizeEnemyType(e);var stT2=(e.type==='sniper')?ocPickSniperTower(ei):null;var rp_=stT2?stT2.pos.clone():getRandomSpawnPos(true,pos,8);e.pos.copy(rp_);e.mesh.position.copy(rp_);e.towerPerch=stT2?rp_.clone():null;e.aiTarget=null;e.vel.set(0,0,0);e.desiredVel.set(0,0,0);if(currentMap==='basemap3'){e.towerPerch=null;if(e.type==='sniper'||ei%3===0){e.pos.set(3+Math.random()*8,36,3+Math.random()*8);e.mesh.position.copy(e.pos);e.roofTop=true;e.climbL=null;}else{e.pos.y=0;e.mesh.position.y=e.pos.y;e.roofTop=false;e.climbL=null;}if(e.hBar)e.hBar.position.copy(e.pos);if(e.aBar)e.aBar.position.copy(e.pos);if(e.hBar)e.hBar.position.y+=CUBELING_BAR;if(e.aBar)e.aBar.position.y+=CUBELING_BAR-0.07;}e.mesh.visible=true;if(e.hBar){e.hBar.visible=true;e.hBar.position.copy(e.pos);e.hBar.position.y+=CUBELING_BAR;}if(e.aBar){e.aBar.visible=true;e.aBar.position.copy(e.pos);e.aBar.position.y+=CUBELING_BAR-0.07;}e.knifeHits=0;e.burnTimer=0;}else{e.hp=0;e.mesh.visible=false;if(e.hBar){e.hBar.visible=false;}if(e.aBar){e.aBar.visible=false;}}}}}}}
  if(locked&&gameStarted&&currentMap==='dragonboat'&&dragonBoatElements)dragonBoatElements.forEach(function(b){if(b.mesh)b.mesh.visible=true;});
  if(locked&&gameStarted)updatePhysics(dt);
  cam.position.set(pos.x,pos.y+EYE_H-(sliding?0.35:0),pos.z);
  cam.rotation.order='YXZ';cam.rotation.set(pitch,yaw,0);
  if(ocSelfKnockT>0||ocSelfKnockStand>0)cam.rotation.z=ocSelfRoll();
  var gDir2=new THREE.Vector3(0,0,-1);gDir2.applyQuaternion(cam.quaternion);
  var rc2=new THREE.Raycaster(cam.position,gDir2);
  var meshes2=[];for(var i=0;i<mapBoxes.length;i++)meshes2.push(mapBoxes[i].mesh);
  var h2=rc2.intersectObjects(meshes2);var sg=true;
  for(var i=0;i<h2.length;i++){if(h2[i].distance<0.6){sg=false;break;}}
  if(gunGroup)gunGroup.visible=sg;
  if(gunGroup&&(ocUltShowT>0||ocUltAiming))gunGroup.visible=false;
  if(gunGroup&&currentGun==='awp'&&isADS)gunGroup.visible=false;
  if(ocUltMesh)ocUltMesh.visible=(ocUltShowT>0||ocUltAiming);
  ocTickAssault(dt);
  ocTickMedic(dt);
  ocTickEngineer(dt);
  // Radiation projectile updates
  for(var rpi=projectiles.length-1;rpi>=0;rpi--){
    var rp=projectiles[rpi];
    if(!rp.dir)continue;
    rp.life-=dt;
    if(rp.life<=0){disposeMesh(rp.mesh);if(rp.light)disposeMesh(rp.light);projectiles.splice(rpi,1);continue;}
    var step=rp.dir.clone().multiplyScalar(rp.speed*dt);
    rp.pos.add(step);
    rp.mesh.position.copy(rp.pos);
    if(rp.light)rp.light.position.copy(rp.pos);
    // Check enemy hits
    var hitAny=false;
    for(var rei=0;rei<enemies.length;rei++){
      var ren=enemies[rei];
      if(ren.mesh.visible===false)continue;
      if(rp.hitEnemies.indexOf(rei)!==-1)continue;
      var rdist=rp.pos.distanceTo(ren.pos);
      if(rdist<0.6){
        rp.hitEnemies.push(rei);
        hitAny=true;
        var rdmg=rp.dmg;
        if(ren.armor>0){var rod=rdmg;ren.armor-=rdmg;if(ren.armor<0){rod=-ren.armor;ren.armor=0}else rod=0;if(rod>0){ren.hp-=rod;if(ren.hp<0)ren.hp=0}}
        else{ren.hp-=rdmg;if(ren.hp<0)ren.hp=0}
        ren.hitTimer=0.3;hitMarkerTimer=0.15;
        showDmgNum(ren.pos,rdmg,'#44ff44');
        spawnRadZone(ren.pos.clone(),3+Math.round(rp.chargeMult*2),1.2+Math.round(rp.chargeMult),8+Math.round(rp.dmg*0.6));
        if(ren.hp<=0){ren.mesh.visible=false;ren.hp=0;if(currentMap==='nuclear'&&ren.isCleaner)nuclearClears++;earnCoins(1000);checkKillAch();roundEarnings+=1000;showDmgNum(ren.pos,1000,'#fa4');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}}
      }
    }
    // Boss hit
    if(!isMultiplayer&&bossActive&&boss&&boss.mesh){
      var bdist=rp.pos.distanceTo(boss.pos);
      if(bdist<1.2){
        var bdmg=Math.round(rp.dmg*0.5);
        bossApplyDmg(bdmg);
        if(boss.hp<0)boss.hp=0;
        boss.hitTimer=0.3;
        hitMarkerTimer=0.15;
        spawnRadZone(boss.pos.clone(),2,1.5,5);
        showDmgNum(boss.pos,bdmg,'#44ff44');
        rp.life=0;
      }
    }
    // Wall hit
    var wHit=false;
    for(var rwi=0;rwi<mapBoxes.length;rwi++){
      if(mapBoxes[rwi].mesh.visible===false)continue;
      var rbox=new THREE.Box3().setFromObject(mapBoxes[rwi].mesh);
      if(rbox.containsPoint(rp.pos)){wHit=true;break;}
    }
    if(wHit){
      spawnRadZone(rp.pos.clone(),3+Math.round(rp.chargeMult*2),1+Math.round(rp.chargeMult),6+Math.round(rp.dmg*0.4));
      rp.life=0;
    }
    if(!hitAny)rp.mesh.material.emissiveIntensity=1.5+rp.chargeMult*2+Math.sin(Date.now()*0.005)*0.5;
  }
  // RadRifle drop visual (only decoration — rifle already auto-granted on boss death)
  if(window.radRifleDrop&&!gameStarted){
    window.radRifleDrop.glow.material.opacity=0.15+Math.sin(Date.now()*0.005)*0.1;
    window.radRifleDrop.mesh.rotation.y+=dt*2;
  }
  // Radiation zone updates
  for(var rzi=radiationZones.length-1;rzi>=0;rzi--){
    var rz=radiationZones[rzi];
    rz.timer-=dt;
    var rzAlpha=Math.min(0.5,rz.timer/rz.life*0.5);
    rz.mesh.material.opacity=rzAlpha;
    rz.mesh.scale.setScalar(1+Math.sin(Date.now()*0.003+rz.timer)*0.05);
    for(var rzei=0;rzei<enemies.length;rzei++){
      var rze=enemies[rzei];
      if(rze.mesh.visible===false)continue;
      var rzd=rze.pos.distanceTo(rz.pos);
      if(rzd<rz.size){
        var rzdmg=rz.dmgPerSec*dt;
        if(rze.armor>0){rze.armor-=rzdmg;if(rze.armor<0)rze.armor=0}
        else{rze.hp-=rzdmg;if(rze.hp<0)rze.hp=0}
        rze.hitTimer=0.1;
        if(rze.hp<=0){rze.mesh.visible=false;rze.hp=0;if(currentMap==='nuclear'&&rze.isCleaner)nuclearClears++;earnCoins(1000);checkKillAch();roundEarnings+=1000;showDmgNum(rze.pos,1000,'#fa4');if(window.lifesteal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}}
      }
    }
    if(rz.timer<=0){
      scene.remove(rz.mesh);if(rz.light)scene.remove(rz.light);
      radiationZones.splice(rzi,1);
    }
  }
  // Ladder prompt (BasicMap3) + climb HUD
  if(currentMap==='basemap3'){
    var lpEl=document.getElementById('ladder-prompt');
    var chEl=document.getElementById('climb-hud');
    if(climbT){chEl.style.display='block';if(lpEl)lpEl.style.opacity='0';}
    else{
      chEl.style.display='none';
      var Ln=closestLadder();
      if(lpEl){lpEl.style.opacity=(Ln&&pos.y<30)?'1':'0';lpEl.textContent=Ln?'按 V 爬梯':'';
      }
    }
  }else{
    var chEl2=document.getElementById('climb-hud');if(chEl2)chEl2.style.display='none';
    var lpEl2=document.getElementById('ladder-prompt');if(lpEl2)lpEl2.style.opacity='0';
  }
  // Boat ride proximity prompt (higher priority than zipline)
  if(locked&&gameStarted&&!boatRideActive&&currentMap==='dragonboat'){
    var nearBoat=pos.distanceTo(new THREE.Vector3(0,0.62,0))<3;
    if(nearBoat){
      document.getElementById('boat-prompt').style.opacity='1';
      document.getElementById('boat-prompt').textContent='按 E 上龍舟';
      document.getElementById('zipline-prompt').style.opacity='0';
      document.getElementById('zipline-prompt').textContent='';
    }else{
      document.getElementById('boat-prompt').style.opacity='0';
      document.getElementById('boat-prompt').textContent='';
      // Zipline proximity prompt (only if not near boat)
      if(!ziplineActive){
        var nearZ=false;
        for(var zi=0;zi<ziplines.length;zi++){
          var z=ziplines[zi];
          if(pos.distanceTo(z.start)<3||pos.distanceTo(z.end)<3){nearZ=true;break;}
        }
        document.getElementById('zipline-prompt').style.opacity=nearZ?'1':'0';
        document.getElementById('zipline-prompt').textContent=nearZ?'按 E 使用滑索':'';
      }
    }
  }
  // Gameplay update gate (pause when ESC is pressed)
  // ── Hybrid 模擬與重生「不能」受指標鎖定限制 ──
  // hybridLocalDeath() 會 document.exitPointerLock()，若這些 tick 放在
  // if(locked&&gameStarted){...} 內（animate 的 11592~12200 行），死亡後
  // locked=false → 整段被跳過 → 重生倒數凍結、永遠卡在屍體畫面；
  // 主機死亡解鎖時更嚴重：整間房的 AI 也停止模擬，其他真人無敵。
  if(hybridMode){
    hybridDebugBeacon(dt);
    // 主機的 AI 模擬/廣播不能只靠 rAF：背景分頁的 rAF 會被 Chrome 幾乎停掉，
    // 那時整場 AI 就永久停止廣播，其他人看到的世界會像暫停。
    // 這裡只更新時間戳，實際推進交給 ocHybridInterval（rAF 與 interval 都能驅動）。
    if(hostAiSim())ocHybridTickAt=performance.now();
    hybridRespawnTick(dt);
    if(hostAiSim()){hybridHostAiTick(dt);updateEnemies(dt);}   // 主機權威 AI 移動
    else hybridRemoteAiTick(dt);                               // 非主機 AI 插值
  }
  // 死亡自動繼續倒數「不能」受指標鎖定限制：死亡畫面會 exitPointerLock，
  // 若放在 if(locked&&gameStarted) 內，locked=false 會讓倒數凍結、玩家永遠卡在死亡畫面。
  if(_autoResumeCD>0&&gameStarted){
    _autoResumeCD-=dt;
    var _arEl=document.getElementById('auto-resume-timer');
    _arEl.textContent='自動繼續 '+Math.ceil(_autoResumeCD)+'s';
    if(_autoResumeCD<=0){_arEl.style.display='none';document.getElementById('multi-continue-btn').click();}
  }
  if(locked&&gameStarted){
    if(slowTimer>0)slowTimer-=dt;
    // Down state
    if(isDowned){
      if(beingRevived){downTimer=Math.max(downTimer,999);}
      else{
        downTimer-=dt;
        if(downTimer<=0){isDowned=false;beingRevived=false;if(tdmMode){relaySend({type:'tdm_bleedout',playerId:myPlayerId});tdmFinalDeath();}else{onPlayerDeath();}}
      }
    }
    document.getElementById('down-overlay').style.display=isDowned?'flex':'none';
    if(isDowned){if(!beingRevived)document.getElementById('down-timer').textContent=Math.ceil(downTimer);}
    // TDM: revive downed teammate (hold E)
    if(tdmMode&&useDowned&&gameStarted&&!isDowned&&!tdmWinSubmitted){
      var reviveNearIdx=-1,reviveNearDist=9999;
      for(var ri=0;ri<teamMates.length;ri++){
        var rtm=teamMates[ri];if(!rtm.downed)continue;
        var rts=teammateStates[ri];if(!rts)continue;
        var rdist=pos.distanceTo(rts.pos);
        if(rdist<2.4&&rdist<reviveNearDist){reviveNearDist=rdist;reviveNearIdx=ri;}
      }
      if(reviveNearIdx>=0){
        if(keys['KeyE']){
          if(reviveTargetIdx!==reviveNearIdx){reviveTargetIdx=reviveNearIdx;reviveTimer=0;reviving=true;relaySend({type:'tdm_revive_start',targetPlayerId:teamMates[reviveNearIdx].id});}
          reviveTimer+=dt;
          var rpFill=Math.min(1,reviveTimer/5);
          if(teamMates[reviveNearIdx])teamMates[reviveNearIdx].reviveProgress=rpFill;
          document.getElementById('revive-prompt').style.display='block';
          document.getElementById('revive-prompt').textContent='按住 E 救援中 '+Math.round(rpFill*100)+'%';
          document.getElementById('revive-progress').style.display='block';
          document.getElementById('revive-progress-fill').style.width=(rpFill*100)+'%';
          if(reviveTimer>=5){
            relaySend({type:'tdm_revive_done',targetPlayerId:teamMates[reviveNearIdx].id});
            if(teamMates[reviveNearIdx]){teamMates[reviveNearIdx].downed=false;teamMates[reviveNearIdx].reviveProgress=0;}
            reviveTargetIdx=-1;reviveTimer=0;reviving=false;
            document.getElementById('revive-prompt').style.display='none';
            document.getElementById('revive-progress').style.display='none';
          }
        }else{
          if(reviveTargetIdx>=0){relaySend({type:'tdm_revive_cancel',targetPlayerId:teamMates[reviveTargetIdx].id});}
          reviveTargetIdx=-1;reviveTimer=0;reviving=false;
          document.getElementById('revive-progress').style.display='none';
          document.getElementById('revive-prompt').style.display='block';
          document.getElementById('revive-prompt').textContent='按住 E 救援隊友';
        }
      }else{
        if(reviveTargetIdx>=0){relaySend({type:'tdm_revive_cancel',targetPlayerId:teamMates[reviveTargetIdx].id});}
        reviveTargetIdx=-1;reviveTimer=0;reviving=false;
        document.getElementById('revive-prompt').style.display='none';
        document.getElementById('revive-progress').style.display='none';
      }
    }else{
      reviveTargetIdx=-1;reviveTimer=0;reviving=false;
    }
    // Inspect timer
    if(inspectTimer>0){inspectTimer-=dt;if(inspectTimer<0)inspectTimer=0;}
    // Reload timer + bolt offset reset on completion
    if(isReloading){reloadTimer-=dt;if(reloadTimer<=0){isReloading=false;reloadTimer=0;boltTarget=0;boltOffset=0;var attachEff1=getAttachEffects(currentGun);gunAmmo[currentGun]=gunData[currentGun].mag+(attachEff1.ammoBonus||0);if(gunGroup&&gunGroup.userData&&gunGroup.userData.boltMesh){gunGroup.userData.boltMesh.position.z=0;}}}
    // Auto-fire + shoot cooldown
    if(window.regenHP){window.regenAccum+=dt;if(window.regenAccum>=1){window.regenAccum=0;playerHP=Math.min(100,playerHP+(window.healBoost||1));}}
    if(window.autoHeal){window._autoHealCD=(window._autoHealCD||0)+dt;if(window._autoHealCD>=window.autoHealCD){window._autoHealCD=0;playerHP=Math.min(100,playerHP+window.autoHeal);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),window.autoHeal,'#44ff88');}}
    if(window.combatRegen&&bossActive){playerHP=Math.min(100,playerHP+window.combatRegen*dt);}
    if(window.adrenaline&&playerHP<25){SPEED=window.baseSPEED*1.3;}else if(window.adrenaline){SPEED=window.baseSPEED;}
if(shootCD>0)shootCD-=dt*(ocEngSonicLocal>0?0.5:1);
if(currentGun==='radrifle'&&autoFire&&locked&&!isReloading&&!isDowned){
  radRifleCharge+=dt;
  if(radRifleCharge>=gunData.radrifle.chargeTime){radRifleCharge=gunData.radrifle.chargeTime;fireRadRifle();autoFire=false;radRifleCharge=0;}
}else if(currentGun==='radrifle'&&!autoFire&&radRifleCharge>0&&locked){fireRadRifle();radRifleCharge=0;}
if(autoFire&&shootCD<=0&&!isReloading&&currentGun!=='grapple'&&currentGun!=='radrifle')shoot();
    // 連發槍聲控制：按住連發且仍有子彈時播放完整 mp3(loop)，鬆手/打完/換彈/死亡時停止
    if(autoLoopGuns[currentGun]){
      var wantLoop=autoFire&&!isReloading&&!isDowned&&(buffType==='infammo'||gunAmmo[currentGun]>0);
      if(wantLoop&&!autoLoopOn())startAutoLoop(currentGun);
      else if(!wantLoop&&autoLoopOn())stopAutoLoop();
    }else if(autoLoopOn()){
      stopAutoLoop();
    }
    // Smooth ADS FOV
    var fov=isADS?gunData[currentGun].adsFov:80;
    cam.fov+=(fov-cam.fov)*Math.min(1,dt*10);
    cam.updateProjectionMatrix();
    // Scope overlay
    var so=document.getElementById('scope-overlay');
    var _deagleSight=isADS&&currentGun==='deagle'&&gunGroup&&gunGroup.userData&&gunGroup.userData.sightLens;
    if(isADS&&!_deagleSight&&currentGun!=='grapple'&&currentGun!=='knife'&&currentGun!=='awp'){
      so.style.display='block';
      var sr=document.getElementById('scope-ring');
      sr.style.width='60px';sr.style.height='60px';sr.style.borderColor='rgba(0,0,0,.3)';sr.style.borderWidth='1px';
    }else{so.style.display='none';}
    // ADS gun position + animations
    // Recoil recovery
    if(recoilKick>0){recoilKick*=0.85;if(recoilKick<0.001)recoilKick=0;}
    if(recoilRotX!==0){recoilRotX*=0.85;if(Math.abs(recoilRotX)<0.001)recoilRotX=0;}
    // 受擊方向指示 fade
    if(hitDirTimer>0){
      hitDirTimer-=dt;
      var hdt=Math.max(0,hitDirTimer/0.35);
      var _ra=((hitDirAngle%(Math.PI*2))+Math.PI*2)%(Math.PI*2); // 換算成 0~2π
      var _r2=_ra>Math.PI?_ra-Math.PI*2:_ra; // -π~π：0=前,π/2=右,±π=後,-π/2=左
      var hTop=(Math.abs(_r2)<Math.PI*0.25)?1:0;
      var hBottom=(Math.abs(_r2)>Math.PI*0.75)?1:0;
      var hRight=(_r2>Math.PI*0.25&&_r2<Math.PI*0.75)?1:0;
      var hLeft=(_r2<-Math.PI*0.25&&_r2>-Math.PI*0.75)?1:0;
      document.getElementById('hit-dir-top').style.opacity=hTop?String(hdt*0.6):'0';
      document.getElementById('hit-dir-bottom').style.opacity=hBottom?String(hdt*0.6):'0';
      document.getElementById('hit-dir-left').style.opacity=hLeft?String(hdt*0.6):'0';
      document.getElementById('hit-dir-right').style.opacity=hRight?String(hdt*0.6):'0';
      if(hitDirTimer<=0)document.getElementById('hit-dir-wrap').style.display='none';
    }
    // Charging handle animation
    if(boltTarget!==0||boltOffset!==0){
      boltOffset+=(boltTarget-boltOffset)*Math.min(1,dt*15);
      if(Math.abs(boltOffset-boltTarget)<0.001){boltOffset=boltTarget;}
    }
    if(gunGroup){
      // Swap animation (weapon switching — new gun slides in from off-screen)
      if(swapAnimTimer>0){
        swapAnimTimer-=dt;
        var sp=Math.max(0,1-swapAnimTimer/swapAnimDuration);
        var targetX=currentGun==='grenade'?0.12:0.2;
        var targetY=currentGun==='grenade'?-0.12:-0.15;
        var targetZ=currentGun==='grenade'?-0.32:-0.35;
        // Animate old gun out
        if(swapOutGroup){
          var st=sp/0.35;
          if(st<1){
            swapOutGroup.position.x=0.2+st*0.35;swapOutGroup.position.y=-0.15-st*0.2;swapOutGroup.position.z=-0.35+st*0.2;
            swapOutGroup.rotation.x=-st*0.3;swapOutGroup.rotation.z=st*0.5;
          }else{
            if(swapOutGroup.parent)cam.remove(swapOutGroup);swapOutGroup=null;
          }
        }
        // Animate new gun in
        gunGroup.position.x=0.55-sp*0.35;gunGroup.position.y=-0.4+sp*0.25;gunGroup.position.z=-0.05-sp*0.3;
        gunGroup.rotation.x=0.3-sp*0.3;gunGroup.rotation.z=sp*0.3;
        if(sp>=1){
          gunGroup.position.set(targetX,targetY,targetZ);
          gunGroup.rotation.set(0,0,0);
          swapAnimTimer=0;swapTargetSlot=-1;swapTargetGun='';
        }
      }else if(isReloading&&currentGun!=='knife'&&currentGun!=='grapple'&&currentGun!=='grenade'){
        var rp=Math.max(0,1-reloadTimer/(reloadDuration||2));
        var basePos=isADS?ocAdsBase():new THREE.Vector3(0.2,-0.15,-0.35);
        // Phase 1: Drop mag (0-25%)
        if(rp<0.25){
          var t=rp/0.25;
          gunGroup.position.x=basePos.x;gunGroup.position.y=basePos.y-t*0.02;gunGroup.position.z=basePos.z-t*0.02;
          gunGroup.rotation.x=t*0.04;gunGroup.rotation.y=0;gunGroup.rotation.z=t*0.06;
          if(magazineMesh)magazineMesh.position.y=-t*0.08;
          boltTarget=-0.01;
        // Phase 2: Insert mag (25-55%)
        }else if(rp<0.55){
          var t=(rp-0.25)/0.3;
          gunGroup.position.x=basePos.x;gunGroup.position.y=basePos.y-0.02+0.01*(t);gunGroup.position.z=basePos.z-0.02+0.01*(t);
          gunGroup.rotation.x=0.04*(1-t);gunGroup.rotation.y=0;gunGroup.rotation.z=0.06*(1-t);
          if(magazineMesh)magazineMesh.position.y=-(1-t)*0.08;
          boltTarget=-0.01;
        // Phase 3: Bolt pull (55-82%)
        }else if(rp<0.82){
          var t=(rp-0.55)/0.27;
          var pullPos=0.04;var pullRot=0.08;
          if(t<0.4){
            var pt=t/0.4;
            gunGroup.position.x=basePos.x;gunGroup.position.y=basePos.y-0.01;gunGroup.position.z=basePos.z-0.01-pt*pullPos;
            gunGroup.rotation.x=pt*pullRot;gunGroup.rotation.z=pt*0.04;
            boltTarget=-0.04;
          }else if(t<0.7){
            var pt=(t-0.4)/0.3;
            gunGroup.position.x=basePos.x;gunGroup.position.y=basePos.y-0.01;gunGroup.position.z=basePos.z-0.01-pullPos+pt*pullPos;
            gunGroup.rotation.x=pullRot*(1-pt);gunGroup.rotation.z=0.04*(1-pt);
            boltTarget=-0.04+pt*0.03;
          }else{
            var pt=(t-0.7)/0.3;
            gunGroup.position.x=basePos.x;gunGroup.position.y=basePos.y-0.01+pt*0.01;gunGroup.position.z=basePos.z-0.01+pt*0.01;
            gunGroup.rotation.x=0;gunGroup.rotation.z=0;
            boltTarget=-0.01+pt*0.01;
          }
        // Phase 4: Settle (82-100%)
        }else{
          var t=(rp-0.82)/0.18;
          gunGroup.position.x=basePos.x;gunGroup.position.y=basePos.y+t*0.01;gunGroup.position.z=basePos.z+t*0.01;
          gunGroup.rotation.x*=0.85;gunGroup.rotation.y*=0.85;gunGroup.rotation.z*=0.85;
          boltTarget=0;
        }
        // Apply bolt offset to charging handle mesh
        if(gunGroup.userData&&gunGroup.userData.boltMesh){
          gunGroup.userData.boltMesh.position.z=boltOffset;
        }
      }else if(inspectTimer>0){
        var ip=1-inspectTimer/1.8;
        var inspPos=new THREE.Vector3(0.2,-0.15,-0.25);
        if(ip<0.4){
          var t=ip/0.4;
          inspPos.z-=t*0.08;
          gunGroup.rotation.x=-t*0.15;gunGroup.rotation.y=t*1.2;gunGroup.rotation.z=t*0.05;
        }else if(ip<0.7){
          var t=(ip-0.4)/0.3;
          gunGroup.rotation.x=-0.15;gunGroup.rotation.y=1.2;gunGroup.rotation.z=0.05;
          if(magazineMesh)magazineMesh.position.y=-t*0.1;
        }else{
          var t=(ip-0.7)/0.3;
          gunGroup.rotation.x=-0.15*(1-t);gunGroup.rotation.y=1.2*(1-t);gunGroup.rotation.z=0.05*(1-t);
          if(magazineMesh)magazineMesh.position.y=-(1-t)*0.1;
        }
        gunGroup.position.lerp(inspPos,Math.min(1,dt*8));
      }else if(currentGun==='knife'&&knifeAnim>0){
        knifeAnim-=dt;
        if(knifeSwingCount===0){gunGroup.rotation.x=0;gunGroup.rotation.z=knifeAnim*2;}
        else if(knifeSwingCount===1){gunGroup.rotation.x=0;gunGroup.rotation.z=-knifeAnim*2;}
        else{gunGroup.rotation.x=-knifeAnim*1.8;gunGroup.rotation.z=0;}
        if(knifeAnim<=0){gunGroup.rotation.x=0;gunGroup.rotation.z=0;}
      }else if(currentGun==='grenade'&&grenadeAnim>0){
        grenadeAnim-=dt;
        var gt=1-grenadeAnim/0.35;
        if(gt<0.2){var pull=gt/0.2;gunGroup.position.x=0.12-pull*0.05;gunGroup.position.y=-0.12-pull*0.05;gunGroup.position.z=-0.32-pull*0.06;gunGroup.rotation.x=pull*0.5;gunGroup.rotation.z=-pull*0.3;}
        else if(gt<0.5){var thrust=(gt-0.2)/0.3;gunGroup.position.x=0.07-thrust*0.15;gunGroup.position.y=-0.17+thrust*0.15;gunGroup.position.z=-0.38+thrust*0.2;gunGroup.rotation.x=0.5-thrust*0.8;gunGroup.rotation.z=-0.3+thrust*0.5;}
        else if(!grenadeThrown){grenadeThrown=true;throwPlayerGrenade();gunGroup.position.set(0.2,-0.15,-0.35);gunGroup.rotation.set(0,0,0);}
        else{gunGroup.position.set(0.2,-0.15,-0.35);gunGroup.rotation.set(0,0,0);if(grenadeAnim<=0)grenadeAnim=0;}
      }else if(currentGun==='awp'&&awpBoltTimer>0){
        // AWP 自動拉栓：槍身後縮微抬，拉栓手柄（Ручка）延 Z 往後再推回
        awpBoltTimer-=dt;
        var ap=1-Math.max(0,awpBoltTimer)/0.5;
        var cycle=Math.sin(Math.min(1,ap)*Math.PI);
        var baseP=isADS?ocAdsBase():new THREE.Vector3(0.2,-0.15,-0.35);
        gunGroup.position.lerp(new THREE.Vector3(baseP.x,baseP.y-0.012*cycle,baseP.z+0.022*cycle),Math.min(1,dt*14));
        gunGroup.rotation.x=0.05*cycle;gunGroup.rotation.y*=0.9;gunGroup.rotation.z=0.03*cycle;
        if(gunGroup.userData&&gunGroup.userData.boltMesh)gunGroup.userData.boltMesh.position.z=0.03*cycle;
        if(awpBoltTimer<=0&&gunGroup.userData&&gunGroup.userData.boltMesh)gunGroup.userData.boltMesh.position.z=0;
      }else{
        var isDefGren=currentGun==='grenade';
        var _ab=isADS?ocAdsBase():null;
        var baseX=isADS?_ab.x:(isDefGren?0.12:0.2);
        var baseY=isADS?_ab.y:(isDefGren?-0.12:-0.15);
        var baseZ=isADS?_ab.z:(isDefGren?-0.32:-0.35);
        var tPos=new THREE.Vector3(baseX+recoilKick,baseY,baseZ-recoilKick);
        gunGroup.position.lerp(tPos,Math.min(1,dt*10));
        gunGroup.rotation.x+=recoilRotX;gunGroup.rotation.x*=0.9;
        gunGroup.rotation.y*=0.9;gunGroup.rotation.z*=0.9;
      }
    }
    // Flash cleanup
    if(flashTimer>0){flashTimer-=dt;if(flashTimer<=0){if(flashMesh.parent)scene.remove(flashMesh);if(flashLight.parent)scene.remove(flashLight);}}
    // Spread recovery
    if(currentGun!==currentSpreadGun){var sg=gunData[currentGun];var attachEff2=getAttachEffects(currentGun);currentSpread=sg?(sg.spread||0)/(attachEff2.accuracy||1):0;currentSpreadGun=currentGun;}
    else if(currentSpread>(gunData[currentGun]||{}).spread){
      var sg=gunData[currentGun];currentSpread=Math.max(sg.spread,currentSpread-(sg.accuracyRecovery||0)*dt);
    }
    for(var i=impacts.length-1;i>=0;i--){impacts[i].time+=dt;if(impacts[i].time>2){disposeMesh(impacts[i].mesh);impacts.splice(i,1);}}
    // Shield break timer
    if(sbActive){sbTimer+=dt;if(sbTimer>1.2){sbActive=false;document.getElementById('sb').style.display='none';}}
    // Enemies（Hybrid 的 AI 移動/重生已移到 locked 區塊外，這裡排除避免重複呼叫）
    hybridTracerTick(dt);   // 曳光／AI 開火閃爍，主機非主機都要跑
    window._hybridDbgT=(window._hybridDbgT||0)+dt;
    if(window._hybridDbgT>0.25){window._hybridDbgT=0;try{hybridDebugPanel();}catch(e){}}
    if(!hybridMode&&(!isMultiplayer||hostAiSim())&&!rangeMode&&!bossRushMode&&!ufoMode&&currentMap!=='flooded')updateEnemies(dt);
    if(!isMultiplayer&&!rangeMode)updateSniperLasers();
    // Pickups
    updatePickups(dt);
    updateAirdrop(dt);
    // Buff timer
    if(buffTimer>0){buffTimer-=dt;if(buffTimer<=0){buffTimer=0;buffType='';}}
    // Buff indicator
    var biEl=document.getElementById('buff-indicator');
    if(buffTimer>0&&buffType){
      var biTxt=buffType==='atkspeed'?'⚡ 攻速x2':'🔷 無限子彈';
      biEl.textContent=biTxt+' '+Math.ceil(buffTimer).toFixed(0)+'s';
      biEl.style.opacity='1';
    }else{biEl.style.opacity='0';}
    // Range mode update
    if(rangeMode&&locked&&gameStarted){
      rangeTime+=dt;
      for(var di=0;di<rangeDrones.length;di++){
        var d=rangeDrones[di];
        if(d.crashed){
          d.crashVel.y-=9.8*dt;
          d.pos.add(d.crashVel.clone().multiplyScalar(dt));
          if(d.pos.y<0.1){d.pos.y=0.1;d.crashVel.set(0,0,0);d.mesh.rotation.set(0,0,0);d.respawnTimer-=dt;if(d.respawnTimer<=0){
            d.pos.set(-5+Math.random()*10,2+Math.random()*4,-3-Math.random()*20);
            d.vel.set((Math.random()-0.5)*3,(Math.random()-0.5)*0.5,(Math.random()-0.5)*3);
            d.crashed=false;d.glow.visible=true;
            d.bodyMat.color.setHex(0x88aadd);
            d.mesh.rotation.set(0,0,0);
          }}
          d.mesh.position.copy(d.pos);
          if(d.respawnTimer>0)d.mesh.rotation.x+=dt*8;
          continue;
        }
        d.vel.x+=(Math.random()-0.5)*0.5;d.vel.z+=(Math.random()-0.5)*0.5;d.vel.y+=(Math.random()-0.5)*0.3;
        d.vel.multiplyScalar(0.98);
        d.pos.add(d.vel.clone().multiplyScalar(dt));
        var dBound=4;var dMax=2,dMin=3;
        if(d.pos.x>dBound){d.pos.x=dBound;d.vel.x*=-1;}if(d.pos.x<-dBound){d.pos.x=-dBound;d.vel.x*=-1;}
        if(d.pos.y>dMax+4){d.pos.y=dMax+4;d.vel.y*=-1;}if(d.pos.y<dMin){d.pos.y=dMin;d.vel.y*=-1;}
        if(d.pos.z>-1){d.pos.z=-1;d.vel.z*=-1;}if(d.pos.z<-24){d.pos.z=-24;d.vel.z*=-1;}
        d.mesh.position.copy(d.pos);
        d.glow.position.set(d.pos.x,d.pos.y+0.1,d.pos.z);
        if(d.hitTimer>0)d.hitTimer-=dt;
      }
      if(!achDone('range_clear')){var allCrash=true;for(var dci=0;dci<rangeDrones.length;dci++){if(!rangeDrones[dci].crashed){allCrash=false;break;}}if(allCrash)awardAch('range_clear');}
      rangeWalkwayPos+=rangeWalkwayDir*dt*2;
      if(rangeWalkwayPos>2)rangeWalkwayDir=-1;
      if(rangeWalkwayPos<-22)rangeWalkwayDir=1;
      rangeWalkwayTarget.position.z=rangeWalkwayPos;
      // Target fall animation + respawn
      for(var ti=0;ti<rangeTargets.length;ti++){
        var rt2=rangeTargets[ti];
        if(rt2.down){
          if(rt2.downRot<1.5){
            rt2.downRot+=dt*3;
            if(rt2.downRot>1.5)rt2.downRot=1.5;
            rt2.meshBody.position.y=rt2.origPos.y-Math.sin(rt2.downRot)*0.6;
            rt2.meshBody.rotation.x=rt2.downRot;
            rt2.meshHead.position.y=rt2.origPos.y+0.65-Math.sin(rt2.downRot)*0.6;
            rt2.meshHead.position.x=rt2.origPos.x+Math.sin(rt2.downRot)*0.12;
            rt2.meshHead.rotation.x=rt2.downRot;
          }else{
            rt2.respawnTimer-=dt;
            if(rt2.respawnTimer<=0){
              rt2.down=false;rt2.downRot=0;
              rt2.meshBody.position.y=rt2.origPos.y;
              rt2.meshBody.rotation.x=0;
              rt2.meshHead.position.set(rt2.origPos.x,rt2.origPos.y+0.65,rt2.origPos.z);
              rt2.meshHead.rotation.x=0;
              rt2.meshBody.material.color.setHex(0xaa8866);
              rt2.meshHead.material.color.setHex(0xaa8866);
            }
          }
        }
      }
      // Walkway target hit timer
      if(rangeWalkwayTarget.hitTimer>0){
        rangeWalkwayTarget.hitTimer-=dt;
        if(rangeWalkwayTarget.hitTimer<=0)rangeWalkwayTarget.material.color.setHex(0x884466);
      }
      // Update range HUD
      var acc=rangeShots>0?Math.round(rangeHits/rangeShots*100):0;
      document.getElementById('range-score').textContent=rangeScore;
      document.getElementById('range-stat').textContent='命中 '+rangeHits+' / '+rangeShots+' 發 ('+acc+'%)';
      var mins=Math.floor(rangeTime/60);var secs=Math.floor(rangeTime%60);
      document.getElementById('range-timer').textContent=String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
    }
    // Screen shake decay
    if(screenShake>0)screenShake=Math.max(0,screenShake-dt*3);
    // Apply screen shake to camera
    if(screenShake>0){
      cam.position.x+=(Math.random()-0.5)*screenShake*0.05;
      cam.position.y+=(Math.random()-0.5)*screenShake*0.05;
    }
    // Update opponent mesh
    // Update opponent meshes
    for(var oi=0;oi<opponentMeshes.length;oi++){
      var omE=opponentMeshes[oi];
      var osE=opponentStates[oi];
      if(omE&&osE){
        // 位置平滑插值（消除 100ms 位置跳動造成的『閃現』），幀率無關
        var lerpA=1-Math.pow(0.003,dt);
        omE.position.x+=(osE.pos.x-omE.position.x)*lerpA;
        omE.position.y+=(osE.pos.y-omE.position.y)*lerpA;
        omE.position.z+=(osE.pos.z-omE.position.z)*lerpA;
        omE.rotation.order='YXZ';
        omE.rotation.y=osE.yaw;
        omE.rotation.x=-osE.pitch*0.3;
        omE.visible=osE.alive|osE.downed;
        // 被炸倒：躺平（滑開的位移用本地 offset，避免被對手 state 封包蓋掉）
        if(osE.ocKnockT>0||osE.ocKnockStand>0||osE.ocKnockAngle>0){
          if(osE.ocKnockT>0){
            osE.ocKnockT-=dt;
            if(osE.ocKnockT<=0){osE.ocKnockT=0;osE.ocKnockStand=0.5;}
            osE.ocKnockOX=(osE.ocKnockOX||0)+osE.ocKnockDX*dt;
            osE.ocKnockOZ=(osE.ocKnockOZ||0)+osE.ocKnockDZ*dt;
            osE.ocKnockDX*=Math.max(0,1-dt*5);osE.ocKnockDZ*=Math.max(0,1-dt*5);
            osE.ocKnockAngle=ocLIE*Math.min(1,(1-osE.ocKnockT/Math.max(0.01,osE.ocKnockDur))*2.4);
          }else{
            osE.ocKnockStand-=dt;
            osE.ocKnockAngle=ocLIE*Math.max(0,osE.ocKnockStand/0.5);
            if(osE.ocKnockStand<=0){osE.ocKnockStand=0;osE.ocKnockAngle=0;}
          }
          if(osE.ocKnockAngle>0.01&&osE.ocKnockAxis){
            omE.position.x+=osE.ocKnockOX||0;
            omE.position.z+=osE.ocKnockOZ||0;
            var oqa=new THREE.Quaternion().setFromAxisAngle(osE.ocKnockAxis,osE.ocKnockAngle);
            var oqy=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,osE.ocKnockYaw||osE.yaw,0));
            omE.quaternion.copy(oqa).multiply(oqy);
          }
        }
        // 方晶待機動畫（用本地時鐘，不要用伺服器時間）
        if(omE.userData&&omE.userData.cubeling&&omE.userData.cubeling.userData.tick)omE.userData.cubeling.userData.tick(performance.now()/1000);
      }
    }
    // Update teammate meshes (TDM)
    for(var tmiR=0;tmiR<teammateMeshes.length;tmiR++){
      var tmM=teammateMeshes[tmiR];
      var tmS=teammateStates[tmiR];
      if(tmM&&tmS){
        var tlerpA=1-Math.pow(0.003,dt);
        if(tmM.userData&&tmM.userData.cubeling&&tmM.userData.cubeling.userData.tick)tmM.userData.cubeling.userData.tick(performance.now()/1000);
        tmM.position.x+=(tmS.pos.x-tmM.position.x)*tlerpA;
        tmM.position.y+=(tmS.pos.y-tmM.position.y)*tlerpA;
        tmM.position.z+=(tmS.pos.z-tmM.position.z)*tlerpA;
        tmM.rotation.order='YXZ';
        tmM.rotation.y=tmS.yaw;
        tmM.rotation.x=-tmS.pitch*0.3;
        tmM.visible=tmS.alive||(teamMates[tmiR]&&teamMates[tmiR].downed);
        var tpl=window.teammatePlates&&window.teammatePlates[tmiR];
        if(tpl&&window._updateNamePlate)window._updateNamePlate(tpl,tmM.position,tmM.visible);
      }
    }
    // Update opponent health bars
    if(window.opponentBars){
      for(var oi=0;oi<opponentMeshes.length;oi++){
        var os=opponentStates[oi];
        var ob=window.opponentBars[oi];
        if(os&&ob){
          var op=os.pos;
          ob.h.position.set(op.x,CUBELING_BAR,op.z);ob.h.scale.x=Math.max(0,os.hp/100);ob.h.position.x=op.x-(1-Math.max(0,os.hp/100))*0.3;
          ob.a.position.set(op.x,CUBELING_BAR-0.07,op.z);ob.a.scale.x=Math.max(0,os.armor/100);ob.a.position.x=op.x-(1-Math.max(0,os.armor/100))*0.3;
          // 血條／護甲條必須 billboard，否則只從世界 +Z 方向看得到
          ob.h.lookAt(cam.position);ob.a.lookAt(cam.position);
          ob.h.visible=os.alive;ob.a.visible=os.alive;
          // 頭頂名稱
          var opl=window.opponentPlates&&window.opponentPlates[oi];
          if(opl&&window._updateNamePlate)window._updateNamePlate(opl,op,os.alive);
        }
      }
    }
// Round clear
if(!window._extActive&&!isMultiplayer&&currentMap!=='nuclear'&&currentMap!=='flooded'&&currentMap!=='zombielair'&&!rangeMode){
    var alive=0;for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].hp>0)alive++}
    if(alive===0&&enemies.length>0&&clearTimer<0&&gameStarted)clearTimer=0;
    if(alive===0&&enemies.length>0&&clearTimer>=0&&gameStarted){
      clearTimer+=dt;
      if(clearTimer<0.1){playerHP=100;playerArmor=100;document.getElementById('round-clear').style.display='block';document.getElementById('round-clear').textContent='第 '+roundNum+' 波 通關';document.getElementById('round-num').style.display='block';document.getElementById('round-num').textContent='+'+(Math.floor(clearTimer*10))+' 分'}
      if(clearTimer>3&&!pendingPerk){
        clearTimer=-1;pendingPerk=true;
        document.getElementById('round-clear').style.display='none';
        document.getElementById('round-num').style.display='none';
        showPerkSelection();
      }
    }
    } // end !isMultiplayer
    // Rain
    if(currentMap==='rain')updateRain(dt);
    if(currentMap==='nuclear'){updateNuclear(dt);updateRadWater(dt);}
    if(currentMap==='flooded'){updateFlooded(dt);updateHarpoonProjectiles(dt);}
    if(currentMap==='zombielair'){updateZombieLair(dt);}
    if(bossRushMode){updateBossRush(dt);updateBossProjectiles(dt);}
    if(ufoMode&&ufoActive){updateUFO(dt);}
    // Grapple shot visual
    if(grappleShot){
      grappleShot.progress+=dt*12;
      var gp=Math.min(grappleShot.progress,1);
      grappleShot.mesh.position.lerpVectors(grappleShot.start,grappleShot.end,gp);
      if(grappleLine){
        var ls=cam.position.clone();var le=grappleShot.mesh.position.clone();
        grappleLine.geometry.dispose();
        grappleLine.geometry=new THREE.BufferGeometry().setFromPoints([ls,le]);
      }
      if(gp>=1){scene.remove(grappleShot.mesh);grappleShot=null;}
    }
    // Grapple update
    if(grappleActive)updateGrapple(dt);
    // Zipline update
    if(boatRideActive)updateBoatRide(dt);
    if(ziplineActive)updateZipline(dt);
    // Sky Platform timer
    if(skyPlat&&platActive){
      var onPlat=Math.abs(pos.x)<2.8&&Math.abs(pos.z)<2.8&&pos.y>10.2&&pos.y<11.4&&onGround;
      if(onPlat){platTimer+=dt;if(platTimer>=10){
        platActive=false;platTimer=0;
        skyPlat.mesh.visible=false;skyPlat.border.visible=false;skyPlat.glow.visible=false;
        skyPlat.pos.y=-50;skyPlat.mesh.position.y=-50;
        skyPlat.border.position.y=-50;skyPlat.glow.position.y=-50;
        platRespawnTimer=5;
      }}else if(platTimer>0&&!onPlat){platTimer-=dt*0.3;if(platTimer<0)platTimer=0;}
      var pct=platTimer/10;
      var r=Math.min(1,pct*2),g=Math.min(1,2-pct*2),b=1-pct*0.5;
      if(skyPlat.mesh.material.emissive){skyPlat.mesh.material.emissive.setRGB(r*0.5,g*0.5,b);skyPlat.mesh.material.emissiveIntensity=0.2+0.3*Math.sin(time*3);}
      skyPlat.border.material.color.setRGB(r,g,b);
      skyPlat.glow.material.color.setRGB(r,g,b);
      skyPlat.glow.material.opacity=0.08+0.1*Math.sin(time*2);
    }
    if(!platActive&&platRespawnTimer>0){
      platRespawnTimer-=dt;
      if(platRespawnTimer<=0){
        platActive=true;platTimer=0;platRespawnTimer=0;
        skyPlat.mesh.visible=true;skyPlat.border.visible=true;skyPlat.glow.visible=true;
        skyPlat.pos.y=10;skyPlat.mesh.position.y=10;
        skyPlat.border.position.y=10;skyPlat.glow.position.y=10;
      }
    }
    // Fog map: random lightning
    if(currentMap==='fog'&&locked&&gameStarted){
      if(typeof fogLightningTimer==='undefined'){var fogLightningTimer=0;}
      fogLightningTimer-=dt;
      if(fogLightningTimer<=0){
        fogLightningTimer=5+Math.random()*15;
        scene.background=new THREE.Color(0xeeeeff);
        setTimeout(function(){if(currentMap==='fog'){scene.background=new THREE.Color(0x1a1a2a);}setTimeout(function(){if(currentMap==='fog'){scene.background=new THREE.Color(0xeeeeff);}setTimeout(function(){if(currentMap==='fog'){scene.background=new THREE.Color(0x1a1a2a);}},80);},120);},60);
      }
    }
    // Projectiles
    for(var pi=projectiles.length-1;pi>=0;pi--){
      var pj=projectiles[pi];
      if(!pj.vel)continue;
      if(pj.medDart)continue;   // 醫療針由 ocTickMedic 獨立處理
      var oldPos=pj.pos.clone();
      pj.pos.add(pj.vel.clone().multiplyScalar(dt));pj.mesh.position.copy(pj.pos);
      if(!pj.isGrenade)pj.life-=dt;
      if(!pj.isGrenade&&pj.life<=0){disposeMesh(pj.mesh);projectiles.splice(pi,1);continue;}
      // Grenade handling
      if(pj.isGrenade){
        if(isUnderwater&&currentMap==='flooded')pj.vel.y+=4*dt;else pj.vel.y-=9.8*dt;
        // Bounce off ground（高壓氣縮彈反彈較彈，才彈得進去）
        if(pj.pos.y<0.1){pj.pos.y=0.1;var gk=(pj.subType==='ocburst');pj.vel.y*=gk?-0.55:-0.3;pj.vel.x*=gk?0.92:0.8;pj.vel.z*=gk?0.92:0.8;}
        // 碎甲破片手雷：落地後在地面鋪紅色警示圈（越接近爆心越紅）
        if(pj.armorNade&&!pj.warnMesh&&pj.pos.y<=0.12)pj.warnMesh=ocWarnMesh(pj.pos,5);
        if(pj.warnMesh&&pj.warnMesh.userData){
          var wu=pj.warnMesh.userData;wu.t+=dt;
          var wp=0.5+0.5*Math.sin(wu.t*9);
          wu.ring.material.opacity=0.5+0.4*wp;
          wu.fill.material.opacity=0.55+0.4*wp;
          wu.ic.material.opacity=0.55+0.45*wp;
          wu.ic.scale.setScalar(1+0.14*wp);
        }
        // Bounce off walls
        var hitWall=false;
        for(var bi=0;bi<mapBoxes.length;bi++){
          var b=mapBoxes[bi];
          if(b.isPlatform||b.isDragonBoat||!b.mesh.visible)continue;
          if(Math.abs(pj.pos.x-b.pos.x)<b.size.x/2+0.1&&Math.abs(pj.pos.y-b.pos.y)<b.size.y/2+0.1&&Math.abs(pj.pos.z-b.pos.z)<b.size.z/2+0.1){
            var ox=b.size.x/2+0.1-Math.abs(pj.pos.x-b.pos.x);
            var oz=b.size.z/2+0.1-Math.abs(pj.pos.z-b.pos.z);
            var wr=(pj.subType==='ocburst')?OC_ULT_BOUNCE:-0.3;   // 氣縮彈打牆高彈性反彈
            if(ox<oz){pj.vel.x*=wr;pj.pos.x+=pj.pos.x<b.pos.x?-ox:ox;}
            else{pj.vel.z*=wr;pj.pos.z+=pj.pos.z<b.pos.z?-oz:oz;}
            hitWall=true;break;
          }
        }
        if(hitWall&&pj.armorNade!==true&&pj.subType!=='ocburst')continue;
        // 高壓氣縮彈：碰到敵人立即引爆
        if(pj.subType==='ocburst'){
          for(var ki=0;ki<enemies.length;ki++){
            var ke=enemies[ki];if(!ke||ke.hp<=0||!ke.pos)continue;
            var kp=ke.pos.clone();kp.y+=0.5;
            if(pj.pos.distanceTo(kp)<1.4){pj.fuse=0;hitWall=false;break;}
          }
        }
        pj.fuse-=dt;
        if(pj.fuse<=0){
          disposeMesh(pj.mesh);
          var st=pj.subType||'frag';
          if(st==='frag'){
            var expR=5,expDmg=pj.dmg;
            var expMesh=new THREE.Mesh(new THREE.SphereGeometry(expR*0.04,8,8),new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:2}));
            expMesh.position.copy(pj.pos);scene.add(expMesh);
            var expGlow=new THREE.Mesh(new THREE.SphereGeometry(expR*0.2,12,12),new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:0.3,depthWrite:false}));
            expGlow.position.copy(pj.pos);scene.add(expGlow);
            var expLight=new THREE.PointLight(0xff6600,4,expR*2);expLight.position.copy(pj.pos);scene.add(expLight);
            setTimeout(function(){scene.remove(expMesh);scene.remove(expGlow);scene.remove(expLight);},300);
            playShort('soundreality-explosion-fx-343683.mp3',null,0.6);
            var distToP=pj.pos.distanceTo(pos);
            if(distToP<expR){var aoeDmg=Math.round(expDmg*(1-distToP/expR));playerDamage(aoeDmg,pj.pos);slowTimer=0.5;playerArmor=0;showDmgNum(pos.clone(),aoeDmg,'#ff8844');}
            for(var ei=0;ei<enemies.length;ei++){var ee=enemies[ei];if(ee.hp<=0)continue;var distToE=pj.pos.distanceTo(ee.pos);if(distToE<expR){var edmg=Math.round(expDmg*0.8*(1-distToE/expR));ee.hp-=edmg;if(ee.hitTimer)ee.hitTimer=0.3;if(ee.hp<=0)ee.hp=0;hitMarkerTimer=0.15;showDmgNum(ee.pos,edmg,'#ff8844');}}
            for(var oi=0;oi<opponentStates.length;oi++){var os=opponentStates[oi];if(!os.alive)continue;var distO=pj.pos.distanceTo(os.pos);if(distO<expR){var odmg=Math.round(expDmg*0.8*(1-distO/expR));var ld=odmg;if(os.armor>0){os.armor-=ld;if(os.armor<0){ld=-os.armor;os.armor=0}else ld=0}if(ld>0){os.hp-=ld;if(os.hp<0)os.hp=0}if(os.hp<=0){tdmEnemyDown(oi,'💣');}hitMarkerTimer=0.15;showDmgNum(os.pos,odmg,'#ff8844');relaySend({type:'hit',hp:odmg,targetPlayerId:opponentPlayerIds[oi],shooterPlayerId:myPlayerId});}}
            if(!isMultiplayer&&bossFloodedActive&&abyssalMaw&&abyssalMaw.mesh){var distB=pj.pos.distanceTo(abyssalMaw.pos);if(distB<expR){abyssalMaw.hp-=Math.round(expDmg*0.5*(1-distB/expR));abyssalMaw.hitTimer=0.3;hitMarkerTimer=0.15;showDmgNum(abyssalMaw.pos,Math.round(expDmg*0.5*(1-distB/expR)),'#44ddff');}}
          }else if(st==='flashbang'){
            var fbMesh=new THREE.Mesh(new THREE.SphereGeometry(0.5,12,12),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.6}));
            fbMesh.position.copy(pj.pos);scene.add(fbMesh);
            var fbGlow=new THREE.Mesh(new THREE.SphereGeometry(2,16,16),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.15}));
            fbGlow.position.copy(pj.pos);scene.add(fbGlow);
            var fbLight=new THREE.PointLight(0xffffff,8,15);fbLight.position.copy(pj.pos);scene.add(fbLight);
            setTimeout(function(){scene.remove(fbMesh);scene.remove(fbGlow);scene.remove(fbLight);},200);
            playShort('soundreality-explosion-fx-343683.mp3',null,0.3);
            // Flashbang: stun AI enemies
            for(var ei=0;ei<enemies.length;ei++){var ee=enemies[ei];if(ee.hp<=0)continue;if(ee.pos.distanceTo(pj.pos)<8){ee.stunTimer=3;ee.hasDetected=false;if(ee.hitTimer)ee.hitTimer=0.5;}}
            // Multiplayer: blind opponent screen
            if(isMultiplayer){relaySend({type:'flashbang',pos:[pj.pos.x,pj.pos.y,pj.pos.z]});}
            var distP=pj.pos.distanceTo(pos);
            if(distP<8){
              var fbOverlay=document.createElement('div');fbOverlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:12;pointer-events:none;opacity:0;transition:opacity 0.1s';document.body.appendChild(fbOverlay);
              requestAnimationFrame(function(){fbOverlay.style.opacity='0.7';});
              setTimeout(function(){fbOverlay.style.opacity='0';setTimeout(function(){fbOverlay.remove();},300);},800);
            }
          }else if(st==='smoke'){
            for(var si=0;si<15;si++){
              var puff=new THREE.Mesh(new THREE.SphereGeometry(0.4+Math.random()*0.3,8,8),new THREE.MeshBasicMaterial({color:0x999999,transparent:true,opacity:0.25+Math.random()*0.15,depthWrite:false}));
              puff.position.set(pj.pos.x+(Math.random()-0.5)*3.5,Math.random()*1.5,pj.pos.z+(Math.random()-0.5)*3.5);scene.add(puff);
              puff.userData={vy:0.3+Math.random()*0.4,lifetime:6+Math.random()*2};
              smokeParticles.push(puff);
            }
            smokeZoneCenters.push({pos:pj.pos.clone(),timer:6});
            var smokeLight=new THREE.PointLight(0x888888,1,6);smokeLight.position.copy(pj.pos);scene.add(smokeLight);
            smokeParticles.push({light:smokeLight,pos:pj.pos.clone(),lifetime:6});
            playShort('soundreality-explosion-fx-343683.mp3',null,0.2);
          }else if(st==='incendiary'){
            var fireMesh=new THREE.Mesh(new THREE.CircleGeometry(2.5,16),new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.25,depthWrite:false}));
            fireMesh.rotation.x=-Math.PI/2;fireMesh.position.set(pj.pos.x,0.05,pj.pos.z);scene.add(fireMesh);
            var fireGlow=new THREE.Mesh(new THREE.CircleGeometry(2.5,16),new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:0.08,depthWrite:false}));
            fireGlow.rotation.x=-Math.PI/2;fireGlow.position.set(pj.pos.x,0.04,pj.pos.z);scene.add(fireGlow);
            var fireLight=new THREE.PointLight(0xff4400,3,6);fireLight.position.set(pj.pos.x,0.5,pj.pos.z);scene.add(fireLight);
            playShort('soundreality-explosion-fx-343683.mp3',null,0.4);
            incendiaryZones.push({pos:pj.pos.clone(),timer:6,mesh:fireMesh,mesh2:fireGlow,light:fireLight});
          }else if(st==='armorfrag'){
            if(pj.warnMesh){scene.remove(pj.warnMesh);pj.warnMesh=null;}
            ocArmorBlast(pj.pos,5);
            ocBlastFX(pj.pos,5,0xff5522);
            var adp=pj.pos.distanceTo(pos);
            if(adp<5){var admg=Math.round(12*(1-adp/5));if(admg>0){playerDamage(admg,pj.pos);showDmgNum(pos.clone(),admg,'#ff8844');}}
          }else if(st==='ocburst'){
            if(pj.warnMesh){scene.remove(pj.warnMesh);pj.warnMesh=null;}
            ocExplodeUlt(pj.pos);
          }else if(st==='medSmoke'){
            if(pj.warnMesh){scene.remove(pj.warnMesh);pj.warnMesh=null;}
            ocDeployMedSmoke(pj.pos);
          }
          projectiles.splice(pi,1);continue;
        }
        // Fuse visual: pulse
        pj.mesh.scale.setScalar(1+0.15*Math.sin(pj.fuse*20));
        continue; // skip normal projectile hit/remove logic
      }
      // ── AI 互相攻擊：敵人子彈命中「不是射擊者本人」的敵人 ──
      // AI 子彈輕微導向目標：原本純直線飛行，20 公尺外要命中半徑 0.5 的方晶幾乎靠運氣
      if(pj.vsEnemy&&pj.vsTarget&&pj.vsTarget.hp>0){
        var hd=new THREE.Vector3(pj.vsTarget.pos.x,pj.vsTarget.pos.y+0.45,pj.vsTarget.pos.z).sub(pj.pos);
        if(hd.lengthSq()>0.01){
          var hsp=pj.vel.length();
          pj.vel.lerp(hd.normalize().multiplyScalar(hsp),Math.min(1,dt*5));
          pj.vel.setLength(hsp);
        }
      }
      var eHit=null;
      if(pj.fromEnemy&&pj.shooter&&(pj.vsEnemy||pj.friendlyFire)){
        var eSteps=8;
        for(var es=1;es<=eSteps&&!eHit;es++){
          var et=es/eSteps;
          var ecp=new THREE.Vector3().lerpVectors(oldPos,pj.pos,et);
          for(var ee2=0;ee2<enemies.length;ee2++){
            var etg=enemies[ee2];
            if(etg===pj.shooter||etg.hp<=0||!etg.mesh.visible)continue;
            // 方晶身體：中心在 pos 上方 0.45，半徑約 0.42
            var ecen=new THREE.Vector3(etg.pos.x,etg.pos.y+0.45,etg.pos.z);
            if(ecp.distanceTo(ecen)<0.52){eHit=etg;break;}
          }
        }
      }
      if(eHit){
        var edm=pj.aiDmg||Math.round((pj.dmg||12)*0.8);
        var eShooterIdx=pj.shooter?enemies.indexOf(pj.shooter):-1;
        var eKiller=(pj.shooter&&eShooterIdx>=0)?{name:'AI-'+hybridPad3((pj.shooter.hybridIdx!==undefined?pj.shooter.hybridIdx:eShooterIdx)+1),
          type:KT_AI,id:1000+(pj.shooter.hybridIdx!==undefined?pj.shooter.hybridIdx:eShooterIdx),weapon:pj.shooter.weaponType||'ak47'}:null;
        var eDealt=damageEnemy(eHit,edm,eKiller);
        showDmgNum(new THREE.Vector3(eHit.pos.x,eHit.pos.y+1.1,eHit.pos.z),edm,'#ff8844');
        if(eHit.hp<=0&&eHit.type!=='suicider'){dropPickup(eHit.pos);}   // AI 擊殺不給玩家金幣
        disposeMesh(pj.mesh);projectiles.splice(pi,1);continue;
      }
      var hitP=false;var headshot=false;var headPos=pos.clone();headPos.y+=0.75;var steps=8;for(var si=0;si<steps;si++){var t=(si+1)/steps;var cp=new THREE.Vector3().lerpVectors(oldPos,pj.pos,t);if(cp.distanceTo(pos)<P_RADIUS+0.5){hitP=true;if(pj.isSniper&&cp.distanceTo(headPos)<0.4)headshot=true;break;}else if(pj.isSniper&&cp.distanceTo(headPos)<0.4){hitP=true;headshot=true;break;}}if(hitP){var pd=pj.dmg||12;if(headshot){pd=playerArmor+30;slowTimer=1.2;screenShake=3;var hsEl=document.getElementById('hs-text');if(hsEl){hsEl.style.display='block';hsEl.style.animation='none';void hsEl.offsetWidth;hsEl.style.animation='hsAnim 0.6s ease-out forwards';var oldCb=hsEl._cb;if(oldCb)clearTimeout(oldCb);hsEl._cb=setTimeout(function(){if(bombMode){document.getElementById('ammo-hud').innerHTML='∞';return;}
  hsEl.style.display='none';},700);}}else if(pj.isSniper){pd=40;slowTimer=0.8;screenShake=1;}if(pj.fromEnemy&&currentMap==='nuclear')pd=Math.round(pd*diffMult);playerDamage(pd,pj.pos);if(headshot){seasonProgress.headshot++;saveSeasonProgress();if(window.hsHeal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}}slowTimer=Math.max(slowTimer,0.5);showDmgNum(pos.clone(),pd,headshot?'#ff0000':'#ff4444');disposeMesh(pj.mesh);projectiles.splice(pi,1);continue;}
      // 舊code這個迴圈只測本機玩家(pos)與 mapBoxes，從沒測 opponentStates
      // → 輻射步槍/榴彈的 projectile 直接穿過遠端真人
      if(isMultiplayer&&opponentStates.length){
        var remoteConsumed=false;
        for(var pvpRi=0;pvpRi<opponentStates.length;pvpRi++){
          var ros=opponentStates[pvpRi];
          if(!ros||!ros.alive)continue;
          var rhit2=false;
          for(var rs=0;rs<8;rs++){
            var rcpt=new THREE.Vector3().lerpVectors(oldPos,pj.pos,(rs+1)/8);
            if(rcpt.distanceTo(ros.pos)<P_RADIUS+0.55){rhit2=true;break;}
          }
          if(!rhit2)continue;
          var rdm=pj.dmg||12,rl=rdm;
          if(opponentStates[pvpRi].armor>0){opponentStates[pvpRi].armor-=rl;if(opponentStates[pvpRi].armor<0){rl=-opponentStates[pvpRi].armor;opponentStates[pvpRi].armor=0}else rl=0}
          if(rl>0){opponentStates[pvpRi].hp-=rl;if(opponentStates[pvpRi].hp<0)opponentStates[pvpRi].hp=0}
          hitMarkerTimer=0.15;
          relaySend({type:'hit',hp:rdm,targetPlayerId:opponentPlayerIds[pvpRi],shooterPlayerId:myPlayerId});
          showDmgNum(ros.pos,rdm,'#ff8844');
          disposeMesh(pj.mesh);projectiles.splice(pi,1);remoteConsumed=true;break;
        }
        if(remoteConsumed)continue;
      }
      for(var bi=0;bi<mapBoxes.length;bi++){
        var b=mapBoxes[bi];
        if(b.isPlatform||b.isDragonBoat||!b.mesh.visible)continue;
        if(Math.abs(pj.pos.x-b.pos.x)<b.size.x/2+0.05&&Math.abs(pj.pos.y-b.pos.y)<b.size.y/2+0.05&&Math.abs(pj.pos.z-b.pos.z)<b.size.z/2+0.05){
          disposeMesh(pj.mesh);projectiles.splice(pi,1);break;
        }
      }
    }
  }
  // Smoke particles update
  for(var spi=smokeParticles.length-1;spi>=0;spi--){
    var sp=smokeParticles[spi];
    if(sp.light){
      sp.lifetime-=dt;
      if(sp.lifetime<=0){disposeMesh(sp.light);smokeParticles.splice(spi,1);continue;}
    }else{
      sp.position.y+=sp.userData.vy*dt;
      var s=sp.scale.x+0.2*dt;sp.scale.setScalar(s);
      sp.material.opacity-=0.015*dt;
      if(sp.material.opacity<=0||sp.lifetime<=0){disposeMesh(sp);smokeParticles.splice(spi,1);}
      sp.lifetime-=dt;
    }
  }
  // Smoke zone centers (vision blocking)
  for(var sci=smokeZoneCenters.length-1;sci>=0;sci--){
    var sc=smokeZoneCenters[sci];sc.timer-=dt;
    if(sc.timer<=0){smokeZoneCenters.splice(sci,1);continue;}
  }
  // Apply smoke fog if player inside a smoke zone
  var inSmoke=false;
  for(var sci=0;sci<smokeZoneCenters.length;sci++){
    if(pos.distanceTo(smokeZoneCenters[sci].pos)<3.5){inSmoke=true;break;}
  }
  var ocMedBlind=false;
  if(!inSmoke){
    for(var msii=0;msii<ocSmokeZones.length;msii++){if(pos.distanceTo(ocSmokeZones[msii].pos)<2.7){inSmoke=true;ocMedBlind=true;break;}}
    if(!inSmoke)for(var mlia=0;mlia<ocLongSmokes.length;mlia++){if(pos.distanceTo(ocLongSmokes[mlia].pos)<2.0){inSmoke=true;ocMedBlind=true;break;}}
  }
  if(inSmoke&&scene.fog instanceof THREE.Fog){
    if(!window._smokeFogRestore){window._smokeFogRestore={near:scene.fog.near,far:scene.fog.far};}
    scene.fog.near=ocMedBlind?0.4:2;scene.fog.far=ocMedBlind?3.2:6;
  }else if(!inSmoke&&window._smokeFogRestore&&scene.fog instanceof THREE.Fog){
    scene.fog.near=window._smokeFogRestore.near;scene.fog.far=window._smokeFogRestore.far;window._smokeFogRestore=null;
  }
  // Incendiary zones update
  for(var izi=incendiaryZones.length-1;izi>=0;izi--){
    var iz=incendiaryZones[izi];
    iz.timer-=dt;
    if(iz.timer<=0){disposeMesh(iz.mesh);disposeMesh(iz.mesh2);disposeMesh(iz.light);incendiaryZones.splice(izi,1);continue;}
    // Damage enemies in zone
    for(var ei=0;ei<enemies.length;ei++){var ee=enemies[ei];if(ee.hp<=0)continue;if(ee.pos.distanceTo(iz.pos)<2.5){ee.hp-=5*dt;if(ee.hitTimer)ee.hitTimer=0.3;if(ee.hp<=0)ee.hp=0;}}
    // Damage player in zone
    if(pos.distanceTo(iz.pos)<2.5){playerDamage(2*dt,iz.pos);showDmgNum(pos.clone(),Math.round(2*dt),'#ff6622');}
    // Pulse visual
    var puls=0.8+0.2*Math.sin(iz.timer*4);iz.mesh.material.opacity=0.25*puls;iz.mesh2.material.opacity=0.08*puls;
  }
  // HUD
  document.getElementById('hp-fill').style.width=playerHP+'%';
  document.getElementById('hp-txt').textContent=Math.ceil(playerHP);
  document.getElementById('armor-fill').style.width=Math.min(100,playerArmor)+'%';
  document.getElementById('armor-txt').textContent=Math.ceil(playerArmor);
  if(currentMap==='flooded'){
    var o2pct=playerO2/maxO2*100;
    document.getElementById('o2-fill').style.width=o2pct+'%';
    document.getElementById('o2-label').style.color=o2pct<25?'#f44':(o2pct<50?'#fa4':'#4af');
    document.getElementById('o2-wrap').style.display='flex';
  }else{document.getElementById('o2-wrap').style.display='none';}
  // Ammo HUD
  var ammoEl=document.getElementById('ammo-hud');
  if(ammoEl){
    if(currentGun==='grapple'){ammoEl.innerHTML='<span style="font-size:20px;color:#4af;letter-spacing:2px">∞ 勾爪</span>';}
    else if(currentGun==='knife'){ammoEl.innerHTML='<span style="font-size:20px;color:#f84;letter-spacing:2px">⚔ 刀</span>';}
    else if(currentGun==='grenade'){
      var gt=grenadeTypes[currentSlot]||'frag';
      var gIcon=grenadeTypeIcons[gt]||'💣';
      var gName=grenadeTypeNames[gt]||'手雷';
      ammoEl.innerHTML='<span style="font-size:16px;color:'+(grenadeStacks[currentSlot]<=0?'#f44':'#fa4')+';letter-spacing:2px">'+gIcon+' '+gName+' ×'+grenadeStacks[currentSlot]+'</span>';
    }
    else if(isReloading){ammoEl.innerHTML='<span style="color:#ff8;font-size:18px;letter-spacing:2px">RELOADING...</span>';}
    else{ammoEl.innerHTML='<span id="ammo-txt" style="color:'+(gunAmmo[currentGun]===0?'#f44':'#fff')+'">'+gunAmmo[currentGun]+'</span><span id="ammo-sep"> / </span><span id="ammo-max">'+gunData[currentGun].mag+'</span>';}
  }
  var kc=gunKills[currentGun]||0;var kcEl=document.getElementById('kill-count');if(kcEl)kcEl.textContent='☠ '+kc;
  // Slot HUD
  var sh=document.getElementById('slot-hud');
  if(sh){sh.innerHTML='';
    for(var si=0;si<5;si++){
      var sd=document.createElement('div');sd.className='sh-slot'+(si===currentSlot?' active':'');
      sd.textContent=(si+1)+' '+(playerLoadout[si]?getSlotGunText(si):'-');sh.appendChild(sd);
    }
  }
  // Mobile slot buttons
  var msb=document.getElementById('mobile-slots');
  if(msb.childNodes.length){
    for(var msi2=0;msi2<5;msi2++){
      var msbe=msb.childNodes[msi2];
      if(msbe){msbe.textContent=(msi2+1)+' '+(playerLoadout[msi2]?getSlotGunText(msi2):'-');msbe.className='ms-slot'+(msi2===currentSlot?' active':'');}
    }
  }
  // Platform HUD
  var ph=document.getElementById('plat-hud');
  if(ph){
    var op=skyPlat&&Math.abs(pos.x)<2.8&&Math.abs(pos.z)<2.8&&pos.y>10.2&&pos.y<11.4&&onGround;
    if(!platActive&&platRespawnTimer>0){ph.style.display='block';ph.textContent='平台重生 '+Math.ceil(platRespawnTimer)+' 秒';ph.style.color='#4af';}
    else if(op&&platTimer>0){ph.style.display='block';var remain=Math.max(0,10-platTimer);ph.textContent='平台倒數 '+Math.ceil(remain)+' 秒';ph.style.color=remain<3?'#f44':'#4af';}
    else{ph.style.display=op?'block':'none';if(op){ph.textContent='平台 10 秒';ph.style.color='#4af';}}
  }
  if(hitMarkerTimer>0)hitMarkerTimer-=dt;
  var el=document.getElementById('crosshair');
  var awpEl=document.getElementById('awp-scope');
  if(el&&awpEl){
    if(isADS&&locked&&gameStarted&&currentGun==='awp'){el.style.display='none';awpEl.style.display='block';}
    else{awpEl.style.display='none';if(isADS&&locked&&gameStarted&&currentGun!=='grapple'&&currentGun!=='knife'){el.style.display='none';}else{el.style.display='block';}}
    if(locked&&!gameStarted){el.textContent=Math.ceil(countdown);el.style.display='block';}
    else if(hitMarkerTimer>0){el.textContent='✕';el.style.color='#ff4444';}
    else{el.style.color='rgba(255,255,255,0.8)';el.textContent=wallClinging?'\u25A3':'+';}
  }
  // Round earnings display
  var reEl=document.getElementById('round-earnings');
  if(reEl){if(locked&&gameStarted&&!rangeMode){reEl.textContent='本局收穫 $'+roundEarnings;reEl.style.display='block';}else{reEl.style.display='none';}}
  // Minimap
  var mm=document.getElementById('minimap');
  if(mm&&locked&&gameStarted&&!rangeMode){mm.style.display='block';drawMinimap();}else if(mm){mm.style.display='none';}
  // Class skill cooldown
  if(classSkillCD>0)classSkillCD=Math.max(0,classSkillCD-dt);
  if(classSkillActive){
    classSkillTimer-=dt;
    if(classSkillTimer<=0){
      classSkillActive=false;classSkillTimer=0;
      if(playerClass==='berserker')window.rageActive=false;
    }
  }
  var skEl=document.getElementById('skill-cd');
  if(skEl){
    if(playerClass&&gameStarted&&!rangeMode){
      skEl.style.display='block';
      if(playerClass==='assault'||playerClass==='medic'||playerClass==='engineer'){
        skEl.textContent=ocSkillHudText();
        skEl.style.fontSize='13px';
      }else{
        skEl.style.fontSize='';
        if(classSkillCD>0)skEl.textContent='技能 '+Math.ceil(classSkillCD)+'s';
        else if(classSkillActive)skEl.textContent='技能 啟動中';
        else skEl.textContent='[F] '+classSkillData[playerClass].name;
      }
    }else{skEl.style.display='none';}
  }
  // Pet following & behavior
  if(equippedPet&&gameStarted&&locked&&!rangeMode){
    if(!petMesh||petMesh.userData.type!==equippedPet){
      if(petMesh){scene.remove(petMesh);disposeMesh(petMesh);}
      petMesh=createPetMesh(equippedPet);petMesh.userData.type=equippedPet;petMesh.userData.healTimer=0;petMesh.userData.attackTimer=0;petMesh.userData.pickCD=0;petMesh.userData.bobPhase=0;scene.add(petMesh);
    }
    var petTarget=pos.clone();var offset=new THREE.Vector3(0.6,0,0.8);offset.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);petTarget.add(offset);
    petMesh.position.lerp(petTarget,dt*6);
    petMesh.userData.bobPhase=(petMesh.userData.bobPhase||0)+dt*3;
    petMesh.position.y+=Math.sin(petMesh.userData.bobPhase)*0.04;
    petMesh.lookAt(pos.x,petMesh.position.y,pos.z);
    if(equippedPet==='healer_bee'){
      petMesh.userData.healTimer=(petMesh.userData.healTimer||0)+dt;
      if(petMesh.userData.healTimer>=3){petMesh.userData.healTimer=0;if(playerHP<100){playerHP=Math.min(100,playerHP+2);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.2,0)),2,'#44ff88');}}
    }else if(equippedPet==='mini_dragon'){
      petMesh.userData.attackTimer=(petMesh.userData.attackTimer||0)+dt;
      if(petMesh.userData.attackTimer>=1.5){
        petMesh.userData.attackTimer=0;
        var nearest=null,nd=99;
        for(var pei=0;pei<enemies.length;pei++){var pe=enemies[pei];if(pe.mesh.visible&&pe.hp>0){var pd_=pos.distanceTo(pe.pos);if(pd_<nd){nd=pd_;nearest=pe;}}}
        if(nearest&&nd<10){nearest.hp=Math.max(0,nearest.hp-5);showDmgNum(nearest.pos.clone().add(new THREE.Vector3(0,1.5,0)),5,'#ff8844');if(nearest.hp<=0){nearest.mesh.visible=false;if(nearest.hBar)nearest.hBar.visible=false;if(nearest.aBar)nearest.aBar.visible=false;dailyKills++;}}
      }
    }else if(equippedPet==='ghost_orb'){
      petMesh.userData.orbitalAngle=(petMesh.userData.orbitalAngle||0)+dt*2;
      petMesh.children.forEach(function(c){if(c.geometry&&c.geometry.type==='SphereGeometry'&&c.material.transparent&&c.material.opacity<0.3){c.scale.setScalar(1+0.15*Math.sin(Date.now()*0.003));}});
      for(var gei=0;gei<enemies.length;gei++){var ge=enemies[gei];if(ge.mesh.visible&&ge.hp>0&&pos.distanceTo(ge.pos)<15){var glowCol=0x4488ff;if(!ge.mesh.userData._ghostGlow){var gg=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),new THREE.MeshBasicMaterial({color:glowCol,transparent:true,opacity:0.15,depthWrite:false}));ge.mesh.add(gg);ge.mesh.userData._ghostGlow=gg;}ge.mesh.userData._ghostGlow.material.opacity=0.1+0.1*Math.sin(Date.now()*0.005);ge.mesh.userData._ghostGlow.visible=true;}else if(ge.mesh.userData&&ge.mesh.userData._ghostGlow){ge.mesh.userData._ghostGlow.visible=false;}}
    }else if(equippedPet==='mech_dog'||equippedPet==='scavenger'){
      petMesh.userData.pickCD=(petMesh.userData.pickCD||0)+dt;
      if(petMesh.userData.pickCD>=0.5){
        petMesh.userData.pickCD=0;
        for(var ppi=pickups.length-1;ppi>=0;ppi--){
          var pk=pickups[ppi];if(!pk||!pk.mesh)continue;
          var dist=pos.distanceTo(pk.pos);
          if(equippedPet==='mech_dog'&&dist<6&&pk.type!=='ammo'){pk.life=0;if(pk.collect)pk.collect();showDmgNum(pos.clone().add(new THREE.Vector3(0,1.2,0)),1,'#44ff88');pickups.splice(ppi,1);}
          else if(equippedPet==='scavenger'&&dist<6&&pk.type==='ammo'){pk.life=0;if(pk.collect)pk.collect();showDmgNum(pos.clone().add(new THREE.Vector3(0,1.2,0)),1,'#4af');pickups.splice(ppi,1);}
        }
      }
    }else if(ocPetAtk[equippedPet]){
      var pcfg=ocPetAtk[equippedPet];
      petMesh.userData.attackTimer=(petMesh.userData.attackTimer||0)+dt;
      if(petMesh.userData.attackTimer>=pcfg.cd){
        var nearestP=null,ndp=pcfg.r;
        for(var pei2=0;pei2<enemies.length;pei2++){var pe2=enemies[pei2];if(pe2&&pe2.mesh&&pe2.mesh.visible&&pe2.hp>0){var pdd=pos.distanceTo(pe2.pos);if(pdd<ndp){ndp=pdd;nearestP=pe2;}}}
        if(nearestP){
          petMesh.userData.attackTimer=0;
          var pname=ocPetName[equippedPet]||'寵物';
          var cstr='#'+('000000'+pcfg.c.toString(16)).slice(-6);
          if(pcfg.s==='ranged'){
            var st=petMesh.position.clone();st.y+=0.2;
            var proj=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),new THREE.MeshBasicMaterial({color:pcfg.c}));
            proj.position.copy(st);scene.add(proj);
            petFx.push({kind:'proj',mesh:proj,spawn:st.clone(),target:nearestP,tpos:nearestP.pos.clone().add(new THREE.Vector3(0,0.6,0)),speed:pcfg.ps||14,dmg:pcfg.d,color:pcfg.c,label:pname,cstr:cstr});
          }else{
            var hitP=nearestP.pos.clone().add(new THREE.Vector3(0,0.6,0));
            var dealtP=damageEnemy(nearestP,pcfg.d,{name:pname,type:'pet'});
            ocPetHitFx(hitP,pcfg.c);
            if(dealtP>0)showDmgNum(nearestP.pos.clone().add(new THREE.Vector3(0,1.5,0)),dealtP,cstr,false,pname);
            if(nearestP.hp<=0)dailyKills++;
          }
        }
      }
    }
  }else if(petMesh&&petMesh.parent){scene.remove(petMesh);disposeMesh(petMesh);petMesh=null;}
  // 寵物攻擊特效更新（投射物 + 命中爆花）
  for(var fxi=petFx.length-1;fxi>=0;fxi--){
    var fx=petFx[fxi];
    if(!fx.mesh){petFx.splice(fxi,1);continue;}
    if(fx.kind==='proj'){
      if(fx.target&&fx.target.mesh&&fx.target.mesh.visible&&fx.target.hp>0)fx.tpos.set(fx.target.pos.x,fx.target.pos.y+0.6,fx.target.pos.z);
      var fdir=fx.tpos.clone().sub(fx.mesh.position),fdl=fdir.length();
      if(fdl<0.3){
        var dealtF=damageEnemy(fx.target,fx.dmg,{name:fx.label,type:'pet'});
        ocPetHitFx(fx.tpos.clone(),fx.color);
        if(dealtF>0)showDmgNum(fx.tpos.clone().add(new THREE.Vector3(0,0.8,0)),dealtF,fx.cstr,false,fx.label);
        if(fx.target&&fx.target.hp<=0)dailyKills++;
        scene.remove(fx.mesh);disposeMesh(fx.mesh);petFx.splice(fxi,1);continue;
      }
      fx.mesh.position.add(fdir.normalize().multiplyScalar(fx.speed*dt));
      if(fx.mesh.position.distanceTo(fx.spawn)>45){scene.remove(fx.mesh);disposeMesh(fx.mesh);petFx.splice(fxi,1);}
    }else{
      fx.t+=dt;var fk=fx.t/fx.life;
      if(fk>=1){scene.remove(fx.mesh);disposeMesh(fx.mesh);petFx.splice(fxi,1);continue;}
      fx.mesh.scale.setScalar(fx.s0+(fx.s1-fx.s0)*fk);
      if(fx.mesh.material)fx.mesh.material.opacity=fx.o0*(1-fk);
    }
  }
  renderer.render(scene,cam);
  requestAnimationFrame(animate);
  // Expose for extraction mode
  window.gunData = gunData;
  window.createGunModel = createGunModel;
  window.playerLoadout = playerLoadout;
  window.barrelTips = barrelTips;
  // 除錯/自動化測試掛載（CDP 驗證用）
  window._ocDbg={
    switchToSlot:switchToSlot,ocAdsBase:ocAdsBase,playerLoadout:playerLoadout,reload:reload,
    get gun(){return currentGun;},
    get gunGroup(){return gunGroup;},
    get isADS(){return isADS;},
    set isADS(v){isADS=v;},
    get rangeMode(){return rangeMode;},
    set locked(v){locked=v;},
    get locked(){return locked;},
    set gameStarted(v){gameStarted=v;},
    get gameStarted(){return gameStarted;},
    get cam(){return cam;},
    get isReloading(){return isReloading;},
    get reloadTimer(){return reloadTimer;},
    get magazineMesh(){return magazineMesh;},
    set loadoutGun(p){var a=p.split(',');for(var i=0;i<5;i++)playerLoadout[i]=a[i]||null;},
    get loadout(){return playerLoadout;},
    set ammo(v){gunAmmo[currentGun]=v;var el=document.getElementById('ammo-txt');if(el)el.textContent=v;},
    get ammo(){return gunAmmo[currentGun];},
    setRange:function(){document.getElementById('range-btn').click();},
    shoot:shoot,
    openGunPanel:function(g){if(g)gunSelectedGun=g;openGunPanel();},
    set selectedGun(g){gunSelectedGun=g;},
    get zl(){return {state:zlState};},
    get currentMap(){return currentMap;},
    get pendingMap(){return window.pendingMap||null;},
    get gameDifficulty(){return gameDifficulty;},
    get zlEnemies(){return enemies.filter(function(e){return e.isZombie;}).map(function(e){return {hp:e.hp,vis:e.mesh.visible,x:Math.round(e.pos.x),z:Math.round(e.pos.z)};});},
    get enemies(){return enemies;},
    get boss(){return boss;},
    set countdown(v){countdown=v;},
    get countdown(){return countdown;},
    dbgSpawnBoss:zlSpawnBoss,
    dbgBossTick:zlBossTick,
    dbgSetBossHp:function(v){if(boss)boss.hp=v;},
    get musicOn(){return !!_zm;},
    get musicStep(){return _zm?_zm.step:-1;},
    dbgResumeAudio:function(){try{if(!audioCtx)initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();return audioCtx?audioCtx.state:'none';}catch(e){return String(e);}},
    get audioState(){return audioCtx?audioCtx.state:'none';},
    dbgTeleport:function(x,y,z){pos.set(x,y,z);vel.set(0,0,0);cam.position.set(x,y+EYE_H,z);},
    dbgLookAt:function(x,y,z){var dx=x-pos.x,dy=y-(pos.y+EYE_H),dz=z-pos.z;var len=Math.sqrt(dx*dx+dz*dz)||1;pitch=Math.atan2(dy,len);yaw=Math.atan2(-dx,-dz);var e=new THREE.Euler(pitch,yaw,0,'YXZ');cam.quaternion.setFromEuler(e);},
  };
}catch(e){console.error(e);document.getElementById("blocker").style.display="flex";document.querySelector("#blocker div").innerHTML="<b style=\"color:#f44\">錯誤：</b>"+e.message+"<br><small style=\"color:#aaa\">"+e.stack+"</small>";requestAnimationFrame(animate);}}
// ── SFX System ──
// ── 殭屍老巢 BGM：Web Audio 程序生成的刺激電子戰鬥樂（無外部音樂檔） ──
var _zm=null;
function startZlMusic(){
  try{
    stopZlMusic();
    if(!audioCtx)initAudio();
    if(!audioCtx)return;
    if(audioCtx.state==='suspended')audioCtx.resume();
    var ctx=audioCtx;
    var master=ctx.createGain();master.gain.value=0;
    var comp=ctx.createDynamicsCompressor();
    try{comp.threshold.value=-16;comp.ratio.value=6;}catch(e){}
    master.connect(comp);comp.connect(ctx.destination);
    master.gain.setTargetAtTime(0.45,ctx.currentTime,1.0);
    var nb=ctx.createBuffer(1,Math.floor(ctx.sampleRate),ctx.sampleRate);
    var nd=nb.getChannelData(0);for(var i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    var sd=60/140/4;   // 140BPM 十六分音符
    _zm={ctx:ctx,master:master,nz:nb,step:0,next:ctx.currentTime+0.1,sd:sd,cd:null};
    _zm.cd=setInterval(function(){
      if(!_zm)return;
      var c=_zm.ctx;
      // 音訊被暫停過（分頁切換/context suspend）→ currentTime 會跳一大段，
      // 若不重新對齊，恢復瞬間會把累積的音符全部同幀爆出 → 爆音
      if(_zm.next<c.currentTime-0.5)_zm.next=c.currentTime+0.05;
      while(_zm.next<c.currentTime+0.18){
        var st=_zm.step%64;
        zmPlay(st,_zm.next);
        _zm.step++;_zm.next+=_zm.sd;
      }
    },45);
  }catch(e){}
}
function stopZlMusic(){
  try{
    var z=_zm;_zm=null;
    if(!z)return;
    if(z.cd){clearInterval(z.cd);z.cd=null;}
    if(z.master){
      var t=z.ctx.currentTime;
      try{z.master.gain.cancelScheduledValues(t);z.master.gain.setValueAtTime(z.master.gain.value,t);z.master.gain.linearRampToValueAtTime(0,t+0.5);}catch(e){}
      var mm=z.master;setTimeout(function(){try{mm.disconnect();}catch(e){}},700);
    }
  }catch(e){}
}
var _zmRoots=[45,41,43,40];                       // 每小節根音 A2 F2 G2 E2（小調走向）
var _zmBassP=[0,-1,0,0,0,-1,0,7,0,-1,0,0,3,-1,0,-1];
var _zmLeadP=[-1,0,-1,1,2,-1,1,-1,-1,0,-1,1,2,-1,1,-1];
function zmMidi(m){return 440*Math.pow(2,(m-69)/12);}
function zmKick(t,m,ctx){
  var o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(170,t);o.frequency.exponentialRampToValueAtTime(45,t+0.11);
  g.gain.setValueAtTime(1.0,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
  o.connect(g);g.connect(m);o.start(t);o.stop(t+0.3);
}
function zmSnare(t,m,ctx,nz){
  var n=ctx.createBufferSource();n.buffer=nz;n.loop=true;
  var f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=1500;
  var g=ctx.createGain();
  g.gain.setValueAtTime(0.4,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
  n.connect(f);f.connect(g);g.connect(m);n.start(t);n.stop(t+0.17);
  var o=ctx.createOscillator(),g2=ctx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(110,t+0.1);
  g2.gain.setValueAtTime(0.35,t);g2.gain.exponentialRampToValueAtTime(0.001,t+0.12);
  o.connect(g2);g2.connect(m);o.start(t);o.stop(t+0.14);
}
function zmHat(t,m,ctx,nz,vol){
  var n=ctx.createBufferSource();n.buffer=nz;n.loop=true;
  var f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=7500;
  var g=ctx.createGain();
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.045);
  n.connect(f);f.connect(g);g.connect(m);n.start(t);n.stop(t+0.06);
}
function zmBass(t,m,ctx,freq,dur){
  var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=6;
  lp.frequency.setValueAtTime(1500,t);lp.frequency.exponentialRampToValueAtTime(240,t+dur);
  var g=ctx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.5,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  lp.connect(g);g.connect(m);
  var o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=freq;o.connect(lp);
  var o2=ctx.createOscillator();o2.type='square';o2.frequency.value=freq/2;o2.connect(lp);
  o.start(t);o.stop(t+dur+0.02);o2.start(t);o2.stop(t+dur+0.02);
}
function zmLead(t,m,ctx,freq,dur){
  var lp=ctx.createBiquadFilter();lp.type='lowpass';
  lp.frequency.setValueAtTime(4200,t);lp.frequency.exponentialRampToValueAtTime(850,t+dur);
  var g=ctx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.15,t+0.012);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  lp.connect(g);g.connect(m);
  var o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=freq;o.detune.value=-8;o.connect(lp);o.start(t);o.stop(t+dur+0.03);
  var o2=ctx.createOscillator();o2.type='sawtooth';o2.frequency.value=freq;o2.detune.value=8;o2.connect(lp);o2.start(t);o2.stop(t+dur+0.03);
}
function zmStab(t,m,ctx,bar){
  var triads=[[57,60,64],[53,57,60],[55,59,62],[52,55,59]];
  var notes=triads[bar%4];
  var g=ctx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.1,t+0.01);
  g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
  var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;
  lp.connect(g);g.connect(m);
  for(var i=0;i<notes.length;i++){
    var o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=zmMidi(notes[i]);
    o.connect(lp);o.start(t);o.stop(t+0.28);
  }
}
function zmPlay(step,t){
  var z=_zm;if(!z)return;
  var ctx=z.ctx,m=z.master;
  var s=step%16, bar=Math.floor(step/16)%4;
  var root=_zmRoots[bar];
  if(step===0){ // 小節頭：crash + 和弦 stab
    try{
      var n=ctx.createBufferSource();n.buffer=z.nz;n.loop=true;
      var f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=3800;
      var g=ctx.createGain();
      g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+1.1);
      n.connect(f);f.connect(g);g.connect(m);n.start(t);n.stop(t+1.2);
    }catch(e){}
    zmStab(t,m,ctx,bar);
  }
  if(s%4===0)zmKick(t,m,ctx);
  if(s===4||s===12)zmSnare(t,m,ctx,z.nz);
  if(s%2===1)zmHat(t,m,ctx,z.nz,s%4===3?0.26:0.15);
  var bo=_zmBassP[s];
  if(bo>=0)zmBass(t,m,ctx,zmMidi(root+bo),z.sd*1.7);
  if(bar%2===1){ // 第2、4小節加入主旋律 → 刺激感升級
    var li=_zmLeadP[s];
    if(li>=0)zmLead(t,m,ctx,zmMidi(root+24+li*2),z.sd*2.2);
  }
}
var audioCtx=null;
function initAudio(){
  if(audioCtx)return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
}
function preloadSFX(){
  var sfxList=['microsammy-ak-47-firing-8760.mp3','dingman081130--286379.mp3','ElevenLabs_快速射击的机枪声，真实有力的子弹声，清脆的金属机械声，快速连续的自动射击，响亮有冲击力，仅一次射击，非常短暂.mp3','freesound_community-assault-rifle-reload-104296.mp3','ElevenLabs_快节奏现代冲锋枪换弹，清晰的弹匣释放，快速插弹，干脆的枪机撞击声，逼真的金属与聚合物点击声，带有细微未来感伺服声，竞技射击风格，无语音，无音乐。.mp3','alexis_gaming_cam-katana-370403.mp3','soundreality-explosion-fx-343683.mp3','deejaycoxknot-vinyl-scratches-430214.mp3'];
  sfxList.forEach(function(p){var e=new Audio(p);e.preload='auto';e.style.display='none';document.body.appendChild(e);});
  // 預先以 Web Audio 解碼成 buffer，供 playShort 只播開頭片段成為單發槍聲
  // file:// 底下 fetch() 會被 CORS 擋掉（origin 是 null），
  // <audio> 元素可以正常載入但拿不到 raw bytes，所以這條路徑直接跳過。
  // 跳過後 playShort 會自動退回 <audio> 短播，只是沒有全自動的循環射擊音。
  var isFileProto=(location.protocol==='file:');
  try{
    if(!audioCtx)initAudio();
    if(audioCtx&&!isFileProto){
      window._sfxBuf=window._sfxBuf||{};
      sfxList.forEach(function(p){
        fetch(p).then(function(r){return r.arrayBuffer();}).then(function(ab){
          audioCtx.decodeAudioData(ab,function(b){window._sfxBuf[p]=b;},function(){});
        }).catch(function(){});
      });
    }
  }catch(e){}
  if(isFileProto)window._sfxNoLoop=true;
}
// ── 連發槍聲：連發(按住)時播放完整 mp3 直到鬆手/彈夾打完/換彈 ──
var autoLoopGuns={ak47:true,smg:true,deagle:true};
// 循環音效的「是否正在播放」必須同時看 Web Audio 的 _autoLoop 與 <audio> 的 _autoLoopEl。
// 舊做法只判斷 window._autoLoop，而拿不到 Web Audio buffer 時（file:// 或解碼失敗）
// startAutoLoop 走的是 <audio loop> 分支、_autoLoop 一直是 null：
//   1) 停止條件 `else if(!wantLoop&&window._autoLoop)` 永遠不成立 → 鬆手後槍聲一直 loop 不停
//   2) 開始條件 `if(wantLoop&&!window._autoLoop)` 每幀都成立 → 每幀 new 一個 <audio> 疊上去
function autoLoopOn(){return !!(window._autoLoop||window._autoLoopEl);}
function startAutoLoop(gun){
  try{
    if(autoLoopOn())stopAutoLoop();   // 保險：絕不疊加第二個循環音
    if(!audioCtx)initAudio();
    var lsrc=gunLoopSrcOf(gun);
    var buf=window._sfxBuf&&window._sfxBuf[lsrc];
    if(!buf){
      // 拿不到 Web Audio buffer（file:// 底下 fetch 被 CORS 擋）→ 用 <audio loop> 頂替
      if(window._autoLoopEl){try{window._autoLoopEl.pause();}catch(e){}window._autoLoopEl=null;}
      var ae=new Audio(lsrc);
      ae.loop=true;ae.volume=0.28;ae.style.display='none';document.body.appendChild(ae);
      ae.play().catch(function(){});
      window._autoLoopEl=ae;
      return;
    }
    if(window._autoLoop){try{window._autoLoop.stop();}catch(e){}window._autoLoop=null;}
    var s=audioCtx.createBufferSource();
    s.buffer=buf;s.loop=true;
    var g=audioCtx.createGain();g.gain.value=0.28;
    s.connect(g);g.connect(audioCtx.destination);
    window._autoLoop=s;
    try{s.start(audioCtx.currentTime);}catch(e){}
  }catch(e){}
}
function stopAutoLoop(){
  if(window._autoLoop){try{window._autoLoop.stop();}catch(e){}window._autoLoop=null;}
  if(window._autoLoopEl){try{window._autoLoopEl.pause();document.body.removeChild(window._autoLoopEl);}catch(e){}window._autoLoopEl=null;}
}
function gunLoopSrcOf(gun){
  if(gun==='ak47'||gun==='radrifle'||gun==='deagle')return 'microsammy-ak-47-firing-8760.mp3';
  if(gun==='smg')return 'ElevenLabs_快速射击的机枪声，真实有力的子弹声，清脆的金属机械声，快速连续的自动射击，响亮有冲击力，仅一次射击，非常短暂.mp3';
  return null;
}
function playShort(src,dur,vol){
  try{
    var volSet=(vol===undefined||vol===null)?0.3:vol;
    if(!audioCtx){initAudio();if(!audioCtx)return;}
    var slice=dur||0.08; // 只播放 mp3 開頭一小段 -> 單發槍聲，避免整段連射「抱抱抱」延續
    var buf=window._sfxBuf&&window._sfxBuf[src];
    if(buf){
      var srcNode=audioCtx.createBufferSource();
      srcNode.buffer=buf;
      var g=audioCtx.createGain();
      g.gain.value=volSet;
      srcNode.connect(g);g.connect(audioCtx.destination);
      var t=audioCtx.currentTime;
      srcNode.start(t);
      // 精確截斷：只保留開頭片段
      try{srcNode.stop(t+Math.min(slice,buf.duration));}catch(e){srcNode.stop(t+0.08);}
    }else{
      // buffer 尚未載入(極少見的首次)，退化為 <audio> 短播
      var a=new Audio(src);a.volume=volSet;a.style.display='none';document.body.appendChild(a);
      a.play().catch(function(){});
      var durMs=Math.max(60,(slice||0.08)*1000);
      setTimeout(function(){try{a.pause();document.body.removeChild(a);}catch(e){}},durMs+30);
    }
  }catch(e){}
}
function playAK47(){playShort('microsammy-ak-47-firing-8760.mp3',0.06);}
function playSniper(){playShort('dingman081130--286379.mp3',0.5,0.5);}
function playSMG(){playShort('ElevenLabs_快速射击的机枪声，真实有力的子弹声，清脆的金属机械声，快速连续的自动射击，响亮有冲击力，仅一次射击，非常短暂.mp3',0.05);}
function playKnife(){playShort('alexis_gaming_cam-katana-370403.mp3');}
function playGunSound(gun){
  // 連發(持有 auto loop)時由 loop 提供完整連射聲，避免每發再疊單發
  if(autoLoopGuns[gun]&&autoLoopOn())return;
  if(gun==='ak47'||gun==='radrifle'||gun==='deagle')playAK47();
  else if(gun==='awp'||gun==='sniper')playSniper();
  else if(gun==='smg')playSMG();
}
function playFootstep(){
  try{
    if(!audioCtx)initAudio();
    if(!audioCtx||audioCtx.state==='suspended')return;
    var now=audioCtx.currentTime;
    var src=audioCtx.createBufferSource();
    var buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.08,audioCtx.sampleRate);
    var d=buf.getChannelData(0);
    for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.max(0,1-i/d.length);
    src.buffer=buf;
    var lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=300;
    var g=audioCtx.createGain();g.gain.setValueAtTime(0.08,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.08);
    src.connect(lp);lp.connect(g);g.connect(audioCtx.destination);
    src.start(now);src.stop(now+0.08);
   }catch(e){}
 }
 var jpSoundNode=null,jpSoundGain=null;
 function startJetSound(){
  try{
   if(!audioCtx)initAudio();
   if(!audioCtx||audioCtx.state==='suspended')return;
   if(jpSoundNode)return;
   jpSoundNode=audioCtx.createOscillator();jpSoundNode.type='sawtooth';jpSoundNode.frequency.value=80;
   var lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=400;
   jpSoundGain=audioCtx.createGain();jpSoundGain.gain.setValueAtTime(0,audioCtx.currentTime);
   jpSoundGain.gain.linearRampToValueAtTime(0.06,audioCtx.currentTime+0.15);
   jpSoundNode.connect(lp);lp.connect(jpSoundGain);jpSoundGain.connect(audioCtx.destination);
   jpSoundNode.start();
  }catch(e){}
 }
 function stopJetSound(){
  try{
   if(jpSoundNode){
    jpSoundGain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.3);
    var n=jpSoundNode;jpSoundNode=null;
    setTimeout(function(){try{n.stop();}catch(e){}},350);
   }
  }catch(e){}
 }
 // ---- Flooded Map System ----
function addFloodedBox(p,s,c){
  addBox(p,s,c);var b=mapBoxes[mapBoxes.length-1];b.isFlooded=true;floodedMapElements.push(b);return b;
}
function createFloodedMapElements(){
  floodedMapElements=[];
  var seabed=new THREE.Mesh(new THREE.PlaneGeometry(36,36),new THREE.MeshStandardMaterial({color:0x2a4a3a,roughness:0.9,metalness:0}));
  seabed.rotation.x=-Math.PI/2;seabed.position.set(0,-0.05,0);seabed.receiveShadow=true;scene.add(seabed);floodedMapElements.push({mesh:seabed});
  addFloodedBox(new THREE.Vector3(0,-0.1,0),new THREE.Vector3(34,0.2,34),0x2a4a3a);
  addFloodedBox(new THREE.Vector3(0,2,-17),new THREE.Vector3(34,4,1),0x3a4a5a);
  addFloodedBox(new THREE.Vector3(0,2,17),new THREE.Vector3(34,4,1),0x3a4a5a);
  addFloodedBox(new THREE.Vector3(-17,2,0),new THREE.Vector3(1,4,34),0x3a4a5a);
  addFloodedBox(new THREE.Vector3(17,2,0),new THREE.Vector3(1,4,34),0x3a4a5a);
  addFloodedBox(new THREE.Vector3(0,2.2,0),new THREE.Vector3(5,0.4,5),0x4a5a6a);
  addFloodedBox(new THREE.Vector3(0,2.6,0),new THREE.Vector3(3.5,0.4,3.5),0x5a6a7a);
  addFloodedBox(new THREE.Vector3(0,3.1,0),new THREE.Vector3(2,0.6,2),0x6a7a8a);
  var ruinPos=[[-8,0,-7],[9,0,-6],[-9,0,8],[7,0,9],[-6,0,-9],[10,0,4],[-10,0,-4]];
  for(var ri=0;ri<ruinPos.length;ri++){
    var rp=ruinPos[ri],rh=1.2+Math.random()*1.5;
    var col=new THREE.Mesh(new THREE.CylinderGeometry(0.3+Math.random()*0.15,0.35+Math.random()*0.15,rh,6),new THREE.MeshStandardMaterial({color:0x6a7a6a,roughness:0.8}));
    col.position.set(rp[0],rh/2,rp[2]);col.castShadow=true;col.receiveShadow=true;scene.add(col);
    var cap=new THREE.Mesh(new THREE.CylinderGeometry(0.35+Math.random()*0.1,0.2,0.1,6),new THREE.MeshStandardMaterial({color:0x7a8a7a,roughness:0.9}));
    cap.position.set(rp[0],rh+0.05,rp[2]);scene.add(cap);
    floodedMapElements.push({mesh:col});floodedMapElements.push({mesh:cap});
    if(rh>2){
      var debris=new THREE.Mesh(new THREE.BoxGeometry(0.3+Math.random()*0.2,0.08,0.4+Math.random()*0.3),new THREE.MeshStandardMaterial({color:0x5a6a5a}));
      debris.position.set(rp[0]+(Math.random()-0.5)*0.8,rh+0.09,rp[2]+(Math.random()-0.5)*0.8);debris.rotation.z=(Math.random()-0.5)*0.3;scene.add(debris);
      floodedMapElements.push({mesh:debris});
    }
  }
  for(var si=0;si<20;si++){
    var sx=(Math.random()-0.5)*28,sy=0.1+Math.random()*0.3,sz=(Math.random()-0.5)*28;
    var alga=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.04,0.3+Math.random()*0.4,4),new THREE.MeshStandardMaterial({color:0x2a5a2a,roughness:0.9}));
    alga.position.set(sx,sy,sz);alga.rotation.x=(Math.random()-0.5)*0.2;alga.rotation.z=(Math.random()-0.5)*0.2;scene.add(alga);
    floodedMapElements.push({mesh:alga});
  }
  for(var ci=0;ci<8;ci++){
    var cx=(Math.random()-0.5)*24,cz=(Math.random()-0.5)*24;
    var coral=new THREE.Group();
    for(var cj=0;cj<5;cj++){
      var br=new THREE.Mesh(new THREE.SphereGeometry(0.06+Math.random()*0.1,5,5),new THREE.MeshStandardMaterial({color:0xcc6644+Math.floor(Math.random()*0x442200)}));
      br.position.set((Math.random()-0.5)*0.2,Math.random()*0.15,(Math.random()-0.5)*0.2);coral.add(br);
    }
    coral.position.set(cx,0.08,cz);scene.add(coral);floodedMapElements.push({mesh:coral});
  }
}
// ---- BasicMap3 (基本地圖3) ----
var b3Ladders=[];
var basic3MapElements=[];
var climbT=null,climbPhase=0,climbAuto=true;
var b3Airdrop=null,b3AirdropRespawn=0;
function b3Add(p,s,c){
  addBox(p,s,c);
  var e=mapBoxes[mapBoxes.length-1];
  e.isBasic3=true;
  basic3MapElements.push(e);
  return e;
}
function b3Viz(mesh){
  basic3MapElements.push({mesh:mesh});
  return mesh;
}
function b3MergedLadder(lx,lz,latX,latZ,baseY,topY){
  var len=topY-baseY,mat=b3Mat(0xcba45a,0.6,0.4);
  var boxes=[];
  boxes.push([lx+latX*0.55,(baseY+topY)/2,lz+latZ*0.55,0.1,len/2,0.1]);
  boxes.push([lx-latX*0.55,(baseY+topY)/2,lz-latZ*0.55,0.1,len/2,0.1]);
  var steps=Math.max(4,Math.floor(len/1.1));
  for(var i=0;i<=steps;i++){
    var yy=baseY+0.2+i*(len-0.4)/steps;
    if(latX!==0)boxes.push([lx,yy,lz,1.15,0.08,0.08]);
    else boxes.push([lx,yy,lz,0.08,0.08,1.15]);
  }
  if(!window.__b3PosArr){window.__b3PosArr=[];window.__b3NorArr=[];window.__b3UvArr=[];window.__b3IdxArr=[];}
  var posArr=window.__b3PosArr,norArr=window.__b3NorArr,uvArr=window.__b3UvArr,idxArr=window.__b3IdxArr;
  var geo=new THREE.BoxGeometry(1,1,1);
  var pos=geo.attributes.position.array,nor=geo.attributes.normal.array,uv=geo.attributes.uv.array;
  var idx=geo.index.array;
  for(var b=0;b<boxes.length;b++){
    var bx=boxes[b][0],by=boxes[b][1],bz=boxes[b][2],sx=boxes[b][3],sy=boxes[b][4],sz=boxes[b][5];
    var base=posArr.length/3;
    for(var i2=0;i2<pos.length;i2+=3){posArr.push(pos[i2]*sx+bx,pos[i2+1]*sy+by,pos[i2+2]*sz+bz);}
    for(var j=0;j<nor.length;j++)norArr.push(nor[j]);
    for(var k=0;k<uv.length;k++)uvArr.push(uv[k]);
    for(var m=0;m<idx.length;m++)idxArr.push(idx[m]+base);
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(posArr,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(norArr,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvArr,2));
  g.setIndex(idxArr);
  var mesh=new THREE.Mesh(g,mat);
  mesh.castShadow=false;mesh.receiveShadow=true;
  return mesh;
}
function b3Mat(c,r,m){return new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});}
function createBasic3MapElements(){
  if(basic3MapElements.length)return;
  var G=0x6aae5a,D=0x8a6a4a,St=0x9a9894,Sa=0xcaa45a,Br=0xa85a4a,Te=0x4a9acc,Pu=0x7a5ac5,S2=0xb8c8d8,Pi=0x5a5a8a,Pc=0x7a7a9a,Pa=0x88c0e0,Tr=0x6a4a2a,Le=0x3a7a3a,Lb=0x4a8a4a,Fl=0xd05a80,Wa=0x4a8fc8,Wh=0xd8c05a,Go=0xd8b45a;
  b3Add(new THREE.Vector3(0,-1.2,0),new THREE.Vector3(116,2.4,116),G);
  b3Add(new THREE.Vector3(0,-2.4,0),new THREE.Vector3(122,2.4,122),D);
  b3Add(new THREE.Vector3(-22,0,-32),new THREE.Vector3(6,1.2,6),D);
  b3Add(new THREE.Vector3(-22,0.6,-30),new THREE.Vector3(6,1.2,6),D);
  b3Add(new THREE.Vector3(-20,1.2,-28),new THREE.Vector3(6,1.2,6),St);
  b3Add(new THREE.Vector3(-16,1.1,-26),new THREE.Vector3(5,1,5),G);
  b3Add(new THREE.Vector3(-8,0,-24),new THREE.Vector3(4,2,4),St);
  b3Add(new THREE.Vector3(-8,1,-22),new THREE.Vector3(4,1.4,4),St);
  b3Add(new THREE.Vector3(6,0,-26),new THREE.Vector3(4.4,3,4.4),St);
  b3Add(new THREE.Vector3(14,0,-22),new THREE.Vector3(6,1,6),Sa);
  b3Add(new THREE.Vector3(14,1,-20),new THREE.Vector3(3.6,1.4,3.6),G);
  b3Add(new THREE.Vector3(0,0,-18),new THREE.Vector3(6,1,6),St);
  b3Add(new THREE.Vector3(0,0.5,-16.2),new THREE.Vector3(6,1,6),St);
  b3Add(new THREE.Vector3(0,1.0,-14.4),new THREE.Vector3(6,1,6),St);
  b3Add(new THREE.Vector3(0,1.5,-12.6),new THREE.Vector3(6,1,6),Te);
  b3Add(new THREE.Vector3(-10,0.8,-8),new THREE.Vector3(12,1.6,12),St);
  b3Add(new THREE.Vector3(-14,1.6,-8),new THREE.Vector3(8,1.6,8),St);
  b3Add(new THREE.Vector3(-18,2.4,-8),new THREE.Vector3(6,1.6,6),Br);
  b3Add(new THREE.Vector3(-26,0.4,8),new THREE.Vector3(10,0.8,10),St);
  b3Add(new THREE.Vector3(-23,0.8,8),new THREE.Vector3(8,1.6,8),St);
  b3Add(new THREE.Vector3(-20.6,1.4,8),new THREE.Vector3(5,2,6),Te);
  b3Add(new THREE.Vector3(-19,2.2,8),new THREE.Vector3(5,1.6,6),Te);
  b3Add(new THREE.Vector3(18,0,-8),new THREE.Vector3(16,2.4,1),St);
  b3Add(new THREE.Vector3(20,1.2,-6),new THREE.Vector3(14,1.2,0.8),Te);
  b3Add(new THREE.Vector3(21.5,1.8,-3.6),new THREE.Vector3(11,1.2,0.8),Te);
  b3Add(new THREE.Vector3(20,0,4),new THREE.Vector3(16,1.2,0.8),St);
  b3Add(new THREE.Vector3(20,0,16),new THREE.Vector3(10,1.4,10),D);
  b3Add(new THREE.Vector3(20,0.7,16),new THREE.Vector3(6.8,1.8,6.8),G);
  b3Add(new THREE.Vector3(20,1.6,16),new THREE.Vector3(4.4,1.6,4.4),St);
  b3Add(new THREE.Vector3(0,0,10),new THREE.Vector3(1.2,5.2,1.2),St);
  b3Add(new THREE.Vector3(2,0,10),new THREE.Vector3(1.2,5.2,1.2),St);
  b3Add(new THREE.Vector3(1,2.6,10),new THREE.Vector3(2,0.8,1.2),St);
  function b3Tree(x,z,s,variation){
    s=s||1;variation=variation||0;
    b3Add(new THREE.Vector3(x,0.9*s,z),new THREE.Vector3(0.36*s,1.8*s,0.36*s),Tr);
    b3Add(new THREE.Vector3(x,1.9*s+variation*0.5,z),new THREE.Vector3(1.4*s,1.4*s,1.4*s),Le);
    b3Add(new THREE.Vector3(x,2.5*s+variation*0.5,z),new THREE.Vector3(1.1*s,1.0*s,1.1*s),Lb);
  }
  function b3Bush(x,z,s){b3Add(new THREE.Vector3(x,0.35*s,z),new THREE.Vector3(1.2*s,0.7*s,1.2*s),Lb);}
  function b3Rock(x,z,s){
    b3Add(new THREE.Vector3(x,0.25*s,z),new THREE.Vector3(s,s,0.9*s),St);
    b3Add(new THREE.Vector3(x+0.2*s,0.72*s,z+0.15*s),new THREE.Vector3(0.44*s,0.44*s,0.4*s),S2);
  }
  function b3Torch(x,z){
    b3Add(new THREE.Vector3(x,1.0,z),new THREE.Vector3(0.16,2.0,0.16),Tr);
    var flame=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.2,0.14),new THREE.MeshBasicMaterial({color:0xffb020}));
    flame.position.set(x,1.75,z);flame.castShadow=false;scene.add(flame);
    b3Viz(flame);
  }
  b3Torch(-3.2,9.6);b3Torch(3.2,9.6);
  var tr=[[-30,-34,1.2,0],[-34,-14,1.4,1],[-34,-18,1.0,0],[-6,-38,1.6,1],[2,-40,1.2,0],[10,-38,1.5,1],[26,-26,1.4,0],[32,-16,1.2,1],[34,-8,1.0,0],[-32,16,1.7,1],[-34,22,1.2,0],[-30,32,1.5,1],[6,32,1.4,0],[2,28,1.0,1],[-14,38,1.8,0],[24,32,1.2,1],[34,20,1.4,0],[34,28,1.0,1],[26,6,1.6,1],[32,2,1.2,0],[-22,-30,1.3,0],[-14,-38,1.5,1],[-20,20,1.3,1],[-10,-24,0.9,0],[20,-12,1.6,1],[22,-34,1.1,0]];
  tr.forEach(function(t){b3Tree(t[0],t[1],t[2],t[3]);});
  [[-14,14,1],[-11,17,0.8],[-8,16,1.1],[14,8,1],[18,6,0.9],[22,10,1.2],[-6,-32,0.9],[-16,-30,1.1]].forEach(function(b){b3Bush(b[0],b[1],b[2]);});
  [[16,-6,1],[16,-8,0.7],[-24,12,1.2],[-26,12,0.8],[30,-10,0.9],[28,20,1.3],[-16,2,1.1],[-8,4,0.7],[21,22,0.7],[27,27,0.8],[-30,34,0.8]].forEach(function(r){b3Rock(r[0],r[1],r[2]);});
  b3Add(new THREE.Vector3(24,0.12,24),new THREE.Vector3(4.8,0.24,4.8),Wa);
  b3Add(new THREE.Vector3(24,0.12,28.4),new THREE.Vector3(2.8,0.24,2.8),Wa);
  b3Add(new THREE.Vector3(-34,0.12,36),new THREE.Vector3(4.4,0.24,4.4),Wa);
  var flowerMats=[b3Mat(Wh,0.8,0),b3Mat(Fl,0.8,0)];
  for(var fl=0;fl<22;fl++){
    var fxp=18+Math.random()*20,fzp=-30+Math.random()*16;
    var fm=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.4,5),flowerMats[fl%2]);
    fm.position.set(fxp,0.45,fzp);fm.castShadow=false;scene.add(fm);b3Viz(fm);
  }
  for(var f2=0;f2<14;f2++){
    var sxp=-24+Math.random()*20,szp=10+Math.random()*14;
    var sm=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.5,5),b3Mat(Fl,0.8,0));
    sm.position.set(sxp,0.42,szp);sm.castShadow=false;scene.add(sm);b3Viz(sm);
  }
  // Pillars + sky platform
  var SKY_TOP=36,PILLAR_HALF=2.4,CAP_HALF=3.2;
  var pillarPos=[{x:-14,z:-14},{x:14,z:-14},{x:-14,z:14},{x:14,z:14}];
  function b3Pillar(p){
    b3Add(new THREE.Vector3(p.x,17.75,p.z),new THREE.Vector3(PILLAR_HALF*2,35.5,PILLAR_HALF*2),Pi);
    b3Add(new THREE.Vector3(p.x,0.35,p.z),new THREE.Vector3((PILLAR_HALF+0.8)*2,0.7,(PILLAR_HALF+0.8)*2),Sa);
    b3Add(new THREE.Vector3(p.x,SKY_TOP-0.1,p.z),new THREE.Vector3((CAP_HALF-0.15)*2,0.5,(CAP_HALF-0.15)*2),Pc);
  }
  b3Add(new THREE.Vector3(0,SKY_TOP-1.5,0),new THREE.Vector3(34,3,34),Te);
  b3Add(new THREE.Vector3(0,SKY_TOP-4,0),new THREE.Vector3(30,1.6,30),Pu);
  b3Viz((function(){var m=new THREE.Mesh(new THREE.BoxGeometry(28,3.2,28),b3Mat(St,0.9,0));m.position.set(0,SKY_TOP-6,0);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}()));
  pillarPos.forEach(b3Pillar);
  function b3MakeLadder(p,fX,fZ){
    var lx=p.x+fX*(PILLAR_HALF+0.55);
    var lz=p.z+fZ*(PILLAR_HALF+0.55);
    var baseY=0.2,topY=SKY_TOP-0.15;
    var latX=-fZ,latZ=fX;
    var mesh=b3MergedLadder(lx,lz,latX,latZ,baseY,topY);
    scene.add(mesh);b3Viz(mesh);
    var knob=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.2,0.3),b3Mat(Go,0.4,0.3));
    knob.position.set(lx,topY+0.05,lz);knob.castShadow=false;scene.add(knob);b3Viz(knob);
    b3Ladders.push({x:lx,z:lz,fX:fX,fZ:fZ,baseY:baseY,topY:topY});
  }
  pillarPos.forEach(function(p){
    if(Math.abs(p.x)>=Math.abs(p.z)){b3MakeLadder(p,p.x>0?-1:1,0);}
    else{b3MakeLadder(p,0,p.z>0?-1:1);}
  });
  // Floating pads (spiral cloud)
  var a=0,r=16.5,y=37.0;
  for(var i=0;i<22;i++){
    var px=Math.cos(a)*r,pz=Math.sin(a)*r;
    b3Add(new THREE.Vector3(Math.round(px),Math.round(y*10)/10-0.25,Math.round(pz)),new THREE.Vector3(2.5,0.5,2.5),Pa);
    a+=0.22;r+=0.7;y+=0.85;
  }
  // Airdrop crate on the highest puzzle pad (last step i=21)
  var adI=21,adA=adI*0.22,adR=16.5+adI*0.7,adY=37.0+adI*0.85;
  var adTopY=Math.round(adY*10)/10;
  var adCenter=new THREE.Vector3(Math.round(Math.cos(adA)*adR),adTopY+0.3,Math.round(Math.sin(adA)*adR));
  var adG=new THREE.Group();
  var crateC=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.6,0.9),b3Mat(0x8a7a5a,0.6,0.1));
  crateC.position.y=0;adG.add(crateC);
  var lidC=new THREE.Mesh(new THREE.BoxGeometry(0.96,0.08,0.96),b3Mat(0x6a5a3a,0.5,0.2));
  lidC.position.y=0.36;adG.add(lidC);
  for(var adS=-1;adS<=1;adS+=2){
    var bandA=new THREE.Mesh(new THREE.BoxGeometry(0.93,0.62,0.07),b3Mat(0x4a3a2a,0.5,0.3));
    bandA.position.set(adS*0.3,0.02,0);adG.add(bandA);
    var bandB=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.62,0.93),b3Mat(0x4a3a2a,0.5,0.3));
    bandB.position.set(0,0.02,adS*0.3);adG.add(bandB);
  }
  var chute=new THREE.Mesh(new THREE.ConeGeometry(0.75,0.55,8,1,true),new THREE.MeshBasicMaterial({color:0xffd860,side:THREE.DoubleSide,transparent:true,opacity:0.9}));
  chute.rotation.x=Math.PI;chute.position.y=0.95;adG.add(chute);
  for(var adI=0;adI<4;adI++){
    var ang=adI*Math.PI/2;
    var str=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.4,0.02),b3Mat(0x3a2a1a,0.8,0));
    str.position.set(Math.cos(ang)*0.55,0.7,Math.sin(ang)*0.55);adG.add(str);
  }
  var adGlow=new THREE.Mesh(new THREE.SphereGeometry(0.24,8,8),new THREE.MeshBasicMaterial({color:0xffaa00,transparent:true,opacity:0.6}));
  adGlow.position.y=0.1;adG.add(adGlow);
  adG.position.copy(adCenter);scene.add(adG);b3Viz(adG);
  var adLight=new THREE.PointLight(0xffaa00,6,10);
  adLight.position.copy(adCenter);adLight.position.y+=0.8;scene.add(adLight);
  b3Airdrop={mesh:adG,glow:adGlow,light:adLight,pos:adCenter,baseY:adCenter.y,state:'waiting',time:0,cd:0};
  // Clouds
  for(var c=0;c<14;c++){
    var cl=new THREE.Mesh(new THREE.BoxGeometry(4,0.7,2.5),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.75}));
    cl.position.set((Math.random()-0.5)*150,38+Math.random()*14,(Math.random()-0.5)*150);
    scene.add(cl);b3Viz(cl);
  }
  basic3MapElements.forEach(function(b){if(b.mesh)b.mesh.visible=false;});
}
function createDiverEnemy(px,pz){
  var g=new THREE.Group();
  var bodyClr=0x1a2a3a;
  // 身體：統一方晶（潛水員配色）
  var bodyGrp=createCubelingMesh({body:CUBELING_PAL.green.body,accent:CUBELING_PAL.green.accent,
    glow:0x44ddff,core:0x14300f,visor:0x44ddff,visorEm:0x44ddff,visorEmI:0.6,shellOpacity:0.26});
  bodyGrp.scale.setScalar(CUBELING_AI_SCALE);
  g.add(bodyGrp);
  g.userData.cubeling=bodyGrp;
  // 背後氧氣瓶（保留潛水特色）
  var tank=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.13,0.25,8),new THREE.MeshStandardMaterial({color:0x888888,metalness:0.6}));
  tank.position.set(0,0.34,-0.24);tank.rotation.x=0.15;g.add(tank);
  var tank2=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.20,8),new THREE.MeshStandardMaterial({color:0x666666,metalness:0.5}));
  tank2.position.set(0,0.29,-0.28);tank2.rotation.x=0.10;g.add(tank2);
  var hg=new THREE.Group();
  var hBarrel=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.02,0.25,6),new THREE.MeshStandardMaterial({color:0x555555,metalness:0.7}));
  hBarrel.rotation.x=Math.PI/2;hBarrel.position.set(0,0,-0.15);hg.add(hBarrel);
  var hBody=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.1),new THREE.MeshStandardMaterial({color:0x444444,metalness:0.5}));
  hBody.position.set(0,0,0);hg.add(hBody);
  hg.position.set(0.18,0.18,0.2);g.add(hg);
  g.position.set(px,0.3,pz);
  scene.add(g);
  var hBar=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.06),new THREE.MeshBasicMaterial({color:0x44cc44,depthTest:false}));
  hBar.position.set(px,CUBELING_BAR+0.25,pz);scene.add(hBar);
  enemies.push({
    mesh:g,pos:new THREE.Vector3(px,0.3,pz),hp:60,armor:60,maxHp:60,maxArmor:60,
    state:'patrol',waypoint:new THREE.Vector3(px+8-16*Math.random(),0.3,pz+8-16*Math.random()),
    shootCD:0,detectCD:0,walkTime:0,gun:hg,color:bodyClr,
    hBar:hBar,aBar:null,knifeHits:0,type:'diver',
    weaponType:'harpoon',chargeTimer:0,burnTimer:0
  });
}
function spawnDiverWave(){
  var count=Math.min(floodedWave+1,6);
  var spawned=0;
  for(var dxi=0;dxi<enemies.length&&spawned<count;dxi++){
    var e=enemies[dxi];
    if(e.hp<=0){
      var hpMul=1+floodedWave*0.2,dmgMul=1+floodedWave*0.15;
      var ed=diffMult||1;
      e.hp=Math.round(60*hpMul*ed);e.maxHp=e.hp;e.armor=Math.round(60*hpMul*ed);e.maxArmor=e.armor;
      e.type='diver';e.shootCD=0;e.knifeHits=0;e.burnTimer=0;e.diverDead=false;
      var rp_=new THREE.Vector3((Math.random()-0.5)*26,0.3,(Math.random()-0.5)*26);
      var a_=Math.random()*Math.PI*2;rp_.x+=Math.cos(a_)*6;rp_.z+=Math.sin(a_)*6;
      rp_.x=Math.max(-14,Math.min(14,rp_.x));rp_.z=Math.max(-14,Math.min(14,rp_.z));
      e.pos.copy(rp_);e.mesh.position.copy(rp_);e.towerPerch=null;
      e.mesh.visible=true;if(e.gun)e.gun.visible=true;
      if(e.hBar){e.hBar.visible=true;e.hBar.position.set(rp_.x,0.95,rp_.z);}
      spawned++;
    }
  }
  document.getElementById('nuclear-wave').textContent='🌊 波 '+floodedWave+' 進度 '+floodedClears+'/'+(floodedWave*3);
  document.getElementById('nuclear-wave').style.display='block';
  document.getElementById('nuclear-wave').style.color='#4af';
}
function updateFlooded(dt){
  if(currentMap!=='flooded'||!gameStarted)return;
  if(!bossFloodedSpawned){
    var alive=0;
    for(var fci=0;fci<enemies.length;fci++){var fc=enemies[fci];if(fc.type==='diver'&&fc.mesh.visible&&fc.hp>0)alive++;}
    if(alive===0&&floodedClears>0&&floodedWave<3){floodedWave++;spawnDiverWave();}
    if(floodedClears>=9&&!bossFloodedSpawned){spawnAbyssalMaw();}
    var killsThisWave=Math.min(floodedClears-((floodedWave-1)*3),3);
    document.getElementById('nuclear-wave').textContent='🌊 波 '+floodedWave+' 進度 '+Math.max(0,killsThisWave)+'/'+3;
  }
  for(var di=0;di<enemies.length;di++){
    var e=enemies[di];if(e.type!=='diver')continue;
    if(e.hp<=0&&!e.diverDead){
      e.diverDead=true;floodedClears++;
      if(e.mesh.visible!==false){
        e.mesh.visible=false;
        if(e.hBar)e.hBar.visible=false;
        earnCoins(1000);checkKillAch();roundEarnings+=1000;
        showDmgNum(e.pos.clone(),1000,'#fa4');
        if(window.lifesteal){playerHP=Math.min(100,playerHP+10);showDmgNum(pos.clone().add(new THREE.Vector3(0,1.5,0)),10,'#44ff88');}
      }
      continue;
    }
    if(e.hp<=0){e.mesh.visible=false;continue;}
    updateDiverAI(e,dt);
  }
  if(bossFloodedActive&&abyssalMaw)updateAbyssalMaw(dt);
  bubbleTimer-=dt;
  if(bubbleTimer<=0){spawnAirBubble();bubbleTimer=1.5+Math.random()*1.5;}
  updateAirBubbles(dt);
  updateOxyVents(dt);
  var ft=Date.now()/1000;
  var waterPulse=0.15+0.08*Math.sin(ft*0.5);
  document.getElementById('underwater-overlay').style.background='radial-gradient(ellipse at center,rgba(0,40,80,'+waterPulse+'),rgba(0,20,60,0.4))';
}
function updateDiverAI(e,dt){
  e.shootCD-=dt;e.detectCD-=dt;e.walkTime+=dt;
  if(e.mesh.userData&&e.mesh.userData.cubeling&&e.mesh.userData.cubeling.userData.tick)e.mesh.userData.cubeling.userData.tick(e.walkTime);
  if(!e.strafeCD)e.strafeCD=0;else e.strafeCD-=dt;
  if(!e.hitTimer)e.hitTimer=0;else e.hitTimer-=dt;
  if(window.ghostInvis){e.hasDetected=false;}
  else if(e.detectCD<=0){
    var toP=new THREE.Vector3().copy(pos);toP.y+=0.3;toP.sub(e.pos);
    var dist=toP.length();e.hasDetected=dist<35;e.detectCD=0.3;
  }
  if(e.hasDetected){e.state='chase';}else if(e.state==='chase'){e.state='search';e.searchTimer=2;}
  else if(e.state==='search'){e.searchTimer-=dt;if(e.searchTimer<=0){e.state='patrol';e.waypoint.set(e.pos.x+8-16*Math.random(),0.3,e.pos.z+8-16*Math.random());}}
  var spd=e.state==='chase'?3.5:1.2;
  var aimAtPlayer=false,moveTarget=null;
  if(e.state==='chase'){
    aimAtPlayer=true;
    var toPlayer=new THREE.Vector3().copy(pos);toPlayer.y=0;toPlayer.sub(e.pos);
    var d=toPlayer.length();
    if(e.strafeCD<=0){e.strafeDir=(Math.random()-0.5)*2;e.strafeCD=0.5+Math.random()*0.5;}
    var fwd=toPlayer.clone().normalize();
    var rgt=new THREE.Vector3(-fwd.z,0,fwd.x);
    var desired=new THREE.Vector3();
    var idealDist=d<8?6:12+Math.random()*4;
    if(d>idealDist+2)desired.add(fwd);else if(d<idealDist-3)desired.sub(fwd);
    desired.add(rgt.clone().multiplyScalar(e.strafeDir*0.5));
    var avoidDir=new THREE.Vector3();
    for(var bi=0;bi<mapBoxes.length;bi++){
      var bx=mapBoxes[bi];
      if(!bx.mesh.visible)continue;
      var toBox=new THREE.Vector3().copy(bx.pos).sub(e.pos);var bd=toBox.length();
      if(bd<3&&bd>0.1)avoidDir.sub(toBox.normalize().multiplyScalar(3/bd));
    }
    desired.add(avoidDir);
    if(desired.length()>1)desired.normalize();
    moveTarget=e.pos.clone().add(desired.multiplyScalar(3));
    if(e.shootCD<=0&&d<25){
      var hDmg=Math.round((10+floodedWave*2)*(diffMult||1));
      var hDir=new THREE.Vector3(pos.x-e.pos.x,pos.y+0.3-e.pos.y,pos.z-e.pos.z).normalize();
      hDir.x+=(Math.random()-0.5)*0.08;hDir.y+=(Math.random()-0.5)*0.06;hDir.normalize();
      var hMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.15,4),new THREE.MeshBasicMaterial({color:0x88bbff}));
      hMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),hDir);hMesh.position.copy(e.pos);hMesh.position.y+=0.3;scene.add(hMesh);
      harpoonProjectiles.push({mesh:hMesh,pos:e.pos.clone().add(new THREE.Vector3(0,0.3,0)),vel:hDir.clone().multiplyScalar(20),life:3,dmg:hDmg});
      e.shootCD=1+Math.random()*0.5;e.state='shoot';
    }
  }else if(e.state==='shoot'){
    aimAtPlayer=true;
    moveTarget=e.pos.clone().add(new THREE.Vector3((Math.random()-0.5)*2,0,(Math.random()-0.5)*2));
    e.state='chase';
  }else if(e.state==='patrol'){
    moveTarget=e.waypoint;
    if(e.pos.distanceTo(e.waypoint)<1.5){e.waypoint.set(e.pos.x+8-16*Math.random(),0.3,e.pos.z+8-16*Math.random());e.waypoint.x=Math.max(-13,Math.min(13,e.waypoint.x));e.waypoint.z=Math.max(-13,Math.min(13,e.waypoint.z));}
  }else if(e.state==='search'){
    moveTarget=e.pos.clone().add(new THREE.Vector3().copy(pos).sub(e.pos).normalize().multiplyScalar(5));
  }
  if(moveTarget){
    var dir=new THREE.Vector3().copy(moveTarget).sub(e.pos);dir.y=0;
    if(dir.length()>0.3){dir.normalize();
      e.pos.x+=dir.x*spd*dt;e.pos.z+=dir.z*spd*dt;
      for(var bi=0;bi<mapBoxes.length;bi++){
        var bx=mapBoxes[bi];if(bx.size.y<0.3||!bx.mesh.visible)continue;
        if(e.pos.y>bx.pos.y+bx.size.y/2||e.pos.y+0.5<bx.pos.y-bx.size.y/2)continue;
        var dx=e.pos.x-bx.pos.x,dz=e.pos.z-bx.pos.z;
        var ox=bx.size.x/2+0.4-Math.abs(dx),oz=bx.size.z/2+0.4-Math.abs(dz);
        if(ox>0&&oz>0){if(ox<oz)e.pos.x+=dx>0?ox:-ox;else e.pos.z+=dz>0?oz:-oz;}
      }
      e.pos.x=Math.max(-14,Math.min(14,e.pos.x));e.pos.z=Math.max(-14,Math.min(14,e.pos.z));
      e.mesh.position.set(e.pos.x,0.3,e.pos.z);
      if(aimAtPlayer)e.mesh.rotation.y=Math.atan2(pos.x-e.pos.x,pos.z-e.pos.z);
      else e.mesh.rotation.y=Math.atan2(dir.x,dir.z);
    }
  }
  if(e.hBar){e.hBar.position.set(e.pos.x,0.95,e.pos.z);e.hBar.scale.x=Math.max(0,e.hp/e.maxHp);e.hBar.position.x=e.pos.x-(1-Math.max(0,e.hp/e.maxHp))*0.3;}
}
function spawnAbyssalMaw(){
  if(bossFloodedSpawned)return;
  bossFloodedSpawned=true;bossFloodedActive=true;
  var bg=new THREE.Group();
  var bodyMat=new THREE.MeshStandardMaterial({color:0x0a1a2a,roughness:0.5,metalness:0.3,emissive:0x002040,emissiveIntensity:0.2});
  var body=new THREE.Mesh(new THREE.SphereGeometry(0.8,12,12),bodyMat);body.scale.set(1.1,0.9,1.2);body.position.y=0.5;bg.add(body);
  var tailMat=new THREE.MeshStandardMaterial({color:0x0a1a2a,roughness:0.6});
  var tail=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.6,8),tailMat);tail.position.set(0,0.3,-0.7);tail.rotation.x=Math.PI/6;bg.add(tail);
  var jawMat=new THREE.MeshStandardMaterial({color:0x0a1a2a,roughness:0.5});
  var jaw=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.2,0.3),jawMat);jaw.position.set(0,0.2,0.7);bg.add(jaw);
  var toothMat=new THREE.MeshStandardMaterial({color:0xeeeeee});
  for(var ti=0;ti<5;ti++){var tt=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.06,4),toothMat);tt.position.set(-0.2+ti*0.1,0.15,0.75+Math.sin(ti)*0.05);tt.rotation.x=Math.PI;bg.add(tt);}
  for(var ti=0;ti<5;ti++){var tt=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.05,4),toothMat);tt.position.set(-0.2+ti*0.1,0.29,0.72+Math.sin(ti)*0.05);bg.add(tt);}
  var eyeMat=new THREE.MeshStandardMaterial({color:0x88ff44,emissive:0x44ff22,emissiveIntensity:0.8});
  var eyeL=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),eyeMat);eyeL.position.set(-0.25,0.7,0.5);bg.add(eyeL);
  var eyeR=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),eyeMat);eyeR.position.set(0.25,0.7,0.5);bg.add(eyeR);
  var stalkMat=new THREE.MeshStandardMaterial({color:0x0a1a2a});
  var stalk=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.25,6),stalkMat);stalk.position.set(0,0.7,0.35);stalk.rotation.x=-0.5;bg.add(stalk);
  var lureMat=new THREE.MeshStandardMaterial({color:0x44ddff,emissive:0x44ddff,emissiveIntensity:2});
  var lure=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),lureMat);lure.position.set(0,0.85,0.2);bg.add(lure);
  var finMat=new THREE.MeshStandardMaterial({color:0x0a1a2a,roughness:0.5});
  var finL=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.25,4),finMat);finL.position.set(-0.55,0.55,0.1);finL.rotation.z=0.8;bg.add(finL);
  var finR=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.25,4),finMat);finR.position.set(0.55,0.55,0.1);finR.rotation.z=-0.8;bg.add(finR);
  var bPos=pos.clone();bPos.x+=Math.cos(yaw)*10;bPos.z+=Math.sin(yaw)*10;bPos.y=0.5;
  bg.position.copy(bPos);
  document.getElementById('boss-hp-wrap').style.display='flex';
  document.getElementById('boss-label').textContent='🐟 深淵巨口';
  scene.add(bg);
  abyssalMaw={mesh:bg,pos:bPos.clone(),hp:800,maxHp:800,shootCD:0,hitTimer:0,moveTimer:0,dir:new THREE.Vector3(1,0,0),phase:1};
  document.getElementById('nuclear-wave').textContent='🦈 深淵巨口 已出現！';
  document.getElementById('nuclear-wave').style.color='#f44';
}
function updateAbyssalMaw(dt){
  if(!abyssalMaw||!bossFloodedActive)return;
  if(abyssalMaw.hp<=0){
    bossFloodedActive=false;
    if(abyssalMaw.mesh){scene.remove(abyssalMaw.mesh);}
    document.getElementById('boss-hp-wrap').style.display='none';
    document.getElementById('nuclear-wave').textContent='✅ 深淵已遭殲滅！';
    document.getElementById('nuclear-wave').style.color='#4f4';
    document.getElementById('round-clear').textContent='任務成功 — 淹水房子通關！';
    document.getElementById('round-clear').style.display='block';
    weaponInventory.watergun=(weaponInventory.watergun||0)+1;
    try{localStorage.setItem('oc_inv',JSON.stringify(weaponInventory));}catch(e){}
    updateArmoryGunCounts();
    setTimeout(function(){document.getElementById('round-clear').style.display='none';},2500);
    floodedMapElements.forEach(function(fme){if(fme.mesh)disposeMesh(fme.mesh);});
    floodedMapElements=[];
    document.getElementById('o2-wrap').style.display='none';
    document.getElementById('underwater-overlay').style.display='none';
    isUnderwater=false;
    stopUnderwaterAmbient();
    gameStarted=false;didPlayGame=false;
    if(document.pointerLockElement)document.exitPointerLock();
    document.getElementById('blocker').style.display='none';
    currentMap='base';applyMapSettings();
    var xpEarned=10+Math.max(0,(roundNum-1)*2)+50;
    addXP(xpEarned);addProficiency();
    document.getElementById('settlement-xp').textContent='+'+xpEarned;
    var li=getLevelInfo(playerXP);
    document.getElementById('settlement-level').textContent='Lv.'+li.level+' ('+li.current+' / '+li.needed+')';
    document.getElementById('settlement-progress-fill').style.width=(li.current/li.needed*100)+'%';
    document.getElementById('settlement-daily').style.display='none';
    document.getElementById('settlement-xp-label').textContent='經 驗 值';
    document.getElementById('settlement-title').textContent='🌊 淹水房子 通關！';
    document.getElementById('settlement').style.display='flex';
    return;
  }
  var bpct=abyssalMaw.hp/abyssalMaw.maxHp*100;
  document.getElementById('boss-hp-fill').style.width=bpct+'%';
  document.getElementById('boss-hp-wrap').style.display='flex';
  abyssalMaw.moveTimer-=dt;abyssalMaw.shootCD-=dt;
  var toPos=new THREE.Vector3().copy(pos);toPos.y=0;
  var distToPlayer=abyssalMaw.pos.distanceTo(toPos);
  if(abyssalMaw.hp<abyssalMaw.maxHp*0.5&&abyssalMaw.phase===1){
    abyssalMaw.phase=2;floodedBossPhase=2;
    document.getElementById('boss-label').textContent='🐟 深淵巨口 — 第二階段';
    document.getElementById('boss-hp-wrap').style.display='flex';
  }
  if(abyssalMaw.phase===1){
    if(distToPlayer>4){var moveDir=new THREE.Vector3().copy(toPos).sub(abyssalMaw.pos).normalize();abyssalMaw.pos.x+=moveDir.x*2.5*dt;abyssalMaw.pos.z+=moveDir.z*2.5*dt;}
    if(distToPlayer<8&&abyssalMaw.moveTimer<=0){abyssalMaw.moveTimer=0.5+Math.random()*0.5;var rgt=new THREE.Vector3(-(pos.x-abyssalMaw.pos.x),0,pos.z-abyssalMaw.pos.z).normalize();abyssalMaw.dir=rgt.clone().multiplyScalar(Math.random()<0.5?1:-1);}
    if(distToPlayer<8){abyssalMaw.pos.x+=abyssalMaw.dir.x*1.5*dt;abyssalMaw.pos.z+=abyssalMaw.dir.z*1.5*dt;}
    if(distToPlayer<1.5&&abyssalMaw.shootCD<=0.4){playerDamage(Math.round(12*diffMult),abyssalMaw.pos);slowTimer=0.3;showDmgNum(pos.clone(),Math.round(12*diffMult),'#ff4444');}
    if(abyssalMaw.shootCD<=0){
      abyssalMaw.shootCD=1.2;
      for(var hi=-1;hi<=1;hi++){
        var hDir=new THREE.Vector3(pos.x-abyssalMaw.pos.x+hi*0.5,pos.y+0.5-abyssalMaw.pos.y-0.4,pos.z-abyssalMaw.pos.z).normalize();
        hDir.x+=(Math.random()-0.5)*0.12;hDir.y+=(Math.random()-0.5)*0.08;hDir.normalize();
        var hMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.2,4),new THREE.MeshBasicMaterial({color:0x88bbff}));
        hMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),hDir);
        hMesh.position.copy(abyssalMaw.pos);hMesh.position.y+=0.5;scene.add(hMesh);
        harpoonProjectiles.push({mesh:hMesh,pos:abyssalMaw.pos.clone().add(new THREE.Vector3(0,0.5,0)),vel:hDir.clone().multiplyScalar(18),life:4,dmg:15});
      }
    }
    if(abyssalMaw.shootCD<0.3&&Math.random()<0.1&&enemies.filter(function(ex){return ex.type==='diver'&&ex.hp>0;}).length<3){
      for(var sxi=0;sxi<enemies.length;sxi++){var sx=enemies[sxi];if(sx.hp<=0&&sx.type==='diver'){
        sx.hp=40;sx.maxHp=40;sx.armor=20;sx.maxArmor=20;sx.pos.set((Math.random()-0.5)*20,0.3,(Math.random()-0.5)*20);sx.mesh.position.copy(sx.pos);sx.mesh.visible=true;if(sx.hBar){sx.hBar.visible=true;sx.hBar.position.set(sx.pos.x,0.95,sx.pos.z);}sx.shootCD=0;sx.knifeHits=0;break;
      }}
    }
  }else{
    var pullStr=3.5;
    var pullDir=new THREE.Vector3().copy(abyssalMaw.pos).sub(pos);pullDir.y=0;
    var pullDist=pullDir.length();
    if(pullDist>0.5){pullDir.normalize().multiplyScalar(pullStr*dt);pos.x+=pullDir.x;pos.z+=pullDir.z;}
    if(distToPlayer>3){var moveDir=new THREE.Vector3().copy(toPos).sub(abyssalMaw.pos).normalize();abyssalMaw.pos.x+=moveDir.x*3.5*dt;abyssalMaw.pos.z+=moveDir.z*3.5*dt;}
    if(distToPlayer<1.5){playerDamage(Math.round(18*diffMult),abyssalMaw.pos);slowTimer=0.5;showDmgNum(pos.clone(),Math.round(18*diffMult),'#ff4444');abyssalMaw.shootCD=0.5;}
    if(abyssalMaw.shootCD<=0&&distToPlayer<12){
      abyssalMaw.shootCD=0.8;
      var cDir=new THREE.Vector3(pos.x-abyssalMaw.pos.x,pos.y+0.3-abyssalMaw.pos.y-0.4,pos.z-abyssalMaw.pos.z).normalize();
      cDir.x+=(Math.random()-0.5)*0.06;cDir.y+=(Math.random()-0.5)*0.05;cDir.normalize();
      var cMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.25,4),new THREE.MeshBasicMaterial({color:0xff8844}));
      cMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),cDir);
      cMesh.position.copy(abyssalMaw.pos);cMesh.position.y+=0.5;scene.add(cMesh);
      harpoonProjectiles.push({mesh:cMesh,pos:abyssalMaw.pos.clone().add(new THREE.Vector3(0,0.5,0)),vel:cDir.clone().multiplyScalar(22),life:4,dmg:22});
    }
  }
  abyssalMaw.pos.x=Math.max(-16,Math.min(16,abyssalMaw.pos.x));abyssalMaw.pos.z=Math.max(-16,Math.min(16,abyssalMaw.pos.z));
  abyssalMaw.mesh.position.copy(abyssalMaw.pos);
  abyssalMaw.mesh.rotation.y=Math.atan2(pos.x-abyssalMaw.pos.x,pos.z-abyssalMaw.pos.z);
  var lureGlow=abyssalMaw.mesh.children[abyssalMaw.mesh.children.length-1];
  if(lureGlow&&lureGlow.material&&lureGlow.material.emissiveIntensity!==undefined)lureGlow.material.emissiveIntensity=1.5+Math.sin(Date.now()/1000*3)*0.5;
}
function spawnAirBubble(){
  var bPos=new THREE.Vector3((Math.random()-0.5)*30,0.2+Math.random()*0.5,(Math.random()-0.5)*30);
  var bMesh=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshBasicMaterial({color:0x88ddff,transparent:true,opacity:0.35}));
  bMesh.position.copy(bPos);scene.add(bMesh);
  airBubbles.push({mesh:bMesh,pos:bPos,vy:0.4+Math.random()*0.6,life:4+Math.random()*3});
}
function updateAirBubbles(dt){
  for(var bi=airBubbles.length-1;bi>=0;bi--){
    var ab=airBubbles[bi];ab.life-=dt;ab.pos.y+=ab.vy*dt;ab.mesh.position.y=ab.pos.y;ab.mesh.position.x=ab.pos.x+(Math.sin(ab.life*3))*0.05;ab.mesh.position.z=ab.pos.z;
    if(ab.life<=0||ab.pos.y>waterLevel-0.1){scene.remove(ab.mesh);airBubbles.splice(bi,1);continue;}
    if(pos.distanceTo(ab.pos)<0.5){playerO2=Math.min(maxO2,playerO2+15);showDmgNum(pos.clone(),15,'#4af');scene.remove(ab.mesh);airBubbles.splice(bi,1);}
  }
}
function spawnOxyVents(){
  var ventPositions=[
    {x:-10,z:-10},{x:-10,z:10},{x:10,z:-10},{x:10,z:10},
    {x:0,z:-14},{x:0,z:14},{x:-14,z:0},{x:14,z:0},
    {x:-6,z:-6},{x:6,z:6},{x:-6,z:6},{x:6,z:-6},
    {x:-12,z:-5},{x:-12,z:5},{x:12,z:-5},{x:12,z:5}
  ];
  ventPositions.forEach(function(vp){
    var ventBase=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,0.08,8),new THREE.MeshStandardMaterial({color:0x4488aa,roughness:0.6,metalness:0.4,emissive:0x226688,emissiveIntensity:0.3}));
    ventBase.position.set(vp.x,0.02,vp.z);scene.add(ventBase);
    var ventGlow=new THREE.Mesh(new THREE.SphereGeometry(0.15,6,6),new THREE.MeshBasicMaterial({color:0x44ddff,transparent:true,opacity:0.25}));
    ventGlow.position.set(vp.x,0.12,vp.z);scene.add(ventGlow);
    oxyVents.push({pos:new THREE.Vector3(vp.x,0.12,vp.z),cooldown:0,base:ventBase,glow:ventGlow,particles:[]});
  });
}
function updateOxyVents(dt){
  oxyVents.forEach(function(v){
    v.cooldown-=dt;
    if(v.cooldown<0)v.cooldown=0;
    var dist=pos.distanceTo(v.pos);
    if(dist<1.2&&v.cooldown<=0){
      playerO2=Math.min(maxO2,playerO2+20);
      showDmgNum(pos.clone(),20,'#4af');
      v.cooldown=3;
    }
    var pulse=0.15+0.1*Math.sin(Date.now()/1000*2+v.pos.x*0.5);
    if(v.cooldown>0){
      if(v.glow)v.glow.material.opacity=0.05;
      if(v.base)v.base.material.emissiveIntensity=0.05;
    }else{
      if(v.glow)v.glow.material.opacity=pulse;
      if(v.base)v.base.material.emissiveIntensity=0.3+0.2*Math.sin(Date.now()/1000*2+v.pos.x*0.5);
    }
    if(v.cooldown<=0){
      v.particles.push({life:1+Math.random()*0.5,vy:0.3+Math.random()*0.4});
      v.particles=v.particles.filter(function(p){p.life-=dt;return p.life>0;});
    }else{v.particles=[];}
  });
}
function updateHarpoonProjectiles(dt){
  for(var hpi=harpoonProjectiles.length-1;hpi>=0;hpi--){
    var hp=harpoonProjectiles[hpi];hp.life-=dt;hp.pos.add(hp.vel.clone().multiplyScalar(dt));hp.mesh.position.copy(hp.pos);
    if(hp.life<=0){scene.remove(hp.mesh);harpoonProjectiles.splice(hpi,1);continue;}
    var hitP=false;
    if(pos.distanceTo(hp.pos)<0.5){
      var hpd=hp.dmg||12;playerDamage(hpd,hp.pos);slowTimer=0.5;screenShake=1;showDmgNum(pos.clone(),hpd,'#ff4444');hitP=true;
    }
    for(var bi=0;bi<mapBoxes.length;bi++){
      var b=mapBoxes[bi];if(!b.mesh.visible)continue;
      if(Math.abs(hp.pos.x-b.pos.x)<b.size.x/2+0.05&&Math.abs(hp.pos.y-b.pos.y)<b.size.y/2+0.05&&Math.abs(hp.pos.z-b.pos.z)<b.size.z/2+0.05){hitP=true;break;}
    }
    if(hitP){scene.remove(hp.mesh);harpoonProjectiles.splice(hpi,1);}
  }
}
function startUnderwaterAmbient(){
  if(!audioCtx)initAudio();
  if(!audioCtx||audioCtx.state==='suspended')return;
  if(underwaterAmbient)return;
  var now=audioCtx.currentTime;
  var src=audioCtx.createBufferSource();
  var bufLen=audioCtx.sampleRate*2;
  var buf=audioCtx.createBuffer(1,bufLen,audioCtx.sampleRate);
  var d=buf.getChannelData(0);
  for(var i=0;i<bufLen;i++)d[i]=Math.sin(2*Math.PI*120*i/audioCtx.sampleRate)*(0.3+0.2*Math.sin(2*Math.PI*0.3*i/audioCtx.sampleRate))+Math.sin(2*Math.PI*55*i/audioCtx.sampleRate)*0.2+(Math.random()-0.5)*0.05;
  src.buffer=buf;src.loop=true;
  var lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=400;lp.Q.value=1.5;
  var bp=audioCtx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=180;bp.Q.value=0.8;
  var g=audioCtx.createGain();g.gain.setValueAtTime(0.015,now);
  src.connect(lp);lp.connect(bp);bp.connect(g);g.connect(audioCtx.destination);
  src.start();underwaterAmbient={src:src,gain:g,lp:lp,bp:bp};
}
function stopUnderwaterAmbient(){
  if(!underwaterAmbient)return;
  try{underwaterAmbient.src.stop();}catch(e){}
  try{underwaterAmbient.src.disconnect();}catch(e){}
  try{underwaterAmbient.gain.disconnect();}catch(e){}
  try{underwaterAmbient.lp.disconnect();}catch(e){}
  try{underwaterAmbient.bp.disconnect();}catch(e){}
  underwaterAmbient=null;
}
// Save/Load
try{
  var sd=localStorage.getItem('ocgame_save');
  if(sd){document.getElementById('resume-prompt').style.display='flex';document.getElementById('save-exit-btn').style.display='none';}
}catch(ex){}

preloadSFX();
document.addEventListener('click',function(){if(!audioCtx)initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();},{once:true});
requestAnimationFrame(animate);
}
