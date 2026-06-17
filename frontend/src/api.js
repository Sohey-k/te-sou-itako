// USE_MOCK フラグ: true にするとモックAPIを使用し、false にすると本番APIを使用します。
const USE_MOCK = false;

// APIのURLは環境変数から取得
const ANALYZE_API_URL = import.meta.env.VITE_ANALYZE_URL || 'https://us-central1-te-sou-itako-f7136.cloudfunctions.net/analyzeHand';
// getItakoReading関数が削除されるため、ITAKO_API_URLは不要になります。

/**
 * 指定されたミリ秒数だけ待機するユーティリティ関数
 * @param {number} ms - 待機するミリ秒数
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * モックAPI呼び出し時の擬似待機
 * @returns {Promise<void>}
 */
const mockDelay = async () => {
  const delay = Math.floor(Math.random() * 1000) + 1000; // 1000ms (1秒) から 2000ms (2秒) の間でランダムな遅延
  await sleep(delay);
};

/**
 * FileオブジェクトをBase64文字列に変換するユーティリティ関数
 * @param {File} file - 変換するFileオブジェクト
 * @returns {Promise<string>} - Base64文字列 (data:image/...;base64, のプレフィックスなし)
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // data:image/...;base64, のプレフィックスを除去
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * 手相画像を分析し、イタコによるリーディングを取得するAPI呼び出し
 * @param {File} imageFile - 分析する手相画像ファイル
 * @param {string} character - イタコに求めるキャラクター（例: '徳川家康', '織田信長' など）
 * @returns {Promise<{ success: boolean, readingId: string, result: object }>} - 分析結果とイタコによるリーディング結果
 */
const analyzeHand = async (imageFile, character) => {
  if (USE_MOCK) {
    console.log('MOCK API: analyzeHand called');
    await mockDelay();
    // モックデータ
    return {
      success: true,
      readingId: "mock-id-12345",
      result: {
        analysisResult: {
          lifeLine: { length: "長い", depth: "深い", description: "生命力に溢れ、健康で長寿の傾向があります。" },
          headLine: { length: "普通", type: "まっすぐ", description: "現実的で論理的な思考を持ち、物事を冷静に判断できます。" },
          heartLine: { length: "長い", description: "情熱的で愛情深く、人間関係を大切にするタイプです。" }
        },
        itakoResult: {
          interpretation: `うむ、この手相は見事じゃ。お主の生命線は長く深く刻まれ、強靭な生命力と運命の強さを示しておる。知能線はまっすぐで、冷静沈着な判断力を持つ証。そして感情線は長く、情に厚く、人との絆を重んじる心が見える。これは、まさに天下を治めるにふさわしい手相と言えよう。`,
          advice: `焦るでない、着実に進めよ。大いなる目標を抱くのは良いが、一足飛びに事を成そうとしてはならぬ。足元を固め、一歩一歩、堅実に歩むことこそが、お主の運命を盤石にする道じゃ。忍耐強く、時を待つこともまた、武将の器量ぞ。`,
          future: `大いなる未来が待っておる。お主の努力と忍耐は必ず報われ、やがては多くの人々を導く立場となるであろう。特に、困難な状況に直面した時こそ、お主の真価が問われる。その時、冷静な判断と揺るぎない信念を持って事に当たれば、必ずや道は開かれ、輝かしい成功を収めるであろう。`
        }
      }
    };
  } else {
    console.log('REAL API: analyzeHand called');
    try {
      const imageData = await fileToBase64(imageFile);

      const response = await fetch(ANALYZE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData, character }), // characterを追加
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'APIリクエストが失敗しました');
      }

      const result = await response.json();
      if (!result.readingId || !result.result) {
        throw new Error('APIレスポンスにreadingIdまたはresultが含まれていません');
      }
      return { success: true, readingId: result.readingId, result: result.result };
    } catch (error) {
      console.error('Error calling analyzeHand API:', error);
      throw error;
    }
  }
};

// getItakoReading 関数は削除されました

export {
  analyzeHand,
  USE_MOCK // デバッグ用にフラグもエクスポート
};
