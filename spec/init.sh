#!/bin/bash

dirname=$(dirname "$0")

DATABASE=${1-http://localhost:5984/traduxio}

if ! "$dirname"/load_data.sh $DATABASE; then exit 1; fi
