all: build compress

compress:
	cd dist && \
	zip -r obsidian-ydc-yun.zip obsidian-ydc-yun && \
	shasum -a 256 obsidian-ydc-yun.zip > obsidian-ydc-yun.sha256sum

build:
	yarn && \
	yarn build && \
	cd dist && \
	mkdir -p obsidian-ydc-yun && \
	mv -f ./main.js obsidian-ydc-yun/main.js && \
	mv -f ./manifest.json obsidian-ydc-yun/manifest.json && \
	mv -f ./styles.css obsidian-ydc-yun/styles.css

dev:
	yarn && \
	yarn dev && \
	cd dist && \
	mkdir -p obsidian-ydc-yun && \
	mv -f ./main.js obsidian-ydc-yun/main.js && \
	mv -f ./manifest.json obsidian-ydc-yun/manifest.json && \
	mv -f ./styles.css obsidian-ydc-yun/styles.css

clean:
	rm -rf dist/*
	
.PHONY: all dev build compress clean
