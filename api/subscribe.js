import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// CONNECT DB (cached)
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

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

// EMAIL VALIDATION FUNCTION
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await connectDB();

    let { email } = req.body;

    // clean input
    email = email?.trim().toLowerCase();

    // validate
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // check duplicate
    const exists = await Subscriber.findOne({ email });

    if (exists) {
      return res.status(200).json({ message: "Already subscribed!" });
    }

    await Subscriber.create({ email });

    return res.status(200).json({ message: "Subscribed successfully 🚀" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}