/**
 * Inventory Service - Logika za obračun zaliha
 * Izdvojeno iz app.js za bolju organizaciju koda
 */

class InventoryService {
  /**
   * Izračunava obračun zaliha na osnovu unetih parametara
   * @param {Object} params - Parametri za obračun
   * @returns {Object} - Rezultat obračuna sa svim kalkulacijama
   */
  static calculateInventory(params) {
    const {
      roba,
      uk_pdv_21,
      uk_pdv_15,
      uk_pdv_7,
      uk_razlika,
      prihod_21,
      prihod_15,
      prihod_7,
      prihod_0,
      pdv_21,
      pdv_15,
      pdv_7,
      koeficijent_kalo,
      stanje_robe_popis,
    } = params;

    // Izračunaj zbir svih prihoda i PDV-ova (ne ukalkulisane)
    const zbirPotraznih =
      prihod_21 + prihod_15 + prihod_7 + prihod_0 + pdv_21 + pdv_15 + pdv_7;

    // Izračunaj koeficijent prodaje kao procenat (zbir prihoda i PDV-ova / dugovna roba) * 100
    const koeficijentProdaje = roba > 0 ? (zbirPotraznih / roba) * 100 : 0;

    // Koeficijent kao decimalni broj za računanje (bez * 100)
    const koeficijentDecimalni = roba > 0 ? zbirPotraznih / roba : 0;

    // Izračunaj ukalkulisane PDV-ove (unijeti ukalkulisani PDV × koeficijent)
    const rezultatUkPdv21 = uk_pdv_21 * koeficijentDecimalni;
    const rezultatUkPdv15 = uk_pdv_15 * koeficijentDecimalni;
    const rezultatUkPdv7 = uk_pdv_7 * koeficijentDecimalni;

    // Izračunaj ukalkulisanu razliku u cijeni (unijeta razlika × koeficijent)
    const rezultatUkRazlika = uk_razlika * koeficijentDecimalni;

    // Roba rezultat je samo zbir potražnih stavki
    const robaRezultat = zbirPotraznih;

    // Izračunaj nabavnu vrijednost prodate robe: roba rezultat minus svi ukalkulisani rezultati
    const nabavnaVrijednost =
      robaRezultat -
      rezultatUkPdv21 -
      rezultatUkPdv15 -
      rezultatUkPdv7 -
      rezultatUkRazlika;

    // Osnovni rezultati prodaje
    const results = [
      { naziv: "Roba", duguje: 0, potrazuje: robaRezultat },
      { naziv: "Ukalkulisani PDV 21%", duguje: rezultatUkPdv21, potrazuje: 0 },
      { naziv: "Ukalkulisani PDV 15%", duguje: rezultatUkPdv15, potrazuje: 0 },
      { naziv: "Ukalkulisani PDV 7%", duguje: rezultatUkPdv7, potrazuje: 0 },
      {
        naziv: "Ukalkulisana razlika u cijeni",
        duguje: rezultatUkRazlika,
        potrazuje: 0,
      },
      {
        naziv: "Nabavna vrijednost prodate robe",
        duguje: nabavnaVrijednost,
        potrazuje: 0,
      },
    ];

    // Obračun kala sa koeficijentom kalo
    const koeficijentKaloDecimalni = koeficijent_kalo / 100; // konvertuj iz procenta u decimalni broj

    // Izračunaj robe kalo: unešena roba × koeficijent kalo
    const robaKalo = roba * koeficijentKaloDecimalni;

    // Izračunaj ukalkulisane PDV-ove za kalo: unos × koeficijent kalo
    const ukPdv21Kalo = uk_pdv_21 * koeficijentKaloDecimalni;
    const ukPdv15Kalo = uk_pdv_15 * koeficijentKaloDecimalni;
    const ukPdv7Kalo = uk_pdv_7 * koeficijentKaloDecimalni;

    // Izračunaj ukalkulisanu razliku za kalo: unos × koeficijent kalo
    const ukRazlikaKalo = uk_razlika * koeficijentKaloDecimalni;

    // Izračunaj troškove kala: roba kalo - svi ukalkulisani kalo rezultati
    const troskoviKala =
      robaKalo - ukPdv21Kalo - ukPdv15Kalo - ukPdv7Kalo - ukRazlikaKalo;

    const kaloResults = [
      { naziv: "Roba", duguje: 0, potrazuje: robaKalo },
      { naziv: "Ukalkulisani PDV 21%", duguje: ukPdv21Kalo, potrazuje: 0 },
      { naziv: "Ukalkulisani PDV 15%", duguje: ukPdv15Kalo, potrazuje: 0 },
      { naziv: "Ukalkulisani PDV 7%", duguje: ukPdv7Kalo, potrazuje: 0 },
      {
        naziv: "Ukalkulisana razlika u cijeni",
        duguje: ukRazlikaKalo,
        potrazuje: 0,
      },
      {
        naziv: "Troškovi kala, rastura i loma",
        duguje: troskoviKala,
        potrazuje: 0,
      },
    ];

    // Obračun manjka po popisu
    // 1. Izračunaj što bi trebalo da bude robe
    const robaTrebaloBi = roba - robaRezultat - robaKalo;

    let manjakResults = null;
    let koeficijentManjka = null;

    // Dodaj manjak rezultate samo ako ima smislenih podataka
    // (ako je uneto stanje robe po popisu i robaTrebaloBi > 0)
    if (stanje_robe_popis > 0 && robaTrebaloBi > 0) {
      // 2. Izračunaj koeficijent manjka
      koeficijentManjka = stanje_robe_popis / robaTrebaloBi;

      // 3. Izračunaj manjak robe
      const robaManjak = robaTrebaloBi - stanje_robe_popis;

      // 4. Izračunaj što bi trebalo da bude za ukalkulisane stavke
      const ukPdv21TrebaloBi = uk_pdv_21 - rezultatUkPdv21 - ukPdv21Kalo;
      const ukPdv15TrebaloBi = uk_pdv_15 - rezultatUkPdv15 - ukPdv15Kalo;
      const ukPdv7TrebaloBi = uk_pdv_7 - rezultatUkPdv7 - ukPdv7Kalo;
      const ukRazlikaTrebaloBi = uk_razlika - rezultatUkRazlika - ukRazlikaKalo;

      // 5. Primeni koeficijent manjka na ukalkulisane stavke
      const ukPdv21Manjak = ukPdv21TrebaloBi * (1 - koeficijentManjka);
      const ukPdv15Manjak = ukPdv15TrebaloBi * (1 - koeficijentManjka);
      const ukPdv7Manjak = ukPdv7TrebaloBi * (1 - koeficijentManjka);
      const ukRazlikaManjak = ukRazlikaTrebaloBi * (1 - koeficijentManjka);

      // 6. Izlazni PDV-ovi imaju istu vrednost kao ukalkulisani
      const izlazniPdv21 = ukPdv21Manjak;
      const izlazniPdv15 = ukPdv15Manjak;
      const izlazniPdv7 = ukPdv7Manjak;

      // 7. Troškovi manjka = roba manjak - ukalkulisana razlika manjak
      const troskoviManjka = robaManjak - ukRazlikaManjak;

      manjakResults = [
        { naziv: "Roba", duguje: 0, potrazuje: robaManjak },
        { naziv: "Ukalkulisani PDV 21%", duguje: ukPdv21Manjak, potrazuje: 0 },
        { naziv: "Ukalkulisani PDV 15%", duguje: ukPdv15Manjak, potrazuje: 0 },
        { naziv: "Ukalkulisani PDV 7%", duguje: ukPdv7Manjak, potrazuje: 0 },
        {
          naziv: "Ukalkulisana razlika u cijeni",
          duguje: ukRazlikaManjak,
          potrazuje: 0,
        },
        { naziv: "Izlazni PDV 21%", duguje: 0, potrazuje: izlazniPdv21 },
        { naziv: "Izlazni PDV 15%", duguje: 0, potrazuje: izlazniPdv15 },
        { naziv: "Izlazni PDV 7%", duguje: 0, potrazuje: izlazniPdv7 },
        {
          naziv: "Troškovi manjka",
          duguje: troskoviManjka,
          potrazuje: 0,
        },
      ];
    }

    // Pripremi response objekat
    const responseData = {
      success: true,
      results: results,
      kaloResults: kaloResults,
      koeficijentProdaje: koeficijentProdaje,
      koeficijentKalo: koeficijent_kalo,
    };

    // Dodaj manjak rezultate ako postoje
    if (manjakResults) {
      responseData.manjakResults = manjakResults;
      responseData.koeficijentManjka = koeficijentManjka;
    }

    return responseData;
  }
}

module.exports = InventoryService;
