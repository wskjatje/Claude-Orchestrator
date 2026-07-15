/**
 * 注入到代理 HTML 的导航 shim：虚拟 location（让站点脚本读到逻辑页 URL）、
 * 拦截 assign/replace/href/open/form/history/链接，统一走通用代理路径。
 */

import {
  WORKBENCH_BROWSER_FRAME_NAV_MESSAGE,
  WORKBENCH_BROWSER_NAVIGATE_MESSAGE,
  WORKBENCH_BROWSER_OPEN_TAB_MESSAGE,
} from "./workbench-browser-messages.mjs";

/**
 * 代理页若被顶层窗口加载（非 iframe），立即跳回应用 Shell，避免 React hydrate 与代理 HTML 冲突。
 * @param {string} [appShellUrl='/'] 相对路径即可，避免写死本机 host
 */
export function buildBrowserProxyTopFrameGuardScript(appShellUrl = '/') {
  return `(function(){try{if(window.top===window.self){window.location.replace(${JSON.stringify(appShellUrl || '/')});}}catch(e){}})();`
}

/**
 * @param {string} proxyPublicPath
 * @param {string} pageUrl upstream 逻辑页 URL
 */
export function buildBrowserNavigationShimScript(proxyPublicPath, pageUrl) {
  const navMsg = JSON.stringify(WORKBENCH_BROWSER_FRAME_NAV_MESSAGE);
  const openTabMsg = JSON.stringify(WORKBENCH_BROWSER_OPEN_TAB_MESSAGE);
  const navigateMsg = JSON.stringify(WORKBENCH_BROWSER_NAVIGATE_MESSAGE);
  return `(function(){
var P=${JSON.stringify(proxyPublicPath)};
var PAGE=${JSON.stringify(pageUrl)};
var NAV_MSG=${navMsg};
var OPEN_TAB_MSG=${openTabMsg};
var NAVIGATE_MSG=${navigateMsg};

function upstreamBase(){
  return frameLogicalHref();
}

/** 是否已是代理公开路径（含 query） */
function isProxyPath(s){
  return s===P || s.indexOf(P+'?')===0 || s.indexOf(P+'/')===0;
}

function logicalOrigin(){
  try{
    var L=logicalLoc();
    if(L)return L.origin;
  }catch(e){}
  try{return new URL(PAGE).origin}catch(e){}
  return '';
}

/**
 * 相对 URL 必须相对「逻辑页」解析，不能相对 location.origin。
 * 否则 /s?wd=x 会变成 http://本机UI/s?wd=x，再被代理成打开本站 SPA。
 */
function abs(u){
  var s=String(u||'').trim();
  if(!s)return s;
  if(isProxyPath(s)){
    return new URL(s,location.origin).href;
  }
  if(/^https?:\\/\\//i.test(s)){
    try{
      var absu=new URL(s);
      var o=location.origin;
      if(absu.origin===o&&absu.pathname!==P&&!absu.href.includes(P+'?')){
        var rel=absu.pathname+absu.search+absu.hash;
        return new URL(rel,upstreamBase()).href;
      }
      return absu.href;
    }catch(e){}
  }
  if(/^\\/\\//.test(s)){
    try{
      var tmp=new URL(s,location.origin);
      var base=upstreamBase();
      var lo=logicalOrigin();
      if(lo&&tmp.origin!==lo&&(tmp.hostname===location.hostname||tmp.host===location.host)){
        var L=new URL(base);
        return L.protocol+'//'+L.host+tmp.pathname+tmp.search+tmp.hash;
      }
      return tmp.href;
    }catch(e){}
  }
  if(s.charAt(0)==='/'||s.charAt(0)==='?'){
    try{return new URL(s,upstreamBase()).href}catch(e){}
  }
  try{return new URL(s,upstreamBase()).href}catch(e){}
  try{return new URL(s,location.origin).href}catch(e){}
  return s;
}

function extractUpstreamFromFrame(u){
  try{
    var parsed=new URL(String(u||''),location.origin);
    if(parsed.pathname===P){
      var q=parsed.searchParams.get('url');
      if(q)return q;
    }
  }catch(e){}
  return null;
}

function px(u){
  try{
    if(u==null||u==='')return u;
    var a=abs(u);
    if(!/^https?:\\/\\//i.test(a)){
      var rel=String(u||'').trim();
      if(rel&&upstreamBase()){
        try{
          a=new URL(rel.charAt(0)==='/'||rel.charAt(0)==='?'?rel:'/'+rel,upstreamBase()).href;
        }catch(e){}
      }
    }
    if(!/^https?:\\/\\//i.test(a)){
      return P+'?url='+encodeURIComponent(String(u||''));
    }
    var upstream=extractUpstreamFromFrame(a);
    if(upstream)a=upstream;
    var o=location.origin;
    if(a.indexOf(o)===0&&a.indexOf(P)>=0&&/[?&]url=/.test(a))return a;
    if(a.indexOf(o)===0&&a.indexOf(P)<0){
      try{
        var mis=new URL(a);
        var fixed=new URL(mis.pathname+mis.search+mis.hash,upstreamBase()).href;
        if(/^https?:\\/\\//i.test(fixed)&&new URL(fixed).origin!==o)a=fixed;
      }catch(e){}
    }
    if(a.indexOf(P)===0&&!/[?&]url=/.test(a)){
      return P+'?url='+encodeURIComponent(frameLogicalHref());
    }
    if(a.indexOf(P)>=0&&!/[?&]url=/.test(a)){
      return P+'?url='+encodeURIComponent(frameLogicalHref());
    }
    return P+'?url='+encodeURIComponent(a);
  }catch(e){
    return u;
  }
}

function safePx(u){
  var n=px(u);
  if(typeof n==='string'&&n.indexOf(P)>=0&&!/[?&]url=/.test(n)){
    return P+'?url='+encodeURIComponent(frameLogicalHref());
  }
  return n;
}

function frameLogicalHref(){
  try{
    var u=location.href,o=location.origin;
    if(u.indexOf(o)===0&&u.indexOf(P)>=0){
      var q=new URL(u).searchParams.get('url');
      if(q)return q;
      return PAGE;
    }
  }catch(e){}
  return PAGE;
}

function logicalLoc(){
  try{return new URL(frameLogicalHref())}catch(e){return null}
}

function logicalUrl(){return frameLogicalHref();}

function resolveLogicalNavigateUrl(rawUrl){
  try{
    var a=abs(rawUrl);
    if(!/^https?:\\/\\//i.test(a)){
      var rel=String(rawUrl||'').trim();
      if(rel&&upstreamBase()){
        try{
          a=new URL(rel.charAt(0)==='/'||rel.charAt(0)==='?'?rel:'/'+rel,upstreamBase()).href;
        }catch(e){}
      }
    }
    if(!/^https?:\\/\\//i.test(a))a=logicalUrl();
    return a;
  }catch(e){
    return logicalUrl();
  }
}

function inEmbeddedFrame(){
  try{return window.top!==window.self}catch(e){return false}
}

function openInWorkbenchBrowser(rawUrl){
  try{
    parent.postMessage({type:OPEN_TAB_MSG,logicalUrl:resolveLogicalNavigateUrl(rawUrl)},location.origin);
  }catch(e){}
}

function requestWorkbenchNavigate(rawUrl){
  try{
    parent.postMessage({type:NAVIGATE_MSG,logicalUrl:resolveLogicalNavigateUrl(rawUrl)},location.origin);
  }catch(e){}
}

function notifyNav(){
  try{
    parent.postMessage({type:NAV_MSG,logicalUrl:logicalUrl(),frameUrl:location.href},location.origin);
  }catch(e){}
}

var origAssign=Location.prototype.assign;
var origReplace=Location.prototype.replace;

function navTo(u){
  if(inEmbeddedFrame()){
    requestWorkbenchNavigate(u);
    return;
  }
  var n=safePx(u);
  try{
    if(typeof origAssign==='function'){
      origAssign.call(location,n);
    }else{
      location.href=n;
    }
  }catch(e){
    location.href=n;
  }
  notifyNav();
}

if(typeof origAssign==='function'){
  Location.prototype.assign=function(u){
    if(inEmbeddedFrame()){requestWorkbenchNavigate(u);return;}
    origAssign.call(this,safePx(u));notifyNav();
  };
}
if(typeof origReplace==='function'){
  Location.prototype.replace=function(u){
    if(inEmbeddedFrame()){requestWorkbenchNavigate(u);return;}
    origReplace.call(this,safePx(u));notifyNav();
  };
}
try{if(typeof origAssign==='function')location.assign=Location.prototype.assign.bind(location);}catch(e){}
try{if(typeof origReplace==='function')location.replace=Location.prototype.replace.bind(location);}catch(e){}

try{
  var hrefDesc=Object.getOwnPropertyDescriptor(Location.prototype,'href');
  if(hrefDesc&&hrefDesc.set){
    Object.defineProperty(Location.prototype,'href',{
      configurable:true,
      enumerable:true,
      get:function(){
        var L=logicalLoc();
        if(L)return L.href;
        return hrefDesc.get.call(this);
      },
      set:function(v){
        if(inEmbeddedFrame()){requestWorkbenchNavigate(v);return;}
        hrefDesc.set.call(this,safePx(v));notifyNav();
      }
    });
  }
}catch(e){}

function patchLocRead(name,pick){
  try{
    var d=Object.getOwnPropertyDescriptor(Location.prototype,name);
    if(!d||!d.get)return;
    Object.defineProperty(Location.prototype,name,{
      configurable:true,
      enumerable:true,
      get:function(){
        var L=logicalLoc();
        if(L)return pick(L);
        try{var P2=new URL(PAGE);return pick(P2)}catch(e){}
        return d.get.call(this);
      },
      set:d.set?function(v){d.set.call(this,v);}:undefined
    });
  }catch(e){}
}
patchLocRead('pathname',function(L){return L.pathname;});
patchLocRead('search',function(L){return L.search;});
patchLocRead('hash',function(L){return L.hash;});
patchLocRead('host',function(L){return L.host;});
patchLocRead('hostname',function(L){return L.hostname;});
patchLocRead('origin',function(L){return L.origin;});
patchLocRead('protocol',function(L){return L.protocol;});
patchLocRead('port',function(L){return L.port;});

try{
  var docUrlDesc=Object.getOwnPropertyDescriptor(Document.prototype,'URL');
  if(docUrlDesc&&docUrlDesc.get){
    Object.defineProperty(Document.prototype,'URL',{
      configurable:true,
      enumerable:true,
      get:function(){var L=logicalLoc();return L?L.href:docUrlDesc.get.call(this);}
    });
  }
}catch(e){}
try{
  var docUriDesc=Object.getOwnPropertyDescriptor(Document.prototype,'documentURI');
  if(docUriDesc&&docUriDesc.get){
    Object.defineProperty(Document.prototype,'documentURI',{
      configurable:true,
      enumerable:true,
      get:function(){var L=logicalLoc();return L?L.href:docUriDesc.get.call(this);}
    });
  }
}catch(e){}

var origOpen=window.open;
window.open=function(url,target,features){
  if(url!=null&&url!==''){
    if(window.top!==window.self){
      openInWorkbenchBrowser(url);
      return null;
    }
    var n=safePx(url);
    if(!target||target==='_self'){navTo(n);return window;}
    return origOpen.call(window,n,target,features);
  }
  return origOpen.apply(window,arguments);
};

function resolveFormUpstream(form){
  var action=form.getAttribute('action');
  if(action){
    var upstream=extractUpstreamFromFrame(abs(action));
    if(upstream)return upstream;
    return abs(action);
  }
  return logicalUrl();
}

var origFormSubmit=HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit=function(){
  try{
    var method=(this.getAttribute('method')||'get').toLowerCase();
    if(method==='get'){
      var targetUrl=new URL(resolveFormUpstream(this), upstreamBase());
      new FormData(this).forEach(function(v,k){
        if(v!=null&&String(v)!=='')targetUrl.searchParams.set(k,String(v));
      });
      navTo(targetUrl.href);
      return;
    }
    var proxied=safePx(resolveFormUpstream(this));
    if(proxied)this.setAttribute('action',proxied);
  }catch(e){}
  return origFormSubmit.call(this);
};

try{
  var ps=history.pushState.bind(history);
  var rs=history.replaceState.bind(history);
  history.pushState=function(s,t,u){ps(s,t,u===undefined?u:safePx(u));notifyNav();};
  history.replaceState=function(s,t,u){rs(s,t,u===undefined?u:safePx(u));notifyNav();};
}catch(e){}

document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
  if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  var h=a.getAttribute('href');
  if(!h||h.charAt(0)==='#')return;
  var n=safePx(h);
  var target=(a.getAttribute('target')||'').toLowerCase();
  if(target==='_blank'){
    e.preventDefault();
    openInWorkbenchBrowser(h);
    return;
  }
  if(target==='_top'||target==='_parent')target='_self';
  e.preventDefault();
  navTo(n);
},true);

document.addEventListener('submit',function(e){
  var form=e.target;
  if(!form||form.tagName!=='FORM')return;
  var formTarget=(form.getAttribute('target')||'').toLowerCase();
  if(formTarget==='_top'||formTarget==='_parent')form.setAttribute('target','_self');
  var method=(form.getAttribute('method')||'get').toLowerCase();
  try{
    if(method==='get'){
      var targetUrl=new URL(resolveFormUpstream(form), upstreamBase());
      new FormData(form).forEach(function(v,k){
        if(v!=null&&String(v)!=='')targetUrl.searchParams.set(k,String(v));
      });
      if(formTarget==='_blank'){
        e.preventDefault();
        openInWorkbenchBrowser(targetUrl.href);
        return;
      }
      e.preventDefault();
      navTo(targetUrl.href);
      return;
    }
    if(formTarget==='_blank'){
      e.preventDefault();
      openInWorkbenchBrowser(resolveFormUpstream(form));
      return;
    }
    var proxied=safePx(resolveFormUpstream(form));
    if(proxied&&proxied!==form.getAttribute('action'))form.setAttribute('action',proxied);
  }catch(err){}
},true);

document.addEventListener('keydown',function(e){
  if(e.key!=='Enter')return;
  var t=e.target;
  if(!t||!(t.tagName==='INPUT'||t.tagName==='TEXTAREA'))return;
  var form=t.closest?t.closest('form'):null;
  if(!form)return;
  var method=(form.getAttribute('method')||'get').toLowerCase();
  if(method!=='get')return;
  e.preventDefault();
  var targetUrl=new URL(resolveFormUpstream(form), upstreamBase());
  new FormData(form).forEach(function(v,k){
    if(v!=null&&String(v)!=='')targetUrl.searchParams.set(k,String(v));
  });
  navTo(targetUrl.href);
},true);

window.addEventListener('load',notifyNav);

function guardFormAction(form){
  function syncAction(){
    try{
      var a=form.getAttribute('action');
      if(!a||a==='#')return;
      if(isProxyPath(a))return;
      var proxied=safePx(abs(a));
      if(proxied&&proxied!==a)form.setAttribute('action',proxied);
    }catch(e){}
  }
  syncAction();
  try{
    new MutationObserver(syncAction).observe(form,{attributes:true,attributeFilter:['action']});
  }catch(e){}
}
function scanForms(){
  document.querySelectorAll('form').forEach(guardFormAction);
}
scanForms();
try{
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType!==1)return;
        if(n.tagName==='FORM')guardFormAction(n);
        if(n.querySelectorAll)n.querySelectorAll('form').forEach(guardFormAction);
      });
    });
  }).observe(document.documentElement,{childList:true,subtree:true});
}catch(e){}

if(window.top!==window.self){
  document.addEventListener('click',function(e){
    var el=e.target;
    if(!el||!el.closest)return;
    var form=el.closest('form');
    if(!form)return;
    var t=(form.getAttribute('target')||'').toLowerCase();
    if(t==='_top'||t==='_parent')form.setAttribute('target','_self');
  },true);
}

try{
  if(window.navigation&&typeof window.navigation.navigate==='function'){
    var origNavigate=window.navigation.navigate.bind(window.navigation);
    window.navigation.navigate=function(url,opts){
      return origNavigate(safePx(url),opts);
    };
  }
}catch(e){}

var SUB_ATTRS=['src','poster','data-src','data-original','data-lazy-src','data-url'];

function absolutizeSubresourceUrl(u){
  if(u==null||u==='')return u;
  var s=String(u).trim();
  if(s.charAt(0)==='#')return s;
  if(/^(data:|blob:|javascript:)/i.test(s))return s;
  if(isProxyPath(s))return s;
  var a=abs(s);
  return/^https?:\\/\\//i.test(a)?a:s;
}

function fixSubresourceEl(el){
  if(!el||el.nodeType!==1)return;
  var tag=el.tagName;
  if(tag!=='IMG'&&tag!=='VIDEO'&&tag!=='AUDIO'&&tag!=='SOURCE'&&tag!=='IFRAME'&&tag!=='EMBED')return;
  for(var i=0;i<SUB_ATTRS.length;i++){
    var attr=SUB_ATTRS[i];
    var v=el.getAttribute(attr);
    if(!v)continue;
    var fixed=absolutizeSubresourceUrl(v);
    if(fixed&&fixed!==v)el.setAttribute(attr,fixed);
  }
  var ss=el.getAttribute('srcset');
  if(ss){
    var parts=ss.split(',');
    var out=[];
    for(var j=0;j<parts.length;j++){
      var p=parts[j].trim().split(/\\s+/);
      if(p[0]){
        var fa=absolutizeSubresourceUrl(p[0]);
        if(fa)p[0]=fa;
      }
      out.push(p.join(' '));
    }
    el.setAttribute('srcset',out.join(', '));
  }
}

function scanSubresources(){
  document.querySelectorAll('img,video,audio,source,iframe,embed').forEach(fixSubresourceEl);
}
scanSubresources();
try{
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType!==1)return;
        fixSubresourceEl(n);
        if(n.querySelectorAll)n.querySelectorAll('img,video,audio,source,iframe,embed').forEach(fixSubresourceEl);
      });
      if(m.type==='attributes'&&m.target)fixSubresourceEl(m.target);
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:SUB_ATTRS.concat(['srcset'])});
}catch(e){}
})();`
}
