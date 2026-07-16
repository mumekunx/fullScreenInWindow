# ファイル構成ドキュメント

このドキュメントは各ファイルの「何があるか」を示すリファレンスです。

---

## manifest.json

### 役割
拡張機能の設定ファイル（Manifest V3, Chrome / Firefox 対応）。アイコン・ポップアップ・content script・web accessible resources・権限を定義する。

### 主要な設定項目
- `action.default_popup`: `popup.html` をツールバーアイコンのポップアップとして指定
- `content_scripts`: `content.js` + `content.css` を `<all_urls>` に `document_start` タイミングで注入
- `web_accessible_resources`: `injected.js` をページ側（page world）から読み込み可能にする
- `permissions`: `storage`（ON/OFF 設定の保存に使用）

---

## content.js

### 役割
拡張機能の分離ワールド（isolated world）で動作するメインスクリプト。`injected.js` の注入、ウィンドウ内フルスクリーンのオーバーレイ UI（終了ボタン・バッジ）管理、Esc キー処理、ポップアップからの ON/OFF メッセージ受信を担当する。

### 主要な変数・関数
- `enabled`: 拡張機能が有効かどうかのフラグ（`storage.sync` の `wfsEnabled` から初期化）
- `active` / `target` / `overlay` / `controls` / `timer`: ウィンドウフルスクリーンの状態と関連 DOM 要素
- `reflect()`: `document.documentElement.dataset.wfsEnabled` に現在の `enabled` 値を文字列として反映する。`injected.js`（page world）が `data-wfs-enabled` 属性を同期的に読み取れるようにするための橋渡し
- `inject()`: `injected.js` を `<script>` タグとしてページに注入する（多重注入防止のため `[data-wfs]` の存在をチェック）
- `window` イベントリスナー `__wfs_enter__`: `injected.js` からの「フルスクリーン開始」通知を受け、対象要素の `wfsId` を検証（`/^wfs-\d+$/`、`CSS.escape` で XSS 対策）した上で `enter()` を呼ぶ
- `window` イベントリスナー `__wfs_exit__`: `injected.js` からの「フルスクリーン終了」通知を受け、`active` なら `cleanup(false)` を呼ぶ（`injected.js` 側は既にリセット済みのため通知は不要）
- `enter(el)`: オーバーレイ（`#wfs-overlay`）とコントロール UI（`#wfs-controls`、終了ボタン付き）を DOM API で構築（`innerHTML` 不使用、XSS 対策）し、対象要素に `wfs-active` クラスを付与してウィンドウフルスクリーン状態にする
- `show()`: コントロール UI を表示し、3秒後に自動で隠すタイマーをセット
- `onMove()`: マウス移動時にコントロール UI を再表示する
- `cleanup(notify)`: フルスクリーン状態を解除し、オーバーレイ・コントロール DOM を削除する。`notify` が真なら `__wfs_exit_from_content__` イベントを発火し、`injected.js` 側の `active`/`fullscreenElement` スプーフィング状態もリセットさせる
- `api.runtime.onMessage` リスナー: `WFS_SET_ENABLED` メッセージを受信すると `enabled` を更新し、`reflect()` で `data-wfs-enabled` 属性を同期。無効化かつフルスクリーン中なら `cleanup(true)` を呼び、`injected.js` 側の状態も確実にリセットする
- `keydown` リスナー: `Escape` キー押下時、フルスクリーン中なら `cleanup(true)` を呼ぶ

---

## injected.js

### 役割
ページのメインワールド（page world）で動作するスクリプト。`Element.prototype.requestFullscreen` / `webkitRequestFullscreen` および `Document.prototype.exitFullscreen` / `webkitExitFullscreen` を上書きし、OS レベルのフルスクリーンをブロックしてカスタムイベント経由で `content.js` にウィンドウフルスクリーンを依頼する。拡張機能が無効の場合はネイティブ実装にフォールバックする。

### 主要な変数・関数
- `_sym` (`Symbol('wfs')`): 二重実行防止用のガード（`window[_sym]`）
- `_reqFS` / `_wkReqFS` / `_exitFS` / `_wkExit`: 上書き前に保存したネイティブの `requestFullscreen` / `webkitRequestFullscreen` / `exitFullscreen` / `webkitExitFullscreen` の参照。無効時のフォールバック呼び出しに使う
- `active` / `target` / `counter`: スプーフィングしているフルスクリーン状態、対象要素、ID 採番カウンタ
- `patchProps(el)`: `document.fullscreenElement` / `webkitFullscreenElement` / `fullscreenEnabled` / `webkitFullscreenEnabled` を `active` 状態に応じて返すよう `Object.defineProperty` で上書きする
- `fireChange(el)`: `fullscreenchange` / `webkitfullscreenchange` イベントを `document` と対象要素に発火する
- `enter(el)`: `active` を true にし、対象要素に一意な `data-wfs-id`（`wfs-N`）を付与、`patchProps` 実行後、`__wfs_enter__` カスタムイベントを `content.js` へ発火してウィンドウフルスクリーン化を依頼する
- `exit()`: `active` を false に戻し、`fullscreenElement` 系プロパティを `null` を返すよう再定義、`__wfs_exit__` イベントを発火する
- `disabled()`: `document.documentElement.getAttribute('data-wfs-enabled') === 'false'` を返す。`content.js` の `reflect()` が書き込む属性を同期的に読み取り、拡張機能が無効かどうかを判定する
- `Element.prototype.requestFullscreen` の上書き: `disabled()` が true ならネイティブ `_reqFS` を呼び出してフォールバックし、そうでなければ `enter(this)` でスプーフィングする
- `Element.prototype.webkitRequestFullscreen` の上書き（`_wkReqFS` が存在する場合のみ）: 同様に `disabled()` でネイティブ `_wkReqFS` にフォールバックする
- `Document.prototype.exitFullscreen` / `webkitExitFullscreen` の上書き: `active` ならスプーフィングを `exit()` で解除、そうでなければネイティブ実装を呼ぶ
- `window` イベントリスナー `__wfs_exit_from_content__`: `content.js` の `cleanup(true)` から発火され、`exit()` を呼んでスプーフィング状態をリセットする（Off 切替時の状態不整合を防ぐ）
- `keydown` リスナー: `Escape` キー押下時、`active` なら `exit()` を呼ぶ

