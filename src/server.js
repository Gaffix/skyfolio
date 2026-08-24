const{port}=require('./config');const{createServer}=require('./app');
createServer().listen(port,()=>console.log(`Skyfolio running at http://localhost:${port}`));
