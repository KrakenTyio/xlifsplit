import path from 'path';
import * as fs from 'fs';
import { FORMAT_XLIFF20, ITransUnit, TranslationMessagesFileFactory } from 'ngx-i18nsupport-lib';
import { Xliff2File } from 'ngx-i18nsupport-lib/dist/src/impl/xliff2-file';
import {
    IConfigFile,
    IXliffMergeOptions,
} from 'ngx-i18nsupport/src/xliffmerge/i-xliff-merge-options';
import * as util from 'util';
import { magenta, red, green } from 'chalk';
import anymatch from 'anymatch';
import mkdirp from 'mkdirp';
import minimist from 'minimist';

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

type Langs = string | 'origin';

export class I18nSplit {
    encoding: BufferEncoding = 'utf8';
    otherKey = 'other';
    splitModule: SplitModuleJSON;
    mergeOptions: IXliffMergeOptions;

    exchangeMap: Map<Langs, ExchangeEntity>;

    protected splitPath: string;
    protected projectPath: string;

    constructor(
        public rootId: string = 'ngi18n',
        public merge: boolean = false,
    ) {
        this.args();
        if (this.merge) {
            this.runMerge();
        } else {
            this.runSplit();
        }
    }

    get orderFilePath() {
        return path.resolve(this.mergeOptions.genDir, '.order.json');
    }

    args() {
        const params = minimist<{
            splitModule: string;
            profile: string;
            m: boolean;
            merge: boolean;
        }>(process.argv.slice(2));
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
    }

