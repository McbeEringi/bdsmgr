#!/bin/bun
import cfg from'./config.mjs';
import { exists, readdir } from'node:fs/promises';

let i=0;
const
magick=w=>w.slice(0,16).map(x=>x.toString(16).padStart(2,0)).join('')=='00ffff00fefefefefdfdfdfd12345678'

await Bun.udpSocket({
	port:19132,
	socket:{
		data:async(sock,x,port,addr)=>(
			console.log(`${addr}:${port}`),
			x[0]==1&&magick([...x].slice(9))&&(s=>sock.send(new Uint8Array([
				0x1c,...[...x].slice(1,9),...[...Array(8)].map(_=>Math.random()*256|0),
				0,255,255,0,254,254,254,254,253,253,253,253,0x12,0x34,0x56,0x78,
				...(l=>[l>>>8&255,l&255])(s.length),...new TextEncoder().encode(s)
			]),port,addr))(`MCPE;BunJS;;;${(d=>[d.slice(0,6),d.slice(6,12)].join(';'))(new Date().toISOString().replace(/\D/g,''))};;Hello from BunJS!;survival;`)
		)
	},
});

const
auth=({cookies:c,headers:h})=>((w,a='Authorization')=>(
	w.includes(c.get(a))?(c.set({name:a,value:c.get(a),maxAge:3600}),null):
	w.includes(h.get(a))?(c.set({name:a,value:h.get(a),maxAge:3600}),new Response(null,{headers:{Refresh:0}})):
	new Response(null,{status:401,headers:{'WWW-Authenticate':'Basic realm="main"'}})
))(Object.entries(cfg.auth).map(([u,p])=>`Basic ${btoa(`${u}:${p}`)}`))



Bun.serve({
	routes:{
		'/':r=>auth(r)||new Response(Math.random())
	}

});

console.log(
await exists(cfg.dir.dl)&&(await readdir(cfg.dir.dl)).map(x=>({x,v:(x.match(/\d+/g)??[]).map(x=>+x)})).sort(({v:a},{v:b})=>a.length&&b.length?(a.reduce((a,x,i)=>a||Math.sign((b[i]||0)-x),0)):!a.length)
);
