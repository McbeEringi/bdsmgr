#!/bin/env -S bun

import{BDSMGR}from'./bdsmgr.mjs';
import{ls,rm}from'./util.mjs';
// import{}from'node:fs/promises';

const
svr_id=Bun.argv[2];

// svr_id||await Promise.reject('Server ID not specified!');

const w=await BDSMGR.init({server_id:void 0});
// w.log('hello\nworld!\n');
// w.help();
await w.deploy();
// w.status();
console.log(w)
// w.start();
