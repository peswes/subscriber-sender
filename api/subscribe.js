import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// DB CONNECT
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
};

// MODEL
const SubscriberSchema = new mongoose.Schema({
  email: String
});

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

export default async function handler(req, res) {

  // ✅ CORS HEADERS (IMPORTANT)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await connectDB();

    const { email } = req.body;

    const exists = await Subscriber.findOne({ email });

    if (exists) {
      return res.status(200).json({ message: "Already subscribed!" });
    }

    await Subscriber.create({ email });

    res.status(200).json({ message: "Subscribed successfully 🚀" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}