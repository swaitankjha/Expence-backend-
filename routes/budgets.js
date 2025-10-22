const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

//  Add Budget
router.post('/', verifyToken, async (req, res) => {
  const { CategoryID, Amount, Month, Notes } = req.body;
  const userId = req.user.userId;

  try {
    const [result] = await db.query(
      `INSERT INTO Budgets (UserID, CategoryID, Amount, Month, Notes)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, CategoryID || null, Amount, Month, Notes || null]
    );
    res.status(201).json({ message: '✅ Budget added successfully', budgetId: result.insertId });
  } catch (err) {
    console.error('❌ Add Budget Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get All Budgets for Logged-in User
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const [results] = await db.query(
      `SELECT b.*, c.Name AS CategoryName, c.Type 
       FROM Budgets b 
       LEFT JOIN Categories c ON b.CategoryID = c.CategoryID
       WHERE b.UserID = ?`,
      [userId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// ✅ Edit Budget
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { CategoryID, Amount, Month, Notes } = req.body;
  const userId = req.user.userId;

  try {
    const [result] = await db.query(
      `UPDATE Budgets SET CategoryID = ?, Amount = ?, Month = ?, Notes = ?
       WHERE BudgetID = ? AND UserID = ?`,
      [CategoryID || null, Amount, Month, Notes || null, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Budget not found or unauthorized' });
    }

    res.json({ message: '✅ Budget updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

//  Delete Budget
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const [result] = await db.query(
      `DELETE FROM Budgets WHERE BudgetID = ? AND UserID = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Budget not found or unauthorized' });
    }

    res.json({ message: '✅ Budget deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
