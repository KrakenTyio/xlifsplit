/// <reference types="node" />
import { ExchangeEntity, Langs, Match, Order, OrderType, ValidFormats } from './interfaces';
import { IXliffMergeOptions } from 'ngx-i18nsupport/src/xliffmerge/i-xliff-merge-options';
import { AbstractTransUnit } from 'ngx-i18nsupport-lib/src/impl/abstract-trans-unit';
import { AbstractTranslationMessagesFile } from 'ngx-i18nsupport-lib/src/impl/abstract-translation-messages-file';
export declare function translateFromTarget(tu: AbstractTransUnit, target: AbstractTranslationMessagesFile, updateState?: boolean): void;
export declare function prepareFiles(projectPath: string, mergeOptions: IXliffMergeOptions, encoding: BufferEncoding, format?: ValidFormats, withFile?: boolean): Map<string, ExchangeEntity>;
export declare function prepareFileData({ path, encoding, format, srcLang, trgLang, }: {
    path: string;
    encoding: BufferEncoding;
    format: ValidFormats;
    srcLang?: Langs;
    trgLang: Langs;
}): AbstractTranslationMessagesFile;
export declare function getFileLangExt(lang: Langs): string;
export declare function getWritePath({ lang, ext, key, projectPath, genDir, }: {
    lang: string;
    ext: string;
    key?: string;
    genDir: string;
    projectPath: string;
}): string;
export declare function writeOrder(order: Order, encoding: BufferEncoding, projectPath: string, genDir: string): void;
export declare function getOrder(encoding: BufferEncoding, projectPath: string, genDir: string): Order;
export declare function orderFilePath(projectPath: string, genDir: string): string;
export declare function clearAllUnits(copy: AbstractTranslationMessagesFile, rootId: string): void;
export declare function normalizeLocation(location: string): string;
export declare function getUnitForLocation(key: string, locationFindOther: string | boolean, file: AbstractTranslationMessagesFile, matches: Map<string, Match>): {
    list: AbstractTransUnit[];
    order: OrderType;
};
export declare function writeSplitFile(list: AbstractTransUnit[], sourceEmpty: AbstractTranslationMessagesFile, targetPath: string, encoding: BufferEncoding): void;
