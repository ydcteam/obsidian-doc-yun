import { Settings } from "@/setting";
import { notify } from "@/utils";
import {
	AttachConfig,
	CheckAttachmentResult,
	PostAttachUploadData,
} from "@/http";
import { App, TFile, getLinkpath } from "obsidian";
import * as SparkMD5 from "spark-md5";
import { AttachmentError, NoticeError } from "@/errors";

export interface Asset {
	path: string;
	content: string;
}
export interface Assets {
	images: Array<Asset>;
}

export interface ConvertLinkResult {
	content: string;
	attachKeys?: number[]; // 已上传的.
	attachs?: PostAttachUploadData[]; // 带上传的.
}

export type AttachChecker = (data: {
	docName: string;
	vault: string;
	fileName: string;
	hash: string;
}) => Promise<CheckAttachmentResult | null>;

export default class Markdown {
	settings: Settings;
	obApp: App;
	attachChecker: AttachChecker;
	debug?: boolean;

	constructor(settings: Settings, app: App, checker: AttachChecker) {
		this.settings = settings;
		this.obApp = app;
		this.attachChecker = checker;
		if (process.env.debugMarkdownParser) {
			this.debug = true;
		}
	}

	readContent = async (
		file: TFile,
		vault: string,
		attachConfig: AttachConfig | null,
	): Promise<ConvertLinkResult | boolean> => {
		const text = await this.obApp.vault.cachedRead(file);
		// console.log(`origin text: ${text}`);
		if (attachConfig === null) {
			notify(undefined, "后台未配置附件上传");
			return { content: text };
		}
		const result = await this.convertLinks(
			text,
			file.path,
			vault,
			attachConfig.exts,
			attachConfig.maxSize,
		);

		if (result === false) {
			return false;
		}

		// console.log(`convert link result: ${result}`);

		return result;
	};

	async checkAttachUploaded(
		docName: string,
		vault: string,
		fileName: string,
		content: ArrayBuffer,
	): Promise<CheckAttachmentResult | null> {
		const hash = this.getFileHash(content);
		if (!hash) {
			console.error(`checkHash get hash error: ${hash}`);
			return null;
		}
		const rsp = await this.attachChecker({
			docName: docName,
			vault: vault,
			fileName: fileName,
			hash: hash,
		});

		return rsp;
	}

	getFileHash(content: ArrayBuffer): string {
		const spark = new SparkMD5.ArrayBuffer();
		spark.append(content);
		return spark.end();
	}

