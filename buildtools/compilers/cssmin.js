#!/usr/bin/env node
/**
# CSSmin.py for Notepad++ Python Scripting plugin
# https://github.com/ethanpil/npp-cssmin
# This is a simple script that contains a Python port of the YUI CSS Compressor so you can minify both CSS and JS
#
##Credits
#  Original cssmin.py ported from YUI here https://github.com/zacharyvoase/cssmin 
###

##
#  Modified version of npp-cssmin adapted for Node 0.8+
#  v. 0.2
#  @Nikos M.
###
**/
var CSSMin = (function(root, undef){

    var 
        // some shortcuts
        hasOwn = Object.prototype.hasOwnProperty, concat = Array.prototype.concat, slice = Array.prototype.slice,
        startsWith = function(s, p) { return 0===s.indexOf(p); },
        extend = function(o1, o2) { o1=o1||{}; for (var p in o1){ if (hasOwn.call(o2, p) && hasOwn.call(o1, p) && undef!==o2[p]) { o1[p]=o2[p]; } }; return o1; },

        // basic modules
        fs = require('fs'), path = require('path'), 
        realpath = fs.realpathSync, readFile = fs.readFileSync, writeFile = fs.writeFileSync, 
        exists = fs.existsSync, unLink = fs.unlinkSync, 
        dirname = path.dirname, pjoin = path.join,
        THISFILE = path.basename(__filename),
        exit = process.exit, echo = console.log, echoStdErr = console.error,
        DS = path.sep || '/', DSRX = /\/|\\/g, FILENAME = /^[a-z0-9_]/i
    ;
    
    /**
    *
    * adapted from phpjs (https://github.com/kvz/phpjs)
    *
    **/
    function sprintf () {
      // http://kevin.vanzonneveld.net
      // +   original by: Ash Searle (http://hexmen.com/blog/)
      // + namespaced by: Michael White (http://getsprink.com)
      // +    tweaked by: Jack
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +      input by: Paulo Freitas
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +      input by: Brett Zamir (http://brett-zamir.me)
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   improved by: Dj
      // +   improved by: Allidylls
      // *     example 1: sprintf("%01.2f", 123.1);
      // *     returns 1: 123.10
      // *     example 2: sprintf("[%10s]", 'monkey');
      // *     returns 2: '[    monkey]'
      // *     example 3: sprintf("[%'#10s]", 'monkey');
      // *     returns 3: '[####monkey]'
      // *     example 4: sprintf("%d", 123456789012345);
      // *     returns 4: '123456789012345'
      var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
      var a = arguments,
        i = 0,
        format = a[i++];

      // pad()
      var pad = function (str, len, chr, leftJustify) {
        if (!chr) {
          chr = ' ';
        }
        var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
        return leftJustify ? str + padding : padding + str;
      };

      // justify()
      var justify = function (value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
        var diff = minWidth - value.length;
        if (diff > 0) {
          if (leftJustify || !zeroPad) {
            value = pad(value, minWidth, customPadChar, leftJustify);
          } else {
            value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
          }
        }
        return value;
      };

      // formatBaseX()
      var formatBaseX = function (value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
        // Note: casts negative numbers to positive ones
        var number = value >>> 0;
        prefix = prefix && number && {
          '2': '0b',
          '8': '0',
          '16': '0x'
        }[base] || '';
        value = prefix + pad(number.toString(base), precision || 0, '0', false);
        return justify(value, prefix, leftJustify, minWidth, zeroPad);
      };

      // formatString()
      var formatString = function (value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
        if (precision != null) {
          value = value.slice(0, precision);
        }
        return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
      };

      // doFormat()
      var doFormat = function (substring, valueIndex, flags, minWidth, _, precision, type) {
        var number;
        var prefix;
        var method;
        var textTransform;
        var value;

        if (substring == '%%') {
          return '%';
        }

        // parse flags
        var leftJustify = false,
          positivePrefix = '',
          zeroPad = false,
          prefixBaseX = false,
          customPadChar = ' ';
        var flagsl = flags.length;
        for (var j = 0; flags && j < flagsl; j++) {
          switch (flags.charAt(j)) {
          case ' ':
            positivePrefix = ' ';
            break;
          case '+':
            positivePrefix = '+';
            break;
          case '-':
            leftJustify = true;
            break;
          case "'":
            customPadChar = flags.charAt(j + 1);
            break;
          case '0':
            zeroPad = true;
            break;
          case '#':
            prefixBaseX = true;
            break;
          }
        }

        // parameters may be null, undefined, empty-string or real valued
        // we want to ignore null, undefined and empty-string values
        if (!minWidth) {
          minWidth = 0;
        } else if (minWidth == '*') {
          minWidth = +a[i++];
        } else if (minWidth.charAt(0) == '*') {
          minWidth = +a[minWidth.slice(1, -1)];
        } else {
          minWidth = +minWidth;
        }

        // Note: undocumented perl feature:
        if (minWidth < 0) {
          minWidth = -minWidth;
          leftJustify = true;
        }

        if (!isFinite(minWidth)) {
          throw new Error('sprintf: (minimum-)width must be finite');
        }

        if (!precision) {
          precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : undefined;
        } else if (precision == '*') {
          precision = +a[i++];
        } else if (precision.charAt(0) == '*') {
          precision = +a[precision.slice(1, -1)];
        } else {
          precision = +precision;
        }

        // grab value using valueIndex if required?
        value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

        switch (type) {
        case 's':
          return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
        case 'c':
          return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
        case 'b':
          return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
        case 'o':
          return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
        case 'x':
          return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
        case 'X':
          return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
        case 'u':
          return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
        case 'i':
        case 'd':
          number = +value || 0;
          number = Math.round(number - number % 1); // Plain Math.round doesn't just truncate
          prefix = number < 0 ? '-' : positivePrefix;
          value = prefix + pad(String(Math.abs(number)), precision, '0', false);
          return justify(value, prefix, leftJustify, minWidth, zeroPad);
        case 'e':
        case 'E':
        case 'f': // Should handle locales (as per setlocale)
        case 'F':
        case 'g':
        case 'G':
          number = +value;
          prefix = number < 0 ? '-' : positivePrefix;
          method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
          textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
          value = prefix + Math.abs(number)[method](precision);
          return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
        default:
          return substring;
        }
      };

      return format.replace(regex, doFormat);
    }
    function vsprintf (format, args) {
      // http://kevin.vanzonneveld.net
      // +   original by: ejsanders
      // -    depends on: sprintf
      // *     example 1: vsprintf('%04d-%02d-%02d', [1988, 8, 1]);
      // *     returns 1: '1988-08-01'
      return this.sprintf.apply(this, [format].concat(args));
    }
    function array_map (callback) {
      // http://kevin.vanzonneveld.net
      // +   original by: Andrea Giammarchi (http://webreflection.blogspot.com)
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   improved by: Brett Zamir (http://brett-zamir.me)
      // %        note 1: Takes a function as an argument, not a function's name
      // %        note 2: If the callback is a string, it can only work if the function name is in the global context
      // *     example 1: array_map( function (a){return (a * a * a)}, [1, 2, 3, 4, 5] );
      // *     returns 1: [ 1, 8, 27, 64, 125 ]
      var argc = arguments.length,
        argv = arguments;
      var j = argv[1].length,
        i = 0,
        k = 1,
        m = 0;
      var tmp = [],
        tmp_ar = [];

      while (i < j) {
        while (k < argc) {
          tmp[m++] = argv[k++][i];
        }

        m = 0;
        k = 1;

        if (callback) {
          if (typeof callback === 'string') {
            callback = this.window[callback];
          }
          tmp_ar[i++] = callback.apply(null, tmp);
        } else {
          tmp_ar[i++] = tmp;
        }

        tmp = [];
      }

      return tmp_ar;
    }
    
    
    /**
    *
    *    CSSMin main Class
    *
    **/
    var CSSMin = function() {
        
            this.enc = 'utf8'; 
            this.input = false; 
            this.output = false; 
            this.embedImages = false; 
            this.embedFonts = false; 
            this.realpath = null; 
    };
    CSSMin.prototype = {
       
        constructor : CSSMin,
        
        enc : 'utf8',
        input : false,
        output : false,
        embedImages : false,
        embedFonts : false,
        realpath : null,
        
        read : function(file) { 
            return readFile(file, {encoding: this.enc}); 
        },

        write : function(file, text) { 
            return writeFile(file, text, {encoding: this.enc}); 
        },

        // https://github.com/JosephMoniz/php-path
        joinPath : function() {
            var i, args = slice.call(arguments), argslen = args.length,
                path, plen, isAbsolute, trailingSlash, 
                peices, peiceslen, tmp,
                new_path, up, last
            ;
            
            if (!argslen)  return ".";
            
            path = args.join( DS );
            plen = path.length;
            
            if (!plen) return ".";
            
            isAbsolute    = path[0];
            trailingSlash = path[plen - 1];

            tmp = path.split(DSRX);
            peiceslen = tmp.length;
            peices = [];
            for (i=0; i<peiceslen; i++)
            {
                if (tmp[i].length) peices.push(tmp[i]);
            }
            
            new_path = [];
            up = 0;
            i = peices.length-1;
            while (i>=0)
            {
                last = peices[i];
                if (last == "..") 
                {
                    up++;
                } 
                else if (last != ".")
                {
                    if (up)  up--;
                    else  new_path.push( peices[i] );
                }
                i--;
            }
            
            path = new_path.reverse().join( DS );
            
            if (!path.length && !isAbsolute.length) 
            {
                path = ".";
            }

            if (path.length && trailingSlash == DS /*"/"*/) 
            {
                path += DS /*"/"*/;
            }

            return (isAbsolute == DS /*"/"*/ ? DS /*"/"*/ : "") + path;
        },
        
        isRelativePath : function(file) {
            
            if (
                startsWith(file, 'http://') || 
                startsWith(file, 'https://') ||
                startsWith(file, '/') ||
                startsWith(file, '\\')
            )
                return false;
            else if (
                startsWith(file, './') || 
                startsWith(file, '../') || 
                startsWith(file, '.\\') || 
                startsWith(file, '..\\') ||
                FILENAME.test(file)
            )
                return true;
                
            // unknown
            return false;
        },
        
        realPath : function(file)  {
            if ( this.realpath ) return this.joinPath(this.realpath, file); 
            else return file;
        },
        
        //
        // adapted from node-commander package
        // https://github.com/visionmedia/commander.js/
        //
        _parseArgs : function(args) {
            var 
                Flags = {}, Options = {},  Params = [],
                optionname = '',  argumentforoption = false,
                arg,   index,  i, len
            ;
            
            args = args || process.argv;
            // remove firt 2 args ('node' and 'this filename')
            args = args.slice(2);
            
            for (i = 0, len = args.length; i < len; ++i) 
            {
                arg = args[i];
                if (arg.length > 1 && '-' == arg[0] && '-' != arg[1]) 
                {
                    arg.slice(1).split('').forEach(function(c){
                        Flags[c] = true;
                    });
                    argumentforoption = false;
                }
                /*/^--/.test(arg)*/
                else if (startsWith(arg, '--'))
                {
                    index = arg.indexOf('=');
                    if (~index)
                    {
                        optionname = arg.slice(2, index);
                        Options[optionname] = arg.slice(index + 1);
                        argumentforoption = false;
                    }
                    else
                    {
                        optionname = arg.slice(2);
                        Options[optionname] = true;
                        argumentforoption = true;
                    }
                } 
                else 
                {
                    if (argumentforoption)
                    {
                        Options[optionname] = arg;
                    }
                    else
                    {
                        Params.push(arg);
                    }
                    argumentforoption = false;
                }
            }
            
            return {flags: Flags, options: Options, params: Params};
        },

        parseArgs : function()  {
            var args, parsedargs;
            
            parsedargs = this._parseArgs(process.argv);
            args = extend({
                'help' : false,
                'embed-images' : false,
                'embed-fonts' : false,
                'basepath' : false,
                'input' : false,
                'output' : false
                }, parsedargs.options);
            
            // if help is set, or no dependencis file, echo help message and exit
            if (parsedargs.flags['h'] || args['help'] || !args['input'] || !args['input'].length)
            {
                echo ("usage: "+THISFILE+" [-h] [--embed-images] [--embed-fonts] [--basepath=PATH] [--input=FILE] [--output=FILE]");
                echo ();
                echo ("Minify CSS Files");
                echo ();
                echo ("optional arguments:");
                echo ("  -h, --help              show this help message and exit");
                echo ("  --input=FILE            input file (REQUIRED)");
                echo ("  --output=FILE           output file (OPTIONAL)");
                echo ("  --embed-images          whether to embed images in the css (default false)");
                echo ("  --embed-fonts           whether to embed fonts in the css (default false)");
                echo ("  --basepath=PATH         file base path (OPTIONAL)");
                echo ();
                
                exit(1);
            }
            
            this.input = args['input'];
            this.output = (args['output']) ? args['output'] : false;
            if (args['basepath'])
            {
                this.realpath = args['basepath'];
            }
            else
            {
                // get real-dir of deps file
                this.realpath = dirname( realpath( args['input'] ) ).replace( /[/\\]+$/, "" ) + DS;
            }
            this.embedImages = (args['embed-images']) ? true : false;
            this.embedFonts = (args['embed-fonts']) ? true : false;
        },

        remove_comments : function(css) {
            // """Remove all CSS comment blocks."""
            
            var iemac = false;
            var preserve = false;
            var comment_start = css.indexOf ("/*" ), comment_end;
            while (comment_start>-1)
            {
                // Preserve comments that look like `/*!...*/`.
                // Slicing is used to make sure we don"t get an IndexError.
                preserve = (css[comment_start + 2] /*$comment_start + 3*/ == "!");
                
                comment_end = css.indexOf( "*/", comment_start + 2 );
                if (comment_end<0)
                {
                    if (!preserve)
                    {
                        css = css.substr( 0, comment_start );
                        break;
                    }
                }
                else if (comment_end >= (comment_start + 2))
                {
                    if (css[comment_end - 1] == "\\")
                    {
                        // This is an IE Mac-specific comment; leave this one and the
                        // following one alone.
                        comment_start = comment_end + 2;
                        iemac = true;
                    }
                    else if (iemac)
                    {
                        comment_start = comment_end + 2;
                        iemac = false;
                    }
                    else if (!preserve)
                    {
                        css = css.substr( 0, comment_start ) + css.substr( comment_end + 2 );
                    }
                    else
                    {
                        comment_start = comment_end + 2;
                    }
                }
                comment_start = css.indexOf( "/*", comment_start );
            }
            return css;
        },

        pseudoclasscolon : function(css) {
            
            /**
            """
            Prevents 'p :link' from becoming 'p:link'.
            
            Translates 'p :link' into 'p ___PSEUDOCLASSCOLON___link'; this is
            translated back again later.
            """
            **/
            
            var regex = /(^|\})(([^\{\:])+\:)+([^\{]*\{)/gm, match/*, matchstart, matchend*/, matches = [];
            while ( match = regex.exec(css) )  matches.push( match[0] )
            
            if (matches.length)
            {
                for (var i=0, l=matches.length; i<l; i++)
                {
                    /*css = [
                            css.substr( 0, matchstart ),
                            match[0].split( ":" ).join( "___PSEUDOCLASSCOLON___" ),
                            css.substr( matchend )
                        ].join( '' );*/
                    css = css.split( matches[i] ).join( matches[i].split( ":" ).join( "___PSEUDOCLASSCOLON___" ) );
                }
            }
            return css;
        },
            
        remove_unnecessary_whitespace : function(css)  {
            // """Remove unnecessary whitespace characters."""
            
            css = this.pseudoclasscolon( css );
            // Remove spaces from before things.
            css = css.replace(/\s+([!{};:>+\(\)\],])/gm, '$1');
            
            // If there is a `@charset`, then only allow one, and move to the beginning.
            css = css.replace(/^(.*)(@charset \"[^\"]*\";)/gm, '$2$1');
            css = css.replace(/^(\s*@charset [^;]+;\s*)+/gm, '$1');
            
            // Put the space back in for a few cases, such as `@media screen` and
            // `(-webkit-min-device-pixel-ratio:0)`.
            css = css.replace(/\band\(/gm, "and (");
            
            // Put the colons back.
            css = css.split( '___PSEUDOCLASSCOLON___' ).join( ':' );
            
            // Remove spaces from after things.
            css = css.replace(/([!{}:;>+\(\[,])\s+/gm, '$1');
            
            return css;
        },

        remove_unnecessary_semicolons : function(css) {
            // """Remove unnecessary semicolons."""
            
            return css.replace(/;+\}/gm, "}");
        },

        remove_empty_rules : function(css)  {
            // """Remove empty rules."""
            
            return css.replace(/[^\}\{]+\{\}/gm, '');
        },

        normalize_rgb_colors_to_hex : function(css) {
            // """Convert `rgb(51,102,153)` to `#336699`."""
            
            var regex = /rgb\s*\(\s*([0-9,\s]+)\s*\)/gm, match, matches = [], colors, hexcolor;
            while ( match = regex.exec(css) ) matches.push( match );
            
            if (matches.length)
            {
                for (var i=0, l=matches.length; i<l; i++)
                {
                    match = matches[i];
                    colors = array_map( function(s) { return s.replace(/^\s+/, '').replace(/\s+$/, ''); }, match[1].split(",") );
                    hexcolor = vsprintf( '#%.2x%.2x%.2x', array_map( function(s) { return parseInt(s, 10); }, colors ) );
                    css = css.split( match[0] ).join( hexcolor );
                }
            }
            return css;
        },

        condense_zero_units : function(css) {
            // """Replace `0(px, em, %, etc)` with `0`."""
            
            return css.replace(/([\s:])(0)(px|em|%|in|cm|mm|pc|pt|ex)/gm, '$1$2');
        },

        condense_multidimensional_zeros : function(css) {
            // """Replace `:0 0 0 0;`, `:0 0 0;` etc. with `:0;`."""
            
            css = css.split( ":0 0 0 0;" ).join( ":0;" );
            css = css.split( ":0 0 0;" ).join( ":0;" );
            css = css.split( ":0 0;" ).join( ":0;" );
            
            // Revert `background-position:0;` to the valid `background-position:0 0;`.
            css = css.split( "background-position:0;" ).join( "background-position:0 0;" );
            
            return css;
        },

        condense_floating_points : function(css) {
            // """Replace `0.6` with `.6` where possible."""
            
            return css.replace(/(:|\s)0+\.(\d+)/gm, '$1.$2');
        },

        condense_hex_colors : function(css) {
            // """Shorten colors from #AABBCC to #ABC where possible."""
            
            var regex = /([^\"'=\s])(\s*)#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/gm,
                match, matches = [], first, second
            ;
            while (match = regex.exec(css))
            {
                first = match[3] + match[5] + match[7];
                second = match[4] + match[6] + match[8];
                if (first.toLowerCase() == second.toLowerCase())
                {
                    matches.push([match, first, second]);
                }
            }
            for (var i=0, l=matches.length; i<l; i++)
            {
                match = matches[i][0]; first = matches[i][1]; second = matches[i][2];
                css = css.split( match[0] ).join( match[1] + match[2] + '#' + first );
            }
            return css;
        },

        condense_whitespace : function(css) {
            // """Condense multiple adjacent whitespace characters into one."""
            
            return css.replace(/\s+/gm, " ");
        },

        condense_semicolons : function(css) {
            // """Condense multiple adjacent semicolon characters into one."""
            
            return css.replace(/;;+/gm, ";");
        },

        wrap_css_lines : function(css, line_length) {
            // """Wrap the lines of the given CSS to an approximate length."""
            
            var lines = [];
            var line_start = 0;
            var str_len = css.length;
            for (var i=0; i<str_len; i++)
            {
                var _char = css[i];
                // It's safe to break after `}` characters.
                if (_char == '}' && (i - line_start >= line_length))
                {
                    lines.push( css.substr(line_start, i + 1) );
                    line_start = i + 1;
                }
            }
            if (line_start < str_len) lines.push( css.substr( line_start ) );
            
            return lines.join("\n");
        },
        
        extract_urls : function(css) {
            // handle (relative) image/font urls in CSS
            var regex = /\burl\s*\(([^\)]+?)\)/gm, urls = [], tmp = [], match;
            while ( match = regex.exec(css) ) tmp.push( match[1] );
            
            if (tmp.length)
            {
                for (var i=0, l=tmp.length; i<l; i++)
                {
                    match = tmp[i];
                    //echo(match);
                    match = match.replace(/^\s+/gm, '').replace(/\s+$/gm, '').replace(/^['"]/gm, '').replace(/['"]$/gm, '').replace(/^\s+/gm, '').replace(/\s+$/gm, '');
                    
                    if ( this.isRelativePath( match ) )
                        urls.push( match );
                }
            }
            return urls;
        },
        
        embed_images : function(css, urls) {
            var images = {'gif':true, 'png':true, 'jpg':true, 'jpeg':true},
                replace = {}, i, url, urlsLen = urls.length, extension, path, inline
            ;
            for (i=0; i<urlsLen; i++)
            {
                url = urls[i];
                if ( replace[url] ) continue;
                
                extension = url.split(".").pop().toLowerCase();
                
                if ( images[extension] )
                {
                    path = this.realPath(url);
                    // convert binary data to base64 encoding
                    inline = new Buffer(readFile( path ), 'binary').toString('base64');;
                    // gif
                    if ('gif'==extension)
                    {
                        inline = 'data:image/gif;base64,'+inline;
                    }
                    // png
                    else if ('png'==extension)
                    {
                        inline = 'data:image/png;base64,'+inline;
                    }
                    // jpg
                    else
                    {
                        inline = 'data:image/jpeg;base64,'+inline;
                    }
                    
                    css = css.split( url ).join( inline );
                    
                    replace[url] = true;
                }
            }
            return css;
        },

        embed_fonts : function(css, urls) {
            var fonts = {'svg':true, 'ttf':true, 'eot':true, 'woff':true},
                replace = {}, idpos, id, i, fonturl, url, urlsLen = urls.length, extension, path, inline
            ;
            for (i=0; i<urlsLen; i++)
            {
                url = urls[i];
                idpos = url.indexOf('#');
                id = (idpos>-1) ? url.substr(idpos) : '';
                fonturl = (idpos>-1) ? url.substr(0, idpos) : url;
                
                if ( replace[fonturl] ) continue;
                
                extension = fonturl.split(".").pop().toLowerCase();
                
                if ( fonts[extension] )
                {
                    path = this.realPath(fonturl);
                    // convert binary data to base64 encoding
                    inline = new Buffer(readFile( path ), 'binary').toString('base64');;
                    // svg
                    if ('svg'==extension)
                    {
                        inline = 'data:font/svg;charset=utf-8;base64,'+inline;
                    }
                    // ttf
                    else if ('ttf'==extension)
                    {
                        inline = 'data:font/ttf;charset=utf-8;base64,'+inline;
                    }
                    // eot
                    else if ('eot'==extension)
                    {
                        inline = 'data:font/eot;charset=utf-8;base64,'+inline;
                    }
                    // woff
                    else
                    {
                        inline = 'data:font/woff;charset=utf-8;base64,'+inline;
                    }
                    
                    css = css.split(url).join(inline);
                    
                    replace[fonturl] = true;
                }
            }
            return css;
        },

        minify : function(css, wrap)  {
            wrap = wrap || null;
            
            css = this.remove_comments( css );
            css = this.condense_whitespace( css );
            // A pseudo class for the Box Model Hack
            // (see http://tantek.com/CSS/Examples/boxmodelhack.html)
            css = css.split( '"\\"}\\""' ).join( "___PSEUDOCLASSBMH___" );
            css = this.remove_unnecessary_whitespace( css );
            css = this.remove_unnecessary_semicolons( css );
            css = this.condense_zero_units( css );
            css = this.condense_multidimensional_zeros( css );
            css = this.condense_floating_points( css );
            css = this.normalize_rgb_colors_to_hex( css );
            css = this.condense_hex_colors( css );
            
            if (null!==wrap) 
                css = this.wrap_css_lines(css, wrap);
            
            css = css.split( "___PSEUDOCLASSBMH___" ).join( '"\\"}\\""' );
            css = this.condense_semicolons( css ).replace(/^\s+/gm, '').replace(/\s+$/gm, '');
            
            var urls;
            if (this.embedImages || this.embedFonts)
                urls = this.extract_urls( css );
            if (this.embedImages)
                css = this.embed_images(css, urls);
            if (this.embedFonts)
                css = this.embed_fonts(css, urls);
            
            return css;
        }
    };
    
    // static
    CSSMin.Main = function() {
        var cssmin = new CSSMin();
        cssmin.parseArgs();
        
        if (cssmin.input)
        {
            var text = cssmin.read( cssmin.input );
            var mintext = cssmin.minify( text );
            if (cssmin.output) cssmin.write(cssmin.output, mintext);
            else echo(mintext);
        }
    };

    // export it
    if ('undefined' != typeof (module) && module.exports)  module.exports = CSSMin;
    
    else if ('undefined' != typeof (exports)) exports = CSSMin;
    
    else this.CSSMin = CSSMin;
    
    return CSSMin;
    
}).call(this);

// if called from command-line
if ( require.main === module ) 
{
    // run it
    CSSMin.Main();
}