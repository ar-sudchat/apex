/* ═══════════════════════════════════════════════════════════════════
   APEX i18n Engine — สลับภาษาไทย/อังกฤษ (ใช้ร่วมกันทุกหน้า)
   วิธีใช้ในแต่ละหน้า (ก่อน </body>):
     <script id="apexI18nDict">window.APEX_I18N_PAGE = { "ไทย": "English", ... };</script>
     <script src="apex-i18n.js"></script>
   - ปุ่มลอยมุมขวาล่างสลับ TH ⇄ EN, จำค่าไว้ใน localStorage ('apex_lang')
   - หน้าที่ถูกเปิดใน iframe จะซ่อนปุ่มและรับภาษาจากหน้าแม่ (postMessage)
   - แปลทั้ง text node / placeholder / title / aria-label และเนื้อหาที่
     JS สร้างทีหลัง (MutationObserver) รวมถึง config ของ ApexReport
   ═══════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var LS_KEY='apex_lang';
var TH_RE=/[฀-๿]/;
var EMBED=(function(){try{return window.self!==window.top;}catch(e){return true;}})();

/* ─── คำแปลกลางที่ใช้ซ้ำทุกหน้า (หน้าไหนกำหนดเองใน APEX_I18N_PAGE จะ override) ─── */
var COMMON={
"บริษัท เอเพ็กซ์ เซอร์คิต (ไทยแลนด์) จำกัด":"Apex Circuit (Thailand) Co., Ltd.",
"ระบบวางแผนและต้นทุน":"Planning & Costing System",
"พิมพ์รายงาน":"Print Report",
"รายงาน":"Report",
"ปิด":"Close",
"ย่อ":"Minimize",
"ขยาย":"Maximize",
"บันทึก":"Save",
"ยกเลิก":"Cancel",
"ตกลง":"OK",
"ค้นหา":"Search",
"ค้นหาเมนู":"Search menu",
"ทั้งหมด":"All",
"ล้างตัวกรอง":"Clear filters",
"โหลดใหม่":"Reload",
"แท็บใหม่":"New tab",
"หน้าแรก":"Home",
"ย่อเมนู":"Collapse menu",
"กางเมนู":"Expand menu",
"หน้าจอระบบ":"System screen",
"ข้อมูลจำลอง":"demo data",
"หมายเหตุ":"Remarks",
"สถานะ":"Status",
"หน่วย":"Unit",
"จำนวน":"Qty",
"วันที่":"Date",
"รายการ":"item(s)",
"ผู้จัดทำ":"Prepared by",
"ผู้ตรวจสอบ":"Checked by",
"ผู้อนุมัติ":"Approved by",
"โหลดหน้าจอใหม่แล้ว":"Screen reloaded",
"เบราว์เซอร์บล็อกป๊อปอัพ — กรุณาอนุญาต popup":"Browser blocked the popup — please allow popups",
"ในหน้าต่างพิมพ์ เลือกปลายทาง \"Save as PDF\" เพื่อบันทึกไฟล์":"In the print dialog choose \"Save as PDF\" to save the file"
};

var lang='th';
try{lang=localStorage.getItem(LS_KEY)||'th';}catch(e){}
if(lang!=='en')lang='th';

var DICT=null,RX=null,TITLE_O=null;
var REG=[],AREG=[];           /* text nodes / elements ที่ถูกแปลไว้ (เพื่อสลับกลับ) */
var SKIP_TAGS={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1};
var ATTRS=['placeholder','title','aria-label','alt','data-tip','data-tooltip'];

function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

function buildDict(){
  DICT={};var k;
  for(k in COMMON)DICT[k.trim()]=COMMON[k];
  var pg=window.APEX_I18N_PAGE||{};
  for(k in pg)DICT[k.trim()]=pg[k];
  /* substring pass: เฉพาะ key ยาว ≥4 ตัวอักษร เรียงยาว→สั้น กันแทนที่คำสั้นผิดตำแหน่ง */
  var keys=Object.keys(DICT).filter(function(x){return x.length>=4;})
    .sort(function(a,b){return b.length-a.length;});
  RX=keys.length?new RegExp(keys.map(escRe).join('|'),'g'):null;
}

