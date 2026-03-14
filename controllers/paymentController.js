const Razorpay = require("razorpay");
const crypto = require("crypto");
const Purchase = require("../models/Purchase");
const Internship = require("../models/Internship");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { internshipId, durationLabel } = req.body;
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

    let selectedDuration = null;

    // Case 1: old durations array exists
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
      // Case 2: new simplified internship model
      selectedDuration = {
        label: durationLabel || internship.duration || `${internship.durationDays || 30} Days`,
        price: internship.price || 1,
        durationDays: internship.durationDays || 30,
      };
    }

    const existingPaidPurchase = await Purchase.findOne({
      userId,
      internshipId,
      durationLabel: selectedDuration.label,
      paymentStatus: "paid",
    });

    if (existingPaidPurchase) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this internship plan",
      });
    }

    const amountInPaise = Number(selectedDuration.price || 0) * 100;

    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid internship price",
      });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        internshipId: internship._id.toString(),
        durationLabel: selectedDuration.label,
        userId: userId.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    await Purchase.create({
      userId,
      internshipId: internship._id,
      durationLabel: selectedDuration.label,
      amount: selectedDuration.price,
      razorpayOrderId: order.id,
      paymentStatus: "created",
    });

    return res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order,
      internship: {
        title: internship.title,
      },
      duration: selectedDuration,
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

    purchase.razorpayPaymentId = razorpay_payment_id;
    purchase.razorpaySignature = razorpay_signature;
    purchase.paymentStatus = "paid";
    await purchase.save();

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