import os
import base64
import json
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore
from firebase_functions import https_fn
import google.generativeai as genai


# Firebase Admin SDKの初期化
# Cloud Functions環境では、サービスアカウントキーを明示的に指定する必要はありません。
# 環境変数 GOOGLE_APPLICATION_CREDENTIALS が設定されているか、
# デフォルトのサービスアカウントが自動的に使用されます。
firebase_admin.initialize_app()
db = firestore.client()

# Gemini APIの初期化
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    # 環境変数が設定されていない場合はエラーを発生させる
    # Cloud Functionsのデプロイ時に環境変数を設定する必要があります
    raise ValueError("GEMINI_API_KEY環境変数が設定されていません。")
genai.configure(api_key=GEMINI_API_KEY)
# モデルをgemini-2.5-flashに変更
gemini_vision_model = genai.GenerativeModel('gemini-2.5-flash')

@https_fn.on_request()
def analyzeHand(req: https_fn.Request) -> https_fn.Response:
    """
    手相画像を解析し、結果をFirestoreのreadingsコレクションに保存するCloud Function。
    設計書: docs/basic-design.md - 3.1. 手相解析API
    """
    # CORSヘッダーの定義
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # OPTIONSメソッド（プリフライトリクエスト）への対応
    if req.method == 'OPTIONS':
        return https_fn.Response('', status=204, headers=cors_headers)
    
    # HTTPメソッドがPOSTであることを確認
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({'success': False, 'error': 'Method Not Allowed'}),
            status=405,
            mimetype='application/json',
            headers=cors_headers
        )

    try:
        # リクエストボディからJSONデータを取得
        request_json = req.get_json(silent=True)
        if not request_json or 'imageData' not in request_json:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Invalid request body. "imageData" is required.'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )

        image_data_base64 = request_json['imageData']
        # Base64エンコードされた画像データをデコード
        image_bytes = base64.b64decode(image_data_base64)

        # Firestoreに新しいドキュメント参照を作成し、IDを先に取得
        new_reading_ref = db.collection('readings').document()
        reading_id = new_reading_ref.id

        # Cloud Storageへの画像保存処理は削除。画像はメモリ上で処理し破棄される。

        # Gemini Vision APIに送信するプロンプトと画像データ
        # 手相の特徴をJSON形式で抽出するように指示
        prompt_parts = [
            "Analyze this hand image for palmistry features. Identify and describe the major lines (life, head, heart, fate, sun, mercury), major mounts (Venus, Jupiter, Saturn, Apollo, Mercury, Mars, Luna), and any significant markings (stars, squares, crosses, islands). Summarize these features in a structured JSON format. For example: {\"lifeLine\": {\"length\": \"long\", \"depth\": \"deep\", \"description\": \"...\"}, \"headLine\": {\"length\": \"medium\", \"type\": \"straight\", \"description\": \"...\"}, ...}. Provide only the JSON output.",
            {
                "mime_type": "image/jpeg", # アップロードされる画像形式によって調整が必要
                "data": image_bytes
            }
        ]
        
        # Gemini Vision APIを呼び出し、手相解析を実行
        response = gemini_vision_model.generate_content(prompt_parts)
        
        # Geminiからのレスポンスを解析
        # Geminiはテキストを返すため、JSON文字列としてパースを試みる
        try:
            # レスポンスが複数パーツに分かれている場合があるため、text属性を結合
            gemini_output_text = "".join([part.text for part in response.parts])
            # マークダウンのコードブロック記号を除去
            gemini_output_text = gemini_output_text.strip()
            if gemini_output_text.startswith('```json'):
                gemini_output_text = gemini_output_text[7:]
            elif gemini_output_text.startswith('```'):
                gemini_output_text = gemini_output_text[3:]
            if gemini_output_text.endswith('```'):
                gemini_output_text = gemini_output_text[:-3]
            gemini_output_text = gemini_output_text.strip()
            analysis_result_json = json.loads(gemini_output_text)
        except json.JSONDecodeError:
            print(f"Gemini API response was not valid JSON: {gemini_output_text}")
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Failed to parse Gemini Vision API response as JSON.'}),
                status=500,
                mimetype='application/json',
                headers=cors_headers
            )
        except Exception as e:
            print(f"Error processing Gemini response: {e}")
            return https_fn.Response(
                json.dumps({'success': False, 'error': f'Error processing Gemini response: {str(e)}'}),
                status=500,
                mimetype='application/json',
                headers=cors_headers
            )

        # Firestoreに解析結果を保存
        # handImageRefフィールドは削除
        new_reading_ref.set({
            'timestamp': firestore.SERVER_TIMESTAMP, # サーバー側でタイムスタンプを生成
            'analysisResult': analysis_result_json,
            'character': None, # 初期状態ではキャラクターは未選択
            'itakoResult': None, # 初期状態では占い結果はなし
            'status': 'analyzed' # 解析済みステータス
        })

        # 設計書に記載された成功レスポンスを返却
        return https_fn.Response(
            json.dumps({'success': True, 'readingId': reading_id, 'message': 'Hand analysis initiated successfully.'}),
            status=200,
            mimetype='application/json',
            headers=cors_headers
        )

    except ValueError as ve:
        # 無効なBase64データなど、クライアント側の問題
        print(f"ValueError: {ve}")
        return https_fn.Response(
            json.dumps({'success': False, 'error': str(ve)}),
            status=400,
            mimetype='application/json',
            headers=cors_headers
        )
    except Exception as e:
        # その他の予期せぬエラー
        print(f"Error during hand analysis: {e}")
        return https_fn.Response(
            json.dumps({'success': False, 'error': f'Internal Server Error: {str(e)}'}),
            status=500,
            mimetype='application/json',
            headers=cors_headers
        )


