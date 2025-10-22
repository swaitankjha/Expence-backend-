const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require("../middleware/verifyToken");

// Monthly Expense Summary (removed user filter)
router.get("/monthly-summary", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT DATE_FORMAT(t.Date, '%Y-%m') AS Month, 
             SUM(t.Amount) AS TotalAmount
      FROM Transactions t
      JOIN Categories c ON t.CategoryID = c.CategoryID
      WHERE c.Type = 'Expense'
      GROUP BY Month
      ORDER BY Month ASC
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Database Error" });
  }
});

// Total Income, Expense, Balance (removed user filter)
router.get("/summary", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        SUM(CASE WHEN Type = 'Income' THEN Amount ELSE 0 END) AS totalIncome,
        SUM(CASE WHEN Type = 'Expense' THEN Amount ELSE 0 END) AS totalExpenses
      FROM Transactions
    `);

    const totalIncome = results[0].totalIncome || 0;
    const totalExpenses = results[0].totalExpenses || 0;
    const totalBalance = totalIncome - totalExpenses;
    res.json({ totalIncome, totalExpenses, totalBalance });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Add Transaction (removed UserID from insert)
router.post("/", async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      customCategory,
      transactionMode,
      date,
      notes
    } = req.body;

    const finalCategoryName = category === "custom" ? customCategory : category;
    const finalType = type === "income" ? "Income" : "Expense";

    const [existingCategory] = await db.query(
      "SELECT CategoryID FROM Categories WHERE Name = ? AND Type = ?",
      [finalCategoryName, finalType]
    );

    let finalCategoryID;
    if (existingCategory.length > 0) {
      finalCategoryID = existingCategory[0].CategoryID;
    } else {
      const [insertResult] = await db.query(
        "INSERT INTO Categories (Name, Type) VALUES (?, ?)",
        [finalCategoryName, finalType]
      );
      finalCategoryID = insertResult.insertId;
    }

    await db.query(`
      INSERT INTO Transactions (CategoryID, Amount, Type, Date, Notes, TransactionMode)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [finalCategoryID, amount, finalType, date, notes || null, transactionMode]
    );

    res.status(201).json({ message: "Transaction added successfully." });
  } catch (error) {
    console.error("❌ Add Transaction Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Category Summary for Pie Chart (removed user filter)
router.get("/category-summary", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT IFNULL(Categories.Name, 'Uncategorized') AS CategoryName, 
             SUM(Transactions.Amount) AS TotalAmount
      FROM Transactions
      LEFT JOIN Categories ON Transactions.CategoryID = Categories.CategoryID
      GROUP BY CategoryName
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Database Error" });
  }
});

// Delete Transaction (removed user check)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [check] = await db.query(
      "SELECT * FROM Transactions WHERE TransactionID = ?",
      [id]
    );
    if (check.length === 0) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    await db.query("DELETE FROM Transactions WHERE TransactionID = ?", [id]);
    res.json({ message: "✅ Transaction deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Database Error" });
  }
});

// Update Transaction (removed user check)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { amount, transactionMode, type, category, customCategory, date, notes } = req.body;
  const formattedDate = date ? new Date(date).toISOString().split("T")[0] : null;

  try {
    const [check] = await db.query(
      "SELECT * FROM Transactions WHERE TransactionID = ?",
      [id]
    );
    if (check.length === 0) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    let updateQuery = "";
    let values = [];

    if (customCategory) {
      updateQuery = `
        UPDATE Transactions 
        SET Amount = ?, TransactionMode = ?, Type = ?, CustomCategory = ?, CategoryID = NULL, Date = ?, Notes = ?
        WHERE TransactionID = ?`;
      values = [amount, transactionMode, type, customCategory, formattedDate, notes, id];
    } else if (category) {
      updateQuery = `
        UPDATE Transactions 
        SET Amount = ?, TransactionMode = ?, Type = ?, 
            CategoryID = (SELECT CategoryID FROM Categories WHERE Name = ?), CustomCategory = NULL, Date = ?, Notes = ?
        WHERE TransactionID = ?`;
      values = [amount, transactionMode, type, category, formattedDate, notes, id];
    } else {
      return res.status(400).json({ message: "❌ Either category or customCategory must be provided." });
    }

    const [result] = await db.query(updateQuery, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "❌ Transaction not found." });
    }
    res.json({ message: "✅ Transaction updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "❌ Database Error" });
  }
});

// Get all transactions (no change needed here)
router.get("/", async (req, res) => {
  try {
    const [transactions] = await db.query(
      `SELECT t.TransactionID, t.Amount, t.Type, t.Date, t.Notes, t.TransactionMode, c.Name as CategoryName
       FROM Transactions t
       LEFT JOIN Categories c ON t.CategoryID = c.CategoryID
       ORDER BY t.Date DESC`
    );

    res.json(transactions);
  } catch (error) {
    console.error("Fetch Transactions Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
