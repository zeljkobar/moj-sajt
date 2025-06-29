-- Export podataka iz lokalne baze summasum_local
-- Kreirati ovaj fajl sa: mysqldump -u root -p summasum_local users firme > data_export.sql
-- Ili pokrenuti data_export.js script

USE summasum_;

-- Podaci iz tabele users
INSERT INTO users (id, username, password, email, phone, ime, prezime, jmbg, created_at, updated_at) VALUES
-- Ovde će biti ubačeni podaci iz lokalne baze
-- Format: (1, 'admin', '$2b$10$hash...', 'admin@test.com', '067111111', 'Admin', 'Adminović', '1234567890123', '2025-06-29 10:00:00', '2025-06-29 10:00:00'),

-- Resetovanje AUTO_INCREMENT za users
-- ALTER TABLE users AUTO_INCREMENT = 1;

-- Podaci iz tabele firme  
INSERT INTO firme (id, user_id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at) VALUES
-- Ovde će biti ubačeni podaci iz lokalne baze
-- Format: (1, 1, '123456789', 'Test Firma', 'Adresa 1', 'RS123456789', 'Petar Petrović', '1234567890123', 'aktivan', '2025-06-29 10:00:00', '2025-06-29 10:00:00'),

-- Resetovanje AUTO_INCREMENT za firme
-- ALTER TABLE firme AUTO_INCREMENT = 1;
