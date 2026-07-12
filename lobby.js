// lobby.js - 3D Lobby System (整合版)
window.LobbySystem = (function() {
  'use strict';
  var T = window.THREE;

  var _active = false;
  var _ren = null, _scn = null, _cam = null;
  var _clock = null;

  // Player
  var _ply = null;
  var _pos = null;
  var _rot = 0;
  var _spd = 7;
  var _pts = {};
  var _isWalk = false;

  // Camera orbit
  var _th = Math.PI, _ph = 0.5, _dist = 12;
  var _md = false, _lmx=0, _lmy=0;

  // Input
  var _k = {};

  // Rainbow lights
  var _rainbowLights = [];
  var _rainbowColors = [0xff2244,0xff8800,0xffdd00,0x44ff44,0x00ccff,0x4466ff,0xcc44ff];

  // Zones
  var _allSpots = [];
  var _allZones = [];
  var _activeZone = null;
  var _platT = 0;
  var _animT = 0;
  var _occupyTimer = 0;
  var _notifT = 0;

  // Floor bounds
  var _B = {minX:-22,maxX:22,minZ:-22,maxZ:22};

  var _cbs = {};

  // Crack wall texture
  var _crackTex = null;

  // Multiplayer
  var _ws = null;
  var _lobbyName = '';
  var _localClientId = '';
  var _remotePlayers = {};
  var _lastSentPos = {x:0,z:0,rot:0};
  var _posSendThrottle = 0;
  var _lobbyColors = [0x4488ff,0xff4444,0x44ff44,0xff8800,0xaa44ff,0xff44aa,0x44ffaa,0xffaa44,0x44ccff,0xff6644];

  // ============ COPIED FROM lobby-test.html ============

  function makeCrackTex(){
    var cv=document.createElement('canvas');cv.width=512;cv.height=512;
    var ctx=cv.getContext('2d');
    var grad=ctx.createRadialGradient(256,256,0,256,256,300);
    grad.addColorStop(0,'#1a1a30');grad.addColorStop(0.5,'#121228');grad.addColorStop(1,'#0e0e20');
    ctx.fillStyle=grad;ctx.fillRect(0,0,512,512);
    for(var h=0;h<512;h+=32){for(var w=0;w<512;w+=32){
      if(Math.random()<0.05){
        var colors=['rgba(68,136,255,0.03)','rgba(255,68,136,0.02)','rgba(136,255,68,0.02)','rgba(255,200,68,0.03)'];
        ctx.fillStyle=colors[Math.floor(Math.random()*colors.length)];
        ctx.fillRect(w,h,32,32);
      }}}
    for(var i=0;i<16;i++){
      var x=Math.random()*512,y=50+Math.random()*412;
      var hue=Math.floor(Math.random()*360);
      ctx.strokeStyle='hsla('+hue+',80%,60%,'+(0.12+Math.random()*0.2)+')';
      ctx.lineWidth=1+Math.random()*2;
      ctx.beginPath();ctx.moveTo(x,y);
      var segs=8+Math.floor(Math.random()*12);
      for(var s=0;s<segs;s++){x+=(Math.random()-0.5)*35;y+=8+Math.random()*18;ctx.lineTo(x,y);
        if(Math.random()<0.25){var bx=x+(Math.random()-0.5)*25,by=y+Math.random()*12;ctx.moveTo(x,y);ctx.lineTo(bx,by);ctx.moveTo(x,y);}}
      ctx.stroke();
    }
    for(var g=0;g<30;g++){
      var gx=Math.random()*512,gy=Math.random()*512;
      var grad2=ctx.createRadialGradient(gx,gy,0,gx,gy,3+Math.random()*5);
      grad2.addColorStop(0,'rgba(100,180,255,0.25)');grad2.addColorStop(1,'rgba(68,136,255,0)');
      ctx.fillStyle=grad2;ctx.fillRect(gx-6,gy-6,12,12);
    }
    return new T.CanvasTexture(cv);
  }

  function makeRainbowFloor(){
    var fcv=document.createElement('canvas');fcv.width=512;fcv.height=512;
    var fcx=fcv.getContext('2d');
    var fgrad=fcx.createRadialGradient(256,256,0,256,256,360);
    fgrad.addColorStop(0,'#1a1a30');fgrad.addColorStop(0.3,'#1a1a30');
    fgrad.addColorStop(0.6,'rgba(68,136,255,0.05)');
    fgrad.addColorStop(0.8,'rgba(255,68,136,0.04)');
    fgrad.addColorStop(1,'rgba(136,255,68,0.03)');
    fcx.fillStyle=fgrad;fcx.fillRect(0,0,512,512);
    var ftex=new T.CanvasTexture(fcv);ftex.wrapS=ftex.wrapT=T.RepeatWrapping;ftex.repeat.set(4,4);
    var fl=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({map:ftex,roughness:0.7,metalness:0.2}));
    fl.rotation.x=-Math.PI/2;fl.position.y=-0.05;fl.receiveShadow=true;_scn.add(fl);
    var gh2=new T.GridHelper(60,30,0x333388,0x222266);gh2.position.y=0.01;_scn.add(gh2);
    var r0=new T.Mesh(new T.RingGeometry(2,3,48),new T.MeshBasicMaterial({color:0x4488ff,transparent:true,opacity:0.08,side:T.DoubleSide}));
    r0.rotation.x=-Math.PI/2;r0.position.set(0,0.02,0);_scn.add(r0);
  }

  function makeRainbowLights(){
    _rainbowColors.forEach(function(c,i){
      var angle=i/7*Math.PI*2;
      var radius=18;
      var pl=new T.PointLight(c,1.2,30);
      pl.position.set(Math.cos(angle)*radius,3.5,Math.sin(angle)*radius);
      _scn.add(pl);
      _rainbowLights.push({light:pl,angle:angle,radius:radius,height:3.5,phase:Math.random()*6.28});
      var orbMat=new T.MeshBasicMaterial({color:c,transparent:true,opacity:0.15});
      var orb=new T.Mesh(new T.SphereGeometry(0.4,12,12),orbMat);
      orb.position.copy(pl.position);_scn.add(orb);
      var cone=new T.Mesh(new T.ConeGeometry(0.15,1.5,8),
        new T.MeshBasicMaterial({color:c,transparent:true,opacity:0.04,blending:T.AdditiveBlending}));
      cone.position.copy(pl.position);cone.position.y-=1.0;_scn.add(cone);
    });
  }

  function makeCrackWalls(){
    _crackTex=makeCrackTex();_crackTex.wrapS=_crackTex.wrapT=T.RepeatWrapping;_crackTex.repeat.set(2,1);
    [[0,0,-25,50,5,0.3,0],[0,0,25,50,5,0.3,0],[-25,0,0,0.3,5,50,Math.PI/2],[25,0,0,0.3,5,50,Math.PI/2]].forEach(function(wp){
      var wall=new T.Mesh(new T.BoxGeometry(wp[3],wp[4],wp[5]),new T.MeshStandardMaterial({color:0x0a0a18,roughness:0.9,metalness:0.1,side:T.DoubleSide}));
      wall.position.set(wp[0],wp[4]/2,wp[2]);wall.rotation.y=wp[6];_scn.add(wall);
      var ov=new T.Mesh(new T.PlaneGeometry(wp[3]-1,wp[4]-1),new T.MeshBasicMaterial({map:_crackTex,transparent:true,opacity:0.45,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
      var isX=wp[6]!==0;ov.position.set(isX?0:0,0,isX?0:(wp[2]>0?0.31:-0.31));if(isX)ov.rotation.y=-Math.PI/2;
      var grp2=new T.Group();grp2.add(wall);grp2.add(ov);
      grp2.position.set(wp[0],wp[4]/2,wp[2]);grp2.rotation.y=wp[6];_scn.add(grp2);
    });
    [[0,0.1,-25.3,50,0.2,0.3],[0,0.1,25.3,50,0.2,0.3],[-25.3,0.1,0,0.3,0.2,50],[25.3,0.1,0,0.3,0.2,50]].forEach(function(b){
      var b2=new T.Mesh(new T.BoxGeometry(b[3],b[4],b[5]),new T.MeshBasicMaterial({color:0x4488ff,transparent:true,opacity:0.08}));
      b2.position.set(b[0],b[1],b[2]);_scn.add(b2);
    });
  }

  function makeEnhancedPillars(){
    var pm2=new T.MeshStandardMaterial({color:0x222244,roughness:0.4,metalness:0.7});
    [[-24,-24],[24,-24],[-24,24],[24,24]].forEach(function(p){
      var pl=new T.Mesh(new T.CylinderGeometry(0.8,1.0,6,8),pm2);pl.position.set(p[0],3,p[1]);pl.castShadow=true;_scn.add(pl);
      var g2=new T.Mesh(new T.SphereGeometry(0.5,8,8),new T.MeshBasicMaterial({color:0x4488ff,transparent:true,opacity:0.12}));g2.position.set(p[0],6,p[1]);_scn.add(g2);
    });
  }

  // ============ PEDESTAL + ZONE SYSTEM ============

  function makePedestal(col,label,zone){
    var g=new T.Group();
    var bs=new T.Mesh(new T.CylinderGeometry(0.5,0.55,0.2,12),new T.MeshStandardMaterial({color:0x1a1a2e,roughness:0.5,metalness:0.4}));
    bs.position.y=0.1;bs.receiveShadow=true;g.add(bs);
    var grm=new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.2,side:T.DoubleSide});
    var gr2=new T.Mesh(new T.RingGeometry(0.4,0.5,16),grm);
    gr2.rotation.x=-Math.PI/2;gr2.position.y=0.19;g.add(gr2);
    var ig=new T.Mesh(new T.CircleGeometry(0.38,16),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.04,side:T.DoubleSide}));
    ig.rotation.x=-Math.PI/2;ig.position.y=0.2;g.add(ig);
    var pc=new T.Mesh(new T.ConeGeometry(0.12,1.8,8),new T.MeshBasicMaterial({color:col,transparent:true,opacity:0.03,blending:T.AdditiveBlending}));
    pc.position.y=1.0;g.add(pc);
    var pl2=new T.PointLight(col,0.2,2.5);pl2.position.y=0.4;g.add(pl2);

    if(label){
      var cv3=document.createElement('canvas');cv3.width=48;cv3.height=48;
      var cx3=cv3.getContext('2d');
      cx3.fillStyle='#'+col.toString(16).padStart(6,'0');
      cx3.font='bold 20px Arial';cx3.textAlign='center';cx3.textBaseline='middle';
      cx3.fillText(label,24,24);
      var tx3=new T.CanvasTexture(cv3);
      var sp3=new T.Sprite(new T.SpriteMaterial({map:tx3,transparent:true,depthTest:false}));
      sp3.scale.set(0.35,0.35,1);sp3.position.y=1.1;g.add(sp3);
    }
    return {mesh:g,gr:gr2,grm:grm,pc:pc,pl:pl2,col:col,tr:false,platT:0,occupied:false,zone:zone};
  }

  function makeSingleZone(def){
    var zone={id:def.id,spots:[],single:true,label:def.lb,ic:def.ic,col:def.c,ready:false};
    var p=makePedestal(def.c,'',zone);
    p.mesh.position.set(def.x,0,def.z);_scn.add(p.mesh);
    zone.spots.push(p);
    var cv=document.createElement('canvas');cv.width=256;cv.height=56;
    var cx=cv.getContext('2d');
    cx.fillStyle='rgba(0,0,0,0.6)';cx.beginPath();
    if(cx.roundRect)cx.roundRect(0,0,256,56,8);else cx.rect(0,0,256,56);
    cx.fill();
    cx.fillStyle='#'+def.c.toString(16).padStart(6,'0');
    cx.font='bold 22px Arial';cx.textAlign='center';cx.textBaseline='middle';
    cx.fillText(def.ic+' '+def.lb,128,28);
    var tx=new T.CanvasTexture(cv);
    var sp=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthTest:false}));
    sp.scale.set(2.2,0.45,1);sp.position.set(def.x,2.8,def.z);_scn.add(sp);
    var bg2=new T.Mesh(new T.RingGeometry(0.6,0.9,16),new T.MeshBasicMaterial({color:def.c,transparent:true,opacity:0.06,side:T.DoubleSide}));
    bg2.rotation.x=-Math.PI/2;bg2.position.set(def.x,0.02,def.z);_scn.add(bg2);
    _allZones.push(zone);
    return zone;
  }

  function makePairedZone(def,count){
    var zone={id:def.id,spots:[],single:false,label:def.lb+((count>2)?' 4P':' 2P'),ic:def.ic,col:def.c,ready:false,count:count};
    var spacing=1.2;
    var rows=count===4?2:1;
    var cols=count===4?2:2;
    for(var i=0;i<count;i++){
      var row=Math.floor(i/cols);
      var col2=i%cols;
      var ox=(col2-(cols-1)/2)*spacing;
      var oz=(row-(rows-1)/2)*spacing;
      var lbl=count>2?['①','②','③','④'][i]:['①','②'][i];
      var p=makePedestal(def.c,lbl,zone);
      p.mesh.position.set(def.x+ox,0,def.z+oz);_scn.add(p.mesh);
      zone.spots.push(p);
    }
    var cv=document.createElement('canvas');cv.width=280;cv.height=56;
    var cx=cv.getContext('2d');
    cx.fillStyle='rgba(0,0,0,0.6)';cx.beginPath();
    if(cx.roundRect)cx.roundRect(0,0,280,56,8);else cx.rect(0,0,280,56);
    cx.fill();
    cx.fillStyle='#'+def.c.toString(16).padStart(6,'0');
    cx.font='bold 20px Arial';cx.textAlign='center';cx.textBaseline='middle';
    cx.fillText(def.ic+' '+def.lb+' '+(count>2?'4P':'2P'),140,28);
    var tx=new T.CanvasTexture(cv);
    var sp=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthTest:false}));
    sp.scale.set(2.6,0.45,1);sp.position.set(def.x,3.0+(count>2?0.5:0),def.z);_scn.add(sp);
    var radius2=count>2?2.2:1.2;
    var bg3=new T.Mesh(new T.RingGeometry(radius2-0.3,radius2,24),new T.MeshBasicMaterial({color:def.c,transparent:true,opacity:0.04,side:T.DoubleSide}));
    bg3.rotation.x=-Math.PI/2;bg3.position.set(def.x,0.01,def.z);_scn.add(bg3);
    _allZones.push(zone);
    return zone;
  }

  function buildZones(){
    makeSingleZone({id:'solo',lb:'單人模式',x:-12,z:-10,c:0x4488ff,ic:'🎯'});
    makeSingleZone({id:'boss',lb:'Boss 挑戰',x:0,z:-10,c:0xff6644,ic:'👹'});
    makeSingleZone({id:'range',lb:'射擊訓練',x:12,z:-10,c:0x44ff44,ic:'🎯'});
    makePairedZone({id:'multi2',lb:'多人',x:-12,z:-2,c:0xff4444,ic:'👥'},2);
    makePairedZone({id:'multi4',lb:'多人',x:0,z:-2,c:0xff6644,ic:'👥'},4);
    makePairedZone({id:'ufo2',lb:'UFO',x:12,z:-2,c:0xaa44ff,ic:'🛸'},2);
    makePairedZone({id:'bomb2',lb:'轟炸',x:-12,z:6,c:0xff8800,ic:'💣'},2);
    makePairedZone({id:'bomb4',lb:'轟炸',x:0,z:6,c:0xffaa22,ic:'💣'},4);
    makePairedZone({id:'ufo4',lb:'UFO',x:12,z:6,c:0xbb66ff,ic:'🛸'},4);
    _allZones.forEach(function(z){z.spots.forEach(function(s){_allSpots.push(s);});});
  }

  // ============ PLAYER ============

  function makePlayer(){
    var g=new T.Group();
    var col=0x4488ff;
    try{col=window.playerColors&&playerColors[window.playerClass]||0x4488ff}catch(e){}
    var bm=function(c){return new T.MeshStandardMaterial({color:c||col,roughness:0.5,metalness:0.3})};

    var body=new T.Mesh(new T.BoxGeometry(0.7,0.6,0.4),bm());body.position.y=0.8;body.castShadow=true;g.add(body);
    var head=new T.Mesh(new T.BoxGeometry(0.35,0.35,0.35),bm());head.position.y=1.25;head.castShadow=true;g.add(head);
    var v=new T.Mesh(new T.BoxGeometry(0.25,0.08,0.06),new T.MeshStandardMaterial({color:0x66ccff,emissive:0x4488ff,emissiveIntensity:0.5}));
    v.position.set(0,1.27,0.2);g.add(v);
    var am=new T.Mesh(new T.BoxGeometry(0.15,0.5,0.15),bm());
    var al=am.clone();al.position.set(-0.45,0.85,0);al.castShadow=true;g.add(al);
    var ar=am.clone();ar.position.set(0.45,0.85,0);ar.castShadow=true;g.add(ar);
    var lm=new T.Mesh(new T.BoxGeometry(0.2,0.5,0.2),new T.MeshStandardMaterial({color:0x222244,roughness:0.7}));
    var ll=lm.clone();ll.position.set(-0.2,0.35,0);ll.castShadow=true;g.add(ll);
    var lr=lm.clone();lr.position.set(0.2,0.35,0);lr.castShadow=true;g.add(lr);
    var gg=new T.Group();
    var gb=new T.Mesh(new T.BoxGeometry(0.05,0.05,0.3),new T.MeshStandardMaterial({color:0x666666,metalness:0.9,roughness:0.2}));
    gb.position.set(0,0,0.18);gg.add(gb);
    var gh=new T.Mesh(new T.BoxGeometry(0.04,0.08,0.04),new T.MeshStandardMaterial({color:0x555555}));
    gh.position.set(0,-0.06,0.05);gg.add(gh);
    gg.position.set(0.15,0.75,0.2);g.add(gg);

    g.position.copy(_pos);_scn.add(g);
    var pGlow=new T.Mesh(new T.SphereGeometry(0.6,12,12),new T.MeshBasicMaterial({color:0x4488ff,transparent:true,opacity:0.06}));
    pGlow.position.y=0.8;g.add(pGlow);

    _pts={g:g,body:body,head:head,al:al,ar:ar,ll:ll,lr:lr,v:v,gun:gg,glow:pGlow};
    return g;
  }

  // ============ REMOTE PLAYER ============

  function makeRemotePlayer(col, name){
    // All meshes added directly to an array — caller adds to scene
    var parts=[];
    var bm=function(c){return new T.MeshStandardMaterial({color:c||col,roughness:0.5,metalness:0.3})};
    var body=new T.Mesh(new T.BoxGeometry(0.7,0.6,0.4),bm());body.position.set(0,0.8,0);body.castShadow=true;parts.push(body);
    var head=new T.Mesh(new T.BoxGeometry(0.35,0.35,0.35),bm());head.position.set(0,1.25,0);head.castShadow=true;parts.push(head);
    var v=new T.Mesh(new T.BoxGeometry(0.25,0.08,0.06),new T.MeshBasicMaterial({color:0x66ccff}));v.position.set(0,1.27,0.2);parts.push(v);
    var am=new T.Mesh(new T.BoxGeometry(0.15,0.5,0.15),bm());
    var al=am.clone();al.position.set(-0.45,0.85,0);al.castShadow=true;parts.push(al);
    var ar=am.clone();ar.position.set(0.45,0.85,0);ar.castShadow=true;parts.push(ar);
    var lMat=new T.MeshBasicMaterial({color:0x222244});
    var ll=new T.Mesh(new T.BoxGeometry(0.2,0.5,0.2),lMat);ll.position.set(-0.2,0.35,0);parts.push(ll);
    var lr=new T.Mesh(new T.BoxGeometry(0.2,0.5,0.2),lMat);lr.position.set(0.2,0.35,0);parts.push(lr);
    var gMat=new T.MeshStandardMaterial({color:0x666666,metalness:0.9,roughness:0.2});
    var gb=new T.Mesh(new T.BoxGeometry(0.05,0.05,0.3),gMat);gb.position.set(0.15,0.75,0.38);parts.push(gb);
    var gh=new T.Mesh(new T.BoxGeometry(0.04,0.08,0.04),new T.MeshBasicMaterial({color:0x555555}));gh.position.set(0.15,0.69,0.25);parts.push(gh);
    var pGlow=new T.Mesh(new T.SphereGeometry(0.6,12,12),new T.MeshBasicMaterial({color:col||0x4488ff,transparent:true,opacity:0.06}));pGlow.position.set(0,0.8,0);parts.push(pGlow);
    return parts;
  }

  // ============ UPDATE ============

  function upd(dt){
    if(!_active) return;
    _animT+=dt;

    var mx=0,mz=0;
    if(_k['KeyW']||_k['ArrowUp'])mz-=1;
    if(_k['KeyS']||_k['ArrowDown'])mz+=1;
    if(_k['KeyA']||_k['ArrowLeft'])mx-=1;
    if(_k['KeyD']||_k['ArrowRight'])mx+=1;
    _isWalk=mx!==0||mz!==0;

    if(_isWalk){
      var f=new T.Vector3(-Math.sin(_th),0,-Math.cos(_th));
      var ri=new T.Vector3(Math.cos(_th),0,-Math.sin(_th));
      var mv=new T.Vector3().addScaledVector(f,-mz).addScaledVector(ri,mx);
      if(mv.length()>1)mv.normalize();
      mv.multiplyScalar(_spd*dt);
      _pos.x=Math.max(_B.minX,Math.min(_B.maxX,_pos.x+mv.x));
      _pos.z=Math.max(_B.minZ,Math.min(_B.maxZ,_pos.z+mv.z));
      _rot=Math.atan2(mv.x,mv.z);
    }
    if(_pts.g){_pts.g.position.copy(_pos);_pts.g.rotation.y=_rot;}

    // Animations
    var ss=8,sa=_isWalk?Math.sin(_animT*ss)*0.5:0;
    if(_pts.al){_pts.al.rotation.x=_isWalk?sa:0;_pts.ar.rotation.x=_isWalk?-sa:0;}
    if(_pts.ll){_pts.ll.rotation.x=_isWalk?-sa:0;_pts.lr.rotation.x=_isWalk?sa:0;}
    if(_pts.body){_pts.body.position.y=0.8+(_isWalk?Math.abs(Math.sin(_animT*ss*2))*0.025:Math.sin(_animT*2)*0.006);}
    if(_pts.v){_pts.v.material.emissiveIntensity=0.3+0.2*Math.sin(_animT*1.5);}
    if(_pts.glow){_pts.glow.material.opacity=0.04+0.03*Math.sin(_animT*1.2);}

    // Rainbow lights animation
    _rainbowLights.forEach(function(rl,i){
      var pulse=0.8+0.4*Math.sin(_animT*0.6+rl.phase);
      rl.light.intensity=pulse;
    });

    // Camera
    var tx=_pos.x,tz=_pos.z,ty=0.8;
    var cx=tx+Math.sin(_th)*Math.cos(_ph)*_dist;
    var cy=ty+Math.sin(_ph)*_dist;
    var cz=tz+Math.cos(_th)*Math.cos(_ph)*_dist;
    _cam.position.lerp(new T.Vector3(cx,cy,cz),0.06);
    _cam.lookAt(tx,ty,tz);

    // ---- Zone/Pedestal Logic ----
    var near=null,nearD=Infinity;
    _allSpots.forEach(function(p){
      var dx=_pos.x-p.mesh.position.x,dz=_pos.z-p.mesh.position.z;
      var d2=Math.sqrt(dx*dx+dz*dz);
      if(d2<1.8&&d2<nearD){near=p;nearD=d2;}
    });

    if(near){
      var zone=near.zone;
      if(_activeZone!==zone){
        if(_activeZone){_activeZone.spots.forEach(function(s){s.occupied=false;s.grm.opacity=0.2;});}
        _activeZone=zone;
        _platT=0;_occupyTimer=0;
        zone.spots.forEach(function(s){s.occupied=false;s.grm.opacity=0.2;});
      }
      near.occupied=true;
      _occupyTimer+=dt;
      var occCount=zone.spots.filter(function(s){return s.occupied;}).length;
      var total=zone.spots.length;
      var allOccupied=occCount>=total;

      var readyEl=document.getElementById('lobby-ready');
      var readyCount=document.getElementById('lobby-ready-count');
      var readyLbl=document.getElementById('lobby-ready-lbl');
      readyEl.style.display='flex';
      if(zone.single){
        readyCount.textContent='●';
        readyLbl.textContent=zone.ic+' '+zone.label;
      }else{
        readyCount.textContent=occCount+'/'+total;
        readyLbl.textContent=allOccupied?'✓ 全員就位 — 傳送中':'等 待 玩 家 — '+zone.ic+' '+zone.label;
      }
      zone.spots.forEach(function(s){
        var targetOp=s.occupied?0.5:0.2;
        s.grm.opacity+=((s===near?0.6:targetOp)-s.grm.opacity)*0.08;
        if(s.pl)s.pl.intensity=s.occupied?0.5:0.2;
      });

      if(zone.single){
        _platT+=dt;
        readyCount.textContent=Math.floor(Math.min(1,_platT/1.5)*100)+'%';
        if(_platT>=1.5&&!zone.ready){
          zone.ready=true;
          var msgEl=document.getElementById('lobby-msg');
          msgEl.innerHTML='傳 送 中<sub>'+zone.ic+' '+zone.label+'</sub>';
          msgEl.style.display='block';
          setTimeout(function(){
            msgEl.style.display='none';zone.ready=false;_platT=0;
            zone.spots.forEach(function(s){s.occupied=false;s.grm.opacity=0.2;});
            readyEl.style.display='none';_activeZone=null;
            trigZone(zone);
          },1800);
        }
      }else if(allOccupied&&!zone.ready){
        if(_occupyTimer>0.8+dt){
          zone.ready=true;
          var msgEl2=document.getElementById('lobby-msg');
          msgEl2.innerHTML='傳 送 中<sub>'+zone.ic+' '+zone.label+'</sub>';
          msgEl2.style.display='block';
          setTimeout(function(){
            msgEl2.style.display='none';zone.ready=false;_platT=0;_occupyTimer=0;
            zone.spots.forEach(function(s){s.occupied=false;s.grm.opacity=0.2;});
            readyEl.style.display='none';_activeZone=null;
            trigZone(zone);
          },1800);
        }
      }
    }else{
      if(_activeZone){
        _activeZone.spots.forEach(function(s){s.occupied=false;s.grm.opacity=0.2;if(s.pl)s.pl.intensity=0.2;});
        _activeZone=null;_platT=0;_occupyTimer=0;
        document.getElementById('lobby-ready').style.display='none';
        var notifEl=document.getElementById('lobby-notif');
        notifEl.textContent='🔴 離開';notifEl.classList.add('show');_notifT=0;
      }
    }
    _notifT+=dt;
    var notifEl2=document.getElementById('lobby-notif');
    if(_notifT>2.5)notifEl2.classList.remove('show');

    // Pedestal visual effects
    _allSpots.forEach(function(p){
      if(p.gr)p.gr.rotation.z+=dt*0.6;
      if(p.pc)p.pc.rotation.y+=dt*0.4;
      if(p.pc)p.pc.material.opacity=p.occupied?0.06:0.03;
    });

    var statEl=document.getElementById('lobby-stat');
    statEl.innerHTML='XYZ: '+_pos.x.toFixed(1)+', 0, '+_pos.z.toFixed(1)+' | '+( _ws&&_ws.readyState===1 ? '🟢 '+Object.keys(_remotePlayers).length+'人' : (_ws?'🟡 連線中':'🔴 離線') )+' | SCN:'+(_scn?_scn.children.length:'?');

    // Multiplayer position broadcast
    if(_ws&&_ws.readyState===1){
      _posSendThrottle+=dt;
      if(_posSendThrottle>0.05){
        var px=_pos.x,pz=_pos.z,pr=_rot;
        if(Math.abs(px-_lastSentPos.x)>0.05||Math.abs(pz-_lastSentPos.z)>0.05||Math.abs(pr-_lastSentPos.rot)>0.02){
          _lastSentPos.x=px;_lastSentPos.z=pz;_lastSentPos.rot=pr;_posSendThrottle=0;
          try{_ws.send(JSON.stringify({type:'lobby_pos',x:px,z:pz,rot:pr}));}catch(e){}
        }
      }
    }
    // Interpolate remote player meshes (each part directly on scene, no Group)
    Object.keys(_remotePlayers).forEach(function(cid){
      var rp=_remotePlayers[cid];
      if(rp.parts&&rp.parts.length){
        var ref=rp.parts[0];
        var dx=(rp.pos.x-ref.position.x)*0.15;
        var dz=(rp.pos.z-ref.position.z)*0.15;
        var drot=(rp.rot-ref.rotation.y)*0.15;
        rp.parts.forEach(function(p){
          p.position.x+=dx; p.position.z+=dz;
          p.rotation.y+=drot;
        });
      }
    });
  }

  function trigZone(zone){
    var id=zone.id;
    if(id==='solo'&&_cbs.solo)_cbs.solo();
    else if(id==='range'&&_cbs.range)_cbs.range();
    else if(id==='boss'&&_cbs.boss)_cbs.boss();
    else if(id==='multi2'&&_cbs.multi)_cbs.multi(2);
    else if(id==='multi4'&&_cbs.multi)_cbs.multi(4);
    else if(id==='bomb2'&&_cbs.bomb)_cbs.bomb(2);
    else if(id==='bomb4'&&_cbs.bomb)_cbs.bomb(4);
    else if(id==='ufo2'&&_cbs.ufo)_cbs.ufo(2);
    else if(id==='ufo4'&&_cbs.ufo)_cbs.ufo(4);
  }

  // ============ LOBBY MULTIPLAYER ============

  function addRemotePlayer(data){
    if(!data.clientId||_remotePlayers[data.clientId]) return;
    console.log('[Lobby] addRP',data.clientId,'serverPos',data.x,data.z);
    try {
      var col=data.color||0x4488ff;
      var parts=makeRemotePlayer(col,data.name);
      if(!parts||!parts.length){console.log('[Lobby] addRP parts empty!');return;}
      var sx=data.x||_pos.x;
      var sz=data.z||_pos.z;
      // Add each mesh directly to scene (NO Group) with world positions
      parts.forEach(function(p){
        p.position.x+=sx;
        p.position.z+=sz;
        p.frustumCulled=false;
        _scn.add(p);
      });
      // Keep arrow for now to confirm position
      var arrow=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(sx,1,sz),2,0xff0000);
      _scn.add(arrow);
      _remotePlayers[data.clientId]={parts:parts,arrow:arrow,pos:{x:sx,z:sz,rot:data.rot||0}};
      console.log('[Lobby] addRP parts:',parts.length,'firstPart pos:',parts[0].position.x.toFixed(2),parts[0].position.y.toFixed(2),parts[0].position.z.toFixed(2));
      console.log('[Lobby] addRP done scn='+_scn.children.length+' rPlayers='+Object.keys(_remotePlayers).length);
    } catch(e) {
      console.log('[Lobby] addRP error:',e.message,'stack:',e.stack);
    }
  }
  }

  function removeRemotePlayer(cid){
    var rp=_remotePlayers[cid];
    if(rp){
      if(rp.parts)rp.parts.forEach(function(p){if(_scn)_scn.remove(p);});
      if(rp.arrow&&_scn)_scn.remove(rp.arrow);
      delete _remotePlayers[cid];
    }
  }

  var _reconnectTimer=null;
  var _stateTimer=null;
  var _stateReceived=false;
  function _connectLobby(){
    if(_ws)return;
    var ip='localhost';
    var ipEl=document.getElementById('server-ip');
    if(ipEl)ip=ipEl.value.trim()||'localhost';
    _lobbyName=localStorage.getItem('oc_display_name')||localStorage.getItem('oc_nickname')||'Player';
    _localClientId='sess_'+Math.random().toString(36).slice(2,12);
    var _cid=_localClientId;
    _stateReceived=false;
    try{
      var url;
      if(!ip||ip==='localhost'||ip==='127.0.0.1'||ip===location.hostname||ip===location.host){
        url=(location.protocol==='https:'?'wss:':'ws:')+'//'+location.hostname+(location.port&&location.port!=='80'&&location.port!=='443'?':'+location.port:'');
      }else{
        url='ws://'+ip+':3000';
      }
      _ws=new WebSocket(url+'/lobby');
    }catch(e){console.log('[Lobby] WS create error:',e);_ws=null;if(_active)_scheduleReconnect();return;}
    console.log('[Lobby] Connecting to',url);
    _ws.onopen=function(){
      console.log('[Lobby] WS open, sending lobby_join name='+_lobbyName);
      if(_reconnectTimer){clearTimeout(_reconnectTimer);_reconnectTimer=null;}
      try{_ws.send(JSON.stringify({type:'lobby_join',name:_lobbyName,clientId:_cid}));}catch(e){console.log('[Lobby] send error:',e);}
      // If lobby_state not received in 2s, request it again
      if(_stateTimer)clearTimeout(_stateTimer);
      _stateTimer=setTimeout(function(){
        _stateTimer=null;
        if(!_stateReceived&&_ws&&_ws.readyState===1){
          console.log('[Lobby] lobby_state not received, requesting...');
          try{_ws.send(JSON.stringify({type:'lobby_state_req'}));}catch(e){}
        }
      },2000);
    };
    _ws.onmessage=function(e){
      var msg;try{msg=JSON.parse(e.data);}catch(ex){return;}
      console.log('[Lobby] recv:',msg.type,msg);
      try{
        switch(msg.type){
          case 'lobby_state':_stateReceived=true;if(_stateTimer){clearTimeout(_stateTimer);_stateTimer=null;}console.log('[Lobby] state players:',JSON.stringify(msg.players.map(function(p){return p.clientId;})),'_localClientId=',_localClientId);msg.players.forEach(function(p){console.log('[Lobby] check p.clientId=',p.clientId,' !== ',_localClientId,'=',p.clientId!==_localClientId);if(p.clientId!==_localClientId)addRemotePlayer(p);});if(msg.players.length===0)console.log('[Lobby] state empty!');break;
          case 'lobby_player_join':if(msg.clientId!==_localClientId)addRemotePlayer(msg);break;
          case 'lobby_player_pos':if(_remotePlayers[msg.clientId]){_remotePlayers[msg.clientId].pos.x=msg.x;_remotePlayers[msg.clientId].pos.z=msg.z;_remotePlayers[msg.clientId].rot=msg.rot;}else{console.log('[Lobby] pos for unknown cid='+msg.clientId);}break;
          case 'lobby_player_leave':removeRemotePlayer(msg.clientId);break;
        }
      }catch(ex){console.log('[Lobby] onmessage error:',ex);}
    };
    _ws.onclose=function(e){
      console.log('[Lobby] WS close code='+(e?e.code:'?')+' reason='+(e?e.reason:'?'));
      if(_stateTimer){clearTimeout(_stateTimer);_stateTimer=null;}
      Object.keys(_remotePlayers).forEach(function(cid){removeRemotePlayer(cid);});
      _ws=null;
      if(_active)_scheduleReconnect();
    };
    _ws.onerror=function(e){console.log('[Lobby] WS error',e);};
  }
  function _scheduleReconnect(){
    if(_reconnectTimer)return;
    console.log('[Lobby] scheduling reconnect in 3s');
    _reconnectTimer=setTimeout(function(){_reconnectTimer=null;if(_active)_connectLobby();},3000);
  }

  function _disconnectLobby(){
    if(_ws){
      try{_ws.send(JSON.stringify({type:'lobby_leave'}));}catch(e){}
      try{_ws.close();}catch(e){}
      _ws=null;
    }
    Object.keys(_remotePlayers).forEach(function(cid){removeRemotePlayer(cid);});
    _lastSentPos={x:0,z:0,rot:0};_posSendThrottle=0;
  }

  // ============ PUBLIC API ============

  var _inited=false;
  return {
    init: function(ren,cbs){
      if(_inited){console.log('[Lobby] init skipped (already inited)');return;}
      _inited=true;
      console.log('[Lobby] init called');
      T=window.THREE; _ren=ren; _cbs=cbs||{};
      _clock=new T.Clock(); _pos=new T.Vector3(0,0,0);
      _scn=new T.Scene(); _scn.background=new T.Color(0x0a0a18); _scn.fog=new T.Fog(0x0a0a18,35,55);
      _cam=new T.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.1,100);
      _cam.position.set(0,12,18);
      _scn.add(new T.AmbientLight(0x8899bb,1.0));
      var d1=new T.DirectionalLight(0xffeecc,1.8);d1.position.set(15,25,10);d1.castShadow=true;_scn.add(d1);
      var dl2=new T.DirectionalLight(0x88ccff,0.8);dl2.position.set(-12,20,-10);_scn.add(dl2);
      _scn.add(new T.HemisphereLight(0x88aaff,0x443366,0.9));
      makeRainbowLights();
      makeRainbowFloor();
      makeCrackWalls();
      makeEnhancedPillars();
      _ply=makePlayer();
      buildZones();

      // UI overlay navigation
      var pnlNames={armory:'🔫 武器庫',event:'🎏 活動',season:'☢ 賽季',rank:'🏆 排位',shop:'🏪 軍火交易所',skin:'🎨 槍械',charskin:'👤 角色',prof:'⭐ 熟練度',daily:'📅 每日登入',pet:'🐾 寵物商店',skill:'🔮 技能',range:'🎯 射擊訓練',ach:'🏅 成就',leaderboard:'📊 排行榜'};
      document.querySelectorAll('#lobby-ui .lobby-nav-btn,#lobby-ui .lobby-bgrid-btn').forEach(function(btn){
        btn.addEventListener('click',function(){
          var p=this.dataset.panel;if(!p)return;
          document.getElementById('lobby-ov-title').textContent=pnlNames[p]||p;
          document.getElementById('lobby-ov-desc').textContent='此為 Lobby 展示預覽\n實際功能待整合';
          document.getElementById('lobby-overlay').style.display='flex';
        });
      });
      document.getElementById('lobby-ov-close').addEventListener('click',function(){document.getElementById('lobby-overlay').style.display='none';});
      document.getElementById('lobby-overlay').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
    },
    activate: function(){
      _active=true; _pos.set(0,0,-20);
      if(_pts.g) _pts.g.position.copy(_pos);
      _th=Math.PI;_ph=0.5;_dist=12;_animT=0;_activeZone=null;_platT=0;_occupyTimer=0;
      document.getElementById('lobby-ui').style.display='block';
      document.getElementById('menu').style.display='none';
      _connectLobby();
    },
    deactivate: function(){
      _active=false;
      document.getElementById('lobby-ui').style.display='none';
      _disconnectLobby();
    },
    update:function(dt){upd(dt);},
    render:function(){if(_active&&_ren&&_scn&&_cam)_ren.render(_scn,_cam);},
    isActive:function(){return _active;},
    key:function(c,d){_k[c]=d;},
    mdown:function(e){_md=true;_lmx=e.clientX;_lmy=e.clientY;},
    mup:function(){_md=false;},
    mmove:function(e){if(!_md)return;var dx=e.clientX-_lmx,dy=e.clientY-_lmy;_lmx=e.clientX;_lmy=e.clientY;
      _th-=dx*0.004;_ph=Math.max(0.15,Math.min(1.3,_ph+dy*0.004));},
    wheel:function(e){e.preventDefault();_dist=Math.max(4,Math.min(20,_dist+e.deltaY*0.01));},
    resize:function(){if(_cam){_cam.aspect=window.innerWidth/window.innerHeight;_cam.updateProjectionMatrix();}},
    cleanup:function(){
      if(_scn){while(_scn.children.length>0)_scn.remove(_scn.children[0]);}
      _pts={};_allSpots=[];_allZones=[];_ply=null;_rainbowLights=[];
    }
  };
})();
