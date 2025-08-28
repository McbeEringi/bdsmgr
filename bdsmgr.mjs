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

		log,
		download_dir:dld='downloads'
	}={}){
		Object.assign(this,{
			id,svrd,cfgf,bind,libd,
			log,dld,
			cfg:null,
			abort:this.#mkac(),
			proc_udp_starter:this.#mkstarter(),
			proc_bds:null
		});
	}
	async init(){
		Object.assign({
			cfg:await(async x=>await x.exists()?Bun.TOML.parse(await x.text()):{})(Bun.file(this.cfgf))
		});
		return this;
	}
	static async init(){return await(new this()).init();}
	#mkstarter(){return(1);}
	#mkac(){return new AbortController();}
	status(){}
	deploy(){}
	abort(){this.abort.abort();log(`Abort requested.\n`);this.abort=this.#mkac();}
	start(){}
	pkill(){}
	help(){log(`known props:\n\t${
		Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(x=>x!='constructor')
	}\n`);}
};

export{dl,BDSMGR};
