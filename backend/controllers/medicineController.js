import crypto from "crypto";
import mongoose from "mongoose";
import Medicine from "../models/Medicine.js";
import { getAiMedicineEstimation } from "../services/aiMedicineService.js";
import {
  calculateSuggestedPrice,
  validateSubmittedPrice,
} from "../services/pricingService.js";
import {
  findLocality,
  getProximityInfo,
} from "../config/localityConstants.js";

export const COLD_CHAIN_KEYWORDS = [
  "insulin",
  "human insulin",
  "glargine",
  "lispro",
  "aspart",
  "erythropoietin",
  "filgrastim",
  "interferon",
  "monoclonal",
  "vaccine",
  "rituximab",
  "trastuzumab",
  "octreotide",
  "somatropin",
  "enoxaparin",
  "immunoglobulin",
  "botox",
  "botulinum",
];

export const SCHEDULE_X_KEYWORDS = [
  "fentanyl",
  "morphine",
  "methadone",
  "oxycodone",
  "pethidine",
  "ketamine",
  "methylphenidate",
  "amphetamine",
  "secobarbital",
  "pentobarbital",
  "phencyclidine",
  "codeine",
  "buprenorphine",
  "diazepam",
  "lorazepam",
  "alprazolam",
  "clonazepam",
  "tramadol",
  "zolpidem",
  "pentazocine",
  "hydrocodone",
  "oxymorphone",
];

// @desc    Get all medicines with search, filters, sorting & pagination
// @route   GET /api/medicines
// @access  Public
export const getMedicines = async (req, res) => {
  try {
    const {
      search,
      category,
      dosageForm,
      maxPrice,
      rxFilter,
      sort,
      page = 1,
      limit = 12,
      status,
      buyerLocality,
      locality,
    } = req.query;

    const query = {};

    // 1. Status filter: For public catalog, strictly restrict to approved medicines
    if (req.user && req.user.role === "admin" && status && ["pending", "approved", "rejected", "accepted", "completed"].includes(status)) {
      query.status = status;
    } else {
      query.status = "approved";
    }

    // 2. Text Search (matches medicineName, brandName, company, genericName, locality, or category)
    if (search && search.trim()) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(sanitizedSearch, "i");
      query.$or = [
        { medicineName: searchRegex },
        { brandName: searchRegex },
        { genericName: searchRegex },
        { company: searchRegex },
        { category: searchRegex },
        { locality: searchRegex },
        { handoverPoint: searchRegex },
      ];
    }

    // 3. Category Filter
    if (category && category !== "All Categories" && category !== "All") {
      query.category = category;
    }

    // 4. Dosage Form Filter
    if (dosageForm && dosageForm !== "All Forms" && dosageForm !== "All") {
      query.dosageForm = dosageForm;
    }

    // 5. Max Price Filter
    if (maxPrice && !isNaN(Number(maxPrice))) {
      query.price = { $lte: Number(maxPrice) };
    }

    // 6. Prescription Filter (otc = false, rx = true)
    if (rxFilter === "otc") {
      query.isPrescriptionRequired = false;
    } else if (rxFilter === "rx") {
      query.isPrescriptionRequired = true;
    }

    // 7. Locality Filter (if specified)
    if (locality && locality !== "All Localities" && locality !== "All") {
      query.locality = new RegExp(locality.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    // 8. Listing Type Filter (free_donation vs subsidized_community_rate)
    const { listingType } = req.query;
    if (listingType && ["free_donation", "subsidized_community_rate"].includes(listingType)) {
      query.listingType = listingType;
    }

    // 9. Sorting & Proximity
    const isNearbySort = sort === "nearby";
    let sortOptions = { createdAt: -1 };
    if (sort === "price-low") {
      sortOptions = { price: 1 };
    } else if (sort === "price-high") {
      sortOptions = { price: -1 };
    } else if (sort === "expiry-nearest") {
      sortOptions = { expiryDate: 1 };
    } else if (sort === "recommended" || sort === "newest") {
      sortOptions = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const total = await Medicine.countDocuments(query);
    const activeBuyerLoc = buyerLocality || "Kothrud";

    if (isNearbySort) {
      // For nearby sorting: fetch candidates and sort deterministically by Haversine distance
      const allCandidates = await Medicine.find(query)
        .populate("seller", "name locality avatar isVerified createdAt");

      const enriched = allCandidates.map((med) => {
        const medObj = med.toObject ? med.toObject({ virtuals: true }) : med;
        const prox = getProximityInfo(
          activeBuyerLoc,
          medObj.locationCoordinates || medObj.locality
        );
        return {
          ...medObj,
          proximity: prox,
        };
      });

      enriched.sort((a, b) => {
        const distA = a.proximity?.distanceKm ?? 999;
        const distB = b.proximity?.distanceKm ?? 999;
        if (distA !== distB) return distA - distB;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const paginated = enriched.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        count: paginated.length,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
        buyerLocality: activeBuyerLoc,
        data: paginated,
      });
    }

    const medicines = await Medicine.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate("seller", "name locality avatar isVerified createdAt");

    const mapped = medicines.map((med) => {
      const medObj = med.toObject ? med.toObject({ virtuals: true }) : med;
      const prox = getProximityInfo(
        activeBuyerLoc,
        medObj.locationCoordinates || medObj.locality
      );
      return {
        ...medObj,
        proximity: prox,
      };
    });

    return res.status(200).json({
      success: true,
      count: mapped.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
      buyerLocality: activeBuyerLoc,
      data: mapped,
    });
  } catch (error) {
    console.error("Get Medicines Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching medicines",
      error: error.message,
    });
  }
};

// @desc    Get single medicine by ID
// @route   GET /api/medicines/:id
// @access  Public
export const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const medicine = await Medicine.findById(id).populate(
      "seller",
      "name locality avatar isVerified createdAt"
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    console.error("Get Medicine By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching medicine details",
      error: error.message,
    });
  }
};

