/* every page opens at its top unless the link points at an anchor */
(function(){if(location.hash)return;try{history.scrollRestoration='manual'}catch(e){}
var moved=false;function stop(){moved=true}
['wheel','touchstart','keydown','mousedown'].forEach(function(n){addEventListener(n,stop,{passive:true,once:true})});
function up(){if(!moved&&(window.pageYOffset||document.documentElement.scrollTop))window.scrollTo(0,0)}
up();document.addEventListener('DOMContentLoaded',up);addEventListener('load',up);addEventListener('pageshow',up);
[60,200,500,1000].forEach(function(ms){setTimeout(up,ms)})})();
(function(){
  var root=document.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce&&'IntersectionObserver' in window)root.classList.add('js');

  /* older pages still carry the retired "six hands" wording in their menus: rewrite it */
  [].forEach.call(document.querySelectorAll('[data-en]'),function(el){
    var e=el.getAttribute('data-en');if(e.indexOf('ix hands')<0)return;
    var r=el.getAttribute('data-ru')||'';
    e=e.replace('music, archive, six hands','music and archive').replace('Music, archive, six hands','Music and archive').replace(/^Six hands$/,'Studio');
    r=r.replace('музыка, архив, шесть рук','музыка и архив').replace('Музыка, архив, шесть рук','Музыка и архив').replace(/^Шесть рук$/,'Студия');
    el.setAttribute('data-en',e);el.setAttribute('data-ru',r);el.innerHTML=e;
  });

  /* language */
  var en=document.getElementById('btn-en'),ru=document.getElementById('btn-ru');
  function setLang(l){
    root.lang=l;window.DY_LANG=l;
    document.querySelectorAll('[data-'+l+']').forEach(function(el){el.innerHTML=el.getAttribute('data-'+l)});
    if(en){en.setAttribute('aria-pressed',l==='en');ru.setAttribute('aria-pressed',l==='ru')}
    try{localStorage.setItem('dy-lang',l)}catch(e){}
    document.dispatchEvent(new CustomEvent('dy-lang',{detail:l}));
  }
  window.DY_LANG='en';
  if(en){en.addEventListener('click',function(){setLang('en')});ru.addEventListener('click',function(){setLang('ru')})}
  var saved=null;try{saved=localStorage.getItem('dy-lang')}catch(e){}
  /* v9: re-flow headings after web fonts load */
  try{document.fonts&&document.fonts.ready.then(function(){root.classList.add('fl');void document.body.offsetHeight;root.classList.remove('fl')})}catch(e){}
  /* v9: Russian-speaking browsers open in Russian until the visitor picks a language */
  if(!saved){try{var nl=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']);
    for(var i=0;i<nl.length;i++){var c=String(nl[i]).toLowerCase().slice(0,2);if(c==='ru'||c==='uk'||c==='be'||c==='kk'){saved='ru';break}if(c==='en')break}}catch(e){}}
  if(saved==='ru')setLang('ru');
  /* v9: Telegram first for Russian visitors, WhatsApp first in English */
  function tgOrder(){var r=window.DY_LANG==='ru';document.querySelectorAll('.c-tg').forEach(function(tg){var p=tg.parentNode;if(!p)return;
    if(r){if(p.firstElementChild!==tg)p.insertBefore(tg,p.firstElementChild)}else{var wa=p.querySelector('.c-wa');if(wa&&wa.nextElementSibling!==tg)p.insertBefore(tg,wa.nextElementSibling)}})}
  document.addEventListener('dy-lang',tgOrder);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tgOrder);else tgOrder();

  /* type: local woff2 with font-display:swap, the page is never hidden.
     If the local files are missing (a host that did not get fonts/), fall back to Google Fonts once. */
  root.classList.add('fr');
  (function(){var f=document.fonts;if(!f||!f.ready)return;
    f.ready.then(function(){setTimeout(function(){var bad=false;
      try{f.forEach(function(x){if(x.status==='error'&&/Unbounded|Manrope/.test(x.family))bad=true})}catch(e){}
      if(!bad||document.getElementById('gf-fallback'))return;
      var l=document.createElement('link');l.id='gf-fallback';l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Unbounded:wght@300..800&family=Cormorant+Garamond:ital,wght@1,500..700&family=Manrope:wght@400..800&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(l)},50)});
  })();

  /* skip link moves the focus too */
  var sk=document.querySelector('a.skip');
  if(sk)sk.addEventListener('click',function(){var m=document.getElementById((sk.getAttribute('href')||'#main').slice(1));if(m){m.setAttribute('tabindex','-1');try{m.focus({preventScroll:true})}catch(e){m.focus()}}});

  /* nav turns solid after the first screen starts to scroll */
  var nav=document.querySelector('.nav');
  function onScroll(){if(nav)nav.classList.toggle('solid',scrollY>40)}
  addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* mobile menu */
  var mb=document.querySelector('.menu-btn'),mn=document.getElementById('mnav');
  /* v8x F3: the button reads Menu / Close, Esc and a tap on the empty part of the overlay close it */
  if(mb&&mn){
    var mlab=function(o){var e=o?'Close':'Menu',r=o?'Закрыть':'Меню';mb.setAttribute('data-en',e);mb.setAttribute('data-ru',r);mb.textContent=window.DY_LANG==='ru'?r:e};
    var mset=function(o){mn.classList.toggle('open',o);mb.setAttribute('aria-expanded',o?'true':'false');document.body.style.overflow=o?'hidden':'';document.body.classList.toggle('menu-open',o);mlab(o)};
    mb.addEventListener('click',function(){mset(!mn.classList.contains('open'))});
    mn.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mset(false)})});
    mn.addEventListener('click',function(e){if(e.target===mn||e.target.classList.contains('mn-pri')||e.target.classList.contains('mn-cta'))mset(false)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&mn.classList.contains('open')){mset(false);mb.focus()}});
    /* a page without its own contact block sends "Start a project" to the one on the home page */
    var ms=mn.querySelector('.mn-start');if(ms&&!document.getElementById('contact'))ms.setAttribute('href','index.html#contact');
  }

  /* reveal on scroll */
  if(root.classList.contains('js')){
    var rio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.rv').forEach(function(el){rio.observe(el)});
  }

  /* chapter rail + mobile pill */
  var chapters=[].slice.call(document.querySelectorAll('.chapter[id]'));
  var rail=document.querySelector('.rail'),pill=document.querySelector('.pill');
  if(chapters.length&&'IntersectionObserver' in window){
    var links=[].slice.call(document.querySelectorAll('.rail a,.pill-menu a'));
    var cur=pill&&pill.querySelector('.cur');
    var cio=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return;
      var id=e.target.id;
      links.forEach(function(a){a.classList.toggle('active',a.getAttribute('href')==='#'+id)});
      if(cur){var a=pill.querySelector('.pill-menu a[href="#'+id+'"]');if(a)cur.innerHTML=a.innerHTML}
    })},{rootMargin:'-45% 0px -50% 0px'});
    chapters.forEach(function(s){cio.observe(s)});
    var first=chapters[0],last=document.querySelector('.next-case')||chapters[chapters.length-1];
    function railVis(){
      var on=first.getBoundingClientRect().top<innerHeight*.6&&last.getBoundingClientRect().top>innerHeight*.5;
      if(rail)rail.classList.toggle('show',on);
      if(pill){pill.classList.toggle('show',on);if(!on)pill.classList.remove('open')}
    }
    addEventListener('scroll',railVis,{passive:true});railVis();
    if(pill){
      pill.querySelector('button').addEventListener('click',function(){pill.classList.toggle('open')});
      pill.querySelectorAll('.pill-menu a').forEach(function(a){a.addEventListener('click',function(){pill.classList.remove('open')})});
    }
  }

  /* lightbox */
  var figs=[].slice.call(document.querySelectorAll('.row figure img,.work img'));
  if(figs.length){
    var lb=document.createElement('div');lb.className='lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');
    lb.innerHTML='<img alt=""><button class="x" type="button">Close ✕</button><button class="pv" type="button" aria-label="Previous">←</button><button class="nx" type="button" aria-label="Next">→</button><span class="ct mono"></span>';
    document.body.appendChild(lb);
    /* v8x F3: the lightbox speaks the page language */
    var lbT=function(){var r=window.DY_LANG==='ru';lb.querySelector('.x').textContent=r?'Закрыть ✕':'Close ✕';
      lb.querySelector('.pv').setAttribute('aria-label',r?'Предыдущий кадр':'Previous');lb.querySelector('.nx').setAttribute('aria-label',r?'Следующий кадр':'Next');lb.setAttribute('aria-label',r?'Просмотр кадра':'Picture viewer')};
    lbT();document.addEventListener('dy-lang',lbT);
    var lim=lb.querySelector('img'),ct=lb.querySelector('.ct'),i=0;
    function show(k){i=(k+figs.length)%figs.length;lim.src=figs[i].getAttribute('data-full')||figs[i].getAttribute('data-lz')||figs[i].currentSrc||figs[i].src;ct.textContent=(i+1)+' / '+figs.length}
    function open(k){show(k);lb.classList.add('open');document.body.style.overflow='hidden';lb.querySelector('.x').focus()}
    function close(){lb.classList.remove('open');document.body.style.overflow=''}
    figs.forEach(function(im,k){im.parentNode.addEventListener('click',function(){open(k)})});
    lb.querySelector('.x').addEventListener('click',close);
    lb.querySelector('.pv').addEventListener('click',function(e){e.stopPropagation();show(i-1)});
    lb.querySelector('.nx').addEventListener('click',function(e){e.stopPropagation();show(i+1)});
    lb.addEventListener('click',function(e){if(e.target===lb)close()});
    document.addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
  }
})();

