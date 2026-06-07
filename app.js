// app.js
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
    
    // Subscribe to real-time changes so all devices update instantly
    supabaseClient
        .channel('any')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
            loadData();
        })
        .subscribe();

    // Attach search listener for the public storefront
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderPublic(e.target.value));
    }

    // Set footer year
    if (document.getElementById('footer-year')) {
        document.getElementById('footer-year').innerText = new Date().getFullYear();
    }
}

async function loadData() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (!error) {
        products = data;
        isAdminMode ? renderAdmin() : renderPublic();
    } else {
        console.error("Supabase Load Error:", error);
    }
}

// --- 2. ACCESS CONTROL (1234 Logic) ---
function handleLogin() {
    const loginBtn = document.getElementById('nav-btn-admin');
    
    if (!isAdminMode) {
        const pass = prompt("Pharmacy Access Code:");
        if (pass === "1234") {
            isAdminMode = true;
            loginBtn.innerText = "Logout Admin";
            showView('admin');
        } else {
            alert("❌ Invalid Access Code.");
        }
    } else {
        // Logout logic
        isAdminMode = false;
        loginBtn.innerText = "Pharmacy Login";
        showView('home');
    }
}

// --- 3. AI LOGIC (GEMINI) ---
async function callGemini(drug, task) {
    const bannerId = isAdminMode ? 'ai-banner-admin' : 'ai-banner-public';
    const contentId = isAdminMode ? 'ai-content-admin' : 'ai-content-public';
    
    const banner = document.getElementById(bannerId);
    const content = document.getElementById(contentId);

    if (!banner || !content) return;

    banner.style.display = 'block';
    content.innerHTML = "<em>✨ Gemini AI is analyzing Lagos market data...</em>";

    try {
        const response = await fetch('/.netlify/functions/ai-assist', {
            method: 'POST',
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat, task: task })
        });
        const data = await response.json();
        content.innerHTML = `<strong>✨ AI Consult:</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) {
        content.innerHTML = "⚠️ AI offline. Please verify Netlify Function deployment.";
    }
}

// --- 4. STOREFRONT RENDERING (PATIENTS) ---
function renderPublic(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;

    const items = products.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase()) || 
        p.api.toLowerCase().includes(filter.toLowerCase())
    );

    grid.innerHTML = items.map(p => `
        <div class="card">
            <div style="font-size:0.65rem; color:#888; font-weight:700;">${p.cat.toUpperCase()} ${p.pom ? '• 🔴 POM' : ''}</div>
            <h3>${p.name}</h3>
            <div style="font-size:0.75rem; color:#666; margin-bottom:8px;">${p.api}</div>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="triggerAI(${p.id})">Consult AI Substitutes</button>
            <button class="btn-primary" onclick="addToPublicCart(${p.id})">Add to Order</button>
        </div>
    `).join('');
}

// --- 5. PHARVENTORY RENDERING (STAFF) ---
function renderAdmin() {
    const grid = document.getElementById('admin-grid');
    if (!grid) return;

    grid.innerHTML = products.map(p => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#888;">
                <span>ID: ${p.id}</span>
                <span style="color:${p.stock < 10 ? 'red' : 'green'}; font-weight:bold;">Stock: ${p.stock}</span>
            </div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="triggerAI(${p.id})">AI Clinical Check</button>
        </div>
    `).join('');
}

// --- 6. PATIENT CART & WHATSAPP ---
function addToPublicCart(id) {
    const p = products.find(x => x.id === id);
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    updateCartBadge();
    alert(`${p.name} added to cart.`);
}

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    const bar = document.getElementById('public-cart-bar');
    const totalDisp = document.getElementById('cart-sum');
    
    if (!bar) return;

    const count = publicCart.reduce((a, b) => a + b.qty, 0);
    const sum = publicCart.reduce((a, b) => a + (b.price * b.qty), 0);

    if (count > 0) {
        bar.style.display = 'flex';
        if(badge) badge.innerText = count;
        if(totalDisp) totalDisp.innerText = "₦" + sum.toLocaleString();
    } else {
        bar.style.display = 'none';
    }
}

function checkoutPublic() {
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const address = document.getElementById('order-address').value;

    if (!name || phone.length !== 11 || !address) {
        return alert("Please provide receiver name, 11-digit Lagos phone, and address.");
    }

    let text = `*GPHARM LAGOS ORDER*\n------------------\n`;
    publicCart.forEach(i => text += `• ${i.name} (x${i.qty}) - ₦${(i.price*i.qty).toLocaleString()}\n`);
    const total = publicCart.reduce((a, b) => a + (b.price * b.qty), 0);
    text += `------------------\n*TOTAL: ₦${total.toLocaleString()}*\n\n`;
    text += `👤 Receiver: ${name}\n📞 Phone: ${phone}\n📍 Address: ${address}\n\n_Awaiting confirmation._`;
    
    window.open(`https://wa.me/${PHARMACY_WHATSAPP}?text=${encodeURIComponent(text)}`);
    publicCart = [];
    updateCartBadge();
    document.getElementById('modal-checkout').style.display = 'none';
}

// --- 7. CLOUD INVENTORY ACTIONS ---
async function saveToCloud() {
    const newProd = {
        name: document.getElementById('m-name').value,
        api: document.getElementById('m-api').value,
        cat: document.getElementById('m-cat').value,
        price: parseInt(document.getElementById('m-price').value),
        stock: parseInt(document.getElementById('m-stock').value),
        pom: document.getElementById('m-pom').checked
    };

    if (!newProd.name || !newProd.price) return alert("Product Name and Price are required.");

    const { error } = await supabaseClient.from('products').insert([newProd]);
    
    if (error) {
        alert("Error saving: " + error.message);
    } else {
        document.getElementById('modal-add').style.display = 'none';
        loadData(); // Refresh UI
    }
}

// --- 8. UTILITIES ---
function showView(v) {
    isAdminMode = (v === 'admin');
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const target = document.getElementById('view-' + v);
    if(target) target.classList.add('active');
    
    // Update navigation active state
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    const activeBtn = document.getElementById('nav-btn-' + (isAdminMode ? 'admin' : 'home'));
    if(activeBtn) activeBtn.classList.add('active');
    
    isAdminMode ? renderAdmin() : renderPublic();
}

window.triggerAI = (id) => {
    const drug = products.find(x => x.id === id);
    callGemini(drug, 'recommend');
};

function openAddModal() { document.getElementById('modal-add').style.display = 'flex'; }
function openPublicCart() { document.getElementById('modal-checkout').style.display = 'flex'; }

// Run App
init();
