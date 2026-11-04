/**
 * @eqworker/node —— 仅 Node.js 环境可用的能力层。
 *
 * 与 core 分开的原因：core 要能进浏览器与小程序，不能出现 `node:fs`。
 * 这里放所有依赖文件系统的东西：文件存储适配器、数据目录定位、导出。
 */
export { createFileAdapter, createFileStore } from './storage/file';
export type { FileAdapter, FileAdapterOptions } from './storage/file';
export { dataDir, resolveDataFile, ensureDataDir } from './paths';
