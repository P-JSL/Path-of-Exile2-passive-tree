import test from 'node:test';
import assert from 'node:assert/strict';
import {profileSnapshot, summarizePobItem, renderPobProfile} from '../assets/pob-profile.js';

const source={
  className:'Druid',ascendancyName:'Oracle',level:'91',activeIndex:0,
  activeItemSet:'2',activeSkillSet:'4',
  specs:[{title:'Endgame',treeVersion:'0_5',nodeIds:[1,2,3],
    weaponSets:[[1],[2]],sockets:[{nodeId:3,itemId:'7',text:'Rarity: UNIQUE\nEmerald Jewel\nJewel'}]}],
  itemSets:[{id:'2',title:'Mapping',slots:[
    {name:'Body Armour',itemId:'1',text:'Rarity: RARE\nWarm Coat\nSplendid Vest\n+80 Life'},
    {name:'Helmet',itemId:'0',text:''}]}],
  skillSets:[{id:'4',title:'Boss',groups:[
    {label:'Spark',gems:[{name:'Spark',level:'20',quality:'20',enabled:true},{name:'Arcane Tempo',level:'3',quality:'0',enabled:false}]}
  ]}],
  stats:[{name:'TotalDPS',value:'1467894'},{name:'Life',value:'1234'}]
};
test('gear summary does not invent item names and preserves raw item text',()=>{
  const item=summarizePobItem(source.itemSets[0].slots[0].text);
  assert.deepEqual(item,{rarity:'rare',title:'Warm Coat',description:'Splendid Vest\n+80 Life',raw:source.itemSets[0].slots[0].text});
});
test('profile selects active equipment and skill sets including jewel and weapon metadata',()=>{
  const snapshot=profileSnapshot(source);
  assert.equal(snapshot.equipment.length,2);
  assert.equal(snapshot.equipment[1].text,'');
  assert.equal(snapshot.equipment[0].name,'Body Armour');
  assert.equal(snapshot.skillGroups[0].gems.length,2);
  assert.equal(snapshot.jewels[0].nodeId,3);
  assert.deepEqual(snapshot.spec.weaponSets,[[1],[2]]);
});
test('profile renders safely using textContent without interpolating build HTML',()=>{
  const oldDocument=globalThis.document;
  const ids=new Map();
  function el(name){
    return {
      name,children:[],className:'',textContent:'',title:'',
      classList:{add(){}},
      append(...values){this.children.push(...values);},
      replaceChildren(...values){this.children=[...values];}
    };
  }
  globalThis.document={
    createElement:el,
    createDocumentFragment:()=>el('#fragment'),
    getElementById:id=>{if(!ids.has(id))ids.set(id,el('root'));return ids.get(id);}
  };
  try {
    renderPobProfile(source,0,'ko');
    assert.match(ids.get('pob-profile-name').textContent,/Oracle/);
    assert.match(ids.get('pob-profile-version').textContent,/0_5/);
    const gear=ids.get('pob-profile-equipment').children[0].children[0];
    assert.equal(gear.children[1].textContent,'Warm Coat');
    assert.equal(gear.children[3].name,'details');
    assert.equal(gear.children[3].children[1].textContent,source.itemSets[0].slots[0].text);
    const jewel=ids.get('pob-profile-jewel-list').children[0].children[1];
    assert.equal(jewel.children[2].name,'details');
    assert.equal(jewel.children[2].children[1].textContent,source.specs[0].sockets[0].text);
    const stats=ids.get('pob-profile-stat-list').children[0].children;
    assert.equal(stats[0].children[0].textContent,'전체 DPS');
    assert.equal(stats[0].children[1].textContent,'1467894');
  } finally {globalThis.document=oldDocument;}
});

test('alternate source equipment and skill sets are selectable without mutating active PoB IDs',()=>{
  const alternative={
    ...source,
    itemSets:[...source.itemSets,{
      id:'3',title:'Second gear',slots:[{name:'Helmet',itemId:'8',
        text:'Rarity: RARE\nAlternate Helm\n+60 Mana'}]
    }],
    skillSets:[...source.skillSets,{
      id:'5',title:'Speed',groups:[{label:'Faster skills',gems:[
        {name:'Tempest',level:'16',quality:'0',enabled:true}
      ]}]
    }]
  };
  const snapshot=profileSnapshot(alternative,0,{itemSetId:'3',skillSetId:'5'});
  assert.equal(snapshot.itemSet.id,'3');
  assert.equal(snapshot.equipment[0].title,'Alternate Helm');
  assert.equal(snapshot.skillSet.id,'5');
  assert.equal(snapshot.skillGroups[0].gems[0].name,'Tempest');
  assert.equal(alternative.activeItemSet,'2');
  assert.equal(alternative.activeSkillSet,'4');
  assert.equal(profileSnapshot(alternative).itemSet.id,'2');
});
