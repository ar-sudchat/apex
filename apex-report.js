/* ═══════════════════════════════════════════════════════════════════
   APEX Report Engine — popup print-preview A4 (ใช้ร่วมกันทุกหน้า)
   ApexReport.open({ docNo, title, titleEn, meta, meta2, cols, rows,
                     totals, note, signs })
   ═══════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ─── Code 128B barcode (ของจริง สแกนได้) ─── */
const C128=['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
'221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
'221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
'212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
'231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
'231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
'314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
'112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
'111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
'214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
'114131','311141','411131','211412','211214','211232','2331112'];

function barcodeSvg(text,h){
  h=h||54;
  const t=String(text).replace(/[^\x20-\x7E]/g,'-');
  let sum=104;
  const seq=[C128[104]];
  for(let i=0;i<t.length;i++){const v=t.charCodeAt(i)-32;sum+=v*(i+1);seq.push(C128[v]);}
  seq.push(C128[sum%103],C128[106]);
  const widths=seq.join('');
  let total=20,x=10,rects='',bar=true;
  for(const ch of widths)total+=+ch;
  for(const ch of widths){
    const w=+ch;
    if(bar)rects+=`<rect x="${x}" y="0" width="${w}" height="${h}"/>`;
    bar=!bar;x+=w;
  }
  return `<svg class="arp-bcsvg" viewBox="0 0 ${total} ${h}" width="${Math.round(total*1.9)}" height="${h}" preserveAspectRatio="none" shape-rendering="crispEdges" fill="#111">${rects}</svg>`;
}

/* ─── QR (ลวดลายเชิงสัญลักษณ์ ประกอบเอกสาร — deterministic ตามเลขเอกสาร) ─── */
function hash32(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function qrSvg(text,px){
  px=px||108;
  const n=25,rnd=mulberry32(hash32(String(text)));
  const m=[];for(let y=0;y<n;y++){m.push([]);for(let x=0;x<n;x++)m[y][x]=rnd()<.44;}
  const clear=(cx,cy,s)=>{for(let y=0;y<s;y++)for(let x=0;x<s;x++){const yy=cy+y,xx=cx+x;if(yy>=0&&yy<n&&xx>=0&&xx<n)m[yy][xx]=false;}};
  const finder=(cx,cy)=>{clear(cx-1,cy-1,9);for(let y=0;y<7;y++)for(let x=0;x<7;x++)m[cy+y][cx+x]=(x===0||x===6||y===0||y===6)||(x>=2&&x<=4&&y>=2&&y<=4);};
  finder(0,0);finder(n-7,0);finder(0,n-7);
  for(let i=8;i<n-8;i++){m[6][i]=i%2===0;m[i][6]=i%2===0;}
  clear(n-9,n-9,5);
  for(let y=0;y<5;y++)for(let x=0;x<5;x++)m[n-9+y][n-9+x]=(x===0||x===4||y===0||y===4)||(x===2&&y===2);
  m[n-8][8]=true;
  let rects='';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])rects+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" shape-rendering="crispEdges" fill="#111">${rects}</svg>`;
}

