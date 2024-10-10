import { App, Modal, Setting } from "obsidian";

export class Confirm extends Modal {
	title: string;
	content: string;
	onConfirm: () => void;
	onCancel?: () => void;
	constructor(
		app: App,
		title: string,
		content: string = "",
		onConfirm: () => void,
		onCancel?: () => void,
	) {
		super(app);
		this.title = title;
		this.content = content;
		this.onConfirm = onConfirm;
		this.onCancel = onCancel;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: this.title });
		if (this.content !== "") {
			contentEl.createEl("p", { text: this.content });
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("确定")
					.setCta()
					.onClick(() => {
						this.onConfirm();
						this.close();
					}),
			)
			.addButton((btn) =>
				btn
					.setButtonText("取消")
					.setCta()
					.onClick(() => {
						if (this.onCancel !== undefined) {
							this.onCancel();
							this.close();
						}
					}),
			);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
