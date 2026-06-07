/**
 * GPharm AI Lagos — Robust Logic Engine
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
    console.log("GPharm Initializing...");
    await loadData();
    
    // Real-time listener for cloud updates
    supabaseClient.channel('any').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadData();
    }).subscribe();

    // Setup Search Bar
    const searchInput = document.getElementById('input-search-public');
    if (searchInput) {
        // This fires every time you type
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value;
            console.log("Searching for:", term);
            renderPublic(term);
        });
    }
}

async function loadData() {
    console.log("Fetching from Supabase...");
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Supabase Error:", error.message);
        return;
    }

    products = data || [];
    console.log("Data loaded:", products.length, "items found.");
    
    // Render the initial list
    if (isAdminMode) renderAdmin(); else renderPublic();
}

// --- 2. RENDERING LOGIC (The Search Fix) ---
window.renderPublic = function(filter = "") {
    const grid = document.getElementById('public-grid');
    if (!grid) return;

    // Filter by Name OR API (Active Ingredient), and make it case-insensitive
    const filtered = products.filter(p => {
        const brandMatch = p.name ? p.name.toLowerCase().includes(filter.toLowerCase()) : false;
        const apiMatch = p.api ? p.api.toLowerCase().includes(filter.toLowerCase()) : false;
        const categoryMatch = p.cat ? p.cat.toLowerCase().includes(filter.toLowerCase()) : false;
        return brandMatch || apiMatch || categoryMatch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #888;">
                <p style="font-size: 1.5rem;">🔍</p>
                <p>No medications found for "<strong>${filter}</strong>"</p>
                <p style="font-size: 0.8rem;">Try searching for a molecule like "Paracetamol" or "Lonart"</p>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="card">
            <div style="display:flex; justify-content:space-between;">
                <small style="font-size:0.65rem; color:var(--green-mid); font-weight:700; text-transform:uppercase;">${p.cat || 'General'}</small>
                ${p.pom ? '<small style="color:red; font-weight:bold; font-size:0.6rem;">🔴 POM</small>' : ''}
            </div>
            <h3 style="margin:5px 0;">${p.name}</h3>
            <p style="font-size:0.75rem; color:#666; margin-bottom:10px;">${p.api || 'Clinical Molecule'}</p>
            <div class="price">₦${(p.price || 0).toLocaleString()}</div>
            <div style="margin-top:15px;">
                <button class="btn-ai" onclick="window.triggerAI(${p.id})">Consult AI</button>
                <button class="btn-primary" onclick="window.addToPublicCart(${p.id})">Add to Order</button>
            </div>
        </div>
    `).join('');
};

// --- 3. UI HELPERS ---
window.showView = function(view) {
    isAdminMode = (view === 'admin');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    
    document.getElementById('nav-btn-home').classList.toggle('active', view === 'home');
    document.getElementById('nav-btn-admin').classList.toggle('active', view === 'admin');
    
    if (view === 'home') renderPublic(); else renderAdmin();
};

window.handleLogin = function() {
    if (!isAdminMode) {
        const code = prompt("Enter Pharmacy Access Code:");
        if (code === "1234") window.showView('admin');
        else alert("❌ Invalid Code");
    } else {
        window.showView('home');
    }
};

// ... (Rest of your cart and modal logic below)
// Ensure addToPublicCart and saveManualProduct are also globally defined with window.

window.addToPublicCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const ex = publicCart.find(x => x.id === id);
    if (ex) ex.qty++; else publicCart.push({ ...p, qty: 1 });
    window.updateCartUI();
};

// ... (Include updateCartUI, checkoutPublic, etc. using the window. prefix)

// START
init();
