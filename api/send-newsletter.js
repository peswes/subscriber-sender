import mongoose from "mongoose";
import nodemailer from "nodemailer";

const MONGODB_URI = process.env.MONGODB_URI;

// CONNECT DB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

  await mongoose.connect(MONGODB_URI);
};

// SCHEMA
const SubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
});

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

// EMAIL VALIDATION
const isValid = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default async function handler(req, res) {
  // CORS (safe for frontend calls)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    await connectDB();

    const { subject, message } = req.body;

    // validation
    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message required" });
    }

    const users = await Subscriber.find();

    if (users.length === 0) {
      return res.status(200).json({ message: "No subscribers yet" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS, // MUST be Gmail App Password
      },
    });

    // 🚀 SEND EMAILS IN PARALLEL (FAST)
    await Promise.all(
      users.map((user) =>
        transporter.sendMail({
          from: process.env.EMAIL,
          to: user.email,
          subject,
          html: `<div style="font-family:sans-serif">
                   <h2>${subject}</h2>
                   <p>${message}</p>
                 </div>`,
        })
      )
    );

    return res.status(200).json({
      message: `Newsletter sent to ${users.length} subscribers 🚀`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error sending emails" });
  }
}