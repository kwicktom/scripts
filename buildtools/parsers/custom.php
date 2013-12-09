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
    const MAP_ = 1;
    const LIST_ = 2; 
    const VAL_ = 0;
    
    protected static $NL = '/\\n\\r|\\r\\n|\\r|\\n/'; 
    protected static $BLOCK = '/^@(([a-zA-Z0-9\\-_]+)\\s*(=\\[\\]|=\\{\\}|=)?)/';
    protected static $ENDBLOCK = '/^(@\\s*)+/';
    
    protected static function removeComment($s, $comm) 
    {
        $p = explode($comm, $s);
        return trim( $p[0] );
    }
    
    protected static function parseStr($s, $q)
    {
        $endq = strpos($s, $q, 1);
        $quoted = substr($s, 1, $endq-1);
        $rem = trim(substr($s, $endq));
        
        return array($quoted, $rem);
    }
    
    protected static function startsWith($s, $prefix) 
    { 
        return ($s && ($prefix==substr($s, 0, strlen($prefix)))); 
    }

    protected static function getQuotedValue( $line )
    {
        $linestartswith = substr($line, 0, 1);
        
        // quoted string
        if ( '"'==$linestartswith || "'"==$linestartswith || "`"==$linestartswith )
        {
            list($key, $line) = self::parseStr($line, $linestartswith);
            return $key;
        }
        // un-quoted string
        else
        {
            return trim( $line );
        }
    }
    
    protected static function getKeyValuePair( $line )
    {
        $linestartswith = substr($line, 0, 1);
        
        // quoted string
        if ( '"'==$linestartswith || "'"==$linestartswith || "`"==$linestartswith )
        {
            list($key, $line) = self::parseStr($line, $linestartswith);
            
            // key-value pair
            if ( false!==strpos($line, '=', 0) )
            {
                $values = explode('=', $line, 2);
                $value = (isset($values[1])) ? $values[1] : null;
                
                if ( $value && self::startsWith($value, "[]"))
                {
                    return array($key, array(), self::LIST_);
                }
                elseif ( $value && self::startsWith($value, "{}"))
                {
                    return array($key, array(), self::MAP_);
                }
                
                if ( $value )
                {
                    $value = trim($value);
                    $valuestartswith = $value[0];
                    
                    // quoted value
                    if ('"'==$valuestartswith || "'"==$valuestartswith || "`"==$valuestartswith)
                        list($value, $rem) = self::parseStr($value, $valuestartswith);
                }
                return array($key, $value, self::VAL_);
            }
        }
        // un-quoted string
        else
        {
            $pair = array_map('trim', explode('=', $line, 2));
            
            $key = $pair[0];
            $value = (isset($pair[1])) ? $pair[1] : null;
            
            if ( $value && self::startsWith($value, "[]"))
            {
                return array($key, array(), self::LIST_);
            }
            elseif ( $value && self::startsWith($value, "{}"))
            {
                return array($key, array(), self::MAP_);
            }
            
            if ( $value )
            {
                $valuestartswith = $value[0];
                
                // quoted value
                if ('"'==$valuestartswith || "'"==$valuestartswith || "`"==$valuestartswith)
                    list($value, $rem) = self::parseStr($value, $valuestartswith);
            }
            
            return array($key, $value, self::VAL_);
        }
    }
    
    public static function fromString($s)
    {
        // settings buffers
        $settings = array( );
        
        $currentBuffer =& $settings;
        $currentPath = array();
        $currentBlock = null;
        $isType = self::VAL_;
        
        // parse the lines
        $lines = preg_split(self::$NL, $s);
        $lenlines = count($lines);
        
        // parse it line-by-line
        for ($i=0; $i<$lenlines; $i++)
        {
            // strip the line of comments and extra spaces
            $line = self::removeComment( $lines[$i], "#" );
            
            // comment or empty line, skip it
            if ( !strlen($line) )  continue;
            
            $linestartswith = substr($line, 0, 1);
            
            // block/directive line, parse it
            if ( '@'==$linestartswith )
            {
                $matchblock = preg_match( self::$BLOCK, $line, $block );
                $matchendblock = preg_match( self::$ENDBLOCK, $line, $endblock );
                
                if ( $matchblock )
                {
                    $currentBlock = $block[2];
                    if ( !isset($block[3]) || !$block[3] || '='==$block[3] ) $isType = self::VAL_;
                    else if ( '=[]'==$block[3] ) $isType = self::LIST_;
                    else if ( '={}'==$block[3] ) $isType = self::MAP_;
                    
                    $currentPath[] = array($currentBlock, $isType);
                    $currLen = count($currentPath);
                    
                    if ( $currLen>1 )
                    {
                        $currentBuffer =& $settings;
                        for ($j=0; $j<$currLen-1; $j++)
                        {
                            $currentBuffer =& $currentBuffer[ $currentPath[$j][0] ];
                        }
                    }
                    if ( !isset($currentBuffer[ $currentBlock ]) )
                    {
                        if (self::LIST_ == $isType || self::MAP_ == $isType)
                            $currentBuffer[ $currentBlock ] = array();
                        else
                            $currentBuffer[ $currentBlock ] = '';
                    }
                }
                
                else if ( $matchendblock )
                {
                    $numEnds = count(explode("@", $line))-1;
                    
                    for ($j=0; $j<$numEnds; $j++)
                        array_pop( $currentPath );
                    
                    $currentBuffer =& $settings;
                    $currLen = count( $currentPath );
                    if ( $currLen > 0 )
                    {
                        if ( $currLen > 1 )
                        {
                            for ($j=0; $j<$currLen-1; $j++)
                            {
                                $currentBuffer =& $currentBuffer[ $currentPath[$j][0] ];
                            }
                        }
                        $currentBlock = $currentPath[ $currLen-1 ][0];
                        $isType = $currentPath[ $currLen-1 ][1];
                    }
                    else
                    {
                        $currentBlock = null;
                        $isType = self::VAL_;
                    }
                }
                
                continue;
            }
            
            // if any settings need to be stored, store them in the appropriate buffer
            if ( $currentBlock && $currentBuffer )  
            {
                if ( self::MAP_ == $isType )
                {
                    $keyval = self::getKeyValuePair( $line );
                    
                    $currentBuffer[ $currentBlock ][ $keyval[0] ] = $keyval[1];
                    
                    if ( self::LIST_ == $keyval[2] || self::MAP_ == $keyval[2] )
                    {
                        $currentPath[] = array($keyval[0], $keyval[2]);
                        $currentBuffer =& $currentBuffer[ $currentBlock ];
                        $currentBlock = $keyval[0];
                        $isType = $keyval[2];
                    }
                }
                else if ( self::LIST_ == $isType )
                {
                    $currentBuffer[ $currentBlock ][] = self::getQuotedValue( $line );
                }
                else //if ( VAL == isType )
                {
                    $currentBuffer[ $currentBlock ] = self::getQuotedValue( $line );
                    $currentBlock  = null;
                    $isType = self::VAL_;
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