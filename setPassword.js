// setPassword.js  (Node / CommonJS)
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./service-account.json");

// 👇 CHANGE THESE TWO
const EMAIL = "kris@leesracing.com.au";
const NEW_PASSWORD = "Horses"; // set any strong temp password

initializeApp({ credential: cert(serviceAccount) });

(async () => {
  try {
    const user = await getAuth().getUserByEmail(EMAIL);
    await getAuth().updateUser(user.uid, { password: NEW_PASSWORD });
    console.log(`✅ Password updated for ${EMAIL}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();