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
## 一般公開前のリスク低減（ボタン置換を維持）
- [x] 全サイト常時実行を廃止
- [x] `activeTab`による現在タブ限定の有効化
- [x] OFF時にFull Screen APIをネイティブ状態へ復元
- [x] 独自オーバーレイ操作UIを廃止
- [x] 特定サービスの対応保証表現を削除
- [x] プライバシーポリシーと公開チェックリストを追加
- [x] ライセンス本文を追加
- [ ] Chrome / Edge / Firefoxでの実ブラウザ試験
- [ ] ストア掲載情報と開発者連絡先の設定
- [ ] 宣伝対象サイトごとの最新規約確認
