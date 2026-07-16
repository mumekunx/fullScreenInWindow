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
