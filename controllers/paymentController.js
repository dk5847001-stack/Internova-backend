const Razorpay = require("razorpay");
const crypto = require("crypto");
const Purchase = require("../models/Purchase");
const Internship = require("../models/Internship");
const Progress = require("../models/Progress");
const User = require("../models/User");
const generatePaymentSlipPdf = require("../utils/generatePaymentSlipPdf");
const { isValidObjectId } = require("../utils/validation");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const PAID_STATUSES = ["paid", "captured"];

const ensurePaymentConfig = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const internshipPurchaseQuery = (userId, internshipId) => ({
  userId,
  internshipId,
  paymentStatus: { $in: PAID_STATUSES },
  $or: [{ purchaseType: "internship" }, { purchaseType: { $exists: false } }],
});

const getInternshipDurationLabel = (internship) => {
  return (
    internship?.duration ||
    `${toNumber(internship?.durationDays, 30)} Days`
  );
};

const getInternshipDurationDays = (internship) => {
  return Math.max(1, toNumber(internship?.durationDays, 30));
};

const buildPurchaseResponse = (purchaseDoc) => {
  const purchase = purchaseDoc?.toObject ? purchaseDoc.toObject() : purchaseDoc;
  const internship = purchase?.internshipId || null;

  return {
    _id: purchase?._id || null,
    userId: purchase?.userId || null,
    internshipId:
      internship && typeof internship === "object" ? internship._id : purchase?.internshipId || null,
    internshipTitle:
      internship && typeof internship === "object" ? internship.title || "" : "",
    purchaseType: purchase?.purchaseType || "internship",
    parentPurchaseId: purchase?.parentPurchaseId || null,
    durationLabel: purchase?.durationLabel || "",
    selectedDurationDays: Math.max(1, toNumber(purchase?.selectedDurationDays, 30)),
    amount: toNumber(purchase?.amount, 0),
    paymentStatus: purchase?.paymentStatus || "created",
    razorpayOrderId: purchase?.razorpayOrderId || "",
    razorpayPaymentId: purchase?.razorpayPaymentId || "",
    createdAt: purchase?.createdAt || null,
    updatedAt: purchase?.updatedAt || null,
  };
};

