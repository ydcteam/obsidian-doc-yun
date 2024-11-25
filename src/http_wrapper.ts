import { requestUrl } from "obsidian";
import xFormData from "form-data";
import { generateRandomString } from "./utils";

export type HttpGETParam = {
	headers?: Record<string, string>;
	queries?: Record<string, string>;
};

export type HttpJSONParam = HttpGETParam & {
	data?: any;
};

export type HttpFormDataParam = HttpGETParam & {
	data: SFormData;
};

export type HttpJSONRsp = {
	data: any;
};

// https://httpbin.org/anything

// https://yun.yidong.site/api/ydcdoc/v1/obsidian/a/5TbmjTuIXseCyeVImN9oVm8-

export class SFormData {
	rawData: Record<string, any>;
	formdata: xFormData;
	constructor() {
		this.rawData = {};
		this.formdata = new xFormData();
	}
	append(k: string, v: any, options?: xFormData.AppendOptions | string) {
		this.rawData[k] = v;
		this.formdata.append(k, v, options);
	}
	forEach(callback = (ele: any, idx: any, arr: any) => {}) {
		for (const prop in this.rawData) {
			callback(this.rawData[prop], prop, this.rawData);
		}
	}

	public get form(): xFormData {
		return this.formdata;
	}

	public get data(): Record<string, any> {
		return this.rawData;
	}
}

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

	const buffer = params.data.form.getBuffer();
	// params.headers["Content-Length"] = `${buffer.length}`;
	console.debug("http_post_formdata buffer length:", buffer.length);
	const rsp = await requestUrl({
		url: url,
		method: "POST",
		contentType:
			"multipart/form-data; boundary=" + params.data.form.getBoundary(),
		headers: params.headers,
		body: buffer,
	});

	return { data: rsp.json };
}

const buildFormData = (
	path: string,
	fileType: string,
	fileName: string,
	blobBytes: ArrayBuffer,
): Promise<string | undefined> => {
	const boundary = generateRandomString(12);
	const end_boundary = "\r\n--" + boundary + "--\r\n";
	let formDataString = "";
	formDataString += "--" + boundary + "\r\n";
	formDataString +=
		`Content-Disposition: form-data; name="file"; filename=\"${fileName}.png\"` +
		"\r\n";
	formDataString += "Content-Type: image/png" + "\r\n\r\n";

	var resultArray = [];
	for (var i = 0; i < formDataString.length; i++) {
		// 取出文本的charCode（10进制）
		resultArray.push(formDataString.charCodeAt(i));
	}

	var pic_typedArray = new Uint8Array(blobBytes); // 把buffer转为typed array数据、再转为普通数组使之可以使用数组的方法
	var endBoundaryArray = [];
	for (var i = 0; i < end_boundary.length; i++) {
		// 最后取出结束boundary的charCode
		endBoundaryArray.push(end_boundary.charCodeAt(i));
	}
	// console.log(`endBoudlen2=${endBoundaryArray.length},${endBoundaryArray}`);
	var postArray = resultArray.concat(
		Array.prototype.slice.call(pic_typedArray),
		endBoundaryArray,
	); // 合并文本、图片数据得到最终要发送的数据
	var post_typedArray = new Uint8Array(postArray); // 把最终结果转为typed array，以便最后取得buffer数据
	// console.log(post_typedArray)

	const url = `${this.baseUrl}/material/add_material?access_token=${setings.accessToken}&type=${fileType}`;
	const header = {
		// 'User-Agent': 'python-requests/2.28.1',
		"Content-Type": "multipart/form-data; boundary=" + boundary,
		"Accept-Encoding": "gzip, deflate, br",
		Accept: "*/*",
		Connection: "keep-alive",
		// 'Content-Length': post_typedArray.length.toString()
	};
	// console.log(header);
	// return
	const req: RequestUrlParam = {
		url: url,
		method: "POST",
		headers: header,
		body: post_typedArray,
	};
	const resp = await requestUrl(req);
	const media_id = resp.json["media_id"];
	if (media_id === undefined) {
		const errcode = resp.json["errcode"];
		const errmsg = resp.json["errmsg"];
		console.log(errmsg);
		new Notice(`uploadMaterial, errorCode: ${errcode}, errmsg: ${errmsg}`);
	}
	return media_id;
};

function buildFormData2() {
	// This next block is a workaround to current Obsidian API limitations: requestURL only supports string data or an unnamed blob, not key-value formdata
	// Essentially what we're doing here is constructing a multipart/form-data payload manually as a string and then passing it to requestURL
	// I believe this to be equivilent to the following curl command: curl --location --request POST 'http://djmango-bruh:9000/asr?task=transcribe&language=en' --form 'audio_file=@"test-vault/02 Files/Recording.webm"'

	// Generate the form data payload boundry string, it can be arbitrary, I'm just using a random string here
	// https://stackoverflow.com/questions/3508338/what-is-the-boundary-in-multipart-form-data
	// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
	const N = 16; // The length of our random boundry string
	const randomBoundryString =
		"djmangoBoundry" +
		Array(N + 1)
			.join((Math.random().toString(36) + "00000000000000000").slice(2, 18))
			.slice(0, N);

	// Construct the form data payload as a string
	const pre_string = `------${randomBoundryString}\r\nContent-Disposition: form-data; name="audio_file"; filename="blob"\r\nContent-Type: "application/octet-stream"\r\n\r\n`;
	const post_string = `\r\n------${randomBoundryString}--`;

	// Convert the form data payload to a blob by concatenating the pre_string, the file data, and the post_string, and then return the blob as an array buffer
	const pre_string_encoded = new TextEncoder().encode(pre_string);
	const data = new Blob([
		await this.app.vault.adapter.readBinary(fileToTranscribe.path),
	]);
	const post_string_encoded = new TextEncoder().encode(post_string);
	const concatenated = await new Blob([
		pre_string_encoded,
		await getBlobArrayBuffer(data),
		post_string_encoded,
	]).arrayBuffer();

	// Now that we have the form data payload as an array buffer, we can pass it to requestURL
	// We also need to set the content type to multipart/form-data and pass in the boundry string
	const options: RequestUrlParam = {
		method: "POST",
		url: "http://djmango-bruh:9000/asr?task=transcribe&language=en",
		contentType: `multipart/form-data; boundary=----${randomBoundryString}`,
		body: concatenated,
	};

	requestUrl(options)
		.then((response) => {
			console.log(response);
		})
		.catch((error) => {
			console.error(error);
		});
}
