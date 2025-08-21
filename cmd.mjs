const
cmd={
	status:async({
		log,
		dld,
		cfg,
		ls,
		vsort
	})=>(log(JSON.stringify({
		cfg,
		dl:vsort(await ls(dld))
	},0,'\t')+'\n'),0),
	dl:({
		log,
		dld,
		signal,
		x,
		progress=(w,f)=>((r=w.body.getReader(),p=[0,+w.headers.get('content-length')])=>Array.fromAsync({[Symbol.asyncIterator]:_=>(f(p),{next:async x=>(x=(await r.read()).value,x&&(p[0]+=x.length,f(p)),{done:!x,value:x})})}))()
	})=>(async()=>(
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
	deploy:({
		log,
		dld,
		bind,
		libd,
		ls,
		rm,
		vsort,
		signal,
		arg,
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
		),{p:le(e+16,4),a:[]}).a))((w=w.buffer||w,new Uint8Array(w instanceof ArrayBuffer?w:await new Response(w).arrayBuffer())))
	})=>(async()=>(
		(await ls(dld)).length||await cmd.deploy({log,dld,signal}),
		x=vsort(await ls(dld)).find(x=>x.includes(arg[0]??'bedrock-server')),
		x??await Promise.reject(new Error('File not found.')),
		log(`Extracting...\n`),
		x=await unzip(Bun.file(`${dld}/${x}`)).catch(e=>Promise.reject(new Error('Failed to unzip.'))),
		log(`Extracted.\n`)

	))().catch(e=>(log(`${e.message}\ndl: Aborted.\n`),e)),
	start:_=>_,
	pkill:_=>_,
	help:({
		log
	})=>log(`known commands:\n${Object.keys(cmd).map(x=>`\t${x}\n`).join('')}`)
};
export{cmd};
