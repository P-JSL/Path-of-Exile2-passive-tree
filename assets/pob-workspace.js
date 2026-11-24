import {decodePobCode,parsePobXml} from './pob-import.js';
import {localizePobMetric,localizePobName,formatPobValue} from './pob-localize.js';

const PIN='ee33ce63920f23e634cc30e37d8ad339244dbf34';
const base=new URL('../pob-engine/'+PIN+'/',import.meta.url);
const $=id=>document.getElementById(id);
const savedKey='exile-tree-pob2-source-v1';
const child=(node,name)=>Array.from(node?.children||[]).find(el=>el.tagName===name);
const children=(node,name)=>Array.from(node?.children||[]).filter(el=>el.tagName===name);
let worker=null, pending=null, requestId=0, ready=false, busy=false, dirty=false;
let doc=null, engineXml='', dictionary={};
const responseTypes={init:'init',loadBuild:'loadBuild',getStats:'stats',getSkills:'skills',getDefence:'defence',getConfigOptions:'configOptions',switchMainSkill:'switchMainSkill',setConfig:'setConfig',exportBuild:'exportBuild'};
const status=(message,error=false)=>{$('status').textContent=message;$('status').dataset.error=String(error);};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const labelFor=(caption,control)=>{const l=el('label',caption);l.append(control);return l;};
const name=s=>localizePobName(s,'ko',dictionary);
const metric=s=>localizePobMetric(s,'ko',dictionary);
function closeEngine(){
  worker?.terminate();worker=null;ready=false;
  if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(new Error('계산 엔진 종료'));}
}
function request(type,args={}){
  if(!worker||pending)throw Error('계산 엔진 요청 상태가 올바르지 않습니다.');
  const id=String(++requestId);
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{closeEngine();},type==='init'?180000:90000);
    pending={id,type,timer,resolve,reject};
    try{worker.postMessage({type,...args,_id:id});}catch(e){closeEngine();}
  });
}
async function boot(){
  if(ready)return;
  status('PoB2 엔진 초기화 중… 첫 실행은 게임 데이터 다운로드가 필요합니다.');
  const res=await fetch(new URL('version.json',base));
  if(!res.ok)throw Error('이 배포본에 PoB2 엔진이 없습니다. GitHub Actions 빌드를 확인하세요.');
  const version=await res.json();
  if(version.bridge!==PIN||!/^[0-9a-f]{40}$/.test(version.pob))throw Error('PoB2 엔진 버전 불일치');
  $('engine-version').textContent='PoB2 '+version.pob.slice(0,12);
  worker=new Worker(new URL('worker.js',base),{type:'module'});
  worker.onmessage=e=>{
    const data=e.data;
    if(data.type==='log'){if(!ready)status('PoB2 초기화: '+String(data.message).slice(0,300));return;}
    if(!pending||data._id!==pending.id)return;
    const p=pending;pending=null;clearTimeout(p.timer);
    if(data.type!==responseTypes[p.type]||data.error||data.success===false||data.data?.error||data.data?.success===false)
      p.reject(Error(String(data.error||data.data?.error||'PoB2 엔진 요청 실패')));
    else p.resolve(data);
  };
  worker.onerror=()=>closeEngine();
  worker.onmessageerror=()=>closeEngine();
  await request('init');ready=true;
}
function parse(xml){
  parsePobXml(xml);
  return new DOMParser().parseFromString(xml,'application/xml');
}
function serialize(d){return new XMLSerializer().serializeToString(d);}
function setDirty(value){
  dirty=value;
  $('workspace').classList.toggle('dirty',value);
  $('copy').disabled=busy||dirty;
  $('main-skill').disabled=busy||dirty;
  $('config').inert=busy||dirty;
  if(value)status('편집한 내용이 아직 계산되지 않았습니다. 변경 적용 및 재계산을 누르세요.');
}
function setBusy(value){
  busy=value;
  for(const id of ['load','saved','recalc','xml-apply','source','spec','item-set','skill-set','level','xml'])$(id).disabled=value;
  for(const id of ['items','gems'])$(id).inert=value;
  $('copy').disabled=value||dirty;$('main-skill').disabled=value||dirty;$('config').inert=value||dirty;
}
async function action(fn){
  if(busy)return;setBusy(true);
  try{await fn();}catch(e){
    closeEngine();doc=null;engineXml='';$('workspace').hidden=true;
    status(e.message||String(e),true);
  }finally{setBusy(false);}
}
function fillMetrics(target,values){
  const rows=[];
  for(const [key,value] of Object.entries(values||{})){
    if(key.startsWith('_')||typeof value!=='number'||!Number.isFinite(value))continue;
    const card=el('div',undefined,'metric');
    const caption=el('span',metric(key));caption.title=key;
    card.append(caption,el('strong',formatPobValue(String(value),'ko')));rows.push(card);
  }
  $(target).replaceChildren(...rows);
}
function selectSets(id,container,tag,attribute,ordinal=false){
  const select=$(id), sets=children(container,tag);
  select.replaceChildren();
  for(let i=0;i<sets.length;i++){
    const set=sets[i],value=ordinal?String(i+1):set.getAttribute('id');
    if(!value)continue;
    const o=el('option',name(set.getAttribute('title')||value));o.value=value;select.append(o);
  }
  select.value=container?.getAttribute(attribute)||select.options[0]?.value||'';
  if(!select.value&&select.options.length)select.selectedIndex=0;
  select.disabled=!sets.length||busy;
  select.onchange=()=>{container.setAttribute(attribute,select.value);setDirty(true);renderEditors();};
}
function renderEditors(){
  const root=doc.documentElement, build=child(root,'Build'), tree=child(root,'Tree'), items=child(root,'Items'), skills=child(root,'Skills');
  selectSets('spec',tree,'Spec','activeSpec',true);
  selectSets('item-set',items,'ItemSet','activeItemSet');
  selectSets('skill-set',skills,'SkillSet','activeSkillSet');
  $('level').value=build.getAttribute('level')||'';
  $('level').onchange=()=>{
    const v=Number($('level').value);
    if(!Number.isInteger(v)||v<1||v>100){$('level').value=build.getAttribute('level')||'';return;}
    build.setAttribute('level',String(v));setDirty(true);
  };
  const itemSet=children(items,'ItemSet').find(s=>s.getAttribute('id')===$('item-set').value);
  const slots=new Map();
  for(const slot of children(itemSet,'Slot')){
    const id=slot.getAttribute('itemId');if(!slots.has(id))slots.set(id,[]);
    slots.get(id).push(slot.getAttribute('name'));
  }
  const itemRows=[];
  for(const item of children(items,'Item')){
    const raw=item.textContent||'', id=item.getAttribute('id');
    const details=el('details',undefined,'editor');
    const first=raw.trim().split(/\r?\n/).filter(s=>s&&!s.startsWith('Rarity:'))[0]||id;
    const title=[...(slots.get(id)||[]),name(first)].filter(Boolean).join(' · ');
    details.append(el('summary',title));
    const input=el('textarea');input.rows=6;input.value=raw;
    input.setAttribute('aria-label','장비 '+title);
    input.oninput=()=>{item.textContent=input.value;setDirty(true);};
    details.append(input);itemRows.push(details);
  }
  $('items').replaceChildren(...itemRows);
  const set=children(skills,'SkillSet').find(s=>s.getAttribute('id')===$('skill-set').value)||skills;
  const groups=[];
  for(const [i,group] of children(set,'Skill').entries()){
    const block=el('details',undefined,'editor');block.open=true;
    block.append(el('summary',name(group.getAttribute('label')||'스킬 그룹 '+(i+1))));
    for(const gem of children(group,'Gem')){
      const row=el('div',undefined,'gem'), title=name(gem.getAttribute('nameSpec')||gem.getAttribute('gemId')||gem.getAttribute('skillId')||'젬');
      row.append(el('strong',title));
      for(const [attr,caption] of [['level','레벨'],['quality','퀄리티']]){
        const input=el('input');input.type='number';input.min=attr==='level'?'1':'0';input.step='1';input.value=gem.getAttribute(attr)||'';
        input.onchange=()=>{if(input.value!==''&&input.validity.valid){gem.setAttribute(attr,input.value);setDirty(true);}};
        row.append(labelFor(caption,input));
      }
      const enabled=el('input');enabled.type='checkbox';enabled.checked=gem.getAttribute('enabled')!=='false';
      enabled.onchange=()=>{gem.setAttribute('enabled',String(enabled.checked));setDirty(true);};
      row.append(labelFor('사용',enabled));block.append(row);
    }
    groups.push(block);
  }
  $('gems').replaceChildren(...groups);
}
function renderConfig(config){
  const sections=[];
  for(const section of Array.isArray(config?.sections)?config.sections:[]){
    const details=el('details',undefined,'editor');details.append(el('summary',name(section.name)));
    for(const opt of Array.isArray(section.options)?section.options:[]){
      if(!opt.visible||!opt.var)continue;
      const row=el('div',undefined,'config-row');
      let input;
      if(opt.type==='list'&&Array.isArray(opt.list)){
        input=el('select');
        const defaultOption=el('option','기본값');defaultOption.value='';input.append(defaultOption);
        opt.list.forEach((entry,i)=>{const o=el('option',name(entry.label));o.value=String(i);input.append(o);});
        const i=opt.list.findIndex(entry=>entry.val===opt.value);
        input.value=i<0?'':String(i);
      }else{
        input=el('input');input.type=opt.type==='check'?'checkbox':opt.type==='text'?'text':'number';
        if(input.type==='checkbox')input.checked=opt.value===true;
        else{input.value=opt.value??'';input.step=opt.type==='float'?'any':'1';}
      }
      const label=el('label',name(opt.label||opt.var));label.title=opt.tooltip||opt.var;
      label.append(input);row.append(label);
      input.onchange=()=>action(async()=>{
        let value=input.type==='checkbox'?input.checked:input.value===''?null:input.type==='number'?Number(input.value):opt.type==='list'?opt.list[Number(input.value)].val:input.value;
        if(typeof value==='number'&&!Number.isFinite(value))throw Error('전투 조건 수치가 유효하지 않습니다.');
        await request('setConfig',{var:opt.var,value});await refresh();
      });
      details.append(row);
    }
    sections.push(details);
  }
  $('config').replaceChildren(...sections);
}
async function refresh(){
  const stats=(await request('getStats')).data;
  const defence=(await request('getDefence')).data;
  const skills=(await request('getSkills',{skipAutoSelect:true})).data;
  if(!stats||!defence||!skills||!Object.values(stats).some(v=>typeof v==='number'&&Number.isFinite(v)))throw Error('PoB2 계산 결과가 없습니다.');
  const exported=(await request('exportBuild')).data?.code;
  if(typeof exported!=='string'||!exported.trim())throw Error('PoB2 빌드 내보내기 실패');
  const next=parse(exported);
  let config=null,configError='';
  try{config=(await request('getConfigOptions')).data;}catch(e){configError=' · 설정 조회 실패: '+e.message;}
  engineXml=exported;doc=next;
  $('xml').value=engineXml;
  fillMetrics('metrics',{...stats,...defence});
  fillMetrics('skill-stats',{...(skills.mainSkillStats||{}),FullDPS:skills.fullDps});
  const options=[];
  for(const g of Array.isArray(skills.groups)?skills.groups:[]){
    const o=el('option',name(g.label||g.activeSkillNames?.join(' / ')||'스킬 '+g.index));
    o.value=String(g.index);o.disabled=g.enabled===false;options.push(o);
  }
  $('main-skill').replaceChildren(...options);
  $('main-skill').value=String(skills.mainSocketGroup);
  $('full-dps').replaceChildren(...(Array.isArray(skills.skills)?skills.skills:[]).map(s=>el('p',name(s.name)+' · '+formatPobValue(String(s.dps),'ko')+' DPS × '+s.count)));
  renderEditors();renderConfig(config);$('workspace').hidden=false;setDirty(false);
  status('PoB2 계산 완료'+configError);
}
async function loadXml(xml){
  parse(xml);await boot();status('PoB2 빌드 계산 중…');
  await request('loadBuild',{xml});await refresh();
}
$('load').onclick=()=>action(async()=>loadXml(await decodePobCode($('source').value)));
$('recalc').onclick=()=>action(async()=>loadXml(serialize(doc)));
$('xml-apply').onclick=()=>action(async()=>loadXml(await decodePobCode($('xml').value)));
$('xml').oninput=()=>{if($('xml').value!==engineXml){setDirty(true);}};
$('main-skill').onchange=()=>action(async()=>{
  await request('switchMainSkill',{index:Number($('main-skill').value)});await refresh();
});
$('saved').onclick=()=>action(async()=>{
  const saved=JSON.parse(localStorage.getItem(savedKey)||'null');
  if(!saved?.source)throw Error('패시브 트리에 불러온 PoB2 원본이 없습니다.');
  $('source').value=saved.source;
  const sourceDoc=parse(await decodePobCode(saved.source));
  const tree=child(sourceDoc.documentElement,'Tree');
  if(Number.isInteger(saved.selectedIndex)&&children(tree,'Spec')[saved.selectedIndex])tree.setAttribute('activeSpec',String(saved.selectedIndex+1));
  await loadXml(serialize(sourceDoc));
});
$('copy').onclick=async()=>{
  if(dirty||!engineXml)return;
  try{await navigator.clipboard.writeText(engineXml);status('계산된 XML 복사 완료');}
  catch{status('자동 복사가 차단되었습니다. XML을 직접 선택하여 복사하세요.',true);$('xml').focus();$('xml').select();}
};
$('reset').onclick=()=>{
  if(busy)return;
  closeEngine();doc=null;engineXml='';$('source').value='';$('xml').value='';
  for(const id of ['metrics','skill-stats','full-dps','items','gems','config','main-skill','spec','item-set','skill-set'])$(id).replaceChildren();
  $('workspace').hidden=true;setDirty(false);status('작업 빌드를 초기화했습니다. 기존 패시브 트리 원본은 유지됩니다.');
};
fetch(new URL('../data/pob-ko.json',import.meta.url)).then(r=>r.ok?r.json():{}).then(d=>{dictionary=d;}).catch(()=>{});
window.addEventListener('pagehide',closeEngine);
