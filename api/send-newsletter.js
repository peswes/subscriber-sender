import mongoose from "mongoose";
import nodemailer from "nodemailer";

const MONGODB_URI = process.env.MONGODB_URI;

// CONNECT DB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
};

// SCHEMA
const SubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
});

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

// VALIDATION
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// BATCH HELPER (prevents Gmail overload)
const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  try {
    await connectDB();

    const { subject, message, podcastLink } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message required" });
    }

    const users = await Subscriber.find();

    if (!users.length) {
      return res.status(200).json({ message: "No subscribers found" });
    }

    // EMAIL TRANSPORTER
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🎓 EDTECH EMAIL TEMPLATE
    const createEmailTemplate = () => {
      return `
      <div style="font-family:Arial;background:#f4f6f9;padding:20px">

        <div style="max-width:600px;margin:auto;background:white;padding:20px;border-radius:10px">

          <h2 style="color:#2563eb">📚 Westk Academy</h2>

          <h3>${subject}</h3>

          <p>👋 Hello Learner,</p>

          <p>${message}</p>

          ${
            podcastLink
              ? `
              <div style="margin:20px 0">
                <a href="${podcastLink}" target="_blank"
                  style="background:#2563eb;color:white;padding:10px 15px;border-radius:6px;text-decoration:none">
                  🎧 Listen to Podcast
                </a>
              </div>
            `
              : ""
          }

          <hr style="margin:20px 0"/>

          <p style="font-size:12px;color:gray">
            You are receiving this because you enrolled in Westk EdTech updates.
          </p>

        </div>
      </div>
      `;
    };

    let successCount = 0;
    let failCount = 0;

    // 🔥 SEND IN SMALL BATCHES (10 at a time)
    const batches = chunkArray(users, 10);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (user) => {
          try {
            if (!isValidEmail(user.email)) return;

            await transporter.sendMail({
              from: `"Westk EdTech 📚" <${process.env.EMAIL}>`,
              to: user.email,
              subject,
              html: createEmailTemplate(),
            });

            successCount++;
          } catch (err) {
            console.error("Email failed:", user.email);
            failCount++;
          }
        })
      );
    }

    return res.status(200).json({
      message: `Podcast sent 🎧`,
      sent: successCount,
      failed: failCount,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}