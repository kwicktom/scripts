##
#
#   Simple .ini Parser for Python 2.x, 3.x
#
#   @author Nikos M.  
#   https://foo123.github.com/
#   http://nikos-web-development.netai.net/
#
##
import re

class IniParser():
    """Simple .ini parser for Python"""
    
    def fromString(s, keysList=True, rootSection='_'):
        comments = [';', '#']
        NLRX = re.compile(r'\n\r|\r\n|\r|\n')
        
        sections = {}
        currentSection = str(rootSection)
        if keysList:
            sections[currentSection] = { '__list__' : [] }
        else:
            sections[currentSection] = {  }
        currentRoot = sections
        
        # parse the lines
        lines = re.split(NLRX, str(s))
        
        # parse it line-by-line
        for line in lines:
            # strip the line of extra spaces
            line = line.strip()
            lenline = len(line)
            
            # comment or empty line, skip it
            if not lenline or (line[0] in comments): continue
            
            linestartswith = line[0]
            
            # section line
            if '['==linestartswith:
                
                SECTION = True
                
                # parse any sub-sections
                while '['==linestartswith:
                
                    if SECTION:
                        currentRoot = sections
                    else:
                        currentRoot = currentRoot[currentSection]
                    
                    SECTION = False
                    
                    endsection = line.find(']', 1)
                    currentSection = line[1:endsection]
                    
                    if currentSection not in currentRoot:
                    
                        if keysList:
                            currentRoot[currentSection] = { '__list__' : [] }
                        else:
                            currentRoot[currentSection] = {  }
                    
                    
                    # has sub-section ??
                    line = line[endsection+1:].strip()
                    
                    if not len(line):  break
                    
                    linestartswith = line[0]
                
                continue
            
            # quoted strings as key-value pairs line
            elif '"'==linestartswith or "'"==linestartswith:
                
                endquote = line.find(linestartswith, 1)
                key = line[1:endquote]
                line = line[endquote+1:].strip()
                
                if line.find('=', 0)>-1:
                    value = line.split('=', 2)[1].strip()
                    valuestartswith = value[0]
                    
                    if '"'==valuestartswith or "'"==valuestartswith:
                        
                        endquote = value.find(valuestartswith, 1)
                        value = value[1:endquote]
                    
                    currentRoot[currentSection][key] = value
                
                else:
                    if keysList:
                        currentRoot[currentSection]['__list__'].append(key)
                    else:
                        currentRoot[currentSection][key] = True
                continue
            
            # key-value pairs line
            else:
                pair = line.split('=', 2)
                
                if len(pair)<2:
                    key = pair[0].strip()
                    if keysList:
                        currentRoot[currentSection]['__list__'].append(key)
                    else:
                        currentRoot[currentSection][key] = True
                
                else:
                    key = pair[0].strip()
                    value = pair[1].strip()
                    currentRoot[currentSection][key] = value
                continue
        
        
        return sections

    
    def fromFile(filename, keysList=True, rootSection='_'):
        s = ''
        with open(filename, 'r') as f:  s = f.read()
        return IniParser.fromString(s, keysList, rootSection)
        
    
    def _walk(o, key=None, top='', q='', EOL="\n"):
        s = ''
        
        if len(o):
        
            o = dict(o)
            
            if key: keys = [key]
            else: keys = o.keys()
            
            for section in keys:
            
                keyvals = o[section]
                if not len(keyvals):  continue
                
                s += str(top) + "[" + str(section) + "]" + EOL
                
                if ('__list__' in keyvals) and len(keyvals['__list__']):
                
                    # only values as a list
                    s += q + (q+EOL+q).join(keyvals['__list__']) + q + EOL
                    del keyvals['__list__']
                
                
                if len(keyvals):
                
                    for k,v in keyvals.items():
                    
                        if not len(v): continue
                        
                        if isinstance(v, dict) or isinstance(v, list):
                        
                            # sub-section
                            s += IniParser._walk(keyvals, k, top + "[" + str(section) + "]", q, EOL)
                        
                        else:
                        
                            # key-value pair
                            s += q+k+q+ '=' +q+v+q + EOL
                        
                    
                
                s += EOL
            
        return s
    
    def toString(o, rootSection='_', quote=False, EOL="\n"):
        s = ''
        
        if rootSection: root = str(rootSection)
        else: root = '_'
        
        if quote: q = '"'
        else: q = ''
        
        # dump the root section first, if exists
        if root in o:
            section = dict(o[root])
            
            llist = None
            if '__list__' in section:
                llist = section['__list__']
                
                if llist and isinstance(llist, list) and len(llist):
                
                    s += q + (q+EOL+q).join(llist) + q + EOL
                    del section['__list__']
                
            
            for k,v in section.items():
            
                if not len(v): continue
                s += q+k+q+ '=' +q+v+q + EOL
            
            
            s += EOL
            
            del o[root]
        
        
        # walk the sections and sub-sections, if any
        s += IniParser._walk(o, None, '', q, EOL)
        
        return s
    
    def toFile(filename, o, rootSection='_', quote=False, EOL="\n"):
        with open(filename, 'w') as f:  
            f.write( IniParser.toString(o, rootSection, quote, EOL) )


            
# for use with 'import *'
__all__ = [ 'IniParser' ]