/* ─── CSS ─── */
const DOC_CSS=`
.arp-sheet{width:794px;min-height:1123px;background:#fff;margin:0 auto;padding:54px 56px 44px;
  font-family:'Sarabun','Segoe UI',Tahoma,sans-serif;color:#1f2937;display:flex;flex-direction:column;
  box-sizing:border-box;font-size:13px;line-height:1.45}
.arp-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
.arp-co{font-size:15px;font-weight:700;color:#111827;margin-bottom:16px}
.arp-title{font-size:24px;font-weight:700;color:#1f6fc4;line-height:1.2}
.arp-sub{font-size:12.5px;color:#8a97a5;margin-top:3px}
.arp-hd-r{display:flex;gap:18px;align-items:flex-start;flex:none}
.arp-qr,.arp-bc{text-align:center}
.arp-qr svg,.arp-bc svg{display:block;margin:0 auto}
.arp-qr-cap{font-size:10.5px;color:#8a97a5;margin-top:5px}
.arp-bc-txt{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;letter-spacing:3px;margin-top:5px;color:#111}
.arp-rule{height:3px;background:#111;margin-top:16px}
.arp-meta{display:grid;grid-template-columns:1fr 1fr;column-gap:64px;margin-top:20px;align-content:start}
.arp-mcol{display:flex;flex-direction:column}
.arp-mr{display:flex;font-size:13.5px;padding:4.5px 0}
.arp-ml{width:150px;flex:none;color:#64748b}
.arp-mv{font-weight:600;color:#111827}
.arp-tbl{width:100%;max-width:100%;border-collapse:collapse;margin-top:20px;font-size:12.3px}
.arp-tbl thead th{background:#f3f4f6!important;color:#111827!important;position:static!important;
  border:none;border-top:2px solid #111;border-bottom:2px solid #111;
  padding:8px 7px;font-weight:700;text-align:left;white-space:normal!important;font-size:12.3px;vertical-align:bottom}
.arp-tbl td{padding:7.5px 7px;border:none;border-bottom:1px solid #e7ebf0;vertical-align:top;
  color:#1f2937;background:transparent;font-size:12.3px;overflow-wrap:anywhere;white-space:normal!important}
.arp-tbl tbody tr:last-child td{border-bottom:1px solid #c9d2dc}
.arp-c{text-align:center!important}.arp-r{text-align:right!important}
.arp-tot{margin-left:auto;width:330px;margin-top:14px;font-size:13.5px}
.arp-tr{display:flex;justify-content:space-between;gap:20px;padding:7px 2px;border-bottom:1px solid #dfe5ec}
.arp-tr span{color:#334155}
.arp-tr b{font-weight:600}
.arp-tr.b{font-weight:700;border-top:2px solid #111;border-bottom:3px double #111;margin-top:2px}
.arp-tr.b span,.arp-tr.b b{font-weight:700;font-size:14.5px;color:#111}
.arp-note{margin-top:18px;font-size:12.3px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;
  border-radius:8px;padding:10px 14px}
.arp-sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:56px;margin-top:auto;padding-top:78px}
.arp-sg{text-align:center;font-size:12.3px;color:#64748b}
.arp-sg .ln{border-bottom:1px solid #94a3b8;height:0;margin-bottom:10px}
.arp-sg b{display:block;color:#111827;font-size:13.2px}
`;

const UI_CSS=`
#arp-root{position:fixed;inset:0;z-index:6000;display:flex;align-items:center;justify-content:center;
  font-family:'Sarabun','Segoe UI',Tahoma,sans-serif}
#arp-root .arp-ov{position:absolute;inset:0;background:rgba(15,23,42,.5)}
.arp-win{position:relative;background:#fff;border-radius:16px;box-shadow:0 24px 70px -12px rgba(2,20,50,.5);
  width:min(1180px,calc(100vw - 40px));height:calc(100vh - 40px);display:flex;flex-direction:column;
  overflow:hidden;animation:arpPop .18s ease}
@keyframes arpPop{from{transform:translateY(14px) scale(.985);opacity:0}}
.arp-win.max{width:100vw;height:100vh;border-radius:0}
.arp-win.min{height:60px}
.arp-win.min .arp-body,.arp-win.min .arp-ft{display:none}
.arp-tbar{display:flex;align-items:center;gap:6px;padding:13px 14px 13px 26px;flex:none}
.arp-tbar b{font-size:19px;color:#1e293b;margin-right:auto;font-weight:700}
.arp-wb{width:32px;height:32px;border:none;background:transparent;border-radius:8px;color:#64748b;
  cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.arp-wb:hover{background:#eef2f7;color:#0f172a}
.arp-wb.x:hover{background:#fde8e8;color:#c02626}
.arp-wb svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.arp-body{flex:1;overflow:auto;background:#e9edf3;padding:26px 20px}
.arp-body .arp-sheet{box-shadow:0 3px 18px rgba(15,40,80,.2);border-radius:2px}
.arp-ft{flex:none;display:flex;align-items:center;gap:10px;padding:13px 18px;border-top:1px solid #e8edf3;background:#fff}
.arp-ft .cap{color:#5b7590;font-size:14.5px;margin-right:auto;padding-left:10px}
.arp-fb{display:flex;align-items:center;gap:8px;border:1px solid #cfd9e4;background:#fff;color:#1e293b;
  border-radius:10px;padding:10px 16px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:.14s}
.arp-fb:hover{background:#f4f7fb}
.arp-fb.p{background:#1d6ce0;border-color:#1d6ce0;color:#fff}
.arp-fb.p:hover{background:#1a5fc7}
.arp-fb svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#arp-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:6500;
  background:#16324f;color:#fff;font-family:'Sarabun',sans-serif;font-size:13.5px;padding:9px 18px;
  border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:.22s}
#arp-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:900px){.arp-body{padding:14px 8px}}
@media print{#arp-root{display:none!important}}
`;

