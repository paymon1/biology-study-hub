(() => {
  "use strict";
  const KEY = "zy-study-workspace:v1";
  const BASE = "/biology-study-hub/";
  const TYPES = [
    ["lesson", "درس‌نامه", "02-lesson-notes"],
    ["visual", "راهنمای دیداری", "03-visual-learning"],
    ["practice", "تمرین", "04-practice-questions"],
    ["flashcards", "فلش‌کارت", "06-flashcards"]
  ];
  const CHAPTERS = [
    [10,1,"دنیای زنده"],[10,2,"گوارش و جذب مواد"],[10,3,"تبادلات گازی"],[10,4,"گردش مواد در بدن"],[10,5,"تنظیم اسمزی و دفع مواد زائد"],[10,6,"از یاخته تا گیاه"],[10,7,"جذب و انتقال مواد در گیاهان"],
    [11,1,"تنظیم عصبی"],[11,2,"حواس"],[11,3,"دستگاه حرکتی"],[11,4,"تنظیم شیمیایی"],[11,5,"ایمنی"],[11,6,"تقسیم یاخته"],[11,7,"تولیدمثل"],[11,8,"تولیدمثل نهان‌دانگان"],[11,9,"پاسخ گیاهان به محرک‌ها"],
    [12,1,"مولکول‌های اطلاعاتی"],[12,2,"جریان اطلاعات در یاخته"],[12,3,"انتقال اطلاعات در نسل‌ها"],[12,4,"تغییر در اطلاعات وراثتی"],[12,5,"از ماده به انرژی"],[12,6,"از انرژی به ماده"],[12,7,"فناوری‌های نوین زیستی"],[12,8,"رفتارهای جانوران"]
  ];
  const SECTIONS = CHAPTERS.flatMap(([grade, chapter, title]) => TYPES.map(([type, label, folder]) => ({
    id: grade + "-" + String(chapter).padStart(2,"0") + "-" + type,
    grade, chapter, chapterTitle: title, type, label,
    title: "فصل " + chapter + " · " + title + " — " + label,
    path: folder + "/grade-" + grade + "/chapter-" + String(chapter).padStart(2,"0") + "/" + (type === "lesson" ? "lesson" : type === "visual" ? "visual-guide" : type) + ".md"
  })));
  const STATUSES = {todo:"شروع نشده",doing:"در حال مطالعه",done:"مطالعه شد",review:"نیاز به مرور"};
  const $ = (tag, cls, txt) => { const n=document.createElement(tag); if(cls)n.className=cls; if(txt!==undefined)n.textContent=txt; return n; };
  const read = () => {
    try {
      const x=JSON.parse(localStorage.getItem(KEY)||"{}");
      return {version:1,progress:x.progress||{},notes:Array.isArray(x.notes)?x.notes:[],highlights:Array.isArray(x.highlights)?x.highlights:[],tasks:Array.isArray(x.tasks)?x.tasks:[]};
    } catch (_) { return {version:1,progress:{},notes:[],highlights:[],tasks:[]}; }
  };
  const write = x => { try { localStorage.setItem(KEY,JSON.stringify(x)); return true; } catch (_) { alert("فضای ذخیره‌سازی مرورگر در دسترس نیست. از خروجی پشتیبان استفاده کن."); return false; } };
  const sectionForPath = path => { const clean=path.replace(/\/$/,""); return SECTIONS.find(s => clean.endsWith(s.path.replace(/\.md$/,""))); };
  const absolute = path => BASE + path.replace(/\.md$/,"/");
  const safeDate = value => value ? new Date(value+"T00:00:00").toLocaleDateString("fa-IR") : "بدون تاریخ";
  const sectionLabel = id => { const s=SECTIONS.find(x=>x.id===id); return s?s.title:"بخش حذف‌شده یا نامشخص"; };

  function addPageTools() {
    const section=sectionForPath(location.pathname);
    if (!section || document.querySelector(".zy-page-tools")) return;
    const data=read(), current=data.progress[section.id]||{status:"todo"};
    const bar=$("section","zy-page-tools");
    const heading=$("div","zy-page-tools-heading","ابزار مطالعهٔ این بخش");
    const statusWrap=$("label","zy-tool-label","وضعیت مطالعه");
    const status=$("select","zy-status-select");
    Object.entries(STATUSES).forEach(([v,l])=>{const o=$("option","",l);o.value=v;status.append(o);});
    status.value=current.status||"todo";
    status.addEventListener("change",()=>{const d=read();d.progress[section.id]={status:status.value,updated:new Date().toISOString()};write(d);});
    statusWrap.append(status);
    const note=$("button","zy-action","＋ افزودن یادداشت");
    note.type="button";
    note.addEventListener("click",()=>{const value=prompt("یادداشت شخصی دربارهٔ این بخش:");if(!value||!value.trim())return;const d=read();d.notes.unshift({id:makeId(),text:value.trim(),sectionId:section.id,url:location.pathname,created:new Date().toISOString()});write(d);note.textContent="✓ یادداشت ذخیره شد";});
    const highlight=$("button","zy-action zy-action-primary","🖍 ذخیره و هایلایت متن انتخاب‌شده");
    highlight.type="button";
    highlight.addEventListener("click",()=>saveSelection(section));
    const hint=$("span","zy-tool-hint","برای هایلایت، بخشی از متن صفحه را انتخاب کن.");
    bar.append(heading,statusWrap,note,highlight,hint);
    const h1=document.querySelector(".md-content h1, article h1, h1");
    if(h1) h1.insertAdjacentElement("afterend",bar); else document.querySelector("main")?.prepend(bar);
    restoreHighlights(section);
    setupFloatingHighlight(section);
  }
  function makeId(){return "zy-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}
  let floatingHighlight=null, pendingRange=null, pendingSection=null;
  function setupFloatingHighlight(section) {
    floatingHighlight=$("button","zy-floating-highlight","🖍 ذخیره هایلایت");
    floatingHighlight.type="button";
    floatingHighlight.setAttribute("aria-label","ذخیره متن انتخاب‌شده در دفترچه");
    // Prevent the browser from clearing the text selection before the click handler runs.
    floatingHighlight.addEventListener("mousedown",e=>e.preventDefault());
    floatingHighlight.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true});
    floatingHighlight.addEventListener("click",()=> {
      if(pendingRange && pendingSection) saveSelection(pendingSection,pendingRange);
      hideFloatingHighlight();
    });
    document.body.append(floatingHighlight);
    document.addEventListener("selectionchange",()=> {
      const selection=window.getSelection();
      if(!selection || selection.isCollapsed || !selection.rangeCount){hideFloatingHighlight();return;}
      const range=selection.getRangeAt(0);
      const root=document.querySelector(".md-content article")||document.querySelector("article")||document.querySelector("main");
      if(!root || !root.contains(range.commonAncestorContainer) || !selection.toString().trim()){hideFloatingHighlight();return;}
      pendingRange=range.cloneRange();pendingSection=section;
      positionFloatingHighlight();
    });
    window.addEventListener("scroll",positionFloatingHighlight,{passive:true});
    window.addEventListener("resize",positionFloatingHighlight);
  }
  function positionFloatingHighlight() {
    if(!floatingHighlight || !pendingRange)return;
    const rect=pendingRange.getBoundingClientRect();
    if(!rect.width && !rect.height){hideFloatingHighlight();return;}
    floatingHighlight.style.display="inline-flex";
    const width=floatingHighlight.offsetWidth||150, height=floatingHighlight.offsetHeight||42;
    let left=Math.min(Math.max(8,rect.left+(rect.width-width)/2),window.innerWidth-width-8);
    let top=rect.top-height-10;
    if(top<8)top=Math.min(window.innerHeight-height-8,rect.bottom+10);
    floatingHighlight.style.left=left+"px";
    floatingHighlight.style.top=Math.max(8,top)+"px";
  }
  function hideFloatingHighlight() {
    if(floatingHighlight)floatingHighlight.style.display="none";
    pendingRange=null;pendingSection=null;
  }
  function saveSelection(section, savedRange) {
    const selection=window.getSelection();
    const quote=savedRange ? savedRange.toString().trim() : (selection?selection.toString().trim():"");
    if(!quote){alert("اول متن موردنظرت را انتخاب کن.");return;}
    const range=savedRange ? savedRange.cloneRange() : selection.getRangeAt(0).cloneRange();
    const note=prompt("این قسمت را با چه نکته‌ای ذخیره می‌کنی؟ (اختیاری)","");
    const d=read(), id=makeId();
    d.highlights.unshift({id,quote,note:(note||"").trim(),sectionId:section.id,url:location.pathname,created:new Date().toISOString()});
    if(!write(d))return;
    try {
      const mark=$("mark","zy-inline-highlight");
      mark.dataset.zyHighlight=id;
      mark.append(range.extractContents());
      range.insertNode(mark);
      if(selection)selection.removeAllRanges();
    } catch (_) { /* The quote is safely saved even if a complex cross-element selection cannot be wrapped. */ }
    const btn=document.querySelector(".zy-action-primary");
    if(btn){btn.textContent="✓ در دفترچه ذخیره شد";setTimeout(()=>btn.textContent="🖍 ذخیره و هایلایت متن انتخاب‌شده",1800);}
    hideFloatingHighlight();
  }
  function restoreHighlights(section) {
    const items=read().highlights.filter(x=>x.sectionId===section.id);
    if(!items.length)return;
    const root=document.querySelector(".md-content article")||document.querySelector("article")||document.querySelector("main");
    if(!root)return;
    items.forEach(item=>{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest("mark,.zy-page-tools,script,style,nav")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
      let node;
      while((node=walker.nextNode())){
        const i=node.nodeValue.indexOf(item.quote);
        if(i<0)continue;
        const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+item.quote.length);
        const mark=$("mark","zy-inline-highlight");mark.dataset.zyHighlight=item.id;
        try{range.surroundContents(mark);}catch(_){}
        break;
      }
    });
  }

  function dashboard() {
    const root=document.getElementById("zy-study-dashboard");
    if(!root)return;
    const render=()=>{
      const d=read(), done=Object.values(d.progress).filter(x=>x.status==="done").length;
      const doing=Object.values(d.progress).filter(x=>x.status==="doing").length;
      const review=Object.values(d.progress).filter(x=>x.status==="review").length;
      const pct=Math.round(done/SECTIONS.length*100);
      root.replaceChildren();
      const stats=$("div","zy-dash-stats");
      [[done,"بخش مطالعه‌شده"],[doing,"در حال مطالعه"],[review,"نیازمند مرور"],[pct+"%","پیشرفت کل"]].forEach(([v,l])=>{const c=$("div","zy-stat");c.append($("strong","",String(v)), $("span","",l));stats.append(c);});
      root.append(stats);
      const progress=$("section","zy-dash-panel");
      progress.append($("h2","","پیشرفت پایه‌ها"));
      [10,11,12].forEach(g=>{
        const list=SECTIONS.filter(s=>s.grade===g), n=list.filter(s=>d.progress[s.id]?.status==="done").length;
        const row=$("div","zy-grade-progress");row.append($("div","","پایهٔ "+g+" · "+n+" از "+list.length+" بخش"));
        const track=$("div","zy-progress-track"), fill=$("span","");fill.style.width=(n/list.length*100)+"%";track.append(fill);row.append(track);progress.append(row);
      });
      const filter=$("div","zy-filter-row");
      const search=$("input","zy-search");search.placeholder="جست‌وجوی فصل یا بخش…";
      const grade=$("select","zy-search");[["all","همهٔ پایه‌ها"],["10","دهم"],["11","یازدهم"],["12","دوازدهم"]].forEach(([v,l])=>{const o=$("option","",l);o.value=v;grade.append(o);});
      const state=$("select","zy-search");[["all","همهٔ وضعیت‌ها"],...Object.entries(STATUSES)].forEach(([v,l])=>{const o=$("option","",l);o.value=v;state.append(o);});
      filter.append(search,grade,state);
      const listPanel=$("section","zy-dash-panel");listPanel.append($("h2","","۹۶ بخش برای پیگیری"));
      const list=$("div","zy-section-list");
      const paint=()=>{
        list.replaceChildren();
        SECTIONS.filter(s=>(grade.value==="all"||String(s.grade)===grade.value)&&(state.value==="all"||(d.progress[s.id]?.status||"todo")===state.value)&&(!search.value||s.title.includes(search.value)||("پایهٔ "+s.grade).includes(search.value))).forEach(s=>{
          const row=$("div","zy-section-row"), info=$("div","zy-section-info");
          info.append($("strong","",s.title),$("small","","پایهٔ "+s.grade));
          const select=$("select","zy-status-select");Object.entries(STATUSES).forEach(([v,l])=>{const o=$("option","",l);o.value=v;select.append(o);});select.value=d.progress[s.id]?.status||"todo";
          select.addEventListener("change",()=>{const x=read();x.progress[s.id]={status:select.value,updated:new Date().toISOString()};write(x);render();});
          const link=$("a","zy-open-link","بازکردن ↗");link.href=absolute(s.path);
          row.append(info,select,link);list.append(row);
        });
        if(!list.children.length)list.append($("p","zy-empty","موردی با این فیلتر پیدا نشد."));
      };
      [search,grade,state].forEach(el=>el.addEventListener(el===search?"input":"change",paint));
      paint();listPanel.append(filter,list);
      root.append(progress,listPanel);
      renderPlanner(root,d,render);
      renderNotebook(root,d,render);
      renderBackup(root);
    };
    render();
  }
  function renderPlanner(root,d,rerender) {
    const panel=$("section","zy-dash-panel");panel.append($("h2","","برنامهٔ مطالعه"));
    const form=$("form","zy-planner-form");
    const title=$("input","zy-search");title.placeholder="مثلاً مرور فصل ۳ و حل تست";title.required=true;
    const section=$("select","zy-search");const first=$("option","","اتصال به یک بخش (اختیاری)");first.value="";section.append(first);
    SECTIONS.forEach(s=>{const o=$("option","",s.title);o.value=s.id;section.append(o);});
    const date=$("input","zy-search");date.type="date";date.value=new Date().toISOString().slice(0,10);
    const mins=$("input","zy-search");mins.type="number";mins.min="5";mins.max="600";mins.value="30";mins.title="مدت به دقیقه";
    const add=$("button","zy-action zy-action-primary","افزودن به برنامه");add.type="submit";
    form.append(title,section,date,mins,add);
    form.addEventListener("submit",e=>{e.preventDefault();const x=read();x.tasks.push({id:makeId(),title:title.value.trim(),sectionId:section.value,date:date.value,minutes:Number(mins.value)||30,done:false,created:new Date().toISOString()});write(x);rerender();});
    panel.append(form);
    const tasks=$("div","zy-task-list");
    const ordered=[...d.tasks].sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
    if(!ordered.length)tasks.append($("p","zy-empty","هنوز برنامه‌ای نساخته‌ای. اولین جلسه را همین‌جا اضافه کن."));
    ordered.forEach(task=>{
      const row=$("div","zy-task-row"), check=$("input","");check.type="checkbox";check.checked=!!task.done;
      check.addEventListener("change",()=>{const x=read(),t=x.tasks.find(z=>z.id===task.id);if(t)t.done=check.checked;write(x);rerender();});
      const body=$("div","zy-task-body"), name=$("strong","",task.title), meta=$("small","",safeDate(task.date)+" · "+task.minutes+" دقیقه"+(task.sectionId?" · "+sectionLabel(task.sectionId):""));
      if(task.done)name.classList.add("zy-task-done");body.append(name,meta);
      const del=$("button","zy-icon-action","حذف");del.type="button";del.addEventListener("click",()=>{const x=read();x.tasks=x.tasks.filter(t=>t.id!==task.id);write(x);rerender();});
      row.append(check,body,del);tasks.append(row);
    });
    panel.append(tasks);root.append(panel);
  }
  function renderNotebook(root,d,rerender) {
    const panel=$("section","zy-dash-panel");panel.append($("h2","","دفترچهٔ شخصی"));
    const search=$("input","zy-search");search.placeholder="جست‌وجو در یادداشت‌ها و هایلایت‌ها…";panel.append(search);
    const items=[
      ...d.notes.map(x=>({...x,kind:"note"})),
      ...d.highlights.map(x=>({...x,kind:"highlight"}))
    ].sort((a,b)=>(b.created||"").localeCompare(a.created||""));
    const list=$("div","zy-notebook-list");
    const paint=()=>{
      list.replaceChildren();
      items.filter(x=>(x.text||x.quote||"").includes(search.value)||(x.note||"").includes(search.value)||sectionLabel(x.sectionId).includes(search.value)).forEach(item=>{
        const card=$("article","zy-notebook-item");
        card.append($("span","zy-item-kind",item.kind==="note"?"یادداشت":"هایلایت"),$("strong","",sectionLabel(item.sectionId)));
        if(item.quote)card.append($("blockquote","",item.quote));
        if(item.text)card.append($("p","",item.text));
        if(item.note)card.append($("p","zy-note-comment","یادداشت: "+item.note));
        const actions=$("div","zy-notebook-actions"),link=$("a","","رفتن به منبع ↗");link.href=item.url||"#";
        const del=$("button","zy-icon-action","حذف");del.type="button";del.addEventListener("click",()=>{const x=read();x[item.kind==="note"?"notes":"highlights"]=x[item.kind==="note"?"notes":"highlights"].filter(y=>y.id!==item.id);write(x);rerender();});
        actions.append(link,del);card.append(actions);list.append(card);
      });
      if(!list.children.length)list.append($("p","zy-empty","چیزی ذخیره نشده است. داخل هر بخش می‌توانی یادداشت یا هایلایت اضافه کنی."));
    };
    search.addEventListener("input",paint);paint();panel.append(list);root.append(panel);
  }
  function renderBackup(root) {
    const panel=$("section","zy-dash-panel zy-backup-panel");panel.append($("h2","","پشتیبان‌گیری از اطلاعات"));
    panel.append($("p","","اطلاعات این دستگاه در مرورگر ذخیره می‌شود. هر چند وقت یک‌بار خروجی بگیر و فایل را در جای امن نگه دار."));
    const exportBtn=$("button","zy-action","⬇ دریافت فایل پشتیبان");exportBtn.type="button";
    exportBtn.addEventListener("click",()=>{const blob=new Blob([JSON.stringify(read(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=$("a","");a.href=url;a.download="zistyar-study-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);});
    const label=$("label","zy-action","⬆ بازیابی فایل پشتیبان"),input=$("input","");input.type="file";input.accept="application/json,.json";input.hidden=true;
    input.addEventListener("change",()=>{const file=input.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!x||typeof x!=="object"||!x.progress||!Array.isArray(x.notes)||!Array.isArray(x.highlights)||!Array.isArray(x.tasks))throw Error();if(!confirm("اطلاعات فعلی با فایل پشتیبان جایگزین شود؟"))return;write({version:1,progress:x.progress,notes:x.notes,highlights:x.highlights,tasks:x.tasks});location.reload();}catch(_){alert("فایل پشتیبان معتبر نیست.");}};reader.readAsText(file);});
    label.append(input);panel.append(exportBtn,label);root.append(panel);
  }
  function start(){addPageTools();dashboard();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();