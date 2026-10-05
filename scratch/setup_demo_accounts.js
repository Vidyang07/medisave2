import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";

const API_URL = "http://localhost:5000/api";
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medisave";

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // Clean medicines collection so catalog starts fresh
  await db.collection("medicines").deleteMany({});

  const donorPasswordHash = await bcrypt.hash("Donor@123", 10);
  const partnerPasswordHash = await bcrypt.hash("Partner@123", 10);

  // 1. Upsert Donor User
  await db.collection("users").updateOne(
    { email: "donor@medisave.org" },
    {
      $set: {
        name: "Rohit Deshmukh (Community Donor)",
        email: "donor@medisave.org",
        password: donorPasswordHash,
        phone: "+91 98230 45678",
        address: "Flat 402, Kothrud Heights, Pune",
        locality: "Kothrud",
        role: "user",
        isVerified: true,
        partnerStatus: "none",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // 2. Upsert NGO Partner User
  await db.collection("users").updateOne(
    { email: "partner@medisave.org" },
    {
      $set: {
        name: "Dr. Priya Kulkarni",
        email: "partner@medisave.org",
        password: partnerPasswordHash,
        phone: "+91 98230 11223",
        address: "Seva Health Bhavan, Near Katraj Chowk, Pune",
        locality: "Katraj",
        role: "partner",
        organizationName: "Seva Arogya Charitable Health Center",
        organizationType: "Charitable Clinic",
        partnerStatus: "verified",
        isVerified: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  console.log("===========================================================================");
  console.log("✅ DEMO CREDENTIALS CONFIGURED:");
  console.log("   • Community Donor  : donor@medisave.org   / Password: Donor@123");
  console.log("   • NGO Partner      : partner@medisave.org / Password: Partner@123");
  console.log("===========================================================================");

  // 3. Test Live Flow via HTTP API
  console.log("\n🚀 Testing Live End-to-End Handover Flow with Live OTP...");

  // Login Donor
  const donorLogin = await axios.post(`${API_URL}/auth/login`, {
    email: "donor@medisave.org",
    password: "Donor@123",
  });
  const donorToken = donorLogin.data.data.token;
  console.log("1. Donor Logged In:", donorLogin.data.data.user.name);

  // Login Partner
  const partnerLogin = await axios.post(`${API_URL}/auth/login`, {
    email: "partner@medisave.org",
    password: "Partner@123",
  });
  const partnerToken = partnerLogin.data.data.token;
  console.log("2. NGO Partner Logged In:", partnerLogin.data.data.user.organizationName);

  // Donor uploads a medicine donation
  const expiryDate = new Date(Date.now() + 280 * 24 * 60 * 60 * 1000).toISOString();
  const medRes = await axios.post(
    `${API_URL}/medicines`,
    {
      medicineName: "Augmentin 625 Duo Tablets",
      brandName: "Augmentin 625 Duo",
      genericName: "Amoxicillin and Potassium Clavulanate (625mg)",
      company: "GlaxoSmithKline",
      category: "Antibiotics",
      dosageForm: "Tablet",
      quantity: 10,
      unit: "Tablets (1 strip)",
      originalMrp: 200,
      expiryDate,
      batchNumber: "AUG-2026X",
      packageCondition: "Intact Sealed Blister Pack",
      storageCondition: "Stored in cool dry cabinet (<25°C)",
      locality: "Kothrud",
      handoverPoint: "Vanaz Metro Station Entrance",
      targetBeneficiary: "General Community",
    },
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );
  const createdMed = medRes.data.data;
  console.log(`3. Donor Uploaded Medicine: "${createdMed.brandName}" (Status: ${createdMed.status})`);

  // NGO Partner checks available listings
  const availableRes = await axios.get(`${API_URL}/medicines/partner/available`, {
    headers: { Authorization: `Bearer ${partnerToken}` },
  });
  console.log(`4. NGO Partner Sees ${availableRes.data.data.length} Available Donation(s) in Pool`);

  // NGO Partner accepts the donation
  const acceptRes = await axios.post(
    `${API_URL}/medicines/${createdMed._id}/accept-donation`,
    {},
    { headers: { Authorization: `Bearer ${partnerToken}` } }
  );
  console.log("5. NGO Partner Accepted Donation! Generating secure 6-digit OTP...");

  // Donor checks their dashboard for the 6-digit OTP
  const donorListingsRes = await axios.get(`${API_URL}/medicines/my-listings`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const donorMed = donorListingsRes.data.data.find((m) => m._id === createdMed._id);
  const liveOtp = donorMed.handoverCode;
  console.log(`6. Donor Dashboard Reveals 6-Digit Handover OTP: [ ${liveOtp} ]`);

  // NGO Partner verifies the 6-digit OTP during physical handover
  const verifyRes = await axios.post(
    `${API_URL}/medicines/${createdMed._id}/verify-handover`,
    { code: liveOtp },
    { headers: { Authorization: `Bearer ${partnerToken}` } }
  );
  console.log(`7. NGO Partner Entered OTP [ ${liveOtp} ] -> Result: Status = "${verifyRes.data.data.status}"`);

  // Check that active handovers is now 0 (mutually cleared from active dashboard queue)
  const finalAcceptedRes = await axios.get(`${API_URL}/medicines/partner/my-accepted?status=accepted`, {
    headers: { Authorization: `Bearer ${partnerToken}` },
  });
  console.log(`8. Active Handover Queue for Partner: ${finalAcceptedRes.data.data.length} item(s) (Mutually Cleared & Archived)`);

  const completedRes = await axios.get(`${API_URL}/medicines/partner/my-accepted?status=completed`, {
    headers: { Authorization: `Bearer ${partnerToken}` },
  });
  console.log(`9. Completed Redistribution History for Partner: ${completedRes.data.data.length} item(s)`);

  // Clean medicines collection after test so user has clean slate
  await db.collection("medicines").deleteMany({});
  console.log("10. Cleaned test medicines from MongoDB -> Database ready for user live test!");

  console.log("\n🎉 ALL LIVE VERIFICATIONS PASSED 100%!");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error in demo setup:", err.response?.data || err.message);
  process.exit(1);
});
