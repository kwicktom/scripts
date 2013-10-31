#!/usr/bin/env php
<?php
/*
# CSSmin.py for Notepad++ Python Scripting plugin
# https://github.com/ethanpil/npp-cssmin
# This is a simple script that contains a Python port of the YUI CSS Compressor so you can minify both CSS and JS
#
##Credits
#  Original cssmin.py ported from YUI here https://github.com/zacharyvoase/cssmin 
###

##
#  Modified version of npp-cssmin adapted for PHP 5.2+
#  v. 0.2
#  @Nikos M.
###
*/
error_reporting(E_ALL);

if (!class_exists('CSSMin'))
{

if (!function_exists('__echo'))
{
    function __echo($s="") { echo $s . PHP_EOL; }
}
if (!function_exists('__startsWith'))
{
    // simulate python's "startswith" string method
    function __startsWith($s, $prefix) { return (0===strpos($s, $prefix)); }
}

class CSSMin
{
    protected $enc = false;
    public $input = false;
    public $output = false;
    public $realpath = null;
    public $inlineImages = false;
    public $inlineFonts = false;
    
    public function __construct() 
    { 
        $this->enc = false; 
        $this->input = false; 
        $this->output = false; 
        $this->inlineImages = false; 
        $this->inlineFonts = false; 
        $this->realpath = null; 
    }
   
    public function CSSMin() { $this->__construct();  }
   
    public function read($file) { return file_get_contents($file); }

    public function write($file, $text) { return file_put_contents($file, $text); }

    // https://github.com/JosephMoniz/php-path
    protected function joinPath() 
    {
        $args = func_get_args();
        $argslen = count($args);
        $DS = DIRECTORY_SEPARATOR;
        
        if (!$argslen)  return ".";
        
        $path = implode($DS, $args);
        $plen = strlen($path);
        
        if (!$plen) return ".";
        
        $isAbsolute    = $path[0];
        $trailingSlash = $path[$plen - 1];

        $peices = array_values( array_filter( preg_split('#/|\\\#', $path), 'strlen' ) );
        
        $new_path = array();
        $up = 0;
        $i = count($peices)-1;
        while ($i>=0)
        {
            $last = $peices[$i];
            if ($last == "..") 
            {
                $up++;
            } 
            elseif ($last != ".")
            {
                if ($up)  $up--;
                else  array_push($new_path, $peices[$i]);
            }
            $i--;
        }
        
        $path = implode($DS, array_reverse($new_path));
        
        if (!$path && !$isAbsolute) 
        {
            $path = ".";
        }

        if ($path && $trailingSlash == $DS /*"/"*/) 
        {
            $path .= $DS /*"/"*/;
        }

        return ($isAbsolute == $DS /*"/"*/ ? $DS /*"/"*/ : "") . $path;
    }
    
    protected function isRelativePath($file)
    {
        
        if (
            __startsWith($file, 'http://') || 
            __startsWith($file, 'https://') ||
            __startsWith($file, '/') ||
            __startsWith($file, '\\')
        )
            return false;
        elseif (
            __startsWith($file, './') || 
            __startsWith($file, '../') || 
            __startsWith($file, '.\\') || 
            __startsWith($file, '..\\') ||
            preg_match('/[a-z0-9_]/i', $file[0])
        )
            return true;
            
        // unknown
        return false;
    }
    
    protected function realPath($file)
    {
        
        if ( $this->realpath ) 
            return $this->joinPath($this->realpath, $file); 
        else return $file;
    }
    
    /**
     * parseArgs Command Line Interface (CLI) utility function.
     * @author              Patrick Fisher <patrick@pwfisher.com>
     * @see                 https://github.com/pwfisher/CommandLine.php
     */
    protected function _parseArgs($argv = null) 
    {
        $argv = $argv ? $argv : $_SERVER['argv']; array_shift($argv); $o = array();
        for ($i = 0, $j = count($argv); $i < $j; $i++) 
        { 
            $a = $argv[$i];
            if (substr($a, 0, 2) == '--') 
            { 
                $eq = strpos($a, '=');
                if ($eq !== false) {  $o[substr($a, 2, $eq - 2)] = substr($a, $eq + 1); }
                else 
                { 
                    $k = substr($a, 2);
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; }
                    else if (!isset($o[$k])) { $o[$k] = true; } 
                } 
            }
            else if (substr($a, 0, 1) == '-') 
            {
                if (substr($a, 2, 1) == '=') { $o[substr($a, 1, 1)] = substr($a, 3); }
                else 
                {
                    foreach (str_split(substr($a, 1)) as $k) { if (!isset($o[$k])) { $o[$k] = true; } }
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; } 
                } 
            }
            else { $o[] = $a; } }
        return $o;
    }
    
    public function parseArgs()
    {
        $defaultArgs=array(
            'h' => false,
            'help' => false,
            'inline-images' => false,
            'inline-fonts' => false,
            'realpath' => null,
            'input' => false,
            'output' => false
        );
        $args = $this->_parseArgs();
        $args = array_intersect_key($args, $defaultArgs);
        $args = array_merge($defaultArgs, $args);
        
        if (
            ($args['h'] || $args['help']) ||
            (!isset($args['input']) || !$args['input'] || !is_string($args['input']) || 0==strlen($args['input']))
        )
        {
            // If no dependencies have been passed or help is set, show the help message and exit
            $p=pathinfo(__FILE__);
            $thisFile=(isset($p['extension'])) ? $p['filename'].'.'.$p['extension'] : $p['filename'];
            
            __echo ("usage: $thisFile [-h] [--inline] [--input=FILE] [--output=FILE]");
            __echo ();
            __echo ("Minify CSS Files");
            __echo ();
            __echo ("optional arguments:");
            __echo ("  -h, --help              show this help message and exit");
            __echo ("  --input=FILE            input file (REQUIRED)");
            __echo ("  --output=FILE           output file (OPTIONAL)");
            __echo ("  --inline-images         whether to inline images in the css (default false)");
            __echo ("  --inline-fonts          whether to inline fonts in the css (default false)");
            __echo ();
            
            exit(1);
        }
        
        $this->input = $args['input'];
        $this->output = (isset($args['output'])) ? $args['output'] : false;
        $this->realpath = null;
        $this->inlineImages = (isset($args['inline-images']) && $args['inline-images']) ? true : false;
        $this->inlineFonts = (isset($args['inline-fonts']) && $args['inline-fonts']) ? true : false;
    }
    
    public function remove_comments($css)
    {
        // """Remove all CSS comment blocks."""
        
        $iemac = false;
        $preserve = false;
        $comment_start = strpos($css, "/*");
        while (false!==$comment_start)
        {
            // Preserve comments that look like `/*!...*/`.
            // Slicing is used to make sure we don"t get an IndexError.
            $preserve = (bool)($css[$comment_start + 2] /*$comment_start + 3*/ == "!");
            
            $comment_end = strpos($css, "*/", $comment_start + 2);
            if (false===$comment_end)
            {
                if (!$preserve)
                {
                    $css = substr($css, 0, $comment_start);
                    break;
                }
            }
            elseif ($comment_end >= ($comment_start + 2))
            {
                if ($css[$comment_end - 1] == "\\")
                {
                    // This is an IE Mac-specific comment; leave this one and the
                    // following one alone.
                    $comment_start = $comment_end + 2;
                    $iemac = true;
                }
                elseif ($iemac)
                {
                    $comment_start = $comment_end + 2;
                    $iemac = false;
                }
                elseif (!$preserve)
                {
                    $css = substr($css, 0, $comment_start) . substr($css, $comment_end + 2);
                }
                else
                {
                    $comment_start = $comment_end + 2;
                }
            }
            $comment_start = strpos($css, "/*", $comment_start);
        }
        return $css;
    }


    protected function pseudoclasscolon($css)
    {
        
        /**
        """
        Prevents 'p :link' from becoming 'p:link'.
        
        Translates 'p :link' into 'p ___PSEUDOCLASSCOLON___link'; this is
        translated back again later.
        """
        **/
        
        $regex = "/(^|\})(([^\{\:])+\:)+([^\{]*\{)/";
        while (preg_match($regex, $css, $match, PREG_OFFSET_CAPTURE))
        {
            $matchstart = $match[0][1]; //strpos($match[1], $css);
            $matchend = $matchstart+strlen($match[0][0]);
            $css = implode('', array(
                    substr($css, 0, $matchstart),
                    str_replace(":", "___PSEUDOCLASSCOLON___", $match[0][0]),
                    substr($css, $matchend)
                ));
            //$match = regex.search($css);
        }
        return $css;
    }
        
    public function remove_unnecessary_whitespace($css)
    {
        // """Remove unnecessary whitespace characters."""
        
        $css = $this->pseudoclasscolon($css);
        // Remove spaces from before things.
        $css = preg_replace("/\s+([!{};:>+\(\)\],])/", '$1', $css);
        
        // If there is a `@charset`, then only allow one, and move to the beginning.
        $css = preg_replace("/^(.*)(@charset \"[^\"]*\";)/", '$2$1', $css);
        $css = preg_replace("/^(\s*@charset [^;]+;\s*)+/", '$1', $css);
        
        // Put the space back in for a few cases, such as `@media screen` and
        // `(-webkit-min-device-pixel-ratio:0)`.
        $css = preg_replace("/\band\(/", "and (", $css);
        
        // Put the colons back.
        $css = str_replace('___PSEUDOCLASSCOLON___', ':', $css);
        
        // Remove spaces from after things.
        $css = preg_replace("/([!{}:;>+\(\[,])\s+/", '$1', $css);
        
        return $css;
    }


    public function remove_unnecessary_semicolons($css)
    {
        // """Remove unnecessary semicolons."""
        
        return preg_replace("/;+\}/", "}", $css);
    }

    public function remove_empty_rules($css)
    {
        // """Remove empty rules."""
        
        return preg_replace("/[^\}\{]+\{\}/", "", $css);
    }


    /*protected function lambda($s, $m)
    {
        return array_merge(array(trim($s)), explode(",", $m));
    }*/
    
    public function normalize_rgb_colors_to_hex($css)
    {
        // """Convert `rgb(51,102,153)` to `#336699`."""
        
        $regex = "/rgb\s*\(\s*([0-9,\s]+)\s*\)/";
        while (preg_match($regex, $css, $match, PREG_OFFSET_CAPTURE))
        {
            $colors = array_map("trim", explode(",", $match[1][0]));
            $hexcolor = vsprintf('#%.2x%.2x%.2x', array_map("intval", $colors));
            $css = str_replace($match[0][0], $hexcolor, $css);
        }
        return $css;
    }


    public function condense_zero_units($css)
    {
        // """Replace `0(px, em, %, etc)` with `0`."""
        
        return preg_replace("/([\s:])(0)(px|em|%|in|cm|mm|pc|pt|ex)/", '$1$2', $css);
    }


    public function condense_multidimensional_zeros($css)
    {
        // """Replace `:0 0 0 0;`, `:0 0 0;` etc. with `:0;`."""
        
        $css = str_replace(":0 0 0 0;", ":0;", $css);
        $css = str_replace(":0 0 0;", ":0;", $css);
        $css = str_replace(":0 0;", ":0;", $css);
        
        // Revert `background-position:0;` to the valid `background-position:0 0;`.
        $css = str_replace("background-position:0;", "background-position:0 0;", $css);
        
        return $css;
    }


    public function condense_floating_points($css)
    {
        // """Replace `0.6` with `.6` where possible."""
        
        return preg_replace("/(:|\s)0+\.(\d+)/", '$1.$2', $css);
    }


    public function condense_hex_colors($css)
    {
        // """Shorten colors from #AABBCC to #ABC where possible."""
        
        $regex = "/([^\"'=\s])(\s*)#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/";
        $offset=0;
        while (preg_match($regex, $css, $match, PREG_OFFSET_CAPTURE, $offset))
        {
            $first = $match[3][0] . $match[5][0] . $match[7][0];
            $second = $match[4][0] . $match[6][0] . $match[8][0];
            if (strtolower($first) == strtolower($second))
            {
                $css = str_replace($match[0][0], $match[1][0] . $match[2][0] . '#' . $first, $css);
                $offset = $match[0][1] + strlen($match[0][0]) -3;
            }
            else
            {
                $offset = $match[0][1] + strlen($match[0][0]);
            }
        }
        return $css;
    }


    public function condense_whitespace($css)
    {
        // """Condense multiple adjacent whitespace characters into one."""
        
        return preg_replace("/\s+/", " ", $css);
    }


    public function condense_semicolons($css)
    {
        // """Condense multiple adjacent semicolon characters into one."""
        
        return preg_replace("/;;+/", ";", $css);
    }


    public function wrap_css_lines($css, $line_length)
    {
        // """Wrap the lines of the given CSS to an approximate length."""
        
        $lines = array();
        $line_start = 0;
        $str_len=strlen($css);
        for ($i=0; $i<$str_len; $i++)
        {
            $char=$css[$i];
            // It's safe to break after `}` characters.
            if ($char == '}' && ($i - $line_start >= $line_length))
            {
                array_push($lines, substr($css, $line_start, $i + 1));
                $line_start = $i + 1;
            }
        }
        if ($line_start < $str_len) array_push($lines, substr($css, $line_start));
        
        return implode("\n", $lines);
    }
    
    public function doInlineImages($css)
    {
        // handle (relative) urls in CSS
        /*if (preg_match_all('#url\s*\(([^\)]+?)\)#', $css, $m))
        {
            $images = array('gif', 'png', 'jpg', 'jpeg');
            $matches = $m[1];
            unset($m);
            foreach ($matches as $match)
            {
                $url = trim( trim( trim( $match ), '"' ), "'" );
                $extension = strtolower(end(explode(".", $url)));
                
                if (in_array($extension, $images))
                {
                    //$path = $this->realPath($url);
                    //$css = str_replace($url, $pah, $css);
                    $pre = "";
                    if ($this->isRelativePath($url))  $pre = "Relative: ";
                    $css = $pre . $url ."\n" . $css;
                }
            }
        }*/
        return $css;
    }

    public function doInlineFonts($css)
    {
        return $css;
    }

    public function minify($css, $wrap=null)
    {
        $css = $this->remove_comments($css);
        $css = $this->condense_whitespace($css);
        // A pseudo class for the Box Model Hack
        // (see http://tantek.com/CSS/Examples/boxmodelhack.html)
        $css = str_replace('"\\"}\\""', "___PSEUDOCLASSBMH___", $css);
        $css = $this->remove_unnecessary_whitespace($css);
        $css = $this->remove_unnecessary_semicolons($css);
        $css = $this->condense_zero_units($css);
        $css = $this->condense_multidimensional_zeros($css);
        $css = $this->condense_floating_points($css);
        $css = $this->normalize_rgb_colors_to_hex($css);
        $css = $this->condense_hex_colors($css);
        
        if (null!==$wrap) 
            $css = $this->wrap_css_lines($css, $wrap);
        
        $css = str_replace("___PSEUDOCLASSBMH___", '"\\"}\\""', $css);
        $css = trim($this->condense_semicolons($css));
        
        if ($this->inlineImages)
            $css = $this->doInlineImages($css);
        if ($this->inlineFonts)
            $css = $this->doInlineFonts($css);
        
        return $css;
    }
    
    public static function Main()
    {
        $cssmin = new CSSMin();
        $cssmin->parseArgs();
        
        __echo("Input: " . strval($cssmin->input));
        __echo("Output: " . strval($cssmin->output));
        __echo("Inline Images: " . strval($cssmin->inlineImages));
        __echo("Inline Fonts: " . strval($cssmin->inlineFonts));
        //exit(0);
        
        if ($cssmin->input)
        {
            $text = $cssmin->read($cssmin->input);
            $mintext = $cssmin->minify($text);
            if ($cssmin->output) $cssmin->write($cssmin->output, $mintext);
            else echo $mintext;
        }
    }
}
}
// if called directly from command-line
if (
    (php_sapi_name() === 'cli') &&
    (__FILE__ == realpath($_SERVER['SCRIPT_FILENAME']))
)
{
    CSSMin::Main();
    exit(0);
}