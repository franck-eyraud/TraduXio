#!/bin/bash

build() {
	cd code
	docker tag traduxio-convert traduxio-convert:old
        if ! docker build -t traduxio-convert .; then
		cd ..
		exit 1
	fi
	docker rmi traduxio-convert:old
	cd ..
}

if ! docker images | grep -q traduxio-convert || [ "x$1" == "x--rebuild" ]; then
	build
fi

echo run
docker run -ti -v "$(pwd)/data:/data" --rm --link couchdb traduxio-convert node convert.js
