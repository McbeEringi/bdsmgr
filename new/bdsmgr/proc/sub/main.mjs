import{BDSProc}from'./bds';
import{FlintProc}from'./flint';

export class SubProcManager{
	constructor(){}
	proc=null;// FlintProc
	bin=`bin`;// BDSProc
	event=new EventTarget();
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
			['bds:done'],
			['flint:req_open']
		].forEach(x=>this.event.addEventListner(...x));
		return this;
	}
}
