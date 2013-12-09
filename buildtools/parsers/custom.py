##
#
#   Custom Parser for Python 2.x, 3.x
#
#   @author Nikos M.  
#   https://foo123.github.com/
#   http://nikos-web-development.netai.net/
#
##
#import pprint
import re

class CustomParser():
    """Custom parser for Python"""
    
    MAP = 1
    LIST = 2
    VAL = 0
    
    NL = None
    BLOCK = None
    ENDBLOCK = None
    
    def removeComment(s, comm):
        s = s.split( comm )
        return s[0].strip()
    
    
    def parseStr(s, q):
        endq = s.find(q, 1)
        quoted = s[1:endq]
        rem = s[endq+1:].strip()
        
        return quoted, rem
    
    def getQuotedValue( line ):
        _self = CustomParser
        
        linestartswith = line[0]
        
        # quoted string
        if '"'==linestartswith or "'"==linestartswith or "`"==linestartswith:
        
            key, line = _self.parseStr(line, linestartswith)
            return key
        
        # un-quoted string
        else:
            return line.strip()
        
    
    
    def getKeyValuePair(line):
        _self = CustomParser
        
        linestartswith = line[0]
        # quoted string
        if '"' == linestartswith or "'" == linestartswith or "`" == linestartswith:
        
            key, line = _self.parseStr(line, linestartswith)
            
            # key-value pair
            if line.find('=', 0)>-1:
                
                line = line.split('=')
                line.pop(0)
                value = "=".join(line)
                
                if value.startswith("[]"):
                
                    return [key, [], _self.LIST]
                
                elif value.startswith("{}"):
                
                    return [key, {}, _self.MAP]
                
                if value:
                
                    value = value.strip()
                    valuestartswith = value[0]
                    
                    # quoted value
                    if '"'==valuestartswith or "'"==valuestartswith or "`"==valuestartswith:
                        value, rem = _self.parseStr(value, valuestartswith)
                
                return [key, value, _self.VAL]
            
        
        # un-quoted string
        else:
        
            line = line.split('=')
            key = line.pop(0).strip()
            value = "=".join(line)
            
            if value.startswith("[]"):
            
                return [key, [], _self.LIST]
            
            elif value.startswith("{}"):
            
                return [key, {}, _self.MAP]
            
            if value:
                
                value = value.strip()
                valuestartswith = value[0]
                
                # quoted value
                if '"'==valuestartswith or "'"==valuestartswith or "`"==valuestartswith:
                    value, rem = _self.parseStr(value, valuestartswith)
            
            return [key, value, _self.VAL]
    
    
    def fromString(s):
        _self = CustomParser
        
        if not _self.NL:
            _self.NL = re.compile(r'\n\r|\r\n|\r|\n')
        
        if not _self.BLOCK:
            _self.BLOCK = re.compile(r'^@(([a-zA-Z0-9\-_]+)\s*(=\[\]|=\{\}|=)?)')
        
        if not _self.ENDBLOCK:
            _self.ENDBLOCK = re.compile(r'^(@\s*)+')
            
        # settings buffers
        settings = {}
        
        currentBuffer = settings
        currentPath = []
        currentBlock = None
        isType = _self.VAL
        
        # parse the lines
        lines = re.split(_self.NL, str(s))
        
        # parse it line-by-line
        for line in lines:
            
            # strip the line of comments and extra spaces
            line = _self.removeComment(line, "#")
            
            # comment or empty line, skip it
            if 0==len(line): continue
            
            # block/directive line, parse it
            if line.startswith('@'):
                
                block = _self.BLOCK.match( line )
                endblock = _self.ENDBLOCK.match( line )
                
                if block:
                
                    currentBlock = block.group(2)
                    block3 = block.group(3)
                    if  (block3 is None) or ('='==block3): isType = _self.VAL
                    elif '=[]'==block3: isType = _self.LIST
                    elif '={}'==block3: isType = _self.MAP
                    
                    currentPath.append( [currentBlock, isType] )
                    currLen = len(currentPath)
                    if currLen>1:
                    
                        currentBuffer = settings
                        for j in range(currLen-1):
                        
                            currentBuffer = currentBuffer[ currentPath[j][0] ]
                        
                    
                    if currentBlock not in currentBuffer:
                    
                        if _self.LIST == isType:
                            currentBuffer[ currentBlock ] = []
                        elif _self.MAP == isType:
                            currentBuffer[ currentBlock ] = {}
                        else:
                            currentBuffer[ currentBlock ] = ''
                    
                
                
                elif endblock:
                
                    numEnds = len(line.split("@"))-1
                    
                    for j in range(numEnds):
                        if len(currentPath): currentPath.pop()
                        else: break
                    
                    currentBuffer = settings
                    currLen = len(currentPath)
                    if currLen > 0:
                    
                        if currLen > 1:
                        
                            for j in range(currLen-1):
                            
                                currentBuffer = currentBuffer[ currentPath[j][0] ]
                            
                        
                        currentBlock = currentPath[ currLen-1 ][0]
                        isType = currentPath[ currLen-1 ][1]
                    
                    else:
                    
                        currentBlock = None
                        isType = _self.VAL
                    
                
                continue
            
            # if any settings need to be stored, store them in the appropriate buffer
            if (currentBlock is not None) and (currentBuffer is not None): 
                if _self.MAP == isType:
                
                    keyval = _self.getKeyValuePair( line )
                    
                    currentBuffer[ currentBlock ][ keyval[0] ] = keyval[1]
                    
                    if _self.LIST == keyval[2] or _self.MAP == keyval[2]:
                    
                        currentPath.append( [keyval[0], keyval[2]] )
                        currentBuffer = currentBuffer[ currentBlock ]
                        currentBlock = keyval[0]
                        isType = keyval[2]
                    
                
                elif _self.LIST == isType:
                
                    currentBuffer[ currentBlock ].append( _self.getQuotedValue( line ) )
                
                else: # elif _self.VAL == isType:
                
                    currentBuffer[ currentBlock ] = _self.getQuotedValue( line )
                    currentBlock = None
                    isType = _self.VAL
                    
                    #if len(currentPath): currentPath.pop()
                    #currentBuffer = settings
                    #currLen = len(currentPath)
                    #if currLen > 0:
                    #
                    #    if currLen > 1:
                    #    
                    #        for j in range(currLen-1):
                    #        
                    #            currentBuffer = currentBuffer[ currentPath[j][0] ]
                    #        
                    #    
                    #    currentBlock = currentPath[ currLen-1 ][0]
                    #    isType = currentPath[ currLen-1 ][1]
                    #
                    #else:
                    #
                    #    currentBlock = None
                    #    isType = _self.VAL
                
        
        return settings

    
    def fromFile(filename):
        s = ''
        with open(filename, 'r') as f:  s = f.read()
        return CustomParser.fromString(s)
        


            
# for use with 'import *'
__all__ = [ 'CustomParser' ]
