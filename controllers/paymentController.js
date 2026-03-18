const Razorpay = require("razorpay");
const crypto = require("crypto");
const Purchase = require("../models/Purchase");
const Internship = require("../models/Internship");
const Progress = require("../models/Progress");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
      const basePaidPurchase = await Purchase.findOne({
        userId,
        internshipId,
        purchaseType: "internship",
        paymentStatus: "paid",
      }).sort({ createdAt: -1 });

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
        paymentStatus: "paid",
      });

      if (existingPaidUnlockAll) {
        return res.status(400).json({
          success: false,
          message: "Unlock-all access is already active for this internship",
        });
      }

      const unlockAllPrice = toNumber(internship.unlockAllPrice, 99);

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
          basePaidPurchase.durationLabel ||
          internship.duration ||
          `${internship.durationDays || 30} Days`,
        selectedDurationDays:
          basePaidPurchase.selectedDurationDays || internship.durationDays || 30,
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
        label:
          durationLabel ||
          internship.duration ||
          `${internship.durationDays || 30} Days`,
        price: internship.price || 0,
        durationDays: internship.durationDays || 30,
      };
    }

    const finalPrice = toNumber(selectedDuration.price, 0);

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
      purchaseType: "internship",
      paymentStatus: "paid",
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
        durationDays: String(selectedDuration.durationDays || 30),
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
      selectedDurationDays: selectedDuration.durationDays || 30,
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
        title: internship.title,
      },
      duration: {
        label: selectedDuration.label,
        price: finalPrice,
        durationDays: selectedDuration.durationDays || 30,
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

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
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
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase record not found",
      });
    }

    if (purchase.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        purchase,
      });
    }

    purchase.razorpayPaymentId = razorpay_payment_id;
    purchase.razorpaySignature = razorpay_signature;
    purchase.paymentStatus = "paid";
    await purchase.save();

    // unlock-all verified hone par access activate karo
    if (purchase.purchaseType === "unlock_all") {
      const progress = await Progress.findOne({
        userId: purchase.userId,
        internshipId: purchase.internshipId,
      });

      if (progress && !progress.unlockAllPurchased) {
        progress.unlockAllPurchased = true;
        await progress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      purchase,
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};