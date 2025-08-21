#!/bin/env -S bun

import{cmd}from'./cmd.mjs';
// import{}from'node:fs/promises';
Bun.$.throws(0);

const
svr_id=Bun.argv[2],
dld=`downloads`,
svrsd=`servers`,
svrd=`${svrsd}/${svr_id}`,
bind=`${svrd}/bin`,
libd=`${svrd}/lib`;

svr_id||await Promise.reject('Server ID not specified!');

// let abort=new AbortController();
const
port_pool=[...Array(10)].map((_,i)=>({
	http:3000+i,
	mcbe_ipv4:19200+i*2,
	mcbe_ipv6:19201+i*2
})),
ls=async x=>(await Bun.$`ls ${x}`.text()).match(/.+?(?=\n)/g)??[],
rm=async x=>(await Bun.$`rm -r ${x}`.quiet()).exitCode,
vsort=w=>w.map(x=>Object.assign(x,{v:(x.match(/\d+/g)??[]).map(x=>+x)}))
	.sort(({v:a},{v:b})=>a.length&&b.length?(a.reduce((a,x,i)=>a||Math.sign((b[i]??0)-x),0)):!a.length),
cfg=await(async(n,w=Bun.file(`${svrd}/${n}`))=>(
	await w.exists()?await w.json():await(async x=>(
		x=[...await(await ls(svrsd)).reduce(async(a,x)=>(
			x=Bun.file(`${svrsd}/${x}/${n}`),
			await x.exists()&&(await a).delete((await x.json())?.port_pool_index),
			a
		),new Set(Object.keys(port_pool).map(x=>+x)))],
		await Bun.write(w.name,JSON.stringify(x={
			port_pool_index:x[0],
			lib:[
				'worlds',
				'allowlist.json',
				'permissions.json',
				'server.properties'
			],
			auth:{
				admin:'admin'
			},
			webhook:[]
		},0,'\t')),x
	))()
))('config.json'),


auth=({cookies:c,headers:h})=>((w,a='Authorization')=>(
	w.includes(c.get(a))?(c.set({name:a,value:c.get(a),maxAge:3600}),null):
	w.includes(h.get(a))?(c.set(a,h.get(a)),new Response(null,{headers:{Refresh:0}})):
	new Response(null,{status:401,headers:{'WWW-Authenticate':'Basic realm="main"'}})
))(Object.entries(cfg.auth).map(([u,p])=>`Basic ${btoa(`${u}:${p}`)}`)),
http=Bun.serve({
	port:port_pool[cfg.port_pool_index].http,
	routes:{
		'/':r=>auth(r)||new Response(Bun.file('./assets/index.html')),
		'/ws':(r,s)=>auth(r)||(s.upgrade(r),new Response()),
		'/favicon.ico':(r,s)=>new Response(Bun.file('./assets/favicon.ico'))
	},
	websocket:{
		open:x=>console.log('open'),
		message:(x,msg)=>(
			msg=msg.trim().split(/\s+/),
			(cmd[msg[0]]??(({log})=>log(`Unknown command "${msg}"\n`)))({
				log:x=>Bun.stdout.write(`\x1b[2K\x1b[0G${x}`),
				dld,bind,libd,
				// signal:abort.signal,
				cfg,ls,rm,vsort,arg:msg.slice(1)
			})
		),
		close:x=>console.log('closed')
	}
});

console.log(port_pool[cfg.port_pool_index]);
