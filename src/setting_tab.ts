import { App, PluginSettingTab, Setting } from "obsidian";
import { showNotice } from "@/utils";
import HelpManual from "@/manual_doc";
import YdcDocPublisher from "@/main";

/**
 * 设置页面.
 */
export default class YdcDocSettingTab extends PluginSettingTab {
	plugin: YdcDocPublisher;

	constructor(app: App, plugin: YdcDocPublisher) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const mainDoc = containerEl.createDiv();
		mainDoc.createEl("div", undefined, (div) => {
			div.createEl("h3", undefined, (h4) => {
				h4.innerText = "【易东云】文档发布平台";
			});
		});

		mainDoc.createEl("h3", { text: "设置" });
		new Setting(mainDoc)
			.setName("易东云账号")
			.setDesc("易东云登录账号名")
			.addText((text) =>
				text
					.setPlaceholder("输入易东云账号")
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(mainDoc)
			.setName("发布地址")
			.setDesc("易东云管理后台获取到的Obsidian发布地址")
			.addText((text) =>
				text
					.setPlaceholder("输入地址")
					.setValue(this.plugin.settings.url)
					.onChange(async (value) => {
						this.plugin.settings.url = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(mainDoc)
			.setName("API Key")
			.setDesc("用户认证KEY")
			.addText((text) =>
				text
					.setPlaceholder("请输入认证KEY")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(mainDoc)
			.setName("API Secret")
			.setDesc("用户认证密钥")
			.addText((text) =>
				text
					.setPlaceholder("请输入认证密钥")
					.setValue(this.plugin.settings.apiSecret)
					.onChange(async (value) => {
						this.plugin.settings.apiSecret = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		mainDoc.createEl("h3", { text: "扩展设置" });

		mainDoc.createEl("h4", { text: "重命名文档操作自动同步" });

		new Setting(mainDoc)
			.setName("自动同步")
			.setDesc(
				"是否在后台自动同步已发布文档的重命名操作到易东云. 注意：启用后请重新启用插件才可生效.",
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.autoSyncRename)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncRename = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(mainDoc)
			.setName("自动同步频率")
			.setDesc(
				"自动同步重命名文档的时间频率，单位秒. 默认 3 秒一次. 如果频繁需要重命名，可以调到 1 秒.",
			)
			.addText((t) =>
				t
					.setValue(`${this.plugin.settings.autoSyncRenameInterv}`)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncRenameInterv = this.parseSyncInterv(
							value,
							3,
						);
						await this.plugin.saveSettings();
					}),
			);

		mainDoc.createEl("h4", { text: "删除文档操作自动同步" });

		new Setting(mainDoc)
			.setName("自动同步")
			.setDesc(
				"是否在后台自动同步已发布文档的删除操作到易东云. 注意：启用后请重新启用插件才可生效.",
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.autoSyncRemove)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncRemove = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(mainDoc)
			.setName("自动同步频率")
			.setDesc(
				"自动同步文档删除操作的时间频率，单位秒. 默认 3 秒一次. 如果频繁需要删除，可以调到 1 秒.",
			)
			.addText((t) =>
				t
					.setValue(`${this.plugin.settings.autoSyncRemoveInterv}`)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncRemoveInterv = this.parseSyncInterv(
							value,
							3,
						);
						await this.plugin.saveSettings();
					}),
			);

		mainDoc.createEl("hr");

		mainDoc.createEl("h3", { text: "使用帮助" });

		const helpDoc = mainDoc.createDiv();
		helpDoc.createEl("div", undefined, (div) => {
			div.createEl("p", undefined, (p) => {
				p.innerText = HelpManual.helpText;
			});
			div.createEl("span", undefined, (span) => {
				span.innerText = "详情请阅读 ";
				span.createEl("a", undefined, (link) => {
					link.href = HelpManual.helpLink;
					link.innerText = "帮助文档";
				});
			});

			div.createEl("p", undefined, (p) => {
				p.createEl("a", undefined, (link) => {
					link.href = HelpManual.homeUrl;
					link.innerText = HelpManual.homeText;
				});
			});
		});
	}

	parseSyncInterv(
		s: string,
		def: number = 3,
		min: number = 1,
		max: number = 10,
	): number {
		if (!/^\d+$/.test(s)) {
			showNotice("同步频率配置需要是一个整数");
			return def;
		}
		const interv = parseInt(s.trim());
		if (interv < 0 || interv > 10) {
			showNotice(`自动同步频率配置值: ${min}~${max}`);
			return def;
		}

		return interv;
	}
}
