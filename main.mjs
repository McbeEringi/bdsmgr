#!/bin/env -S bun

import{BDSMGR}from'./bdsmgr.mjs';

const w=await BDSMGR.init({server_id:void 0});
await w.deploy();
console.log(w)

//
// const
// http=Bun.serve({
// 	port:3000,
// 	routes:{
// 		'/a/ws':(r,s)=>(console.log(r),s.upgrade(r,{data:new URL(r.url).pathname}),new Response()),
// 		'/b/ws':(r,s)=>(s.upgrade(r),new Response()),
// 		'/favicon.ico':(r,s)=>new Response(Bun.file('./assets/favicon.ico'))
// 	},
// 	fetch(r,s){console.log(r,s);return new Response();},
// 	websocket:{
// 		open:x=>console.log(x),
// 		message:(x,msg)=>console.log(x,msg)
// 	}
// });
