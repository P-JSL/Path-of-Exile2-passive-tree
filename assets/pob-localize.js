/**
 * Source-backed PoB2 Korean display adapter.
 * Never edits PoB item XML, gem IDs, passive IDs or values.
 * Dictionary contents originate from GGG game translations (see data/pob-ko.json).
 */
const rarities={NORMAL:'일반',MAGIC:'마법',RARE:'희귀',UNIQUE:'고유',GEM:'젬',RELIC:'유물',CURRENCY:'화폐'};
const fields={
  'Rarity':'등급','Item Level':'아이템 레벨','LevelReq':'요구 레벨',
  'Quality':'퀄리티','Sockets':'홈','Socketed Gems':'장착한 젬',
  'Energy Shield':'에너지 보호막','Armour':'방어도','Evasion Rating':'회피',
  'Evasion':'회피','Block Chance':'막기 확률','Physical Damage':'물리 피해',
  'Elemental Damage':'원소 피해','Critical Hit Chance':'치명타 확률',
  'Critical Strike Chance':'치명타 확률','Attacks per Second':'초당 공격 횟수',
  'Weapon Range':'무기 사거리','Spirit':'혼백','Unique ID':'고유 ID',
  'Implicits':'고정 속성 수','Sockets':'홈','Corrupted':'타락',
  'Mirrored':'복제본','Unidentified':'미감정','Unmodifiable':'수정 불가',
  'Requirements':'요구 사항','Requires Level':'요구 레벨',
  'Requires':'요구 사항','Strength':'힘','Dexterity':'민첩','Intelligence':'지능',
  'Life':'생명력','Mana':'마나','Fire Resistance':'화염 저항',
  'Cold Resistance':'냉기 저항','Lightning Resistance':'번개 저항',
  'Chaos Resistance':'카오스 저항','all Elemental Resistances':'모든 원소 저항',
  'All Elemental Resistances':'모든 원소 저항',
  'Spell Damage':'주문 피해','Attack Damage':'공격 피해',
  'Fire Damage':'화염 피해','Cold Damage':'냉기 피해',
  'Lightning Damage':'번개 피해','Chaos Damage':'카오스 피해',
  'Elemental Damage with Attacks':'공격 시 원소 피해',
  'Damage':'피해','Movement Speed':'이동 속도','Cast Speed':'시전 속도',
  'Attack Speed':'공격 속도','Critical Strike Multiplier':'치명타 피해 배율',
  'Critical Damage Bonus':'치명타 피해 보너스',
  'Global Critical Strike Chance':'전체 치명타 확률',
  'Accuracy Rating':'정확도','maximum Life':'최대 생명력',
  'maximum Mana':'최대 마나','maximum Energy Shield':'최대 에너지 보호막',
  'increased Rarity of Items found':'발견하는 아이템 희귀도 증가',
  'Rarity of Items found':'발견하는 아이템 희귀도',
  'Stun Threshold':'기절 한계치','Life Regeneration Rate':'생명력 재생 속도',
  'Mana Regeneration Rate':'마나 재생 속도','Area of Effect':'효과 범위',
  'Projectile Speed':'투사체 속도','Skill Speed':'스킬 속도',
  'Critical Hit Chance':'치명타 확률','Level of all Spell Skills':'모든 주문 스킬 레벨',
  'Level of all Minion Skills':'모든 소환수 스킬 레벨',
  'Level of all Fire Spell Skills':'모든 화염 주문 스킬 레벨',
  'Maximum Life':'최대 생명력','Maximum Mana':'최대 마나'
};
const metricKeys={
  AverageHit:'평균 적중 피해',AverageBurstDamage:'평균 폭발 피해',
  Speed:'사용 속도',PreEffectiveCritChance:'보정 전 치명타 확률',
  CritChance:'치명타 확률',CritMultiplier:'치명타 피해 배율',
  HitChance:'명중 확률',TotalDot:'총 지속 피해',
  WithBleedDPS:'출혈 포함 DPS',BleedDPS:'출혈 DPS',
  WithIgniteDPS:'점화 포함 DPS',IgniteDPS:'점화 DPS',
  TotalDPS:'전체 DPS',FullDPS:'총 피해 DPS',TotalDotDPS:'지속 피해 DPS',
  Life:'생명력',Mana:'마나',EnergyShield:'에너지 보호막',
  LifeUnreserved:'예약하지 않은 생명력',ManaUnreserved:'예약하지 않은 마나',
  Spirit:'혼백',SpiritUnreserved:'예약하지 않은 혼백',
  Armour:'방어도',Evasion:'회피',BlockChance:'막기 확률',
  FireResist:'화염 저항',ColdResist:'냉기 저항',LightningResist:'번개 저항',
  ChaosResist:'카오스 저항',MovementSpeed:'이동 속도',
  EffectiveHitPool:'유효 생존 피해량',PhysicalDamageReduction:'물리 피해 감소',
  EnduranceCharges:'인내 충전 수',EnduranceChargesMax:'최대 인내 충전 수',
  FrenzyCharges:'격분 충전 수',FrenzyChargesMax:'최대 격분 충전 수',
  PowerCharges:'권능 충전 수',PowerChargesMax:'최대 권능 충전 수',
  CastSpeed:'시전 속도',AttackSpeed:'공격 속도',
  TotalMinionDPS:'소환수 총 DPS',TotalDamage:'총 피해',
  PhysicalDPS:'물리 DPS',ElementalDPS:'원소 DPS',
  FireDPS:'화염 DPS',ColdDPS:'냉기 DPS',LightningDPS:'번개 DPS',
  ChaosDPS:'카오스 DPS',PoisonDPS:'중독 DPS',WithPoisonDPS:'중독 포함 DPS',
  Duration:'지속시간',Cooldown:'재사용 대기시간',
  Accuracy:'정확도',CritEffect:'치명타 피해 효과',
  Strength:'힘',Dexterity:'민첩',Intelligence:'지능',
  LifeRegen:'생명력 재생',ManaRegen:'마나 재생',
  LifeRegenRate:'생명력 재생 속도',ManaRegenRate:'마나 재생 속도',
  BleedChance:'출혈 확률',IgniteChance:'점화 확률',
  ShockChance:'감전 확률',FreezeChance:'동결 확률'
};
const groupNames={Mapping:'맵핑',Boss:'보스',Leveling:'레벨링',
  Endgame:'엔드게임',Clear:'사냥',Speed:'속도',Gear:'장비',Default:'기본'};
