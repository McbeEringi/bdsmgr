import{BDSMGR}from'./bdsmgr';

(await BDSMGR.init({
	root_path:'~/.bdsmgr'
}))
	.start()
	.openBrowser();
