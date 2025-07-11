#!/bin/bun
// import index_html from'./index.html';
import cfg from'./config.mjs';
import { chmod, cp, exists, mkdir, readdir, rm, stat, symlink } from'node:fs/promises';

let
mc,
log_arr=[];
const
log=(svr,x)=>(
	log_arr=[...log_arr.slice(-51,-1),...x.split('\n')],
	svr.publish('log',x)
),
td=new TextDecoder(),
dl=(svr,x)=>(async(
	progress=(w,f)=>new Response(new ReadableStream({start:async(c,x,s=[0,+w.headers.get('content-length')],r=w.body.getReader())=>{f(s);while(x=(await r.read()).value){c.enqueue(x);s[0]+=x.length;f(s);}c.close();}}))
)=>(
	log(svr,'Checking update...\n'),
	x=(
		await(await fetch('https://net-secondary.web.minecraft-services.net/api/v1.0/download/links')).json()
	).result.links.find((s=>x=>x.downloadType==s)({win32:'serverBedrockWindows',linux:'serverBedrockLinux'}[process.platform])),
	x||log(svr,`Unsupported platform "${process.platform}"\n`),
	x=new URL(x.downloadUrl),
	x.path=x.pathname.slice(1).split('/'),
	x.name=x.path.at(-1),
	x.file=Bun.file(`${cfg.dir.dl}/${x.name}`),
	// console.log(x),
	await x.file.exists()?(
		log(svr,'Already up to date\n'),
	):(
		log(svr,'New version found!\nDownloading...\n'),
		x.file=await progress(await fetch(x).catch(e=>(console.log(e),log(svr,e))),([x,a])=>
			// console.log(`\u001b[1F${(x/a*100).toFixed(2).padStart(6)} %`)
			log(svr,`${(x/a*100).toFixed(2).padStart(6)} %`)
		).blob(),
		log(svr,`100.00 %\n`),
		Bun.write(`${cfg.dir.dl}/${x.name}`,x.file),
		log(svr,`Done!\n`)
	)
))(),
deploy=(svr,x)=>(async(
	unzip=async(w=new Blob())=>((
		w,e=[...{[Symbol.iterator]:(p=w.length-21)=>({next:_=>({done:[80,75,5,6].every((x,i)=>w[p+i]==x)||!~p,value:--p})})}].pop(),
		le=(p,l=2)=>[...Array(l)].reduce((a,_,i)=>a|w[p+i]<<8*i,0),td=new TextDecoder(),
		ddt=x=>new Date((x>>>25)+1980,(x>>>21&15)-1,x>>>16&31,x>>>11&31,x>>>5&63,(x&31)*2).getTime()
	)=>Promise.all([...Array(le(e+8))].reduce((a,p=a.p,n)=>(
		n=[...{[Symbol.iterator]:(q=p+46+le(p+28),e=q+le(p+30))=>({next:_=>({done:e<=q,value:[le(q),[q+4,le(q+2)]],_:q+=4+le(q+2)})})}].reduce((a,[i,x])=>(a[i]=x,a),{})[0x7075],// Info-ZIP Unicode Path Extra Field
		n=td.decode(new Uint8Array(w.buffer,...n?[n[0]+5,n[1]-5]:[p+46,le(p+28)])),n[n.length-1]!='/'&&a.a.push((async()=>new File([await{
			0:_=>_,8:x=>Bun.inflateSync(x)
		}[le(p+10)](new Uint8Array(w.buffer,(l=>l+30+le(l+26)+le(l+28))(le(p+42,4)),le(p+20,4)))],n,{lastModified:ddt(le(p+12,4))}))()),a.p+=46+le(p+28)+le(p+30)+le(p+32),a
	),{p:le(e+16,4),a:[]}).a))((w=w.buffer||w,new Uint8Array(w instanceof ArrayBuffer?w:await new Response(w).arrayBuffer())))
)=>(
	x||(
		x=Bun.file(`${cfg.dir.dl}/${(await readdir(cfg.dir.dl)).sort().pop()}`)
	),
	await rm(cfg.dir.exe,{force:!0,recursive:!0}),
	log(svr,'Extracting...\n'),
	await Promise.all((await unzip(x)).map(async x=>(
		//(await stat(`${cfg.dir.exe}/${x.name}`)).isSymbolicLink()||
		Bun.write(`${cfg.dir.exe}/${x.name}`,x)
	))),
	await exists(cfg.dir.src)||(
		log(svr,'Initializing src dir...\n'),
		await mkdir(cfg.dir.src),
		['allowlist.json','permissions.json','server.properties'].forEach(async x=>(
			await cp(`${cfg.dir.exe}/${x}`,`${cfg.dir.src}/${x}`),
		)),
		await mkdir(`${cfg.dir.src}/worlds`)
	),
	['allowlist.json','permissions.json','server.properties','worlds'].forEach(async x=>(
		await rm(`${cfg.dir.exe}/${x}`,{force:!0}),
		await symlink(`${'../'.repeat(cfg.dir.src.split('/').length)}${cfg.dir.src}/${x}`,`${cfg.dir.exe}/${x}`)
	)),
	log(svr,'Done!\n')
))(),
start=async svr=>await Bun.file(`${cfg.dir.exe}/bedrock_server`).exists()?(
	await chmod(`${cfg.dir.exe}/bedrock_server`,755),
	mc=Bun.spawn({
		cwd:`./${cfg.dir.exe}`,env:{LD_LIBRARY_PATH:'.'},cmd:['./bedrock_server'],
		stdin:'pipe',stdout:'pipe'
	}),
	mc.log=(t=>(
		(async(r,x)=>{while(1){
			x=await r.read();
			if(x.done){mc=null;break;}
			t.dispatchEvent(new CustomEvent('data',{detail:td.decode(x.value)}));
		}})(mc.stdout.getReader()),
		t
	))(new EventTarget()),
	mc.log.addEventListener('data',e=>log(svr,e.detail))
):log(svr,'No executable found!\nRun `dl` `deploy`\n'),
bauth=r=>Object.entries(cfg.auth).map(([u,p])=>`Basic ${btoa(`${u}:${p}`)}`).includes(r.headers.get('authorization'))?null:
	new Response(null,{status:401,headers:{'WWW-Authenticate':'Basic realm="main"'}}),
svr=Bun.serve({
	routes:{
		'/':r=>bauth(r)||new Response(Bun.file('./index.html')),
		'/ws':(r,s)=>bauth(r)||(s.upgrade(r),new Response())
	},
	websocket:{
		open:x=>(x.send(log_arr.join('\n')),x.subscribe('log')),
		message:(_,msg)=>(
			log(svr,msg),
			(mc?x=>({
				start:_=>log(svr,'Server already running.\n'),
				dl:_=>dl(svr),
				deploy:_=>log(svr,'Stop server before deploy.\n')
			}[x]||(_=>(mc.stdin.write(msg),mc.stdin.flush()))):x=>({
				start:_=>start(svr),
				dl:_=>dl(svr),
				deploy:_=>deploy(svr),
				help:_=>log(svr,'Known commands\n\tstart, dl, deploy\n')
			}[x]||(_=>log(svr,'No server running. Unknown command.\n'))))(msg.slice(0,-1))()
		),
		close:x=>x.unsubscribe('log')
	}
});
