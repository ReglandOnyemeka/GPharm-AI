/**
 * GPharm AI Lagos — Logic Engine
 */

const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

// --- 1. INITIALIZE ---
async function init() {
    await loadData();
    
    // Real-time listener
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadData();
    }).subscribe();

    // Fix Search Bar
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderPublic(e.target.value));
    }
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data;
        isAdminMode ? renderAdmin() : renderPublic();
    }
}

// --- 2. GLOBAL ACTIONS (Buttons) ---
window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Enter 4-digit Pharmacy Access Code:");
        if (code === "1234") {
            isAdminMode = true;
            document.getElementById('nav-btn-admin').innerText = "Logout Admin";
            window.showView('admin');
        } else { alert("❌ Invalid Access."); }
    } else {
        isAdminMode = false;
        document.getElementById('nav-btn-admin').innerText = "Pharmacy Login";
        window.showView('home');
    }
};

window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    document.getElementById('nav-btn-admin').classList.toggle('active', view === 'admin');
    
    if (view === 'home') renderPublic(); else renderAdmin();
};

window.triggerAI = async function(id) {
    const drug = products.find(x => x.id === id);
    const banner = document.getElementById(isAdminMode ? 'ai-banner-admin' : 'ai-banner-public');
    const content = document.getElementById(isAdminMode ? 'ai-content-admin' : 'ai-content-public');

    banner.style.display = 'block';
    content.innerHTML = "✨ Gemini AI is analyzing clinical molecules...";

    try {
        const response = await fetch('/.netlify/functions/ai-assist', {
            method: 'POST',
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat, task: 'recommend' })
        });
        const data = await response.json();
        content.innerHTML = `<strong>✨ AI Consult:</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) { content.innerHTML = "⚠️ AI offline."; }
};

// --- 3. RENDERING ---
function renderPublic(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const items = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.api?.toLowerCase().includes(filter.toLowerCase()));
    
    grid.innerHTML = items.map(p => `
        <div class="card">
            <small style="font-size:0.65rem; color:#888;">${p.cat} ${p.pom ? '• 🔴 POM' : ''}</small>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="window.triggerAI(${p.id})">Consult AI</button>
            <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
}

function renderAdmin() {
    const grid = document.getElementById('admin-grid');
    if (!grid) return;
    grid.innerHTML = products.map(p => `
        <div class="card">
            <div style="font-size:0.7rem; color:#888;">Stock: ${p.stock}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="window.triggerAI(${p.id})">Clinical Check</button>
        </div>
    `).join('');
    updateInsights();
}

// --- 4. CART & WHATSAPP ---
window.addToPublicCart = function(id) {
    const p = products.find(x => x.id === id);
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    updateCartUI();
};

function updateCartUI() {
    const bar = document.getElementById('public-cart-bar');
    const count = publicCart.reduce((a, b) => a + b.qty, 0);
    const sum = publicCart.reduce((a, b) => a + (b.price * b.qty), 0);
    if (count > 0) {
        bar.style.display = 'flex';
        document.getElementById('cart-count').innerText = count;
        document.getElementById('cart-sum').innerText = "₦" + sum.toLocaleString();
    } else { bar.style.display = 'none'; }
}

window.openPublicCart = function() {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('modal-cart-items').innerHTML = publicCart.map(i => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>${i.name} x${i.qty}</span><strong>₦${(i.price*i.qty).toLocaleString()}</strong>
        </div>
    `).join('');
};

window.checkoutPublic = function() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const address = document.getElementById('order-address').value;
    if (!name || phone.length !== 11 || !address) return alert("Fill all 11-digit Lagos details.");

    let msg = `*GPHARM LAGOS ORDER*\n`;
    publicCart.forEach(i => msg += `• ${i.name} (x${i.qty}) - ₦${(i.price*i.qty).toLocaleString()}\n`);
    msg += `TOTAL: ₦${publicCart.reduce((a, b) => a + (b.price * b.qty), 0).toLocaleString()}\nRecipient: ${name}\nPhone: ${phone}\nAddress: ${address}`;
    
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(msg)}`);
    publicCart = []; updateCartUI(); window.closeModal('modal-checkout');
};

// --- 5. CLOUD INVENTORY ---
window.saveManualProduct = async function() {
    const newProd = {
        name: document.getElementById('m-name').value,
        api: document.getElementById('m-api').value,
        cat: document.getElementById('m-cat').value,
        price: parseInt(document.getElementById('m-price').value),
        stock: parseInt(document.getElementById('m-stock').value),
        pom: document.getElementById('m-pom').checked
    };
    const { error } = await supabaseClient.from('products').insert([newProd]);
    if (error) alert("Error: " + error.message);
    else { window.closeModal('modal-add'); loadData(); }
};

function updateInsights() {
    const total = products.reduce((a, b) => a + (b.price * b.stock), 0);
    document.getElementById('stat-total').innerText = "₦" + (total/1000).toFixed(1) + "k";
    document.getElementById('stat-low').innerText = products.filter(p => p.stock < 10).length;
    document.getElementById('stat-count').innerText = products.length;
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openAddModal = () => document.getElementById('modal-add').style.display = 'flex';

init();
