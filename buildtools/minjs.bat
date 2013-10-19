@echo off

REM java -jar compiler/compiler.jar --language_in=ECMASCRIPT5_STRICT --js "%~f1"
uglifyjs "%~f1" -m -c