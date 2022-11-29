import fs from 'fs';
import { ITransUnit } from 'ngx-i18nsupport-lib';
import { getWritePath, prepareFileData, translateFromTarget } from './translate-from-target';
import { ExchangeEntity, Langs, SplitModuleJSON, ValidFormats } from './interfaces';
import { green, magenta } from 'chalk';
import path from 'path';
import { otherKey } from './constants';
import { AbstractTransUnit } from 'ngx-i18nsupport-lib/src/impl/abstract-trans-unit';
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
}) => {
    const actualLang = entity.lang || 'origin';

    const keys = Object.keys(splitModule);
    const maxUpdated = keys.length + 1;

    const startTxt = green(`Merging translation for ${actualLang}: 0/${maxUpdated}`);
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

    const updated: string[] = [];
    for (const key of keys) {
        const targetPath = getWritePath({
            lang,
            ext: parsed.ext,
            key: key,
            genDir: genDir,
            projectPath: projectPath,
        });

        const chunkI18n = prepareFileData({
            path: targetPath,
            encoding,
            format,
            trgLang: lang,
            srcLang,
        });

        chunkI18n.forEachTransUnit((tu: ITransUnit) => {
            translateFromTarget(tu as AbstractTransUnit, entity.file, lang !== 'origin');
        });

        updated.push(key);
        const updateTxt = `${magenta(`${actualLang}:`)} ${updated.length}/${maxUpdated}`;
        if (port) {
            port.postMessage(updateTxt);
        } else {
            console.log(updateTxt);
        }
    }

    const targetPath = getWritePath({
        lang,
        ext: parsed.ext,
        genDir: genDir,
        projectPath: projectPath,
    });
    const otherChunkI18n = prepareFileData({
        path: targetPath,
        encoding,
        format,
        trgLang: lang,
        srcLang,
    });
    //
    otherChunkI18n.forEachTransUnit((tu: ITransUnit) => {
        translateFromTarget(tu as AbstractTransUnit, entity.file, lang !== 'origin');
    });
    updated.push(otherKey);

    const lastUpdateTxt = `${magenta(`${actualLang}:`)} ${updated.length}/${maxUpdated}`;
    if (port) {
        port.postMessage(lastUpdateTxt);
    } else {
        console.log(lastUpdateTxt);
    }

    if (updated.length) {
        fs.writeFileSync(entity.path, entity.file.editedContent(true), {
            encoding: encoding,
        });
        const fileWriteTxt = `${green('Updated file:')} ${entity.path}`;
        if (port) {
            port.postMessage(fileWriteTxt);
        } else {
            console.log(fileWriteTxt);
        }
    }

    console.timeEnd(lang);

    return true;
};
