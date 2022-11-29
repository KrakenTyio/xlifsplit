"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const interfaces_1 = require("./interfaces");
const chalk_1 = require("chalk");
const path_1 = tslib_1.__importDefault(require("path"));
const translate_from_target_1 = require("./translate-from-target");
const mkdirp_1 = tslib_1.__importDefault(require("mkdirp"));
const constants_1 = require("./constants");
exports.default = ({ lang, entity, encoding, genDir, srcLang, projectPath, splitModule, format = interfaces_1.ValidFormats.FORMAT_XLIFF20, port, rootId, }) => {
    const actualLang = entity.lang || 'origin';
    const entries = Object.entries(splitModule);
    const keys = entries.map(([key]) => key);
    const maxUpdated = keys.length + 1;
    const startTxt = (0, chalk_1.green)(`Translation splitting for ${actualLang}: 0/${maxUpdated}`);
    if (port) {
        port.postMessage(startTxt);
    }
    else {
        console.log(startTxt);
    }
    const parsed = path_1.default.parse(entity.path);
    console.time(lang);
    if (!entity.file) {
        entity.file = (0, translate_from_target_1.prepareFileData)({
            path: entity.path,
            encoding,
            format,
            trgLang: lang,
            srcLang,
        });
    }
    const target = (0, translate_from_target_1.getWritePath)({
        lang,
        ext: parsed.ext,
        key: '',
        genDir,
        projectPath,
    });
    const newFile = entity.file.createTranslationFileForLang(entity.file.targetLanguage(), target, false, false);
    (0, translate_from_target_1.clearAllUnits)(newFile, rootId);
    const totalOrder = {};
    mkdirp_1.default.sync(path_1.default.resolve(path_1.default.dirname(projectPath), genDir, lang));
    const updated = [];
    for (const [key, location] of entries) {
        const { list, order } = (0, translate_from_target_1.getUnitForLocation)(key, (0, translate_from_target_1.normalizeLocation)(location), entity.file, entity.matches);
        const targetPath = (0, translate_from_target_1.getWritePath)({
            lang,
            ext: parsed.ext,
            key,
            genDir,
            projectPath,
        });
        (0, translate_from_target_1.writeSplitFile)(list, newFile, targetPath, encoding);
        updated.push(key);
        const createTxt = `${(0, chalk_1.magenta)(`Created ${actualLang}:`)} ${updated.length}/${maxUpdated}`;
        if (port) {
            port.postMessage(createTxt);
        }
        else {
            console.log(createTxt);
        }
        if (lang === 'origin') {
            totalOrder[key] = order;
        }
    }
    // rest
    const { list: listRest, order: orderRest } = (0, translate_from_target_1.getUnitForLocation)(constants_1.otherKey, true, entity.file, entity.matches);
    (0, translate_from_target_1.writeSplitFile)(listRest, newFile, (0, translate_from_target_1.getWritePath)({
        lang,
        ext: parsed.ext,
        genDir,
        projectPath,
    }), encoding);
    updated.push(constants_1.otherKey);
    const createTxt = `${(0, chalk_1.magenta)(`Created ${actualLang}:`)} ${updated.length}/${maxUpdated}`;
    if (port) {
        port.postMessage(createTxt);
    }
    else {
        console.log(createTxt);
    }
    if (lang === 'origin') {
        totalOrder[constants_1.otherKey] = orderRest;
        (0, translate_from_target_1.writeOrder)(totalOrder, encoding, projectPath, genDir);
    }
    console.timeEnd(lang);
    return lang;
};