/* แปลสตริง: จับคู่ทั้งก้อนก่อน ไม่เจอค่อยแทนที่รายวลี */
function trStr(s){
  if(!s||!TH_RE.test(s))return null;
  var t=s.trim(),lead=s.slice(0,s.indexOf(t.charAt(0))),tail='';
  if(t.length)tail=s.slice(lead.length+t.length);
  if(DICT.hasOwnProperty(t))return lead+DICT[t]+tail;
  if(RX){
    var out=s.replace(RX,function(m){return DICT[m];});
    if(out!==s)return out;
  }
  return null;
}

function trNode(nd){
  var p=nd.parentNode;
  if(!p||SKIP_TAGS[p.nodeName])return;
  if(p.closest&&p.closest('[data-no-i18n]'))return;
  var s=nd.data;
  if(!s||!TH_RE.test(s))return;
  var res=trStr(s);
  if(res==null||res===s)return;
  if(nd.__apexO==null){nd.__apexO=s;REG.push(nd);}
  nd.__apexSet=res;nd.data=res;
}

function trAttrs(el){
  if(!el.getAttribute)return;
  if(el.closest&&el.closest('[data-no-i18n]'))return;
  for(var i=0;i<ATTRS.length;i++){
    var a=ATTRS[i],v=el.getAttribute(a);
    if(!v||!TH_RE.test(v))continue;
    var res=trStr(v);
    if(res==null)continue;
    if(!el.__apexA){el.__apexA={};AREG.push(el);}
    if(!(a in el.__apexA))el.__apexA[a]=v;
    el.setAttribute(a,res);
  }
  /* ปุ่ม input value */
  if(el.tagName==='INPUT'&&/^(button|submit|reset)$/i.test(el.type||'')&&TH_RE.test(el.value||'')){
    var rv=trStr(el.value);
    if(rv!=null){
      if(!el.__apexA){el.__apexA={};AREG.push(el);}
      if(!('value' in el.__apexA))el.__apexA.value=el.value;
      el.value=rv;
    }
  }
}

function walk(root){
  if(root.nodeType===3){trNode(root);return;}
  if(root.nodeType!==1||SKIP_TAGS[root.nodeName])return;
  if(root.id==='apexLangBtn')return;
  trAttrs(root);
  var els=root.querySelectorAll('*');
  for(var i=0;i<els.length;i++)trAttrs(els[i]);
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,list=[];
  while((n=w.nextNode()))list.push(n);
  for(var j=0;j<list.length;j++)trNode(list[j]);
}

function revert(){
  var i;
  for(i=0;i<REG.length;i++){
    var nd=REG[i];
    if(nd.__apexO!=null){nd.__apexSet=nd.__apexO;nd.data=nd.__apexO;nd.__apexO=null;}
  }
  REG=[];
  for(i=0;i<AREG.length;i++){
    var el=AREG[i],m=el.__apexA||{};
    for(var a in m){
      if(a==='value')el.value=m[a];
      else el.setAttribute(a,m[a]);
    }
    el.__apexA=null;
  }
  AREG=[];
  if(TITLE_O!=null)document.title=TITLE_O;
}

/* ─── MutationObserver: แปลเนื้อหาที่ JS สร้างทีหลัง (modal, toast, ตาราง re-render) ─── */
var mo=new MutationObserver(function(muts){
  if(lang!=='en')return;
  for(var i=0;i<muts.length;i++){
    var m=muts[i];
    if(m.type==='childList'){
      for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j]);
    }else if(m.type==='characterData'){
      var nd=m.target;
      if(nd.__apexSet===nd.data)continue;   /* การเขียนของเราเอง */
      nd.__apexO=null;                       /* ข้อความใหม่จากแอป — แปลรอบใหม่ */
      trNode(nd);
    }else if(m.type==='attributes'){
      var el=m.target,at=m.attributeName;
      var v=el.getAttribute&&el.getAttribute(at);
      if(!v||!TH_RE.test(v))continue;       /* ค่าที่เราแปลแล้วไม่มีอักษรไทย — จบ ไม่วนลูป */
      if(el.closest&&el.closest('[data-no-i18n]'))continue;
      var rs=trStr(v);
      if(rs!=null){
        if(!el.__apexA){el.__apexA={};AREG.push(el);}
        el.__apexA[at]=v;                    /* ค่าใหม่จากแอปคือต้นฉบับล่าสุด */
        el.setAttribute(at,rs);
      }
    }
  }
});

