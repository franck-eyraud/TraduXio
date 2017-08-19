#!/bin/bash
dirname=$(dirname "$0")
DATABASE=${1-}

echo Deleting $DATABASE
curl -m 10 -s -X DELETE $DATABASE -o /dev/null
echo $DATABASE deleted
if ! "$dirname"/deploy.sh $DATABASE; then exit 1; fi

"$dirname"/spec/load_data.sh $DATABASE && "$dirname"/spec/run-tests.sh $DATABASE
