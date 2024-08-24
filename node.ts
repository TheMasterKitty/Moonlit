// By TheMasterKitty  https://github.com/TheMasterKitty/Moonlit/
//   Distributed under the Boost Software License, Version 1.0.
//     (See accompanying file LICENSE_1_0.txt or copy at
//            https://www.boost.org/LICENSE_1_0.txt)

import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import axios from "axios";
const pidusage = require("pidusage");

import { useEmojis, errorHook, outputHook } from "./config.json";

function send(name: string, text: string, type: boolean) {
	if (type ? errorHook : outputHook != null)
		return axios.post(type ? errorHook : outputHook, { "content": "## " + name + "\n\n" + text });
	else
		return Promise.resolve();
}

const texts = {
	"started": useEmojis ? "🟢 Process started" : "Process started",
	"exited": useEmojis ? "🔴 Process exited" : "Process exited"
}

export class Node {
	public dir: string;
	public name: string;
	public description: string;
	public startcmd: string;
	public running: ChildProcessWithoutNullStreams | null = null;
	public out: string[] = ["Progam is offline."];
	public err: boolean = false;
	private lastread: number = 1;
	constructor(dir: string) {
		this.dir = dir;
		if (existsSync(dir + "/node.json")) {
			const config = JSON.parse(readFileSync(dir + "/node.json").toString());
			this.name = config.name;
			this.startcmd = config.startcmd;
			this.description = config.description;
		}
		else {
			const config = { "name": dir.split("/").reverse().at(0) ?? "", "description": "", "startcmd": "" };
			writeFileSync(dir + "/node.json", JSON.stringify(config));
			this.name = config.name;
			this.startcmd = config.startcmd;
			this.description = config.description;
		}
	}
	public getNew() {
		return this.out.length - this.lastread;
	}
	public read() {
		this.err = false;
		const sliced = this.out.slice(this.lastread);
		this.lastread = this.out.length;
		return sliced;
	}
	public save() {
		if (!existsSync(this.dir)) mkdirSync(this.dir, { "recursive": true })
		writeFileSync(this.dir + "/node.json", JSON.stringify({ "name": this.name, "description": this.description, "startcmd": this.startcmd }));
	}
	public start() {
		if (this.startcmd != null && this.running == null) {
			this.err = false;
			this.running = spawn(this.startcmd.split(" ")[0], this.startcmd.split(" ").slice(1), { "cwd": this.dir });
			this.out = [texts.started];
			this.lastread = 1;
			this.running.stdout.on("data", async (data: Buffer) => {
				this.out.push(data.toString().trim());
				try {
					await send(this.name, data.toString().trim(), false);
				} catch { };
			});
			this.running.stderr.on("data", async (data: Buffer) => {
				this.out.push(data.toString().trim());
				this.err = true;
				try {
					await send(this.name, data.toString().trim(), true);
				} catch { };
			});
			this.running.on("close", async (code: number | null, signal: NodeJS.Signals | null) => {
				this.out.push(texts.exited + (code != null ? " with code " + code : "") + (signal != null ? " and signal " + signal : ""));
				try {
					await send(this.name, texts.exited + (code != null ? " with code " + code : "") + (signal != null ? " and signal " + signal : ""), false);
				} catch { };
				this.running = null;
			});
		}
	}
	public stop() {
		if (this.running != null) {
			if (this.running.kill("SIGKILL")) {
				this.running = null;
			}
			else {
				console.log("Process was unable to be killed.");
			}
		}
	}
	public async stats() {
		if (this.running != null && this.running.pid != null) {
			return await pidusage(this.running.pid);
		}
		return { "cpu": 0, "ram": 0, "elapse": 0 };
	}
	public send(data: String) {
		if (this.running != null) {
			this.running.stdin.write(data + "\n");
		}
	}
}