<?php
/**
*
*   Simple JSON Parser for PHP 5.2+
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
if (!class_exists('JsonParser'))
{
class JsonParser
{
    protected static function parseNull($s)
    {
        return null;
    }
    
    protected static function parseBoolean($s)
    {
        return null;
    }
    
    protected static function parseNumber($s)
    {
        return null;
    }
    
    protected static function parseString($s)
    {
        return null;
    }
    
    protected static function parseArray($s)
    {
        return null;
    }
    
    protected static function parseObject($s)
    {
        return null;
    }
    
    public static function fromString($s)
    {
        return null;
    }
    
    public static function fromFile($filename)
    {
        return self::fromString( file_get_contents($filename) );
    }
    
    public static function toString($o)
    {
        return '';
    }
    
    public static function toFile($filename, $o)
    {
        return file_put_contents( $filename, self::toString($o) );
    }
}
}