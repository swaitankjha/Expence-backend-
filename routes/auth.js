// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// DB Connection
const db = require("../db"); 

const JWT_SECRET = "your_jwt_secret"; 

//  Register
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
  
    try {
      const [existingUser] = await db.query("SELECT * FROM Users WHERE Email = ?", [email]);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "INSERT INTO Users (Name, Email, PasswordHash, CreatedAt) VALUES (?, ?, ?, NOW())",
        [name, email, hashedPassword]
      );
  
      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

//  Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM Users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);


    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.UserID }, JWT_SECRET, { expiresIn: "2h" });

    res.json({ token, user: { id: user.UserID, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
