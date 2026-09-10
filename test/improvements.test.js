const test=require('node:test'),assert=require('node:assert/strict');
const {ResourceCache}=require('../src/resource-cache');
const {buildAvailability}=require('../src/data-availability');
const {buildAccessoryPlanner}=require('../src/accessory-planner');
const {accessoryPlan,forgePlans}=require('../public/js/planning');
const {validateBackup,prepareImport,applyImport}=require('../public/js/backup');
const {recipeDetails}=require('../src/acquisition');

test('resource cache shares requests, preserves stale values and retries failures',async()=>{
  let now=1000,calls=0,release;const cache=new ResourceCache({now:()=>now,retryMs:50});
  const loader=()=>{calls++;return new Promise(resolve=>release=resolve)};
  const a=cache.get('x',100,loader),b=cache.get('x',100,loader);await Promise.resolve();release(7);
  assert.deepEqual(await Promise.all([a,b]),[7,7]);assert.equal(calls,1);
  now+=200;assert.equal(await cache.get('x',100,()=>{throw Error('offline')}),7);assert.equal(cache.status('x').state,'stale');
  now+=51;assert.equal(await cache.get('x',100,()=>8),8);assert.equal(cache.status('x').error,null);
  await assert.rejects(cache.get('empty',100,()=>{throw Error('offline')}));now+=51;
  assert.equal(await cache.get('empty',100,()=>9),9);
});
test('availability distinguishes absent API data, loading resources, stale data and exposed zeroes',()=>{
  const a=buildAvailability({inventory:{bag_contents:{}},player_data:{experience:{}},collection:{}},{banking:{balance:0}},{core:true,fetchedAt:1000});
  assert.equal(a.inventory.state,'cached');assert.equal(a.bank.state,'cached');assert.equal(a.collections.state,'loading');
  const b=buildAvailability({}, {},{stale:true,fetchedAt:1000});assert.equal(b.inventory.state,'not_shared');assert.equal(b.skills.state,'not_shared');assert.equal(b.profile.state,'stale');
});
test('accessory candidates suppress lower owned tiers and use recombobulated baseline',()=>{
  const catalog=[{id:'TALISMAN',name:'Talisman',tier:'COMMON'},{id:'RING',name:'Ring',tier:'UNCOMMON'},{id:'ARTIFACT',name:'Artifact',tier:'RARE'}],parents={ARTIFACT:['RING','TALISMAN']};
  const a={active:[{id:'RING',name:'Ring',rarity:'RARE',recombobulated:true}],inactive:[]};
  const result=buildAccessoryPlanner(a,{catalog,parents},{},{ARTIFACT:100});
  assert.equal(result.candidates.length,0);
  a.active[0].rarity='UNCOMMON';a.active[0].recombobulated=false;
  const rows=buildAccessoryPlanner(a,{catalog,parents},{},{ARTIFACT:300}).candidates;
  assert.equal(rows.find(x=>x.id==='ARTIFACT').mpGain,3);assert.ok(!rows.some(x=>x.id==='TALISMAN'));
  const chosen=accessoryPlan(100,rows,rows.map(x=>x.id));assert.equal(chosen.gain,3);assert.equal(chosen.rows.length,1);
  assert.ok(buildAccessoryPlanner(a,{catalog,parents},{},{ARTIFACT:300},true).candidates.every(x=>x.estimatedCost===null));
});
test('forge priorities share inventory including intermediate items without double allocation',()=>{
  const recipes=[{id:'PART',name:'Part',duration:10,ingredients:[{id:'ORE',name:'Ore',count:2}]},{id:'DRILL',name:'Drill',duration:20,ingredients:[{id:'PART',count:2}]}];
  const result=forgePlans(recipes,{PART:1,ORE:2},[{id:1,recipeId:'DRILL',quantity:1},{id:2,recipeId:'PART',quantity:1}]);
  assert.equal(result.plans[0].percent,100);assert.equal(result.plans[1].percent,0);assert.equal(result.shopping[0].missing,2);assert.equal(result.plans[0].time,30);
  assert.throws(()=>forgePlans([{id:'LOOP',duration:1,ingredients:[{id:'LOOP',count:1}]}],{},[{id:1,recipeId:'LOOP',quantity:1}]),/Circular/);
});
test('backup validation rejects unsafe IDs; import merges and rolls back partial failures',()=>{
  assert.throws(()=>validateBackup({version:1,storage:{'skyfolio-notebook-test':JSON.stringify([{id:'" onclick="bad',title:'x',body:''}])}}));
  const key='skyfolio-goals-test',old=JSON.stringify([{id:1,text:'Old',done:false}]),fresh=JSON.stringify([{id:2,text:'New',done:false}]);
  const values=new Map([[key,old]]),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const records=validateBackup({version:1,storage:{[key]:fresh}});assert.equal(JSON.parse(prepareImport(storage,records,'merge')[key]).length,2);
  storage.setItem=(k,v)=>{if(k==='skyfolio-widgets')throw Error('quota');values.set(k,v)};
  assert.throws(()=>applyImport(storage,{[key]:fresh,'skyfolio-widgets':'{}'}),/restored/);assert.equal(values.get(key),old);
});
test('obtaining methods use structured recipe data rather than guessed descriptions',()=>{
  const result=recipeDetails({crafttext:'§7Requires: Sugar Cane II',recipe:{A1:'SUGAR_CANE:12',A2:'SUGAR_CANE:12'},recipes:[{type:'npc_shop'}]});
  assert.deepEqual(result.methods,['Crafting','NPC shop']);assert.equal(result.ingredients[0].count,24);assert.equal(result.requirements,'Requires: Sugar Cane II');
});

