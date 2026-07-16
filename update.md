## 2026-07-17 — ボタン置換を維持した一般公開向けリスク低減

### 変更内容
- サイトのフルスクリーンボタンをウィンドウ内表示へ切り替える方式は維持
- `<all_urls>`の常時content scriptを廃止し、`activeTab` + `scripting`で現在のタブだけ明示的に有効化
- OFF時に上書きしたFull Screen APIとdocumentプロパティをネイティブ状態へ復元
- 独自操作バーを廃止し、サイトUIを覆う範囲を縮小
- 特定サービス名と全サイト対応保証を削除
- `PRIVACY.md`、`PUBLISHING.md`、`LICENSE`を追加
- バージョンを1.1.0へ更新

### 残作業
- Chrome、Edge、FirefoxでON/OFF、フルスクリーンボタン、Esc、API復元を実機確認
- ストアの開発者情報、プライバシーポリシーURL、データ申告を設定
- 宣伝対象サイトごとの最新規約確認と必要に応じた許諾取得

✅ 実装完了（公開前テスト待ち）

## 2026-07-16 19:45 — YouTubeでフルスクリーンが真っ黒になるバグの修正

### 立案
- 依頼内容: On にしてフルスクリーンすると画面が真っ黒になる(YouTube)
- 原因: YouTube は <html> 要素に requestFullscreen を呼ぶため、#wfs-overlay がページ全体を覆い隠す(v1.0.0 からの潜在バグ。トグル修正とは無関係)
- 実装方針: ターゲットが <html>/<body> の場合はオーバーレイと .wfs-active を使わず、黒背景クラス wfs-root のみ適用してサイト自身のフルスクリーンレイアウトに任せる
- 影響範囲: content.js / content.css

### 進捗
- 完了: content.js の enter/cleanup 分岐、content.css の wfs-root ルール追加
- Playwright で YouTube 実ページ + 単純プレイヤーの両方を検証、全ステップ正常
  - YouTube(<html> がフルスクリーンターゲット): 動画が正しくウィンドウフルスクリーン表示(修正前は真っ黒)。Esc・「✕ 終了」ボタン・Off→On トグルサイクルも全て正常
  - 通常プレイヤー(要素ターゲット): 従来どおりオーバーレイ + .wfs-active で動作、回帰なし

✅ 完了

## 2026-07-16 19:22 — On/Offトグルが効かないバグの修正

### 立案
- 依頼内容: ポップアップの On/Off ボタンが効かない
- 原因: injected.js が有効/無効状態を知らず、無効時もネイティブ requestFullscreen へフォールバックしない
- 実装方針: data-wfs-enabled 属性で状態をページへ伝達し、無効時はネイティブ実装へフォールバック。Off切替時の状態不整合(cleanup(false)→true)と全タブへのブロードキャストも修正
- 影響範囲: content.js / injected.js / popup.js

### 進捗
- content.js: reflect() 追加、data-wfs-enabled 属性を documentElement に反映。WFS_SET_ENABLED ハンドラで reflect() 呼び出し + cleanup(true) に修正
- injected.js: disabled() ヘルパー追加。requestFullscreen / webkitRequestFullscreen は data-wfs-enabled="false" 時にネイティブ実装へフォールバック
- popup.js: トグル変更時に全タブへ WFS_SET_ENABLED をブロードキャスト(content script 未注入タブへの送信エラーは catch で無視)
- detail.md 新規作成

### 残課題
- ブラウザでの手動動作確認(拡張機能の再読み込み → Off で通常フルスクリーン、On でウィンドウフルスクリーンになること)はユーザーが実施

✅ 完了(手動動作確認待ち)
