#!/usr/bin/env sh

# to use the python build tool do (the dependencies file is passed as argument):
python build.py --deps "$1"

# to use the php build tool do (the dependencies file is passed as argument):
# php -f build.php -- --deps="$1"

# to use the node build tool do (the dependencies file is passed as argument):
# node build.js --deps "$1"
