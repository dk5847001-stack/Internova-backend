const User = require("../models/User");

exports.getMyNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("notifications");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const items = [...(user.notifications || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      unreadCount: items.filter((item) => !item.isRead).length,
      items,
    });
  } catch (error) {
    console.error("GET MY NOTIFICATIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const user = await User.findOneAndUpdate(
      { _id: req.user._id, "notifications._id": notificationId },
      {
        $set: {
          "notifications.$.isRead": true,
        },
      },
      { new: true }
    ).select("notifications");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("MARK NOTIFICATION READ ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("notifications");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.notifications = (user.notifications || []).map((item) => ({
      ...item.toObject(),
      isRead: true,
    }));

    await user.save();

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("MARK ALL NOTIFICATIONS READ ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
};