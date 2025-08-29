// removeAdmin.js  (run locally with: node removeAdmin.js)
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

// 🔒 Make sure this service-account.json is for the SAME project your site uses
// (project_id should be athletes-7e6a3)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 👉 Put Kris's email here
const EMAIL = "kris@leesracing.com.au";

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(EMAIL);
    await admin.auth().setCustomUserClaims(user.uid, {}); // wipe all claims
    console.log(`✅ Admin claim removed for ${EMAIL} (uid: ${user.uid})`);
  } catch (e) {
    console.error("❌ Error:", e.code, e.message);
    process.exit(1);
  }
})();