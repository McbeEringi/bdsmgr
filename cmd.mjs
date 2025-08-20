const
cmd={
	status:async({
		log,
		dld,
		cfg,
		ls
	})=>log(JSON.stringify({
		cfg,
		dl:await ls(dld)
	},0,'\t')+'\n'),
	abort:({
		log,
		abort
	})=>(abort.dispatchEvent(new CustomEvent('abort')),log(`Abort requested.\n`),0),
	dl:({
		log,
		dld,
		abort:signal,
		x,
		progress=(w,f,s)=>((
			r=w.body.getReader(),p=[0,+w.headers.get('content-length')],b,c=_=>(b=1,r.cancel()),d=_=>Promise.reject({message:'Load aborted.'})
		)=>s?.aborted?d():Array.fromAsync({[Symbol.asyncIterator]:_=>(s?.addEventListener('abort',c,{once:1}),f(p),{next:async x=>(
			x=(await r.read()).value,b&&await d(),x?(p[0]+=x.length,f(p)):s?.removeEventListener('abort',c),{done:!x,value:x}
		)})}))()
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
				([x,a])=>log(`${(x/a*100).toFixed(2).padStart(6)} %`),
				signal
			)),log(`100.00 %\n`)),
			log(`dl: Done.\n`)
		),
		0
	))().catch(e=>(log(`${e.message}\ndl: Aborted.\n`),e)),
	deploy:_=>_,
	start:_=>_,
	pkill:_=>_,
	help:({
		log
	})=>log(`known commands:\n${Object.keys(cmd).map(x=>`\t${x}\n`).join('')}`)
};
export{cmd};
