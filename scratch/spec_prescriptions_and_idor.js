/**
 * Jasmine Spec: Prescription Verification, IDOR Defense & Secure Document Streaming
 */

import { JasmineRunner, http, API_BASE } from "./jasmine_runner.js";

export function registerPrescriptionSpecs(runner) {
  const { describe, it, beforeAll, expect } = runner;

  describe("Prescription Verification, IDOR Protection & Schedule H Moderation", () => {
    let userAToken = null;
    let userBToken = null;
    let adminToken = null;
    let userAPrescriptionId = null;
    const ts = Date.now();

    beforeAll(async () => {
      // 1. Admin login
      const adminLogin = await http("POST", "/auth/login", {
        email: "admin@medisave.org",
        password: "MedisaveAdmin2026!",
      });
      adminToken = adminLogin.data?.data?.token;

      // 2. User A
      const userARes = await http("POST", "/auth/register", {
        name: "Patient Alice",
        email: `alice_${ts}@medisave.org`,
        password: "Password123!",
        role: "user",
      });
      userAToken = userARes.data?.data?.token;

      // 3. User B (Attacker / Unrelated User)
      const userBRes = await http("POST", "/auth/register", {
        name: "Patient Bob",
        email: `bob_${ts}@medisave.org`,
        password: "Password123!",
        role: "user",
      });
      userBToken = userBRes.data?.data?.token;
    });

    describe("Prescription Upload & Validation (/api/prescriptions)", () => {
      it("should reject unauthenticated upload with 401 Unauthorized", async () => {
        const res = await http("POST", "/prescriptions", { patientName: "Alice" });
        expect(res.status).toBe(401);
      });

      it("should reject upload when prescription file is missing", async () => {
        const formData = new FormData();
        formData.append("patientName", "Alice Test");

        const res = await fetch(`${API_BASE}/prescriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${userAToken}` },
          body: formData,
        });
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.message).toContain("Please upload a prescription document");
      });

      it("should reject upload when patient name is missing", async () => {
        const formData = new FormData();
        const dummyPdf = new Blob(["%PDF-1.4 dummy pdf content"], { type: "application/pdf" });
        formData.append("prescription", dummyPdf, "test_rx.pdf");

        const res = await fetch(`${API_BASE}/prescriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${userAToken}` },
          body: formData,
        });
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.message).toContain("Patient name is required");
      });

      it("should reject unsupported file types (e.g. text or executable)", async () => {
        const formData = new FormData();
        const dummyTxt = new Blob(["this is a text file"], { type: "text/plain" });
        formData.append("prescription", dummyTxt, "test.txt");
        formData.append("patientName", "Alice Test");

        const res = await fetch(`${API_BASE}/prescriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${userAToken}` },
          body: formData,
        });
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.message).toContain("Unsupported file type");
      });

      it("should successfully upload a valid PDF prescription in 'pending' status", async () => {
        const formData = new FormData();
        const dummyPdf = new Blob(["%PDF-1.4 sample valid prescription document"], { type: "application/pdf" });
        formData.append("prescription", dummyPdf, "valid_prescription.pdf");
        formData.append("patientName", "Alice Wonderland");
        formData.append("doctorName", "Dr. Rajesh Sharma, MD");
        formData.append("illnessDiagnosis", "Bacterial Pharyngitis");

        const res = await fetch(`${API_BASE}/prescriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${userAToken}` },
          body: formData,
        });
        const json = await res.json();
        expect(res.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.data._id).toBeDefined();
        expect(json.data.status).toBe("pending");
        expect(json.data.patientName).toBe("Alice Wonderland");
        userAPrescriptionId = json.data._id;
      });
    });

    describe("User Prescription Access & IDOR Defense", () => {
      it("should allow User A to retrieve their own uploaded prescriptions list", async () => {
        const res = await http("GET", "/prescriptions/my-prescriptions", null, userAToken);
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        const found = res.data.data.some((rx) => rx._id === userAPrescriptionId);
        expect(found).toBe(true);
      });

      it("should allow User A to retrieve their own prescription metadata by ID", async () => {
        const res = await http("GET", `/prescriptions/${userAPrescriptionId}`, null, userAToken);
        expect(res.status).toBe(200);
        expect(res.data.data._id).toBe(userAPrescriptionId);
      });

      it("should allow User A to stream their own prescription document", async () => {
        const res = await fetch(`${API_BASE}/prescriptions/${userAPrescriptionId}/document`, {
          headers: { Authorization: `Bearer ${userAToken}` },
        });
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe("application/pdf");
      });

      it("should block User B from viewing User A's prescription metadata (IDOR Defense: 403 Forbidden)", async () => {
        const res = await http("GET", `/prescriptions/${userAPrescriptionId}`, null, userBToken);
        expect(res.status).toBe(403);
        expect(res.data.message).toContain("Forbidden");
      });

      it("should block User B from streaming User A's prescription document (IDOR Defense: 403 Forbidden)", async () => {
        const res = await fetch(`${API_BASE}/prescriptions/${userAPrescriptionId}/document`, {
          headers: { Authorization: `Bearer ${userBToken}` },
        });
        expect(res.status).toBe(403);
      });

      it("should verify that sensitive documentPath is excluded from JSON API responses", async () => {
        const res = await http("GET", `/prescriptions/${userAPrescriptionId}`, null, userAToken);
        expect(res.status).toBe(200);
        expect(res.data.data.documentPath).toBeUndefined();
      });
    });

    describe("Admin Prescription Verification Queue & Document Auditing", () => {
      it("should allow Admin to view pending prescriptions queue", async () => {
        const res = await http("GET", "/admin/prescriptions?status=pending", null, adminToken);
        expect(res.status).toBe(200);
        const found = res.data.data.some((rx) => rx._id === userAPrescriptionId);
        expect(found).toBe(true);
      });

      it("should allow Admin to securely stream the patient's prescription document", async () => {
        const res = await fetch(`${API_BASE}/admin/prescriptions/${userAPrescriptionId}/document`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe("application/pdf");
      });

      it("should allow Admin to approve the prescription with a future validity date", async () => {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);

        const res = await http(
          "PATCH",
          `/admin/prescriptions/${userAPrescriptionId}/approve`,
          { validUntil: futureDate.toISOString() },
          adminToken
        );
        expect(res.status).toBe(200);
        expect(res.data.data.status).toBe("approved");
        expect(res.data.data.validUntil).toBeDefined();
      });

      it("should prevent duplicate approval of an already approved prescription", async () => {
        const res = await http(
          "PATCH",
          `/admin/prescriptions/${userAPrescriptionId}/approve`,
          {},
          adminToken
        );
        expect(res.status).toBe(400);
        expect(res.data.message).toContain("already approved");
      });

      it("should allow Admin to reject another prescription with a required rejection reason", async () => {
        // Upload second prescription to reject
        const formData = new FormData();
        const dummyPdf = new Blob(["%PDF-1.4 sample rx to reject"], { type: "application/pdf" });
        formData.append("prescription", dummyPdf, "unclear_rx.pdf");
        formData.append("patientName", "Alice Unclear");

        const uploadRes = await fetch(`${API_BASE}/prescriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${userAToken}` },
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        const rejectTargetId = uploadJson.data._id;

        // Missing reason rejected with 400
        const missingReasonRes = await http(
          "PATCH",
          `/admin/prescriptions/${rejectTargetId}/reject`,
          {},
          adminToken
        );
        expect(missingReasonRes.status).toBe(400);

        // Valid reason succeeds
        const rejectRes = await http(
          "PATCH",
          `/admin/prescriptions/${rejectTargetId}/reject`,
          { rejectionReason: "Prescription image is blurry and doctor signature is missing" },
          adminToken
        );
        expect(rejectRes.status).toBe(200);
        expect(rejectRes.data.data.status).toBe("rejected");
        expect(rejectRes.data.data.rejectionReason).toContain("doctor signature is missing");
      });
    });
  });
}
