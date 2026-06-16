# 🔮 手相イタコ占いアプリ 開発ログ

> GeminiAPI × Firebase × Aider で爆速プロトタイプを作る

---

## 概要

| 項目 | 内容 |
|------|------|
| アプリ名 | 手相イタコ占い（Te-Sou Itako） |
| 開発期間 | 2026年6月〜 |
| 構成 | React + Firebase Hosting + Cloud Functions (Python) + Gemini API |
| 開発エージェント | Aider（Gemini 2.5 Flash） |
| コスト | 実質2000円（API前払い） |

### アーキテクチャ

```
📸 手相画像（スマホ撮影 or アップロード）
    ↓
⚡ Cloud Functions Python①：Gemini Vision API → 手相解析JSON
    ↓
🗄️ Firestore：JSON保存
    ↓
⚡ Cloud Functions Python②：キャラプロンプト + JSON → イタコ出力
    ↓
🎭 フロントエンド（React + Firebase Hosting）
```

### イタコキャラクター（初期リリース）

| キャラクター | 口調 |
|-------------|------|
| 徳川家康 | 重厚・忍耐・武士語 |
| 織田信長 | 断言・傲慢・天下布武 |
| アインシュタイン | 論理・相対性理論的表現 |
| 卑弥呼 | 神秘・古語・霊的表現 |

---

## 開発環境

- OS：Windows 11 + WSL2（almalinux）
- エディタ：VSCode
- 開発エージェント：Aider Glaude Gmemini 2.5 Flash
- AIバックエンド：Gemini API（無料枠）

---

## Step 1：GitHubリポジトリ作成 & クローン

### 1. GitHubでリポジトリ作成

- リポジトリ名：`te-sou-itako`
- 公開設定：Public（ポートフォリオとして公開）
- Add .gitignore：**Node を選択**（node_modules等が自動で除外される）
- README.md：後で追加

### 2. WSL2にクローン

GitHubでリポジトリ作成後、クローンするだけでOK。
`git init` も `git remote add` も不要（clone が自動でやってくれる）。
※やってくれませんでした💦
git push する場合、最初の1回だけ `git remote add origin <URL>` が必要です。

```bash
cd ~/projects
git clone https://github.com/Sohey-k/te-sou-itako.git
cd te-sou-itako
```

### 3. .gitignoreに.envを追記

GitHubのNodeテンプレートは`node_modules/`等を網羅しているが、
`.env`はプロジェクトによって異なるため**手動で追記が必要**。

```bash
echo ".env" >> .gitignore
```

> **注意：APIキーは絶対に .env に入れてコミットしない！**

---

## Step 2：Gemini APIキー取得

### 1. Google AI Studioにアクセス

