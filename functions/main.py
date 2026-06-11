import os
import base64
import json
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai
from google.cloud.functions_v2.framework import on_request # Cloud Functions (2nd gen) の場合

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
# モデルをgemini-1.5-flashに変更
gemini_vision_model = genai.GenerativeModel('gemini-1.5-flash')

@on_request
def analyzeHand(request):
    """
    手相画像を解析し、結果をFirestoreのreadingsコレクションに保存するCloud Function。
    設計書: docs/basic-design.md - 3.1. 手相解析API
    """
    # HTTPメソッドがPOSTであることを確認
    if request.method != 'POST':
        return {'success': False, 'error': 'Method Not Allowed'}, 405

    try:
        # リクエストボディからJSONデータを取得
        request_json = request.get_json(silent=True)
        if not request_json or 'imageData' not in request_json:
            return {'success': False, 'error': 'Invalid request body. "imageData" is required.'}, 400

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
            analysis_result_json = json.loads(gemini_output_text)
        except json.JSONDecodeError:
            print(f"Gemini API response was not valid JSON: {gemini_output_text}")
            return {'success': False, 'error': 'Failed to parse Gemini Vision API response as JSON.'}, 500
        except Exception as e:
            print(f"Error processing Gemini response: {e}")
            return {'success': False, 'error': f'Error processing Gemini response: {str(e)}'}, 500

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
        return {'success': True, 'readingId': reading_id, 'message': 'Hand analysis initiated successfully.'}, 200

    except ValueError as ve:
        # 無効なBase64データなど、クライアント側の問題
        print(f"ValueError: {ve}")
        return {'success': False, 'error': str(ve)}, 400
    except Exception as e:
        # その他の予期せぬエラー
        print(f"Error during hand analysis: {e}")
        return {'success': False, 'error': f'Internal Server Error: {str(e)}'}, 500
