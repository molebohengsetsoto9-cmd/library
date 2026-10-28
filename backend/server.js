const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MySQL
const db = mysql.createPool({
host: process.env.DB_HOST || "localhost",
user: process.env.DB_USER || "root",
password: process.env.DB_PASSWORD || "",
database: process.env.DB_NAME || "community_library",
waitForConnections: true,
connectionLimit: 10
});

// Test the database connection
db.getConnection((error, connection) => {
if (error) {
console.error("Database connection failed:", error.message);
return;
}

console.log("Connected to MySQL successfully!");
connection.release();

});

// Test the server
app.get("/", (req, res) => {
res.send("Community Library Management System API is running.");
});

// Get all books
app.get("/api/books", (req, res) => {
db.query("SELECT * FROM books ORDER BY id DESC", (error, results) => {
if (error) {
return res.status(500).json({ message: error.message });
}

    res.json(results);
});

});

// Add a book
app.post("/api/books", (req, res) => {
const { title, author, genre, isbn, quantity } = req.body;

if (!title || !author || !genre || !isbn) {
    return res.status(400).json({
        message: "Please provide the title, author, genre and ISBN."
    });
}

const sql = `
    INSERT INTO books (title, author, genre, isbn, quantity)
    VALUES (?, ?, ?, ?, ?)
`;

db.query(
    sql,
    [title, author, genre, isbn, Number(quantity) || 0],
    (error, result) => {
        if (error) {
            return res.status(500).json({ message: error.message });
        }

        res.status(201).json({
            message: "Book added successfully.",
            id: result.insertId
        });
    }
);

});

// Update a book
app.put("/api/books/:id", (req, res) => {
const { title, author, genre, isbn, quantity } = req.body;

const sql = `
    UPDATE books
    SET title = ?, author = ?, genre = ?, isbn = ?, quantity = ?
    WHERE id = ?
`;

db.query(
    sql,
    [title, author, genre, isbn, quantity, req.params.id],
    (error, result) => {
        if (error) {
            return res.status(500).json({ message: error.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Book not found." });
        }

        res.json({ message: "Book updated successfully." });
    }
);

});

// Delete a book
app.delete("/api/books/:id", (req, res) => {
db.query(
"DELETE FROM books WHERE id = ?",
[req.params.id],
(error, result) => {
if (error) {
return res.status(500).json({ message: error.message });
}

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Book not found." });
        }

        res.json({ message: "Book deleted successfully." });
    }
);

});

// Get all users
app.get("/api/users", (req, res) => {
db.query(
"SELECT id, username, role FROM users ORDER BY id DESC",
(error, results) => {
if (error) {
return res.status(500).json({ message: error.message });
}

        res.json(results);
    }
);

});

// Register a user
app.post("/api/users", (req, res) => {
  const { username, name, password, role } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: "Username, name and password are required." });
  }

  const allowedRoles = ["Admin", "Librarian", "User"];
  const finalRole = role || "User";

  if (!allowedRoles.includes(finalRole)) {
    return res.status(400).json({ message: "Invalid user role." });
  }

  db.query(
    "INSERT INTO users (username, name, password, role) VALUES (?, ?, ?, ?)",
    [username, name, password, finalRole],
    (error, result) => {
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(201).json({ message: "User registered", id: result.insertId });
    }
  );
}); 



// Record a book borrowing
app.post("/api/borrow", (req, res) => {
const { user_id, book_id, borrow_date, due_date } = req.body;

if (!user_id || !book_id || !borrow_date || !due_date) {
    return res.status(400).json({
        message: "User, book, borrowing date and due date are required."
    });
}

db.getConnection((error, connection) => {
    if (error) {
        return res.status(500).json({ message: error.message });
    }

    connection.beginTransaction((error) => {
        if (error) {
            connection.release();
            return res.status(500).json({ message: error.message });
        }

        connection.query(
            "UPDATE books SET quantity = quantity - 1 WHERE id = ? AND quantity > 0",
            [book_id],
            (error, result) => {
                if (error || result.affectedRows === 0) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(400).json({
                            message: error
                                ? error.message
                                : "Book is unavailable."
                        });
                    });
                }

                connection.query(
                    `INSERT INTO borrow_records
                    (user_id, book_id, borrow_date, due_date, status)
                    VALUES (?, ?, ?, ?, 'Borrowed')`,
                    [user_id, book_id, borrow_date, due_date],
                    (error, result) => {
                        if (error) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({
                                    message: error.message
                                });
                            });
                        }

                        connection.commit((error) => {
                            if (error) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({
                                        message: error.message
                                    });
                                });
                            }

                            connection.release();
                            res.status(201).json({
                                message: "Book borrowed successfully.",
                                id: result.insertId
                            });
                        });
                    }
                );
            }
        );
    });
});

});

// Return a borrowed book
app.put("/api/borrow/:id/return", (req, res) => {
const borrowId = req.params.id;
const returnDate = req.body.return_date;

if (!returnDate) {
    return res.status(400).json({
        message: "Please provide the return date."
    });
}

db.getConnection((error, connection) => {
    if (error) {
        return res.status(500).json({ message: error.message });
    }

    connection.beginTransaction((error) => {
        if (error) {
            connection.release();
            return res.status(500).json({ message: error.message });
        }

        connection.query(
            `SELECT book_id FROM borrow_records
             WHERE id = ? AND status = 'Borrowed' FOR UPDATE`,
            [borrowId],
            (error, results) => {
                if (error || results.length === 0) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(error ? 500 : 404).json({
                            message: error
                                ? error.message
                                : "Active borrowing record not found."
                        });
                    });
                }

                const bookId = results[0].book_id;

                connection.query(
                    `UPDATE borrow_records
                     SET status = 'Returned', return_date = ?
                     WHERE id = ? AND status = 'Borrowed'`,
                    [returnDate, borrowId],
                    (error) => {
                        if (error) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({
                                    message: error.message
                                });
                            });
                        }

                        connection.query(
                            "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
                            [bookId],
                            (error) => {
                                if (error) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        res.status(500).json({
                                            message: error.message
                                        });
                                    });
                                }

                                connection.commit((error) => {
                                    if (error) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            res.status(500).json({
                                                message: error.message
                                            });
                                        });
                                    }

                                    connection.release();
                                    res.json({
                                        message: "Book returned successfully."
                                    });
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

});

// View borrowing records
app.get("/api/borrow", (req, res) => {
const sql = "SELECT br.*, u.username, b.title FROM borrow_records br JOIN users u ON br.user_id = u.id JOIN books b ON br.book_id = b.id ORDER BY br.id DESC";

db.query(sql, (error, results) => {
    if (error) {
        return res.status(500).json({ message: error.message });
    }

    res.json(results);
});

});
// Get all transactions
app.get("/api/transactions", (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY id DESC", (error, results) => {
    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(results);
  });
});
// Start the server
const PORT = 5000;

app.listen(PORT, () => {
console.log("Library API running at http://localhost:"+ PORT);
});