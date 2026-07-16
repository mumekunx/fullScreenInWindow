- [x] content.js: data-wfs-enabled 属性の反映
- [x] injected.js: 無効時のネイティブフォールバック
- [x] popup.js: 全タブへブロードキャスト
- [x] node --check で構文確認
- [x] detail.md 作成
- [x] update.md 完了マーク

## YouTubeでフルスクリーンが真っ黒になるバグの修正
- [x] content.js: enter() に isRoot 分岐追加(<html>/<body> はオーバーレイ/.wfs-active を使わず wfs-root クラスのみ付与)
- [x] content.css: html.wfs-root 用の黒背景ルール追加
- [x] Playwright 検証(YouTube 実ページ + 単純プレイヤー)