/* folders + project cards: flip through frames on hover; folders open in place */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.flip[data-imgs]').forEach(function(el){
    var list=el.dataset.imgs.split(',').filter(Boolean);if(list.length<2)return;
    var img=el.querySelector('img'),cnt=el.querySelector('.cnt'),i=0,timer=null,N=list.length;
    function show(k){i=(k+N)%N;img.style.transform='translateX('+(-i*100/N)+'%)';if(cnt)cnt.textContent=(i+1)+'/'+N}
    function start(){if(reduce)return;stop();show(i+1);timer=setInterval(function(){show(i+1)},650)}
    function stop(){if(timer){clearInterval(timer);timer=null}}
    el.addEventListener('pointerenter',function(e){if(e.pointerType!=='touch')start()});
    el.addEventListener('pointerleave',function(e){if(e.pointerType==='touch')return;stop();show(0)});
    /* phones and tablets: the tile in the middle of the screen flips by itself */
    if(matchMedia('(hover: none)').matches&&'IntersectionObserver' in window){
      new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting)start();else stop()})},{rootMargin:'-30% 0px -30% 0px'}).observe(el);
    }
  });
  var folders=[].slice.call(document.querySelectorAll('.folder'));
  function open(f,scroll){folders.forEach(function(x){if(x!==f){x.classList.remove('open');x.querySelector('.fhead').setAttribute('aria-expanded','false')}});
    var o=f.classList.toggle('open');f.querySelector('.fhead').setAttribute('aria-expanded',o);
    if(o&&scroll)setTimeout(function(){f.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})},60);
    try{history.replaceState(null,'',o?'#'+f.id:location.pathname)}catch(e){}}
  folders.forEach(function(f){f.querySelector('.fhead').addEventListener('click',function(){open(f,true)})});
  var h=location.hash.slice(1);var f0=h&&document.getElementById(h);if(f0&&f0.classList.contains('folder'))open(f0,true);
})();

