# ファイル構成ドキュメント

## manifest.json

常時実行する`content_scripts`と`<all_urls>`権限を使用せず、ユーザー操作を起点とする`activeTab`と`scripting`だけを要求します。`injected.js`はHTTP/HTTPSページから読み込める同梱リソースとして宣言します。

## popup.html / popup.css / popup.js

現在のタブだけをON/OFFするUIです。ON操作時に`content.css`と`content.js`を挿入します。状態は別タブ、ページ再読み込み後、ページ移動後には引き継ぎません。

## content.js

分離ワールドで動作し、`injected.js`から通知されたフルスクリーン対象要素へ表示用クラスを適用します。OFF時には表示を解除し、ページ側へAPI復元イベントを送ります。

## injected.js

ユーザーが現在のタブでONにした間だけページコンテキストで動作します。`requestFullscreen`と`exitFullscreen`を置き換え、サイトが参照する`document.fullscreenElement`を一時的に再現します。OFF時には保存したネイティブ関数とプロパティ記述子を復元します。

## content.css

対象要素をブラウザ表示領域へ広げます。独自の操作バーやクリック可能なUIは追加しません。

## PRIVACY.md / PUBLISHING.md / LICENSE

データの取り扱い、ストア公開時の説明と確認事項、ソフトウェアライセンスを記載します。
