#!/bin/bun

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
