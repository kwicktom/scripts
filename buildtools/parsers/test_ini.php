<?php
$input = <<<EOF
# Lines starting with # are comments and are NOT processed
# Lines starting with @ are directives and describe how the build is going to be processed

# The input files
[@DEPENDENCIES]
../src/file1.js
../src/file2.js

# TODO, allow some pre-process to take place
#[@PREPROCESS]

# Minify the Package
[@MINIFY]

# Options for Node UglifyJS Compiler (if used, default), (mangle and compress)
[@MINIFY][@UGLIFY]
"-m -c"

# Options for Java Closure Compiler (if used)
[@MINIFY][@CLOSURE]
"--language_in=ECMASCRIPT5_STRICT"
"foo=123"="foo123"
"foo=1234"=foo123

# Options for Java YUI Compressor Compiler (if used)
[@MINIFY][@YUI]
"--preserve-semi"

# Options for CSS Minifier, if the files are .css
[@CSSMIN]
"--embed-images"
#"--embed-fonts"

# TODO, allow some post-process to take place
#[@POSTPROCESS]

# The final output file
[@OUT]
../build/package_output.min.js
EOF;

include './ini.php';
$o = IniParser::fromString($input);
$output = IniParser::toString($o, false, true);
echo $output;
