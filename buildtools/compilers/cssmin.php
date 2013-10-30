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
#  v. 0.1
#  @Nikos M.
###
*/
error_reporting(E_ALL);

if (!class_exists('CSSMin'))
{
class CSSMin
{
    protected $enc=false;
    
    public function __construct() { $this->enc = false; }
   
    public function CSSMin() { $this->__construct();  }
   
    public function read($file) { return file_get_contents($file); }

    public function write($file, $text) { return file_put_contents($file, $text); }

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
            //colors = map(lambda s: s.strip(), match.group(1).split(","))
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
        if (null!==$wrap) $css = $this->wrap_css_lines($css, $wrap);
        $css = str_replace("___PSEUDOCLASSBMH___", '"\\"}\\""', $css);
        $css = $this->condense_semicolons($css);
        return trim($css);
    }
}
}
// if called directly from command-line
if (
    (php_sapi_name() === 'cli') &&
    (__FILE__ == realpath($_SERVER['SCRIPT_FILENAME']))
)
{
    $argv=$_SERVER['argv'];
    if (isset($argv[1]))
    {
        $cssmin = new CSSMin();
        $text = $cssmin->read($argv[1]);
        $mintext = $cssmin->minify($text);
        if (isset($argv[2])) $cssmin->write($argv[2], $mintext);
        else echo $mintext;
    }
    exit(0);
}