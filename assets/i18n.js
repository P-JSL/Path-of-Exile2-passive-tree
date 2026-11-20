/** Browser-side UI and conservative game-term localisation. Never changes node IDs or stats. */
export const DEFAULT_LANGUAGE = 'ko';
export const SUPPORTED_LANGUAGES = ['ko', 'en'];
const STRINGS = {
  ko: {
    settings:'빌드 설정',language:'언어',languageHint:'한국어가 기본이며, 번역되지 않은 게임 데이터는 원문으로 표시합니다.',
    tabPassive:'일반 패시브',tabAscendancy:'전직 트리',tabAtlas:'아틀라스',tabGenesis:'제네시스',
    class:'기본 직업',ascendancy:'전직 직업',search:'패시브 검색',searchPlaceholder:'노드 이름 또는 효과 검색',
    searchHint:'선택한 트리에서 노드 이름과 효과를 검색합니다.',searchClear:'검색어 지우기',
    oracleHeader:'오라클 · 보이지 않는 길',oracleToggle:'보이지 않는 길 노드 표시',
    oracleHint:'오라클 전직에서 열리는 추가 패시브입니다. 배분하려면 전직 노드를 먼저 획득해야 합니다.',
    planPoints:'계획 포인트',clear:'초기화',normal:'일반',ascPoints:'전직',independent:'별도 트리',
    share:'링크 복사 · 계획 공유',storageHint:'브라우저에 계획을 자동 저장합니다. 실제 게임 배분 규칙은 별도로 확인하세요.',
    dataBased:'실제 데이터 기반',dataLoading:'데이터를 불러오고 있습니다.',
    origin:'GGG 패시브 원본',pob:'Path of Building 추출 데이터',
    stageSubtitle:'노드를 선택하면 효과 및 연결 경로를 확인할 수 있습니다.',
    loading:'실제 패시브 데이터 로드 중',loadingDesc:'게임 데이터 및 연결 관계를 처리하고 있습니다.',
    loadError:'데이터를 불러오지 못했습니다.',retry:'다시 시도',
    sceneDefault:'노드를 선택하면 효과 및 배분 경로를 확인할 수 있습니다.',
    nodeCount:'{count}개 노드',edgeCount:'{count}개 연결',
    oracleStatus:'오라클 숨겨진 노드 표시 · {status}',oracleReady:'배분 가능',oracleLocked:'보이지 않는 길 전직 미배분',
    zoomIn:'확대',zoomOut:'축소',fit:'전체 트리 보기',focus:'시작 지점으로 이동',
    legendNormal:'기본',legendNotable:'주요',legendAllocated:'배분',legendOracle:'오라클 추가',
    mobileSearch:'노드 검색',mobileDetails:'노드 정보',mobileSettings:'설정',
    detailHeader:'패시브 정보',detailEmpty:'패시브를 선택하세요',detailHelp:'맵의 노드를 누르면 효과, 종류 및 연결 경로를 확인할 수 있습니다.',
    passiveId:'패시브 ID',detailFooter:'이 페이지는 게임 내 배분과 무관한 계획 도구입니다. 일부 번역이 없는 게임 데이터는 영문 원문으로 표시됩니다.',
    noStats:'별도의 능력치 효과 없음',normalPassive:'일반 패시브',notablePassive:'주요 패시브',
    keystonePassive:'핵심 패시브',socketPassive:'주얼 슬롯',startPassive:'시작 노드',
    noName:'(이름 없음)',oracleDetail:'오라클 · 숨겨진 길',
    noAlloc:'배분 불가 · 시작 / 표시 전용',lockedAlloc:'보이지 않는 길 전직 먼저 배분',
    lockedNotice:'오라클 전직 트리에서 보이지 않는 길을 먼저 배분해야 선택할 수 있습니다.',
    refund:'패시브 회수',allocate:'연결 경로를 따라 배분',
    extraWarning:'다중 선택형 노드는 실제 게임의 선택 규칙을 별도로 확인하세요.',
    planWarning:'이 사이트의 계획은 게임 캐릭터에 적용되지 않습니다.',
    classSummary:'{name} · {count}개 전직 선택 가능',
    resultCount:'{count}개 일치 · 최대 30개 표시',
    pathFail:'시작 노드에서 연결 경로를 찾을 수 없습니다.',prerequisite:'전직 선행 조건을 확인해 주세요.',
    refundSuccess:'패시브 회수 완료 · 연결이 끊긴 노드 {count}개도 회수',
    allocSuccess:'{count}개 노드를 경로에 따라 배분했습니다.',
    clearPrompt:'선택한 직업과 전직의 계획 포인트를 모두 초기화할까요?',cleared:'선택한 트리의 계획을 초기화했습니다.',
    shareCopied:'계획 링크를 복사했습니다.',shareFallback:'아래 링크를 복사하세요.',
    summary:'{nodes}개 캐릭터 노드 · {asc}개 전직 · 아틀라스 {atlas}개 · 제네시스 {genesis}개',
    loadFailedSuffix:'GitHub Pages 또는 로컬 HTTP 서버에서 열어야 합니다. (file:// 실행 불가)',
    fullPassive:'일반 패시브 트리',fullAsc:'전직 특화 트리',fullAtlas:'아틀라스 패시브 트리',fullGenesis:'제네시스 패시브 트리',
    passiveTitle:'{name} · 패시브 트리',ascTitle:'{name} · 전직 트리',
    atlasTitle:'아틀라스 패시브 트리',genesisTitle:'제네시스 패시브 트리',
    passiveSubtitle:'게임 데이터의 노드 좌표와 실제 연결 관계를 표시합니다.',
    ascSubtitle:'게임 데이터의 전직 노드 및 연결 경로를 표시합니다.',
    atlasSubtitle:'독립된 아틀라스 루트와 분기를 표시합니다.',
    genesisSubtitle:'독립된 제네시스 트리를 표시합니다.',
    canvasAria:'패시브 트리 지도. 한 손가락으로 이동하고 두 손가락으로 확대할 수 있습니다.',
    sidebarOpen:'설정 열기',sidebarClose:'설정 닫기',detailClose:'상세 닫기',
    noAsc:'선택 없음'
  },
  en: {
    settings:'BUILD CONFIGURATION',language:'Language',languageHint:'Korean is the default. Missing game terms keep their original English text.',
    tabPassive:'Passive tree',tabAscendancy:'Ascendancy tree',tabAtlas:'Atlas',tabGenesis:'Genesis',
    class:'Base class',ascendancy:'Ascendancy',search:'Search passives',searchPlaceholder:'Search names or effects',
    searchHint:'Search node names and effects in this tree.',searchClear:'Clear search',
    oracleHeader:'ORACLE · HIDDEN PATHS',oracleToggle:'Show hidden path nodes',
    oracleHint:'Extra Oracle nodes. Allocate The Unseen Path first to plan their allocation.',
    planPoints:'Planned points',clear:'Clear',normal:'Passive',ascPoints:'Ascendancy',independent:'Separate tree',
    share:'Copy link · Share plan',storageHint:'Your plan is stored in this browser. Verify in-game rules separately.',
    dataBased:'From game data',dataLoading:'Loading data.',
    origin:'GGG passive export',pob:'Path of Building data',
    stageSubtitle:'Select a node to view its effects and connections.',
    loading:'Loading passive tree data',loadingDesc:'Processing real game data and connections.',
    loadError:'Could not load game data.',retry:'Retry',
    sceneDefault:'Select a node to see its stats and allocation path.',
    nodeCount:'{count} nodes',edgeCount:'{count} links',
    oracleStatus:'Oracle hidden nodes · {status}',oracleReady:'Available',oracleLocked:'The Unseen Path not allocated',
    zoomIn:'Zoom in',zoomOut:'Zoom out',fit:'Fit whole tree',focus:'Focus class start',
    legendNormal:'Normal',legendNotable:'Notable',legendAllocated:'Allocated',legendOracle:'Oracle extra',
    mobileSearch:'Search',mobileDetails:'Details',mobileSettings:'Settings',
    detailHeader:'PASSIVE DETAILS',detailEmpty:'Select a passive',detailHelp:'Select a node on the map to inspect its effects and allocation path.',
    passiveId:'Passive ID',detailFooter:'A planning tool independent of in-game allocations. Stat values and node positions come from the game data.',
    noStats:'No additional stats',normalPassive:'Normal passive',notablePassive:'Notable passive',
    keystonePassive:'Keystone',socketPassive:'Jewel socket',startPassive:'Starting node',
    noName:'(Unnamed)',oracleDetail:'Oracle · Hidden path',
    noAlloc:'Cannot allocate · Start / visual node',lockedAlloc:'Allocate The Unseen Path first',
    lockedNotice:'Allocate The Unseen Path on the Oracle ascendancy tree first.',
    refund:'Refund passive',allocate:'Allocate connected path',
    extraWarning:'Check actual game rules for multiple-choice nodes.',
    planWarning:'This plan does not modify your in-game character.',
    classSummary:'{name} · {count} ascendancies available',
    resultCount:'{count} matches · showing up to 30',
    pathFail:'No connection path found from the starting node.',prerequisite:'Check ascendancy prerequisites.',
    refundSuccess:'Refunded passive · {count} disconnected nodes refunded too',
    allocSuccess:'Allocated {count} nodes along the path.',
    clearPrompt:'Reset planned points for this class and ascendancy?',cleared:'Cleared the current plan.',
    shareCopied:'Plan link copied.',shareFallback:'Copy the URL below.',
    summary:'{nodes} character nodes · {asc} ascendancies · {atlas} Atlas · {genesis} Genesis',
    loadFailedSuffix:'Use GitHub Pages or a local HTTP server (file:// is not supported).',
    fullPassive:'FULL PASSIVE SKILL TREE',fullAsc:'ASCENDANCY SPECIALIZATION',fullAtlas:'ATLAS SKILL TREE',fullGenesis:'GENESIS SPECIAL TREE',
    passiveTitle:'{name} · Passive Tree',ascTitle:'{name} · Ascendancy Tree',
    atlasTitle:'Atlas Passive Tree',genesisTitle:'Genesis Tree',
    passiveSubtitle:'Original game node positions and connections.',
    ascSubtitle:'Original ascendancy nodes and connections.',
    atlasSubtitle:'Independent Atlas roots and branches.',
    genesisSubtitle:'Independent Genesis tree data.',
    canvasAria:'Passive skill tree. Drag to pan and pinch with two fingers to zoom.',
    sidebarOpen:'Open settings',sidebarClose:'Close settings',detailClose:'Close details',
    noAsc:'None'
  }
};
export function tr(key, language = DEFAULT_LANGUAGE, values = {}) {
  const template = (STRINGS[language] || STRINGS.ko)[key] || STRINGS.ko[key] || key;
  return template.replace(/\{([a-z]+)\}/g, (_, name) => String(values[name] ?? ''));
}
const DIRECT_NAMES = {
  'The Unseen Path':'보이지 않는 길','Shock Chance':'감전 확률',
  'Minion Damage':'소환수 피해','Attack Speed':'공격 속도','Cast Speed':'시전 속도',
  'Attack Damage':'공격 피해','Spell Damage':'주문 피해','Fire Damage':'화염 피해',
  'Cold Damage':'냉기 피해','Lightning Damage':'번개 피해','Chaos Damage':'카오스 피해',
  'Physical Damage':'물리 피해','Elemental Damage':'원소 피해',
  'Critical Hit Chance':'치명타 확률','Critical Damage':'치명타 피해',
  'Armour':'방어도','Evasion':'회피','Energy Shield':'에너지 보호막',
  'Accuracy':'정확도','Projectile Damage':'투사체 피해','Life Regeneration':'생명력 재생',
  'Mana Regeneration':'마나 재생','Attribute':'능력치','Attributes':'능력치',
  'All Attributes':'모든 능력치','Strength':'힘','Dexterity':'민첩','Intelligence':'지능',
  'Bleeding Duration':'출혈 지속시간','Freeze Buildup':'동결 축적',
  'Stun Buildup':'기절 축적','Jewel Socket':'주얼 슬롯',
  'Maximum Life':'최대 생명력','Mana':'마나','Life':'생명력','Damage':'피해',
  'Melee Damage':'근접 피해','Stun Threshold':'기절 한계치',
  'Life Flask Charges':'생명력 플라스크 충전'
};
const STAT_TARGETS = {
  'Mana Regeneration Rate':'마나 재생 속도','maximum Energy Shield':'최대 에너지 보호막',
  'Evasion Rating':'회피', 'Critical Hit Chance':'치명타 확률',
  'Block chance':'막기 확률','Armour':'방어도','Attack Speed':'공격 속도',
  'Critical Damage Bonus':'치명타 피해 보너스','Projectile Damage':'투사체 피해',
  'Accuracy Rating':'정확도','Attack Damage':'공격 피해','Elemental Damage':'원소 피해',
  'Stun Buildup':'기절 축적','Fire Damage':'화염 피해','Lightning Damage':'번개 피해',
  'Cold Damage':'냉기 피해','Chaos Damage':'카오스 피해','Spell Damage':'주문 피해',
  'Physical Damage':'물리 피해','Melee Damage':'근접 피해','Cast Speed':'시전 속도',
  'maximum Life':'최대 생명력','Stun Threshold':'기절 한계치','Life Regeneration rate':'생명력 재생 속도',
  'Life Recovery from Flasks':'플라스크를 통한 생명력 회복',
  'Area of Effect for Attacks':'공격 효과 범위','Freeze Buildup':'동결 축적',
  'Armour and Evasion Rating':'방어도 및 회피','Skill Speed':'스킬 속도',
  'Movement Speed':'이동 속도','Damage':'피해','Skill Effect Duration':'스킬 효과 지속시간',
  'chance to Shock':'감전 확률','Critical Hit Chance for Spells':'주문 치명타 확률',
  'maximum Mana':'최대 마나','Life':'생명력','Mana':'마나','Totem Damage':'토템 피해',
  'Attack Area Damage':'공격 범위 피해', 'Bleeding Duration':'출혈 지속시간'
};
export function passiveName(name, language = DEFAULT_LANGUAGE, catalog = {}) {
  if (language === 'en' || !name) return name || '';
  return catalog.names?.[name] || DIRECT_NAMES[name] || name;
}
export function passiveStat(line, language = DEFAULT_LANGUAGE, catalog = {}) {
  if (language === 'en' || !line) return line || '';
  if (catalog.stats?.[line]) return catalog.stats[line];
  let match = /^\+(\d+) to any Attribute$/.exec(line);
  if (match) return '임의의 능력치 +' + match[1];
  match = /^\+(\d+) to (Strength|Dexterity|Intelligence)$/.exec(line);
  if (match) return STAT_TARGETS[match[2]] === undefined
    ? ({ Strength:'힘', Dexterity:'민첩', Intelligence:'지능' }[match[2]] + ' +' + match[1])
    : STAT_TARGETS[match[2]] + ' +' + match[1];
  match = /^\+(\d+) to all Attributes$/.exec(line);
  if (match) return '모든 능력치 +' + match[1];
  match = /^(\d+(?:\.\d+)?)% (increased|reduced) (.+)$/.exec(line);
  if (match && STAT_TARGETS[match[3]]) return STAT_TARGETS[match[3]] + ' ' + match[1] + '% ' + (match[2] === 'increased' ? '증가' : '감소');
  match = /^(\d+)% faster start of Energy Shield Recharge$/.exec(line);
  if (match) return '에너지 보호막 재충전 시작 속도 ' + match[1] + '% 가속';
  match = /^Minions deal (\d+)% increased Damage$/.exec(line);
  if (match) return '소환수가 주는 피해 ' + match[1] + '% 증가';
  match = /^Damage Penetrates (\d+)% (Fire|Cold|Lightning|Chaos) Resistance$/.exec(line);
  if (match) return ({Fire:'화염',Cold:'냉기',Lightning:'번개',Chaos:'카오스'}[match[2]]) + ' 저항 ' + match[1] + '% 관통';
  match = /^Gain Deflection Rating equal to (\d+)% of Evasion Rating$/.exec(line);
  if (match) return '회피의 ' + match[1] + '%와 동일한 굴절 수치 획득';
  // Exact English source is more trustworthy than an approximate translation.
  return line;
}
