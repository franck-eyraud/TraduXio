#!/bin/bash

build() {
	cd code
	docker tag traduxio-easychair traduxio-easychair:old
        if ! docker build -t traduxio-easychair .; then
		cd ..
		exit 1
	fi
	docker rmi traduxio-easychair:old
	cd ..
}

#if ! docker images | grep -q traduxio-easychair || [ "x$1" == "x--rebuild" ]; then
#always rebuild
	build
#fi

echo run
docker run -ti -v "$(pwd)/data:/data" --rm --link couchdb traduxio-easychair node convert.js
