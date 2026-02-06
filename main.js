"use strict";

const AUTH={u:"admin",p:"sem2@2026",k:"UFC_AUTH"};
const HKEY="UFC_HISTORY_V6", CKEY="UFC_CFG_V4";

const $=id=>document.getElementById(id);
const page=()=> (location.pathname.split("/").pop()||"login.html").toLowerCase();
const msg=(id,t,k)=>{const el=$(id); if(!el) return;
  el.className="msg"+(k?" "+k:""); el.textContent=t||"";};
const stat=(t)=>{const s=$("status"); if(s) s.textContent=t||"Ready";};

function logged(){return localStorage.getItem(AUTH.k)==="1";}
function gate(){
  const p=page(), onLogin=(p==="login.html"||p==="");
  if(!logged() && !onLogin) location.replace("login.html");
  if(logged() && onLogin) location.replace("index.html");
}

function uid(){return "id_"+Date.now()+"_"+Math.random().toString(16).slice(2);}

function defCfg(){
  return {
    cur:"$", term:"Semester 2",
    planFee:5,intlFee:15,repFee:8,latePerDay:1,
    rates:{undergrad:{local:30,international:50},postgrad:{local:50,international:75}},
    programs:[
      {id:"p1",k:"cs",n:"Computer Science",f:25},
      {id:"p2",k:"biz",n:"Business Admin",f:20},
      {id:"p3",k:"eng",n:"Engineering",f:30},
      {id:"p4",k:"med",n:"Medicine",f:45},
      {id:"p5",k:"edu",n:"Education",f:18}
    ],
    fixed:[
      {id:"f1",l:"Registration",a:10},
      {id:"f2",l:"Exam",a:12},
      {id:"f3",l:"Services",a:8}
    ]
  };
}

function loadCfg(){try{return JSON.parse(localStorage.getItem(CKEY))||defCfg();}catch{return defCfg();}}
function saveCfg(cfg){localStorage.setItem(CKEY,JSON.stringify(cfg));}

function loadHist(){try{const a=JSON.parse(localStorage.getItem(HKEY)||"[]");return Array.isArray(a)?a:[];}catch{return [];}}
function saveHist(h){localStorage.setItem(HKEY,JSON.stringify(h));}

function money(cfg,n){return (cfg.cur||"$")+(Number(n)||0).toFixed(2);}
function fmt(ms){try{return new Date(ms).toLocaleString();}catch{return "";}}

function bindLogout(){
  const b=$("logoutBtn"); if(!b) return;
  b.addEventListener("click",()=>{localStorage.removeItem(AUTH.k); location.replace("login.html");});
}

function loginInit(){
  const f=$("loginForm"); if(!f) return;
  f.addEventListener("submit",(e)=>{
    e.preventDefault();
    const u=$("username").value.trim(), p=$("password").value;
    if(!u||!p) return msg("loginMsg","Required.","bad");
    if(u===AUTH.u && p===AUTH.p){localStorage.setItem(AUTH.k,"1"); location.replace("index.html");}
    else msg("loginMsg","Wrong username or password.","bad");
  });
}

/* Student Name letters + spaces only (any language) */
function isNameOnly(s){
  s=String(s||"").trim();
  if(s.length<2) return false;
  try{ return /^[\p{L}\s]+$/u.test(s); }catch{ return /^[A-Za-z\s]+$/.test(s); }
}

