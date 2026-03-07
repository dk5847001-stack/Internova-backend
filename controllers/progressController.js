const Progress = require("../models/Progress");
const Purchase = require("../models/Purchase");
const Internship = require("../models/Internship");

exports.getCourseProgress = async (req, res) => {
    try {
        const { internshipId } = req.params;

        const paidPurchase = await Purchase.findOne({
            userId: req.user.id,
            internshipId,
            paymentStatus: "paid",
        });

        if (!paidPurchase) {
            return res.status(403).json({
                success: false,
                message: "You have not purchased this internship",
            });
        }

        const internship = await Internship.findById(internshipId);

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: "Internship not found",
            });
        }

        let progress = await Progress.findOne({
            userId: req.user.id,
            internshipId,
        });

        if (!progress) {
            progress = await Progress.create({
                userId: req.user.id,
                internshipId,
                completedModules: [],
                progressPercent: 0,
                certificateEligible: false,
                testPassed: false,
                finalEligible: false,
            });
        }

        return res.status(200).json({
            success: true,
            internship,
            progress,
        });
    } catch (error) {
        console.error("GET COURSE PROGRESS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch course progress",
        });
    }
};

exports.toggleModuleCompletion = async (req, res) => {
    try {
        const { internshipId } = req.params;
        const { moduleIndex } = req.body;

        const paidPurchase = await Purchase.findOne({
            userId: req.user.id,
            internshipId,
            paymentStatus: "paid",
        });

        if (!paidPurchase) {
            return res.status(403).json({
                success: false,
                message: "You have not purchased this internship",
            });
        }

        const internship = await Internship.findById(internshipId);

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: "Internship not found",
            });
        }

        if (
            moduleIndex === undefined ||
            moduleIndex < 0 ||
            moduleIndex >= internship.modules.length
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid module index",
            });
        }

        let progress = await Progress.findOne({
            userId: req.user.id,
            internshipId,
        });

        if (!progress) {
            progress = await Progress.create({
                userId: req.user.id,
                internshipId,
                completedModules: [],
                progressPercent: 0,
                certificateEligible: false,
                testPassed: false,
                finalEligible: false,
            });
        }

        const alreadyCompleted = progress.completedModules.includes(moduleIndex);

        if (alreadyCompleted) {
            progress.completedModules = progress.completedModules.filter(
                (item) => item !== moduleIndex
            );
        } else {
            progress.completedModules.push(moduleIndex);
        }

        const totalModules = internship.modules.length || 1;
        const progressPercent = Math.round(
            (progress.completedModules.length / totalModules) * 100
        );

        progress.progressPercent = progressPercent;
        progress.certificateEligible = progressPercent >= 80;
        progress.finalEligible = progress.certificateEligible && progress.testPassed;

        await progress.save();

        return res.status(200).json({
            success: true,
            message: alreadyCompleted
                ? "Module marked incomplete"
                : "Module marked complete",
            progress,
        });
    } catch (error) {
        console.error("TOGGLE MODULE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update module progress",
        });
    }
};