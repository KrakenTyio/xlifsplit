import { ExchangeEntity, Langs, Order, SplitModuleJSON, ValidFormats } from './interfaces';
import { green, magenta } from 'chalk';
import path from 'path';
import {
    clearAllUnits,
    getUnitForLocation,
    getWritePath,
    normalizeLocation,
    prepareFileData,
    writeOrder,
    writeSplitFile,
} from './translate-from-target';
import { AbstractTranslationMessagesFile } from 'ngx-i18nsupport-lib/src/impl/abstract-translation-messages-file';
import mkdirp from 'mkdirp';
import { otherKey } from './constants';
import { MessagePort } from 'worker_threads';

export default ({
    lang,
    entity,
    encoding,
    genDir,
    srcLang,
    projectPath,
    splitModule,
    format = ValidFormats.FORMAT_XLIFF20,
    port,
    rootId,
}: {
    lang: Langs;
    entity: ExchangeEntity;
    updateState?: boolean;
    encoding: BufferEncoding;
    genDir: string;
    srcLang: Langs;
    projectPath: string;
    splitModule: SplitModuleJSON;
    format: ValidFormats;
    port?: MessagePort;
    rootId: string;
}) => {
    const actualLang = entity.lang || 'origin';

    const entries = Object.entries(splitModule);
    const keys = entries.map(([key]) => key);

    const maxUpdated = keys.length + 1;

    const startTxt = green(`Translation splitting for ${actualLang}: 0/${maxUpdated}`);
    if (port) {
        port.postMessage(startTxt);
    } else {
        console.log(startTxt);
    }

    const parsed = path.parse(entity.path);

    console.time(lang);

    if (!entity.file) {
        entity.file = prepareFileData({
            path: entity.path,
            encoding,
            format,
            trgLang: lang,
            srcLang,
        });
    }

    const target = getWritePath({
        lang,
        ext: parsed.ext,
        key: '',
        genDir,
        projectPath,
    });

    const newFile = entity.file.createTranslationFileForLang(
        entity.file.targetLanguage(),
        target,
        false,
        false,
    ) as AbstractTranslationMessagesFile;

    clearAllUnits(newFile, rootId);

    const totalOrder: Order = {};

    mkdirp.sync(path.resolve(path.dirname(projectPath), genDir, lang));

    const updated: string[] = [];
    for (const [key, location] of entries) {
        const { list, order } = getUnitForLocation(
            key,
            normalizeLocation(location),
            entity.file,
            entity.matches,
        );

        const targetPath = getWritePath({
            lang,
            ext: parsed.ext,
            key,
            genDir,
            projectPath,
        });
        writeSplitFile(list, newFile, targetPath, encoding);
        updated.push(key);
        const createTxt = `${magenta(`Created ${actualLang}:`)} ${updated.length}/${maxUpdated}`;
        if (port) {
            port.postMessage(createTxt);
        } else {
            console.log(createTxt);
        }

        if (lang === 'origin') {
            totalOrder[key] = order;
        }
    }

    // rest

    const { list: listRest, order: orderRest } = getUnitForLocation(
        otherKey,
        true,
        entity.file,
        entity.matches,
    );

    writeSplitFile(
        listRest,
        newFile,
        getWritePath({
            lang,
            ext: parsed.ext,
            genDir,
            projectPath,
        }),
        encoding,
    );
    updated.push(otherKey);
    const createTxt = `${magenta(`Created ${actualLang}:`)} ${updated.length}/${maxUpdated}`;
    if (port) {
        port.postMessage(createTxt);
    } else {
        console.log(createTxt);
    }

    if (lang === 'origin') {
        totalOrder[otherKey] = orderRest;
        writeOrder(totalOrder, encoding, projectPath, genDir);
    }

    console.timeEnd(lang);

    return lang;
};