/* ─── helpers ─── */
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt=(n,d)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});

function ensureStyle(){
  if(document.getElementById('arp-style'))return;
  const st=document.createElement('style');
  st.id='arp-style';st.textContent=UI_CSS+DOC_CSS;
  document.head.appendChild(st);
}

/* ─── สร้างเนื้อเอกสาร A4 ─── */
function sheetHtml(cfg){
  const company=cfg.company||'บริษัท เอเพ็กซ์ เซอร์คิต (ไทยแลนด์) จำกัด';
  const metaCol=list=>!list||!list.length?'':`<div class="arp-mcol">${list.map(r=>
    `<div class="arp-mr"><span class="arp-ml">${esc(r[0])}:</span><span class="arp-mv">${esc(r[1])}</span></div>`).join('')}</div>`;
  const alignCls=a=>a==='r'?' class="arp-r"':a==='c'?' class="arp-c"':'';
  const cols=cfg.cols||[];
  const thead=`<tr>${cols.map(c=>`<th${alignCls(c.a)}${c.w?` style="width:${c.w}"`:''}>${esc(c.t)}</th>`).join('')}</tr>`;
  const tbody=(cfg.rows||[]).map(r=>`<tr>${r.map((v,i)=>`<td${alignCls(cols[i]&&cols[i].a)}>${esc(v)}</td>`).join('')}</tr>`).join('');
  const totals=cfg.totals&&cfg.totals.length?`<div class="arp-tot">${cfg.totals.map(t=>
    `<div class="arp-tr${t[2]?' b':''}"><span>${esc(t[0])}:</span><b>${esc(t[1])}</b></div>`).join('')}</div>`:'';
  const note=cfg.note?`<div class="arp-note">${esc(cfg.note)}</div>`:'';
  const signs=(cfg.signs||[['ผู้จัดทำ','Prepared by'],['ผู้ตรวจสอบ','Checked by'],['ผู้อนุมัติ','Approved by']])
    .map(s=>`<div class="arp-sg"><div class="ln"></div><b>${esc(s[0])}</b>${esc(s[1])}<br/>Date ...............</div>`).join('');
  return `<div class="arp-sheet">
    <div class="arp-hd">
      <div class="arp-hd-l">
        <div class="arp-co">${esc(company)}</div>
        <div class="arp-title">${esc(cfg.title||'รายงาน')}</div>
        <div class="arp-sub">${esc(cfg.titleEn||'')}</div>
      </div>
      <div class="arp-hd-r">
        <div class="arp-qr">${qrSvg(cfg.docNo||'APEX')}<div class="arp-qr-cap">Open in system</div></div>
        <div class="arp-bc">${barcodeSvg(cfg.docNo||'APEX')}<div class="arp-bc-txt">${esc(cfg.docNo||'')}</div></div>
      </div>
    </div>
    <div class="arp-rule"></div>
    <div class="arp-meta">${metaCol(cfg.meta)}${metaCol(cfg.meta2)}</div>
    ${cols.length?`<table class="arp-tbl"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`:''}
    ${totals}${note}
    <div class="arp-sign">${signs}</div>
  </div>`;
}

