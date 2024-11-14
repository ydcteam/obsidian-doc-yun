import clsx from "clsx";
import React from "react";
import { Transformer } from "markmap-lib/no-plugins";
import styles from "./styles.module.scss";

export type Props = {
	mdContent: string;
	readonly className?: string;
};

interface Node {
	isLeaf?: boolean;
	content: string;
	read?: boolean;
	rowSpan?: number;
	children?: Node[];
}

interface TableCell {
	content: string;
	isLeaf?: boolean;
	rowSpan?: number;
	colSpan?: number;
}

const OutlineTable = (props: Props): JSX.Element => {
	if (props.mdContent === "") {
		return (
			<div className={clsx(props.className, styles.tableZone)}>
				<h3 style={{ color: "red" }}>！！传入数据为空！！</h3>
			</div>
		);
	}

	// 使用无插件的markmap来解析大纲md树.
	const transformer = new Transformer();
	// root = {
	//     "content": "000",
	//     "children": [
	//         {
	//             "content": "xxxx",
	//             "children": [
	//                 {
	//                     "content": "111",
	//                     "children": [
	//                         {
	//                             "content": "111.1",
	//                             "children": []
	//                         },
	//                         {
	//                             "content": "111.2",
	//                             "children": []
	//                         },
	//                         {
	//                             "content": "111.3",
	//                             "children": []
	//                         }
	//                     ]
	//                 },
	//                 {
	//                     "content": "222",
	//                     "children": [
	//                         {
	//                             "content": "333",
	//                             "children": []
	//                         }
	//                     ]
	//                 }
	//             ]
	//         }
	//     ]
	// }
	const { root } = transformer.transform(props.mdContent);
	// console.log("transformer.transform: root\n", root);

	return <div>{buildTable(root, props)}</div>;
};

const buildTable = (root: Node, props: Props) => {
	if (root.children?.length < 1) {
		const tableTitle =
			root.content === "" ? (
				<h3 style={{ color: "red" }}>！！无效大纲！！</h3>
			) : (
				root.content
			);
		return (
			<div className={clsx(props.className, styles.tableZone)}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th colSpan={1}>
								<div className={styles.tableHead}>{tableTitle}</div>
							</th>
						</tr>
					</thead>
				</table>
			</div>
		);
	}

	const { header: headerCell, rows: cellRows } = cellList2TableRow(root);
	// console.log("cellList2TableRow: rows\n", cellRows);
	if (!cellRows) {
		return (
			<div className={clsx(props.className, styles.tableZone)}>
				<table className="table">
					<thead>
						<tr>
							<th colSpan={1}>
								<div className={styles.tableHead}>{headerCell.content}</div>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<h3 style={{ color: "red" }}>！！传入数据为空！！</h3>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		);
	}
	const rows: JSX.Element[] = [];
	for (let i = 0; i < cellRows.length; i++) {
		let line: JSX.Element[] = [];
		for (let j = 0; j < cellRows[i].length; j++) {
			const cell = cellRows[i][j];
			line.push(
				<td key={j} colSpan={cell.colSpan ?? 1} rowSpan={cell.rowSpan ?? 1}>
					<div // eslint-disable-next-line react/no-danger
						dangerouslySetInnerHTML={{ __html: cell.content }}
					></div>
				</td>,
			);
		}

		rows.push(<tr key={i}>{line}</tr>);
		line = [];
	}

	let treeWidth = getLeafNodeNum(root);
	// colSpan是树的宽度 - 1;
	const colSpan = treeWidth - 1;
	const tableTitle =
		headerCell.content === "" ? "文档根节点" : headerCell.content;
	return (
		<div className={clsx(props.className, styles.tableZone)}>
			<table className="table">
				<thead>
					<tr>
						<th colSpan={colSpan <= 0 ? 1 : colSpan}>
							<div className={styles.tableHead}>{tableTitle}</div>
						</th>
					</tr>
				</thead>
				<tbody>{rows}</tbody>
			</table>
		</div>
	);
};

const cellList2TableRow = (
	root: Node,
): { header: TableCell | null; rows: TableCell[][] | null } => {
	const counter = {
		now: 0,
		depth: 0,
	};
	calcTreeDepth(root, counter);
	// console.log("calcTreeDepth: counter\n", counter);

	const cellList = tree2TableCellList(root);
	if (cellList.length < 1) {
		return { header: null, rows: null };
	}

	const header = cellList.shift();

	const rows: TableCell[][] = [];
	let row: TableCell[] = [];
	let leftColSpan = counter.depth;

	// 根据叶子节点将长列表截取为成多行.
	while (true) {
		const cell = cellList.shift();
		if (!cell) {
			break;
		}

		// 到叶子节点即截取为一行.
		if (cell.isLeaf) {
			cell.colSpan = leftColSpan;

			row.push(cell);

			leftColSpan = counter.depth;

			rows.push(row);

			row = [];
			continue;
		}

		cell.colSpan = 1;
		leftColSpan -= 1;

		row.push(cell);
	}

	return {
		header: header,
		rows: rows,
	};
};

// tree2TableCellList 把markmap-lib.Transformer.transform.root转为从上往下、
// 从左往右连接起来的数组.
const tree2TableCellList = (root: Node): TableCell[] => {
	if (!root.children || root.children.length == 0) {
		if (root.read) {
			return [];
		}

		root.read = true;
		return [
			{
				isLeaf: true,
				content: root.content,
				rowSpan: 1,
			},
		];
	}

	let row: TableCell[] = [];
	if (!root.read) {
		root.read = true;
		row.push({
			content: root.content,
			rowSpan: getLeafNodeNum(root), // 行宽根据当前节点的树的宽度.
		});
	}

	for (let i = 0; i < root.children.length; i++) {
		row.push(...tree2TableCellList(root.children[i]));
	}

	return row;
};

const getLeafNodeNum = (root: Node): number => {
	if (!root.children || root.children.length === 0) {
		return 1;
	}

	let num: number = 0;
	for (const node of root.children) {
		num += getLeafNodeNum(node);
	}

	return num;
};

const calcTreeDepth = (root: Node, counter: { now: number; depth: number }) => {
	counter.now++;
	if (!root.children || root.children.length === 0) {
		counter.depth = Math.max(counter.now, counter.depth);
		counter.now = 0;
		return;
	}

	for (const node of root.children) {
		calcTreeDepth(node, counter);
	}
};

export default OutlineTable;
