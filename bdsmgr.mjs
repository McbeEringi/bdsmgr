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
		config_file:cfgf=`${svrd}/config.toml`,
		exec_dir:bind=`${svrd}/bin`,
		data_dir:libd=`${svrd}/lib`,
		log_dir: logd=`${svrd}/log`,

		log:elog,
		download_dir:dld='downloads'
	}={}){
		Object.assign(this,{
			id,svrd,cfgf,bind,libd,logd,
			elog,dld,
			cfg:null,
			abort:this.#mkac(),
			logf:null,
			proc_udp_starter:this.#mkstarter(),
			proc_bds:null
		});
	}
	async init(){
		await(async x=>await x.exists()||await Bun.write(x.name,`[log]\nfiles=5\nsize=${1024*128}`))(Bun.file(this.cfgf));
		Object.assign(this,{
			cfg:await(async x=>Bun.TOML.parse(await x.text()))(Bun.file(this.cfgf)),
			logf:this.#mklog()
		});
		return this;
	}
	static async init(){return await(new this()).init();}
	#mkstarter(){return(1);}
	#mkac(){return new AbortController();}
	#mklog(w={x:''}){
		((n,x=Bun.file(n))=>(
			Bun.write(x,''),
			Object.assign(w,{name:n,file:x,writer:x.writer()})
		))(`${this.logd}/${new Date().toISOString()}`);
		ls(this.logd,{abs:1}).then(x=>Promise.all(x.slice(0,-this.cfg.log.files).map(x=>rm(x)))),
		w
	}

	log(){}
	async status(){log(JSON.stringify({cfg,dl:vsort(await ls(this.dld))},0,'\t'));}
	deploy(){}
	abort(){this.abort.abort();log(`Abort requested.\n`);this.abort=this.#mkac();}
	start(){}
	pkill(){}
	help(){log(`known props:\n\t${
		Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(x=>x!='constructor')
	}\n`);}
};

export{dl,BDSMGR};
