import {
	onBatchPublishEndpoint,
	onPublishEndpoint,
	onRenameEndpoint,
	onRemoveEndpoint,
	onCheckPublishedEndpoint,
	onChkAttachEndpoint,
	getAttachConfigEndpoint,
	getPluginStatusEndpoint,
} from "@/endpoints";

import type { LangTypeAndAuto } from "./i18n";

export interface Settings {
	valid(): boolean;
	lang?: LangTypeAndAuto;
	username: string;
	url: string;
	getEntrypointUrl: (type: entryPontType) => string;
	getToken(): string;
	ydcAppId: string; // process.env.mode=SaaS
	apiKey: string;
	apiSecret: string;

	// 是否开启自动同步重命名文档操作.
	autoSyncRename: boolean;
	// 自动同步重命名文档时间间隔. 单位秒.
	autoSyncRenameInterv: number;

	// 是否开启自动同步文档删除操作.
	autoSyncRemove: boolean;
	// 自动同步删除文档操作时间间隔. 单位秒.
	autoSyncRemoveInterv: number;

	// 是否发布之后设置为公开.
	autoSetPublic: boolean;

	// 是否购买.
	enable: boolean;

	// 服务到期时间.
	expireTime: number;
	remainingInDays: number;
	remainingInSeconds: number;
}

export type entryPontType =
	| "publish"
	| "batchPublish"
	| "rename"
	| "remove"
	| "chkPublished"
	| "chkAttach"
	| "attachConf"
	| "getPluginStatus";

export const DEFAULT_SETTINGS: Settings = {
	valid: function (): boolean {
		return this.apiKey != "" && this.apiSecret != "" && this.url != "";
	},
	username: "",
	url: "",
	apiKey: "",
	apiSecret: "",
	lang: "auto",
	getToken(): string {
		return Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString("base64");
	},
	getEntrypointUrl: function (type: entryPontType) {
		this.url = this.url.replace(/\/+$/, "");
		switch (type) {
			case "publish":
				return `${this.url}/${onPublishEndpoint}`;
			case "batchPublish":
				return `${this.url}/${onBatchPublishEndpoint}`;
			case "rename":
				return `${this.url}/${onRenameEndpoint}`;
			case "remove":
				return `${this.url}/${onRemoveEndpoint}`;
			case "chkPublished":
				return `${this.url}/${onCheckPublishedEndpoint}`;
			case "chkAttach":
				return `${this.url}/${onChkAttachEndpoint}`;
			case "attachConf":
				return `${this.url}/${getAttachConfigEndpoint}`;
			case "getPluginStatus":
				return `${this.url}/${getPluginStatusEndpoint}`;
			default:
				return "";
		}
	},
	ydcAppId: "",
	autoSyncRename: true,
	autoSyncRenameInterv: 3,
	autoSyncRemove: true,
	autoSyncRemoveInterv: 3,

	autoSetPublic: false,

	enable: false,
	expireTime: 0,
	remainingInDays: 0,
	remainingInSeconds: 0,
};
