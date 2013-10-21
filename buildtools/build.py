#!/usr/bin/env python

#########################################################################################
#
#   Build a (js,css) package library based, 
#   on a dependencies file, 
#   using various compilers (UglifyJS, Closure)
#
#   Python: 2 or 3  (ca. 2012-2013)
#########################################################################################

# http://stackoverflow.com/questions/5137497/find-current-directory-and-files-directory/13720875#13720875
#print("Path at terminal when executing this file")
#print(os.getcwd() + "\n")
#
#print("This file path, relative to os.getcwd()")
#print(__file__ + "\n")
#
#print("This file full path (following symlinks)")
#full_path = os.path.realpath(args.deps)
#print(full_path + "\n")
#
#print("This file directory and name")
#path, file = os.path.split(full_path)
#print(path + ' --> ' + file + "\n")
#
#print("This file directory only")
#print(os.path.dirname(full_path))

try:
    import argparse
    ap = 1
except ImportError:
    import optparse
    ap = 0
import os, tempfile, sys


class BuildPackage:
    """Build a (js,css) library using various compilers (UglifyJS, Closure)"""
    
    def __init__(self):
        self.depsFile = ''
        self.realpath = ''
        self.ENCODING = 'utf8'
        self.inFiles = []
        self.doMinify = False
        self.compilers = {
            
            'UGLIFYJS' : {
                'name' : 'Node UglifyJS Compiler',
                'compiler' : 'uglifyjs __{{INPUT}}__ __{{OPTIONS}}__ -o __{{OUTPUT}}__',
                'options' : ''
            },
            
            'CLOSURE' : {
                'name' : 'Java Closure Compiler',
                'compiler' : 'java -jar __{{PATH}}__closure.jar --charset __{{ENCODING}}__ __{{OPTIONS}}__ --js __{{INPUT}}__ --js_output_file __{{OUTPUT}}__',
                'options' : ''
            },
        
        # --type <js|css>           Specifies the type of the input file
        # --charset <charset>       Read the input file using <charset>
            'YUI' : {
                'name' : 'Java YUI Compressor Compiler',
                'compiler' : 'java -jar __{{PATH}}__yuicompressor.jar --charset __{{ENCODING}}__ __{{OPTIONS}}__ --type js -o __{{OUTPUT}}__  __{{INPUT}}__',
                'options' : ''
            }
            
        }
        self.compiler = 'UGLIFYJS'
        self.outFile = None
        self.outputToStdOut = True
        self.COMPILERS=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'compilers') + '/'
   
    def openFile(self, file, op):
        if self.ENCODING: f = open(file, op, encoding=self.ENCODING)
        else: f = open(file, op)
        return f

    def openFileDescriptor(self, file, op):
        if self.ENCODING: fh = os.fdopen(file, op, encoding=self.ENCODING)
        else: fh = os.fdopen(file, op)
        return fh

    def read(self, file):
        f = self.openFile(file, "r")
        buffer = f.read()
        f.close()
        return buffer
        
    def readfd(self, file):
        f = self.openFileDescriptor(file, "r")
        buffer = f.read()
        f.close()
        return buffer
        
    def readLines(self, file):
        f = self.openFile(file, "r")
        buffer = f.readlines()
        f.close()
        return buffer
        
    def write(self, file, text):
        f = self.openFile(file, "w")
        f.write(text)
        f.close()
        
    def writefd(self, file, text):
        f = self.openFileDescriptor(file, "w")
        f.write(text)
        f.close()
        
    def pathreal(self, file):
        if ''!=self.realpath and (file.startswith('./') or file.startswith('../') or file.startswith('.\\') or file.startswith('..\\')): 
            return os.path.realpath(os.path.join(self.realpath, file))
        else:
            return file
    
    def parseArgs(self):
        if ap:
            parser = argparse.ArgumentParser(description="Build and Compress Javascript Packages")
            parser.add_argument('--deps', help="Dependencies File (REQUIRED)", metavar="FILE")
            parser.add_argument('--compiler', help="uglifyjs (default) | closure | yui, Whether to use UglifyJS or Closure or YUI Compressor Compiler", default=self.compiler)
            parser.add_argument('-enc', help="set text encoding (default utf8)", metavar="ENCODING", default=self.ENCODING)
            args = parser.parse_args()

        else:
            parser = optparse.OptionParser(description='Build and Compress Javascript Packages')
            parser.add_option('--deps', help="Dependencies File (REQUIRED)", metavar="FILE")
            parser.add_option('--compiler', dest='compiler', help="uglifyjs (default) | closure | yui, Whether to use UglifyJS or Closure or YUI Compressor Compiler", default=self.compiler)
            parser.add_option('--enc', dest='enc', help="set text encoding (default utf8)", metavar="ENCODING", default=self.ENCODING)
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
        args.compiler = args.compiler.upper()
        if not ( args.compiler in self.compilers): args.compiler = self.compiler
        
        return args
    
    def parseSettings(self):
        # settings buffers
        deps = []
        out = []
        optsUglify = []
        optsClosure = []
        optsYUI = []
        
        currentBuffer = False
        
        # settings options
        doMinify = False
        inMinifyOptions = False

        # read the dependencies file
        lines=self.readLines(self.depsFile)
        
        # parse it line-by-line
        for line in lines:
            
            # strip the line of extra spaces
            line=line.strip().replace('\n', '').replace('\r', '')
            
            # comment or empty line, skip it
            if line.startswith('#') or ''==line: continue
            
            #directive line, parse it
            if line.startswith('@'):
                if line.startswith('@DEPENDENCIES'): # list of input dependencies files option
                    currentBuffer=deps
                    inMinifyOptions=False
                    continue
                elif line.startswith('@MINIFY'): # enable minification (default is UglifyJS Compiler)
                    currentBuffer=False
                    doMinify=True
                    inMinifyOptions=True
                    continue
                elif inMinifyOptions and line.startswith('@UGLIFY'): # Node UglifyJS Compiler options (default)
                    currentBuffer=optsUglify
                    continue
                elif inMinifyOptions and line.startswith('@CLOSURE'): # Java Closure Compiler options
                    currentBuffer=optsClosure
                    continue
                elif inMinifyOptions and line.startswith('@YUI'): # Java YUI Compressor Compiler options
                    currentBuffer=optsYUI
                    continue
                #elif line.startswith('@PREPROCESS'): # allow preprocess options (todo)
                #    currentBuffer=False
                #    inMinifyOptions=False
                #    continue
                #elif line.startswith('@POSTPROCESS'): # allow postprocess options (todo)
                #    currentBuffer=False
                #    inMinifyOptions=False
                #    continue
                elif line.startswith('@OUT'): # output file option
                    currentBuffer=out
                    inMinifyOptions=False
                    continue
                else: # unknown option or dummy separator option
                    currentBuffer=False
                    inMinifyOptions=False
                    continue
            
            # if any settings need to be stored, store them in the appropriate buffer
            if False!=currentBuffer: currentBuffer.append(line)
        
        # store the parsed settings
        if 1 <= len(out):
            self.outFile = self.pathreal(out[0])
            self.outputToStdOut = False
        else:
            self.outFile = None
            self.outputToStdOut = True
        self.inFiles = deps
        self.doMinify = doMinify
        self.compilers['UGLIFYJS']['options'] = " ".join(optsUglify)
        self.compilers['CLOSURE']['options'] = " ".join(optsClosure)
        self.compilers['YUI']['options'] = " ".join(optsYUI)
    
    def parse(self):
        args = self.parseArgs()
        # if args are correct continue
        # get real-dir of deps file
        full_path = self.depsFile = os.path.realpath(args.deps)
        self.realpath = os.path.dirname(full_path)
        self.ENCODING = args.enc
        self.compiler = args.compiler
        self.parseSettings()
    
    def mergeFiles(self):

        files=self.inFiles
        if len(files)>0:
            realpath=self.realpath
            buffer = []

            for filename in files:
                filename = self.pathreal(filename)
                buffer.append(self.read(filename))

            return "".join(buffer)
        return ""

    def extractHeader(self, text):
        header = ''
        if text.startswith('/**'):
            position = text.find("**/", 0)
            header = text[0:position+3]
        return header


    def compress(self, text):

        if '' != text:
            in_tuple = tempfile.mkstemp()
            out_tuple = tempfile.mkstemp()
            
            self.writefd(in_tuple[0], text)

            # use the selected compiler
            compiler = self.compilers[self.compiler]
            cmd = str(compiler['compiler']).replace('__{{PATH}}__', self.COMPILERS).replace('__{{OPTIONS}}__', compiler['options']).replace('__{{ENCODING}}__', self.ENCODING).replace('__{{INPUT}}__', in_tuple[1]).replace('__{{OUTPUT}}__', out_tuple[1])
            err = os.system(cmd)
            # on *nix systems this is a tuple, similar to the os.wait return result
            # on windows it is an integer
            # http://docs.python.org/2/library/os.html#process-management
            # http://docs.python.org/2/library/os.html#os.wait
            # high-byte is the exit status
            if not (type(err) is int): err = 255 & (err[1]>>8)
            
            if 0==err: compressed = self.readfd(out_tuple[0])
            
            os.unlink(in_tuple[1])
            os.unlink(out_tuple[1])
            
            # some error occured
            if 0!=err: sys.exit(1)
            
            return compressed
        return ''


    def build(self):

        text = self.mergeFiles()
        header = ''
        sepLine = "=" * 65
        
        if self.doMinify:
            if not self.outputToStdOut:
                print (sepLine)
                print ("Compiling and Minifying (", self.compilers[self.compiler]['name'], ") ", self.outFile)
                print (sepLine)
            
            # minify and add any header
            header = self.extractHeader(text)
            text = self.compress(text)
        else:
            if not self.outputToStdOut:
                print (sepLine)
                print ("Compiling", self.outFile)
                print (sepLine)

        # write the processed file
        if self.outputToStdOut: print (header + text)
        else: self.write(os.path.join(self.outFile), header + text)


# do the process
def main(argv=None):
    
    buildLib = BuildPackage()
    buildLib.parse()
    buildLib.build()

if __name__ == "__main__":  main()
