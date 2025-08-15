#!/bin/env -S bun
// import index_html from'./index.html';
import cfg from'./config.mjs';
import { chmod, cp, exists, mkdir, readdir, rm, symlink } from'node:fs/promises';

let
sp,
sc,
log_arr=[];
const
prop=await(async x=>await x.exists()?(await x.text()).replace(/^#[^\n]*?\n/mg,'').split('\n').reduce((a,x,i)=>(
	x&&([i,x]=x.split('=',2).map(x=>x.trim()),a[i.replace(/-/g,'_')]=x),a
),{}):{})(Bun.file(`${cfg.dir.exe}/server.properties`)),
delay=m=>new Promise(f=>setTimeout(f,m)),
log=(svr,x)=>(
	log_arr=[...log_arr.slice(-51,-1),...x.split('\n')],
	svr.publish('log',x)
),
td=new TextDecoder(),te=new TextEncoder(),
listen=({target:t,name:n,handler:h,run:r})=>new Promise((f,_,x)=>(t.addEventListener(n,_=e=>(
	(x=h(e.detail))&&(e.currentTarget.removeEventListener(n,_),f(x))
)),r&&r())),
list=sp=>listen({
	target:sp.log,name:'data',
	handler:x=>(
		x.reduce((a,x)=>(!x?a:a?(a.players.push(x),a):
			(x=x.match(/^\[.*?\] There are (?<a>\d+?)\/(?<b>\d+?) players online:$/)?.groups)?{players:[],current:+x.a,max:+x.b}:a
		),null)
	),
	run:_=>(sp.stdin.write('list\n'),sp.stdin.flush())
}),
lsdl=async(d=cfg.dir.dl)=>await exists(d)&&(await readdir(d))
	.map(x=>Object.assign(x,{v:(x.match(/\d+/g)??[]).map(x=>+x)}))
	.sort(({v:a},{v:b})=>a.length&&b.length?(a.reduce((a,x,i)=>a||Math.sign((b[i]||0)-x),0)):!a.length),
