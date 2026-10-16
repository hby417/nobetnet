/* NöbetNet — Supabase sürümü
   Ayarlar: js/config.js · Veritabanı: supabase/migrations/ (01→04 sırayla)
   Ayrıntılı açıklama: docs/mimari.md

   DOSYA HARİTASI (kodda her bölüm "---------- bölüm adı ----------" yorumuyla başlar)
   AKTİF
     yardımcılar ............ esc, $, trDate, ageOf, opts, yn
     Supabase bağlantısı .... sb (config.js doldurulmamışsa null)
     sabit listeler ......... EDU, LANGS, DLC, PASS, SECTORS, SERVICES
     hero panosu ............ ana sayfadaki örnek vardiya çizelgesi
     giriş / kayıt penceresi  syncDialog, openAuth, form gönderimi (giriş, kayıt, şifre sıfırlama),
                              startSession, enterPanel, leavePanel (oturum açma/kapama)
     tek ekran .............. renderPanel → renderWorkerHome / renderEmployerHome → renderThankYou
     veri erişimi ........... rowToProfile, profileToRow, loadMyProfile, loadMyEmployerProfile, q
     dosya yükleme .......... FILES, uploadFile, removeFile, fileUrl, avatarField, bindAvatar
     işçi: profil formu ..... renderProfile (fotoğraf + CV dahil)
     işveren: profil formu .. renderEmployerProfile (logo dahil)
     başlangıç .............. init (oturum varsa panele geç)
   KAPALI (kod hazır, renderPanel'den çağrılmıyor)
     renderDash (hizmet panosu), renderList (açık görevler), renderInvites (davetler),
     renderCand + runSearch (aday arama), renderJobs (ilanlarım) */
