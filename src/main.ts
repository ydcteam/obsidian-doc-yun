import {
	getSyncAllIconSvg,
	iconNameSyncAllRunning,
	iconNameSyncAllWait,
} from "@/icons/index";
import { log, notify, showNotice, progress } from "@/utils";
import {
	Http,
	AttachConfig,
	PostDocumentData,
	PostDocumentWithAttachData,
	RemoveDocumentData,
} from "@/http";
import {
	App,
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
import YdcDocSettingTab from "@/setting_tab";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type SyncStatusType = "syncing" | "finish";

/**
 * 插件主程序.
 */
export default class YdcDocPublisher extends Plugin {
	debug?: boolean;
	settings: Settings;
	syncRibbon?: HTMLElement;
	currSyncMsg?: string;
	syncStatus: SyncStatusType = "finish";
	renameOprLog: RenameQueue;
	removeOprLog: RemoveQueue;
	markdown: Markdown;

	requestHandler: Http;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		if (process.env.debugMain) {
			this.debug = true;
		}
	}

	async onload() {
		const { iconSvgSyncWait, iconSvgSyncRunning } = getSyncAllIconSvg();

		addIcon(iconNameSyncAllWait, iconSvgSyncWait);
		addIcon(iconNameSyncAllRunning, iconSvgSyncRunning);

		await this.prepareSettingAndRequestHandler();
		await this.preparePlugin();

		this.addSettingTab(new YdcDocSettingTab(this.app, this));
	}

	async preparePlugin() {
		this.renameOprLog = new RenameQueue();
		this.removeOprLog = new RemoveQueue();
		this.markdown = new Markdown(
			this.settings,
			this.app,
			this.requestHandler.checkAttachmentHash,
		);

		this.syncRibbon = this.addRibbonIcon(
			iconNameSyncAllWait,
			"易东云-全部发布",
			async () => this.publishAllDocuments(),
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, target) => {
				if (target instanceof TFile) {
					menu.addItem((item) => {
						item
							.setTitle("发布到易东云")
							.setIcon("document")
							.onClick(async () => {
								log("发布中...");
								try {
									await this.publishSingleDocument(target);
								} catch (e) {
									notify(e, "文档发布失败");
								}
							});
					});
					return;
				}

				menu.addItem((item) => {
					item
						.setTitle("全部发布到易东云")
						.setIcon("document")
						.onClick(async () => {
							log("文件夹发布中...");
							try {
								await this.publishDocuments(target);
							} catch (e) {
								notify(e, "文档发布失败");
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
		const attachConfig = await this.requestHandler.getAttachConfig();
		if (this.debug) {
			console.debug(`attach config: ${attachConfig}`);
		}
		await this.publishDocument(file, attachConfig);
	}

	// 发布目录下全部文档.
	// 包括子文件夹递归发布.
	async publishDocuments(folder: TAbstractFile) {
		if (!(folder instanceof TFolder)) {
			return;
		}
		new Confirm(
			this.app,
			"发布到易东云",
			"是否发布该目录的全部文档到易东云?",
			async () => {
				if (this.syncStatus !== "finish") {
					showNotice("请等待之前的操作完成");
					return;
				}

				const files = this.getFolderDocs(folder);
				if (files.length < 1) {
					showNotice("没有待发布的文档");
					return;
				}

				const pn = progress("开始批量发布文档...");

				this.syncStatus = "syncing";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllRunning);
					this.syncRibbon.setAttribute(
						"aria-label",
						"正在发布目录全部文档中...",
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
						notify(e, "文档发布失败");
					}
					await sleep(300); // 防止 web 接口频率限制.
				}

				this.syncStatus = "finish";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllWait);
					this.syncRibbon.setAttribute("aria-label", "易东云-全部发布");
				}
				pn.hide();
			},
			() => {
				showNotice("取消目录全部发布");
			},
		).open();
	}

	// 仓库全部文档发布.
	async publishAllDocuments() {
		new Confirm(
			this.app,
			"发布到易东云",
			"是否发布全部文档到易东云?",
			async () => {
				if (this.syncStatus !== "finish") {
					showNotice("请等待之前的操作完成");
					return;
				}

				const files = this.getAllDocs();
				if (files.length < 1) {
					showNotice("没有待发布的文档");
					return;
				}

				const pn = progress("开始批量发布文档...");

				this.syncStatus = "syncing";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllRunning);
					this.syncRibbon.setAttribute("aria-label", "正在发布全部文档中...");
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
						notify(e, "文档发布失败");
					}
					await sleep(300); // 防止 web 接口频率限制.
				}

				this.syncStatus = "finish";
				if (this.syncRibbon !== undefined) {
					setIcon(this.syncRibbon, iconNameSyncAllWait);
					this.syncRibbon.setAttribute("aria-label", "易东云-全部发布");
				}
				pn.hide();
			},
			() => {
				showNotice("取消全部发布");
			},
		).open();
	}

	async handleRename(target: TAbstractFile, oldPath: string) {
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
		if (!(target instanceof TFile)) {
			return;
		}
		this.removeOprLog.add({
			target: target,
		});
		console.info(`handleRemove: ${target.path}, job added`);
	}

	publishDocument = async (file: TFile, attachConfig: AttachConfig | null) => {
		const pn = progress(`发布文档 ${file.name} 中...`);
		let data: PostDocumentWithAttachData = {
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
			notify(undefined, `文档 ${file.name} 取消发布`);
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

		showNotice(`同步文档名称变更中...`);
		let data: PostDocumentData = {
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

		showNotice(`同步文档删除操作中...`);
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

	async prepareSettingAndRequestHandler() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.requestHandler = new Http({
			settings: this.settings,
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
} // End class YdcDocPublisher.
