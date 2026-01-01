const API_URL = 'http://localhost:3000/api';

// Check Auth
const token = localStorage.getItem('adminToken');
if (token) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadDashboard();
}

function adminLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123') {
        localStorage.setItem('adminToken', 'Bearer admin123');
        location.reload();
    } else {
        document.getElementById('login-error').innerText = 'Invalid Password';
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    location.reload();
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}/admin/orders`, {
            headers: { 'Authorization': localStorage.getItem('adminToken') }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        const json = await res.json();
        const orders = json.data;

        // Update Stats
        document.getElementById('total-orders').innerText = orders.length;

        const revenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        document.getElementById('total-revenue').innerText = `₹${revenue}`;

        const pending = orders.filter(o => o.status === 'pending').length;
        document.getElementById('pending-orders').innerText = pending;

        // Populate Table
        const tbody = document.getElementById('orders-list');
        tbody.innerHTML = '';

        orders.forEach(order => {
            const tr = document.createElement('tr');

            // Format Items
            let itemsHtml = '';
            try {
                const items = JSON.parse(order.items);
                itemsHtml = items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            } catch (e) {
                itemsHtml = 'Error parsing items';
            }

            // Parse Address
            let addressHtml = '<small>N/A</small>';
            try {
                if (order.shipping_address) {
                    const addr = JSON.parse(order.shipping_address);
                    addressHtml = `<small>${addr.street}, ${addr.city} - ${addr.pincode}</small>`;
                }
            } catch (e) {
                addressHtml = '<small>Invalid Format</small>';
            }

            // Status Class
            let statusClass = 'status-pending';
            if (order.status === 'Shipped') statusClass = 'status-shipped';
            if (order.status === 'Cancelled') statusClass = 'status-cancelled';

            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>${order.customer_name}<br><small>${order.customer_email}</small></td>
                <td>${itemsHtml}</td>
                <td>₹${order.total_amount}</td>
                <td>${addressHtml}</td>
                <td>
                    <strong>${(order.payment_method || 'N/A').toUpperCase()}</strong><br>
                    <small style="font-size:0.75rem; color:#888;">${order.transaction_id || ''}</small>
                </td>
                <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                <td>
                    <button class="action-btn" style="background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="updateStatus(${order.id}, 'Shipped')">Ship</button>
                    <button class="action-btn" style="background:#f44336; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="updateStatus(${order.id}, 'Cancelled')">Cancel</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error loading dashboard", error);
    }
}

async function updateStatus(id, status) {
    if (!confirm(`Mark order #${id} as ${status}?`)) return;

    try {
        const res = await fetch(`${API_URL}/admin/orders/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            loadDashboard();
        } else {
            alert("Failed to update status");
        }
    } catch (e) {
        console.error(e);
    }
}

async function resetDatabase() {
    if (!confirm("Are you sure you want to DELETE ALL ORDERS? This cannot be undone.")) return;

    try {
        const res = await fetch(`${API_URL}/admin/orders/reset`, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('adminToken')
            }
        });

        if (res.ok) {
            alert("Database Reset Successfully");
            loadDashboard();
        } else {
            alert("Failed to reset database");
        }
    } catch (e) {
        console.error(e);
        alert("Error connecting to server");
    }
}
