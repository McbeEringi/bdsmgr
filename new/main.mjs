import{BDSMGR}from'./bdsmgr';

const
w=await BDSMGR.init({root_path:'~/.bdsmgr'});

w.start();

await Bun.$`${{
	darwin:'open',
	freebsd:'xdg-open',
	linux:'xdg-open',
	openbsd:'xdg-open',
	win32:'start'
}[process.platform]} http://localhost:3000/`;
