// The browser script behind the one-line snippet (served at /t.js). Records a
// touch when a visit's source changes (UTMs, click ids, referrer; a new touch
// after 30 idle minutes), and conversions from dataLayer events. Waits for
// Google consent (analytics_storage) when a consent mode is in use. Stores only
// a random visitor id and the recent touches in localStorage. ES5 on purpose.

export type TrackerConfig = { key: string; endpoint: string; events: string[] };

export function trackerScript(cfg: TrackerConfig): string {
  return `(function(){
var CFG=${JSON.stringify(cfg)};
if(window.__vzTracker)return;window.__vzTracker=1;
var W=window,D=document,LS=W.localStorage,IDLE=18e5,TTL=7776e6;
var dl=W.dataLayer=W.dataLayer||[];
var granted=null,started=false,queue=[];
function send(o){o.k=CFG.key;o.v=vid();o.ts=Date.now();var b=JSON.stringify(o);
 try{if(navigator.sendBeacon&&navigator.sendBeacon(CFG.endpoint,b))return;}catch(e){}
 try{fetch(CFG.endpoint,{method:"POST",body:b,keepalive:true,mode:"no-cors"});}catch(e){}}
function vid(){var v;try{v=LS.getItem("vz_vid");}catch(e){}
 if(!v){v=(Date.now().toString(36)+Math.random().toString(36).slice(2,12)).replace(/[^a-z0-9]/g,"");try{LS.setItem("vz_vid",v);}catch(e){}}return v;}
function host(u){try{return new URL(u).hostname.replace(/^www\\./,"");}catch(e){return "";}}
function touch(){var p=new URLSearchParams(location.search),g=function(k){return(p.get(k)||"").toLowerCase().slice(0,100);};
 var t={s:g("utm_source"),m:g("utm_medium"),c:g("utm_campaign")},id="";
 ["gclid","fbclid","msclkid","ttclid","li_fat_id"].forEach(function(k){if(!id&&p.get(k))id=k;});
 var ref=host(D.referrer),self=location.hostname.replace(/^www\\./,"");
 if(!t.s){if(id==="gclid"){t.s="google";t.m="cpc";}else if(id==="fbclid"){t.s="facebook";t.m="paid_social";}
  else if(id==="msclkid"){t.s="bing";t.m="cpc";}else if(id==="ttclid"){t.s="tiktok";t.m="paid_social";}
  else if(id==="li_fat_id"){t.s="linkedin";t.m="paid_social";}
  else if(ref&&ref!==self){var se=ref.match(/(^|\\.)(google|bing|duckduckgo|yahoo|ecosia|baidu)\\./);
   if(se){t.s=se[2];t.m="organic";}else{t.s=ref;t.m=/facebook|instagram|linkedin|(^|\\.)t\\.co$|twitter|x\\.com|tiktok|pinterest|reddit|youtube/.test(ref)?"social":"referral";}}
  else{t.s="(direct)";t.m="(none)";}}
 if(!t.m)t.m="(none)";
 var last=null,now=Date.now();try{last=JSON.parse(LS.getItem("vz_last")||"null");}catch(e){}
 var campaignVisit=!!(p.get("utm_source")||id);
 var same=last&&last.s===t.s&&last.m===t.m&&last.c===t.c;
 var fresh=!last||now-last.seen>IDLE||now-last.ts>TTL;
 // An internal page view or reload continues the visit; a new campaign click or referrer starts a touch.
 var isNew=fresh||(!same&&(campaignVisit||(ref&&ref!==self)));
 if(isNew){last={s:t.s,m:t.m,c:t.c,ts:now};send({type:"touch",s:t.s,m:t.m,c:t.c,id:id,p:location.pathname});}
 last.seen=now;try{LS.setItem("vz_last",JSON.stringify(last));}catch(e){}}
function num(v){v=parseFloat(v);return isFinite(v)?v:0;}
function onEvent(name,params){if(CFG.events.indexOf(name)<0)return;params=params||{};var ec=params.ecommerce||params;
 var c={type:"conversion",e:name,value:num(ec.value),cur:ec.currency||"",txn:ec.transaction_id||""};
 if(started)send(c);else queue.push(c);}
function consentOf(x){return x&&x.analytics_storage;}
function inspect(a){if(!a)return;
 if(a[0]==="consent"&&(a[1]==="default"||a[1]==="update")){var s=consentOf(a[2]);if(s)setConsent(s==="granted");return;}
 if(a[0]==="event"&&typeof a[1]==="string"){onEvent(a[1],a[2]);return;}
 if(typeof a.event==="string")onEvent(a.event,a);}
function setConsent(g){granted=g;if(g)start();}
function start(){if(started)return;started=true;touch();queue.splice(0).forEach(send);}
for(var i=0;i<dl.length;i++)inspect(dl[i]);
var push=dl.push;dl.push=function(){for(var j=0;j<arguments.length;j++)inspect(arguments[j]);return push.apply(dl,arguments);};
// No consent mode on the page: nothing to wait for.
if(granted===null){try{var ics=W.google_tag_data&&W.google_tag_data.ics;var e=ics&&ics.entries&&ics.entries.analytics_storage;
 if(e){var v=e.update!==undefined?e.update:e["default"];if(v!==undefined){setConsent(!!v);}}}catch(e){}}
if(granted===null)start();
})();`;
}
