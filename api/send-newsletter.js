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
  email: String,
});

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

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
      return res.status(400).json({ message: "Missing subject or message" });
    }

    const users = await Subscriber.find();

    if (!users.length) {
      return res.status(200).json({ message: "No subscribers found" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Build email content (podcast style)
    const htmlContent = `
      <div style="font-family:Arial;padding:20px">
        <h2>${subject}</h2>
        <p>${message}</p>

        ${
          podcastLink
            ? `<p>
                🎧 Listen here:<br/>
                <a href="${podcastLink}" target="_blank">${podcastLink}</a>
              </p>`
            : ""
        }

        <hr/>
        <p style="font-size:12px;color:gray">
          You are receiving this because you subscribed to our newsletter.
        </p>
      </div>
    `;

    // SEND TO ALL USERS (FAST)
    await Promise.all(
      users.map((user) =>
        transporter.sendMail({
          from: process.env.EMAIL,
          to: user.email,
          subject,
          html: htmlContent,
        })
      )
    );

    return res.status(200).json({
      message: `Podcast sent to ${users.length} subscribers 🚀`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to send podcast" });
  }
}