- [https://aistudio.google.com](https://aistudio.google.com) にログイン
- 左メニューの「Get API key」をクリック
- 「Create API key」でキー発行

### 2. .envファイルに保存

`.bashrc`に書くと全プロジェクト共通になってしまうため、
プロジェクトごとに`.env`で管理するのがベストプラクティス。

```bash
echo "GEMINI_API_KEY=AIzaSyあなたの本物のキー" > .env
```

> **注意：`.env`は既に`.gitignore`に追記済みなのでコミットされない。必ず確認！**

### 3. 動作確認

```bash
cat .env
```

---

## Step 3：Aiderのインストール

> WSL2環境：AlmaLinux 9

### 1. Python環境を整える

```bash
sudo dnf install -y python3-pip python3-devel
```

### 2. Aiderをインストール

```bash
pip3 install aider-chat
```

> venv（仮想環境）は今回のプロトタイプ開発では不要。

### 3. 動作確認

```bash
aider --version
```

### 4. プロジェクトディレクトリで起動

```bash
cd te-sou-itako

# .envファイルを明示的に指定して起動（GCP環境変数が混在する場合は必須）
aider --model gemini/gemini-2.5-flash --env-file .env
```

> **ポイント：** GCPの開発経験がある環境では`--env-file .env`を明示しないと
> VertexAI経由で接続しようとしてエラーになる場合がある。

---

## Step 4：Firebaseプロジェクト作成

> このステップは手動で実施する（ブラウザ認証が必要なため）

### 1. Firebase CLIインストール

```bash
npm install -g firebase-tools
```

### 2. ブラウザ認証

```bash
firebase login
```

ブラウザが自動で開くのでGoogleアカウントでログイン。
WSL2の場合はURLが表示されるのでコピーしてブラウザに貼り付ける。

### 3. Firebaseプロジェクト初期化

```bash
firebase init
```

選択項目：
- `Functions`（Cloud Functions）→ **Python**を選択
- `Firestore`
- `Hosting`（Firebase Hosting）

### 4. ディレクトリ構成（初期化後）

```
te-sou-itako/
├── docs/              # 設計書
├── functions/         # Cloud Functions（Python）
│   ├── main.py
│   └── requirements.txt
├── public/            # Firebase Hosting
├── firebase.json
├── .firebaserc
└── .gitignore
```

### 完了後の構成

```
te-sou-itako/
├── docs/                    # 設計書
├── functions/               # Cloud Functions（Python）
│   ├── main.py
│   └── requirements.txt
├── public/                  # Firebase Hosting
├── firebase.json            # Firebase設定
├── .firebaserc              # プロジェクト設定
├── firestore.rules          # Firestoreセキュリティルール
├── firestore.indexes.json   # Firestoreインデックス設定
└── .env                     # APIキー（gitignore済み）
```

> **ポイント：** Firebase初期化はブラウザでコンソールからプロジェクトを先に作成してから
> `firebase init` → `Use an existing project` で進むのがスムーズ。
> CLIから新規作成しようとすると403エラーになる場合がある。

---

## Step 5：Cloud Functions実装（analyzeHand・1発合体版）

### 概要

- 入力：手相画像（base64）+ キャラクター名
- 処理：Gemini APIで手相解析とイタコ出力を**1回のAPIコールで同時に実行**
- 出力：analysisResult + itakoResult → Firestoreに保存

### 実装方針

- `functions/main.py` 一枚に`analyzeHand`のみ実装
- **完全な新SDK（google-genai）を使用**し、古い非推奨警告（FutureWarning）をパージ
- **APIのConfigでJSONモード（response_mime_type）を明示指定し、パースエラーを防止**
- CORS設定はFirebase Functions標準のデコレータオプション（cors=...）でセキュアかつ簡潔に自動解決
- すべてのレスポンスは辞書型ではなく https_fn.Response オブジェクトにラップして返却

### functions/main.py

```python
import os
import base64
import json

import firebase_admin
from firebase_admin import credentials, firestore
from firebase_functions import https_fn
from google import genai
from google.genai import types

firebase_admin.initialize_app()
db = firestore.client()

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY環境変数が設定されていません。")

# 最新SDK（google-genai）のクライアント初期化
client = genai.Client(api_key=GEMINI_API_KEY)

@https_fn.on_request(cors=https_fn.CorsOptions(cors_origins=["*"], cors_methods=["POST", "OPTIONS"]))
def analyzeHand(req: https_fn.Request) -> https_fn.Response:
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({'success': False, 'error': 'Method Not Allowed'}), 
            status=405, 
            mimetype='application/json'
        )

    try:
        request_json = req.get_json(silent=True)
        if not request_json or 'imageData' not in request_json:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Invalid request body. "imageData" is required.'}), 
                status=400, 
                mimetype='application/json'
            )

        image_bytes = base64.b64decode(request_json['imageData'])
        character = request_json.get('character', '徳川家康')

        new_reading_ref = db.collection('readings').document()
        reading_id = new_reading_ref.id

        # 画像データとプロンプトのパッキング（新SDKスタイル）
        prompt_parts = [
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            f"Analyze this hand image for palmistry features and provide a fortune telling reading as the character: {character}. Provide only the JSON output."
        ]

        # 明示的なJSONモードをコンフィグで指定して生成
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        try:
            # 新SDKは response.text でストレートに中身を取得可能
            gemini_output_text = response.text
            analysis_result_json = json.loads(gemini_output_text)
        except (json.JSONDecodeError, TypeError):
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Failed to parse Gemini API response as JSON.'}), 
                status=500, 
                mimetype='application/json'
            )

        # Firestoreへ構造化保存
        new_reading_ref.set({
            'timestamp': firestore.SERVER_TIMESTAMP,
            'analysisResult': analysis_result_json.get('analysisResult', analysis_result_json),
            'character': character,
            'itakoResult': analysis_result_json.get('itakoResult', analysis_result_json),
            'status': 'itako_completed'
        })

        return https_fn.Response(
            json.dumps({
                'success': True, 
                'readingId': reading_id, 
                'result': analysis_result_json
            }), 
            status=200, 
            mimetype='application/json'
        )

    except ValueError as ve:
        return https_fn.Response(
            json.dumps({'success': False, 'error': str(ve)}), 
            status=400, 
            mimetype='application/json'
        )
    except Exception as e:
        return https_fn.Response(
            json.dumps({'success': False, 'error': f'Internal Server Error: {str(e)}'}), 
            status=500, 
            mimetype='application/json'
        )
```

### functions/requirements.txt

```
firebase-functions~=0.5.0
firebase-admin>=6.0.0
google-genai>=0.1.0
flask>=3.0.0
python-dotenv>=1.0.0
```

### APIキーの扱い

- **ローカル開発時：** functions/.envから読み込み（詳細はトラブルシューティングを参照）
- **デプロイ時：** Secret Managerに登録してsecureに管理

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

---

## Step 6：バックエンドリファクタリング（1発合体版への移行）

### リファクタリングの背景と成果

初期想定の2回API呼び出し構成から「1発合体版」に移行したことで、インフラ・アプリ性能面で大幅な改善を達成。

- 2回連続コールによるレートリミット（429エラー）の完全回避
- 合計処理時間を30〜40秒へ短縮し、Cloud Functionsのタイムアウトリスクをパージ
- google-genaiへの完全刷新によりFutureWarningを消滅
- クライアント側へは readingId と result（解析＋占い結果）を1つのレスポンスで返すシームレスなパイプラインを確立


### 新しいvenvパッケージインストール

```bash
cd ~/te-sou-itako/te-sou-itako/functions
python3.14 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 動作確認結果

- analyzeHand（1発合体版）：約30〜40秒で完了
- interpretation / advice / future 全フィールド正常に表示
- FutureWarning完全消滅
- Firestoreへの保存も正常完了（status: itako_completed）

---

## Step 7：フロントエンド実装前の準備

フロントエンド実装に入る前に、以下の3つを確認・対応しておく。

### 7-1. マークダウン除去処理の確認

Gemini APIがJSONをマークダウンのコードブロックで囲んで返す場合があるため、
`json.loads()`の前に除去処理を追加する。

```python
gemini_output_text = gemini_output_text.strip()
if gemini_output_text.startswith('```json'):
    gemini_output_text = gemini_output_text[7:]
elif gemini_output_text.startswith('```'):
    gemini_output_text = gemini_output_text[3:]
if gemini_output_text.endswith('```'):
    gemini_output_text = gemini_output_text[:-3]
gemini_output_text = gemini_output_text.strip()
```

確認コマンド：

```bash
grep -n 'strip' ~/te-sou-itako/te-sou-itako/functions/main.py
```

### 7-2. Firestoreセキュリティルールの更新

デフォルトのルール（期限付き全許可）から、Cloud Functions専用に変更する。
フロントエンドはCloud Functions経由でFirestoreを操作するため、
クライアントからの直接アクセスは不要。

```
# firestore.rules
rules_version='2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> **ポイント：** Cloud FunctionsはAdmin SDKを使用するため、
> `if false`のルールに関わらず正常に動作する。

### 7-3. CORSの設定

フロントエンドからCloud Functionsを呼び出す際にCORSエラーが発生するため、
事前に両関数にCORSヘッダーを追加する。

```python
# 両関数の先頭に追加
cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}

# OPTIONSプリフライトリクエストへの対応
if req.method == 'OPTIONS':
    return https_fn.Response('', status=204, headers=cors_headers)

# 全レスポンスに headers=cors_headers を付与
return https_fn.Response(
    json.dumps({...}),
    status=200,
    mimetype='application/json',
    headers=cors_headers
)
```

### 7-4. コミット＆プッシュ

```bash
cd ~/te-sou-itako/te-sou-itako
git add functions/main.py firestore.rules
git commit -m "feat: add CORS headers and update Firestore security rules"
git push origin main
```

---

## Step 8：フロントエンド実装（React）

### 1. Viteでプロジェクト作成

Aiderの`/run`コマンドで実行：

```bash
/run cd ~/te-sou-itako/te-sou-itako && npm create vite@latest frontend -- --template react
```

対話式で以下を選択：
- `y` → パッケージインストール確認
- `Yes` → npmでインストールして今すぐ起動

### 2. 依存パッケージインストール

```bash
/run cd ~/te-sou-itako/te-sou-itako/frontend && npm install
```

> **注意：** `npm warn EBADENGINE` の警告が出る場合があるが動作には影響なし。
> Node v22.12.0 と eslint のマイナーバージョン差異によるもの。

### 3. api.js の作成（モック込み・1発合体版）

`frontend/src/api.js` を作成。`USE_MOCK`フラグでモックと本番APIを切り替える構成にする。

**フロントエンド開発中はモックを使ってトークン消費ゼロで爆速確認できる。**

> **ポイント：** バックエンドが1発合体版になったため、`analyzeHand`の引数に`character`を追加。
> `getItakoReading`は不要になり削除。

```javascript
// USE_MOCK = true：モック使用（開発中）
// USE_MOCK = false：本番API使用（デプロイ前に変更）
const USE_MOCK = false;

const ANALYZE_API_URL = import.meta.env.VITE_ANALYZE_URL
  || 'http://localhost:5001/te-sou-itako-f7136/us-central1/analyzeHand';

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

// analyzeHandの引数にcharacterを追加（1発で解析+占いを実行）
const analyzeHand = async (imageFile, character) => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1500));
    return {
      success: true,
      readingId: "mock-id-12345",
      result: {
        analysisResult: {
          lifeLine: { length: "長い", depth: "深い", description: "生命力に溢れる" },
          headLine: { length: "普通", type: "まっすぐ", description: "論理的な思考" },
          heartLine: { length: "長い", description: "情熱的で愛情深い" }
        },
        itakoResult: {
          interpretation: "うむ、この手相は見事じゃ...",
          advice: "焦るでない、着実に進めよ",
          future: "大いなる未来が待っておる"
        }
      }
    };
  }
  const imageData = await fileToBase64(imageFile);
  const res = await fetch(ANALYZE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData, character })  // characterを同時に送信
  });
  const result = await res.json();
  return { success: true, readingId: result.readingId, result: result.result };
};

// getItakoReadingは削除（バックエンドで1発合体済み）

export { analyzeHand, USE_MOCK };
```

### 4. App.jsx の実装

画面遷移は`useState`で管理。`screen`変数で現在の画面を管理する。

```
screens: 'top' | 'preview' | 'character' | 'loading' | 'result'
```

**画面構成：**

```
① top画面：手相画像アップロード（1ボタン方式）
    ↓
② preview画面：プレビュー確認・撮り直し
    ↓
③ character画面：4キャラクター選択
   （徳川家康・織田信長・アインシュタイン・卑弥呼）
    ↓
④ loading画面：スピナー表示
    ↓
⑤ result画面：interpretation・advice・futureを表示
```

### 5. App.css にスピナーアニメーション追加

インラインスタイルでは`@keyframes`が動作しないため、CSSファイルに記述する。

```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### 6. ローカル動作確認（モックモード）

```bash
/run cd ~/te-sou-itako/te-sou-itako/frontend && npm run dev
```

ブラウザで `http://localhost:5173` を開く。

**確認フロー：**
```
画像アップロード → プレビュー確認 → 徳川家康選択
→ ローディング（1〜2秒）→ 占い結果表示（解釈・アドバイス・未来）→ トップに戻る
```

**モックモードで全画面のUI・画面遷移の動作確認完了。**

### 7. 実APIテスト（エミュレーター経由）

`frontend/.env.local`を作成：

```bash
cat > ~/te-sou-itako/te-sou-itako/frontend/.env.local << 'EOF'
VITE_ANALYZE_URL=http://127.0.0.1:5001/te-sou-itako-f7136/us-central1/analyzeHand
EOF
```

`api.js`の`USE_MOCK`を`false`に変更後、エミュレーターと同時起動：

```bash
# ターミナル①：エミュレーター
cd ~/te-sou-itako/te-sou-itako
firebase emulators:start --only functions,firestore

# ターミナル②：フロントエンド
cd ~/te-sou-itako/te-sou-itako/frontend
npm run dev
```

**動作確認結果：**
- analyzeHand（1発合体版）：約30〜40秒で完了
- interpretation / advice / future 全フィールド正常に表示
- 徳川家康・織田信長など4キャラクター全て動作確認済み

<!-- デプロイ後に追記 -->

---

## Step 9：Firebase Hostingデプロイ

```bash
cd frontend
npm run build
firebase deploy
```

<!-- 完了後に追記 -->

---

## 詰まったポイント・気づき

### Gemini API 503エラー（VertexAIException）

無料枠ではサーバー過負荷により503が頻発することがある。

```
litellm.ServiceUnavailableError: VertexAIException
"message": "This model is currently experiencing high demand."
```

Aiderが自動でExponential Backoffリトライしてくれるので基本は待つだけでOK。

```
Retrying in 0.2 seconds...
Retrying in 0.5 seconds...
Retrying in 1.0 seconds...
Retrying in 2.0 seconds...
```

頻発する場合は軽量モデルに切り替えると改善する場合がある。

```bash
aider --model gemini/gemini-2.5-flash-lite --env-file .env
```

### GCP環境変数とGemini APIキーの競合

GCPの開発経験がある環境では、環境変数にGCP認証情報が残っていると
AiderがVertexAI経由で接続しようとしてエラーになる場合がある。
`--env-file .env` を明示的に指定することで回避できる。

```bash
aider --model gemini/gemini-2.5-flash --env-file .env
```

---

### Firebase CLIで新規プロジェクト作成時の403エラー

`firebase init` で `Create a new project` を選ぶとGCPプロジェクトの作成は
成功するが、Firebaseリソースの追加時に403 PERMISSION_DENIEDになる場合がある。

```
Error: Failed to add Firebase to Google Cloud Platform project.
{"error":{"code":403,"message":"The caller does not have permission","status":"PERMISSION_DENIED"}}
```

**対処法：** ブラウザで https://console.firebase.google.com から先にプロジェクトを
作成し、`firebase init` 実行時に `Use an existing project` を選んで紐付ける。

---

### Firestore Emulator起動に Java 21 が必要

Java 17（AlmaLinux標準）ではFirestore Emulatorが起動できない。

```
Error: firebase-tools no longer supports Java version before 21.
```

**対処法：**

```bash
sudo dnf install -y java-21-openjdk
sudo alternatives --config java
# → java-21-openjdk の番号を選択
```

---

### functions/ ディレクトリでのvenv作成とPythonバージョン

Firebase CLIでPython Cloud Functionsを初期化すると `functions/venv` が必要になるが、
AlmaLinux標準のPython（3.9）では `firebase-functions` パッケージが
`Requires-Python >=3.10` のため**インストールできない**。

```
ERROR: Could not find a version that satisfies the requirement firebase-functions~=0.5.0
ERROR: Ignored the following versions that require a different python version: ... Requires-Python >=3.10
```

**対処法：** `firebase.json` の `runtime` 指定（例：`python314`）に合わせて、
該当バージョンのPythonでvenvを作成する。

```bash
cd functions
python3.14 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

### firebase.json に emulators セクションが無いと起動失敗

`firebase init` のデフォルト生成では `emulators` セクションが含まれず、
Firestore Emulatorがポート8080で起動できずに失敗する場合がある。

```
Error: Could not start Firestore Emulator, port taken.
```

**対処法：** `firebase.json` に以下を追加する。

```json
"emulators": {
  "functions": { "port": 5001 },
  "firestore": { "port": 8080 },
  "ui": { "enabled": true, "port": 4000 },
  "singleProjectMode": true
}
```

---

### Emulatorは `.env` を自動読み込みしない（python-dotenv必須）

`functions/.env` を配置しても、`python-dotenv` がインストールされていないと
環境変数が読み込まれず `GEMINI_API_KEY環境変数が設定されていません` エラーになる。

```
i  functions: Loaded environment variables from .env.
Tip: There are .env files present. Install python-dotenv to use them.
...
ValueError: GEMINI_API_KEY環境変数が設定されていません。
```

**対処法：**

```bash
cd functions
source venv/bin/activate
pip install python-dotenv
```

また、プロジェクトルートの `.env` は `functions/.env` にもコピーが必要。

```bash
cp ~/te-sou-itako/te-sou-itako/.env ~/te-sou-itako/te-sou-itako/functions/.env
```

---

### google.generativeai パッケージの非推奨警告

```
FutureWarning: All support for the `google.generativeai` package has ended.
Please switch to the `google.genai` package as soon as possible.
```

動作には影響しないが、将来的に `google.genai` パッケージへの移行が必要。
プロトタイプ段階では警告のまま進めて問題ない。

---

### Firebase Functions Python のデコレータ忘れ

`@https_fn.on_request()` デコレータを付けないと、`functions.yaml` の読み込みは
成功する（構文エラーがないため）が、HTTPエンドポイントとしてルーティングされず
404 Not Foundになる。

```python
# NG：デコレータなし
def analyzeHand(request: Request):
    ...

# OK
from firebase_functions import https_fn

@https_fn.on_request()
def analyzeHand(req: https_fn.Request) -> https_fn.Response:
    return https_fn.Response(json.dumps({...}), status=200, mimetype='application/json')
```

戻り値も `return {dict}, status_code` のFlask形式ではなく、
`https_fn.Response(...)` 形式にする必要がある。

---

### Emulator上のプロジェクトIDはランダムな接尾辞付き

`firebase init` で作成したプロジェクトID（例：`te-sou-itako`）が
そのままEmulatorのURLに使われるとは限らない。実際には
`te-sou-itako-xxxxx`のようにランダムな接尾辞が付与される場合がある。

正しいプロジェクトIDはEmulator起動時のログで確認する。

```
✔  functions[us-central1-analyzeHand]: http function initialized
   (http://127.0.0.1:5001/te-sou-itako-f7136/us-central1/analyzeHand)
```

---

### curl実行時の "Argument list too long"

base64エンコードした画像データをそのままシェル変数として`-d`に渡すと、
コマンドライン引数の長さ制限に引っかかる。

```
bash: /usr/bin/curl: Argument list too long
```

**対処法：** JSONファイルを作成し、`-d @ファイル名`で渡す。

```bash
python3 -c "
import json
with open('image_base64.txt') as f:
    image_data = f.read().strip()
with open('request.json', 'w') as f:
    json.dump({'imageData': image_data}, f)
"

curl -X POST <URL> -H "Content-Type: application/json" -d @request.json
```

---

### 新SDK（google.genai）移行時の詰まりポイント

**① Part のインポートエラー**
```
ImportError: cannot import name 'Part' from 'google.generativeai.types'
```
→ `google-generativeai`は廃止済み。`google-genai`に移行する。

```bash
# requirements.txtを更新
google-genai  # google-generativeai から変更

# venvに再インストール
pip install -r requirements.txt
```

**② Firestoreのimportエラー**
```
AttributeError: module 'google.cloud.firestore' has no attribute 'client'
```
→ importの方法を変更する。

```python
# 旧（間違い）
import google.cloud.firestore as firestore

# 新（正しい）
from firebase_admin import firestore
```

**③ Part.from_text()の引数エラー**
```
Part.from_text() takes 1 positional argument but 2 were given
```
→ 新SDKでは`text=`をキーワード引数で渡す必要がある。

```python
# 旧（間違い）
types.Part.from_text(prompt_text)

# 新（正しい）
types.Part.from_text(text=prompt_text)
```

---

### Geminiのレスポンスがマークダウンのコードブロックで返る

Gemini APIにJSON出力を指示しても、レスポンスが ```` ```json ... ``` ```` の
ように囲まれて返ってくることがあり、`json.loads()`が失敗する。

```
{"success": false, "error": "Failed to parse Gemini Vision API response as JSON."}
```

**対処法：** `json.loads()`する前に、レスポンステキストから
マークダウンのコードブロック記号（```` ```json ```` と ```` ``` ````）を
除去する処理を追加する。

---

## まとめ・所感

<!-- 完成後に追記 -->

---

## 参考リンク

- [Google AI Studio](https://aistudio.google.com)
- [Firebase Console](https://console.firebase.google.com)
- [Aider公式](https://aider.chat)
- [Gemini API Docs](https://ai.google.dev/docs)
- [RE:ARME Portfolio](https://rearme.vercel.app)