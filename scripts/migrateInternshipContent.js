require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Internship = require("../models/Internship");
const InternshipContent = require("../models/InternshipContent");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const keepEmbedded = args.includes("--keep-embedded");

const getSafeArray = (value) => (Array.isArray(value) ? value : []);

const runMigration = async () => {
  console.log("[migration] starting internship content migration");
  console.log(
    `[migration] mode=${isDryRun ? "dry-run" : "write"} keepEmbedded=${keepEmbedded}`
  );

  await connectDB();

  const cursor = Internship.collection.find(
    {},
    {
      projection: {
        _id: 1,
        modules: 1,
        quiz: 1,
      },
    }
  );

  let scanned = 0;
  let contentUpserts = 0;
  let embeddedCleanups = 0;
  let skipped = 0;

  while (await cursor.hasNext()) {
    const internship = await cursor.next();
    scanned += 1;

    const modules = getSafeArray(internship?.modules);
    const quiz = getSafeArray(internship?.quiz);
    const hasEmbeddedContent = modules.length > 0 || quiz.length > 0;

    if (!hasEmbeddedContent) {
      skipped += 1;
      continue;
    }

    if (isDryRun) {
      contentUpserts += 1;
      if (!keepEmbedded) {
        embeddedCleanups += 1;
      }
      continue;
    }

    // Upsert first so repeated runs stay safe and the new collection becomes the source of truth.
    await InternshipContent.updateOne(
      { internshipId: internship._id },
      {
        $set: {
          internshipId: internship._id,
          modules,
          quiz,
        },
      },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    contentUpserts += 1;

    if (!keepEmbedded) {
      // Use the raw collection so cleanup still works after the schema no longer defines these fields.
      await Internship.collection.updateOne(
        { _id: internship._id },
        {
          $unset: {
            modules: "",
            quiz: "",
          },
        }
      );

      embeddedCleanups += 1;
    }
  }

  console.log("[migration] completed");
  console.log(`[migration] scanned=${scanned}`);
  console.log(`[migration] contentUpserts=${contentUpserts}`);
  console.log(`[migration] embeddedCleanups=${embeddedCleanups}`);
  console.log(`[migration] skipped=${skipped}`);

  await mongoose.connection.close();
};

runMigration().catch(async (error) => {
  console.error("[migration] failed:", error);

  try {
    await mongoose.connection.close();
  } catch (closeError) {
    console.error("[migration] close failed:", closeError);
  }

  process.exit(1);
});
