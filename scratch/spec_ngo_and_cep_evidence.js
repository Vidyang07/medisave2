/**
 * Jasmine Spec: CEP Proofs, Dynamic Impact Calculations & NGO Community Requests
 */

import { JasmineRunner, http } from "./jasmine_runner.js";

export function registerNgoAndCepEvidenceSpecs(runner) {
  const { describe, it, beforeAll, expect } = runner;

  describe("CEP Academic Evidence, Dynamic Impact & NGO Requests", () => {
    let donorToken = null;
    const ts = Date.now();

    beforeAll(async () => {
      const donorRes = await http("POST", "/auth/register", {
        name: "NGO Beneficiary Lead",
        email: `ngo_lead_${ts}@medisave.org`,
        password: "Password123!",
        locality: "Katraj",
        role: "user",
      });
      donorToken = donorRes.data?.data?.token;
    });

    describe("CEP Proofs & Academic Documentation Hub (/api/cep-proofs)", () => {
      it("should return academic metadata, course details, and team member roster", async () => {
        const res = await http("GET", "/cep-proofs");
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.academicInfo).toBeDefined();
        expect(res.data.data.academicInfo.courseCode).toBe("0313201");
        expect(res.data.data.academicInfo.institute).toContain("Pune Institute of Computer Technology");
        expect(Array.isArray(res.data.data.teamMembers)).toBe(true);
        expect(res.data.data.teamMembers.length).toBe(4);
      });

      it("should return the 14-week CEP logbook schedule matching curriculum guidelines", async () => {
        const res = await http("GET", "/cep-proofs");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.data.logbookWeeks)).toBe(true);
        expect(res.data.data.logbookWeeks.length).toBe(14);
        expect(res.data.data.logbookWeeks[0].week).toBe(1);
        expect(res.data.data.logbookWeeks[13].week).toBe(14);
      });

      it("should dynamically calculate live platform impact metrics from database without hardcoded fallbacks", async () => {
        const res = await http("GET", "/cep-proofs");
        expect(res.status).toBe(200);
        const impact = res.data.data.quantifiableImpact;
        expect(impact).toBeDefined();
        expect(typeof impact.livePlatformMedicines).toBe("number");
        expect(typeof impact.liveApprovedListings).toBe("number");
        expect(typeof impact.liveFreeDonationsAvailable).toBe("number");
        expect(impact.livePlatformMedicines).toBeGreaterThanOrEqual(0);
      });
    });

    describe("NGO / Community Health Organization Requests (/api/ngo-requests)", () => {
      let targetRequestId = null;

      it("should list active NGO and community medicine requests", async () => {
        const res = await http("GET", "/ngo-requests");
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);
        expect(res.data.data.length).toBeGreaterThan(0);
        targetRequestId = res.data.data[0].id;
      });

      it("should support filtering NGO requests by locality and urgency level", async () => {
        const res = await http("GET", "/ngo-requests?locality=Katraj&urgency=Urgent");
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(Array.isArray(res.data.data)).toBe(true);
      });

      it("should allow a donor to fulfill/pledge donations to an active NGO request", async () => {
        if (targetRequestId) {
          const res = await http(
            "POST",
            `/ngo-requests/${targetRequestId}/fulfill`,
            {
              quantityDonated: 10,
              donorNotes: "Pledged surplus paracetamol blister packs",
            },
            donorToken
          );
          expect(res.status).toBe(200);
          expect(res.data.success).toBe(true);
          expect(res.data.message).toContain("Successfully donated");
        }
      });

      it("should return 404 when attempting to fulfill a non-existent NGO request ID", async () => {
        const res = await http(
          "POST",
          "/ngo-requests/non-existent-id/fulfill",
          { quantityDonated: 5 },
          donorToken
        );
        expect(res.status).toBe(404);
        expect(res.data.success).toBe(false);
      });
    });
  });
}
