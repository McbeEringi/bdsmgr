export default{
	// port:3000,
	udp_port:19132,
	dir:{
		dl:'downloads',
		svr:'servers',
		per_svr:{
			exe:'exe',
			src:'src'
		}
	},
	src:[
		'worlds/',
		'allowlist.json',
		'permissions.json',
		'server.properties'
	],
	auth:{
		admin:'admin'
	},
	auto_start:true,
	auto_stop:true,
	webhook:[
	]
};
