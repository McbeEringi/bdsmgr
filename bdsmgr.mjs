import{ls,lsdir,rm,mkdir,vsort,unzip,progress}from'./util.mjs';
import{symlink}from'node:fs/promises';
import{relative}from'node:path';

const
dl=({
	log,signal,dld
},{x}={})=>(async()=>(
	log('Checking update...\n'),
	x=new URL(
		(await(await fetch('https://net-secondary.web.minecraft-services.net/api/v1.0/download/links',{signal})).json())?.result?.links?.find?.(
			(s=>x=>x.downloadType==s)({win32:'serverBedrockWindows',linux:'serverBedrockLinux'}[process.platform])
		)?.downloadUrl||await Promise.resolve(new Error(`Can not find URL for platform "${process.platform}".`))
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
		config_file:cfgf=`${svrd}/config.toml`,
		exec_dir:bind=`${svrd}/bin`,
		data_dir:libd=`${svrd}/lib`,
		log_dir: logd=`${svrd}/log`,
		exlog=this.constructor.log_stdout
	}={}){
		Object.assign(this,{
			id,svrd,cfgf,bind,libd,logd,
			exlog,dld,
			cfg:null,
			abort:this.#mkac(),
			logf:null,
			proc_udp_starter:this.#mkstarter(),
			proc_bds:null
		});
	}
	static async log_stdout(x){return await Bun.stdout.write(`\x1b[2K\x1b[0G${x}`);}
	static default_cfg=`\
lib=[
	'worlds/',
	'allowlist.json',
	'permissions.json',
	'server.properties',
]

[log]
files=5
size=1e5
`;
	async init(){
		await(async x=>await x.exists()||await Bun.write(x.name,this.constructor.default_cfg))(Bun.file(this.cfgf));
		this.cfg=await(async x=>Bun.TOML.parse(await x.text()))(Bun.file(this.cfgf));
		this.logf=await this.#mklog();
		return this;
	}
	static async init(){return await(new this()).init();}
	#mkstarter(){return(1);}
	#mkac(){return new AbortController();}
	async #mklog(w={x:''}){
		await(async(n,x=Bun.file(n))=>(
			await Bun.write(x,''),
			Object.assign(w,{name:n,file:x,writer:x.writer()})
		))(`${this.logd}/${new Date().toISOString()}`);
		await Promise.all((await ls(this.logd,{abs:1})).slice(0,-this.cfg.log.files).map(x=>rm(x)));
		return w;
	}

	async log(x){
		await this.exlog?.(x);
		this.cfg.log.size<this.logf.file.size&&this.#mklog();
		x=x.split('\n');
		await this.logf.writer.write(x.slice(0,-1).map(x=>x+'\n').join(''));
		this.logf.x=x.at(-1);
		return this;
	}
	async status(){this.log(JSON.stringify({cfg,dl:vsort(await ls(this.dld))},0,'\t'));return this;}
	async deploy({incl}={}){return await(async x=>(
		(await ls(this.dld)).length||(this.log(`Auto dl...`),await dl({log:this.log,dld:this.dld,signal:this.abort.signal})),
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
	start(){}
	pkill(){}
	help(){this.log(`known props:\n\t${
		Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(x=>![
			'constructor','init'
		].includes(x))
	}\n`);return this;}
};

export{dl,BDSMGR};
