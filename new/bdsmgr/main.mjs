import * as path from'node:path';
import{mkdir}from'node:fs/promises';
import * as assets from'./assets';
export class BDSMGR{
	constructor({
		root_path='./',
		dl_dir='downloads',
		svr_dir='servers',
	}={}){
		// root_path = entry_point+root_path
		root_path=({
			'/':_=>root_path,
			'~':_=>path.join(process.env[process.platform=='win32'?'USERPROFILE':'HOME'],root_path.slice(1))
		}[root_path[0]]||(_=>path.resolve(path.join(path.dirname(Bun.main),root_path))))();
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
		const
			embed=Bun.embeddedFiles.reduce((a,x)=>(a[x.name]=x,a),{}),
			r2top=(r,s)=>Response.redirect('/'),
			fs=(r,s)=>new Response(Bun.file(new URL(r.url).pathname.replace(/\./g,'_').slice(1).split('/').reduce((a,x)=>a[x],assets)));
		Bun.serve({
			port:3000,
			routes:{
				'/':assets.index_html,'/index':r2top,'/index.html':r2top,
				'/favicon.ico':fs,'/img/*':fs
			},
			fetch:(r,s,x=embed[new URL(r.url).pathname.slice(1)])=>x?new Response(x):new Response(null,{status:404})
		})
	}
}
