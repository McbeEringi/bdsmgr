#!/bin/bun
// import index_html from'./index.html';

let mc;
const
dl_dir='downloads',
exe_dir='exe',
td=new TextDecoder(),
upd=async(
	svr,
	x,
	unzip=async(w=new Blob())=>((
		w,e=[...{[Symbol.iterator]:(p=w.length-21)=>({next:_=>({done:[80,75,5,6].every((x,i)=>w[p+i]==x)||!~p,value:--p})})}].pop(),
		le=(p,l=2)=>[...Array(l)].reduce((a,_,i)=>a|w[p+i]<<8*i,0),td=new TextDecoder(),
		ddt=x=>new Date((x>>>25)+1980,(x>>>21&15)-1,x>>>16&31,x>>>11&31,x>>>5&63,(x&31)*2).getTime()
	)=>Promise.all([...Array(le(e+8))].reduce((a,p=a.p,n)=>(
		n=[...{[Symbol.iterator]:(q=p+46+le(p+28),e=q+le(p+30))=>({next:_=>({done:e<=q,value:[le(q),[q+4,le(q+2)]],_:q+=4+le(q+2)})})}].reduce((a,[i,x])=>(a[i]=x,a),{})[0x7075],// Info-ZIP Unicode Path Extra Field
		n=td.decode(new Uint8Array(w.buffer,...n?[n[0]+5,n[1]-5]:[p+46,le(p+28)])),n[n.length-1]!='/'&&a.a.push((async()=>new File([await{
			0:_=>_,8:x=>Bun.inflateSync(x)
		}[le(p+10)](new Uint8Array(w.buffer,(l=>l+30+le(l+26)+le(l+28))(le(p+42,4)),le(p+20,4)))],n,{lastModified:ddt(le(p+12,4))}))()),a.p+=46+le(p+28)+le(p+30)+le(p+32),a
	),{p:le(e+16,4),a:[]}).a))((w=w.buffer||w,new Uint8Array(w instanceof ArrayBuffer?w:await new Response(w).arrayBuffer()))),
	progress=(w,f)=>new Response(new ReadableStream({start:async(c,x,s=[0,+w.headers.get('content-length')],r=w.body.getReader())=>{f(s);while(x=(await r.read()).value){c.enqueue(x);s[0]+=x.length;f(s);}c.close();}}))
)=>(
	svr.publish('log','Checking update...\n'),
	x=(
		await(await fetch('https://net-secondary.web.minecraft-services.net/api/v1.0/download/links')).json()
	).result.links.find((s=>x=>x.downloadType==s)({win32:'serverBedrockWindows',linux:'serverBedrockLinux'}[process.platform])),
	x||svr.publish('log',`Unsupported platform "${process.platform}"\n`),
	x=new URL(x.downloadUrl),
	x.path=x.pathname.slice(1).split('/'),
	x.name=x.path.at(-1),
	x.file=Bun.file(`${dl_dir}/${x.name}`),
	// console.log(x),
	await x.file.exists()?(
		svr.publish('log','Already up to date\n'),
	):(
		svr.publish('log','New version found!\nDownloading...\n'),
		x.file=await progress(await fetch(x),([x,a])=>
			// console.log(`\u001b[1F${(x/a*100).toFixed(2).padStart(6)} %`)
			svr.publish('log',`${(x/a*100).toFixed(2).padStart(6)} %\n`)
		).blob(),
		Bun.write(`${dl_dir}/${x.name}`,x.file),
		svr.publish('log','Extracting...\n'),
		(await unzip(x.file)).forEach(x=>Bun.write(`${exe_dir}/${x.name}`,x)),
		svr.publish('log','Done!\n')
	)
),
start=async svr=>await Bun.file(`${exe_dir}/bedrock_server`).exists()?(
	process.platform=='linux'&&await Bun.$`chmod +x ${exe_dir}/bedrock_server`,
	mc=Bun.spawn({
		cwd:`./${exe_dir}`,env:{LD_LIBRARY_PATH:'.'},cmd:['./bedrock_server'],
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
	mc.log.addEventListener('data',e=>svr.publish('log',e.detail))
):svr.publish('log','No executable found!\nRun `upd`\n'),
bauth=r=>r.headers.get('authorization')==`Basic ${btoa('admin:admin')}`?null:
	new Response(null,{status:401,headers:{'WWW-Authenticate':'Basic realm="main"'}}),
svr=Bun.serve({
	routes:{
		'/':r=>bauth(r)||new Response(Bun.file('./index.html')),
		'/ws':(r,s)=>bauth(r)||(s.upgrade(r),new Response())
	},
	websocket:{
		open:x=>x.subscribe('log'),
		message:(_,msg)=>(
			svr.publish('log',msg),
			(mc?x=>({
				start:_=>svr.publish('log','Server already running.\n'),
				upd:_=>svr.publish('log','Stop server before update.\n')
			}[x]||(_=>(mc.stdin.write(msg),mc.stdin.flush()))):x=>({
				start:_=>start(svr),
				upd:_=>upd(svr),
				help:_=>svr.publish('log','Known commands\n\tstart, upd\n')
			}[x]||(_=>svr.publish('log','No server running. Unknown command.\n'))))(msg.slice(0,-1))()
		),
		close:x=>x.unsubscribe('log')
	}
});
