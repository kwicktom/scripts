@echo off

REM to use the python build tool do (the dependencies file is passed as argument):
python build.py --deps "%1"

REM to use the php build tool do (the dependencies file is passed as argument):
REM php -f build.php -- --deps="%1"

REM to use the node build tool do (the dependencies file is passed as argument):
REM node build.js --deps "%1"
