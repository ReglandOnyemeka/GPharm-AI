const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405 };
    try {
        const { drugName, api, category, task } = JSON.parse(event.body);
        const GEMINI_KEY = process.env.AI_API_KEY; 
        const prompt = `You are a Lagos-based clinical pharmacist. Task: ${task === 'recommend' ? 'Suggest 3 clinical equivalents for' : 'Suggest a retail price for'} ${drugName} (${api}) in ${category} category for the Nigerian market. Respond concisely.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ result: response.data.candidates[0].content.parts[0].text })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
