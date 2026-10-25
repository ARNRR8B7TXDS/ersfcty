(function(){
var T=window.THREE,$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,fa=function(n){return Number(n).toLocaleString('fa-IR')},root=document.documentElement;
var P={x:0,y:0};
try{if(window.Antigravity)Antigravity($('#ag'),{count:innerWidth<700?600:1300,colors:['#c98a4b','#f3e6d0','#4fb3a9'],particleSize:innerWidth<700?1.1:.9,ambient:.3,maxDevicePixelRatio:1.5})}catch(e){console.warn('Antigravity',e)}
addEventListener('pointermove',function(e){P.x=e.clientX/innerWidth*2-1;P.y=e.clientY/innerHeight*2-1;if(!reduce){root.style.setProperty('--mx',P.x.toFixed(2));root.style.setProperty('--my',P.y.toFixed(2))}});
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('on')},2200)}

/* ---------- nav, progress, reveal ---------- */
var burger=$('.burger'),links=$('#links');
burger.onclick=function(){var o=links.classList.toggle('open');burger.setAttribute('aria-expanded',o)};
links.onclick=function(){links.classList.remove('open');burger.setAttribute('aria-expanded','false')};
var prog=$('#prog');
function sp(){var h=root.scrollHeight-innerHeight;prog.style.transform='scaleX('+(h>0?scrollY/h:0)+')'}
addEventListener('scroll',sp,{passive:true});sp();
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
$$('.reveal').forEach(function(el){io.observe(el)});
var as=$$('.nav-links a');
var nio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&$('.nav-links a[href="#'+e.target.id+'"]')){as.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id)})}})},{threshold:.25});
$$('main section[id]').forEach(function(s){nio.observe(s)});
var tr=$('.track');tr.innerHTML+=tr.innerHTML;

