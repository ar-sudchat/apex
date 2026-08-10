/* apex-fit.js — กันหน้าจอล้นกรอบ
   ─────────────────────────────────────────────────────────────────────────
   หน้าจอเดโมออกแบบไว้ที่ราว 1500px แต่ถูกฝังใน iframe/สไลด์ที่แคบกว่า
   ตารางที่มีคอลัมน์เยอะจะดันหน้าให้กว้างเกินกรอบ พอถูกครอบตัดจึงเห็นไม่ครบ

   ตัวช่วยนี้ทำสามอย่าง
   1) กล่องซ้อน (dialog/popup) ที่เนื้อในล้นจนขึ้นสกรอลล์ → ขยายกล่องออกให้พอดี
      เท่าที่พื้นที่ในจอมี ทั้งกว้างและสูง  ตอนนำเสนอจะได้เห็นครบทั้งตาราง
      ไม่ต้องลากสกรอลล์ (ถ้าขยายจนเต็มจอแล้วยังไม่พอ สกรอลล์จะยังอยู่ตามเดิม)
   2) ตารางไหนกว้างกว่ากล่องที่ครอบอยู่ → ให้กล่องนั้นเลื่อนแนวนอนในตัวเอง
      (ไม่ย่อคอลัมน์ ตัวหนังสือจึงไม่แน่นจนอ่านไม่ออก)
   3) กล่อง grid/flex ที่ตั้ง min-width ไว้กว้างกว่าจอ → ปลด min-width ชั่วคราว

   ทำงานทั้งตอนโหลด ตอน resize และตอน DOM เปลี่ยน (ตาราง re-render, เปิด dialog)
   ─────────────────────────────────────────────────────────────────────────  */
