import clsx from "clsx";
import React from "react";
import D3Tree from "react-d3-tree";
import type { RawNodeDatum } from "react-d3-tree";
import Node from "@/components/MarkmapVertical/tree/node";
import styles from "./styles.module.scss";

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
export interface TreeNode {
	content: string;
	children?: TreeNode[];
}

// 连线类型: diagonal-曲线, elbow-直角线, straight-直线, step-转角直线.
export type PathType = "diagonal" | "elbow" | "straight" | "step";

export type Props = {
	root: TreeNode;
	orientation?: "vertical" | "horizontal";
	pathType?: PathType;
};

const transformTreeNode = (root: TreeNode): RawNodeDatum | undefined => {
	if (root.content === "") {
		root.content = "文档根节点";
	}
	const newRoot: RawNodeDatum = {
		name: root.content,
		children: [],
	};

	if (root.children) {
		root.children.forEach((e) => {
			const node = transformTreeNode(e);
			if (node) {
				newRoot.children.push(node);
			}
		});
	}

	return newRoot;
};

export default function Tree(props: Props): JSX.Element {
	const { root, orientation = "vertical", pathType = "diagonal" } = props;
	// console.log("Tree root:\n", root);
	const newRoot = transformTreeNode(root);
	// console.log("Tree transformed root:\n", newRoot);
	if (!newRoot) {
		return <div>空数据</div>;
	}

	const nodeSize = { x: 150, y: 200 };
	const foreignObjectProps = {
		width: nodeSize.x, // 保持和节点尺寸一致，下同.
		height: nodeSize.y,
		x: 10,
	};

	const dynamicPathClass = ({
		// @ts-expect-error: fine
		target,
	}) => {
		if (!target.children || target.children?.length < 1) {
			return clsx("link", "linkLeaf");
		}

		return clsx("link", "linkBranch");
	};

	return (
		<div style={{ width: "60em", height: "50em" }}>
			<D3Tree
				data={newRoot}
				orientation={orientation}
				pathFunc={pathType}
				nodeSize={nodeSize}
				zoom={0.7}
				pathClassFunc={dynamicPathClass}
				translate={{ x: 600, y: 100 }}
				rootNodeClassName={styles.rootNode}
				branchNodeClassName={styles.branchNode}
				leafNodeClassName={styles.leafNode}
				renderCustomNodeElement={(rd3tProps) =>
					Node({
						...rd3tProps,
						foreignObjectProps,
					})
				}
			/>
		</div>
	);
}