const tokenMap={
  With:'포함',Total:'총',Average:'평균',Burst:'폭발',Damage:'피해',
  Hit:'적중',Crit:'치명타',Critical:'치명타',Chance:'확률',
  Multiplier:'배율',Pre:'전',Effective:'유효',Speed:'속도',
  Fire:'화염',Cold:'냉기',Lightning:'번개',Chaos:'카오스',
  Physical:'물리',Spell:'주문',Attack:'공격',
  Bleed:'출혈',Ignite:'점화',Poison:'중독',DoT:'지속 피해',
  Max:'최대',Min:'최소',Minion:'소환수',Charges:'충전',
  Power:'권능',Endurance:'인내',Frenzy:'격분',
  Mana:'마나',Life:'생명력',Energy:'에너지',Shield:'보호막',
  Armour:'방어도',Evasion:'회피',Reduction:'감소',
  Recovery:'회복',Rate:'속도',Regen:'재생',Pool:'생존 피해량',
  DPS:'DPS',Level:'레벨',Chance:'확률',Block:'막기',
  Resist:'저항',Duration:'지속시간',HitChance:'명중 확률'
};
const exact=(dict,key)=>dict?.[key] || '';

export function localizePobName(name, language='ko', dictionaries={}) {
  if(language!=='ko' || !name) return String(name||'');
  const source=String(name).trim();
  return exact(dictionaries.gems,source) ||
    exact(dictionaries.uniques,source) ||
    exact(dictionaries.items,source) ||
    exact(dictionaries.ui,source) ||
    groupNames[source] || source;
}
/** Generated rare names are not fixed unique item names; compose from verified
 * game-source affix terms only when every part has a Korean counterpart.
 * The result is explicitly labelled approximate in the UI.
 */
