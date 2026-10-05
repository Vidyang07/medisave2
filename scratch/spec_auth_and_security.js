/**
 * Jasmine Spec: Authentication, Security, RBAC & Login Rate Limiting
 */

import { JasmineRunner, http } from "./jasmine_runner.js";

export function registerAuthAndSecuritySpecs(runner) {
  const { describe, it, beforeAll, expect } = runner;

  describe("Authentication, RBAC & Security Guardrails", () => {
    let testUserToken = null;
    let testUserId = null;
    let testPartnerToken = null;
    let testAdminToken = null;
    const ts = Date.now();

    describe("User Registration & Input Validation", () => {
      it("should reject registration when required fields are missing", async () => {
        const res = await http("POST", "/auth/register", {
          email: `test_missing_${ts}@medisave.org`,
          // missing name and password
        });
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("required fields");
      });

      it("should reject registration with an invalid email format", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Invalid Email User",
          email: "not-an-email",
          password: "Password123!",
        });
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("valid email");
      });

      it("should reject registration with a password shorter than 6 characters", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Short Pass User",
          email: `short_pass_${ts}@medisave.org`,
          password: "123",
        });
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("6 characters");
      });

      it("should successfully register a standard community donor account", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Dr. Ananya Joshi",
          email: `donor_reg_${ts}@medisave.org`,
          password: "ValidPassword123!",
          phone: "+91 98220 11223",
          address: "Flat 402, Kothrud Hills, Pune",
          locality: "Kothrud",
          role: "user",
        });
        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data.token).toBeDefined();
        expect(res.data.data.user.email).toBe(`donor_reg_${ts}@medisave.org`);
        expect(res.data.data.user.role).toBe("user");
        expect(res.data.data.user.locality).toBe("Kothrud");
        testUserToken = res.data.data.token;
        testUserId = res.data.data.user._id;
      });

      it("should reject duplicate registration with the same email address", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Duplicate User",
          email: `donor_reg_${ts}@medisave.org`,
          password: "AnotherPassword123!",
        });
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("already exists");
      });

      it("should reject partner registration if organization name is missing", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Dr. Anonymous Clinic",
          email: `partner_no_org_${ts}@medisave.org`,
          password: "PartnerPassword123!",
          role: "partner",
          // missing organizationName
        });
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("Organization name is required");
      });

      it("should register a partner organization with pending partnerStatus", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Seva Charitable Dispensary",
          email: `partner_reg_${ts}@medisave.org`,
          password: "PartnerPassword123!",
          phone: "+91 98220 44556",
          address: "Near Katraj Lake, Pune",
          locality: "Katraj",
          role: "partner",
          organizationName: "Seva Arogya Trust",
          organizationType: "Charitable Clinic",
        });
        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data.user.role).toBe("partner");
        expect(res.data.data.user.partnerStatus).toBe("pending");
        expect(res.data.data.user.organizationName).toBe("Seva Arogya Trust");
        testPartnerToken = res.data.data.token;
      });

      it("should reject admin registration with an invalid or missing coordinator security key", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Unauthorized Admin Attempt",
          email: `admin_bad_key_${ts}@medisave.org`,
          password: "AdminPassword123!",
          role: "admin",
          adminSecretKey: "WRONG-KEY",
        });
        expect(res.status).toBe(403);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("Invalid Administrator / Coordinator Security Key");
      });

      it("should successfully register a verified platform coordinator / administrator with valid security key", async () => {
        const res = await http("POST", "/auth/register", {
          name: "Institutional Coordinator Desk",
          email: `coordinator_admin_${ts}@medisave.org`,
          password: "AdminCoordinatorPass2026!",
          phone: "+91 98230 11999",
          address: "PICT Campus, Pune",
          locality: "Dhankawadi",
          role: "admin",
          adminSecretKey: "MEDISAVE-ADMIN-2026",
        });
        expect(res.status).toBe(201);
        expect(res.data.success).toBe(true);
        expect(res.data.data.user.role).toBe("admin");
        expect(res.data.data.user.isVerified).toBe(true);
        expect(res.data.data.token).toBeDefined();
        testAdminToken = res.data.data.token;
      });
    });

    describe("User Login & Rate Limiting", () => {
      it("should reject login with missing credentials", async () => {
        const res = await http("POST", "/auth/login", {});
        expect(res.status).toBe(400);
        expect(res.data.success).toBe(false);
      });

      it("should reject login with non-existent email", async () => {
        const res = await http("POST", "/auth/login", {
          email: `nonexistent_${ts}@medisave.org`,
          password: "Password123!",
        });
        expect(res.status).toBe(401);
        expect(res.data.success).toBe(false);
        expect(res.data.message).toContain("Invalid email or password");
      });

      it("should reject login with incorrect password", async () => {
        const res = await http("POST", "/auth/login", {
          email: `donor_reg_${ts}@medisave.org`,
          password: "WrongPassword999!",
        });
        expect(res.status).toBe(401);
        expect(res.data.success).toBe(false);
      });

      it("should successfully authenticate with valid credentials and return JWT token", async () => {
        const res = await http("POST", "/auth/login", {
          email: `donor_reg_${ts}@medisave.org`,
          password: "ValidPassword123!",
        });
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.token).toBeDefined();
        expect(res.data.data.user._id).toBe(testUserId);
      });

      it("should enforce server-side login rate limiting after 5 failed attempts (HTTP 429)", async () => {
        const rateLimitEmail = `ratelimit_target_${ts}@medisave.org`;
        let hit429 = false;

        // Perform 6 consecutive failed login attempts
        for (let i = 1; i <= 6; i++) {
          const attempt = await http("POST", "/auth/login", {
            email: rateLimitEmail,
            password: "WrongPasswordForever!",
          });
          if (attempt.status === 429) {
            hit429 = true;
            expect(attempt.data.message).toContain("Too many failed login attempts");
            break;
          }
        }
        expect(hit429).toBe(true);
      });
    });

    describe("Profile Access & JWT Verification (/api/auth/me)", () => {
      it("should reject unauthenticated request to /api/auth/me with 401 Unauthorized", async () => {
        const res = await http("GET", "/auth/me");
        expect(res.status).toBe(401);
        expect(res.data.success).toBe(false);
      });

      it("should reject request with a forged/malformed JWT token with 401", async () => {
        const res = await http("GET", "/auth/me", null, "invalid.forged.jwt.token");
        expect(res.status).toBe(401);
        expect(res.data.success).toBe(false);
      });

      it("should return the authenticated user profile with valid Bearer token", async () => {
        const res = await http("GET", "/auth/me", null, testUserToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.user.email).toBe(`donor_reg_${ts}@medisave.org`);
        expect(res.data.data.user.name).toBe("Dr. Ananya Joshi");
      });
    });

    describe("Role-Based Access Control (RBAC) Boundaries", () => {
      beforeAll(async () => {
        const adminLogin = await http("POST", "/auth/login", {
          email: "admin@medisave.org",
          password: "MedisaveAdmin2026!",
        });
        if (adminLogin.ok) {
          testAdminToken = adminLogin.data.data.token;
        }
      });

      it("should block a normal donor from accessing admin metrics (/api/admin/stats) with 403 Forbidden", async () => {
        const res = await http("GET", "/admin/stats", null, testUserToken);
        expect(res.status).toBe(403);
      });

      it("should block a normal donor from accessing partner available donations with 403 Forbidden", async () => {
        const res = await http("GET", "/medicines/partner/available", null, testUserToken);
        expect(res.status).toBe(403);
      });

      it("should block a partner from accessing admin user list (/api/admin/users) with 403 Forbidden", async () => {
        const res = await http("GET", "/admin/users", null, testPartnerToken);
        expect(res.status).toBe(403);
      });

      it("should allow an admin to access admin metrics (/api/admin/stats)", async () => {
        if (testAdminToken) {
          const res = await http("GET", "/admin/stats", null, testAdminToken);
          expect(res.status).toBe(200);
          expect(res.data.data.users).toBeDefined();
          expect(res.data.data.medicines).toBeDefined();
        }
      });

      it("should confirm the commercial marketplace /api/orders endpoint is unmounted (HTTP 404)", async () => {
        const res = await http("POST", "/orders", { dummy: "order" }, testUserToken);
        expect(res.status).toBe(404);
      });
    });
  });
}