/* ─── ปุ่มสลับภาษา ─── */
var GLOBE='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18"/></svg>';
function ensureBtnStyle(){
  if(document.getElementById('apexI18nStyle'))return;
  var st=document.createElement('style');
  st.id='apexI18nStyle';
  st.textContent='#apexLangBtn{position:fixed;right:16px;bottom:16px;z-index:5900;display:flex;align-items:center;gap:7px;'+
    'background:#fff;border:1px solid #cfd9e4;border-radius:999px;padding:9px 16px;'+
    "font-family:'Sarabun','Segoe UI',Tahoma,sans-serif;font-size:13.5px;font-weight:700;color:#1f6fc4;"+
    'cursor:pointer;box-shadow:0 6px 20px -6px rgba(15,40,80,.35);transition:background .15s,border-color .15s}'+
    '#apexLangBtn:hover{background:#f1f8fe;border-color:#9fc4e8}'+
    '#apexLangBtn:active{transform:translateY(.5px)}'+
    '@media print{#apexLangBtn{display:none!important}}';
  document.head.appendChild(st);
}
function updateBtn(){
  var b=document.getElementById('apexLangBtn');
  if(!b)return;
  b.innerHTML=GLOBE+'<span>'+(lang==='th'?'EN':'ไทย')+'</span>';
  b.title=lang==='th'?'Switch to English':'เปลี่ยนเป็นภาษาไทย';
}
function makeBtn(){
  if(EMBED||window.APEX_I18N_NO_BTN||document.getElementById('apexLangBtn'))return;
  ensureBtnStyle();
  var b=document.createElement('button');
  b.id='apexLangBtn';
  b.setAttribute('data-no-i18n','');
  b.onclick=function(){setLang(lang==='th'?'en':'th',true);};
  document.body.appendChild(b);
  updateBtn();
}

/* ─── สลับภาษา ─── */
function setLang(l,announce){
  l=l==='en'?'en':'th';
  lang=l;
  try{localStorage.setItem(LS_KEY,l);}catch(e){}
  document.documentElement.lang=l;
  if(l==='en'){
    buildDict();
    if(TITLE_O==null)TITLE_O=document.title;
    walk(document.body);
    var tt=trStr(TITLE_O);
    if(tt!=null)document.title=tt;
  }else{
    revert();
  }
  updateBtn();
  try{window.dispatchEvent(new CustomEvent('apexlang',{detail:{lang:l}}));}catch(e){}
  if(announce){
    var ifr=document.querySelectorAll('iframe');
    for(var i=0;i<ifr.length;i++){
      try{ifr[i].contentWindow.postMessage({apexLang:l},'*');}catch(e){}
    }
  }
}

/* ─── sync ภาษาแม่↔ลูก (index shell ↔ iframe) ─── */
window.addEventListener('message',function(e){
  var d=e.data||{};
  if(d.apexLang&&d.apexLang!==lang)setLang(d.apexLang,true);
  else if(d.apexI18nQuery&&e.source){
    try{e.source.postMessage({apexLang:lang},'*');}catch(err){}
  }
});

/* ─── แปล config ของ ApexReport (popup พิมพ์เอกสาร) ─── */
function deepTr(v){
  if(typeof v==='string'){var r=trStr(v);return r!=null?r:v;}
  if(Array.isArray(v)){var a=[];for(var i=0;i<v.length;i++)a[i]=deepTr(v[i]);return a;}
  if(v&&typeof v==='object'){var o={};for(var k in v)o[k]=deepTr(v[k]);return o;}
  return v;
}
function wrapReport(){
  var AR=window.ApexReport;
  if(!AR||AR.__apexI18n)return;
  var orig=AR.open;
  AR.open=function(cfg){
    if(lang==='en'&&cfg){
      buildDict();
      var thTitle=cfg.title;
      cfg=deepTr(cfg);
      if(thTitle&&cfg.titleEn){cfg.title=cfg.titleEn;cfg.titleEn=thTitle;}
      if(!cfg.signs)cfg.signs=[['Prepared by',''],['Checked by',''],['Approved by','']];
      else cfg.signs=cfg.signs.map(function(s){return [s[1]||s[0],''];});
    }
    return orig.call(AR,cfg);
  };
  AR.__apexI18n=true;
}

/* ─── เริ่มทำงาน ─── */
function init(){
  makeBtn();
  wrapReport();
  mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  if(lang==='en')setLang('en',false);
  if(EMBED){
    try{window.parent.postMessage({apexI18nQuery:1},'*');}catch(e){}
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

window.ApexI18N={
  get lang(){return lang;},
  set:function(l){setLang(l,true);},
  t:function(s){if(lang!=='en')return s;if(!DICT)buildDict();var r=trStr(s);return r!=null?r:s;}
};
})();