---

## popup.html

### 役割
ツールバーアイコンをクリックした際に表示されるポップアップの UI マークアップ。ON/OFF トグル、現在の状態表示カード、説明文、ショートカット案内を含む。

### 主要な要素
- `#tog`: 有効/無効を切り替えるチェックボックス（トグルスイッチ）
- `#dot`: 状態を示す小さなインジケータ（ON=緑, OFF=赤）
- `#st`: 状態テキスト（「有効 – フルスクリーンを乗っ取り中」/「無効 – 通常のフルスクリーン」）
- `#card`: 状態表示カード全体（`on`/`off` クラスでスタイル切替）
- CSP メタタグでインラインスクリプト・外部リソースを禁止（`popup.js` を `<script src>` で読み込み）

---

## popup.js

### 役割
`popup.html` の UI ロジック。保存された ON/OFF 設定の読み込み・表示反映、トグル操作時の設定保存と全タブへの状態通知を行う。

### 主要な変数・関数
- `api`: `browser`（Firefox）または `chrome`（Chromium系）の WebExtension API 参照
- `tog` / `dot` / `st` / `card`: `popup.html` 内の対応 DOM 要素
- 初期化処理: `api.storage.sync.get(['wfsEnabled'], ...)` で保存済み設定を読み込み、`setUI()` に反映（未設定時はデフォルトで有効）
- `tog` の `change` イベントリスナー: チェック状態を `wfsEnabled` として `storage.sync` に保存し、`setUI()` で UI を即時更新した上で、`api.tabs.query({})` により**開いている全タブ**を取得し、各タブへ `WFS_SET_ENABLED` メッセージを送信して拡張機能の有効/無効を反映させる（content script が未注入のタブへの送信エラーは `.catch(() => {})` で無視）
- `setUI(on)`: `on` の真偽値に応じてトグルのチェック状態、ドットの色クラス、状態テキスト、カードのクラスを更新する

---

## popup.css

### 役割
`popup.html` のスタイル定義。ダークテーマのカード型 UI、グラデーションアイコン、トグルスイッチのアニメーション、ON/OFF 状態に応じた配色を定義する。

### 主要な定義
- `:root` の CSS カスタムプロパティ: 背景色 (`--bg`)、サーフェス色 (`--sur`)、テキスト色 (`--tx`/`--tx2`)、グラデーション (`--gr`)、状態色 (`--grn`=緑/`--red`=赤)
- `.toggle` / `.track` / `.thumb`: トグルスイッチの見た目とチェック時のアニメーション（スライド + 発光）
- `.card` / `.card.on` / `.card.off`: 状態カードの ON/OFF 別配色
- `.dot` / `.dot.on`（`@keyframes p` でパルスアニメーション）/ `.dot.off`: 状態インジケータのスタイル
- `.sc` / `kbd`: ショートカット案内のスタイル

---

## content.css

### 役割
`content.js` が生成するウィンドウフルスクリーン用オーバーレイ・コントロール UI、および対象要素（動画など）のフルスクリーン表示スタイルを定義する。すべて `!important` で既存ページのスタイルを上書きする。

### 主要な定義
- `html.wfs-lock`: ページ全体のスクロールを禁止（`overflow:hidden`）
- `#wfs-overlay`: 画面全体を覆う黒背景のオーバーレイ（`z-index:2147483640`）
- `.wfs-active`: フルスクリーン対象要素を `position:fixed` で画面いっぱいに表示するスタイル（`z-index:2147483645`）
- `video.wfs-active`: 動画要素の `object-fit:contain` 指定
- `#wfs-controls` / `.wfs-on`: 上部に表示される操作バー。通常は非表示（`opacity:0`）、`wfs-on` クラス付与時にフェードイン（`z-index:2147483647`）
- `#wfs-controls-inner`: バッジと終了ボタンを左右に配置するフレックスレイアウト
- `#wfs-badge`: 「Window Fullscreen」を示すバッジのスタイル
- `#wfs-exit-btn`: 終了ボタンのスタイルとホバー効果

---

## README.md

### 役割
プロジェクトのトップレベル説明文書。インストール手順（Chrome/Edge, Firefox）、使い方、ON/OFF 切り替え方法、仕組みの概要、対応ブラウザ、ライセンスを記載する。

### 主要な内容
- インストール手順（Chromium系・Firefox それぞれの手順）
- 使い方とコントロール一覧（Esc キー、マウス操作、拡張機能アイコン）
- 拡張機能の有効/無効の説明
- 仕組み表（各ファイルの役割を簡潔に説明）
- 対応ブラウザ一覧（Chrome 88+, Edge 88+, Firefox 109+）
- ライセンス（MIT）
