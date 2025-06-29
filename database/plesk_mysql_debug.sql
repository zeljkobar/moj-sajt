-- MYSQL/MARIADB DIJAGNOSTIKA ZA PLESK
-- Pokretaj ove komande u phpMyAdmin ili MySQL konzoli na serveru

-- 1. PROVERI POSTOJANJE BAZE PODATAKA
SHOW DATABASES;
SHOW DATABASES LIKE 'summasum_%';

-- 2. PROVERI POSTOJANJE KORISNIKA
SELECT user, host FROM mysql.user WHERE user = 'zeljko';

-- 3. PROVERI PRIVILEGIJE KORISNIKA ZA RAZLIČITE HOST-ove
SHOW GRANTS FOR 'zeljko'@'localhost';
SHOW GRANTS FOR 'zeljko'@'127.0.0.1'; 
SHOW GRANTS FOR 'zeljko'@'%';

-- 4. PROVERI TRENUTNE KONEKCIJE
SHOW PROCESSLIST;

-- 5. PROVERI DA LI BAZA POSTOJI I DA LI JE DOSTUPNA
USE summasum_;
SHOW TABLES;

-- 6. AKO TREBA, NAPRAVI KORISNIKA SA SVIM PRIVILEGIJAMA
-- PAZI: Ova komanda može da utiče na postojeće privilegije!
-- CREATE USER 'zeljko'@'%' IDENTIFIED BY 'Vanesa3007#';

-- 7. DODELJENA PRIVILEGIJA ZA SVE HOST-ove (localhost, 127.0.0.1, %)
-- GRANT ALL PRIVILEGES ON summasum_.* TO 'zeljko'@'localhost';
-- GRANT ALL PRIVILEGES ON summasum_.* TO 'zeljko'@'127.0.0.1';  
-- GRANT ALL PRIVILEGES ON summasum_.* TO 'zeljko'@'%';

-- 8. OSVEZI PRIVILEGIJE
-- FLUSH PRIVILEGES;

-- 9. PROVERI DA LI SU PRIVILEGIJE DODELJENE
-- SHOW GRANTS FOR 'zeljko'@'localhost';
-- SHOW GRANTS FOR 'zeljko'@'127.0.0.1';
-- SHOW GRANTS FOR 'zeljko'@'%';

-- 10. TEST PRISTUPA TABELI
SELECT COUNT(*) FROM korisnici;
SELECT COUNT(*) FROM firme;

-- MOGUĆI PROBLEMI I REŠENJA:

-- Problem 1: User ne postoji za određeni host
-- Rešenje: Napravi user za sve host-ove (%, localhost, 127.0.0.1)

-- Problem 2: Baza ne postoji ili nema privilegije
-- Rešenje: Proveri ime baze u Plesk-u, možda je zeljko_summasum_ umesto summasum_

-- Problem 3: Plesk koristi drugačije ime baze
-- Moguća imena:
-- - summasum_
-- - zeljko_summasum_  
-- - zeljko_summasum (bez _)

-- Problem 4: Konekcija preko 127.0.0.1 traži privilegije za 127.0.0.1, ne za localhost
-- Rešenje: Dodeli privilegije za sve host-ove

-- NAPOMENE ZA PLESK:
-- 1. U Plesk control panel-u idi na Databases
-- 2. Klikni na bazu summasum_
-- 3. Idi na User Management
-- 4. Proveri da li korisnik zeljko ima privilegije
-- 5. Ako ne, dodeli mu sve privilegije ili napravi novog korisnika
-- 6. Možeš da promeniš i lozinku ovde
-- 7. Nakon promene, restartuj Node.js aplikaciju na serveru
