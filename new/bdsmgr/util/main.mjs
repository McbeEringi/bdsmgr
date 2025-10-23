const
delay=m=>new Promise(f=>setTimeout(f,m)),
listen=({target:t,name:n,handler:h,run:r})=>new Promise((f,_,x)=>(t.addEventListener(n,_=e=>(
	(x=h(e.detail))&&(e.currentTarget.removeEventListener(n,_),f(x))
)),r?.()));


export{delay,listen};
