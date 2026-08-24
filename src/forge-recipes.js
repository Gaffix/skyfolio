const recipes=require('./forge-recipes.generated.json');
const recipeById=Object.fromEntries(recipes.map(recipe=>[recipe.id,recipe]));
function itemName(id){return recipeById[id]?.name||String(id).toLowerCase().split('_').map(x=>x[0]?.toUpperCase()+x.slice(1)).join(' ')}
module.exports={recipes,recipeById,itemName};
