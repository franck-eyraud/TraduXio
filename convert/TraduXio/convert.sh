#!/bin/bash


build() {
	docker tag traduxio-convert traduxio-convert:old
        if ! docker build -t traduxio-convert .; then
		cd ..
		exit 1
	fi
	docker rmi traduxio-convert:old
}

CONTAINER=traduxio_convert
docker rm $CONTAINER
#if ! docker images | grep -q traduxio-convert || [ "x$1" == "x--rebuild" ]; then
#always rebuild
	build
#fi

echo run
docker run -ti -v "$(pwd)/data:/convert/data" --name $CONTAINER --link couchdb traduxio-convert node convert.js
