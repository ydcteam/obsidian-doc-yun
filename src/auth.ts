import { toString } from "lodash";
import { stringify as qsStringify } from "qs";
import { sha256Hash, hmacSign, BinaryLike } from "./crypto";

export type AuthOptions = {
	apiKey: string;
	apiSecret: string;
};

export type AuthParam = {
	headers: { [key: string]: any };
	queries?: { [key: string]: any };
};

/**
 * YDC authentication.
 */
export class Auth {
	options: AuthOptions;
	debug?: boolean;

	constructor(options: AuthOptions) {
		this.options = options;
		if (process.env.debugAuth) {
			this.debug = true;
		}
	}

	encodeString(str: unknown) {
		const tempStr = toString(str);

		return encodeURIComponent(tempStr);
	}

	getCanonicalRequest(method: string, request: any): any[] {
		const headers = this.lowercaseKeyHeader(request.headers);
		const queries = request.queries || {};

		const signContent = [method.toUpperCase()];

		signContent.push(
			qsStringify(queries, {
				encoder: this.encodeString,
				sort: (a, b) => a.localeCompare(b),
				strictNullHandling: true,
			}),
		);

		const tempHeaders: string[] = [];

		Object.keys(headers).forEach((v) => {
			if (v === "content-type" || v === "content-md5") {
				return;
			}
			tempHeaders.push(v);
		});

		const canonicalHeaders = `${tempHeaders
			.sort()
			.map((v) => `${v}:${headers[v]}`)
			.join("\n")}`;

		signContent.push(canonicalHeaders);

		// Hashed Payload
		signContent.push(headers["x-doc-content-sha256"] || "UNSIGNED-PAYLOAD");

		return [tempHeaders, signContent.join("\n")];
	}

	lowercaseKeyHeader(headers: any) {
		const lowercaseHeader: {
			[key: string]: any;
		} = {};

		for (const prop in headers) {
			lowercaseHeader[prop.toLowerCase()] = headers[prop];
		}

		return lowercaseHeader;
	}

	async getStringToSign(date: string, canonicalRequest: any): Promise<string> {
		const requestHash = await sha256Hash(canonicalRequest);
		const stringToSign = [
			"YDC4-HMAC-SHA256",
			date, // TimeStamp
			`${date.split(" ")[0]}/doc/ydc_v4_request`, // Scope
			requestHash, // Hashed Canonical Request
		];

		return stringToSign.join("\n");
	}

	async getSignature(
		accessKeySecret: string,
		date: string,
		stringToSign: string,
	): Promise<string> {
		const signingKey = await hmacSign(`ydc_v4_${accessKeySecret}`, date);
		if (this.debug) {
			console.debug(`signingKey:\n[${signingKey}]`);
		}
		const signatureValue = await hmacSign(signingKey, stringToSign);

		return signatureValue;
	}

	async getSha256HashHex(data: BinaryLike): Promise<string> {
		const hs = await sha256Hash(data);
		if (this.debug) {
			console.debug(`getSha256HashHex:\n[${hs}]`);
		}
		return hs;
	}

	async authorization(
		method: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS",
		request: AuthParam,
	): Promise<string> {
		const fixedHeaders: { [key: string]: any } = {};
		for (const v in request.headers) {
			fixedHeaders[v] =
				typeof request.headers[v] === "string"
					? request.headers[v].trim()
					: Buffer.from(request.headers[v], "utf-8").toString();
		}

		const date =
			fixedHeaders["x-request-date"] || window.moment().format("YYYY-MM-DD HH:mm:ss");
		const [signedHeaders, canonicalRequest] = this.getCanonicalRequest(method, {
			headers: fixedHeaders,
			queries: request.queries,
		});
		if (this.debug) {
			console.debug("canonicalRequest:\n", canonicalRequest);
		}
		const stringToSign = await this.getStringToSign(date, canonicalRequest);
		if (this.debug) {
			console.debug(`stringToSign:\n[${stringToSign}]`);
		}
		const onlyDate = date.split(" ")[0];
		const signatureValue = await this.getSignature(
			this.options.apiSecret,
			onlyDate,
			stringToSign,
		);
		if (this.debug) {
			console.debug(`signatureValue:\n[${signatureValue}]`);
		}
		const signedHeadersValue = `Headers=${signedHeaders.join(";")},`;
		return `YDC4-HMAC-SHA256 Credential=${this.options.apiKey}/${onlyDate},${signedHeadersValue}Signature=${signatureValue}`;
	}
}
