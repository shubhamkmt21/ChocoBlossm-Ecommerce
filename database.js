const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./shop.db', (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Create Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            price REAL,
            image TEXT,
            description TEXT
        )`);

        // Create Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            customer_email TEXT,
            shipping_address TEXT, -- JSON string of address
            total_amount REAL,
            items TEXT, -- JSON string of items
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'pending',
            payment_method TEXT,
            transaction_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed Data check
        db.get("SELECT count(*) as count FROM products", (err, row) => {
            if (row.count === 0) {
                console.log("Seeding products...");
                const products = [
                    {
                        name: "Royal Truffle Collection",
                        category: "Gift Boxes",
                        price: 1299,
                        image: "https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&q=80&w=800",
                        description: "An exquisite assortment of our finest truffles."
                    },
                    {
                        name: "85% Dark Intense",
                        category: "Bars",
                        price: 450,
                        image: "https://images.unsplash.com/photo-1511381978829-2c3a7e937b46?auto=format&fit=crop&q=80&w=800",
                        description: "Pure, intense cocoa experience for dark chocolate lovers."
                    },
                    {
                        name: "Family Celebration Pack",
                        category: "Assorted",
                        price: 2499,
                        image: "https://images.unsplash.com/photo-1621939514649-28b12e81156d?auto=format&fit=crop&q=80&w=800",
                        description: "Something for everyone in this grand box of happiness."
                    },
                    {
                        name: "Rakhi Love Hamper",
                        category: "Festive",
                        price: 1500,
                        image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&q=80&w=800",
                        description: "Celebrate the bond of love with this special hamper."
                    },
                    {
                        name: "Caramel Almonds",
                        category: "Snacks",
                        price: 650,
                        image: "https://images.unsplash.com/photo-1526081347589-7fa3cb41b4b2?auto=format&fit=crop&q=80&w=800",
                        description: "Crunchy almonds coated in rich caramel and chocolate."
                    },
                    {
                        name: "Golden Signature Box",
                        category: "Gift Boxes",
                        price: 3499,
                        image: "https://images.unsplash.com/photo-1606312619070-d48b706521bf?auto=format&fit=crop&q=80&w=800",
                        description: "The ultimate luxury gift statement."
                    }
                ];

                const stmt = db.prepare("INSERT INTO products (name, category, price, image, description) VALUES (?, ?, ?, ?, ?)");
                products.forEach(p => {
                    stmt.run(p.name, p.category, p.price, p.image, p.description);
                });
                stmt.finalize();
                console.log("Products seeded successfully.");
            }
        });
    });
}

module.exports = db;
