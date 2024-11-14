import React, { useRef, useEffect } from "react";
import { Markmap as MarkmapView } from "markmap-view";
import { Toolbar } from "markmap-toolbar";
import { loadCSS, loadJS } from "markmap-common";
import { Transformer } from "markmap-lib/no-plugins";
import clsx from "clsx";
import {
	pluginFrontmatter,
	pluginCheckbox,
	pluginHljs,
} from "markmap-lib/plugins";
import styles from "./styles.module.scss";

const transformer = new Transformer([
	pluginFrontmatter,
	pluginCheckbox,
	pluginHljs,
]);

function renderToolbar(mm: MarkmapView, wrapper: HTMLElement) {
	while (wrapper?.firstChild) wrapper.firstChild.remove();
	if (mm && wrapper) {
		const toolbar = new Toolbar();
		toolbar.setBrand(false);
		toolbar.attach(mm);
		// // Register custom buttons
		// toolbar.register({
		//   id: "alert",
		//   title: "Click to show an alert",
		//   content: "Alert",
		//   onClick: () => alert("You made it!"),
		// });
		// toolbar.setItems([...Toolbar.defaultItems, "alert"]);
		// Register custom buttons
		toolbar.setItems([...Toolbar.defaultItems]);
		wrapper.append(toolbar.render());
	}
}

export interface Props {
	mdContent: string;
	readonly className?: string;
	readonly svgClassName?: string;
	readonly toolbarClassName?: string;
}

export default function Markmap(props: Props): JSX.Element {
	const { mdContent, className, svgClassName, toolbarClassName } = props;

	useEffect(() => {
		const { scripts, styles } = transformer.getAssets();
		loadCSS(styles);
		loadJS(scripts);
	}, []);

	// Ref for SVG element
	const refSvg = useRef<SVGSVGElement>();
	// Ref for markmap object
	const refMm = useRef<MarkmapView>();
	// Ref for toolbar wrapper
	const refToolbar = useRef<HTMLDivElement>();

	useEffect(() => {
		// Create markmap and save to refMm
		if (refMm.current) return;
		const mm = MarkmapView.create(refSvg.current, {
			autoFit: true,
			zoom: true,
		});
		console.log("MarkmapView.create \n", refSvg.current);
		refMm.current = mm;
		renderToolbar(refMm.current, refToolbar.current);
		// return () => {
		//     mm.destroy();
		// };
	}, [refSvg.current]);

	// run once is enough.
	useEffect(() => {
		// Update data for markmap once value is changed
		const mm = refMm.current;
		if (!mm) return;
		const { root } = transformer.transform(mdContent);
		if (root.content === "") {
			root.content = "文档根节点";
		}
		mm.setData(root);
		mm.fit();
	}, [refMm.current]);

	// const handleChange = (e: {
	//   target: { value: React.SetStateAction<string> };
	// }) => {
	//   setValue(e.target.value);
	// };

	return (
		<div className={clsx(styles.svgContainer, className)}>
			<svg className={clsx(styles.svgZone, svgClassName)} ref={refSvg} />
			<div
				className={clsx(styles.toolbarZone, toolbarClassName)}
				ref={refToolbar}
			></div>
		</div>
	);
}
