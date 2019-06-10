#!/bin/bash

DATABASE=${1-http://localhost:5984/traduxio}
log=deploy.log

echo Deploying on $DATABASE
couchapp push couchdb $DATABASE 2> $log
DB=$(cat $log | tail -1)
if [ $? -eq 0 ]; then
  echo Deployed on $DB
  echo Reindexing $DB/works
	curl -s $DB/works -o /dev/null -w "Finished in %{time_total} seconds\\n"
else
	echo Failed; exit 1;
fi
