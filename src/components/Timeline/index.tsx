import clsx from "clsx";
import React from "react";
import { Transformer } from "markmap-lib/no-plugins";
import TimelineAntd from "antd/lib/timeline";
import styles from "./styles.module.scss";

export type Props = {
	mdContent: string;
	readonly className?: string;
	mode?: "left" | "right" | "alternate";
};

export default function Timeline(props: Props) {
	const { className, mdContent, mode = "left" } = props;
	if (mdContent === "") {
		return (
			<div className={clsx(className, styles.timelineZone)}>
				<h3 style={{ color: "red" }}>！！传入数据为空！！</h3>
			</div>
		);
	}

	const transformer = new Transformer();
	const { root } = transformer.transform(mdContent);
	// console.log("transformer.transform: root\n", root);

	const result = parseItems(root);
	if (typeof result === "string") {
		return (
			<div className={clsx(className, styles.timelineZone)}>
				<h3 style={{ color: "red" }}>{result}</h3>
			</div>
		);
	}

	return (
		<div className={clsx(className, styles.timelineZone)}>
			<TimelineAntd mode={mode} items={result} />
		</div>
	);
}

interface Node {
	content: string;
	children?: Node[];
}

const ItemColors = ["blue", "red", "green", "gray"];
type ItemColor = "blue" | "red" | "green" | "gray";

type TimelineItem = {
	label: JSX.Element; // 列表第一级.
	children: JSX.Element; // 列表第二级.
	color?: ItemColor;
};

const lineBlock = (content: any) => (
	<div // eslint-disable-next-line react/no-danger
		dangerouslySetInnerHTML={{ __html: content }}
	></div>
);

const parseColor = (rawColor: string): { color?: ItemColor; err?: string } => {
	const p = /<[^>]*>/g;
	if (rawColor === "") {
		return { err: "！！存在空的颜色配置！！" };
	}
	rawColor = rawColor.replace(p, "").trim();
	if (rawColor === "") {
		return { err: "！！存在无效的颜色配置！！" };
	}
	const idx = ItemColors.indexOf(rawColor);
	if (idx === -1) {
		return {
			err: `！！错误的节点颜色: '${rawColor}'，可选列表: ${ItemColors.join(
				",",
			)}！！`,
		};
	}

	return {
		color: ItemColors[idx] as ItemColor,
	};
};

// 使用无插件的markmap来解析md树.
// 数据格式:
// 两级列表，第一级是时间，第二级是时间. 可选配置：第一级的第二个子节点是时间线节点的颜色: blue(默认)、red、green和gray
// - 20240101
//   - 事件1
//   - red
// - 20240102
//   - 事件2
// - 20240103
//   - 事件3
const parseItems = (root: Node): TimelineItem[] | string => {
	if (!root.children || root.children.length < 1) {
		return [
			{
				label: lineBlock(root.content),
				children: lineBlock(<h3>无数据</h3>),
			},
		];
	}

	const rows: TimelineItem[] = [];
	for (const row of root.children) {
		if (!row.children || row.children.length < 1 || row.children.length > 2) {
			return "！！列表有误，存在没有第二级列表的行！！";
		}

		if (row.children.length > 2) {
			return "！！列表有误，存在第二级列表中有超过两个子节点的行！！";
		}
		let color: ItemColor = "blue";
		if (row.children.length == 2) {
			const pColor = parseColor(row.children[1].content);
			if (pColor.err) {
				return pColor.err;
			}
			color = pColor.color;
		}
		if (row.children[0].children && row.children[0].children.length !== 0) {
			return "！！列表有误，存在三层以上的行！！";
		}
		rows.push({
			color: color,
			label: lineBlock(row.content),
			children: lineBlock(row.children[0].content),
		});
	}

	return rows;
};
