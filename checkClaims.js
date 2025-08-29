// checkClaims.js
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const EMAIL = "kris@leesracing.com.au";

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(EMAIL);
    console.log("customClaims:", user.customClaims || {});
  } catch (e) {
    console.error("❌", e.code, e.message);
  }
})();