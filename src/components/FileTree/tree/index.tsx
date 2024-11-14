import React from "react";
import clsx from "clsx";
import { useState } from "react";
import {
	CursorProps,
	NodeRendererProps,
	Tree as FTree,
	NodeApi,
} from "react-arborist";

import FolderFilled from "@ant-design/icons/FolderFilled";
import FileFilled from "@ant-design/icons/FileFilled";
import FolderOpenFilled from "@ant-design/icons/FolderOpenFilled";
import CaretDownFilled from "@ant-design/icons/CaretDownFilled";
import CaretRightFilled from "@ant-design/icons/CaretRightFilled";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import Input from "antd/lib/input";

import styles from "./styles.module.scss";

export type Props = {
	data: FileTreeItem[];
	width?: number;
	height?: number;
};

export type FileTreeItem = {
	id: string;
	name: string;
	children?: FileTreeItem[];
};

export default function Tree(props: Props) {
	const { data, width = 400, height = 800 } = props;
	// console.log("data", data);

	const [term, setTerm] = useState("");
	return (
		<div className={styles.treeZone}>
			<div>
				<Input
					addonBefore={<SearchOutlined />}
					placeholder="搜索..."
					onChange={(e) => {
						setTerm(e.target.value);
					}}
				/>
			</div>
			<FTree
				initialData={data}
				width={width}
				height={height}
				rowHeight={32}
				renderCursor={Cursor}
				searchTerm={term}
				paddingBottom={32}
				disableEdit={() => true}
				disableDrag={() => true}
			>
				{Node}
			</FTree>
		</div>
	);
}

function Node({ node, style, dragHandle }: NodeRendererProps<FileTreeItem>) {
	let Icon = FileFilled;
	if (node.data.children) {
		Icon = FolderFilled;
		if (node.isOpen) {
			Icon = FolderOpenFilled;
		}
	}

	return (
		<div
			ref={dragHandle}
			style={style}
			className={clsx(styles.node, node.state)}
			onClick={() => node.isInternal && node.toggle()}
		>
			<FolderArrow node={node} />
			<span className={styles.nodeIcon}>
				<Icon />
			</span>
			<span className={styles.nodeData}>{node.data.name}</span>
		</div>
	);
}

function FolderArrow({ node }: { node: NodeApi<FileTreeItem> }) {
	if (node.isLeaf) return <span></span>;
	return (
		<span className={styles.nodeArrow}>
			{node.isOpen ? <CaretDownFilled /> : <CaretRightFilled />}
		</span>
	);
}

function Cursor({ top, left }: CursorProps) {
	return <div className={styles.dropCursor} style={{ top, left }}></div>;
}
