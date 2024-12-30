import { requestUrl, RequestUrlParam } from "obsidian";
import { generateRandomString } from "./utils";

export type HttpGETParam = {
	headers?: Record<string, string>;
	queries?: Record<string, string>;
};

export type HttpJSONParam = HttpGETParam & {
	data?: any;
};

export type FileData = {
	fileName: string;
	fileData: ArrayBuffer;
};

export type FormDataContent = Record<string, string[] | FileData[]>;

export type HttpFormDataParam = HttpGETParam & {
	data: FormDataContent;
};

export type HttpJSONRsp = {
	data: any;
};

// https://httpbin.org/anything

// https://yun.yidong.site/api/ydcdoc/v1/obsidian/a/5TbmjTuIXseCyeVImN9oVm8-

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
	console.info("http_post_formdata params", params);
	if (params.queries) {
		const searchParams = new URLSearchParams(params.queries);
		url = `${url}?${searchParams.toString()}`;
	}

	const req = buildFormData(url, params.data, params.headers);

	const rsp = await requestUrl(req);

	return { data: rsp.json };
}

const isStringArray = (v?: any): boolean => {
	if (!Array.isArray(v)) {
		return false;
	}
	let somethingIsNotString = false;
	v.forEach((ele) => {
		if (typeof ele !== "string") {
			somethingIsNotString = true;
		}
	});

	return !somethingIsNotString && v.length > 0;
};

// https://yun.yidong.site/api/ydcdoc/v1/obsidian/a/5TbmjTuIXseCyeVImN9oVm8-
// http://localhost:7890

const buildFormData = (
	url: string,
	data: FormDataContent,
	headers?: Record<string, string>,
): RequestUrlParam => {
	const boundary = "------YdcFormDataBoundary" + generateRandomString(12);

	// RFC 7578: https://datatracker.ietf.org/doc/html/rfc7578#section-4.1
	const endBoundary = "--" + boundary + "--\r\n";

	// string to unicode.
	const endBoundaryUint8 = new TextEncoder().encode(endBoundary).buffer;

	let postData: ArrayBuffer | null = null;

	for (const field in data) {
		let vd: ArrayBuffer = new Uint8Array().buffer;
		if (isStringArray(data[field])) {
			// @ts-expect-error: fine
			vd = buildFormDataStringField(boundary, field, data[field]);

			postData = appendArrayBuffer(postData, vd);

			continue;
		}

		// @ts-expect-error: fine
		vd = buildFormDataFileField(boundary, field, data[field]);
		postData = appendArrayBuffer(postData, vd);
	}

	// console.info("buildFormData -> data length:", postData.length);

	let rawData: string | ArrayBuffer = "";
	if (postData != null) {
		postData = appendArrayBuffer(postData, endBoundaryUint8); // 最后的分隔.
		rawData = new Uint8Array(postData).buffer;
	}

	const header: Record<string, string> = {
		"Content-Type": "multipart/form-data; boundary=" + boundary,
		"Accept-Encoding": "gzip, deflate, br",
		Accept: "*/*",
		Connection: "keep-alive",
	};

	if (headers) {
		for (const prop in headers) {
			header[prop] = headers[prop];
		}
	}

	const req: RequestUrlParam = {
		url: url,
		method: "POST",
		headers: header,
		body: rawData,
	};

	return req;
};

const buildFormDataFileField = (
	boundary: string,
	name: string,
	data: FileData[],
): ArrayBuffer => {
	let result: ArrayBuffer = new Uint8Array().buffer;
	if (data.length < 1) {
		return result;
	}

	// RFC 7578: https://datatracker.ietf.org/doc/html/rfc7578#section-4.1
	const nextBoundary = "--" + boundary + "\r\n";

	console.info("buildFormDataFileField -> data:", data);

	if (data.length == 1) {
		const f = data[0];
		let content = nextBoundary;
		content += `Content-Disposition: form-data; name="${name}"; filename="${f.fileName}"\r\n`;

		// mark as file.
		content += "Content-Type: application/octet-stream" + "\r\n\r\n";

		console.info("buildFormDataFileField -> formDataString:", content);

		// string to unicode.
		const contentEncoded = new TextEncoder().encode(content);
		result = appendArrayBuffer(result, contentEncoded.buffer);
		result = appendArrayBuffer(result, f.fileData);
		result = appendArrayBuffer(result, new TextEncoder().encode("\r\n").buffer);
	} else {
		for (const f of data) {
			let content = nextBoundary;
			content += `Content-Disposition: form-data; name="${name}[]"; filename="${f.fileName}"\r\n`;

			// mark as file.
			content += "Content-Type: application/octet-stream" + "\r\n\r\n";

			console.info("buildFormDataFileField -> formDataString:", content);

			// string to unicode.
			const contentEncoded = new TextEncoder().encode(content);
			result = appendArrayBuffer(result, contentEncoded.buffer);
			result = appendArrayBuffer(result, f.fileData);
			result = appendArrayBuffer(result, new TextEncoder().encode("\r\n").buffer);
		}
	}

	return result;
};

