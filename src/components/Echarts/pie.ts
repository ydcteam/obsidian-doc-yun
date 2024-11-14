// 饼图.
import { EchartsOptCreator, EchartsOpts } from "@/components/Echarts/opts";
import { processSeriesData } from "@/components/Echarts/normalizeData";

export const EchartsType = "pie";

export type TypePieEchartsOpts = {
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
		trigger: "item";
	};
	series: [
		{
			data: any[];
			type: "pie";
			[key: string]: any;
		},
	];
};

export const createTypePieEchartsOpts: EchartsOptCreator = (
	optIn: EchartsOpts,
	title?: string,
): TypePieEchartsOpts | string => {
	if (!optIn?.seriesData?.props) {
		return "饼图: 未提供系列数据";
	}

	let opts: TypePieEchartsOpts = {
		toolbox: {
			feature: {
				saveAsImage: {},
			},
		},
		tooltip: {
			trigger: "item",
		},
		series: [
			{
				data: [],
				type: EchartsType,
			},
		],
	};

	const normalizeData = processSeriesData(optIn.seriesData.data);
	if (normalizeData.error) {
		return normalizeData.error;
	}

	opts.series[0].data = normalizeData.data.data;

	if (optIn?.chartTypeData?.props?.radius == 1) {
		// TODO: 分析自定义的弧度.
		//   opts.series[0].radius = optIn?.chartTypeData?.props?.radius;
		opts.series[0].radius = ["40%", "70%"];
	}
	if (optIn?.chartTypeData?.props?.roseType == 1) {
		opts.series[0].roseType = "area";
	}

	if (title) {
		opts.title = { text: title, left: "center", top: "center" };
	}

	return opts;
};
