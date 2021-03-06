<?php
/**
*
*   Simple .ini Parser for PHP 5.2+
*
*   @author Nikos M.  
*   https://foo123.github.com/
*   http://nikos-web-development.netai.net/
*
**/
if (!class_exists('IniParser'))
{
class IniParser
{
    protected static function _parseStr($s, $q)
    {
        $endq = strpos($s, $q, 1);
        $sq = substr($s, 1, $endq-1);
        $r = trim(substr($s, $endq));
        
        return array($sq, $r);
    }
    
    public static function fromString($s, $keysList=true, $rootSection='_')
    {
        $comments = array(';', '#');
        
        $sections = array( );
        $currentSection = (!empty($rootSection)) ? strval($rootSection) : '_';
        if ($keysList)
            $sections[$currentSection] = array( '__list__' => array() );
        else
            $sections[$currentSection] = array(  );
        $currentRoot =& $sections;
        
        // parse the lines
        $lines = preg_split("/\\n\\r|\\r\\n|\\r|\\n/", $s);
        $lenlines = count($lines);
        
        
        // parse it line-by-line
        for ($i=0; $i<$lenlines; $i++)
        {
            // strip the line of extra spaces
            $line = trim($lines[$i]);
            
            // comment or empty line, skip it
            if ( empty($line) || in_array($line[0], $comments) ) continue;
            
            $linestartswith = $line[0];
            
            // (sub-)section(s)
            if ('['==$linestartswith)
            {
                $SECTION = true;
                
                // parse any sub-sections
                while ('['==$linestartswith)
                {
                    if ($SECTION)
                        $currentRoot =& $sections;
                    else
                        $currentRoot =& $currentRoot[$currentSection];
                    
                    $SECTION = false;
                    
                    $endsection = strpos($line, ']', 1);
                    $currentSection = substr($line, 1, $endsection-1);
                    
                    if (!isset($currentRoot[$currentSection]))
                    {
                        if ($keysList)
                            $currentRoot[$currentSection] = array( '__list__' => array() );
                        else
                            $currentRoot[$currentSection] = array();
                    }
                    
                    // has sub-section ??
                    $line = trim(substr($line, $endsection+1));
                    if (empty($line)) break;
                    $linestartswith = $line[0];
                }
            }
            
            // key-value pairs
            else
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
                        
                        $currentRoot[$currentSection][$key] = $value;
                    }
                    // single value
                    else
                    {
                        if ($keysList)
                            $currentRoot[$currentSection]['__list__'][] = $key;
                        else
                            $currentRoot[$currentSection][$key] = true;
                    }
                }
                // un-quoted string
                else
                {
                    $pair = array_map('trim', explode('=', $line, 2));
                    
                    // single value
                    if (!isset($pair[1]))
                    {
                        $key = $pair[0];
                        if ($keysList)
                            $currentRoot[$currentSection]['__list__'][] = $key;
                        else
                            $currentRoot[$currentSection][$key] = true;
                    }
                    // key-value pair
                    else
                    {
                        $key = $pair[0];
                        $value = $pair[1];
                        $valuestartswith = $value[0];
                        
                        // quoted value
                        if ('"'==$valuestartswith || "'"==$valuestartswith)
                            list($value, $rem) = self::_parseStr($value, $valuestartswith);
                        
                        $currentRoot[$currentSection][$key] = $value;
                    }
                }
            }
        }
        return $sections;
    }
    
    public static function fromFile($filename, $keysList=true, $rootSection='_')
    {
        return self::fromString( file_get_contents($filename, $keysList, $rootSection) );
    }
    
    protected static function _walk($o, $key=null, $top='', $q='', $EOL="\n")
    {
        $s = '';
        
        $o = (array)$o;
        
        if (!empty($o))
        {
            if ($key) $keys = array($key);
            else $keys = array_keys($o);
            
            foreach ($keys as $section)
            {
                $keyvals = (array)$o[$section];
                if (empty($keyvals))  continue;
                
                $s .= "${top}[${section}]" . $EOL;
                
                if (isset($keyvals['__list__']) && !empty($keyvals['__list__']) && is_array($keyvals['__list__']))
                {
                    // only values as a list
                    $s .= $q . implode($q.$EOL.$q, $keyvals['__list__']) . $q . $EOL;
                    unset($keyvals['__list__']);
                }
                
                if (!empty($keyvals))
                {
                    foreach ($keyvals as $k => $v)
                    {
                        if (empty($v)) continue;
                        
                        if (is_array($v) || is_object($v))
                        {
                            // sub-section
                            $s .= self::_walk($keyvals, $k, "${top}[${section}]", $q, $EOL);
                        }
                        else
                        {
                            // key-value pair
                            $s .= "${q}${k}${q}=${q}${v}${q}" . $EOL;
                        }
                    }
                }
                $s .= $EOL;
            }
        }
        
        return $s;
    }
    
    public static function toString($o, $rootSection='_', $quote=false, $EOL="\n")
    {
        $s = '';
        
        // clone it
        $o = (array)$o;
        
        $root = ($rootSection) ? strval($rootSection) : '_';
        $q = ($quote) ? '"' : '';
        
        // dump the root section first, if exists
        if (isset($o[$root]))
        {
            $section = (array)$o[$root];
            
            $list = null;
            if (isset($section['__list__']))
            {
                $list = (array)$section['__list__'];
                
                if ($list && !empty($list))
                {
                    $s .= $q . implode($q.$EOL.$q, $list) . $q . $EOL;
                    unset($section['__list__']);
                }
            }
            
            foreach ($section as $k => $v)
            {
                if (empty($v)) continue;
                $s .= "${q}${k}${q}=${q}${v}${q}" . $EOL;
            }
            
            $s .= $EOL;
            
            unset($o[$root]);
        }
        
        // walk the sections and sub-sections, if any
        $s .= self::_walk($o, null, '', $q, $EOL);
        
        return $s;
    }
    
    public static function toFile($filename, $o, $rootSection='_', $quote=false, $EOL="\n")
    {
        return file_put_contents( $filename, self::toString($o, $rootSection, $quote, $EOL) );
    }
}
}