#!/usr/bin/env php
<?php
/*
#########################################################################################
#
#   Build a (js,css) package library based, 
#   on a dependencies file, 
#   using various compilers
#
#   PHP: 5.2+ (ca. 2012-2013)
#########################################################################################
*/
error_reporting(E_ALL);

if (!class_exists('BuildPackage'))
{

//
// auxilliary functions
//
function __echo($s="") {  echo $s . PHP_EOL; }
// simulate python's "startswith" string method
function __startsWith($s, $prefix) { return ($prefix==substr($s, 0, strlen($prefix))); }
// http://stackoverflow.com/questions/5144583/getting-filename-or-deleting-file-using-file-handle
function __tmpfile() { $tmp=tmpfile(); $meta_data=stream_get_meta_data($tmp); $tmpname=realpath($meta_data["uri"]); return array($tmp, $tmpname); }
    
class BuildPackage
{
    protected $inputType = 'custom';
    protected $Encoding = 'utf8';
    protected $compilersPath = './';
    protected $parsersPath = './';
    protected $availableParsers = array(
        
        'Yaml' => array(
            'name' => 'Yaml Symfony Parser',
            'file' => 'yaml.min.php'
        ),
        
        'Ini' => array(
            'name' => 'Simple Ini Parser',
            'file' => 'ini.min.php'
        ),
        
        'Custom' => array(
            'name' => 'Custom Parser',
            'file' => 'custom.min.php'
        )
    );
    protected $availableCompilers = array(
        
        'cssmin' => array(
            'name' => 'CSS Minifier',
            'compiler' => 'php -f __{{PATH}}__cssmin.php -- __{{EXTRA}}__ __{{OPTIONS}}__ --input=__{{INPUT}}__  --output=__{{OUTPUT}}__',
            'options' => ''
        ),
        
        'uglifyjs' => array(
            'name' => 'Node UglifyJS Compiler',
            'compiler' => 'uglifyjs __{{INPUT}}__ __{{OPTIONS}}__ -o __{{OUTPUT}}__',
            'options' => ''
        ),
        
        'closure' => array(
            'name' => 'Java Closure Compiler',
            'compiler' => 'java -jar __{{PATH}}__closure.jar __{{EXTRA}}__ __{{OPTIONS}}__ --js __{{INPUT}}__ --js_output_file __{{OUTPUT}}__',
            'options' => ''
        ),
        
        'yui' => array( 
            'name' => 'Java YUI Compressor Compiler',
            'compiler' => 'java -jar __{{PATH}}__yuicompressor.jar __{{EXTRA}}__ __{{OPTIONS}}__ --type js -o __{{OUTPUT}}__  __{{INPUT}}__',
            'options' => ''
        )
        
    );
    protected $selectedCompiler = 'uglifyjs';
    
    protected $realpath = '';
    protected $outputToStdOut=true;
    protected $depsFile = '';
    protected $inFiles = null;
    protected $replace = null;
    protected $doc = null;
    protected $doMinify = false;
    protected $outFile = null;
    
    public function __construct()
    {
        $this->inputType = 'custom';
        $this->Encoding = 'utf8';
        $this->compilersPath = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'compilers' . DIRECTORY_SEPARATOR;
        $this->parsersPath = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'parsers' . DIRECTORY_SEPARATOR;
        $this->selectedCompiler = 'uglifyjs';
        
        $this->realpath = '';
        $this->outputToStdOut = true;
        $this->depsFile = '';
        $this->inFiles = null;
        $this->replace = null;
        $this->doc = null;
        $this->doMinify = false;
        $this->outFile = null;
    }
    
    public function BuildPackage() { $this->__construct();  }
    
    // https://github.com/JosephMoniz/php-path
    protected function joinPath() 
    {
        $args = func_get_args();
        $argslen = count($args);
        $DS = DIRECTORY_SEPARATOR;
        
        if (!$argslen)  return ".";
        
        $path = implode($DS, $args);
        $plen = strlen($path);
        
        if (!$plen) return ".";
        
        $isAbsolute    = $path[0];
        $trailingSlash = $path[$plen - 1];

        $peices = array_values( array_filter( preg_split('#/|\\\#', $path), 'strlen' ) );
        
        $new_path = array();
        $up = 0;
        $i = count($peices)-1;
        while ($i>=0)
        {
            $last = $peices[$i];
            if ($last == "..") 
            {
                $up++;
            } 
            elseif ($last != ".")
            {
                if ($up)  $up--;
                else  array_push($new_path, $peices[$i]);
            }
            $i--;
        }
        
        $path = implode($DS, array_reverse($new_path));
        
        if (!$path && !$isAbsolute) 
        {
            $path = ".";
        }

        if ($path && $trailingSlash == $DS /*"/"*/) 
        {
            $path .= $DS /*"/"*/;
        }

        return ($isAbsolute == $DS /*"/"*/ ? $DS /*"/"*/ : "") . $path;
    }
    
    protected function realPath($file)
    {
        if ( is_string($this->realpath) && strlen($this->realpath) && 
            (__startsWith($file, './') || __startsWith($file, '../') || __startsWith($file, '.\\') || __startsWith($file, '..\\'))
        ) 
            return $this->joinPath/*realpath*/($this->realpath, $file); 
        else return $file;
    }
    
    protected function fileext($file)
    {
        $extension  = pathinfo($file);
        #return {'dirname': dirname, 'basename': basename, 'extension': extension}
        return isset($extension['extension']) ? $extension['extension'] : '';
    }
    
    /**
     * parseArgs Command Line Interface (CLI) utility function.
     * @author              Patrick Fisher <patrick@pwfisher.com>
     * @see                 https://github.com/pwfisher/CommandLine.php
     */
    protected function _parseArgs($argv = null) 
    {
        $argv = $argv ? $argv : $_SERVER['argv']; array_shift($argv); $o = array();
        for ($i = 0, $j = count($argv); $i < $j; $i++) 
        { 
            $a = $argv[$i];
            if (substr($a, 0, 2) == '--') 
            { 
                $eq = strpos($a, '=');
                if ($eq !== false) {  $o[substr($a, 2, $eq - 2)] = substr($a, $eq + 1); }
                else 
                { 
                    $k = substr($a, 2);
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; }
                    else if (!isset($o[$k])) { $o[$k] = true; } 
                } 
            }
            else if (substr($a, 0, 1) == '-') 
            {
                if (substr($a, 2, 1) == '=') { $o[substr($a, 1, 1)] = substr($a, 3); }
                else 
                {
                    foreach (str_split(substr($a, 1)) as $k) { if (!isset($o[$k])) { $o[$k] = true; } }
                    if ($i + 1 < $j && $argv[$i + 1][0] !== '-') { $o[$k] = $argv[$i + 1]; $i++; } 
                } 
            }
            else { $o[] = $a; } }
        return $o;
    }
    
    public function parseArgs($argv=null)
    {
        $defaultArgs=array(
            'h' => false,
            'help' => false,
            'deps' => false,
            'compiler' => $this->selectedCompiler,
            'enc' => $this->Encoding
        );
        $args = $this->_parseArgs($argv);
        $args = array_intersect_key($args, $defaultArgs);
        $args = array_merge($defaultArgs, $args);
        
        if (
            ($args['h'] || $args['help']) ||
            (!isset($args['deps']) || !$args['deps'] || !is_string($args['deps']) || 0==strlen($args['deps']))
        )
        {
            // If no dependencies have been passed or help is set, show the help message and exit
            $p=pathinfo(__FILE__);
            $thisFile=(isset($p['extension'])) ? $p['filename'].'.'.$p['extension'] : $p['filename'];
            
            __echo ("usage: $thisFile [-h] [--deps=FILE] [--compiler=COMPILER] [--enc=ENCODING]");
            __echo ();
            __echo ("Build and Compress Javascript Packages");
            __echo ();
            __echo ("optional arguments:");
            __echo ("  -h, --help              show this help message and exit");
            __echo ("  --deps=FILE             Dependencies File (REQUIRED)");
            __echo ("  --compiler=COMPILER     uglifyjs (default) | closure | yui | cssmin,");
            __echo ("                          Whether to use UglifyJS, Closure,");
            __echo ("                          YUI Compressor or CSSMin Compiler");
            __echo ("  --enc=ENCODING          set text encoding (default utf8)");
            __echo ();
            
            exit(1);
        }
        // fix compiler selection
        $args['compiler'] = strtolower(strval($args['compiler']));
        if ( !isset($this->availableCompilers[ $args['compiler'] ]) ) $args['compiler'] = $this->selectedCompiler;
        
        return $args;
    }
    
    // parse settings in hash format
    protected function parseHashSettings($settings=null)
    {
        if ($settings)
        {
            //$settings = (array)json_decode(file_get_contents($this->depsFile));
            
            if (isset($settings['@DEPENDENCIES']))
            {
                $this->inFiles = (array)$settings['@DEPENDENCIES'];
            }
            else
            {
                $this->inFiles = array();
            }
        
            if (isset($settings['@REPLACE']))
            {
                $this->replace = (array)$settings['@REPLACE'];
            }
            else
            {
                $this->replace = null;
            }
        
            if (isset($settings['@DOC']) && isset($settings['@DOC']['OUTPUT']))
            {
                $this->doc = $settings['@DOC'];
                $this->doc['OUTPUT'] = $this->realPath($settings['@DOC']['OUTPUT']);
            }
            else
            {
                $this->doc = null;
            }
        
            if (isset($settings['@MINIFY']))
            {
                $this->doMinify = true;
                $minsets = (array)$settings['@MINIFY'];
                
                if (isset($minsets['@UGLIFY']))
                    $this->availableCompilers['uglifyjs']['options'] = implode(" ", (array)$minsets['@UGLIFY']);
                if (isset($minsets['@CLOSURE']))
                    $this->availableCompilers['closure']['options'] = implode(" ", (array)$minsets['@CLOSURE']);
                if (isset($minsets['@YUI']))
                    $this->availableCompilers['yui']['options'] = implode(" ", (array)$minsets['@YUI']);
                if (isset($minsets['@CSSMIN']))
                    $this->availableCompilers['cssmin']['options'] = implode(" ", (array)$minsets['@CSSMIN']);
            }
            else
            {
                $this->doMinify = false;
            }
            
            if (isset($settings['@OUT']))
            {
                $this->outFile = $this->realPath($settings['@OUT']);
                $this->outputToStdOut = false;
            }
            else
            {
                $this->outFile = null;
                $this->outputToStdOut = true;
            }
        }
    }
    
    // parse dependencies file in INI format
    public function parseIniSettings()
    {
        if (!class_exists('IniParser'))  include ($this->parsersPath . $this->availableParsers['Ini']['file']);
        
        $setts = IniParser::fromString( file_get_contents($this->depsFile) );
        
        if (isset($setts['@DEPENDENCIES']))
            $setts['@DEPENDENCIES'] = $setts['@DEPENDENCIES']['__list__'];
        if (isset($setts['@OUT']))
            $setts['@OUT'] = $setts['@OUT']['__list__'][0];
        if (isset($setts['@REPLACE']))
            unset($setts['@REPLACE']['__list__']);
        if (isset($setts['@DOC']))
            unset($setts['@DOC']['__list__']);
        
        if (isset($setts['@MINIFY']))
        {
            $minsetts = $setts['@MINIFY'];
            
            if (isset($minsetts['@UGLIFY']))
                $setts['@MINIFY']['@UGLIFY'] = $minsetts['@UGLIFY']['__list__'];
            if (isset($minsetts['@CLOSURE']))
                $setts['@MINIFY']['@CLOSURE'] = $minsetts['@CLOSURE']['__list__'];
            if (isset($minsetts['@YUI']))
                $setts['@MINIFY']['@YUI'] = $minsetts['@YUI']['__list__'];
            if (isset($minsetts['@CSSMIN']))
                $setts['@MINIFY']['@CSSMIN'] = $minsetts['@CSSMIN']['__list__'];
        }
        
        $this->parseHashSettings( $setts );
    }
    
    // parse dependencies file in YAML format
    public function parseYamlSettings()
    {
        if (!class_exists('Yaml'))  include ($this->parsersPath . $this->availableParsers['Yaml']['file']);
        $this->parseHashSettings( (array)Yaml::parse( $this->depsFile/*, false, true*/ ) );
    }
    
    // parse dependencies file in JSON format
    public function parseJsonSettings()
    {
        $this->parseHashSettings( (array)json_decode( file_get_contents($this->depsFile) ) );
    }
    
    // parse dependencies file in custom format
    public function parseCustomSettings()
    {
        if (!class_exists('CustomParser'))  include ($this->parsersPath . $this->availableParsers['Custom']['file']);
        
        $setts = CustomParser::fromString( file_get_contents($this->depsFile) );
        
        if (isset($setts['@OUT']))
            $setts['@OUT'] = $setts['@OUT'][0];
        
        //print_r($setts);
        $this->parseHashSettings( $setts );
    }
    
    public function parse($argv=null)
    {
        $args = $this->parseArgs($argv);
        
        // if args are correct continue
        // get real-dir of deps file
        $full_path = $this->depsFile = realpath($args['deps']);
        $this->realpath = rtrim(dirname($full_path), "/\\").DIRECTORY_SEPARATOR;
        $this->Encoding = strtolower($args['enc']);
        $this->selectedCompiler = $args['compiler'];
        
        $ext = strtolower($this->fileext($full_path));
        if (!strlen($ext)) $ext="custom";
        else $ext="." . $ext;
        
        if ($ext==".json")
        {
            $this->inputType=".json";
            $this->parseJsonSettings();
        }
        elseif ($ext==".yml" || $ext==".yaml")
        {
            $this->inputType=".yaml";
            $this->parseYamlSettings();
        }
        elseif ($ext==".ini")
        {
            $this->inputType=".ini";
            $this->parseIniSettings();
        }
        else
        {
            $this->inputType="custom";
            $this->parseCustomSettings();
        }
    }
    
    public function doReplace($text, $replace)
    {
        return str_replace(array_keys($replace), array_values($replace), $text);
    }
    
    public function extractDoc($text, $doc)
    {
        $startDoc = $doc['STARTDOC'];
        $endDoc = $doc['ENDDOC'];
        $docs = array();
        
        $blocks = explode($startDoc, $text);
        foreach ($blocks as $i=>$b)
        {
            $tmp = explode($endDoc, $b);
            if ( isset($tmp[1]) )
            {
                $docs[] = $tmp[0];
            }
        }
        $blocks = null;
        
        foreach ($docs as $i=>$d)
        {
            $tmp = explode("\n", $d);
            foreach ($tmp as $j=>$t)
            {
                if (strlen($t))
                {
                    $tmp[$j] = substr($tmp[$j], 1);
                }
            }
            $docs[$i] = implode("\n", $tmp);
        }
        
        return $docs;
    }
    
    public function doMerge()
    {
        $files=$this->inFiles;
        if (is_array($files))
        {
            $count=count($files);
            $buffer = array();

            for ($i=0; $i<$count; $i++)
            {
                $filename=$this->realPath($files[$i]);
                $buffer[]=file_get_contents($filename);
            }

            return implode('', $buffer);
        }
        return '';
    }
    
    public function extractHeader($text)
    {
        $header = '';
        if (__startsWith($text, '/**'))
        {
            $position = strpos($text, "**/");
            $header = substr($text, 0, $position+3);
        }
        else if (__startsWith($text, '/*!'))
        {
            $position = strpos($text, "!*/");
            $header = substr($text, 0, $position+3);
        }
        return $header;
    }

    public function doCompress($text)
    {
        if ('' != $text)
        {
            $in_tuple = __tmpfile(); 
            $out_tuple = __tmpfile();
            
            fwrite($in_tuple[0], $text);
            
            $extra = '';
            if ('cssmin'==$this->selectedCompiler)
            {
                // needed by cssmin mostly
                if (!$this->outputToStdOut)
                    $extra = "--basepath=".dirname($this->outFile);
                else
                    $extra = "";
            }
            elseif ('yui'==$this->selectedCompiler || 'closure'==$this->selectedCompiler)
            {
                $extra = "--charset ".$this->Encoding;
            }
            
            // use the selected compiler
            $compiler = $this->availableCompilers[$this->selectedCompiler];
            $cmd = escapeshellcmd(
                    str_replace(
                        array('__{{PATH}}__', '__{{EXTRA}}__', '__{{OPTIONS}}__', '__{{INPUT}}__', '__{{OUTPUT}}__'), 
                        array($this->compilersPath, $extra, $compiler['options'], $in_tuple[1], $out_tuple[1]), 
                        $compiler['compiler']
                    )
                );
            exec($cmd, $out, $err=0);
            
            if (!$err) $compressed = file_get_contents($out_tuple[1]); //fread($out_tuple[0], filesize($out_tuple[1]));
            
            @fclose($in_tuple[0]);
            @fclose($out_tuple[0]);
            try{
                @unlink($in_tuple[1]);
            } catch ( Exception $e) {}
            try{
                @unlink($out_tuple[1]);
            } catch ( Exception $e) {}
            
            // some error occured
            if ($err) exit(1);
            
            return $compressed;
        }
        return '';
    }

    public function doPreprocess($text)
    {
    }
    
    public function doPostprocess($text)
    {
    }
    
    public function build()
    {
        $text = $this->doMerge();
        $header = '';
        
        //$this->doPreprocess($text);
        
        if ($this->replace)
            $text = $this->doReplace($text, $this->replace);
            
        if ($this->doc)
            file_put_contents($this->doc['OUTPUT'], implode("\n\n", $this->extractDoc($text, $this->doc)));
            
        $sepLine = str_repeat("=", 65); //implode("", array_fill(0, 65, "=")).PHP_EOL;
        
        // output the build settings
        if (!$this->outputToStdOut)
        {
            __echo ($sepLine);
            __echo (" Build Package ");
            __echo ($sepLine);
            __echo ();
            __echo ("Input    : " . $this->inputType);
            __echo ("Encoding : " . $this->Encoding);
            if ($this->doMinify)
            {
                __echo ("Minify   : ON");
                __echo ("Compiler : " . $this->availableCompilers[$this->selectedCompiler]['name']);
            }
            else
            {
                __echo ("Minify   : OFF");
            }
            __echo ("Output   : " . $this->outFile);
            __echo ();
        }
        
        if ($this->doMinify)
        {
            // minify and add any header
            $header = $this->extractHeader($text);
            $text = $this->doCompress($text);
        }
        
        //$this->doPostprocess($text);
        
        // write the processed file
        if ($this->outputToStdOut)  echo ($header . $text);
        else file_put_contents($this->outFile, $header . $text);
    }
    
    public static function Main()
    {
        // do the process
        $buildLib = new BuildPackage();
        $buildLib->parse($_SERVER['argv']);
        $buildLib->build();
    }
}
}

// if called directly from command-line
if (
    (php_sapi_name() === 'cli') &&
    (__FILE__ == realpath($_SERVER['SCRIPT_FILENAME']))
)
{
    // do the process
    BuildPackage::Main();
    exit (0);
}