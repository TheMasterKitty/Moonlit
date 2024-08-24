// By TheMasterKitty  https://github.com/TheMasterKitty/Moonlit/
//   Distributed under the Boost Software License, Version 1.0.
//     (See accompanying file LICENSE_1_0.txt or copy at
//            https://www.boost.org/LICENSE_1_0.txt)

import { Interface } from "readline";
import { Node } from "./node";
import { ChildProcess, spawn } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";

function formatTime(seconds: number) {
	if (seconds == 0) return "N/A";
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	const parts: string[] = [];
	if (days > 0) parts.push(`${days} days`);
	if (hours > 0) parts.push(`${hours} hours`);
	if (minutes > 0) parts.push(`${minutes} minutes`);
	if (secs > 0) parts.push(`${secs} seconds`);

	return parts.join(", ");
}

enum CreatingPart {
	Name,
	Description,
	StartCMD
}

class Creating {
	public part: CreatingPart = CreatingPart.Name;
	public name: string = "";
	public description: string = "";
}
import { useEmojis } from "./config.json";

const numbers: string[] = useEmojis ? "0️⃣.1️⃣.2️⃣.3️⃣.4️⃣.5️⃣.6️⃣.7️⃣.8️⃣.9️⃣.🔟 ➕".split(".") : "0.1.2.3.4.5.6.7.8.9.10+".split(".");
const logo: string = "┌─────────────────────────────────────────────────────────────────┐\n│                                                                 │\n│   ███╗   ███╗ ██████╗  ██████╗ ███╗   ██╗██╗     ██╗████████╗   │\n│   ████╗ ████║██╔═══██╗██╔═══██╗████╗  ██║██║     ██║╚══██╔══╝   │\n│   ██╔████╔██║██║   ██║██║   ██║██╔██╗ ██║██║     ██║   ██║      │\n│   ██║╚██╔╝██║██║   ██║██║   ██║██║╚██╗██║██║     ██║   ██║      │\n│   ██║ ╚═╝ ██║╚██████╔╝╚██████╔╝██║ ╚████║███████╗██║   ██║      │\n│   ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝      │\n│                                                                 │\n└─────────────────────────────────────────────────────────────────┘";

export class Console {
	private node: Node | null = null;
	private readonly rl: Interface;
	private readonly nodes: { [key: string]: Node };
	private creating: Creating | null = null;
	private modifying: CreatingPart | null = null;
	private modifyingnode: string | null = null;
	private lastlen: number = 0;
	private livelist: boolean = false;
	private reload: any;
	private lasttext: string = "";
	private procs: Set<ChildProcess> = new Set<ChildProcess>();

