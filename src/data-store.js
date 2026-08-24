const fs=require('node:fs');const path=require('node:path');const{projectRoot}=require('./config');const dataRoot=path.join(projectRoot,'data');
function readJson(name){try{return JSON.parse(fs.readFileSync(path.join(dataRoot,name),'utf8'))}catch{return{}}}
function writeJson(name,data){fs.mkdirSync(dataRoot,{recursive:true});const file=path.join(dataRoot,name),temp=`${file}.tmp`;fs.writeFileSync(temp,JSON.stringify(data,null,2));fs.renameSync(temp,file)}
module.exports={readGoals:()=>readJson('goals.json'),writeGoals:data=>writeJson('goals.json',data),readNotebook:()=>readJson('notebook.json'),writeNotebook:data=>writeJson('notebook.json',data)};
