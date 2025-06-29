#!/bin/bash

# Script za eksport podataka iz lokalne baze
# Koristiti ovaj script ako imaš mysqldump dostupan

echo "🚀 Export podataka iz summasum_local baze..."

# Eksport samo podataka (bez strukture)
mysqldump -u root -p --no-create-info --complete-insert summasum_local users firme > data_export_dump.sql

if [ $? -eq 0 ]; then
    echo "✅ Export uspešno završen!"
    echo "📄 Fajl kreiran: data_export_dump.sql"
    echo ""
    echo "🔧 Potrebno je ručno urediti fajl:"
    echo "1. Dodati 'USE summasum_;' na vrh"
    echo "2. Proveriti da su svi INSERT statement-i ispravni"
    echo ""
    echo "🚀 Upload data_export_dump.sql na server i import kroz phpMyAdmin"
else
    echo "❌ Greška pri exportu"
    echo "💡 Proverite MySQL lozinku i da li je server pokrenut"
fi
