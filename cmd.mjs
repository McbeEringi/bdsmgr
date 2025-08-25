import{ls,lsdir,rm,mkdir,vsort,unzip,progress}from'./util.mjs';
import{symlink}from'node:fs/promises';
import{relative}from'node:path';

const
cmd={
	status:async({
		log,
		dld,
		cfg
	})=>(log(JSON.stringify({
		cfg,
		dl:vsort(await ls(dld))
	},0,'\t')+'\n'),0),
	dl:({
		log,
		dld,
		signal
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
	deploy:({
		log,
		dld,
		svrd,
		bind,
		libd,
		signal,
		arg,
		cfg
	},{x}={})=>(async()=>(
		(await ls(dld)).length||(log(`Auto dl...`),await cmd.dl({log,dld,signal})),
		x=vsort(await ls(dld)).find(x=>x.includes(arg[0]??'bedrock-server')),
		x??await Promise.reject(new Error('File not found.')),
		log(`Extracting...\n`),
		x=await unzip(Bun.file(`${dld}/${x}`)).catch(e=>Promise.reject(new Error('Failed to unzip.'))),
		await rm(bind),
		await Promise.all(x.map(x=>Bun.write(`${bind}/${x.name}`,x))),
		(await ls(svrd,{abs:1})).includes(libd)||(
			log('Init lib dir...\n'),
			await Promise.all(cfg.lib.map(async (x,y)=>(
				y=Bun.file(`${bind}/${x}`),
				await y.exists()?
					await Bun.write(`${libd}/${x}`,y):
					(x.at(-1)=='/'&&await mkdir(`${libd}/${x}`))
			)))
		),
		log('symlink...\n'),
		await Promise.all(cfg.lib.map(async x=>(
			await rm(`${bind}/${x}`),
			// Windows requires Admin or DevMode for symlink...
			await symlink(relative(bind,`${libd}/${x}`),`${bind}/${x}`.replace(/\/$/,''))
		))),
		log(`deploy: Done.\n`),
	))().catch(e=>(log(`${e.message}\ndeploy: Aborted.\n`),e)),
	start:_=>_,
	pkill:_=>_,
	help:({
		log
	})=>log(`known commands:\n${Object.keys(cmd).map(x=>`\t${x}\n`).join('')}`)
};
export{cmd};
