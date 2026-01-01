// API Base URL
const API_URL = 'http://localhost:3000/api';

// --- Cart Management ---
function getCart() {
    return JSON.parse(localStorage.getItem('chocoCart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('chocoCart', JSON.stringify(cart));
    updateCartMetadata(); // Updates header count
}

// Make globally available for React/Vue
window.getCart = getCart;
window.saveCart = saveCart;

window.addToCart = function (product) {
    console.log("Adding to cart:", product); // Debug log
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart(cart);

    // Feedback
    // If sweetalert or a toast is used, call it here. using alert for now.
    alert(`${product.name} added to your cart! 🍫`);
    // Optional: trigger a custom event
    window.dispatchEvent(new Event('cartUpdated'));
};

window.removeFromCart = function (id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    if (typeof renderCart === 'function') renderCart();
};

window.updateQuantity = function (id, change) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);

    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            window.removeFromCart(id);
            return;
        }
    }

    saveCart(cart);
    if (typeof renderCart === 'function') renderCart();
};

function updateCartMetadata() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = `(${count})`;
}
window.updateCartMetadata = updateCartMetadata; // Export

// --- Product Page Logic ---
async function fetchProducts() {
    const container = document.getElementById('products-list');
    const countLabel = document.getElementById('product-count');
    if (!container) return;

    // Get active filters
    const activeCategory = document.querySelector('#category-filters li.active')?.dataset.value || 'All Products';
    const activePrice = document.querySelector('#price-filters li.active')?.dataset.value || '';

    let url = `${API_URL}/products?category=${encodeURIComponent(activeCategory)}`;
    if (activePrice) {
        url += `&priceRange=${encodeURIComponent(activePrice)}`;
    }

    try {
        const response = await fetch(url);
        const json = await response.json();
        const products = json.data;

        countLabel.textContent = `Showing ${products.length} products`;
        container.innerHTML = '';

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <div class="product-category">${p.category}</div>
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-price">₹${p.price}</div>
                    <button class="add-btn" onclick='addToCart(${JSON.stringify(p)})'>Add to Cart</button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        container.innerHTML = '<p class="text-center">Failed to load products. Is the server running?</p>';
    }
}

// Setup Filters
const filterItems = document.querySelectorAll('.filter-list li');
filterItems.forEach(item => {
    item.addEventListener('click', function () {
        // Toggle active class within the same group
        const siblings = this.parentElement.children;
        Array.from(siblings).forEach(sib => sib.classList.remove('active'));
        this.classList.add('active');
        fetchProducts();
    });
});


// --- Cart Page Logic ---
let currentShipping = 0;

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    const cart = getCart();
    const subtotalEl = document.getElementById('subtotal');

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center" style="padding: 2rem;">Your cart is empty.</p>';
        subtotalEl.textContent = '₹0';
        updateTotals(0);
        return;
    }

    container.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="item-details">
                <div style="display: flex; justify-content: space-between;">
                    <h4 class="item-title">${item.name}</h4>
                    <div class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i> Remove</div>
                </div>
                <div class="item-price">₹${item.price}</div>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    subtotalEl.textContent = `₹${subtotal}`;

    // Auto-calculate shipping if pincode already entered or handle free tier
    checkShippingRules(subtotal);
}

function updateTotals(subtotal) {
    const totalEl = document.getElementById('total');
    const shippingEl = document.getElementById('shipping');

    if (currentShipping === 0) {
        shippingEl.textContent = "Free";
        shippingEl.style.color = "green";
    } else {
        shippingEl.textContent = `₹${currentShipping}`;
        shippingEl.style.color = "var(--color-text-main)";
    }

    totalEl.textContent = `₹${subtotal + currentShipping}`;
}

