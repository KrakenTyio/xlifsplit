/// <reference types="node" />
import { IXliffMergeOptions } from 'ngx-i18nsupport/src/xliffmerge/i-xliff-merge-options';
import { ExchangeEntity, Langs, SplitModuleJSON, ValidFormats } from './interfaces';
export declare class I18nSplit {
    rootId: string;
    merge: boolean;
    syncMode: boolean;
    encoding: BufferEncoding;
    format: ValidFormats;
    splitModule: SplitModuleJSON;
    mergeOptions: IXliffMergeOptions;
    exchangeMap: Map<Langs, ExchangeEntity>;
    protected splitPath: string;
    protected projectPath: string;
    constructor(rootId?: string, merge?: boolean, syncMode?: boolean);
    args(): void;
    runMerge(): Promise<void>;
    runSplit(): Promise<void>;
    doMerge(): Promise<boolean[]>;
    doMergeSync(): Promise<void>;
    doSplit(): Promise<boolean[]>;
    doSplitSync(): Promise<void>;
    findSplitModuleFile(): Promise<SplitModuleJSON>;
    findProfileFile(): Promise<IXliffMergeOptions>;
}
