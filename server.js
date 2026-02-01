const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Устанавливаем NODE_ENV если не установлена
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const pool = require('./db');
const authMiddleware = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
     origin: [
       'https://digital-literacy-frontend.vercel.app', // ваш реальный URL от Vercel
       'http://localhost:3000', // для локальной разработки
       'http://localhost:5173', // для Vite dev server
       process.env.FRONTEND_URL // добавьте переменную окружения для фронтенда
     ],
     credentials: true
   }));
app.use(express.json());

// ============================================
// МАРШРУТЫ АУТЕНТИФИКАЦИИ
// ============================================

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  console.log('🔄 Попытка регистрации:', { username, email });

  try {
    // Проверка на существование пользователя
    const userExists = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      console.log('❌ Пользователь уже существует:', { username, email });
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким именем или email уже существует'
      });
    }

    // Хеширование пароля
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Создание пользователя
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    console.log('✅ Пользователь создан:', newUser.rows[0]);

    // Создание записи статистики
    await pool.query(
      'INSERT INTO user_stats (user_id) VALUES ($1)',
      [newUser.rows[0].id]
    );

    // Создание токена
    const token = jwt.sign(
      { userId: newUser.rows[0].id, username: newUser.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Регистрация успешна для:', username);

    res.status(201).json({
      success: true,
      message: 'Регистрация успешна',
      token,
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email
      }
    });
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при регистрации',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Поиск пользователя
    const user = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Неверное имя пользователя или пароль'
      });
    }

    // Проверка пароля
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Неверное имя пользователя или пароль'
      });
    }

    // Обновление времени последнего входа
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.rows[0].id]
    );

    // Создание токена
    const token = jwt.sign(
      { userId: user.rows[0].id, username: user.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        email: user.rows[0].email
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при входе'
    });
  }
});

// Проверка токена
app.get('/api/auth/verify', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      user: user.rows[0]
    });
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// ============================================
// МАРШРУТЫ ПРОГРЕССА
// ============================================

// Получение всего прогресса пользователя
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const progress = await pool.query(
      'SELECT * FROM lesson_progress WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      success: true,
      progress: progress.rows
    });
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// Сохранение прогресса урока
app.post('/api/progress/lesson', authMiddleware, async (req, res) => {
  const { lessonId, completed, currentStep } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, completed, current_step, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, lesson_id) 
       DO UPDATE SET 
         completed = $3,
         current_step = $4,
         completed_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE lesson_progress.completed_at END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.userId, lessonId, completed, currentStep, completed ? new Date() : null]
    );

    res.json({
      success: true,
      message: 'Прогресс сохранен',
      progress: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка сохранения прогресса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// ============================================
// МАРШРУТЫ ДОСТИЖЕНИЙ
// ============================================

// Получение достижений пользователя
app.get('/api/achievements', authMiddleware, async (req, res) => {
  try {
    const achievements = await pool.query(
      'SELECT * FROM achievements WHERE user_id = $1 ORDER BY earned_at DESC',
      [req.userId]
    );

    res.json({
      success: true,
      achievements: achievements.rows
    });
  } catch (error) {
    console.error('Ошибка получения достижений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// Добавление достижения
app.post('/api/achievements', authMiddleware, async (req, res) => {
  const { achievementName, achievementIcon } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO achievements (user_id, achievement_name, achievement_icon)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, achievement_name) DO NOTHING
       RETURNING *`,
      [req.userId, achievementName, achievementIcon]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Достижение уже получено',
        alreadyEarned: true
      });
    }

    res.json({
      success: true,
      message: 'Достижение получено!',
      achievement: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка добавления достижения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// ============================================
// МАРШРУТЫ ТЕСТОВ
// ============================================

// Сохранение результата теста
app.post('/api/tests/result', authMiddleware, async (req, res) => {
  const { testId, score, totalQuestions, percentage, passed } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO test_results (user_id, test_id, score, total_questions, percentage, passed)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, testId, score, totalQuestions, percentage, passed]
    );

    res.json({
      success: true,
      message: 'Результат теста сохранен',
      testResult: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка сохранения результата теста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// Получение результатов тестов пользователя
app.get('/api/tests/results', authMiddleware, async (req, res) => {
  try {
    const results = await pool.query(
      'SELECT * FROM test_results WHERE user_id = $1 ORDER BY completed_at DESC',
      [req.userId]
    );

    res.json({
      success: true,
      results: results.rows
    });
  } catch (error) {
    console.error('Ошибка получения результатов тестов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// ============================================
// МАРШРУТЫ СТАТИСТИКИ
// ============================================

// Получение общей статистики пользователя
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await pool.query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [req.userId]
    );

    if (stats.rows.length === 0) {
      // Создаем запись статистики если её нет
      await pool.query(
        'INSERT INTO user_stats (user_id) VALUES ($1)',
        [req.userId]
      );
      
      return res.json({
        success: true,
        stats: {
          total_lessons_completed: 0,
          total_tests_passed: 0,
          total_achievements: 0,
          current_streak: 0
        }
      });
    }

    res.json({
      success: true,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// Получение детальной статистики (dashboard)
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    // Общая статистика
    const stats = await pool.query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [req.userId]
    );

    // Последние пройденные уроки
    const recentLessons = await pool.query(
      `SELECT * FROM lesson_progress 
       WHERE user_id = $1 AND completed = true 
       ORDER BY completed_at DESC 
       LIMIT 5`,
      [req.userId]
    );

    // Последние результаты тестов
    const recentTests = await pool.query(
      `SELECT * FROM test_results 
       WHERE user_id = $1 
       ORDER BY completed_at DESC 
       LIMIT 5`,
      [req.userId]
    );

    // Последние достижения
    const recentAchievements = await pool.query(
      `SELECT * FROM achievements 
       WHERE user_id = $1 
       ORDER BY earned_at DESC 
       LIMIT 5`,
      [req.userId]
    );

    res.json({
      success: true,
      dashboard: {
        stats: stats.rows[0] || {
          total_lessons_completed: 0,
          total_tests_passed: 0,
          total_achievements: 0,
          current_streak: 0
        },
        recentLessons: recentLessons.rows,
        recentTests: recentTests.rows,
        recentAchievements: recentAchievements.rows
      }
    });
  } catch (error) {
    console.error('Ошибка получения dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 API доступен по адресу: http://localhost:${PORT}`);
});
