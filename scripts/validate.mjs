import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const base = process.cwd();
const path = join(base, 'data/tree.json');
assert.ok(existsSync(path), 'The bundled tree data is missing');
const raw = JSON.parse(readFileSync(path, 'utf8'));
assert.ok(raw.classes.length >= 8, `Expected 8 classes, got ${raw.classes.length}`);
const nodes = Object.values(raw.nodes);
assert.ok(nodes.length >= 4800, `Expected full passive tree, got ${nodes.length} nodes`);
const ascendancies = new Set(nodes.map(x => x.ascendancyName).filter(Boolean));
assert.ok(ascendancies.size >= 22, `Missing ascendancies: found ${ascendancies.size}`);
assert.ok(nodes.some(x => x.name === 'The Unseen Path' && x.ascendancyName === 'Oracle'), 'Oracle notable missing');
assert.ok(nodes.filter(x => x.unlockConstraint?.ascendancy === 'Oracle').length >= 190, 'Oracle extra nodes missing');
assert.ok(raw.constants.orbitAnglesByOrbit?.length > 7, 'Orbit geometry missing');
assert.ok(Object.values(raw.groups).some(x => x?.x && x?.y), 'Node groups missing');
const ids = new Set(nodes.map(n => Number(n.skill)));
const invalidEdges = nodes.flatMap(n => (n.connections || []).filter(c => !ids.has(Number(c.id)) && !n.classesStart).map(c => [n.skill, c.id]));
assert.equal(invalidEdges.length, 0, `Broken skill ID connections (excluding upstream class-start placeholders): ${invalidEdges.slice(0, 5)}`);
const extra = Object.fromEntries([['atlas','atlas.json'],['genesis','genesis.json']].map(([name,file]) => [name, JSON.parse(readFileSync(join(base,'data',file),'utf8'))]));
assert.ok(Object.keys(extra.atlas.passives).length >= 500, 'Atlas data is incomplete');
assert.ok(Object.keys(extra.genesis.passives).length >= 200, 'Genesis tree data is incomplete');
for(const [name,model] of Object.entries(extra)){ assert.ok(Object.keys(model.groups).length > 100, name + ': missing groups'); assert.ok(model.roots.length > 0,name + ': missing roots'); }

for (const file of ['index.html', 'assets/app.js', 'assets/tree-model.js', 'assets/renderer.js', 'assets/styles.css', 'assets/extra-model.js']) {
  assert.ok(existsSync(join(base, file)), `Required site file is missing: ${file}`);
}
console.log(`PASS: ${nodes.length} skills, ${ascendancies.size} ascendancies, ${raw.classes.length} classes, ${nodes.filter(n => n.unlockConstraint?.ascendancy === 'Oracle').length} Oracle-only skills, ${Object.keys(extra.atlas.passives).length} Atlas, ${Object.keys(extra.genesis.passives).length} Genesis.`);
