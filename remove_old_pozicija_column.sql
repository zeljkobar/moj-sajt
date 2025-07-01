-- Migracija baze: uklanjanje stare kolone pozicija iz tabele radnici
-- Ova kolona nije više potrebna jer koristimo pozicija_id kao foreign key

USE summasummarum_db;

-- Ukloni staru kolonu pozicija
ALTER TABLE radnici DROP COLUMN pozicija;

-- Proveri strukturu tabele
DESCRIBE radnici;
