NODE := node
TSC := ./node_modules/typescript/bin/tsc
tsfiles := $(shell find src -name "*.ts")

run: out/index.js
	@$(NODE) out/index.js

out/index.js: index.ts $(tsfiles)
	@$(TSC) --build tsconfig.json

test:
	@npx jest
