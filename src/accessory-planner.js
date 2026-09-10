const POWER={COMMON:3,UNCOMMON:5,RARE:8,EPIC:12,LEGENDARY:16,MYTHIC:22,DIVINE:28,SPECIAL:3,'VERY SPECIAL':5};
const TIERS=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC','DIVINE'];
function families(catalog,parents){
  const ids=new Set(catalog.map(x=>x.id)),links=new Map(),rank=new Map();
  const root=id=>{let r=id;while(links.has(r)&&links.get(r)!==r)r=links.get(r);return r};
  for(const [higher,lower] of Object.entries(parents||{})){
    if(!ids.has(higher)||!Array.isArray(lower))continue;
    const group=[higher,...lower.filter(id=>ids.has(id))];
    for(const [index,id] of group.entries()){links.set(root(id),root(higher));rank.set(id,Math.max(rank.get(id)||0,group.length-index));}
  }
  return {family:id=>root(id),rank:id=>rank.get(id)||0};
}
function buildAccessoryPlanner(accessories,resources={},bazaar={},lowestBin={},ironman=false){
  const catalog=resources.catalog||[],byId=new Map(catalog.map(x=>[x.id,x])),f=families(catalog,resources.parents);
  const power=(id,rarity)=>(POWER[String(rarity).toUpperCase()]||0)*(id==='HEGEMONY_ARTIFACT'?2:1);
  const active=accessories.active||[],owned=[...active,...(accessories.inactive||[])],ownedIds=new Set(owned.map(x=>x.id)),ownedBest=new Map(),activeBest=new Map();
  for(const item of owned){const family=f.family(item.id),old=ownedBest.get(family);if(!old||f.rank(item.id)>f.rank(old.id)||(f.rank(item.id)===f.rank(old.id)&&power(item.id,item.rarity)>power(old.id,old.rarity)))ownedBest.set(family,item)}
  for(const item of active){const family=f.family(item.id),old=activeBest.get(family);if(!old||power(item.id,item.rarity)>power(old.id,old.rarity))activeBest.set(family,item)}
  const price=id=>{const value=Number(lowestBin[id]||bazaar[id]?.quick_status?.buyPrice);return Number.isFinite(value)&&value>0?Math.round(value):null};
  const rows=[];
  for(const item of catalog){
    if(!POWER[item.tier]||item.rift_transferrable===false||item.id.startsWith('RIFT_'))continue;
    const family=f.family(item.id),best=ownedBest.get(family),bag=activeBest.get(family),isOwned=ownedIds.has(item.id);
    if(best&&f.rank(best.id)>f.rank(item.id))continue;
    const target=isOwned?owned.find(x=>x.id===item.id):null,targetPower=power(item.id,target?.rarity||item.tier),basePower=bag?power(bag.id,bag.rarity):0,gain=targetPower-basePower;
    if(gain<=0)continue;
    const estimatedCost=isOwned?0:ironman||item.soulbound?null:price(item.id);
    rows.push({id:item.id,itemId:item.id,name:item.name||item.id,rarity:target?.rarity||item.tier,family,basePower,targetPower,mpGain:gain,estimatedCost,coinsPerMp:estimatedCost===null?null:Math.round(estimatedCost/gain),kind:isOwned?'activate':best?'upgrade':'new',from:best?.name||null,icon:'/api/item-texture/'+encodeURIComponent(item.id),wikiUrl:'https://hypixelskyblock.minecraft.wiki/w/'+encodeURIComponent((item.name||item.id).replaceAll(' ','_'))+'#Obtaining'});
  }
  const excluded=/VOTER|RIFT_PRISM|RUNEBOOK|PANDORA|SAFETY_BADGE|BOOK_OF_PROGRESSION/;
  for(const [family,item] of activeBest){
    const tier=TIERS.indexOf(item.rarity),next=TIERS[tier+1];if(item.recombobulated||excluded.test(item.id)||tier<0||!next||!byId.has(item.id))continue;
    const basePower=power(item.id,item.rarity),targetPower=power(item.id,next),estimatedCost=ironman?null:price('RECOMBOBULATOR_3000');
    rows.push({id:'recomb:'+item.id,itemId:item.id,name:item.name,rarity:next,family,basePower,targetPower,mpGain:targetPower-basePower,estimatedCost,coinsPerMp:estimatedCost===null?null:Math.round(estimatedCost/(targetPower-basePower)),kind:'recomb',icon:item.icon,wikiUrl:'https://hypixelskyblock.minecraft.wiki/w/Recombobulator_3000'});
  }
  return {candidates:rows.sort((a,b)=>(a.coinsPerMp??Infinity)-(b.coinsPerMp??Infinity)||b.mpGain-a.mpGain||a.name.localeCompare(b.name)),ironman,estimated:true};
}
module.exports={buildAccessoryPlanner,families,POWER};