function checkShippingRules(subtotal) {
    // If order > 2500, Free Shipping always
    if (subtotal > 2500) {
        currentShipping = 0;
        updateTotals(subtotal);
        const msg = document.getElementById('delivery-msg');
        if (msg) {
            msg.innerHTML = `<i class="fas fa-gift" style="color: var(--color-accent);"></i> <strong>Free Shipping Applied!</strong> (Order > ₹2500)`;
            msg.style.color = "green";
        }
    } else {
        // If pincode was already entered, re-verify. Else wait for user input.
        const msg = document.getElementById('delivery-msg');
        if (!msg || msg.textContent === "") {
            currentShipping = 0; // Default until checked
            updateTotals(subtotal);
            if (msg) msg.textContent = "Enter Pincode to calculate shipping.";
        } else {
            // Re-trigger check if we have a valid pincode
            checkDelivery();
        }
    }
}

async function placeOrder() {
    const cart = getCart();
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    const name = document.getElementById('cust-name').value;
    const email = document.getElementById('cust-email').value;
    const msg = document.getElementById('checkout-msg');

    if (!name || !email) {
        alert("Please fill in your details.");
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + currentShipping;

    const orderData = {
        customer_name: name,
        customer_email: email,
        total_amount: total,
        items: cart
    };

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const result = await res.json();

        if (result.message === 'success') {
            msg.textContent = `Order placed successfully! Order ID: ${result.id}`;
            msg.style.color = 'green';
            localStorage.removeItem('chocoCart');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            msg.textContent = 'Failed to place order.';
            msg.style.color = 'red';
        }
    } catch (err) {
        console.error(err);
        msg.textContent = 'Error connecting to server.';
    }
}

// --- Pincode Logic ---
function checkDelivery() {
    const input = document.getElementById('pincode-input');
    const msg = document.getElementById('delivery-msg');
    const pincode = input.value.trim();

    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Rule: Free Shipping > 2500
    if (subtotal > 2500) {
        currentShipping = 0;
        updateTotals(subtotal);
        msg.innerHTML = `<i class="fas fa-gift" style="color: var(--color-accent);"></i> <strong>Free Shipping Applied!</strong> (Order > ₹2500)`;
        msg.style.color = "green";
        return;
    }

    if (!/^\d{6}$/.test(pincode)) {
        msg.textContent = 'Please enter a valid 6-digit pincode.';
        msg.style.color = 'red';
        return;
    }

    msg.textContent = 'Checking availability...';
    msg.style.color = 'var(--color-primary)';

    // Mock Shiprocket Response
    setTimeout(() => {
        let days;
        let partner = "Shiprocket";

        if (pincode.startsWith('400')) {
            days = "1-2 Business Days";
            msg.style.color = 'green';
            currentShipping = 50; // Mumbai Charge
        } else {
            days = "3-5 Business Days";
            msg.style.color = 'var(--color-text-main)';
            currentShipping = 100; // National Charge
        }

        updateTotals(subtotal);
        msg.innerHTML = `<i class="fas fa-shipping-fast" style="color: var(--color-secondary);"></i> <strong>${days}</strong><br>Fulfilled by ${partner} (Charge: ₹${currentShipping})`;
    }, 500);
}


// --- Global Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu logic (retained)
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    updateCartMetadata();

    // Pincode Listener
    const pinBtn = document.getElementById('check-pincode-btn');
    if (pinBtn) {
        pinBtn.addEventListener('click', checkDelivery);
    }

    // Scroll Reveal Animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Countdown Timer logic
    const countdownTarget = new Date();
    countdownTarget.setDate(countdownTarget.getDate() + 3); // 3 days from now

    function updateCountdown() {
        const now = new Date();
        const diff = countdownTarget - now;

        if (diff <= 0) return;

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        const dEl = document.getElementById('days');
        if (dEl) {
            dEl.innerText = d < 10 ? '0' + d : d;
            document.getElementById('hours').innerText = h < 10 ? '0' + h : h;
            document.getElementById('minutes').innerText = m < 10 ? '0' + m : m;
            document.getElementById('seconds').innerText = s < 10 ? '0' + s : s;
        }
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();
});