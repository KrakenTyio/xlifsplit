"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const translate_from_target_1 = require("./translate-from-target");
const interfaces_1 = require("./interfaces");
const chalk_1 = require("chalk");
const path_1 = tslib_1.__importDefault(require("path"));
const constants_1 = require("./constants");
exports.default = ({ lang, entity, encoding, genDir, srcLang, projectPath, splitModule, format = interfaces_1.ValidFormats.FORMAT_XLIFF20, port, }) => {
    const actualLang = entity.lang || 'origin';
    const keys = Object.keys(splitModule);
    const maxUpdated = keys.length + 1;
    const startTxt = (0, chalk_1.green)(`Merging translation for ${actualLang}: 0/${maxUpdated}`);
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
    const updated = [];
    for (const key of keys) {
        const targetPath = (0, translate_from_target_1.getWritePath)({
            lang,
            ext: parsed.ext,
            key: key,
            genDir: genDir,
            projectPath: projectPath,
        });
        const chunkI18n = (0, translate_from_target_1.prepareFileData)({
            path: targetPath,
            encoding,
            format,
            trgLang: lang,
            srcLang,
        });
        chunkI18n.forEachTransUnit((tu) => {
            (0, translate_from_target_1.translateFromTarget)(tu, entity.file, lang !== 'origin');
        });
        updated.push(key);
        const updateTxt = `${(0, chalk_1.magenta)(`${actualLang}:`)} ${updated.length}/${maxUpdated}`;
        if (port) {
            port.postMessage(updateTxt);
        }
        else {
            console.log(updateTxt);
        }
    }
    const targetPath = (0, translate_from_target_1.getWritePath)({
        lang,
        ext: parsed.ext,
        genDir: genDir,
        projectPath: projectPath,
    });
    const otherChunkI18n = (0, translate_from_target_1.prepareFileData)({
        path: targetPath,
        encoding,
        format,
        trgLang: lang,
        srcLang,
    });
    //
    otherChunkI18n.forEachTransUnit((tu) => {
        (0, translate_from_target_1.translateFromTarget)(tu, entity.file, lang !== 'origin');
    });
    updated.push(constants_1.otherKey);
    const lastUpdateTxt = `${(0, chalk_1.magenta)(`${actualLang}:`)} ${updated.length}/${maxUpdated}`;
    if (port) {
        port.postMessage(lastUpdateTxt);
    }
    else {
        console.log(lastUpdateTxt);
    }
    if (updated.length) {
        fs_1.default.writeFileSync(entity.path, entity.file.editedContent(true), {
            encoding: encoding,
        });
        const fileWriteTxt = `${(0, chalk_1.green)('Updated file:')} ${entity.path}`;
        if (port) {
            port.postMessage(fileWriteTxt);
        }
        else {
            console.log(fileWriteTxt);
        }
    }
    console.timeEnd(lang);
    return true;
};