const buildFormDataStringField = (
	boundary: string,
	name: string,
	data: string[],
): ArrayBuffer => {
	let result: ArrayBuffer = new Uint8Array().buffer;
	if (data.length < 1) {
		return result;
	}

	// RFC 7578: https://datatracker.ietf.org/doc/html/rfc7578#section-4.1
	const nextBoundary = "--" + boundary + "\r\n";

	if (data.length == 1) {
		let content = nextBoundary;
		content +=
			`Content-Disposition: form-data; name="${name}"\r\n\r\n` + `${data}\r\n`;

		console.info("buildFormDataStringField -> formDataString:", content);

		const contentEncoded = new TextEncoder().encode(content);

		// string to unicode.
		result = appendArrayBuffer(result, contentEncoded.buffer);
	} else {
		for (const vv of data) {
			let content = nextBoundary;
			content +=
				`Content-Disposition: form-data; name="${name}[]"\r\n\r\n` +
				`${vv}\r\n`;

			console.info("buildFormDataStringField -> formDataString:", content);

			const contentEncoded = new TextEncoder().encode(content);

			// string to unicode.
			result = appendArrayBuffer(result, contentEncoded.buffer);
		}
	}

	return result;
};

// function buildFormData2() {
// 	// This next block is a workaround to current Obsidian API limitations: requestURL only supports string data or an unnamed blob, not key-value formdata
// 	// Essentially what we're doing here is constructing a multipart/form-data payload manually as a string and then passing it to requestURL
// 	// I believe this to be equivilent to the following curl command: curl --location --request POST
// 	// 'http://djmango-bruh:9000/asr?task=transcribe&language=en' --form 'audio_file=@"test-vault/02 Files/Recording.webm"'

// 	// Generate the form data payload boundry string, it can be arbitrary, I'm just using a random string here
// 	// https://stackoverflow.com/questions/3508338/what-is-the-boundary-in-multipart-form-data
// 	// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
// 	const N = 16; // The length of our random boundry string
// 	const randomBoundryString =
// 		"djmangoBoundry" +
// 		Array(N + 1)
// 			.join((Math.random().toString(36) + "00000000000000000").slice(2, 18))
// 			.slice(0, N);

// 	// Construct the form data payload as a string
// 	const pre_string = `------${randomBoundryString}\r\nContent-Disposition: form-data; name="audio_file"; filename="blob"\r\nContent-Type: "application/octet-stream"\r\n\r\n`;
// 	const post_string = `\r\n------${randomBoundryString}--`;

// 	// Convert the form data payload to a blob by concatenating the pre_string, the file data, and the post_string, and then return the blob as an array buffer
// 	const pre_string_encoded = new TextEncoder().encode(pre_string);
// 	const data = new Blob([
// 		await this.app.vault.adapter.readBinary(fileToTranscribe.path),
// 	]);
// 	const post_string_encoded = new TextEncoder().encode(post_string);
// 	const concatenated = await new Blob([
// 		pre_string_encoded,
// 		await getBlobArrayBuffer(data),
// 		post_string_encoded,
// 	]).arrayBuffer();

// 	// Now that we have the form data payload as an array buffer, we can pass it to requestURL
// 	// We also need to set the content type to multipart/form-data and pass in the boundry string
// 	const options: RequestUrlParam = {
// 		method: "POST",
// 		url: "http://djmango-bruh:9000/asr?task=transcribe&language=en",
// 		contentType: `multipart/form-data; boundary=----${randomBoundryString}`,
// 		body: concatenated,
// 	};

// 	requestUrl(options)
// 		.then((response) => {
// 			console.log(response);
// 		})
// 		.catch((error) => {
// 			console.error(error);
// 		});
// }

function appendArrayBuffer(
	b1: ArrayBuffer | null,
	b2: ArrayBuffer | null,
): ArrayBuffer {
	if (b1 == null) {
		b1 = new Uint8Array().buffer;
	}
	if (b2 == null) {
		b2 = new Uint8Array().buffer;
	}
	let result = new Uint8Array(b1.byteLength + b2.byteLength);
	result.set(new Uint8Array(b1), 0);
	result.set(new Uint8Array(b2), b1.byteLength);
	return result.buffer;
}
