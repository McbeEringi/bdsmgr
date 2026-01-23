import{BDSProc}from'./bds';
import{FlintProc}from'./flint';
import{LogProc}from'./log';

export class ProcManager{
	constructor(dir){}
	proc=null;
	log=await LogProc.init(this);
	bin_dir=`bin`;// BDSProc
	log_dir=`log`;// LogProc
	event=new EventTarget();
	prop={};
	// TODO xuid online
	// msg2obj(w){return w.body.split(',').reduce((a,x,i)=>(
	// 	[i,x]=x.split(':'),
	// 	a[i.match(/\S+/)[0].toLowerCase()]=x.trim(),
	// 	a
	// ),w);}

	async close(){await this.proc?.close();return this;}
	async bds(){await this.close();this.proc=await BDSProc.init(this);return this;}
	async flint(){await this.close();this.proc=await FlintProc.init(this);return this;}

	static async init(w){return await new this(w).init();}
	async init(){
		[
			['bds:done',async()=>(
				await this.flint()
			)],
			['flint:req_open',async()=>(
				await this.bds(),
				this.proc.softStop({after:10*1e3})
			)]
		].forEach(x=>this.event.addEventListner(...x));
		return this;
	}
}
