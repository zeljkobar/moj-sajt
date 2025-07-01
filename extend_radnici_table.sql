-- Dodavanje novih kolona u tabelu radnici za kompletne informacije o zaposlenju

USE summasummarum_db;

-- Dodaj nova polja u tabelu radnici
ALTER TABLE radnici 
ADD COLUMN datum_zaposlenja DATE NOT NULL DEFAULT (CURDATE()),
ADD COLUMN visina_zarade DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN tip_radnog_vremena ENUM('puno_8h', 'skraceno_6h', 'skraceno_4h', 'skraceno_2h') NOT NULL DEFAULT 'puno_8h',
ADD COLUMN tip_ugovora ENUM('na_neodredjeno', 'na_odredjeno') NOT NULL DEFAULT 'na_neodredjeno',
ADD COLUMN datum_prestanka DATE NULL,
ADD COLUMN napomene TEXT NULL;

-- Opis tipova radnog vremena:
-- 'puno_8h' = Puno radno vreme (8 sati dnevno / 40 sati nedeljno)
-- 'skraceno_6h' = Skraćeno radno vreme (6 sati dnevno / 30 sati nedeljno)  
-- 'skraceno_4h' = Skraćeno radno vreme (4 sata dnevno / 20 sati nedeljno)
-- 'skraceno_2h' = Skraćeno radno vreme (2 sata dnevno / 10 sati nedeljno)

-- Proveri novu strukturu tabele
DESCRIBE radnici;
