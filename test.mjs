#!/bin/env -S bun
const

w=await Bun.udpSocket({socket:{data:async(sock,x,port,addr)=>(
	console.log(`${
		[...x.slice(9,17)].map(x=>x.toString(2).padStart(8,0)).join('')
	}\n${
		BigInt(new TextDecoder().decode(x.slice(35)).split(';')[6]).toString(2)
	}\n`)
	
)}});


w.send(new Uint8Array([
  1, 0, 0, 0, 0, 0, 0, 0, 23, 0, 255, 255, 0, 254, 254, 254, 254, 253, 253, 253,
  253, 18, 52, 86, 120, 190, 42, 176, 5, 41, 146, 180, 231
]),19132,'127.0.0.1')
