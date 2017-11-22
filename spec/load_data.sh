#!/bin/bash

dirname=$(dirname "$0")
DATABASE=${1-http://localhost:5984/traduxio}

echo Filling in $DATABASE
for i in "$dirname"/samples/*.json; do
  echo Loading $i into $DATABASE
  if ! curl -m 10 -s -XPOST -H "Content-Type: application/json" -d@$i $DATABASE; then
    echo Failed; exit 1;
  fi
done
#Force view update because rewrite rules have update_after set
time curl $DATABASE/_design/traduxio/_view/works | wc
