-- Schema za lokalno MySQL/MariaDB okruženje
-- Kreiranje baze podataka
CREATE DATABASE IF NOT EXISTS summasum_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE summasum_local;

-- Za produkcijski server, koristi bazu: summasum_
-- USE summasum_;

-- Tabela za korisnike
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    ime VARCHAR(50) NOT NULL,
    prezime VARCHAR(50) NOT NULL,
    jmbg VARCHAR(13) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_jmbg (jmbg)
);

-- Tabela za firme
CREATE TABLE firme (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pib VARCHAR(20) NOT NULL,
    naziv VARCHAR(255) NOT NULL,
    adresa VARCHAR(255) NOT NULL,
    pdvBroj VARCHAR(30),
    direktor_ime_prezime VARCHAR(255),
    direktor_jmbg VARCHAR(13),
    status ENUM('aktivan', 'nula') DEFAULT 'aktivan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_pib (pib),
    INDEX idx_status (status),
    INDEX idx_direktor_jmbg (direktor_jmbg),
    UNIQUE KEY unique_user_pib (user_id, pib)
);

-- Ubaciti test podatke (komentarisano za sada)
/*
INSERT INTO users (username, password, email, phone, ime, prezime, jmbg) VALUES
('admin', '$2b$10$hash_password_here', 'admin@test.com', '067111111', 'Admin', 'Adminović', '1234567890123'),
('marko', '$2b$10$hash_password_here', 'marko@test.com', '067222222', 'Marko', 'Marković', '1234567890124'),
('ana', '$2b$10$hash_password_here', 'ana@test.com', '067333333', 'Ana', 'Anić', '1234567890125');
*/
