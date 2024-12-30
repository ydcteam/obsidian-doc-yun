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

dev-auth:
	yarn && \
	yarn devAuth && \
	cd dist && \
	mkdir -p obsidian-ydcpub-dep && \
	mv -f ./main.js obsidian-ydcpub-dep/main.js && \
	mv -f ./manifest.json obsidian-ydcpub-dep/manifest.json && \
	mv -f ./styles.css obsidian-ydcpub-dep/styles.css

install-dev-1: dev
	cp -f dist/obsidian-ydcpub-dep/* /g/obsidianVaults/build_dev_new/.obsidian/plugins/obsidian-ydcpub-dep

install-dev-auth-1: dev-auth
	cp -f dist/obsidian-ydcpub-dep/* /g/obsidianVaults/build_dev_new/.obsidian/plugins/obsidian-ydcpub-dep

clean:
	rm -rf dist/*
	
.PHONY: all dev dev-auth build install-dev-1 install-dev-auth-1 compress clean
