require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
async function test() {
  const key = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(key);
  const modelNames = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.0-pro'];
  for (const modelName of modelNames) {
    try {
      console.log("Testing model:", modelName);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say hi");
      console.log("Success with", modelName, ":", result.response.text());
      return;
    } catch (err) {
      console.error("Error for", modelName, ":", err.message);
    }
  }
}
test();
