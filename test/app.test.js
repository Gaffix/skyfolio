const test=require('node:test');
const assert=require('node:assert/strict');
const {createServer,buildRecommendations}=require('../src/app');

test('recommendations are bounded, explainable, and sorted by progress',()=>{
  const profile={skills:{mining:20,farming:10},catacombs:12.5,minions:{uniqueCrafts:45,slots:8,nextSlot:50,nextSlotRemaining:5},collections:{categories:[{items:[{id:'WHEAT',name:'Wheat',amount:900,completed:2,totalTiers:5,nextAmount:1000,percent:90}]}]},accessories:{missingUpgrades:[{id:'RING',name:'Ring',from:'Talisman'}]}};
  const rows=buildRecommendations(profile,{}, {RING:1000});
  assert.ok(rows.length<=8);assert.equal(rows[0].progress,96);assert.ok(rows.every(x=>x.id&&x.title&&x.reason&&x.module));assert.equal(rows.find(x=>x.category==='accessories').estimatedCost,1000);
});

test('server supports deep links, security headers, HEAD, and method rejection',async t=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
  for(const route of ['/Player/skills','/Player/planner','/Player/progress','/Player/compare/Other','/Player/data']){const response=await fetch(base+route);assert.equal(response.status,200,route);assert.match(response.headers.get('content-type'),/text\/html/)}
  const head=await fetch(base+'/Player/skills',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('x-content-type-options'),'nosniff');assert.ok(head.headers.get('content-security-policy'));
  const rejected=await fetch(base+'/api/health',{method:'POST'});assert.equal(rejected.status,405);assert.equal(rejected.headers.get('allow'),'GET, HEAD');
});


test('missing accessories compare the catalog against all accessible storage',()=>{
  const {accessoryStats}=require('../src/items');
  const item=id=>({id,name:id,lore:['COMMON ACCESSORY'],rarity:'COMMON'});
  const storage={bags:[{id:'talisman_bag',items:[item('OWNED'),item('OWNED')]}],inventory:[],enderChest:[item('STORED')],personalVault:[],backpacks:[]};
  const resources={parents:{},catalog:[{id:'OWNED',name:'Owned',tier:'COMMON'},{id:'STORED',name:'Stored',tier:'RARE'},{id:'MISSING',name:'Missing',tier:'EPIC'}]};
  const result=accessoryStats({inventory:{bag_contents:{}},accessory_bag_storage:{}},storage,resources);
  assert.deepEqual(result.missingAccessories.map(x=>x.id),['MISSING']);
  assert.equal(result.duplicates[0].count,2);
  assert.equal(result.catalogAvailable,true);
  assert.equal(result.inventoryAvailable,true);
  const unavailable=accessoryStats({},storage,{parents:{},catalog:null});
  assert.equal(unavailable.catalogAvailable,false);assert.equal(unavailable.inventoryAvailable,false);
});

test('MP planner adds unique accessories and only the difference for upgrades',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require('node:path').join(__dirname,'../public/js/profile-progress.js'),'utf8');
  const context={};vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('const accessoryPowerValues='),source.indexOf('function renderMagicalPowerCalculator()')),context);
  assert.equal(context.calculateAccessoryPowerPlan(500,{COMMON:2,EPIC:1}),518);
  assert.equal(context.calculateAccessoryPowerPlan(500,{}, {from:'LEGENDARY',to:'MYTHIC',count:3}),518);
  assert.equal(context.calculateAccessoryPowerPlan(500,{COMMON:-1,RARE:'invalid'},{from:'MYTHIC',to:'COMMON',count:2}),500);
});
