<?php
if (!class_exists('_MinifyPHP_'))
{

class _MinifyPHP_
{
    public static function minify($s)
    {
        $lines=explode("\n", $s);
        $len=count($lines);
        $insideComment=false;
        for ($i=0; $i<$len; $i++)
        {
            $line=$lines[$i];
            
            // convert all spaces to a single space
            $line=preg_replace('/[\\s \\t\\v\\n\\r]+/', ' ', $line);
            // convert multiline comments openings to \t
            $line=str_replace('/*', "\t", $line);
            // convert multiline comments closings to \v
            $line=str_replace('*/', "\v", $line);
            
            if ($insideComment)
            {
                // check if closing of multiline comment
                $commentEndPos=strpos($line, "\v");
                if (false!==$commentEndPos)
                {
                    $line=substr($line, $commentEndPos+1);
                    $insideComment=false;
                }
                else
                {
                    // skip entire line
                    $line='';
                }
            }
            if (!$insideComment)
            {
                // remove multi line comments (on same line)
                $line=preg_replace('/\\t[^\\v]*\\v/', '', $line);
                // remove single line comments
                $line=preg_replace('/\/\/.*$/', '', $line);
                // check if inside opening of multiline comment
                $commentBeginPos=strpos($line, "\t");
                if (false!==$commentBeginPos)
                {
                    $insideComment=true;
                    $line=substr($line, 0, $commentBeginPos);
                }
            }
            
            // save it
            $lines[$i]=$line;
        }
        print_r($lines);
        return '';
        // add a semi-colon just in case
        return implode('; ', $lines);
    }
}
}
if (isset($argv[1]) && is_file($argv[1]))
{
    echo _MinifyPHP_::minify(file_get_contents($argv[1]));
}
else 
{
    echo '';
}