/* ---------- counters ---------- */
var cio=new IntersectionObserver(function(es){es.forEach(function(e){
  if(!e.isIntersecting)return;cio.unobserve(e.target);
  $$('b',e.target).forEach(function(b){
    var to=+b.dataset.to,dec=+b.dataset.dec||0,suf=b.dataset.suf||'',t0=performance.now();
    (function f(t){var k=reduce?1:Math.min(1,(t-t0)/1400),v=to*(1-Math.pow(1-k,3));
      b.textContent=Number(v).toLocaleString('fa-IR',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf;
      if(k<1)requestAnimationFrame(f)})(t0);
  });
})},{threshold:.4});
cio.observe($('#stats'));

/* ---------- menu tabs + card tilt ---------- */
$$('.tab').forEach(function(b){b.onclick=function(){
  $$('.tab').forEach(function(x){x.classList.toggle('on',x===b)});
  $$('.card').forEach(function(c){var ok=b.dataset.f==='all'||c.dataset.cat===b.dataset.f;c.hidden=!ok;c.classList.remove('show');if(ok){void c.offsetWidth;c.classList.add('show')}});
}});
$$('.card').forEach(function(c){
  c.addEventListener('pointermove',function(e){var b=c.getBoundingClientRect();c.style.setProperty('--rx',-((e.clientY-b.top)/b.height-.5)*10+'deg');c.style.setProperty('--ry',((e.clientX-b.left)/b.width-.5)*12+'deg')});
  c.addEventListener('pointerleave',function(){c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')});
});

/* ---------- cart ---------- */
var cart={},drawer=$('#drawer'),scrim=$('#scrim');
function money(n){return fa(n)+' ریال'}
function render(){
  var q=0,sum=0,h='';
  Object.keys(cart).forEach(function(id){var i=cart[id];q+=i.q;sum+=i.q*i.p;
    h+='<div class="row"><img src="'+i.img+'" alt=""><div><h4>'+i.n+'</h4><small>'+money(i.p)+'</small></div><div class="qty"><button data-a="dec" data-id="'+id+'" aria-label="کم کردن">−</button><span>'+fa(i.q)+'</span><button data-a="inc" data-id="'+id+'" aria-label="زیاد کردن">+</button></div></div>'});
  $('#d-list').innerHTML=h||'<p class="empty">سبد خالی است. از منو یک قهوه انتخاب کن.</p>';
  $('#total').textContent=money(sum);
  var b=$('#cart-count');b.textContent=fa(q);b.classList.add('pop');setTimeout(function(){b.classList.remove('pop')},250);
}
function add(id){
  var c=$('.card[data-id="'+id+'"]');if(!c)return;
  var i=cart[id]||(cart[id]={n:c.dataset.name,p:+c.dataset.price,img:$('img',c).getAttribute('src'),q:0});
  i.q++;render();toast(i.n+' به سبد اضافه شد');
}
function dr(o){drawer.classList.toggle('open',o);scrim.classList.toggle('open',o);drawer.setAttribute('aria-hidden',!o)}
$$('.add').forEach(function(b){b.onclick=function(){add(b.closest('.card').dataset.id)}});
$('#cart-btn').onclick=function(){dr(true)};
scrim.onclick=$('#d-close').onclick=function(){dr(false)};
addEventListener('keydown',function(e){if(e.key==='Escape')dr(false)});
$('#d-list').onclick=function(e){
  var b=e.target.closest('button');if(!b)return;var i=cart[b.dataset.id];
  if(b.dataset.a==='inc')i.q++;else if(--i.q<=0)delete cart[b.dataset.id];
  render();
};
$('#checkout').onclick=function(){
  if(!Object.keys(cart).length){toast('سبد خالی است');return}
  cart={};render();dr(false);toast('سفارش ثبت شد (نسخهٔ نمایشی)');
};
render();

/* ---------- promo, gallery, newsletter, reviews ---------- */
$('#copy').onclick=function(){
  var t=$('#code').textContent;
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast('کد تخفیف کپی شد')},function(){toast('کد تخفیف: '+t)});
};
var lb=$('#lb');
$$('.g').forEach(function(g){g.onclick=function(){var im=$('img',g);$('img',lb).src=im.src;$('img',lb).alt=im.alt;if(lb.showModal)lb.showModal()}});
lb.onclick=function(){lb.close()};
$('#news').onsubmit=function(e){e.preventDefault();e.target.reset();toast('عضو خبرنامه شدی. ممنون!')};
var sl=$('#slides'),rv=$$('.rv',sl),dots=$('#dots');
rv.forEach(function(r,i){var d=document.createElement('button');d.setAttribute('aria-label','نظر '+fa(i+1));d.onclick=function(){r.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})};dots.appendChild(d)});
function act(){
  var c=sl.getBoundingClientRect(),m=c.left+c.width/2,best=0,bd=1e9;
  rv.forEach(function(r,i){var b=r.getBoundingClientRect(),d=Math.abs(b.left+b.width/2-m);if(d<bd){bd=d;best=i}});
  $$('button',dots).forEach(function(d,i){d.classList.toggle('on',i===best)});
}
sl.addEventListener('scroll',act,{passive:true});act();

/* ---------- quiz ---------- */
var steps=[{q:'کدام طعم را بیشتر دوست داری؟',a:[['خامه‌ای و ملایم','milk'],['پررنگ و شکلاتی','choc']]},{q:'صبح‌هایت چطور می‌گذرد؟',a:[['آرام','soft'],['انرژی می‌خواهم','strong']]}];
var RES={'milk-soft':5,'milk-strong':1,'choc-soft':3,'choc-strong':4};
var qt=$('#q-text'),qo=$('#q-opts'),ans=[];
function q(i){
  if(i>=steps.length){
    var id=RES[ans.join('-')],c=$('.card[data-id="'+id+'"]');
    qt.textContent='نوشیدنی تو: '+c.dataset.name;
    qo.innerHTML='<div class="q-res"><img class="q-img" src="'+$('img',c).getAttribute('src')+'" alt="'+c.dataset.name+'"><div class="q-opts" id="q-b"></div></div>';
    var a=document.createElement('button');a.className='btn';a.textContent='افزودن به سبد';a.onclick=function(){add(id)};
    var r=document.createElement('button');r.className='opt';r.textContent='دوباره امتحان کن';r.onclick=function(){ans=[];q(0)};
    $('#q-b').appendChild(a);$('#q-b').appendChild(r);return;
  }
  qt.textContent=steps[i].q;qo.innerHTML='';
  steps[i].a.forEach(function(o){var b=document.createElement('button');b.className='opt';b.textContent=o[0];b.onclick=function(){ans.push(o[1]);q(i+1)};qo.appendChild(b)});
}
$('#q-start').onclick=function(){q(0)};

