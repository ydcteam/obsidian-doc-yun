import React, { useEffect } from "react";
import clsx from "clsx";
import { loadCSS, loadJS } from "markmap-common";
import { Transformer } from "markmap-lib/no-plugins";
import {
	pluginFrontmatter,
	pluginCheckbox,
	pluginHljs,
} from "markmap-lib/plugins";
import Tree from "@/components/MarkmapVertical/tree";
import "markmap-toolbar/dist/style.css";
import styles from "./styles.module.scss";

const transformer = new Transformer([
	pluginFrontmatter,
	pluginCheckbox,
	pluginHljs,
]);

export interface Props {
	readonly mdContent: string;

	readonly className?: string;
}

export default function MarkmapVertical(props: Props): JSX.Element {
	const { mdContent, className } = props;

	useEffect(() => {
		const { scripts, styles } = transformer.getAssets();
		loadCSS(styles);
		loadJS(scripts);
	}, []);

	const { root } = transformer.transform(mdContent);

	return (
		<div className={clsx(styles.zone, className)}>
			<Tree root={root} />
		</div>
	);
}
