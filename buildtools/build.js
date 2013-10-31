#!/usr/bin/env node
var BuildPackage=(function(undef){

    /**************************************************************************************
    #
    #   Build a (js,css) package library based, 
    #   on a dependencies file, 
    #   using various compilers
    #
    #   Node: 0.8+ (ca. 2012, 2013)
    #   node-temp module  required
    **************************************************************************************/
    
    var 
        // basic modules
        fs = require('fs'), path = require('path'), 
        exec = require('child_process').exec,
        //execFile = require('child_process').execFile,
        realpath = fs.realpathSync, readFile = fs.readFileSync, writeFile = fs.writeFileSync, 
        exists = fs.existsSync, unLink = fs.unlinkSync, 
        dirname = path.dirname, pjoin = path.join,
        exit = process.exit, echo = console.log, echoStdErr = console.error,
        
        // extra modules needed, node-temp
        temp = require('temp'),
        
        // needed variables
        DIR = realpath(__dirname), THISFILE = path.basename(__filename), YAML = null,
        
        // some shortcuts
        hasOwn = Object.prototype.hasOwnProperty, concat = Array.prototype.concat, slice = Array.prototype.slice,
        
        // some configuration variables
        __enc = 'utf8',
        
        // auxilliary methods
        startsWith = function(s, prefix) {  return (0===s.indexOf(prefix)); },
        extend = function(o1, o2) { o1=o1||{}; for (var p in o1){ if (hasOwn.call(o2, p) && hasOwn.call(o1, p) && undef!==o2[p]) { o1[p]=o2[p]; } }; return o1; },
        tmpfile = function() { return temp.path({suffix: '.tmpnode'}); },
        read = function(file) { return readFile(file, {encoding: __enc}).toString();  },
        write = function(file, text) { return writeFile(file, text.toString(), {encoding: __enc});  },
        unlink = function(file) { if (exists(file)) unLink(file); }
    ; 
    
    
    var self={

        inputType : "custom",
        Encoding : 'utf8',
        compilersPath : './',
        parsersPath : './',
        availableParsers : {
            
            'Yaml' : {
                'name' : 'Yaml Symfony Parser',
                'file' : 'yaml.min.js'
            }
        },
        availableCompilers : {
            
            'cssmin' : {
                'name' : 'CSS Minifier',
                'compiler' : 'python __{{PATH}}__cssmin.py __{{OPTIONS}}__ --input __{{INPUT}}__  --output __{{OUTPUT}}__',
                'options' : ''
            },
            
            'uglifyjs' : {
                'name' : 'Node UglifyJS Compiler',
                'compiler' : 'uglifyjs __{{INPUT}}__ __{{OPTIONS}}__ -o __{{OUTPUT}}__',
                'options' : ''
            },
            
            'closure' : {
                'name' : 'Java Closure Compiler',
                'compiler' : 'java -jar __{{PATH}}__closure.jar --charset __{{ENCODING}}__ __{{OPTIONS}}__ --js __{{INPUT}}__ --js_output_file __{{OUTPUT}}__',
                'options' : ''
            },

            'yui' : { 
                'name' : 'Java YUI Compressor Compiler',
                'compiler' : 'java -jar __{{PATH}}__yuicompressor.jar --charset __{{ENCODING}}__ __{{OPTIONS}}__ --type js -o __{{OUTPUT}}__  __{{INPUT}}__',
                'options' : ''
            }
            
        },
        selectedCompiler : 'uglifyjs',
        
        realpath : '',
        outputToStdOut : true,
        depsFile : '',
        inFiles : null,
        doMinify : false,
        outFile : null,

        _init_ : function()  {
            self.inputType = "custom";
            __enc = self.Encoding= 'utf8';
            self.compilersPath = pjoin(DIR, "compilers") + '/';
            self.parsersPath = pjoin(DIR, "parsers") + '/';
            self.selectedCompiler = 'uglifyjs';
            
            self.realpath = '';
            self.outputToStdOut = true;
            self.depsFile = '';
            self.inFiles = null;
            self.doMinify = false;
            self.outFile = null;
        },

        joinPath : function() {
            return pjoin.apply({}, slice.call(arguments));
        },
        
        realPath : function(file) { 
            if (
                ''!=self.realpath && 
                (startsWith(file, './') || startsWith(file, '../') || startsWith(file, '.\\') || startsWith(file, '..\\'))
            ) 
                return /*realpath(*/self.joinPath(self.realpath, file)/*)*/; 
            else return file; 
        },
        
        fileext : function(file) {
            return path.extname(file).toString();
        },
        
        //
        // adapted from node-commander package
        // https://github.com/visionmedia/commander.js/
        //
        _parseArgs : function(args) {
            var 
                Flags = {}, Options = {},  Params = [],
                optionname = '',  argumentforoption = false,
                arg,   index,  i, len
            ;
            
            args = args || process.argv;
            // remove firt 2 args ('node' and 'this filename')
            args = args.slice(2);
            
            for (i = 0, len = args.length; i < len; ++i) 
            {
                arg = args[i];
                if (arg.length > 1 && '-' == arg[0] && '-' != arg[1]) 
                {
                    arg.slice(1).split('').forEach(function(c){
                        Flags[c] = true;
                    });
                    argumentforoption = false;
                }
                /*/^--/.test(arg)*/
                else if (startsWith(arg, '--'))
                {
                    index = arg.indexOf('=');
                    if (~index)
                    {
                        optionname = arg.slice(2, index);
                        Options[optionname] = arg.slice(index + 1);
                        argumentforoption = false;
                    }
                    else
                    {
                        optionname = arg.slice(2);
                        Options[optionname] = true;
                        argumentforoption = true;
                    }
                } 
                else 
                {
                    if (argumentforoption)
                    {
                        Options[optionname] = arg;
                    }
                    else
                    {
                        Params.push(arg);
                    }
                    argumentforoption = false;
                }
            }
            /*echo({flags: Flags, options: Options, params: Params});
            exit(0);*/
            
            return {flags: Flags, options: Options, params: Params};
        },

        parseArgs : function()  {
            var args, parsedargs;
            
            parsedargs = self._parseArgs(process.argv);
            args = extend({
                'help' : false,
                'deps' : false,
                'compiler' : self.selectedCompiler,
                'enc' : self.Encoding
                }, parsedargs.options);
            
            // if help is set, or no dependencis file, echo help message and exit
            if (parsedargs.flags['h'] || args['help'] || !args['deps'] || !args['deps'].length)
            {
                echo ("usage: "+THISFILE+" [-h] [--deps FILE] [--compiler COMPILER] [--enc ENCODING]");
                echo (" ");
                echo ("Build and Compress Javascript Packages");
                echo (" ");
                echo ("optional arguments:");
                echo ("  -h, --help              show this help message and exit");
                echo ("  --deps FILE             Dependencies File (REQUIRED)");
                echo ("  --compiler COMPILER     uglifyjs (default) | closure | yui | cssmin,");
                echo ("                          Whether to use UglifyJS, Closure,");
                echo ("                          YUI Compressor or CSSMin Compiler");
                echo ("  --enc ENCODING          set text encoding (default utf8)");
                echo(" ");
                
                exit(1);
            }
            
            
            // fix compiler selection
            args.compiler = args.compiler.toLowerCase();
            if ( !hasOwn.call(self.availableCompilers, args.compiler)) args.compiler = self.selectedCompiler;
            
            return args;
        },

        // parse settings in hash format
        _parseHashSettings : function(settings) {
            if (settings)
            {
                if (settings['@DEPENDENCIES'])
                {
                    // male it array
                    settings['@DEPENDENCIES'] = concat.call([], settings['@DEPENDENCIES']);
                    self.inFiles = settings['@DEPENDENCIES'];
                }
                else
                {
                    self.inFiles = [];
                }
            
                if (settings['@MINIFY'])
                {
                    self.doMinify = true;
                    var minsets = settings['@MINIFY'];
                    
                    if (minsets['@UGLIFY'])
                    {
                        // male it array
                        minsets['@UGLIFY'] = concat.call([], minsets['@UGLIFY']);
                        self.availableCompilers['uglifyjs']['options'] = minsets['@UGLIFY'].join(" ");
                    }
                    if (minsets['@CLOSURE'])
                    {
                        // male it array
                        minsets['@CLOSURE'] = concat.call([], minsets['@CLOSURE']);
                        self.availableCompilers['closure']['options'] = minsets['@CLOSURE'].join(" ");
                    }
                    if (minsets['@YUI'])
                    {
                        // male it array
                        minsets['@YUI'] = concat.call([], minsets['@YUI']);
                        self.availableCompilers['yui']['options'] = minsets['@YUI'].join(" ");
                    }
                    if (minsets['@CSSMIN'])
                    {
                        // male it array
                        minsets['@CSSMIN'] = concat.call([], minsets['@CSSMIN']);
                        self.availableCompilers['cssmin']['options'] = minsets['@CSSMIN'].join(" ");
                    }
                }
                else
                {
                    self.doMinify = false;
                }
                
                if (settings['@OUT'])
                {
                    self.outFile = self.realPath(settings['@OUT']);
                    self.outputToStdOut = false;
                }
                else
                {
                    self.outFile = null;
                    self.outputToStdOut = true;
                }
            }
        },
        
        // parse dependencies file in YAML format
        parseYamlSettings : function() {
            if (!YAML)  YAML = require(self.parsersPath + self.availableParsers['Yaml']['file']);
            self._parseHashSettings( YAML.parse( readFile(self.depsFile) ) );
        },
        
        // parse dependencies file in JSON format
        parseJsonSettings : function() {
            self._parseHashSettings( JSON.parse( readFile(self.depsFile) ) );
        },
        
        // parse dependencies file in custom format
        parseCustomSettings : function()  {
            // settings buffers
            var deps = [], 
                out = [], 
                optsUglify = [], 
                optsClosure = [], 
                optsYUI = [],
                optsCSSMIN = []
            ;
            
            // settings options
            var currentBuffer = null,
                doMinify = false, 
                prevTag = null
            ;

            // read the dependencies file
            var i, line, 
                lines = read(self.depsFile).split(/\n\r|\r\n|\r|\n/g), 
                len = lines.length
            ;

            // parse it line-by-line
            for (i=0; i<len; i++)
            {
                // strip the line of extra spaces
                line = lines[i].replace(/^\s+/, '').replace(/\s+$/, '');

                // comment or empty line, skip it
                if (startsWith(line, '#') || ''==line) continue;

                // directive line, parse it
                if (startsWith(line, '@'))
                {
                    if (startsWith(line, '@DEPENDENCIES')) // list of input dependencies files option
                    {
                        // reference
                        currentBuffer = deps;
                        prevTag = '@DEPENDENCIES';
                        continue;
                    }
                    else if (startsWith(line, '@MINIFY')) // enable minification (default is UglifyJS Compiler)
                    {
                        // reference
                        currentBuffer = null;
                        doMinify = true;
                        prevTag = '@MINIFY';
                        continue;
                    }
                    else if ('@MINIFY'==prevTag)
                    {
                        if (startsWith(line, '@UGLIFY')) // Node UglifyJS Compiler options (default)
                        {
                            // reference
                            currentBuffer = optsUglify;
                            continue;
                        }
                        else if (startsWith(line, '@CLOSURE')) // Java Closure Compiler options
                        {
                            // reference
                            currentBuffer = optsClosure;
                            continue;
                        }
                        else if (startsWith(line, '@YUI')) // Java YUI Compressor Compiler options
                        {
                            // reference
                            currentBuffer = optsYUI;
                            continue;
                        }
                        else if (startsWith(line, '@CSSMIN')) // CSS Minifier
                        {
                            // reference
                            currentBuffer = optsCSSMIN;
                            continue;
                        }
                        else
                        {
                            // reference
                            currentBuffer = null;
                            prevTag = null;
                            continue;
                        }
                    }
                    /*
                    else if (startsWith(line, '@PREPROCESS')) // allow preprocess options (todo)
                    {
                        currentBuffer = null;
                        prevTag = '@PREPROCESS';
                        continue;
                    }
                    else if (startsWith(line, '@POSTPROCESS')) // allow postprocess options (todo)
                    {
                        currentBuffer = null;
                        prevTag = '@POSTPROCESS';
                        continue;
                    }
                    */
                    else if (startsWith(line, '@OUT')) // output file option
                    {
                        // reference
                        currentBuffer = out;
                        prevTag = '@OUT';
                        continue;
                    }
                    else // unknown option or dummy separator option
                    {
                        // reference
                        currentBuffer = null;
                        prevTag = null;
                        continue;
                    }
                }
                // if any settings need to be stored, store them in the appropriate buffer
                if (currentBuffer)  currentBuffer.push(line);
            }
            
            // store the parsed settings
            if (out[0])
            {
                self.outFile = self.realPath(out[0]);
                self.outputToStdOut = false;
            }
            else
            {
                self.outFile = null;
                self.outputToStdOut = true;
            }
            self.inFiles = deps;
            self.doMinify = doMinify;
            self.availableCompilers['uglifyjs']['options'] = optsUglify.join(" ");
            self.availableCompilers['closure']['options'] = optsClosure.join(" ");
            self.availableCompilers['yui']['options'] = optsYUI.join(" ");
            self.availableCompilers['cssmin']['options'] = optsCSSMIN.join(" ");
        },

        parse : function() {
            var args = self.parseArgs();
            
            // if args are correct continue
            // get real-dir of deps file
            var full_path = self.depsFile = realpath(args.deps);
            self.realpath = dirname(full_path);
            __enc = self.Encoding = args.enc.toLowerCase();
            self.selectedCompiler = args.compiler;
            
            var ext = self.fileext(full_path).toLowerCase();
            if (!ext.length) ext="custom";
            
            if (ext==".json") 
            {
                self.inputType = ".json";
                self.parseJsonSettings();
            }
            else if (ext==".yml" || ext==".yaml")
            {
                self.inputType = ".yaml";
                self.parseYamlSettings();
            }
            else
            {
                self.inputType = "custom";
                self.parseCustomSettings();
            }
        },

        doMerge : function() {
            var files=self.inFiles, count=files.length, buffer=[], i, filename;

            if (files && count)
            {
                for (i=0; i<count; i++)
                {
                    filename=self.realPath(files[i]);
                    buffer.push(read(filename));
                }

                return buffer.join('');
            }
            return '';
        },

        extractHeader : function(text) {
            var header = '';
            if (startsWith(text, '/**'))
            {
                header = text.substr(0, text.indexOf("**/")+3);
            }
            else if (startsWith(text, '/*!'))
            {
                header = text.substr(0, text.indexOf("!*/")+3);
            }
            return header;
        },

        doCompress : function(text, callback) {
            if ('' != text)
            {
                var in_tuple = tmpfile(), 
                    out_tuple = tmpfile(), 
                    compiler, cmd;
                
                write(in_tuple, text);

                // use the selected compiler
                compiler = self.availableCompilers[self.selectedCompiler];
                cmd = compiler['compiler'].replace('__{{PATH}}__', self.compilersPath).replace('__{{OPTIONS}}__', compiler['options']).replace('__{{ENCODING}}__', self.Encoding).replace('__{{INPUT}}__', in_tuple).replace('__{{OUTPUT}}__', out_tuple);
                // a chain of listeners to avoid timing issues
                exec(cmd, null, function (error, stdout, stderr) {
                    if (!error)
                    {
                        var compressed = read(out_tuple);
                        
                        try{
                            unlink(in_tuple); 
                        } catch (e) {}
                        
                        try{
                            unlink(out_tuple);
                        } catch (e) {}
                        
                        if (callback) callback(compressed, error, stdout, stderr);
                    }
                    else
                    {
                        try{
                            unlink(in_tuple); 
                        } catch (e) {}
                        
                        try{
                            unlink(out_tuple);
                        } catch (e) {}
                        
                        if (callback) callback(null, error, stdout, stderr);
                    }
                });
            }
            else
            {
                if (callback) callback('', null, null, null);
            }
        },

        doPreprocess : function(text) {
        },
        
        doPostprocess : function(text) {
        },
        
        build : function() {
            var text = self.doMerge(), header = '';
            
            //self.doPreprocess(text);
            
            var sepLine = new Array(65).join("=");
           
            // output the build settings
            if (!self.outputToStdOut)
            {
                echo (sepLine);
                echo (" Build Package ");
                echo (sepLine);
                echo (" ");
                echo ("Input    : " + self.inputType);
                echo ("Encoding : " + self.Encoding);
                if (self.doMinify)
                {
                    echo ("Minify   : ON");
                    echo ("Compiler : " + self.availableCompilers[self.selectedCompiler]['name']);
                }
                else
                {
                    echo ("Minify   : OFF");
                }
                echo ("Output   : " + self.outFile);
                echo (" ");
            }
            
            if (self.doMinify)
            {

                // minify and add any header
                header = self.extractHeader(text);
                self.doCompress(text, function(compressed, error, stdout, stderr){
                    if (compressed) 
                    {
                        //self.doPostprocess(text);
            
                        if (self.outputToStdOut) echo(header + compressed);
                        else write(self.outFile, header + compressed);
                        if (stderr) echoStdErr(stderr);
                        exit(0);
                    }
                    else
                    {
                        if (stderr) echoStdErr(stderr);
                        exit(1);
                    }
                });
            }
            else
            {
                //self.doPostprocess(text);
            
                // write the processed file
                if (self.outputToStdOut)  echo(header + text);
                else write(self.outFile, header + text);
            }
        },
        
        Main : function() {
            // do the process
            self.parse();
            self.build();
        }
    };

    // export it
    self._init_();
    return self;

}).call(this);

// do the process
BuildPackage.Main();
