require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("./models/Admin");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const admin = new Admin({
      email: "admin@theclipstream.com",
      password: "thestreamclip@123",
    });
    await admin.save();

    console.log("✅ Admin created:", admin);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exit(1);
  }
})();
