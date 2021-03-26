# xlifsplit
Extension for xliffmerge to splitting to smaller partials and merging back target translation and state to original xliffmerge files

## Example
- you need to have xliffmerge.json defined languages and genDir

```bash
## fing xliffmerge config and extract transaltions by modules in split-module.json
xliffsplit

## merge back extracted files
xliffsplit -m
```

## Options
| Option       | Meaning                                                                                                                                                              | Type    | Default             |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|---------------------|
| -splitModule | Json with locations of modules which will be splitted,<br>resolved by `anymatch`,<br>{paths: {[nameOfModule]: relative path from root of project, directory of file }} | string  | ./split-module.json |
| -profile     | similar to xliffmerge `-profile`, define path to xliffmerge.json                                                                                                     | string  | ./xliffmerge.json   |
| -merge, -m   | Reverse splitted modules, merge all partials to original xliffmerge files                                                                                            | boolean | false               |
