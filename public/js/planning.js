(function(root){
  function accessoryPlan(base,candidates,selected){
    const groups=new Map();for(const row of candidates){if(!selected.includes(row.id))continue;const old=groups.get(row.family);if(!old||row.mpGain>old.mpGain)groups.set(row.family,row);}
    const rows=[...groups.values()],gain=rows.reduce((sum,x)=>sum+x.mpGain,0);
    return {rows,gain,total:(Number(base)||0)+gain,cost:rows.reduce((sum,x)=>sum+(x.estimatedCost||0),0),unknownCosts:rows.filter(x=>x.estimatedCost===null).length};
  }
  function forgePlans(recipes,counts,goals){
    const byId=new Map(recipes.map(x=>[x.id,x])),pool={...counts},shopping=new Map();
    const plans=goals.map(goal=>{
      const totals=new Map(),missing=new Map();let time=0;
      function use(id,amount,path=[]){
        if(path.includes(id)||path.length>40)throw Error('Circular forge recipe: '+id);
        const owned=Math.min(Math.max(0,Number(pool[id])||0),amount);pool[id]=(Number(pool[id])||0)-owned;
        const left=amount-owned,recipe=byId.get(id);let children=[];
        if(recipe&&left>0){time+=recipe.duration*left;children=recipe.ingredients.map(x=>use(x.id,x.count*left,[...path,id]));}
        if(!recipe){totals.set(id,(totals.get(id)||0)+amount);missing.set(id,(missing.get(id)||0)+left);if(left)shopping.set(id,(shopping.get(id)||0)+left);}
        return {id,name:recipe?.name||id,icon:recipe?.icon,amount,owned,depth:path.length,isRecipe:Boolean(recipe),children,ready:!left||Boolean(children.length&&children.every(x=>x.ready)),surplus:false};
      }
      const tree=use(goal.recipeId,Math.max(1,Number(goal.quantity)||1));
      const materials=[...totals].map(([id,needed])=>({id,name:recipes.flatMap(x=>x.ingredients).find(x=>x.id===id)?.name||id,needed,missing:missing.get(id)||0}));
      const total=materials.reduce((s,x)=>s+x.needed,0),short=materials.reduce((s,x)=>s+x.missing,0);
      return {goalId:goal.id,tree:[tree],materials,time,percent:total?Math.round((total-short)/total*100):100};
    });
    return {plans,shopping:[...shopping].map(([id,missing])=>({id,name:recipes.flatMap(x=>x.ingredients).find(x=>x.id===id)?.name||id,missing})),remaining:pool};
  }
  const api={accessoryPlan,forgePlans};if(typeof module==='object')module.exports=api;else root.SkyfolioPlanning=api;
})(typeof globalThis==='object'?globalThis:this);
