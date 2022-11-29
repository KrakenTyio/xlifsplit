"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeSplitFile = exports.getUnitForLocation = exports.normalizeLocation = exports.clearAllUnits = exports.orderFilePath = exports.getOrder = exports.writeOrder = exports.getWritePath = exports.getFileLangExt = exports.prepareFileData = exports.prepareFiles = exports.translateFromTarget = void 0;
const tslib_1 = require("tslib");
const ngx_i18nsupport_lib_1 = require("ngx-i18nsupport-lib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const interfaces_1 = require("./interfaces");
const constants_1 = require("./constants");
const xtb_file_1 = require("ngx-i18nsupport-lib/dist/src/impl/xtb-file");
const anymatch_1 = tslib_1.__importDefault(require("anymatch"));
function translateFromTarget(tu, target, updateState = true) {
    let newUnit = target.transUnitWithId(tu.id);
    if (!newUnit) {
        newUnit = target.importNewTransUnit(tu, false, false);
    }
    if (newUnit) {
        const content = tu.targetContent();
        if (content) {
            newUnit['translateNative'](content);
            // newUnit.translate(content);
        }
        if (updateState) {
            const state = tu.targetState();
            if (state) {
                newUnit['setNativeTargetState'](newUnit['mapStateToNativeState'](state));
                // newUnit.setTargetState(state);
            }
        }
    }
}
exports.translateFromTarget = translateFromTarget;
function prepareFiles(projectPath, mergeOptions, encoding, format = interfaces_1.ValidFormats.FORMAT_XLIFF20, withFile = true) {
    const languages = ['origin', ...mergeOptions.languages];
    const exchMap = new Map();
    for (const lang of languages) {
        if (lang) {
            const parsed = path_1.default.parse(mergeOptions.i18nFile);
            const fileName = parsed.name + getFileLangExt(lang) + parsed.ext;
            const pathFile = path_1.default.resolve(path_1.default.dirname(projectPath), mergeOptions.genDir, fileName);
            exchMap.set(lang, {
                file: withFile
                    ? prepareFileData({
                        path: pathFile,
                        encoding,
                        format,
                        trgLang: lang,
                        srcLang: mergeOptions.defaultLanguage,
                    })
                    : null,
                lang: lang,
                path: pathFile,
                matches: new Map(),
            });
        }
    }
    return exchMap;
}
exports.prepareFiles = prepareFiles;
function prepareFileData({ path, encoding, format = interfaces_1.ValidFormats.FORMAT_XLIFF20, srcLang = 'en-GB', trgLang, }) {
    let content = '';
    try {
        content = fs_1.default.readFileSync(path, encoding);
    }
    catch (e) {
        console.error(`File not exist yet: ${path}`);
        switch (format) {
            case interfaces_1.ValidFormats.FORMAT_XLIFF20:
                content =
                    '<?xml version="1.0" encoding="UTF-8"?>\n ' +
                        `<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="${srcLang}" trgLang="${trgLang}">\n ` +
                        '<file original="ng.template" id="ngi18n">\n ' +
                        '</file>\n' +
                        '</xliff>';
                break;
            case interfaces_1.ValidFormats.FORMAT_XLIFF12:
                content =
                    '<?xml version="1.0" encoding="UTF-8"?>\n' +
                        '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n  ' +
                        `<file source-language="${srcLang}" target-language="${trgLang}" datatype="plaintext" original="ng2.template">\n  ` +
                        '</file>\n' +
                        '</xliff>';
                break;
            case interfaces_1.ValidFormats.FORMAT_XMB:
            case interfaces_1.ValidFormats.FORMAT_XTB:
                content =
                    '<?xml version="1.0" encoding="UTF-8"?>\n' +
                        xtb_file_1.XTB_DOCTYPE +
                        '\n<translationbundle>\n</translationbundle>\n';
                break;
            default:
                throw Error('Unsupported init file');
        }
    }
    return ngx_i18nsupport_lib_1.TranslationMessagesFileFactory.fromFileContent(format, content, path, encoding);
}
exports.prepareFileData = prepareFileData;
function getFileLangExt(lang) {
    return lang === 'origin' ? '' : '.' + lang;
}
exports.getFileLangExt = getFileLangExt;
function getWritePath({ lang, ext, key = constants_1.otherKey, projectPath, genDir, }) {
    return path_1.default.resolve(path_1.default.dirname(projectPath), genDir, lang, key + getFileLangExt(lang) + ext);
}
exports.getWritePath = getWritePath;
function writeOrder(order, encoding, projectPath, genDir) {
    fs_1.default.writeFileSync(orderFilePath(projectPath, genDir), JSON.stringify(order, null, 2), {
        encoding,
    });
}
exports.writeOrder = writeOrder;
function getOrder(encoding, projectPath, genDir) {
    try {
        return JSON.parse(fs_1.default.readFileSync(orderFilePath(projectPath, genDir), encoding));
    }
    catch (e) {
        console.error(e);
        return null;
    }
}
exports.getOrder = getOrder;
function orderFilePath(projectPath, genDir) {
    return path_1.default.resolve(path_1.default.dirname(projectPath), genDir, '.order.json');
}
exports.orderFilePath = orderFilePath;
function clearAllUnits(copy, rootId) {
    copy['transUnits'] = [];
    const tuNode = copy['_parsedDocument'].getElementById(rootId);
    if (tuNode) {
        tuNode.textContent = '';
    }
    copy.countNumbers();
}
exports.clearAllUnits = clearAllUnits;
function normalizeLocation(location) {
    if (location.startsWith('/')) {
        return location.substring(1);
    }
    return location;
}
exports.normalizeLocation = normalizeLocation;
function getUnitForLocation(key, locationFindOther, file, matches) {
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
                    if ((0, anymatch_1.default)(locationFindOther, ref.sourcefile)) {
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
exports.getUnitForLocation = getUnitForLocation;
function writeSplitFile(list, sourceEmpty, targetPath, encoding) {
    const newFile = sourceEmpty.createTranslationFileForLang(sourceEmpty.targetLanguage(), targetPath, false, false);
    for (const unit of list) {
        newFile.importNewTransUnit(unit, false, false);
        translateFromTarget(unit, newFile);
    }
    fs_1.default.writeFileSync(targetPath, newFile.editedContent(true), {
        encoding,
    });
}
exports.writeSplitFile = writeSplitFile;
