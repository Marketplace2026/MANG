import{d as h,g as Yt,R as Ct}from"./vendor-react-CF4KUbtU.js";let Ft={data:""},Nt=t=>{if(typeof window=="object"){let e=(t?t.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return e.nonce=window.__nonce__,e.parentNode||(t||document.head).appendChild(e),e.firstChild}return t||Ft},_t=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,jt=/\/\*[^]*?\*\/|  +/g,nt=/\n+/g,k=(t,e)=>{let n="",r="",a="";for(let o in t){let s=t[o];o[0]=="@"?o[1]=="i"?n=o+" "+s+";":r+=o[1]=="f"?k(s,o):o+"{"+k(s,o[1]=="k"?"":e)+"}":typeof s=="object"?r+=k(s,e?e.replace(/([^,])+/g,i=>o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,d=>/&/.test(d)?d.replace(/&/g,i):i?i+" "+d:d)):o):s!=null&&(o=o[1]=="-"?o:o.replace(/[A-Z]/g,"-$&").toLowerCase(),a+=k.p?k.p(o,s):o+":"+s+";")}return n+(e&&a?e+"{"+a+"}":a)+r},O={},lt=t=>{if(typeof t=="object"){let e="";for(let n in t)e+=n+lt(t[n]);return e}return t},$t=(t,e,n,r,a)=>{let o=lt(t),s=O[o]||(O[o]=(d=>{let f=0,u=11;for(;f<d.length;)u=101*u+d.charCodeAt(f++)>>>0;return"go"+u})(o));if(!O[s]){let d=o!==t?t:(f=>{let u,c,l=[{}];for(;u=_t.exec(f.replace(jt,""));)u[4]?l.shift():u[3]?(c=u[3].replace(nt," ").trim(),l.unshift(l[0][c]=l[0][c]||{})):l[0][u[1]]=u[2].replace(nt," ").trim();return l[0]})(t);O[s]=k(a?{["@keyframes "+s]:d}:d,n?"":"."+s)}let i=n&&O.g;return n&&(O.g=O[s]),((d,f,u,c)=>{c?f.data=f.data.replace(c,d):f.data.indexOf(d)===-1&&(f.data=u?d+f.data:f.data+d)})(O[s],e,r,i),s},It=(t,e,n)=>t.reduce((r,a,o)=>{let s=e[o];if(s&&s.call){let i=s(n),d=i&&i.props&&i.props.className||/^go/.test(i)&&i;s=d?"."+d:i&&typeof i=="object"?i.props?"":k(i,""):i===!1?"":i}return r+a+(s??"")},"");function X(t){let e=this||{},n=t.call?t(e.p):t;return $t(n.unshift?n.raw?It(n,[].slice.call(arguments,1),e.p):n.reduce((r,a)=>Object.assign(r,a&&a.call?a(e.p):a),{}):n,Nt(e.target),e.g,e.o,e.k)}let ft,U,K;X.bind({g:1});let D=X.bind({k:1});function Rt(t,e,n,r){k.p=e,ft=t,U=n,K=r}function P(t,e){let n=this||{};return function(){let r=arguments;function a(o,s){let i=Object.assign({},o),d=i.className||a.className;n.p=Object.assign({theme:U&&U()},i),n.o=/go\d/.test(d),i.className=X.apply(n,r)+(d?" "+d:"");let f=t;return t[0]&&(f=i.as||t,delete i.as),K&&f[0]&&K(i),ft(f,i)}return a}}var At=t=>typeof t=="function",A=(t,e)=>At(t)?t(e):t,Ht=(()=>{let t=0;return()=>(++t).toString()})(),mt=(()=>{let t;return()=>{if(t===void 0&&typeof window<"u"){let e=matchMedia("(prefers-reduced-motion: reduce)");t=!e||e.matches}return t}})(),Lt=20,Z="default",ht=(t,e)=>{let{toastLimit:n}=t.settings;switch(e.type){case 0:return{...t,toasts:[e.toast,...t.toasts].slice(0,n)};case 1:return{...t,toasts:t.toasts.map(s=>s.id===e.toast.id?{...s,...e.toast}:s)};case 2:let{toast:r}=e;return ht(t,{type:t.toasts.find(s=>s.id===r.id)?1:0,toast:r});case 3:let{toastId:a}=e;return{...t,toasts:t.toasts.map(s=>s.id===a||a===void 0?{...s,dismissed:!0,visible:!1}:s)};case 4:return e.toastId===void 0?{...t,toasts:[]}:{...t,toasts:t.toasts.filter(s=>s.id!==e.toastId)};case 5:return{...t,pausedAt:e.time};case 6:let o=e.time-(t.pausedAt||0);return{...t,pausedAt:void 0,toasts:t.toasts.map(s=>({...s,pauseDuration:s.pauseDuration+o}))}}},I=[],gt={toasts:[],pausedAt:void 0,settings:{toastLimit:Lt}},v={},pt=(t,e=Z)=>{v[e]=ht(v[e]||gt,t),I.forEach(([n,r])=>{n===e&&r(v[e])})},yt=t=>Object.keys(v).forEach(e=>pt(t,e)),qt=t=>Object.keys(v).find(e=>v[e].toasts.some(n=>n.id===t)),Q=(t=Z)=>e=>{pt(e,t)},Xt={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},Qt=(t={},e=Z)=>{let[n,r]=h.useState(v[e]||gt),a=h.useRef(v[e]);h.useEffect(()=>(a.current!==v[e]&&r(v[e]),I.push([e,r]),()=>{let s=I.findIndex(([i])=>i===e);s>-1&&I.splice(s,1)}),[e]);let o=n.toasts.map(s=>{var i,d,f;return{...t,...t[s.type],...s,removeDelay:s.removeDelay||((i=t[s.type])==null?void 0:i.removeDelay)||t?.removeDelay,duration:s.duration||((d=t[s.type])==null?void 0:d.duration)||t?.duration||Xt[s.type],style:{...t.style,...(f=t[s.type])==null?void 0:f.style,...s.style}}});return{...n,toasts:o}},Vt=(t,e="blank",n)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:e,ariaProps:{role:"status","aria-live":"polite"},message:t,pauseDuration:0,...n,id:n?.id||Ht()}),N=t=>(e,n)=>{let r=Vt(e,t,n);return Q(r.toasterId||qt(r.id))({type:2,toast:r}),r.id},b=(t,e)=>N("blank")(t,e);b.error=N("error");b.success=N("success");b.loading=N("loading");b.custom=N("custom");b.dismiss=(t,e)=>{let n={type:3,toastId:t};e?Q(e)(n):yt(n)};b.dismissAll=t=>b.dismiss(void 0,t);b.remove=(t,e)=>{let n={type:4,toastId:t};e?Q(e)(n):yt(n)};b.removeAll=t=>b.remove(void 0,t);b.promise=(t,e,n)=>{let r=b.loading(e.loading,{...n,...n?.loading});return typeof t=="function"&&(t=t()),t.then(a=>{let o=e.success?A(e.success,a):void 0;return o?b.success(o,{id:r,...n,...n?.success}):b.dismiss(r),a}).catch(a=>{let o=e.error?A(e.error,a):void 0;o?b.error(o,{id:r,...n,...n?.error}):b.dismiss(r)}),t};var zt=1e3,Bt=(t,e="default")=>{let{toasts:n,pausedAt:r}=Qt(t,e),a=h.useRef(new Map).current,o=h.useCallback((c,l=zt)=>{if(a.has(c))return;let m=setTimeout(()=>{a.delete(c),s({type:4,toastId:c})},l);a.set(c,m)},[]);h.useEffect(()=>{if(r)return;let c=Date.now(),l=n.map(m=>{if(m.duration===1/0)return;let y=(m.duration||0)+m.pauseDuration-(c-m.createdAt);if(y<0){m.visible&&b.dismiss(m.id);return}return setTimeout(()=>b.dismiss(m.id,e),y)});return()=>{l.forEach(m=>m&&clearTimeout(m))}},[n,r,e]);let s=h.useCallback(Q(e),[e]),i=h.useCallback(()=>{s({type:5,time:Date.now()})},[s]),d=h.useCallback((c,l)=>{s({type:1,toast:{id:c,height:l}})},[s]),f=h.useCallback(()=>{r&&s({type:6,time:Date.now()})},[r,s]),u=h.useCallback((c,l)=>{let{reverseOrder:m=!1,gutter:y=8,defaultPosition:x}=l||{},z=n.filter(w=>(w.position||x)===(c.position||x)&&w.height),Wt=z.findIndex(w=>w.id===c.id),et=z.filter((w,B)=>B<Wt&&w.visible).length;return z.filter(w=>w.visible).slice(...m?[et+1]:[0,et]).reduce((w,B)=>w+(B.height||0)+y,0)},[n]);return h.useEffect(()=>{n.forEach(c=>{if(c.dismissed)o(c.id,c.removeDelay);else{let l=a.get(c.id);l&&(clearTimeout(l),a.delete(c.id))}})},[n,o]),{toasts:n,handlers:{updateHeight:d,startPause:i,endPause:f,calculateOffset:u}}},Gt=D`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Jt=D`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ut=D`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Kt=P("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Gt} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Jt} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${t=>t.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${Ut} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Zt=D`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,te=P("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${t=>t.secondary||"#e0e0e0"};
  border-right-color: ${t=>t.primary||"#616161"};
  animation: ${Zt} 1s linear infinite;
`,ee=D`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,ne=D`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,re=P("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${ee} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${ne} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${t=>t.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,ae=P("div")`
  position: absolute;
`,oe=P("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,se=D`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,ie=P("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${se} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,ue=({toast:t})=>{let{icon:e,type:n,iconTheme:r}=t;return e!==void 0?typeof e=="string"?h.createElement(ie,null,e):e:n==="blank"?null:h.createElement(oe,null,h.createElement(te,{...r}),n!=="loading"&&h.createElement(ae,null,n==="error"?h.createElement(Kt,{...r}):h.createElement(re,{...r})))},ce=t=>`
0% {transform: translate3d(0,${t*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,de=t=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${t*-150}%,-1px) scale(.6); opacity:0;}
`,le="0%{opacity:0;} 100%{opacity:1;}",fe="0%{opacity:1;} 100%{opacity:0;}",me=P("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,he=P("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,ge=(t,e)=>{let n=t.includes("top")?1:-1,[r,a]=mt()?[le,fe]:[ce(n),de(n)];return{animation:e?`${D(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${D(a)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},pe=h.memo(({toast:t,position:e,style:n,children:r})=>{let a=t.height?ge(t.position||e||"top-center",t.visible):{opacity:0},o=h.createElement(ue,{toast:t}),s=h.createElement(he,{...t.ariaProps},A(t.message,t));return h.createElement(me,{className:t.className,style:{...a,...n,...t.style}},typeof r=="function"?r({icon:o,message:s}):h.createElement(h.Fragment,null,o,s))});Rt(h.createElement);var ye=({id:t,className:e,style:n,onHeightUpdate:r,children:a})=>{let o=h.useCallback(s=>{if(s){let i=()=>{let d=s.getBoundingClientRect().height;r(t,d)};i(),new MutationObserver(i).observe(s,{subtree:!0,childList:!0,characterData:!0})}},[t,r]);return h.createElement("div",{ref:o,className:e,style:n},a)},be=(t,e)=>{let n=t.includes("top"),r=n?{top:0}:{bottom:0},a=t.includes("center")?{justifyContent:"center"}:t.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:mt()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${e*(n?1:-1)}px)`,...r,...a}},we=X`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,j=16,cr=({reverseOrder:t,position:e="top-center",toastOptions:n,gutter:r,children:a,toasterId:o,containerStyle:s,containerClassName:i})=>{let{toasts:d,handlers:f}=Bt(n,o);return h.createElement("div",{"data-rht-toaster":o||"",style:{position:"fixed",zIndex:9999,top:j,left:j,right:j,bottom:j,pointerEvents:"none",...s},className:i,onMouseEnter:f.startPause,onMouseLeave:f.endPause},d.map(u=>{let c=u.position||e,l=f.calculateOffset(u,{reverseOrder:t,gutter:r,defaultPosition:e}),m=be(c,l);return h.createElement(ye,{id:u.id,key:u.id,onHeightUpdate:f.updateHeight,className:u.visible?we:"",style:m},u.type==="custom"?A(u.message,u):a?a(u):h.createElement(pe,{toast:u,position:c}))}))},dr=b;const ve={},rt=t=>{let e;const n=new Set,r=(u,c)=>{const l=typeof u=="function"?u(e):u;if(!Object.is(l,e)){const m=e;e=c??(typeof l!="object"||l===null)?l:Object.assign({},e,l),n.forEach(y=>y(e,m))}},a=()=>e,d={setState:r,getState:a,getInitialState:()=>f,subscribe:u=>(n.add(u),()=>n.delete(u)),destroy:()=>{(ve?"production":void 0)!=="production"&&console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."),n.clear()}},f=e=t(r,a,d);return d},xe=t=>t?rt(t):rt;var bt={exports:{}},wt={},vt={exports:{}},xt={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var W=h;function De(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var Me=typeof Object.is=="function"?Object.is:De,Oe=W.useState,Se=W.useEffect,ke=W.useLayoutEffect,Pe=W.useDebugValue;function Ee(t,e){var n=e(),r=Oe({inst:{value:n,getSnapshot:e}}),a=r[0].inst,o=r[1];return ke(function(){a.value=n,a.getSnapshot=e,G(a)&&o({inst:a})},[t,n,e]),Se(function(){return G(a)&&o({inst:a}),t(function(){G(a)&&o({inst:a})})},[t]),Pe(n),n}function G(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!Me(t,n)}catch{return!0}}function Te(t,e){return e()}var We=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?Te:Ee;xt.useSyncExternalStore=W.useSyncExternalStore!==void 0?W.useSyncExternalStore:We;vt.exports=xt;var Ye=vt.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var V=h,Ce=Ye;function Fe(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var Ne=typeof Object.is=="function"?Object.is:Fe,_e=Ce.useSyncExternalStore,je=V.useRef,$e=V.useEffect,Ie=V.useMemo,Re=V.useDebugValue;wt.useSyncExternalStoreWithSelector=function(t,e,n,r,a){var o=je(null);if(o.current===null){var s={hasValue:!1,value:null};o.current=s}else s=o.current;o=Ie(function(){function d(m){if(!f){if(f=!0,u=m,m=r(m),a!==void 0&&s.hasValue){var y=s.value;if(a(y,m))return c=y}return c=m}if(y=c,Ne(u,m))return y;var x=r(m);return a!==void 0&&a(y,x)?(u=m,y):(u=m,c=x)}var f=!1,u,c,l=n===void 0?null:n;return[function(){return d(e())},l===null?void 0:function(){return d(l())}]},[e,n,r,a]);var i=_e(t,o[0],o[1]);return $e(function(){s.hasValue=!0,s.value=i},[i]),Re(i),i};bt.exports=wt;var Ae=bt.exports;const He=Yt(Ae),Dt={},{useDebugValue:Le}=Ct,{useSyncExternalStoreWithSelector:qe}=He;let at=!1;const Xe=t=>t;function Qe(t,e=Xe,n){(Dt?"production":void 0)!=="production"&&n&&!at&&(console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"),at=!0);const r=qe(t.subscribe,t.getState,t.getServerState||t.getInitialState,e,n);return Le(r),r}const ot=t=>{(Dt?"production":void 0)!=="production"&&typeof t!="function"&&console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");const e=typeof t=="function"?xe(t):t,n=(r,a)=>Qe(e,r,a);return Object.assign(n,e),n},lr=t=>t?ot(t):ot;function Mt(t){var e,n,r="";if(typeof t=="string"||typeof t=="number")r+=t;else if(typeof t=="object")if(Array.isArray(t)){var a=t.length;for(e=0;e<a;e++)t[e]&&(n=Mt(t[e]))&&(r&&(r+=" "),r+=n)}else for(n in t)t[n]&&(r&&(r+=" "),r+=n);return r}function fr(){for(var t,e,n=0,r="",a=arguments.length;n<a;n++)(t=arguments[n])&&(e=Mt(t))&&(r&&(r+=" "),r+=e);return r}function p(t){const e=Object.prototype.toString.call(t);return t instanceof Date||typeof t=="object"&&e==="[object Date]"?new t.constructor(+t):typeof t=="number"||e==="[object Number]"||typeof t=="string"||e==="[object String]"?new Date(t):new Date(NaN)}function M(t,e){return t instanceof Date?new t.constructor(e):new Date(e)}function Ve(t,e){const n=p(t);return isNaN(e)?M(t,NaN):(n.setDate(n.getDate()+e),n)}const Ot=6048e5,ze=864e5,$=43200,st=1440;let Be={};function _(){return Be}function F(t,e){const n=_(),r=e?.weekStartsOn??e?.locale?.options?.weekStartsOn??n.weekStartsOn??n.locale?.options?.weekStartsOn??0,a=p(t),o=a.getDay(),s=(o<r?7:0)+o-r;return a.setDate(a.getDate()-s),a.setHours(0,0,0,0),a}function H(t){return F(t,{weekStartsOn:1})}function St(t){const e=p(t),n=e.getFullYear(),r=M(t,0);r.setFullYear(n+1,0,4),r.setHours(0,0,0,0);const a=H(r),o=M(t,0);o.setFullYear(n,0,4),o.setHours(0,0,0,0);const s=H(o);return e.getTime()>=a.getTime()?n+1:e.getTime()>=s.getTime()?n:n-1}function L(t){const e=p(t);return e.setHours(0,0,0,0),e}function q(t){const e=p(t),n=new Date(Date.UTC(e.getFullYear(),e.getMonth(),e.getDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()));return n.setUTCFullYear(e.getFullYear()),+t-+n}function Ge(t,e){const n=L(t),r=L(e),a=+n-q(n),o=+r-q(r);return Math.round((a-o)/ze)}function Je(t){const e=St(t),n=M(t,0);return n.setFullYear(e,0,4),n.setHours(0,0,0,0),H(n)}function R(t,e){const n=p(t),r=p(e),a=n.getTime()-r.getTime();return a<0?-1:a>0?1:a}function tt(t){return M(t,Date.now())}function kt(t,e){const n=L(t),r=L(e);return+n==+r}function Ue(t){return t instanceof Date||typeof t=="object"&&Object.prototype.toString.call(t)==="[object Date]"}function Ke(t){if(!Ue(t)&&typeof t!="number")return!1;const e=p(t);return!isNaN(Number(e))}function Ze(t,e){const n=p(t),r=p(e),a=n.getFullYear()-r.getFullYear(),o=n.getMonth()-r.getMonth();return a*12+o}function tn(t){return e=>{const r=(t?Math[t]:Math.trunc)(e);return r===0?0:r}}function en(t,e){return+p(t)-+p(e)}function nn(t){const e=p(t);return e.setHours(23,59,59,999),e}function rn(t){const e=p(t),n=e.getMonth();return e.setFullYear(e.getFullYear(),n+1,0),e.setHours(23,59,59,999),e}function an(t){const e=p(t);return+nn(e)==+rn(e)}function on(t,e){const n=p(t),r=p(e),a=R(n,r),o=Math.abs(Ze(n,r));let s;if(o<1)s=0;else{n.getMonth()===1&&n.getDate()>27&&n.setDate(30),n.setMonth(n.getMonth()-a*o);let i=R(n,r)===-a;an(p(t))&&o===1&&R(t,r)===1&&(i=!1),s=a*(o-Number(i))}return s===0?0:s}function sn(t,e,n){const r=en(t,e)/1e3;return tn(n?.roundingMethod)(r)}function un(t){const e=p(t),n=M(t,0);return n.setFullYear(e.getFullYear(),0,1),n.setHours(0,0,0,0),n}const cn={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},dn=(t,e,n)=>{let r;const a=cn[t];return typeof a=="string"?r=a:e===1?r=a.one:r=a.other.replace("{{count}}",e.toString()),n?.addSuffix?n.comparison&&n.comparison>0?"in "+r:r+" ago":r};function J(t){return(e={})=>{const n=e.width?String(e.width):t.defaultWidth;return t.formats[n]||t.formats[t.defaultWidth]}}const ln={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},fn={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},mn={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},hn={date:J({formats:ln,defaultWidth:"full"}),time:J({formats:fn,defaultWidth:"full"}),dateTime:J({formats:mn,defaultWidth:"full"})},gn={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},pn=(t,e,n,r)=>gn[t];function Y(t){return(e,n)=>{const r=n?.context?String(n.context):"standalone";let a;if(r==="formatting"&&t.formattingValues){const s=t.defaultFormattingWidth||t.defaultWidth,i=n?.width?String(n.width):s;a=t.formattingValues[i]||t.formattingValues[s]}else{const s=t.defaultWidth,i=n?.width?String(n.width):t.defaultWidth;a=t.values[i]||t.values[s]}const o=t.argumentCallback?t.argumentCallback(e):e;return a[o]}}const yn={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},bn={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},wn={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},vn={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},xn={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},Dn={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},Mn=(t,e)=>{const n=Number(t),r=n%100;if(r>20||r<10)switch(r%10){case 1:return n+"st";case 2:return n+"nd";case 3:return n+"rd"}return n+"th"},On={ordinalNumber:Mn,era:Y({values:yn,defaultWidth:"wide"}),quarter:Y({values:bn,defaultWidth:"wide",argumentCallback:t=>t-1}),month:Y({values:wn,defaultWidth:"wide"}),day:Y({values:vn,defaultWidth:"wide"}),dayPeriod:Y({values:xn,defaultWidth:"wide",formattingValues:Dn,defaultFormattingWidth:"wide"})};function C(t){return(e,n={})=>{const r=n.width,a=r&&t.matchPatterns[r]||t.matchPatterns[t.defaultMatchWidth],o=e.match(a);if(!o)return null;const s=o[0],i=r&&t.parsePatterns[r]||t.parsePatterns[t.defaultParseWidth],d=Array.isArray(i)?kn(i,c=>c.test(s)):Sn(i,c=>c.test(s));let f;f=t.valueCallback?t.valueCallback(d):d,f=n.valueCallback?n.valueCallback(f):f;const u=e.slice(s.length);return{value:f,rest:u}}}function Sn(t,e){for(const n in t)if(Object.prototype.hasOwnProperty.call(t,n)&&e(t[n]))return n}function kn(t,e){for(let n=0;n<t.length;n++)if(e(t[n]))return n}function Pn(t){return(e,n={})=>{const r=e.match(t.matchPattern);if(!r)return null;const a=r[0],o=e.match(t.parsePattern);if(!o)return null;let s=t.valueCallback?t.valueCallback(o[0]):o[0];s=n.valueCallback?n.valueCallback(s):s;const i=e.slice(a.length);return{value:s,rest:i}}}const En=/^(\d+)(th|st|nd|rd)?/i,Tn=/\d+/i,Wn={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Yn={any:[/^b/i,/^(a|c)/i]},Cn={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},Fn={any:[/1/i,/2/i,/3/i,/4/i]},Nn={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},_n={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},jn={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},$n={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},In={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Rn={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},An={ordinalNumber:Pn({matchPattern:En,parsePattern:Tn,valueCallback:t=>parseInt(t,10)}),era:C({matchPatterns:Wn,defaultMatchWidth:"wide",parsePatterns:Yn,defaultParseWidth:"any"}),quarter:C({matchPatterns:Cn,defaultMatchWidth:"wide",parsePatterns:Fn,defaultParseWidth:"any",valueCallback:t=>t+1}),month:C({matchPatterns:Nn,defaultMatchWidth:"wide",parsePatterns:_n,defaultParseWidth:"any"}),day:C({matchPatterns:jn,defaultMatchWidth:"wide",parsePatterns:$n,defaultParseWidth:"any"}),dayPeriod:C({matchPatterns:In,defaultMatchWidth:"any",parsePatterns:Rn,defaultParseWidth:"any"})},Pt={code:"en-US",formatDistance:dn,formatLong:hn,formatRelative:pn,localize:On,match:An,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Hn(t){const e=p(t);return Ge(e,un(e))+1}function Ln(t){const e=p(t),n=+H(e)-+Je(e);return Math.round(n/Ot)+1}function Et(t,e){const n=p(t),r=n.getFullYear(),a=_(),o=e?.firstWeekContainsDate??e?.locale?.options?.firstWeekContainsDate??a.firstWeekContainsDate??a.locale?.options?.firstWeekContainsDate??1,s=M(t,0);s.setFullYear(r+1,0,o),s.setHours(0,0,0,0);const i=F(s,e),d=M(t,0);d.setFullYear(r,0,o),d.setHours(0,0,0,0);const f=F(d,e);return n.getTime()>=i.getTime()?r+1:n.getTime()>=f.getTime()?r:r-1}function qn(t,e){const n=_(),r=e?.firstWeekContainsDate??e?.locale?.options?.firstWeekContainsDate??n.firstWeekContainsDate??n.locale?.options?.firstWeekContainsDate??1,a=Et(t,e),o=M(t,0);return o.setFullYear(a,0,r),o.setHours(0,0,0,0),F(o,e)}function Xn(t,e){const n=p(t),r=+F(n,e)-+qn(n,e);return Math.round(r/Ot)+1}function g(t,e){const n=t<0?"-":"",r=Math.abs(t).toString().padStart(e,"0");return n+r}const S={y(t,e){const n=t.getFullYear(),r=n>0?n:1-n;return g(e==="yy"?r%100:r,e.length)},M(t,e){const n=t.getMonth();return e==="M"?String(n+1):g(n+1,2)},d(t,e){return g(t.getDate(),e.length)},a(t,e){const n=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return n.toUpperCase();case"aaa":return n;case"aaaaa":return n[0];case"aaaa":default:return n==="am"?"a.m.":"p.m."}},h(t,e){return g(t.getHours()%12||12,e.length)},H(t,e){return g(t.getHours(),e.length)},m(t,e){return g(t.getMinutes(),e.length)},s(t,e){return g(t.getSeconds(),e.length)},S(t,e){const n=e.length,r=t.getMilliseconds(),a=Math.trunc(r*Math.pow(10,n-3));return g(a,e.length)}},T={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},it={G:function(t,e,n){const r=t.getFullYear()>0?1:0;switch(e){case"G":case"GG":case"GGG":return n.era(r,{width:"abbreviated"});case"GGGGG":return n.era(r,{width:"narrow"});case"GGGG":default:return n.era(r,{width:"wide"})}},y:function(t,e,n){if(e==="yo"){const r=t.getFullYear(),a=r>0?r:1-r;return n.ordinalNumber(a,{unit:"year"})}return S.y(t,e)},Y:function(t,e,n,r){const a=Et(t,r),o=a>0?a:1-a;if(e==="YY"){const s=o%100;return g(s,2)}return e==="Yo"?n.ordinalNumber(o,{unit:"year"}):g(o,e.length)},R:function(t,e){const n=St(t);return g(n,e.length)},u:function(t,e){const n=t.getFullYear();return g(n,e.length)},Q:function(t,e,n){const r=Math.ceil((t.getMonth()+1)/3);switch(e){case"Q":return String(r);case"QQ":return g(r,2);case"Qo":return n.ordinalNumber(r,{unit:"quarter"});case"QQQ":return n.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return n.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return n.quarter(r,{width:"wide",context:"formatting"})}},q:function(t,e,n){const r=Math.ceil((t.getMonth()+1)/3);switch(e){case"q":return String(r);case"qq":return g(r,2);case"qo":return n.ordinalNumber(r,{unit:"quarter"});case"qqq":return n.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return n.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return n.quarter(r,{width:"wide",context:"standalone"})}},M:function(t,e,n){const r=t.getMonth();switch(e){case"M":case"MM":return S.M(t,e);case"Mo":return n.ordinalNumber(r+1,{unit:"month"});case"MMM":return n.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return n.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return n.month(r,{width:"wide",context:"formatting"})}},L:function(t,e,n){const r=t.getMonth();switch(e){case"L":return String(r+1);case"LL":return g(r+1,2);case"Lo":return n.ordinalNumber(r+1,{unit:"month"});case"LLL":return n.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return n.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return n.month(r,{width:"wide",context:"standalone"})}},w:function(t,e,n,r){const a=Xn(t,r);return e==="wo"?n.ordinalNumber(a,{unit:"week"}):g(a,e.length)},I:function(t,e,n){const r=Ln(t);return e==="Io"?n.ordinalNumber(r,{unit:"week"}):g(r,e.length)},d:function(t,e,n){return e==="do"?n.ordinalNumber(t.getDate(),{unit:"date"}):S.d(t,e)},D:function(t,e,n){const r=Hn(t);return e==="Do"?n.ordinalNumber(r,{unit:"dayOfYear"}):g(r,e.length)},E:function(t,e,n){const r=t.getDay();switch(e){case"E":case"EE":case"EEE":return n.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return n.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return n.day(r,{width:"short",context:"formatting"});case"EEEE":default:return n.day(r,{width:"wide",context:"formatting"})}},e:function(t,e,n,r){const a=t.getDay(),o=(a-r.weekStartsOn+8)%7||7;switch(e){case"e":return String(o);case"ee":return g(o,2);case"eo":return n.ordinalNumber(o,{unit:"day"});case"eee":return n.day(a,{width:"abbreviated",context:"formatting"});case"eeeee":return n.day(a,{width:"narrow",context:"formatting"});case"eeeeee":return n.day(a,{width:"short",context:"formatting"});case"eeee":default:return n.day(a,{width:"wide",context:"formatting"})}},c:function(t,e,n,r){const a=t.getDay(),o=(a-r.weekStartsOn+8)%7||7;switch(e){case"c":return String(o);case"cc":return g(o,e.length);case"co":return n.ordinalNumber(o,{unit:"day"});case"ccc":return n.day(a,{width:"abbreviated",context:"standalone"});case"ccccc":return n.day(a,{width:"narrow",context:"standalone"});case"cccccc":return n.day(a,{width:"short",context:"standalone"});case"cccc":default:return n.day(a,{width:"wide",context:"standalone"})}},i:function(t,e,n){const r=t.getDay(),a=r===0?7:r;switch(e){case"i":return String(a);case"ii":return g(a,e.length);case"io":return n.ordinalNumber(a,{unit:"day"});case"iii":return n.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return n.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return n.day(r,{width:"short",context:"formatting"});case"iiii":default:return n.day(r,{width:"wide",context:"formatting"})}},a:function(t,e,n){const a=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"aaa":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return n.dayPeriod(a,{width:"narrow",context:"formatting"});case"aaaa":default:return n.dayPeriod(a,{width:"wide",context:"formatting"})}},b:function(t,e,n){const r=t.getHours();let a;switch(r===12?a=T.noon:r===0?a=T.midnight:a=r/12>=1?"pm":"am",e){case"b":case"bb":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"bbb":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return n.dayPeriod(a,{width:"narrow",context:"formatting"});case"bbbb":default:return n.dayPeriod(a,{width:"wide",context:"formatting"})}},B:function(t,e,n){const r=t.getHours();let a;switch(r>=17?a=T.evening:r>=12?a=T.afternoon:r>=4?a=T.morning:a=T.night,e){case"B":case"BB":case"BBB":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"BBBBB":return n.dayPeriod(a,{width:"narrow",context:"formatting"});case"BBBB":default:return n.dayPeriod(a,{width:"wide",context:"formatting"})}},h:function(t,e,n){if(e==="ho"){let r=t.getHours()%12;return r===0&&(r=12),n.ordinalNumber(r,{unit:"hour"})}return S.h(t,e)},H:function(t,e,n){return e==="Ho"?n.ordinalNumber(t.getHours(),{unit:"hour"}):S.H(t,e)},K:function(t,e,n){const r=t.getHours()%12;return e==="Ko"?n.ordinalNumber(r,{unit:"hour"}):g(r,e.length)},k:function(t,e,n){let r=t.getHours();return r===0&&(r=24),e==="ko"?n.ordinalNumber(r,{unit:"hour"}):g(r,e.length)},m:function(t,e,n){return e==="mo"?n.ordinalNumber(t.getMinutes(),{unit:"minute"}):S.m(t,e)},s:function(t,e,n){return e==="so"?n.ordinalNumber(t.getSeconds(),{unit:"second"}):S.s(t,e)},S:function(t,e){return S.S(t,e)},X:function(t,e,n){const r=t.getTimezoneOffset();if(r===0)return"Z";switch(e){case"X":return ct(r);case"XXXX":case"XX":return E(r);case"XXXXX":case"XXX":default:return E(r,":")}},x:function(t,e,n){const r=t.getTimezoneOffset();switch(e){case"x":return ct(r);case"xxxx":case"xx":return E(r);case"xxxxx":case"xxx":default:return E(r,":")}},O:function(t,e,n){const r=t.getTimezoneOffset();switch(e){case"O":case"OO":case"OOO":return"GMT"+ut(r,":");case"OOOO":default:return"GMT"+E(r,":")}},z:function(t,e,n){const r=t.getTimezoneOffset();switch(e){case"z":case"zz":case"zzz":return"GMT"+ut(r,":");case"zzzz":default:return"GMT"+E(r,":")}},t:function(t,e,n){const r=Math.trunc(t.getTime()/1e3);return g(r,e.length)},T:function(t,e,n){const r=t.getTime();return g(r,e.length)}};function ut(t,e=""){const n=t>0?"-":"+",r=Math.abs(t),a=Math.trunc(r/60),o=r%60;return o===0?n+String(a):n+String(a)+e+g(o,2)}function ct(t,e){return t%60===0?(t>0?"-":"+")+g(Math.abs(t)/60,2):E(t,e)}function E(t,e=""){const n=t>0?"-":"+",r=Math.abs(t),a=g(Math.trunc(r/60),2),o=g(r%60,2);return n+a+e+o}const dt=(t,e)=>{switch(t){case"P":return e.date({width:"short"});case"PP":return e.date({width:"medium"});case"PPP":return e.date({width:"long"});case"PPPP":default:return e.date({width:"full"})}},Tt=(t,e)=>{switch(t){case"p":return e.time({width:"short"});case"pp":return e.time({width:"medium"});case"ppp":return e.time({width:"long"});case"pppp":default:return e.time({width:"full"})}},Qn=(t,e)=>{const n=t.match(/(P+)(p+)?/)||[],r=n[1],a=n[2];if(!a)return dt(t,e);let o;switch(r){case"P":o=e.dateTime({width:"short"});break;case"PP":o=e.dateTime({width:"medium"});break;case"PPP":o=e.dateTime({width:"long"});break;case"PPPP":default:o=e.dateTime({width:"full"});break}return o.replace("{{date}}",dt(r,e)).replace("{{time}}",Tt(a,e))},Vn={p:Tt,P:Qn},zn=/^D+$/,Bn=/^Y+$/,Gn=["D","DD","YY","YYYY"];function Jn(t){return zn.test(t)}function Un(t){return Bn.test(t)}function Kn(t,e,n){const r=Zn(t,e,n);if(console.warn(r),Gn.includes(t))throw new RangeError(r)}function Zn(t,e,n){const r=t[0]==="Y"?"years":"days of the month";return`Use \`${t.toLowerCase()}\` instead of \`${t}\` (in \`${e}\`) for formatting ${r} to the input \`${n}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const tr=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,er=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,nr=/^'([^]*?)'?$/,rr=/''/g,ar=/[a-zA-Z]/;function mr(t,e,n){const r=_(),a=n?.locale??r.locale??Pt,o=n?.firstWeekContainsDate??n?.locale?.options?.firstWeekContainsDate??r.firstWeekContainsDate??r.locale?.options?.firstWeekContainsDate??1,s=n?.weekStartsOn??n?.locale?.options?.weekStartsOn??r.weekStartsOn??r.locale?.options?.weekStartsOn??0,i=p(t);if(!Ke(i))throw new RangeError("Invalid time value");let d=e.match(er).map(u=>{const c=u[0];if(c==="p"||c==="P"){const l=Vn[c];return l(u,a.formatLong)}return u}).join("").match(tr).map(u=>{if(u==="''")return{isToken:!1,value:"'"};const c=u[0];if(c==="'")return{isToken:!1,value:or(u)};if(it[c])return{isToken:!0,value:u};if(c.match(ar))throw new RangeError("Format string contains an unescaped latin alphabet character `"+c+"`");return{isToken:!1,value:u}});a.localize.preprocessor&&(d=a.localize.preprocessor(i,d));const f={firstWeekContainsDate:o,weekStartsOn:s,locale:a};return d.map(u=>{if(!u.isToken)return u.value;const c=u.value;(!n?.useAdditionalWeekYearTokens&&Un(c)||!n?.useAdditionalDayOfYearTokens&&Jn(c))&&Kn(c,e,String(t));const l=it[c[0]];return l(i,c,a.localize,f)}).join("")}function or(t){const e=t.match(nr);return e?e[1].replace(rr,"'"):t}function sr(t,e,n){const r=_(),a=n?.locale??r.locale??Pt,o=2520,s=R(t,e);if(isNaN(s))throw new RangeError("Invalid time value");const i=Object.assign({},n,{addSuffix:n?.addSuffix,comparison:s});let d,f;s>0?(d=p(e),f=p(t)):(d=p(t),f=p(e));const u=sn(f,d),c=(q(f)-q(d))/1e3,l=Math.round((u-c)/60);let m;if(l<2)return n?.includeSeconds?u<5?a.formatDistance("lessThanXSeconds",5,i):u<10?a.formatDistance("lessThanXSeconds",10,i):u<20?a.formatDistance("lessThanXSeconds",20,i):u<40?a.formatDistance("halfAMinute",0,i):u<60?a.formatDistance("lessThanXMinutes",1,i):a.formatDistance("xMinutes",1,i):l===0?a.formatDistance("lessThanXMinutes",1,i):a.formatDistance("xMinutes",l,i);if(l<45)return a.formatDistance("xMinutes",l,i);if(l<90)return a.formatDistance("aboutXHours",1,i);if(l<st){const y=Math.round(l/60);return a.formatDistance("aboutXHours",y,i)}else{if(l<o)return a.formatDistance("xDays",1,i);if(l<$){const y=Math.round(l/st);return a.formatDistance("xDays",y,i)}else if(l<$*2)return m=Math.round(l/$),a.formatDistance("aboutXMonths",m,i)}if(m=on(f,d),m<12){const y=Math.round(l/$);return a.formatDistance("xMonths",y,i)}else{const y=m%12,x=Math.trunc(m/12);return y<3?a.formatDistance("aboutXYears",x,i):y<9?a.formatDistance("overXYears",x,i):a.formatDistance("almostXYears",x+1,i)}}function hr(t,e){return sr(t,tt(t),e)}function gr(t){return kt(t,tt(t))}function ir(t,e){return Ve(t,-1)}function pr(t){return kt(t,ir(tt(t)))}export{cr as F,Y as a,J as b,C as c,Pn as d,fr as e,lr as f,mr as g,hr as h,gr as i,pr as j,b as n,Ye as s,dr as z};
