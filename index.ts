// By TheMasterKitty  https://github.com/TheMasterKitty/Moonlit/
//   Distributed under the Boost Software License, Version 1.0.
//     (See accompanying file LICENSE_1_0.txt or copy at
//            https://www.boost.org/LICENSE_1_0.txt)

import { readdirSync } from "fs";
import { Node } from "./node";
import { Interface, createInterface } from "readline";

let nodes: { [key: string]: Node } = {};

console.log("Loading Nodes. . .");

function load() {
	readdirSync(__dirname + "/nodes/", { "withFileTypes": true }).filter(f => f.isDirectory()).filter(node => !(node.name in nodes)).forEach(f => nodes[f.name] = new Node(f.parentPath + "/" + f.name));
	delete require.cache[require.resolve("./console")];
	const { Console } = require("./console");
	const rl: Interface = createInterface({ "input": process.stdin, "output": process.stdout });
	const c = new Console(rl, nodes, load);
	c.question();
}
load();