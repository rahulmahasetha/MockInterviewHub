require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
async function test() {
  const key = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(key);
  try {
    const models = await genAI.getModels();
    console.log(models);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
