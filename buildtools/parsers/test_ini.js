var input = [""
,"[SECTION][SUBSECTION]"
,"\"foo=123\"=\"foo123\""
,"\"foo=1234\"=foo123"
,"foo=\"foo123\""
,""
,"# The input files"
,"[@DEPENDENCIES]"
,"../src/file1.js"
,"../src/file2.js"
,""
,"# TODO, allow some pre-process to take place"
,"#[@PREPROCESS]"
,""
,"# Minify the Package"
,"[@MINIFY]"
,""
,"# Options for Node UglifyJS Compiler (if used, default), (mangle and compress)"
,"[@MINIFY][@UGLIFY]"
,"\"-m -c\""
,""
,"# Options for Java Closure Compiler (if used)"
,"[@MINIFY][@CLOSURE]"
,"\"--language_in=ECMASCRIPT5_STRICT\""
,""
,"# Options for Java YUI Compressor Compiler (if used)"
,"[@MINIFY][@YUI]"
,"\"--preserve-semi\""
,""
,"# Options for CSS Minifier, if the files are .css"
,"[@CSSMIN]"
,"\"--embed-images\""
,"#\"--embed-fonts\""
,""
,"# TODO, allow some post-process to take place"
,"#[@POSTPROCESS]"
,""
,"# The final output file"
,"[@OUT]"
,"../build/package_output.min.js"
].join("\n");

var IniParser = require('./ini.js');
var o = IniParser.fromString(input);
// clone it, the parser will modify it and it is needed for output test
var oclone = JSON.parse(JSON.stringify(o));
var output = IniParser.toString(oclone, false, true);

console.log(JSON.stringify(o, null, 4));
console.log("\n\n");
console.log(output);

