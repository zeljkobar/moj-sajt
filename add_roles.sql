-- MIGRACIJA ROLE SISTEMA
-- Staro: 'pdv0', 'pdv', 'full', 'admin'
-- Novo: 'pdv', 'ugovori', 'full', 'admin'

-- Korak 1: Dodaj privremenu kolonu sa novim rolama
ALTER TABLE users ADD COLUMN new_role ENUM('pdv', 'ugovori', 'full', 'admin') DEFAULT 'pdv';

-- Korak 2: Migriraj postojeće role u nove
UPDATE users SET new_role = 'pdv' WHERE role IN ('pdv0', 'pdv');
UPDATE users SET new_role = 'full' WHERE role = 'full';
UPDATE users SET new_role = 'admin' WHERE role = 'admin';

-- Korak 3: Obriši staru role kolonu
ALTER TABLE users DROP COLUMN role;

-- Korak 4: Preimenuj novu kolonu u role
ALTER TABLE users CHANGE COLUMN new_role role ENUM('pdv', 'ugovori', 'full', 'admin') DEFAULT 'pdv';

-- Proveri rezultat
SELECT username, role FROM users;

-- Dodavanje test korisnika sa novim rolama (opciono)
-- INSERT INTO users (username, email, password, ime, prezime, role) VALUES 
-- ('test_pdv', 'pdv@test.com', '$2b$10$hashed_password', 'Test', 'PDV', 'pdv'),
-- ('test_ugovori', 'ugovori@test.com', '$2b$10$hashed_password', 'Test', 'Ugovori', 'ugovori'),
-- ('test_full', 'full@test.com', '$2b$10$hashed_password', 'Test', 'Full', 'full');
