import { test, expect } from '@playwright/test';
import { deflateSync } from 'node:zlib';

test('game tree loads, highlights indexed search results and opens passives', async ({page, isMobile}) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/?perf=1');
  await expect(page.locator('#loading-overlay')).toBeHidden({timeout:45000});
  await expect(page.locator('#scene-count')).toContainText(/[0-9]/);
  await expect(page.locator('.perf-hud')).toBeVisible();
  if (isMobile) await page.locator('#mobile-search').click();
  await page.locator('#search-input').fill('fire');
  await expect(page.locator('.result-item').first()).toBeVisible();
  const expectedId = await page.locator('.result-item').first().getAttribute('data-node-id');
  await page.locator('.result-item').first().click();
  await expect(page.locator('#detail-id')).toHaveText(expectedId);
  await expect(page.locator('#search-navigator')).toBeVisible();
  await page.locator('#search-next').click();
  await expect(page.locator('#search-nav-count')).toContainText('/');
  expect(runtimeErrors).toEqual([]);
});

test('canvas stays available after zoom and drag in real browser', async ({page}) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading-overlay')).toBeHidden({timeout:45000});
  const canvas = page.locator('#tree-canvas');
  await expect(canvas).toBeVisible();
  const dims = await canvas.evaluate(element => ({width:element.width,height:element.height}));
  expect(dims.width).toBeGreaterThan(250);
  expect(dims.height).toBeGreaterThan(250);
  await page.locator('#zoom-in').click();
  await page.locator('#zoom-out').click();
  const bounds = await canvas.boundingBox();
  const x = bounds.x + bounds.width * .55, y = bounds.y + bounds.height * .5;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x-130,y+70,{steps:8});
  await page.mouse.up();
  await page.locator('#fit-all').click();
  expect(runtimeErrors).toEqual([]);
});


test('PoB2 import preserves shared/W1/W2 passives and reveals source jewel text', async ({page, isMobile}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading-overlay')).toBeHidden({timeout:45000});
  if (isMobile) await page.locator('#mobile-search').click();

  // Select real node hashes from the loaded tree rather than inventing IDs.
  const search = page.locator('#search-input');
  await search.fill('fire');
  const fireResults = page.locator('.result-item');
  await expect(fireResults.nth(1)).toBeVisible();
  const first = Number(await fireResults.nth(0).getAttribute('data-node-id'));
  const second = Number(await fireResults.nth(1).getAttribute('data-node-id'));
  expect(first).not.toBe(second);

  await search.fill('Jewel Socket');
  await expect.poll(async () => fireResults.first().getAttribute('data-node-id'))
    .not.toBe(String(first));
  const socketId = Number(await fireResults.first().getAttribute('data-node-id'));
  expect(socketId).not.toBe(first);
  expect(socketId).not.toBe(second);

  const xml = `<PathOfBuilding2><Build className="Druid" ascendClassName="Oracle" level="77"/>
    <Tree activeSpec="1"><Spec title="W1 W2 integration" treeVersion="0_5" nodes="${socketId},${first},${second}">
      <WeaponSet1 nodes="${first}"/><WeaponSet2 nodes="${second}"/>
      <Sockets><Socket nodeId="${socketId}" itemId="1"/></Sockets>
    </Spec></Tree><Items><Item id="1">Rarity: Rare\\nIntegration Jewel\\n+12 to Life</Item></Items>
    </PathOfBuilding2>`;

  // Prevent search results from obscuring the import form (especially on phones).
  await page.locator('#search-clear').click();
  await page.locator('.side-fold').filter({has:page.locator('#pob-code')}).locator('summary').click();
  await page.locator('#pob-code').fill(xml);
  await page.locator('#pob-import').click();
  await expect(page.locator('#pob-build-stage')).toBeVisible();
  await page.locator('#pob-back-tree').click();
  await expect(page.locator('#weapon-set-controls')).toBeVisible();

  const selector = page.locator('#pob-weapon-view');
  await selector.selectOption('1');
  await expect(selector).toHaveValue('1');
  await expect(page.locator('#pob-weapon-count')).toHaveText(/2/);
  await selector.selectOption('2');
  await expect(page.locator('#pob-weapon-count')).toHaveText(/2/);
  await selector.selectOption('all');
  await expect(page.locator('#pob-weapon-count')).toHaveText(/3/);

  if (isMobile) await page.locator('#mobile-search').click();
  await search.fill('Jewel Socket');
  await expect(page.locator('.result-item').first()).toBeVisible();
  await page.locator('.result-item').first().click();
  await expect(page.locator('#detail-id')).toHaveText(String(socketId));
  await expect(page.locator('#pob-jewel-detail')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('#pob-jewel-text')).toContainText('Integration Jewel');

  await selector.selectOption('1');
  await expect(page.locator('#allocate-button')).toBeDisabled();
  await selector.selectOption('all');
  expect(errors).toEqual([]);
});

