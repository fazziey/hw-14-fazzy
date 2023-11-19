const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("./querys/query");
const app = express();

function authenticateTokenMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  const user = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = user.userId;
  next();
}

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    allowedHeaders:
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    optionsSuccessStatus: 200,
  })
);

app.use("/uploads", express.static("uploads"));

// Set up multer middleware to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, Date.now() + "-" + fileName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
});

// Define register endpoint
app.post("/register", async (req, res) => {
  try {
    // Get user data from request body
    const { name, email, password } = req.body;

    // Validate user data
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide name, email and password" });
    }

    // Check if email already exists in database
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rowCount > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Insert user data into database
    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, password]
    );

    // Send success response
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    // Send error response
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Define login endpoint
app.post("/login", async (req, res) => {
  try {
    // Get user data from request body
    const { email, password } = req.body;

    // Validate user data
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    // Check if email exists in database
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Get user data from database
    const user = result.rows[0];

    // Compare password with database
    // Note: this is not secure, you should use a hashing algorithm like bcrypt to compare passwords
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Send success response with user data
    res.status(200).json({ message: "User logged in successfully", user });
  } catch (error) {
    // Send error response
    res.status(500).json({ message: "Something went wrong" });
  }
});

// create a book
app.post(
  "/books",
  authenticateTokenMiddleware,
  upload.single("image"),
  async (req, res) => {
    const { title, author, publisher, year, pages } = req.body;
    pool
      .query(
        "INSERT INTO Book (title, author, publisher, year, pages, image) VALUES ($1, $2, $3, $4, $5, $6)",
        [title, author, publisher, year, pages, req.file.path]
      )
      .then(() => {
        res.status(201).json({ message: "Book created" });
      })
      .catch((error) => {
        res.status(400).json({ message: error.message });
      });
  }
);

// get all books
app.get("/books", async (req, res) => {
  pool
    .query("SELECT * FROM Book")
    .then((data) => {
      res.json(data.rows);
    })
    .catch((error) => {
      res.status(500).json({ message: error.message });
    });
});

// edit a book
app.put("/books/:id", authenticateTokenMiddleware, async (req, res) => {
  const { title, author, publisher, year, pages } = req.body;
  pool
    .query(
      "UPDATE Book SET title = $1, author = $2, publisher = $3, year = $4, pages = $5, WHERE id = $6",
      [title, author, publisher, year, pages, req.params.id]
    )
    .then(() => {
      res.json({ message: "Book updated" });
    })
    .catch((error) => {
      res.status(400).json({ message: error.message });
    });
});

// delete a book
app.delete("/books/:id", authenticateTokenMiddleware, async (req, res) => {
  pool
    .query("DELETE FROM Book WHERE id = $1", [req.params.id])
    .then(() => {
      res.json({ message: "Book deleted" });
    })
    .catch((error) => {
      res.status(500).json({ message: error.message });
    });
});

// get book by id
app.get("/books/:id", async (req, res) => {
  pool
    .query("SELECT * FROM Book WHERE id = $1", [req.params.id])
    .then((data) => {
      res.json(data.rows);
    })
    .catch((error) => {
      res.status(404).json({ message: error.message });
    });
});

// Start the server
app.listen(8000, () => {
  console.log("Server started on port 8000");
});
