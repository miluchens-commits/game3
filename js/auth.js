var authToken=localStorage.getItem('oc_token'),authUser=localStorage.getItem('oc_user')||'',currentTeamId=null;
var API_BASE='';
// ── 多人連線伺服器位址解析（全域，bootGame 與摸金模組共用）──
// OC_SERVER_DEFAULT：線上（非本機）要連哪台伺服器，例：'https://game4-server.onrender.com'
//   留空=沿用目前頁面網址（本機開發）。itch 是 HTTPS 頁面且沒有後端，必須設這值指向公開伺服器。
window.OC_SERVER_DEFAULT=window.OC_SERVER_DEFAULT||'';
function ocResolveIP(ip){
  ip=(ip||'').trim();
  if(!ip)ip=(window.OC_SERVER_DEFAULT||'').trim();
  return ip;
}
function ocMultiWSURL(ip){
  ip=ocResolveIP(ip);
  if(ip&&ip.indexOf('://')!==-1){
    var scheme=/^https:/i.test(ip)?'wss:':(/^http:/i.test(ip)?'ws:':(/^wss:/i.test(ip)?'wss:':'ws:'));
    var rest=ip.replace(/^[a-z0-9]+:\/\//i,'').replace(/\/+$/,'');
    var sp=rest.indexOf('/');
    var host=sp===-1?rest:rest.slice(0,sp);
    var pth=sp===-1?'':rest.slice(sp+1);
    if(!pth||pth==='/'||!/game$/i.test(pth))pth='game';
    return scheme+'//'+host+'/'+pth;
  }
  if(!ip||ip==='localhost'||ip==='127.0.0.1'||ip===location.hostname||ip===location.host){
    if(location.protocol==='https:'){
      return 'wss://'+(location.hostname||'localhost')+(location.port&&location.port!=='443'?':'+location.port:'')+'/game';
    }
    return 'ws://'+(location.hostname||'localhost')+(location.port&&location.port!=='80'?':'+location.port:':3000')+'/game';
  }
  if(location.protocol==='https:')return 'wss://'+ip+'/game';
  return 'ws://'+ip+':3000/game';
}
function ocHttpBase(ip){
  ip=ocResolveIP(ip);
  if(ip&&ip.indexOf('://')!==-1){
    return ip.replace(/^wss:/i,'https:').replace(/^ws:/i,'http:').replace(/\/game\/?$/i,'').replace(/\/+$/,'');
  }
  if(!ip||ip==='localhost'||ip==='127.0.0.1'||ip===location.hostname||ip===location.host){
    if(location.protocol==='https:')return location.origin;
    return 'http://'+(location.hostname||'localhost')+':3000';
  }
  if(location.protocol==='https:')return 'https://'+ip;
  return 'http://'+ip+':3000';
}
function authFetch(url,opts){
  opts=opts||{};opts.headers=opts.headers||{};
  if(authToken)opts.headers['Authorization']='Bearer '+authToken;
  if(opts.body&&typeof opts.body==='object'){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(opts.body);}
  return fetch(API_BASE+url,opts).then(function(r){
    // 沒有後端時（例如用 python3 -m http.server 開的純靜態伺服器），
    // /api/* 會回 404 加上 HTML，直接 r.json() 會丟出
    // "Unexpected token '<'" 的未捕捉 promise 錯誤。這裡改成回傳錯誤物件，
    // 讓呼叫端自己的 d.error 分支去顯示訊息。
    var ct=r.headers.get('content-type')||'';
    if(ct.indexOf('json')<0)return {error:'API 未連線（HTTP '+r.status+'），請用 node server.js 啟動後端',__status:r.status};
    return r.json().catch(function(){return {error:'回應格式錯誤'};})
      .then(function(j){j.__status=r.status;return j;});
  }).catch(function(){
    return {error:'無法連線到伺服器',__status:0};
  });
}
function doAuth(action){
  var u=document.getElementById('auth-user').value.trim(),p=document.getElementById('auth-pass').value.trim();
  var err=document.getElementById('auth-err');
  if(!u||!p){err.textContent='請填寫帳號密碼';return;}
  err.textContent='處理中...';
  authFetch('/api/'+action,{method:'POST',body:{username:u,password:p}}).then(function(d){
    if(d.error){err.textContent=d.error;return;}
    authToken=d.token;authUser=d.username;
    localStorage.setItem('oc_token',d.token);localStorage.setItem('oc_user',d.username);
    document.getElementById('login-overlay').style.display='none';
    showLoginSuccess();
    if(d.xp!=null)localStorage.setItem('oc_level',String(d.xp));
    if(d.nickname){localStorage.setItem('oc_nickname',d.nickname);updateAvatarDisplay();}
      if(d.needsName)handleNeedsName();else showModeSelect();
  }).catch(function(){document.getElementById('auth-err').textContent='無法連線到伺服器';});
  }
  function showModeSelect(){
    // 已經選過操作模式就不要再問，直接套用並往下走（記住玩家的選擇）
    if(localStorage.getItem('oc_ui_mode')){applyUiMode();maybeAskName();return;}
    var ms=document.getElementById('mode-select');if(ms)ms.style.display='flex';
  }  function showLoginSuccess(){var el=document.createElement('div');el.textContent='登入成功';el.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);color:#4f4;font-size:20px;font-weight:bold;z-index:100;font-family:Arial;text-shadow:0 0 15px rgba(68,255,68,.5);letter-spacing:4px;pointer-events:none;transition:opacity .5s';document.body.appendChild(el);setTimeout(function(){el.style.opacity='0';},1500);setTimeout(function(){el.remove();},2000);}
  function maybeAskName(){if(!localStorage.getItem('oc_nickname'))showNamePrompt();}
  document.getElementById('mode-pc-btn').onclick=function(){localStorage.setItem('oc_ui_mode','pc');document.body.classList.remove('mobile-mode');document.getElementById('mode-select').style.display='none';maybeAskName();};
  document.getElementById('mode-mobile-btn').onclick=function(){
    var warn=document.getElementById('mode-mobile-warn');
    if(warn){
      var isPhone=window.innerWidth<600;
      warn.style.display='block';
      warn.innerHTML=isPhone
        ? '<span style="color:#f66;font-size:14px">⚠ 手機不支援！</span><br>請使用平板或大螢幕裝置<br><span style="color:rgba(255,255,255,.45);font-size:11px">當前畫面過小，平板模式無法正常運作</span>'
        : '⚠ 注意事項：<br>平板模式僅支援平板／大螢幕裝置<br><span style="color:#f66">手機（小螢幕）不支援，將無法正常遊玩</span>';
      if(isPhone)return;
      var btn=this;btn.disabled=true;btn.style.opacity='0.5';
      setTimeout(function(){if(document.getElementById('mode-select').style.display==='none')return;localStorage.setItem('oc_ui_mode','mobile');document.body.classList.add('mobile-mode');document.getElementById('mode-select').style.display='none';document.getElementById('mobile-controls').style.display='block';btn.disabled=false;btn.style.opacity='1';maybeAskName();},2500);
      return;
    }
    localStorage.setItem('oc_ui_mode','mobile');document.body.classList.add('mobile-mode');document.getElementById('mode-select').style.display='none';document.getElementById('mobile-controls').style.display='block';maybeAskName();
  };
  document.getElementById('mode-skip-btn').onclick=function(){document.getElementById('mode-select').style.display='none';maybeAskName();};
  function handleGoogleCredential(r){
   if(!r.credential)return;
    authFetch('/api/auth/google',{method:'POST',body:{credential:r.credential}}).then(function(d){
      if(d.error){document.getElementById('auth-err').textContent=d.error;return;}
      authToken=d.token;authUser=d.username;
      localStorage.setItem('oc_token',d.token);localStorage.setItem('oc_user',d.username);
      document.getElementById('login-overlay').style.display='none';
      showLoginSuccess();
      if(d.xp!=null)localStorage.setItem('oc_level',String(d.xp));
      if(d.nickname){localStorage.setItem('oc_nickname',d.nickname);updateAvatarDisplay();}
    if(d.needsName)handleNeedsName();else showModeSelect();
    }).catch(function(){document.getElementById('auth-err').textContent='無法連線到伺服器';});
  }
  function updateAvatarDisplay(){
  var el=document.getElementById('level-enemy'),nm=document.getElementById('level-nickname'),lb=document.getElementById('logout-btn');
  var nick=localStorage.getItem('oc_nickname');
  if(nick&&nm){if(el)el.style.display='none';nm.textContent=nick;nm.style.display='block';if(lb)lb.style.display='block';}
  else{if(nm)nm.style.display='none';if(el)el.style.display='flex';if(lb)lb.style.display='none';}
}
function doLogout(){
  localStorage.removeItem('oc_nickname');
  updateAvatarDisplay();
  location.reload();
}
function showNamePrompt(){document.getElementById('name-prompt').style.display='flex';document.getElementById('name-input').value='';document.getElementById('name-err').textContent='';}
function hideNamePrompt(){document.getElementById('name-prompt').style.display='none';}
// 把名字送到伺服器存起來（只存瀏覽器的話，下次刷新伺服器還是認為沒名字）
function pushNickname(nm){
  if(!authToken||!nm)return Promise.resolve({ok:true});
  return authFetch('/api/setname',{method:'POST',body:{nickname:nm}}).then(function(d){
    // 409=重名 / 400=不合法 → 只有這種狀況才需要重新問名字
    if(d&&(d.__status===409||d.__status===400))showNamePrompt();
    return d;
  });
}
// 伺服器說「這個帳號還沒設定名字」：本來設過就直接補送，不要再問一次
function handleNeedsName(){
  var saved=localStorage.getItem('oc_nickname');
  if(saved){pushNickname(saved);updateAvatarDisplay();return;}
  showNamePrompt();
}
function doSetName(){
  var nm=document.getElementById('name-input').value.trim(),err=document.getElementById('name-err');
  if(!nm||nm.length<1||nm.length>12){err.textContent='名稱長度需為1-12字';return;}
  localStorage.setItem('oc_nickname',nm);
  updateAvatarDisplay();
  var done=function(){
    hideNamePrompt();
    var t=document.createElement('div');t.textContent='歡迎，'+nm+'！';t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);color:#4f4;font-size:20px;font-weight:bold;z-index:100;font-family:Arial;text-shadow:0 0 15px rgba(68,255,68,.5);letter-spacing:4px;pointer-events:none;transition:opacity .5s';document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';},1500);setTimeout(function(){t.remove();},2000);
  };
  if(!authToken){done();return;}
  // 一定要寫進伺服器，不然刷新頁面又要重問一次
  authFetch('/api/setname',{method:'POST',body:{nickname:nm}}).then(function(d){
    if(d&&d.error&&(d.__status===409||d.__status===400)){
      err.textContent=d.error;
      document.getElementById('name-input').value=nm;
      return;
    }
    done();
  });
}
function switchFriendTab(view){
  document.querySelectorAll('#friend-tabs .f-tab').forEach(function(x){x.classList.remove('active');});
  var tab=document.querySelector('#friend-tabs .f-tab[data-view="'+view+'"]');
  if(tab)tab.classList.add('active');
  document.getElementById('friend-search-bar').style.display='none';
}
function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function disposeMesh(m){if(!m)return;var ud=m.userData||{};if(m.geometry&&!ud.sharedGeo)m.geometry.dispose();if(m.material){var _mats=Array.isArray(m.material)?m.material:[m.material];_mats.forEach(function(mt){if(mt&&!ud.sharedMat)mt.dispose();});}if(m.children)m.children.forEach(function(c){disposeMesh(c);});try{m.parent&&m.parent.remove(m)}catch(e){}}
function fetchFriendList(){
  var list=document.getElementById('friend-list');
  list.innerHTML='<div class="f-empty">載入中...</div>';
  authFetch('/api/friends/list').then(function(d){
    if(d.error){list.innerHTML='<div class="f-empty">'+escH(d.error)+'</div>';return;}
    if(!d.friends||!d.friends.length){list.innerHTML='<div class="f-empty">暫無好友</div>';return;}
    list.innerHTML='';
    d.friends.forEach(function(f){
      var item=document.createElement('div');item.className='f-item';
      var isOnline=f.online?'🟢':'⚫';
      var nameSpan=document.createElement('span');nameSpan.className='f-name';nameSpan.textContent=isOnline+' '+f.nickname;
      var btnDiv=document.createElement('div');
      if(f.online){
        var tBtn=document.createElement('button');tBtn.className='f-btn f-add-btn f-team-btn';tBtn.style.marginRight='4px';tBtn.setAttribute('data-user',f.username);tBtn.setAttribute('data-nick',f.nickname);tBtn.textContent='組隊';btnDiv.appendChild(tBtn);
      }else{
        var offSpan=document.createElement('span');offSpan.style.cssText='color:rgba(255,255,255,.15);font-size:11px;margin-right:4px';offSpan.textContent='離線';btnDiv.appendChild(offSpan);
      }
      var cBtn=document.createElement('button');cBtn.className='f-btn f-add-btn f-chat-btn';cBtn.style.marginRight='4px';cBtn.setAttribute('data-user',f.username);cBtn.setAttribute('data-nick',f.nickname);cBtn.textContent='💬';btnDiv.appendChild(cBtn);
      var rBtn=document.createElement('button');rBtn.className='f-btn f-remove-btn';rBtn.style.marginRight='4px';rBtn.setAttribute('data-user',f.username);rBtn.textContent='移除';btnDiv.appendChild(rBtn);
      var bBtn=document.createElement('button');bBtn.className='f-btn f-reject-btn';bBtn.setAttribute('data-user',f.username);bBtn.textContent='封鎖';btnDiv.appendChild(bBtn);
      item.appendChild(nameSpan);item.appendChild(btnDiv);
      list.appendChild(item);
    });
    list.querySelectorAll('.f-chat-btn').forEach(function(el){
      el.onclick=function(){openChat(this.dataset.user,this.dataset.nick);};
    });
    list.querySelectorAll('.f-team-btn').forEach(function(el){
      el.onclick=function(){
        var btn=this;
        var friendNick=btn.dataset.nick;
        if(!friendNick)friendNick=btn.dataset.user;
        authFetch('/api/team/invite',{method:'POST',body:{friendUsername:btn.dataset.user}}).then(function(d){
          if(d.error)alert(d.error);
          else{alert('已與 '+d.friendNickname+' 組隊');setTimeout(function(){if(typeof checkTeamStatus==='function')checkTeamStatus();},0);}
        });
      };
    });
    list.querySelectorAll('.f-remove-btn').forEach(function(b){
      b.onclick=function(){
        if(!confirm('確定移除好友？'))return;
        authFetch('/api/friends/remove',{method:'POST',body:{friendUsername:this.dataset.user}}).then(function(d){
          if(!d.error)fetchFriendList();
          else alert(d.error);
        });
      };
    });
    list.querySelectorAll('#friend-list .f-item .f-reject-btn').forEach(function(b){
      b.onclick=function(){
        if(!confirm('確定封鎖此玩家？'))return;
        authFetch('/api/friends/block',{method:'POST',body:{friendUsername:this.dataset.user}}).then(function(d){
          if(!d.error)fetchFriendList();
          else alert(d.error);
        });
      };
    });
  }).catch(function(){list.innerHTML='<div class="f-empty">無法連線</div>';});
}
function fetchFriendRequests(){
  var list=document.getElementById('friend-list');
  list.innerHTML='<div class="f-empty">載入中...</div>';
  authFetch('/api/friends/requests').then(function(d){
    if(d.error){list.innerHTML='<div class="f-empty">'+escH(d.error)+'</div>';return;}
    var total=(d.incoming?d.incoming.length:0)+(d.outgoing?d.outgoing.length:0);
    var badge=document.getElementById('f-req-badge');
    if(total>0){badge.textContent=total;badge.style.display='inline';}else{badge.style.display='none';}
    list.innerHTML='';
    if(d.incoming&&d.incoming.length){
      var hdr=document.createElement('div');hdr.style.cssText='color:#667;font-size:11px;letter-spacing:2px;padding:6px 10px';hdr.textContent='收到的邀請';list.appendChild(hdr);
      d.incoming.forEach(function(f){
        var item=document.createElement('div');item.className='f-item';
        var ns=document.createElement('span');ns.className='f-name';ns.textContent=f.nickname;item.appendChild(ns);
        var g=document.createElement('div');
        var cb=document.createElement('button');cb.className='f-btn f-add-btn f-chat-btn';cb.style.marginRight='4px';cb.setAttribute('data-user',f.username);cb.setAttribute('data-nick',f.nickname);cb.textContent='💬';g.appendChild(cb);
        var ab=document.createElement('button');ab.className='f-btn f-accept-btn';ab.setAttribute('data-user',f.username);ab.textContent='接受';g.appendChild(ab);
        var rb=document.createElement('button');rb.className='f-btn f-reject-btn';rb.setAttribute('data-user',f.username);rb.textContent='拒絕';g.appendChild(rb);
        item.appendChild(g);list.appendChild(item);
      });
    }
    if(d.outgoing&&d.outgoing.length){
      var hdr2=document.createElement('div');hdr2.style.cssText='color:#667;font-size:11px;letter-spacing:2px;padding:6px 10px';hdr2.textContent='已發送的邀請';list.appendChild(hdr2);
      d.outgoing.forEach(function(f){
        var item2=document.createElement('div');item2.className='f-item';
        var ns2=document.createElement('span');ns2.className='f-name';ns2.textContent=f.nickname;item2.appendChild(ns2);
        var st=document.createElement('span');st.className='f-status';st.textContent='等待中';item2.appendChild(st);
        list.appendChild(item2);
      });
    }
    if(!list.childNodes.length)list.innerHTML='<div class="f-empty">暫無請求</div>';
    list.querySelectorAll('.f-chat-btn').forEach(function(el){
      el.onclick=function(){openChat(this.dataset.user,this.dataset.nick);};
    });
    list.querySelectorAll('.f-accept-btn').forEach(function(b){
      b.onclick=function(){
        authFetch('/api/friends/accept',{method:'POST',body:{friendUsername:this.dataset.user}}).then(function(d){if(!d.error)fetchFriendRequests();else alert(d.error);});
      };
    });
    list.querySelectorAll('.f-reject-btn').forEach(function(b){
      b.onclick=function(){
        authFetch('/api/friends/reject',{method:'POST',body:{friendUsername:this.dataset.user}}).then(function(d){if(!d.error)fetchFriendRequests();else alert(d.error);});
      };
    });
  }).catch(function(){list.innerHTML='<div class="f-empty">無法連線</div>';});
}
function fetchBlacklist(){
  var list=document.getElementById('friend-list');
  list.innerHTML='<div class="f-empty">載入中...</div>';
  authFetch('/api/friends/blacklist').then(function(d){
    if(d.error){list.innerHTML='<div class="f-empty">'+escH(d.error)+'</div>';return;}
    if(!d.blacklist||!d.blacklist.length){list.innerHTML='<div class="f-empty">黑名單為空</div>';return;}
    list.innerHTML='';
    d.blacklist.forEach(function(f){
      var item=document.createElement('div');item.className='f-item';
      var ns=document.createElement('span');ns.className='f-name';ns.textContent=f.nickname;item.appendChild(ns);
      var ub=document.createElement('button');ub.className='f-btn f-unban-btn';ub.setAttribute('data-user',f.username);ub.textContent='解除封鎖';item.appendChild(ub);
      list.appendChild(item);
    });
    list.querySelectorAll('.f-unban-btn').forEach(function(b){
      b.onclick=function(){
        authFetch('/api/friends/unblock',{method:'POST',body:{friendUsername:this.dataset.user}}).then(function(d){if(!d.error)fetchBlacklist();else alert(d.error);});
      };
    });
  }).catch(function(){list.innerHTML='<div class="f-empty">無法連線</div>';});
}
function searchUsers(q){
  var list=document.getElementById('friend-list');
  list.innerHTML='<div class="f-empty">搜尋中...</div>';
  authFetch('/api/users/search?q='+encodeURIComponent(q)).then(function(d){
    if(d.error){list.innerHTML='<div class="f-empty">'+escH(d.error)+'</div>';return;}
    if(!d.users||!d.users.length){list.innerHTML='<div class="f-empty">找不到符合的玩家</div>';return;}
    list.innerHTML='';
    d.users.forEach(function(u){
      var item=document.createElement('div');item.className='f-item';
      var btnText='添加';
      if(u.status==='pending')btnText='已邀請';
      else if(u.status==='blocked')btnText='已封鎖';
      else if(u.status==='friend')btnText='已是好友';
      var disabled=(u.status==='pending'||u.status==='blocked'||u.status==='friend')?'disabled':'';
      var ns=document.createElement('span');ns.className='f-name';ns.textContent=u.nickname;item.appendChild(ns);
      var g=document.createElement('div');
      var ab=document.createElement('button');ab.className='f-btn f-add-btn';ab.setAttribute('data-user',u.username);if(disabled)ab.disabled=true;ab.textContent=btnText;g.appendChild(ab);
      if(u.status!=='blocked'){var bb=document.createElement('button');bb.className='f-btn f-reject-btn f-block-btn';bb.setAttribute('data-user',u.username);bb.textContent='封鎖';g.appendChild(bb);}
      item.appendChild(g);list.appendChild(item);
    });
    list.querySelectorAll('.f-block-btn').forEach(function(b){
      b.onclick=function(){
        if(!confirm('確定封鎖此玩家？'))return;
        authFetch('/api/friends/block',{method:'POST',body:{friendUsername:this.dataset.user}}).then(function(d){
          if(!d.error)searchUsers(document.getElementById('friend-search-input').value.trim());
          else alert(d.error);
        });
      };
    });
    list.querySelectorAll('.f-add-btn:not([disabled])').forEach(function(b){
      b.onclick=function(){
        var btn=this;
        authFetch('/api/friends/request',{method:'POST',body:{friendUsername:btn.dataset.user}}).then(function(d){
          if(!d.error){btn.textContent='已邀請';btn.disabled=true;}
          else alert(d.error);
        });
      };
    });
  }).catch(function(){list.innerHTML='<div class="f-empty">無法連線</div>';});
}
document.getElementById('auth-login-btn').onclick=function(){doAuth('login');};
 document.getElementById('auth-reg-btn').onclick=function(){doAuth('register');};
 document.getElementById('ui-mode-btn').onclick=function(){
  // 清掉 oc_ui_mode 並重整 → 重新走一次操作模式選擇
  try{localStorage.removeItem('oc_ui_mode');}catch(e){}
  location.reload();
};
document.getElementById('auth-skip-btn').onclick=function(){document.getElementById('login-overlay').style.display='none';showModeSelect();};
document.getElementById('auth-user').addEventListener('keydown',function(e){if(e.code==='Enter')doAuth('login');});
document.getElementById('auth-pass').addEventListener('keydown',function(e){if(e.code==='Enter')doAuth('login');});
document.getElementById('logout-btn').onclick=function(){doLogout();};
document.getElementById('name-confirm-btn').onclick=function(){doSetName();};
document.getElementById('name-input').addEventListener('keydown',function(e){if(e.code==='Enter')doSetName();});
updateAvatarDisplay();
var authAvatar=localStorage.getItem('oc_avatar')||'';
// ── 記住登入與操作模式 ─────────────────────────────────────
// 之前每次開都要重選「電腦版／平板」並重新登入，現在：
//   1. localStorage 有 oc_ui_mode → 直接套用，不再跳選擇畫面
//   2. localStorage 有 oc_token  → 先擱在一邊，用 /api/profile 驗證；
//      有效就安靜登入（跳過登入畫面），過期才把登入畫面叫出來
// 想重選操作模式請點右上「🔄 操作模式」，或用「🚪 登出」清掉登入狀態。
function applyUiMode(){
  var m=localStorage.getItem('oc_ui_mode');
  if(m==='mobile'){
    document.body.classList.add('mobile-mode');
    var mc=document.getElementById('mobile-controls');if(mc)mc.style.display='block';
  }else{
    document.body.classList.remove('mobile-mode');
  }
  return m;
}
var savedUiMode=applyUiMode();
// 記了平板模式但現在是小螢幕（換裝置／視窗縮太小）→ 不要硬套，重新問一次
if(savedUiMode==='mobile'&&window.innerWidth<600)savedUiMode=null;
if(savedUiMode){var msEl=document.getElementById('mode-select');if(msEl)msEl.style.display='none';maybeAskName();}
else showModeSelect();

