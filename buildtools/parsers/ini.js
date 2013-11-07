/**
*
*   Simple .INI Parser for JavaScript/Node
*   @Nikos M.
*
**/
(function(root){
    
    var  fs = require('fs')
    ;
    
    var IniParser = function(rootSection) {
        
        var
            input = '',
            comments = [';', '#']
        ;
        
        var trim = function(s) {
            return s.replace(/^\s+/g, '').replace(/\s+$/g, '');
        };
        
        this.root = '_';
        
        this.root = (rootSection) ? (''+rootSection) : '_';
        
        this.fromFile = function(filename) {
            input = fs.readFileSync(filename);
            return this;
        };
        
        this.fromString = function(in)  {
            input = ''+in;
            return this;
        };
        
        this.parse = function()  {
            
            var
                sections = {
                    this.root : {}
                },
                lines, line, len, i, currentSection,
                linestartswith, pair, key, value, valuestartswith
            ;
            
            // read the dependencies file
            lines = input.split(/\n\r|\r\n|\r|\n/g);
            len = lines.length
            
            currentSection = this.root;
            
            // parse it line-by-line
            for (i=0; i<len; i++)
            {
                // strip the line of extra spaces
                line = trim(lines[i]);
                linestartswith = (line.length) ? line[0] : '';
                
                // comment or empty line, skip it
                if ( !line.length || comments.indexOf(linestartswith)>-1 ) continue;
                
                // section line
                if ('['==linestartswith)
                {
                    currentSection = line.substr(1, -1);
                    
                    if (!sections[currentSection])
                        sections[currentSection] = {};
                        
                    continue;
                }
                // quoted strings as key-value pairs line
                else if ('"'==linestartswith || "'"==linestartswith)
                {
                    endquote = line.indexOf(linestartswith, 1);
                    key = line.substr(1, endquote-1);
                    line = trim(line.substr(endquote));
                    if (line.indexOf('=', 0)>-1)
                    {
                        value = trim(line.split('=', 2)[1]);
                        valuestartswith = (value.length) ? value[0] : '';
                        if ('"'==valuestartswith || "'"==valuestartswith)
                        {
                            endquote = value.indexOf(valuestartswith, 1);
                            value = value.substr(1, endquote-1);
                        }
                        sections[currentSection][key] = value;
                    }
                    else
                    {
                        sections[currentSection][key] = true;
                    }
                }
                // key-value pairs line
                else
                {
                    pair = line.split('=', 2);
                    
                    if (pair.length<2)
                        sections[currentSection][trim(pair[0])] = true;
                    
                    else
                        sections[currentSection][trim(pair[0])] = trim(pair[1]);
                }
            }
            
            return sections;
        };
    };
    
    // export it
    if ('undefined' != typeof (module) && module.exports)  module.exports = IniParser;
    
    else if ('undefined' != typeof (exports)) exports = IniParser;
    
    else this.IniParser = IniParser;
    
}).call(this);