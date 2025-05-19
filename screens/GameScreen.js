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
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const GRID_SIZE = 4; // 4x4 grid, webdeki gibi daha fazla parça
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

const GameScreen = ({ route, navigation }) => {
  const { test } = route.params;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revealedCells, setRevealedCells] = useState([]);
  const [answer, setAnswer] = useState('');
  const [inputError, setInputError] = useState('');
  const [timeLeft, setTimeLeft] = useState(MAX_TIME);
  const [skipped, setSkipped] = useState(false);
  const [guessHistory, setGuessHistory] = useState([]);
  const timerRef = useRef();

  useEffect(() => {
    if (test && test.questions) {
      setLoading(false);
      setTimeLeft(MAX_TIME);
      setRevealedCells([getRandomCell()]); // ilk başta bir parça açık
    }
  }, [test]);

  useEffect(() => {
    if (!loading && !gameOver) {
      setTimeLeft(MAX_TIME);
      setAnswer('');
      setInputError('');
      setSkipped(false);
      setGuessHistory([]);
      setRevealedCells([getRandomCell()]);
      startTimer();
    }
    return () => clearInterval(timerRef.current);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (timeLeft === 0 && !gameOver) {
      handleSkip();
    }
  }, [timeLeft]);

  const currentQuestion = test?.questions[currentQuestionIndex];

  function getRandomCell() {
    return Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
  }

  function revealRandomCell() {
    const allCells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);
    const hiddenCells = allCells.filter(i => !revealedCells.includes(i));
    if (hiddenCells.length === 0) return;
    const randomCell = hiddenCells[Math.floor(Math.random() * hiddenCells.length)];
    setRevealedCells(prev => [...prev, randomCell]);
  }

  function startTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
  }

  function handleGuess() {
    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      setInputError('Lütfen bir cevap girin.');
      return;
    }
    if (!currentQuestion || !currentQuestion.answer || typeof currentQuestion.answer !== 'string') {
      setInputError('Soru verisi hatalı.');
      return;
    }
    setInputError('');
    Keyboard.dismiss();
    const userAnswer = answer.trim();
    const correctAnswer = currentQuestion.answer.trim();
    let type = 'wrong';
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
      type = 'correct';
    } else if (levenshtein(userAnswer.toLowerCase(), correctAnswer.toLowerCase()) <= 2) {
      type = 'close';
    }
    setGuessHistory(prev => [...prev, { text: userAnswer, type }]);
    if (type === 'correct') {
      setScore(prev => prev + 1);
      setTimeout(() => {
        Alert.alert('Doğru!', 'Tebrikler, doğru bildiniz!', [
          { text: 'Devam', onPress: nextQuestion }
        ]);
      }, 300);
    } else {
      revealRandomCell();
      setInputError(type === 'close' ? 'Çok yakın! Biraz daha dikkatli yaz.' : 'Yanlış cevap! Bir parça daha açıldı.');
    }
  }

  function handleSkip() {
    setSkipped(true);
    Alert.alert('Süre doldu!', 'Bu soruyu atladınız.', [
      { text: 'Devam', onPress: nextQuestion }
    ]);
  }

  function nextQuestion() {
    clearInterval(timerRef.current);
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setGameOver(true);
    }
  }

  function handleRestart() {
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameOver(false);
    setRevealedCells([getRandomCell()]);
    setTimeLeft(MAX_TIME);
    setAnswer('');
    setInputError('');
    setSkipped(false);
    setGuessHistory([]);
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
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Test Tamamlandı!</Text>
          <Text style={styles.scoreText}>
            Puanınız: {score}/{test.questions.length}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.restartButton]}
              onPress={handleRestart}
            >
              <Text style={styles.buttonText}>Tekrar Oyna</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.exitButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonText}>Çıkış</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Açık parça yüzdesi
  const percentVisible = Math.round((revealedCells.length / (GRID_SIZE * GRID_SIZE)) * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bilgi */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.progress}>
          {currentQuestionIndex + 1}/{test.questions.length}
        </Text>
        <View style={styles.timerBox}>
          <Feather name="clock" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.timerText}>{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</Text>
        </View>
        <Text style={styles.score}>🏆 {score}</Text>
      </View>

      {/* Soru ve Grid */}
      <View style={styles.content}>
        <Text style={styles.questionTitle}>Soru {currentQuestionIndex + 1}/{test.questions.length}</Text>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        <View style={styles.gridContainer}>
          {renderGrid()}
          <View style={styles.percentBox}>
            <Feather name="eye" size={16} color="#fff" />
            <Text style={styles.percentText}>{percentVisible}% görünür</Text>
          </View>
        </View>
        {/* Tahmin geçmişi */}
        {guessHistory.length > 0 && (
          <View style={styles.guessHistoryBox}>
            <Text style={styles.guessHistoryLabel}>Tahminleriniz:</Text>
            <FlatList
              data={guessHistory}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <Text
                    style={[
                      styles.guessHistoryItem,
                      item.type === 'correct' && { color: 'green', fontWeight: 'bold' },
                      item.type === 'close' && { color: 'orange' },
                      item.type === 'wrong' && { color: theme.colors.error }
                    ]}
                  >
                    {item.text}
                  </Text>
                  {item.type === 'correct' && <Feather name="check-circle" size={16} color="green" style={{ marginLeft: 4 }} />}
                  {item.type === 'close' && <Feather name="alert-circle" size={16} color="orange" style={{ marginLeft: 4 }} />}
                  {item.type === 'wrong' && <Feather name="x-circle" size={16} color={theme.colors.error} style={{ marginLeft: 4 }} />}
                </View>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      {/* Cevap Girişi ve Butonlar */}
      <View style={styles.answerBox}>
        <Text style={styles.answerLabel}>Cevabınız</Text>
        <TextInput
          style={styles.input}
          placeholder="Cevabınızı yazın..."
          placeholderTextColor={theme.colors.textSecondary}
          value={answer}
          onChangeText={setAnswer}
          editable={!skipped}
          onSubmitEditing={handleGuess}
        />
        {inputError ? <Text style={styles.inputError}>{inputError}</Text> : null}
        <TouchableOpacity style={styles.guessButton} onPress={handleGuess} disabled={skipped}>
          <Text style={styles.guessButtonText}>Tahmin Et</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={skipped}>
          <Text style={styles.skipButtonText}>Soruyu Atla</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  progress: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 8,
  },
  timerText: {
    marginLeft: 4,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  score: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  questionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  questionText: {
    ...theme.typography.body1,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  gridContainer: {
    alignSelf: 'center',
    marginVertical: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  revealedCell: {
    backgroundColor: 'transparent',
  },
  hiddenCell: {
    backgroundColor: theme.colors.background,
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
    paddingVertical: 2,
  },
  percentText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 13,
  },
  answerBox: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  answerLabel: {
    ...theme.typography.body2,
    color: theme.colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputError: {
    color: theme.colors.error,
    marginBottom: 8,
  },
  guessButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  guessButtonText: {
    color: theme.colors.primaryForeground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  skipButton: {
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  gameOverTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  scoreText: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  button: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  restartButton: {
    backgroundColor: theme.colors.primary,
  },
  exitButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.primaryForeground,
  },
  guessHistoryBox: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
  },
  guessHistoryLabel: {
    ...theme.typography.body2,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  guessHistoryItem: {
    ...theme.typography.body1,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
});

export default GameScreen; 