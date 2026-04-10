const mongoose = require("mongoose");
const Internship = require("../models/Internship");
const InternshipContent = require("../models/InternshipContent");

const EMPTY_CONTENT = Object.freeze({
  modules: [],
  quiz: [],
});

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const normalizeInternshipContent = (content = {}) => ({
  modules: Array.isArray(content?.modules) ? content.modules : [],
  quiz: Array.isArray(content?.quiz) ? content.quiz : [],
});

const mergeInternshipWithContent = (internship, content) => {
  if (!internship) return null;

  const safeContent = normalizeInternshipContent(content);

  return {
    ...internship,
    modules: safeContent.modules,
    quiz: safeContent.quiz,
  };
};

const calculateContentCounts = (content = {}) => {
  const safeContent = normalizeInternshipContent(content);
  const modulesCount = safeContent.modules.length;
  const videosCount = safeContent.modules.reduce(
    (sum, module) => sum + (Array.isArray(module?.videos) ? module.videos.length : 0),
    0
  );
  const quizCount = safeContent.quiz.length;

  return {
    modulesCount,
    videosCount,
    quizCount,
  };
};

const getLegacyEmbeddedContentMap = async (internshipIds = []) => {
  const objectIds = internshipIds
    .map((id) => toIdString(id))
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) {
    return new Map();
  }

  const docs = await Internship.collection
    .find(
      { _id: { $in: objectIds } },
      { projection: { modules: 1, quiz: 1 } }
    )
    .toArray();

  return new Map(
    docs.map((doc) => [String(doc._id), normalizeInternshipContent(doc)])
  );
};

const getInternshipContentByInternshipId = async (
  internshipId,
  selectFields = "modules quiz"
) => {
  const content = await InternshipContent.findOne({ internshipId })
    .select(selectFields)
    .lean();

  if (content) {
    return normalizeInternshipContent(content);
  }

  const legacyMap = await getLegacyEmbeddedContentMap([internshipId]);
  return legacyMap.get(toIdString(internshipId)) || EMPTY_CONTENT;
};

const getInternshipContentMap = async (
  internshipIds = [],
  selectFields = "internshipId modules quiz"
) => {
  const ids = [...new Set(internshipIds.map((id) => toIdString(id)).filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const contentDocs = await InternshipContent.find({
    internshipId: { $in: ids },
  })
    .select(selectFields)
    .lean();

  const contentMap = new Map(
    contentDocs.map((doc) => [
      toIdString(doc.internshipId),
      normalizeInternshipContent(doc),
    ])
  );

  const missingIds = ids.filter((id) => !contentMap.has(id));
  if (!missingIds.length) {
    return contentMap;
  }

  const legacyMap = await getLegacyEmbeddedContentMap(missingIds);
  legacyMap.forEach((content, internshipId) => {
    contentMap.set(internshipId, content);
  });

  return contentMap;
};

const buildContentSummaryPipeline = (match = {}) => {
  const pipeline = [];

  if (Object.keys(match).length) {
    pipeline.push({ $match: match });
  }

  pipeline.push({
    $project: {
      internshipId: 1,
      modulesCount: {
        $size: {
          $ifNull: ["$modules", []],
        },
      },
      videosCount: {
        $reduce: {
          input: {
            $ifNull: ["$modules", []],
          },
          initialValue: 0,
          in: {
            $add: [
              "$$value",
              {
                $size: {
                  $ifNull: ["$$this.videos", []],
                },
              },
            ],
          },
        },
      },
      quizCount: {
        $size: {
          $ifNull: ["$quiz", []],
        },
      },
    },
  });

  return pipeline;
};

const getInternshipContentSummaryMap = async (internshipIds = []) => {
  const ids = [...new Set(internshipIds.map((id) => toIdString(id)).filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const summaries = await InternshipContent.aggregate(
    buildContentSummaryPipeline({
      internshipId: {
        $in: ids
          .filter((id) => mongoose.isValidObjectId(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
  );

  const summaryMap = new Map(
    summaries.map((item) => [toIdString(item.internshipId), item])
  );

  const missingIds = ids.filter((id) => !summaryMap.has(id));
  if (!missingIds.length) {
    return summaryMap;
  }

  const legacyMap = await getLegacyEmbeddedContentMap(missingIds);
  legacyMap.forEach((content, internshipId) => {
    summaryMap.set(internshipId, {
      internshipId,
      ...calculateContentCounts(content),
    });
  });

  return summaryMap;
};

module.exports = {
  EMPTY_CONTENT,
  buildContentSummaryPipeline,
  calculateContentCounts,
  getInternshipContentByInternshipId,
  getInternshipContentMap,
  getInternshipContentSummaryMap,
  mergeInternshipWithContent,
  normalizeInternshipContent,
  toIdString,
};
