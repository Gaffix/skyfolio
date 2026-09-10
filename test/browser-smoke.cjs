// Run with Playwright installed, or set PLAYWRIGHT_MODULE to its absolute module path.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {createServer,shapeProfile}=require('../src/app');
const {buildAccessoryPlanner}=require('../src/accessory-planner');
const {buildAvailability}=require('../src/data-availability');
async function main(){
  const uuid='0123456789abcdef0123456789abcdef',member={inventory:{bag_contents:{}},player_data:{experience:{}},collection:{},pets_data:{pets:[]}};
  const raw={profile_id:'test-profile',cute_name:'Apple',selected:true,game_mode:'ironman',members:{[uuid]:member},banking:{balance:0}};
  const p=shapeProfile(raw,uuid,'Tester',1,{},{},{parents:{},catalog:[]},{},{},{},{mayor:{},current:{}},{},{},{});
  p.accessories.active=p.accessories.items=[{id:'SPEED_TALISMAN',name:'Speed Talisman',rarity:'COMMON',lore:['COMMON ACCESSORY'],rawLore:[],icon:'/api/item-texture/SPEED_TALISMAN'}];p.accessories.inactive=[];p.accessories.magicalPower=100;p.accessories.catalogAvailable=true;p.accessories.inventoryAvailable=true;
  const resources={catalog:[{id:'SPEED_TALISMAN',name:'Speed Talisman',tier:'COMMON'},{id:'SPEED_RING',name:'Speed Ring',tier:'UNCOMMON'}],parents:{SPEED_RING:['SPEED_TALISMAN']}};
  p.accessories.planner=buildAccessoryPlanner(p.accessories,resources,{}, {SPEED_RING:1000});p.accessories.missingAccessories=[{id:'SPEED_RING',name:'Speed Ring',rarity:'UNCOMMON',icon:'/api/item-texture/SPEED_RING'}];
  p.ironpath={hotm:7,counts:{ORE:2},recipes:[{id:'PART',name:'Part',category:'materials',hotm:1,duration:10,ingredients:[{id:'ORE',name:'Ore',count:2}]}],processes:[],sacksAvailable:true};p.recommendations=[];
  const source=Object.fromEntries(['collections','bestiary','accessoryCatalog','accessoryParents','garden','museum','prices','election','identity'].map(x=>[x,{state:'cached',fetchedAt:Date.now()}]));p.availability=buildAvailability(member,raw,{fetchedAt:Date.now(),sources:source});
  const body={profile:p,profiles:[{id:p.id,cuteName:p.cuteName,selected:true}],meta:{phase:'full',fetchedAt:Date.now(),expiresAt:Date.now()+300000,sources:source}};
  const core=structuredClone(body);core.meta.phase='core';core.profile.availability=buildAvailability(member,raw,{core:true,fetchedAt:Date.now()});
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,release;
  try{
    browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.setDefaultTimeout(12000);console.log('Browser launched');page.on('pageerror',error=>errors.push(error.message));
    const delayed=new Promise(r=>release=r);
    await page.route('**/*',async route=>{const url=new URL(route.request().url());
      if(url.hostname!=='127.0.0.1')return route.abort();
      if(url.pathname.startsWith('/api/profile/')){if(url.searchParams.get('view')!=='core')await delayed;return route.fulfill({json:url.searchParams.get('view')==='core'?core:body});}
      if(url.pathname.startsWith('/api/acquisition/'))return route.fulfill({json:{methods:['Crafting'],requirements:'Sugar Cane II',ingredients:[{id:'SUGAR_CANE',name:'Sugar Cane',count:96}],wikiUrl:'https://hypixelskyblock.minecraft.wiki/w/Speed_Ring#Obtaining',wikiSource:'Hypixel SkyBlock community wiki',wikiExcerpt:'Fixture obtaining text.',wikiStatus:'available',fetchedAt:Date.now()}});
      if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#997766"/></svg>'});
      return route.continue();
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/Tester',{waitUntil:'domcontentloaded'});console.log('Page loaded');
    await page.waitForFunction(()=>document.querySelector('#playerName').textContent==='Tester');
    await page.locator('[data-accessory-view="calculator"]').click();await page.locator('[data-module-waiting]').waitFor();
    release();await page.locator('.accessory-plan').waitFor();
    await page.locator('#moduleModal .modal-close').click();
    await page.locator('[data-accessory-view="calculator"]').click();await page.locator('.accessory-plan').waitFor();
    await page.locator('.accessory-plan [data-accessory-tab="missing"]').click();
    await page.locator('[data-plan-accessory="SPEED_RING"]').click();
    await page.locator('[data-acquisition="SPEED_RING"]').click();await page.locator('.acquisition-card').waitFor();
    assert.match(await page.locator('.acquisition-card').innerText(),/Sugar Cane II/);
    await page.locator('.missing-accessory-tools [data-accessory-tab="calculator"]').click();
    assert.match(await page.locator('.accessory-plan h3').innerText(),/102/);
    await page.keyboard.press('Escape');await page.locator('.essential-forge').click();
    await page.locator('#ironpathAdd button').click();await page.locator('#ironpathAdd button').click();
    assert.equal(await page.locator('.ironpath-goal').count(),2);assert.match(await page.locator('.forge-shopping').innerText(),/Ore 2/);
    await page.locator('[data-direction="-1"]:not([disabled])').click();
    await page.keyboard.press('Escape');
    for(const type of ['skills','slayer','dungeons','pets','mining','garden','accessories','essence','museum','crimson','rift','mayor','events','networth','notebook','planner','progress','compare','data','misc','minions','collections']){
      await page.evaluate(type=>openModule(type),type);await page.locator('#moduleTitle').waitFor();assert.notEqual(await page.locator('#moduleTitle').innerText(),'Module unavailable',type);await page.keyboard.press('Escape');
    }
    await page.evaluate(()=>{currentProfile.availability.skills={state:'not_shared',fetchedAt:null};updateDataAvailability();openModule('skills')});
    assert.match(await page.locator('#moduleContent').innerText(),/not exposed|Not exposed/);assert.equal(await page.locator('#skillAverage').innerText(),'\u2014');await page.keyboard.press('Escape');
    await page.evaluate(()=>openModule('data'));
    const backup={version:1,storage:{'skyfolio-notebook-tester':JSON.stringify([{id:123,title:'Imported note',body:'Test backup'}])}};
    await page.locator('#importSkyfolioData').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.locator('#confirmBackupImport').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('skyfolio-notebook-tester')?.includes('Imported note')||false),false);
    await page.locator('#confirmBackupImport').click();await page.waitForFunction(()=>localStorage.getItem('skyfolio-notebook-tester')?.includes('Imported note'));await page.waitForFunction(()=>document.querySelector('#playerName').textContent==='Tester');
    await page.waitForFunction(()=>typeof profileMeta!=='undefined'&&profileMeta?.phase==='full');await page.keyboard.press('Escape');
    await page.locator('[data-accessory-view="missing"]').click();await page.locator('.accessory-option').first().waitFor();
    await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'skyfolio-accessory-review.png'),fullPage:true});await page.keyboard.press('Escape');
    await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('#ironmanBadge').isVisible());
    await page.locator('[data-mobile-action="modules"]').click();await page.locator('#moduleNav [data-module="skills"]').click();await page.locator('#moduleModal.open').waitFor();await page.keyboard.press('Escape');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,'mobile page overflow');
    await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'skyfolio-mobile-review.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('Browser checks passed: progressive loading, accessory shortcuts, item plan, acquisition, shared forge goals, all modules, and mobile navigation.');
  }catch(error){console.error('Browser test failed:',error.message);console.error(await browser.contexts()[0].pages()[0].evaluate(()=>['#confirmBackupImport','#moduleContent','.module-workspace'].map(s=>{const e=document.querySelector(s);return [s,e?.getBoundingClientRect().toJSON(),e&&getComputedStyle(e).transform]})));throw error;}finally{release?.();await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
