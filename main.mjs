#!/bin/env -S bun

import{ls}from'./util.mjs';
import{BDSMGR}from'./bdsmgr.mjs';

// const w=await BDSMGR.init();
// await w.deploy();
// console.log(w);


const
servers_dir='servers/',
svr=await(await ls(servers_dir)).reduce(async(a,x)=>(
	a=await a,
	a[x]=await BDSMGR.init({
		server_dir:servers_dir+x,
		exlog:y=>http.publish(x,y)
	}),
	a
),{}),
http=Bun.serve({
	port:3000,
	routes:{
		'/':(r,s)=>new Response(Bun.file('./assets/index.html')),
		'/list':(r,s)=>new Response(
			// TODO: delete detection
			JSON.stringify(Object.keys(svr)),
			{headers:{'Content-Type':'application/json'}}
		),
		'/svr/:id':(r,s)=>Response.redirect(`./${r.params.id}/`),
		'/svr/:id/':(r,s)=>new Response(Bun.file('./assets/svr.html')),
		'/svr/:id/ws':(r,s)=>(s.upgrade(r,{data:r.params.id}),new Response()),
		'/svr/:id/new':async(r,s,x)=>(
			svr[x=r.params.id]?
			new Response(null,{status:400,statusText:`server "${x} already exists."`}):
			(
				svr[x]=await BDSMGR.init({
					server_dir:servers_dir+x,
					exlog:y=>http.publish(x,y)
				}),
				Response.redirect(`./`)
			)
		),
		'/favicon.ico':(r,s)=>new Response(Bun.file('./assets/favicon.ico'))
	},
	// fetch(r,s){console.log(r,s);return new Response();},
	websocket:{
		open:x=>(
			svr[x.data]?
			x.subscribe(x.data):
			x.close(1011,`server "${x.data}" not found!`)
		),
		message:(x,msg)=>(
			x=svr[x.data],
			msg=msg.trim(),
			x.log(`>> ${msg}\n`),
			(
				'status,deploy,abort,start,pkill,help'.split(',').includes(msg)?
				_=>x[msg]():
				(
					x.proc_bds?
					_=>x.proc_bds.cmd(msg):
					_=>x.log(`Unknown command "${msg}".\n`)
				)
			)()
		)
	}
});
