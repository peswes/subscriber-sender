import mongoose from "mongoose";
import cors from "cors";
import express from "express";
import nodemailer from "nodemailer";

const app = express();

// ✅ CORS CONFIGURATION
app.use(cors({
  origin: "*",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// DB
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
};

// Schema
const SubscriberSchema = new mongoose.Schema({
  email: String
});

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

// ROUTE
app.post("/api/send-newsletter", async (req, res) => {
  try {
    await connectDB();

    const { subject, message } = req.body;

    const users = await Subscriber.find();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    });

    for (let user of users) {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject,
        html: `<h2>${message}</h2>`
      });
    }

    res.status(200).json({
      message: "Newsletter sent successfully 🚀"
    });

  } catch (err) {
    res.status(500).json({ message: "Error sending emails" });
  }
});

// Export for Vercel
export default app;