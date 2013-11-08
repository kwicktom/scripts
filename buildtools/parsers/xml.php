<?php
/**
*
*   Simple .xml Parser for PHP 5.2+ (uses simplexml extension)
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
if (!class_exists('XmlParser'))
{
class XmlParser
{
    protected static function toArray($element) 
    {
        if (!empty($element) && is_object($element)) 
        {
            $element = (array) $element;
        }
        if (empty($element)) 
        {
            $element = '';
        } 
        if (is_array($element)) 
        {
            foreach ($element as $k => $v) 
            {
                if (empty($v)) 
                {
                    $element[$k] = '';
                    continue;
                }
                $add = self::toArray($v);
                if (!empty($add)) 
                {
                    $element[$k] = $add;
                } 
                else 
                {
                    $element[$k] = '';
                }
            }
        }

        if (empty($element)) 
        {
            $element = '';
        }

        return $element;
    }
    
    public static function fromString($s, $asArray=true)
    {
        if (!function_exists('simplexml_load_string')) 
        {
            throw new Exception('The Simple XML library is missing.');
        }
        
        $xml = simplexml_load_string($s);
        
        if (!$xml) 
        {
            throw new Exception('The XML failed to read string.');
        }
        
        if ($asArray)
            return self::toArray($xml);
        return $xml;
    }
    
    public static function fromFile($filename, $asArray=true)
    {
        return self::fromString( file_get_contents($filename), $asArray );
    }
    
    public static function toString($o)
    {
        throw new Exception('Not supported!');
    }
    
    public static function toFile($filename, $o)
    {
        throw new Exception('Not supported!');
        //file_put_contents( self::toString($o) );
    }
}
}