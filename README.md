
## 環境構築
test.cgiの冒頭

`#!/usr/bin/perl`

はperlへのpathで書き直す．
例

```
$ which perl
/usr/bin/local/perl
```

なら
`#!/usr/bin/local/perl`
に．

phpとcgiを動かすので、apache等のサーバ環境上で動かす必要がある．
また，cgi動作のためにサーバの設定が必要．

apacheであれば，httpd.confにて

```
    Alias /projectdir_cgi-bin/ "/path/to/DocumentRoot/projectdir/cgi-bin"
    <Directory "/path/to/DocumentRoot/projectdir/cgi-bin">
        Options ExecCGI
    </Directory>
```

を追加する．Aliasの後の/projectdir_cgi-bin/は他のAliasと重ならなければ適当な名前で良いと思われる．


## 出力
saveのボタンを押した際の出力．
  1行目 => "ノード数"
  2行目以降(各ノードの情報) => "id,ラベル,種類,親id,子の数,子のidリスト"

example:
  4
  0,炒める,process,null,3,[1,1,1,]
  1,たまねぎ,food,0,0,[]
  2,じゃがいも,food,0,0,[]
  3,にんじん,food,0,0,[]