# 🔧 Платформа цифровой грамотности — Backend API

**ВНИМАНИЕ! Поскольку база данных расположена на бесплатном сервисе, то первоначальная загрузка платформы занимает несколько минут!**

> REST API сервер для образовательной платформы цифровой грамотности

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**🌐 API URL:** https://digital-literacy-api.onrender.com

---

## 📖 О проекте

Backend API для платформы цифровой грамотности. Обрабатывает авторизацию пользователей, сохранение прогресса обучения, результаты тестов и статистику.

Разработан командой школьников 10 класса для Московской предпрофессиональной олимпиады.

---

## 🛠️ Технологии

- **Node.js 18+** — серверная платформа
- **Express 4.21** — веб-фреймворк
- **PostgreSQL** — реляционная база данных
- **JWT** — авторизация через токены
- **bcrypt** — хеширование паролей
- **pg** — драйвер PostgreSQL
- **dotenv** — управление переменными окружения
- **CORS** — разрешения для API

---

## 📦 Установка и запуск

### Требования

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (или доступ к облачной БД)

### Шаги установки

1. **Клонируйте репозиторий**

```bash
git clone https://github.com/boatswain-vua/digital-literacy-backend.git
cd digital-literacy-backend
```

2. **Установите зависимости**

```bash
npm install
```

3. **Настройте переменные окружения**

Создайте файл `.env` в корне проекта:

```env
# База данных (выберите один из вариантов)

# Вариант 1: Строка подключения (DATABASE_URL)
DATABASE_URL=postgresql://user:password@host:port/database

# Вариант 2: Отдельные переменные
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=digital_literacy

# JWT секретный ключ (минимум 32 символа)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# Порт сервера
PORT=3001

# Окружение
NODE_ENV=development
```

4. **Создайте базу данных**

Выполните SQL скрипт для создания таблиц:

```bash
psql -U postgres -d digital_literacy -f database.sql
```

Или импортируйте через pgAdmin/DBeaver.

5. **Запустите сервер**

```bash
npm start
```

Сервер запустится на `http://localhost:3001`

### Development режим (с автоперезагрузкой)

```bash
npm install -g nodemon  # установите один раз
npm run dev             # запуск с nodemon
```

---

## 📁 Структура проекта

```
backend/
├── node_modules/         # Зависимости
├── db.js                # Подключение к PostgreSQL
├── server.js            # Основной файл сервера
├── database.sql         # SQL скрипт создания таблиц
├── package.json         # Зависимости и скрипты
├── .env                 # Переменные окружения (не в Git!)
├── .gitignore          # Исключения для Git
└── README.md           # Эта документация
```

---

## 🗄️ База данных

### Схема таблиц

```sql
users              — Пользователи
├── id (PK)
├── username
├── email
├── password_hash
├── created_at
└── last_login

lesson_progress    — Прогресс уроков
├── id (PK)
├── user_id (FK → users.id)
├── lesson_id
├── completed
├── completed_at
├── current_step
└── updated_at

achievements       — Достижения
├── id (PK)
├── user_id (FK → users.id)
├── achievement_name
├── achievement_icon
└── earned_at

test_results       — Результаты тестов
├── id (PK)
├── user_id (FK → users.id)
├── test_id
├── score
├── total_questions
├── percentage
├── passed
└── completed_at

user_stats         — Статистика
├── id (PK)
├── user_id (FK → users.id)
├── total_lessons_completed
├── total_tests_passed
├── total_achievements
├── current_streak
├── last_activity_date
└── updated_at
```

### Автоматизация

Используются **PostgreSQL триггеры** для автоматического обновления статистики при добавлении новых записей в `lesson_progress`, `achievements` и `test_results`.

---

## 🔌 API Endpoints

### Авторизация

#### POST `/api/auth/register`
Регистрация нового пользователя.

**Request:**
```json
{
  "username": "ivan_petrov",
  "email": "ivan@example.com",
  "password": "secure_password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "ivan_petrov",
    "email": "ivan@example.com"
  }
}
```

---

