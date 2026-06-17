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
  const [itakoResult, setItakoResult] = useState(null);
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

    try {
      // analyzeHandを呼び出し、画像ファイルとキャラクター名を渡す
      const response = await analyzeHand(selectedImageFile, selectedCharacter.name);
      if (!response.success) {
        throw new Error('手相分析とイタコリーディングに失敗しました。');
      }
      setReadingId(response.readingId);
      setItakoResult(response.result.itakoResult); // レスポンスから直接itakoResultを取得
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
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-lg max-w-md w-full text-center">
            <h1 className="text-4xl font-extrabold text-slate-100 mb-4">手相イタコ占い</h1>
            <p className="text-lg text-slate-300 mb-8">あなたの手相をイタコが読み解きます。</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 w-full max-w-xs"
            >
              手相画像をアップロードする
            </button>
          </div>
        );

      case 'preview':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-lg max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-slate-100 mb-6">選択した画像</h2>
            {previewImageUrl && (
              <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-80 object-contain rounded-lg border border-slate-700 mb-6" />
            )}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
              <button
                onClick={() => setScreen('character')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 flex-grow"
              >
                この画像で占う
              </button>
              <button
                onClick={resetState}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 flex-grow"
              >
                撮り直す
              </button>
            </div>
          </div>
        );

      case 'character':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-lg max-w-2xl w-full text-center">
            <h2 className="text-3xl font-bold text-slate-100 mb-6">イタコを選ぶ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300
                    ${selectedCharacter?.id === char.id
                      ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'border border-slate-700 bg-slate-800 hover:border-purple-600 hover:bg-slate-700'
                    }`}
                  onClick={() => setSelectedCharacter(char)}
                >
                  <h3 className="text-xl font-semibold text-slate-100 mb-1">{char.name}</h3>
                  <p className="text-sm text-slate-400">{char.description}</p>
                </div>
              ))}
            </div>
            {selectedCharacter && (
              <p className="text-lg text-slate-200 mb-6">選択中: <span className="font-semibold text-purple-400">{selectedCharacter.name}</span></p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button
                onClick={handleFortuneTelling}
                disabled={!selectedCharacter}
                className={`bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 flex-grow
                  ${!selectedCharacter ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                占ってもらう
              </button>
              <button
                onClick={() => setScreen('preview')}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 flex-grow"
              >
                戻る
              </button>
            </div>
            {error && <p className="text-red-500 mt-4 font-bold">{error}</p>}
          </div>
        );

      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-lg max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-slate-100 mb-8">解析中...</h2>
            <div className="space-y-4 w-full max-w-xs">
              <div className="h-6 bg-slate-700 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-slate-700 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-700 rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse"></div>
              <div className="h-6 bg-slate-700 rounded w-2/3 animate-pulse mt-8"></div>
              <div className="h-4 bg-slate-700 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-700 rounded w-4/5 animate-pulse"></div>
            </div>
            <p className="text-slate-300 mt-8">イタコがあなたの手相を読み解いています。</p>
          </div>
        );

      case 'result':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-lg max-w-4xl w-full">
            {error ? (
              <div className="md:col-span-2 text-center">
                <h2 className="text-3xl font-bold text-red-500 mb-4">エラー</h2>
                <p className="text-red-400">{error}</p>
                <button onClick={resetState} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-8">
                  もう一度占う
                </button>
              </div>
            ) : (
              <>
                {/* 左側の画像カード */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">あなたの手相</h3>
                  {previewImageUrl && (
                    <img src={previewImageUrl} alt="Your Hand" className="max-w-full max-h-96 object-contain rounded-lg border border-slate-700" />
                  )}
                </div>

                {/* 右側のイタコ神託タイムラインカード */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">イタコの神託</h3>
                  {itakoResult && (
                    <div className="space-y-6">
                      {/* タイムラインヘッダー */}
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
                          {selectedCharacter?.name[0]}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-100 text-lg">{selectedCharacter?.name}</span>
                            <span className="text-slate-400 text-sm">@{selectedCharacter?.id}</span>
                          </div>
                          <p className="text-slate-300 text-sm mt-1">
                            {selectedCharacter?.description}
                          </p>
                        </div>
                      </div>

                      {/* タイムラインコンテンツ */}
                      <div className="space-y-4 border-l-2 border-slate-700 pl-4 ml-6">
                        <div className="relative">
                          <div className="absolute -left-7 top-0 w-4 h-4 rounded-full bg-purple-500 border-2 border-slate-900"></div>
                          <p className="text-slate-200">
                            <strong className="text-purple-300">解釈:</strong> {itakoResult.interpretation}
                          </p>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-7 top-0 w-4 h-4 rounded-full bg-purple-500 border-2 border-slate-900"></div>
                          <p className="text-slate-200">
                            <strong className="text-purple-300">アドバイス:</strong> {itakoResult.advice}
                          </p>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-7 top-0 w-4 h-4 rounded-full bg-purple-500 border-2 border-slate-900"></div>
                          <p className="text-slate-200">
                            <strong className="text-purple-300">未来:</strong> {itakoResult.future}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={resetState} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 mt-8 w-full">
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex items-center justify-center font-sans">
      {renderScreen()}
    </div>
  );
}

export default App;