sc_start=(svr,f,ac=10)=>sp||(async(
	magick=w=>w.slice(0,16).map(x=>x.toString(16).padStart(2,0)).join('')=='00ffff00fefefefefdfdfdfd12345678'
)=>(
	sc=await Bun.udpSocket({// https://wiki.bedrock.dev/servers/raknet
		port:cfg.udp_port,
		socket:{
			data:async(sock,x,port,addr)=>(
				x=[...x],
				addr=Object.assign(addr,{name:(
					x=>x&&x.Node.Name.match(/[^\.]+/)?.[0]
				)(await Bun.$`tailscale whois --json ${addr}`.json().catch(e=>null))}),
				x[0]==1&&magick(x.slice(9))&&addr.startsWith('100.')&&log(svr,`Unconnected Ping from ${addr} (${addr.name})\n`),
				x[0]==5&&magick(x.slice(1))&&log(svr,`Open Connection Request 1 from ${addr} (${addr.name}) length: ${x.length}\n`),
				prop.enable_lan_visibility=='true'&&x[0]==1&&magick(x.slice(9))&&(s=>sock.send(new Uint8Array([
					0x1c,...x.slice(1,9),...[...Array(8)].map(_=>Math.random()*256|0),
					0,255,255,0,254,254,254,254,253,253,253,253,0x12,0x34,0x56,0x78,
					...(l=>[l>>>8&255,l&255])(s.length),...te.encode(s)
				]),port,addr))(`MCPE;${prop.server_name};;;0;${prop.max_players};;${prop.level_name};${prop.gamemode};`),
				cfg.auto_start&&x[0]==5&&magick([...x].slice(1))&&(
					await f()&&(
						await delay(ac*1e3),
						sp&&((await list(sp)).current||(sp.stdin.write('stop\n'),sp.stdin.flush()))
					)
				)
			)
		},
	})
))(),
cmd={
	status:async svr=>log(svr,JSON.stringify({
		running:!!sp,
		version:sp&&sp.version,
		list:sp&&await list(sp),
		cfg:(x=>(x={...x},delete x.auth,x))(cfg),
		prop,
		dl:await lsdl(),
		src:await readdir(cfg.dir.src,{recursive:!0}).catch(e=>null),
	},0,'\t')+'\n'),
	dl:(svr,x)=>(async(
		progress=(w,f)=>new Response(new ReadableStream({start:async(c,x,s=[0,+w.headers.get('content-length')],r=w.body.getReader())=>{f(s);while(x=(await r.read()).value){c.enqueue(x);s[0]+=x.length;f(s);}c.close();}}))
	)=>(
		x[1]?(x=x[1]):(
			log(svr,'Checking update...\n'),
			x=await fetch('https://net-secondary.web.minecraft-services.net/api/v1.0/download/links').catch(e=>(log(svr,`Failed to fetch API server.\n`),0)),
			x&&(x=await x.json().catch(e=>(log(svr,`API server returned invalid JSON.\n`),0))),
			x&&(x=x?.result?.links?.find?.(
				(s=>x=>x.downloadType==s)({win32:'serverBedrockWindows',linux:'serverBedrockLinux'}[process.platform])
			)?.downloadUrl||(log(svr,`Can not find URL for platform "${process.platform}".\n`),0))
		),
		x&&(x=await(async()=>new URL(x))().catch(e=>(log(svr,e.message),0))),
		x&&(
			x.path=x.pathname.slice(1).split('/'),
			x.name=x.path.at(-1)||x.hostname||void 0,
			x.file=Bun.file(`${cfg.dir.dl}/${x.name}`),
			await x.file.exists()?(
				log(svr,'Already exists\n'),
			):(
				log(svr,'New version found!\nDownloading...\n'),
				x.file=await fetch(x).catch(e=>(log(svr,`Failed to fetch download URL.`),0)),
				x.file&&(
					x.file=await progress(x.file,([x,a])=>
						log(svr,`${(x/a*100).toFixed(2).padStart(6)} %`)
					).blob(),
					log(svr,`100.00 %\n`),
					await Bun.write(`${cfg.dir.dl}/${x.name}`,x.file),
					log(svr,`Done!\n`)
				)
			)
		)
	))(),
	deploy:(svr,x)=>(async(
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
		x={
			arg:x[1],
			ls:await lsdl()
		},
		(
			x.ls.length?(
				x=x.ls.find((y=>z=>z.includes(y))(x.arg||'bedrock-server')),
				x?(log(svr,`Found "${x}" .\n`),x=Bun.file(`${cfg.dir.dl}/${x}`)):(log(svr,'Not found.'),0)
			):(log(svr,'Run `dl` first.'),0)
		)
	)&&(
		log(svr,'Extracting...\n'),
		x=await unzip(x).catch(e=>(log(svr,'Failed to unzip.'),0)),
		x&&(
			await rm(cfg.dir.exe,{force:!0,recursive:!0}),
			await Promise.all(x.map(x=>Bun.write(`${cfg.dir.exe}/${x.name}`,x))),
			await exists(cfg.dir.src)||(
				log(svr,'Initializing src dir...\n'),
				await mkdir(cfg.dir.src),
				await Promise.all(cfg.src.map(async x=>(
					await exists(`${cfg.dir.exe}/${x}`)?
						await cp(`${cfg.dir.exe}/${x}`,`${cfg.dir.src}/${x}`,{recursive:!0}):
						x.at(-1)=='/'?await mkdir(`${cfg.dir.src}/${x}`):await Bun.write(`${cfg.dir.src}/${x}`,''),
				)))
			),
			cfg.src.forEach(async x=>(
				x=Object.assign(x.replace(/\/$/,''),{dir:x.at(-1)=='/'}),
				await Bun.write(`${cfg.dir.exe}/${x}`,''),
				await rm(`${cfg.dir.exe}/${x}`,{recursive:!0,force:!0}),
				// Windows requires Admin or DevMode for symlink...
				await symlink(`${'../'.repeat((cfg.dir.exe+x).split('/').length)}${cfg.dir.src}/${x}`,`${cfg.dir.exe}/${x}`)
			)),
			log(svr,'Done!\n'),1
		)
	))(),
	start:async svr=>await Bun.file(`${cfg.dir.exe}/bedrock_server${process.platform=='win32'?'.exe':''}`).exists()?(
		sc&&(sc.close(),sc=null),
		await chmod(`${cfg.dir.exe}/bedrock_server${process.platform=='win32'?'.exe':''}`,755),
		sp=Bun.spawn({
			cwd:`./${cfg.dir.exe}`,env:{LD_LIBRARY_PATH:'.'},cmd:[`./bedrock_server${process.platform=='win32'?'.exe':''}`],
			stdin:'pipe',stdout:'pipe'
		}),
		sp.log=(t=>(
			(async(r,x)=>{while(1){
				x=await r.read();if(x.done)break;
				t.dispatchEvent(new CustomEvent('data',{detail:td.decode(x.value).split(/\r?\n/).slice(0,-1)}));
				await delay(100);
			}sp=null;t.dispatchEvent(new CustomEvent('done'));})(sp.stdout.getReader()),// BUG?: sp=null required before dispatchEvent to reconnect but no error occurs
			t
		))(new EventTarget()),
		listen({
			target:sp.log,name:'data',
			handler:x=>x.reduce((a,x)=>a||x.match(/Version: ([\d\.]+)/)?.[1],0)
		}).then(x=>sp.version=x),
		sp.log.addEventListener('data',e=>(e=e.detail.reduce((a,x)=>(x.includes('Running AutoCompaction...')||(a+=x+'\n'),a),''),e&&log(svr,e))),
		sp.log.addEventListener('done',e=>(log(svr,'Process exitted.\n'),sc_start(svr,_=>cmd.start(svr)))),
		cfg.auto_stop&&sp.log.addEventListener('data',async e=>e.detail.some(x=>x.includes('Player disconnected'))&&(
			await delay(500),
			(await list(sp)).current||(sp.stdin.write('stop\n'),sp.stdin.flush())
		)),
		cfg.webhook?.length&&((
				msg2obj=(w,a={})=>w.split(',').reduce((a,x)=>(
					x=x.split(':'),
					a[x[0].match(/\S+/)[0].toLowerCase()]=x[1].trim(),
					a
				),a),
				send=w=>Promise.all(cfg.webhook.map(x=>fetch(x,{
					method:'POST',headers:{'Content-Type':'application/json'},
					body:JSON.stringify(w)
				}).catch(e=>(log(svr,`Failed to send webhook msg.\n`),0)))),
				xuid={},online=new Set()
		)=>(
			sp.log.addEventListener('data',e=>e.detail.forEach(x=>(
				(x=>x&&(
					x.date=new Date(x.date).toISOString(),
					x=x.type=='INFO'?Object.entries({
						'Player connected':x=>(x=msg2obj(x.body,{date:x.date}),xuid[x.xuid]=x.player,online.add(x.xuid),{embeds:[{
							title:`${x.player}が世界にやってきました`,timestamp:x.date,color:0x88ff44,footer:{text:sp.version},
							fields:[{name:'ログイン中',value:JSON.stringify([...online].map(x=>xuid[x]))}]
						}]}),
						//'Player Spawned':x=>(msg2obj(x.body)),
						'Player disconnected':x=>(x=msg2obj(x.body,{date:x.date}),online.delete(x.xuid),{embeds:[{
							title:`${x.player}が世界を去りました`,timestamp:x.date,color:0xff8844,footer:{text:sp.version},
							fields:online.size?[{name:'ログイン中',value:JSON.stringify([...online].map(x=>xuid[x]))}]:[]
						}]}),
						'Realms Story':x=>(
							x={date:x.date,...x.body.match(/event: (?<event>.*?), xuids: (?<xuids>.*?)(?:, metadata: (?<metadata>.*?))?$/).groups},
							{embeds:[{
								title:x.event,timestamp:x.date,color:0x44ffff,footer:{text:sp.version},
								fields:[
									{name:'By',value:JSON.stringify(JSON.parse(x.xuids).map(x=>xuid[x]))},
									...(x.metadata?Object.entries(JSON.parse(x.metadata)).map(([i,x])=>({name:i,value:x})):[])
								]
							}]}
						),
						'Running AutoCompaction...':x=>0,
						'Server started.':x=>cfg.auto_start?0:({embeds:[{
							title:'サーバーが起動しました',timestamp:x.date,color:0x4488ff,footer:{text:sp.version},
						}]}),
						'Game rule':x=>({embeds:[{
							title:x.body,timestamp:x.date,color:0x4488ff,footer:{text:sp.version},
						}]})
					}).reduce((a,[i,f])=>(a||x.body.startsWith(i)&&f(x)),0):(x=>({embeds:[{
						title:`[${x.type}] ${x.body}`,
						timestamp:x.date,color:0xff00ff
					}]}))(x),
					x&&send(x)
				))(x.match(/^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d{3}) (?<type>[A-Z]+)\] (?<body>.*)$/)?.groups),
				cfg.auto_stop||x=='Quit correctly'&&send({embeds:[{
					title:'サーバーが正常に終了しました',timestamp:new Date().toISOString(),color:0x4488ff,footer:{text:sp.version},
				}]})
			))),
			cfg.auto_stop||sp.log.addEventListener('done',e=>send({embeds:[{
				title:'プロセスが終了しました',timestamp:new Date().toISOString(),color:0x4488ff
			}]}))
		))(),
		1
	):(log(svr,'No executable found!\nRun `dl` `deploy`\n'),0),
	pkill:svr=>sp?(sp.kill(),log(svr,'kill requested.\n')):log(svr,'No process running.\n')
},
auth=({cookies:c,headers:h})=>((w,a='Authorization')=>(
	w.includes(c.get(a))?(c.set({name:a,value:c.get(a),maxAge:3600}),null):
	w.includes(h.get(a))?(c.set(a,h.get(a)),new Response(null,{headers:{Refresh:0}})):
	new Response(null,{status:401,headers:{'WWW-Authenticate':'Basic realm="main"'}})
))(Object.entries(cfg.auth).map(([u,p])=>`Basic ${btoa(`${u}:${p}`)}`)),
svr=Bun.serve({
	port:cfg.port,
	routes:{
		'/':r=>auth(r)||new Response(Bun.file('./index.html')),
		'/ws':(r,s)=>auth(r)||(s.upgrade(r),new Response()),
		'/favicon.ico':(r,s)=>new Response(Bun.file('./favicon.ico'))
	},
	websocket:{
		open:x=>(x.send(log_arr.join('\n')),x.subscribe('log')),
		message:(arg,msg)=>(
			msg.at(-1)=='\n'||(msg+='\n'),
			log(svr,msg),
			arg=msg.slice(0,-1).split(/\s+/),
			(sp?x=>({
				...cmd,
				start:_=>log(svr,'Process already running.\n'),
				deploy:_=>log(svr,'Stop process before deploy.\n'),
			}[x]||(_=>(sp.stdin.write(msg),sp.stdin.flush()))):x=>({
				...cmd,
				help:_=>log(svr,`Known commands:\n\t${Object.keys(cmd)}\n`)
			}[x]||(_=>log(svr,'Process not running. Unknown command.\n'))))(arg[0])(svr,arg)
		),
		close:x=>x.unsubscribe('log')
	}
});

sc_start(svr,_=>cmd.start(svr));
console.log(svr.url.href);
