/**
*
*   Custom Parser for JavaScript/Node
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
(function(root, undef){
    
    var  fs = (require) ? require('fs') : null,
        NLRX = /\n\r|\r\n|\r|\n/g
    ;
    
    var 
        trim = function(s) {
            return s.replace(/^\s+/g, '').replace(/\s+$/g, '');
        },
        
        startsWith = function(s, prefix) { return (prefix == s.substr(0, prefix.length)); },
        
        parseStr = function(s, q) {
            //s = new String(s);
            var endq = s.indexOf(q, 1);
            var sq = s.substr(1, endq-1);
            var r = trim(s.substr(endq));
            
            return [sq, r];
        },
        
        getQuotedValue = function( line ) {
            var linestartswith = line[0];
            
            // quoted string
            if ('"'==linestartswith || "'"==linestartswith)
            {
                var res = parseStr(line, linestartswith);
                return res[0];
            }
            // un-quoted string
            else
            {
                return trim(line);
            }
        },
        
        getKeyValuePair = function( line ) {
            var linestartswith = line[0];
            
            // quoted string
            if ('"'==linestartswith || "'"==linestartswith)
            {
                var res = parseStr(line, linestartswith);
                var key = res[0];
                line = res[1];
                
                // key-value pair
                if (line.indexOf('=')>-1)
                {
                    var value = trim(line.split('=', 2)[1]);
                    var valuestartswith = value[0];
                    
                    // quoted value
                    if ('"'==valuestartswith || "'"==valuestartswith)
                    {
                        res = parseStr(value, valuestartswith);
                        value = res[0];
                    }
                    
                    return [key, value];
                }
            }
            // un-quoted string
            else
            {
                var pair = line.split('=', 2);
                
                var key = trim(pair[0]);
                var value = trim(pair[1]);
                var valuestartswith = value[0];
                
                // quoted value
                if ('"'==valuestartswith || "'"==valuestartswith)
                {
                    var res = parseStr(value, valuestartswith);
                    value = res[0];
                }
                
                return [key, value];
            }
        }
    ;
    
    var CustomParser = self = {
        
        fromString : function(s)  {
            // settings buffers
            var settings = {};
            var maps = {"@REPLACE":1, "@DOC":1};
            
            // settings options
            var currentBuffer = null,
                prevTag = null
            ;

            // parse the lines
            var i, line, lines, lenlines;

            s = ''+s;
            lines = s.split(NLRX);
            lenlines = lines.length;
            
            // parse it line-by-line
            for (i=0; i<lenlines; i++)
            {
                // strip the line of extra spaces
                line = trim(lines[i]);

                // comment or empty line, skip it
                if (startsWith(line, '#') || ''==line) continue;

                // directive line, parse it
                if (startsWith(line, '@'))
                {
                    if (startsWith(line, '@DEPENDENCIES')) // list of input dependencies files option
                    {
                        if (undef === settings['@DEPENDENCIES'])
                            settings['@DEPENDENCIES'] = [];
                        currentBuffer = settings['@DEPENDENCIES'];
                        prevTag = '@DEPENDENCIES';
                        continue;
                    }
                    else if (startsWith(line, '@REPLACE')) // list of replacements
                    {
                        if (undef === settings['@REPLACE'])
                            settings['@REPLACE'] = {};
                        currentBuffer = settings['@REPLACE'];
                        prevTag = '@REPLACE';
                        continue;
                    }
                    else if (startsWith(line, '@DOC')) // extract documentation
                    {
                        if (undef === settings['@DOC'])
                            settings['@DOC'] = {};
                        currentBuffer = settings['@DOC'];
                        prevTag = '@DOC';
                        continue;
                    }
                    else if (startsWith(line, '@MINIFY')) // enable minification (default is UglifyJS Compiler)
                    {
                        if (undef === settings['@MINIFY'])
                            settings['@MINIFY'] = {};
                        currentBuffer = null;
                        prevTag = '@MINIFY';
                        continue;
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
                        if (undef === settings['@OUT'])
                            settings['@OUT'] = [];
                        currentBuffer = settings['@OUT'];
                        prevTag = '@OUT';
                        continue;
                    }
                    else 
                    {
                        // reference
                        currentBuffer = null;
                        
                        if ('@MINIFY'==prevTag)
                        {
                            if (startsWith(line, '@UGLIFY')) // Node UglifyJS Compiler options (default)
                            {
                                if (undef === settings['@MINIFY']['@UGLIFY'])
                                    settings['@MINIFY']['@UGLIFY'] = [];
                                currentBuffer = settings['@MINIFY']['@UGLIFY'];
                                continue;
                            }
                            else if (startsWith(line, '@CLOSURE')) // Java Closure Compiler options
                            {
                                if (undef === settings['@MINIFY']['@CLOSURE'])
                                    settings['@MINIFY']['@CLOSURE'] = [];
                                currentBuffer = settings['@MINIFY']['@CLOSURE'];
                                continue;
                            }
                            else if (startsWith(line, '@YUI')) // Java YUI Compressor Compiler options
                            {
                                if (undef === settings['@MINIFY']['@YUI'])
                                    settings['@MINIFY']['@YUI'] = [];
                                currentBuffer = settings['@MINIFY']['@YUI'];
                                continue;
                            }
                            else if (startsWith(line, '@CSSMIN')) // CSS Minifier
                            {
                                if (undef === settings['@MINIFY']['@CSSMIN'])
                                    settings['@MINIFY']['@CSSMIN'] = [];
                                currentBuffer = settings['@MINIFY']['@CSSMIN'];
                                continue;
                            }
                        }
                        
                        // unknown option or dummy separator option
                        prevTag = null;
                        continue;
                    }
                }
                // if any settings need to be stored, store them in the appropriate buffer
                if (currentBuffer)  
                {
                    if ( maps[ prevTag ] )
                    {
                        var keyval = getKeyValuePair( line );
                        currentBuffer[ keyval[0] ] = keyval[1];
                    }
                    else
                    {
                        currentBuffer.push( getQuotedValue( line ) );
                    }
                }
            }
            
            return settings;
        },
        
        fromFile : function(filename, keysList, rootSection) {
            if (fs)
            {
                return self.fromString( fs.readFileSync(filename) );
            }
            return '';
        }
    };
    
    // export it
    if ('undefined' != typeof (module) && module.exports)  module.exports = CustomParser;
    
    else if ('undefined' != typeof (exports)) exports = CustomParser;
    
    else this.CustomParser = CustomParser;
    
}).call(this);