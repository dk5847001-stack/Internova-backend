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

    return res.status(200).json({
      success: true,
      title: internship.title,
      quiz: safeQuiz,
      alreadySubmitted: !!existingResult,
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

    const existingResult = await TestResult.findOne({
      userId: req.user.id,
      internshipId,
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "Quiz already submitted for this internship",
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

    let score = 0;

    quiz.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score += 1;
      }
    });

    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 60;

    const result = await TestResult.create({
      userId: req.user.id,
      internshipId,
      answers,
      score,
      totalQuestions,
      percentage,
      passed,
    });

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
      message: passed ? "Quiz passed successfully" : "Quiz submitted, but you did not pass",
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