/* ─── หน้าเต็มสำหรับแท็บใหม่ / พิมพ์ ─── */
function fullPage(cfg,autoPrint){
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"/>
<title>${esc(cfg.docNo||'รายงาน')} — ${esc(cfg.title||'')}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
body{margin:0;background:#8b95a5}
${DOC_CSS}
.arp-sheet{margin:24px auto;box-shadow:0 4px 22px rgba(0,0,0,.35)}
@page{size:A4;margin:0}
@media print{
  body{background:#fff}
  .arp-sheet{width:210mm;min-height:296mm;margin:0;padding:14mm 14mm 12mm;box-shadow:none}
}
</style></head><body>${sheetHtml(cfg)}
${autoPrint?'<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)})<\/script>':''}
</body></html>`;
}

function openWindow(cfg,autoPrint){
  const w=window.open('','_blank');
  if(!w){toast('เบราว์เซอร์บล็อกป๊อปอัพ — กรุณาอนุญาต popup');return;}
  w.document.open();w.document.write(fullPage(cfg,autoPrint));w.document.close();
}

function toast(msg){
  ensureStyle();
  let t=document.getElementById('arp-toast');
  if(!t){t=document.createElement('div');t.id='arp-toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('on');
  clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('on'),2600);
}

/* ─── popup ─── */
let CUR=null;
function close(){
  const r=document.getElementById('arp-root');
  if(r)r.remove();
  document.removeEventListener('keydown',onKey,true);
  CUR=null;
}
function onKey(e){
  if(e.key==='Escape'){e.stopPropagation();close();}
}

const I_MIN='<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>';
const I_MAX='<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="1.5"/></svg>';
const I_X='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const I_EXT='<svg viewBox="0 0 24 24"><path d="M14 4h6v6"/><path d="M20 4L11 13"/><path d="M19 14v5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5H10"/></svg>';
const I_DL='<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 11l4.5 4.5L16.5 11"/><path d="M4 19.5h16"/></svg>';
const I_PR='<svg viewBox="0 0 24 24"><path d="M7 8V3.5h10V8"/><rect x="4" y="8" width="16" height="8.5" rx="1.5"/><path d="M7 14h10v6H7z" fill="#fff" stroke="currentColor"/></svg>';

function open(cfg){
  ensureStyle();close();
  CUR=cfg;
  const root=document.createElement('div');
  root.id='arp-root';
  root.innerHTML=`<div class="arp-ov"></div>
  <div class="arp-win">
    <div class="arp-tbar">
      <b>${esc(cfg.docNo||cfg.title||'รายงาน')}</b>
      <button class="arp-wb" data-a="min" title="ย่อ">${I_MIN}</button>
      <button class="arp-wb" data-a="max" title="ขยาย">${I_MAX}</button>
      <button class="arp-wb x" data-a="close" title="ปิด">${I_X}</button>
    </div>
    <div class="arp-body">${sheetHtml(cfg)}</div>
    <div class="arp-ft">
      <span class="cap">Print preview — actual document at A4 size</span>
      <button class="arp-fb" data-a="tab">${I_EXT} Open in new tab</button>
      <button class="arp-fb" data-a="pdf">${I_DL} Download PDF</button>
      <button class="arp-fb p" data-a="print">${I_PR} Print</button>
    </div>
  </div>`;
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-a]');if(!b)return;
    const a=b.dataset.a,win=root.querySelector('.arp-win');
    if(a==='close')close();
    else if(a==='min')win.classList.toggle('min');
    else if(a==='max'){win.classList.toggle('max');win.classList.remove('min');}
    else if(a==='tab')openWindow(CUR,false);
    else if(a==='print')openWindow(CUR,true);
    else if(a==='pdf'){openWindow(CUR,true);toast('ในหน้าต่างพิมพ์ เลือกปลายทาง "Save as PDF" เพื่อบันทึกไฟล์');}
  });
  document.body.appendChild(root);
  document.addEventListener('keydown',onKey,true);
}

window.ApexReport={open,close,fmt,toast};
})();
