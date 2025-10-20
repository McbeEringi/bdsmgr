await Promise.all([
	{
		target:'bun-windows-x64',
		outfile:'bdsmgr.exe',
		windows:{
			title:'bdsmgr',
			publisher:'@McbeEringi',
			version:'0.0.0.1',
			description:'Minecraft Bedrock server manager baked with BunJS',
			copyright:'MIT License',
			hideConsole:false,
			icon:'./bdsmgr/assets/img/icon.png'
		},
	},
	{
		target:'bun-linux-x64',
		outfile:'bdsmgr'
	},
].map(async x=>await Bun.build({
	entrypoints:['./main.mjs'],outdir:'./dist',compile:x
})));
