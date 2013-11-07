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
    protected $input = '';
    protected $comments = array(';', '#');
    
    public function __construct($rootSection='_')
    {
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
        $sections = array(
            $this->root => array()
        );
        
        $comments =& $this->comments;
        
        // read the dependencies file
        $lines = preg_split("/\\n\\r|\\r\\n|\\r|\\n/", $this->input);
        $len = count($lines);
        
        $currentSection = $this->root;
        
        // parse it line-by-line
        for ($i=0; $i<$len; $i++)
        {
            // strip the line of extra spaces
            $line = trim($lines[$i]);
            $linestartswith = substr($line, 0, 1);
            
            // comment or empty line, skip it
            if ( empty($line) || in_array($linestartswith, $comments) ) continue;
            
            // section line
            if ('['==$linestartswith)
            {
                $currentSection = substr($line, 1, -1);
                
                if (!isset($sections[$currentSection]))
                    $sections[$currentSection] = array();
                    
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
                    $sections[$currentSection][$key] = $value;
                }
                else
                {
                    $sections[$currentSection][$key] = true;
                }
            }
            // key-value pairs line
            else
            {
                $pair = array_map('trim', explode('=', $line, 2));
                
                if (!isset($pair[1]))
                    $sections[$currentSection][$pair[0]] = true;
                
                else
                    $sections[$currentSection][$pair[0]] = $pair[1];
            }
        }
        
        return $sections;
    }
}
}