exports.createOrder = async (req, res) => {
  try {
    const { internshipId, durationLabel, purchaseType = "internship" } = req.body;
    const userId = req.user.id || req.user._id;

    if (!internshipId) {
      return res.status(400).json({
        success: false,
        message: "Internship ID is required",
      });
    }

    if (!isValidObjectId(internshipId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship ID",
      });
    }

    if (!ensurePaymentConfig()) {
      return res.status(503).json({
        success: false,
        message: "Payment service is temporarily unavailable",
      });
    }

    const internship = await Internship.findById(internshipId);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const safePurchaseType =
      purchaseType === "unlock_all" ? "unlock_all" : "internship";

    // =========================
    // UNLOCK ALL ADDON PAYMENT
    // =========================
    if (safePurchaseType === "unlock_all") {
      const basePaidPurchase = await Purchase.findOne(
        internshipPurchaseQuery(userId, internshipId)
      ).sort({ createdAt: -1 });

      if (!basePaidPurchase) {
        return res.status(403).json({
          success: false,
          message: "Please purchase this internship first",
        });
      }

      const existingPaidUnlockAll = await Purchase.findOne({
        userId,
        internshipId,
        purchaseType: "unlock_all",
        paymentStatus: { $in: PAID_STATUSES },
      });

      if (existingPaidUnlockAll) {
        return res.status(400).json({
          success: false,
          message: "Unlock-all access is already active for this internship",
        });
      }

      const unlockAllPrice = Math.max(1, toNumber(internship.unlockAllPrice, 99));

      if (unlockAllPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid unlock-all price",
        });
      }

      const options = {
        amount: Math.round(unlockAllPrice * 100),
        currency: "INR",
        receipt: `unlock_all_${Date.now()}`,
        notes: {
          internshipId: internship._id.toString(),
          userId: String(userId),
          purchaseType: "unlock_all",
          parentPurchaseId: String(basePaidPurchase._id),
        },
      };

      const order = await razorpay.orders.create(options);

      await Purchase.create({
        userId,
        internshipId: internship._id,
        purchaseType: "unlock_all",
        parentPurchaseId: basePaidPurchase._id,
        durationLabel:
          basePaidPurchase.durationLabel || getInternshipDurationLabel(internship),
        selectedDurationDays:
          Math.max(
            1,
            toNumber(
              basePaidPurchase.selectedDurationDays,
              getInternshipDurationDays(internship)
            )
          ),
        amount: unlockAllPrice,
        razorpayOrderId: order.id,
        paymentStatus: "created",
      });

      return res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID,
        order,
        purchaseType: "unlock_all",
        internship: {
          _id: internship._id,
          title: internship.title,
        },
        unlockAll: {
          price: unlockAllPrice,
        },
      });
    }

    // =========================
    // MAIN INTERNSHIP PAYMENT
    // =========================
    let selectedDuration = null;

    if (Array.isArray(internship.durations) && internship.durations.length > 0) {
      if (!durationLabel) {
        return res.status(400).json({
          success: false,
          message: "Duration is required",
        });
      }

      selectedDuration = internship.durations.find(
        (item) => item.label === durationLabel
      );

      if (!selectedDuration) {
        return res.status(400).json({
          success: false,
          message: "Selected duration not found",
        });
      }
    } else {
      selectedDuration = {
        label: durationLabel || getInternshipDurationLabel(internship),
        price: internship.price || 0,
        durationDays: getInternshipDurationDays(internship),
      };
    }

    const finalPrice = toNumber(selectedDuration.price, 0);
    const finalDurationDays = Math.max(
      1,
      toNumber(selectedDuration.durationDays, getInternshipDurationDays(internship))
    );

    if (finalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship price",
      });
    }

    const existingPaidPurchase = await Purchase.findOne({
      userId,
      internshipId,
      durationLabel: selectedDuration.label,
      paymentStatus: { $in: PAID_STATUSES },
      $or: [{ purchaseType: "internship" }, { purchaseType: { $exists: false } }],
    });

    if (existingPaidPurchase) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this internship plan",
      });
    }

    const options = {
      amount: Math.round(finalPrice * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        internshipId: internship._id.toString(),
        durationLabel: selectedDuration.label,
        durationDays: String(finalDurationDays),
        userId: String(userId),
        purchaseType: "internship",
      },
    };

    const order = await razorpay.orders.create(options);

    await Purchase.create({
      userId,
      internshipId: internship._id,
      purchaseType: "internship",
      durationLabel: selectedDuration.label,
      selectedDurationDays: finalDurationDays,
      amount: finalPrice,
      razorpayOrderId: order.id,
      paymentStatus: "created",
    });

    return res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order,
      purchaseType: "internship",
      internship: {
        _id: internship._id,
        title: internship.title,
      },
      duration: {
        label: selectedDuration.label,
        price: finalPrice,
        durationDays: finalDurationDays,
      },
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;
    const userId = req.user.id || req.user._id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    if (!ensurePaymentConfig()) {
      return res.status(503).json({
        success: false,
        message: "Payment service is temporarily unavailable",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

      const purchase = await Purchase.findOne({
        razorpayOrderId: razorpay_order_id,
        userId,
      }).populate("internshipId", "_id title");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase record not found",
      });
    }

      if (PAID_STATUSES.includes(String(purchase.paymentStatus).toLowerCase())) {
        const formattedPurchase = buildPurchaseResponse(purchase);

      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        purchase: formattedPurchase,
        slipDownloadUrl: `/api/payments/slip/${purchase._id}`,
        redirectTo: formattedPurchase.internshipId
          ? `/dashboard/course/${formattedPurchase.internshipId}`
          : "/dashboard",
      });
    }

      const duplicatePayment = await Purchase.findOne({
        razorpayPaymentId: razorpay_payment_id,
        _id: { $ne: purchase._id },
      }).select("_id");

      if (duplicatePayment) {
        return res.status(409).json({
          success: false,
          message: "This payment has already been linked to another purchase",
        });
      }

      purchase.razorpayPaymentId = razorpay_payment_id;
      purchase.razorpaySignature = razorpay_signature;
      purchase.paymentStatus = "paid";
    await purchase.save();

    if (purchase.purchaseType === "unlock_all") {
      const progress = await Progress.findOne({
        userId: purchase.userId,
        internshipId: purchase.internshipId?._id || purchase.internshipId,
      });

      if (progress && !progress.unlockAllPurchased) {
        progress.unlockAllPurchased = true;
        await progress.save();
      }
    }

    const formattedPurchase = buildPurchaseResponse(purchase);

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      purchase: formattedPurchase,
      slipDownloadUrl: `/api/payments/slip/${purchase._id}`,
      redirectTo: formattedPurchase.internshipId
        ? `/dashboard/course/${formattedPurchase.internshipId}`
        : "/dashboard",
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

exports.downloadPaymentSlip = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const userId = req.user.id || req.user._id;

    if (!isValidObjectId(purchaseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const purchase = await Purchase.findOne({
      _id: purchaseId,
      userId,
      paymentStatus: { $in: PAID_STATUSES },
    }).populate("internshipId");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Paid purchase not found",
      });
    }

    const user = await User.findById(userId);
    const internship = purchase.internshipId || null;

    return generatePaymentSlipPdf({
      res,
      purchase,
      user,
      internship,
    });
  } catch (error) {
    console.error("DOWNLOAD PAYMENT SLIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate payment slip",
    });
  }
};
