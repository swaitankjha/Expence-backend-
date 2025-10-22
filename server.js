const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = "sk-"; 


const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "expense_tracker",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();


app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);


app.get("/", (req, res) => {
  res.send(" Expense Tracker API is running.");
});


app.post("/api/chatbot", async (req, res) => {
  const { userQuery } = req.body;

  try {
    const [transactions] = await db.query(`
      SELECT t.Amount, t.Type, t.CategoryID, c.Name AS CategoryName, t.Date
      FROM Transactions t
      LEFT JOIN Categories c ON t.CategoryID = c.CategoryID
    `);

    const transactionsSummary = transactions.map(t =>
      `Date: ${t.Date}, Amount: ${t.Amount}, Type: ${t.Type}, Category: ${t.CategoryName || "N/A"}`
    ).join("\n");

    const prompt = `
You are an AI financial assistant. Based on the following transaction data, answer the user's question.
Transactions:
${transactionsSummary}

User's question: ${userQuery}
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const botReply = response.data.choices[0].message.content.trim();
    res.json({ botResponse: botReply });

  } catch (error) {
    console.error(" Error in AI chatbot:", error.response?.data || error.message);
    res.status(500).json({
      message: "Chatbot service failed",
      error: error.response?.data || error.message,
    });
  }
});

//  Get All Categories (with "General Budget")
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT CategoryID, Name, Type FROM categories`);
    rows.unshift({ CategoryID: null, Name: 'General Budget', Type: null });
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//  Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