	/**
	 * 文档附件分离处理.
	 *
	 * @param text md文本内容
	 * @param filePath md文档路径
	 * @param vault
	 * @param allowAttachExts 允许的附件扩展
	 * @param maxAttachSize
	 * @returns Promise<ConvertLinkResult|boolean>
	 */
	async convertLinks(
		text: string,
		filePath: string,
		vault: string,
		allowAttachExts: string,
		maxAttachSize: number,
	): Promise<ConvertLinkResult | boolean> {
		let attachText = text;
		let result: ConvertLinkResult = {
			content: attachText,
			attachKeys: [],
			attachs: [],
		};

		// 第一种格式
		// ![[image.png]]
		// ![[docs/image.png]]
		// ![[https://12112.com/xaxs/sdasad/image.png]]
		const transcludedAttahRegex =
			/!\[\[(.*?)(\.([a-zA-Z0-9]+))\|(.*?)\]\]|!\[\[(.*?)(\.([a-zA-Z0-9]+))\]\]/g;
		const transcludedAttachMatches = text.match(transcludedAttahRegex);
		// console.log("convertLinks: matches", transcludedAttachMatches);
		if (transcludedAttachMatches) {
			for (let i = 0; i < transcludedAttachMatches.length; i++) {
				try {
					const attachMatch = transcludedAttachMatches[i];
					const [attachName, size] = attachMatch
						.substring(attachMatch.indexOf("[") + 2, attachMatch.indexOf("]"))
						.split("|");
					const attachPath = getLinkpath(attachName);
					const linkedFile = this.obApp.metadataCache.getFirstLinkpathDest(
						attachPath,
						filePath,
					);
					if (!linkedFile) {
						notify(
							undefined,
							`附件引用 ${attachMatch} 的所指向资源不存在，无法继续发布文档`,
						);
						return false;
					}
					const ext = attachName.split(".").pop();
					if (ext === "" || ext === undefined) {
						notify(undefined, "不支持没有扩展名的附件");
						continue;
					}
					if (this.debug) {
						console.debug(`allowed exts:${allowAttachExts} <-> ${ext}`);
					}
					if (allowAttachExts.indexOf(ext) === -1) {
						notify(undefined, "不支持该附件类型: " + attachName);
						continue;
					}
					const attach = await this.obApp.vault.readBinary(linkedFile);
					if (attach.byteLength > maxAttachSize) {
						notify(undefined, "该附件类大小超过了限制，跳过: " + attachName);
						continue;
					}
					const attachHash = this.getFileHash(attach);
					const uploadedCheck = await this.checkAttachUploaded(
						filePath,
						vault,
						attachName,
						attach,
					);
					if (uploadedCheck === null) {
						return false;
					}

					// 附件已上传.
					if (uploadedCheck && uploadedCheck.has) {
						result.attachKeys?.push(uploadedCheck.key);
					} else {
						result.attachs?.push({
							buf: attach,
							filename: attachName,
						});
					}

					const name = size ? `${attachName}|${size}` : attachName;
					const attachMarkdown = `![${name}](${attachHash})`; // 哈希后面会被替换成上传后的地址.
					attachText = attachText.replace(attachMatch, attachMarkdown);
				} catch (e) {
					if (e instanceof NoticeError) {
						notify(undefined, e.message);
						continue;
					}
					if (e instanceof AttachmentError) {
						throw e;
					}
					continue;
				}
			}
		}

		// 第二种格式.
		//![](attach.png)
		//![](docs/attach.png)
		//![](https://wewew.ewew.com/xsax/xasxas/xa/attach.png)
		const attachRegex = /!\[(.*?)\]\((.*?)(\.([a-zA-Z0-9]+))\)/g;
		const attachMatches = text.match(attachRegex);
		// console.log("convertLinks: matches 2", attachMatches);
		if (attachMatches) {
			for (let i = 0; i < attachMatches.length; i++) {
				try {
					const attachMatch = attachMatches[i];

					const nameStart = attachMatch.indexOf("[") + 1;
					const nameEnd = attachMatch.indexOf("]");
					let attachName = attachMatch.substring(nameStart, nameEnd);

					let attachPath = "";
					if (attachName == "") {
						attachPath = attachMatch.substring(
							attachMatch.indexOf("(") + 1,
							attachMatch.indexOf(")"),
						);

						if (attachPath.startsWith("http")) {
							if (this.debug) {
								console.debug(`http url attach ${attachPath} skipped`);
							}
							continue;
						}
						attachName = attachPath;
					} else {
						const pathStart = attachMatch.lastIndexOf("(") + 1;
						const pathEnd = attachMatch.lastIndexOf(")");
						attachPath = attachMatch.substring(pathStart, pathEnd);
						if (attachPath.startsWith("http")) {
							if (this.debug) {
								console.debug(`http url attach ${attachPath} skipped`);
							}
							continue;
						}
					}

					const linkedFile = this.obApp.metadataCache.getFirstLinkpathDest(
						attachPath,
						filePath,
					);
					if (!linkedFile) {
						notify(
							undefined,
							`附件引用 ${attachMatch} 的所指向资源不存在，无法继续发布文档`,
						);
						return false;
					}

					const ext = attachName.split(".").pop();
					if (ext === "" || ext === undefined) {
						notify(undefined, `附件引用 ${attachMatch} 不支持没有扩展名的附件`);
						continue;
					}
					if (this.debug) {
						console.debug(`allowed exts:${allowAttachExts} <-> ${ext}`);
					}
					if (allowAttachExts.indexOf(ext) === -1) {
						notify(
							undefined,
							`附件引用 ${attachMatch} 不支持该附件类型: ${ext}`,
						);
						continue;
					}

					const attach = await this.obApp.vault.readBinary(linkedFile);
					if (attach.byteLength > maxAttachSize) {
						notify(
							undefined,
							`附件引用 ${attachMatch} 的资源大小超过了限制，跳过: ${attachName}`,
						);
						continue;
					}

					const attachHash = this.getFileHash(attach);
					const uploadedCheck = await this.checkAttachUploaded(
						filePath,
						vault,
						attachName,
						attach,
					);

					if (uploadedCheck === null) {
						return false;
					}

					// 附件已上传.
					if (uploadedCheck && uploadedCheck.has) {
						result.attachKeys?.push(uploadedCheck.key);
					} else {
						result.attachs?.push({
							buf: attach,
							filename: attachName,
						});
					}
					const attachMarkdown = `![${attachName}](${attachHash})`; // 哈希后面会被替换成上传后的地址.
					attachText = attachText.replace(attachMatch, attachMarkdown);
				} catch (e) {
					if (e instanceof NoticeError) {
						notify(undefined, e.message);
						continue;
					}
					if (e instanceof AttachmentError) {
						throw e;
					}
					continue;
				}
			}
		}

		result.content = attachText;
		return result;
	}
}
