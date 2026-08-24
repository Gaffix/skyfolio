const recipes = [
  {id:'REFINED_MITHRIL',name:'Refined Mithril',category:'materials',hotm:2,duration:6*3600,ingredients:{ENCHANTED_MITHRIL:160}},
  {id:'REFINED_TITANIUM',name:'Refined Titanium',category:'materials',hotm:2,duration:12*3600,ingredients:{ENCHANTED_TITANIUM:16}},
  {id:'REFINED_DIAMOND',name:'Refined Diamond',category:'materials',hotm:2,duration:8*3600,ingredients:{ENCHANTED_DIAMOND_BLOCK:2}},
  {id:'FUEL_CANISTER',name:'Fuel Canister',category:'fuel_tanks',hotm:2,duration:10*3600,ingredients:{ENCHANTED_COAL_BLOCK:2}},
  {id:'BEJEWELED_HANDLE',name:'Bejeweled Handle',category:'components',hotm:2,duration:30*60,ingredients:{GLACITE_JEWEL:3}},
  {id:'GOLDEN_PLATE',name:'Golden Plate',category:'materials',hotm:3,duration:6*3600,ingredients:{REFINED_DIAMOND:1,ENCHANTED_GOLD_BLOCK:2,GLACITE_JEWEL:5}},
  {id:'DRILL_ENGINE',name:'Drill Motor',category:'drill_parts',hotm:3,duration:30*3600,ingredients:{ENCHANTED_IRON_BLOCK:1,ENCHANTED_REDSTONE_BLOCK:3,GOLDEN_PLATE:1,TREASURITE:10}},
  {id:'MITHRIL_PLATE',name:'Mithril Plate',category:'materials',hotm:3,duration:18*3600,ingredients:{REFINED_MITHRIL:5,GOLDEN_PLATE:1,ENCHANTED_IRON_BLOCK:1,REFINED_TITANIUM:1}},
  {id:'GEMSTONE_MIXTURE',name:'Gemstone Mixture',category:'materials',hotm:4,duration:4*3600,ingredients:{FINE_RUBY_GEM:4,FINE_SAPPHIRE_GEM:4,FINE_AMBER_GEM:4,FINE_AMETHYST_GEM:4,FINE_JADE_GEM:4,SLUDGE_JUICE:320}},
  {id:'MITHRIL_FUEL_TANK',name:'Mithril-Infused Fuel Tank',category:'fuel_tanks',hotm:3,duration:10*3600,ingredients:{MITHRIL_PLATE:5,FUEL_CANISTER:1}},
  {id:'MITHRIL_DRILL_ENGINE',name:'Mithril-Infused Drill Engine',category:'drill_parts',hotm:3,duration:15*3600,ingredients:{MITHRIL_PLATE:5,DRILL_ENGINE:1}},
  {id:'DIVAN_HELMET',name:"Divan's Helmet",category:'armor',hotm:6,duration:23*3600,ingredients:{GEMSTONE_MIXTURE:5,DIVAN_FRAGMENT:5}},
  {id:'DIVAN_CHESTPLATE',name:"Divan's Chestplate",category:'armor',hotm:6,duration:23*3600,ingredients:{GEMSTONE_MIXTURE:5,DIVAN_FRAGMENT:5}},
  {id:'DIVAN_LEGGINGS',name:"Divan's Leggings",category:'armor',hotm:6,duration:23*3600,ingredients:{GEMSTONE_MIXTURE:5,DIVAN_FRAGMENT:5}},
  {id:'DIVAN_BOOTS',name:"Divan's Boots",category:'armor',hotm:6,duration:23*3600,ingredients:{GEMSTONE_MIXTURE:5,DIVAN_FRAGMENT:5}}
];

const recipeById=Object.fromEntries(recipes.map(recipe=>[recipe.id,recipe]));
const itemNames={
  ENCHANTED_MITHRIL:'Enchanted Mithril',ENCHANTED_TITANIUM:'Enchanted Titanium',ENCHANTED_DIAMOND_BLOCK:'Enchanted Diamond Block',
  ENCHANTED_COAL_BLOCK:'Enchanted Coal Block',GLACITE_JEWEL:'Glacite Jewel',ENCHANTED_GOLD_BLOCK:'Enchanted Gold Block',
  ENCHANTED_IRON_BLOCK:'Enchanted Iron Block',ENCHANTED_REDSTONE_BLOCK:'Enchanted Redstone Block',TREASURITE:'Treasurite',
  FINE_RUBY_GEM:'Fine Ruby Gemstone',FINE_SAPPHIRE_GEM:'Fine Sapphire Gemstone',FINE_AMBER_GEM:'Fine Amber Gemstone',
  FINE_AMETHYST_GEM:'Fine Amethyst Gemstone',FINE_JADE_GEM:'Fine Jade Gemstone',SLUDGE_JUICE:'Sludge Juice',DIVAN_FRAGMENT:'Divan Fragment'
};
function itemName(id){return recipeById[id]?.name||itemNames[id]||id.toLowerCase().split('_').map(x=>x[0].toUpperCase()+x.slice(1)).join(' ')}

module.exports={recipes,recipeById,itemName};
