/**
*
*   Custom Parser for JavaScript/Node
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
(function(undef){
    
    var  fs = (require) ? require('fs') : null,
        NL = /\n\r|\r\n|\r|\n/g, 
        BLOCK = /^@(([a-zA-Z0-9\-_]+)\s*(=\[\]|=\{\}|=)?)/,
        ENDBLOCK = /^(@\s*)+/,
        MAP = 1, LIST = 2, VAL = 0
    ;
    
    var 
        trim = function(s) {
            return (s) ? s.replace(/^\s+/g, '').replace(/\s+$/g, '') : s;
        },
        
        removeComment = function(s, comm) {
            s = s.split( comm );
            return trim( s[0] );
        },
        
        startsWith = function(s, prefix) { return (s && (prefix == s.substr(0, prefix.length))); },
        
        parseStr = function(s, q) {
            var endq = s.indexOf(q, 1);
            var quoted = s.substr(1, endq-1);
            var rem = trim( s.substr(endq) );
            return [quoted, rem];
        },
        
        getQuotedValue = function( line ) {
            var linestartswith = line[0];
            
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
            {
                var res = parseStr( line, linestartswith );
                return res[0];
            }
            // un-quoted string
            else
            {
                return trim( line );
            }
        },
        
        getKeyValuePair = function( line ) {
            var linestartswith = line[0];
            
            // quoted string
            if ( '"'==linestartswith || "'"==linestartswith || "`"==linestartswith )
            {
                var res = parseStr(line, linestartswith);
                var key = res[0];
                line = res[1];
                
                // key-value pair
                if ( line.indexOf('=')>-1 )
                {
                    line = line.split('=');
                    line.shift()
                    value = line.join('=');
                    if ( startsWith(value, "[]"))
                    {
                        return [key, [], LIST];
                    }
                    else if ( startsWith(value, "{}"))
                    {
                        return [key, {}, MAP];
                    }
                    
                    if ( value )
                    {
                        value = trim(value);
                        var valuestartswith = value[0];
                        
                        // quoted value
                        if ( '"'==valuestartswith || "'"==valuestartswith || "`"==valuestartswith )
                        {
                            res = parseStr(value, valuestartswith);
                            value = res[0];
                        }
                    }
                    return [key, value, VAL];
                }
            }
            // un-quoted string
            else
            {
                line = line.split('=');
                
                var key = trim(line.shift());
                var value = line.join('=');
                
                if ( startsWith(value, "[]"))
                {
                    return [key, [], LIST];
                }
                else if ( startsWith(value, "{}"))
                {
                    return [key, {}, MAP];
                }
                
                if ( value )
                {
                    value = trim(value);
                    var valuestartswith = value[0];
                    
                    // quoted value
                    if ( '"'==valuestartswith || "'"==valuestartswith || "`"==valuestartswith )
                    {
                        var res = parseStr(value, valuestartswith);
                        value = res[0];
                    }
                }
                
                return [key, value, VAL];
            }
        }
    ;
    
    var CustomParser = self = {
        
        fromString : function(s)  {
            
            // settings buffer
            var settings = {};
            
            // current settings options
            var currentBuffer = settings,
                currentBlock = null, 
                currentPath = [],
                isType = VAL
            ;

            // parse the lines
            var i, line, lines, lenlines, block, endblock, j, jlen, numEnds, keyval;

            s = ''+s;
            lines = s.split( NL );
            lenlines = lines.length;
            
            // parse it line-by-line
            for (i=0; i<lenlines; i++)
            {
                // strip the line of comments and extra spaces
                line = removeComment( lines[i], "#" );

                // comment or empty line, skip it
                if ( !line.length ) continue;

                // block/directive line, parse it
                if ( startsWith(line, '@') )
                {
                    block = BLOCK.exec( line );
                    endblock = ENDBLOCK.exec( line );
                    
                    if ( block )
                    {
                        currentBlock = block[2];
                        if ( !block[3] || '='==block[3] ) isType = VAL;
                        else if ( '=[]'==block[3] ) isType = LIST;
                        else if ( '={}'==block[3] ) isType = MAP;
                        
                        currentPath.push( [currentBlock, isType] );
                        if ( currentPath.length>1 )
                        {
                            currentBuffer = settings;
                            for (j=0, l1=currentPath.length-1; j<l1; j++)
                            {
                                currentBuffer = currentBuffer[ currentPath[j][0] ];
                            }
                        }
                        if ( undef === currentBuffer[ currentBlock ] )
                        {
                            if (LIST == isType)
                                currentBuffer[ currentBlock ] = [];
                            else if (MAP == isType)
                                currentBuffer[ currentBlock ] = {};
                            else
                                currentBuffer[ currentBlock ] = '';
                        }
                    }
                    
                    else if ( endblock )
                    {
                        numEnds = line.split("@").length-1;
                        
                        for (j=0; j<numEnds; j++)
                            currentPath.pop();
                        
                        currentBuffer = settings;
                        if ( currentPath.length > 0 )
                        {
                            if ( currentPath.length > 1 )
                            {
                                for (j=0, jlen=currentPath.length-1; j<jlen; j++)
                                {
                                    currentBuffer = currentBuffer[ currentPath[j][0] ];
                                }
                            }
                            currentBlock = currentPath[ currentPath.length-1 ][0];
                            isType = currentPath[ currentPath.length-1 ][1];
                        }
                        else
                        {
                            currentBlock = null;
                            isType = VAL;
                        }
                    }
                    
                    continue;
                }
                
                // if any settings need to be stored, store them in the appropriate buffer
                if ( currentBlock && currentBuffer )  
                {
                    if ( MAP == isType )
                    {
                        keyval = getKeyValuePair( line );
                        
                        currentBuffer[ currentBlock ][ keyval[0] ] = keyval[1];
                        
                        if ( LIST == keyval[2] || MAP == keyval[2] )
                        {
                            currentPath.push( [keyval[0], keyval[2]] );
                            currentBuffer = currentBuffer[ currentBlock ];
                            currentBlock = keyval[0];
                            isType = keyval[2];
                        }
                    }
                    else if ( LIST == isType )
                    {
                        currentBuffer[ currentBlock ].push( getQuotedValue( line ) );
                    }
                    else //if ( VAL == isType )
                    {
                        currentBuffer[ currentBlock ] = getQuotedValue( line );
                        currentBlock = null;
                        isType = VAL;
                        
                        /*
                        currentPath.pop();
                        currentBuffer = settings;
                        if ( currentPath.length > 0 )
                        {
                            if ( currentPath.length > 1 )
                            {
                                for (j=0, jlen=currentPath.length-1; j<jlen; j++)
                                {
                                    currentBuffer = currentBuffer[ currentPath[j][0] ];
                                }
                            }
                            currentBlock = currentPath[ currentPath.length-1 ][0];
                            isType = currentPath[ currentPath.length-1 ][1];
                        }
                        else
                        {
                            currentBlock = null;
                            isType = VAL;
                        }
                        */
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