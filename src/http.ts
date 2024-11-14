import { notify } from "@/utils";
import axios from "axios";
import { NetworkError, NormalError } from "@/errors";
import { Settings } from "@/setting";
import { Auth, AuthParam } from "@/auth";
import moment from "moment";
import { PluginMode } from "@/types";
import { I18n, TransItemType } from "./i18n";

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
	pluginMode: PluginMode;
	debug?: boolean;
	config: {
		settings: Settings;
	};
	i18n: I18n;

	constructor(
		config: { settings: Settings; pluginMode: PluginMode },
		i18n: I18n,
	) {
		this.config = config;
		this.auth = new Auth({
			apiKey: this.config.settings.apiKey,
			apiSecret: this.config.settings.apiSecret,
		});
		if (process.env.debugHttp) {
			this.debug = true;
		}
		this.pluginMode = config.pluginMode;
		this.i18n = i18n;
	}

	t = (x: TransItemType, vars?: any) => {
		return this.i18n.t(x, vars);
	};

	isSaaSMode() {
		return (this.pluginMode === "saas");
	}

	isDebug(): boolean {
		return this?.debug == true;
	}
	getPluginStatus = async (): Promise<PluginStatusResult | null> => {
		if (!this.isSaaSMode()) {
			return null;
		}

		try {
			const params: AuthParam = {
				headers: {
					"Content-Type": "multipart/form-data",
					"X-Requested-With": "XMLHttpRequest",
					"request-app": this.config.settings.ydcAppId,
					"x-request-date": moment().format("YYYY-MM-DD HH:mm:ss"),
				},
			};

			const auth = await this.auth.authorization("GET", params);
			params.headers["Authorization"] = auth;

			const rsp = await axios.get(
				this.config.settings.getEntrypointUrl("getPluginStatus"),
				params,
			);

			if (this.isDebug()) {
				console.debug("getPluginStatus result:", rsp);
			}

			const result = this.chkRsp(rsp);
			if (result.code != 0) {
				if (result.code == 10010) {
					return {
						enable: false,
						expireTime: new Date().getTime(),
						remainingInDays: 0,
						remainingInSeconds: 0,
					};
				}
				notify(undefined, "插件状态检查失败:" + result.msg);
				return null;
			}

			return {
				enable: result.data.bought,
				expireTime: result.data.expireTimeMs,
				remainingInDays: result.data.remainingInDays,
				remainingInSeconds: result.data.remainingInSeconds,
			};
		} catch (error) {
			if (this.isDebug()) {
				console.debug("getPluginStatus error:", error);
			}
			if (error.response) {
				notify(undefined, "插件状态检查失败:" + error.response.data?.msg);
				return null;
			}

			notify(undefined, "插件状态检查失败");
			return null;
		}
	};

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

			const rsp = await axios.post(
				this.config.settings.getEntrypointUrl("chkPublished"),
				data,
				params,
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

			const rsp = await axios.get(
				this.config.settings.getEntrypointUrl("attachConf"),
				params,
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

	stringifyFormData(data: FormData): string {
		const object: { [key: string]: any } = {};
		data.forEach((value, key) => {
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
			let form = new FormData();
			form.set("docName", param.docName);
			form.set("vault", param.vault);
			form.set("hash", param.hash);
			form.set("fileName", param.fileName);

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

			const rsp = await axios.post(
				this.config.settings.getEntrypointUrl("chkAttach"),
				form,
				params,
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
			let form = new FormData();
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

			const rsp = await axios.post(
				this.config.settings.getEntrypointUrl("publish"),
				form,
				params,
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

			const rsp = await axios.post(
				this.config.settings.getEntrypointUrl("rename"),
				data,
				params,
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

			const rsp = await axios.post(
				this.config.settings.getEntrypointUrl("remove"),
				data,
				params,
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

		console.debug('chkRsp mode:', this.pluginMode);

		// yun.
		if (!this.isSaaSMode()) {
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
					msg: data.msg ?? this.t("req_err_common"),
				};
			}
			const inData = data.data;
			return {
				data: inData,
				code: 0,
				msg: "ok",
			};
		}

		// SaaS.
		if (!rsp) {
			throw new NetworkError("unexpected response data");
		}
		const data = rsp.data;
		if (!data) {
			throw new NetworkError("unexpected response data");
		}
		if (data.code != 200) {
			throw new NormalError(`请求失败：${data.msg}`);
		}
		const inData = data.data;
		if (!inData) {
			throw new NetworkError("unexpected response data");
		}

		if (inData.errcode != 0) {
			if (inData.errcode == 10010) {
				notify(undefined, this.t("req_err_expired"));
			}
			return {
				data: inData,
				code: inData.errcode,
				msg: data.msg ?? "N/A",
			};
		}
		const inInData = inData.data;
		if (!inData) {
			throw new NetworkError("unexpected response data");
		}

		return {
			data: inInData,
			code: 0,
			msg: "ok",
		};
	};
} // End of class Http.
