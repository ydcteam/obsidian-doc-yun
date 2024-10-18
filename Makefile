all: build compress

compress:
	cd dist && \
	zip -r obsidian-publish-ydcdep.zip obsidian-publish-ydcdep && \
	shasum -a 256 obsidian-publish-ydcdep.zip > obsidian-publish-ydcdep.sha256sum

build:
	yarn && \
	yarn build && \
	cd dist && \
	mkdir -p obsidian-publish-ydcdep && \
	mv -f ./main.js obsidian-publish-ydcdep/main.js && \
	mv -f ./manifest.json obsidian-publish-ydcdep/manifest.json && \
	mv -f ./styles.css obsidian-publish-ydcdep/styles.css

dev:
	yarn && \
	yarn dev && \
	cd dist && \
	mkdir -p obsidian-publish-ydcdep && \
	mv -f ./main.js obsidian-publish-ydcdep/main.js && \
	mv -f ./manifest.json obsidian-publish-ydcdep/manifest.json && \
	mv -f ./styles.css obsidian-publish-ydcdep/styles.css

clean:
	rm -rf dist/*
	
.PHONY: all dev build compress clean
