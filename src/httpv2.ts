import { notify } from "@/utils";
import { NetworkError } from "@/errors";
import { Settings } from "@/setting";
import { Auth, AuthParam } from "@/auth";
import moment from "moment";
import { I18n, TransItemType } from "./i18n";
import xFormData from "form-data";
import { http_get, http_post_formdata, http_post_json } from "./http_wrapper";

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
					"Content-Type": "application/json; charset=utf8",
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": moment().format("YYYY-MM-DD HH:mm:ss"),
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
					"x-request-date": moment().format("YYYY-MM-DD HH:mm:ss"),
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

	stringifyFormData(data: Record<string, any>): string {
		const object: { [key: string]: any } = {};
		data.forEach((value: any, key: string) => {
			// 保证和PHP的一致性.
			if (typeof value === "string") {
				value = value.trim();
			}

			// key格式: xxx[] 的数组.
			if (key.endsWith("[]")) {
				const newKey = key.replace(/\[\]$/, "");
				if (Array.isArray(object[newKey])) {
					object[newKey].push(value);
					return;
				}

				object[newKey] = [value];
				return;
			}

			// 第一赋值，还不确定是数组.
			if (!Reflect.has(object, key)) {
				object[key] = value;
				return;
			}

			// 第二次赋值，即视为数组，key格式: xxx.
			if (!Array.isArray(object[key])) {
				// 属性替换为数组.
				object[key] = [value];
				return;
			}

			// 数组增加下一个值.
			object[key].push(value);
		});

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
			let form = new xFormData();
			form.append("docName", param.docName);
			form.append("vault", param.vault);
			form.append("hash", param.hash);
			form.append("fileName", param.fileName);

			const params: AuthParam = {
				headers: {
					"Content-Type": "multipart/form-data",
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": moment().format("YYYY-MM-DD HH:mm:ss"),
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
			let form = new xFormData();
			form.append("content", data.content);
			form.append("fileName", data.fileName);
			form.append("vault", data.vault);

			const params: AuthParam = {
				headers: {
					"Content-Type": "multipart/form-data",
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			if (data.attachsUploaded) {
				for (const attachId of data.attachsUploaded) {
					form.append("attachsUploaded[]", `${attachId}`);
				}
			}

			// 请求载荷哈希计算时不包括附件.
			params.headers["x-doc-content-sha256"] = await this.auth.getSha256HashHex(
				this.stringifyFormData(form),
			);

			if (data.attachs) {
				for (const attach of data.attachs) {
					form.append("attachs[]", new Blob([attach.buf]), attach.filename);
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
					"Content-Type": "multipart/form-data",
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": moment().format("YYYY-MM-DD HH:mm:ss"),
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
					"Content-Type": "multipart/form-data",
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": moment().format("YYYY-MM-DD HH:mm:ss"),
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
