##
#
#   Simple .INI Parser for Python
#   @Nikos M.
#
##
import re

class IniParser():
    """Simple .ini parser for Python"""
    
    def __init__(self, keysList=True, rootSection='_'):
        self.input = ''
        self.comments = [';', '#']
        self.NLRX = re.compile(r'\n\r|\r\n|\r|\n')
        self.keysList = keysList
        self.root = rootSection
        
    def fromFile(self, filename):
        input = ''
        with open(filename, 'r') as f:  input = f.read()
        self.input = input
        return self
        
    def fromString(self, input):
        self.input = input
        return self
        
    def parse(self):
        sections = {}
        comments = self.comments
        keysList = self.keysList
        
        currentSection = self.root
        if keysList:
            sections[currentSection] = { '__list__' : [] }
        else:
            sections[currentSection] = {  }
        currentRoot = sections
        
        # read the dependencies file
        lines = re.split(self.NLRX, self.input)
        
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

# for use with 'import *'
__all__ = [ 'IniParser' ]