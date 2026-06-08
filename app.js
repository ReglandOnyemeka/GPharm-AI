/**
 * GPharm AI Lagos — Logic Engine
 * Includes fixes for Search and Manual Entry
 */

const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

// --- 1. INITIALIZATION ---
async function init() {
    await loadData();
    
    // Live Cloud Sync
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadData();
    }).subscribe();

    // Attach Search Listener
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderPublic(e.target.value);
        });
    }

    if (document.getElementById('footer-year')) {
        document.getElementById('footer-year').innerText = new Date().getFullYear();
    }
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data || [];
        isAdminMode ? renderAdmin() : renderPublic();
    }
}

// --- 2. MANUAL ENTRY FIX ---
window.saveManualProduct = async function() {
    const name = document.getElementById('m-name').value.trim();
    const api = document.getElementById('m-api').value.trim();
    const price = parseInt(document.getElementById('m-price').value);
    const stock = parseInt(document.getElementById('m-stock').value);
    const cat = document.getElementById('m-cat').value;
    const pom = document.getElementById('m-pom').checked;

    if (!name || isNaN(price) || isNaN(stock)) {
        alert("⚠️ Please fill in Name, Price, and Stock Quantity.");
        return;
    }

    const btn = event.target;
    btn.innerText = "Syncing...";
    btn.disabled = true;

    try {
        const { error } = await supabaseClient.from('products').insert([{ name, api, price, stock, cat, pom }]);
        if (error) throw error;

        alert("✅ " + name + " saved!");
        // Clear fields
        document.getElementById('m-name').value = "";
        document.getElementById('m-api').value = "";
        document.getElementById('m-price').value = "";
        document.getElementById('m-stock').value = "";
        
        window.closeModal('modal-add');
        await loadData();
    } catch (err) {
        alert("❌ Error: " + err.message);
    } finally {
        btn.innerText = "Save to Cloud Database";
        btn.disabled = false;
    }
};

// --- 3. ROBUST SEARCH FIX ---
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;

    const filtered = products.filter(p => {
        const search = filter.toLowerCase();
        return (p.name || "").toLowerCase().includes(search) || 
               (p.api || "").toLowerCase().includes(search) ||
               (p.cat || "").toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; opacity:0.5;">No medications match "<strong>${filter}</strong>"</div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <div style="display:flex; justify-content:space-between;">
                <span class="cat">${p.cat}</span>
                ${p.pom ? '<span style="color:red; font-size:0.6rem; font-weight:bold;">🔴 POM</span>' : ''}
            </div>
            <h3>${p.name}</h3>
            <p class="api-text">${p.api || ''}</p>
            <div class="price">₦${(p.price || 0).toLocaleString()}</div>
            <div style="margin-top:15px;">
                <button class="btn-ai" onclick="window.triggerAI(${p.id})">AI Substitutes</button>
                <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
            </div>
        </div>
    `).join('');
};

// --- 4. ADMIN & UI UTILS ---
window.renderAdmin = function() {
    const grid = document.getElementById('admin-grid');
    if (!grid) return;
    grid.innerHTML = products.map(p => `
        <div class="card">
            <div style="font-size:0.7rem; color:#888;">Stock: ${p.stock} | ID: ${p.id}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" style="margin-top:10px;" onclick="window.triggerAI(${p.id})">AI Clinical Check</button>
        </div>
    `).join('');
    updateInsights();
};

window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Pharmacy Access Code:");
        if (code === "1234") { isAdminMode = true; document.getElementById('nav-btn-admin').innerText = "Logout Admin"; window.showView('admin'); }
        else { alert("❌ Access Denied"); }
    } else { isAdminMode = false; document.getElementById('nav-btn-admin').innerText = "Pharmacy Login"; window.showView('home'); }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    document.getElementById('nav-btn-admin').classList.toggle('active', view === 'admin');
    isAdminMode ? renderAdmin() : renderPublic();
};

// --- 5. CART & AI ---
window.addToPublicCart = function(id) {
    const p = products.find(x => x.id === id);
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
};

window.updateCartUI = function() {
    const bar = document.getElementById('public-cart-bar');
    const count = publicCart.reduce((a, b) => a + b.qty, 0);
    const sum = publicCart.reduce((a, b) => a + (b.price * b.qty), 0);
    if (count > 0) { bar.style.display = 'flex'; document.getElementById('cart-count').innerText = count; document.getElementById('cart-sum').innerText = "₦" + sum.toLocaleString(); }
    else { bar.style.display = 'none'; }
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const address = document.getElementById('order-address').value;
    if (!name || phone.length !== 11 || !address) return alert("Please fill 11-digit Lagos details.");

    let msg = `*GPHARM LAGOS ORDER*\n`;
    publicCart.forEach(i => msg += `• ${i.name} (x${i.qty})\n`);
    msg += `TOTAL: ₦${publicCart.reduce((a, b) => a + (b.price * b.qty), 0).toLocaleString()}\nRecipient: ${name}\nPhone: ${phone}\nAddress: ${address}`;
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
    publicCart = []; window.updateCartUI(); window.closeModal('modal-checkout');
};

window.triggerAI = async function(id) {
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById(isAdminMode ? 'ai-banner-admin' : 'ai-banner-public');
    const content = document.getElementById(isAdminMode ? 'ai-content-admin' : 'ai-content-public');
    banner.style.display = 'block';
    content.innerHTML = "✨ Gemini AI is analyzing molecule " + drug.api + "...";
    try {
        const response = await fetch('/.netlify/functions/ai-assist', { method: 'POST', body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat, task: 'recommend' }) });
        const data = await response.json();
        content.innerHTML = `<strong>AI Analysis:</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) { content.innerHTML = "⚠️ AI Service Offline."; }
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
    document.getElementById('stat-count').innerText = products.length;
}

window.openPublicCart = function() {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-items').innerHTML = publicCart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>${i.name} x${i.qty}</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong></div>`).join('');
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

// START
init();
