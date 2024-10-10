import { createHmac, createHash, BinaryLike } from "crypto";
import moment from "moment";
import { toString } from "lodash";
import { stringify as qsStringify } from "qs";

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

	getStringToSign(date: string, canonicalRequest: any) {
		const stringToSign = [
			"YDC4-HMAC-SHA256",
			date, // TimeStamp
			`${date.split(" ")[0]}/doc/ydc_v4_request`, // Scope
			createHash("sha256").update(canonicalRequest).digest("hex"), // Hashed Canonical Request
		];

		return stringToSign.join("\n");
	}

	getSignature(accessKeySecret: string, date: string, stringToSign: string) {
		const signingKey = createHmac("sha256", `ydc_v4_${accessKeySecret}`)
			.update(date)
			.digest("hex");
		if (this.debug) {
			console.debug(`signingKey:\n[${signingKey}]`);
		}
		const signatureValue = createHmac("sha256", signingKey)
			.update(stringToSign)
			.digest("hex");

		return signatureValue;
	}

	getSha256HashHex(data: BinaryLike) {
		const hs = createHash("sha256").update(data).digest("hex");
		if (this.debug) {
			console.debug(`getSha256HashHex:\n[${hs}]`);
		}
		return hs;
	}

	authorization(
		method: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS",
		request: AuthParam,
	) {
		const fixedHeaders: { [key: string]: any } = {};
		for (const v in request.headers) {
			fixedHeaders[v] =
				typeof request.headers[v] === "string"
					? request.headers[v].trim()
					: Buffer.from(request.headers[v], "utf-8").toString();
		}

		const date =
			fixedHeaders["x-request-date"] || moment().format("YYYY-MM-DD HH:mm:ss");
		const [signedHeaders, canonicalRequest] = this.getCanonicalRequest(method, {
			headers: fixedHeaders,
			queries: request.queries,
		});
		if (this.debug) {
			console.debug("canonicalRequest:\n", canonicalRequest);
		}
		const stringToSign = this.getStringToSign(date, canonicalRequest);
		if (this.debug) {
			console.debug(`stringToSign:\n[${stringToSign}]`);
		}
		const onlyDate = date.split(" ")[0];
		const signatureValue = this.getSignature(
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
