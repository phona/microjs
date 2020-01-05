NODE := node
TSC := ./node_modules/typescript/bin/tsc
NPX := npx
tsfiles := $(shell find src -name "*.ts")

outjs ?= $(shell find out/prod -maxdepth 1 -name "*.js")

dist: $(tsfiles) out/prod
	@make test
	$(foreach var,$(outjs),make dist/$(basename $(notdir $(var))).min.js;)

out/prod: index.ts $(tsfiles)
	@$(TSC) --build tsconfig.prod.json

dist/%.min.js: out/prod/%.js ./requires/polyfill.min.js
	@mkdir -p dist
	@$(NPX) browserify $< --standalone $* -r ./requires/polyfill.min.js -p tinyify -o $@

run: out/test/index.js
	@$(NODE) $<

out/test/index.js: index.ts $(tsfiles)
	@$(TSC) --build tsconfig.test.json

test:
	@$(NPX) jest

clean:
	@rm -rf ./out
	@rm -rf ./dist
