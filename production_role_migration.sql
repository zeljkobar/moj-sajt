-- MIGRACIJA SISTEMA ULOGA ZA PRODUKCIJU
-- Pokrenuti na serveru da bi se azurirao sistem uloga

-- Korak 1: Dodaj privremenu kolonu sa novim rolama
ALTER TABLE users ADD COLUMN new_role ENUM('pdv', 'ugovori', 'full', 'admin') DEFAULT 'pdv';

-- Korak 2: Migriraj postojeće role u nove
-- Spoji pdv0 i pdv u pdv
UPDATE users SET new_role = 'pdv' WHERE role IN ('pdv0', 'pdv');

-- Zadrži full ulogu
UPDATE users SET new_role = 'full' WHERE role = 'full';

-- Zadrži admin ulogu  
UPDATE users SET new_role = 'admin' WHERE role = 'admin';

-- Korak 3: Obriši staru role kolonu
ALTER TABLE users DROP COLUMN role;

-- Korak 4: Preimenuj novu kolonu u role
ALTER TABLE users CHANGE COLUMN new_role role ENUM('pdv', 'ugovori', 'full', 'admin') DEFAULT 'pdv';

-- Proveri rezultat
SELECT id, username, role FROM users ORDER BY id;

-- OPCIONO: Dodaj test korisnika sa ugovori ulogom
-- INSERT INTO users (username, email, password, ime, prezime, jmbg, role) 
-- VALUES ('test_ugovori', 'ugovori@test.com', '$2b$10$hashed_password_here', 'Test', 'Ugovori', '9876543210987', 'ugovori');