/* photo index: category tabs */
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.ptab'));if(!tabs.length)return;
  tabs.forEach(function(b){b.addEventListener('click',function(){if(b.disabled)return;var c=b.dataset.cat;
    tabs.forEach(function(x){x.classList.toggle('on',x===b)});
    document.querySelectorAll('.psec').forEach(function(r){r.hidden=!(c==='all'||r.dataset.cat===c)})})});
})();

/* home doors: hover flips through the world's pictures */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.hd2-img[data-set]').forEach(function(box){
    var list=box.dataset.set.split(',');if(list.length<2||reduce)return;
    var a=box.querySelector('img:not(.b)'),b=box.querySelector('img.b'),i=0,t=null,pre=false,card=box.closest('.hd2');
    function step(){i=(i+1)%list.length;var front=box.classList.contains('swap')?b:a,back=front===a?b:a;back.src=list[i];
      var go=function(){box.classList.toggle('swap',back===b)};if(back.complete)go();else back.onload=go}
    function start(){if(!pre){list.forEach(function(s){var p=new Image();p.src=s});pre=true}stop();step();t=setInterval(step,900)}
    function stop(){if(t){clearInterval(t);t=null}}
    card.addEventListener('pointerenter',function(e){if(e.pointerType!=='touch')start()});
    card.addEventListener('pointerleave',function(){stop();i=0;a.src=list[0];box.classList.remove('swap')});
    if(matchMedia('(hover: none)').matches&&'IntersectionObserver' in window)
      new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting)start();else stop()})},{rootMargin:'-30% 0px -30% 0px'}).observe(card);
  });
})();

