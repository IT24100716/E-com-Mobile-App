const Groq = require("groq-sdk");
require("dotenv").config();

async function test() {
    let apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
        apiKey = apiKey.trim().replace(/^["'](.+)["']$/, '$1');
    }
    console.log("Testing with Key:", apiKey.substring(0, 10) + "...");
    const groq = new Groq({ apiKey });
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: "hi" }],
            model: "llama-3.3-70b-versatile",
        });
        console.log("Success:", completion.choices[0].message.content);
    } catch (e) {
        console.error("Failed:", e.message);
        if (e.response) {
            console.error("Response Data:", JSON.stringify(e.response.data));
        }
    }
}

test();
