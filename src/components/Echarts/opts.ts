import { TypeLineEchartsOpts } from "@/components/Echarts/line";
import { TypeBarEchartsOpts } from "@/components/Echarts/bar";
import { TypePieEchartsOpts } from "@/components/Echarts/pie";
import { TypeScatterEchartsOpts } from "@/components/Echarts/scatter";

export type Props = {
	title?: string;
	data: string;
	style?: object;
	chartStyle?: object;
	className?: string;
	chartClassName?: string;
	noDataMsg?: string;
	loading?: boolean;
};

export type EchartsTextDirective = {
	name: string;
	data: string;
	props?: Record<string, any>;
};

export type EchartsOpts = {
	chartTypeData?: EchartsTextDirective;
	xAxisData?: EchartsTextDirective;
	yAxisData?: EchartsTextDirective;
	seriesData?: EchartsTextDirective;
};

export type NormalizedEchartsOpts =
	| string
	| TypeLineEchartsOpts
	| TypeBarEchartsOpts
	| TypePieEchartsOpts
	| TypeScatterEchartsOpts;

export type EchartsOptCreator = (
	optIn: EchartsOpts,
	title?: string,
) => NormalizedEchartsOpts;
