import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {basename,dirname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {inflateSync} from 'node:zlib';

const {chromium,webkit}=createRequire(process.env.POB_PLAYWRIGHT_PACKAGE)('playwright');
const source=readFileSync('.pob-smoke-example','utf8').trim();
const fixtureXml=source.startsWith('<')?source:inflateSync(Buffer.from(source,'base64url')).toString('utf8');
assert.match(fixtureXml,/<PathOfBuilding2[\s>]/,'Upstream smoke fixture must be a PoE2 build');
const url='http://127.0.0.1:8765/'+encodeURIComponent(basename(process.cwd()))+'/pob.html';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory',dirname(process.cwd())],{stdio:'ignore'});
try{
  let available=false;
  for(let i=0;i<50;i++){try{if((await fetch(url)).ok){available=true;break;}}catch{}await sleep(200);}
  assert(available,'Local static server did not start');
  for(const [name,launcher,opts] of [['Chromium',chromium,{}],['WebKit',webkit,{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]]){
    const browser=await launcher.launch({headless:true});
    try{
      const page=await browser.newPage(opts);
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      await page.evaluate(()=>localStorage.setItem('exile-tree-pob2-source-v1',JSON.stringify({source:'preserve me',selectedIndex:0})));
      await page.locator('#source').fill('<PathOfBuilding/>');
      await page.locator('#load').click();
      await page.waitForFunction(()=>!document.querySelector('#load').disabled&&document.querySelector('#status').dataset.error==='true');
      assert.match(await page.locator('#status').innerText(),/PoE1용 PoB 코드/);
      assert.equal(await page.locator('#workspace').isVisible(),false);
      await page.locator('#source').fill(source);
      await page.locator('#load').click();
      await page.waitForFunction(()=>!document.querySelector('#load').disabled&&(document.querySelector('#status').dataset.error==='true'||document.querySelector('#status').textContent.startsWith('PoB2 계산 완료')),null,{timeout:300000});
      const status=await page.locator('#status').innerText();
      assert.match(status,/^PoB2 계산 완료/,name+': '+status);
      assert(await page.locator('#workspace').isVisible());
      assert(await page.locator('#metrics .metric').count()>0,'No computed metrics');
      assert(await page.locator('#metrics [title="Life"]').count()>0,'Missing real Life output');
      const exported=await page.locator('#xml').inputValue();
      assert.match(exported,/<PathOfBuilding2[\s>]/);
      // The new workspace must never overwrite the original tree import.
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('exile-tree-pob2-source-v1')).source),'preserve me');
      // Direct XML changes must mark existing metrics stale until recalculated.
      await page.locator('#xml').fill(exported+'\n');
      assert(await page.locator('#workspace').evaluate(el=>el.classList.contains('dirty')));
      assert(await page.locator('#copy').isDisabled());
      await page.locator('#xml-apply').click();
      await page.waitForFunction(()=>!document.querySelector('#xml-apply').disabled&&(document.querySelector('#status').dataset.error==='true'||document.querySelector('#status').textContent.startsWith('PoB2 계산 완료')),null,{timeout:180000});
      assert.match(await page.locator('#status').innerText(),/^PoB2 계산 완료/);
      await page.locator('#reset').click();
      assert.equal(await page.locator('#workspace').isVisible(),false);
      assert.equal(await page.locator('#source').inputValue(),'');
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('exile-tree-pob2-source-v1')).source),'preserve me');
      assert.deepEqual(errors,[]);
      console.log(name+': PoB WASM calculation, XML round-trip and reset passed');
    }finally{await browser.close();}
  }
}finally{server.kill();}
