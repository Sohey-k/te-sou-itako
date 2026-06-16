import React, { useState, useRef, useEffect } from 'react';
import { analyzeHand } from './api'; // getItakoReadingを削除
import './App.css'; // App.cssをインポート

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
          <div style={styles.container}>
            <h1 style={styles.title}>手相イタコ占い</h1>
            <p style={styles.description}>あなたの手相をイタコが読み解きます。</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              style={styles.fileInput}
            />
            <button onClick={() => fileInputRef.current.click()} style={styles.button}>
              手相画像をアップロードする
            </button>
          </div>
        );

      case 'preview':
        return (
          <div style={styles.container}>
            <h2 style={styles.subtitle}>選択した画像</h2>
            {previewImageUrl && (
              <img src={previewImageUrl} alt="Preview" style={styles.previewImage} />
            )}
            <div style={styles.buttonGroup}>
              <button onClick={() => setScreen('character')} style={styles.button}>
                この画像で占う
              </button>
              <button onClick={resetState} style={{ ...styles.button, ...styles.secondaryButton }}>
                撮り直す
              </button>
            </div>
          </div>
        );

      case 'character':
        return (
          <div style={styles.container}>
            <h2 style={styles.subtitle}>イタコを選ぶ</h2>
            <div style={styles.characterGrid}>
              {characters.map((char) => (
                <div
                  key={char.id}
                  style={{
                    ...styles.characterCard,
                    ...(selectedCharacter?.id === char.id ? styles.selectedCard : {}),
                  }}
                  onClick={() => setSelectedCharacter(char)}
                >
                  <h3>{char.name}</h3>
                  <p>{char.description}</p>
                </div>
              ))}
            </div>
            {selectedCharacter && (
              <p style={styles.selectionText}>選択中: {selectedCharacter.name}</p>
            )}
            <div style={styles.buttonGroup}>
              <button
                onClick={handleFortuneTelling}
                disabled={!selectedCharacter}
                style={styles.button}
              >
                占ってもらう
              </button>
              <button onClick={() => setScreen('preview')} style={{ ...styles.button, ...styles.secondaryButton }}>
                戻る
              </button>
            </div>
            {error && <p style={styles.errorText}>{error}</p>}
          </div>
        );

      case 'loading':
        return (
          <div style={styles.container}>
            <h2 style={styles.subtitle}>解析中...</h2>
            {/* className="spinner" を追加し、アニメーションはApp.cssで管理 */}
            <div className="spinner" style={styles.spinnerBase}></div>
            <p>イタコがあなたの手相を読み解いています。</p>
          </div>
        );

      case 'result':
        return (
          <div style={styles.container}>
            <h2 style={styles.subtitle}>占い結果</h2>
            {error ? (
              <p style={styles.errorText}>エラー: {error}</p>
            ) : (
              itakoResult && (
                <div style={styles.resultContent}>
                  <h3 style={styles.characterName}>イタコ: {selectedCharacter?.name}</h3>
                  <p style={styles.resultSection}>
                    <strong>解釈:</strong> {itakoResult.interpretation}
                  </p>
                  <p style={styles.resultSection}>
                    <strong>アドバイス:</strong> {itakoResult.advice}
                  </p>
                  <p style={styles.resultSection}>
                    <strong>未来:</strong> {itakoResult.future}
                  </p>
                </div>
              )
            )}
            <button onClick={resetState} style={styles.button}>
              もう一度占う
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.appContainer}>
      {renderScreen()}
    </div>
  );
}

// シンプルなインラインスタイル
const styles = {
  appContainer: {
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    padding: '20px',
    boxSizing: 'border-box',
  },
  container: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    color: '#333',
    fontSize: '2.5em',
    marginBottom: '15px',
  },
  subtitle: {
    color: '#555',
    fontSize: '1.8em',
    marginBottom: '20px',
  },
  description: {
    color: '#666',
    fontSize: '1.1em',
    marginBottom: '30px',
  },
  fileInput: {
    display: 'none', // ファイル選択ボタンを非表示にし、カスタムボタンでトリガー
  },
  button: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1.1em',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'background-color 0.3s ease',
    width: '100%',
    maxWidth: '300px',
    boxSizing: 'border-box',
  },
  buttonHover: {
    backgroundColor: '#45a049',
  },
  secondaryButton: {
    backgroundColor: '#f44336',
    marginLeft: '10px',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #ddd',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  characterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  characterCard: {
    border: '2px solid #eee',
    borderRadius: '8px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#f9f9f9',
  },
  characterCardHover: {
    borderColor: '#4CAF50',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  selectedCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#e6ffe6',
    boxShadow: '0 4px 10px rgba(76, 175, 80, 0.2)',
  },
  selectionText: {
    fontSize: '1.1em',
    color: '#333',
    marginTop: '10px',
  },
  spinnerBase: { // スピナーの基本スタイルをインラインで定義
    border: '4px solid rgba(0, 0, 0, .1)',
    borderLeftColor: '#4CAF50',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    margin: '30px auto',
    // animationプロパティはApp.cssに移動
  },
  resultContent: {
    textAlign: 'left',
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #eee',
  },
  characterName: {
    fontSize: '1.5em',
    color: '#333',
    marginBottom: '15px',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
  },
  resultSection: {
    fontSize: '1.1em',
    color: '#444',
    lineHeight: '1.6',
    marginBottom: '10px',
  },
  errorText: {
    color: '#f44336',
    marginTop: '20px',
    fontWeight: 'bold',
  },
};

export default App;