export function localizePobRareName(name,language='ko',dict={}) {
  const original=String(name||'');
  const exact=localizePobName(original,language,dict);
  if(language!=='ko'||exact!==original)return {name:exact,approximate:false};
  const tokens=original.trim().split(/\s+/);
  if(tokens.length<2 || tokens.length>3 ||
    !tokens.every(token=>typeof dict.tags?.[token]==='string'))
    return {name:original,approximate:false};
  return {name:tokens.map(token=>dict.tags[token]).join(' '),approximate:true};
}
export function localizePobSlot(name, language='ko') {
  if(language!=='ko') return name || '';
  const slot=String(name || '').trim();
  const pattern=/^(Weapon|Weapon Swap|Offhand|Off Hand)\s*(\d+)$/i.exec(slot);
  if(pattern) return pattern[1].toLowerCase()==='weapon swap'
    ? '교체 무기 '+pattern[2] :
      (pattern[1].toLowerCase()==='weapon' ? '무기 ' : '보조 장비 ')+pattern[2];
  const slots={
    'Weapon 1':'무기 1','Weapon 2':'무기 2','Weapon 1 Swap':'교체 무기 1',
    'Weapon 2 Swap':'교체 무기 2','Helmet':'투구','Helm':'투구',
    'Body Armour':'갑옷','Body Armor':'갑옷','Gloves':'장갑',
    'Boots':'장화','Amulet':'목걸이','Ring 1':'반지 1',
    'Ring 2':'반지 2','Belt':'허리띠','Flask 1':'플라스크 1',
    'Flask 2':'플라스크 2','Charm 1':'호신부 1',
    'Charm 2':'호신부 2','Charm 3':'호신부 3',
    'Quiver':'화살통','Offhand':'보조 장비','Off Hand':'보조 장비',
    'Weapon Swap 1':'교체 무기 1','Weapon Swap 2':'교체 무기 2',
    'Left Ring':'왼쪽 반지','Right Ring':'오른쪽 반지',
    'Jewel':'주얼'
  };
  return slots[slot] || slot;
}
export function localizePobMetric(name,language='ko',dict={}) {
  if(language!=='ko') return String(name);
  if(metricKeys[name]) return metricKeys[name];
  const spaced=String(name).replace(/([a-z0-9])([A-Z])/g,'$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g,'$1 $2');
  const known=exact(dict.ui,spaced)||exact(dict.ui,spaced+':')?.replace(/:$/,'');
  if(known) return known;
  const tokens=spaced.split(/\s+/);
  // Only construct a Korean label when *every* token has an established
  // meaning. Otherwise keep the exact original technical metric key.
  if(tokens.every(token=>tokenMap[token]))return tokens.map(token=>tokenMap[token]).join(' ');
  return String(name);
}
/**
 * Round *displayed* PoB snapshot decimals to two places. Preserve the stored
 * value; never feed rounded values into allocation or calculation logic.
 * Decimal-string rounding avoids binary Number.toFixed() artifacts (1.005)
 * and avoids losing precision for large integer components.
 */
export function formatPobValue(value,language='ko') {
  const source=String(value??'');
  if(!/^[+-]?\d+(?:\.\d+)?$/.test(source))return source;
  const sign=/^[+-]/.test(source)?source[0]:'';
  const [integer,fraction]=(sign?source.slice(1):source).split('.');
  if(fraction===undefined)
    return language==='ko' ? source.replace(/\B(?=(\d{3})+(?!\d))/g,',') : source;
  let whole=integer;
  let cents=Number((fraction+'00').slice(0,2));
  if(fraction.length>2 && fraction[2]>='5') cents++;
  if(cents===100) {whole=(BigInt(whole)+1n).toString();cents=0;}
  const decimal=String(cents).padStart(2,'0');
  const prefix=whole==='0' && cents===0 && sign==='-'?'':sign;
  const grouped=language==='ko'?whole.replace(/\B(?=(\d{3})+(?!\d))/g,','):whole;
  return prefix+grouped+'.'+decimal;
}
const modPhrases=Object.keys(fields).sort((a,b)=>b.length-a.length);
function translateEffectTarget(s,dict) {
  const target=s.trim();
  if(fields[target])return fields[target];
  if(exact(dict.ui,target))return dict.ui[target];
  return '';
}
function applyNumericTemplates(line,dict) {
  let m;
  const v=String.raw`([+-]?\d+(?:\.\d+)?)`;
  m=new RegExp('^\\+'+v+' to maximum (Life|Mana|Energy Shield)$','i').exec(line);
  if(m)return '최대 '+translateEffectTarget(m[2],dict)+' +'+m[1];
  m=new RegExp('^\\+'+v+' to (Fire|Cold|Lightning|Chaos) Resistance$','i').exec(line);
  if(m)return translateEffectTarget(m[2]+' Resistance',dict)+' +'+m[1];
  m=new RegExp('^\\+'+v+'% to (Fire|Cold|Lightning|Chaos) Resistance$','i').exec(line);
  if(m)return translateEffectTarget(m[2]+' Resistance',dict)+' +'+m[1]+'%';
  m=new RegExp('^\\+'+v+'% to (all Elemental Resistances|All Elemental Resistances)$','i').exec(line);
  if(m)return '모든 원소 저항 +'+m[1]+'%';
  m=new RegExp('^\\+'+v+' to (Strength|Dexterity|Intelligence|all Attributes)$','i').exec(line);
  if(m)return (fields[m[2]]||'모든 능력치')+' +'+m[1];
  m=new RegExp('^'+v+'% (increased|reduced) (.+)$','i').exec(line);
  if(m){const target=translateEffectTarget(m[3],dict);
    if(target)return target+' '+m[1]+'% '+(m[2].toLowerCase()==='increased'?'증가':'감소');
  }
  m=new RegExp('^\\+'+v+'% to (.+)$','i').exec(line);
  if(m){const target=translateEffectTarget(m[2],dict);
    if(target)return target+' +'+m[1]+'%';
  }
  m=new RegExp('^\\+'+v+' to (.+)$','i').exec(line);
  if(m){const target=translateEffectTarget(m[2],dict);
    if(target)return target+' +'+m[1];
  }
  m=new RegExp('^Adds '+v+' to '+v+' (Physical|Fire|Cold|Lightning|Chaos) Damage$','i').exec(line);
  if(m)return translateEffectTarget(m[3]+' Damage',dict)+' '+m[1]+'~'+m[2]+' 추가';
  m=new RegExp('^'+v+'% increased (.+) and (.+)$','i').exec(line);
  if(m){const x=translateEffectTarget(m[2],dict),y=translateEffectTarget(m[3],dict);
    if(x&&y)return x+' 및 '+y+' '+m[1]+'% 증가';
  }
  return '';
}
export function localizePobItemLine(value,language='ko',dict={}) {
  const line=String(value||'').trim();
  if(language!=='ko'||!line)return line;
  if(/^[-─]{3,}$/.test(line))return '────────';
  let m=/^Rarity:\s*(\w+)$/i.exec(line);
  if(m)return '등급: '+(rarities[m[1].toUpperCase()]||m[1]);
  m=/^([^:]+):\s*(.*)$/.exec(line);
  if(m && (fields[m[1]] || exact(dict.ui,m[1])))
    return (fields[m[1]]||dict.ui[m[1]])+': '+m[2];
  if(/^(Corrupted|Mirrored|Unidentified)$/i.test(line))
    return fields[line]||line;
  const exactName=localizePobName(line,'ko',dict);
  if(exactName!==line)return exactName;
  return applyNumericTemplates(line,dict)||line;
}
export function localizePobItemText(raw,language='ko',dict={}) {
  if(language!=='ko')return String(raw||'');
  // PoB exports normally contain real newlines; some embedded item texts
  // contain literal backslash-n escapes. Handle both, display-only.
  const lines=String(raw||'').replace(/\\n/g,'\n').split(/\r?\n/);
  // Only the first item name below the rarity line is a generated rare name.
  // The following base type and modifiers retain their own exact lookup rules.
  const rarity= /^Rarity:\s*RARE\b/i.test(lines[0]?.trim()||'');
  const nameIndex=rarity?lines.findIndex((line,i)=>i>0 && !!line.trim() && !/^[-─]{3,}$/.test(line.trim())):-1;
  return lines.map((line,i)=>nameIndex===i
    ? localizePobRareName(line.trim(),language,dict).name
    : localizePobItemLine(line,language,dict)).join('\n');
}
export function localizePobGem(gem,language='ko',dict={}) {
  const name=localizePobName(gem.name,language,dict);
  return (gem.enabled?'':(language==='ko'?'[비활성] ':'[OFF] '))+
    name+(gem.level?' '+(language==='ko'?'레벨 ':'Lv ')+gem.level:'')+
    (gem.quality?' '+(language==='ko'?'퀄리티 ':'Q ')+gem.quality:'');
}
