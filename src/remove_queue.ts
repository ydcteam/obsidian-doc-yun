/**
 * 删除操作队列.
 */
import { TFile } from "obsidian";

export interface RemoveOpr {
	target: TFile;
}
export class RemoveQueue {
	targets: RemoveOpr[];

	constructor() {
		this.targets = [];
	}

	add(target: RemoveOpr) {
		this.targets.push(target);
	}

	get(): RemoveOpr | undefined {
		const last = this.targets.shift();
		if (last === undefined) {
			return undefined;
		}

		return last;
	}
}
