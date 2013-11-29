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
        DIR = realpath(__dirname), THISFILE = path.basename(__filename), YAML = null, IniParser = null, CustomParser = null,
        
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
            },
            
            'Ini' : {
                'name' : 'Simple Ini Parser',
                'file' : 'ini.min.js'
            },
            
            'Custom' : {
                'name' : 'Custom Parser',
                'file' : 'custom.min.js'
            }
        },
        availableCompilers : {
            
            'cssmin' : {
                'name' : 'CSS Minifier',
                'compiler' : 'node __{{PATH}}__cssmin.js __{{EXTRA}}__ __{{OPTIONS}}__ --input __{{INPUT}}__  --output __{{OUTPUT}}__',
                'options' : ''
            },
            
            'uglifyjs' : {
                'name' : 'Node UglifyJS Compiler',
                'compiler' : 'uglifyjs __{{INPUT}}__ __{{OPTIONS}}__ -o __{{OUTPUT}}__',
                'options' : ''
            },
            
            'closure' : {
                'name' : 'Java Closure Compiler',
                'compiler' : 'java -jar __{{PATH}}__closure.jar __{{EXTRA}}__ __{{OPTIONS}}__ --js __{{INPUT}}__ --js_output_file __{{OUTPUT}}__',
                'options' : ''
            },

            'yui' : { 
                'name' : 'Java YUI Compressor Compiler',
                'compiler' : 'java -jar __{{PATH}}__yuicompressor.jar __{{EXTRA}}__ __{{OPTIONS}}__ --type js -o __{{OUTPUT}}__  __{{INPUT}}__',
                'options' : ''
            }
            
        },
        selectedCompiler : 'uglifyjs',
        
        realpath : '',
        outputToStdOut : true,
        depsFile : '',
        inFiles : null,
        replace : null,
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
            self.replace = null;
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
        parseHashSettings : function(settings) {
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
            
                if (settings['@REPLACE'])
                {
                    self.replace = settings['@REPLACE'];
                }
                else
                {
                    self.replace = null;
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
        
        // parse dependencies file in INI format
        parseIniSettings : function() {
            if (!IniParser)  IniParser = require(self.parsersPath + self.availableParsers['Ini']['file']);
            
            var setts = IniParser.fromString( readFile(self.depsFile) );
            
            if (setts['@DEPENDENCIES'])
                setts['@DEPENDENCIES'] = setts['@DEPENDENCIES']['__list__']
            if (setts['@OUT'])
                setts['@OUT'] = setts['@OUT']['__list__'][0];
            if (setts['@REPLACE'])
                delete setts['@REPLACE']['__list__'];
            
            if (setts['@MINIFY'])
            {
                var minsetts = setts['@MINIFY'];
            
                if (minsetts['@UGLIFY'])
                    setts['@MINIFY']['@UGLIFY'] = minsetts['@UGLIFY']['__list__'];
                if (minsetts['@CLOSURE'])
                    setts['@MINIFY']['@CLOSURE'] = minsetts['@CLOSURE']['__list__'];
                if (minsetts['@YUI'])
                    setts['@MINIFY']['@YUI'] = minsetts['@YUI']['__list__'];
                if (minsetts['@CSSMIN'])
                    setts['@MINIFY']['@CSSMIN'] = minsetts['@CSSMIN']['__list__'];
            }
            self.parseHashSettings( setts );
        },
        
        // parse dependencies file in YAML format
        parseYamlSettings : function() {
            if (!YAML)  YAML = require(self.parsersPath + self.availableParsers['Yaml']['file']);
            self.parseHashSettings( YAML.parse( readFile(self.depsFile) ) );
        },
        
        // parse dependencies file in JSON format
        parseJsonSettings : function() {
            self.parseHashSettings( JSON.parse( readFile(self.depsFile) ) );
        },
        
        // parse dependencies file in custom format
        parseCustomSettings : function()  {
            if (!CustomParser)  CustomParser = require(self.parsersPath + self.availableParsers['Custom']['file']);
            
            var setts = CustomParser.fromString( readFile(self.depsFile) );
            
            if (setts['@OUT'])
                setts['@OUT'] = setts['@OUT'][0];
            self.parseHashSettings( setts );
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
            else if (ext==".ini")
            {
                self.inputType = ".ini";
                self.parseIniSettings();
            }
            else
            {
                self.inputType = "custom";
                self.parseCustomSettings();
            }
        },

        doReplace : function(text, replace) {
            for (var k in replace)
            {
                text = text.split(k).join(replace[k]);
            }
            return text;
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
                    compiler, cmd, extra;
                
                write(in_tuple, text);

                extra = '';
                if ('cssmin'==self.selectedCompiler)
                {
                    // needed by cssmin mostly
                    if (!self.outputToStdOut)
                        extra = "--basepath "+dirname(self.outFile);
                    else
                        extra = "";
                }
                else if ('yui'==self.selectedCompiler || 'closure'==self.selectedCompiler)
                {
                    extra = "--charset "+self.Encoding;
                }
                    
                // use the selected compiler
                compiler = self.availableCompilers[self.selectedCompiler];
                cmd = compiler['compiler'].replace('__{{PATH}}__', self.compilersPath).replace('__{{EXTRA}}__', extra).replace('__{{OPTIONS}}__', compiler['options']).replace('__{{INPUT}}__', in_tuple).replace('__{{OUTPUT}}__', out_tuple);
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
            
            if (self.replace)
                text = self.doReplace(text, self.replace);
                
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
