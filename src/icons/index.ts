import { createElement, FolderSync, FolderUp } from "lucide";

export const iconNameSyncAllWait = "ydc-doc-sync-all-wait";
export const iconNameSyncAllRunning = "ydc-doc-sync-all-running";

export const getSyncAllIconSvg = () => {
	const iconSvgSyncWait = createElement(FolderSync);
	iconSvgSyncWait.setAttribute("width", "100");
	iconSvgSyncWait.setAttribute("height", "100");
	const iconSvgSyncRunning = createElement(FolderUp);
	iconSvgSyncRunning.setAttribute("width", "100");
	iconSvgSyncRunning.setAttribute("height", "100");
	const res = {
		iconSvgSyncWait: iconSvgSyncWait.outerHTML,
		iconSvgSyncRunning: iconSvgSyncRunning.outerHTML,
	};

	iconSvgSyncWait.empty();
	iconSvgSyncRunning.empty();
	return res;
};
