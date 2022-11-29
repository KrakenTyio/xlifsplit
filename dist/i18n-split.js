"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nSplit = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = require("chalk");
const minimist_1 = tslib_1.__importDefault(require("minimist"));
const process = tslib_1.__importStar(require("process"));
const translate_from_target_1 = require("./translate-from-target");
const interfaces_1 = require("./interfaces");
const piscina_1 = tslib_1.__importDefault(require("piscina"));
const worker_threads_1 = require("worker_threads");
class I18nSplit {
    constructor(rootId = 'ngi18n', merge = false, syncMode = false) {
        this.rootId = rootId;
        this.merge = merge;
        this.syncMode = syncMode;
        this.encoding = 'utf8';
        this.format = interfaces_1.ValidFormats.FORMAT_XLIFF20;
        this.args();
        if (this.merge) {
            this.runMerge();
        }
        else {
            this.runSplit();
        }
    }
    args() {
        const params = (0, minimist_1.default)(process.argv.slice(2));
        const allowParams = [
            '_',
            'splitModule',
            'profile',
            'm',
            'merge',
            'syncMode',
            's',
            'format',
            'f',
        ];
        for (const key of Object.keys(params)) {
            if (!allowParams.includes(key)) {
                throw Error((0, chalk_1.red)(`CLI Parameter ${key} is not allowed`));
            }
        }
        if (params.splitModule) {
            this.splitPath = path_1.default.resolve(params.splitModule);
        }
        else {
            this.splitPath = path_1.default.resolve('./split-module.json');
        }
        if (params.profile) {
            this.projectPath = path_1.default.resolve(params.profile);
        }
        else {
            this.projectPath = path_1.default.resolve('./xliffmerge.json');
        }
        if (params.m || params.merge) {
            this.merge = true;
        }
        if (params.s || params.syncMode) {
            this.syncMode = true;
        }
        if (params.f || params.format) {
            const format = params.f || params.format;
            if (Object.values(interfaces_1.ValidFormats).includes(format)) {
                this.format = format;
            }
        }
    }
    async runMerge() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = (0, translate_from_target_1.prepareFiles)(this.projectPath, this.mergeOptions, this.encoding, this.format, false);
        // const ordering = this.getOrder();
        if (this.syncMode) {
            await this.doMergeSync();
        }
        else {
            await this.doMerge();
        }
    }
    async runSplit() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = (0, translate_from_target_1.prepareFiles)(this.projectPath, this.mergeOptions, this.encoding, this.format, false);
        if (this.syncMode) {
            await this.doSplitSync();
        }
        else {
            await this.doSplit();
        }
    }
    async doMerge() {
        const piscina = new piscina_1.default({
            filename: path_1.default.resolve(__dirname, './merge-for-module.ts'),
        });
        const list = [];
        for (const [lang, entity] of this.exchangeMap) {
            const channel = new worker_threads_1.MessageChannel();
            channel.port2.on('message', (message) => {
                console.log(message);
            });
            list.push(piscina.run({
                lang,
                entity,
                encoding: this.encoding,
                genDir: this.mergeOptions.genDir,
                srcLang: this.mergeOptions.defaultLanguage,
                projectPath: this.projectPath,
                splitModule: this.splitModule,
                format: this.format,
                port: channel.port1,
            }, { transferList: [channel.port1] }).then((state) => {
                channel.port2.close();
                return state;
            }));
        }
        return Promise.all(list);
    }
    async doMergeSync() {
        for (const [lang, entity] of this.exchangeMap) {
            (await Promise.resolve().then(() => tslib_1.__importStar(require('./merge-for-module')))).default({
                lang,
                entity,
                encoding: this.encoding,
                genDir: this.mergeOptions.genDir,
                srcLang: this.mergeOptions.defaultLanguage,
                projectPath: this.projectPath,
                splitModule: this.splitModule,
                format: this.format,
            });
        }
    }
    async doSplit() {
        const piscina = new piscina_1.default({
            filename: path_1.default.resolve(__dirname, './split-for-module.ts'),
        });
        const list = [];
        for (const [lang, entity] of this.exchangeMap) {
            const channel = new worker_threads_1.MessageChannel();
            channel.port2.on('message', (message) => {
                console.log(message);
            });
            list.push(piscina.run({
                lang,
                entity,
                encoding: this.encoding,
                genDir: this.mergeOptions.genDir,
                srcLang: this.mergeOptions.defaultLanguage,
                projectPath: this.projectPath,
                splitModule: this.splitModule,
                format: this.format,
                port: channel.port1,
                rootId: this.rootId,
            }, { transferList: [channel.port1] }).then((state) => {
                channel.port2.close();
                return state;
            }));
        }
        return Promise.all(list);
    }
    async doSplitSync() {
        for (const [lang, entity] of this.exchangeMap) {
            (await Promise.resolve().then(() => tslib_1.__importStar(require('./split-for-module')))).default({
                lang,
                entity,
                encoding: this.encoding,
                genDir: this.mergeOptions.genDir,
                srcLang: this.mergeOptions.defaultLanguage,
                projectPath: this.projectPath,
                splitModule: this.splitModule,
                format: this.format,
                rootId: this.rootId,
            });
        }
    }
    async findSplitModuleFile() {
        var _a;
        return (await (_a = this.splitPath, Promise.resolve().then(() => tslib_1.__importStar(require(_a))))).paths;
    }
    async findProfileFile() {
        var _a, _b;
        let file;
        try {
            file = (await (_a = this.projectPath, Promise.resolve().then(() => tslib_1.__importStar(require(_a)))));
        }
        catch (err) {
            console.error(err);
            try {
                file = (await (_b = path_1.default.resolve('package.json'), Promise.resolve().then(() => tslib_1.__importStar(require(_b)))));
                if (!('xliffmergeOptions' in file)) {
                    file = null;
                }
            }
            catch (e) {
                console.error(e);
                file = null;
            }
        }
        if (!file) {
            throw Error((0, chalk_1.red)('XLIFFMerge profile not found (xliffmerge.json | package.json["xliffmergeOptions"])'));
        }
        return file.xliffmergeOptions;
    }
}
exports.I18nSplit = I18nSplit;
if ('TS_NODE_DEV' in process.env) {
    new I18nSplit();
}
