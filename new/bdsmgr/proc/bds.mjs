import{chmod}from'node:fs/promises';
import{join}from'node:path';
import{delay,listen}from'./util';
import{ProcManager}from'./main';

export class BDSProc{
	constructor(mgr){
		if(!(mgr instanceof ProcManager))throw'mgr?';
		this.event.addEventListener('done',_=>(
			this.mgr.event.dispatchEvent(new CustomEvent('bds:done'))
		));
		this.event.addEventListener('data',({detail})=>(
			this.mgr.event.dispatchEvent(new CustomEvent('bds:data',{detail}))
		)));
		return Object.assign(this,{
			mgr,
			exec:`./bedrock_server${process.platform=='win32'?'.exe':''}`
		});
	}

	mgr=null;
	proc=null;
	event=new EventTarget();
	td=new TextDecoder();

	version=null;

	cmd(x){this.proc.stdin.write(x+'\n');this.proc.stdin.flush();return this;}
	async close(){this.cmd('stop');return await this.proc.exited;}
	async list(){return await listen({
		target:this.event,name:'data',
		handler:w=>w.reduce((a,x)=>(!x?a:a?(a.players.push(x),a):
			(x=x.match(/^\[.*?\] There are (?<a>\d+?)\/(?<b>\d+?) players online:$/)?.groups)?{players:[],current:+x.a,max:+x.b}:a
		),null),
		run:_=>this.cmd('list')
	});}
	async softStopAsync({after:t=0}={}){t&&await delay(t);(await this.list()).current||this.close();return this;}
	softStop(t=0){this.softStopAsync(t);return this;}


	static async init(w){return await new this(w).init();}
	async init(){
		await chmod(join(this.mgr.bin,this.exec),755);
		this.proc=Bun.spawn({cwd:this.mgr.bin,env:{LD_LIBRARY_PATH:'.'},cmd:[this.exec],stdin:'pipe',stdout:'pipe'});
		(async(r,x)=>{
			while(1){
				x=await r.read();if(x.done)break;
				this.event.dispatchEvent(new CustomEvent('data',{detail:this.td.decode(x.value).match(/.+(?=\r?\n)/g)?.map(x=>Object.assign(x,{
					groups:(g=>g&&(g.date=new Date(g.date),g))(
						x.match(/^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}:\d{3}) (?<type>[A-Z]+)\] (?<body>.*)$/)?.groups
					)
				}))}));
				await delay(100);
			}
			this.event.dispatchEvent(new CustomEvent('done'));
		})(this.proc.stdout.getReader());
			
		this.version=await listen({
			target:this.event,name:'data',
			handler:w=>w.reduce((a,x)=>a||x.match(/Version: ([\d\.]+)/)?.[1],0)
		});
		return this;
	}
}