(function(){
  'use strict';
  var esc = function(s){ var d=document.createElement('div'); d.textContent=String(s==null?'':s); return d.innerHTML; };
  var $ = function(id){ return document.getElementById(id); };
  var fmt = function(n){ return Number(n).toLocaleString('tr-TR'); };
  var TODAY = new Date(); TODAY.setHours(0,0,0,0);
  function todayISO(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function valid(d){ return !!d && new Date(d+'T00:00:00') >= TODAY; }
  function trDate(d){ if(!d) return '—'; var p=d.split('-'); return p[2]+'.'+p[1]+'.'+p[0]; }
  function ageOf(d){ if(!d) return ''; var b=new Date(d+'T00:00:00'); var a=TODAY.getFullYear()-b.getFullYear(); var m=TODAY.getMonth()-b.getMonth(); if(m<0||(m===0&&TODAY.getDate()<b.getDate())) a--; return a; }
  function opts(arr,sel,ph){ return (ph!==undefined?'<option value="">'+esc(ph)+'</option>':'')+arr.map(function(a){return '<option'+(a===sel?' selected':'')+'>'+esc(a)+'</option>';}).join(''); }
  function yn(id,v){ return '<select id="'+id+'"><option value="0">Yok</option><option value="1"'+(v?' selected':'')+'>Var</option></select>'; }

  /* ---------- Supabase bağlantısı ---------- */
  var cfg = window.NOBETNET_CONFIG || {};
  var configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/BURAYA/i.test(cfg.SUPABASE_URL+cfg.SUPABASE_ANON_KEY) && window.supabase);
  var sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  /* ---------- sabit listeler ---------- */
  var EDU=['İlköğretim','Ortaöğretim (lise)','Ön lisans','Lisans','Yüksek lisans','Doktora'];
  var COMP=['Yok','Temel','Orta','İleri'];
  var LANGS=['İngilizce','Almanca','Fransızca','Rusça','Arapça','İspanyolca','İtalyanca','Çince','Farsça'];
  var LVL=['Başlangıç (A1–A2)','Orta (B1–B2)','İleri (C1–C2)'];
  var DLC=['A1','A2','A','B1','B','BE','C','CE','D','DE','F','G'];
  var PASS=['Umuma mahsus (bordo)','Hususi (yeşil)','Hizmet (gri)','Diplomatik (siyah)'];
  var MAR=['Bekar','Evli','Boşanmış','Dul'];
  var GEN=['Kadın','Erkek','Belirtmek istemiyorum'];
  var SECTORS=['Site / Apartman yönetimi','AVM / Perakende','Fabrika / Sanayi','Otel / Turizm','Banka / Finans','Hastane / Sağlık','Etkinlik / Organizasyon','Eğitim kurumu','Diğer'];
  var SERVICES=[
    {id:'yk-silahli',name:'Silahlı yakın koruma',icon:'i-shield',armed:true,note:'Kişi ve heyet koruması. Silahlı özel güvenlik kimlik kartı gerekir.'},
    {id:'yk-silahsiz',name:'Silahsız yakın koruma',icon:'i-shield',armed:false,note:'Eşlik ve refakat. Sürücü belgesi ve yabancı dil sık aranır.'},
    {id:'og-silahli',name:'Silahlı özel güvenlik görevlisi',icon:'i-id',armed:true,note:'Banka, fabrika ve kritik tesisler. Silahlı kimlik kartı gerekir.'},
    {id:'og-silahsiz',name:'Silahsız özel güvenlik görevlisi',icon:'i-id',armed:false,note:'Site, AVM, hastane, okul ve etkinlik alanları.'},
    {id:'danisma',name:'Danışma personeli',icon:'i-desk',armed:false,note:'Karşılama ve giriş kontrolü. Bilgisayar ve yabancı dil önemlidir.'},
    {id:'bekci',name:'Bekçi',icon:'i-moon',armed:false,note:'Site, iş yeri ve şantiyede gece nöbeti ve devriye.'},
    {id:'bodyguard',name:'Bodyguard',icon:'i-user',armed:false,note:'Kişisel koruma. Pasaport ve yabancı dil avantaj sağlar.'},
    {id:'sofor',name:'Makam şoförü',icon:'i-car',armed:false,note:'Sürücü belgesi, SRC ve psikoteknik belgesi aranır.'}
  ];
  function svcName(id){ var s=SERVICES.filter(function(x){return x.id===id;})[0]; return s?s.name:''; }

  var state = { user:null, role:'isci', mode:'giris', tab:'dash', profile:null, employerProfile:null, editing:false, jobFilter:{service:'',city:''}, F:{} };
  var navTok = 0, recovering = false;
  function resetF(){ state.F={service:'',edu:'',dl:'',dlClass:'',dlValid:false,src:'',psy:'',pass:'',passType:'',passValid:false,card:'',cardValid:false,comp:'',lang:'',langLevel:''}; }
  resetF();

  /* ---------- hero panosu ---------- */
  var board = [
    ['Site kapısı',[[8,20,'dolu'],[20,24,'acik']]],
    ['AVM devriye',[[0,8,'dolu'],[16,24,'acik']]],
    ['Fabrika girişi',[[6,14,'dolu'],[14,22,'dolu']]],
    ['Etkinlik alanı',[[18,24,'acik']]]
  ];
  $('boardRows').innerHTML = board.map(function(r,ri){
    return '<div class="row"><span>'+esc(r[0])+'</span><div class="track">'+
      r[1].map(function(s,si){
        return '<div class="seg '+s[2]+'" style="left:'+(s[0]/24*100)+'%;width:'+((s[1]-s[0])/24*100)+'%;animation-delay:'+(ri*.12+si*.1)+'s" title="'+s[0]+':00–'+s[1]+':00"></div>';
      }).join('')+'</div></div>';
  }).join('');

  var tt;
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(function(){t.classList.remove('on');},2600); }
  function loading(){ $('tabBody').innerHTML='<p class="muted">Yükleniyor…</p>'; }
  function fail(e){ console.error(e); $('tabBody').innerHTML='<div class="empty">Veriler yüklenemedi. '+esc((e&&e.message)||'')+'</div>'; }
  function trAuthErr(m){
    m=String(m||'');
    if(/invalid login/i.test(m)) return 'E-posta veya şifre hatalı.';
    if(/not confirmed/i.test(m)) return 'E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla.';
    if(/already registered/i.test(m)) return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.';
    if(/rate limit|too many/i.test(m)) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
    if(/password.*(short|least|weak)/i.test(m)) return 'Şifre çok zayıf. En az 8 karakter kullan.';
    return m||'Bir hata oluştu. Tekrar dene.';
  }

  if(!configured){
    var b=document.createElement('div');
    b.style.cssText='background:#B3382C;color:#fff;padding:10px 16px;text-align:center;font-weight:600';
    b.textContent='Supabase ayarı yapılmamış. js/config.js dosyasını doldur (README.md, 3. adım).';
    document.body.insertBefore(b,document.body.firstChild);
  }

  /* ---------- giriş / kayıt penceresi ---------- */
  var dlg = $('authDlg');
  function syncDialog(){
    var m=state.mode;
    var titles={giris:'Giriş yap',kayit:'Kayıt ol',sifre:'Şifremi unuttum',yeni:'Yeni şifre belirle'};
    var submits={giris:'Giriş yap',kayit:'Hesap oluştur',sifre:'Sıfırlama bağlantısı gönder',yeni:'Şifreyi kaydet'};
    $('dlgTitle').textContent=titles[m]; $('submitBtn').textContent=submits[m];
    $('switchMode').textContent = m==='giris' ? 'Hesabın yok mu? Kayıt ol' : (m==='kayit' ? 'Zaten hesabın var mı? Giriş yap' : 'Girişe dön');
    $('roleTabs').hidden = m!=='kayit';
    $('fName').style.display = m==='kayit' ? '' : 'none';
    $('fKvkk').hidden = m!=='kayit';
    $('fEmail').hidden = m==='yeni';
    $('fPass').hidden = m==='sifre';
    $('passLabel').textContent = m==='yeni' ? 'Yeni şifre' : 'Şifre';
    $('forgotBtn').hidden = m!=='giris';
    $('nameLabel').textContent = state.role==='isveren' ? 'Firma adı' : 'Ad soyad';
    document.querySelectorAll('[data-role-tab]').forEach(function(x){ x.setAttribute('aria-pressed', x.dataset.roleTab===state.role?'true':'false'); });
    $('pass').autocomplete = (m==='giris') ? 'current-password' : 'new-password';
    $('authErr').textContent=''; $('authNote').textContent = m==='kayit' ? 'Şifren en az 8 karakter olmalı.' : '';
  }
  function openAuth(mode, role){ state.mode=mode||'giris'; if(role) state.role=role; syncDialog(); if(!dlg.open) dlg.showModal(); }
  document.addEventListener('click', function(e){
    var a=e.target.closest('[data-auth]'); if(a){ openAuth(a.dataset.auth, a.dataset.role); }
    var t=e.target.closest('[data-role-tab]'); if(t){ state.role=t.dataset.roleTab; syncDialog(); }
  });
  $('switchMode').onclick=function(){ state.mode = state.mode==='giris' ? 'kayit' : 'giris'; syncDialog(); };
  $('forgotBtn').onclick=function(){ state.mode='sifre'; syncDialog(); };
  $('closeDlg').onclick=function(){ dlg.close(); };

  $('authForm').addEventListener('submit', async function(e){
    e.preventDefault();
    var err=function(m){ $('authErr').textContent=m; };
    if(!sb) return err('Supabase ayarı yapılmamış. js/config.js dosyasını doldur.');
    var m=state.mode, email=$('email').value.trim(), pass=$('pass').value, name=$('fullName').value.trim();
    if(m!=='yeni' && !/^\S+@\S+\.\S+$/.test(email)) return err('Geçerli bir e-posta adresi yaz.');
    if(m!=='sifre' && pass.length<8) return err('Şifre en az 8 karakter olmalı.');
    if(m==='kayit'){
      if(!name) return err(state.role==='isveren'?'Firma adını yaz.':'Adını ve soyadını yaz.');
      if(!$('kvkk').checked) return err('Devam etmek için aydınlatma metnini onaylaman gerekiyor.');
    }
    var btn=$('submitBtn'); btn.disabled=true;
    try{
      if(m==='giris'){
        var r=await sb.auth.signInWithPassword({email:email,password:pass});
        if(r.error) return err(trAuthErr(r.error.message));
        dlg.close(); $('authForm').reset(); await startSession(r.data.user);
      } else if(m==='kayit'){
        var r2=await sb.auth.signUp({email:email,password:pass,options:{data:{role:state.role,full_name:name}}});
        if(r2.error) return err(trAuthErr(r2.error.message));
        if(r2.data.session){ dlg.close(); $('authForm').reset(); await startSession(r2.data.user); }
        else { $('authNote').textContent='Hesabını oluşturduk. E-postana gelen doğrulama bağlantısına tıkla, sonra giriş yap.'; state.mode='giris'; $('dlgTitle').textContent='Giriş yap'; }
      } else if(m==='sifre'){
        var r3=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
        if(r3.error) return err(trAuthErr(r3.error.message));
        $('authNote').textContent='Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.';
      } else if(m==='yeni'){
        var r4=await sb.auth.updateUser({password:pass});
        if(r4.error) return err(trAuthErr(r4.error.message));
        recovering=false; dlg.close(); $('authForm').reset();
        var s=await sb.auth.getSession(); if(s.data.session) await startSession(s.data.session.user);
        toast('Şifren güncellendi');
      }
    } catch(ex){ err(trAuthErr(ex.message)); }
    finally{ btn.disabled=false; }
  });

  $('logoutBtn').onclick=async function(){ if(sb) await sb.auth.signOut(); state.user=null; state.profile=null; leavePanel(); toast('Çıkış yapıldı'); };
  $('brandLink').onclick=function(e){ if(state.user){ e.preventDefault(); state.tab='dash'; renderPanel(); } };

  async function startSession(authUser){
    var r=await sb.from('profiles').select('*').eq('id',authUser.id).single();
    if(r.error||!r.data){ await sb.auth.signOut(); toast('Hesap bilgilerin okunamadı. Tekrar giriş yap.'); return; }
    state.user={id:authUser.id,email:authUser.email,role:r.data.role,name:r.data.full_name||authUser.email.split('@')[0],
      avatarPath:r.data.avatar_path||'',avatarUrl:''};
    try{ state.user.avatarUrl=await fileUrl('avatar',state.user.avatarPath); }catch(e){}
    state.profile=null; enterPanel();
  }
  function enterPanel(){
    state.tab='dash'; state.jobFilter={service:'',city:''}; resetF();
    $('site').style.display='none'; $('panel').style.display='block';
    $('siteNav').style.display='none'; $('authBtns').hidden=true; $('logoutBtn').hidden=false;
    $('who').textContent=state.user.name+(state.user.role==='isveren'?' · İşveren':' · Görevli');
    paintWhoAv(); window.scrollTo(0,0); renderPanel();
  }
  function leavePanel(){
    navTok++;
    $('site').style.display=''; $('panel').style.display='none';
    $('siteNav').style.display=''; $('authBtns').hidden=false; $('logoutBtn').hidden=true; $('who').textContent=''; $('whoAv').hidden=true;
    window.scrollTo(0,0);
  }

  /* ---------- tek ekran: profil formu / teşekkür ekranı ----------
     Not: İş ilanı listeleme, aday arama ve davet ekranları ilk aşamada
     kapatıldı. Kod aşağıda (renderDash/renderList/renderInvites/renderCand/
     renderJobs) duruyor; ileride açmak için renderPanel içinden tekrar
     çağırman yeterli. */
  $('panelBody').innerHTML='<div id="tabBody"></div>';
  function renderPanel(){
    navTok++; state.editing=false;
    state.user.role==='isci' ? renderWorkerHome() : renderEmployerHome();
  }

  function workerRequired(p){
    return !!(p && p.gender && p.birth && ageOf(p.birth)>=18 && p.marital && p.phone && p.edu && p.computer && p.services.length);
  }
  async function renderWorkerHome(){
    var tok=navTok; loading();
    try{ if(!state.profile) await loadMyProfile(); }catch(e){ return tok===navTok&&fail(e); }
    if(tok!==navTok) return;
    if(workerRequired(state.profile) && !state.editing) return renderThankYou();
    renderProfile();
  }
  async function renderEmployerHome(){
    var tok=navTok; loading();
    try{ if(!state.employerProfile) await loadMyEmployerProfile(); }catch(e){ return tok===navTok&&fail(e); }
    if(tok!==navTok) return;
    var p=state.employerProfile;
    var done = !!(p && p.sector && p.city && p.phone && p.services.length);
    if(done && !state.editing) return renderThankYou();
    renderEmployerProfile();
  }
  function renderThankYou(){
    $('tabBody').innerHTML =
      '<div class="empty" style="text-align:left;padding:36px 28px">'+
      '<h2 style="margin-bottom:10px">Profilin kaydedildi</h2>'+
      '<p>Teşekkürler '+esc(state.user.name)+'. Bilgilerin bize ulaştı, ekibimiz en kısa sürede seninle iletişime geçecek.</p>'+
      '<button class="btn small" style="margin-top:16px" id="editProfBtn">Bilgilerimi düzenle</button></div>';
    $('editProfBtn').onclick=function(){ state.editing=true; renderPanel(); };
  }

  /* ---------- veri erişimi ---------- */
  function rowToProfile(r){
    if(!r) return null;
    return {gender:r.gender||'',birth:r.birth_date||'',marital:r.marital||'',phone:r.phone||'',edu:r.education||'',computer:r.computer||'',langs:r.languages||[],
      dl:{has:!!r.dl_has,cls:r.dl_classes||[],exp:r.dl_exp||''},src:!!r.src,psy:!!r.psycho,
      pass:{has:!!r.pass_has,type:r.pass_type||'',exp:r.pass_exp||''},card:{has:!!r.card_has,type:r.card_type||'',exp:r.card_exp||''},services:r.services||[],
      cv:{path:r.cv_path||'',name:r.cv_name||''}};
  }
  function profileToRow(q,uid){
    return {user_id:uid,gender:q.gender,birth_date:q.birth,marital:q.marital,phone:q.phone,education:q.edu,computer:q.computer,
      languages:q.langs,lang_keys:q.langs.map(function(l){return l.lang+':'+LVL.indexOf(l.level);}),
      dl_has:q.dl.has,dl_classes:q.dl.has?q.dl.cls:[],dl_exp:q.dl.has?q.dl.exp:null,src:q.src,psycho:q.psy,
      pass_has:q.pass.has,pass_type:q.pass.has?q.pass.type:null,pass_exp:q.pass.has?q.pass.exp:null,
      card_has:q.card.has,card_type:q.card.has?q.card.type:null,card_exp:q.card.has?q.card.exp:null,
      services:q.services,updated_at:new Date().toISOString()};
  }
  async function loadMyProfile(){
    var r=await sb.from('worker_profiles').select('*').eq('user_id',state.user.id).maybeSingle();
    if(r.error) throw r.error;
    state.profile=rowToProfile(r.data); return state.profile;
  }
  function rowToEmployerProfile(r){
    if(!r) return {sector:'',city:'',phone:'',services:[]};
    return {sector:r.sector||'',city:r.city||'',phone:r.phone||'',services:r.services||[]};
  }
  async function loadMyEmployerProfile(){
    var r=await sb.from('employer_profiles').select('*').eq('user_id',state.user.id).maybeSingle();
    if(r.error) throw r.error;
    state.employerProfile=rowToEmployerProfile(r.data); return state.employerProfile;
  }
  async function q(p){ var r=await p; if(r.error) throw r.error; return r.data; }

  /* ---------- dosya yükleme (Supabase Storage) ----------
     Kurulum: supabase/migrations/02_dosyalar.sql. Dosyalar <kullanıcı id>/ klasörüne yazılır,
     bucket'lar gizlidir; görüntülemek için süreli (signed) bağlantı üretilir. */
  var FILES={
    avatar:{bucket:'avatars',max:2*1024*1024,types:{jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'},
      err:'Fotoğraf JPG, PNG veya WEBP olmalı ve 2 MB’ı geçmemeli.'},
    cv:{bucket:'cvs',max:5*1024*1024,types:{pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},
      err:'CV dosyası PDF, DOC veya DOCX olmalı ve 5 MB’ı geçmemeli.'}
  };
  async function uploadFile(kind,file){
    var c=FILES[kind], ext=(file.name.split('.').pop()||'').toLowerCase();
    if(!c.types[ext] || file.size>c.max) throw new Error(c.err);
    var path=state.user.id+'/'+kind+'-'+Date.now()+'.'+ext;
    var r=await sb.storage.from(c.bucket).upload(path,file,{contentType:c.types[ext]});
    if(r.error) throw r.error;
    return path;
  }
  function removeFile(kind,path){ if(path) sb.storage.from(FILES[kind].bucket).remove([path]).catch(function(){}); }
  async function fileUrl(kind,path){
    if(!path) return '';
    var r=await sb.storage.from(FILES[kind].bucket).createSignedUrl(path,3600);
    return (r.data&&r.data.signedUrl)||'';
  }
  function paintWhoAv(){ var a=$('whoAv'); a.hidden=!(state.user&&state.user.avatarUrl); if(!a.hidden) a.src=state.user.avatarUrl; }

  /* Profil fotoğrafı / firma logosu alanı: hem görevli hem işveren formunda kullanılır */
  function avatarField(isLogo){
    return '<div class="full avatar-field"><div class="avatar'+(isLogo?' logo':'')+'" id="avPrev"></div><div>'+
      '<label for="avFile" style="margin-top:0">'+(isLogo?'Firma logosu':'Profil fotoğrafı')+'</label>'+
      '<input type="file" id="avFile" accept="image/jpeg,image/png,image/webp" hidden>'+
      '<div class="acts"><button type="button" class="btn ghost small" id="avPick"></button><button type="button" class="linkbtn" id="avDel">Kaldır</button></div>'+
      '<p class="hint">JPG, PNG veya WEBP, en fazla 2 MB.'+(isLogo?'':' Yüzünün net göründüğü, vesikalık tarzı bir fotoğraf seç.')+'</p>'+
      '<div class="err" id="avErr" role="alert"></div></div></div>';
  }
  function bindAvatar(){
    var u=state.user;
    function paint(){
      $('avPrev').innerHTML = u.avatarUrl ? '<img src="'+esc(u.avatarUrl)+'" alt="Profil fotoğrafın">' : '<svg aria-hidden="true"><use href="#i-user"/></svg>';
      $('avPick').textContent = u.avatarPath ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle';
      $('avDel').hidden = !u.avatarPath;
    }
    paint();
    $('avPick').onclick=function(){ $('avFile').click(); };
    $('avFile').onchange=async function(){
      var file=this.files[0]; this.value=''; if(!file) return;
      $('avErr').textContent=''; $('avPick').disabled=true; $('avPick').textContent='Yükleniyor…';
      try{
        var path=await uploadFile('avatar',file);
        await q(sb.from('profiles').update({avatar_path:path}).eq('id',u.id));
        removeFile('avatar',u.avatarPath);
        u.avatarPath=path; u.avatarUrl=await fileUrl('avatar',path);
        paintWhoAv(); toast('Fotoğraf yüklendi');
      }catch(ex){ $('avErr').textContent='Yüklenemedi: '+ex.message; }
      $('avPick').disabled=false; paint();
    };
    $('avDel').onclick=async function(){
      if(!confirm('Fotoğraf kaldırılsın mı?')) return;
      try{
        await q(sb.from('profiles').update({avatar_path:null}).eq('id',u.id));
        removeFile('avatar',u.avatarPath);
        u.avatarPath=''; u.avatarUrl=''; paintWhoAv(); paint(); toast('Fotoğraf kaldırıldı');
      }catch(ex){ $('avErr').textContent='Kaldırılamadı: '+ex.message; }
    };
  }

  /* ---------- hizmetler panosu (şu an kapalı) ---------- */
  function completion(){
    var p=state.profile; if(!p) return 0;
    var f=[state.user.name,p.gender,p.birth,p.marital,p.phone,state.user.email,p.edu,p.services.length,p.computer];
    return Math.round(f.filter(Boolean).length/f.length*100);
  }
  async function renderDash(){
    var tok=navTok, u=state.user, w=u.role==='isci'; loading();
    try{
      var counts={}, extra='';
      if(w){
        var res=await Promise.all([q(sb.from('jobs').select('service')), loadMyProfile(),
          sb.from('invites').select('id',{count:'exact',head:true}).eq('worker_id',u.id).eq('status','bekliyor')]);
        res[0].forEach(function(j){ counts[j.service]=(counts[j.service]||0)+1; });
        var pending=res[2].count||0;
        if(pending) extra='<div class="empty" style="margin-bottom:18px;text-align:left"><b>'+pending+' yeni davetin var.</b> <button class="linkbtn" data-tab-go="invites">Davetlerimi gör</button></div>';
      } else {
        (await q(sb.rpc('candidate_service_counts'))).forEach(function(r){ counts[r.service]=Number(r.n); });
      }
      if(tok!==navTok) return;
      var pc=completion();
      var head = w
        ? '<div class="head"><div><h2>Hizmetler</h2><p>Merhaba '+esc(u.name)+'. Bir hizmet seç, o alandaki açık görevleri gör.</p></div>'+
          '<div style="min-width:250px"><b>Profil '+pc+'% tamamlandı</b><div class="prog"><i style="width:'+pc+'%"></i></div><button class="btn small" data-tab-go="profile">'+(pc?'Profili düzenle':'Profili doldur')+'</button></div></div>'
        : '<div class="head"><div><h2>Hizmetler</h2><p>'+esc(u.name)+' için bir hizmet seç, o alana uygun adayları filtrele.</p></div></div>';
      $('tabBody').innerHTML=head+extra+
        '<p class="muted" style="margin-bottom:14px">Sol kenarı kalın çizgili hizmetler silahlı görevdir.</p>'+
        '<div class="tiles">'+SERVICES.map(function(s){
          var pref=w&&state.profile&&state.profile.services.indexOf(s.id)>=0;
          return '<button class="tile'+(s.armed?' armed':'')+'" data-svc="'+s.id+'"><svg><use href="#'+s.icon+'"/></svg><h3>'+esc(s.name)+'</h3><p>'+esc(s.note)+'</p>'+
            '<span class="cnt">'+(counts[s.id]||0)+(w?' açık görev':' uygun aday')+'</span>'+(pref?'<span class="badge ok" style="align-self:flex-start">Tercihin</span>':'')+'</button>';
        }).join('')+'</div>';
      document.querySelectorAll('[data-svc]').forEach(function(b){
        b.onclick=function(){
          if(w){ state.jobFilter={service:b.dataset.svc,city:''}; state.tab='list'; }
          else { resetF(); state.F.service=b.dataset.svc; state.tab='cand'; }
          renderPanel(); window.scrollTo(0,0);
        };
      });
      document.querySelectorAll('[data-tab-go]').forEach(function(g){ g.onclick=function(){ state.tab=g.dataset.tabGo; renderPanel(); window.scrollTo(0,0); }; });
    }catch(e){ if(tok===navTok) fail(e); }
  }

  /* ---------- işçi: açık görevler (şu an kapalı) ---------- */
  async function renderList(){
    var tok=navTok, u=state.user, jf=state.jobFilter; loading();
    try{
      var res=await Promise.all([q(sb.from('jobs').select('*').order('created_at',{ascending:false})), q(sb.from('applications').select('job_id').eq('worker_id',u.id))]);
      if(tok!==navTok) return;
      var jobs=res[0], applied={}; res[1].forEach(function(a){ applied[a.job_id]=true; });
      var cities=Array.from(new Set(jobs.map(function(j){return j.city;}))).sort(function(a,b){return a.localeCompare(b,'tr');});
      var list=jobs.filter(function(j){ return (!jf.service||j.service===jf.service)&&(!jf.city||j.city===jf.city); });
      $('tabBody').innerHTML=
        '<div class="head"><div><h2>Açık görevler</h2><p>Hizmet türüne ve şehre göre filtrele.</p></div></div>'+
        '<div class="filters"><select id="fSvc" aria-label="Hizmet türü"><option value="">Tüm hizmetler</option>'+SERVICES.map(function(s){return '<option value="'+s.id+'"'+(jf.service===s.id?' selected':'')+'>'+esc(s.name)+'</option>';}).join('')+'</select>'+
        '<select id="fCity" aria-label="Şehir"><option value="">Tüm şehirler</option>'+opts(cities,jf.city)+'</select></div>'+
        (list.length ? list.map(function(j){
          var ap=!!applied[j.id];
          return '<article class="job"><div><h3>'+esc(j.title)+'</h3><div class="meta"><span>'+esc(j.company)+'</span><span>'+esc(j.city)+'</span><span>'+esc(j.shift)+'</span><span>'+j.headcount+' kişi aranıyor</span></div>'+
            '<div style="margin-top:8px"><span class="badge">'+esc(svcName(j.service))+'</span></div></div>'+
            '<div class="side"><div class="pay">'+fmt(j.pay)+' ₺ <small style="font-size:.9rem;font-weight:500">/ '+(j.daily?'gün':'ay')+'</small></div>'+
            '<button class="btn small" data-apply="'+j.id+'"'+(ap?' disabled':'')+'>'+(ap?'Başvuruldu':'Başvur')+'</button></div></article>';
        }).join('') : '<div class="empty">Bu filtrelere uyan görev yok. Hizmet türünü veya şehri değiştir.</div>');
      $('fSvc').onchange=function(){ state.jobFilter.service=this.value; renderList(); };
      $('fCity').onchange=function(){ state.jobFilter.city=this.value; renderList(); };
      document.querySelectorAll('[data-apply]').forEach(function(b){
        b.onclick=async function(){
          b.disabled=true;
          var r=await sb.from('applications').insert({job_id:Number(b.dataset.apply),worker_id:u.id});
          if(r.error && r.error.code!=='23505'){ b.disabled=false; return toast('Başvuru gönderilemedi: '+r.error.message); }
          b.textContent='Başvuruldu';
          toast(state.profile?'Başvurun gönderildi':'Başvurun gönderildi. Profilini doldurmayı unutma');
        };
      });
    }catch(e){ if(tok===navTok) fail(e); }
  }

  /* ---------- işçi: davetler (şu an kapalı) ---------- */
  async function renderInvites(){
    var tok=navTok; loading();
    try{
      var list=await q(sb.from('invites').select('*').eq('worker_id',state.user.id).order('created_at',{ascending:false}));
      if(tok!==navTok) return;
      $('tabBody').innerHTML='<div class="head"><div><h2>Davetlerim</h2><p>Bir daveti kabul edersen telefon ve e-postan yalnızca o işverene gösterilir.</p></div></div>'+
        (list.length?list.map(function(i){
          var st = i.status==='bekliyor' ? '<button class="btn small" data-acc="'+i.id+'">Kabul et</button> <button class="btn ghost small" data-rej="'+i.id+'">Reddet</button>'
                 : (i.status==='kabul' ? '<span class="badge ok">Kabul ettin</span>' : '<span class="badge">Reddettin</span>');
          return '<article class="job"><div><h3>'+esc(i.employer_name||'İşveren')+'</h3><div class="meta"><span>'+(i.job_title?esc(i.job_title):'Genel görüşme daveti')+'</span><span>'+trDate(String(i.created_at).slice(0,10))+'</span></div></div><div class="side">'+st+'</div></article>';
        }).join(''):'<div class="empty">Henüz davet yok. Profilini eksiksiz doldurursan işverenler seni daha kolay bulur.</div>');
      var respond=async function(id,ok){
        var r=await sb.rpc('respond_invite',{p_invite:Number(id),p_accept:ok});
        if(r.error) return toast('İşlem yapılamadı: '+r.error.message);
        toast(ok?'Daveti kabul ettin':'Daveti reddettin'); renderInvites();
      };
      document.querySelectorAll('[data-acc]').forEach(function(b){ b.onclick=function(){ respond(b.dataset.acc,true); }; });
      document.querySelectorAll('[data-rej]').forEach(function(b){ b.onclick=function(){ respond(b.dataset.rej,false); }; });
    }catch(e){ if(tok===navTok) fail(e); }
  }

  /* ---------- işçi: profil formu ---------- */
  function defProfile(){ return {gender:'',birth:'',marital:'',phone:'',edu:'',services:[],dl:{has:false,cls:[],exp:''},src:false,psy:false,pass:{has:false,type:'',exp:''},card:{has:false,type:'',exp:''},computer:'',langs:[],cv:{path:'',name:''}}; }
  async function renderProfile(){
    var tok=navTok; loading();
    try{ if(!state.profile) await loadMyProfile(); }catch(e){ return tok===navTok&&fail(e); }
    if(tok!==navTok) return;
    var p=state.profile||defProfile(), draft=p.langs.slice(), u=state.user, cv=p.cv||{path:'',name:''};
    $('tabBody').innerHTML=
      '<div class="head"><div><h2>Profilim</h2><p>İşverenler bu bilgilere göre filtreleme yapar. İletişim bilgilerin yalnızca daveti kabul ettiğin işverene gösterilir.</p></div></div>'+
      '<form id="profForm" novalidate>'+
      '<fieldset class="grp"><legend>Kişisel bilgiler</legend><div class="g">'+
        avatarField(false)+
        '<div><label for="pName">Ad soyad</label><input id="pName" value="'+esc(u.name)+'" autocomplete="name"></div>'+
        '<div><label for="pGender">Cinsiyet</label><select id="pGender">'+opts(GEN,p.gender,'Seç')+'</select></div>'+
        '<div><label for="pBirth">Doğum tarihi</label><input id="pBirth" type="date" value="'+esc(p.birth)+'"></div>'+
        '<div><label for="pMarital">Medeni durum</label><select id="pMarital">'+opts(MAR,p.marital,'Seç')+'</select></div>'+
        '<div><label for="pPhone">Telefon</label><input id="pPhone" type="tel" placeholder="05xx xxx xx xx" value="'+esc(p.phone)+'" autocomplete="tel"></div>'+
        '<div><label for="pEmail">E-posta</label><input id="pEmail" type="email" value="'+esc(u.email)+'" readonly></div>'+
      '</div></fieldset>'+
      '<fieldset class="grp"><legend>Eğitim ve beceriler</legend><div class="g">'+
        '<div><label for="pEdu">Eğitim durumu</label><select id="pEdu">'+opts(EDU,p.edu,'Seç')+'</select></div>'+
        '<div><label for="pComp">Bilgisayar bilgisi</label><select id="pComp">'+opts(COMP,p.computer,'Seç')+'</select></div>'+
        '<div class="full"><label>Yabancı dil bilgisi</label><div class="langrow">'+
          '<div><select id="pLang" aria-label="Dil">'+opts(LANGS)+'</select></div>'+
          '<div><select id="pLvl" aria-label="Seviye">'+opts(LVL)+'</select></div>'+
          '<button type="button" class="btn ghost small" id="addLang">Dil ekle</button></div>'+
          '<div id="langChips" style="margin-top:10px"></div></div>'+
      '</div></fieldset>'+
      '<fieldset class="grp"><legend>Belgeler</legend><div class="g">'+
        '<div><label for="pDl">Sürücü belgesi</label>'+yn('pDl',p.dl.has)+'</div>'+
        '<div class="sub full g" id="dlSub" '+(p.dl.has?'':'hidden')+'>'+
          '<div class="full"><label>Sınıfı (birden fazla seçebilirsin)</label><div class="chks">'+DLC.map(function(c){return '<label class="chk"><input type="checkbox" name="dlc" value="'+c+'"'+(p.dl.cls.indexOf(c)>=0?' checked':'')+'>'+c+'</label>';}).join('')+'</div></div>'+
          '<div><label for="pDlExp">Geçerlilik tarihi</label><input id="pDlExp" type="date" value="'+esc(p.dl.exp)+'"></div></div>'+
        '<div><label for="pSrc">SRC belgesi</label>'+yn('pSrc',p.src)+'</div>'+
        '<div><label for="pPsy">Psikoteknik belgesi</label>'+yn('pPsy',p.psy)+'</div>'+
        '<div><label for="pPass">Pasaport</label>'+yn('pPass',p.pass.has)+'</div>'+
        '<div class="sub full g" id="passSub" '+(p.pass.has?'':'hidden')+'>'+
          '<div><label for="pPassType">Cinsi</label><select id="pPassType">'+opts(PASS,p.pass.type,'Seç')+'</select></div>'+
          '<div><label for="pPassExp">Geçerlilik tarihi</label><input id="pPassExp" type="date" value="'+esc(p.pass.exp)+'"></div></div>'+
      '</div></fieldset>'+
      '<fieldset class="grp"><legend>Özel güvenlik kimlik kartı</legend><div class="g">'+
        '<div><label for="pCard">Kimlik kartı</label>'+yn('pCard',p.card.has)+'</div>'+
        '<div class="sub full g" id="cardSub" '+(p.card.has?'':'hidden')+'>'+
          '<div><label for="pCardType">Görev türü</label><select id="pCardType">'+opts(['Silahlı','Silahsız'],p.card.type,'Seç')+'</select></div>'+
          '<div><label for="pCardExp">Süresi (geçerlilik bitiş tarihi)</label><input id="pCardExp" type="date" value="'+esc(p.card.exp)+'"></div></div>'+
      '</div></fieldset>'+
      '<fieldset class="grp"><legend>Çalışmak istediğin hizmetler</legend><div class="chks">'+
        SERVICES.map(function(s){return '<label class="chk"><input type="checkbox" name="psvc" value="'+s.id+'"'+(p.services.indexOf(s.id)>=0?' checked':'')+'>'+esc(s.name)+'</label>';}).join('')+
      '</div></fieldset>'+
      '<fieldset class="grp"><legend>Özgeçmiş (CV)</legend>'+
        '<p class="hint" style="margin-top:8px">İsteğe bağlı. Deneyimlerini ve çalıştığın yerleri anlatan bir CV, değerlendirmeyi kolaylaştırır. PDF, DOC veya DOCX, en fazla 5 MB.</p>'+
        '<input type="file" id="cvFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden>'+
        '<div id="cvBox"></div><div class="err" id="cvErr" role="alert"></div>'+
      '</fieldset>'+
      '<div class="err" id="pErr" role="alert"></div>'+
      '<button class="btn" type="submit" id="profSave">Profili kaydet</button></form>';

    bindAvatar();
    async function paintCv(busy){
      if(busy){ $('cvBox').innerHTML='<div class="filerow"><span class="muted">Yükleniyor…</span></div>'; return; }
      if(!cv.path){
        $('cvBox').innerHTML='<div class="filerow"><svg aria-hidden="true"><use href="#i-file"/></svg><div class="nm"><span class="muted">Henüz CV yüklenmedi.</span></div>'+
          '<div class="acts"><button type="button" class="btn ghost small" id="cvPick">CV yükle</button></div></div>';
      } else {
        $('cvBox').innerHTML='<div class="filerow"><svg aria-hidden="true"><use href="#i-file"/></svg><div class="nm"><b>'+esc(cv.name||'CV')+'</b><small>Yüklendi</small></div>'+
          '<div class="acts"><a class="btn ghost small" id="cvView" target="_blank" rel="noopener" aria-disabled="true">Görüntüle</a>'+
          '<button type="button" class="btn ghost small" id="cvPick">Değiştir</button><button type="button" class="linkbtn" id="cvDel">Kaldır</button></div></div>';
        $('cvDel').onclick=async function(){
          if(!confirm('CV kaldırılsın mı?')) return;
          try{
            await q(sb.from('worker_profiles').update({cv_path:null,cv_name:null}).eq('user_id',u.id));
            removeFile('cv',cv.path); cv={path:'',name:''}; if(state.profile) state.profile.cv=cv;
            paintCv(); toast('CV kaldırıldı');
          }catch(ex){ $('cvErr').textContent='Kaldırılamadı: '+ex.message; }
        };
        fileUrl('cv',cv.path).then(function(url){ var a=$('cvView'); if(a&&url){ a.href=url; a.removeAttribute('aria-disabled'); } });
      }
      $('cvPick').onclick=function(){ $('cvFile').click(); };
    }
    paintCv();
    $('cvFile').onchange=async function(){
      var file=this.files[0]; this.value=''; if(!file) return;
      $('cvErr').textContent=''; paintCv(true);
      try{
        var path=await uploadFile('cv',file);
        await q(sb.from('worker_profiles').upsert({user_id:u.id,cv_path:path,cv_name:file.name}));
        removeFile('cv',cv.path); cv={path:path,name:file.name}; if(state.profile) state.profile.cv=cv;
        toast('CV yüklendi');
      }catch(ex){ $('cvErr').textContent='Yüklenemedi: '+ex.message; }
      paintCv();
    };

    [['pDl','dlSub'],['pPass','passSub'],['pCard','cardSub']].forEach(function(x){ $(x[0]).onchange=function(){ $(x[1]).hidden=this.value!=='1'; }; });
    function chips(){
      $('langChips').innerHTML = draft.length ? draft.map(function(l,i){
        return '<span class="chip">'+esc(l.lang)+': '+esc(l.level.split(' (')[0])+' <button type="button" class="x" data-rm="'+i+'" aria-label="'+esc(l.lang)+' dilini kaldır">×</button></span>';
      }).join('') : '<span class="muted">Henüz dil eklenmedi.</span>';
      document.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=function(){ draft.splice(Number(b.dataset.rm),1); chips(); }; });
    }
    chips();
    $('addLang').onclick=function(){ var l=$('pLang').value, v=$('pLvl').value; draft=draft.filter(function(x){return x.lang!==l;}); draft.push({lang:l,level:v}); chips(); };
    $('profForm').onsubmit=async function(e){
      e.preventDefault();
      var err=function(m){ $('pErr').textContent=m; };
      var name=$('pName').value.trim();
      var d={
        gender:$('pGender').value, birth:$('pBirth').value, marital:$('pMarital').value, phone:$('pPhone').value.trim(), edu:$('pEdu').value, computer:$('pComp').value, langs:draft.slice(),
        dl:{has:$('pDl').value==='1',cls:Array.from(document.querySelectorAll('[name=dlc]:checked')).map(function(c){return c.value;}),exp:$('pDlExp').value},
        src:$('pSrc').value==='1', psy:$('pPsy').value==='1',
        pass:{has:$('pPass').value==='1',type:$('pPassType').value,exp:$('pPassExp').value},
        card:{has:$('pCard').value==='1',type:$('pCardType').value,exp:$('pCardExp').value},
        services:Array.from(document.querySelectorAll('[name=psvc]:checked')).map(function(c){return c.value;}),
        cv:cv
      };
      if(!name) return err('Ad soyad alanını doldur.');
      if(!d.gender) return err('Cinsiyet seç.');
      if(!d.birth) return err('Doğum tarihini gir.');
      if(ageOf(d.birth)<18) return err('Görev yapabilmek için 18 yaşını doldurmuş olmalısın.');
      if(!d.marital) return err('Medeni durumunu seç.');
      if(d.phone.replace(/\D/g,'').length<10) return err('Telefon numarası en az 10 haneli olmalı.');
      if(!d.edu) return err('Eğitim durumunu seç.');
      if(!d.computer) return err('Bilgisayar bilgini seç.');
      if(d.dl.has && (!d.dl.cls.length || !d.dl.exp)) return err('Sürücü belgesi için en az bir sınıf ve geçerlilik tarihi gir.');
      if(d.pass.has && (!d.pass.type || !d.pass.exp)) return err('Pasaport için cinsini ve geçerlilik tarihini gir.');
      if(d.card.has && (!d.card.type || !d.card.exp)) return err('Kimlik kartı için görev türünü ve süresini gir.');
      if(!d.services.length) return err('Çalışmak istediğin en az bir hizmeti seç.');
      $('profSave').disabled=true;
      try{
        await q(sb.from('profiles').update({full_name:name}).eq('id',u.id));
        await q(sb.from('worker_profiles').upsert(profileToRow(d,u.id)));
        u.name=name; $('who').textContent=name+' · Görevli'; state.profile=d; state.editing=false;
        renderPanel(); window.scrollTo(0,0); toast('Profilin kaydedildi');
      }catch(ex){ err('Kaydedilemedi: '+ex.message); $('profSave').disabled=false; }
    };
  }

  /* ---------- işveren: profil formu ---------- */
  function renderEmployerProfile(){
    var u=state.user, p=state.employerProfile||{sector:'',city:'',phone:'',services:[]};
    $('tabBody').innerHTML=
      '<div class="head"><div><h2>Firma bilgileri</h2><p>Bu bilgiler ekibimizin seninle doğru şekilde iletişime geçmesi için kullanılır.</p></div></div>'+
      '<form id="empForm" novalidate>'+
      '<fieldset class="grp"><legend>Firma bilgileri</legend><div class="g">'+
        avatarField(true)+
        '<div><label for="eName">Firma adı</label><input id="eName" value="'+esc(u.name)+'" autocomplete="organization"></div>'+
        '<div><label for="eSector">Sektör</label><select id="eSector">'+opts(SECTORS,p.sector,'Seç')+'</select></div>'+
        '<div><label for="eCity">Şehir</label><input id="eCity" value="'+esc(p.city)+'" placeholder="İzmir"></div>'+
        '<div><label for="ePhone">Telefon</label><input id="ePhone" type="tel" value="'+esc(p.phone)+'" placeholder="0xxx xxx xx xx" autocomplete="tel"></div>'+
        '<div><label for="eEmail">E-posta</label><input id="eEmail" type="email" value="'+esc(u.email)+'" readonly></div>'+
      '</div></fieldset>'+
      '<fieldset class="grp"><legend>İhtiyaç duyduğun hizmet türleri</legend><div class="chks">'+
        SERVICES.map(function(s){return '<label class="chk"><input type="checkbox" name="esvc" value="'+s.id+'"'+(p.services.indexOf(s.id)>=0?' checked':'')+'>'+esc(s.name)+'</label>';}).join('')+
      '</div></fieldset>'+
      '<div class="err" id="eErr" role="alert"></div>'+
      '<button class="btn" type="submit" id="empSave">Bilgileri kaydet</button></form>';
    bindAvatar();

    $('empForm').onsubmit=async function(e){
      e.preventDefault();
      var err=function(m){ $('eErr').textContent=m; };
      var name=$('eName').value.trim(), sector=$('eSector').value, city=$('eCity').value.trim(), phone=$('ePhone').value.trim();
      var services=Array.from(document.querySelectorAll('[name=esvc]:checked')).map(function(c){return c.value;});
      if(!name) return err('Firma adını yaz.');
      if(!sector) return err('Sektörü seç.');
      if(!city) return err('Şehri yaz.');
      if(phone.replace(/\D/g,'').length<10) return err('Telefon numarası en az 10 haneli olmalı.');
      if(!services.length) return err('İhtiyaç duyduğun en az bir hizmeti seç.');
      $('empSave').disabled=true;
      try{
        await q(sb.from('profiles').update({full_name:name}).eq('id',u.id));
        await q(sb.from('employer_profiles').upsert({user_id:u.id,sector:sector,city:city,phone:phone,services:services,updated_at:new Date().toISOString()}));
        u.name=name; $('who').textContent=name+' · İşveren'; state.employerProfile={sector:sector,city:city,phone:phone,services:services}; state.editing=false;
        renderPanel(); window.scrollTo(0,0); toast('Bilgilerin kaydedildi');
      }catch(ex){ err('Kaydedilemedi: '+ex.message); $('empSave').disabled=false; }
    };
  }

  /* ---------- işveren: aday arama (şu an kapalı) ---------- */
  var lastList=[], inviteMap={}, contacts={}, resTok=0;
  function chip(t,cls){ return '<span class="chip'+(cls?' '+cls:'')+'">'+esc(t)+'</span>'; }
  function dchip(label,exp){ return valid(exp) ? chip(label+' · '+trDate(exp),'ok') : chip(label+' · süresi dolmuş','warn'); }
  function candCard(c){
    var ch=[];
    if(c.dl_has) ch.push(dchip('Sürücü belgesi '+(c.dl_classes||[]).join(', '),c.dl_exp));
    if(c.src) ch.push(chip('SRC','ok'));
    if(c.psycho) ch.push(chip('Psikoteknik','ok'));
    if(c.pass_has) ch.push(dchip('Pasaport: '+String(c.pass_type||'').split(' (')[0],c.pass_exp));
    if(c.card_has) ch.push(dchip('Özel güvenlik kartı: '+String(c.card_type||'').toLowerCase(),c.card_exp));
    if(c.computer && c.computer!=='Yok') ch.push(chip('Bilgisayar: '+c.computer));
    (c.languages||[]).forEach(function(l){ ch.push(chip(l.lang+': '+String(l.level).split(' (')[0])); });
    var st=inviteMap[c.worker_id], ct=contacts[c.worker_id];
    var btn = !st ? '<button class="btn small" data-inv="'+c.worker_id+'">Görüşmeye çağır</button>'
            : (st==='bekliyor' ? '<span class="badge">Yanıt bekleniyor</span>' : (st==='kabul' ? '<span class="badge ok">Kabul etti</span>' : '<span class="badge">Reddetti</span>'));
    return '<article class="cand"><div class="top"><div><h3>'+esc(c.short_name)+'</h3>'+
      '<div class="meta">'+c.age+' yaşında · '+esc(c.gender||'')+' · '+esc(c.marital||'')+' · '+esc(c.education||'')+'</div></div>'+btn+'</div>'+
      '<div class="svcs"><b>Hizmetler:</b> '+(c.services||[]).map(svcName).map(esc).join(', ')+'</div><div>'+(ch.length?ch.join(''):'<span class="muted">Belge bilgisi girilmedi.</span>')+'</div>'+
      (ct?'<div class="contact">Telefon: '+esc(ct.phone)+' · E-posta: '+esc(ct.email)+'</div>':'')+'</article>';
  }
  function paintResults(){
    var f=state.F;
    $('resHead').innerHTML='<div><h2>'+lastList.length+' aday</h2><p>'+(f.service?esc(svcName(f.service))+' için. ':'')+'İletişim bilgileri, aday daveti kabul edince görünür.</p></div>';
    $('results').innerHTML=lastList.length?lastList.map(candCard).join(''):'<div class="empty">Bu filtrelere uyan aday yok. Bazı filtreleri gevşetmeyi dene.</div>';
    document.querySelectorAll('[data-inv]').forEach(function(b){
      b.onclick=async function(){
        b.disabled=true;
        var r=await sb.from('invites').insert({employer_id:state.user.id,worker_id:b.dataset.inv});
        if(r.error && r.error.code!=='23505'){ b.disabled=false; return toast('Davet gönderilemedi: '+r.error.message); }
        inviteMap[b.dataset.inv]=inviteMap[b.dataset.inv]||'bekliyor'; toast('Görüşme daveti gönderildi'); paintResults();
      };
    });
  }
  async function runSearch(){
    var my=++resTok, f=state.F; $('results').innerHTML='<p class="muted">Aranıyor…</p>';
    try{
      var query=sb.from('candidates').select('*');
      if(f.service) query=query.contains('services',[f.service]);
      if(f.edu) query=query.in('education',EDU.slice(EDU.indexOf(f.edu)));
      if(f.comp) query=query.in('computer',COMP.slice(COMP.indexOf(f.comp)));
      if(f.dl||f.dlClass||f.dlValid){ query=query.eq('dl_has',true); if(f.dlClass) query=query.contains('dl_classes',[f.dlClass]); if(f.dlValid) query=query.gte('dl_exp',todayISO()); }
      if(f.src) query=query.eq('src',true);
      if(f.psy) query=query.eq('psycho',true);
      if(f.pass||f.passType||f.passValid){ query=query.eq('pass_has',true); if(f.passType) query=query.eq('pass_type',f.passType); if(f.passValid) query=query.gte('pass_exp',todayISO()); }
      if(f.card||f.cardValid){ query=query.eq('card_has',true); if(f.card==='Silahlı'||f.card==='Silahsız') query=query.eq('card_type',f.card); if(f.cardValid) query=query.gte('card_exp',todayISO()); }
      if(f.lang){ var min=Math.max(0,LVL.indexOf(f.langLevel)), keys=[]; for(var i=min;i<LVL.length;i++) keys.push(f.lang+':'+i); query=query.overlaps('lang_keys',keys); }
      var list=await q(query.limit(100));
      var inv=await q(sb.from('invites').select('worker_id,status').eq('employer_id',state.user.id));
      inviteMap={}; inv.forEach(function(i){ inviteMap[i.worker_id]=i.status; });
      var acc=list.filter(function(c){return inviteMap[c.worker_id]==='kabul';});
      var got=await Promise.all(acc.map(function(c){ return sb.rpc('candidate_contact',{p_worker:c.worker_id}); }));
      contacts={}; acc.forEach(function(c,i){ var d=got[i].data; if(d&&d[0]) contacts[c.worker_id]=d[0]; });
      if(my!==resTok) return;
      lastList=list; paintResults();
    }catch(e){ if(my===resTok) $('results').innerHTML='<div class="empty">Arama yapılamadı. '+esc(e.message||'')+'</div>'; }
  }
  function renderCand(){
    var f=state.F;
    var yesno=function(id,label,val){ return '<label for="'+id+'">'+label+'</label><select id="'+id+'"><option value="">Fark etmez</option><option value="1"'+(val?' selected':'')+'>Olsun</option></select>'; };
    var chk=function(id,label,val){ return '<label class="chk" for="'+id+'"><input type="checkbox" id="'+id+'"'+(val?' checked':'')+'>'+label+'</label>'; };
    $('tabBody').innerHTML='<div class="cand-layout"><aside><details class="fbox" open><summary>Filtreler</summary><form id="candF">'+
      '<label for="f_service">Hizmet türü</label><select id="f_service"><option value="">Tüm hizmetler</option>'+SERVICES.map(function(s){return '<option value="'+s.id+'"'+(f.service===s.id?' selected':'')+'>'+esc(s.name)+'</option>';}).join('')+'</select>'+
      '<h4>Eğitim ve beceri</h4>'+
      '<label for="f_edu">Eğitim durumu (en az)</label><select id="f_edu">'+opts(EDU,f.edu,'Fark etmez')+'</select>'+
      '<label for="f_comp">Bilgisayar bilgisi (en az)</label><select id="f_comp">'+opts(COMP.slice(1),f.comp,'Fark etmez')+'</select>'+
      '<label for="f_lang">Yabancı dil</label><select id="f_lang">'+opts(LANGS,f.lang,'Fark etmez')+'</select>'+
      '<label for="f_langLevel">Dil seviyesi (en az)</label><select id="f_langLevel">'+opts(LVL,f.langLevel,'Herhangi')+'</select>'+
      '<h4>Sürücü belgesi</h4>'+yesno('f_dl','Sürücü belgesi',f.dl)+
      '<label for="f_dlClass">Sınıfı</label><select id="f_dlClass">'+opts(DLC,f.dlClass,'Herhangi')+'</select>'+
      chk('f_dlValid','Geçerlilik tarihi dolmamış',f.dlValid)+
      '<h4>Diğer belgeler</h4>'+yesno('f_src','SRC belgesi',f.src)+yesno('f_psy','Psikoteknik belgesi',f.psy)+yesno('f_pass','Pasaport',f.pass)+
      '<label for="f_passType">Pasaport cinsi</label><select id="f_passType">'+opts(PASS,f.passType,'Herhangi')+'</select>'+
      chk('f_passValid','Geçerlilik tarihi dolmamış',f.passValid)+
      '<h4>Özel güvenlik kimlik kartı</h4>'+
      '<label for="f_card">Kart</label><select id="f_card"><option value="">Fark etmez</option><option value="1"'+(f.card==='1'?' selected':'')+'>Herhangi bir kart</option><option'+(f.card==='Silahlı'?' selected':'')+'>Silahlı</option><option'+(f.card==='Silahsız'?' selected':'')+'>Silahsız</option></select>'+
      chk('f_cardValid','Süresi dolmamış',f.cardValid)+
      '<div style="margin-top:16px"><button type="button" class="btn ghost small" id="clearF">Filtreleri temizle</button></div>'+
      '</form></details></aside><section><div class="head" id="resHead"></div><div id="results"></div></section></div>';
    var form=$('candF');
    form.addEventListener('submit',function(e){e.preventDefault();});
    form.addEventListener('change',function(){
      var g=function(id){return $(id).value;}, c=function(id){return $(id).checked;};
      state.F={service:g('f_service'),edu:g('f_edu'),dl:g('f_dl'),dlClass:g('f_dlClass'),dlValid:c('f_dlValid'),src:g('f_src'),psy:g('f_psy'),pass:g('f_pass'),passType:g('f_passType'),passValid:c('f_passValid'),card:g('f_card'),cardValid:c('f_cardValid'),comp:g('f_comp'),lang:g('f_lang'),langLevel:g('f_langLevel')};
      runSearch();
    });
    $('clearF').onclick=function(){ resetF(); renderCand(); };
    lastList=[]; paintResults(); runSearch();
  }

  /* ---------- işveren: ilanlarım (şu an kapalı) ---------- */
  async function renderJobs(){
    var tok=navTok, u=state.user; loading();
    try{
      var jobs=await q(sb.from('jobs').select('*').eq('owner_id',u.id).order('created_at',{ascending:false}));
      var ids=jobs.map(function(j){return j.id;}), apps=[], inv=[];
      if(ids.length){ apps=await q(sb.from('job_applicants').select('*').in('job_id',ids)); }
      inv=await q(sb.from('invites').select('worker_id,status').eq('employer_id',u.id));
      if(tok!==navTok) return;
      var im={}; inv.forEach(function(i){ im[i.worker_id]=i.status; });
      $('tabBody').innerHTML=
        '<div class="head"><div><h2>Yeni ilan yayınla</h2><p>'+esc(u.name)+' için hizmeti ve vardiyayı gir.</p></div></div>'+
        '<form class="g" id="jobForm" novalidate style="background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px 20px 20px;margin-bottom:28px">'+
          '<div class="full"><label for="jTitle">Pozisyon</label><input id="jTitle" placeholder="Örn. Site giriş kapısı görevlisi"></div>'+
          '<div><label for="jSvc">Hizmet türü</label><select id="jSvc">'+SERVICES.map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>';}).join('')+'</select></div>'+
          '<div><label for="jCity">Şehir</label><input id="jCity" placeholder="İzmir"></div>'+
          '<div><label for="jShift">Vardiya</label><input id="jShift" placeholder="08:00–20:00"></div>'+
          '<div><label for="jCount">Kaç kişi</label><input id="jCount" type="number" min="1" value="1"></div>'+
          '<div><label for="jPay">Aylık ücret (₺)</label><input id="jPay" type="number" min="0" placeholder="30000"></div>'+
          '<div class="full err" id="jErr" role="alert"></div>'+
          '<div class="full"><button class="btn" type="submit" id="jSave">İlanı yayınla</button></div>'+
        '</form>'+
        '<div class="head"><div><h2>İlanlarım</h2></div></div>'+
        (jobs.length?jobs.map(function(j){
          var ja=apps.filter(function(a){return a.job_id===j.id;});
          return '<article class="job"><div><h3>'+esc(j.title)+'</h3><div class="meta"><span>'+esc(j.city)+'</span><span>'+esc(j.shift)+'</span><span>'+j.headcount+' kişi</span></div><div style="margin-top:8px"><span class="badge">'+esc(svcName(j.service))+'</span></div></div>'+
            '<div class="side"><div class="pay">'+fmt(j.pay)+' ₺</div><span class="badge">'+ja.length+' başvuru</span> <button class="btn ghost small" data-del="'+j.id+'">İlanı kaldır</button></div>'+
            '<details class="apps"'+(ja.length?' open':'')+'><summary>Başvuranlar</summary>'+
            (ja.length?ja.map(function(a){
              var st=im[a.worker_id];
              var doc=[]; if(a.card_has) doc.push('Kart: '+String(a.card_type||'').toLowerCase()); if(a.src) doc.push('SRC'); if(a.psycho) doc.push('Psikoteknik'); if(a.dl_has) doc.push('Ehliyet '+(a.dl_classes||[]).join(','));
              var b=!st?'<button class="btn ghost small" data-invite="'+a.worker_id+':'+j.id+'">Görüşmeye çağır</button>':(st==='bekliyor'?'<span class="badge">Yanıt bekleniyor</span>':(st==='kabul'?'<span class="badge ok">Kabul etti</span>':'<span class="badge">Reddetti</span>'));
              return '<div class="app"><div><b>'+esc(a.short_name)+'</b><small>'+esc(a.education||'Eğitim bilgisi girilmedi')+' · '+esc(doc.length?doc.join(' · '):'Belge bilgisi girilmedi')+'</small></div>'+b+'</div>';
            }).join(''):'<div class="empty" style="margin-top:8px">Henüz başvuru yok.</div>')+'</details></article>';
        }).join(''):'<div class="empty">Henüz ilanın yok. Yukarıdaki formdan ilk ilanını yayınla.</div>');
      $('jobForm').onsubmit=async function(e){
        e.preventDefault();
        var t=$('jTitle').value.trim(), c=$('jCity').value.trim(), s=$('jShift').value.trim(), p=Number($('jPay').value), n=Number($('jCount').value);
        if(!t||!c||!s){ $('jErr').textContent='Pozisyon, şehir ve vardiya alanlarını doldur.'; return; }
        if(!(p>0)){ $('jErr').textContent='Ücret için 0’dan büyük bir tutar yaz.'; return; }
        $('jSave').disabled=true;
        var r=await sb.from('jobs').insert({owner_id:u.id,title:t,city:c,shift:s,service:$('jSvc').value,headcount:n>0?Math.floor(n):1,pay:Math.floor(p)});
        if(r.error){ $('jErr').textContent='İlan yayınlanamadı: '+r.error.message; $('jSave').disabled=false; return; }
        toast('İlan yayınlandı'); renderJobs();
      };
      document.querySelectorAll('[data-del]').forEach(function(b){
        b.onclick=async function(){
          if(!confirm('Bu ilan ve başvuruları kalıcı olarak silinecek. Emin misin?')) return;
          var r=await sb.from('jobs').delete().eq('id',Number(b.dataset.del));
          if(r.error) return toast('Silinemedi: '+r.error.message);
          toast('İlan kaldırıldı'); renderJobs();
        };
      });
      document.querySelectorAll('[data-invite]').forEach(function(b){
        b.onclick=async function(){
          var x=b.dataset.invite.split(':'), job=jobs.filter(function(j){return String(j.id)===x[1];})[0];
          b.disabled=true;
          var r=await sb.from('invites').insert({employer_id:u.id,worker_id:x[0],job_title:job?job.title:null});
          if(r.error && r.error.code!=='23505'){ b.disabled=false; return toast('Davet gönderilemedi: '+r.error.message); }
          toast('Görüşme daveti gönderildi'); renderJobs();
        };
      });
    }catch(e){ if(tok===navTok) fail(e); }
  }

  /* ---------- başlangıç ---------- */
  (async function init(){
    if(!sb) return;
    sb.auth.onAuthStateChange(function(ev){
      if(ev==='PASSWORD_RECOVERY'){ recovering=true; openAuth('yeni'); }
      if(ev==='SIGNED_OUT' && state.user){ state.user=null; state.profile=null; leavePanel(); }
    });
    var s=await sb.auth.getSession();
    if(s.data.session && !recovering) await startSession(s.data.session.user);
  })();
})();
