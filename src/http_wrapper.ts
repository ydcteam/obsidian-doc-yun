import { requestUrl } from "obsidian";
import xFormData from "form-data";

export type HttpGETParam = {
	headers?: Record<string, string>;
	queries?: Record<string, string>;
};

export type HttpJSONParam = HttpGETParam & {
	data?: any;
};

export type HttpFormDataParam = HttpGETParam & {
	data: xFormData;
};

export type HttpJSONRsp = {
	data: any;
};

export async function http_get(
	url: string,
	params?: HttpGETParam,
): Promise<HttpJSONRsp> {
	if (params?.queries) {
		const searchParams = new URLSearchParams(params.queries);
		url = `${url}?${searchParams.toString()}`;
	}
	const rsp = await requestUrl({
		url: url,
		method: "GET",
		headers: params.headers,
	});

	return { data: rsp.json };
}

export async function http_post_json(
	url: string,
	params: HttpJSONParam,
): Promise<HttpJSONRsp> {
	if (params.queries) {
		const searchParams = new URLSearchParams(params.queries);
		url = `${url}?${searchParams.toString()}`;
	}
	const rsp = await requestUrl({
		url: url,
		method: "POST",
		contentType: "application/json",
		headers: params.headers,
		body: JSON.stringify(params.data),
	});

	return { data: rsp.json };
}

export async function http_post_formdata(
	url: string,
	params: HttpFormDataParam,
): Promise<HttpJSONRsp> {
	console.debug("http_post_formdata params", params);
	if (params.queries) {
		const searchParams = new URLSearchParams(params.queries);
		url = `${url}?${searchParams.toString()}`;
	}

	const rsp = await requestUrl({
		url: url,
		method: "POST",
		contentType: "multipart/form-data; boundary=" + params.data.getBoundary(),
		headers: params.headers,
		body: params.data.getBuffer(),
	});

	return { data: rsp.json };
}
