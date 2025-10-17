import * as path from'node:path';
import{mkdir}from'node:fs/promises';
export class BDSMGR{
	constructor({
		root_path='./',
		dl_dir='downloads',
		svr_dir='servers',
	}={}){
		// root_path = entry_point+root_path
		root_path=path.resolve(path.join(path.dirname(Bun.main),root_path));
		Object.assign(this,{
			path:{
				root:root_path,
				dl:path.join(root_path,dl_dir),
				svr:path.join(root_path,svr_dir),
			}
		});

		console.log(this);
		return this;
	}
	static async init(w){return await(new this(w)).init();}
	async init(){
		await mkdir(this.path.dl,{recursive:true});
		await mkdir(this.path.svr,{recursive:true});
		return this;
	}

	async start(){
		const assets=x=>path.join(import.meta.dirname,'assets',x);
		Bun.serve({
			port:3000,
			routes:{
				'/':(r,s)=>new Response(Bun.file(assets('index.html'))),
				'/favicon.ico':(r,s)=>new Response(Bun.file(assets('favicon.ico')))
			}
		})
	}
}
