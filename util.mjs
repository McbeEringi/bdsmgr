import{$}from'bun';

const
ls=async(x,{abs}={})=>(a=>abs?a.map(y=>`${x}/${y}`):a)((await $`ls "${x}"`.nothrow().text()).match(/.+?(?=\n)/g)??[]),
lsdir=async(x='./')=>(await $`cd "${x}"&&ls -d */`.text()).match(/.+?(?=\n)/g)??[],
rm=async x=>(await $`rm -rf "${x}"`.quiet()).exitCode,
mkdir=async x=>(await $`mkdir -p "${x}"`.quiet()).exitCode,
vsort=w=>w.map(x=>Object.assign(x,{v:(x.match(/\d+/g)??[]).map(x=>+x)}))
	.sort(({v:a},{v:b})=>a.length&&b.length?(a.reduce((a,x,i)=>a||Math.sign((b[i]??0)-x),0)):!a.length),

pprop=w=>w.split('\n').reduce((a,x,i)=>(x&&(x=x.trim())[0]!='#'&&([i,x]=x.split('=',2).map(x=>x.trim()),a[i.replace(/-/g,'_')]=x),a),{}),
delay=m=>new Promise(f=>setTimeout(f,m)),
listen=({target:t,name:n,handler:h,run:r})=>new Promise((f,_,x)=>(t.addEventListener(n,_=e=>(
	(x=h(e.detail))&&(e.currentTarget.removeEventListener(n,_),f(x))
)),r?.())),

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
progress=(w,f)=>((r=w.body.getReader(),p=[0,+w.headers.get('content-length')])=>Array.fromAsync({[Symbol.asyncIterator]:_=>(f(p),{next:async x=>(x=(await r.read()).value,x&&(p[0]+=x.length,f(p)),{done:!x,value:x})})}))();

export{
	ls,lsdir,rm,mkdir,vsort,
	pprop,delay,listen,
	unzip,progress
};
