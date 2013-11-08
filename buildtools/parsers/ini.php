<?php
/**
*
*   Simple .INI Parser for PHP
*   @Nikos M.
*
**/
if (!class_exists('IniParser'))
{
class IniParser
{
    public $root = '_';
    public $keysList = true;
    protected $input = '';
    protected $comments = array(';', '#');
    
    public function __construct($keysList=true, $rootSection='_')
    {
        $this->keysList = $keysList;
        $this->root = strval($rootSection);
    }
    
    /*protected function startsWith($s, $prefix) 
    { 
        return (0===strpos($s, $prefix)); 
    }*/
    
    public function fromFile($filename)
    {
        $this->input = file_get_contents($filename);
        return $this;
    }
    
    public function fromString($input)
    {
        $this->input = strval($input);
        return $this;
    }
    
    public function parse()
    {
        $sections = array( );
        $comments =& $this->comments;
        $keysList = $this->keysList;
        
        $currentSection = $this->root;
        if ($keysList)
            $sections[$currentSection] = array( '__list__' => array() );
        else
            $sections[$currentSection] = array(  );
        $currentRoot =& $sections;
        
        // read the dependencies file
        $lines = preg_split("/\\n\\r|\\r\\n|\\r|\\n/", $this->input);
        $len = count($lines);
        
        
        // parse it line-by-line
        for ($i=0; $i<$len; $i++)
        {
            // strip the line of extra spaces
            $line = trim($lines[$i]);
            $linestartswith = substr($line, 0, 1);
            
            // comment or empty line, skip it
            if ( empty($line) || in_array($linestartswith, $comments) ) continue;
            
            // section(s) line
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
                    $linestartswith = substr($line, 0, 1);
                }
                continue;
            }
            // quoted strings as key-value pairs line
            elseif ('"'==$linestartswith || "'"==$linestartswith)
            {
                $endquote = strpos($line, $linestartswith, 1);
                $key = substr($line, 1, $endquote-1);
                $line = trim(substr($line, $endquote));
                if (false!==strpos($line, '=', 0))
                {
                    $values = explode('=', $line, 2);
                    $value = trim($values[1]);
                    $valuestartswith = substr($value, 0, 1);
                    if ('"'==$valuestartswith || "'"==$valuestartswith)
                    {
                        $endquote = strpos($value, $valuestartswith, 1);
                        $value = substr($value, 1, $endquote-1);
                    }
                    $currentRoot[$currentSection][$key] = $value;
                }
                else
                {
                    if ($keysList)
                        $currentRoot[$currentSection]['__list__'][] = $key;
                    else
                        $currentRoot[$currentSection][$key] = true;
                }
                continue;
            }
            // key-value pairs line
            else
            {
                $pair = array_map('trim', explode('=', $line, 2));
                
                if (!isset($pair[1]))
                {
                    $key = $pair[0];
                    if ($keysList)
                        $currentRoot[$currentSection]['__list__'][] = $key;
                    else
                        $currentRoot[$currentSection][$key] = true;
                }
                else
                {
                    $key = $pair[0];
                    $value = $pair[1];
                    $currentRoot[$currentSection][$key] = $value;
                }
                continue;
            }
        }
        
        return $sections;
    }
}
}