#!/usr/bin/env node
var BuildPackage = (function(undef){

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
        startsWith = function(s, prefix) {  return (prefix==s.substr(0, prefix.length)); },
        extend = function(o1, o2) { o1=o1||{}; for (var p in o1){ if (hasOwn.call(o2, p) && hasOwn.call(o1, p) && undef!==o2[p]) { o1[p]=o2[p]; } }; return o1; },
        tmpfile = function() { return temp.path({suffix: '.tmpnode'}); },
        read = function(file) { return readFile(file, {encoding: __enc}).toString();  },
        write = function(file, text) { return writeFile(file, text.toString(), {encoding: __enc});  },
        unlink = function(file) { if (exists(file)) unLink(file); }
    ; 
    
    
    var self = function() {
        __enc = this.Encoding = 'utf8';
        
        this.availableCompilers = {
            
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
            
        };
        this.availableParsers = {
            
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
        };
        
        this.inputType = "custom";
        this.compilersPath = pjoin(DIR, "compilers") + '/';
        this.parsersPath = pjoin(DIR, "parsers") + '/';
        this.selectedCompiler = 'uglifyjs';
        
        this.realpath = '';
        this.outputToStdOut = true;
        this.depsFile = '';
        this.inFiles = null;
        this.replace = null;
        this.doc = null;
        this.doMinify = false;
        this.outFile = null;
    };
    
    self.prototype = {

        constructor : self,
        
        inputType : null,
        Encoding : null,
        compilersPath : null,
        parsersPath : null,
        selectedCompiler : null,
        
        availableCompilers : null,
        availableParsers : null,
        
        realpath : null,
        outputToStdOut : true,
        depsFile : null,
        inFiles : null,
        replace : null,
        doc : null,
        doMinify : false,
        outFile : null,

        joinPath : function() {
            return pjoin.apply({}, slice.call(arguments));
        },
        
        realPath : function(file) { 
            if (
                ''!=this.realpath && 
                (startsWith(file, './') || startsWith(file, '../') || startsWith(file, '.\\') || startsWith(file, '..\\'))
            ) 
                return /*realpath(*/this.joinPath(this.realpath, file)/*)*/; 
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
            
            parsedargs = this._parseArgs(process.argv);
            args = extend({
                'help' : false,
                'deps' : false,
                'compiler' : this.selectedCompiler,
                'enc' : this.Encoding
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
            if ( !hasOwn.call(this.availableCompilers, args.compiler)) args.compiler = this.selectedCompiler;
            
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
                    this.inFiles = settings['@DEPENDENCIES'];
                }
                else
                {
                    this.inFiles = [];
                }
            
                if (settings['@REPLACE'])
                {
                    this.replace = settings['@REPLACE'];
                }
                else
                {
                    this.replace = null;
                }
            
                if (settings['@DOC'] && settings['@DOC']['OUTPUT'])
                {
                    this.doc = settings['@DOC'];
                    this.doc['OUTPUT'] = this.realPath(settings['@DOC']['OUTPUT']);
                }
                else
                {
                    this.doc = null;
                }
            
                if (settings['@MINIFY'])
                {
                    this.doMinify = true;
                    var minsets = settings['@MINIFY'];
                    
                    if (minsets['@UGLIFY'])
                    {
                        // male it array
                        minsets['@UGLIFY'] = concat.call([], minsets['@UGLIFY']);
                        this.availableCompilers['uglifyjs']['options'] = minsets['@UGLIFY'].join(" ");
                    }
                    if (minsets['@CLOSURE'])
                    {
                        // male it array
                        minsets['@CLOSURE'] = concat.call([], minsets['@CLOSURE']);
                        this.availableCompilers['closure']['options'] = minsets['@CLOSURE'].join(" ");
                    }
                    if (minsets['@YUI'])
                    {
                        // male it array
                        minsets['@YUI'] = concat.call([], minsets['@YUI']);
                        this.availableCompilers['yui']['options'] = minsets['@YUI'].join(" ");
                    }
                    if (minsets['@CSSMIN'])
                    {
                        // male it array
                        minsets['@CSSMIN'] = concat.call([], minsets['@CSSMIN']);
                        this.availableCompilers['cssmin']['options'] = minsets['@CSSMIN'].join(" ");
                    }
                }
                else
                {
                    this.doMinify = false;
                }
                
                if (settings['@OUT'])
                {
                    this.outFile = this.realPath(settings['@OUT']);
                    this.outputToStdOut = false;
                }
                else
                {
                    this.outFile = null;
                    this.outputToStdOut = true;
                }
            }
        },
        
        // parse dependencies file in INI format
        parseIniSettings : function() {
            if (!IniParser)  IniParser = require(this.parsersPath + this.availableParsers['Ini']['file']);
            
            var setts = IniParser.fromString( readFile(this.depsFile) );
            
            if (setts['@DEPENDENCIES'])
                setts['@DEPENDENCIES'] = setts['@DEPENDENCIES']['__list__']
            if (setts['@OUT'])
                setts['@OUT'] = setts['@OUT']['__list__'][0];
            if (setts['@REPLACE'])
                delete setts['@REPLACE']['__list__'];
            if (setts['@DOC'])
                delete setts['@DOC']['__list__'];
            
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
            this.parseHashSettings( setts );
        },
        
        // parse dependencies file in YAML format
        parseYamlSettings : function() {
            if (!YAML)  YAML = require(this.parsersPath + this.availableParsers['Yaml']['file']);
            this.parseHashSettings( YAML.parse( readFile(this.depsFile) ) );
        },
        
        // parse dependencies file in JSON format
        parseJsonSettings : function() {
            this.parseHashSettings( JSON.parse( readFile(this.depsFile) ) );
        },
        
        // parse dependencies file in custom format
        parseCustomSettings : function()  {
            if (!CustomParser)  CustomParser = require(this.parsersPath + this.availableParsers['Custom']['file']);
            
            var setts = CustomParser.fromString( readFile(this.depsFile) );
            
            if (setts['@OUT'])
                setts['@OUT'] = setts['@OUT'][0];
            
            this.parseHashSettings( setts );
        },

        parse : function() {
            var args = this.parseArgs();
            
            // if args are correct continue
            // get real-dir of deps file
            var full_path = this.depsFile = realpath(args.deps);
            this.realpath = dirname(full_path);
            __enc = this.Encoding = args.enc.toLowerCase();
            this.selectedCompiler = args.compiler;
            
            var ext = this.fileext(full_path).toLowerCase();
            if (!ext.length) ext="custom";
            
            if (ext==".json") 
            {
                this.inputType = ".json";
                this.parseJsonSettings();
            }
            else if (ext==".yml" || ext==".yaml")
            {
                this.inputType = ".yaml";
                this.parseYamlSettings();
            }
            else if (ext==".ini")
            {
                this.inputType = ".ini";
                this.parseIniSettings();
            }
            else
            {
                this.inputType = "custom";
                this.parseCustomSettings();
            }
        },

        doReplace : function(text, replace) {
            for (var k in replace)
            {
                text = text.split(k).join(replace[k]);
            }
            return text;
        },

        extractDoc : function(text, doc) {
            var docs = [], startDoc = doc['STARTDOC'], endDoc = doc['ENDDOC'];
            var blocks = text.split( startDoc ), i, l, tmp, j, l2;
            
            // extract docs blocks
            l = blocks.length;
            for (i=0; i<l; i++)
            {
                tmp = blocks[i].split( endDoc );
                
                if ( tmp.length > 1 )
                    docs.push( tmp[0] );
            }
            blocks = null;
            
            // remove first char of each block line
            l = docs.length;
            for (i=0; i<l; i++)
            {
                tmp = docs[i].split("\n");
                l2 = tmp.length;
                for (j=0; j<l2; j++)
                {
                    tmp[j] = (tmp[j].length) ? tmp[j].substr(1) : tmp[j];
                }
                docs[i] = tmp.join("\n");
            }
            return docs;
        },

        doMerge : function() {
            var files=this.inFiles, count=files.length, buffer=[], i, filename;

            if (files && count)
            {
                for (i=0; i<count; i++)
                {
                    filename=this.realPath(files[i]);
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
                if ('cssmin'==this.selectedCompiler)
                {
                    // needed by cssmin mostly
                    if (!this.outputToStdOut)
                        extra = "--basepath "+dirname(this.outFile);
                    else
                        extra = "";
                }
                else if ('yui'==this.selectedCompiler || 'closure'==this.selectedCompiler)
                {
                    extra = "--charset "+this.Encoding;
                }
                    
                // use the selected compiler
                compiler = this.availableCompilers[this.selectedCompiler];
                cmd = compiler['compiler'].replace('__{{PATH}}__', this.compilersPath).replace('__{{EXTRA}}__', extra).replace('__{{OPTIONS}}__', compiler['options']).replace('__{{INPUT}}__', in_tuple).replace('__{{OUTPUT}}__', out_tuple);
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
            var text = this.doMerge(), header = '';
            
            //this.doPreprocess(text);
            
            if (this.replace)
                text = this.doReplace(text, this.replace);
                
            if (this.doc)
                write(this.doc['OUTPUT'], this.extractDoc(text, this.doc).join("\n\n"));
                
            
            var sepLine = new Array(65).join("=");
           
            // output the build settings
            if (!this.outputToStdOut)
            {
                echo (sepLine);
                echo (" Build Package ");
                echo (sepLine);
                echo (" ");
                echo ("Input    : " + this.inputType);
                echo ("Encoding : " + this.Encoding);
                if (this.doMinify)
                {
                    echo ("Minify   : ON");
                    echo ("Compiler : " + this.availableCompilers[this.selectedCompiler]['name']);
                }
                else
                {
                    echo ("Minify   : OFF");
                }
                echo ("Output   : " + this.outFile);
                echo (" ");
            }
            
            if (this.doMinify)
            {

                // minify and add any header
                header = this.extractHeader(text);
                var thiss = this;
                this.doCompress(text, function(compressed, error, stdout, stderr){
                    if (compressed) 
                    {
                        //this.doPostprocess(text);
            
                        if (thiss.outputToStdOut) echo(header + compressed);
                        else write(thiss.outFile, header + compressed);
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
                //this.doPostprocess(text);
            
                // write the processed file
                if (this.outputToStdOut)  echo(header + text);
                else write(this.outFile, header + text);
            }
        }
    };
    
    self.Main = function() {
        var buildLib = new self();
        // do the process
        buildLib.parse();
        buildLib.build();
    };

    // export it
    return self;

}).call(this);

// if called from command-line
if ( require.main === module ) 
{
    // do the process
    BuildPackage.Main();
}
