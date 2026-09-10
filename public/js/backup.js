(function(root){
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x),finite=x=>typeof x==='number'&&Number.isFinite(x);
  function validateBackup(data){
    if(data?.version!==1||!object(data.storage)||Object.keys(data.storage).length>1000)throw Error('Unsupported or invalid Skyfolio backup');
    for(const [key,value] of Object.entries(data.storage)){
      if(!/^skyfolio-[\w:-]{1,180}$/.test(key)||typeof value!=='string'||value.length>500000)throw Error('Invalid backup record: '+key);
      if(key.startsWith('skyfolio-tab-')){if(!/^[\w-]{1,50}$/.test(value))throw Error('Invalid saved tab');continue;}
      let parsed;try{parsed=JSON.parse(value)}catch{throw Error('Invalid JSON record: '+key)}
      let valid=false;
      if(/^skyfolio-goals(?:-|$)/.test(key))valid=Array.isArray(parsed)&&parsed.every(x=>object(x)&&finite(x.id)&&typeof x.text==='string'&&x.text.length<=500&&typeof x.done==='boolean');
      else if(key.startsWith('skyfolio-notebook-'))valid=Array.isArray(parsed)&&parsed.every(x=>object(x)&&finite(x.id)&&typeof x.title==='string'&&x.title.length<=80&&typeof x.body==='string'&&x.body.length<=20000);
      else if(key.startsWith('skyfolio-ironpath-'))valid=Array.isArray(parsed)&&parsed.every(x=>object(x)&&finite(x.id)&&/^[A-Z0-9_;:-]+$/.test(x.recipeId)&&Number.isInteger(x.quantity)&&x.quantity>=1&&x.quantity<=64);
      else if(key.startsWith('skyfolio-accessory-plan-'))valid=Array.isArray(parsed)&&parsed.every(x=>typeof x==='string'&&/^[A-Za-z0-9_;:-]{1,100}$/.test(x));
      else if(key.startsWith('skyfolio-history-'))valid=Array.isArray(parsed)&&parsed.length<=180&&parsed.every(x=>object(x)&&/^\d{4}-\d{2}-\d{2}$/.test(x.day)&&Object.entries(x).every(([k,v])=>k==='day'||finite(v)));
      else if(key==='skyfolio-widgets')valid=object(parsed)&&Object.values(parsed).every(x=>typeof x==='boolean');
      else if(key==='skyfolio-customization')valid=object(parsed)&&(!parsed.hiddenModules||Array.isArray(parsed.hiddenModules)&&parsed.hiddenModules.every(x=>typeof x==='string'))&&(!parsed.moduleOrder||object(parsed.moduleOrder)&&Object.values(parsed.moduleOrder).every(x=>Array.isArray(x)&&x.every(id=>typeof id==='string')))&&(!parsed.favorites||Array.isArray(parsed.favorites)&&parsed.favorites.every(x=>typeof x==='string'));
      if(!valid)throw Error('Unsupported or malformed record: '+key);
    }
    return data.storage;
  }
  function prepareImport(storage,incoming,mode){
    const output={};for(const [key,value] of Object.entries(incoming)){
      const existing=storage.getItem(key);if(mode==='replace'||existing===null){output[key]=value;continue;}
      try{const a=JSON.parse(existing),b=JSON.parse(value);if(Array.isArray(a)&&Array.isArray(b)){const seen=new Set(a.map(x=>typeof x==='object'?x.id??x.day: x));output[key]=JSON.stringify([...a,...b.filter(x=>!seen.has(typeof x==='object'?x.id??x.day:x))].slice(key.startsWith('skyfolio-history-')?-180:0));}else output[key]=existing;}catch{output[key]=existing;}
    }
    return output;
  }
  function applyImport(storage,records){
    const before=Object.fromEntries(Object.keys(records).map(key=>[key,storage.getItem(key)]));
    try{for(const [key,value] of Object.entries(records))storage.setItem(key,value);}catch(error){
      try{for(const key of Object.keys(records))storage.removeItem(key);for(const [key,value] of Object.entries(before))if(value!==null)storage.setItem(key,value);}catch{throw Error('Import failed and could not be fully restored. Keep your backup and free browser storage.');}
      throw Error('Import failed; previous data was restored. '+error.message);
    }
    return before;
  }
  const api={validateBackup,prepareImport,applyImport};if(typeof module==='object')module.exports=api;else root.SkyfolioBackup=api;
})(globalThis);
