# app-itonami-mold-allergy — Mold Allergy

カビアレルギー研究ノート — 真菌アレルゲンの目録、舌下免疫療法（SLIT）錠の設計案、安全性の観察を記録します。研究の記録用で、医療上の助言や用量の推奨はしません。

Tauri **3.0.0-alpha.6** の独立 app（`tauri-runtime-wry`、OS の WebView）と、同じファイルの static Web ビルドです。記録はすべてこの端末の中（localStorage、key `itonami.mold-allergy.v1`）に保存し、外部へは通信しません。外部操作の宣言もありません（`dist/descriptor.json` の `operations: []`）。保存に失敗したときは画面に表示します。

## できること

| 操作 | 内容 |
| --- | --- |
| アレルゲンを登録 (registerAllergen) | — |
| アレルゲンの一覧 (listAllergens) | — |
| 錠剤の設計案 (designFormulation) | 登録済みのアレルゲンだけ使えます。build-up は 1〜16 週、維持は 1〜5 年。 |
| 安全性の観察 (recordSafetyObservation) | WAO grade 0〜5。grade 3 以上か全身反応で、設計目標（grade 1–2 の局所反応まで）を外れたとして設計案に印を付けます。 |
| 設計案を見る (getFormulation) | — |
| 既定のアレルゲンを読み込む | CLAUDE.md の表にある 6 属種 13 分子を登録します。 |

記録（collection）: `cloud.itonami.apps.moldAllergy.allergen`、`cloud.itonami.apps.moldAllergy.formulation`、`cloud.itonami.apps.moldAllergy.safetyObservation`

## 補足

- **この domain は新しく設計したものです。** 旧 Worker は処理を外部の AgentGateway / LangServer に転送していて、処理の中身はこの repository にありませんでした。旧 Worker の method 名・README・BPMN をもとに、この端末だけで動く domain を作りました。旧サービスと同じ挙動である保証はありません。
- **研究の記録用です。医療上の助言や用量の推奨はしません。** 設計案の範囲（build-up 1〜16 週、維持 1〜5 年、単位 JAU / SQ-U）と安全性の目標（WAO grade 1–2 の局所反応、全身反応なし）は `CLAUDE.md` の研究範囲から取りました。
- 「既定のアレルゲンを読み込む」は `CLAUDE.md` の表（6 属種 13 分子）を登録します。kDa は表にある Alt a 1（15 kDa）だけ入れています。
- `CLAUDE.md` にある患者の記録（patientProfile）や試験計画などの record type は作っていません。患者の情報（Tier 3）を扱うには、同意と保護の設計が先に必要です。
- 旧 `appview/.../cljs/`（UI）と `kotodama.jsonld` は残しています。

## 構成

| パス | 役割 |
| --- | --- |
| `src/domain/` | domain logic（TypeScript）。ビルド時に Node の type stripping で JS にします（bundler・依存なし） |
| `src/local-store.js` | この端末内の record store。domain が使う `read` / `write` を localStorage で実装 |
| `src/app-def.js` | 画面の操作と domain 関数・collection の対応 |
| `src/ui/` | 依存なしの UI。DOM はテキストノードだけで組み、HTML 文字列を使いません（CSP `style-src 'self'`） |
| `vendor/` | kotoba-lang/kotoba の `kotoba-client-runtime.js` / consent CSS と `PINS.json`。`scripts/build.mjs` が digest のずれで失敗します |
| `src-tauri/` | Tauri v3 host。read-only command は `awai_host_info` の 1 つだけ。filesystem・network・shell・installer 権限なし |
| `appview/` | 旧 appview（Svelte / cljs UI）。この app のビルド・テストでは使いません |

## コマンド

```sh
npm ci
npm test              # build してから domain と local-only のテスト（local-only.test.mjs, mold-allergy.test.ts）
npm run build         # dist/ と SHA-256 の release.json
npm run build:desktop # native desktop 実行ファイル（bundle・署名なし）
```

## 状態と制限（AWAI-3079, 2026-11-17）

- 旧構成（Cloudflare Worker の XRPC dispatcher / adapter、`wrangler.jsonc`、`@etzhayyim/sdk`）は削除しました。履歴は git にあります。
- 検証済み: `npm test`、`npm run build`、`cargo check`（Tauri 3.0.0-alpha.6）。
- 未検証: native window の起動、`tauri build`、Android、署名、配布。アイコンは app-soshiki の仮アイコンです。
