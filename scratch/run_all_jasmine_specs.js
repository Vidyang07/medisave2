/**
 * MEDISAVE - Jasmine Master Test Suite Runner
 * 
 * Executes all BDD test suites across every user persona, route, and edge case:
 * 1. Authentication, Security, RBAC & Login Rate Limiting
 * 2. Donor Journey, AI Intake, Pricing Policy & Listing Lifecycle
 * 3. Public Catalog, Search Sanitization, Distance Engine & Donor Privacy
 * 4. Partner Workflow, 6-Digit Handover OTP, Lockout Defense & Re-moderation
 * 5. Admin Moderation Console, Stats, Partner Verification & Platform Governance
 * 6. Prescription Verification, IDOR Protection & Document Streaming
 * 7. CEP Academic Evidence, Dynamic Impact & NGO Requests
 */

import { JasmineRunner } from "./jasmine_runner.js";
import { registerAuthAndSecuritySpecs } from "./spec_auth_and_security.js";
import { registerDonorJourneySpecs } from "./spec_donor_journey.js";
import { registerPublicAndSearchSpecs } from "./spec_public_and_search.js";
import { registerPartnerAndHandoverSpecs } from "./spec_partner_and_handover.js";
import { registerAdminModerationSpecs } from "./spec_admin_moderation.js";
import { registerPrescriptionSpecs } from "./spec_prescriptions_and_idor.js";
import { registerNgoAndCepEvidenceSpecs } from "./spec_ngo_and_cep_evidence.js";

async function runAllSpecs() {
  const runner = new JasmineRunner("MEDISAVE Comprehensive Full-Stack Jasmine Test Suite");

  // Register all BDD test suites
  registerAuthAndSecuritySpecs(runner);
  registerDonorJourneySpecs(runner);
  registerPublicAndSearchSpecs(runner);
  registerPartnerAndHandoverSpecs(runner);
  registerAdminModerationSpecs(runner);
  registerPrescriptionSpecs(runner);
  registerNgoAndCepEvidenceSpecs(runner);

  // Execute test suite
  const results = await runner.execute();

  if (!results.success) {
    console.error(`\x1b[31mJASMINE TEST SUITE FAILED with ${results.failedSpecs} failing spec(s).\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mALL ${results.passedSpecs} JASMINE SPECS PASSED SUCCESSFULLY (${results.passedExpectations} expectations verified)!\x1b[0m\n`);
    process.exit(0);
  }
}

runAllSpecs();