/* archive gate */
(function(){
  var g=document.getElementById('agate');if(!g)return;
  var ok=false;try{ok=localStorage.getItem('dy-18')==='1'}catch(e){}
  if(ok){g.hidden=true;return}
  document.body.style.overflow='hidden';
  document.getElementById('agate-yes').addEventListener('click',function(){g.hidden=true;document.body.style.overflow='';try{localStorage.setItem('dy-18','1')}catch(e){}});
})();
/* home chapters: pictures change on their own while the chapter is on screen */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.chap-img[data-set]').forEach(function(box){
    var list=box.dataset.set.split(',');if(list.length<2||reduce||!('IntersectionObserver' in window))return;
    var a=box.querySelector('img:not(.b)'),b=box.querySelector('img.b'),i=0,t=null,pre=false;
    function step(){i=(i+1)%list.length;var front=box.classList.contains('swap')?b:a,back=front===a?b:a;back.src=list[i];
      var go=function(){box.classList.toggle('swap',back===b)};if(back.complete)go();else back.onload=go}
    new IntersectionObserver(function(es){es.forEach(function(x){
      if(x.isIntersecting){if(!pre){list.forEach(function(s){var p=new Image();p.src=s});pre=true}if(!t)t=setInterval(step,1800)}
      else if(t){clearInterval(t);t=null}})},{threshold:.35}).observe(box);
  });
})();
/* in-page anchors: scroll smoothly below the sticky bars, also inside the artifact frame */
(function(){
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;
    var id=a.getAttribute('href').slice(1);if(!id)return;var el=document.getElementById(id);if(!el)return;
    e.preventDefault();var off=(document.querySelector('.ctabs')?150:90);
    var jump=function(){window.scrollTo(0,Math.max(0,el.getBoundingClientRect().top+window.pageYOffset-off))};
    jump();setTimeout(jump,250);setTimeout(jump,700);
    try{history.replaceState(null,'','#'+id)}catch(_){}
  });
  /* horizontal bars scroll with the mouse wheel too */
  [].forEach.call(document.querySelectorAll('.ctabs-in,.chips'),function(b){
    b.addEventListener('wheel',function(e){if(b.scrollWidth>b.clientWidth&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){b.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
  });
  if(location.hash){var t=document.getElementById(location.hash.slice(1));if(t)setTimeout(function(){window.scrollTo({top:t.getBoundingClientRect().top+window.pageYOffset-150})},300)}
})();

/* the Studio hub is retired: drop its links */
(function(){[].forEach.call(document.querySelectorAll('a[href="worlds.html"]'),function(a){a.remove()})})();

/* titles never break inside a word: shrink the title until its longest word fits */
(function(){
  function fit(){[].forEach.call(document.querySelectorAll('h1,h2'),function(h){
    h.style.removeProperty('font-size');h.style.overflowWrap='normal';h.style.wordBreak='normal';h.style.hyphens='manual';
    var s=parseFloat(getComputedStyle(h).fontSize),n=0;
    while(h.scrollWidth>h.clientWidth+1&&s>20&&n++<40){s*=.95;h.style.setProperty('font-size',s+'px','important')}
  })}
  var t;function later(){clearTimeout(t);t=setTimeout(fit,120)}
  fit();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
  addEventListener('resize',later);document.addEventListener('dy-lang',later);
})();

/* tiles flip through a project's frames by themselves; the cover always stays underneath */
(function(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
[].forEach.call(document.querySelectorAll('figure.flip'),function(f,k){
  var sl=[].slice.call(f.querySelectorAll('img.sl')),ok=[],cur=-1,vis=!('IntersectionObserver' in window),started=false;
  function load(){if(started)return;started=true;sl.forEach(function(x){x.addEventListener('load',function(){if(x.naturalWidth){ok.push(x);if(ok.length===1&&cur===-1)setTimeout(step,900)}});x.src=x.getAttribute('data-src')})}
  function step(){if(!vis||document.hidden||!ok.length)return;var n=cur+1;if(n>=ok.length)n=-1;ok.forEach(function(x,i){x.classList.toggle('on',i===n)});cur=n}
  if('IntersectionObserver' in window){new IntersectionObserver(function(e){vis=e[e.length-1].isIntersecting;if(vis)load()},{threshold:.1,rootMargin:'300px 0px'}).observe(f)}else load();
  setTimeout(function(){setInterval(step,2600)},(k%6)*400)})})();
/* silent loops play only while they are on screen */
(function(){var v=[].slice.call(document.querySelectorAll('video[data-auto]'));if(!v.length)return;
  if(!('IntersectionObserver' in window)){v.forEach(function(x){x.play()});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){var x=e.target;if(e.isIntersecting){var p=x.play();if(p&&p.catch)p.catch(function(){})}else x.pause()})},{threshold:.25});
  v.forEach(function(x){x.muted=true;io.observe(x)})})();

