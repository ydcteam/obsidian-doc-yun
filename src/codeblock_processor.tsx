import React from "react";
import ReactDOM from "react-dom/client";
import { MarkdownPostProcessorContext } from "obsidian";
import OutlineTable from "@/components/OutlineTable";
import Echarts from "@/components/Echarts";
import FileTree from "@/components/FileTree";
import ListTable from "@/components/ListTable";
import Markmap from "@/components/Markmap";
import Timeline from "@/components/Timeline";
import MarkmapVertical from "@/components/MarkmapVertical";

export function renderOutlineTable(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	// console.log("rendering code block outlineTable:", source, el, ctx);
	const root = ReactDOM.createRoot(el);
	root.render(<OutlineTable mdContent={source} />);
}

export function renderListTable(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	// console.log("rendering code block listTable:", source, el, ctx);
	const root = ReactDOM.createRoot(el);
	root.render(<ListTable mdContent={source} />);
}

export function renderEcharts(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	// console.log("rendering code block echarts:", source, el, ctx);
	const root = ReactDOM.createRoot(el);
	// TODO: 读取参数，例如title
	root.render(<Echarts data={source} />);
}

export function renderFileTree(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	// console.log("rendering code block fileTree:", source, el, ctx);
	const root = ReactDOM.createRoot(el);
	root.render(<FileTree mdContent={source} />);
}

export function renderMarkmap(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	console.log("rendering code block: markmap", source, el, ctx);
	const root = ReactDOM.createRoot(el);
	root.render(<Markmap mdContent={source} />);
}

export function renderMarkmapVertical(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	console.log("rendering code block: markmapVertical", source, el, ctx);
	const root = ReactDOM.createRoot(el);
	root.render(<MarkmapVertical mdContent={source} />);
}

export function renderTimeLine(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
) {
	console.log("rendering code block timeline:", source, el, ctx);
	const root = ReactDOM.createRoot(el);
	root.render(<Timeline mdContent={source} />);
}
