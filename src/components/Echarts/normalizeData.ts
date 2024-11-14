export type NormalizedAxisData = {
    xAxis: any[];
    yAxis: any[];
};

export type NormalizedSeriesData = {
    data?: {
        name: string;
        value: any;
    }[];
};

// processSeriesData.
// series='张三=11,李四=12,王五=14'
export const processSeriesData = (
    series: string
): { data: NormalizedSeriesData | undefined; error?: string } => {
    if (series === "") {
        return { data: undefined, error: "系列数据为空" };
    }

    if (series.indexOf("，") !== -1) {
        return {
            data: undefined,
            error: "系列数据中发现中文逗号，请改为英文逗号",
        };
    }

    const seriesArr = series.split(",");

    let result: {
        name: string;
        value: any;
    }[] = [];
    const pattern = /\s*^(.+)\s*=\s*(\d+)\s*$/;
    for (const s of seriesArr) {
        const ts = s.match(pattern);
        if (ts) {
            const [, key, value] = ts;
            if (key && value) {
                result.push({
                    name: key.trim(),
                    value: Number(value.trim()),
                });
            }
        }
    }

    if (result.length === 0) {
        return {
            data: undefined,
            error: "系列数据解析结果为空",
        };
    }

    return {
        data: { data: result },
    };
};

// processAxisData.
// xAxis='a,b,c,d'
// yAxis='11,22,44'
export const processAxisData = (
    xAxis: string,
    yAxis: string
): { data: NormalizedAxisData | undefined; error?: string } => {
    if (xAxis === "" || yAxis === "") {
        return { data: undefined, error: "X轴或Y轴的数据为空" };
    }

    if (xAxis.indexOf("，") !== -1) {
        return {
            data: undefined,
            error: "X轴的数据中发现中文逗号，请改为英文逗号",
        };
    }
    if (yAxis.indexOf("，") !== -1) {
        return {
            data: undefined,
            error: "Y轴的数据中发现中文逗号，请改为英文逗号",
        };
    }

    const xAxisArr = xAxis.split(",");
    const yAxisArr = yAxis.split(",");

    let xAxisStrArr: string[] = [];
    xAxisArr.forEach((e) => {
        const r = `${e}`.trim();
        if (r !== "") {
            xAxisStrArr.push(r);
        }
    });

    let yAxisNumberArr: Number[] = [];
    yAxisArr.forEach((e) => {
        const n = Number(e.trim());
        yAxisNumberArr.push(n);
    });

    if (xAxisStrArr.length === 0 || yAxisNumberArr.length === 0) {
        return {
            data: undefined,
            error: "X轴或Y轴的数据为空",
        };
    }

    if (xAxisStrArr.length !== yAxisNumberArr.length) {
        return {
            data: undefined,
            error: "X轴和Y轴的数据个数不对应",
        };
    }

    return {
        data: {
            xAxis: xAxisStrArr,
            yAxis: yAxisNumberArr,
        },
    };
};
