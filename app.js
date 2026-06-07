// app.js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_PUBLIC_KEY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let isAdminMode = false;

// --- 1. CLOUD INITIALIZATION ---
async function init() {
    await loadData();
    // Subscribe to real-time changes
    supabaseClient
        .channel('any')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
            loadData();
        })
        .subscribe();
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data;
        isAdminMode ? renderAdmin() : renderPublic();
    }
}

// --- 2. GEMINI AI LOGIC ---
async function callGemini(drug, task) {
    const banner = document.getElementById(isAdminMode ? 'ai-banner-admin' : 'ai-banner-public');
    const content = document.getElementById(isAdminMode ? 'ai-content-admin' : 'ai-content-public');

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
        content.innerHTML = "⚠️ AI offline. Check connection.";
    }
}

// --- 3. UI RENDERING ---
function renderPublic(filter = "") {
    const grid = document.getElementById('public-grid');
    const items = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.api.toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = items.map(p => `
        <div class="card">
            <div style="font-size:0.65rem; color:#888;">${p.cat} ${p.pom ? '🔴 POM' : '🟢 OTC'}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="triggerAI(${p.id})">AI Clinical Consult</button>
            <button class="btn-primary" onclick="alert('Added to cart')">Order for Delivery</button>
        </div>
    `).join('');
}

function renderAdmin() {
    const grid = document.getElementById('admin-grid');
    grid.innerHTML = products.map(p => `
        <div class="card">
            <small>ID: ${p.id}</small>
            <h3>${p.name}</h3>
            <p>Stock: ${p.stock} | API: ${p.api}</p>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="triggerAI(${p.id})">AI Stock Advice</button>
        </div>
    `).join('');
}

// --- 4. CLOUD ACTIONS ---
async function saveToCloud() {
    const newProd = {
        name: document.getElementById('m-name').value,
        api: document.getElementById('m-api').value,
        cat: document.getElementById('m-cat').value,
        price: parseInt(document.getElementById('m-price').value),
        stock: parseInt(document.getElementById('m-stock').value),
        pom: document.getElementById('m-pom').checked
    };
    await supabaseClient.from('products').insert([newProd]);
    document.getElementById('modal-add').style.display = 'none';
}

function showView(v) {
    isAdminMode = (v === 'admin');
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById('view-' + v).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    document.getElementById('nav-btn-' + (isAdminMode ? 'admin' : 'home')).classList.add('active');
    isAdminMode ? renderAdmin() : renderPublic();
}

function handleLogin() {
    const pass = prompt("Pharmacy Access Code:");
    if (pass === "1234") showView('admin');
}

window.triggerAI = (id) => {
    const drug = products.find(x => x.id === id);
    callGemini(drug, 'recommend');
};

function openAddModal() { document.getElementById('modal-add').style.display = 'flex'; }

init();