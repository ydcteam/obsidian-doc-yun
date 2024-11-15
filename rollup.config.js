import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import { terser } from "rollup-plugin-terser";
import json from "@rollup/plugin-json";
import copy from "rollup-plugin-copy";
import typescript from "@rollup/plugin-typescript";
import injectProcessEnv from "rollup-plugin-inject-process-env";
import postcss from "rollup-plugin-postcss";
import cssnano from "cssnano";
import fs from "fs";
import path from "path";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const DIST_FOLDER = "dist";
const isProd = process.env.NODE_ENV === "production";
console.info(`=====> Running build on env: ${process.env.NODE_ENV}`);

const manifestStr = fs.readFileSync("manifest.json", "utf-8");
const manifest = JSON.parse(manifestStr);
console.info(
	`=====> Starting build @mode:${process.env.MODE}, @ver:${manifest.version}`,
);

const BASE_CONFIG = {
	input: "src/main.ts",
	external: [
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		"obsidian",
		"crypto",
	],
};

const getRollupPlugins = (...plugins) =>
	[
		json(),
		postcss({
			modules: true,
			plugins: [cssnano({ preset: "default" })],
			extract: path.resolve(`${DIST_FOLDER}/styles.css`),
			use: ["sass"],
		}),
		typescript(),
		replace({
			preventAssignment: true,
			"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
		}),
		commonjs(),
		nodeResolve({ browser: true, preferBuiltins: false }),
		injectProcessEnv(
			{
				NODE_ENV: process.env.NODE_ENV,
				MODE: process.env.MODE,
				debugAuth: process.env.debugAuth,
				debugMain: process.env.debugMain,
				debugHttp: process.env.debugHttp,
			},
			{
				include: ["/src/**"],
				// verbose: true,
			},
		),
	].concat(plugins);

const BUILD_CONFIG = {
	...BASE_CONFIG,
	output: {
		dir: DIST_FOLDER,
		entryFileNames: "main.js",
		format: "cjs",
		exports: "default",
	},
	plugins: [
		...getRollupPlugins(
			...(isProd
				? [
						terser({
							toplevel: false,
							compress: { passes: 2 },
							format: {
								comments: false, // Remove all comments
							},
						}),
					]
				: []),
			copy({
				targets: [
					{
						src:
							process.env.MODE === "saas"
								? "./manifest-saas.json"
								: "./manifest.json",
						rename: "manifest.json",
						dest: `${DIST_FOLDER}`,
					},
				],
				verbose: true,
			}),
		),
		{
			name: "writeGlobalStyles",
			generateBundle: {
				sequential: true,
				order: "post",
				async handler() {
					console.info("=====> writeGlobalStyles: start");
					const globalStyles = fs.readFileSync("./global.styles.css", "utf8");
					console.info("=====> writeGlobalStyles: read");
					const data = await cssnano().process(globalStyles);
					console.info("=====> writeGlobalStyles: processed");
					fs.appendFileSync(
						`./${DIST_FOLDER}/styles.css`,
						`\n${data.css}`,
						function (err) {
							console.error("=====> writeGlobalStyles error:", err);
						},
					);
					console.info("=====> writeGlobalStyles: saved");
				},
			},
		},
	],
};

export default [BUILD_CONFIG];
