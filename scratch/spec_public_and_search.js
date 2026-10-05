/**
 * Jasmine Spec: Public Catalog, Search Sanitization, Filters & Donor Privacy
 */

import { JasmineRunner, http } from "./jasmine_runner.js";

export function registerPublicAndSearchSpecs(runner) {
  const { describe, it, beforeAll, expect } = runner;

  describe("Public Marketplace Catalog, Search & Privacy Protection", () => {
    let sampleApprovedMedId = null;
    const ts = Date.now();

    beforeAll(async () => {
      // Register test donor and create a test medicine
      const donorRes = await http("POST", "/auth/register", {
        name: "Catalog Test Donor",
        email: `catalog_donor_${ts}@medisave.org`,
        password: "Password123!",
        locality: "Kothrud",
        role: "user",
      });
      const donorToken = donorRes.data?.data?.token;

      // Register test admin to approve
      const adminRes = await http("POST", "/auth/register", {
        name: "Catalog Admin",
        email: `catalog_admin_${ts}@medisave.org`,
        password: "Password123!",
        role: "admin",
        adminSecretKey: "MEDISAVE-ADMIN-2026",
      });
      const adminToken = adminRes.data?.data?.token;

      // Create test approved medicine
      if (donorToken) {
        const futureDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString();
        const medRes = await http(
          "POST",
          "/medicines",
          {
            medicineName: "Catalog Discovery Paracetamol",
            company: "GSK",
            category: "Pain & Fever",
            quantity: 10,
            expiryDate: futureDate,
            locality: "Kothrud",
            handoverPoint: "City Pride Kothrud",
          },
          donorToken
        );
        sampleApprovedMedId = medRes.data?.data?._id;

        if (adminToken && sampleApprovedMedId) {
          await http("PATCH", `/admin/medicines/${sampleApprovedMedId}/status`, { status: "approved" }, adminToken);
        }
      }
    });

    describe("Public Catalog Discovery & Status Isolation", () => {
      it("should return a list of approved community donations on GET /api/medicines", async () => {
        const res = await http("GET", "/medicines");
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);
        expect(res.data.data.length).toBeGreaterThan(0);
      });

      it("should strictly ensure ALL public catalog items have status 'approved'", async () => {
        const res = await http("GET", "/medicines?limit=50");
        const nonApproved = res.data.data.filter((m) => m.status !== "approved");
        expect(nonApproved.length).toBe(0);
      });

      it("should isolate public status queries: ?status=pending must return ONLY approved listings to anonymous users", async () => {
        const res = await http("GET", "/medicines?status=pending");
        expect(res.status).toBe(200);
        const hasPending = res.data.data.some((m) => m.status === "pending");
        expect(hasPending).toBe(false);
      });
    });

    describe("Catalog Filtering & Pagination", () => {
      it("should filter catalog by category", async () => {
        const res = await http("GET", "/medicines?category=Pain%20%26%20Fever");
        expect(res.status).toBe(200);
        if (res.data.data.length > 0) {
          const allMatch = res.data.data.every((m) => m.category === "Pain & Fever");
          expect(allMatch).toBe(true);
        }
      });

      it("should filter catalog by dosageForm", async () => {
        const res = await http("GET", "/medicines?dosageForm=Tablet");
        expect(res.status).toBe(200);
        if (res.data.data.length > 0) {
          const allMatch = res.data.data.every((m) => m.dosageForm === "Tablet");
          expect(allMatch).toBe(true);
        }
      });

      it("should filter catalog by prescription requirement (OTC vs Rx)", async () => {
        const otcRes = await http("GET", "/medicines?rxFilter=otc");
        expect(otcRes.status).toBe(200);
        if (otcRes.data.data.length > 0) {
          const allOtc = otcRes.data.data.every((m) => m.isPrescriptionRequired === false);
          expect(allOtc).toBe(true);
        }

        const rxRes = await http("GET", "/medicines?rxFilter=rx");
        expect(rxRes.status).toBe(200);
        if (rxRes.data.data.length > 0) {
          const allRx = rxRes.data.data.every((m) => m.isPrescriptionRequired === true);
          expect(allRx).toBe(true);
        }
      });

      it("should support pagination parameters (page, limit)", async () => {
        const res = await http("GET", "/medicines?page=1&limit=3");
        expect(res.status).toBe(200);
        expect(res.data.pagination).toBeDefined();
        expect(res.data.pagination.page).toBe(1);
        expect(res.data.pagination.limit).toBe(3);
        expect(res.data.data.length).toBeLessThanOrEqual(3);
      });
    });

    describe("Proximity Sorting & Pune Haversine Distance Engine", () => {
      it("should sort listings by Haversine proximity from buyerLocality (sort=nearby)", async () => {
        const res = await http("GET", "/medicines?buyerLocality=Katraj&sort=nearby");
        expect(res.status).toBe(200);
        expect(res.data.buyerLocality).toBe("Katraj");
        expect(res.data.data.length).toBeGreaterThan(0);

        // Verify each item has calculated proximity metadata
        const firstItem = res.data.data[0];
        expect(firstItem.proximity).toBeDefined();
        expect(typeof firstItem.proximity.distanceKm).toBe("number");
        expect(firstItem.proximity.tier).toBeDefined();
      });

      it("should sort listings by nearest expiry date (sort=expiry-nearest)", async () => {
        const res = await http("GET", "/medicines?sort=expiry-nearest");
        expect(res.status).toBe(200);
        if (res.data.data.length >= 2) {
          const d1 = new Date(res.data.data[0].expiryDate).getTime();
          const d2 = new Date(res.data.data[1].expiryDate).getTime();
          expect(d1).toBeLessThanOrEqual(d2);
        }
      });
    });

    describe("Search Input Sanitization & Regex Injection Resistance", () => {
      it("should safely sanitize complex regex characters without server errors", async () => {
        const specialQueries = [
          "Crocin (500mg)",
          "Paracetamol [Tablet]",
          "Dolo + 650",
          "Azee *",
          "Pan ? 40",
          "Test $ ^ { } | \\",
        ];

        for (const q of specialQueries) {
          const res = await http("GET", `/medicines?search=${encodeURIComponent(q)}`);
          expect(res.status).toBe(200);
          expect(res.data.success).toBe(true);
        }
      });
    });

    describe("Donor Contact Privacy Enforcement", () => {
      it("should omit seller email, phone number, and physical home address from public catalog", async () => {
        const res = await http("GET", "/medicines?limit=5");
        expect(res.status).toBe(200);

        for (const item of res.data.data) {
          if (item.seller) {
            expect(item.seller.email).toBeUndefined();
            expect(item.seller.phone).toBeUndefined();
            expect(item.seller.address).toBeUndefined();
            expect(item.seller.name).toBeDefined();
          }
        }
      });

      it("should omit seller contact info from single medicine endpoint GET /api/medicines/:id", async () => {
        if (sampleApprovedMedId) {
          const res = await http("GET", `/medicines/${sampleApprovedMedId}`);
          expect(res.status).toBe(200);
          expect(res.data.success).toBe(true);
          const med = res.data.data;
          if (med.seller) {
            expect(med.seller.email).toBeUndefined();
            expect(med.seller.phone).toBeUndefined();
            expect(med.seller.address).toBeUndefined();
            expect(med.seller.name).toBeDefined();
          }
        }
      });

      it("should return clean 404 for invalid ObjectId format on GET /api/medicines/:id", async () => {
        const res = await http("GET", "/medicines/invalid-id-format");
        expect(res.status).toBe(404);
        expect(res.data.success).toBe(false);
      });

      it("should return 404 for non-existent valid ObjectId", async () => {
        const res = await http("GET", "/medicines/507f1f77bcf86cd799439011");
        expect(res.status).toBe(404);
        expect(res.data.success).toBe(false);
      });
    });
  });
}
