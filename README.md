# LUMIE SKIN LP

架空のスキンケアブランド「LUMIE SKIN」の自主制作ポートフォリオです。実際の商品販売・決済・個人情報の収集は行いません。

公開URL: https://bon214.github.io/lumie-skin-lp/

## ファイル

- `index.html`: 公開用トップページ（日本語・ページタイトル・共有用メタ情報を追加）
- `LUMIE SKIN LP.dc.html`: 元の制作ファイル
- `support.js`: HTMLテンプレートの描画と動作に必要なランタイム
- `lumie-logo.svg`: 表示用ロゴ
- `uploads/LUMIE SKIN logo.svg`: 元のロゴ素材
- `.nojekyll`: 静的ファイルをそのまま配信する設定

## 公開と更新

GitHub Pages の「Deploy from a branch」で `main` ブランチのルート `/` を公開します。公開ページの修正は `index.html` に反映してください。`main` に変更をコミットすると自動で再公開されます。

公開リポジトリと標準のGitHub Pagesを使用します。有料プラン・独自ドメイン・有料サービスは使用していません。

## 外部依存

React 18.3.1、ReactDOM 18.3.1、Babel 7.29.0 は既存の `support.js` により unpkg から読み込みます。書体はGoogle Fontsを使用します。外部CDNへのアクセスが必要です。

## 確認する動作

スマートフォン用メニュー、ページ内リンク、FAQの開閉、購入デモの表示・終了、画面幅に応じたレイアウト。

## 商品画像

`assets/images/` にAI生成の商品写真・日常シーン・美容液の接写を保存しています。架空商品のイメージであり、実物の撮影写真ではありません。生成条件は `assets/IMAGE-PROMPTS.md` を参照してください。

## アニメーション

`motion.js` と `motion.css` で、導入テキストの段階表示、スクロール時のフェード、写真のマスク展開と微細なズーム・光の変化、FAQ・メニュー・購入デモの表示アニメーションを実装しています。新しい外部ライブラリや有料サービスは使用しません。

端末の `prefers-reduced-motion` 設定にリアルタイムで対応し、制作ファイルの `animate: false` でも停止できます。停止時とJavaScriptの不具合時にも本文を隠さない設計です。

検証: PC・390px幅での表示、FAQとモバイルメニュー、設定変更時の停止・再開と後処理を確認。
