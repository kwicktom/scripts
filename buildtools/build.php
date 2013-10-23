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
function __startsWith($s, $prefix) { return (0===strpos($s, $prefix)); }
// http://stackoverflow.com/questions/5144583/getting-filename-or-deleting-file-using-file-handle
function __tmpfile() { $tmp=tmpfile(); $meta_data=stream_get_meta_data($tmp); $tmpname=realpath($meta_data["uri"]); return array($tmp, $tmpname); }
    
class BuildPackage
{
    protected $inputType = 'custom';
    protected $Encoding = 'utf8';
    protected $compilersPath = './';
    protected $availableCompilers = array(
        
        'uglifyjs' => array(
            'name' => 'Node UglifyJS Compiler',
            'compiler' => 'uglifyjs __{{INPUT}}__ __{{OPTIONS}}__ -o __{{OUTPUT}}__',
            'options' => ''
        ),
        
        'closure' => array(
            'name' => 'Java Closure Compiler',
            'compiler' => 'java -jar __{{PATH}}__closure.jar --charset __{{ENCODING}}__ __{{OPTIONS}}__ --js __{{INPUT}}__ --js_output_file __{{OUTPUT}}__',
            'options' => ''
        ),
        
        'yui' => array( 
            'name' => 'Java YUI Compressor Compiler',
            'compiler' => 'java -jar __{{PATH}}__yuicompressor.jar --charset __{{ENCODING}}__ __{{OPTIONS}}__ --type js -o __{{OUTPUT}}__  __{{INPUT}}__',
            'options' => ''
        )
        
    );
    protected $selectedCompiler = 'uglifyjs';
    
    protected $realpath = '';
    protected $outputToStdOut=true;
    protected $depsFile = '';
    protected $inFiles = null;
    protected $doMinify = false;
    protected $outFile = null;
    
    public function __construct()
    {
        $this->inputType = 'custom';
        $this->Encoding = 'utf8';
        $this->compilersPath = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'compilers' . DIRECTORY_SEPARATOR;
        $this->selectedCompiler = 'uglifyjs';
        
        $this->realpath = '';
        $this->outputToStdOut = true;
        $this->depsFile = '';
        $this->inFiles = null;
        $this->doMinify = false;
        $this->outFile = null;
    }
    
    public function BuildPackage() { $this->__construct();  }
    
    protected function pathreal($file)
    {
        if ( is_string($this->realpath) && strlen($this->realpath) && 
            (__startsWith($file, './') || __startsWith($file, '../') || __startsWith($file, '.\\') || __startsWith($file, '..\\'))
        ) 
            return realpath($this->realpath . $file); 
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
    protected function getArgs($argv = null) 
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
        $args = $this->getArgs($argv);
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
            __echo ("  --compiler=COMPILER     uglifyjs (default) | closure | yui,");
            __echo ("                          Whether to use UglifyJS or Closure");
            __echo ("                          or YUI Compressor Compiler");
            __echo ("  --enc=ENCODING          set text encoding (default utf8)");
            __echo ();
            
            exit(1);
        }
        // fix compiler selection
        $args['compiler'] = strtolower(strval($args['compiler']));
        if ( !isset($this->availableCompilers[ $args['compiler'] ]) ) $args['compiler'] = $this->selectedCompiler;
        
