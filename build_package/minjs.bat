@echo off
REM java -jar compiler/compiler.jar --language_in=ECMASCRIPT5_STRICT --js "%1" --js_output_file "%2"
uglifyjs "$1" -m -c > "$2"