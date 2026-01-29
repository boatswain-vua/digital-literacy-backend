const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен не предоставлен' 
      });
    }

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Добавляем информацию о пользователе в запрос
    req.userId = decoded.userId;
    req.username = decoded.username;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен истек' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Неверный токен' 
    });
  }
};

module.exports = authMiddleware;
