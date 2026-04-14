import mongoose from "mongoose";
import nodemailer from "nodemailer";

const MONGODB_URI = process.env.MONGODB_URI;

// DB CONNECT
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
};

// SCHEMA
const SubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

// EMAIL VALIDATION
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    await connectDB();

    let { email } = req.body;

    email = email?.trim().toLowerCase();

    // validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // check duplicate
    const exists = await Subscriber.findOne({ email });

    if (exists) {
      return res.status(200).json({ message: "Already subscribed!" });
    }

    // save subscriber
    await Subscriber.create({ email });

    // 📩 CREATE EMAIL TRANSPORTER
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🎓 WELCOME EMAIL TEMPLATE
    const welcomeEmail = `
      <div style="font-family:Arial;background:#f4f6f9;padding:20px">
        <div style="max-width:600px;margin:auto;background:white;padding:20px;border-radius:10px">

          <h2 style="color:#2563eb">🎓 Welcome to Westk EdTech!</h2>

          <p>👋 Hello Learner,</p>

          <p>
            Welcome to our learning community! You will now receive:
          </p>

          <ul>
            <li>📚 Free learning updates</li>
            <li>🎧 Podcast lessons</li>
            <li>🚀 New course announcements</li>
          </ul>

          <p style="margin-top:20px">
            Stay consistent and keep building your tech skills 💻
          </p>

          <div style="margin-top:20px">
            <a href="https://subscriber-sender.vercel.app"
              style="background:#2563eb;color:white;padding:10px 15px;border-radius:6px;text-decoration:none">
              🚀 Start Learning
            </a>
          </div>

          <hr style="margin:20px 0"/>

          <p style="font-size:12px;color:gray">
            You are receiving this because you subscribed to Westk EdTech updates.
          </p>

        </div>
      </div>
    `;

    // send welcome email
    await transporter.sendMail({
      from: `"Westk EdTech 🎓" <${process.env.EMAIL}>`,
      to: email,
      subject: "🎉 Welcome to Westk EdTech!",
      html: welcomeEmail,
    });

    return res.status(200).json({
      message: "Subscribed successfully & welcome email sent 🚀",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}