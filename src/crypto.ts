import { Sha256 } from "@aws-crypto/sha256-browser";

export type BinaryLike = string;

export async function hmacSign(key: string, data: BinaryLike): Promise<string> {
	const hash = new Sha256(key);
	hash.update(data);
	const digest = await hash.digest();
	const hashArr = Array.from(digest);
	const hashHex = hashArr.map((b) => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
	return hashHex;
}

export async function sha256Hash(data: BinaryLike): Promise<string> {
	const hash = new Sha256();
	hash.update(data);
	const digest = await hash.digest();
	const hashArr = Array.from(digest);
	const hashHex = hashArr.map((b) => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
	return hashHex;
}
