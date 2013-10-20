#!/usr/bin/env python

# CSSmin.py for Notepad++ Python Scripting plugin
# https://github.com/ethanpil/npp-cssmin
# This is a simple script that contains a Python port of the YUI CSS Compressor so you can minify both CSS and JS
#
##Credits
#  Original cssmin.py ported from YUI here https://github.com/zacharyvoase/cssmin 
###

##
#  Modified version of npp-cssmin
###

import os, sys
from StringIO import StringIO # The pure-Python StringIO supports unicode.
import re

class CSSMin:
    """Minify CSS"""
    
    def __init__(self):
        self.enc = False
   
    def openFile(self, file, op):
        if self.enc: f = open(file, op, encoding=self.enc)
        else: f = open(file, op)
        return f

    def read(self, file):
        buffer = ''
        f = self.openFile(os.path.join(file), 'r')
        buffer = f.read()
        f.close()
        return buffer

    def write(self, file, text):
        f = self.openFile(os.path.join(file), 'w')
        f.write(text)
        f.close()

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


    def remove_unnecessary_whitespace(self, css):
        """Remove unnecessary whitespace characters."""
        
        def pseudoclasscolon(css):
            
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
        
        css = pseudoclasscolon(css)
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
        if wrap is not None: css = self.wrap_css_lines(css, wrap)
        css = css.replace("___PSEUDOCLASSBMH___", '"\\"}\\""')
        css = self.condense_semicolons(css)
        return css.strip()


#Finished defining functions. Now execute.
def main(argv=None):
    cssmin=CSSMin()
    if argv[1]:
        text = cssmin.read(argv[1])
        mintext = cssmin.minify(text)
        if argv[2]: cssmin.write(argv[2], mintext)
        else: print mintext

if __name__ == "__main__":  main()