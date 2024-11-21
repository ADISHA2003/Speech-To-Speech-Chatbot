require("dotenv").config();
const express = require("express");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 3000;

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro-002",
});

const generationConfig = {
  temperature: 0.7, // Lower temperature for more focused responses
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 100, // Lower token count for shorter responses
  responseMimeType: "text/plain",
};

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

async function sendMessageWithRetry(chatSession, userMessage, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await chatSession.sendMessage(userMessage);
      return result.response.text();
    } catch (err) {
      if (attempt < retries) {
        console.error(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err; // Throw error after final attempt
      }
    }
  }
}

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  // Prepend a prompt asking for short responses
  const shortResponseMessage = `Please respond concisely: ${userMessage}`;

  try {
    const chatSession = model.startChat({ generationConfig, history: [] });
    const response = await sendMessageWithRetry(chatSession, shortResponseMessage);
    res.json({ response });
  } catch (err) {
    console.error("Error generating response:", err);
    res.status(500).send("Error generating response. Please try again later.");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://192.168.29.247:${port}`);
});
