import { requestUrl } from "obsidian";

export type HttpGETParam = {
	headers?: Record<string, string>;
	queries?: Record<string, string>;
};

export type HttpPOSTParam = HttpGETParam & {
	data?: FormData|any;
};

export async function http_get(
	url: string,
	params?: HttpGETParam,
): Promise<any> {
	if (params?.queries) {
		const searchParams = new URLSearchParams(params.queries);
		url = `${url}?${searchParams.toString()}`;
	}
	const rsp = await requestUrl({
		url: url,
		method: "GET",
		headers: params.headers,
	});

	return rsp.json;
}

export async function http_post_json(url: string, params: HttpPOSTParam) {
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

	return rsp.json;
}

export async function http_post_form(url: string, params: HttpPOSTParam) {
	if (params?.queries) {
		const searchParams = new URLSearchParams(params.queries);
		url = `${url}?${searchParams.toString()}`;
	}
	
	const rsp = await requestUrl({
		url: url,
		method: "POST",
		// NOTE: leave it for SDK to fill in.
		// contentType: "multipart/form-data",
		headers: params.headers,
		body: params.data
	});

	return rsp.json;
}