/* ---------- 3D ---------- */
function tex(c,rib,tc){
  var k=document.createElement('canvas');k.width=1024;k.height=256;var x=k.getContext('2d');
  x.fillStyle=c;x.fillRect(0,0,1024,256);
  if(rib)for(var i=0;i<1024;i+=14){x.fillStyle='rgba(0,0,0,.3)';x.fillRect(i,0,5,256);x.fillStyle='rgba(255,255,255,.07)';x.fillRect(i+5,0,3,256)}
  x.fillStyle=tc;x.font='800 110px Montserrat,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('BODRĒN',512,132);
  return new T.CanvasTexture(k);
}
function V(a){return a.map(function(p){return new T.Vector2(p[0],p[1])})}
function cup(o){
  var g=new T.Group(),H=2.8,r0=.72,r1=1,t0=.16,t1=.72;
  g.add(new T.Mesh(new T.LatheGeometry(V([[0,-H/2],[r0,-H/2],[r1,H/2]]),48),new T.MeshStandardMaterial({color:o.body,roughness:.8,side:T.DoubleSide})));
  var ra=r0+(r1-r0)*t0+.012,rb=r0+(r1-r0)*t1+.012;
  var sl=new T.Mesh(new T.CylinderGeometry(rb,ra,H*(t1-t0),64,1,true),new T.MeshStandardMaterial({map:tex(o.sleeve,o.rib,o.txt),roughness:.9}));
  sl.position.y=-H/2+H*(t0+t1)/2;sl.rotation.y=Math.PI;g.add(sl);
  g.add(new T.Mesh(new T.LatheGeometry(V([[1.12,H/2-.05],[1.12,H/2+.08],[1,H/2+.16],[.9,H/2+.3],[.6,H/2+.34],[0,H/2+.34]]),48),new T.MeshStandardMaterial({color:o.lid,roughness:.45,side:T.DoubleSide})));
  return g;
}
function bean(s){
  var g=new T.Group(),a=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color:0x5a3220,roughness:.45}));a.scale.set(.55,.85,.42);
  var b=new T.Mesh(new T.SphereGeometry(1,16,8),new T.MeshStandardMaterial({color:0x1d0f08}));b.scale.set(.07,.8,.43);
  g.add(a,b);g.scale.setScalar(s);g.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);return g;
}
function mount(cv,build){
  var r=new T.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
  r.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.5:2));
  var sc=new T.Scene(),cam=new T.PerspectiveCamera(35,1,.1,100);cam.position.z=12;
  sc.add(new T.AmbientLight(0xffe8cc,.55));
  var d=new T.DirectionalLight(0xfff0dc,.95);d.position.set(3,5,6);sc.add(d);
  var p=new T.PointLight(0xd8923f,.8,30);p.position.set(-5,2,-3);sc.add(p);
  var st={t:0,vis:true,w:1,h:1},api=build(sc,cv);
  function size(){var w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();st.h=2*Math.tan(cam.fov*Math.PI/360)*12;st.w=st.h*cam.aspect;api.layout(st)}
  new ResizeObserver(size).observe(cv);size();
  new IntersectionObserver(function(e){st.vis=e[0].isIntersecting}).observe(cv);
  var c=new T.Clock();
  (function loop(){requestAnimationFrame(loop);if(!st.vis)return;st.t=reduce?0:c.getElapsedTime();api.tick(st);r.render(sc,cam)})();
}
function init(){
  if(!T)return;
  try{
  mount($('#hero3d'),function(sc,cv){
        var B=[[-.46,.1,1.5,.55],[-.47,-.28,2.2,.7],[-.2,-.42,1,.5],[.46,.34,0,.4],[.02,.46,-1,.3],[.4,-.42,2,.5],[-.05,.2,2.5,.35],[-.3,.38,-2,.3]].map(function(b){var m=bean(b[3]);sc.add(m);return{m:m,b:b}});
    return{layout:function(s){
      var wide=s.w/s.h>1;
      B.forEach(function(o){o.m.position.set(o.b[0]*s.w,o.b[1]*s.h,o.b[2]);o.m.scale.setScalar(o.b[3]*(wide?1:.5))});
    },tick:function(s){
      B.forEach(function(o,i){o.m.rotation.x+=.003;o.m.rotation.y+=.004;o.m.position.y=o.b[1]*s.h+Math.sin(s.t+i)*.1});
    }};
  });
  mount($('#about3d'),function(sc,cv){
    var grp=new T.Group();sc.add(grp);
    var c=cup({body:0xe9d6b2,sleeve:'#3b2116',rib:1,txt:'#d9b88a',lid:0x2a1810});c.scale.setScalar(1.45);grp.add(c);
    [[2.4,-2,1,.5],[3,-1.3,0,.35],[-2.6,1.7,1,.3],[2.6,1.8,-1,.28],[-2.8,-1.8,2,.45]].forEach(function(b){var m=bean(b[3]);m.position.set(b[0],b[1],b[2]);grp.add(m)});
    var ry=0,drag=false,lx=0;
    cv.addEventListener('pointerdown',function(e){drag=true;lx=e.clientX;cv.style.cursor='grabbing'});
    addEventListener('pointerup',function(){drag=false;cv.style.cursor='grab'});
    addEventListener('pointermove',function(e){if(drag){ry+=(e.clientX-lx)*.012;lx=e.clientX}});
    return{layout:function(s){grp.scale.setScalar(Math.min(1,s.w/5.6,s.h/6.4))},tick:function(s){if(!drag&&!reduce)ry+=.004;grp.rotation.y=ry;grp.rotation.x=.08;c.position.y=Math.sin(s.t)*.07}};
  });
  }catch(e){console.warn('WebGL unavailable',e)}
}
(document.fonts&&document.fonts.load?document.fonts.load('800 110px Montserrat','BODRĒN'):Promise.resolve()).then(init,init);

/* ---------- circular carousel ---------- */
var ccHost=$('#cc'),cc=null,ccSmall=null,ccTimer=0;
function buildCC(){
  if(!window.CircularCarousel||!ccHost)return;
  var small=innerWidth<700;
  if(cc&&small===ccSmall)return;
  if(cc)cc.destroy();
  ccSmall=small;
  var cats={hot:'نوشیدنی گرم',cold:'نوشیدنی سرد',beans:'دانهٔ قهوه'};
  var items=$$('.card').map(function(c){var im=$('img',c);return{src:im.getAttribute('src'),alt:im.alt,title:c.dataset.name,subtitle:cats[c.dataset.cat]||''}});
  ccHost.innerHTML='';
  var box=document.createElement('div');box.style.cssText='width:100%;height:100%';ccHost.appendChild(box);
  cc=CircularCarousel(box,{items:items,cardWidth:small?150:230,aspectRatio:.8,gap:small?14:25,cornerRadius:18,fadeColor:'#1d110b',captions:true,speed:12});
}
try{buildCC()}catch(e){console.warn('Carousel',e)}
addEventListener('resize',function(){clearTimeout(ccTimer);ccTimer=setTimeout(function(){try{buildCC()}catch(e){}},200)});
})();
