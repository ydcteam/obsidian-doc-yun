// 散点图.
import { EchartsOptCreator, EchartsOpts } from "@/components/Echarts/opts";
import { processAxisData } from "@/components/Echarts/normalizeData";

export const EchartsType = "scatter";

export type TypeScatterEchartsOpts = {
	title?: {
		text: string;
		[key: string]: any;
	};
	tooltip: {
		trigger: "axis";
		axisPointer: {
			type: "cross";
			label: {
				backgroundColor: "#6a7985";
			};
		};
	};
	toolbox: {
		feature: {
			saveAsImage: {};
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
			type: "scatter";
			[key: string]: any;
		},
	];
};

export const createTypeScatterEchartsOpts: EchartsOptCreator = (
	optIn: EchartsOpts,
	title?: string,
): TypeScatterEchartsOpts | string => {
	let opts: TypeScatterEchartsOpts = {
		tooltip: {
			trigger: "axis",
			axisPointer: {
				type: "cross",
				label: {
					backgroundColor: "#6a7985",
				},
			},
		},
		toolbox: {
			feature: {
				saveAsImage: {},
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
