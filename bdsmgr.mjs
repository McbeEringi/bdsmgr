import{ls,lsdir,rm,mkdir,vsort,delay,listen,unzip,progress}from'./util.mjs';
import{symlink,chmod}from'node:fs/promises';
import{relative}from'node:path';
import{networkInterfaces}from'node:os';

const
dl=({
	log,signal,dld
},{x}={})=>(async()=>(
	log('Checking update...\n'),
	x=new URL(
		(await(await fetch('https://net-secondary.web.minecraft-services.net/api/v1.0/download/links',{signal})).json())?.result?.links?.find?.(
			(s=>x=>x.downloadType==s)({win32:'serverBedrockWindows',linux:'serverBedrockLinux'}[process.platform])
		)?.downloadUrl||await Promise.reject(new Error(`Can not find URL for platform "${process.platform}".`))
	),
	x.name=x.pathname.match(/[^/]+$/)?.[0],
	x.file=Bun.file(`${dld}/${x.name}`),
	log(`latest: ${x.name}`),
	await x.file.exists()?(
		log(`Already up to date!\ndl: Done.\n`)
	):(
		log(`New version!\nDownloading...\n`),
		await Bun.write(x.file.name,new Blob(await progress(
			await fetch(x,{signal}),
			([x,a])=>log(`${(x/a*100).toFixed(2).padStart(6)} %`)
		)),log(`100.00 %\n`)),
		log(`dl: Done.\n`)
	),
	0
))().catch(e=>(log(`${e.message}\ndl: Aborted.\n`),e)),
BDSMGR=class{
	constructor({
		server_id:id='default',
		server_dir:svrd=`servers/${id}`,
		download_dir:dld='downloads',
		config_file:cfgf=`${svrd}/config.json`,
		exec_dir:bind=`${svrd}/bin`,
		exec_name:binn=`bedrock_server${process.platform=='win32'?'.exe':''}`,
		exec_file:binf=`${bind}/${binn}`,
		data_dir:libd=`${svrd}/lib`,
		log_dir: logd=`${svrd}/log`,
		exlog=this.constructor.log_stdout
	}={}){
		Object.assign(this,{
			id,svrd,cfgf,bind,binn,binf,libd,logd,
			exlog,dld,
			cfg:null,
			prop:null,
			abort:this.#mkac(),
			td:new TextDecoder(),
			logf:null,
			proc_flint:null,
			proc_bds:null
		});
	}
	static async log_stdout(x){return await Bun.stdout.write(`\x1b[2K\x1b[0G${x}`);}
	static default_cfg=JSON.stringify({
		enable:true,
		lib:[
			'worlds/',
			'allowlist.json',
			'permissions.json',
			'server.properties',
		],
		log:{
			files:5,
			size:1e5
		},
		webhook:[]
	},0,'\t');
	async init(){
		await(async x=>await x.exists()||await Bun.write(x.name,this.constructor.default_cfg))(Bun.file(this.cfgf));
		this.cfg=await Bun.file(this.cfgf).json();
		// this.prop=await this.#rprop();// TODO
		this.logf=await this.#mklog();
		this.cfg.enable&&(this.proc_flint=await this.#mkflint());
		return this;
	}
	static async init(w){return await(new this(w)).init();}
	async #mkflint(){
		const
		magick=w=>w.slice(0,16).map(x=>x.toString(16).padStart(2,0)).join('')=='00ffff00fefefefefdfdfdfd12345678',
		ip2bin={
			4:w=>w.split('.').map(x=>(+x).toString(2).padStart(8,0)).join(''),
			6:w=>w.replace('::',':'.repeat(9-w.match(/:/g).length)).split(':').map(x=>(+('0x0'+x)).toString(2).padStart(16,0)).join('')
		},
		is_local=w=>(
			w={v:w.includes('.')?4:6,w},
			w.bin=ip2bin[w.v](w.w),
			Object.values(networkInterfaces()).flat().reduce((a,x)=>a||x.family==('IPv'+w.v)&&(
				x=x.cidr.split('/'),w.bin.startsWith(ip2bin[w.v](x[0]).slice(0,+x[1]))
			),0)
		),
		socket={data:async(sock,x,port,addr)=>(// https://wiki.bedrock.dev/servers/raknet
			x=[...x],
			x[0]==1&&magick(x.slice(9))&&is_local(addr)||this.log(`Unconnected Ping from ${addr}\n`),
			x[0]==5&&magick(x.slice(1))&&(
				this.log(`Open Connection Request 1 from ${addr} length: ${x.length}\n`),
				await this.start()&&(await delay(10*1e3),this.proc_bds?.soft_stop?.())
			)
			// prop.enable_lan_visibility=='true'&&x[0]==1&&magick(x.slice(9))&&(s=>sock.send(new Uint8Array([
			// 	0x1c,...x.slice(1,9),...[...Array(8)].map(_=>Math.random()*256|0),
			// 	0,255,255,0,254,254,254,254,253,253,253,253,0x12,0x34,0x56,0x78,
			// 	...(l=>[l>>>8&255,l&255])(s.length),...te.encode(s)
			// ]),port,addr))(`MCPE;${prop.server_name};;;0;${prop.max_players};;${prop.level_name};${prop.gamemode};`)
		)};
		return{// TODO port cf. #rprop
			v4:await Bun.udpSocket({hostname:'0.0.0.0',port:19132,socket}),
			v6:await Bun.udpSocket({hostname:'::',port:19133,socket})
		};
	}
	async #mkbds(){
		await chmod(this.binf,755);
		const w=Bun.spawn({cwd:this.bind,env:{LD_LIBRARY_PATH:'.'},cmd:[`./${this.binn}`],stdin:'pipe',stdout:'pipe'});
		Object.assign(w,{
			log:(t=>(
				(async(r,x)=>{
					while(1){
						x=await r.read();if(x.done)break;
						t.dispatchEvent(new CustomEvent('data',{detail:this.td.decode(x.value).split(/\r?\n/).slice(0,-1).map(x=>Object.assign(
							x,{groups:x.match(/^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d{3}) (?<type>[A-Z]+)\] (?<body>.*)$/)?.groups}
						))}));
						await delay(100);
					}
					t.dispatchEvent(new CustomEvent('done'));
				})(w.stdout.getReader()),
				t
			))(new EventTarget()),
			cmd:x=>(w.stdin.write(x+'\n'),w.stdin.flush()),
			list:async()=>await listen({
				target:w.log,name:'data',
				handler:x=>(
					x.reduce((a,x)=>(!x?a:a?(a.players.push(x),a):
						(x=x.match(/^\[.*?\] There are (?<a>\d+?)\/(?<b>\d+?) players online:$/)?.groups)?{players:[],current:+x.a,max:+x.b}:a
					),null)
				),
				run:_=>w.cmd('list')
			}),
			soft_stop:async()=>(await w.list()).current||w.cmd('stop'),
			xuid:{},
			online:new Set()
		});
		listen({
			target:w.log,name:'data',
			handler:x=>x.reduce((a,x)=>a||x.match(/Version: ([\d\.]+)/)?.[1],0)
		}).then(x=>w.version=x);
		// w.log.addEventListener('data',_=>_);
		return w;
	}
	#mkac(){return new AbortController();}
	async #mklog(w=this.logf||{x:''}){
		await(async(n,x=Bun.file(n))=>(
			await Bun.write(x,''),
			Object.assign(w,{name:n,file:x,writer:x.writer()})
		))(`${this.logd}/${new Date().toISOString()}`);
		await Promise.all((await ls(this.logd,{abs:1})).slice(0,-this.cfg.log.files).map(x=>rm(x)));
		return w;
	}
	async #wcfg(){await Bun.write(this.cfgf,JSON.stringify(this.cfg,0,'/t'));}
	async #rprop(){// TODO read prop cf. #mkflint
	}

	async log(x){
		await this.exlog?.(x);
		this.cfg.log.size<this.logf.file.size&&this.#mklog();
		x=x.split('\n');
		await this.logf.writer.write(x.slice(0,-1).map(x=>x+'\n').join(''));
		this.logf.x=x.at(-1);
		return this;
	}
	async status(){this.log(JSON.stringify({cfg:this.cfg,dl:vsort(await ls(this.dld))},0,'\t')+'\n');return this;}
	async deploy({incl}={}){return await(async x=>(
		(await ls(this.dld)).length||(this.log(`Auto dl...`),await dl({log:x=>this.log(x),dld:this.dld,signal:this.abort.signal})),
		x=vsort(await ls(this.dld)).find(x=>x.includes(incl??'bedrock-server')),
		x??await Promise.reject(new Error('File not found.')),
		this.log(`Extracting...\n`),
		x=await unzip(Bun.file(`${this.dld}/${x}`)).catch(e=>Promise.reject(new Error('Failed to unzip.'))),
		await rm(this.bind),
		await Promise.all(x.map(x=>Bun.write(`${this.bind}/${x.name}`,x))),
		(await ls(this.svrd,{abs:1})).includes(this.libd)||(
			this.log('Init lib dir...\n'),
			await Promise.all(this.cfg.lib.map(async (x,y)=>(
				y=Bun.file(`${this.bind}/${x}`),
				await y.exists()?
					await Bun.write(`${this.libd}/${x}`,y):
					(x.at(-1)=='/'&&await mkdir(`${this.libd}/${x}`))
			)))
		),
		this.log('symlink...\n'),
		await Promise.all(this.cfg.lib.map(async x=>(
			await rm(`${this.bind}/${x}`),
			// Windows requires Admin or DevMode for symlink...
			await symlink(relative(this.bind,`${this.libd}/${x}`),`${this.bind}/${x}`.replace(/\/$/,''))
		))),
		this.log(`deploy: Done.\n`),
		this
	))().catch(e=>(this.log(`${e.message}\ndeploy: Aborted.\n`),void 0));}
	abort(){this.abort.abort();log(`Abort requested.\n`);this.abort=this.#mkac();return this;}
	async start(){return await(async(
		msg2obj=(w,a={})=>w.split(',').reduce((a,x)=>(
			x=x.split(':'),a[x[0].match(/\S+/)[0].toLowerCase()]=x[1].trim(),a
		),a),
	)=>(
		await Bun.file(this.binf).exists()||await Promise.reject(new Error('Executable not found.')),
		this.proc_flint&&(
			this.proc_flint.v4.close(),
			this.proc_flint.v6.close(),
			this.proc_flint=null
		),
		this.proc_bds=await this.#mkbds(),
		[
			// logging
			['data',e=>(e=e.detail.reduce((a,x)=>(x.includes('Running AutoCompaction...')||(a+=x+'\n'),a),''),e&&this.log(e))],
			// mkflint when exit
			['done',async e=>(this.log('Process exitted.\n'),this.proc_bds=null,this.proc_flint=await this.#mkflint())],
			// auto stop
			['data',async e=>e.detail.some(x=>x.includes('Player disconnected'))&&(await delay(500),this.proc_bds.soft_stop())]
		].forEach(x=>this.proc_bds.log.addEventListener(...x)),
		this
	))().catch(e=>(this.log(`${e.message}\nstart: Aborted.\n`),void 0));}
	pkill(){this.proc_bds?(this.proc_bds.kill(),this.log(`pkill requested.\n`)):this.log(`No process running.\n`);return this;}
	help(){this.log(`known props:\n\t${
		Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(x=>![
			'constructor','init'
		].includes(x))
	}\n`);return this;}
};

export{dl,BDSMGR};
