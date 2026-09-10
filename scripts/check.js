const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),vm=require('node:vm');
for(const dir of ['src','public/js','scripts','test'])for(const name of fs.readdirSync(dir)){
  if(!/\.(js|cjs)$/.test(name))continue;
  const result=spawnSync(process.execPath,['--check',path.join(dir,name)],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
const {assetBundle}=require('../src/assets');new vm.Script(assetBundle(path.resolve('public'),'js').content.toString());
console.log('All JavaScript sources and the combined browser bundle pass syntax checks.');
