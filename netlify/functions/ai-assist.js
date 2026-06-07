// netlify/functions/ai-assist.js
exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405 };
    try {
        const { drugName, api, category, task } = JSON.parse(event.body);
        const GEMINI_KEY = process.env.AI_API_KEY; 
        const prompt = `You are a Lagos clinical pharmacist. Suggest 3 substitutes for ${drugName} (${api}) in ${category} category for Nigeria. Concise bullets.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return { statusCode: 200, body: JSON.stringify({ result: data.candidates[0].content.parts[0].text }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
