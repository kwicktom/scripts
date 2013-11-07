/**
*
*   Simple .INI Parser for JavaScript/Node
*   @Nikos M.
*
**/
(function(root, undef){
    
    var  fs = null
    ;
    
    var IniParser = function(usekeysList, rootSection) {
        
        var input = '',
            comments = [';', '#']
        ;
        
        var trim = function(s) {
            return s.replace(/^\s+/g, '').replace(/\s+$/g, '');
        };
        
        this.keysList = (undef===usekeysList) ? true : usekeysList;
        this.root = (rootSection) ? (''+rootSection) : '_';
        
        this.fromFile = function(filename) {
            fs = fs || require('fs');
            input = fs.readFileSync(filename);
            return this;
        };
        
        this.fromString = function(_input)  {
            input = ''+_input;
            return this;
        };
        
        this.parse = function()  {
            
            var
                sections = {},
                lines, line, len, i, currentSection, keysList,
                linestartswith, pair, key, value, valuestartswith
            ;
            
            keysList = this.keysList;
            currentSection = this.root;
            if (keysList)
                sections[currentSection] = { '__list__' : [] };
            else
                sections[currentSection] = {  };
            
            // read the dependencies file
            lines = input.split(/\n\r|\r\n|\r|\n/g);
            len = lines.length
            
            // parse it line-by-line
            for (i=0; i<len; ++i)
            {
                // strip the line of extra spaces
                line = trim(lines[i]);
                linestartswith = line.substr(0, 1);
                
                // comment or empty line, skip it
                if ( (0>=line.length) || (comments.indexOf(linestartswith)>-1) ) continue;
                
                // section line
                if ('['==linestartswith)
                {
                    currentSection = line.substr(1, line.length-2);
                    
                    if (!sections[currentSection])
                    {
                        if (keysList)
                            sections[currentSection] = { '__list__' : [] };
                        else
                            sections[currentSection] = {  };
                    }
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
                        valuestartswith = value.substr(0,1);
                        if ('"'==valuestartswith || "'"==valuestartswith)
                        {
                            endquote = value.indexOf(valuestartswith, 1);
                            value = value.substr(1, endquote-1);
                        }
                        sections[currentSection][key] = value;
                    }
                    else
                    {
                        if (keysList)
                            sections[currentSection]['__list__'].push(key);
                        else
                            sections[currentSection][key] = true;
                    }
                    continue;
                }
                // key-value pairs line
                else
                {
                    pair = line.split('=', 2);
                    
                    if (pair.length<2)
                    {
                        key = trim(pair[0]);
                        if (keysList)
                            sections[currentSection]['__list__'].push(key);
                        else
                            sections[currentSection][key] = true;
                    }
                    else
                    {
                        key = trim(pair[0]);
                        value = trim(pair[1]);
                        sections[currentSection][key] = value;
                    }
                    continue;
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