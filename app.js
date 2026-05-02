const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 94.25; 

let userAddr = "", provider, signer;

const stocks = [
    {n:"RELIANCE", p:2985, c:"#e31e24", d:"Reliance Industries"}, 
    {n:"HDFCBANK", p:1532, c:"#00529b", d:"HDFC Bank Ltd"}, 
    {n:"TCS", p:3945, c:"#00a1e1", d:"Tata Consultancy"}
];

function init() {
    const marketList = document.getElementById("marketList");
    const stockSelect = document.getElementById("stockSelect");

    stocks.forEach(s => {
        marketList.innerHTML += `
            <div class="watchlist-item" onclick="goToTrade('${s.p}')">
                <div class="w-info"><div class="w-logo" style="background:${s.c}; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;">${s.n[0]}</div><p>${s.n}</p></div>
                <p>₹${s.p}</p>
            </div>`;
        stockSelect.innerHTML += `<option value="${s.p}">${s.n}</option>`;
    });

    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.onclick = function() {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(this.getAttribute('data-tab')).classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
        };
    });
}

async function connect() {
    if(!window.ethereum) return alert("Install Metamask");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddr = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        updateWalletUI(true);
        fetchBalance();
    } catch(e) { console.error(e); }
}

function toggleProfile() {
    if (!userAddr) connect();
    else document.getElementById("profileMenu").classList.toggle("show");
}

function disconnectWallet() {
    userAddr = ""; 
    location.reload(); 
}

function copyAddr() {
    navigator.clipboard.writeText(userAddr);
    alert("Address Copied!");
    document.getElementById("profileMenu").classList.remove("show");
}

function updateWalletUI(isConnected) {
    const label = document.getElementById("walletLabel");
    const dot = document.getElementById("dot");
    if (isConnected) {
        label.innerText = userAddr.substring(0,4) + "..." + userAddr.slice(-4).toUpperCase();
        dot.className = "bg-green-500 w-2 h-2 rounded-full";
        dot.classList.remove("animate-pulse");
    }
}

async function fetchBalance() {
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddr);
    document.getElementById("userPortfolio").innerText = "₹" + (ethers.utils.formatUnits(bal, 6) * INR_RATE).toLocaleString();
}

window.onload = init;
