#!/usr/bin/env sh

# to use the python build tool do (the dependencies file is passed as argument):
# ugliifyjs is default compiler if no compiler specified and minify directive is ON
python build.py --deps "$1" --compiler uglifyjs

# to use the php build tool do (the dependencies file is passed as argument):
# php -f build.php -- --deps="$1" --compiler=closure

# to use the node build tool do (the dependencies file is passed as argument):
# node build.js --deps "$1" --compiler yui
