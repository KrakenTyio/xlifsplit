/// <reference types="node" />
import { ITransUnit } from 'ngx-i18nsupport-lib';
import { Xliff2File } from 'ngx-i18nsupport-lib/dist/src/impl/xliff2-file';
import { IXliffMergeOptions } from 'ngx-i18nsupport/src/xliffmerge/i-xliff-merge-options';
interface SplitModuleJSON {
    [key: string]: string;
}
interface Match {
    splitModuleKey: keyof SplitModuleJSON;
    unit: ITransUnit;
}
/**
 * path
 * file
 * matches: Map<infer ITransUnit.id, { splitModuleKey: keyof SplitModuleJSON; unit: ITransUnit }>
 */
interface ExchangeEntity {
    path: string;
    file: Xliff2File;
    matches: Map<string, Match>;
}
interface OrderType {
    [key: string]: number;
}
interface Order {
    [key: string]: OrderType;
}
declare type Langs = string | 'origin';
export declare class I18nSplit {
    splitPath: string;
    projectPath: string;
    rootId: string;
    merge: boolean;
    encoding: BufferEncoding;
    otherKey: string;
    splitModule: SplitModuleJSON;
    mergeOptions: IXliffMergeOptions;
    exchangeMap: Map<Langs, ExchangeEntity>;
    constructor(splitPath?: string, projectPath?: string, rootId?: string, merge?: boolean);
    get orderFilePath(): string;
    args(): void;
    runMerge(): Promise<void>;
    runSplit(): Promise<void>;
    prepareFiles(): Map<string, ExchangeEntity>;
    getUnitForLocation(key: string, locationFindOther: string | boolean, file: Xliff2File, matches: Map<string, Match>): {
        list: ITransUnit[];
        order: OrderType;
    };
    translateForModule(path: string, target: Xliff2File, updateState?: boolean): void;
    clearAllUnits(copy: Xliff2File): void;
    normalizeLocation(location: string): string;
    doMerge(): void;
    doSplit(): Promise<void>;
    mergeLang(lang: Langs, entity: ExchangeEntity): void;
    splitLang(lang: Langs, entity: ExchangeEntity): Promise<string>;
    writeOrder(order: Order): void;
    getOrder(): Order;
    getWritePath(lang: string, ext: string, key?: string): string;
    getFileLangExt(lang: Langs): string;
    translateFromTarget(tu: ITransUnit, target: Xliff2File, updateState?: boolean): void;
    writeSplitFile(list: ITransUnit[], sourceEmpty: Xliff2File, targetPath: string): void;
    findSplitModuleFile(): Promise<SplitModuleJSON>;
    findProfileFile(): Promise<IXliffMergeOptions>;
}
export {};