function computeBill(cfg, inp){
  const prog=cfg.programs.find(x=>x.id===inp.programId);
  const tu=Number(inp.credits||0) * (cfg.rates[inp.level]?.[inp.residency]||0);
  const progFee=prog?Number(prog.f||0):0;
  const fixedSum=cfg.fixed.reduce((s,x)=>s+Number(x.a||0),0);
  const repFee=(inp.repeatCourses==="yes") ? Number(inp.repeatCredits||0)*Number(cfg.repFee||0) : 0;
  const intl=(inp.residency==="international") ? Number(cfg.intlFee||0) : 0;
  const admin=(inp.paymentPlan==="installments") ? Number(cfg.planFee||0) : 0;
  const lf=Number(cfg.latePerDay||0)*Number(inp.lateDays||0);
  const fine=Number(inp.libraryFine||0);
  const disc=tu*(Number(inp.discountPercent||0)/100);
  const sub=tu+progFee+fixedSum+repFee+intl+admin+lf+fine;
  const total=Math.max(0, sub-disc);

  const items=[{l:"Tuition",a:tu},{l:"Program Fee",a:progFee}]
    .concat(cfg.fixed.map(x=>({l:x.l,a:Number(x.a||0)})));
  if(repFee) items.push({l:"Repeat Fee",a:repFee});
  if(intl) items.push({l:"International Fee",a:intl});
  if(admin) items.push({l:"Plan Fee",a:admin});
  if(fine) items.push({l:"Other Fine",a:fine});
  if(lf) items.push({l:"Late Fee",a:lf});
  items.push({l:"Discount",a:-disc});

  return {
    progId: prog?prog.id:"",
    progName: prog?prog.n:"",
    totals:{tuition:tu, discount:disc, total},
    items
  };
}

