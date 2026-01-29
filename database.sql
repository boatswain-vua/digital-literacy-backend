-- Создание базы данных
CREATE DATABASE digital_literacy;

-- Подключаемся к БД
\c digital_literacy;

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Таблица прогресса уроков
CREATE TABLE lesson_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    current_step INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- Таблица достижений
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_name VARCHAR(255) NOT NULL,
    achievement_icon VARCHAR(50),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_name)
);

-- Таблица результатов тестов
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_id VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица общей статистики пользователя
CREATE TABLE user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_lessons_completed INTEGER DEFAULT 0,
    total_tests_passed INTEGER DEFAULT 0,
    total_achievements INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_test_results_user ON test_results(user_id);
CREATE INDEX idx_user_stats_user ON user_stats(user_id);

-- Триггер для автоматического обновления статистики
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Обновляем количество пройденных уроков
        UPDATE user_stats 
        SET total_lessons_completed = (
            SELECT COUNT(*) FROM lesson_progress 
            WHERE user_id = NEW.user_id AND completed = TRUE
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
        
        -- Если записи нет, создаем
        INSERT INTO user_stats (user_id, total_lessons_completed)
        VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_progress_stats_trigger
AFTER INSERT OR UPDATE ON lesson_progress
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

-- Триггер для подсчета достижений
CREATE OR REPLACE FUNCTION update_achievements_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_stats 
    SET total_achievements = (
        SELECT COUNT(*) FROM achievements WHERE user_id = NEW.user_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER achievements_count_trigger
AFTER INSERT ON achievements
FOR EACH ROW
EXECUTE FUNCTION update_achievements_count();

-- Триггер для подсчета пройденных тестов
CREATE OR REPLACE FUNCTION update_tests_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.passed = TRUE THEN
        UPDATE user_stats 
        SET total_tests_passed = (
            SELECT COUNT(DISTINCT test_id) FROM test_results 
            WHERE user_id = NEW.user_id AND passed = TRUE
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tests_count_trigger
AFTER INSERT ON test_results
FOR EACH ROW
EXECUTE FUNCTION update_tests_count();
