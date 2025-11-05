import{SubProcManager}from'./sub';
import{Log}from'./log';

export class Proc{
	constructor(){}
	static async init(w){return await(new this(w)).init();}
	async init(){}
}
