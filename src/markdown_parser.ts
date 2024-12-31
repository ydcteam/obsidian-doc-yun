import { Settings } from "@/setting";
import { notify } from "@/utils";
import {
	AttachConfig,
	CheckAttachmentResult,
	PublishDocumentAttachData,
} from "@/http";
import { App, TFile, getLinkpath } from "obsidian";
import * as SparkMD5 from "spark-md5";
import { AttachmentError, NoticeError } from "@/errors";
import { I18n, TransItemType } from "./i18n";

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
	attachs?: PublishDocumentAttachData[]; // 带上传的.
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
	i18n: I18n;

	constructor(
		settings: Settings,
		app: App,
		checker: AttachChecker,
		i18n: I18n,
	) {
		this.settings = settings;
		this.obApp = app;
		this.attachChecker = checker;
		if (process.env.debugMarkdownParser) {
			this.debug = true;
		}
		this.i18n = i18n;
	}

	t = (x: TransItemType, vars?: any) => {
		return this.i18n.t(x, vars);
	};

	readContent = async (
		file: TFile,
		vault: string,
		attachConfig: AttachConfig | null,
	): Promise<ConvertLinkResult | boolean> => {
		const text = await this.obApp.vault.cachedRead(file);
		// console.log(`origin text: ${text}`);
		if (attachConfig === null) {
			notify(undefined, this.t("err_no_attach_conf"));
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
		const attachRegexType1 =
			/!\[\[(.*?)(\.([a-zA-Z0-9]+))\|(.*?)\]\]|!\[\[(.*?)(\.([a-zA-Z0-9]+))\]\]/g;
		const attachMatchesType1 = text.match(attachRegexType1);
		// console.log("convertLinks: matches", attachMatchesType1);
		if (attachMatchesType1) {
			for (let i = 0; i < attachMatchesType1.length; i++) {
				try {
					const attachMatch = attachMatchesType1[i];
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
							this.t("err_doc_attach_ref_invalid", { msg: attachMatch }),
						);
						return false;
					}
					const ext = attachName.split(".").pop();
					if (ext === "" || ext === undefined) {
						notify(
							undefined,
							this.t("err_attach_no_ext", { msg: attachMatch }),
						);
						continue;
					}
					if (this.debug) {
						console.debug(`allowed exts:${allowAttachExts} <-> ${ext}`);
					}
					if (allowAttachExts.indexOf(ext) === -1) {
						notify(
							undefined,
							this.t("err_attach_no_support", { filename: attachName }),
						);
						continue;
					}
					const attach = await this.obApp.vault.readBinary(linkedFile);
					if (attach.byteLength > maxAttachSize) {
						notify(
							undefined,
							this.t("err_attach_oversize_skipped", { filename: attachName }),
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
		const attachRegexType2 = /!\[(.*?)\]\((.*?)(\.([a-zA-Z0-9]+))\)/g;
		const attachMatchesType2 = text.match(attachRegexType2);
		// console.log("convertLinks: matches 2", attachMatchesType2);
		if (attachMatchesType2) {
			for (let i = 0; i < attachMatchesType2.length; i++) {
				try {
					const attachMatch = attachMatchesType2[i];

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
							this.t("err_doc_attach_ref_invalid", { msg: attachMatch }),
						);
						return false;
					}

					const ext = attachName.split(".").pop();
					if (ext === "" || ext === undefined) {
						notify(
							undefined,
							this.t("err_attach_no_ext", { msg: attachMatch }),
						);
						continue;
					}
					if (this.debug) {
						console.debug(`allowed exts:${allowAttachExts} <-> ${ext}`);
					}
					if (allowAttachExts.indexOf(ext) === -1) {
						notify(
							undefined,
							this.t("err_attach_no_support", { filename: attachName }),
						);
						continue;
					}

					const attach = await this.obApp.vault.readBinary(linkedFile);
					if (attach.byteLength > maxAttachSize) {
						notify(
							undefined,
							this.t("err_attach_oversize_skipped", { filename: attachName }),
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
