/**
 * 重命名操作队列.
 */
import { TFile } from "obsidian";

export interface RenameOpr {
	from: string;
	to: TFile;
}
export class RenameQueue {
	targets: RenameOpr[];

	constructor() {
		this.targets = [];
	}

	add(target: RenameOpr) {
		this.targets.push(target);
		// console.log("rename_queue: add", target);
		// console.log("rename_queue: all", this.targets);
	}

	get(): RenameOpr | undefined {
		const last = this.targets.shift();
		if (last === undefined) {
			return undefined;
		}

		return last;
	}
}
