import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri = process.env.MONGODB_URI?.trim();

if (!uri) {
  console.error("❌ MONGODB_URI is missing in .env file.");
  process.exit(1);
}

if (uri.includes("<") || uri.includes(">")) {
  console.error(
    "❌ MONGODB_URI contains '<' or '>'. Remove the angle brackets around your username and password in .env.",
  );
  process.exit(1);
}

console.log("🔍 Testing MongoDB Atlas Connection...");
console.log("📡 Connecting to MongoDB cluster...");

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log("✅ Successfully connected to MongoDB Atlas!");
    console.log(`📂 Database: ${mongoose.connection.name}`);
    console.log(`🟢 Ready State: ${mongoose.connection.readyState} (Connected)`);
    await mongoose.disconnect();
    console.log("🔌 Disconnected cleanly.");
    process.exit(0);
  })
  .catch((err: Error) => {
    console.error("❌ Connection failed!");
    console.error(err.message);
    if (
      err.message.includes("whitelist") ||
      err.name === "MongooseServerSelectionError"
    ) {
      console.log(
        "\n💡 Hint: Go to MongoDB Atlas -> Network Access -> Add IP Address -> 'Allow Access from Anywhere' (0.0.0.0/0) or add your current IP.",
      );
    }
    process.exit(1);
  });