#### POST `/api/auth/login`
Вход в систему.

**Request:**
```json
{
  "username": "ivan_petrov",
  "password": "secure_password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "ivan_petrov",
    "email": "ivan@example.com"
  }
}
```

---

#### GET `/api/auth/verify`
Проверка JWT токена.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "ivan_petrov",
    "email": "ivan@example.com"
  }
}
```

---

### Прогресс уроков

#### GET `/api/progress`
Получить прогресс всех уроков пользователя.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "progress": [
    {
      "lesson_id": "messenger-basic",
      "completed": true,
      "completed_at": "2026-02-01T10:30:00Z",
      "current_step": 10
    },
    {
      "lesson_id": "phone-basic",
      "completed": false,
      "current_step": 3
    }
  ]
}
```

---

#### POST `/api/progress`
Сохранить прогресс урока.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "lessonId": "messenger-basic",
  "completed": true,
  "currentStep": 10
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Прогресс сохранён"
}
```

---

### Достижения

#### GET `/api/achievements`
Получить все достижения пользователя.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "achievements": [
    {
      "id": 1,
      "achievement_name": "Первые шаги",
      "achievement_icon": "🎯",
      "earned_at": "2026-02-01T10:35:00Z"
    },
    {
      "id": 2,
      "achievement_name": "Мастер сообщений",
      "achievement_icon": "💬",
      "earned_at": "2026-02-01T11:00:00Z"
    }
  ]
}
```

---

#### POST `/api/achievements`
Добавить новое достижение (внутренний endpoint).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "achievementName": "Первые шаги",
  "achievementIcon": "🎯"
}
```

**Response (201):**
```json
{
  "success": true,
  "achievement": {
    "id": 1,
    "achievement_name": "Первые шаги",
    "achievement_icon": "🎯"
  }
}
```

---

### Тесты

#### POST `/api/tests/result`
Сохранить результат теста.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "testId": "messenger-test",
  "score": 6,
  "totalQuestions": 7,
  "percentage": 86,
  "passed": true
}
```

**Response (201):**
```json
{
  "success": true,
  "result": {
    "id": 1,
    "test_id": "messenger-test",
    "score": 6,
    "passed": true
  }
}
```

---

#### GET `/api/tests/results`
Получить все результаты тестов пользователя.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "test_id": "messenger-test",
      "score": 6,
      "total_questions": 7,
      "percentage": 86,
      "passed": true,
      "completed_at": "2026-02-01T12:00:00Z"
    }
  ]
}
```

---

### Статистика

#### GET `/api/stats`
Получить статистику пользователя.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total_lessons_completed": 5,
    "total_tests_passed": 3,
    "total_achievements": 8,
    "current_streak": 2,
    "last_activity_date": "2026-02-05"
  }
}
```

---

#### GET `/api/dashboard`
Получить полную информацию для дашборда.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "dashboard": {
    "user": {
      "username": "ivan_petrov",
      "email": "ivan@example.com"
    },
    "stats": {
      "total_lessons_completed": 5,
      "total_tests_passed": 3,
      "total_achievements": 8
    },
    "recent_progress": [
      {
        "lesson_id": "messenger-advanced",
        "completed": true,
        "completed_at": "2026-02-05T14:30:00Z"
      }
    ],
    "achievements": [
      {
        "achievement_name": "Первые шаги",
        "achievement_icon": "🎯",
        "earned_at": "2026-02-01T10:35:00Z"
      }
    ],
    "test_results": [
      {
        "test_id": "messenger-test",
        "passed": true,
        "percentage": 86
      }
    ]
  }
}
```

---

## 🔒 Безопасность

### Аутентификация

- **JWT токены** — для авторизации запросов
- **bcrypt** — хеширование паролей с солью (10 раундов)
- **HTTP-only токены** — токен хранится в localStorage на клиенте
- **Проверка токена** — middleware для защищённых роутов

### Защита от атак

- ✅ **SQL Injection** — параметризованные запросы через pg
- ✅ **XSS** — валидация входных данных
- ✅ **CSRF** — CORS настроен только для Frontend домена
- ✅ **Brute Force** — можно добавить rate limiting

### CORS настройки

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',           // Development
    'https://your-app.vercel.app'      // Production
  ],
  credentials: true
}));
```

