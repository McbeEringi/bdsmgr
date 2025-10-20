await Promise.all([
	{
		target:'bun-windows-x64',
		outfile:'bdsmgr.exe',
		windows:{
			title:'bdsmgr',
			publisher:'@McbeEringi',
			version:'0.0.0.1',
			description:'bdsmgr',
			copyright:'MIT License',
			hideConsole:false,
			icon:'./bdsmgr/assets/favicon.ico'
		},
	},
	{
		target:'bun-linux-x64',
		outfile:'bdsmgr'
	},
].map(async x=>await Bun.build({
	entrypoints:['./main.mjs'],outdir:'./dist',compile:x
})));
