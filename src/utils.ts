import { Notice } from "obsidian";
import { Base64 } from "js-base64";

export const log =
	(msg: string) =>
	<A>(a: A) => {
		console.log(msg, a);
		return a;
	};

export const notify = (e: Error | undefined, msg: string) => {
	console.log(msg);

	if (e) {
		console.error(e);
	}

	new Notice(msg);
};

export const progress = (msg: string): Notice => {
	return new Notice(msg, 0);
};

export const showNotice = (msg: string, timeout?: number) => {
	new Notice(msg, timeout);
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return Base64.btoa(binary);
}

function extractBaseUrl(url: string) {
	return (
		url && url.replace("https://", "").replace("http://", "").replace(/\/$/, "")
	);
}

function kebabize(str: string) {
	return str
		.split("")
		.map((letter, idx) => {
			return letter.toUpperCase() === letter
				? `${idx !== 0 ? "-" : ""}${letter.toLowerCase()}`
				: letter;
		})
		.join("");
}

const wrapAround = (value: number, size: number): number => {
	return ((value % size) + size) % size;
};

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function fixSvgForXmlSerializer(svgElement: SVGSVGElement): void {
	// Insert a comment in the style tags to prevent XMLSerializer from self-closing it during serialization.
	const styles = svgElement.getElementsByTagName("style");
	if (styles.length > 0) {
		for (let i = 0; i < styles.length; i++) {
			const style = styles[i];
			if (!style.textContent?.trim()) {
				style.textContent = "/**/";
			}
		}
	}
}

function sanitizePermalink(permalink: string): string {
	if (!permalink.endsWith("/")) {
		permalink += "/";
	}
	if (!permalink.startsWith("/")) {
		permalink = "/" + permalink;
	}
	return permalink;
}

const generateRandomString = (length: number = 6): string => {
	const characters = "ijklmnopqrstuvabcdefghijklmnopqrstuvwxyz123456789";
	let randomString = "";

	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		randomString += characters.charAt(randomIndex);
	}

	return randomString;
};

export {
	arrayBufferToBase64,
	extractBaseUrl,
	kebabize,
	wrapAround,
	escapeRegExp,
	fixSvgForXmlSerializer,
	sanitizePermalink,
	generateRandomString,
};
