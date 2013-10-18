#!/bin/sh

# $1 is opencv haar xml file name without xml extension
php -f PHPmin.php "$1" > "$2"