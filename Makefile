NODE := node
TSC := ./node_modules/typescript/bin/tsc
NPX := npx
tsfiles := $(shell find src -name "*.ts")
requires := ./requires/polyfill.min.js

outjs ?= $(shell find out/prod -maxdepth 1 -name "*.js")

dist: $(tsfiles) out/prod
	@make test
	$(foreach var,$(outjs),make dist/$(basename $(notdir $(var))).min.js;)

out/prod: index.ts $(tsfiles)
	@$(TSC) --build tsconfig.prod.json

dist/%.min.js: out/prod/%.js
	@mkdir -p dist
	@$(NPX) browserify $< --standalone $* -p tinyify -o $@

run: out/test/index.js
	@$(NODE) $<

out/test/index.js: index.ts $(tsfiles)
	@$(TSC) --build tsconfig.test.json

test:
	@$(NPX) jest

clean:
	@rm -rf ./out
	@rm -rf ./dist
