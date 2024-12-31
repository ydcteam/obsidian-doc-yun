import { notify } from "@/utils";
import { NetworkError } from "@/errors";
import { Settings } from "@/setting";
import { Auth, AuthParam } from "@/auth";
import { I18n, TransItemType } from "./i18n";
import {
	FormDataContent,
	http_get,
	http_post_formdata,
	http_post_json,
} from "./http_wrapper";

export interface RenameDocumentData {
	file: string;
	fileName: string;
	oldFileName?: string;
	isPublic?: 1 | 0;
	vault: string;
	attachs?: number[];
}

export interface RemoveDocumentData {
	fileName: string;
	vault: string;
}

export interface PublishDocumentAttachData {
	buf: ArrayBuffer;
	filename: string;
}

export interface PublishDocumentData {
	content: string;
	fileName: string;
	isPublic?: 1 | 0;
	vault: string;
	attachs?: PublishDocumentAttachData[];
	attachsUploaded?: number[];
}

export interface CheckDocumentData {
	fileName: string;
	vault: string;
}

export interface AttachConfig {
	maxSize: number;
	exts: string;
}

export interface CheckAttachmentHashData {
	docName: string;
	vault: string;
	fileName: string;
	hash: string;
}

export interface CheckAttachmentResult {
	has: boolean;
	url: string;
	key: number;
}

export interface ChkRspResult {
	data: any;
	code: number;
	msg: string;
}

export interface PluginStatusResult {
	enable: boolean;
	expireTime: number;
	remainingInDays: number;
	remainingInSeconds: number;
}

/**
 * YDC server HTTP request handler.
 */
export class Http {
	auth: Auth;
	debug?: boolean;
	config: {
		settings: Settings;
	};
	i18n: I18n;

	constructor(config: { settings: Settings }, i18n: I18n) {
		this.config = config;
		this.auth = new Auth({
			apiKey: this.config.settings.apiKey,
			apiSecret: this.config.settings.apiSecret,
		});
		if (process.env.debugHttp) {
			this.debug = true;
		}
		this.i18n = i18n;
	}

	t = (x: TransItemType, vars?: any) => {
		return this.i18n.t(x, vars);
	};

	isDebug(): boolean {
		return this?.debug == true;
	}

