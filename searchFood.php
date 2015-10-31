<?php
header( "Content-Type: application/json; charset=utf-8" ) ;
$json = file_get_contents("assets/js/F_yamakata.json");
$json = mb_convert_encoding($json, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
$array = json_decode( $json , true ) ;
$array_result = [];
foreach ($array as  $key => $val) {
    if (strstr($val, $_GET['q'])) {
        $array_tmp = array(
            "id" => $key,
            "text" => $val
        );
        $array_result[] = $array_tmp;
    }
}

echo json_encode($array_result);