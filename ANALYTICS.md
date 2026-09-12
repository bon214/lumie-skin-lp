# LUMIE SKIN — GA4運用・導入手順

## 管理情報

- アカウント: Bonnu
- 専用プロパティ: LUMIE SKIN（553894011、標準・無料）
- ウェブストリーム: LUMIE SKIN Web（15763519640）
- 測定ID: `G-M807Z04C4J`
- 対象: `https://bon214.github.io/lumie-skin-lp/` のLPと制作解説
- 既存のportfolioプロパティのID `G-LZC3WN36TM` はこのサイトに使用しない。
- GitHub Pagesを継続使用。Analytics 360、BigQuery、広告サービスへの連携なし。

## GA4管理画面の設定

1. プロパティのタイムゾーン: 日本、通貨: JPY。
2. データ保持: イベント・ユーザーデータを14か月。
3. このストリームの拡張計測はオフ。
   - ページビューは `send_page_view: false` とし、サイト側で1回送信する。
   - 自動更新によるPVとスクロールの重複を避けるため、`page_view` と90%到達時の `scroll` はサイトで管理する。
   - 履歴変更、スクロール、フォームの拡張計測を別途有効にしない。
   - セッション・ユーザー等の基本計測はGoogleタグが行う。
4. データフィルタ: 開発者トラフィックの除外を有効化してから、公開先のDebugView検証を行う。
5. 任意の詳細分析用に、イベントスコープのカスタムディメンション `placement` を登録する。
6. デモ操作を `purchase` に変換しない。売上・実受注のキーイベントに設定しない。

## 閲覧者の同意と制作者除外

`privacy.html` は常に非計測。ここで同意・同意撤回と制作者用の除外を変更できる。
本番の各ブラウザで「このブラウザを計測から除外する」を選ぶ。通常ブラウザ・スマートフォン・別プロファイルごとに設定する。

除外のショートカット（一般公開・営業用のリンクには使わない）:

`https://bon214.github.io/lumie-skin-lp/privacy.html?analytics=off`

- 初回PVの前に除外を判定。除外中はGoogleタグを読み込まない。
- 同意しない・未選択の状態でも送信しない。Cookieを使わないpingも送信しない。
- localStorageのキーは `lumie-skin:analytics-preferences:v1`。保存できない場合は計測停止。
- 同じオリジンのタブ間はstorageイベントで反映。同じGitHub Pagesホストの他作品とは保存キーを分ける。
- 除外設定は回線を変更しても適用。ブラウザ保存データの削除・プライベートブラウズ終了後は再設定する。
- 同意撤回はGA送信停止・未送信キュー破棄・当サイト用Cookie削除を行う。新しい同意で再開する際はページ再読込する場合がある。
- GoogleタグのCookieには `lumie` プレフィックスとサイトのパスを指定し、他作品のCookieと分離する。
- IP除外は未設定。共有回線の一般閲覧者を巻き込まないため、必要時のみ補助として追加する。

## イベント

| イベント | 条件 | パラメータ |
|---|---|---|
| page_view | 同意した通常閲覧者の初回表示 | 正規化したpage_location / page_referrer |
| scroll | ページの90%まで初めてスクロール | percent_scrolled: 90 |
| view_product_price | 商品・価格へのボタン | placement: header / mobile_menu / hero / footer |
| view_case_study | 制作解説へのリンク | placement: footer |
| open_purchase_demo | 購入デモを開くボタン | placement: product / closing / sticky |
| view_landing_page | 制作解説からLPへ戻る主要ボタン | placement: content |

入力値・自由文・個人識別子をイベントへ渡さない。広告用途は無効。
URLはindex.htmlをディレクトリURLへ統一し、ハッシュ・リリース用パラメータ・任意のクエリを除去。
`utm_source` / `utm_medium` / `utm_campaign` / `utm_content` の英数字・ハイフン・アンダースコア（80文字以内）だけを保持する。

クラウドワークス掲載例:

`https://bon214.github.io/lumie-skin-lp/?utm_source=crowdworks&utm_medium=referral&utm_campaign=portfolio`

## 更新時の重複防止

site-update.jsが移動直前に `LumieAnalytics.prepareUpdate(target)` を呼ぶ。
sessionStorageに対象URL・時刻・送信済みフラグを保存し、2分以内に一致する更新先が開いたとき1度だけ消費する。
通常リロード、他ページへの遷移、単にリリース用URLを開いた人のPVは除外しない。
保存を利用できない場合の重複防止には制約がある（localStorageも使えない環境では計測自体を停止）。
更新検知によるfetchはJavaScriptを実行しないので計測対象にならない。

## 検証方法

- 自動テスト: `node --test tests/*.test.cjs`
- localhost、異なるオリジン、対象外パスではGoogleタグを読み込まない。
- 自動ブラウザの `navigator.webdriver === true` または事前設定 `window.__LUMIE_ANALYTICS_TEST__ = true` でも送信停止。
- 公開先の通常のUI検証は必ず除外設定を先に保存。汎用的な「AIアクセス自動識別」には依存しない。
- 計測そのものの検証は、開発者除外フィルタが有効であることを確認し、専用タブで `?analytics_debug=1` を付けてから同意する。DebugViewでイベントを確認し、終了時に上記の除外リンクを開く。
- debugパラメータは次のページには引き継がない。計測検証中に制作解説へ移る場合も、明示的にdebug付きURLを開く。
- 通常レポートに反映されるまで時間がかかる。広告ブロックや非同意による未計測分があるため、全アクセスの完全な件数ではない。

## 次の自主制作サイトへの導入

1. 同じ所有者のアカウント内に、その作品専用の無料プロパティ・ウェブストリームを作る。
2. analytics-config.jsの測定ID・公開オリジン・ベースパス・保存キーを変更する。
3. Cookieプレフィックス、対象ページ・リンクのイベントを作品に合わせて変更する。
4. 初期化前に除外できる読み込み順を維持し、各ページに設定ページへのリンクを付ける。
5. GA4管理画面の設定・除外・重複・モバイル表示・DebugView受信を検証して公開する。
6. 受託案件はクライアント所有アカウントで管理し、自主制作のデータと混ぜない。

参考: https://developers.google.com/tag-platform/security/guides/privacy
参考: https://developers.google.com/analytics/devguides/collection/ga4/views
参考: https://support.google.com/analytics/answer/7667196?hl=ja
