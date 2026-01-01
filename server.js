const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files

// API Routes

// Get all products
app.get('/api/products', (req, res) => {
    const { category, priceRange } = req.query;
    let sql = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (category && category !== 'All Products') {
        sql += " AND category = ?";
        params.push(category);
    }

    // Basic price filtering logic implementation
    if (priceRange) {
        if (priceRange === 'Under ₹500') {
            sql += " AND price < 500";
        } else if (priceRange === '₹500 - ₹1000') {
            sql += " AND price BETWEEN 500 AND 1000";
        } else if (priceRange === '₹1000 - ₹2000') {
            sql += " AND price BETWEEN 1000 AND 2000";
        } else if (priceRange === 'Above ₹2000') {
            sql += " AND price > 2000";
        }
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// Create a new order
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_email, shipping_address, total_amount, items, payment_status, transaction_id, payment_method } = req.body;

    if (!customer_name || !total_amount || !items) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }

    const sql = "INSERT INTO orders (customer_name, customer_email, shipping_address, total_amount, items, payment_status, transaction_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const params = [customer_name, customer_email, JSON.stringify(shipping_address), total_amount, JSON.stringify(items), payment_status || 'Pending', transaction_id || null, payment_method || 'Unknown'];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            id: this.lastID
        });
    });
});

// Admin Routes

// Middleware for basic auth
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer admin123') {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// Get all orders (Admin)
app.get('/api/admin/orders', adminAuth, (req, res) => {
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// Update order status
app.put('/api/admin/orders/:id', adminAuth, (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
        res.status(400).json({ error: "Status is required" });
        return;
    }

    const sql = "UPDATE orders SET status = ? WHERE id = ?";
    db.run(sql, [status, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            changes: this.changes
        });
    });
});

// Reset All Orders (Admin)
app.delete('/api/admin/orders/reset', adminAuth, (req, res) => {
    const sql = "DELETE FROM orders";
    db.run(sql, [], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Reset Auto Increment
        db.run("DELETE FROM sqlite_sequence WHERE name='orders'", [], (err) => {
            res.json({
                message: "success",
                changes: this.changes
            });
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