    async runMerge() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = this.prepareFiles();
        // const ordering = this.getOrder();
        this.doMerge();
    }

    async runSplit() {
        this.splitModule = await this.findSplitModuleFile();
        this.mergeOptions = await this.findProfileFile();
        this.exchangeMap = this.prepareFiles();
        await this.doSplit();
    }

    prepareFiles() {
        const languages = ['origin', ...this.mergeOptions.languages];

        const exchMap = new Map<Langs, ExchangeEntity>();

        for (const lang of languages) {
            if (lang) {
                const parsed = path.parse(this.mergeOptions.i18nFile);
                const fileName = parsed.name + this.getFileLangExt(lang) + parsed.ext;

                const pathFile = path.resolve(this.mergeOptions.genDir, fileName);

                const content = fs.readFileSync(pathFile, this.encoding);

                const file = TranslationMessagesFileFactory.fromFileContent(
                    FORMAT_XLIFF20,
                    content,
                    pathFile,
                    this.encoding,
                ) as Xliff2File;

                exchMap.set(lang, {
                    file,
                    path: pathFile,
                    matches: new Map<string, Match>(),
                });
            }
        }

        return exchMap;
    }

    getUnitForLocation(
        key: string,
        locationFindOther: string | boolean,
        file: Xliff2File,
        matches: Map<string, Match>,
    ) {
        const list: ITransUnit[] = [];
        const order: OrderType = {};

        let index = 0;
        file.forEachTransUnit((tu: ITransUnit) => {
            index++;

            const id = tu.id;

            if (!matches.has(id)) {
                if (typeof locationFindOther === 'boolean') {
                    list.push(tu);
                    order[id] = index;
                    matches.set(id, { splitModuleKey: key, unit: tu });
                } else {
                    for (const ref of tu.sourceReferences()) {
                        if (anymatch(locationFindOther, ref.sourcefile)) {
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

    translateForModule(path: string, target: Xliff2File, updateState?: boolean) {
        const content = fs.readFileSync(path, this.encoding);

        const source = TranslationMessagesFileFactory.fromFileContent(
            FORMAT_XLIFF20,
            content,
            path,
            this.encoding,
        ) as Xliff2File;

        source.forEachTransUnit((tu: ITransUnit) => {
            this.translateFromTarget(tu, target, updateState);
        });
    }

    clearAllUnits(copy: Xliff2File) {
        copy['transUnits'] = [];

        const tuNode: Node = copy['_parsedDocument'].getElementById(this.rootId);
        if (tuNode) {

new I18nSplit();
            tuNode.textContent = '';
        }

        copy.countNumbers();
    }

    normalizeLocation(location: string) {
        if (location.startsWith('/')) {
            return location.substring(1);
        }

        return location;
    }

    doMerge() {
        for (const [lang, entity] of this.exchangeMap) {
            this.mergeLang(lang, entity);
        }
    }

    async doSplit() {
        for (const [lang, entity] of this.exchangeMap) {
            await this.splitLang(lang, entity);
        }
    }

    mergeLang(lang: Langs, entity: ExchangeEntity) {
        console.log(
            util.format(
                green('Merging translation for %s'),
                entity.file.targetLanguage() || 'Not defined, (origin)',
            ),
        );

        const parsed = path.parse(entity.path);

        for (const key of Object.keys(this.splitModule)) {
            const targetPath = this.getWritePath(lang, parsed.ext, key);
            this.translateForModule(targetPath, entity.file, lang !== 'origin');
            console.log(magenta('Updated by module:'), key);
        }

        const targetPath = this.getWritePath(lang, parsed.ext);
        this.translateForModule(targetPath, entity.file, lang !== 'origin');
        console.log(magenta('Updated by module:'), this.otherKey);

        fs.writeFileSync(entity.path, entity.file.editedContent(true), {
            encoding: this.encoding,
        });
        console.log(magenta('Updated file:'), entity.path);
    }

    async splitLang(lang: Langs, entity: ExchangeEntity) {
        console.log(
            util.format(
                green('Translation for %s'),
                entity.file.targetLanguage() || 'Not defined, (origin)',
            ),
        );

        const parsed = path.parse(entity.path);
        const target = this.getWritePath(lang, parsed.ext, '');

        const newFile = entity.file.createTranslationFileForLang(
            entity.file.targetLanguage(),
            target,
            false,
            false,
        ) as Xliff2File;

        this.clearAllUnits(newFile);

        const totalOrder: Order = {};

        await mkdirp(path.resolve(this.mergeOptions.genDir, lang));

        for (const [key, location] of Object.entries(this.splitModule)) {
            const { list, order } = this.getUnitForLocation(
                key,
                this.normalizeLocation(location),
                entity.file,
                entity.matches,
            );

            const targetPath = this.getWritePath(lang, parsed.ext, key);
            this.writeSplitFile(list, newFile, targetPath);

            if (lang === 'origin') {
                totalOrder[key] = order;
            }
        }

        // rest

        const { list: listRest, order: orderRest } = this.getUnitForLocation(
            this.otherKey,
            true,
            entity.file,
            entity.matches,
        );

        this.writeSplitFile(listRest, newFile, this.getWritePath(lang, parsed.ext));

        if (lang === 'origin') {
            totalOrder[this.otherKey] = orderRest;
            this.writeOrder(totalOrder);
        }

        return lang;
    }

    writeOrder(order: Order) {
        fs.writeFileSync(this.orderFilePath, JSON.stringify(order, null, 2), {
            encoding: this.encoding,
        });
    }

    getOrder(): Order {
        try {
            return JSON.parse(fs.readFileSync(this.orderFilePath, this.encoding)) as Order;
        } catch (e) {
            return null;
        }
    }

    getWritePath(lang: string, ext: string, key: string = this.otherKey) {
        return path.resolve(this.mergeOptions.genDir, lang, key + this.getFileLangExt(lang) + ext);
    }

    getFileLangExt(lang: Langs) {
        return lang === 'origin' ? '' : '.' + lang;
    }

    translateFromTarget(tu: ITransUnit, target: Xliff2File, updateState = true) {
        const newUnit = target.transUnitWithId(tu.id);
        if (newUnit) {
            const content = tu.targetContent();
            if (content) {
                newUnit.translate(content);
            }
            if (updateState) {
                newUnit.setTargetState(tu.targetState());
            }
        }
    }

    writeSplitFile(list: ITransUnit[], sourceEmpty: Xliff2File, targetPath: string) {
        const newFile = sourceEmpty.createTranslationFileForLang(
            sourceEmpty.targetLanguage(),
            targetPath,
            false,
            false,
        ) as Xliff2File;

        for (const unit of list) {
            newFile.importNewTransUnit(unit, false, false);
            this.translateFromTarget(unit, newFile);
        }

        fs.writeFileSync(targetPath, newFile.editedContent(true), {
            encoding: this.encoding,
        });
        console.log(magenta('Created file:'), targetPath);
    }

    async findSplitModuleFile() {
        return (await import(this.splitPath)).paths as SplitModuleJSON;
    }

    async findProfileFile() {
        let file: IConfigFile;
        try {
            file = (await import(this.projectPath)) as IConfigFile;
        } catch (err) {
            try {
                file = (await import(path.resolve('package.json'))) as IConfigFile;

                if (!('xliffmergeOptions' in file)) {
                    file = null;
                }
            } catch (e) {
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