// @desc    Get listings created by the logged-in user (donor) with handover code if accepted
// @route   GET /api/medicines/my-listings
// @access  Private
export const getMyListings = async (req, res) => {
  try {
    const medicines = await Medicine.find({ seller: req.user._id })
      .select("+handoverCode")
      .sort({ createdAt: -1 })
      .populate("seller", "name email phone address avatar isVerified")
      .populate("acceptedBy", "name organizationName organizationType locality phone email");

    return res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines,
    });
  } catch (error) {
    console.error("Get My Listings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching user listings",
      error: error.message,
    });
  }
};

// @desc    Get available approved donations for verified partners (sorted by proximity & expiry)
// @route   GET /api/medicines/partner/available
// @access  Private (Verified Partner or Admin)
export const getPartnerAvailableDonations = async (req, res) => {
  try {
    const { search, category, locality, sort = "nearby", status } = req.query;
    const partnerLocality = req.user.locality || "Katraj";

    const query = {
      acceptedBy: null,
    };

    if (status && status !== "All" && status !== "all") {
      query.status = status;
    } else {
      query.status = { $in: ["approved", "pending"] };
    }

    if (category && category !== "All Categories" && category !== "All") {
      query.category = category;
    }

    if (locality && locality !== "All Localities" && locality !== "All") {
      query.locality = new RegExp(locality.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    if (search && search.trim()) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(sanitizedSearch, "i");
      query.$or = [
        { medicineName: searchRegex },
        { brandName: searchRegex },
        { genericName: searchRegex },
        { company: searchRegex },
        { category: searchRegex },
        { locality: searchRegex },
      ];
    }

    const medicines = await Medicine.find(query)
      .populate("seller", "name phone email locality address isVerified avatar")
      .sort({ expiryDate: 1, createdAt: -1 });

    const enriched = medicines.map((med) => {
      const medObj = med.toObject ? med.toObject({ virtuals: true }) : med;
      const prox = getProximityInfo(
        partnerLocality,
        medObj.locationCoordinates || medObj.locality
      );
      return {
        ...medObj,
        proximity: prox,
      };
    });

    if (sort === "nearby") {
      enriched.sort((a, b) => {
        const distA = a.proximity?.distanceKm ?? 999;
        const distB = b.proximity?.distanceKm ?? 999;
        if (distA !== distB) return distA - distB;
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      });
    } else if (sort === "expiry-nearest") {
      enriched.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    }

    return res.status(200).json({
      success: true,
      count: enriched.length,
      partnerLocality,
      data: enriched,
    });
  } catch (error) {
    console.error("Get Partner Available Donations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching available partner donations",
      error: error.message,
    });
  }
};

