const Internship = require("../models/Internship");
const Purchase = require("../models/Purchase");
const TestResult = require("../models/TestResult");
const Progress = require("../models/Progress");

exports.getQuiz = async (req, res) => {
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

    const internship = await Internship.findById(internshipId).select("title quiz");

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    const safeQuiz = (internship.quiz || []).map((q, index) => ({
      index,
      question: q.question,
      options: q.options,
    }));

    const existingResult = await TestResult.findOne({
      userId: req.user.id,
      internshipId,
    });

    const locked = existingResult?.passed === true;

    return res.status(200).json({
      success: true,
      title: internship.title,
      quiz: safeQuiz,
      locked,
      result: existingResult || null,
    });
  } catch (error) {
    console.error("GET QUIZ ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quiz",
    });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const { answers } = req.body;

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

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers must be an array",
      });
    }

    const quiz = internship.quiz || [];
    const totalQuestions = quiz.length;

    if (totalQuestions === 0) {
      return res.status(400).json({
        success: false,
        message: "No quiz available for this internship",
      });
    }

    const existingResult = await TestResult.findOne({
      userId: req.user.id,
      internshipId,
    });

    if (existingResult?.passed) {
      return res.status(400).json({
        success: false,
        message: "You have already passed this quiz",
      });
    }

    let score = 0;

    quiz.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score += 1;
      }
    });

    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 60;

    let result;

    if (existingResult) {
      existingResult.answers = answers;
      existingResult.score = score;
      existingResult.totalQuestions = totalQuestions;
      existingResult.percentage = percentage;
      existingResult.passed = passed;
      result = await existingResult.save();
    } else {
      result = await TestResult.create({
        userId: req.user.id,
        internshipId,
        answers,
        score,
        totalQuestions,
        percentage,
        passed,
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
        testPassed: passed,
        finalEligible: false,
      });
    } else {
      progress.testPassed = passed;
      progress.finalEligible = progress.certificateEligible && passed;
      await progress.save();
    }

    return res.status(200).json({
      success: true,
      message: passed
        ? "Quiz passed successfully"
        : "Quiz submitted. You can retry until you pass.",
      result,
      progress,
    });
  } catch (error) {
    console.error("SUBMIT QUIZ ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit quiz",
    });
  }
};