test('HTTP assets revalidate, failed textures retry, and core profile requests share upstream work',async t=>{
  process.env.HYPIXEL_API_KEY='fixture-key';
  const {createServer}=require('../src/app'),server=createServer(),nativeFetch=global.fetch;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{global.fetch=nativeFetch;await new Promise(resolve=>server.close(resolve));});
  let textures=0,profiles=0,unexpected=0;
  global.fetch=async url=>{
    if(url.includes('sky.shiiyu.moe/api/item/')){textures++;return textures===1?new Response('',{status:404}):new Response(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=','base64'));}
    if(url.includes('minecraft/profile/lookup')||url.includes('mojang.com/users/profiles'))return Response.json({id:'0123456789abcdef0123456789abcdef',name:'CacheTest'});
    if(url.includes('/skyblock/profiles?')){profiles++;await new Promise(r=>setTimeout(r,20));return Response.json({success:true,profiles:[{profile_id:'fixture',selected:true,members:{'0123456789abcdef0123456789abcdef':{}}}]});}
    unexpected++;return new Response('',{status:404});
  };
  const css=await nativeFetch(base+'/assets/site.css');assert.equal(css.status,200);assert.ok(css.headers.get('etag'));assert.equal((await nativeFetch(base+'/assets/site.css',{headers:{'If-None-Match':css.headers.get('etag')}})).status,304);
  const id='SKYFOLIO_TEST_'+Date.now(),first=await nativeFetch(base+'/api/item-texture/'+id);assert.equal(first.headers.get('cache-control'),'no-store');await first.text();
  const second=await nativeFetch(base+'/api/item-texture/'+id);assert.match(second.headers.get('content-type'),/image\/png/);await second.arrayBuffer();assert.equal(textures,2);
  // Remove only the cache artifact created by this test.
  const fs=require('node:fs'),path=require('node:path');await fs.promises.unlink(path.join(require('../src/config').textureCacheRoot,id+'.png'));
  const results=await Promise.all([nativeFetch(base+'/api/profile/CacheTest?view=core'),nativeFetch(base+'/api/profile/CacheTest?view=core')]);
  for(const response of results){assert.equal(response.status,200);const body=await response.json();assert.equal(body.meta.phase,'core');assert.equal(body.profile.availability.inventory.state,'not_shared');}
  assert.equal(profiles,1);assert.equal(unexpected,0,'Core rendering must not request secondary services');
});
