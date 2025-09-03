#!/bin/env -S bun

import{BDSMGR}from'./bdsmgr.mjs';
import{ls,rm}from'./util.mjs';
// import{}from'node:fs/promises';

const
svr_id=Bun.argv[2];

// svr_id||await Promise.reject('Server ID not specified!');

// const
// log_init=(w={x:''})=>(
// 	((n,x=Bun.file(n))=>(
// 		Bun.write(x,''),
// 		Object.assign(w,{name:n,file:x,writer:x.writer()})
// 	))(`${logd}/${new Date().toISOString()}`),
// 	ls(logd,{abs:1}).then(x=>Promise.all(x.slice(0,-cfg.log.files).map(x=>rm(x)))),
// 	w
// ),
// logf=log_init(),
// log=x=>(
// 	http.publish('log',x),
// 	cfg.log.stdout&&Bun.stdout.write(`\x1b[2K\x1b[0G${x}`),
// 	(!logf.writer||cfg.log.size<logf.file.size)&&log_init(logf),
// 	x=x.split('\n'),
// 	logf.writer.write(x.slice(0,-1).map(x=>x+'\n').join('')),
// 	logf.x=x.at(-1)
// );
const w=await BDSMGR.init();
w.log('hello\nworld!\n');
w.help();
await w.deploy();
console.log(w.cfg);
