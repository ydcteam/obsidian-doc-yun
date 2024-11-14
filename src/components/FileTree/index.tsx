import React from "react";
import clsx from "clsx";
import { Transformer } from "markmap-lib/no-plugins";
import Tree, { FileTreeItem } from "@/components/FileTree/tree";
import styles from "./styles.module.scss";

export type Props = {
	mdContent: string;
	readonly className?: string;
};

interface Node {
	content: string;
	children?: Node[];
}

export default function FileTree(props: Props) {
	const { className, mdContent } = props;
	if (mdContent === "") {
		return (
			<div className={clsx(className, styles.treeZone)}>
				<h3 style={{ color: "red" }}>！！传入数据为空！！</h3>
			</div>
		);
	}

	const transformer = new Transformer();
	const { root } = transformer.transform(mdContent);
	// console.log("transformer.transform: root\n", root);

	// const result = parseItems(root);
	// if (typeof result === "string") {
	//     return (
	//         <div className={clsx(className, 'treeZone')}>
	//             <h3 style={{ color: "red" }}>{result}</h3>
	//         </div>
	//     );
	// }

	const counter = { id: 0 };
	const data = parseItems(root, counter);
	if (typeof data === "string") {
		return (
			<div className={clsx(className, styles.treeZone)}>
				<h3 style={{ color: "red" }}>{data}</h3>
			</div>
		);
	}

	return (
		<div className={clsx(className, styles.treeZone)}>
			<Tree data={data.children} />
		</div>
	);
}

const parseContent = (content: string): { content?: string; err?: string } => {
	const p = /<[^>]*>/g;
	if (content === "") {
		return { err: "！！存在空数据！！" };
	}
	content = content.replace(p, "").trim();
	if (content === "") {
		return { err: "！！存在无效的颜色配置！！" };
	}

	return {
		content: content,
	};
};

const parseItems = (
	root: Node,
	counter: { id: number },
): FileTreeItem | string => {
	if (!root.children || root.children.length < 1) {
		const pc = parseContent(root.content);
		if (typeof pc === "string") {
			return pc;
		}
		return { id: `${counter.id}`, name: pc.content };
	}

	const pc = parseContent(root.content);
	if (typeof pc === "string") {
		return pc;
	}
	const newRoot: FileTreeItem = {
		id: `${counter.id}`,
		name: pc.content,
		children: [],
	};
	counter.id++;
	for (const row of root.children) {
		const next = parseItems(row, counter);
		if (typeof next === "string") {
			return next;
		}
		counter.id++;
		newRoot.children.push(next);
	}

	return newRoot;
};
