#!/usr/bin/env python

# CSSmin.py for Notepad++ Python Scripting plugin
# https://github.com/ethanpil/npp-cssmin
# This is a simple script that contains a Python port of the YUI CSS Compressor so you can minify both CSS and JS
#
##Credits
#  Original cssmin.py ported from YUI here https://github.com/zacharyvoase/cssmin 
###

##
#  Modified standalone version
#  v. 0.2
#  @Nikos M.
###

#from StringIO import StringIO # The pure-Python StringIO supports unicode.
import os, sys, re

try:
    import argparse
    ap = 1
except ImportError:
    import optparse
    ap = 0

# http://www.php2python.com/wiki/function.base64-encode/
try:
    import base64
    _hasBase64_ = 1
except ImportError:
    _hasBase64_ = 0
    

class CSSMin:
    """Minify CSS"""
    
    def __init__(self):
        self.enc = 'utf8'
        self.input = False
        self.output = False
        self.realpath = None
        self.embedImages = False
        self.embedFonts = False
   
    def openFile(self, file, op):
        if self.enc: f = open(file, op, encoding=self.enc)
        else: f = open(file, op)
        return f

    def read(self, file):
        buffer = ''
        maxSize = 10000000
        with self.openFile(file, "r") as f:
            buffer = f.read()
        return buffer

    def write(self, file, text):
        with self.openFile(file, "w") as f:
            f.write(text)

    def base64_encode(self, filename):
        s = ''
        #Python 3.x:
        #if _hasBase64_: return base64.b64encode(str(s, self.enc))
        #if _hasBase64_: return base64.encodestring(s)
        if _hasBase64_: 
            with open(filename, "rb") as f:
                s = base64.b64encode(f.read())
        #Python 2.x:
        #else: return str(s, self.enc).encode('base64')
        else: 
            with open(filename, "rb") as f:
                s = f.read().encode('base64')
        return s
        
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
    
    def isRelativePath(self, file):
        regex = re.compile(r'[a-z0-9_]')
        if file.startswith('http://') or file.startswith('https://') or file.startswith('/') or file.startswith('\\'):
            return False
        elif file.startswith('./') or file.startswith('../') or file.startswith('.\\') or file.startswith('..\\') or re.search(regex, file[0]):
            return True
            
        # unknown
        return False
    
    def realPath(self, file):
        if self.realpath:  return self.joinPath(self.realpath, file)
        else: return file
    
    def parseArgs(self):
        if ap:
            parser = argparse.ArgumentParser(description="Minify CSS Files")
            parser.add_argument('--input', help="input file (REQUIRED)", metavar="FILE")
            parser.add_argument('--output', help="output file (OPTIONAL)", default=False)
            parser.add_argument('--embed-images', action="store_true", dest='embedImages', help="whether to embed images in the css (default false)", default=False)
            parser.add_argument('--embed-fonts', action="store_true", dest='embedFonts', help="whether to embed fonts in the css (default false)", default=False)
            parser.add_argument('--basepath', help="file base path (OPTIONAL)", default=False)
            args = parser.parse_args()

        else:
            parser = optparse.OptionParser(description='Minify CSS Files')
            parser.add_option('--input', help="input file (REQUIRED)", metavar="FILE")
            parser.add_option('--output', dest='output', help="output file (OPTIONAL)", default=False)
            parser.add_option('--embed-images', action="store_true", dest='embedImages', help="whether to embed images in the css (default false)", default=False)
            parser.add_option('--embed-fonts', action="store_true", dest='embedFonts', help="whether to embed fonts in the css (default false)", default=False)
            parser.add_option('--basepath', help="file base path (OPTIONAL)", default=False)
            args, remainder = parser.parse_args()

        # If no arguments have been passed, show the help message and exit
        if len(sys.argv) == 1:
            parser.print_help()
            sys.exit(1)
        
        # Ensure variable is defined
        try:
            args.input
        except NameError:
            args.input = None

        # If no dependencies have been passed, show the help message and exit
        if None == args.input:
            parser.print_help()
            sys.exit(1)
        
        if args.basepath:
            self.realpath = args.basepath
        else:
            # get real-dir of input file
            self.realpath = os.path.dirname( os.path.realpath(args.input) )
        
        self.input = args.input
        self.output = args.output
        self.embedImages = args.embedImages
        self.embedFonts = args.embedFonts
        
    
    def remove_comments(self, css):
        """Remove all CSS comment blocks."""
        
        iemac = False
        preserve = False
        comment_start = css.find("/*")
        while comment_start >= 0:
            # Preserve comments that look like `/*!...*/`.
            # Slicing is used to make sure we don"t get an IndexError.
            preserve = css[comment_start + 2:comment_start + 3] == "!"
            
            comment_end = css.find("*/", comment_start + 2)
            if comment_end < 0:
                if not preserve:
                    css = css[:comment_start]
                    break
            elif comment_end >= (comment_start + 2):
                if css[comment_end - 1] == "\\":
                    # This is an IE Mac-specific comment; leave this one and the
                    # following one alone.
                    comment_start = comment_end + 2
                    iemac = True
                elif iemac:
                    comment_start = comment_end + 2
                    iemac = False
                elif not preserve:
                    css = css[:comment_start] + css[comment_end + 2:]
                else:
                    comment_start = comment_end + 2
            comment_start = css.find("/*", comment_start)
        
        return css


    def pseudoclasscolon(self, css):
        """
        Prevents 'p :link' from becoming 'p:link'.
        
        Translates 'p :link' into 'p ___PSEUDOCLASSCOLON___link'; this is
        translated back again later.
        """
        
        regex = re.compile(r"(^|\})(([^\{\:])+\:)+([^\{]*\{)")
        match = regex.search(css)
        while match:
            css = ''.join([
                css[:match.start()],
                match.group().replace(":", "___PSEUDOCLASSCOLON___"),
                css[match.end():]])
            match = regex.search(css)
        return css
    
    
    def remove_unnecessary_whitespace(self, css):
        """Remove unnecessary whitespace characters."""
        
        css = self.pseudoclasscolon(css)
        # Remove spaces from before things.
        css = re.sub(r"\s+([!{};:>+\(\)\],])", r"\1", css)
        
        # If there is a `@charset`, then only allow one, and move to the beginning.
        css = re.sub(r"^(.*)(@charset \"[^\"]*\";)", r"\2\1", css)
        css = re.sub(r"^(\s*@charset [^;]+;\s*)+", r"\1", css)
        
        # Put the space back in for a few cases, such as `@media screen` and
        # `(-webkit-min-device-pixel-ratio:0)`.
        css = re.sub(r"\band\(", "and (", css)
        
        # Put the colons back.
        css = css.replace('___PSEUDOCLASSCOLON___', ':')
        
        # Remove spaces from after things.
        css = re.sub(r"([!{}:;>+\(\[,])\s+", r"\1", css)
        
        return css


    def remove_unnecessary_semicolons(self, css):
        """Remove unnecessary semicolons."""
        
        return re.sub(r";+\}", "}", css)


    def remove_empty_rules(self, css):
        """Remove empty rules."""
        
        return re.sub(r"[^\}\{]+\{\}", "", css)


    def normalize_rgb_colors_to_hex(self, css):
        """Convert `rgb(51,102,153)` to `#336699`."""
        
        regex = re.compile(r"rgb\s*\(\s*([0-9,\s]+)\s*\)")
        match = regex.search(css)
        while match:
            colors = map(lambda s: s.strip(), match.group(1).split(","))
            hexcolor = '#%.2x%.2x%.2x' % tuple(map(int, colors))
            css = css.replace(match.group(), hexcolor)
            match = regex.search(css)
        return css


    def condense_zero_units(self, css):
        """Replace `0(px, em, %, etc)` with `0`."""
        
        return re.sub(r"([\s:])(0)(px|em|%|in|cm|mm|pc|pt|ex)", r"\1\2", css)


    def condense_multidimensional_zeros(self, css):
        """Replace `:0 0 0 0;`, `:0 0 0;` etc. with `:0;`."""
        
        css = css.replace(":0 0 0 0;", ":0;")
        css = css.replace(":0 0 0;", ":0;")
        css = css.replace(":0 0;", ":0;")
        
        # Revert `background-position:0;` to the valid `background-position:0 0;`.
        css = css.replace("background-position:0;", "background-position:0 0;")
        
        return css


    def condense_floating_points(self, css):
        """Replace `0.6` with `.6` where possible."""
        
        return re.sub(r"(:|\s)0+\.(\d+)", r"\1.\2", css)


    def condense_hex_colors(self, css):
        """Shorten colors from #AABBCC to #ABC where possible."""
        
        regex = re.compile(r"([^\"'=\s])(\s*)#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])")
        match = regex.search(css)
        while match:
            first = match.group(3) + match.group(5) + match.group(7)
            second = match.group(4) + match.group(6) + match.group(8)
            if first.lower() == second.lower():
                css = css.replace(match.group(), match.group(1) + match.group(2) + '#' + first)
                match = regex.search(css, match.end() - 3)
            else:
                match = regex.search(css, match.end())
        return css


    def condense_whitespace(self, css):
        """Condense multiple adjacent whitespace characters into one."""
        
        return re.sub(r"\s+", " ", css)


    def condense_semicolons(self, css):
        """Condense multiple adjacent semicolon characters into one."""
        
        return re.sub(r";;+", ";", css)


    def wrap_css_lines(self, css, line_length):
        """Wrap the lines of the given CSS to an approximate length."""
        
        lines = []
        line_start = 0
        for i, char in enumerate(css):
            # It's safe to break after `}` characters.
            if char == '}' and (i - line_start >= line_length):
                lines.append(css[line_start:i + 1])
                line_start = i + 1
        
        if line_start < len(css):
            lines.append(css[line_start:])
        return '\n'.join(lines)


    def extract_urls(self, css):
        # handle (relative) image/font urls in CSS
        urls = []
        regex = re.compile(r'\burl\s*\(([^\)]+?)\)')
        matches = re.findall(regex, css)
        if matches:
            
            for url in matches:
                url = url.strip().strip('"').strip("'")
                
                if self.isRelativePath(url):
                    urls.append(url)
            
            
        return urls
    
    def doEmbedImages(self, css, urls):
        images = ['gif', 'png', 'jpg', 'jpeg']
        replace = {}
        for url in urls:
            if url in replace: continue
            
            extension = url.split(".")[-1].lower()
            
            if extension in images:
                path = self.realPath(url)
                inline = self.base64_encode(path)
                # gif
                if 'gif'==extension:
                    inline = b'data:image/gif;base64,'+inline
                # png
                elif 'png'==extension:
                    inline = b'data:image/png;base64,'+inline
                # jpg
                else:
                    inline = b'data:image/jpeg;base64,'+inline
                
                css = css.replace(url, inline.decode(self.enc))
                
                replace[url] = True
        return css
        
    def doEmbedFonts(self, css, urls):
        fonts = ['svg', 'ttf', 'eot', 'woff']
        replace = {}
        for url in urls:
            idpos = url.find('#')
            if idpos>=0:
                id = url[idpos:]
                fonturl = url[0:idpos-1]
            else:
                id = ''
                fonturl = url
            
            if fonturl in replace: continue
            
            extension = fonturl.split(".")[-1].lower()
            
            if extension in fonts:
                path = self.realPath(url)
                inline = self.base64_encode(path)
                # svg
                if 'svg'==extension:
                    inline = b'data:font/svg;charset=utf-8;base64,'+inline
                # ttf
                elif 'ttf'==extension:
                    inline = b'data:font/ttf;charset=utf-8;base64,'+inline
                # eot
                elif 'eot'==extension:
                    inline = b'data:font/eot;charset=utf-8;base64,'+inline
                # woff
                else:
                    inline = b'data:font/woff;charset=utf-8;base64,'+inline
                
                css = css.replace(url, inline.decode(self.enc)+id)
                
                replace[fonturl] = True
                
        return css
        
    def minify(self, css, wrap=None):
        css = self.remove_comments(css)
        css = self.condense_whitespace(css)
        # A pseudo class for the Box Model Hack
        # (see http://tantek.com/CSS/Examples/boxmodelhack.html)
        css = css.replace('"\\"}\\""', "___PSEUDOCLASSBMH___")
        css = self.remove_unnecessary_whitespace(css)
        css = self.remove_unnecessary_semicolons(css)
        css = self.condense_zero_units(css)
        css = self.condense_multidimensional_zeros(css)
        css = self.condense_floating_points(css)
        css = self.normalize_rgb_colors_to_hex(css)
        css = self.condense_hex_colors(css)
        
        if wrap is not None: 
            css = self.wrap_css_lines(css, wrap)
        
        css = css.replace("___PSEUDOCLASSBMH___", '"\\"}\\""')
        css = self.condense_semicolons(css).strip()
        
        if self.embedImages or self.embedFonts:
            urls = self.extract_urls(css)
        if self.embedImages:  
            css = self.doEmbedImages(css, urls)
        if self.embedFonts:  
            css = self.doEmbedFonts(css, urls)
        
        return css
        
    def Main():
        cssmin = CSSMin()
        cssmin.parseArgs()
        
        if (cssmin.input):
            text = cssmin.read(cssmin.input)
            mintext = cssmin.minify(text)
            if cssmin.output: cssmin.write(cssmin.output, mintext)
            else: print (mintext)
    


#Finished defining functions. Now execute.
if __name__ == "__main__":  CSSMin.Main()