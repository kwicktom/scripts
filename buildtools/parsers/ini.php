<?php

/*
*   Simple INI Parser
*   Nikos M.
*
*
*/

class IniParser
{
    protected $input='';
    protected $output=null;
    
    public function __construct($ini)
    {
        $this->input = $ini;
    }
    
    protected function parseComment()
    {
    }
    
    protected function parseSectionHeader()
    {
    }
    
    protected function parseSetting()
    {
    }
    
    protected function parseSection()
    {
    }
}