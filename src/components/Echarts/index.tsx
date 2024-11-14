import React from "react";
import clsx from "clsx";
import { init as EchartsInit } from "echarts";
import { useEffect, useRef, useState } from "react";
import {
	EchartsType as EchartsTypeLine,
	createTypeLineEchartsOpts,
} from "@/components/Echarts/line";
import {
	EchartsType as EchartsTypeBar,
	createTypeBarEchartsOpts,
} from "@/components/Echarts/bar";
import {
	EchartsType as EchartsTypePie,
	createTypePieEchartsOpts,
} from "@/components/Echarts/pie";
import {
	EchartsType as EchartsTypeScatter,
	createTypeScatterEchartsOpts,
} from "@/components/Echarts/scatter";
import {
	EchartsOptCreator,
	EchartsOpts,
	Props,
} from "@/components/Echarts/opts";
import styles from "./styles.module.scss";

export default function Echarts(props: Props): JSX.Element {
	const {
		title,
		data,
		chartStyle,
		loading,
		style: mainStyle,
		className,
		chartClassName,
		noDataMsg,
	} = props;

	const [chartInst, setChartInst] = useState(null);
	const [chartOpts, setChartOpts] = useState({});
	const chartInstRef = useRef();
	const [showError, setShowError] = useState(false);
	const [errMsg, setErrMsg] = useState(noDataMsg ? noDataMsg : "图表解析错误");

	const newStyle = {
		height: 300,
		with: 600,
		...chartStyle,
	};

	// 不同类型图表.
	let optsHandler: Record<string, EchartsOptCreator> = {};
	optsHandler[EchartsTypeLine] = createTypeLineEchartsOpts;
	optsHandler[EchartsTypeBar] = createTypeBarEchartsOpts;
	optsHandler[EchartsTypeBar] = createTypeBarEchartsOpts;
	optsHandler[EchartsTypePie] = createTypePieEchartsOpts;
	optsHandler[EchartsTypeScatter] = createTypeScatterEchartsOpts;

	useEffect(() => {
		const echartsDataOpts = parseChartData(data);
		if (echartsDataOpts === undefined) {
			setErrMsg("解析数据失败");
			setShowError(true);
			return;
		}
		if (optsHandler[echartsDataOpts.chartTypeData.data]) {
			const opts = optsHandler[echartsDataOpts.chartTypeData.data](
				echartsDataOpts,
				title,
			);
			if (typeof opts === "string") {
				setErrMsg(opts);
				setShowError(true);
				return;
			}
			setChartOpts(opts);
			return;
		}
		setErrMsg("暂不支持该图表类型: " + echartsDataOpts.chartTypeData.data);
		setShowError(true);
	}, [data]);

	useEffect(() => {
		let inst: any;
		const loadEcharts = async () => {
			// TODO: 支持siteConfig配置主题.
			let theme: string | undefined = undefined;
			// theme = 'dark'
			const inst = EchartsInit(chartInstRef.current, theme, {
				locale: "zh",
			});
			inst.setOption(chartOpts);
			setChartInst(inst);
		};

		loadEcharts();

		return () => {
			if (inst) {
				inst.dispose();
			}
			setChartInst(null);
		};
	}, [chartOpts]);

	useEffect(() => {
		if (!chartInst) {
			return;
		}

		if (loading) {
			chartInst.showLoading();
			return;
		}

		chartInst.hideLoading();
	}, [loading, chartInst]);

	useEffect(() => {
		const onResize = () => {
			if (!chartInst) {
				return;
			}
			chartInst.resize();
		};

		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
		};
	}, []);

	if (showError) {
		return (
			<div style={mainStyle} className={clsx("chartWrapper", className)}>
				<h4 className={styles.errMsg}>=== 表格错误: {errMsg} ===</h4>
			</div>
		);
	}

	return (
		<div style={mainStyle} className={clsx(styles.chartWrapper, className)}>
			<div
				ref={chartInstRef}
				style={newStyle}
				className={clsx(styles.char, chartClassName)}
			></div>
		</div>
	);
}

const parseChartData = (rawData: string): EchartsOpts | undefined => {
	console.info("Echarts parseChartData => rawData:\n", rawData);

	return loadChartRawData(rawData);
};

const loadChartRawData = (rawData: string): EchartsOpts | undefined => {
	try {
		const ops = JSON.parse(rawData) as EchartsOpts;
		return ops;
	} catch (e) {
		console.error("loadChartRawData decode error:", e);
		return undefined;
	}
};