---

## 🚀 Деплой

### Render.com (рекомендуется)

1. Подключите GitHub репозиторий к Render
2. Создайте Web Service
3. Настройки:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Добавьте Environment Variables:
   ```
   DB_HOST=db.xxx.supabase.co
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=postgres
   JWT_SECRET=your_secret_key
   PORT=3001
   NODE_ENV=production
   NODE_OPTIONS=--dns-result-order=ipv4first
   ```
5. Deploy!

**Важно:** На бесплатном tier Render backend "засыпает" после 15 минут неактивности. Первый запрос после сна займёт 30-60 секунд (cold start).

### Heroku

```bash
heroku create digital-literacy-api
heroku addons:create heroku-postgresql:mini
heroku config:set JWT_SECRET=your_secret_key
git push heroku main
```

### Railway

1. Подключите репозиторий
2. Добавьте PostgreSQL plugin
3. Установите переменные окружения
4. Deploy

---

## 🗃️ База данных: Supabase

Рекомендуем использовать **Supabase** для PostgreSQL:

1. Создайте проект на https://supabase.com
2. SQL Editor → вставьте `database.sql` → Run
3. Settings → Database → скопируйте Connection String
4. Добавьте переменные на Render:
   ```
   DB_HOST=db.xxx.supabase.co
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=ваш_пароль
   DB_NAME=postgres
   ```

**Преимущества Supabase:**
- ✅ 500MB бесплатно навсегда
- ✅ База не удаляется
- ✅ Удобный SQL Editor
- ✅ Table Editor для просмотра данных

---

## 🧪 Тестирование

### Ручное тестирование через Postman

1. **Установите Postman** или используйте веб-версию
2. **Импортируйте коллекцию** (можно создать самостоятельно)
3. **Тестируйте endpoints:**

**Регистрация:**
```
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "username": "test_user",
  "email": "test@test.ru",
  "password": "123456"
}
```

**Вход:**
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "username": "test_user",
  "password": "123456"
}
```

**Проверка токена:**
```
GET http://localhost:3001/api/auth/verify
Authorization: Bearer <your_token>
```

### Unit-тесты (планируется)

Планируем добавить тесты с использованием:
- **Jest** — для unit-тестов
- **Supertest** — для тестирования API endpoints

---

## 📊 Мониторинг

### Логи на Render

Просмотр логов в реальном времени:
1. Dashboard → Ваш сервис → Logs
2. Фильтрация по типу (info, error, warn)

### Проверка здоровья API

Добавьте endpoint для проверки:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

## 🤝 Вклад в проект

### Команда Backend

- **Логинов Артем** — Lead Backend Developer
  - Архитектура API
  - Авторизация и безопасность
  - База данных

- **Правдин Илья** — DevOps
  - Деплой на Render
  - Настройка окружений
  - Git workflow

### Связанные репозитории

- 🔗 [Frontend](https://github.com/boatswain-vua/digital-literacy-frontend) — React приложение
- 📄 [Документация](./DOCUMENTATION.md) — Полная техническая документация

---

## 📝 Лицензия

MIT License

Copyright (c) 2026 Digital Literacy Team

---

## 📞 Контакты

**Проект создан для Московской предпрофессиональной олимпиады 2026**

Для вопросов создавайте [Issues](https://github.com/boatswain-vua/digital-literacy-backend/issues)

---

## 🎯 TODO

- [ ] Добавить unit-тесты (Jest)
- [ ] Добавить rate limiting для защиты от brute force
- [ ] Добавить логирование в файл (Winston)
- [ ] Добавить email уведомления
- [ ] Добавить систему восстановления пароля
- [ ] Оптимизировать SQL запросы
- [ ] Добавить кэширование (Redis)

---

**Сделано с ❤️ командой школьников 10 класса**
