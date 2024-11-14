import {
	getSyncAllIconSvg,
	iconNameSyncAllRunning,
	iconNameSyncAllWait,
} from "@/icons/index";
import { log, notify, showNotice, progress } from "@/utils";
import {
	Http,
	AttachConfig,
	RenameDocumentData,
	PublishDocumentData,
	RemoveDocumentData,
} from "@/http";
import {
	App,
	MarkdownPostProcessorContext,
	Plugin,
	PluginManifest,
	TAbstractFile,
	TFile,
	TFolder,
	addIcon,
	setIcon,
} from "obsidian";
import { Confirm } from "@/dialog";
import { RenameQueue } from "@/rename_queue";
import { RemoveQueue } from "@/remove_queue";
import { DEFAULT_SETTINGS, Settings } from "@/setting";
import Markdown from "@/markdown_parser";
import { LangTypeAndAuto, TransItemType, I18n } from "./i18n";
import YdcDocSettingTab from "@/setting_tab";
import * as CodeblockProcessor from "@/codeblock_processor";
import { PluginMode } from "@/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type SyncStatusType = "syncing" | "finish";

/**
 * 插件主程序.
 */
export default class YdcDocPublisher extends Plugin {
	// 全局控制开关. mode=saas.
	enable: boolean;
	debug?: boolean;

	pluginMode: PluginMode;

	settings: Settings;
	syncRibbon?: HTMLElement;
	currSyncMsg?: string;
	syncStatus: SyncStatusType = "finish";
	renameOprLog: RenameQueue;
	removeOprLog: RemoveQueue;
	markdown: Markdown;
	i18n!: I18n;

