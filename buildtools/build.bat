@echo off

REM to use the python build tool do (the dependencies file is passed as argument):
REM ugliifyjs is default compiler if no compiler specified and minify directive is ON
REM python build.py --deps "sample-dependencies" --compiler uglifyjs
REM if packaging css files
REM python build.py --deps "%1" --compiler cssmin

REM to use the php build tool do (the dependencies file is passed as argument):
REM php -f build.php -- --deps="sample-dependencies" --compiler=closure

REM to use the node build tool do (the dependencies file is passed as argument):
node build.js --deps "sample-dependencies" --compiler yui
