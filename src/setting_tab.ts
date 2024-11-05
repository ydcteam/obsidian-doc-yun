import { App, PluginSettingTab, Setting } from "obsidian";
import { showNotice } from "@/utils";
import YdcDocPublisher from "@/main";
import { I18n, TransItemType } from "./i18n";

/**
 * 设置页面.
 */
export default class YdcDocSettingTab extends PluginSettingTab {
	plugin: YdcDocPublisher;
	i18n!: I18n;
	HelpManual: {
		helpText: string;
		helpLink: string;
		homeText?: string;
		homeUrl?: string;
	};

	constructor(app: App, plugin: YdcDocPublisher, i18n: I18n) {
		super(app, plugin);
		this.plugin = plugin;
		this.i18n = i18n;
		this.HelpManual = {
			helpText: this.t("manual_title"),
			helpLink: "https://ydc.asia/doc_index",
			homeText: this.t("manual_link_text"),
			homeUrl: "https://web.ydc.show",
		};
	}

	t = (x: TransItemType, vars?: any) => {
		return this.i18n.t(x, vars);
	};

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const mainDoc = containerEl.createDiv();
		mainDoc.createEl("div", undefined, (div) => {
			div.createEl("h3", { text: this.t("setting_main_title") });
		});

		mainDoc.createEl("h3", { text: this.t("setting_name") });
		new Setting(mainDoc)
			.setName(this.t("setting_yidong_account"))
			.setDesc(this.t("setting_yidong_account_desc"))
			.addText((text) =>
				text
					.setPlaceholder(this.t("setting_yidong_account_place_holder"))
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(mainDoc)
			.setName(this.t("setting_yidong_ob_publish_url"))
			.setDesc(this.t("setting_yidong_ob_publish_url_desc"))
			.addText((text) =>
				text
					.setPlaceholder(this.t("setting_yidong_ob_publish_url_place_holder"))
					.setValue(this.plugin.settings.url)
					.onChange(async (value) => {
						this.plugin.settings.url = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(mainDoc)
			.setName(this.t("setting_yidong_api_key"))
			.setDesc(this.t("setting_yidong_api_key_desc"))
			.addText((text) =>
				text
					.setPlaceholder(this.t("setting_yidong_api_key_place_holder"))
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(mainDoc)
			.setName("API Secret")
			.setDesc(this.t("setting_yidong_api_secret_desc"))
			.addText((text) =>
				text
					.setPlaceholder(this.t("setting_yidong_api_secret_place_holder"))
					.setValue(this.plugin.settings.apiSecret)
					.onChange(async (value) => {
						this.plugin.settings.apiSecret = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		mainDoc.createEl("h3", { text: this.t("setting_extra_name") });

		mainDoc.createEl("h4", {
			text: this.t("setting_rename_auto_sync_main_title"),
		});

		new Setting(mainDoc)
			.setName(this.t("setting_rename_auto_sync"))
			.setDesc(this.t("setting_rename_auto_sync_desc"))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.autoSyncRename)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncRename = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(mainDoc)
			.setName(this.t("setting_rename_auto_sync_freq"))
			.setDesc(this.t("setting_rename_auto_sync_freq_desc"))
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

		mainDoc.createEl("h4", {
			text: this.t("setting_remove_auto_sync_main_title"),
		});

		new Setting(mainDoc)
			.setName(this.t("setting_remove_auto_sync"))
			.setDesc(this.t("setting_remove_auto_sync_desc"))
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.autoSyncRemove)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncRemove = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(mainDoc)
			.setName(this.t("setting_remove_auto_sync_freq"))
			.setDesc(this.t("setting_remove_auto_sync_freq_desc"))
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

		mainDoc.createEl("h3", { text: this.t("setting_help_doc_main_title") });

		const helpDoc = mainDoc.createDiv();
		helpDoc.createEl("div", undefined, (div) => {
			div.createEl("p", { text: this.HelpManual.helpText });
			div.createEl(
				"span",
				{ text: this.t("setting_help_doc_main_go_detail") },
				(span) => {
					span.createEl("a", {
						text: this.t("setting_help_doc_name"),
						href: this.HelpManual.helpLink,
					});
				},
			);

			div.createEl("p", undefined, (p) => {
				p.createEl("a", {
					text: this.HelpManual.homeText,
					href: this.HelpManual.homeUrl,
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
			showNotice(this.t("warn_sync_freq_need_int"));
			return def;
		}
		const interv = parseInt(s.trim());
		if (interv < 0 || interv > 10) {
			showNotice(this.t("warn_sync_freq_range", { min: min, max: max }));
			return def;
		}

		return interv;
	}
}
