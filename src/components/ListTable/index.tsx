import React from "react";
import clsx from "clsx";
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

const ListTable = (props: Props): JSX.Element => {
	const { className, mdContent } = props;

	if (mdContent === "") {
		return (
			<div className={clsx(className, styles.tableZone)}>
				<h3 style={{ color: "red" }}>！！传入数据为空！！</h3>
			</div>
		);
	}

	// 使用无插件的markmap来解析大纲md树.
	const transformer = new Transformer();
	const { root } = transformer.transform(mdContent);
	// console.log("transformer.transform: root\n", root);

	return <div>{buildTable(root, className)}</div>;
};

const buildTable = (root: Node, className: string) => {
	if (root.children?.length < 1) {
		const tableTitle =
			root.content === "" ? (
				<h3 style={{ color: "red" }}>！！无效数据！！</h3>
			) : (
				root.content
			);
		return (
			<div className={clsx(className, styles.tableZone)}>
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

	const {
		header: headerCell,
		rows: cellRows,
		errMsg,
	} = cellList2TableRow(root);
	if (errMsg) {
		return <h3 style={{ color: "red" }}>{errMsg}</h3>;
	}

	// console.log("cellList2TableRow: rows\n", cellRows);
	if (!cellRows) {
		return (
			<div className={clsx(className, styles.tableZone)}>
				<table className={styles.table}>
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

	// colSpan是树的宽度 - 1;
	const colSpan = headerCell.colSpan;
	const tableTitle =
		headerCell.content === "" ? "文档根节点" : headerCell.content;
	return (
		<div className={clsx(className, styles.tableZone)}>
			<table className={styles.table}>
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
): { header?: TableCell; rows?: TableCell[][]; errMsg?: string } => {
	let rows: TableCell[][] = [];
	let colCount = 0;
	for (const cell of root.children) {
		const cellList = tree2TableCellList(cell);
		if (typeof cellList === "string") {
			return {
				errMsg: cellList,
			};
		}
		if (colCount === 0) {
			colCount = cellList.length;
		} else {
			if (colCount !== cellList.length) {
				return {
					errMsg: "！！无效数据，有深度不一致的行，请核对！！",
				};
			}
		}
		rows.push(cellList);
	}

	let counter = { now: 0, depth: 0 };
	calcTreeDepth(root, counter);
	return {
		header: {
			colSpan: counter.depth,
			content: root.content,
		}, // 第一行为表头.,
		rows: rows,
	};
};

const tree2TableCellList = (root: Node): TableCell[] | string => {
	if (!root.children || root.children.length == 0) {
		return [
			{
				isLeaf: true,
				content: root.content,
				rowSpan: 1,
			},
		];
	}

	let row: TableCell[] = [];
	row.push({
		content: root.content,
		rowSpan: getLeafNodeNum(root), // 行宽根据当前节点的树的宽度.
	});

	// 只取一个(最前面/最左边)子节点.
	if (root.children.length !== 1) {
		return "！！无效数据，有多个兄弟子节点的行，请核对！！";
	}
	const children = tree2TableCellList(root.children[0]);
	if (typeof children === "string") {
		return children;
	}
	row.push(...children);

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

export default ListTable;
