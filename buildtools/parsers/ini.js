/**
*
*   Simple .INI Parser for JavaScript/Node
*   @Nikos M.
*
**/
(function(root, undef){
    
    var  fs = null
    ;
    var e = console.log;
    
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
                lines, line, len, i, currentSection, currentRoot, keysList,
                linestartswith, pair, key, value, valuestartswith,
                endquote, endsection, SECTION
            ;
            
            keysList = this.keysList;
            
            currentSection = this.root;
            if (keysList)
                sections[currentSection] = { '__list__' : [] };
            else
                sections[currentSection] = {  };
            currentRoot = sections;
            
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
                
                // section(s) line
                if ('['==linestartswith)
                {
                    SECTION = true;
                    // parse any sub-sections
                    while ('['==linestartswith)
                    {
                        currentRoot = (SECTION) ? sections : currentRoot[currentSection];
                        
                        SECTION = false;
                        
                        endsection = line.indexOf(']', 1);
                        currentSection = line.substr(1, endsection-1);
                        
                        if (!currentRoot[currentSection])
                        {
                            if (keysList)
                                currentRoot[currentSection] = { '__list__' : [] };
                            else
                                currentRoot[currentSection] = {  };
                        }
                        
                        // has sub-section ??
                        line = trim(line.substr(endsection+1))
                        linestartswith = line.substr(0, 1);
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
                        currentRoot[currentSection][key] = value;
                    }
                    else
                    {
                        if (keysList)
                            currentRoot[currentSection]['__list__'].push(key);
                        else
                            currentRoot[currentSection][key] = true;
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
                            currentRoot[currentSection]['__list__'].push(key);
                        else
                            currentRoot[currentSection][key] = true;
                    }
                    else
                    {
                        key = trim(pair[0]);
                        value = trim(pair[1]);
                        currentRoot[currentSection][key] = value;
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