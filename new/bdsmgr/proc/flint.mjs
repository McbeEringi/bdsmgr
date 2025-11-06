import{ProcManager}from'./main';

export class FlintProc{
	constructor(mgr){
		if(!(mgr instanceof ProcManager))throw'mgr?';
		Object.assign(this,{mgr});
		this.event.addEventListener('ping',(
			{detail:{sock,id,port,addr}},
			s=`MCPE;${
				this.mgr.prop?.server_name??'bdsmgr'
			};;;0;${
				this.mgr.prop?.max_players??0
			};${this.guid};${
				this.mgr.prop?.level_name??'UNINITIALIZED!'
			};${
				this.mgr.prop?.gamemode
			};`
		)=>(
			sock.send(new Uint8Array([0x1c,...x,...this.guid,...this.magick,...(l=>[l>>>8&255,l&255])(s.length),...this.te.encode(s)]),port,addr),
			this.mgr.event.dispatchEvent(new CustomEvent('flint:ping',{detail:{
				is_local:this.is_local(addr),
				addr
			}}))
		));
		this.event.addEventListener('req_open',({detail:{l,addr}})=>(
			this.mgr.event.dispatchEvent(new CustomEvent('flint:req_open',{detail:{
				l,
				addr
			}}))
			// (await BDSProc.init()).softStop({after:10*1e3})
		));
		return this;
	}

	mgr=null;
	proc=null;
	event=new EventTarget();
	te=new TextEncoder();

	guid=(w=>Object.assign(
		w.reduce((a,x)=>((a<<8n)|BigInt(x)),0n),
		{[Symbol.iterator]:_=>w[Symbol.iterator]()}
	))([...Array(8)].map((x,i)=>(x=Math.random(),i?x*256|0:x*64|0x80)));
	magick=Object.assign(
		'00ffff00fefefefefdfdfdfd12345678',
		{[Symbol.iterator]:_=>[
			0x00,0xff,0xff,0x00, 0xfe,0xfe,0xfe,0xfe,
			0xfd,0xfd,0xfd,0xfd, 0x12,0x34,0x56,0x78
		][Symbol.iterator]()}
	);
	ip2bin={
		IPv4:w=>w.split('.').map(x=>(+x).toString(2).padStart(8,0)).join(''),
		IPv6:w=>w.replace('::',':'.repeat(9-w.match(/:/g).length)).split(':').map(x=>(+('0x0'+x)).toString(2).padStart(16,0)).join('')
	};
	is_magick(w){return w.slice(0,16).map(x=>x.toString(16).padStart(2,0)).join('')==this.magick;}
	is_local(w){
		w=(v=>({v,bin:this.ip2bin[v](w)}))('IPv'+(w.includes('.')?4:6));
		return Object.values(networkInterfaces()).flat().reduce((a,x)=>a||x.family==w.v&&(
			x=x.cidr.split('/'),w.bin.startsWith(this.ip2bin[x.family](x[0]).slice(0,+x[1]))
		),0);
	}
	static async init(w){return await new this(w).init();}
	async init(){
		const
		socket={data:async(sock,x,port,addr)=>(// https://wiki.bedrock.dev/servers/raknet
			x=[...x],
			x[0]==1&&this.is_magick(x.slice(9))&&this.event.dispatchEvent(new CustomEvent('ping',{detail:{sock,id:x.slice(1,9),port,addr}})),
			x[0]==5&&this.is_magick(x.slice(1))&&this.event.dispatchEvent(new CustomEvent('req_open',{detail:{l:x.length,addr}}))
		)};
		this.proc={// TODO avoid port collision
			v4:await Bun.udpSocket({hostname:'0.0.0.0',port:this.mgr.prop?.server_port??19132,socket}),
			v6:await Bun.udpSocket({hostname:'::',port:this.mgr.prop?.server_portv6??19133,socket})
		};
		return this;
	}

	close(){Object.values(this.proc).forEach(x=>x.closed||x.close());return this;}
}