	requestHandler: Http;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		// if (this.debug) {console.debug("YdcDocPublisher load envs:", process.env);}
		this.pluginMode = process.env.mode as PluginMode;
		console.info("YdcDocPublisher mode:", this.pluginMode);
		if (process.env.debugMain) {
			this.debug = true;
		}
	}

	isSaaSMode(): boolean {
		return this.pluginMode === "saas";
	}
	async onload() {
		const { iconSvgSyncWait, iconSvgSyncRunning } = getSyncAllIconSvg();

		addIcon(iconNameSyncAllWait, iconSvgSyncWait);
		addIcon(iconNameSyncAllRunning, iconSvgSyncRunning);

		await this.prepareSettingAndRequestHandler();

		if (this.isSaaSMode() && !this.settings.valid()) {
			this.enable = false;
		} else {
			await this.preparePlugin();
		}

		this.addSettingTab(
			new YdcDocSettingTab(this.app, this, this.i18n, this.pluginMode),
		);
		this.registerCodeblockProcessors();
	}

	registerCodeblockProcessors() {
		this.registerMarkdownCodeBlockProcessor(
			"outlineTable",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				CodeblockProcessor.renderOutlineTable(source, el, ctx);
			},
		);
		this.registerMarkdownCodeBlockProcessor(
			"listTable",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				CodeblockProcessor.renderListTable(source, el, ctx);
			},
		);
		this.registerMarkdownCodeBlockProcessor(
			"echarts",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				CodeblockProcessor.renderEcharts(source, el, ctx);
			},
		);
		this.registerMarkdownCodeBlockProcessor(
			"fileTree",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				CodeblockProcessor.renderFileTree(source, el, ctx);
			},
		);
		this.registerMarkdownCodeBlockProcessor(
			"markmap",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				CodeblockProcessor.renderMarkmap(source, el, ctx);
			},
		);
		this.registerMarkdownCodeBlockProcessor(
			"markmapVertical",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				CodeblockProcessor.renderMarkmapVertical(source, el, ctx);
			},
		);
		this.registerMarkdownCodeBlockProcessor(
			"timeline",
			(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				CodeblockProcessor.renderTimeLine(source, el, ctx);
			},
		);
	}

	async preparePlugin() {
		this.renameOprLog = new RenameQueue();
		this.removeOprLog = new RemoveQueue();
		this.markdown = new Markdown(
			this.settings,
			this.app,
			this.requestHandler.checkAttachmentHash,
			this.i18n,
		);

		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};

		this.syncRibbon = this.addRibbonIcon(
			iconNameSyncAllWait,
			t("publish_all_docs"),
			async () => this.publishAllDocuments(),
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, target) => {
				if (target instanceof TFile) {
					menu.addItem((item) => {
						item
							.setTitle(t("publish_one_doc"))
							.setIcon("document")
							.onClick(async () => {
								log(t("publishing"));
								try {
									await this.publishSingleDocument(target);
								} catch (e) {
									notify(e, t("publish_err"));
								}
							});
					});
					return;
				}

				menu.addItem((item) => {
					item
						.setTitle(t("publish_path_docs"))
						.setIcon("document")
						.onClick(async () => {
							log(t("publishing"));
							try {
								await this.publishDocuments(target);
							} catch (e) {
								notify(e, t("publish_err"));
							}
						});
				});
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", async (fileOrFolder, oldPath) => {
				if (this.debug) {
					console.debug("this.app.vault.on-rename:", fileOrFolder, oldPath);
				}
				await this.handleRename(fileOrFolder, oldPath);
			}),
		);

		this.registerEvent(
			this.app.vault.on(
				"delete",
				async (target: TAbstractFile) => {
					if (this.debug) {
						console.debug("this.app.vault.on-delete:", target);
					}
					await this.handleRemove(target);
				},
				{},
			),
		);

		if (this.settings.autoSyncRename) {
			this.registerInterval(
				window.setInterval(
					() => this.renameSyncJob(),
					this.settings.autoSyncRenameInterv * 1000,
				),
			);
		}
		if (this.settings.autoSyncRemove) {
			this.registerInterval(
				window.setInterval(
					() => this.removeSyncJob(),
					this.settings.autoSyncRemoveInterv * 1000,
				),
			);
		}
	}

	getFolderDocs(folder: TAbstractFile): TFile[] {
		const files = this.app.vault.getFiles();
		if (files.length < 1) {
			return [];
		}

		if (!(folder instanceof TFolder)) {
			return [];
		}

		const mdFiles: TFile[] = [];
		for (let i = 0; i < files.length; i++) {
			// 仅仅支持md和mdx.
			if (
				!files[i].extension.endsWith("md") &&
				!files[i].extension.endsWith("mdx")
			) {
				continue;
			}

			if (files[i].path.startsWith(folder.path)) {
				mdFiles.push(files[i]);
			}
		}

		return mdFiles;
	}

	getAllDocs(): TFile[] {
		const files = this.app.vault.getFiles();
		if (files.length < 1) {
			return [];
		}

		const mdFiles: TFile[] = [];
		for (let i = 0; i < files.length; i++) {
			// 仅仅支持md和mdx.
			if (
				!files[i].extension.endsWith("md") &&
				!files[i].extension.endsWith("mdx")
			) {
				continue;
			}

			mdFiles.push(files[i]);
		}

		return mdFiles;
	}

	async publishSingleDocument(file: TFile) {
		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};
		if (this.isSaaSMode() && !this.enable) {
			showNotice(t("plugin_expired"));
			return;
		}
		const attachConfig = await this.requestHandler.getAttachConfig();
		if (this.debug) {
			console.debug(`attach config: ${attachConfig}`);
		}
		await this.publishDocument(file, attachConfig);
	}

	// 发布目录下全部文档.
	// 包括子文件夹递归发布.
	async publishDocuments(folder: TAbstractFile) {
		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};
		if (this.isSaaSMode() && !this.enable) {
			showNotice(t("plugin_expired"));
			return;
		}
		if (!(folder instanceof TFolder)) {
			return;
		}
		new Confirm(
			this.app,
			t("publish_one_doc"),
			t("confirm_publish_path_docs"),
			async () => {
				if (this.syncStatus !== "finish") {
					showNotice(t("wait_for_publishing"));
					return;
				}

				const files = this.getFolderDocs(folder);
				if (files.length < 1) {
					showNotice(t("no_docs_to_publish"));
					return;
				}

				const pn = progress(t("start_batch_publish"));

				this.syncStatus = "syncing";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllRunning);
					this.syncRibbon.setAttribute(
						"aria-label",
						t("status_batch_publishing"),
					);
				}

				const attachConfig = await this.requestHandler.getAttachConfig();
				if (this.debug) {
					console.debug(`attach config: ${attachConfig}`);
				}

				for (let i = 0; i < files.length; i++) {
					log(`publishing ${files[i].name} ...`);
					try {
						await this.publishDocument(files[i], attachConfig);
					} catch (e) {
						notify(e, t("publish_err"));
					}
					await sleep(300); // 防止 web 接口频率限制.
				}

				this.syncStatus = "finish";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllWait);
					this.syncRibbon.setAttribute("aria-label", t("publish_path_docs"));
				}
				pn.hide();
			},
			() => {
				showNotice(t("cancel_batch_publish"));
			},
		).open();
	}

	// 仓库全部文档发布.
	async publishAllDocuments() {
		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};
		if (this.isSaaSMode() && !this.enable) {
			showNotice(t("plugin_expired"));
			return;
		}
		new Confirm(
			this.app,
			t("publish_all_docs"),
			t("confirm_publish_all_docs"),
			async () => {
				if (this.syncStatus !== "finish") {
					showNotice(t("wait_for_publishing"));
					return;
				}

				const files = this.getAllDocs();
				if (files.length < 1) {
					showNotice(t("no_docs_to_publish"));
					return;
				}

				const pn = progress(t("start_all_publish"));

				this.syncStatus = "syncing";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllRunning);
					this.syncRibbon.setAttribute(
						"aria-label",
						t("status_all_publishing"),
					);
				}

				const attachConfig = await this.requestHandler.getAttachConfig();
				if (this.debug) {
					console.debug(`attach config:`, attachConfig);
				}

				for (let i = 0; i < files.length; i++) {
					log(`publishing ${files[i].name} ...`);
					try {
						await this.publishDocument(files[i], attachConfig);
					} catch (e) {
						notify(e, t("publish_err"));
					}
					await sleep(300); // 防止 web 接口频率限制.
				}

				this.syncStatus = "finish";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllWait);
					this.syncRibbon.setAttribute("aria-label", t("publish_all_docs"));
				}
				pn.hide();
			},
			() => {
				showNotice(t("cancel_all_publish"));
			},
		).open();
	}

	async handleRename(target: TAbstractFile, oldPath: string) {
		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};
		if (this.isSaaSMode() && !this.enable) {
			showNotice(t("plugin_expired"));
			return;
		}
		if (!(target instanceof TFile)) {
			return;
		}
		if (!target.extension.endsWith("md") && !target.extension.endsWith("mdx")) {
			return;
		}
		this.renameOprLog.add({
			from: oldPath,
			to: target,
		});
		console.info(`handleRename: from ${oldPath} to ${target.path}, job added`);
	}

	async handleRemove(target: TAbstractFile) {
		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};
		if (this.isSaaSMode() && !this.enable) {
			showNotice(t("plugin_expired"));
			return;
		}
		if (!(target instanceof TFile)) {
			return;
		}
		this.removeOprLog.add({
			target: target,
		});
		console.info(`handleRemove: ${target.path}, job added`);
	}

	publishDocument = async (file: TFile, attachConfig: AttachConfig | null) => {
		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};
		const pn = progress(t("publish_doc", { docName: file.name }));
		let data: PublishDocumentData = {
			fileName: file.path,
			vault: this.app.vault.getName(),
			content: "",
			attachs: [],
			attachsUploaded: [],
		};
		const content = await this.markdown.readContent(
			file,
			this.app.vault.getName(),
			attachConfig,
		);
		if (content === false || typeof content == "boolean") {
			notify(undefined, t("canceled_publish_doc", { docName: file.name }));
			pn.hide();
			return;
		}

		data.content = content.content;
		data.attachsUploaded = content.attachKeys;
		data.attachs = content.attachs;

		await this.requestHandler.publishDocument(data);

		pn.hide();
	};

	async renameSyncJob() {
		const job = this.renameOprLog.get();
		if (job === undefined) {
			return;
		}

		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};

		if (this.debug) {
			console.debug(
				`renameSyncJob: check if old doc published: ${job.from}...`,
			);
		}
		const check = await this.requestHandler.checkDocumentPublishStatus({
			fileName: job.from,
			vault: this.app.vault.getName(),
		});
		if (!check) {
			if (this.debug) {
				console.debug(
					`renameSyncJob: old doc ${job.from} not published, skip.`,
				);
			}
			return;
		}
		showNotice(t("status_doc_rename_sync"));
		let data: RenameDocumentData = {
			fileName: job.to.path,
			oldFileName: job.from,
			vault: this.app.vault.getName(),
			file: "",
		};
		data["file"] = "is"; // 标记是文档改名.
		if (this.debug) {
			console.debug(
				`renameSyncJob: rename from ${job.from} to ${job.to.path} in the server...`,
			);
		}
		await this.requestHandler.renameDocument(data);
		if (this.debug) {
			console.debug(
				`renameSyncJob: rename from ${job.from} to ${job.to.path} in the server done.`,
			);
		}
	}

	async removeSyncJob() {
		// if (this.debug) console.debug(`removeSyncJob job start...`);
		const job = this.removeOprLog.get();
		if (job === undefined) {
			return;
		}

		const t = (x: TransItemType, vars?: any) => {
			return this.i18n.t(x, vars);
		};

		if (this.debug) {
			console.debug(
				`removeSyncJob: check if doc published: ${job.target.path}...`,
			);
		}
		const check = await this.requestHandler.checkDocumentPublishStatus({
			fileName: job.target.path,
			vault: this.app.vault.getName(),
		});
		if (!check) {
			if (this.debug) {
				console.debug(
					`removeSyncJob: doc ${job.target.path} not published, skip.`,
				);
			}
			return;
		}

		showNotice(t("status_doc_remove_sync"));
		let data: RemoveDocumentData = {
			fileName: job.target.path,
			vault: this.app.vault.getName(),
		};
		if (this.debug) {
			console.debug(
				`renameSyncJob: removing doc ${job.target.path} from server...`,
			);
		}
		await this.requestHandler.removeDocument(data);
		if (this.debug) {
			console.debug(`renameSyncJob: doc ${job.target.path} removed.`);
		}
	}

	onunload() {}

	async loadPluginStatus() {
			const t = (x: TransItemType, vars?: any) => {
				return this.i18n.t(x, vars);
			};

		const status = await this.requestHandler.getPluginStatus();

		if (status === null) {
			this.enable = false;
			showNotice(t("plugin_not_available"));
			return;
		}

		if (!status.enable) {
			this.enable = false;
			showNotice(t("plugin_not_purchase"));
			return;
		}

		console.info("Plugin status:", status);

		this.enable = status.enable;
		this.settings.enable = status.enable;
		this.settings.expireTime = status.expireTime;
		this.settings.remainingInDays = status.remainingInDays;
		this.settings.remainingInSeconds = status.remainingInSeconds;
	}
	async prepareSettingAndRequestHandler() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// 多语言需要在设置初始化之后配置.
		this.i18n = new I18n(this.settings.lang!, async (lang: LangTypeAndAuto) => {
			this.settings.lang = lang;
			await this.saveSettings();
		});
		
		if (this.isSaaSMode() && !this.settings.valid()) {
			return;
		}

		this.requestHandler = new Http(
			{
				settings: this.settings,
				pluginMode: this.pluginMode,
			},
			this.i18n,
		);
		if (this.isSaaSMode()) {
			await this.loadPluginStatus();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
} // End class YdcDocPublisher.
