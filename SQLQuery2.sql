-- ============================================
-- БАЗА ДАННЫХ ARGK GYM
-- Создание всех таблиц
-- ============================================

-- 1. Таблица тренеров
CREATE TABLE Trainers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Spec NVARCHAR(100) NOT NULL,
    Photo NVARCHAR(500) NOT NULL,
    Experience NVARCHAR(50) NOT NULL,
    Achievements NVARCHAR(500) NOT NULL,
    Description NVARCHAR(1000) NOT NULL
);
GO

-- 2. Таблица пользователей
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Password NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(50) NOT NULL,
    Role NVARCHAR(20) NOT NULL DEFAULT 'user'
);
GO

-- 3. Таблица заказов
CREATE TABLE Orders (
    Id BIGINT PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(50) NOT NULL,
    ServiceTrainer NVARCHAR(500) NOT NULL,
    Date NVARCHAR(10) NOT NULL
);
GO

-- 4. Таблица заявок
CREATE TABLE SupportRequests (
    Id BIGINT PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(50) NOT NULL,
    Time NVARCHAR(100) NULL,
    Question NVARCHAR(1000) NULL,
    Date NVARCHAR(10) NOT NULL
);
GO

-- Добавление тренеров
INSERT INTO Trainers (Name, Spec, Photo, Experience, Achievements, Description) VALUES 
(N'Александр Г.', N'Пауэрлифтинг', N'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=400&q=80', N'7 лет', N'МС по пауэрлифтингу, призер ЧБ', N'Специализируется на наборе мышечной массы и увеличении силовых показателей.'),
(N'Кристина Р.', N'Кроссфит & Фитнес', N'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=400&q=80', N'5 лет', N'Сертифицированный нутрициолог, выступающий атлет', N'Поможет похудеть, сделать тело рельефным и выносливым.'),
(N'Елена М.', N'Стретчинг & Йога', N'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80', N'4 года', N'Сертифицированный инструктор по йоге', N'Помогает восстановить тело после нагрузок, улучшить гибкость.'),
(N'Игорь С.', N'Тяжёлая атлетика', N'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', N'10 лет', N'ЗМС по тяжёлой атлетике, тренер сборной', N'Эксперт в технике рывка и толчка. Готовит спортсменов к соревнованиям.');
GO

-- Добавление администратора
INSERT INTO Users (Name, Email, Password, Phone, Role) VALUES 
(N'Администратор', N'AdminARGK@gmail.com', N'$2a$11$8k7cM5q8z9x0y1w2v3u4i5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3', N'+375 (29) 111-11-11', N'admin');
GO

-- Проверка
SELECT * FROM Trainers;
SELECT * FROM Users;
SELECT * FROM Orders;
SELECT * FROM SupportRequests;
GO