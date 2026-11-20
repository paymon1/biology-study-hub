(() => {
"use strict";
const script=document.currentScript;
if(!("serviceWorker" in navigator)||!script?.src)return;
const base=new URL("../../",script.src);
window.addEventListener("load",()=>navigator.serviceWorker.register(new URL("service-worker.js",base),{scope:base.pathname}).catch(error=>console.warn("زیست‌یار: ثبت حالت آفلاین ناموفق بود.",error)));
let installEvent=null,banner=null;
const dismissedKey="zistyar:pwa-install-dismissed:v1";
const standalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
function hide(){banner?.remove();banner=null;}
function show(){
if(standalone||banner||localStorage.getItem(dismissedKey)==="yes")return;
banner=document.createElement("aside");banner.className="zy-install-banner";banner.setAttribute("role","status");
const message=document.createElement("span");message.textContent="زیست‌یار را به صفحهٔ اصلی اضافه کن تا مثل یک اپ باز شود.";
const install=document.createElement("button");install.type="button";install.textContent="نصب زیست‌یار";
install.addEventListener("click",async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;hide();});
const close=document.createElement("button");close.type="button";close.className="zy-install-close";close.setAttribute("aria-label","بستن");close.textContent="×";
close.addEventListener("click",()=>{localStorage.setItem(dismissedKey,"yes");hide();});
banner.append(message,install,close);document.body.appendChild(banner);
}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installEvent=event;show();});
window.addEventListener("appinstalled",()=>{installEvent=null;hide();});
})();