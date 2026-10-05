/**
 * Jasmine Spec: Partner Verification, Donation Acceptance & Physical Handover OTP Engine
 */

import { JasmineRunner, http } from "./jasmine_runner.js";

export function registerPartnerAndHandoverSpecs(runner) {
  const { describe, it, beforeAll, expect } = runner;

  describe("Partner Organization Workflow & Physical Handover OTP Verification", () => {
    let donorToken = null;
    let donorId = null;
    let partnerToken = null;
    let partnerId = null;
    let otherPartnerToken = null;
    let adminToken = null;
    let testDonationId = null;
    let validHandoverOtp = null;
    const ts = Date.now();

    beforeAll(async () => {
      // 1. Admin login
      const adminLogin = await http("POST", "/auth/login", {
        email: "admin@medisave.org",
        password: "MedisaveAdmin2026!",
      });
      adminToken = adminLogin.data?.data?.token;

      // 2. Register Donor
      const donorRes = await http("POST", "/auth/register", {
        name: "Sunil Gokhale (Donor)",
        email: `sunil_donor_${ts}@medisave.org`,
        password: "Password123!",
        locality: "Katraj",
        role: "user",
      });
      donorToken = donorRes.data?.data?.token;
      donorId = donorRes.data?.data?.user?._id;

      // 3. Register Primary Partner
      const partnerRes = await http("POST", "/auth/register", {
        name: "Dr. Vikas Rao",
        email: `partner_org_${ts}@medisave.org`,
        password: "Password123!",
        phone: "+91 98230 77889",
        locality: "Katraj",
        role: "partner",
        organizationName: "Katraj Community Dispensary",
        organizationType: "Charitable Clinic",
      });
      partnerToken = partnerRes.data?.data?.token;
      partnerId = partnerRes.data?.data?.user?._id;

      // 4. Register Secondary Partner (for cross-partner access checks)
      const otherPartnerRes = await http("POST", "/auth/register", {
        name: "Dr. Sneha Kulkarni",
        email: `other_partner_${ts}@medisave.org`,
        password: "Password123!",
        locality: "Kothrud",
        role: "partner",
        organizationName: "Kothrud Free Clinic",
        organizationType: "NGO",
      });
      otherPartnerToken = otherPartnerRes.data?.data?.token;
      const otherPartnerId = otherPartnerRes.data?.data?.user?._id;

      // Verify both partners via Admin
      if (adminToken) {
        await http("PATCH", `/admin/partners/${partnerId}/verify`, { partnerStatus: "verified" }, adminToken);
        await http("PATCH", `/admin/partners/${otherPartnerId}/verify`, { partnerStatus: "verified" }, adminToken);
      }

      // 5. Create a test medicine and approve it
      const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const medRes = await http(
        "POST",
        "/medicines",
        {
          medicineName: `Handover Test Medicine ${ts}`,
          company: "Cipla Ltd.",
          category: "Pain & Fever",
          quantity: 20,
          expiryDate: validFutureDate,
          packageCondition: "Intact Sealed Blister Pack",
          locality: "Katraj",
        },
        donorToken
      );
      testDonationId = medRes.data?.data?._id;

      // Approve via admin
      if (adminToken && testDonationId) {
        await http("PATCH", `/admin/medicines/${testDonationId}/status`, { status: "approved" }, adminToken);
      }
    });

    describe("Partner Available Donations Pool (/api/medicines/partner/available)", () => {
      it("should return available approved donations sorted by proximity and FEFO", async () => {
        const res = await http("GET", "/medicines/partner/available", null, partnerToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);

        // Every listing must be in unaccepted pool
        for (const med of res.data.data) {
          expect(["approved", "pending"]).toContain(med.status);
          expect(med.acceptedBy).toBeNull();
          expect(med.proximity).toBeDefined();
        }
      });

      it("should filter available donations by category and search", async () => {
        const res = await http(
          "GET",
          `/medicines/partner/available?search=${encodeURIComponent(`Handover Test Medicine ${ts}`)}`,
          null,
          partnerToken
        );
        expect(res.status).toBe(200);
        expect(res.data.data.length).toBeGreaterThan(0);
        expect(res.data.data[0]._id).toBe(testDonationId);
      });
    });

    describe("Donation Acceptance & 6-Digit Handover Code Generation", () => {
      it("should prevent non-partners from accepting donations (403 Forbidden)", async () => {
        const res = await http(
          "POST",
          `/medicines/${testDonationId}/accept-donation`,
          {},
          donorToken
        );
        expect(res.status).toBe(403);
      });

      it("should allow a partner to accept a community donation listing", async () => {
        // Partner creates a donation
        const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const selfMed = await http(
          "POST",
          "/medicines",
          {
            medicineName: `Partner Self Med ${ts}`,
            company: "Cipla Ltd.",
            category: "Pain & Fever",
            quantity: 10,
            expiryDate: validFutureDate,
            locality: "Katraj",
          },
          partnerToken
        );
        const selfMedId = selfMed.data?.data?._id;
        // Approve via admin
        await http("PATCH", `/admin/medicines/${selfMedId}/status`, { status: "approved" }, adminToken);

        // Partner accepts donation
        const res = await http(
          "POST",
          `/medicines/${selfMedId}/accept-donation`,
          {},
          partnerToken
        );
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
      });

      it("should allow a verified partner to claim/accept the approved donation", async () => {
        const res = await http(
          "POST",
          `/medicines/${testDonationId}/accept-donation`,
          {},
          partnerToken
        );
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.status).toBe("accepted");
        expect(res.data.data.acceptedBy).toBeDefined();
      });

      it("should prevent duplicate acceptance of an already accepted donation", async () => {
        const res = await http(
          "POST",
          `/medicines/${testDonationId}/accept-donation`,
          {},
          otherPartnerToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("no longer available");
      });

      it("should securely provide the 6-digit OTP ONLY to the donor on /api/medicines/my-listings", async () => {
        const res = await http("GET", "/medicines/my-listings", null, donorToken);
        expect(res.status).toBe(200);
        const med = res.data.data.find((m) => m._id === testDonationId);
        expect(med).toBeDefined();
        expect(med.handoverCode).toBeDefined();
        expect(typeof med.handoverCode).toBe("string");
        expect(med.handoverCode.length).toBe(6);
        expect(med.handoverCode).toMatch(/^\d{6}$/); // Exactly 6 digits
        validHandoverOtp = med.handoverCode;
      });

      it("should allow the assigned partner to retrieve the claimed donation in /partner/my-accepted", async () => {
        const res = await http("GET", "/medicines/partner/my-accepted", null, partnerToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        const found = res.data.data.some((m) => m._id === testDonationId);
        expect(found).toBe(true);
      });
    });

    describe("Physical Handover Verification, Lockout Defense & Completion", () => {
      it("should reject verification if handover code is missing or empty", async () => {
        const res = await http(
          "POST",
          `/medicines/${testDonationId}/verify-handover`,
          { code: "" },
          partnerToken
        );
        expect(res.status).toBe(400);
      });

      it("should block a non-assigned partner from verifying the handover (403 Forbidden)", async () => {
        const res = await http(
          "POST",
          `/medicines/${testDonationId}/verify-handover`,
          { code: validHandoverOtp },
          otherPartnerToken
        );
        expect(res.status).toBe(403);
        expect(res.data.message).toContain("Only the partner organization assigned");
      });

      it("should reject an incorrect code and decrement remaining attempts", async () => {
        const res = await http(
          "POST",
          `/medicines/${testDonationId}/verify-handover`,
          { code: "999999" },
          partnerToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("Invalid handover code");
        expect(res.data.attemptsRemaining).toBe(4);
      });

      it("should lock verification after 5 consecutive incorrect code attempts", async () => {
        // Submit 4 more incorrect codes (attempts 2, 3, 4, 5)
        for (let i = 2; i <= 5; i++) {
          await http(
            "POST",
            `/medicines/${testDonationId}/verify-handover`,
            { code: "123456" },
            partnerToken
          );
        }

        // 6th attempt with CORRECT code should still be blocked due to security lockout
        const blockedRes = await http(
          "POST",
          `/medicines/${testDonationId}/verify-handover`,
          { code: validHandoverOtp },
          partnerToken
        );
        expect(blockedRes.status).toBe(400);
        expect(blockedRes.data.message).toContain("locked");
      });

      it("should allow an administrator to safely unlock the locked handover", async () => {
        const unlockRes = await http(
          "POST",
          `/admin/medicines/${testDonationId}/unlock-handover`,
          {},
          adminToken
        );
        expect(unlockRes.status).toBe(200);
        expect(unlockRes.data.success).toBe(true);
        expect(unlockRes.data.data.handoverLocked).toBe(false);
        expect(unlockRes.data.data.handoverFailedAttempts).toBe(0);
      });

      it("should successfully complete physical handover when correct 6-digit OTP is entered", async () => {
        const completeRes = await http(
          "POST",
          `/medicines/${testDonationId}/verify-handover`,
          { code: validHandoverOtp },
          partnerToken
        );
        expect(completeRes.status).toBe(200);
        expect(completeRes.data.success).toBe(true);
        expect(completeRes.data.data.status).toBe("completed");
        expect(completeRes.data.data.completedAt).toBeDefined();
      });

      it("should prevent re-verification of an already completed handover", async () => {
        const res = await http(
          "POST",
          `/medicines/${testDonationId}/verify-handover`,
          { code: validHandoverOtp },
          partnerToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("already been verified and completed");
      });
    });

    describe("Partner Release / Rejection Workflow (/reject-donation)", () => {
      let releaseTargetId = null;

      beforeAll(async () => {
        const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const medRes = await http(
          "POST",
          "/medicines",
          {
            medicineName: `Release Test Med ${ts}`,
            company: "Ranbaxy",
            category: "Antibiotics",
            quantity: 10,
            expiryDate: validFutureDate,
          },
          donorToken
        );
        releaseTargetId = medRes.data?.data?._id;

        await http("PATCH", `/admin/medicines/${releaseTargetId}/status`, { status: "approved" }, adminToken);
        await http("POST", `/medicines/${releaseTargetId}/accept-donation`, {}, partnerToken);
      });

      it("should allow a partner to release an accepted donation back to the pool with a reason", async () => {
        const res = await http(
          "POST",
          `/medicines/${releaseTargetId}/reject-donation`,
          { reason: "Clinic already has surplus of this antibiotic batch" },
          partnerToken
        );
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.status).toBe("approved");
        expect(res.data.data.acceptedBy).toBeNull();
        expect(res.data.data.rejectionReason).toBe("Clinic already has surplus of this antibiotic batch");
      });
    });
  });
}
