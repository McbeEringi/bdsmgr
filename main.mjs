#!/bin/env -S bun

import{cmd}from'./cmd.mjs';
import{ls,rm}from'./util.mjs';
// import{}from'node:fs/promises';

const
svr_id=Bun.argv[2],
dld=`downloads`,
svrsd=`servers`,
svrd=`${svrsd}/${svr_id}`,
bind=`${svrd}/bin`,
libd=`${svrd}/lib`,
logd=`${svrd}/log`;

svr_id||await Promise.reject('Server ID not specified!');

let abort=new AbortController();
const
port_pool=[...Array(10)].map((_,i)=>({
	http:3000+i,
	mcbe_ipv4:19200+i*2,
	mcbe_ipv6:19201+i*2
})),
cfg=await(async(n,w=Bun.file(`${svrd}/${n}`))=>(
	await w.exists()?await w.json():await(async x=>(
		x=[...await(await ls(svrsd,{abs:1}).catch(_=>[])).reduce(async(a,x)=>(
			x=Bun.file(`${x}/${n}`),
			await x.exists()&&(await a).delete((await x.json())?.port_pool_index),
			a
		),new Set(Object.keys(port_pool).map(x=>+x)))],
		await Bun.write(w.name,JSON.stringify(x={
			port_pool_index:x[0],
			log:{
				stdout:false,
				files:5,
				size:1024*128
			},
			lib:[
				'worlds/',
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

log_init=(w={x:''})=>(
	((n,x=Bun.file(n))=>(
		Bun.write(x,''),
		Object.assign(w,{name:n,file:x,writer:x.writer()})
	))(`${logd}/${new Date().toISOString()}`),
	ls(logd,{abs:1}).then(x=>Promise.all(x.slice(0,-cfg.log.files).map(x=>rm(x)))),
	w
),
logf=log_init(),
log=x=>(
	http.publish('log',x),
	cfg.log.stdout&&Bun.stdout.write(`\x1b[2K\x1b[0G${x}`),
	(!logf.writer||cfg.log.size<logf.file.size)&&log_init(logf),
	x=x.split('\n'),
	logf.writer.write(x.slice(0,-1).map(x=>x+'\n').join('')),
	logf.x=x.at(-1)
),

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
		open:async x=>(x.send(await Bun.file(logf.name).text()+logf.x),x.subscribe('log')),
		message:(x,msg)=>(
			log(`> ${msg.trim()}\n`),
			msg=msg.trim().split(/\s+/),
			(
				({
					abort:({log})=>(abort.abort(),abort=new AbortController(),log(`Abort requested.\n`)),
					...cmd
				})[msg[0]]??(({log})=>log(`Unknown command "${msg}"\n`))
			)({
				log,arg:msg.slice(1),signal:abort.signal,
				dld,svrd,bind,libd,cfg
			})
		),
		close:x=>x.unsubscribe('log')
	}
});

console.log(port_pool[cfg.port_pool_index]);
console.log(`wscat -c ws://localhost:${port_pool[cfg.port_pool_index].http}/ws -H 'Cookie:Authorization=${
	(([u,p])=>encodeURIComponent(`Basic ${btoa(`${u}:${p}`)}`))(Object.entries(cfg.auth)[0])
}'`)