	/**
	 * 查询文件发布状态.
	 *
	 * @param data 数据
	 * @returns Promise<boolean>
	 */
	checkDocumentPublishStatus = async (
		data: CheckDocumentData,
	): Promise<boolean> => {
		try {
			const params: AuthParam = {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": window.moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			const auth = await this.auth.authorization("POST", params);
			params.headers["Authorization"] = auth;

			const rsp = await http_get(
				this.config.settings.getEntrypointUrl("chkPublished"),
				{
					headers: params.headers,
					queries: { fileName: data.fileName, vault: data.vault },
				},
			);
			if (this.isDebug()) {
				console.debug("查询文件发布状态请求结果:", rsp);
			}

			const result = this.chkRsp(rsp);
			if (result.code != 0) {
				notify(
					undefined,
					this.t("err_chkPublished_with_msg", { msg: result.msg }),
				);
				return false;
			}

			return result.data.is == 1;
		} catch (error) {
			console.error("checkDocumentPublished error:", error);
			if (error.response) {
				notify(
					undefined,
					this.t("err_chkPublished_with_msg", {
						msg: error.response.data?.msg || "Unknown",
					}),
				);
				return false;
			}

			notify(undefined, this.t("err_chkPublished_failed"));
			return false;
		}
	};

	/**
	 *
	 * 获取文档附件配置.
	 *
	 * @returns Promise<{ maxSize: number; exts: string }|null>
	 */
	getAttachConfig = async (): Promise<AttachConfig | null> => {
		try {
			const params: AuthParam = {
				headers: {
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": window.moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			const auth = await this.auth.authorization("GET", params);
			params.headers["Authorization"] = auth;

			const rsp = await http_get(
				this.config.settings.getEntrypointUrl("attachConf"),
				{ headers: params.headers },
			);
			if (this.isDebug()) {
				console.debug("获取文档附件配置 请求结果:", rsp);
			}

			const result = this.chkRsp(rsp);
			if (result.code != 0) {
				notify(
					undefined,
					this.t("err_attachConf_with_msg", { msg: result.msg }),
				);
				return null;
			}
			if (this.isDebug()) {
				console.debug("getAttachConfig this.chkRsp result: ", result);
			}
			return {
				maxSize: result.data.maxSize, // 附件大小限制，字节.
				exts: result.data.exts, // 附件扩展支持.
			};
		} catch (error) {
			console.error("getAttachConfig error: ", error);
			if (error.response) {
				notify(
					undefined,
					this.t("err_attachConf_with_msg", {
						msg: error.response.data?.msg || "Unknown",
					}),
				);
				return null;
			}

			notify(undefined, this.t("err_attachConf_failed"));
			return null;
		}
	};

	// 不支持文件Blog.
	// 保证请求参数和PHP的一致性.
	stringifyFormData(data: FormDataContent): string {
		const object: { [key: string]: any } = {};
		for (const key in data) {
			if (data[key].length < 1) {
				continue;
			}

			let value = "";
			if (data[key].length == 1 && typeof data[key][0] === "string") {
				value = data[key][0].trim();
				object[key] = value;
			} else {
				data[key].forEach((ele) => {
					if (typeof ele === "string") {
						if (Array.isArray(object[key])) {
							object[key].push(ele);
							return;
						}

						object[key] = [value];
					}
				});
			}
		}

		const js = JSON.stringify(object);
		if (this.isDebug()) {
			console.debug(`stringifyFormData:\n[${js}]`);
		}
		return js;
	}

	/**
	 *
	 * 检查附件是否已经上传.
	 *
	 * @param param 参数
	 * @returns Promise<CheckAttachmentResult | null>
	 */
	checkAttachmentHash = async (
		param: CheckAttachmentHashData,
	): Promise<CheckAttachmentResult | null> => {
		try {
			const form: FormDataContent = {};
			form["docName"] = [param.docName];
			form["vault"] = [param.vault];
			form["hash"] = [param.hash];
			form["fileName"] = [param.fileName];

			const params: AuthParam = {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": window.moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			params.headers["x-doc-content-sha256"] = await this.auth.getSha256HashHex(
				this.stringifyFormData(form),
			);
			const auth = await this.auth.authorization("POST", params);
			params.headers["Authorization"] = auth;

			const rsp = await http_post_formdata(
				this.config.settings.getEntrypointUrl("chkAttach"),
				{
					headers: params.headers,
					data: form,
				},
			);
			if (this.isDebug()) {
				console.debug("附件检查请求结果:", rsp);
			}

			const result = this.chkRsp(rsp);
			if (result.code != 0) {
				notify(
					undefined,
					this.t("err_chkAttach_with_msg", {
						msg: result.msg,
					}),
				);
				return null;
			}

			return {
				url: result.data.url,
				has: result.data.has,
				key: result.data.id,
			};
		} catch (error) {
			console.error("checkAttachmentHash error:", error);
			if (error.response) {
				notify(
					undefined,
					this.t("err_chkAttach_with_msg", {
						msg: error.response.data?.msg || "Unknown",
					}),
				);
				return null;
			}

			notify(undefined, this.t("err_attachConf_failed"));
			return null;
		}
	};

	/**
	 * 发布文档.
	 *
	 * @param data 数据
	 * @returns Promise<boolean>
	 */
	publishDocument = async (data: PublishDocumentData): Promise<boolean> => {
		try {
			// console.info("publishDocument -> data:", data);

			const form: FormDataContent = {};
			form["content"] = [data.content];
			form["fileName"] = [data.fileName];
			form["vault"] = [data.vault];

			const params: AuthParam = {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": window.moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			if (data.attachsUploaded) {
				for (const attachId of data.attachsUploaded) {
					if (form["attachsUploaded"]) {
						// @ts-expect-error: fine
						form["attachsUploaded"].push(`${attachId}`);
						continue;
					}
					form["attachsUploaded[]"] = [`${attachId}`];
				}
			}

			// 请求载荷哈希计算时不包括附件.
			params.headers["x-doc-content-sha256"] = await this.auth.getSha256HashHex(
				this.stringifyFormData(form),
			);
			if (data.attachs) {
				for (const attach of data.attachs) {
					if (form["attachs"]) {
						// @ts-expect-error: fine
						form["attachs"].push({
							fileName: attach.filename,
							fileData: attach.buf,
						});
						continue;
					}

					form["attachs"] = [
						{
							fileName: attach.filename,
							fileData: attach.buf,
						},
					];
				}
			}

			const auth = await this.auth.authorization("POST", params);
			params.headers["Authorization"] = auth;

			const rsp = await http_post_formdata(
				this.config.settings.getEntrypointUrl("publish"),
				{
					headers: params.headers,
					data: form,
				},
			);
			if (this.isDebug()) {
				console.debug("publishDocument 请求结果:", rsp);
			}

			const result = this.chkRsp(rsp);
			if (result.code != 0) {
				notify(
					undefined,
					this.t("err_publish_with_msg", {
						docName: data.fileName,
						msg: result.msg,
					}),
				);
				return false;
			}

			notify(
				undefined,
				this.t("sucs_publish", {
					docName: data.fileName,
				}),
			);
			return true;
		} catch (error) {
			console.error("publishDocument error:", error);
			if (error.response) {
				notify(
					undefined,
					this.t("err_publish_with_msg", {
						docName: data.fileName,
						msg: error.response.data?.msg || "Unknown",
					}),
				);
				return false;
			}

			notify(
				undefined,
				this.t("err_publish_failed", { docName: data.fileName }),
			);
			return false;
		}
	};

	/**
	 * 文档重命名.
	 *
	 * @param data RenameDocumentData
	 * @returns Promise<boolean>
	 */
	renameDocument = async (data: RenameDocumentData): Promise<boolean> => {
		try {
			const params: AuthParam = {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": window.moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			params.headers["x-doc-content-sha256"] = await this.auth.getSha256HashHex(
				JSON.stringify(data),
			);
			const auth = await this.auth.authorization("POST", params);
			params.headers["Authorization"] = auth;

			const rsp = await http_post_json(
				this.config.settings.getEntrypointUrl("rename"),
				{
					headers: params.headers,
					data: data,
				},
			);
			if (this.isDebug()) {
				console.debug("发布请求结果:", rsp);
			}

			const result = this.chkRsp(rsp);
			if (result.code != 0) {
				notify(
					undefined,
					this.t("err_rename_with_msg", {
						docName: data.fileName,
						msg: result.msg,
					}),
				);
				return false;
			}

			notify(
				undefined,
				this.t("sucs_rename", {
					docName: data.fileName,
				}),
			);
			return true;
		} catch (error) {
			console.error("renameDocument error:", error);
			if (error.response) {
				notify(
					undefined,
					this.t("err_rename_with_msg", {
						docName: data.fileName,
						msg: error.response.data?.msg || "Unknown",
					}),
				);
				return false;
			}

			notify(
				undefined,
				this.t("err_rename_failed", { docName: data.fileName }),
			);
			return false;
		}
	};

	/**
	 * 删除文档.
	 *
	 * @param data RemoveDocumentData 数据
	 * @returns Promise<boolean>
	 */
	removeDocument = async (data: RemoveDocumentData): Promise<boolean> => {
		try {
			const params: AuthParam = {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": window.moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			params.headers["x-doc-content-sha256"] = await this.auth.getSha256HashHex(
				JSON.stringify(data),
			);
			const auth = await this.auth.authorization("POST", params);
			params.headers["Authorization"] = auth;

			const rsp = await http_post_json(
				this.config.settings.getEntrypointUrl("remove"),
				{
					headers: params.headers,
					data: data,
				},
			);
			if (this.isDebug()) {
				console.debug("移除文档请求结果:", rsp);
			}

			const result = this.chkRsp(rsp);
			if (result.code != 0) {
				notify(
					undefined,
					this.t("err_remove_with_msg", {
						docName: data.fileName,
						msg: result.msg,
					}),
				);
				return false;
			}

			notify(
				undefined,
				this.t("sucs_remove", {
					docName: data.fileName,
				}),
			);
			return true;
		} catch (error) {
			console.error("removeDocument error:", error);
			if (error.response) {
				notify(
					undefined,
					this.t("err_remove_with_msg", {
						docName: data.fileName,
						msg: error.response.data?.msg || "Unknown",
					}),
				);
				return false;
			}

			notify(
				undefined,
				this.t("err_remove_failed", { docName: data.fileName }),
			);
			return false;
		}
	};

	chkRsp = (rsp: any): ChkRspResult => {
		if (!rsp) {
			throw new NetworkError("unexpected response data");
		}
		const data = rsp.data;
		if (!data) {
			throw new NetworkError("unexpected response data");
		}
		if (data.code != 1) {
			return {
				data: null,
				code: 1,
				msg: data.msg ?? "操作失败",
			};
		}
		const inData = data.data;
		return {
			data: inData,
			code: 0,
			msg: "ok",
		};
	};
} // End of class Http.
