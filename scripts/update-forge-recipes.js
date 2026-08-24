const fs=require('node:fs');
const path=require('node:path');

const source=process.argv[2];
if(!source)throw new Error('Usage: node scripts/update-forge-recipes.js <NEU items directory>');

function cleanName(value=''){
  return value.replace(/(?:Â)?§[0-9a-fk-or]/gi,'').replace(/[^\x20-\x7e]/g,'').replace('[Lvl {LVL}] ','').trim();
}
function category(id,name){
  if(id.includes(';'))return'pets';
  if(id==='DIVAN_DRILL'||/_(?:DRILL_[1-4])$/.test(id))return'drills';
  if(/ENGINE|FUEL_TANK|OMELETTE|BEJEWELED_(?:HANDLE|COLLAR)|GEMSTONE_CHAMBER|DIAMONITE|HOT_STUFF/.test(id))return'drill_parts';
  if(/DIVAN_(?:HELMET|CHESTPLATE|LEGGINGS|BOOTS)$/.test(id))return'armor';
  if(/NECKLACE|BELT|CLOAK|GAUNTLET|PENDANT|HANDWARMERS|TALISMAN|RING|ARTIFACT|RELIC|TESSERACT/.test(id))return'accessories';
  if(/BEACON|POWER_CRYSTAL/.test(id))return'beacons';
  if(/TRAVEL_SCROLL|SECRET_RAILROAD_PASS|PORTABLE_CAMPFIRE/.test(id))return'travel';
  if(/CHISEL|LANTERN|ROD|KEY/.test(id))return'tools';
  if(/REFINED|PLATE|MIXTURE|MATERIAL|GEM$|AMALGAMATION|CRYSTAL|GEODE|STARFALL|HUSK|PURE_MITHRIL|WILL_O_WISP|POWDER_COATING/.test(id))return'materials';
  return'other';
}

const recipes=[];
for(const file of fs.readdirSync(source)){
  if(!file.endsWith('.json'))continue;
  let item;try{item=JSON.parse(fs.readFileSync(path.join(source,file),'utf8'))}catch{continue}
  for(const recipe of item.recipes||[]){
    if(recipe.type!=='forge')continue;
    const id=recipe.overrideOutputId||item.internalname;
    const name=cleanName(item.displayname)||id;
    const hotm=Number(item.crafttext?.match(/HotM\s*(\d+)/i)?.[1]||0);
    const ingredients={};
    for(const input of recipe.inputs||[]){
      const split=input.lastIndexOf(':'),inputId=input.slice(0,split),count=Number(input.slice(split+1));
      if(inputId&&count>0)ingredients[inputId]=(ingredients[inputId]||0)+count;
    }
    recipes.push({id,name,category:category(id,name),hotm,duration:Number(recipe.duration||0),ingredients});
  }
}
recipes.sort((a,b)=>a.category.localeCompare(b.category)||a.hotm-b.hotm||a.name.localeCompare(b.name));
fs.writeFileSync(path.join(__dirname,'..','src','forge-recipes.generated.json'),JSON.stringify(recipes,null,2)+'\n');
console.log(`Wrote ${recipes.length} Forge recipes.`);
