/**
 * INDISTOCK - Decentralized Indian Equity Trading Logic
 * Chain: Arc Testnet (0x4cef52)
 * Asset: USDC (6 Decimals)
 */

// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // USDC Contract
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C"; // Liquidity Merchant
const ARC_CHAIN_ID = '0x4cef52'; // Arc Testnet Chain ID
const RPC_URL = 'https://rpc.testnet.arc.network'; // Arc RPC
const INR_RATE = 94.25; // Conversion: 1 USDC = ₹94.25

let userAddr = "", provider, signer;

// Initial Stocks for Market Overview
const stocks = [
    {n:"RELIANCE", p:2985}, {n:"HDFCBANK", p:1532}, {n:"TCS", p:3945}, 
    {n:"TATAMOTORS", p:1012}, {n:"SBIN", p:825}, {n:"WIPRO", p:455},
    {n:"INFY", p:1420}, {n:"ADANIENT", p:3120}, {n:"ZOMATO", p:188}, {n:"TITAN", p:3240}
];

// --- INITIALIZATION ---
function init() {
    const list = document.getElementById("marketList");
    if (list) {
        stocks.forEach(s => {
            list.innerHTML += `
                <div class="watchlist-item" onclick="goToTrade('${s.p}')">
                    <div class="w-info">
                        <div class="w-logo" style="background:#334155;">${s.n[0]}</div>
                        <div class="w-name">
                            <p>${s.n}</p>
                            <p>Indian Equity</p>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <p style="font-weight:700;">₹${s.p}</p>
                        <p style="color:var(--buy-green); font-size:10px;">Trade Now</p>
                    </div>
                </div>`;
        });
    }
}

// --- WALLET & NETWORK LOGIC ---
async function connect() {
    if (!window.ethereum) return alert("MetaMask is not installed!");

    try {
        // Request Account Access
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Automatic Network Switching Logic
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (switchError) {
            // Add Arc Testnet if it doesn't exist in MetaMask
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
        
        // Update UI Button
        document.getElementById("walletBtn").innerText = userAddr.substring(0,6) + "..." + userAddr.slice(-4).toUpperCase();
        
        // Fetch real-time Portfolio Balance
        fetchBalance();
        
    } catch (e) {
        console.error("Connection failed", e);
    }
}

// --- PORTFOLIO & DATA FETCHING ---
async function fetchBalance() {
    if (!userAddr) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddr);
        const usdc = ethers.utils.formatUnits(bal, 6);
        
        // Convert USDC to INR for Portfolio Display
        const inrValue = (parseFloat(usdc) * INR_RATE).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        document.getElementById("userPortfolio").innerText = "₹" + inrValue;
    } catch (e) {
        console.error("Error fetching balance", e);
    }
}

// --- TRADING SYSTEM ---
function updateCalc() {
    const price = document.getElementById("stockSelect").value;
    const qty = document.getElementById("tradeQty").value;
    const inrTotal = price * qty;
    
    // Auto-calculate USDC cost for the transaction
    document.getElementById("calcInr").innerText = "₹" + inrTotal.toLocaleString('en-IN');
    document.getElementById("calcUsdc").innerText = (inrTotal / INR_RATE).toFixed(2) + " USDC";
}

async function processTrade(type) {
    if (!userAddr) return connect();
    
    const btn = event.target;
    try {
        const usdcAmt = document.getElementById("calcUsdc").innerText.split(' ')[0];
        btn.innerText = "PROCESSING...";
        btn.disabled = true;

        const contract = new ethers.Contract(USDC_ADDR, [
            "function transfer(address to, uint256 value) public returns (bool)"
        ], signer);

        // Initiate Blockchain Transaction
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(usdcAmt, 6));
        
        btn.innerText = "CONFIRMING...";
        await tx.wait(); // Wait for block confirmation
        
        alert(`Transaction Successful! Stock ${type} complete.`);
        fetchBalance(); // Update Portfolio immediately
        
    } catch (e) {
        console.error(e);
        alert("Transaction Failed! Please check your balance and gas.");
    } finally {
        btn.innerText = type;
        btn.disabled = false;
    }
}

// --- UI NAVIGATION ---
function switchTab(id, el) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
}

// Jump from Home screen card to Trade screen
function goToTrade(price) {
    switchTab('market', document.querySelectorAll('.nav-item')[1]);
    document.getElementById('stockSelect').value = price;
    updateCalc();
}

window.onload = init;