var loginEl=document.getElementById('login-overlay');
if(authToken&&loginEl){
  loginEl.style.display='none';   // 先藏起來，驗證通過就維持隱藏
  authFetch('/api/profile').then(function(d){
    if(d.error){
      // 只有後端明確回 401/404 才算 token 真的不能用。
      // 離線／後端沒開（__status 0 或非 401）時保留 token，下次開還能自動登入。
      if(d.__status===401||d.__status===404){
        localStorage.removeItem('oc_token');localStorage.removeItem('oc_user');
        authToken=null;authUser='';loginEl.style.display='flex';
      }
      return;
    }
    if(d.xp!=null)localStorage.setItem('oc_level',String(d.xp));
    if(d.nickname)localStorage.setItem('oc_nickname',d.nickname);
    if(d.picture)localStorage.setItem('oc_avatar',d.picture);
    authUser=d.username||authUser;
    localStorage.setItem('oc_user',authUser);
    updateAvatarDisplay();
    var ub=document.getElementById('logout-btn');if(ub)ub.style.display='';
    if(d.needsName)handleNeedsName();
  });
}else if(loginEl){loginEl.style.display='flex';}
// Online presence heartbeat + team polling
if(authToken){
  authFetch('/api/team/ping',{method:'POST',body:{}}).catch(function(){});
  window._teamPingInt=setInterval(function(){
    authFetch('/api/team/ping',{method:'POST',body:{}}).catch(function(){});
  },15000);
  window._teamStatusInt=setInterval(function(){if(typeof checkTeamStatus==='function')checkTeamStatus();},5000);
  setTimeout(function(){if(typeof checkTeamStatus==='function')checkTeamStatus();},100);
}