        return $args;
    }
    
    // parse dependencies file in YML format
    public function parseYmlSettings()
    {
    }
    
    // parse dependencies file in JSON format
    public function parseJsonSettings()
    {
        $settings = (array)json_decode(file_get_contents($this->depsFile));
        
        if (isset($settings['@DEPENDENCIES']))
        {
            $this->inFiles = (array)$settings['@DEPENDENCIES'];
        }
        else
        {
            $this->inFiles = array();
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
        }
        else
        {
            $this->doMinify = false;
        }
        
        if (isset($settings['@OUT']))
        {
            $this->outFile = $this->pathreal($settings['@OUT']);
            $this->outputToStdOut = false;
        }
        else
        {
            $this->outFile = null;
            $this->outputToStdOut = true;
        }
    }
    
    // parse dependencies file in custom format
    public function parseCustomSettings()
    {
        // settings buffers
        $settings=array(
            // deps
            array(),
            // out
            array(),
            // optsUglify
            array(),
            // optsClosure
            array(),
            // optsYUI
            array()
        );
        $deps=0; $out=1; $optsUglify=2; $optsClosure=3; $optsYUI=4;
        $currentBuffer = -1;
        
        // settings options
        $doMinify = false;
        $inMinifyOptions = false;

        // read the dependencies file
        $lines=preg_split("/\\n\\r|\\r\\n|\\r|\\n/", file_get_contents($this->depsFile));
        $len=count($lines);
        
        // parse it line-by-line
        for ($i=0; $i<$len; $i++)
        {
            // strip the line of extra spaces
            $line=str_replace(array("\n", "\r"), "", trim($lines[$i]));
            $linestartswith=substr($line, 0, 1);
            
            // comment or empty line, skip it
            if ('#'==$linestartswith || ''==$line) continue;
            
            // directive line, parse it
            if ('@'==$linestartswith)
            {
                if (__startsWith($line, '@DEPENDENCIES')) // list of input dependencies files option
                {
                    // reference
                    $currentBuffer = $deps;
                    $inMinifyOptions=false;
                    continue;
                }
                else if (__startsWith($line, '@MINIFY')) // enable minification (default is UglifyJS Compiler)
                {
                    // reference
                    $currentBuffer = -1;
                    $doMinify=true;
                    $inMinifyOptions=true;
                    continue;
                }
                else if ($inMinifyOptions && __startsWith($line, '@UGLIFY')) // Node UglifyJS Compiler options (default)
                {
                    // reference
                    $currentBuffer = $optsUglify;
                    continue;
                }
                elseif ($inMinifyOptions && __startsWith($line, '@CLOSURE')) // Java Closure Compiler options
                {
                    // reference
                    $currentBuffer = $optsClosure;
                    continue;
                }
                elseif ($inMinifyOptions && __startsWith($line, '@YUI')) // YUI Compressor Compiler options
                {
                    // reference
                    $currentBuffer = $optsYUI;
                    continue;
                }
                /*
                elseif (__startsWith($line, '@PREPROCESS')) // allow preprocess options (todo)
                {
                    currentBuffer=-1;
                    inMinifyOptions=false;
                    continue;
                }
                elseif (__startsWith($line, '@POSTPROCESS')) // allow postprocess options (todo)
                {
                    currentBuffer=-1;
                    inMinifyOptions=false;
                    continue;
                }
                */
                elseif (__startsWith($line, '@OUT')) // output file option
                {
                    // reference
                    $currentBuffer = $out;
                    $inMinifyOptions=false;
                    continue;
                }
                else // unknown option or dummy separator option
                {
                    // reference
                    $currentBuffer = -1;
                    $inMinifyOptions=false;
                    continue;
                }
            }
            // if any settings need to be stored, store them in the appropriate buffer
            if ($currentBuffer>=0)  array_push($settings[$currentBuffer], $line);
        }
        // store the parsed settings
        if (isset($settings[$out][0]))
        {
            $this->outFile = $this->pathreal($settings[$out][0]);
            $this->outputToStdOut = false;
        }
        else
        {
            $this->outFile = null;
            $this->outputToStdOut = true;
        }
        $this->inFiles = $settings[$deps];
        $this->doMinify = $doMinify;
        $this->availableCompilers['uglifyjs']['options'] = implode(" ", $settings[$optsUglify]);
        $this->availableCompilers['closure']['options'] = implode(" ", $settings[$optsClosure]);
        $this->availableCompilers['yui']['options'] = implode(" ", $settings[$optsYUI]);
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
        
        if ($ext==".json") $this->inputType=".json";
        elseif ($ext==".yml" || $ext==".yaml") $this->inputType=".yaml";
        else $this->inputType="custom";
        
        if (".json" == $this->inputType)
            $this->parseJsonSettings();
        else
            $this->parseCustomSettings();
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
                $filename=$this->pathreal($files[$i]);
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
            

            // use the selected compiler
            $compiler = $this->availableCompilers[$this->selectedCompiler];
            $cmd = escapeshellcmd(
                    str_replace(
                        array('__{{PATH}}__', '__{{OPTIONS}}__', '__{{ENCODING}}__', '__{{INPUT}}__', '__{{OUTPUT}}__'), 
                        array($this->compilersPath, $compiler['options'], $this->Encoding, $in_tuple[1], $out_tuple[1]), 
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