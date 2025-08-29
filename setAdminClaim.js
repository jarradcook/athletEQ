// setAdminClaim.js  (CommonJS)
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./service-account.json");

initializeApp({ credential: cert(serviceAccount) });

// <-- put the email you use to log into your app:
const email = "jarradcook88@gmail.com";

(async () => {
  try {
    const user = await getAuth().getUserByEmail(email);
    await getAuth().setCustomUserClaims(user.uid, { admin: true });
    console.log("✅ Admin claim set for", email);
  } catch (err) {
    console.error("❌ Error setting admin claim:", err);
  }
})();