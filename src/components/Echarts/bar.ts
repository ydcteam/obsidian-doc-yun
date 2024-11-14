// 柱状图.
import { EchartsOptCreator, EchartsOpts } from "@/components/Echarts/opts";
import { processAxisData } from "@/components/Echarts/normalizeData";

export const EchartsType = "bar";

export type TypeBarEchartsOpts = {
	title?: {
		text: string;
		[key: string]: any;
	};
	toolbox: {
		feature: {
			saveAsImage: {};
		};
	};
	tooltip: {
		trigger: "axis";
		axisPointer: {
			type: "shadow";
		};
	};
	xAxis: {
		type: string;
		data: any[];
		[key: string]: any;
	};
	yAxis: {
		type: "value";
		[key: string]: any;
	};
	series: [
		{
			data: any[];
			type: "bar";
			[key: string]: any;
		},
	];
};

export const createTypeBarEchartsOpts: EchartsOptCreator = (
	optIn: EchartsOpts,
	title?: string,
): TypeBarEchartsOpts | string => {
	let opts: TypeBarEchartsOpts = {
		toolbox: {
			feature: {
				saveAsImage: {},
			},
		},
		tooltip: {
			trigger: "axis",
			axisPointer: {
				type: "shadow",
			},
		},
		xAxis: {
			type: "category",
			data: [],
		},
		yAxis: {
			type: "value",
		},
		series: [
			{
				data: [],
				type: EchartsType,
				label: {
					show: true,
					position: "inside",
				},
			},
		],
	};

	const normalizeData = processAxisData(
		optIn.xAxisData.data,
		optIn.yAxisData.data,
	);
	if (normalizeData.error) {
		return normalizeData.error;
	}

	opts.xAxis.data = normalizeData.data.xAxis;
	opts.series[0].data = normalizeData.data.yAxis;

	if (title) {
		opts.title = { text: title };
	}

	return opts;
};
