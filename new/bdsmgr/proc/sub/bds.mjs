import{chmod}from'node:fs/promises';
import{delay}from'./util';
import{FlintProc}from'./flint';
export class BDSProc{
	constructor({binf,log,soft_stop_after}){
	}
	log=_=>_;
	proc=null;
	event=new EventTarget();
	td=new TextDecoder();
	static async init(w){return await(new this(w)).init();}
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
			
		Object.assign(this,{// TODO くらす に する
			cmd:x=>(w.stdin.write(x+'\n'),w.stdin.flush()),
			list:async()=>await listen({
				target:w.log,name:'data',
				handler:x=>(
					x.reduce((a,x)=>(!x?a:a?(a.players.push(x),a):
						(x=x.match(/^\[.*?\] There are (?<a>\d+?)\/(?<b>\d+?) players online:$/)?.groups)?{players:[],current:+x.a,max:+x.b}:a
					),null)
				),
				run:_=>w.cmd('list')
			}),
			soft_stop:async()=>(await w.list()).current||w.cmd('stop'),
			xuid:{},
			online:new Set()
		});
		listen({
			target:w.log,name:'data',
			handler:x=>x.reduce((a,x)=>a||x.match(/Version: ([\d\.]+)/)?.[1],0)
		}).then(x=>w.version=x);
		// TODO xuid online
		// w.log.addEventListener('data',_=>_);


		return this;
	}
	async flint(){return await FlintProc.init();}
}
