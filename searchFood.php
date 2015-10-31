<?php
header( "Content-Type: application/json; charset=utf-8" ) ;
$json = file_get_contents("assets/js/F_yamakata.json");
$json = mb_convert_encoding($json, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
// 一つのノードのnameが入った配列
// ["じゃがいも", "たまご",...]等のようになっている
$arr_vertex_name = json_decode( $json , true ) ;
// 結果返すようの配列
$arr_result = [];
// 同じ名前のものは二度表示しないようの配列
// valueで検索するin_arrayは遅く，keyで検索するのは早いので
// keyに値を格納している部分が重要
$arr_for_remove_duplicated = [];
foreach ($arr_vertex_name as  $id => $name) {
    // queryと一致する文字列を含むものだけ
    if (strstr($name, $_GET['q'])) {
        $arr_tmp = array(
            "id" => $id,
            "text" => $name
        );
        if (!isset($arr_for_remove_duplicated[$name])) {
            $arr_result[] = $arr_tmp;
            $arr_for_remove_duplicated[$name] = 0;
        }
    }
}

echo json_encode($arr_result);