	constructor(rl: Interface, nodes: { [key: string]: Node }, reload: any) {
		this.reload = reload;
		this.execute = this.execute.bind(this);

		this.rl = rl;
		this.nodes = nodes;

		setInterval(() => {
			if (this.node != null) {
				if (this.node.getNew() > 0) {
					this.node.read().forEach(line => console.log(line.toString()));
				}
			}
			else if (this.livelist == true) {
				let ntext = "";
				Object.values(this.nodes).forEach(node => {
					ntext += `${node.running != null ? (useEmojis ? "🟢" : "[ON]") : (useEmojis ? "🔴" : "[OFF]")}  ${node.name} - ${node.description} ${numbers[Math.min(10, node.getNew())]} ${node.err ? (useEmojis ? "⚠️" : "[!]") : ""}\n`;
				});
				if (this.lasttext != ntext) {
					this.lasttext = ntext;
					let text = "\x1Bc" + logo + "\n" + ntext;
					text += "Live List Active! Type anything to stop.\n";
					process.stdout.write(text);
				}
			}
		}, 100);
		process.stdout.write("\x1Bc");
		this.logo();
	}
	public question() {
		this.rl.question("", this.execute);
	}
	private logo() {
		console.log(logo);
	}
	private async execute(command: string) {
		if (this.livelist == true && !command.startsWith("read") && !command.startsWith("start") && !command.startsWith("stop")) {
			this.livelist = false;
			this.lasttext = "";
		}
		if (this.creating != null) {
			if (command == "cancel") {
				console.log("Cancelled");
				this.creating = null;
				this.question();
				return;
			}
			if (this.creating.part == CreatingPart.Name) {
				if (existsSync(__dirname + "/nodes/" + command)) {
					this.creating = null;
					console.log("That node already exists!");
					this.question();
					return;
				}
				if (command.split(" ").length > 1) {
					console.log("Names can only be 1 word long!");
					this.question();
					return;
				}
				this.creating.name = command;
				this.creating.part = CreatingPart.Description;
				console.log("Node Description:");
			}
			else if (this.creating.part == CreatingPart.Description) {
				this.creating.description = command;
				this.creating.part = CreatingPart.StartCMD;
				console.log("Node Start Command:");
			}
			else if (this.creating.part == CreatingPart.StartCMD) {
				mkdirSync(__dirname + "/nodes/" + this.creating.name, { "recursive": true });
				writeFileSync(__dirname + "/nodes/" + this.creating.name + "/node.json", JSON.stringify({ "name": this.creating.name, "description": this.creating.description, "startcmd": command }));
				this.nodes[this.creating.name] = new Node(__dirname + "/nodes/" + this.creating.name);
				console.log("Node Created!");
				this.creating = null;
			}
			this.question();
			return;
		}
		else if (this.modifying != null && this.modifyingnode != null) {
			if (this.modifying == CreatingPart.Description) {
				this.nodes[this.modifyingnode].description = command;
			}
			else if (this.modifying == CreatingPart.StartCMD) {
				this.nodes[this.modifyingnode].startcmd = command;
			}
			console.log("Node modified!");

			this.modifying = null;
			this.modifyingnode = null;
			this.question();
			return;
		}

		if (this.node != null) {
			if (command.startsWith("help")) {
				console.log("Node Commands:\nback - navigates out of node\nstats - checks cpu usage\npower - toggles the nodes power\nrestart - restarts node\nstart/stop - does the same thing as power just cancels if the node is already running/off\ninfo - shows info about this node\nhelp - shows this help menu\ncls - clears screen\n.(anything) - runs in node's stdin");
			}
			else if (command.startsWith("back")) {
				this.node = null;
				process.stdout.write("\x1Bc");
				this.logo();
			}
			else if (command.startsWith("stats")) {
				const stats = await this.node.stats();
				console.log(`Node Stats  >  ${stats.cpu.toFixed(1)}% CPU    ${Math.round((stats.memory ?? 0) / 1048576)}MB    Uptime ${formatTime(Math.round((stats.elapsed ?? 0) / 1000))}`);
			}
			else if (command.startsWith("restart")) {
				if (this.node.running != null) {
					this.node.stop();
					this.node.start();
					console.log("Node Restarted!");
				}
				else {
					console.log("Node was not running.");
				}
			}
			else if (command.startsWith("power")) {
				if (this.node.running != null) this.node.stop();
				else this.node.start();
				console.log("Node powered " + (this.node.running != null ? "on" : "off"));
			}
			else if (command.startsWith("start")) {
				if (this.node.running == null) {
					this.node.start();
					console.log("Node Started!");
				}
				else {
					console.log("Node is already running!");
				}
			}
			else if (command.startsWith("stop")) {
				if (this.node.running != null) {
					this.node.stop();
				}
				else {
					console.log("Node is not running!");
				}
			}
			else if (command.startsWith("power")) {
				if (this.node.running != null) this.node.stop();
				else this.node.start();
				console.log("Node powered " + (this.node.running != null ? "on" : "off"));
			}
			else if (command.startsWith("info")) {
				console.log(`Node: ${this.node.name} - ${this.node.description}`);
			}
			else if (command.startsWith("cls")) {
				process.stdout.write("\x1Bc");
				this.logo();
				this.node.out.forEach(line => console.log(line));
			}
			else if (command.startsWith(".")) {
				this.lastlen++;
				this.node.out.push("> " + command.substring(1));
				this.node.send(command.substring(1));
			}
			else {
				console.log("Unknown Command! Type 'help' for help. If you meant to put this into the node's stdin, use the prefix '.'");
			}
		}
		else {
			if (command.startsWith("help")) {
				console.log("Commands:\nlist - lists all nodes\nlivelist - constantly lists all nodes\nread (node) - marks all nodes/a specific node as read\nexec <command> - runs a child_process with output printed out\nstopexec - stops all running processes with exec\nstart (node) - starts all nodes at once or a specific node\nstop (node) - stops all nodes at once or a specific node\ncreate - creates a new node\nmodify <node> <description/startcmd> - modifies a node\ndelete <node> confirm - deletes a node\nopen <node> - navigates to a node\ncls - clears screen\nquit - exits\nreload - reloads commands\nhelp - shows this help menu");
			}
			else if (command.startsWith("exec")) {
				const proc = spawn(command.split(" ")[1], command.split(" ").slice(2));
				proc.stdout.on("data", (data: Buffer) => {
					console.log(data.toString().trim());
				});
				proc.stderr.on("data", (data: Buffer) => {
					console.log(data.toString().trim());
				});
				this.procs.add(proc);
				proc.on("exit", () => this.procs.delete(proc));
			}
			else if (command.startsWith("stopexec")) {
				this.procs.forEach(process => {
					if (process.kill("SIGKILL")) {
						console.log("Killed " + process.spawnfile);
						this.procs.delete(process);
					}
					else {
						console.log("Failed to kill " + process.spawnfile);
					}
				});
			}
			else if (command.startsWith("list")) {
				if (Object.values(this.nodes).length == 0) {
					console.log("No nodes exist!");
				}
				else {
					Object.values(this.nodes).forEach(async node => {
						const stats = await node.stats();
						console.log(`${node.running != null ? (useEmojis ? "🟢" : "[ON]") : (useEmojis ? "🔴" : "[OFF]")}  ${node.name} - ${node.description} ${numbers[Math.min(10, node.getNew())]} ${node.err ? (useEmojis ? "⚠️" : "[!]") : ""}  ${stats.cpu.toFixed(1)}% CPU  ${Math.round((stats.memory ?? 0) / 1048576)}MB`);
					});
				}
			}
			else if (command.startsWith("livelist")) {
				if (Object.values(this.nodes).length == 0) {
					console.log("No nodes exist for a livelist to be shown!");
				}
				else {
					this.livelist = true;
				}
			}
			else if (command.startsWith("read")) {
				if (Object.values(this.nodes).length == 0) {
					console.log("No nodes exist!");
				}
				if (command.split(" ").length == 1) {
					Object.values(this.nodes).forEach(node => node.read());
					console.log("All nodes were marked as read!");
				}
				else {
					if (command.split(" ")[1] in this.nodes) {
						this.nodes[command.split(" ")[1]].read();
						console.log("Marked " + command.split(" ")[1] + " as read.");
					}
					else {
						console.log("Node not found: " + command.split(" ")[1]);
					}
				}
			}
			else if (command.startsWith("start")) {
				if (Object.values(this.nodes).filter(node => node.running == null).length == 0) {
					console.log("No non-running nodes exist!");
				}
				else if (command.split(" ").length == 1) {
					Object.values(this.nodes).filter(node => node.running == null).forEach(node => {
						node.start();
						console.log("Started " + node.name);
					});
				}
				else {
					if (command.split(" ")[1] in this.nodes) {
						if (this.nodes[command.split(" ")[1]] == null) {
							console.log("Node was already running");
						}
						else {
							this.nodes[command.split(" ")[1]].start();
							console.log("Started " + command.split(" ")[1]);
						}
					}
					else {
						console.log("Node not found: " + command.split(" ")[1]);
					}
				}
			}
			else if (command.startsWith("stop")) {
				if (Object.values(this.nodes).filter(node => node.running != null).length == 0) {
					console.log("No running nodes exist!");
				}
				if (command.split(" ").length == 1) {
					Object.values(this.nodes).filter(node => node.running != null).forEach(node => {
						node.stop();
						console.log("Stopped " + node.name);
					});
				}
				else {
					if (command.split(" ")[1] in this.nodes) {
						if (this.nodes[command.split(" ")[1]] == null) {
							console.log("Node was not running");
						}
						else {
							this.nodes[command.split(" ")[1]].stop();
							console.log("Stopped " + command.split(" ")[1]);
						}
					}
					else {
						console.log("Node not found: " + command.split(" ")[1]);
					}
				}
			}
			else if (command.startsWith("create")) {
				this.creating = new Creating();
				console.log("Node Name:");
			}
			else if (command.startsWith("modify")) {
				if (command.split(" ").length != 3) {
					console.log("Usage: modify <node> <description/startcmd>");
					this.question();
					return;
				}
				if (command.split(" ")[1] in this.nodes) {
					if (command.split(" ")[2] == "description") this.modifying = CreatingPart.Description;
					else if (command.split(" ")[2] == "startcmd") this.modifying = CreatingPart.StartCMD;
					else {
						console.log("Invalid type");
						this.question();
						return;
					}
					this.modifyingnode = command.split(" ")[1];
					console.log("Enter the new " + this.modifying.toString());
				}
				else {
					console.log("Node Not Found!");
				}
			}
			else if (command.startsWith("delete")) {
				if (command.split(" ").length != 3) {
					console.log("Usage: delete <node> confirm");
					this.question();
					return;
				}
				if (command.split(" ")[1] in this.nodes) {
					if (command.endsWith(" confirm")) {
						const node = this.nodes[command.split(" ")[1]];
						node.stop();
						rmSync(node.dir, { "recursive": true, "force": true });
						delete this.nodes[command.split(" ")[1]];
						console.log("Node was deleted.");
					}
					else {
						console.log("Add 'confirm' to the end to confirm this node deletion!");
					}
				}
				else {
					console.log("Node Not Found!");
				}
			}
			else if (command.startsWith("open")) {
				if (command.split(" ").length != 2) {
					console.log("Usage: open <node>");
					this.question();
					return;
				}
				if (command.split(" ")[1] in this.nodes) {
					process.stdout.write("\x1Bc");
					this.logo();
					this.node = this.nodes[command.split(" ")[1]];
					this.node.out.forEach(line => console.log(line.toString()));
					this.node.read();
				}
				else {
					console.log("Node Not Found!");
				}
			}
			else if (command.startsWith("cls")) {
				process.stdout.write("\x1Bc");
				this.logo();
			}
			else if (command.startsWith("quit")) {
				Object.values(this.nodes).forEach(node => node.stop());
				process.exit(0);
			}
			else if (command.startsWith("reload")) {
				this.rl.close();
				this.reload();
				return;
			}
			else {
				console.log("Unknown Command! Type 'help' for help.");
			}
		}
		this.question();
	}
}