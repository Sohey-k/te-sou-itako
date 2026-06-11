# 🔮 手相イタコ占いアプリ - 基本設計書

## 概要

本ドキュメントは、「手相イタコ占いアプリ」のシステム設計に関する基本事項を記述します。
全体のシーケンス、データ構造、API仕様を明確にすることで、開発の指針とします。

---

## 1. 全体シーケンス図

ユーザーが手相画像をアップロードしてから、イタコ占い結果が表示されるまでの一連の流れをMermaid記法で記述します。

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant CloudFunctions_Analyzer as Cloud Functions (Analyzer)
    participant GeminiVisionAPI as Gemini Vision API
    participant Firestore
    participant CloudFunctions_Itako as Cloud Functions (Itako)
    participant GeminiAPI as Gemini API

    User->>Frontend: 手相画像をアップロード
    Frontend->>CloudFunctions_Analyzer: 画像データ (base64) を送信
    CloudFunctions_Analyzer->>GeminiVisionAPI: 画像を送信し手相解析を依頼
    GeminiVisionAPI-->>CloudFunctions_Analyzer: 手相特徴JSONを返却
    CloudFunctions_Analyzer->>Firestore: 手相特徴JSONを保存
    CloudFunctions_Analyzer-->>Frontend: 解析完了通知 (またはID)

    User->>Frontend: キャラクターを選択し占い開始
    Frontend->>CloudFunctions_Itako: 手相特徴IDとキャラクター情報を送信
    CloudFunctions_Itako->>Firestore: 手相特徴JSONを取得
    CloudFunctions_Itako->>GeminiAPI: キャラプロンプト + 手相特徴JSONを送信し占い結果を依頼
    GeminiAPI-->>CloudFunctions_Itako: イタコ占い結果テキストを返却
    CloudFunctions_Itako-->>Frontend: イタコ占い結果テキストを返却
    Frontend->>User: イタコ占い結果を表示
```

---

## 2. Firestore データ構造（スキーマ）

アプリで使用するFirestoreのコレクションとドキュメントのデータ構造を定義します。

### コレクション: `readings`

手相解析結果と占い結果を保存するコレクション。

| フィールド名 | 型 | 説明 | 例 |
|---|---|---|---|
| `id` | string | ドキュメントID (自動生成) | `reading_abc123` |
| `timestamp` | timestamp | 作成日時 | `2026-06-01T10:00:00Z` |
| `handImageRef` | string | 手相画像のストレージパス | `readings/reading_abc123/hand_image.jpg` |
| `analysisResult` | map | Gemini Vision APIによる手相解析結果 | `{ "lifeLine": "long", "headLine": "clear", ... }` |
| `character` | string | 選択されたイタコキャラクター | `徳川家康` |
| `itakoResult` | string | イタコ占い結果テキスト | `そなたの運命はかくかくしかじかである...` |
| `status` | string | 処理ステータス (`pending`, `analyzed`, `completed`, `error`) | `completed` |

---

## 3. Cloud Functions API仕様

Cloud Functionsのエンドポイント、入力、出力を定義します。

### 3.1. 手相解析API

-   **関数名:** `analyzeHand`
-   **エンドポイント:** `/api/analyzeHand` (例: `https://your-project-id.cloudfunctions.net/analyzeHand`)
-   **HTTPメソッド:** `POST`

#### 入力 (Request Body)

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `imageData` | string | Yes | Base64エンコードされた手相画像データ |

#### 出力 (Response Body)

| フィールド名 | 型 | 説明 | 例 |
|---|---|---|---|
| `success` | boolean | 処理の成功/失敗 | `true` |
| `readingId` | string | 新規作成された手相解析結果のドキュメントID | `reading_abc123` |
| `message` | string | 処理結果メッセージ | `Hand analysis initiated successfully.` |
| `error` | string | エラー発生時のエラーメッセージ | `Invalid image data.` |

---

### 3.2. イタコ占いAPI

-   **関数名:** `getItakoReading`
-   **エンドポイント:** `/api/getItakoReading` (例: `https://your-project-id.cloudfunctions.net/getItakoReading`)
-   **HTTPメソッド:** `POST`

#### 入力 (Request Body)

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `readingId` | string | Yes | 解析済みの手相結果のドキュメントID |
| `character` | string | Yes | 選択されたイタコキャラクター名 |

#### 出力 (Response Body)

| フィールド名 | 型 | 説明 | 例 |
|---|---|---|---|
| `success` | boolean | 処理の成功/失敗 | `true` |
| `itakoResult` | string | イタコ占い結果のテキスト | `そなたの運命はかくかくしかじかである...` |
| `message` | string | 処理結果メッセージ | `Itako reading generated successfully.` |
| `error` | string | エラー発生時のエラーメッセージ | `Reading not found.` |
