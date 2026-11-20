import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {decodePobCode, parsePobDocument, resolvePobTree} from '../assets/pob-import.js';

function xmlNode(tagName, attrs = {}, children = [], textContent = '') {
  return {
    tagName, children, textContent,
    attributes: Object.entries(attrs).map(([name,value]) => ({name,value:String(value)})),
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs,name) ? String(attrs[name]) : null; }
  };
}
const doc = root => ({documentElement:root,querySelector:()=>null});
const build = () => doc(xmlNode('PathOfBuilding2',{},[
  xmlNode('Build',{className:'Druid',ascendClassName:'Oracle',level:'95'},[
    xmlNode('PlayerStat',{stat:'TotalDPS',value:'1234567'})
  ]),
  xmlNode('Tree',{activeSpec:'2'},[
    xmlNode('Spec',{title:'Leveling',treeVersion:'0_5',nodes:'2'}),
    xmlNode('Spec',{title:'Endgame',treeVersion:'0_5',nodes:'2,3,4,999999'},[
      xmlNode('WeaponSet1',{nodes:'5,2'}),
      xmlNode('WeaponSet2',{nodes:'6'}),
      xmlNode('Overrides',{},[
        xmlNode('AttributeOverride',{strNodes:'2,5',intNodes:'6'})
      ]),
      xmlNode('Sockets',{},[xmlNode('Socket',{nodeId:'4',itemId:'3'})])
    ])
  ]),
  xmlNode('Skills',{activeSkillSet:'7'},[
    xmlNode('SkillSet',{id:'7',title:'Boss'},[
      xmlNode('Skill',{label:'Spark'},[
        xmlNode('Gem',{nameSpec:'Spark',level:'20',quality:'20'})
      ])
    ])
  ]),
  xmlNode('Items',{activeItemSet:'1'},[
    xmlNode('Item',{id:'3'},[],'Rarity: UNIQUE\nArcane Robe'),
    xmlNode('ItemSet',{id:'1'},[
      xmlNode('Slot',{name:'Body Armour',itemId:'3'})
    ])
  ]),
  xmlNode('Config',{},[
    xmlNode('ConfigSet',{id:'1',title:'Boss'},[
      xmlNode('Input',{name:'enemyIsBoss',boolean:'true'})
    ])
  ]),
  xmlNode('Notes',{},[],'Build guide')
]));
test('decode original PoB2 zlib URL-safe base64 without network or external packages',async()=>{
  const xml='<PathOfBuilding2><Build className="Druid"/></PathOfBuilding2>';
  const share=deflateSync(Buffer.from(xml,'utf8')).toString('base64').replace(/\+/g,'-').replace(/\//g,'_');
  assert.equal(await decodePobCode(share),xml);
  assert.equal(await decodePobCode(xml),xml);
  await assert.rejects(decodePobCode('https://pobb.in/abc'),/코드/);
  await assert.rejects(decodePobCode('!!bad!!'),/Base64/);
});
test('parse active spec, weapon sets, attribute overrides, skill, gear and config',()=>{
  const result=parsePobDocument(build());
  assert.equal(result.className,'Druid');
  assert.equal(result.level,'95');
  assert.equal(result.activeIndex,1);
  assert.deepEqual(result.specs[1].nodeIds,[2,3,4,999999,5,6]);
  assert.deepEqual(result.specs[1].weaponSets,[[5,2],[6]]);
  assert.deepEqual(result.specs[1].attributeChoices,{2:'str',5:'str',6:'int'});
  assert.deepEqual(result.specs[1].sockets,[{nodeId:4,itemId:'3'}]);
  assert.equal(result.skillSets[0].groups[0].gems[0].name,'Spark');
  assert.match(result.itemSets[0].slots[0].text,/Arcane Robe/);
  assert.equal(result.configSets[0].inputs[0].boolean,'true');
  assert.equal(result.stats[0].value,'1234567');
});
test('resolve only real matching node IDs and retain missing/other ascendancy report',()=>{
  const model={
    classes:['Druid'],
    ascendancies:[{className:'Druid',name:'Oracle'}],
    nodes:new Map([
      [2,{id:2}],[3,{id:3}],[4,{id:4,ascendancyName:'Oracle'}],
      [5,{id:5}],[6,{id:6,ascendancyName:'Invoker'}]
    ])
  };
  const result=resolvePobTree(parsePobDocument(build()),model);
  assert.deepEqual(result.ordinary,[2,3,5]);
  assert.deepEqual(result.specialized,[4]);
  assert.deepEqual(result.incompatible,[6]);
  assert.deepEqual(result.unknown,[999999]);
});
test('reject PoB1 and malformed tree formats',()=>{
  assert.throws(()=>parsePobDocument(doc(xmlNode('PathOfBuilding'))),/PoE1/);
  assert.throws(()=>parsePobDocument(doc(xmlNode('PathOfBuilding2'))),/정보가 없습니다/);
});
