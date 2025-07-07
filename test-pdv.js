const axios = require("axios");

const baseURL = "http://localhost:3000";

async function testPDVSystem() {
  try {
    console.log("🚀 Testiram PDV sistem...");

    // Step 1: Login kao admin
    console.log("\n1️⃣ Prijavljujem se kao admin...");
    let apiClient;

    try {
      const loginResponse = await axios.post(
        `${baseURL}/api/login`,
        {
          username: "admin",
          password: "123456",
        },
        {
          withCredentials: true, // Enable cookies
        }
      );

      console.log("🍪 Response headers:", loginResponse.headers);
      console.log("📊 Response data:", loginResponse.data);

      const cookies = loginResponse.headers["set-cookie"];
      console.log("✅ Uspješna prijava:", loginResponse.data.message);

      // Setup axios instance with cookies
      apiClient = axios.create({
        baseURL: baseURL,
        headers: {
          Cookie: cookies ? cookies.join("; ") : "",
        },
      });
    } catch (loginError) {
      console.log(
        "❌ Login greška:",
        loginError.response?.data || loginError.message
      );
      console.log("Status:", loginError.response?.status);
      return;
    }

    // Step 2: Test PDV overview
    console.log("\n2️⃣ Testiram PDV overview...");
    try {
      const overviewResponse = await apiClient.get("/api/pdv/");
      console.log("✅ PDV Overview uspješan:", {
        broj_firmi: overviewResponse.data.firme?.length || 0,
        dana_do_roka: overviewResponse.data.rok_info?.dana_do_roka,
      });
    } catch (error) {
      console.log(
        "❌ PDV Overview greška:",
        error.response?.data || error.message
      );
    }

    // Step 3: Kreiraj novi mjesec ako nema podataka
    console.log("\n3️⃣ Kreiram novi mjesec (jul 2025)...");
    try {
      const newMonthResponse = await apiClient.post("/api/pdv/novi-mjesec", {
        mjesec: "2025-07-01",
      });
      console.log("✅ Novi mjesec kreiran:", newMonthResponse.data);
    } catch (error) {
      console.log(
        "❌ Kreiranje mjeseca greška:",
        error.response?.data || error.message
      );
    }

    // Step 4: Test PDV overview ponovo
    console.log("\n4️⃣ Testiram PDV overview ponovo...");
    try {
      const overviewResponse2 = await apiClient.get("/api/pdv/");
      console.log("✅ PDV Overview nakon kreiranja mjeseca:", {
        broj_firmi: overviewResponse2.data.firme?.length || 0,
        prva_firma: overviewResponse2.data.firme?.[0]?.naziv,
        status_prve: overviewResponse2.data.firme?.[0]?.status,
      });

      // Step 5: Test označavanje kao predano
      if (
        overviewResponse2.data.firme &&
        overviewResponse2.data.firme.length > 0
      ) {
        const firmaId = overviewResponse2.data.firme[0].id;
        console.log(`\n5️⃣ Označavam firmu ${firmaId} kao predano...`);

        try {
          const submitResponse = await apiClient.post(
            `/api/pdv/${firmaId}/submit`,
            {
              napomena: "Test napomena",
            }
          );
          console.log(
            "✅ Firma označena kao predana:",
            submitResponse.data.message
          );
        } catch (error) {
          console.log(
            "❌ Označavanje greška:",
            error.response?.data || error.message
          );
        }
      }
    } catch (error) {
      console.log(
        "❌ PDV Overview 2 greška:",
        error.response?.data || error.message
      );
    }

    // Step 6: Test istorija
    console.log("\n6️⃣ Testiram istoriju...");
    try {
      const historyResponse = await apiClient.get("/api/pdv/istorija");
      console.log("✅ Istorija:", {
        broj_mjeseci: historyResponse.data.istorija?.length || 0,
      });
    } catch (error) {
      console.log("❌ Istorija greška:", error.response?.data || error.message);
    }

    // Step 7: Test statistike
    console.log("\n7️⃣ Testiram statistike...");
    try {
      const statsResponse = await apiClient.get("/api/pdv/statistike");
      console.log("✅ Statistike:", statsResponse.data.statistike);
    } catch (error) {
      console.log(
        "❌ Statistike greška:",
        error.response?.data || error.message
      );
    }
  } catch (error) {
    console.error("❌ Glavna greška:", error.message);
  }
}

testPDVSystem();
