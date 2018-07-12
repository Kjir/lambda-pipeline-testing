#!/bin/sh

docker-compose run --rm lambda-tester serverless $*
