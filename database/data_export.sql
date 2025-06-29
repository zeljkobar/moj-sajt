-- Export podataka iz lokalne baze summasum_local
-- Kreiran: 2025-06-29T00:45:52.682Z

USE summasum_;

-- Brisanje postojećih podataka (opciono)
-- DELETE FROM firme; -- Prvo firme zbog foreign key
-- DELETE FROM users;

-- Ubacivanje korisnika
INSERT INTO users (id, username, password, email, phone, ime, prezime, jmbg, created_at, updated_at) VALUES
(13, 'admin', '$2b$10$znyZRnJcPPnCRSGmJhBcQeRrnB05xTgHqmwhSsNE6SltGPdbfWi/2', 'admin@summasummarum.me', '+382 67 440 040', 'Željko', 'Đuranović', '1606981220012', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(14, 'ana', '$2b$10$L8dBvrCu5LgbhrBP9cZcTepfAApFAHs3qUEgFqb5tJfnTbhuWHzv2', 'ana@summasummarum.me', '+382 67 111 111', 'Ana', 'Marić', '1234567890123', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(15, 'marko', '$2b$10$x0dQ7vgAGFtToEaReXJIlu.uWW1ekNL003R8rHtyUky/gkXuPDE0e', 'marko@summasummarum.me', '+382 67 222 222', 'Marko', 'Petrović', '2345678901234', '2025-06-28 23:42:36', '2025-06-28 23:42:36');

-- Ubacivanje firmi
INSERT INTO firme (id, user_id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at) VALUES
(1, 13, '02825767', 'Summa Summarum', 'Popa Dukljanina 2', '80/31-12335-3', 'Zeljko Djuranovic', '1606981220012', 'aktivan', '2025-06-28 23:42:36', '2025-06-29 00:21:45'),
(2, 13, '03100863', 'OTA-LAKI DOO', 'Vladimira Rolovica 18', '80/31-03570-9', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(3, 13, '02758512', 'R&P Agent doo', 'Maršala Tita 25', '80/31-02206-2', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(4, 13, '02904136', 'WASH & GO', 'Bjelisi bb', '80/31-02586-8', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(5, 13, '02793253', 'Zavet d.o.o.', 'VUKA KARADZICA BB', '80/31-02314-8', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(6, 13, '02807572', 'Volume d.o.o.', 'Rutke bb', '80/31-02174-0', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(7, 13, '02670739', 'W Group d.o.o.', 'Bjelisi 260', '80/31-01444-2', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(8, 13, '02984296', 'Ajna d.o.o.', 'Stari Bar bb', '80/31-02906-7', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(9, 13, '02992507', 'NDDL d.o.o.', 'Mirosica 2', '80/31-02947-4', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(10, 13, '02224399', '8 Mart d.o.o.', 'Jovana Tomasevica 32/34', '80/31-00172-3', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(11, 13, '02758342', 'Adriatic proing d.o.o.', 'Jovana Tomasevica G9', '80/31-03772-8', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(12, 13, '03046800', 'Fighter d.o.o.', 'Susanj bb', '', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(13, 13, '03057925', 'Creative Solutions Montenegro d.o.o.', 'Jovana Tomasevica G9', '80/31-03213-0', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(14, 13, '03111997', 'Nivl d.o.o.', 'Poslovni centar G9', '80/31-03508-3', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(15, 13, '02622777', 'Butua resort d.o.o.', 'Marsala Tita zgrada D5', '', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(16, 13, '02622521', 'Ulcinj resort d.o.o.', 'Marsala Tita zgrada D5', '92/31-00893-1', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(17, 13, '03259196', 'Pan.kov trading d.o.o.', 'Velika Gorana bb', '80-31-04220-9', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(18, 13, '03093913', 'Coco Loco fashion d.o.o. ', 'Drobnici bb', '81/31-04899-9', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(19, 13, '03289052', 'Aesha d.o.o.', 'Bjelisi bb', '70/31-02212-0', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(20, 13, '03103269', 'Wel-War d.o.o.', 'Jovana Tomasevica G9', '80/31-03525-3', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(21, 13, '02670194', 'Jokic zp d.o.o.', 'Ilino b.b.', '80/31-01845-6', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(22, 13, '02940442', 'Md alfa d.o.o.', 'Mila Damjanovica 5', '80/31-02762-5', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(23, 13, '02648938', 'Nina mont d.o.o.', 'Bulevar Marka Brezanina bb', '80/31-016232', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(24, 13, '02704951', 'II - IRIS DOO', 'Boljevici bb', '80/31-01637-2', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(25, 13, '03316378', 'PANTELIJA', 'SUVI POTOK BB', '80/31-04356-6', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(26, 13, '02347334', 'Beton Transport Group', 'Mila Boskovica h12', '80/31-01592-9', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(27, 13, '02752450', 'Megtrade', 'POSLOVNI CENTAR G-9 ', '80/31-01880-4', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(28, 14, '11111114', 'Ana Nova Firma', 'Ana nova adresa', '80/31-11111-4', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(29, 14, '938291928', 'firma firma', 'bjelisi bb', '78/819291-0', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(30, 15, '22222221', 'Marko\'s Business', 'Marko adresa 1', '80/31-22222-1', NULL, NULL, 'aktivan', '2025-06-28 23:42:36', '2025-06-28 23:42:36'),
(31, 15, '22222222', 'Marko DOO', 'Marko adresa 2', '80/31-22222-2', NULL, NULL, 'nula', '2025-06-28 23:42:36', '2025-06-28 23:42:36');

-- Resetovanje AUTO_INCREMENT brojača
ALTER TABLE users AUTO_INCREMENT = 4;
ALTER TABLE firme AUTO_INCREMENT = 32;

-- Export završen uspešno!
-- Korisnici: 3
-- Firme: 31
