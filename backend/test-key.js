require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
async function test() {
  const key = process.env.GEMINI_API_KEY;
  console.log("Testing key:", key);
  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Say hi");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
