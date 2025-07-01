-- SQL skripta za kreiranje tabela za ugovore

-- Tabela pozicije (opisi poslova)
CREATE TABLE pozicije (
    id INT AUTO_INCREMENT PRIMARY KEY,
    naziv VARCHAR(255) NOT NULL,
    opis_poslova TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela radnici
CREATE TABLE radnici (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ime VARCHAR(255) NOT NULL,
    prezime VARCHAR(255) NOT NULL,
    jmbg VARCHAR(13) NOT NULL,
    pozicija_id INT NOT NULL,
    firma_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pozicija FOREIGN KEY (pozicija_id) REFERENCES pozicije(id),
    CONSTRAINT fk_firma_id FOREIGN KEY (firma_id) REFERENCES firme(id)
);

-- Tabela ugovori
CREATE TABLE ugovori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firma_id INT NOT NULL,
    radnik_id INT NOT NULL,
    datum DATE NOT NULL,
    tip_ugovora VARCHAR(50) NOT NULL,
    sadrzaj TEXT NOT NULL,
    CONSTRAINT fk_firma FOREIGN KEY (firma_id) REFERENCES firme(id),
    CONSTRAINT fk_radnik FOREIGN KEY (radnik_id) REFERENCES radnici(id)
);