/* ===== Calculator: Calculate => STORE + REDIRECT history ===== */
function calcInit(){
  const f=$("feeForm"); if(!f) return;
  const cfg=loadCfg(); bindLogout(); stat("Ready");
  const progSel=$("program");
  const termPill=$("termPill"); if(termPill) termPill.textContent=cfg.term||"Term";

  progSel.innerHTML='<option value="">Select</option>';
  cfg.programs.forEach(p=>progSel.insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.n}</option>`));

  $("repeatCredits").disabled=true;
  $("repeatCourses").addEventListener("change",()=>{
    const on=$("repeatCourses").value==="yes";
    $("repeatCredits").disabled=!on; if(!on) $("repeatCredits").value=0;
  });

  const bad=(id,t)=>{$(id).classList.add("invalid"); msg("formMsg",t,"bad"); stat("Error"); return true;};
  const clearInv=()=>["studentName","studentId","program","credits","repeatCredits","lateDays","discountPercent","libraryFine"]
    .forEach(x=>$(x)?.classList.remove("invalid"));

  function getInput(){
    return {
      studentName:$("studentName").value.trim(),
      studentId:$("studentId").value.trim(),
      programId:progSel.value,
      level:$("level").value,
      credits:Number($("credits").value||0),
      residency:$("residency").value,
      repeatCourses:$("repeatCourses").value,
      repeatCredits:Number($("repeatCredits").value||0),
      lateDays:Number($("lateDays").value||0),
      discountPercent:Number($("discountPercent").value||0),
      libraryFine:Number($("libraryFine").value||0),
      paymentPlan:$("paymentPlan").value,
      term:cfg.term||""
    };
  }

  function validate(inp){
    clearInv();
    if(!isNameOnly(inp.studentName)) return bad("studentName","Student name must be letters only.");
    if(inp.studentId.length<2) return bad("studentId","ID required.");
    if(!inp.programId) return bad("program","Select program.");
    if(inp.credits<1||inp.credits>30) return bad("credits","Credits 1–30.");
    if(inp.repeatCourses==="no" && inp.repeatCredits>0) return bad("repeatCredits","Repeat must be 0.");
    if(inp.repeatCourses==="yes" && inp.repeatCredits<1) return bad("repeatCredits","Repeat >= 1.");
    if(inp.repeatCredits>inp.credits) return bad("repeatCredits","Repeat > credits.");
    if(inp.lateDays<0||inp.lateDays>365) return bad("lateDays","Late 0–365.");
    if(inp.discountPercent<0||inp.discountPercent>100) return bad("discountPercent","Discount 0–100.");
    if(inp.libraryFine<0) return bad("libraryFine","Fine >= 0.");
    return false;
  }

  function render(b){
    $("tuition").textContent=money(cfg,b.totals.tuition);
    $("discount").textContent=money(cfg,b.totals.discount);
    $("totalPayable").textContent=money(cfg,b.totals.total);
    const tb=$("breakdownBody"); tb.innerHTML="";
    b.items.forEach(it=>tb.insertAdjacentHTML("beforeend",
      `<tr><td>${it.l}</td><td class="r">${money(cfg,it.a)}</td></tr>`));
  }

  f.addEventListener("submit",(e)=>{
    e.preventDefault();
    const inp=getInput();
    if(validate(inp)) return;

    const bill=computeBill(cfg, inp);
    render(bill);

    // ✅ STORE IMMEDIATELY on Calculate
    const rec={id:uid(), at:Date.now(), input:inp, bill};
    const h=loadHist(); h.push(rec); saveHist(h);

    // ✅ Go to history and show it
    localStorage.setItem("LAST_REC_ID", rec.id);
    location.href="history.html";
  });

  $("resetBtn").addEventListener("click",()=>{
    f.reset(); progSel.value=""; $("repeatCredits").value=0; $("repeatCredits").disabled=true;
    $("tuition").textContent=money(cfg,0); $("discount").textContent=money(cfg,0); $("totalPayable").textContent=money(cfg,0);
    $("breakdownBody").innerHTML="<tr><td class='muted' colspan='2'>—</td></tr>";
    msg("formMsg",""); stat("Ready");
  });
}

/* ===== History: show ALL data + breakdown + CRUD ===== */
function histInit(){
  const wrap=$("histCards"); if(!wrap) return;
  const cfg=loadCfg(); bindLogout(); stat("Ready");
  const panel=$("editPanel");

  function fillProgram(sel){
    const c=loadCfg();
    sel.innerHTML='<option value="">Select</option>';
    c.programs.forEach(p=>sel.insertAdjacentHTML("beforeend",`<option value="${p.id}">${p.n}</option>`));
  }

  function card(rec){
    const b=rec.bill, i=rec.input;
    const items=b.items.map(x=>`<tr><td>${x.l}</td><td class="r">${money(cfg,x.a)}</td></tr>`).join("");
    return `
      <div class="mini" data-id="${rec.id}">
        <div class="miniHead">
          <div>
            <b>${i.studentName}</b> <span class="muted">(${i.studentId})</span>
            <div class="muted">${b.progName} • ${i.level} • ${i.residency} • Credits: ${i.credits} • ${fmt(rec.at)}</div>
          </div>
          <div class="r">
            <div class="big">${money(cfg,b.totals.total)}</div>
            <div class="actions" style="justify-content:flex-end">
              <button class="btn sm" data-act="edit" data-id="${rec.id}">Edit</button>
              <button class="btn sm danger" data-act="del" data-id="${rec.id}">Del</button>
            </div>
          </div>
        </div>

        <div class="tableWrap" style="margin-top:10px">
          <table>
            <thead><tr><th>Breakdown</th><th class="r">Amount</th></tr></thead>
            <tbody>${items}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function draw(){
    const q=($("q")?.value||"").toLowerCase();
    const h=loadHist().filter(r=>{
      const s=(r.input.studentName+" "+r.input.studentId+" "+(r.bill.progName||"")).toLowerCase();
      return s.includes(q);
    });
    wrap.innerHTML = h.length ? h.slice().reverse().map(card).join("") : `<div class="muted">—</div>`;

    // highlight last record if exists
    const lastId=localStorage.getItem("LAST_REC_ID");
    if(lastId){
      const el=wrap.querySelector(`[data-id="${lastId}"]`);
      if(el){ el.scrollIntoView({behavior:"smooth",block:"start"}); }
      localStorage.removeItem("LAST_REC_ID");
    }
  }

  function openEdit(rec){
    panel.classList.remove("hidden");
    fillProgram($("eProgram"));

    $("editId").value=rec.id;
    $("eName").value=rec.input.studentName;
    $("eSid").value=rec.input.studentId;
    $("eProgram").value=rec.input.programId;
    $("eLevel").value=rec.input.level;
    $("eCredits").value=rec.input.credits;
    $("eResidency").value=rec.input.residency;
    $("eRepeat").value=rec.input.repeatCourses;
    $("eRepeatCredits").value=rec.input.repeatCredits;
    $("eLateDays").value=rec.input.lateDays;
    $("eDiscount").value=rec.input.discountPercent;
    $("eFine").value=rec.input.libraryFine;
    $("ePlan").value=rec.input.paymentPlan;
    $("eRepeatCredits").disabled = rec.input.repeatCourses!=="yes";

    renderEditBreakdown(rec.bill);
    msg("editMsg","Loaded","ok");
  }

  function renderEditBreakdown(bill){
    const tb=$("editBreakdown");
    tb.innerHTML = bill.items.map(it=>`<tr><td>${it.l}</td><td class="r">${money(cfg,it.a)}</td></tr>`).join("") +
      `<tr><td><b>Total</b></td><td class="r"><b>${money(cfg,bill.totals.total)}</b></td></tr>`;
  }

  wrap.addEventListener("click",(e)=>{
    const b=e.target.closest("button[data-act]"); if(!b) return;
    const act=b.dataset.act, id=b.dataset.id;
    const h=loadHist();
    const rec=h.find(x=>x.id===id);
    if(!rec) return;

    if(act==="del"){
      if(!confirm("Delete this record?")) return;
      saveHist(h.filter(x=>x.id!==id));
      msg("histMsg","Deleted","ok"); draw(); return;
    }
    if(act==="edit") openEdit(rec);
  });

  $("closeEditBtn")?.addEventListener("click",()=>panel.classList.add("hidden"));
  $("q")?.addEventListener("input",draw);

  $("eRepeat")?.addEventListener("change",()=>{
    const on=$("eRepeat").value==="yes";
    $("eRepeatCredits").disabled=!on; if(!on) $("eRepeatCredits").value=0;
  });

  $("editForm")?.addEventListener("submit",(e)=>{
    e.preventDefault();
    const cfgNow=loadCfg();
    const id=$("editId").value;
    const inp={
      studentName:$("eName").value.trim(),
      studentId:$("eSid").value.trim(),
      programId:$("eProgram").value,
      level:$("eLevel").value,
      credits:Number($("eCredits").value||0),
      residency:$("eResidency").value,
      repeatCourses:$("eRepeat").value,
      repeatCredits:Number($("eRepeatCredits").value||0),
      lateDays:Number($("eLateDays").value||0),
      discountPercent:Number($("eDiscount").value||0),
      libraryFine:Number($("eFine").value||0),
      paymentPlan:$("ePlan").value,
      term:cfgNow.term||""
    };

    if(!isNameOnly(inp.studentName)) return msg("editMsg","Name letters only.","bad");
    if(inp.studentId.length<2) return msg("editMsg","ID required.","bad");
    if(!inp.programId) return msg("editMsg","Select program.","bad");

    const bill=computeBill(cfgNow, inp);
    const h=loadHist().map(r=> r.id===id ? ({...r,input:inp,bill}) : r);
    saveHist(h);
    msg("editMsg","Updated","ok");
    renderEditBreakdown(bill);
    draw();
  });

  $("clearHistoryBtn")?.addEventListener("click",()=>{
    if(!confirm("Clear history?")) return;
    saveHist([]); msg("histMsg","Cleared","ok"); draw();
  });

  draw();
}