@https_fn.on_request()
def getItakoReading(req: https_fn.Request) -> https_fn.Response:
    """
    手相解析結果をキャラクターに基づいて占い結果に変換するCloud Function。
    設計書: docs/basic-design.md - 3.2. 占い解析API
    """
    # CORSヘッダーの定義
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # OPTIONSメソッド（プリフライトリクエスト）への対応
    if req.method == 'OPTIONS':
        return https_fn.Response('', status=204, headers=cors_headers)
    
    # HTTPメソッドがPOSTであることを確認
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({'success': False, 'error': 'Method Not Allowed'}),
            status=405,
            mimetype='application/json',
            headers=cors_headers
        )

    try:
        # リクエストボディからJSONデータを取得
        request_json = req.get_json(silent=True)
        if not request_json or 'readingId' not in request_json or 'character' not in request_json:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Invalid request body. "readingId" and "character" are required.'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )

        reading_id = request_json['readingId']
        character = request_json['character']

        # キャラクター一覧の定義
        valid_characters = ['徳川家康', '織田信長', 'アインシュタイン', '卑弥呼']
        if character not in valid_characters:
            return https_fn.Response(
                json.dumps({'success': False, 'error': f'Invalid character. Must be one of {valid_characters}.'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )

        # Firestoreから手相解析結果を取得
        reading_doc = db.collection('readings').document(reading_id).get()
        if not reading_doc.exists:
            return https_fn.Response(
                json.dumps({'success': False, 'error': f'Reading with ID {reading_id} not found.'}),
                status=404,
                mimetype='application/json',
                headers=cors_headers
            )

        analysis_result = reading_doc.get('analysisResult')
        if not analysis_result:
            return https_fn.Response(
                json.dumps({'success': False, 'error': f'No analysis result found for reading {reading_id}.'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )

        # キャラクターに応じたプロンプトを作成
        character_prompts = {
            '徳川家康': """あなたは戦国武将・徳川家康です。重厚で忍耐強く、武士の精神を持ち、古風な武士語で話します。
以下の手相解析結果を見て、その人の運命と人生の道について、家康の視点から占いの結果を述べてください。
厳格で堂々とした口調で、長期的な視点から人生の重要な局面と対策を示してください。

手相解析結果:
{analysis_result}

占い結果をJSON形式で返してください。例: {{"interpretation": "...", "advice": "...", "future": "..."}}""",

            '織田信長': """あなたは戦国武将・織田信長です。断定的で傲慢、天下布武の大志を持ち、決断力と直言で知られています。
以下の手相解析結果を見て、その人の運命と成功への道について、信長の視点から占いの結果を述べてください。
断定的で力強い口調で、この人が何を成し遂げるべきか、そして野心と目標達成について述べてください。

手相解析結果:
{analysis_result}

占い結果をJSON形式で返してください。例: {{"interpretation": "...", "challenge": "...", "destiny": "..."}}""",

            'アインシュタイン': """あなたは物理学者・アルベルト・アインシュタインです。論理的で思弁的、相対性理論の視点から世界を見つめます。
以下の手相解析結果を見て、その人の知的な成長と人生の相対的な真実について、科学的かつ哲学的な視点から占いの結果を述べてください。
論理的で深い洞察に満ちた口調で、時間と運命の相対性、そして人生における確率と可能性について述べてください。

手相解析結果:
{analysis_result}

占い結果をJSON形式で返してください。例: {{"analysis": "...", "theory": "...", "insight": "..."}}""",

            '卑弥呼': """あなたは古代日本の女王・卑弥呼です。神秘的で霊的な力を持ち、古語を交えて話し、見えない世界と繋がっています。
以下の手相解析結果を見て、その人の霊的な運命と見えない力について、卑弥呼の視点から占いの結果を述べてください。
神秘的で古風な口調で、この人が持つ霊的な力、過去世との繋がり、そして運命の糸について述べてください。

手相解析結果:
{analysis_result}

占い結果をJSON形式で返してください。例: {{"spiritual_message": "...", "past_life": "...", "destiny_thread": "..."}}"""
        }

        # 選択されたキャラクターのプロンプトを取得
        prompt_template = character_prompts[character]
        prompt = prompt_template.format(analysis_result=json.dumps(analysis_result, ensure_ascii=False, indent=2))

        # Gemini APIを呼び出し、占い結果を生成
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)

        # Geminiからのレスポンスを解析
        try:
            gemini_output_text = "".join([part.text for part in response.parts])
            # マークダウンのコードブロック記号を除去
            gemini_output_text = gemini_output_text.strip()
            if gemini_output_text.startswith('```json'):
                gemini_output_text = gemini_output_text[7:]
            elif gemini_output_text.startswith('```'):
                gemini_output_text = gemini_output_text[3:]
            if gemini_output_text.endswith('```'):
                gemini_output_text = gemini_output_text[:-3]
            gemini_output_text = gemini_output_text.strip()
            itako_result_json = json.loads(gemini_output_text)
        except json.JSONDecodeError:
            print(f"Gemini API response was not valid JSON: {gemini_output_text}")
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Failed to parse Gemini API response as JSON.'}),
                status=500,
                mimetype='application/json',
                headers=cors_headers
            )
        except Exception as e:
            print(f"Error processing Gemini response: {e}")
            return https_fn.Response(
                json.dumps({'success': False, 'error': f'Error processing Gemini response: {str(e)}'}),
                status=500,
                mimetype='application/json',
                headers=cors_headers
            )

        # Firestoreに占い結果を保存
        db.collection('readings').document(reading_id).update({
            'itakoResult': itako_result_json,
            'character': character,
            'itakoTimestamp': firestore.SERVER_TIMESTAMP,
            'status': 'itako_completed'
        })

        # 占い結果をレスポンスとして返す
        return https_fn.Response(
            json.dumps({'success': True, 'readingId': reading_id, 'character': character, 'itakoResult': itako_result_json}),
            status=200,
            mimetype='application/json',
            headers=cors_headers
        )

    except Exception as e:
        # その他の予期せぬエラー
        print(f"Error during itako reading: {e}")
        return https_fn.Response(
            json.dumps({'success': False, 'error': f'Internal Server Error: {str(e)}'}),
            status=500,
            mimetype='application/json',
            headers=cors_headers
        )
