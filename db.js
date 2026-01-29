const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'digital_literacy',
  max: 20, // максимальное количество подключений в пуле
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Проверка подключения
pool.on('connect', () => {
  console.log('✅ Подключено к базе данных PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка подключения к БД:', err);
  process.exit(-1);
});

module.exports = pool;
