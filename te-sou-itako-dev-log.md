# 🔮 手相イタコ占いアプリ 開発ログ

> Gemini無料API × Firebase × Aider で爆速プロトタイプを作る

---

## 概要

| 項目 | 内容 |
|------|------|
| アプリ名 | 手相イタコ占い（Te-Sou Itako） |
| 開発期間 | 2026年6月〜 |
| 構成 | React + Firebase Hosting + Cloud Functions (Python) + Gemini API |
| 開発エージェント | Aider（Gemini 2.5 Flash） |
| コスト | 実質0円（全て無料枠） |

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

- OS：Windows 11 + WSL2（Ubuntu）
- エディタ：Neovim / VSCode
- 開発エージェント：Aider
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

<!-- 完了後に追記 -->

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

<!-- 完了後に追記 -->

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
aider --model gemini/gemini-2.5-flash
```

<!-- 完了後に追記 -->

---

## Step 4：Firebaseプロジェクト作成

### 1. Firebase CLIインストール

```bash
npm install -g firebase-tools
firebase login
```

### 2. プロジェクト作成

```bash
firebase init
```

選択項目：
- Functions（Cloud Functions）
- Hosting（Firebase Hosting）
- Firestore

### 3. ディレクトリ構成

```
te-sou-itako/
├── frontend/          # React（Vite）
├── functions/         # Cloud Functions（Python）
├── firebase.json
├── .firebaserc
└── .gitignore
```

<!-- 完了後に追記 -->

---

## Step 5：Cloud Functions実装（手相解析）

### 概要

- 入力：手相画像（base64）
- 処理：Gemini Vision APIで手相特徴を解析
- 出力：手相特徴JSON → Firestoreに保存

```python
# functions/analyzer/main.py
# ここに追記
```

<!-- 完了後に追記 -->

---

## Step 6：Cloud Functions実装（イタコ出力）

### 概要

- 入力：手相特徴JSON + 選択キャラクター
- 処理：キャラプロンプト + JSONをGemini APIに送信
- 出力：イタコ風占い結果テキスト

```python
# functions/itako/main.py
# ここに追記
```

<!-- 完了後に追記 -->

---

## Step 7：フロントエンド実装（React）

### 1. Viteでプロジェクト作成

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
```

### 2. 画面構成

```
① TOP画面：画像アップロード
    ↓
② プレビュー確認
    ↓
③ キャラクター選択
    ↓
④ ローディング（解析中）
    ↓
⑤ 結果表示
```

<!-- 完了後に追記 -->

---

## Step 8：Firebase Hostingデプロイ

```bash
cd frontend
npm run build
firebase deploy
```

<!-- 完了後に追記 -->

---

## 詰まったポイント・気づき

<!-- 開発中に随時追記 -->

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