/**
 * Jasmine Spec: Admin Moderation Console, Partner Verification & Platform Governance
 */

import { JasmineRunner, http } from "./jasmine_runner.js";

export function registerAdminModerationSpecs(runner) {
  const { describe, it, beforeAll, expect } = runner;

  describe("Admin Moderation Console & Platform Governance", () => {
    let adminToken = null;
    let donorToken = null;
    let testMedId = null;
    let testPartnerId = null;
    let testUserId = null;
    const ts = Date.now();

    beforeAll(async () => {
      // 1. Admin login
      const adminLogin = await http("POST", "/auth/login", {
        email: "admin@medisave.org",
        password: "MedisaveAdmin2026!",
      });
      adminToken = adminLogin.data?.data?.token;

      // 2. Register test user and partner
      const userRes = await http("POST", "/auth/register", {
        name: "Admin Audit Donor",
        email: `admin_audit_donor_${ts}@medisave.org`,
        password: "Password123!",
        role: "user",
      });
      donorToken = userRes.data?.data?.token;
      testUserId = userRes.data?.data?.user?._id;

      const partnerRes = await http("POST", "/auth/register", {
        name: "Admin Audit Clinic",
        email: `admin_audit_partner_${ts}@medisave.org`,
        password: "Password123!",
        role: "partner",
        organizationName: "Governance Clinic",
        organizationType: "NGO",
      });
      testPartnerId = partnerRes.data?.data?.user?._id;

      // 3. Create a pending medicine
      const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const medRes = await http(
        "POST",
        "/medicines",
        {
          medicineName: `Moderation Test Drug ${ts}`,
          company: "Sun Pharma",
          category: "Gastrointestinal",
          quantity: 15,
          expiryDate: validFutureDate,
        },
        donorToken
      );
      testMedId = medRes.data?.data?._id;
    });

    describe("Admin Metrics & Platform Stats (/api/admin/stats)", () => {
      it("should return comprehensive platform stats for authorized administrators", async () => {
        const res = await http("GET", "/admin/stats", null, adminToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.users).toBeDefined();
        expect(typeof res.data.data.users.total).toBe("number");
        expect(res.data.data.medicines).toBeDefined();
        expect(typeof res.data.data.medicines.pending).toBe("number");
        expect(typeof res.data.data.medicines.approved).toBe("number");
        expect(res.data.data.prescriptions).toBeDefined();
      });
    });

    describe("Medicine Moderation Queue & Approval/Rejection Workflow", () => {
      it("should allow admin to list pending medicines in moderation queue", async () => {
        const res = await http("GET", "/admin/medicines?status=pending", null, adminToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        const found = res.data.data.some((m) => m._id === testMedId);
        expect(found).toBe(true);
      });

      it("should allow admin to approve a pending medicine listing", async () => {
        const res = await http(
          "PATCH",
          `/admin/medicines/${testMedId}/status`,
          { status: "approved" },
          adminToken
        );
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.status).toBe("approved");
      });

      it("should allow admin to reject a medicine listing with an explanatory audit reason", async () => {
        // Create another temporary listing to reject
        const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const medRes = await http(
          "POST",
          "/medicines",
          {
            medicineName: `Reject Target Drug ${ts}`,
            company: "Unverified Labs",
            category: "Other",
            quantity: 5,
            expiryDate: validFutureDate,
          },
          donorToken
        );
        const rejectMedId = medRes.data?.data?._id;

        const res = await http(
          "PATCH",
          `/admin/medicines/${rejectMedId}/status`,
          {
            status: "rejected",
            rejectionReason: "Packaging photograph is unreadable and illegible batch stamp",
          },
          adminToken
        );
        expect(res.status).toBe(200);
        expect(res.data.data.status).toBe("rejected");
        expect(res.data.data.rejectionReason).toContain("illegible batch stamp");
      });

      it("should allow admin to permanently delete an inappropriate listing", async () => {
        const validFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const medRes = await http(
          "POST",
          "/medicines",
          {
            medicineName: `Delete Target Drug ${ts}`,
            company: "Spam Lab",
            category: "Other",
            quantity: 1,
            expiryDate: validFutureDate,
          },
          donorToken
        );
        const delMedId = medRes.data?.data?._id;

        const res = await http("DELETE", `/admin/medicines/${delMedId}`, null, adminToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);

        const verifyRes = await http("GET", `/medicines/${delMedId}`);
        expect(verifyRes.status).toBe(404);
      });
    });

    describe("Partner Organization Verification (/api/admin/partners)", () => {
      it("should list all partner organizations for verification review", async () => {
        const res = await http("GET", "/admin/partners", null, adminToken);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.data)).toBe(true);
        const found = res.data.data.some((p) => p._id === testPartnerId);
        expect(found).toBe(true);
      });

      it("should moderate partner status to 'verified'", async () => {
        const res = await http(
          "PATCH",
          `/admin/partners/${testPartnerId}/verify`,
          { partnerStatus: "verified" },
          adminToken
        );
        expect(res.status).toBe(200);
        expect(res.data.data.partnerStatus).toBe("verified");
        expect(res.data.data.isVerified).toBe(true);
      });

      it("should reject invalid partner status updates with 400", async () => {
        const res = await http(
          "PATCH",
          `/admin/partners/${testPartnerId}/verify`,
          { partnerStatus: "invalid_status" },
          adminToken
        );
        expect(res.status).toBe(400);
      });
    });

    describe("User Management & Verification (/api/admin/users)", () => {
      it("should allow admin to view all registered users with pagination", async () => {
        const res = await http("GET", "/admin/users?page=1&limit=10", null, adminToken);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.data)).toBe(true);
        expect(res.data.count).toBeDefined();
      });

      it("should allow admin to toggle user verification status", async () => {
        const res = await http("PATCH", `/admin/users/${testUserId}/verify`, {}, adminToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.isVerified).toBeDefined();
      });

      it("should allow admin to update a user role", async () => {
        const res = await http(
          "PATCH",
          `/admin/users/${testUserId}/role`,
          { role: "user" },
          adminToken
        );
        expect(res.status).toBe(200);
        expect(res.data.data.role).toBe("user");
      });
    });
  });
}
