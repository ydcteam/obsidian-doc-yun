all: build compress

compress:
	cd dist && \
	zip -r obsidian-ydcpub-dep.zip obsidian-ydcpub-dep && \
	shasum -a 256 obsidian-ydcpub-dep.zip > obsidian-ydcpub-dep.sha256sum

build:
	yarn && \
	yarn build && \
	cd dist && \
	mkdir -p obsidian-ydcpub-dep && \
	mv -f ./main.js obsidian-ydcpub-dep/main.js && \
	mv -f ./manifest.json obsidian-ydcpub-dep/manifest.json && \
	mv -f ./styles.css obsidian-ydcpub-dep/styles.css

dev:
	yarn && \
	yarn dev && \
	cd dist && \
	mkdir -p obsidian-ydcpub-dep && \
	mv -f ./main.js obsidian-ydcpub-dep/main.js && \
	mv -f ./manifest.json obsidian-ydcpub-dep/manifest.json && \
	mv -f ./styles.css obsidian-ydcpub-dep/styles.css

clean:
	rm -rf dist/*
	
.PHONY: all dev build compress clean
