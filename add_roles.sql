-- Dodavanje role kolone u users tabelu
ALTER TABLE users ADD COLUMN role ENUM('pdv0', 'pdv', 'full', 'admin') DEFAULT 'pdv0';

-- Postavljanje admin role za postojećeg korisnika (prilagodi username)
UPDATE users SET role = 'admin' WHERE username = 'admin' OR id = 1;

-- Dodavanje test korisnika sa različitim rolama (opciono)
-- INSERT INTO users (username, email, password, ime, prezime, role) VALUES 
-- ('test_pdv0', 'pdv0@test.com', '$2b$10$hashed_password', 'Test', 'PDV0', 'pdv0'),
-- ('test_pdv', 'pdv@test.com', '$2b$10$hashed_password', 'Test', 'PDV', 'pdv'),
-- ('test_full', 'full@test.com', '$2b$10$hashed_password', 'Test', 'Full', 'full');
