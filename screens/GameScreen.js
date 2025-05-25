import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Keyboard,
  FlatList, // FlatList importu mevcut ancak kodda kullanılmıyor, isterseniz kaldırılabilir.
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const GRID_SIZE = 5; // 5x5 grid
const CELL_SIZE = width * 0.8 / GRID_SIZE;
const MAX_TIME = 20; // saniye cinsinden, örnek

// Levenshtein mesafesi fonksiyonu
function levenshtein(a, b) {
  if (!a || !b) return Math.max((a || '').length, (b || '').length);
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

function generateRevealGrid(gridSize, revealPercent) {
  const totalCells = gridSize * gridSize;
  const cellsToReveal = Math.floor(totalCells * (revealPercent / 100));
  
  const allCells = Array.from({ length: totalCells }, (_, i) => i);
  
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }
  
  return allCells.slice(0, cellsToReveal);
}

const GameScreen = ({ route, navigation }) => {
  const { test } = route.params;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revealPercent, setRevealPercent] = useState(30);
  const [answer, setAnswer] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [guessHistory, setGuessHistory] = useState([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [revealedCells, setRevealedCells] = useState([]);
  const [showCorrectEffect, setShowCorrectEffect] = useState(false);
  const [showWrongEffect, setShowWrongEffect] = useState(false);
  const [isGuessHistoryVisible, setIsGuessHistoryVisible] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    if (!test || !test.questions || test.questions.length === 0) {
      Alert.alert(
        'Hata',
        'Test verileri yüklenemedi. Lütfen tekrar deneyin.',
        [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]
      );
      return;
    }

    setLoading(false);
    startTimer();
    setRevealedCells(generateRevealGrid(GRID_SIZE, revealPercent));
  }, [test]);

  useEffect(() => {
    if (!loading && !gameOver) {
      setAnswer('');
      setWrongAttempts(0);
      setRevealPercent(30);
      setRevealedCells(generateRevealGrid(GRID_SIZE, 30));
    }
    return () => clearInterval(timerRef.current);
  }, [currentQuestionIndex]);

  const currentQuestion = test?.questions[currentQuestionIndex];

  function startTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  }

  function calculateNewRevealPercent(currentPercent, wrongAttempts) {
    const increaseAmount = Math.min(5 + (wrongAttempts * 2), 15);
    return Math.min(currentPercent + increaseAmount, 100);
  }

  function calculateScore(revealPercent) {
    const baseScore = 1000;
    const revealPenalty = Math.round(revealPercent * 10);
    return Math.max(baseScore - revealPenalty, 100);
  }

  function handleGuess() {
    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return;
    }

    Keyboard.dismiss();
    const userAnswer = answer.trim().toLowerCase();
    const correctAnswers = currentQuestion.answers.map(ans => ans.toLowerCase());
    let type = 'wrong';
    
    if (correctAnswers.includes(userAnswer)) {
      type = 'correct';
      setShowCorrectEffect(true);
      setTimeout(() => setShowCorrectEffect(false), 1000);
    } else {
      const isClose = correctAnswers.some(correctAnswer => 
        levenshtein(userAnswer, correctAnswer) <= 2
      );
      if (isClose) {
        type = 'close';
      } else {
        setShowWrongEffect(true);
        setTimeout(() => setShowWrongEffect(false), 1000);
      }
    }
    
    setGuessHistory(prev => [{ text: userAnswer, type }, ...prev]);
    setAnswer('');
    
    if (type === 'correct') {
      const questionScore = calculateScore(revealPercent);
      setScore(prev => prev + questionScore);
      
      setTimeout(() => {
        if (currentQuestionIndex < test.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setRevealPercent(30);
          setGuessHistory([]);
          setAnswer('');
          setIsGuessHistoryVisible(false);
        } else {
          setGameOver(true);
          clearInterval(timerRef.current);
        }
      }, 1500);
    } else {
      setWrongAttempts(prev => prev + 1);
      const newRevealPercent = calculateNewRevealPercent(revealPercent, wrongAttempts + 1);
      setRevealPercent(newRevealPercent);
      setRevealedCells(generateRevealGrid(GRID_SIZE, newRevealPercent));
    }
  }

  function handleSkip() {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setRevealPercent(30);
      setGuessHistory([]);
      setAnswer('');
      setIsGuessHistoryVisible(false);
    } else {
      setGameOver(true);
      clearInterval(timerRef.current);
    }
  }

  function handleRestart() {
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameOver(false);
    setRevealPercent(30);
    setTimeElapsed(0);
    setAnswer('');
    setWrongAttempts(0);
    setGuessHistory([]);
    setIsGuessHistoryVisible(false);
    startTimer();
  }

  function handleExit() {
    Alert.alert(
      'Çıkış',
      'Testten çıkmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çık', onPress: () => navigation.goBack() }
      ]
    );
  }

  function renderGrid() {
    const grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const cellIndex = row * GRID_SIZE + col;
        const isRevealed = revealedCells.includes(cellIndex);
        rowCells.push(
          <View
            key={`${row}-${col}`}
            style={[styles.cell, isRevealed ? styles.revealedCell : styles.hiddenCell]}
          >
            {isRevealed && (
              <Image
                source={{ uri: currentQuestion.imageUrl }}
                style={[
                  styles.cellImage,
                  {
                    width: CELL_SIZE * GRID_SIZE,
                    height: CELL_SIZE * GRID_SIZE,
                    transform: [
                      { translateX: -col * CELL_SIZE },
                      { translateY: -row * CELL_SIZE }
                    ]
                  }
                ]}
                resizeMode="cover"
                // cachePolicy="memory-disk" // React Native Image'de cachePolicy prop'u yok. Varsayılan davranış kullanılır.
              />
            )}
          </View>
        );
      }
      grid.push(
        <View key={row} style={styles.row}>
          {rowCells}
        </View>
      );
    }
    return grid;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverContainer}>
            <View style={styles.trophyContainer}>
              <Feather name="award" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.gameOverTitle}>Test Tamamlandı! 🎉</Text>
            <Text style={styles.scoreText}>{score} Puan</Text>
            <Text style={styles.timeText}>
              Toplam süre: {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.restartButton]}
                onPress={handleRestart}
              >
                <Feather name="play" size={20} color={theme.colors.primaryForeground} />
                <Text style={styles.buttonText}>Tekrar Oyna</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.exitButton]}
                onPress={() => navigation.goBack()} // Test detayları yerine ana menüye dönme olabilir
              >
                <Feather name="home" size={20} color={theme.colors.text} /> 
                <Text style={[styles.buttonText, {color: theme.colors.text}]}>Ana Menü</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bilgi */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{test.title}</Text>
        <View style={styles.scoreContainer}>
          <Feather name="trophy" size={20} color={theme.colors.primary} />
          <Text style={styles.score}>{score}</Text>
        </View>
      </View>

      {/* İlerleme Çubuğu */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${(currentQuestionIndex / test.questions.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentQuestionIndex + 1}/{test.questions.length}
        </Text>
      </View>

      {/* Ana Oyun Alanı */}
      <ScrollView contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.questionContainer}>
            <Text style={styles.questionTitle}>Soru {currentQuestionIndex + 1}</Text>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          <View style={[
            styles.gridContainer,
            showCorrectEffect && styles.correctEffect,
            showWrongEffect && styles.wrongEffect
          ]}>
            {renderGrid()}
            <View style={styles.percentBox}>
              <Feather name="eye" size={16} color="#fff" />
              <Text style={styles.percentText}>{revealPercent}% görünür</Text>
            </View>
          </View>

          {/* Tahmin Geçmişi */}
          {guessHistory.length > 0 && (
            <View style={styles.guessHistoryWrapper}>
              <TouchableOpacity 
                style={styles.guessHistoryToggle}
                onPress={() => setIsGuessHistoryVisible(!isGuessHistoryVisible)}
              >
                <View style={styles.guessHistoryToggleContent}>
                  <View style={styles.guessHistoryToggleLeft}>
                    <Feather 
                      name="list" 
                      size={18} 
                      color={theme.colors.text} 
                    />
                    <Text style={styles.guessHistoryToggleText}>
                      Tahmin Geçmişi ({guessHistory.length})
                    </Text>
                  </View>
                  <Feather 
                    name={isGuessHistoryVisible ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color={theme.colors.text} 
                  />
                </View>
              </TouchableOpacity>

              {isGuessHistoryVisible && (
                <View style={styles.guessHistoryContainer}>
                  <FlatList 
                    data={guessHistory}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <View 
                        style={[
                          styles.guessHistoryItem,
                          item.type === 'correct' && styles.correctGuessContainer,
                          item.type === 'close' && styles.closeGuessContainer,
                          item.type === 'wrong' && styles.wrongGuessContainer
                        ]}
                      >
                        <Text style={styles.guessHistoryText}>{item.text}</Text>
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    style={styles.guessHistoryList}
                  />
                </View>
              )}
            </View>
          )}

          {/* Cevap Girişi */}
          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>Cevabınız</Text>
            <TextInput
              style={styles.input}
              placeholder="Cevabınızı yazın..."
              placeholderTextColor={theme.colors.textSecondary}
              value={answer}
              onChangeText={setAnswer}
              editable={!gameOver}
              onSubmitEditing={handleGuess}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.guessButton, { flex: 1 }]} onPress={handleGuess} disabled={gameOver}>
                <Text style={styles.guessButtonText}>Tahmin Et</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.skipButton, { flex: 1 }]} onPress={handleSkip} disabled={gameOver}>
                <Text style={styles.skipButtonText}>Soruyu Atla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
    fontFamily: 'Outfit_400Regular',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  score: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
    fontFamily: 'Outfit_700Bold',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'Outfit_400Regular',
  },
  content: {
    padding: 16,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Outfit_700Bold',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
  },
  gridContainer: {
    alignSelf: 'center',
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  revealedCell: {
    backgroundColor: 'transparent',
  },
  hiddenCell: {
    backgroundColor: '#000',
  },
  cellImage: {
    position: 'absolute',
  },
  percentBox: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  percentText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  guessHistoryWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  guessHistoryContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 8,
    maxHeight: 200,
  },
  guessHistoryToggle: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  guessHistoryToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guessHistoryToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guessHistoryToggleText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fff',
    fontFamily: 'Outfit_400Regular',
  },
  guessHistoryList: {
    maxHeight: 200,
  },
  guessHistoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guessHistoryText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    fontFamily: 'Outfit_400Regular',
  },
  correctGuessContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  closeGuessContainer: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#eab308',
  },
  wrongGuessContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  answerBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  answerLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Outfit_400Regular',
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 12,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  guessButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  guessButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  skipButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  skipButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  gameOverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  gameOverContainer: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  trophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
    fontFamily: 'Outfit_700Bold',
  },
  timeText: {
    fontSize: 16,
    color: '#71717A',
    marginBottom: 24,
    fontFamily: 'Outfit_400Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  restartButton: {
    backgroundColor: theme.colors.primary,
  },
  exitButton: {
    borderWidth: 1,
    borderColor: '#27272A',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  correctEffect: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  wrongEffect: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
});

export default GameScreen;