// 折线图.
import { EchartsOptCreator, EchartsOpts } from "@/components/Echarts/opts";
import { processAxisData } from "@/components/Echarts/normalizeData";

export const EchartsType = "line";

export type TypeLineEchartsOpts = {
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
			type: "line";
			[key: string]: any;
		},
	];
};

export const createTypeLineEchartsOpts: EchartsOptCreator = (
	optIn: EchartsOpts,
	title?: string,
): TypeLineEchartsOpts | string => {
	let opts: TypeLineEchartsOpts = {
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

	if (optIn?.chartTypeData?.props?.smooth == 1) {
		opts.series[0].smooth = true;
	}
	if (optIn?.chartTypeData?.props?.areaStyle == 1) {
		opts.series[0].areaStyle = {};
	}

	if (title) {
		opts.title = { text: title };
	}

	return opts;
};
