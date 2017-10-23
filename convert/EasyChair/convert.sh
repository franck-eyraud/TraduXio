#!/bin/bash

build() {
	cd code
        docker build -t traduxio-convert .
	cd ..
}

if ! docker images | grep -q traduxio-convert || [ "x$1" == "x--rebuild" ]; then
	build
fi

echo run
docker run -ti -v "$(pwd)/data:/data" --link couchdb traduxio-convert node convert.js
