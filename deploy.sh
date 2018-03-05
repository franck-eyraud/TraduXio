#!/bin/bash

DATABASE=${1-http://localhost:5984/traduxio}

echo Deploying on $DATABASE
DB=$(couchapp push couchdb $DATABASE 2>&1 | tail -1)
if [ $? -eq 0 ]; then
  echo Deployed on $DB
  echo Reindexing $DB/works
	curl -s $DB/works -o /dev/null -w "Finished in %{time_total} seconds\\n"
else
	echo Failed; exit 1;
fi
