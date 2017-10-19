#!/bin/bash

build() {
	cd code
        docker build -t traduxio-convert .
}

if ! docker images | grep -q traduxio-convert || [ "x$1" == "x--rebuild" ]; then
	build
fi

echo run
docker run -it -v "$(pwd)/data:/data" traduxio-convert node convert.js
