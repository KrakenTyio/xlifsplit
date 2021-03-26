```shell
cd example
xliffmerge --profile ./xliffmerge.json
xliffsplit --splitModule ./split-module.json --profile ./xliffmerge.json
## translate this partials
## then get back together with
xliffsplit --splitModule ./split-module.json --profile ./xliffmerge.json -m
```
