const {chromium}=require('C:/Users/akkar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];const results=[];
 const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
 for(const [name,width,height] of [['desktop',1440,900],['large',1920,1080],['tablet',820,1180],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.route(/kaspersky-labs\.com/,r=>r.abort());
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('kaspersky'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/bunzai-burger.html`,{waitUntil:'networkidle'});
  await page.screenshot({path:`qa/${name}-hero.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow`);
  const section=page.locator('#product-animation');
  const geom=await section.evaluate(e=>({top:e.getBoundingClientRect().top+scrollY,range:e.clientHeight-e.querySelector('.burger-sticky').clientHeight}));
  const samples=[];
  for(const p of [0,.25,.48,.6,1,.6,.25,0]){
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),geom.top+geom.range*p);
   await page.waitForFunction(()=>{const el=document.querySelector('#product-animation');return el.dataset.frame!==undefined&&el.dataset.frame===el.dataset.target;},{},{timeout:30000});
   await page.waitForTimeout(250);
   samples.push(Number(await section.getAttribute('data-frame')));
   if(p===.6)await page.screenshot({path:`qa/${name}-exploded.png`});
  }
  assert(samples[2]>samples[0]&&samples[4]>samples[2],`${name} forward frames`);
  assert(samples[7]<samples[5],`${name} reverse frames`);
  await page.locator('#flavours').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'02 Bunzai Double'}).click();
  assert(await page.locator('.product-title').innerText().then(t=>t.includes('399')));
  await page.screenshot({path:`qa/${name}-menu.png`});
  await page.locator('#product-viewer').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'The layers',exact:true}).click();
  assert.equal(await page.locator('.viewer-slider input').inputValue(),'100');
  await page.screenshot({path:`qa/${name}-page.png`,fullPage:true});
  results.push({name,samples,noOverflow:true});await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.route(/kaspersky-labs\.com/,r=>r.abort());await reduced.goto(`${base}/bunzai-burger.html`,{waitUntil:'networkidle'});
 assert.equal(await reduced.locator('#product-animation canvas').count(),0);await reduced.close();
 const links=await browser.newPage();await links.route(/kaspersky-labs\.com/,r=>r.abort());for(const path of ['/bunzai-menu/menu.html','/our-story.html']){await links.goto(base+path,{waitUntil:'networkidle'});assert(await links.locator('h1').isVisible());assert(await links.locator('img').first().evaluate(i=>i.complete&&i.naturalWidth>0));}
 await browser.close();assert.deepEqual(errors,[]);console.log(JSON.stringify({results,reducedMotion:'pass',routes:'pass',errors},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
