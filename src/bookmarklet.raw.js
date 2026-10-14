(function(){
var APP="__APP__";
var old=document.getElementById('k3d-overlay');if(old){old.remove();}
function abs(u){try{return new URL(u,location.href).href}catch(e){return ''}}
function txt(e){return e?(e.innerText||e.textContent||'').replace(/\s+/g,' ').trim():''}
function imgSrc(i){var s=i.currentSrc||i.getAttribute('src')||i.getAttribute('data-src')||i.getAttribute('data-lazy-src')||'';
if(!s||/^data:/.test(s)){var ss=i.getAttribute('srcset')||i.getAttribute('data-srcset')||'';if(ss){s=ss.split(',')[0].trim().split(' ')[0];}}
return abs(s)}
var BAD=/logo|icon|sprite|payment|flag|badge|trust|banner|avatar|spinner|placeholder|pixel|klarna|ideal|visa/i;
function big(i){var r=i.getBoundingClientRect();return r.width>=48&&r.height>=48}
function good(i){return big(i)&&!BAD.test((i.src||'')+(i.className||'')+(i.alt||''))}
var items=[],seen={};
function push(o,checked){if(!o.image||!o.name||seen[o.image])return;seen[o.image]=1;o.checked=checked;items.push(o)}
function container(i){var e=i,best=i.parentElement||i;
for(var n=0;n<7&&e.parentElement;n++){e=e.parentElement;var imgs=e.querySelectorAll('img'),c=0;
for(var k=0;k<imgs.length;k++){if(good(imgs[k]))c++}
if(c>1)break;best=e}return best}
function fromImg(i){var c=container(i),t=txt(c),a=i.closest('a')||c.querySelector('a[href]');
var name=(i.alt||'').trim();
if(name.length<3){var h=c.querySelector('h1,h2,h3,h4,[class*=title i],[class*=name i],a');name=txt(h).slice(0,120)}
if(!name)name=(i.title||'').trim();
var pm=t.match(/(?:€|EUR|\$|£)\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{2})\s?(?:€|EUR)/);
var sm=t.match(/(?:maat|size|mt\.?)\s*:?\s*(XXS|XS|S|M|L|XL|XXL|3XL|\d{2,3})\b/i);
var cm=t.match(/(?:kleur|color|colour)\s*:?\s*([A-Za-zÀ-ÿ\-]+(?: [A-Za-zÀ-ÿ\-]+)?)/i);
return{name:name,image:imgSrc(i),price:pm?pm[0]:'',size:sm?sm[1].toUpperCase():'',color:cm?cm[1]:'',url:a&&a.getAttribute('href')?abs(a.getAttribute('href')):location.href,text:t.slice(0,240)}}
var sel='[class*="cart" i],[id*="cart" i],[class*="basket" i],[id*="basket" i],[class*="winkelmand" i],[id*="winkelmand" i],[class*="winkelwagen" i],[id*="winkelwagen" i],[class*="minibag" i],[class*="checkout" i]';
var roots=[].slice.call(document.querySelectorAll(sel)),cartImgs=[];
roots.forEach(function(r){[].slice.call(r.querySelectorAll('img')).forEach(function(i){if(good(i)&&cartImgs.indexOf(i)<0)cartImgs.push(i)})});
cartImgs.forEach(function(i){push(fromImg(i),true)});
[].slice.call(document.querySelectorAll('script[type="application/ld+json"]')).forEach(function(s){
try{var j=JSON.parse(s.textContent);var arr=[].concat(j,j&&j['@graph']||[]);
arr.forEach(function(p){if(p&&/Product/.test([].concat(p['@type']).join(','))){
var im=[].concat(p.image||[])[0];if(im&&im.url)im=im.url;var of=[].concat(p.offers||[])[0]||{};
push({name:p.name,image:abs(im||''),price:of.price?(of.priceCurrency||'€')+' '+of.price:'',size:'',color:p.color||'',url:location.href,text:(p.description||'').slice(0,200)},!items.length)}})}catch(e){}});
if(items.length<2){[].slice.call(document.images).filter(good).slice(0,24).forEach(function(i){var o=fromImg(i);if(o.name)push(o,false)})}
function b64(s){return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
var ov=document.createElement('div');ov.id='k3d-overlay';
ov.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(20,20,24,.6);display:flex;align-items:center;justify-content:center;font:14px/1.4 system-ui,sans-serif';
var box=document.createElement('div');
box.style.cssText='background:#fff;color:#1b1b1d;border-radius:14px;width:min(560px,94vw);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)';
var hd=document.createElement('div');hd.style.cssText='padding:16px 18px;border-bottom:1px solid #eee;font-weight:700;font-size:16px';
hd.textContent='3D-paskamer: kies de kleding die je wilt passen';box.appendChild(hd);
var ul=document.createElement('div');ul.style.cssText='overflow:auto;padding:8px 12px;flex:1';
if(!items.length){ul.innerHTML='<p style="padding:12px">Geen producten gevonden op deze pagina. Open je winkelmand of een productpagina en probeer opnieuw.</p>'}
items.forEach(function(it){var row=document.createElement('label');
row.style.cssText='display:flex;gap:10px;align-items:center;padding:8px 6px;border-bottom:1px solid #f1f1f1;cursor:pointer';
var cb=document.createElement('input');cb.type='checkbox';cb.checked=!!it.checked;it.cb=cb;
var im=document.createElement('img');im.src=it.image;im.referrerPolicy='no-referrer';im.style.cssText='width:52px;height:64px;object-fit:cover;border-radius:6px;background:#eee';
var tx=document.createElement('div');tx.style.cssText='flex:1;min-width:0';
tx.innerHTML='<div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div><div style="color:#666;font-size:12px"></div>';
tx.firstChild.textContent=it.name;tx.lastChild.textContent=[it.price,it.size&&('maat '+it.size),it.color].filter(Boolean).join(' · ');
row.appendChild(cb);row.appendChild(im);row.appendChild(tx);ul.appendChild(row)});
box.appendChild(ul);
var ft=document.createElement('div');ft.style.cssText='padding:12px 16px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eee';
function btn(t,p){var b=document.createElement('button');b.textContent=t;b.style.cssText='border:0;border-radius:9px;padding:10px 16px;font:600 14px system-ui;cursor:pointer;'+(p?'background:#1b1b1d;color:#fff':'background:#eee;color:#222');return b}
var no=btn('Annuleren',0),go=btn('Naar 3D-paskamer →',1);
no.onclick=function(){ov.remove()};
go.onclick=function(){var sel=items.filter(function(i){return i.cb.checked}).map(function(i){return{name:i.name,image:i.image,price:i.price,size:i.size,color:i.color,url:i.url,text:i.text}});
if(!sel.length){alert('Vink minstens één item aan.');return}
window.open(APP+'#cart='+b64(JSON.stringify({v:1,site:location.hostname,items:sel})),'_blank');ov.remove()};
ft.appendChild(no);ft.appendChild(go);box.appendChild(ft);ov.appendChild(box);
ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
document.body.appendChild(ov);
})();
