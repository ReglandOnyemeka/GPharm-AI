// app.js
const SUPABASE_URL = 'https://pfjfdnwaatiacqgwbsuf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-WC3BTgSny08Oya6VmdBlA_znweCfNH';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PHARMACY_WHATSAPP = "2348053365937";
let products = [];
let publicCart = [];
let isAdminMode = false;

async function init() {
    await loadData();
    // Real-time Sync
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData()).subscribe();
    if (document.getElementById('footer-year')) document.getElementById('footer-year').innerText = new Date().getFullYear();
}

async function loadData() {
    const { data, error } = await supabaseClient.from('products').select('*').order('name', { ascending: true });
    if (!error) {
        products = data;
        isAdminMode ? renderAdmin() : renderPublic();
    }
}

async function callGPharmAI(drug, task) {
    const bannerId = isAdminMode ? 'ai-banner-admin' : 'ai-banner-public';
    const contentId = isAdminMode ? 'ai-content-admin' : 'ai-content-public';
    const banner = document.getElementById(bannerId);
    const content = document.getElementById(contentId);
    if (!banner) return;
    banner.style.display = 'block';
    content.innerHTML = "<em>✨ Gemini AI is analyzing Lagos molecules...</em>";

    try {
        const response = await fetch('/.netlify/functions/ai-assist', {
            method: 'POST',
            body: JSON.stringify({ drugName: drug.name, api: drug.api, category: drug.cat, task: task })
        });
        const data = await response.json();
        content.innerHTML = `<strong>✨ AI Consult:</strong><br>${data.result.replace(/\n/g, '<br>')}`;
    } catch (err) {
        content.innerHTML = "⚠️ AI offline. Check Netlify Logs.";
    }
}

function renderPublic(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;
    const filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.api?.toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <div class="badge">${p.cat} ${p.pom ? '• 🔴 POM' : '• 🟢 OTC'}</div>
            <h3>${p.name}</h3>
            <div class="price">₦${p.price.toLocaleString()}</div>
            <button class="btn-ai" onclick="triggerAI(${p.id})">Consult AI Substitutes</button>
            <button class="btn-primary" onclick="addToPublicCart(${p.id})">Add to Order</button>
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
            <button class="btn-ai" onclick="triggerAI(${p.id})">AI Clinical Check</button>
        </div>
    `).join('');
}

function handleLogin() {
    if (!isAdminMode) {
        const pass = prompt("Pharmacy Access Code:");
        if (pass === "1234") { isAdminMode = true; document.getElementById('nav-btn-admin').innerText = "Logout Admin"; showView('admin'); }
        else { alert("❌ Access Denied."); }
    } else { isAdminMode = false; document.getElementById('nav-btn-admin').innerText = "Pharmacy Login"; showView('home'); }
}

function showView(v) {
    isAdminMode = (v === 'admin');
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById('view-' + v).classList.add('active');
    isAdminMode ? renderAdmin() : renderPublic();
}

window.triggerAI = (id) => { const drug = products.find(x => x.id === id); callGPharmAI(drug, 'recommend'); };
window.addToPublicCart = (id) => { /* logic for cart */ alert("Added to cart"); };

init();
