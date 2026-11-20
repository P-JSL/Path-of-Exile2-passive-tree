/** Browser-side UI and conservative game-term localisation. Never changes node IDs or stats. */
export const DEFAULT_LANGUAGE = 'ko';
export const SUPPORTED_LANGUAGES = ['ko', 'en'];
const STRINGS = {
  ko: {
    pobImportTitle:'Path of Building 2 가져오기',pobCodeLabel:'PoB2 공유 코드 또는 XML',
    pobPlaceholder:'PoB2에서 Import/Export → Generate로 생성한 코드를 붙여 넣으세요',
    pobImportButton:'빌드 불러오기',pobImportHint:'입력은 브라우저 안에서 처리됩니다. 이전 계획이 있을 때 교체 여부를 묻습니다. 가져온 원본 코드는 이 브라우저에 저장됩니다.',
    pobOverviewTitle:'가져온 PoB2 빌드',pobSpecLabel:'패시브 트리 구성',pobCopySource:'원본 PoB2 코드 복사',
    pobRemove:'원본 삭제',pobConfirm:'선택한 직업의 기존 패시브 계획을 PoB2 빌드로 교체할까요?',
    pobImported:'PoB2 빌드를 불러왔습니다.',pobMissing:'현재 트리 버전에서 찾을 수 없는 노드 {count}개는 배분에 반영하지 않았습니다.',
    pobIncompatible:'전직이 다른 노드 {count}개는 배분에서 제외했습니다.',
    pobReadOnly:'스킬·장비·설정은 PoB2 원본 기준으로 표시합니다. PoB 계산 엔진을 실행하지 않으며, 이 사이트의 변경 사항은 원본 코드에 적용되지 않습니다.',
    pobSkills:'스킬 및 젬',pobItems:'장비 및 주얼',pobConfig:'설정',pobStats:'PoB 계산 스냅샷',pobNotes:'빌드 메모',
    pobOriginalCopied:'원본 PoB2 코드를 복사했습니다.',pobDeleteConfirm:'브라우저에 저장된 원본 PoB2 코드를 삭제할까요? (패시브 계획은 유지)',
    pobNoGear:'장착된 장비 정보가 없습니다.',pobNoSkills:'등록된 스킬 정보가 없습니다.',pobNoConfig:'등록된 설정 정보가 없습니다.',
    pobVersionWarning:'원본 빌드 트리 버전 {version} / 현재 사이트 데이터 {local}. 노드 ID와 배분 결과를 확인하세요.',
    settings:'빌드 설정',tabNav:'트리 유형',mainAria:'패시브 트리 지도',version:'PoE2 0.5 · 공식 내보내기 기반',docTitle:'Exile Tree | PoE2 패시브 트리',language:'언어',languageHint:'한국어 사전을 확장했습니다. 한국어 번역이 검증되지 않은 문구는 영문으로 표시합니다.',
    tabPassive:'일반 패시브',tabAscendancy:'전직 트리',tabAtlas:'아틀라스',tabGenesis:'제네시스',
    class:'기본 직업',ascendancy:'전직 직업',search:'패시브 검색',searchPlaceholder:'노드 이름 또는 효과 검색',
    searchHint:'선택한 트리에서 노드 이름과 효과를 검색합니다.',searchClear:'검색어 지우기',
    oracleHeader:'오라클 · 보이지 않는 길',oracleToggle:'보이지 않는 길 노드 표시',
    oracleHint:'오라클 전직에서 열리는 추가 패시브입니다. 배분하려면 전직 노드를 먼저 획득해야 합니다.',
    planPoints:'계획 포인트',clear:'초기화',normal:'일반',ascPoints:'전직',independent:'별도 트리',
    allocatedHeader:'배분한 패시브 노드',allocatedHint:'각 트리에서 사용한 노드와 효과를 확인할 수 있습니다. 노드를 누르면 지도에서 해당 위치로 이동합니다.',allocatedEmpty:'아직 배분한 노드가 없습니다.',
    attributeSelect:'능력치 선택',attributeUnset:'능력치 미선택',attributeHint:'포인트를 배분한 후 힘·민첩·지능을 선택할 수 있습니다.',attributeStrength:'힘',attributeDexterity:'민첩',attributeIntelligence:'지능',
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
    hideFilters:'필터 접기',showFilters:'필터 열기',hideDetails:'정보 접기',showDetails:'정보 열기',
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
    keywordNoteHeading:'스킬 용어 메모',keywordOpen:'{term} 설명 열기',keywordClose:'용어 메모 닫기',keywordReference:'PoE2DB 한국어 용어집에서 자세히 보기',keywordFallback:'이 용어의 상세 설명이 아직 등록되지 않았습니다. 연결된 PoE2DB 용어집에서 게임 규칙을 확인할 수 있습니다.',keywordContext:'선택한 패시브 효과: {text}',
    budgetLabel:'현재 트리 포인트 한도',budgetUnset:'미설정',budgetHint:'레벨·퀘스트·시련으로 실제 획득한 포인트를 직접 입력하세요. 미설정 시 한도를 강제하지 않습니다.',
    budgetUsage:'사용 {used} / 한도 {max}',budgetNoLimit:'사용 {used} / 한도 미설정',budgetOk:'확인 가능한 배분 제약 위반 없음',
    budgetIssues:'확인된 배분 제약 위반 {count}건 ({reason})',ruleUnavailable:'선택한 노드가 현재 트리에 없습니다.',
    ruleUnallocatable:'배분할 수 없는 시작 또는 표시 전용 노드입니다.',ruleOtherAscendancy:'선택한 전직의 노드만 배분할 수 있습니다.',
    ruleLocked:'해당 전직 조건을 충족해야 합니다.',rulePrerequisite:'선행 패시브 ID {id}을(를) 먼저 배분해야 합니다.',
    ruleExclusiveChoice:'같은 선택 그룹에서는 하나의 노드만 사용할 수 있습니다.',rulePointBudget:'포인트 한도를 초과합니다. 사용 {used} / 한도 {max}.',
    ruleDisconnected:'연결되지 않은 노드가 기존 계획에 포함되어 있습니다.',
    noAsc:'선택 없음'
  },
  en: {
    pobImportTitle:'Import Path of Building 2',pobCodeLabel:'PoB2 share code or XML',
    pobPlaceholder:'Paste a code generated by Import/Export → Generate in PoB2',
    pobImportButton:'Import build',pobImportHint:'Processed locally in your browser. Existing plans require confirmation before replacement. Original codes are stored in this browser.',
    pobOverviewTitle:'Imported PoB2 build',pobSpecLabel:'Passive tree specification',pobCopySource:'Copy original PoB2 code',
    pobRemove:'Remove source',pobConfirm:'Replace this class’s existing passive allocation with the PoB2 build?',
    pobImported:'PoB2 build imported.',pobMissing:'{count} passive IDs are absent from this tree version and were not allocated.',
    pobIncompatible:'{count} passives belong to another Ascendancy and were excluded.',
    pobReadOnly:'Skills, gear and configuration show the original PoB2 data. PoB’s calculation engine is not executed, and edits here do not change the original code.',
    pobSkills:'Skills and gems',pobItems:'Equipment and jewels',pobConfig:'Configuration',pobStats:'PoB calculation snapshot',pobNotes:'Build notes',
    pobOriginalCopied:'Original PoB2 code copied.',pobDeleteConfirm:'Delete the saved original PoB2 code? (Keep passive allocations)',
    pobNoGear:'No equipped items.',pobNoSkills:'No skill groups.',pobNoConfig:'No configuration inputs.',
    pobVersionWarning:'PoB tree version {version} / local tree {local}. Verify passive IDs and allocations.',
    settings:'BUILD CONFIGURATION',tabNav:'Tree views',mainAria:'Passive skill tree map',version:'PoE2 0.5 · GGG export',docTitle:'Exile Tree | PoE2 Passive Tree',language:'Language',languageHint:'Expanded Korean translations. Unverified terms remain in their original English.',
    tabPassive:'Passive tree',tabAscendancy:'Ascendancy tree',tabAtlas:'Atlas',tabGenesis:'Genesis',
    class:'Base class',ascendancy:'Ascendancy',search:'Search passives',searchPlaceholder:'Search names or effects',
    searchHint:'Search node names and effects in this tree.',searchClear:'Clear search',
    oracleHeader:'ORACLE · HIDDEN PATHS',oracleToggle:'Show hidden path nodes',
    oracleHint:'Extra Oracle nodes. Allocate The Unseen Path first to plan their allocation.',
    planPoints:'Planned points',clear:'Clear',normal:'Passive',ascPoints:'Ascendancy',independent:'Separate tree',
    allocatedHeader:'Allocated passive nodes',allocatedHint:'Review each allocated node and its effects. Tap a node to focus it on the tree.',allocatedEmpty:'No nodes allocated yet.',
    attributeSelect:'Choose attribute',attributeUnset:'Attribute not selected',attributeHint:'Allocate this passive before choosing Strength, Dexterity or Intelligence.',attributeStrength:'Strength',attributeDexterity:'Dexterity',attributeIntelligence:'Intelligence',
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
    hideFilters:'Hide filters',showFilters:'Show filters',hideDetails:'Hide details',showDetails:'Show details',
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
    keywordNoteHeading:'SKILL KEYWORD NOTE',keywordOpen:'Read about {term}',keywordClose:'Close keyword note',keywordReference:'Learn more in the PoE2DB glossary',keywordFallback:'A detailed explanation for this keyword is not yet included. Consult the linked PoE2DB glossary for the exact game rules.',keywordContext:'Selected passive effect: {text}',
    budgetLabel:'Available points for this tree',budgetUnset:'Not set',budgetHint:'Enter points actually earned through levels, quests and trials. An unset budget is not enforced.',
    budgetUsage:'Spent {used} / limit {max}',budgetNoLimit:'Spent {used} / no limit set',budgetOk:'No violations of supported allocation rules',
    budgetIssues:'{count} allocation issues ({reason})',ruleUnavailable:'This node is not in the current tree.',
    ruleUnallocatable:'Start and decorative nodes cannot be allocated.',ruleOtherAscendancy:'Only nodes in the selected Ascendancy can be allocated.',
    ruleLocked:'This Ascendancy requirement is not met.',rulePrerequisite:'Allocate prerequisite passive ID {id} first.',
    ruleExclusiveChoice:'Only one option in this choice group can be selected.',rulePointBudget:'Point limit exceeded: spent {used} / limit {max}.',
    ruleDisconnected:'The saved plan contains disconnected passives.',
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
  'Evasion Rating':'회피', 'Deflection Rating':'튕겨내기 평점', 'Critical Hit Chance':'치명타 확률',
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
  // In-game square-bracket links are display markup, not part of translation keys.
  const plain = line.replace(/\[[^|]*\|([^\]]+)\]/g, '$1');
  if (plain !== line && catalog.stats?.[plain]) return catalog.stats[plain];
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
  if (match) return '회피의 ' + match[1] + '%와 동일한 튕겨내기 평점 획득';
  match = /^Companions deal (\d+)% increased Damage$/.exec(line);
  if (match) return '동료가 주는 피해 ' + match[1] + '% 증가';
  match = /^(Minions|Companions) have (\d+)% increased maximum Life$/.exec(line);
  if (match) return (match[1] === 'Minions' ? '소환수' : '동료') + ' 최대 생명력 ' + match[2] + '% 증가';
  match = /^(\d+)% of Damage taken Recouped as Life$/.exec(line);
  if (match) return '받은 피해의 ' + match[1] + '%를 생명력으로 회생';
  match = /^(\d+)% increased Damage with (One|Two) Handed Weapons$/.exec(line);
  if (match) return (match[2] === 'One' ? '한손' : '양손') + ' 무기로 주는 피해 ' + match[1] + '% 증가';
  // Exact English source is more trustworthy than an approximate translation.
  return line;
}
