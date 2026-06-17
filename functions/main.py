import os
import json
import base64
import logging
import io # 追加
from PIL import Image # 追加

from google import genai
from google.genai import types
from firebase_functions import https_fn
from firebase_admin import initialize_app, firestore # firestoreをfirebase_adminからインポート

# Firebase Admin SDKの初期化
initialize_app()

# Firestoreクライアントの初期化
db = firestore.client()

# ロギングの設定
logging.basicConfig(level=logging.INFO)

# Gemini APIキーの取得
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    logging.error("GEMINI_API_KEY環境変数が設定されていません。")
    raise ValueError("GEMINI_API_KEY環境変数が設定されていません。")

# Gemini クライアントの初期化 (新しいSDK形式)
client = genai.Client(api_key=GEMINI_API_KEY)

# 許可されるキャラクターのリスト
ALLOWED_CHARACTERS = ['徳川家康', '織田信長', 'アインシュタイン', '卑弥呼']

# キャラクターごとのペルソナ記述
CHARACTER_PERSONAS = {
    '徳川家康': "あなたは戦国武将・徳川家康です。重厚で忍耐強く、武士の精神を持ち、古風な武士語で話します。厳格で堂々とした口調で、長期的な視点から人生の重要な局面と対策を示してください。",
    '織田信長': "あなたは戦国武将・織田信長です。断定的で傲慢、天下布武の大志を持ち、決断力と直言で知られています。断定的で力強い口調で、この人が何を成し遂げるべきか、そして野心と目標達成について述べてください。",
    'アインシュタイン': "あなたは物理学者・アルベルト・アインシュタインです。論理的で思弁的、相対性理論の視点から世界を見つめます。論理的で深い洞察に満ちた口調で、時間と運命の相対性、そして人生における確率と可能性について述べてください。",
    '卑弥呼': "あなたは古代日本の女王・卑弥呼です。神秘的で霊的な力を持ち、古語を交えて話し、見えない世界と繋がっています。神秘的で古風な口調で、この人が持つ霊的な力、過去世との繋がり、そして運命の糸について述べてください。"
}

@https_fn.on_request()
def analyzeHand(req: https_fn.Request) -> https_fn.Response:
    # CORSヘッダーの設定
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    # OPTIONSリクエストの処理
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204, headers=cors_headers)

    if req.method != "POST":
        return https_fn.Response("Method Not Allowed", status=405, headers=cors_headers)

    try:
        request_json = req.get_json()
        if not request_json:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'No JSON data provided'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )

        imageData = request_json.get('imageData')
        character = request_json.get('character')

        if not imageData:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Image data is required'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )
        if not character:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Character is required'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )

        # キャラクターのバリデーション
        if character not in ALLOWED_CHARACTERS:
            return https_fn.Response(
                json.dumps({'success': False, 'error': f'Invalid character: {character}. Allowed characters are: {", ".join(ALLOWED_CHARACTERS)}'}),
                status=400,
                mimetype='application/json',
                headers=cors_headers
            )

        logging.info(f"Received request for character: {character}")

        # Firestoreに新しいドキュメント参照を作成し、IDを先に取得
        new_reading_ref = db.collection('readings').document()
        reading_id = new_reading_ref.id

        # キャラクターに応じたペルソナ記述を取得
        persona_description = CHARACTER_PERSONAS.get(character, "")

        # Gemini APIへのプロンプトテキスト
        prompt_text = (
            f"{persona_description}\n"
            f"提供された手相画像を見て、その人の運命と人生の道について、{character}の視点から占いの結果を述べてください。\n"
            "各フィールドは必ず140文字以内で簡潔にまとめてください。\n"
            "以下のJSON形式で手相の分析とイタコによるメッセージを提供してください。JSON以外の余計なテキストは一切含めないでください。\n\n"
            "期待するJSON構造:\n"
            "```json\n"
            "{\n"
            "  \"analysisResult\": {\n"
            "    \"lifeLine\": {\"length\": \"(長い/短い/普通)\", \"depth\": \"(深い/浅い/普通)\", \"description\": \"(生命線の特徴と意味を簡潔に記述)\"},\n"
            "    \"headLine\": {\"length\": \"(長い/短い/普通)\", \"type\": \"(まっすぐ/カーブ/枝分かれ)\", \"description\": \"(知能線の特徴と意味を簡潔に記述)\"},\n"
            "    \"heartLine\": {\"length\": \"(長い/短い/普通)\", \"description\": \"(感情線の特徴と意味を簡潔に記述)\"}\n"
            "  },\n"
            "  \"itakoResult\": {\n"
            "    \"interpretation\": \"(イタコが手相から読み取った総合的な解釈を記述)\",\n"
            "    \"advice\": \"(イタコからの具体的なアドバイスを記述)\",\n"
            "    \"future\": \"(イタコが予見する未来について記述)\"\n"
            "  }\n"
            "}\n"
            "```\n"
            "手相の分析は客観的に行い、イタコの結果は「{character}」の口調や視点に合わせてください。"
        )

        # 画像処理ロジック
        decoded_image_data = base64.b64decode(imageData)
        image_stream = io.BytesIO(decoded_image_data)
        img = Image.open(image_stream)

        # 最大辺が1024pxになるようにリサイズ
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            logging.info(f"Resizing image from {img.width}x{img.height} to max {max_size}px.")
            img.thumbnail((max_size, max_size), Image.LANCZOS) # LANCZOSは高品質なリサイズフィルター

        # JPEG形式で圧縮し、BytesIOに保存
        output_image_stream = io.BytesIO()
        img.save(output_image_stream, format="JPEG", quality=85)
        processed_image_bytes = output_image_stream.getvalue()
        logging.info(f"Processed image size: {len(processed_image_bytes)} bytes")

        # Gemini APIの呼び出し (新しいSDK形式)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(
                            data=processed_image_bytes, # 処理済みの画像データを渡す
                            mime_type='image/jpeg'
                        ),
                        types.Part.from_text(text=prompt_text) # text= を明示
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type='application/json'
            )
        )
        
        # JSONモードが有効なため、response.textは直接JSON文字列になる
        raw_gemini_output = response.text
        logging.info(f"Raw Gemini output: {raw_gemini_output}")

        # JSON文字列をパース
        gemini_result = json.loads(raw_gemini_output)

        # Firestoreに結果を保存
        new_reading_ref.set({
            'timestamp': firestore.SERVER_TIMESTAMP,
            'analysisResult': gemini_result.get('analysisResult'),
            'character': character,
            'itakoResult': gemini_result.get('itakoResult'),
            'status': 'itako_completed' # 解析と占いが同時に完了
        })

        return https_fn.Response(json.dumps({
            "success": True,
            "readingId": reading_id,
            "result": gemini_result
        }), status=200, headers={"Content-Type": "application/json", **cors_headers})

    except json.JSONDecodeError as e:
        logging.error(f"Gemini API response was not valid JSON or invalid JSON in request body: {e}")
        return https_fn.Response(
            json.dumps({'success': False, 'error': f'Failed to parse JSON: {e}'}),
            status=500,
            mimetype='application/json',
            headers=cors_headers
        )
    except ValueError as e:
        logging.error(f"ValueError: {e}")
        return https_fn.Response(
            json.dumps({'success': False, 'error': str(e)}),
            status=400,
            mimetype='application/json',
            headers=cors_headers
        )
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}", exc_info=True)
        return https_fn.Response(
            json.dumps({'success': False, 'error': f'An internal server error occurred: {e}'}),
            status=500,
            mimetype='application/json',
            headers=cors_headers
        )

# getItakoReading 関数は削除されました