/* ===== Settings CRUD ===== */
function setInit(){
  const progRows=$("progRows"), fixRows=$("fixRows");
  if(!progRows||!fixRows) return;

  bindLogout(); stat("Ready");
  let cfg=loadCfg();

  function parseRates(s){
    const p=(String(s||"")).split(",").map(x=>Number(x.trim()));
    return {local:p[0]||0, international:p[1]||0};
  }

  function fill(){
    cfg=loadCfg();
    $("currency").value=cfg.cur||"$";
    $("term").value=cfg.term||"Term";
    $("planFee").value=cfg.planFee;
    $("intlFee").value=cfg.intlFee;
    $("repFee").value=cfg.repFee;
    $("latePerDay").value=cfg.latePerDay||0;
    $("ugRates").value=(cfg.rates.undergrad.local||0)+","+(cfg.rates.undergrad.international||0);
    $("pgRates").value=(cfg.rates.postgrad.local||0)+","+(cfg.rates.postgrad.international||0);

    progRows.innerHTML = cfg.programs.length ? "" : `<tr><td class="muted" colspan="4">—</td></tr>`;
    cfg.programs.forEach(p=>{
      progRows.insertAdjacentHTML("beforeend",`
        <tr>
          <td>${p.k}</td><td>${p.n}</td><td class="r">${Number(p.f||0)}</td>
          <td class="r">
            <button class="btn sm" data-pact="edit" data-id="${p.id}">Edit</button>
            <button class="btn sm danger" data-pact="del" data-id="${p.id}">Del</button>
          </td>
        </tr>
      `);
    });

    fixRows.innerHTML = cfg.fixed.length ? "" : `<tr><td class="muted" colspan="3">—</td></tr>`;
    cfg.fixed.forEach(x=>{
      fixRows.insertAdjacentHTML("beforeend",`
        <tr>
          <td>${x.l}</td><td class="r">${Number(x.a||0)}</td>
          <td class="r">
            <button class="btn sm" data-fact="edit" data-id="${x.id}">Edit</button>
            <button class="btn sm danger" data-fact="del" data-id="${x.id}">Del</button>
          </td>
        </tr>
      `);
    });
  }

  function saveAll(){
    const n=loadCfg();
    n.cur=($("currency").value||"$").trim()||"$";
    n.term=($("term").value||"Term").trim()||"Term";
    n.planFee=Number($("planFee").value||0);
    n.intlFee=Number($("intlFee").value||0);
    n.repFee=Number($("repFee").value||0);
    n.latePerDay=Number($("latePerDay").value||0);
    n.rates.undergrad=parseRates($("ugRates").value);
    n.rates.postgrad=parseRates($("pgRates").value);
    n.programs=cfg.programs;
    n.fixed=cfg.fixed;
    saveCfg(n);
    msg("setMsg","Saved","ok"); stat("Saved");
  }

  $("saveCfgBtn")?.addEventListener("click",()=>{saveAll(); fill();});

  $("resetCfgBtn")?.addEventListener("click",()=>{
    if(!confirm("Reset settings?")) return;
    saveCfg(defCfg());
    cfg=loadCfg(); msg("setMsg","Reset done","ok"); fill();
  });

  $("addProgBtn")?.addEventListener("click",()=>{
    const k=(prompt("Program key")||"").trim();
    const n=(prompt("Program name")||"").trim();
    const f=Number(prompt("Program fee")||0);
    if(!k||!n) return msg("setMsg","Key and name required.","bad");
    cfg.programs.push({id:uid(),k,n,f:Number.isFinite(f)?f:0});
    saveAll(); fill();
  });

  $("addFixBtn")?.addEventListener("click",()=>{
    const l=(prompt("Fee label")||"").trim();
    const a=Number(prompt("Amount")||0);
    if(!l) return msg("setMsg","Label required.","bad");
    cfg.fixed.push({id:uid(),l,a:Number.isFinite(a)?a:0});
    saveAll(); fill();
  });

  progRows.addEventListener("click",(e)=>{
    const b=e.target.closest("button[data-pact]"); if(!b) return;
    const id=b.dataset.id, act=b.dataset.pact;
    const p=cfg.programs.find(x=>x.id===id); if(!p) return;

    if(act==="del"){
      if(!confirm("Delete program?")) return;
      cfg.programs=cfg.programs.filter(x=>x.id!==id);
      saveAll(); fill(); return;
    }
    if(act==="edit"){
      const nk=(prompt("Key",p.k)||"").trim();
      const nn=(prompt("Name",p.n)||"").trim();
      const nf=Number(prompt("Fee",String(p.f))||p.f);
      if(!nk||!nn) return msg("setMsg","Key and name required.","bad");
      p.k=nk; p.n=nn; p.f=Number.isFinite(nf)?nf:0;
      saveAll(); fill();
    }
  });

  fixRows.addEventListener("click",(e)=>{
    const b=e.target.closest("button[data-fact]"); if(!b) return;
    const id=b.dataset.id, act=b.dataset.fact;
    const x=cfg.fixed.find(v=>v.id===id); if(!x) return;

    if(act==="del"){
      if(!confirm("Delete fee?")) return;
      cfg.fixed=cfg.fixed.filter(v=>v.id!==id);
      saveAll(); fill(); return;
    }
    if(act==="edit"){
      const nl=(prompt("Label",x.l)||"").trim();
      const na=Number(prompt("Amount",String(x.a))||x.a);
      if(!nl) return msg("setMsg","Label required.","bad");
      x.l=nl; x.a=Number.isFinite(na)?na:0;
      saveAll(); fill();
    }
  });

  fill();
}

/* Boot */
gate();
loginInit();
bindLogout();
calcInit();
histInit();
setInit();
