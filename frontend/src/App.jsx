import React, { useState, useRef } from 'react';
import { analyzeHand } from './api';
import './App.css'; // Tailwind CSSのベーススタイルやカスタムCSSのために残します

// キャラクターデータ
const characters = [
  { id: 'ieyasu', name: '徳川家康', description: '冷静沈着な戦略家' },
  { id: 'nobunaga', name: '織田信長', description: '革新的な天下人' },
  { id: 'einstein', name: 'アインシュタイン', description: '知的好奇心の探求者' },
  { id: 'himiko', name: '卑弥呼', description: '神秘的な女王' },
];

function App() {
  const [screen, setScreen] = useState('top'); // 'top' | 'preview' | 'character' | 'loading' | 'result'
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [readingId, setReadingId] = useState(null);
  const [itakoResult, setItakoResult] = useState(null); // interpretation, advice, future
  const [handAnalysis, setHandAnalysis] = useState(null); // lifeLine, headLine, heartLine
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // 状態をリセットする関数
  const resetState = () => {
    setScreen('top');
    setSelectedImageFile(null);
    setPreviewImageUrl(null);
    setSelectedCharacter(null);
    setReadingId(null);
    setItakoResult(null);
    setHandAnalysis(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // ファイル選択をクリア
    }
  };

  // ファイル選択時のハンドラ
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      setPreviewImageUrl(URL.createObjectURL(file));
      setScreen('preview');
    }
  };

  // 占い処理の実行
  const handleFortuneTelling = async () => {
    if (!selectedImageFile || !selectedCharacter) {
      setError('画像とキャラクターを選択してください。');
      return;
    }

    setScreen('loading');
    setError(null);
    setItakoResult(null);
    setHandAnalysis(null);

    try {
      let processedImageFile = selectedImageFile;

      // 画像リサイズ処理
      if (selectedImageFile) {
        processedImageFile = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const MAX_DIMENSION = 800; // 長辺の最大ピクセル数
              let width = img.width;
              let height = img.height;

              // 長辺がMAX_DIMENSIONを超える場合のみリサイズ
              if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                  height *= MAX_DIMENSION / width;
                  width = MAX_DIMENSION;
                } else {
                  width *= MAX_DIMENSION / height;
                  height = MAX_DIMENSION;
                }
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);

              // JPEG形式、品質0.7でBlobを生成
              canvas.toBlob((blob) => {
                if (blob) {
                  // BlobをFileオブジェクトに変換してresolve
                  const resizedFile = new File([blob], selectedImageFile.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(resizedFile);
                } else {
                  reject(new Error('Failed to create blob from canvas.'));
                }
              }, 'image/jpeg', 0.7); // MIMEタイプと品質を指定
            };
            img.onerror = (error) => reject(error);
            img.src = e.target.result;
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(selectedImageFile);
        });
      }

      // analyzeHandを呼び出し、軽量化した画像データを渡す
      const response = await analyzeHand(processedImageFile, selectedCharacter.name);
      if (!response.success) {
        throw new Error('手相分析とイタコリーディングに失敗しました。');
      }
      setReadingId(response.readingId);
      setItakoResult(response.result.itakoResult);
      setHandAnalysis(response.result.analysisResult);
      setScreen('result');
    } catch (err) {
      console.error('占い処理中にエラーが発生しました:', err);
      setError(err.message || '占い処理中に不明なエラーが発生しました。');
      setScreen('result'); // エラー時も結果画面に遷移してエラーを表示
    }
  };

  // 各画面のレンダリング
  const renderScreen = () => {
    switch (screen) {
      case 'top':
        return (
          // 外側のコンテナからは「group」を削除
          <div className="flex flex-col items-center justify-center p-6 bg-[var(--retro-card-bg)] border-2 border-[var(--retro-border)] rounded-none shadow-none max-w-md w-full text-center">
            <h1 className="text-4xl font-['Press_Start_2P'] text-[var(--retro-text)] mb-4">PALM AI ITAKO</h1>
            
            {/* ★画像コンテナに「group」を移動。これで画像エリアにマウスが乗った時だけ反応します */}
            <div 
              className="group relative flex justify-center items-center overflow-hidden"
              style={{ width: '350px', height: 'auto', margin: '0' }}
            >
              {/* 画像エリアコンテナ（groupを設定） */}
            <div 
              className="group relative flex justify-center items-center overflow-hidden"
              style={{ width: '350px', height: 'auto', margin: '0' }}
            >
              {/* 1. 背景のネオン手相画像 (bg.png) */}
              <img 
                src="/assets/bg2.png" 
                alt="PALM AI ITAKO Background" 
                // ★前回の opacity-20（うっすら）を採用
                className="absolute inset-0 w-full h-full object-contain opacity-0 scale-95 group-hover:opacity-60 group-hover:scale-100 transition-all duration-1000 ease-out pointer-events-none"
              />

              {/* 2. 前面の動く透過GIF (title.gif) */}
              <img 
                src="/assets/title2.gif" 
                alt="PALM AI ITAKO Title" 
                // ★className を大幅に変更します
                className="relative z-10 w-28 h-auto block opacity-100 transition-all duration-1000 ease-out group-hover:opacity-0"
                // 初期状態：不透明(opacity-100)
                // ホバー時：完全に透明(opacity-0)になる
                // 演出：1秒(duration-1000)かけてじわ〜っと消える
              />
            </div>
            </div>
            
            {/* 下部のテキスト部分のマージンを調整（mt-4を追加して画像との隙間を確保） */}
            <p className="text-lg text-[var(--retro-text)] mt-4 mb-8">あなたの手相をAIイタコが読み解きます。</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-[var(--retro-main)] hover:bg-[var(--retro-button-hover)] text-[var(--retro-text)] font-bold py-3 px-6 rounded-none transition-colors duration-100 w-full max-w-xs border-2 border-[var(--retro-border)]"
            >
              手相画像をアップロードする
            </button>
          </div>
        );
      case 'preview':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-[var(--retro-card-bg)] border-2 border-[var(--retro-border)] rounded-none shadow-none max-w-md w-full text-center">
            <h2 className="text-3xl font-['Press_Start_2P'] text-[var(--retro-text)] mb-6">選択した画像</h2>
            {previewImageUrl && (
              <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-80 object-contain rounded-none border-2 border-[var(--retro-border)] mb-6" />
            )}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
              <button
                onClick={() => setScreen('character')}
                className="bg-[var(--retro-main)] hover:bg-[var(--retro-button-hover)] text-[var(--retro-text)] font-bold py-3 px-6 rounded-none transition-colors duration-100 flex-grow border-2 border-[var(--retro-border)]"
              >
                この画像で占う
              </button>
              <button
                onClick={resetState}
                className="bg-gray-700 hover:bg-gray-800 text-[var(--retro-text)] font-bold py-3 px-6 rounded-none transition-colors duration-100 flex-grow border-2 border-[var(--retro-border)]"
              >
                撮り直す
              </button>
            </div>
          </div>
        );

      case 'character':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-[var(--retro-card-bg)] border-2 border-[var(--retro-border)] rounded-none shadow-none max-w-2xl w-full text-center">
            <h2 className="text-3xl font-['Press_Start_2P'] text-[var(--retro-text)] mb-6">イタコを選ぶ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className={`p-4 rounded-none cursor-pointer transition-all duration-100 border-2
                    ${selectedCharacter?.id === char.id
                      ? 'border-[var(--retro-accent)] bg-[var(--retro-accent)]/20 shadow-none'
                      : 'border-[var(--retro-border)] bg-[var(--retro-card-bg)] hover:border-[var(--retro-main)] hover:bg-[var(--retro-card-bg)]'
                    }`}
                  onClick={() => setSelectedCharacter(char)}
                >
                  <h3 className="text-xl font-semibold text-[var(--retro-text)] mb-1">{char.name}</h3>
                  <p className="text-sm text-gray-300">{char.description}</p>
                </div>
              ))}
            </div>
            {selectedCharacter && (
              <p className="text-lg text-[var(--retro-text)] mb-6">選択中: <span className="font-semibold text-[var(--retro-accent)]">{selectedCharacter.name}</span></p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button
                onClick={handleFortuneTelling}
                disabled={!selectedCharacter}
                className={`bg-[var(--retro-main)] hover:bg-[var(--retro-button-hover)] text-[var(--retro-text)] font-bold py-3 px-6 rounded-none transition-colors duration-100 flex-grow border-2 border-[var(--retro-border)]
                  ${!selectedCharacter ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                占ってもらう
              </button>
              <button
                onClick={() => setScreen('preview')}
                className="bg-gray-700 hover:bg-gray-800 text-[var(--retro-text)] font-bold py-3 px-6 rounded-none transition-colors duration-100 flex-grow border-2 border-[var(--retro-border)]"
              >
                戻る
              </button>
            </div>
            {error && <p className="text-red-500 mt-4 font-bold">{error}</p>}
          </div>
        );

      case 'loading':
        return (
    <div className="flex flex-col items-center justify-center p-8 bg-[var(--retro-card-bg)] border-2 border-[var(--retro-border)] rounded-none shadow-none max-w-md w-full text-center">
      <h2 className="text-3xl font-['Press_Start_2P'] text-[var(--retro-accent)] mb-6 tracking-wider animate-pulse">
        ✦ 神託降臨中 ✦
      </h2>
      
      {/* 🔮 GIMPで作成した最強の透過GIFをここに配置！ */}
      <div className="w-40 h-40 mb-6 overflow-hidden flex items-center justify-center bg-[var(--retro-bg)] border-2 border-[var(--retro-border)] rounded-none shadow-inner">
        <img 
          src="/assets/itako.gif" 
          alt="イタコお祓い中" 
          className="w-32 h-32 object-contain pixelated" // ドット絵をクッキリさせる魔法のクラス
        />
      </div>

      {/* レトロゲーム風のテキスト演出 */}
      <div className="space-y-2 font-['Press_Start_2P'] text-sm">
        <p className="text-[var(--retro-accent)]">ITAKO IS COMMUNICATING WITH GEMINI...</p>
        <p className="text-gray-300 text-xs animate-bounce">しばらくお待ちください</p>
      </div>
      
      <p className="text-[var(--retro-text)] mt-6 border-t-2 border-[var(--retro-border)] pt-4 w-full">
        イタコが、あなたから送られた手相のログを読み解いています。
      </p>
    </div>
  );

      case 'result':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--retro-card-bg)] border-2 border-[var(--retro-border)] rounded-none shadow-none max-w-4xl w-full">
            {error ? (
              <div className="md:col-span-2 text-center">
                <h2 className="text-3xl font-['Press_Start_2P'] text-[var(--retro-text)] text-red-500 mb-4">ERROR!!</h2>
                <p className="text-red-400 text-[var(--retro-text)]">{error}</p>
                <button onClick={resetState} className="bg-[var(--retro-main)] hover:bg-[var(--retro-button-hover)] text-[var(--retro-text)] font-bold py-3 px-6 rounded-none transition-colors duration-100 mt-8 border-2 border-[var(--retro-border)]">
                  もう一度占う
                </button>
              </div>
            ) : (
              <>
                {/* 左側の画像カード */}
                <div className="flex flex-col items-center justify-center p-4 bg-[var(--retro-card-bg)] border-2 border-[var(--retro-border)] rounded-none">
                  <h3 className="text-xl font-bold text-[var(--retro-text)] mb-4">あなたの手相</h3>
                  {previewImageUrl && (
                    <img src={previewImageUrl} alt="Your Hand" className="max-w-full max-h-96 object-contain rounded-none border-2 border-[var(--retro-border)]" />
                  )}
                </div>

                {/* 右側のイタコ神託タイムラインカード */}
                <div className="p-4 bg-[var(--retro-card-bg)] border-2 border-[var(--retro-border)] rounded-none">
                  <h3 className="text-xl font-bold text-[var(--retro-text)] mb-4">イタコの神託</h3>
                  {(handAnalysis || itakoResult) && (
                    <div className="space-y-6">
                      {/* タイムラインヘッダー */}
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-none bg-[var(--retro-main)] flex items-center justify-center text-[var(--retro-text)] font-bold text-xl border-2 border-[var(--retro-border)]">
                          {selectedCharacter?.name[0]}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[var(--retro-text)] text-lg">{selectedCharacter?.name}</span>
                            <span className="text-gray-300 text-sm">@{selectedCharacter?.id}</span>
                          </div>
                          <p className="text-gray-300 text-sm mt-1">
                            {selectedCharacter?.description}
                          </p>
                        </div>
                      </div>

                      {/* タイムラインコンテンツ */}
                      <div className="space-y-4 border-l-2 border-[var(--retro-border)] pl-4 ml-6">
                        {/* ポスト1（生命線） */}
                        {handAnalysis?.lifeLine && (
                          <div className="relative">
                            <div className="absolute -left-7 top-0 w-4 h-4 rounded-none bg-[var(--retro-accent)] border-2 border-[var(--retro-bg)]"></div>
                            <p className="text-[var(--retro-text)]">
                              <strong className="text-[var(--retro-main)]">生命線:</strong>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium bg-blue-700 text-white ml-2 border border-blue-500">
                                長さ: {handAnalysis.lifeLine.length}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium bg-green-700 text-white ml-2 border border-green-500">
                                深さ: {handAnalysis.lifeLine.depth}
                              </span>
                              <br />
                              {handAnalysis.lifeLine.description}
                            </p>
                          </div>
                        )}

                        {/* ポスト2（知能線） */}
                        {handAnalysis?.headLine && (
                          <div className="relative">
                            <div className="absolute -left-7 top-0 w-4 h-4 rounded-none bg-[var(--retro-accent)] border-2 border-[var(--retro-bg)]"></div>
                            <p className="text-[var(--retro-text)]">
                              <strong className="text-[var(--retro-main)]">知能線:</strong>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium bg-blue-700 text-white ml-2 border border-blue-500">
                                長さ: {handAnalysis.headLine.length}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium bg-yellow-700 text-white ml-2 border border-yellow-500">
                                タイプ: {handAnalysis.headLine.type}
                              </span>
                              <br />
                              {handAnalysis.headLine.description}
                            </p>
                          </div>
                        )}

                        {/* ポスト3（感情線） */}
                        {handAnalysis?.heartLine && (
                          <div className="relative">
                            <div className="absolute -left-7 top-0 w-4 h-4 rounded-none bg-[var(--retro-accent)] border-2 border-[var(--retro-bg)]"></div>
                            <p className="text-[var(--retro-text)]">
                              <strong className="text-[var(--retro-main)]">感情線:</strong>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium bg-blue-700 text-white ml-2 border border-blue-500">
                                長さ: {handAnalysis.heartLine.length}
                              </span>
                              <br />
                              {handAnalysis.heartLine.description}
                            </p>
                          </div>
                        )}

                        {/* ポスト4（イタコ解釈） */}
                        {itakoResult?.interpretation && (
                          <div className="relative">
                            <div className="absolute -left-7 top-0 w-4 h-4 rounded-none bg-[var(--retro-accent)] border-2 border-[var(--retro-bg)]"></div>
                            <p className="text-[var(--retro-text)]">
                              <strong className="text-[var(--retro-main)]">解釈 ({selectedCharacter?.name}):</strong> {itakoResult.interpretation}
                            </p>
                          </div>
                        )}

                        {/* ポスト5（アドバイス） */}
                        {itakoResult?.advice && (
                          <div className="relative">
                            <div className="absolute -left-7 top-0 w-4 h-4 rounded-none bg-[var(--retro-accent)] border-2 border-[var(--retro-bg)]"></div>
                            <p className="text-[var(--retro-text)]">
                              <strong className="text-[var(--retro-main)]">アドバイス ({selectedCharacter?.name}):</strong> {itakoResult.advice}
                            </p>
                          </div>
                        )}

                        {/* ポスト6（未来の展望） */}
                        {itakoResult?.future && (
                          <div className="relative">
                            <div className="absolute -left-7 top-0 w-4 h-4 rounded-none bg-[var(--retro-accent)] border-2 border-[var(--retro-bg)]"></div>
                            <p className="text-[var(--retro-text)]">
                              <strong className="text-[var(--retro-main)]">未来 ({selectedCharacter?.name}):</strong> {itakoResult.future}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <button onClick={resetState} className="bg-[var(--retro-main)] hover:bg-[var(--retro-button-hover)] text-[var(--retro-text)] font-bold py-3 px-6 rounded-none transition-colors duration-100 mt-8 w-full border-2 border-[var(--retro-border)]">
                    もう一度占う
                  </button>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--retro-bg)] text-[var(--retro-text)] p-4 md:p-8 flex items-center justify-center font-sans">
      {renderScreen()}
    </div>
  );
}

export default App;