// @desc    Accept a donation by a verified partner & generate 6-digit physical handover code
// @route   POST /api/medicines/:id/accept-donation
// @access  Private (Verified Partner or Admin)
export const acceptDonationByPartner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID format",
      });
    }

    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    if (!["approved", "pending"].includes(medicine.status) || medicine.acceptedBy) {
      return res.status(400).json({
        success: false,
        message: `This donation is no longer available for acceptance (Status: ${medicine.status})`,
      });
    }

    // Generate cryptographically secure random 6-digit numeric OTP handover code
    const generatedCode = crypto.randomInt(100000, 1000000).toString();

    medicine.status = "accepted";
    medicine.acceptedBy = req.user._id;
    medicine.acceptedAt = new Date();
    medicine.handoverCode = generatedCode;
    medicine.handoverFailedAttempts = 0;
    medicine.handoverLocked = false;

    await medicine.save();

    const populated = await Medicine.findById(medicine._id)
      .populate("seller", "name phone email locality address isVerified avatar")
      .populate("acceptedBy", "name organizationName organizationType locality phone email");

    return res.status(200).json({
      success: true,
      message: "Donation successfully accepted! The donor can now view their 6-digit physical handover code.",
      data: populated,
    });
  } catch (error) {
    console.error("Accept Donation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error accepting donation",
      error: error.message,
    });
  }
};

// @desc    Reject / release an accepted donation with a reason by verified partner
// @route   POST /api/medicines/:id/reject-donation
// @access  Private (Verified Partner or Admin)
export const rejectDonationByPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID format",
      });
    }

    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    if (medicine.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already completed handover",
      });
    }

    // Reset donation back to approved status so other partners can accept, or store rejection reason
    medicine.status = "approved";
    medicine.acceptedBy = null;
    medicine.acceptedAt = null;
    medicine.handoverCode = null;
    medicine.handoverFailedAttempts = 0;
    medicine.handoverLocked = false;
    if (reason) {
      medicine.rejectionReason = reason.trim();
    }

    await medicine.save();

    return res.status(200).json({
      success: true,
      message: "Donation released back to available pool.",
      data: medicine,
    });
  } catch (error) {
    console.error("Reject Donation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error rejecting donation",
      error: error.message,
    });
  }
};