test('compressed URL-safe PoB2 share codes decode in desktop and touch WebKit', async ({page, isMobile}) => {
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading-overlay')).toBeHidden({timeout:45000});
  if (isMobile) await page.locator('#mobile-search').click();
  const search=page.locator('#search-input');
  await search.fill('fire');
  const result=page.locator('.result-item').first();
  await expect(result).toBeVisible();
  const id=Number(await result.getAttribute('data-node-id'));
  expect(Number.isSafeInteger(id)).toBe(true);
  await page.locator('#search-clear').click();
  await page.locator('.side-fold').filter({has:page.locator('#pob-code')}).locator('summary').click();

  const xml=`<PathOfBuilding2><Build className="Druid" ascendClassName="Oracle" level="60"/>
    <Tree activeSpec="1"><Spec nodes="${id}" treeVersion="0_5" title="Compressed import"/></Tree>
    </PathOfBuilding2>`;
  const code=deflateSync(Buffer.from(xml,'utf8')).toString('base64')
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  await page.locator('#pob-code').fill(code);
  await page.locator('#pob-import').click();
  await expect(page.locator('#pob-build-stage')).toBeVisible();
  await expect(page.locator('#pob-meta')).toContainText('Nodes 1');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('exile-tree-pob2-source-v1') || 'null'));
  expect(stored?.source).toBe(code);
  expect(errors).toEqual([]);
});

/** Downsample the actual Canvas pixels, not the DOM overlay or toolbar. */
async function countVisiblePassivePixels(canvas) {
  return canvas.evaluate(source=>{
    const sample=document.createElement('canvas');
    sample.width=320;sample.height=200;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0,sample.width,sample.height);
    const image=ctx.getImageData(0,0,sample.width,sample.height).data;
    let visible=0;
    for(let offset=0;offset<image.length;offset+=4) {
      // The empty background is approximately rgb(12,20,32); use a large
      // margin to ignore the subtle backdrop grid and tiny color variance.
      if(image[offset]>85 || image[offset+1]>95 || image[offset+2]>120) visible++;
    }
    return visible;
  });
}

test('passive Canvas retains visible tree pixels during repeated drag/zoom/fit gestures', async ({page})=>{
  const runtimeErrors=[];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading-overlay')).toBeHidden({timeout:45000});
  const canvas=page.locator('#tree-canvas');
  await expect.poll(()=>countVisiblePassivePixels(canvas),{timeout:10000}).toBeGreaterThan(40);
  for(let i=0;i<4;i++) {
    await page.locator('#zoom-in').click();
    await page.locator('#zoom-out').click();
    const box=await canvas.boundingBox();
    const x=box.x+box.width*.52,y=box.y+box.height*.51;
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x-(i%2?75:140),y+(i%2?75:-65),{steps:6});
    await page.mouse.up();
  }
  await page.locator('#fit-all').click();
  await expect.poll(()=>countVisiblePassivePixels(canvas),{timeout:10000}).toBeGreaterThan(40);
  await page.locator('#focus-start').click();
  await expect.poll(()=>countVisiblePassivePixels(canvas),{timeout:10000}).toBeGreaterThan(40);
  expect(runtimeErrors).toEqual([]);
});
