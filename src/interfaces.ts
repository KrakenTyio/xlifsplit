import { AbstractTransUnit } from 'ngx-i18nsupport-lib/src/impl/abstract-trans-unit';
import { AbstractTranslationMessagesFile } from 'ngx-i18nsupport-lib/src/impl/abstract-translation-messages-file';

export interface SplitModuleFile {
    paths: SplitModuleJSON;
}

export interface SplitModuleJSON {
    [key: string]: string;
}

export interface Match {
    splitModuleKey: keyof SplitModuleJSON;
    unit: AbstractTransUnit;
}

/**
 * path
 * file
 * matches: Map<infer ITransUnit.id, { splitModuleKey: keyof SplitModuleJSON; unit: ITransUnit }>
 */
export interface ExchangeEntity {
    path: string;
    file: AbstractTranslationMessagesFile;
    lang: string;
    matches: Map<string, Match>;
}

export interface OrderType {
    [key: string]: number;
}

export interface Order {
    [key: string]: OrderType;
}

export type Langs = string | 'origin';

export enum ValidFormats {
    FORMAT_XLIFF12 = 'xlf',
    FORMAT_XLIFF20 = 'xlf2',
    FORMAT_XMB = 'xmb',
    FORMAT_XTB = 'xtb',
}

export interface CLIParameters {
    splitModule: string;
    profile: string;
    m: boolean;
    merge: boolean;
    syncMode: boolean;
    s: boolean;
    format: ValidFormats;
    f: ValidFormats;
}
