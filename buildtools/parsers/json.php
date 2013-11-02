<?php

/*
*   Simple JSON Parser
*   Nikos M.
*
*
*/

class JsonParser
{
    protected $input='';
    protected $output=null;
    
    public function __construct($json)
    {
        $this->input = $json;
    }
    
    protected function parseBoolean()
    {
    }
    
    protected function parseNumber()
    {
    }
    
    protected function parseString()
    {
    }
    
    protected function parseArray()
    {
    }
    
    protected function parseObject()
    {
    }
}