(function(){
'use strict';

var MARK='__apexFit';

/* ═══ 1) กล่องซ้อน — ขยายแทนการให้เลื่อน ═══════════════════════════════════
   ทุกหน้าใช้โครงเดียวกัน  .mask (พื้นหลังคลุมจอ) > .dlg (ตัวกล่อง) > .dlg-bd
   .dlg-bd ตั้ง overflow:auto ไว้ เนื้อหาที่ล้นจึงวัดได้จาก scrollWidth ของมัน  */

var PANEL_SEL='.dlg,.hist-win,.modal,.dialog,.popup';
var MASK_SEL ='[class*="mask"],[class*="overlay"],[class*="backdrop"]';

/* กล่องที่เราแก้สไตล์ไว้ — คืนค่าเดิมก่อนวัดรอบใหม่ทุกครั้ง จะได้ไม่สะสมค่าเก่า */
var touched=[];
function remember(el){
  touched.push({el:el,w:el.style.width,mw:el.style.maxWidth,
                mh:el.style.maxHeight,h:el.style.height});
}
function restoreAll(){
  for(var i=0;i<touched.length;i++){
    var t=touched[i];
    t.el.style.width=t.w; t.el.style.maxWidth=t.mw;
    t.el.style.maxHeight=t.mh; t.el.style.height=t.h;
  }
  touched.length=0;
}

function panelList(){
  var out=[],i,j,k;
  var a=document.querySelectorAll(PANEL_SEL);
  for(i=0;i<a.length;i++) if(out.indexOf(a[i])<0) out.push(a[i]);
  var m=document.querySelectorAll(MASK_SEL);
  for(i=0;i<m.length;i++){
    var p=getComputedStyle(m[i]).position;
    if(p!=='fixed'&&p!=='absolute')continue;      /* ต้องเป็นแผ่นคลุมจอจริง ๆ */
    var kids=m[i].children;
    for(j=0;j<kids.length;j++){
      k=kids[j];
      if(k.nodeType===1&&out.indexOf(k)<0) out.push(k);
    }
  }
  return out;
}

/* เนื้อในกล่องนี้ยังขาดความกว้างอีกเท่าไร — ดูจากลูกที่เลื่อนแนวนอนได้ */
function shortfallX(panel){
  var max=0, all=panel.querySelectorAll('*');
  for(var i=0;i<all.length;i++){
    var k=all[i], d=k.scrollWidth-k.clientWidth;
    if(d<=2)continue;
    var ox=getComputedStyle(k).overflowX;
    if(ox!=='auto'&&ox!=='scroll')continue;
    if(d>max)max=d;
  }
  return max;
}

/* ยืดกล่องเนื้อหาในกล่องซ้อน ให้กินที่ว่างที่ยังเหลือในจอ
   กล่องนอกสุดได้ก่อน (เรียงตามลำดับในเอกสาร) กล่องซ้อนชั้นในจึงไม่แย่งที่ไปก่อน */
function growHeight(panel,spare){
  var all=panel.querySelectorAll('*');
  for(var i=0;i<all.length&&spare>6;i++){
    var k=all[i], cs=getComputedStyle(k);
    if(cs.overflowY!=='auto'&&cs.overflowY!=='scroll')continue;
    var need=k.scrollHeight-k.clientHeight;
    if(need<=2)continue;
    var add=Math.min(need+2,spare), h=k.getBoundingClientRect().height+add;
    remember(k);
    k.style.maxHeight=h+'px';
    if(cs.height!=='auto'&&cs.maxHeight==='none')k.style.height=h+'px';
    spare-=add;
  }
}

function growPanels(){
  var ps=panelList();
  for(var i=0;i<ps.length;i++){
    var el=ps[i];
    if(!el.getClientRects().length)continue;                /* ซ่อนอยู่ */
    var host=el.parentElement; if(!host)continue;
    var hcs=getComputedStyle(host);
    var availW=(host.clientWidth ||document.documentElement.clientWidth)
               -(parseFloat(hcs.paddingLeft)||0)-(parseFloat(hcs.paddingRight)||0)-2;
    var availH=(host.clientHeight||document.documentElement.clientHeight)
               -(parseFloat(hcs.paddingTop)||0)-(parseFloat(hcs.paddingBottom)||0)-2;

    /* กว้าง — วัดแล้วเติม สองรอบพอให้ลงตัวเมื่อมีกล่องเลื่อนซ้อนกัน */
    for(var pass=0;pass<2;pass++){
      var cur=el.getBoundingClientRect().width;
      if(cur>=availW-1)break;
      var need=shortfallX(el);
      if(need<=2)break;
      if(pass===0)remember(el);
      el.style.maxWidth='none';
      el.style.width=Math.min(availW,cur+need+2)+'px';
    }

    /* สูง — ที่ว่างที่เหลือหลังจากกล่องกว้างขึ้นแล้ว */
    var spare=availH-el.getBoundingClientRect().height;
    if(spare>6)growHeight(el,spare-4);
  }
}

/* ═══ 2) ตารางในหน้า ═══════════════════════════════════════════════════════ */
function fitTables(root){
  var t=(root||document).querySelectorAll('table');
  for(var i=0;i<t.length;i++){
    var tb=t[i], box=tb.parentElement;
    if(!box||box===document.body)continue;
    /* ข้ามตารางที่อยู่ในกล่องเลื่อนอยู่แล้ว */
    var cs=getComputedStyle(box);
    if(cs.overflowX==='auto'||cs.overflowX==='scroll'){continue;}
    var need=tb.scrollWidth||tb.getBoundingClientRect().width;
    if(need-box.clientWidth>2){
      box.style.overflowX='auto';
      box[MARK]=1;
    }else if(box[MARK]){
      box.style.overflowX='';
      box[MARK]=0;
    }
  }
}

/* ═══ 3) min-width ที่กว้างเกินจอ ═══════════════════════════════════════════ */
function relaxMinWidth(){
  var vw=document.documentElement.clientWidth;
  var els=document.querySelectorAll('[style*="min-width"],.hero-cards,.charts,.sumrow');
  for(var i=0;i<els.length;i++){
    var el=els[i], cs=getComputedStyle(el);
    var mw=parseFloat(cs.minWidth);
    if(mw&&mw>vw-40){
      if(el[MARK+'mw']==null)el[MARK+'mw']=el.style.minWidth||'';
      el.style.minWidth='0';
    }else if(el[MARK+'mw']!=null){
      el.style.minWidth=el[MARK+'mw'];
      el[MARK+'mw']=null;
    }
  }
}

/* กล่องซ้อนที่เปิดอยู่ยังขาดความกว้างอีกเท่าไร (ขยายจนเต็มพื้นที่แล้วยังไม่พอ)
   ให้หน้าแม่ (presentation.html) เรียกดูเพื่อขยาย viewport ของกรอบต่อให้
   ─ ดูเฉพาะในกล่องซ้อน ไม่นับตารางในหน้าหลัก เพราะกระดานแผนตั้งใจให้เลื่อนอยู่แล้ว */
function dlgFit(){
  var ps=panelList(),need=0,open=false;
  for(var i=0;i<ps.length;i++){
    if(!ps[i].getClientRects().length)continue;
    open=true;
    var d=shortfallX(ps[i]);
    if(d>need)need=d;
  }
  return {open:open,need:need};
}

var pending=false;
function work(){
  if(!pending)return;
  pending=false;
  /* ลำดับสำคัญ — คืนค่าเดิมก่อนเสมอ จะได้วัดจากขนาดตั้งต้นทุกรอบ (ไม่สะสม)
     แล้ว fitTables รอบแรกทำให้กล่องที่เนื้อในล้น "เลื่อนได้" จึงวัดได้ว่าขาดเท่าไร
     growPanels ขยายกล่องซ้อน  แล้ว fitTables รอบสองถอดสกรอลล์ที่ไม่ต้องใช้แล้วออก */
  try{restoreAll();relaxMinWidth();fitTables();growPanels();fitTables();}catch(e){}
}
function run(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(work);
  /* กันเหนียว — requestAnimationFrame ไม่ทำงานตอนแท็บอยู่เบื้องหลังหรือ iframe
     ยังไม่ถูกแสดงผล ถ้าปล่อยไว้ตัวล็อกจะค้างแล้ว apex-fit หยุดทำงานถาวร */
  setTimeout(work,60);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
else run();
window.addEventListener('load',run);
window.addEventListener('resize',run);
setTimeout(run,400);
setTimeout(run,1200);

var mo;
try{
  mo=new MutationObserver(function(m){
    for(var i=0;i<m.length;i++){
      if(m[i].type==='childList'&&(m[i].addedNodes.length||m[i].removedNodes.length)){run();return;}
    }
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}catch(e){}

window.ApexFit={refresh:run,dlgFit:dlgFit};
})();
