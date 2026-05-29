import mongoose from "mongoose";

export const connection = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(
      "[db] MONGO_URI is not set. Check Backend/config/config.env is loaded before connection() runs."
    );
    return;
  }

  // Mask the password before logging the URI so we can verify the host
  // without leaking the secret.
  const safe = uri.replace(/(:\/\/[^:]+:)([^@]+)(@)/, "$1***$3");
  console.log(`[db] connecting to ${safe}`);

  try {
    await mongoose.connect(uri, {
      dbName: "SPLIT_MONEY_APPLICATION",
      serverSelectionTimeoutMS: 10000,
    });
    console.log("[db] connected to database");
  } catch (error) {
    console.error("[db] connection failed:");
    console.error(`  name:    ${error.name}`);
    console.error(`  message: ${error.message}`);
    if (error.reason) console.error(`  reason:  ${error.reason}`);
    if (error.code) console.error(`  code:    ${error.code}`);
  }
};
