import { ITransUnit, TranslationMessagesFileFactory } from 'ngx-i18nsupport-lib';
import path from 'path';
import fs from 'fs';
import { ExchangeEntity, Langs, Match, Order, OrderType, ValidFormats } from './interfaces';
import { IXliffMergeOptions } from 'ngx-i18nsupport/src/xliffmerge/i-xliff-merge-options';
import { AbstractTransUnit } from 'ngx-i18nsupport-lib/src/impl/abstract-trans-unit';
import { otherKey } from './constants';
import { AbstractTranslationMessagesFile } from 'ngx-i18nsupport-lib/src/impl/abstract-translation-messages-file';
import { XTB_DOCTYPE } from 'ngx-i18nsupport-lib/dist/src/impl/xtb-file';
import anymatch from 'anymatch';

export function translateFromTarget(
    tu: AbstractTransUnit,
    target: AbstractTranslationMessagesFile,
    updateState = true,
) {
    let newUnit = target.transUnitWithId(tu.id) as AbstractTransUnit;

    if (!newUnit) {
        newUnit = target.importNewTransUnit(tu, false, false) as AbstractTransUnit;
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

export function prepareFiles(
    projectPath: string,
    mergeOptions: IXliffMergeOptions,
    encoding: BufferEncoding,
    format: ValidFormats = ValidFormats.FORMAT_XLIFF20,
    withFile = true,
) {
    const languages = ['origin', ...mergeOptions.languages];

    const exchMap = new Map<Langs, ExchangeEntity>();

    for (const lang of languages) {
        if (lang) {
            const parsed = path.parse(mergeOptions.i18nFile);
            const fileName = parsed.name + getFileLangExt(lang) + parsed.ext;

            const pathFile = path.resolve(path.dirname(projectPath), mergeOptions.genDir, fileName);

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
                matches: new Map<string, Match>(),
            });
        }
    }

    return exchMap;
}

export function prepareFileData({
    path,
    encoding,
    format = ValidFormats.FORMAT_XLIFF20,
    srcLang = 'en-GB',
    trgLang,
}: {
    path: string;
    encoding: BufferEncoding;
    format: ValidFormats;
    srcLang?: Langs;
    trgLang: Langs;
}) {
    let content = '';
    try {
        content = fs.readFileSync(path, encoding);
    } catch (e) {
        console.error(`File not exist yet: ${path}`);
        switch (format) {
            case ValidFormats.FORMAT_XLIFF20:
                content =
                    '<?xml version="1.0" encoding="UTF-8"?>\n ' +
                    `<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="${srcLang}" trgLang="${trgLang}">\n ` +
                    '<file original="ng.template" id="ngi18n">\n ' +
                    '</file>\n' +
                    '</xliff>';
                break;
            case ValidFormats.FORMAT_XLIFF12:
                content =
                    '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n  ' +
                    `<file source-language="${srcLang}" target-language="${trgLang}" datatype="plaintext" original="ng2.template">\n  ` +
                    '</file>\n' +
                    '</xliff>';
                break;
            case ValidFormats.FORMAT_XMB:
            case ValidFormats.FORMAT_XTB:
                content =
                    '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    XTB_DOCTYPE +
                    '\n<translationbundle>\n</translationbundle>\n';
                break;
            default:
                throw Error('Unsupported init file');
        }
    }

    return TranslationMessagesFileFactory.fromFileContent(
        format,
        content,
        path,
        encoding,
    ) as AbstractTranslationMessagesFile;
}

export function getFileLangExt(lang: Langs) {
    return lang === 'origin' ? '' : '.' + lang;
}

export function getWritePath({
    lang,
    ext,
    key = otherKey,
    projectPath,
    genDir,
}: {
    lang: string;
    ext: string;
    key?: string;
    genDir: string;
    projectPath: string;
}) {
    return path.resolve(path.dirname(projectPath), genDir, lang, key + getFileLangExt(lang) + ext);
}

export function writeOrder(
    order: Order,
    encoding: BufferEncoding,
    projectPath: string,
    genDir: string,
) {
    fs.writeFileSync(orderFilePath(projectPath, genDir), JSON.stringify(order, null, 2), {
        encoding,
    });
}

export function getOrder(encoding: BufferEncoding, projectPath: string, genDir: string): Order {
    try {
        return JSON.parse(fs.readFileSync(orderFilePath(projectPath, genDir), encoding)) as Order;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function orderFilePath(projectPath: string, genDir: string) {
    return path.resolve(path.dirname(projectPath), genDir, '.order.json');
}

export function clearAllUnits(copy: AbstractTranslationMessagesFile, rootId: string) {
    copy['transUnits'] = [];

    const tuNode: Node = copy['_parsedDocument'].getElementById(rootId);
    if (tuNode) {
        tuNode.textContent = '';
    }

    copy.countNumbers();
}

export function normalizeLocation(location: string) {
    if (location.startsWith('/')) {
        return location.substring(1);
    }

    return location;
}

export function getUnitForLocation(
    key: string,
    locationFindOther: string | boolean,
    file: AbstractTranslationMessagesFile,
    matches: Map<string, Match>,
) {
    const list: AbstractTransUnit[] = [];
    const order: OrderType = {};

    let index = 0;
    file.forEachTransUnit((tu: ITransUnit) => {
        index++;

        const id = tu.id;

        if (!matches.has(id)) {
            if (typeof locationFindOther === 'boolean') {
                list.push(tu as AbstractTransUnit);
                order[id] = index;
                matches.set(id, { splitModuleKey: key, unit: tu as AbstractTransUnit });
            } else {
                for (const ref of tu.sourceReferences()) {
                    if (anymatch(locationFindOther, ref.sourcefile)) {
                        list.push(tu as AbstractTransUnit);
                        order[id] = index;
                        matches.set(id, { splitModuleKey: key, unit: tu as AbstractTransUnit });
                        break;
                    }
                }
            }
        }
    });

    return { list, order };
}

export function writeSplitFile(
    list: AbstractTransUnit[],
    sourceEmpty: AbstractTranslationMessagesFile,
    targetPath: string,
    encoding: BufferEncoding,
) {
    const newFile = sourceEmpty.createTranslationFileForLang(
        sourceEmpty.targetLanguage(),
        targetPath,
        false,
        false,
    ) as AbstractTranslationMessagesFile;

    for (const unit of list) {
        newFile.importNewTransUnit(unit, false, false);
        translateFromTarget(unit, newFile);
    }

    fs.writeFileSync(targetPath, newFile.editedContent(true), {
        encoding,
    });
}
