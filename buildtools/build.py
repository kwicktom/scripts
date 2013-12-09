#!/usr/bin/env python

#########################################################################################
#
#   Build a (js,css) package library based, 
#   on a dependencies file, 
#   using various compilers
#
#   Python: 2 or 3  (ca. 2012-2013)
#########################################################################################

#import pprint
import os, tempfile, sys, re, json

try:
    import argparse
    ap = 1
except ImportError:
    import optparse
    ap = 0

try:
    import yaml
    _hasYaml_ = 1
except ImportError:
    _hasYaml_ = 0

class BuildPackage:
    """Build a (js,css) library using various compilers"""
    
    def __init__(self):
        self.Encoding = 'utf8'
        self.inputType = 'custom'
        self.compilersPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'compilers') + '/'
        self.parsersPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parsers') + '/'
        self.IniParser = None
        self.CustomParser = None
        self.availableCompilers = {
            
            'cssmin' : {
                'name' : 'CSS Minifier',
                'compiler' : 'python __{{PATH}}__cssmin.py __{{EXTRA}}__ __{{OPTIONS}}__ --input __{{INPUT}}__  --output __{{OUTPUT}}__',
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
            
        }
        self.selectedCompiler = 'uglifyjs'
        
        self.realpath = ''
        self.outputToStdOut = True
        self.depsFile = ''
        self.inFiles = []
        self.replace = None
        self.doc = None
        self.doMinify = False
        self.outFile = None
   
    def import_path(self, fullpath='./', doReload=False):
        """ 
        Import a file with full path specification. Allows one to
        import from anywhere, something __import__ does not do. 
        """
        path, filename = os.path.split(os.path.abspath(fullpath))
        filename, ext = os.path.splitext(filename)
        
        sys.path.append(path)
        module = __import__(filename)
        
        if doReload:
            reload(module) # Might be out of date
        
        del sys.path[-1]
        
        return module
        
    def openFile(self, file, op):
        if self.Encoding: f = open(file, op, encoding=self.Encoding)
        else: f = open(file, op)
        return f

    def openFileDescriptor(self, file, op):
        if self.Encoding: fh = os.fdopen(file, op, encoding=self.Encoding)
        else: fh = os.fdopen(file, op)
        return fh

    def read(self, file):
        buffer = ''
        #f = self.openFile(file, "r")
        #buffer = f.read()
        #f.close()
        # http://sdqali.in/blog/2012/07/09/understanding-pythons-with/
        with self.openFile(file, "r") as f:
            buffer = f.read()
        return buffer
        
    def readfd(self, file):
        buffer = ''
        #f = self.openFileDescriptor(file, "r")
        #buffer = f.read()
        #f.close()
        # http://sdqali.in/blog/2012/07/09/understanding-pythons-with/
        with self.openFileDescriptor(file, "r") as f:
            buffer = f.read()
        return buffer
        
    def readLines(self, file):
        buffer = ''
        #f = self.openFile(file, "r")
        #buffer = f.readlines()
        #f.close()
        # http://sdqali.in/blog/2012/07/09/understanding-pythons-with/
        with self.openFile(file, "r") as f:
            buffer = f.readlines()
        return buffer
        
    def write(self, file, text):
        #f = self.openFile(file, "w")
        #f.write(text)
        #f.close()
        # http://sdqali.in/blog/2012/07/09/understanding-pythons-with/
        with self.openFile(file, "w") as f:
            f.write(text)
        
    def writefd(self, file, text):
        #f = self.openFileDescriptor(file, "w")
        #f.write(text)
        #f.close()
        # http://sdqali.in/blog/2012/07/09/understanding-pythons-with/
        with self.openFileDescriptor(file, "w") as f:
            f.write(text)
        
    def joinPath(self, *args): 
        argslen = len(args)
        DS = os.sep
        
        if 0==argslen: return "."
        
        path = DS.join(args)
        plen = len(path)
        
        if 0==plen: return "."
        
        isAbsolute    = path[0]
        trailingSlash = path[plen - 1]

        # http://stackoverflow.com/questions/3845423/remove-empty-strings-from-a-list-of-strings
        peices = [x for x in re.split(r'[\/\\]', path) if x]
        
        new_path = []
        up = 0
        i = len(peices)-1
        while i>=0:
            last = peices[i]
            if last == "..":
                up = up+1
            elif last != ".":
                if up>0:  up = up-1
                else:  new_path.append(peices[i])
            i = i-1
        
        path = DS.join(new_path[::-1])
        plen = len(path)
        
        if 0==plen and 0==len(isAbsolute):
            path = "."

        if 0!=plen and trailingSlash == DS:
            path += DS

        if isAbsolute == DS:
            return DS + path
        else:
            return path
    
    def realPath(self, file):
        if ''!=self.realpath and (file.startswith('./') or file.startswith('../') or file.startswith('.\\') or file.startswith('..\\')): 
            return self.joinPath(self.realpath, file) #os.path.join(self.realpath, file) #os.path.realpath(os.path.join(self.realpath, file))
        else:
            return file
    
    # http://www.php2python.com/wiki/function.pathinfo/
    def fileext(self, file):
        #absolute_path = file #os.path.abspath(file)
        #dirname = os.path.dirname(absolute_path)
        #basename = os.path.basename(absolute_path)
        extension  = os.path.splitext(file)[-1]  # return ".py"
        #filename = __file__
        #return {'dirname': dirname, 'basename': basename, 'extension': extension}
        if extension is not None:
            return extension
        return ''
    
    def parseArgs(self):
        if ap:
            parser = argparse.ArgumentParser(description="Build and Compress Javascript Packages")
            parser.add_argument('--deps', help="Dependencies File (REQUIRED)", metavar="FILE")
            parser.add_argument('--compiler', help="uglifyjs (default) | closure | yui | cssmin, Whether to use UglifyJS, Closure, YUI Compressor or CSSMin Compiler", default=self.selectedCompiler)
            parser.add_argument('--enc', help="set text encoding (default utf8)", metavar="ENCODING", default=self.Encoding)
            args = parser.parse_args()

        else:
            parser = optparse.OptionParser(description='Build and Compress Javascript Packages')
            parser.add_option('--deps', help="Dependencies File (REQUIRED)", metavar="FILE")
            parser.add_option('--compiler', dest='compiler', help="uglifyjs (default) | closure | yui | cssmin, Whether to use UglifyJS, Closure, YUI Compressor or CSSMin Compiler", default=self.selectedCompiler)
            parser.add_option('--enc', dest='enc', help="set text encoding (default utf8)", metavar="ENCODING", default=self.Encoding)
            args, remainder = parser.parse_args()

        # If no arguments have been passed, show the help message and exit
        if len(sys.argv) == 1:
            parser.print_help()
            sys.exit(1)
        
        # Ensure variable is defined
        try:
            args.deps
        except NameError:
            args.deps = None

        # If no dependencies have been passed, show the help message and exit
        if None == args.deps:
            parser.print_help()
            sys.exit(1)
        
        # fix compiler selection
        args.compiler = args.compiler.lower()
        if not ( args.compiler in self.availableCompilers): args.compiler = self.selectedCompiler
        
        return args
    
    # parse settings in hash format
    def parseHashSettings(self, settings=None):
        
        if settings:
            # parse it
            if 'DEPENDENCIES' in settings:
                deps = settings['DEPENDENCIES']
                # convert to list/array if not so
                if not isinstance(deps, list): deps = [deps]
                self.inFiles = deps
            else: 
                self.inFiles = []
        
            if 'REPLACE' in settings:
                self.replace = settings['REPLACE']
            else: 
                self.replace = None
            
            if ('DOC' in settings) and ('OUTPUT' in settings['DOC']):
                self.doc = settings['DOC']
                self.doc['OUTPUT'] = self.realPath(settings['DOC']['OUTPUT'])
            else: 
                self.doc = None
            
            if 'MINIFY' in settings:
                self.doMinify = True
                minsets = settings['MINIFY']
                
                if 'UGLIFY' in minsets:
                    opts = minsets['UGLIFY']
                    # convert to list/array if not so
                    if not isinstance(opts, list): opts = [opts]
                    self.availableCompilers['uglifyjs']['options'] = " ".join(opts)
                    
                if 'CLOSURE' in minsets:
                    opts = minsets['CLOSURE']
                    # convert to list/array if not so
                    if not isinstance(opts, list): opts = [opts]
                    self.availableCompilers['closure']['options'] = " ".join(opts)
                    
                if 'YUI' in minsets:
                    opts = minsets['YUI']
                    # convert to list/array if not so
                    if not isinstance(opts, list): opts = [opts]
                    self.availableCompilers['yui']['options'] = " ".join(opts)
                
                if 'CSSMIN' in minsets:
                    opts = minsets['CSSMIN']
                    # convert to list/array if not so
                    if not isinstance(opts, list): opts = [opts]
                    self.availableCompilers['cssmin']['options'] = " ".join(opts)
            else: 
                self.doMinify = False
            
            if 'OUT' in settings:
                self.outFile = self.realPath(settings['OUT'])
                self.outputToStdOut = False
            else:
                self.outFile = None
                self.outputToStdOut = True
    
    
    # parse dependencies file in INI format
    def parseIniSettings(self):
        if not self.IniParser:
            inimodule = self.import_path(os.path.join(self.parsersPath, 'ini.py'))
            self.IniParser = IniParser = inimodule.IniParser
        
        setts = IniParser.fromString(self.read(self.depsFile))
        
        if 'DEPENDENCIES' in setts:
            setts['DEPENDENCIES'] = setts['DEPENDENCIES']['__list__']
        if 'OUT' in setts:
            setts['OUT'] = setts['OUT']['__list__'][0]
        if 'REPLACE' in setts:
            del setts['REPLACE']['__list__']
        if 'DOC' in setts:
            del setts['DOC']['__list__']
        
        if 'MINIFY' in setts:
            minsetts = setts['MINIFY']
            
            if 'UGLIFY' in minsetts:
                setts['MINIFY']['UGLIFY'] = minsetts['UGLIFY']['__list__']
            if 'CLOSURE' in minsetts:
                setts['MINIFY']['CLOSURE'] = minsetts['CLOSURE']['__list__']
            if 'YUI' in minsetts:
                setts['MINIFY']['YUI'] = minsetts['YUI']['__list__']
            if 'CSSMIN' in minsetts:
                setts['MINIFY']['CSSMIN'] = minsetts['CSSMIN']['__list__']
        
        self.parseHashSettings( setts )
    
    # parse dependencies file in YAML format
    def parseYamlSettings(self):
        if _hasYaml_:
            self.parseHashSettings( yaml.load( self.read(self.depsFile) ) )
        else:
            print ("PyYaml is not installed!!")
            sys.exit(1)
    
    # parse dependencies file in JSON format
    def parseJsonSettings(self):
        # read json input
        self.parseHashSettings( json.loads( self.read(self.depsFile) ) )
    
    
    # parse dependencies file in custom format
    def parseCustomSettings(self):
        if not self.CustomParser:
            inimodule = self.import_path(os.path.join(self.parsersPath, 'custom.py'))
            self.CustomParser = CustomParser = inimodule.CustomParser
        
        setts = CustomParser.fromString(self.read(self.depsFile))
        
        #pprint.pprint(setts)
        #sys.exit(0)
        self.parseHashSettings( setts )
    
    def parse(self):
        args = self.parseArgs()
        
        # if args are correct continue
        # get real-dir of deps file
        full_path = self.depsFile = os.path.realpath(args.deps)
        self.realpath = os.path.dirname(full_path)
        self.Encoding = args.enc.lower()
        self.selectedCompiler = args.compiler
        
        ext = self.fileext(full_path).lower()
        if not len(ext): ext="custom"
        
        if ext==".json": 
            self.inputType=".json"
            self.parseJsonSettings()
        elif ext==".yml" or ext==".yaml": 
            self.inputType=".yaml"
            self.parseYamlSettings()
        elif ext==".ini": 
            self.inputType=".ini"
            self.parseIniSettings()
        else: 
            self.inputType="custom"
            self.parseCustomSettings()
    
    def doMerge(self):

        files = self.inFiles
        if len(files)>0:
            realpath=self.realpath
            buffer = []

            for filename in files:
                filename = self.realPath(filename)
                buffer.append(self.read(filename))

            return "".join(buffer)
        return ""

    
    def doReplace(self, text, replace):
        
        for k in replace:
            text = text.replace(k, replace[k])
        return text
        
    
    def doExtractDoc(self, text, doc):
        startDoc = doc['STARTDOC']
        endDoc = doc['ENDDOC']
        
        if 'TRIM' in doc: trim = doc['TRIM']
        else: trim = None
        
        docs = []
        
        # extract doc blocks
        blocks = text.split(startDoc)
        for b in range(len(blocks)):
            tmp = blocks[b].split(endDoc)
            if len(tmp)>1:
                docs.append(tmp[0])
        blocks = None
        
        # trim first chars of each doc block line
        if trim:
            trimlen = len(trim)
            for i in range(len(docs)):
                tmp = docs[i].split("\n")
                
                for j in range(len(tmp)):
                    if len(tmp[j])>0 and tmp[j].startswith(trim):
                        tmp[j] = tmp[j][trimlen:]
                
                docs[i] = "\n".join(tmp)
           
        return "\n\n".join(docs)
        
    
    def doExtractHeader(self, text):
        header = ''
        if text.startswith('/**'):
            position = text.find("**/", 0)
            header = text[0:position+3]
        elif text.startswith('/*!'):
            position = text.find("!*/", 0)
            header = text[0:position+3]
        return header


    def doPreprocess(self, text):
        return text


    def doPostprocess(self, text):
        return text

    
    def doCompress(self, text):

        if '' != text:
            in_tuple = tempfile.mkstemp()  
            out_tuple = tempfile.mkstemp()
            
            self.writefd(in_tuple[0], text)

            extra = ''
            if 'cssmin'==self.selectedCompiler:
                if not self.outputToStdOut:
                    extra = "--basepath "+os.path.dirname(self.outFile)
                else:
                    extra = ""
            elif 'yui'==self.selectedCompiler or 'closure'==self.selectedCompiler:
                extra = "--charset "+self.Encoding
                    
            # use the selected compiler
            compiler = self.availableCompilers[self.selectedCompiler]
            cmd = compiler['compiler'].replace('__{{PATH}}__', self.compilersPath).replace('__{{EXTRA}}__', extra).replace('__{{OPTIONS}}__', compiler['options']).replace('__{{INPUT}}__', in_tuple[1]).replace('__{{OUTPUT}}__', out_tuple[1])
            err = os.system(cmd)
            # on *nix systems this is a tuple, similar to the os.wait return result
            # on windows it is an integer
            # http://docs.python.org/2/library/os.html#process-management
            # http://docs.python.org/2/library/os.html#os.wait
            # high-byte is the exit status
            if not (type(err) is int): err = 255 & (err[1]>>8)
            
            if 0==err: compressed = self.readfd(out_tuple[0])
            
            try:
                os.unlink(in_tuple[1])
            except: 
                pass
            try:
                os.unlink(out_tuple[1])
            except: 
                pass
            
            # some error occured
            if 0!=err: sys.exit(1)
            
            return compressed
        return ''


    def build(self):

        text = self.doMerge()
        header = ''
        
        #self.doPreprocess(text)
        
        if self.replace:
            text = self.doReplace(text, self.replace)
            
        if self.doc:
            self.write(os.path.join(self.doc['OUTPUT']), self.doExtractDoc(text, self.doc))
            
        sepLine = "=" * 65
        
        # output the build settings
        if not self.outputToStdOut:
            print (sepLine)
            print (" Build Package ")
            print (sepLine)
            print (" ")
            print ("Input    : " + self.inputType);
            print ("Encoding : " + self.Encoding)
            if self.doMinify:
                print ("Minify   : ON")
                print ("Compiler : " + self.availableCompilers[self.selectedCompiler]['name'])
            else:
                print ("Minify   : OFF")
            print ("Output   : " + self.outFile)
            print (" ")
        
        if self.doMinify:
            # minify and add any header
            header = self.doExtractHeader(text)
            text = self.doCompress(text)

        #self.doPostprocess(text)
        
        # write the processed file
        if self.outputToStdOut: print (header + text)
        else: self.write(os.path.join(self.outFile), header + text)

    def Main():
        # do the process
        buildLib = BuildPackage()
        buildLib.parse()
        buildLib.build()


# if called directly from command-line
# do the process
if __name__ == "__main__":  
    BuildPackage.Main()
