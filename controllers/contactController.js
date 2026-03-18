const ContactMessage = require("../models/ContactMessage");
const User = require("../models/User");

const normalizeText = (value = "") => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeEmail = (email = "") => {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

const pushNotificationToUser = async ({
  userId,
  title,
  message,
  type = "general",
  contactMessageId = null,
}) => {
  try {
    if (!userId) return;

    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          title: title || "Notification",
          message: message || "",
          type,
          read: false,
          createdAt: new Date(),
          metadata: {
            contactMessageId,
          },
        },
      },
    });
  } catch (error) {
    console.error("PUSH USER NOTIFICATION ERROR:", error);
  }
};

const resolveUserIdForMessage = async ({ explicitUserId, email }) => {
  if (explicitUserId) return explicitUserId;

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");
  return existingUser?._id || null;
};

/* =========================
   CREATE CONTACT MESSAGE
========================= */
exports.createContactMessage = async (req, res) => {
  try {
    const name = normalizeText(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const subject = normalizeText(req.body?.subject);
    const message = normalizeText(req.body?.message);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const resolvedUserId = await resolveUserIdForMessage({
      explicitUserId: req.user?._id || req.user?.id || null,
      email,
    });

    const item = await ContactMessage.create({
      userId: resolvedUserId,
      name,
      email,
      subject,
      message,
      status: "new",
    });

    if (item.userId) {
      await pushNotificationToUser({
        userId: item.userId,
        title: "Message received",
        message: "Your support message has been submitted successfully.",
        type: "system",
        contactMessageId: item._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message submitted successfully",
      item,
    });
  } catch (error) {
    console.error("CREATE CONTACT MESSAGE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit contact message",
    });
  }
};

/* =========================
   GET MY CONTACT MESSAGES
========================= */
exports.getMyContactMessages = async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email || "");

    const items = await ContactMessage.find({
      $or: [
        { userId: req.user._id || req.user.id },
        { email: userEmail },
      ],
    })
      .populate("adminReply.repliedBy", "name email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("GET MY CONTACT MESSAGES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your messages",
    });
  }
};

/* =========================
   USER REPLY TO CONTACT THREAD
========================= */
exports.replyToContactMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const replyMessage = normalizeText(req.body?.message);
    const userEmail = normalizeEmail(req.user?.email || "");

    if (!replyMessage) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const item = await ContactMessage.findOne({
      _id: messageId,
      $or: [
        { userId: req.user._id || req.user.id },
        { email: userEmail },
      ],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Message thread not found",
      });
    }

    if (!item.userId) {
      item.userId = req.user._id || req.user.id;
    }

    item.message = `${item.message}\n\n[USER REPLY - ${new Date().toISOString()}]\n${replyMessage}`;
    item.status = "user_replied";

    await item.save();

    await pushNotificationToUser({
      userId: item.userId,
      title: "Reply sent",
      message: "Your reply has been sent successfully.",
      type: "system",
      contactMessageId: item._id,
    });

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully",
      item,
    });
  } catch (error) {
    console.error("USER REPLY TO CONTACT MESSAGE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
};