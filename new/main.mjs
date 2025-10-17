#!/bin/env -S bun
import{BDSMGR}from'./bdsmgr';

const
w=await BDSMGR.init({root_path:'./'});

w.start();