/* contact: a short brief the visitor fills in and sends in one tap, by WhatsApp or email (no server: v8x F3) */
(function(){
  var box=document.querySelector('.contact .wrap');if(!box||box.querySelector('.brief'))return;
  var MAIL='dashayastrebova@gmail.com',WA='79055674129';
  var T={en:{h:'Quick brief',need:'What do you need?',opts:['Commercial or music video','AI brand world','AI ad with music','Photo campaign','Artist cover or clip','Something else'],
    about:'A few words about the project',name:'Name and company',when:'Deadline',budget:'Budget, USD or EUR',reach:'Your email, WhatsApp or Telegram',
    wa:'Send via WhatsApp',mail:'Send by email',copy:'Copy the brief',
    sentWa:'WhatsApp opens with your brief. Press send there and I will reply.',sentMail:'Your email app opens with the brief. Press send there and I will reply.',
    done:'Copied. Paste it into WhatsApp, an email to '+MAIL+' or an Instagram DM.',fail:'Select the text below and copy it:',empty:'Pick what you need or write a few words first.',noreach:'Leave an email, WhatsApp or Telegram so I can reply.',
    l:{need:'Need',about:'Project',name:'From',when:'Deadline',budget:'Budget',reach:'Contact'},subj:'New project',hi:'Hello Dasha! A brief from your site:'},
   ru:{h:'Бриф за минуту',need:'Что нужно?',opts:['Реклама или клип','AI-мир бренда','AI-ролик с музыкой','Фотокампания','Обложка или клип артисту','Другое'],
    about:'Пара слов о проекте',name:'Имя и компания',when:'Срок',budget:'Бюджет, ₽',reach:'Ваша почта, WhatsApp или Telegram',
    wa:'Отправить в WhatsApp',mail:'Отправить на почту',copy:'Скопировать бриф',
    sentWa:'Откроется WhatsApp с готовым брифом. Нажмите «Отправить», и я отвечу.',sentMail:'Откроется почта с готовым брифом. Нажмите «Отправить», и я отвечу.',
    done:'Скопировано. Вставьте в WhatsApp, в письмо на '+MAIL+' или в директ Instagram.',fail:'Выделите текст ниже и скопируйте:',empty:'Сначала выберите, что нужно, или напишите пару слов.',noreach:'Оставьте почту, WhatsApp или Telegram, чтобы я могла ответить.',
    l:{need:'Нужно',about:'Проект',name:'От',when:'Срок',budget:'Бюджет',reach:'Связь'},subj:'Новый проект',hi:'Здравствуйте, Даша! Бриф с сайта:'}};
  var f=document.createElement('form');f.className='brief';f.noValidate=true;
  f.innerHTML='<h3 class="br-h"></h3><div class="br-q"></div><div class="br-opts" role="group"></div>'+
    '<label><span></span><textarea name="about" rows="3"></textarea></label>'+
    '<div class="br-2"><label><span></span><input name="name" autocomplete="name"></label><label><span></span><input name="when"></label></div>'+
    '<label><span></span><input name="budget"></label>'+
    '<label class="br-reach"><span></span><input name="reach" autocomplete="email" required aria-required="true"></label>'+
    '<div class="br-a"><a class="btn solid br-wa" href="https://wa.me/'+WA+'" target="_blank" rel="noopener"></a><a class="btn br-mail" href="mailto:'+MAIL+'"></a><button type="submit" class="br-copy"></button></div>'+
    '<p class="br-msg" aria-live="polite"></p><textarea class="br-out" readonly hidden rows="6"></textarea>';
  box.appendChild(f);box.classList.add('has-brief');
  var picked=[],opts=f.querySelector('.br-opts'),msg=f.querySelector('.br-msg'),out=f.querySelector('.br-out'),wa=f.querySelector('.br-wa'),ml=f.querySelector('.br-mail'),rc=f.elements.reach;
  function lang(){return window.DY_LANG==='ru'?'ru':'en'}
  function draw(){var t=T[lang()],sp=f.querySelectorAll('label span');
    f.querySelector('.br-h').textContent=t.h;f.querySelector('.br-q').textContent=t.need;
    opts.innerHTML='';t.opts.forEach(function(o,i){var b=document.createElement('button');b.type='button';b.className='br-o'+(picked.indexOf(i)>-1?' on':'');b.textContent=o;b.setAttribute('aria-pressed',picked.indexOf(i)>-1);
      b.addEventListener('click',function(){var k=picked.indexOf(i);if(k>-1)picked.splice(k,1);else picked.push(i);draw()});opts.appendChild(b)});
    sp[0].textContent=t.about;sp[1].textContent=t.name;sp[2].textContent=t.when;sp[3].textContent=t.budget;sp[4].textContent=t.reach;
    wa.textContent=t.wa;ml.textContent=t.mail;f.querySelector('.br-copy').textContent=t.copy;sync()}
  function v(n){return (f.elements[n].value||'').trim()}
  function text(){var t=T[lang()],L=[];
    if(picked.length)L.push(t.l.need+': '+picked.slice().sort().map(function(i){return t.opts[i]}).join(', '));
    if(v('about'))L.push(t.l.about+': '+v('about'));if(v('name'))L.push(t.l.name+': '+v('name'));
    if(v('when'))L.push(t.l.when+': '+v('when'));if(v('budget'))L.push(t.l.budget+': '+v('budget'));if(v('reach'))L.push(t.l.reach+': '+v('reach'));return L.join('\n')}
  function sync(){var t=T[lang()],b=text();
    ml.href='mailto:'+MAIL+'?subject='+encodeURIComponent(t.subj)+(b?'&body='+encodeURIComponent(b):'');
    wa.href='https://wa.me/'+WA+(b?'?text='+encodeURIComponent(t.hi+'\n'+b):'')}
  /* the brief must say what is needed and how to answer; otherwise the tap only explains what is missing */
  function check(){var t=T[lang()];out.hidden=true;rc.removeAttribute('aria-invalid');f.classList.remove('br-bad');
    if(!picked.length&&!v('about')){msg.textContent=t.empty;return false}
    if(!v('reach')){msg.textContent=t.noreach;rc.setAttribute('aria-invalid','true');f.classList.add('br-bad');try{rc.focus({preventScroll:false})}catch(_){rc.focus()}return false}
    return true}
  f.addEventListener('input',function(){if(v('reach')){rc.removeAttribute('aria-invalid');f.classList.remove('br-bad')}sync()});
  wa.addEventListener('click',function(e){sync();if(!check()){e.preventDefault();return}msg.textContent=T[lang()].sentWa});
  ml.addEventListener('click',function(e){sync();if(!check()){e.preventDefault();return}msg.textContent=T[lang()].sentMail});
  f.addEventListener('submit',function(e){e.preventDefault();var t=T[lang()],b=text();out.hidden=true;
    if(!check())return;
    function fallback(){msg.textContent=t.fail;out.value=b;out.hidden=false;out.focus();out.select()}
    try{navigator.clipboard.writeText(b).then(function(){msg.textContent=t.done},fallback)}catch(_){fallback()}});
  document.addEventListener('dy-lang',function(){msg.textContent='';draw()});draw();
})();

