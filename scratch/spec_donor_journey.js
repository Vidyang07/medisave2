/**
 * Jasmine Spec: Donor Journey, Intake Safety Guardrails & Donation Lifecycle
 */

import { JasmineRunner, http } from "./jasmine_runner.js";

export function registerDonorJourneySpecs(runner) {
  const { describe, it, beforeAll, expect } = runner;

  describe("Donor Journey, Intake Guardrails & Listing Lifecycle", () => {
    let donorToken = null;
    let otherDonorToken = null;
    let createdMedId = null;
    let deleteTargetMedId = null;
    const ts = Date.now();

    beforeAll(async () => {
      // Register primary donor
      const donorRes = await http("POST", "/auth/register", {
        name: "Rohit Deshmukh",
        email: `rohit_donor_${ts}@medisave.org`,
        password: "Password123!",
        locality: "Kothrud",
        role: "user",
      });
      donorToken = donorRes.data?.data?.token;

      // Register secondary donor for cross-user permission checks
      const otherRes = await http("POST", "/auth/register", {
        name: "Pooja Sharma",
        email: `pooja_donor_${ts}@medisave.org`,
        password: "Password123!",
        locality: "Baner",
        role: "user",
      });
      otherDonorToken = otherRes.data?.data?.token;
    });

    describe("AI Medicine Metadata Assistance & Fair Pricing Calculation", () => {
      it("should reject AI suggestion with missing query title", async () => {
        const res = await http("POST", "/medicines/ai-suggest", {});
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
      });

      it("should return normalized medicine metadata from AI engine or offline fallback", async () => {
        const res = await http("POST", "/medicines/ai-suggest", {
          title: "Dolo 650",
          quantity: 15,
          dosageForm: "Tablet",
        });
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data).toBeDefined();
        expect(res.data.data.genericName).toContain("Paracetamol");
        expect(res.data.data.category).toBeDefined();
      });

      it("should calculate deterministic pricing proposal and savings percentages", async () => {
        const futureExp = new Date();
        futureExp.setFullYear(futureExp.getFullYear() + 1);

        const res = await http("POST", "/medicines/calculate-pricing", {
          originalMrp: 120,
          packageCondition: "Intact Sealed Blister Pack",
          expiryDate: futureExp.toISOString(),
        });
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.isValid).toBe(true);
        expect(res.data.data.suggestedPrice).toBeDefined();
        expect(res.data.data.pricingRationale).toBeDefined();
      });
    });

    describe("Donation Creation & Strict Safety Guardrails", () => {
      it("should reject donation with missing required fields", async () => {
        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Incomplete Medicine",
            // missing company, category, quantity, expiryDate
          },
          donorToken
        );
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("required fields");
      });

      it("should reject donation with invalid quantity (<1)", async () => {
        const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Zero Qty Med",
            company: "Cipla",
            category: "Pain & Fever",
            quantity: 0,
            expiryDate: futureDate,
          },
          donorToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("Quantity must be a valid number of at least 1");
      });

      it("should reject already expired medicine donation with redirection notice to Safe Disposal", async () => {
        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Expired Paracetamol",
            company: "Cipla",
            category: "Pain & Fever",
            quantity: 10,
            expiryDate: "2023-01-01",
          },
          donorToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("Safe Disposal Guide");
      });

      it("should reject medicine with short shelf-life (<90 days remaining buffer)", async () => {
        const shortDate = new Date();
        shortDate.setDate(shortDate.getDate() + 45); // 45 days (<90)

        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Short Shelf Life Medicine",
            company: "Sun Pharma",
            category: "Antibiotics",
            quantity: 10,
            expiryDate: shortDate.toISOString().split("T")[0],
          },
          donorToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("at least 90 days remaining shelf life");
      });

      it("should reject cold-chain medicines (e.g., Insulin, Monoclonal antibodies) for domestic safety", async () => {
        const validFutureDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString();
        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Lantus Insulin Glargine 100IU/ml",
            company: "Sanofi India",
            category: "Diabetes Care",
            quantity: 2,
            expiryDate: validFutureDate,
          },
          donorToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("Cold-chain medicines");
      });

      it("should reject Schedule X narcotics and controlled substances (e.g., Morphine, Fentanyl)", async () => {
        const validFutureDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString();
        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Fentanyl Citrate 50mcg",
            company: "Controlled Lab",
            category: "Pain & Fever",
            quantity: 5,
            expiryDate: validFutureDate,
          },
          donorToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("Schedule X narcotics");
      });

      it("should reject opened, cut, or broken blister strips", async () => {
        const validFutureDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString();
        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Paracetamol 500mg",
            company: "GSK",
            category: "Pain & Fever",
            quantity: 4,
            packageCondition: "Cut strip with opened foil pockets",
            expiryDate: validFutureDate,
          },
          donorToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("ineligible for community redistribution");
      });

      it("should successfully create an eligible 100% free community donation in 'pending' status", async () => {
        const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const res = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Azithromycin 500mg Tablets",
            brandName: "Azee 500",
            genericName: "Azithromycin (500mg)",
            company: "Cipla Ltd.",
            category: "Antibiotics",
            dosageForm: "Tablet",
            quantity: 6,
            unit: "Tablets (2 strips of 3)",
            price: 50, // Attempted price -> Should be forced to 0
            originalMrp: 135,
            expiryDate: validFutureDate,
            batchNumber: `CP-AZ-${ts}`,
            packageCondition: "Intact Sealed Blister Pack",
            storageCondition: "Stored in cool, dry place (<25°C)",
            isPrescriptionRequired: true,
            locality: "Kothrud",
            handoverPoint: "City Pride Kothrud",
            targetBeneficiary: "Local Old Age Home",
          },
          donorToken
        );

        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data._id).toBeDefined();
        expect(res.data.data.status).toBe("pending");
        expect(res.data.data.price).toBe(0); // Forced 0
        expect(res.data.data.listingType).toBe("free_donation");
        expect(res.data.data.locality).toBe("Kothrud");
        createdMedId = res.data.data._id;
      });
    });

    describe("Donor Listing Management & Moderation Reset on Update", () => {
      it("should allow donor to view their own listings via /api/medicines/my-listings", async () => {
        const res = await http("GET", "/medicines/my-listings", null, donorToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);
        const found = res.data.data.some((m) => m._id === createdMedId);
        expect(found).toBe(true);
      });

      it("should allow donor to update editable attributes (e.g. quantity, description)", async () => {
        const res = await http(
          "PUT",
          `/medicines/${createdMedId}`,
          {
            quantity: 12,
            description: "Updated donation batch notes",
          },
          donorToken
        );
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.quantity).toBe(12);
        expect(res.data.data.description).toBe("Updated donation batch notes");
      });

      it("should reset listing status to 'pending' when donor modifies details", async () => {
        const res = await http(
          "PUT",
          `/medicines/${createdMedId}`,
          {
            medicineName: "Azithromycin 500mg (Re-edited)",
            status: "approved", // Donor attempts to force approved
            price: 100, // Donor attempts to set commercial price
          },
          donorToken
        );
        expect(res.status).toBe(200);
        expect(res.data.data.status).toBe("pending"); // Reset to pending
        expect(res.data.data.price).toBe(0); // Kept 0
      });

      it("should block a different donor from editing someone else's listing (403 Forbidden)", async () => {
        const res = await http(
          "PUT",
          `/medicines/${createdMedId}`,
          { quantity: 99 },
          otherDonorToken
        );
        expect(res.status).toBe(403);
      });

      it("should block a different donor from deleting someone else's listing (403 Forbidden)", async () => {
        const res = await http("DELETE", `/medicines/${createdMedId}`, null, otherDonorToken);
        expect(res.status).toBe(403);
      });

      it("should allow the owner to delete their own listing", async () => {
        // Create temporary listing to delete
        const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const createTemp = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Temp Medicine to Delete",
            company: "Abbott",
            category: "Pain & Fever",
            quantity: 10,
            expiryDate: validFutureDate,
          },
          donorToken
        );
        deleteTargetMedId = createTemp.data.data._id;

        const delRes = await http("DELETE", `/medicines/${deleteTargetMedId}`, null, donorToken);
        expect(delRes.status).toBe(200);
        expect(delRes.data.success).toBe(true);

        // Verify it is gone
        const verifyGone = await http("GET", `/medicines/${deleteTargetMedId}`);
        expect(verifyGone.status).toBe(404);
      });
    });
  });
}
