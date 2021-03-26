"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nSplit = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const ngx_i18nsupport_lib_1 = require("ngx-i18nsupport-lib");
const util = tslib_1.__importStar(require("util"));
const chalk_1 = require("chalk");
const anymatch_1 = tslib_1.__importDefault(require("anymatch"));
const mkdirp_1 = tslib_1.__importDefault(require("mkdirp"));
const minimist_1 = tslib_1.__importDefault(require("minimist"));
class I18nSplit {
    constructor(splitPath = path_1.default.resolve('./split-module.json'), projectPath = path_1.default.resolve('./xliffmerge.json'), rootId = 'ngi18n', merge = false) {
        this.splitPath = splitPath;
        this.projectPath = projectPath;
        this.rootId = rootId;
        this.merge = merge;
        this.encoding = 'utf8';
        this.otherKey = 'other';
        this.args();
        if (this.merge) {
            this.runMerge();
        }
        else {
            this.runSplit();
        }
    }
    get orderFilePath() {
        return path_1.default.resolve(this.mergeOptions.genDir, '.order.json');
    }
    args() {
        const params = minimist_1.default(process.argv.slice(2));
        if (params.splitModule) {
            this.splitPath = path_1.default.resolve(params.splitModule);
        }
        if (params.profile) {
            this.projectPath = path_1.default.resolve(params.profile);
        }
        if (params.m || params.merge) {
            this.merge = true;
        }
    }
    async runMerge() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = this.prepareFiles();
        // const ordering = this.getOrder();
        this.doMerge();
    }
    async runSplit() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = this.prepareFiles();
        await this.doSplit();
    }
    prepareFiles() {
        const languages = ['origin', ...this.mergeOptions.languages];
        const exchMap = new Map();
        for (const lang of languages) {
            if (lang) {
                const parsed = path_1.default.parse(this.mergeOptions.i18nFile);
                const fileName = parsed.name + this.getFileLangExt(lang) + parsed.ext;
                const pathFile = path_1.default.resolve(this.mergeOptions.genDir, fileName);
                const content = fs.readFileSync(pathFile, this.encoding);
                const file = ngx_i18nsupport_lib_1.TranslationMessagesFileFactory.fromFileContent(ngx_i18nsupport_lib_1.FORMAT_XLIFF20, content, pathFile, this.encoding);
                exchMap.set(lang, {
                    file,
                    path: pathFile,
                    matches: new Map(),
                });
            }
        }
        return exchMap;
    }
    getUnitForLocation(key, locationFindOther, file, matches) {
        const list = [];
        const order = {};
        let index = 0;
        file.forEachTransUnit((tu) => {
            index++;
            const id = tu.id;
            if (!matches.has(id)) {
                if (typeof locationFindOther === 'boolean') {
                    list.push(tu);
                    order[id] = index;
                    matches.set(id, { splitModuleKey: key, unit: tu });
                }
                else {
                    for (const ref of tu.sourceReferences()) {
                        if (anymatch_1.default(locationFindOther, ref.sourcefile)) {
                            list.push(tu);
                            order[id] = index;
                            matches.set(id, { splitModuleKey: key, unit: tu });
                            break;
                        }
                    }
                }
            }
        });
        return { list, order };
    }
    translateForModule(path, target, updateState) {
        const content = fs.readFileSync(path, this.encoding);
        const source = ngx_i18nsupport_lib_1.TranslationMessagesFileFactory.fromFileContent(ngx_i18nsupport_lib_1.FORMAT_XLIFF20, content, path, this.encoding);
        source.forEachTransUnit((tu) => {
            this.translateFromTarget(tu, target, updateState);
        });
    }
    clearAllUnits(copy) {
        copy['transUnits'] = [];
        const tuNode = copy['_parsedDocument'].getElementById(this.rootId);
        if (tuNode) {
            tuNode.textContent = '';
        }
        copy.countNumbers();
    }
    normalizeLocation(location) {
        if (location.startsWith('/')) {
            return location.substring(1);
        }
        return location;
    }
    doMerge() {
        for (const [lang, entity] of this.exchangeMap) {
            this.mergeLang(lang, entity);
        }
    }
    async doSplit() {
        for (const [lang, entity] of this.exchangeMap) {
            await this.splitLang(lang, entity);
        }
    }
    mergeLang(lang, entity) {
        console.log(util.format(chalk_1.green('Merging translation for %s'), entity.file.targetLanguage() || 'Not defined, (origin)'));
        const parsed = path_1.default.parse(entity.path);
        for (const key of Object.keys(this.splitModule)) {
            const targetPath = this.getWritePath(lang, parsed.ext, key);
            this.translateForModule(targetPath, entity.file, lang !== 'origin');
            console.log(chalk_1.magenta('Updated by module:'), key);
        }
        const targetPath = this.getWritePath(lang, parsed.ext);
        this.translateForModule(targetPath, entity.file, lang !== 'origin');
        console.log(chalk_1.magenta('Updated by module:'), this.otherKey);
        fs.writeFileSync(entity.path, entity.file.editedContent(true), {
            encoding: this.encoding,
        });
        console.log(chalk_1.magenta('Updated file:'), entity.path);
    }
    async splitLang(lang, entity) {
        console.log(util.format(chalk_1.green('Translation for %s'), entity.file.targetLanguage() || 'Not defined, (origin)'));
        const parsed = path_1.default.parse(entity.path);
        const target = this.getWritePath(lang, parsed.ext, '');
        const newFile = entity.file.createTranslationFileForLang(entity.file.targetLanguage(), target, false, false);
        this.clearAllUnits(newFile);
        const totalOrder = {};
        await mkdirp_1.default(path_1.default.resolve(this.mergeOptions.genDir, lang));
        for (const [key, location] of Object.entries(this.splitModule)) {
            const { list, order } = this.getUnitForLocation(key, this.normalizeLocation(location), entity.file, entity.matches);
            const targetPath = this.getWritePath(lang, parsed.ext, key);
            this.writeSplitFile(list, newFile, targetPath);
            if (lang === 'origin') {
                totalOrder[key] = order;
            }
        }
        // rest
        const { list: listRest, order: orderRest } = this.getUnitForLocation(this.otherKey, true, entity.file, entity.matches);
        this.writeSplitFile(listRest, newFile, this.getWritePath(lang, parsed.ext));
        if (lang === 'origin') {
            totalOrder[this.otherKey] = orderRest;
            this.writeOrder(totalOrder);
        }
        return lang;
    }
    writeOrder(order) {
        fs.writeFileSync(this.orderFilePath, JSON.stringify(order, null, 2), {
            encoding: this.encoding,
        });
    }
    getOrder() {
        try {
            return JSON.parse(fs.readFileSync(this.orderFilePath, this.encoding));
        }
        catch (e) {
            return null;
        }
    }
    getWritePath(lang, ext, key = this.otherKey) {
        return path_1.default.resolve(this.mergeOptions.genDir, lang, key + this.getFileLangExt(lang) + ext);
    }
    getFileLangExt(lang) {
        return lang === 'origin' ? '' : '.' + lang;
    }
    translateFromTarget(tu, target, updateState = true) {
        const newUnit = target.transUnitWithId(tu.id);
        if (newUnit) {
            const content = tu.targetContent();
            if (content) {
                newUnit.translate(content);
            }
            if (updateState) {
                newUnit.setTargetState(tu.targetState());
            }
        }
    }
    writeSplitFile(list, sourceEmpty, targetPath) {
        const newFile = sourceEmpty.createTranslationFileForLang(sourceEmpty.targetLanguage(), targetPath, false, false);
        for (const unit of list) {
            newFile.importNewTransUnit(unit, false, false);
            this.translateFromTarget(unit, newFile);
        }
        fs.writeFileSync(targetPath, newFile.editedContent(true), {
            encoding: this.encoding,
        });
        console.log(chalk_1.magenta('Created file:'), targetPath);
    }
    async findSplitModuleFile() {
        return (await Promise.resolve().then(() => tslib_1.__importStar(require(this.splitPath)))).paths;
    }
    async findProfileFile() {
        let file;
        try {
            file = (await Promise.resolve().then(() => tslib_1.__importStar(require(this.projectPath))));
        }
        catch (err) {
            try {
                file = (await Promise.resolve().then(() => tslib_1.__importStar(require(path_1.default.resolve('package.json')))));
                if (!('xliffmergeOptions' in file)) {
                    file = null;
                }
            }
            catch (e) {
                file = null;
            }
        }
        if (!file) {
            throw Error(chalk_1.red('XLIFFMerge profile not found (xliffmerge.json | package.json["xliffmergeOptions"])'));
        }
        return file.xliffmergeOptions;
    }
}
exports.I18nSplit = I18nSplit;
new I18nSplit();
//# sourceMappingURL=i18n-split.js.map