/* top bar and menu links always navigate, even if something upstream swallows the default click */
(function(){document.addEventListener('click',function(e){
  if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey)return;
  var a=e.target.closest&&e.target.closest('.nav a[href],.mnav a[href],.fnav a[href]');if(!a)return;
  var h=a.getAttribute('href');if(!h||h.charAt(0)==='#'||/^[a-z]+:/i.test(h))return;
  e.preventDefault();window.location.href=a.href;
},true)})();

/* pictures: a soft placeholder first, the real file is fetched only near the screen (1.5 screens ahead).
   Two triggers (IntersectionObserver and a plain scroll check) because the observer margin is ignored inside frames.
   A failed download is retried; a placeholder is never left on screen. */
(function(){var pend=[].slice.call(document.querySelectorAll('img[data-lz]'));if(!pend.length)return;
  var busy=0,MAX=6,q=[],tick=0;
  function near(x){var r=x.getBoundingClientRect();if(!r.width&&!r.height)return null;
    var vh=window.innerHeight||document.documentElement.clientHeight,m=vh*1.5;
    if(r.bottom<-m||r.top>vh+m)return null;
    return r.bottom<0?-r.bottom:(r.top>vh?r.top-vh:0)}
  function want(x){if(x._lz)return;x._lz=1;q.push(x)}
  function pump(){q.sort(function(a,b){return (near(a)||0)-(near(b)||0)});while(busy<MAX&&q.length)get(q.shift())}
  function get(x){busy++;var u=x.getAttribute('data-lz'),t=new Image(),fin=false,slow;
    function end(ok){if(fin)return;fin=true;clearTimeout(slow);busy--;
      if(ok){x.src=u;x.removeAttribute('data-lz');x.classList.add('lz-ok');var k=pend.indexOf(x);if(k>-1)pend.splice(k,1)}
      else{x._n=(x._n||0)+1;x._lz=0;setTimeout(scan,Math.min(15000,1200*x._n))}
      pump()}
    t.onload=function(){end(true)};t.onerror=function(){end(false)};
    /* a stalled request frees its slot; the element keeps loading the same file by itself */
    slow=setTimeout(function(){if(fin)return;fin=true;busy--;x.src=u;x.removeAttribute('data-lz');
      x.addEventListener('error',function(){x.setAttribute('data-lz',u);x._lz=0;x._n=(x._n||0)+1;if(pend.indexOf(x)<0)pend.push(x);setTimeout(scan,3000)},{once:true});
      x.addEventListener('load',function(){x.classList.add('lz-ok');var k=pend.indexOf(x);if(k>-1)pend.splice(k,1)},{once:true});pump()},12000);
    t.src=u}
  function scan(){tick=0;for(var i=0;i<pend.length;i++){var x=pend[i];if(!x._lz&&x.hasAttribute('data-lz')&&near(x)!==null)want(x)}pump()}
  function later(){if(!tick)tick=(window.requestAnimationFrame||setTimeout)(scan)}
  if('IntersectionObserver' in window){try{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)want(e.target)});pump()},{rootMargin:'150% 0px'});
    pend.forEach(function(x){io.observe(x)})}catch(e){}}
  ['scroll','resize','orientationchange','load','pageshow','online','click','dy-lang'].forEach(function(n){(n==='dy-lang'?document:window).addEventListener(n,later,{passive:true})});
  document.addEventListener('scroll',later,{passive:true,capture:true});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)later()});
  /* safety net: tabs, filters and late layout shifts reveal pictures without any scroll event */
  var iv=setInterval(function(){if(!pend.length){clearInterval(iv);return}scan()},1200);
  /* before printing or without a way to measure, load everything */
  addEventListener('beforeprint',function(){pend.slice().forEach(want);pump()});
  scan()})();

