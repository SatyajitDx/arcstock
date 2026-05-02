/**
 * INDISTOCK - Decentralized Indian Equity Logic
 * Unified app.js based on your HTML structure
 */

// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const INR_RATE = 94.25; 

let userAddr = "", provider, signer;

const stocks = [
    {n:"RELIANCE", p:2985}, {n:"HDFCBANK", p:1532}, {n:"TCS", p:3945}, 
    {n:"TATAMOTORS", p:1012}, {n:"SBIN", p:825}, {n:"ZOMATO", p:188}, 
    {n:"ADANIENT", p:3120}, {n:"ITC", p:420}, {n:"WIPRO", p:455}, {n:"TITAN", p:3240}
];

// --- INITIALIZATION ---
function init() {
    const list = document.getElementById("marketList");
    if (list) {
        list.innerHTML = ""; // Clear list
        stocks.forEach(s => {
            list.innerHTML += `
                <div class="watchlist-item" onclick="goToTrade('${s.p}')">
                    <div class="w-info">
                        <div class="w-logo" style="background:#334155;">${s.n[0]}</div>
                        <div class="w-name">
                            <p>${s.n}</p>
                            <p>Equity Token</p>
                        </div>
                    </div>
                    <p>₹${s.p}</p>
                </div>`;
        });
    }
}

// --- WALLET CORE LOGIC ---
async function connect() {
    if (!window.ethereum) return alert("MetaMask is not installed!");

    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Auto-switch to Arc Testnet
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Testnet',
                        rpcUrls: [RPC_URL],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                        blockExplorerUrls: ['https://testnet.arcscan.app']
                    }]
                });
            }
        }

        userAddr = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        updateWalletUI(true);
        fetchBalance();
        
    } catch (e) {
        console.error("Connection failed", e);
    }
}

function disconnect() {
    userAddr = "";
    provider = null;
    signer = null;
    updateWalletUI(false);
    document.getElementById("userPortfolio").innerText = "₹0.00";
}

// --- UI UPDATES (ADDRESS & DISCONNECT) ---
function updateWalletUI(isConnected) {
    const walletBtn = document.getElementById("walletBtn");
    const container = walletBtn.parentElement;
    
    // Remove existing disconnect button if any
    const oldDsc = document.getElementById("disconnectBtn");
    if (oldDsc) oldDsc.remove();

    if (isConnected) {
        // Format: 0x... (last 5 words/characters)
        const formattedAddr = userAddr.substring(0, 4) + "..." + userAddr.slice(-5).toUpperCase();
        walletBtn.innerText = formattedAddr;
        walletBtn.style.background = "var(--buy-green)";
        walletBtn.onclick = null; // Disable connect click while connected

        // Create and append Disconnect Button
        const dscBtn = document.createElement("button");
        dscBtn.id = "disconnectBtn";
        dscBtn.innerText = "Disconnect Wallet";
        dscBtn.style.cssText = `
            display: block;
            margin-top: 6px;
            font-size: 10px;
            color: var(--sell-red);
            background: none;
            border: none;
            cursor: pointer;
            font-weight: 800;
            text-transform: uppercase;
            width: 100%;
            text-align: center;
        `;
        dscBtn.onclick = disconnect;
        container.appendChild(dscBtn);
    } else {
        walletBtn.innerText = "Connect Wallet";
        walletBtn.style.background = "var(--accent-blue)";
        walletBtn.onclick = connect;
    }
}

// --- TRADING LOGIC ---
function updateCalc() {
    const price = document.getElementById("stockSelect").value;
    const qty = document.getElementById("tradeQty").value;
    const inr = price * qty;
    document.getElementById("calcInr").innerText = "₹" + inr.toLocaleString('en-IN');
    document.getElementById("calcUsdc").innerText = (inr / INR_RATE).toFixed(2) + " USDC";
}

async function processTrade(type) {
    if (!userAddr) return connect();
    
    const btn = event.target;
    try {
        const usdcAmt = document.getElementById("calcUsdc").innerText.split(' ')[0];
        btn.innerText = "WAITING...";

        const contract = new ethers.Contract(USDC_ADDR, [
            "function transfer(address to, uint256 value) public returns (bool)"
        ], signer);

        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(usdcAmt, 6));
        
        btn.innerText = "CONFIRMING...";
        await tx.wait();
        
        alert(`Stock ${type} Completed Successfully!`);
        fetchBalance();
    } catch (e) {
        console.error(e);
        alert("Transaction Failed!");
    } finally {
        btn.innerText = type;
    }
}

// --- UTILS ---
async function fetchBalance() {
    if (!userAddr) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddr);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("userPortfolio").innerText = "₹" + (parseFloat(f) * INR_RATE).toLocaleString('en-IN');
    } catch (e) {
        console.error(e);
    }
}

function switchTab(id, el) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
}

function goToTrade(price) {
    switchTab('market', document.querySelectorAll('.nav-item')[1]);
    document.getElementById('stockSelect').value = price;
    updateCalc();
}

window.onload = init;
