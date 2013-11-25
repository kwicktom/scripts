<?php
/**
*
*   Custom Parser for PHP 5.2+
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
if (!class_exists('CustomParser'))
{
class CustomParser
{
    protected static function _parseStr($s, $q)
    {
        $endq = strpos($s, $q, 1);
        $sq = substr($s, 1, $endq-1);
        $r = trim(substr($s, $endq));
        
        return array($sq, $r);
    }
    
    public static function fromString($s)
    {
        // settings buffers
        $settings = array( );
        $currentBuffer = null;
        $prevTag = null;
        
        // parse the lines
        $lines = preg_split("/\\n\\r|\\r\\n|\\r|\\n/", $s);
        $lenlines = count($lines);
        
        // parse it line-by-line
        for ($i=0; $i<$lenlines; $i++)
        {
            // strip the line of extra spaces
            $line = trim($lines[$i]);
            $linestartswith = substr($line, 0, 1);
            
            // comment or empty line, skip it
            if ('#'==$linestartswith || ''==$line) continue;
            
            // directive line, parse it
            if ('@'==$linestartswith)
            {
                if (__startsWith($line, '@DEPENDENCIES')) // list of input dependencies files option
                {
                    if (!isset($settings['@DEPENDENCIES']))
                        $settings['@DEPENDENCIES'] = array();
                    $currentBuffer = array('@DEPENDENCIES');
                    $prevTag = '@DEPENDENCIES';
                    continue;
                }
                elseif (__startsWith($line, '@REPLACE')) // list of replacements
                {
                    if (!isset($settings['@REPLACE']))
                        $settings['@REPLACE'] = array();
                    $currentBuffer = array('@REPLACE');
                    $prevTag = '@REPLACE';
                    continue;
                }
                elseif (__startsWith($line, '@MINIFY')) // enable minification (default is UglifyJS Compiler)
                {
                    if (!isset($settings['@MINIFY']))
                        $settings['@MINIFY'] = array();
                    $currentBuffer = null;
                    $prevTag = '@MINIFY';
                    continue;
                }
                /*
                elseif (__startsWith($line, '@PREPROCESS')) // allow preprocess options (todo)
                {
                    currentBuffer = null;
                    $prevTag = '@PREPROCESS';
                    continue;
                }
                elseif (__startsWith($line, '@POSTPROCESS')) // allow postprocess options (todo)
                {
                    currentBuffer = null;
                    $prevTag = '@POSTPROCESS';
                    continue;
                }
                */
                elseif (__startsWith($line, '@OUT')) // output file option
                {
                    if (!isset($settings['@OUT']))
                        $settings['@OUT'] = array();
                    $currentBuffer = array('@OUT');
                    $prevTag = '@OUT';
                    continue;
                }
                else 
                {
                    // reference
                    $currentBuffer = null;
                    
                    if ('@MINIFY'==$prevTag)
                    {
                        if (__startsWith($line, '@UGLIFY')) // Node UglifyJS Compiler options (default)
                        {
                            if (!isset($settings['@MINIFY']['@UGLIFY']))
                                $settings['@MINIFY']['@UGLIFY'] = array();
                            $currentBuffer = array('@MINIFY', '@UGLIFY');
                            continue;
                        }
                        elseif (__startsWith($line, '@CLOSURE')) // Java Closure Compiler options
                        {
                            if (!isset($settings['@MINIFY']['@CLOSURE']))
                                $settings['@MINIFY']['@CLOSURE'] = array();
                            $currentBuffer = array('@MINIFY', '@CLOSURE');
                            continue;
                        }
                        elseif (__startsWith($line, '@YUI')) // YUI Compressor Compiler options
                        {
                            if (!isset($settings['@MINIFY']['@YUI']))
                                $settings['@MINIFY']['@YUI'] = array();
                            $currentBuffer = array('@MINIFY', '@YUI');
                            continue;
                        }
                        elseif (__startsWith($line, '@CSSMIN')) // CSS Minifier
                        {
                            if (!isset($settings['@MINIFY']['@CSSMIN']))
                                $settings['@MINIFY']['@CSSMIN'] = array();
                            $currentBuffer = array('@MINIFY', '@CSSMIN');
                            continue;
                        }
                    }
                    
                    // unknown option or dummy separator option
                    $prevTag = null;
                    continue;
                }
            }
            // if any settings need to be stored, store them in the appropriate buffer
            if ($currentBuffer)  
            {
                $tmp = array_values($currentBuffer);
                $currentBuffer2 =& $settings;
                foreach ($tmp as $k)
                {
                    $currentBuffer2 =& $currentBuffer2[$k];
                }
                
                //print_r($settings);
                //print_r($currentBuffer2);
                
                if ('@REPLACE'==$prevTag)
                {
                    // quoted string
                    if ('"'==$linestartswith || "'"==$linestartswith)
                    {
                        list($key, $line) = self::_parseStr($line, $linestartswith);
                        
                        // key-value pair
                        if (false!==strpos($line, '=', 0))
                        {
                            $values = explode('=', $line, 2);
                            $value = trim($values[1]);
                            $valuestartswith = $value[0];
                            
                            // quoted value
                            if ('"'==$valuestartswith || "'"==$valuestartswith)
                                list($value, $rem) = self::_parseStr($value, $valuestartswith);
                            
                            $currentBuffer2[$key] = $value;
                        }
                    }
                    // un-quoted string
                    else
                    {
                        $pair = array_map('trim', explode('=', $line, 2));
                        
                        $key = $pair[0];
                        $value = $pair[1];
                        $valuestartswith = $value[0];
                        
                        // quoted value
                        if ('"'==$valuestartswith || "'"==$valuestartswith)
                            list($value, $rem) = self::_parseStr($value, $valuestartswith);
                        
                        $currentBuffer2[$key] = $value;
                    }
                }
                else
                {
                    $currentBuffer2[] = $line;
                }
            }
        }
        return $settings;
    }
    
    public static function fromFile($filename)
    {
        return self::fromString( file_get_contents($filename) );
    }
}
}