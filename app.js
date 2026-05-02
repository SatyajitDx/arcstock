const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const INR_RATE = 94.25; 

let userAddr = "", provider, signer;

// --- WALLET CONNECTION LOGIC ---
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

// --- DISCONNECT LOGIC ---
function disconnect() {
    userAddr = "";
    provider = null;
    signer = null;
    updateWalletUI(false);
    document.getElementById("userPortfolio").innerText = "₹0.00";
    alert("Wallet Disconnected");
}

// --- UI UPDATE LOGIC ---
function updateWalletUI(isConnected) {
    const walletBtn = document.getElementById("walletBtn");
    const container = walletBtn.parentElement;
    
    // Remove old disconnect button if it exists
    const oldDsc = document.getElementById("disconnectBtn");
    if (oldDsc) oldDsc.remove();

    if (isConnected) {
        // Address format: 0x... + last 5 characters
        const formattedAddr = userAddr.substring(0, 4) + "..." + userAddr.slice(-5).toUpperCase();
        walletBtn.innerText = formattedAddr;
        walletBtn.style.background = "var(--buy-green)";
        walletBtn.onclick = null; // Address button click disabled

        // Add Disconnect Button below
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

// --- BALANCE & NAV UTILS ---
async function fetchBalance() {
    if(!userAddr) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddr);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("userPortfolio").innerText = "₹" + (parseFloat(f) * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.error(e); }
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
    if(typeof updateCalc === 'function') updateCalc();
}

window.onload = () => {
    // Initial UI Setup
    updateWalletUI(false);
};
