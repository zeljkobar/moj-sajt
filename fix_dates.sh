#!/bin/bash

# Script za promenu ćiriličnih datuma u latinične

echo "🔄 Menjam ćirilične datume u latinične..."

# Lista fajlova za izmenu
files=(
    "public/istek-ugovora.html"
    "public/potvrda-zaposlenja.html" 
    "public/sedmicni-odmor.html"
    "public/pdv-pregled.html"
    "public/ugovor-o-radu.html"
    "public/ugovor-o-zajmu-novca.html"
    "public/aneks-promena-radnog-vremena.html"
    "public/ugovor-o-dopunskom-radu.html"
    "public/sporazumni-raskid.html"
    "public/odluka-o-povracaju.html"
)

# Zameni sr-RS sa sr-Latn-RS u svim fajlovima
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "📝 Menjam: $file"
        sed -i '' 's/toLocaleDateString("sr-RS"/toLocaleDateString("sr-Latn-RS"/g' "$file"
        sed -i '' "s/toLocaleDateString('sr-RS'/toLocaleDateString('sr-Latn-RS'/g" "$file"
    else
        echo "⚠️ Fajl ne postoji: $file"
    fi
done

echo "✅ Završeno! Svi datumi su sada na latinici."