// @desc    Verify 6-digit physical handover code and mark donation completed
// @route   POST /api/medicines/:id/verify-handover
// @access  Private (Verified Partner who accepted the donation, or Admin)
export const verifyDonationHandover = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID format",
      });
    }

    if (!code || !code.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter the 6-digit physical handover code provided by the donor",
      });
    }

    const medicine = await Medicine.findById(id).select("+handoverCode");
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    if (medicine.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Physical handover has already been verified and completed",
      });
    }

    if (medicine.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Donation cannot be verified in current status: "${medicine.status}"`,
      });
    }

    // Verify authorized partner
    const isAssignee = medicine.acceptedBy && medicine.acceptedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAssignee && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only the partner organization assigned to this donation can verify handover",
      });
    }

    // Check failed attempts lockout
    if (medicine.handoverLocked || medicine.handoverFailedAttempts >= 5) {
      return res.status(400).json({
        success: false,
        message: "Verification locked due to 5 consecutive failed attempts. Please contact platform administrator.",
      });
    }

    const inputCode = code.toString().trim();
    if (inputCode !== medicine.handoverCode) {
      medicine.handoverFailedAttempts = (medicine.handoverFailedAttempts || 0) + 1;
      if (medicine.handoverFailedAttempts >= 5) {
        medicine.handoverLocked = true;
      }
      await medicine.save();

      const remaining = 5 - medicine.handoverFailedAttempts;
      return res.status(400).json({
        success: false,
        message: `Invalid handover code. ${remaining > 0 ? `${remaining} attempt(s) remaining before lockout.` : "Verification is now locked due to security policy."}`,
        attemptsRemaining: Math.max(0, remaining),
      });
    }

    // Code matches! Complete handover
    medicine.status = "completed";
    medicine.completedAt = new Date();
    medicine.handoverFailedAttempts = 0;
    await medicine.save();

    const populated = await Medicine.findById(medicine._id)
      .populate("seller", "name phone email locality address isVerified avatar")
      .populate("acceptedBy", "name organizationName organizationType locality phone email");

    return res.status(200).json({
      success: true,
      message: "Physical handover successfully verified! Medicine marked as completed and catalog updated.",
      data: populated,
    });
  } catch (error) {
    console.error("Verify Handover Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error verifying handover code",
      error: error.message,
    });
  }
};

// @desc    Get donations accepted by the logged-in partner
// @route   GET /api/medicines/partner/my-accepted
// @access  Private (Verified Partner or Admin)
export const getPartnerAcceptedDonations = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { acceptedBy: req.user._id };

    if (status && ["accepted", "completed"].includes(status)) {
      query.status = status;
    }

    const medicines = await Medicine.find(query)
      .sort({ acceptedAt: -1, createdAt: -1 })
      .populate("seller", "name phone email locality address isVerified avatar")
      .populate("acceptedBy", "name organizationName organizationType locality phone email");

    return res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines,
    });
  } catch (error) {
    console.error("Get Partner Accepted Donations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching accepted partner donations",
      error: error.message,
    });
  }
};

// @desc    Calculate deterministic MEDISAVE community price proposal
// @route   POST /api/medicines/calculate-pricing
// @access  Public / Private
export const calculatePricingProposal = async (req, res) => {
  try {
    const { originalMrp, packageCondition, expiryDate } = req.body;
    const calc = calculateSuggestedPrice({
      originalMrp,
      packageCondition,
      expiryDate,
    });
    return res.status(200).json({
      success: true,
      data: calc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error calculating pricing proposal",
      error: error.message,
    });
  }
};

// @desc    Create / list a new medicine (100% Free Community Donation)
// @route   POST /api/medicines
// @access  Private
export const createMedicine = async (req, res) => {
  try {
    const {
      medicineName,
      brandName,
      genericName,
      company,
      category,
      strength,
      dosageForm,
      quantity,
      unit,
      originalMrp,
      expiryDate,
      batchNumber,
      packageCondition,
      storageCondition,
      isPrescriptionRequired,
      image,
      description,
      locality,
      pinCode,
      handoverPoint,
      handoverRadiusKm,
      targetBeneficiary,
    } = req.body;

    const finalName = medicineName || brandName;

    // 1. Required field validation
    if (!finalName || !company || !category || quantity === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields: name, company, category, quantity, and expiry date",
      });
    }

    // 2. Numeric validation
    const numQty = Number(quantity);
    const numMrp =
      originalMrp !== undefined && originalMrp !== "" && Number(originalMrp) > 0
        ? Number(originalMrp)
        : 50;

    if (isNaN(numQty) || numQty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid number of at least 1",
      });
    }

    // 3. Expiry date validation with 90-day minimum buffer
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);

    if (isNaN(expiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid expiry date",
      });
    }

    if (expiry <= today) {
      return res.status(400).json({
        success: false,
        message: "Medicine must not be expired. Only unexpired medicines can be donated. Please refer to the Safe Disposal Guide.",
      });
    }

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 90) {
      return res.status(400).json({
        success: false,
        message: `Medicine expires in ${diffDays} days. MEDISAVE requires at least 90 days remaining shelf life for community donation safety.`,
      });
    }

    // 4. Safety checks: Cold-chain, Schedule X, and Opened Packages
    const combinedSafetyText = `${finalName} ${brandName || ""} ${genericName || ""} ${company || ""} ${description || ""}`.toLowerCase();

    const isCold = Boolean(req.body.isColdChain) || COLD_CHAIN_KEYWORDS.some((kw) => combinedSafetyText.includes(kw));
    if (isCold) {
      return res.status(400).json({
        success: false,
        message: "Cold-chain medicines requiring specialized temperature maintenance cannot be accepted for community redistribution. Eligibility rules enforced for safety.",
      });
    }

    const isNarcotic = Boolean(req.body.isScheduleX) || SCHEDULE_X_KEYWORDS.some((kw) => combinedSafetyText.includes(kw));
    if (isNarcotic) {
      return res.status(400).json({
        success: false,
        message: "Schedule X narcotics and heavily controlled substances cannot be listed on MEDISAVE. Eligibility rules enforced for safety.",
      });
    }

    const cond = (packageCondition || "").toLowerCase();
    if (
      cond.includes("opened") ||
      cond.includes("cut strip") ||
      cond.includes("broken") ||
      cond.includes("unsealed") ||
      cond.includes("punctured")
    ) {
      return res.status(400).json({
        success: false,
        message: "Opened, cut, or unsealed packages are strictly ineligible for community redistribution. Please refer to the Safe Disposal Guide.",
      });
    }

    // 5. Locality Resolution
    const locData = findLocality(locality || "Katraj");
    const resolvedLocality = locData?.name || locality?.trim() || "Katraj";
    const resolvedPin = pinCode?.trim() || locData?.pinCode || "411046";
    const resolvedCoords = {
      lat: locData ? locData.lat : 18.4529,
      lng: locData ? locData.lng : 73.8652,
    };
    const resolvedHandoverPoint = handoverPoint?.trim() || locData?.defaultHandover || "Community Landmark / Main Gate";
    const resolvedRadius = Number(handoverRadiusKm) || 5;

    // 6. Create medicine with seller bound to authenticated user (Forced 100% Free Donation)
    const medicine = await Medicine.create({
      medicineName: finalName.trim(),
      brandName: (brandName || finalName).trim(),
      genericName: genericName ? genericName.trim() : "",
      company: company.trim(),
      category: category.trim(),
      strength: strength ? strength.trim() : "",
      dosageForm: dosageForm || "Tablet",
      quantity: numQty,
      unit: unit ? unit.trim() : "1 pack",
      price: 0,
      originalMrp: numMrp,
      expiryDate: expiry,
      batchNumber: batchNumber ? batchNumber.trim() : "",
      packageCondition: packageCondition ? packageCondition.trim() : "Intact Sealed Blister Pack",
      storageCondition: storageCondition ? storageCondition.trim() : "Stored in cool, dry place (<25°C)",
      isPrescriptionRequired: Boolean(isPrescriptionRequired),
      image: image || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
      description: description ? description.trim() : "",
      seller: req.user._id,
      status: "pending",
      locality: resolvedLocality,
      pinCode: resolvedPin,
      handoverPoint: resolvedHandoverPoint,
      handoverRadiusKm: resolvedRadius,
      locationCoordinates: resolvedCoords,
      pricingRationale: "100% Free Verified Community Medicine Donation",
      suggestedCommunityPrice: 0,
      listingType: "free_donation",
      targetBeneficiary: targetBeneficiary || "General Community",
    });

    const populatedMedicine = await Medicine.findById(medicine._id).populate(
      "seller",
      "name locality avatar isVerified createdAt"
    );

    return res.status(201).json({
      success: true,
      message: "Medicine listed successfully and sent for community moderation",
      data: populatedMedicine,
    });
  } catch (error) {
    console.error("Create Medicine Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating medicine listing",
      error: error.message,
    });
  }
};

// @desc    Update an existing medicine listing (Donors cannot bypass moderation or set price)
// @route   PUT /api/medicines/:id
// @access  Private (Owner or Admin)
export const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    // Ownership check: seller must match req.user._id (or admin)
    const isOwner = medicine.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only modify your own listings",
      });
    }

    // Validate expiry date if updated
    let targetExpiry = medicine.expiryDate;
    if (req.body.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(req.body.expiryDate);

      if (isNaN(expiry.getTime()) || expiry <= today) {
        return res.status(400).json({
          success: false,
          message: "Updated expiry date must be a valid future date",
        });
      }

      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 90) {
        return res.status(400).json({
          success: false,
          message: `Updated medicine expires in ${diffDays} days. MEDISAVE requires at least 90 days remaining shelf life.`,
        });
      }
      targetExpiry = expiry;
    }

    // Safety checks on updated contents
    const combinedSafetyText = `${req.body.medicineName || medicine.medicineName || ""} ${req.body.brandName || medicine.brandName || ""} ${req.body.genericName || medicine.genericName || ""} ${req.body.description || medicine.description || ""}`.toLowerCase();

    if (req.body.isColdChain || COLD_CHAIN_KEYWORDS.some((kw) => combinedSafetyText.includes(kw))) {
      return res.status(400).json({
        success: false,
        message: "Cold-chain medicines requiring specialized temperature maintenance cannot be accepted for community redistribution.",
      });
    }

    if (req.body.isScheduleX || SCHEDULE_X_KEYWORDS.some((kw) => combinedSafetyText.includes(kw))) {
      return res.status(400).json({
        success: false,
        message: "Schedule X narcotics and heavily controlled substances cannot be listed on MEDISAVE.",
      });
    }

    if (req.body.packageCondition) {
      const cond = req.body.packageCondition.toLowerCase();
      if (
        cond.includes("opened") ||
        cond.includes("cut strip") ||
        cond.includes("broken") ||
        cond.includes("unsealed") ||
        cond.includes("punctured")
      ) {
        return res.status(400).json({
          success: false,
          message: "Opened, cut, or unsealed packages are strictly ineligible for community redistribution.",
        });
      }
    }

    // Safe allowed fields for donors (disallow status, price, handoverCode, acceptedBy bypass)
    const allowedDonorFields = [
      "medicineName",
      "brandName",
      "genericName",
      "company",
      "category",
      "strength",
      "dosageForm",
      "quantity",
      "unit",
      "originalMrp",
      "batchNumber",
      "packageCondition",
      "storageCondition",
      "isPrescriptionRequired",
      "image",
      "description",
      "locality",
      "pinCode",
      "handoverPoint",
      "handoverRadiusKm",
      "targetBeneficiary",
    ];

    allowedDonorFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        medicine[field] = req.body[field];
      }
    });

    if (req.body.expiryDate) {
      medicine.expiryDate = targetExpiry;
    }

    // Enforce 100% free donation platform rules
    medicine.price = 0;
    medicine.listingType = "free_donation";
    medicine.suggestedCommunityPrice = 0;
    medicine.pricingRationale = "100% Free Verified Community Medicine Donation";

    // If donor edits listing details, reset status to pending for coordinator re-moderation
    if (!isAdmin) {
      medicine.status = "pending";
      medicine.acceptedBy = null;
      medicine.acceptedAt = null;
      medicine.handoverCode = null;
    } else if (req.body.status && ["pending", "approved", "rejected", "accepted", "completed"].includes(req.body.status)) {
      medicine.status = req.body.status;
    }

    // If locality was updated, update coordinates
    if (req.body.locality) {
      const locData = findLocality(req.body.locality);
      if (locData) {
        medicine.locationCoordinates = { lat: locData.lat, lng: locData.lng };
        if (!req.body.pinCode) {
          medicine.pinCode = locData.pinCode;
        }
      }
    }

    const updatedMedicine = await medicine.save();
    const populated = await Medicine.findById(updatedMedicine._id).populate(
      "seller",
      "name locality avatar isVerified createdAt"
    );

    return res.status(200).json({
      success: true,
      message: isAdmin ? "Medicine updated successfully" : "Medicine updated and resubmitted for community moderation",
      data: populated,
    });
  } catch (error) {
    console.error("Update Medicine Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating medicine listing",
      error: error.message,
    });
  }
};

// @desc    Delete a medicine listing
// @route   DELETE /api/medicines/:id
// @access  Private (Owner or Admin)
export const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    // Ownership check
    const isOwner = medicine.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only delete your own listings",
      });
    }

    await Medicine.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Medicine listing removed successfully",
    });
  } catch (error) {
    console.error("Delete Medicine Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting medicine listing",
      error: error.message,
    });
  }
};

// @desc    Analyze medicine title with OpenRouter AI for auto-fill & market price suggestion
// @route   POST /api/medicines/ai-suggest
// @access  Public / Private
export const getAiMedicineSuggestion = async (req, res) => {
  try {
    const { title, medicineName, brandName, quantity, dosageForm, category } = req.body;
    const queryTitle = title || medicineName || brandName;

    if (!queryTitle || !queryTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a medicine title or name (e.g. 'Dolomide' or 'Dolo 650')",
      });
    }

    const estimation = await getAiMedicineEstimation({
      title: queryTitle.trim(),
      quantity: quantity ? Number(quantity) : undefined,
      contextData: { dosageForm, category },
    });

    return res.status(200).json({
      success: true,
      message: "AI medicine analysis generated successfully",
      source: estimation.source,
      model: estimation.model,
      data: estimation.data,
    });
  } catch (error) {
    console.error("AI Medicine Suggestion Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate AI medicine estimation",
      error: error.message,
    });
  }
};