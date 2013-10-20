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
        self.enc = False
        self.inFiles = []
        self.doMinify = False
        self.useClosure = False
        self.optsUglify = ''
        self.optsClosure = ''
        self.outFile = None
        self.outputToStdOut = True
   
    def openFile(self, file, op):
        if self.enc: f = open(file, op, encoding=self.enc)
        else: f = open(file, op)
        return f

    def openFileDescriptor(self, file, op):
        if self.enc: fh = os.fdopen(file, op, encoding=self.enc)
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
            return os.path.join(self.realpath, file)
        else:
            return file
    
    def parseArgs(self):
        if ap:
            parser = argparse.ArgumentParser(description='Build and Compress Javascript Packages')
            parser.add_argument('--deps', help='Dependencies file (REQUIRED)', metavar="FILE")
            parser.add_argument('--closure', help='Use Java Closure, else UglifyJS Compiler (default)', default=False)
            parser.add_argument('-enc', help='set text encoding (default utf8)', default=False)
            args = parser.parse_args()

        else:
            parser = optparse.OptionParser(description='Build and Compress Javascript Packages')
            parser.add_option('--deps', help='Dependencies file (REQUIRED)', metavar="FILE")
            parser.add_option('--closure', dest='closure', help='Use Java Closure, else UglifyJS Compiler (default)', default=False)
            parser.add_option('--enc', dest='enc', help='set text encoding (default utf8)', default=False)
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
        
        return args
    
    def parseSettings(self):
        # settings buffers
        deps = []
        out = []
        optsUglify = []
        optsClosure = []
        
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
        self.optsUglify = " ".join(optsUglify)
        self.optsClosure = " ".join(optsClosure)
    
    def parse(self):
        args = self.parseArgs()
        # if args are correct continue
        # get real-dir of deps file
        full_path = self.depsFile = os.path.realpath(args.deps)
        self.realpath = os.path.dirname(full_path)
        self.enc = args.enc
        self.useClosure = args.closure
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

            if self.useClosure:
                # use Java Closure compiler
                cmd = "java -jar compiler/compiler.jar %s --js %s --js_output_file %s" % (self.optsClosure, in_tuple[1], out_tuple[1])
            else:
                # use Node UglifyJS compiler (default)
                cmd = "uglifyjs %s %s -o %s" % (in_tuple[1], self.optsUglify, out_tuple[1])

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
                print ("Compiling and Minifying", ("(Java Closure Compiler)", "(Node UglifyJS Compiler)")[self.useClosure==False], self.outFile)
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
