##Scripts to build js/css packages from a set of src files with options

###Usage

* Modify the *sample-dependencies* or *sample-dependencies.json* or *sample-dependencies.yaml* or *sample-dependencies.ini* file(s) to include the input/output filenames and compiler parameters
* Dependencies file can be in custom format (default), JSON format (.json), YAML format (.yaml, .yml) or INI format (.ini)
* Run the .bat or .sh scripts to build the package

###How to Use

Each tool/compiler, if run with no parameters in the command-line, will print a help screen explaining usage options.
Also the sample-dependencies files and build.bat, build.sh files, demonstrate how the build tools are used


###Dependencies

* UglifyJS (default), Java Closure Compiler (included), Java YUI Compressor (included), CSS Minifier (included) can be used

__For Python__
* Python (2 or 3)
* PyYaml module installed (for Yaml parsing)

__For PHP__
* PHP 5.2+
* Modified standalone version of Symfony Yaml parser by (c) Fabien Potencier <fabien@symfony.com> (included)

__For Node__
* Node 0.8+
* Modified standalone version of yaml.js (Symfony Yaml parser) by (c) Fabien Potencier, Jeremy Faivre (included)
* node-temp package (global install preferrably)

__Common Dependencies__
* UglifyJS2 package (global install)
* Closure compiler (included)
* YUI Compressor compiler (included)
* Java 6 (needed by YUI, Closure compilers)
* CSS Minifier (python) (included)
* CSS Minifier (php) (included)
* CSS Minifier (node) (included)


*URL* [Nikos Web Development](http://nikos-web-development.netai.net/ "Nikos Web Development")  
*URL* [WorkingClassCode](http://workingclasscode.uphero.com/ "Working Class Code")  

