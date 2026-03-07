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

    if (!internshipId || !durationLabel) {
      return res.status(400).json({
        success: false,
        message: "Internship ID and duration are required",
      });
    }

    const internship = await Internship.findById(internshipId);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const selectedDuration = internship.durations.find(
      (item) => item.label === durationLabel
    );

    if (!selectedDuration) {
      return res.status(400).json({
        success: false,
        message: "Selected duration not found",
      });
    }

    const options = {
      amount: selectedDuration.price * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        internshipId: internship._id.toString(),
        durationLabel: selectedDuration.label,
        userId: req.user.id,
      },
    };

    const order = await razorpay.orders.create(options);

    await Purchase.create({
      userId: req.user.id,
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