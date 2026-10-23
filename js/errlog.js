window.__ocSeen={};
window.__ocErrs=window.__ocErrs||[];
// log 工具本身絕不能丟錯：否則會蓋掉真正的錯誤，還會中斷 animate 主迴圈
window.__ocLogErr=function(tag,msg){
  try{
    var t=tag+' | '+msg;
    window.__ocErrs.push(t);if(window.__ocErrs.length>20)window.__ocErrs.shift();
    // 同一則錯誤每幀重複送出會把 log 洗爆，所以相同內容 10 秒只送一次
    var key=tag+'|'+msg;
    var now=Date.now();
    if(window.__ocSeen[key]&&now-window.__ocSeen[key]<10000)return;
    window.__ocSeen[key]=now;
    fetch('/oc-log?m='+encodeURIComponent(t).slice(0,600),{cache:'no-store'}).catch(function(){});
  }catch(e){}
};
window.addEventListener('error',function(ev){
  window.__ocLogErr('ERROR',(ev.message||'?')+' @'+(ev.lineno||'?')+':'+(ev.colno||'?')+' | '+(ev.filename||'').split('/').pop());
});
window.addEventListener('unhandledrejection',function(ev){
  window.__ocLogErr('REJECT',String(ev.reason&&ev.reason.message||ev.reason||'?'));
});
var _ocCE=console.error;console.error=function(){window.__ocLogErr('CONSOLE',Array.prototype.map.call(arguments,String).join(' ').slice(0,300));return _ocCE.apply(console,arguments);};

(function(){
  function djb(t){var h=5381;for(var i=0;i<t.length;i++){h=((h*33)^t.charCodeAt(i))>>>0;}return ('0000000'+h.toString(36)).slice(-7);}
  function show(id,extra){
    var el=document.getElementById('build-stamp');
    if(el)el.textContent='BUILD '+id+(extra?' '+extra:'');
    window.__ocBuild=id;
    console.log('%c[ocgame] BUILD '+id+(extra?' '+extra:''),'color:#8f8');
    // 自我回報：我要知道使用者到底是從哪個 port／哪個 app 開啟這頁的
    try{fetch('/oc-log?m=LOAD build='+id+' port='+location.port+' href='+location.href
      +' electron='+(!!window.electron)+' ua='+navigator.userAgent.slice(0,72),{cache:'no-store'}).catch(function(){});}catch(e){}
  }
  // 抓一份伺服器實際提供的 index.html，用和 server.js 相同的 djb2 算指紋。
  // 這樣只要檔案一改，指紋必變，舊分頁一定會被閘門擋下來。
  // 用 arrayBuffer 雜湊「原始位元組」，和 server.js 完全一致。
  // 之前用 r.text() 會讓解碼器把檔案開頭的 BOM 吃掉，導致指紋永遠不符。
  function djbBytes(buf){
    var b=new Uint8Array(buf),h=5381;
    for(var i=0;i<b.length;i++){h=((h*33)^b[i])>>>0;}
    return ('0000000'+h.toString(36)).slice(-7);
  }
  // 指紋 fetch 失敗（伺服器剛重啟／連線被打斷）時重試，別讓分頁停在 BUILD ? 
  function ocBuildFetch(tries){
    fetch('index.html?ocbuild='+Date.now(),{cache:'no-store'})
      .then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();})
      .then(function(ab){ window.OC_BUILD=djbBytes(ab); show(window.OC_BUILD,'ok'); })
      .catch(function(){
        if(tries>0){setTimeout(function(){ocBuildFetch(tries-1);},800);}
        else{ window.OC_BUILD=''; show('?','fetch-failed'); }
      });
  }
  ocBuildFetch(4);
  if(!document.getElementById('build-stamp')){
    var st=document.createElement('div');
    st.id='build-stamp';
    st.style.cssText='position:fixed;right:6px;bottom:6px;z-index:999999;background:rgba(0,0,0,.8);color:#8f8;border:1px solid #4a6;border-radius:4px;padding:3px 8px;font:11px/1.4 Menlo,monospace;pointer-events:none';
    document.body.appendChild(st);
  }
  show('...','讀取中');
  window.__ocBuildBanner=function(server,tip){
    var d=document.getElementById('build-block');
    if(!d){
      d=document.createElement('div');d.id='build-block';
      d.style.cssText='position:fixed;inset:0;z-index:9999999;background:rgba(20,0,0,.94);color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font:16px/2 system-ui,sans-serif';
      document.body.appendChild(d);
    }
    d.innerHTML='<div style="max-width:660px">'
      +'<div style="font-size:26px;color:#ff6b6b;margin-bottom:14px">這個分頁的版本太舊，無法進入多人對局</div>'
      +'<div style="color:#ffd43b">你的版本：'+(window.OC_BUILD||'(讀不到)')+'<br>伺服器版本：'+server+'</div>'
      +'<div style="margin-top:18px;color:#aaa">'+(tip||'你載入的是舊的分頁，我剛寫的修正都不在裡面。')+'</div>'
      +'<button id="oc-force-reload" style="margin-top:22px;padding:12px 28px;font-size:17px;font-weight:700;'
      +'background:#ff6b6b;color:#fff;border:0;border-radius:8px;cursor:pointer">重新載入最新版本</button>'
      +'<div style="margin-top:14px;color:#888;font-size:13px">或按 Cmd+Shift+R（Windows：Ctrl+Shift+R）</div></div>';
    var rb=document.getElementById('oc-force-reload');
    if(rb)rb.onclick=function(){location.reload();};
    try{window.OC_BUILD_BLOCKED=1;if(window.ws&&ws.close)ws.close();}catch(e){}
  };
})();
