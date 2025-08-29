// setAdminClaim.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./service-account.json");

// 👇 Kris' email
const EMAIL = "kris@leesracing.com.au";

initializeApp({ credential: cert(serviceAccount) });

(async () => {
  try {
    const auth = getAuth();
    const user = await auth.getUserByEmail(EMAIL);
    await auth.setCustomUserClaims(user.uid, { admin: false });
    console.log(`✅ Admin claim removed for ${EMAIL}`);
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
})();