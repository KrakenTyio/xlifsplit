import path from 'path';
import {
    IConfigFile,
    IXliffMergeOptions,
} from 'ngx-i18nsupport/src/xliffmerge/i-xliff-merge-options';
import { red } from 'chalk';
import minimist from 'minimist';
import * as process from 'process';
import { prepareFiles } from './translate-from-target';
import {
    CLIParameters,
    ExchangeEntity,
    Langs,
    SplitModuleFile,
    SplitModuleJSON,
    ValidFormats,
} from './interfaces';
import Piscina from 'piscina';
import { MessageChannel } from 'worker_threads';

export class I18nSplit {
    encoding: BufferEncoding = 'utf8';
    format: ValidFormats = ValidFormats.FORMAT_XLIFF20;
    splitModule: SplitModuleJSON;
    mergeOptions: IXliffMergeOptions;

    exchangeMap: Map<Langs, ExchangeEntity>;

    protected splitPath: string;
    protected projectPath: string;

    constructor(public rootId = 'ngi18n', public merge = false, public syncMode = false) {
        this.args();
        if (this.merge) {
            this.runMerge();
        } else {
            this.runSplit();
        }
    }

    args() {
        const params = minimist<CLIParameters>(process.argv.slice(2));

        const allowParams: (keyof CLIParameters | '_')[] = [
            '_', // default minimist key
            'splitModule',
            'profile',
            'm',
            'merge',
            'syncMode',
            's',
            'format',
            'f',
        ];

        for (const key of Object.keys(params)) {
            if (!allowParams.includes(key as keyof CLIParameters)) {
                throw Error(red(`CLI Parameter ${key} is not allowed`));
            }
        }

        if (params.splitModule) {
            this.splitPath = path.resolve(params.splitModule);
        } else {
            this.splitPath = path.resolve('./split-module.json');
        }

        if (params.profile) {
            this.projectPath = path.resolve(params.profile);
        } else {
            this.projectPath = path.resolve('./xliffmerge.json');
        }

        if (params.m || params.merge) {
            this.merge = true;
        }

        if (params.s || params.syncMode) {
            this.syncMode = true;
        }

        if (params.f || params.format) {
            const format = params.f || params.format;
            if (Object.values(ValidFormats).includes(format)) {
                this.format = format;
            }
        }
    }

    async runMerge() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = prepareFiles(
            this.projectPath,
            this.mergeOptions,
            this.encoding,
            this.format,
            false,
        );
        // const ordering = this.getOrder();
        if (this.syncMode) {
            await this.doMergeSync();
        } else {
            await this.doMerge();
        }
    }

    async runSplit() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = prepareFiles(
            this.projectPath,
            this.mergeOptions,
            this.encoding,
            this.format,
            false,
        );

        if (this.syncMode) {
            await this.doSplitSync();
        } else {
            await this.doSplit();
        }
    }

    async doMerge() {
        const piscina = new Piscina({
            filename: path.resolve(__dirname, './merge-for-module'),
        });

        const list: Promise<boolean>[] = [];
        for (const [lang, entity] of this.exchangeMap) {
            const channel = new MessageChannel();
            channel.port2.on('message', (message) => {
                console.log(message);
            });

            list.push(
                (
                    piscina.run(
                        {
                            lang,
                            entity,
                            encoding: this.encoding,
                            genDir: this.mergeOptions.genDir,
                            srcLang: this.mergeOptions.defaultLanguage,
                            projectPath: this.projectPath,
                            splitModule: this.splitModule,
                            format: this.format,
                            port: channel.port1,
                        },
                        { transferList: [channel.port1] },
                    ) as Promise<boolean>
                ).then((state) => {
                    channel.port2.close();
                    return state;
                }),
            );
        }

        return Promise.all(list);
    }

    async doMergeSync() {
        for (const [lang, entity] of this.exchangeMap) {
            (await import('./merge-for-module')).default({
                lang,
                entity,
                encoding: this.encoding,
                genDir: this.mergeOptions.genDir,
                srcLang: this.mergeOptions.defaultLanguage,
                projectPath: this.projectPath,
                splitModule: this.splitModule,
                format: this.format,
            });
        }
    }

    async doSplit() {
        const piscina = new Piscina({
            filename: path.resolve(__dirname, './split-for-module'),
        });

        const list: Promise<boolean>[] = [];
        for (const [lang, entity] of this.exchangeMap) {
            const channel = new MessageChannel();
            channel.port2.on('message', (message) => {
                console.log(message);
            });

            list.push(
                (
                    piscina.run(
                        {
                            lang,
                            entity,
                            encoding: this.encoding,
                            genDir: this.mergeOptions.genDir,
                            srcLang: this.mergeOptions.defaultLanguage,
                            projectPath: this.projectPath,
                            splitModule: this.splitModule,
                            format: this.format,
                            port: channel.port1,
                            rootId: this.rootId,
                        },
                        { transferList: [channel.port1] },
                    ) as Promise<boolean>
                ).then((state) => {
                    channel.port2.close();
                    return state;
                }),
            );
        }

        return Promise.all(list);
    }

    async doSplitSync() {
        for (const [lang, entity] of this.exchangeMap) {
            (await import('./split-for-module')).default({
                lang,
                entity,
                encoding: this.encoding,
                genDir: this.mergeOptions.genDir,
                srcLang: this.mergeOptions.defaultLanguage,
                projectPath: this.projectPath,
                splitModule: this.splitModule,
                format: this.format,
                rootId: this.rootId,
            });
        }
    }

    async findSplitModuleFile() {
        return ((await import(this.splitPath)) as SplitModuleFile).paths;
    }

    async findProfileFile() {
        let file: IConfigFile;
        try {
            file = (await import(this.projectPath)) as IConfigFile;
        } catch (err) {
            console.error(err);
            try {
                file = (await import(path.resolve('package.json'))) as IConfigFile;

                if (!('xliffmergeOptions' in file)) {
                    file = null;
                }
            } catch (e) {
                console.error(e);
                file = null;
            }
        }

        if (!file) {
            throw Error(
                red(
                    'XLIFFMerge profile not found (xliffmerge.json | package.json["xliffmergeOptions"])',
                ),
            );
        }

        return file.xliffmergeOptions;
    }
}

if ('TS_NODE_DEV' in process.env) {
    new I18nSplit();
}
