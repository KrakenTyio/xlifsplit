# xlifsplit

Extension for xliffmerge to splitting to smaller partials and merging back target translation and state to original
xliffmerge files

## Example

- you need to have xliffmerge.json defined languages and genDir

```bash
## fing xliffmerge config and extract transaltions by modules in split-module.json
xliffsplit

## merge back extracted files
xliffsplit -m
```

## Options

| Option         | Meaning                                                                                                                                                                  | Type    | Default             |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|---------------------|
| --splitModule  | Json with locations of modules which will be splitted,<br>resolved by anymatch, <br>directory of file,<br>{paths: {[nameOfModule]: relative path from root of project }} | string  | ./split-module.json |
| --profile      | similar to xliffmerge `-profile`, <br>define path to xliffmerge.json                                                                                                     | string  | ./xliffmerge.json   |
| --merge, -m    | Reverse splitted modules, <br>merge all partials to original xliffmerge files                                                                                            | boolean | false               |
| --syncMode, -s | do Synchronize merge, in default is disable and all langs are merge parallel                                                                                             | boolean | false               |
| --format, -f   | format which used for merging and extracting `xlf` `xlf2` `xmb` `xtb`                                                                                                    | sring   | xlf2                |
