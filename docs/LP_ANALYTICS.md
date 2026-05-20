# Shinba LP Analytics

Shinba Service の公開LPでは、Google Analytics 4 を使って最小限の行動計測を行う。

## Setup

1. Google Analytics 4 で Web data stream を作成する
2. Measurement ID を取得する
   - 形式: `G-XXXXXXXXXX`
3. Cloud Run のフロントエンド環境変数に設定する

```txt
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

LPは `/api/analytics-config` からこの値を読むため、Measurement ID の差し替えは再ビルドなしでも反映できる。

## Tracked Pages

計測対象は公開導線に限定する。

- `/`
- `/report`

ログイン後の管理画面は、現時点ではLP流入分析の対象外。

## Custom Events

| Event | Purpose |
| --- | --- |
| `lp_landing_attribution` | 初回表示時の流入元、UTM、referrerを記録 |
| `lp_scroll_depth` | 25%, 50%, 75%, 90% のスクロール到達 |
| `lp_section_view` | Hero / Why / Mission / Products / Principles / Founder / Next action の閲覧 |
| `lp_cta_click` | 相談、Report遷移、プロダクトカード、ナビクリック |
| `lp_session_end` | 離脱時の最大スクロール深度、最後に見たセクション、滞在秒数 |

## X Post URL

X からの流入は referrer が `t.co` になることがあるため、固定ポストやプロフィールにはUTM付きURLを使う。

```txt
https://shinba.app/?utm_source=x&utm_medium=social&utm_campaign=profile
https://shinba.app/?utm_source=x&utm_medium=social&utm_campaign=pinned_post
```

## Useful GA4 Checks

- Traffic acquisition: `source / medium`
- Events: `lp_scroll_depth`, `lp_section_view`, `lp_cta_click`
- Funnel idea:
  1. `lp_landing_attribution`
  2. `lp_section_view` where section is `products`
  3. `lp_cta_click` where action is `report_click` or `contact_click`
