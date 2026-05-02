const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const INR_RATE = 94.25; 

let userAddr = "", provider, signer;

const stocks = [
    {n:"RELIANCE", p:2985, c:"#e31e24", d:"Reliance Industries"}, 
    {n:"HDFCBANK", p:1532, c:"#00529b", d:"HDFC Bank Ltd"}, 
    {n:"TCS", p:3945, c:"#00a1e1", d:"Tata Consultancy"},
    {n:"TATAMOTORS", p:1012, c:"#ff8c00", d:"Tata Motors Ltd"},
    {n:"SBIN", p:825, c:"#007cc3", d:"State Bank of India"},
    {n:"WIPRO", p:455, c:"#4b2b8d", d:"Wipro Limited"}
];

function init() {
    const marketList = document.getElementById("marketList");
    const featuredList = document.getElementById("featuredList");
    const homeWatchlist = document.getElementById("homeWatchlist");
    const stockSelect = document.getElementById("stockSelect");

    // Dynamic UI Generation
    stocks.forEach((s, idx) => {
        if(marketList) marketList.innerHTML += `
            <div class="watchlist-item" onclick="goToTrade('${s.p}')">
                <div class="w-info"><div class="w-logo" style="background:${s.c};">${s.n[0]}</div><p>${s.n}</p></div>
                <p>₹${s.p}</p>
            </div>`;
        
        if(idx < 3 && featuredList) featuredList.innerHTML += `
            <div class="featured-card" onclick="goToTrade('${s.p}')">
                <div class="f-logo" style="background:${s.c};">${s.n[0]}</div>
                <p style="font-size:12px; font-weight:700;">${s.n}</p>
                <p style="font-weight:800;">₹${s.p}</p>
            </div>`;

        if(idx >= 3 && homeWatchlist) homeWatchlist.innerHTML += `
            <div class="watchlist-item" onclick="goToTrade('${s.p}')">
                <div class="w-info"><div class="w-logo" style="background:${s.c};">${s.n[0]}</div>
                <div><p style="font-weight:700;">${s.n}</p><p style="font-size:10px; color:var(--text-dim);">${s.d}</p></div></div>
                <p>₹${s.p}</p>
            </div>`;

        if(stockSelect) stockSelect.innerHTML += `<option value="${s.p}">${s.n}</option>`;
    });

    // CRITICAL: Linking the button correctly
    const connBtn = document.getElementById("walletBtn");
    if(connBtn) connBtn.onclick = connect;

    document.getElementById("stockSelect").onchange = updateCalc;
    document.getElementById("tradeQty").oninput = updateCalc;
    document.getElementById("buyBtn").onclick = () => processTrade('BUY');
    document.getElementById("sellBtn").onclick = () => processTrade('SELL');
    
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.onclick = function() { switchTab(this.getAttribute('data-tab'), this); };
    });

    updateCalc();
}

async function connect() {
    if(!window.ethereum) return alert("Install Metamask");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Auto-switch Network
        try {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] });
        } catch (err) {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{ chainId: ARC_CHAIN_ID, chainName: 'Arc Testnet', rpcUrls: [RPC_URL], nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, blockExplorerUrls: ['https://testnet.arcscan.app'] }]
                });
            }
        }

        userAddr = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        updateWalletUI(true);
        fetchBalance();
    } catch(e) { console.error(e); }
}

function updateWalletUI(isConnected) {
    const btn = document.getElementById("walletBtn");
    const wrap = document.getElementById("walletWrapper");
    const old = document.getElementById("disconnectBtn");
    if (old) old.remove();

    if (isConnected) {
        btn.innerText = userAddr.substring(0,4) + "..." + userAddr.slice(-4).toUpperCase();
        btn.style.background = "var(--buy-green)";
        btn.onclick = null;
        
        const dsc = document.createElement("button");
        dsc.id = "disconnectBtn"; dsc.innerText = "Disconnect";
        dsc.onclick = () => { location.reload(); }; 
        wrap.appendChild(dsc);
    }
}

function updateCalc() {
    const p = document.getElementById('stockSelect').value;
    const q = document.getElementById('tradeQty').value || 1;
    document.getElementById('calcInr').innerText = "₹" + (p * q).toLocaleString();
    document.getElementById('calcUsdc').innerText = ((p * q) / INR_RATE).toFixed(2) + " USDC";
}

function switchTab(id, el) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}

function goToTrade(p) { 
    switchTab('market', document.querySelector('[data-tab="market"]')); 
    document.getElementById('stockSelect').value = p; 
    updateCalc(); 
}

async function fetchBalance() {
    if(!userAddr) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddr);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("userPortfolio").innerText = "₹" + (parseFloat(f) * INR_RATE).toLocaleString('en-IN');
    } catch(e) { console.error(e); }
}

async function processTrade(type) {
    if(!userAddr) return connect();
    try {
        const amt = document.getElementById("calcUsdc").innerText.split(' ')[0];
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address to, uint256 value) public returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(amt, 6));
        await tx.wait();
        alert(`Stock ${type} success!`);
        fetchBalance();
    } catch(e) { alert("Failed!"); }
}

window.onload = init;
