<?php
require_once 'jsonOutputSearchResult.php';
header( "Content-Type: application/json; charset=utf-8" );
$json = file_get_contents("assets/js/T_yamakata.json");
$json = mb_convert_encoding($json, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');

json_output_search_result($json);