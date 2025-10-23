import{BDSProc}from'./bds';
import{FlintProc}from'./flint';

export class ProcManager{
	proc=null;
	event=new EventTarget();
	constructor(){}
	close(){this.proc?.close();return this;}
	async bds(){this.close();this.proc=await BDSProc.init(this);return this;}
	async flint(){this.close();this.proc=await FlintProc.init(this);return this;}

	static async init(w){return await new this(w).init();}
	async init(){
		[
			['bds_done'],
			['flint_req_open']
		].forEach(x=>this.event.addEventListner(...x));
		return this;
	}
}
