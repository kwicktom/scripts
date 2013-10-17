#!/usr/bin/env python

#
# @Nikos M. http://nikos-web-development.netai.net/ , https://github.com/foo123/
#
# Build and Compress Javascript Packages using Closure Compiler (Nikos M.)
# adapted and xtended from three.js (mrdoob) package
#

try:
    import argparse
    ap = 1
except ImportError:
    import optparse
    ap = 0
import os
import tempfile
import sys

# File operations
def openFile(file, op, enc=False):
    if enc: f = open(file, op, encoding=enc)
    else: f = open(file, op)
    return f

def openFileDescriptor(file, op, enc=False):
    if enc: fh = os.fdopen(file, op, encoding=enc)
    else: fh = os.fdopen(file, op)
    return fh

def mergeFiles(files, realpath='', enc=False):

    buffer = []

    for filename in files:
        if filename.startswith('.') and ''!=realpath: filename=os.path.join(realpath, filename)
        f = openFile(os.path.join(filename), 'r', enc)
        buffer.append(f.read())
        f.close()

    return "".join(buffer)

def output(text, filename, realpath='', enc=False):

    if filename.startswith('.') and ''!=realpath: filename=os.path.join(realpath, filename)
    f = openFile(os.path.join(filename), 'w', enc)
    f.write(text)
    f.close()

def parseSettings(deps_file, enc=False):
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
    f=openFile(deps_file, 'r', enc)
    lines=f.readlines()
    f.close()
    
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
            #elif line.startswith('@POSTPROCESS'): # allow postprocess options (todo)
            #    currentBuffer=False
            #    inMinifyOptions=False
            #    continue
            elif line.startswith('@OUT'): # output file option
                currentBuffer=out
                inMinifyOptions=False
                continue
            #elif line.startswith('@END'): # end of settings
            #    currentBuffer=False
            #    inMinifyOptions=False
            #    continue
            else: # unknown option
                currentBuffer=False
                inMinifyOptions=False
                continue
        
        # if any settings need to be stored, store them in the appropriate buffer
        if False!=currentBuffer: currentBuffer.append(line)
    
    # return the parsed settings
    #print ("%s, %s, %s." % ("".join(deps), " ".join(optsUglify), " ".join(optsClosure)))
    return [out[0], deps, doMinify, " ".join(optsUglify), " ".join(optsClosure)]


def extractHeader(text):
    header = ''
    if text.startswith('/*'):
        position = text.find("*/", 0)
        header = text[0:position+2]
    return header


def compress(text, uglify_opts='', closure_opts='', useClosure=False, enc=False):

    in_tuple = tempfile.mkstemp()
    handle = openFileDescriptor(in_tuple[0], 'w', enc)
    handle.write(text)
    handle.close()
    
    out_tuple = tempfile.mkstemp()

    if useClosure:
        # use Java Closure compiler
        os.system("java -jar compiler/compiler.jar %s --js %s --js_output_file %s" % (closure_opts, in_tuple[1], out_tuple[1]))
    else:
        # use Node UglifyJS compiler (default)
        os.system("uglifyjs %s %s -o %s" % (in_tuple[1], uglify_opts, out_tuple[1]))

    handle = openFileDescriptor(out_tuple[0], 'r', enc)
    compressed = handle.read()
    handle.close()
    
    os.unlink(in_tuple[1])
    os.unlink(out_tuple[1])

    return compressed


def buildLib(filename, files, realpath='', minified=False, uglify_opts='', closure_opts='', useClosure=False, enc=False):

    text = mergeFiles(files, realpath, enc)
    header = ''
    sepLine = "=" * 65
    
    if minified:
        print (sepLine)
        print ("Compiling and Minifying", ("(Java Closure Compiler)", "(Node UglifyJS Compiler)")[useClosure==False], filename)
        print (sepLine)
        
        # minify and add any header
        header = extractHeader(text)
        text = compress(text, uglify_opts, closure_opts, useClosure, enc)
    else:
        print (sepLine)
        print ("Compiling", filename)
        print (sepLine)

    # write the processed file
    output(header + text, filename, realpath, enc)


def parseArgs():
    if ap:
        parser = argparse.ArgumentParser(description='Build and Compress Javascript Packages')
        parser.add_argument('--deps', help='Dependencies file (REQUIRED)', metavar="FILE")
        parser.add_argument('--closure', help='Use Java Closure, else UglifyJS Compiler (default)', default=False)
        parser.add_argument('-enc', help='set text encoding', default=False)
        args = parser.parse_args()

    else:
        parser = optparse.OptionParser(description='Build and Compress Javascript Packages')
        parser.add_option('--deps', help='Dependencies file (REQUIRED)', metavar="FILE")
        parser.add_option('--closure', dest='closure', help='Use Java Closure, else UglifyJS Compiler (default)', default=False)
        parser.add_option('--enc', dest='enc', help='set text encoding', default=False)
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


def main(argv=None):

    args = parseArgs()
    # get real-dir of deps file
    full_path = os.path.realpath(args.deps)
    realpath = os.path.dirname(full_path)
    config = [ parseSettings(full_path, args.enc) ]
    
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
    
    for fname_lib, files, do_minified, uglify_opts, closure_opts in config:
        buildLib(fname_lib, files, realpath, do_minified, uglify_opts, closure_opts, args.closure, args.enc)

if __name__ == "__main__":
    main()
