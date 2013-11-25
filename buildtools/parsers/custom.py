##
#
#   Custom Parser for Python 2.x, 3.x
#
#   @author Nikos M.  
#   https://foo123.github.com/
#   http://nikos-web-development.netai.net/
#
##
import re

class CustomParser():
    """Custom parser for Python"""
    
    NLRX = None
    
    def _parseStr(s, q):
        endq = s.find(q, 1)
        sq = s[1:endq]
        r = s[endq+1:].strip()
        
        return sq, r
    
    def fromString(s):
        _self = CustomParser
        
        if not _self.NLRX:
            _self.NLRX = re.compile(r'\n\r|\r\n|\r|\n')
            
        # settings buffers
        settings = {}
        
        prevTag = None
        currentBuffer = None
        
        # parse the lines
        lines = re.split(_self.NLRX, str(s))
        
        # parse it line-by-line
        for line in lines:
            
            # strip the line of extra spaces
            line = line.strip()
            
            # comment or empty line, skip it
            if line.startswith('#') or ''==line: continue
            
            #directive line, parse it
            if line.startswith('@'):
                
                if line.startswith('@DEPENDENCIES'): # list of input dependencies files option
                    if '@DEPENDENCIES' not in settings:
                        settings['@DEPENDENCIES'] = []
                    currentBuffer = settings['@DEPENDENCIES']
                    prevTag = '@DEPENDENCIES'
                    continue
                elif line.startswith('@REPLACE'): # list of replacements texts
                    if '@REPLACE' not in settings:
                        settings['@REPLACE'] = {}
                    currentBuffer = settings['@REPLACE']
                    prevTag = '@REPLACE'
                    continue
                elif line.startswith('@MINIFY'): # enable minification (default is UglifyJS Compiler)
                    if '@MINIFY' not in settings:
                        settings['@MINIFY'] = {}
                    doMinify = True
                    currentBuffer = None
                    prevTag = '@MINIFY'
                    continue
                #elif line.startswith('@PREPROCESS'): # allow preprocess options (todo)
                #    currentBuffer = None
                #    prevTag = '@PREPROCESS'
                #    continue
                #elif line.startswith('@POSTPROCESS'): # allow postprocess options (todo)
                #    currentBuffer = None
                #    prevTag = '@POSTPROCESS'
                #    continue
                elif line.startswith('@OUT'): # output file option
                    if '@OUT' not in settings:
                        settings['@OUT'] = []
                    currentBuffer = settings['@OUT']
                    prevTag = '@OUT'
                    continue
                else:
                    currentBuffer = None
                    
                    if prevTag == '@MINIFY':
                        if line.startswith('@UGLIFY'): # Node UglifyJS Compiler options (default)
                            if '@UGLIFY' not in settings['@MINIFY']:
                                settings['@MINIFY']['@UGLIFY'] = []
                            currentBuffer = settings['@MINIFY']['@UGLIFY']
                            continue
                        elif line.startswith('@CLOSURE'): # Java Closure Compiler options
                            if '@CLOSURE' not in settings['@MINIFY']:
                                settings['@MINIFY']['@CLOSURE'] = []
                            currentBuffer = settings['@MINIFY']['@CLOSURE']
                            continue
                        elif line.startswith('@YUI'): # Java YUI Compressor Compiler options
                            if '@YUI' not in settings['@MINIFY']:
                                settings['@MINIFY']['@YUI'] = []
                            currentBuffer = settings['@MINIFY']['@YUI']
                            continue
                        elif line.startswith('@CSSMIN'): # CSS Minifier
                            if '@CSSMIN' not in settings['@MINIFY']:
                                settings['@MINIFY']['@CSSMIN'] = []
                            currentBuffer = settings['@MINIFY']['@CSSMIN']
                            continue
                
                    # unknown option or dummy separator option
                    prevTag = None
                    continue
            
            # if any settings need to be stored, store them in the appropriate buffer
            if currentBuffer is not None: 
                
                if '@REPLACE' == prevTag:
                    
                    linestartswith = line[0]
                    # quoted string
                    if '"' == linestartswith or "'" == linestartswith:
                    
                        key, line = _self._parseStr(line, linestartswith)
                        
                        # key-value pair
                        if line.find('=', 0)>-1:
                            value = line.split('=', 2)[1].strip()
                            valuestartswith = value[0]
                            
                            # quoted value
                            if '"'==valuestartswith or "'"==valuestartswith:
                                value, rem = _self._parseStr(value, valuestartswith)
                            
                            currentBuffer[key] = value
                        
                    
                    # un-quoted string
                    else:
                    
                        pair = line.split('=', 2)
                    
                        key = pair[0].strip()
                        value = pair[1].strip()
                        valuestartswith = value[0]
                        
                        # quoted value
                        if '"'==valuestartswith or "'"==valuestartswith:
                            value, rem = _self._parseStr(value, valuestartswith)
                        
                        currentBuffer[key] = value
                
                else:
                    currentBuffer.append(line)
        
        return settings

    
    def fromFile(filename):
        s = ''
        with open(filename, 'r') as f:  s = f.read()
        return CustomParser.fromString(s)
        


            
# for use with 'import *'
__all__ = [ 'CustomParser' ]
