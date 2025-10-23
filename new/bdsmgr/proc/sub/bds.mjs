import{chmod}from'node:fs/promises';
import{delay,listen}from'./util';

export class BDSProc{
	constructor(mgr,{binf,log}={}){
		return Object.assign(this,{mgr});
	}
	mgr=null;
	proc;
	log=_=>_;
	proc=null;
	event=new EventTarget();
	td=new TextDecoder();

	version=null;
	xuid={};
	online:new Set();

	cmd(x){this.proc.stdin.write(x+'\n');this.proc.stdin.flush();return this;}
	close(){this.cmd('stop');return this;}
	async list(){return await listen({
		target:this.event,name:'data',
		handler:w=>w.reduce((a,x)=>(!x?a:a?(a.players.push(x),a):
			(x=x.match(/^\[.*?\] There are (?<a>\d+?)\/(?<b>\d+?) players online:$/)?.groups)?{players:[],current:+x.a,max:+x.b}:a
		),null),
		run:_=>this.cmd('list')
	});}
	async softStopAsync({after:t=0}={}){&&await delay(t);(await this.list()).current||this.close();return this;}
	softStop(t=0){this.softStopAsync(t);return this;}
	

	static async init(w){return await new this(w).init();}
	async init(){
		await chmod(this.binf,755);
		this.proc=Bun.spawn({cwd:this.bind,env:{LD_LIBRARY_PATH:'.'},cmd:[`./${this.binn}`],stdin:'pipe',stdout:'pipe'});
		(async(r,x)=>{
			while(1){
				x=await r.read();if(x.done)break;
				this.event.dispatchEvent(new CustomEvent('data',{detail:this.td.decode(x.value).split(/\r?\n/).slice(0,-1).map(x=>Object.assign(
					x,{groups:x.match(/^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d{3}) (?<type>[A-Z]+)\] (?<body>.*)$/)?.groups}
				))}));
				await delay(100);
			}
			this.event.dispatchEvent(new CustomEvent('done'));
		})(this.proc.stdout.getReader());
			
		this.version=await listen({
			target:this.event,name:'data',
			handler:w=>w.reduce((a,x)=>a||x.match(/Version: ([\d\.]+)/)?.[1],0)
		});

		this.addEventListener('done',_=>this.mgr.event.dispatchEvent(new CustomEvent('bds_done')));
		// TODO xuid online
		// w.log.addEventListener('data',_=>_);


		return this;
	}
}