/* inline video tiles on section pages */
(function(){[].forEach.call(document.querySelectorAll('.jt.jv'),function(b){var v=b.querySelector('video'),p=b.querySelector('.jv-p');if(!v||!p)return;
p.addEventListener('click',function(){[].forEach.call(document.querySelectorAll('.jv video'),function(o){if(o!==v)o.pause()});v.controls=true;v.play()});
v.addEventListener('play',function(){b.classList.add('on')});v.addEventListener('ended',function(){b.classList.remove('on');v.controls=false;v.load()})})})();

/* v8x F3: eager pictures carry a blurred preview as background (optimize.py); drop it once the file is in */
(function(){[].forEach.call(document.querySelectorAll('img[data-lqbg]'),function(x){
  function done(){if(x.naturalWidth){x.style.backgroundImage='none';x.removeAttribute('data-lqbg')}}
  if(x.complete)done();else x.addEventListener('load',done,{once:true})})})();

  /* v9 home: behind-the-scenes strip loads and plays only while on screen */
(function(){var b=document.querySelector('.bts');if(!b)return;var vs=[].slice.call(b.querySelectorAll('video'));
    function go(v){if(!v.src&&v.dataset.src)v.src=v.dataset.src;v.muted=true;var p=v.play();if(p&&p.catch)p.catch(function(){})}
    if(!('IntersectionObserver' in window)){vs.forEach(go);return}
    var io=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting)go(v);else if(v.src)v.pause()})},{rootMargin:'200px'});
    vs.forEach(function(v){v.addEventListener('stalled',function(){if(!v.paused)return;go(v)});io.observe(v)});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)vs.forEach(function(v){var r=v.getBoundingClientRect();if(v.src&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight)go(v)})})})();

