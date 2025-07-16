#!/bin/bun

const
guid=[...Array(8)].map(_=>Math.random()*256|0),
a2hs=w=>w.map(x=>x.toString(16).padStart(2,0)),
te=new TextEncoder(),td=new TextDecoder(),
sock=await Bun.udpSocket({
	port:19132,
	socket:{
		data:(sock,x,port,addr)=>(
			console.log(`${addr}:${port}`),
			x=[...x],
			x.str=a2hs(x).join(''),
			x[0]==1&&x.str.slice(9*2,25*2)=='00ffff00fefefefefdfdfdfd12345678'?(
				x.t=x.slice(1,9),
				x.guid=x.slice(25,33),
				x.pong='MCPE;BunJS;819;1.21.93;0;10;12769473781643994834;Hello from BunJS!;Survival;1;19132;19133;0;',
				sock.send(new Uint8Array([
					0x1c,...x.t,...guid,
					0,255,255,0,254,254,254,254,253,253,253,253,0x12,0x34,0x56,0x78,
					...(l=>[l>>>8&255,l&255])(x.pong.length),...te.encode(x.pong)
				]),port,addr)
			):console.log(a2hs(x).join(' '),x.length),
			1
			
		)
	},
});

// console.log(guid.map(x=>x.toString(16)))
// sock.send(new Uint8Array([
// 	1,
// 	0,0,0,0,0,0,0,255,
// 	0,255,255,0,254,254,254,254,253,253,253,253,0x12,0x34,0x56,0x78,
// 	...guid
// ]),19132,'0.0.0.0')
