// --- CONFIGURATION (From IndiPay Logic) ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT_ADDRESS = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C"; // Stock Liquidity Address
const ARC_CHAIN_ID = '0x4cef52';
const RPC_URL = 'https://rpc.testnet.arc.network';
const INR_RATE = 94.25; // Conversion: 1 USDC = ₹94.25

let userAddress = "", provider, signer;
let currentStock = { name: 'RELIANCE', priceINR: 2985.40 };

// --- WALLET CONNECTION ---
async function connect() {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
    }
    try {
        // Request Accounts
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Switch/Add Arc Testnet
        await window.ethereum.request({ 
            method: 'wallet_switchEthereumChain', 
            params: [{ chainId: ARC_CHAIN_ID }] 
        }).catch(async (e) => {
            if (e.code === 4902) {
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
        });

        setupWallet(accounts[0]);
    } catch (e) { console.error(e); }
}

function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    // Update UI
    const btn = document.getElementById("walletBtn");
    btn.innerText = addr.substring(0, 6) + "..." + addr.slice(-4).toUpperCase();
    btn.style.background = "#10b981";
    
    fetchBalance();
}

// --- BALANCE FETCHING ---
async function fetchBalance() {
    if(!userAddress) return;
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const formattedBal = ethers.utils.formatUnits(bal, 6); // USDC usually uses 6 decimals
    
    // Update Portfolio Header
    const portfolioInr = (formattedBal * INR_RATE).toLocaleString('en-IN');
    document.getElementById("userPortfolio").innerText = `₹${portfolioInr}`;
}

// --- STOCK TRADING LOGIC ---
function openMarket(name, price) {
    currentStock = { name, priceINR: price };
    document.getElementById('mStockName').innerText = name;
    document.getElementById('mPrice').innerText = '₹' + price.toLocaleString('en-IN');
    
    // Calculate USDC Cost using IndiPay Rate
    const usdcCost = (price / INR_RATE).toFixed(6);
    document.getElementById('usdcCost').innerText = `${usdcCost} USDC`;
    
    switchTab('market', document.querySelectorAll('.nav-item')[1]);
}

async function handleTrade(type) {
    if (!userAddress) return connect();

    const btn = event.target;
    const originalText = btn.innerText;
    const usdcAmount = (currentStock.priceINR / INR_RATE).toFixed(6);

    try {
        btn.innerText = "PROCESSING...";
        btn.disabled = true;

        // ERC20 Transfer Logic
        const contract = new ethers.Contract(USDC_ADDR, [
            "function transfer(address to, uint256 value) public returns (bool)"
        ], signer);

        // Define Transaction
        const tx = await contract.transfer(
            MERCHANT_ADDRESS, 
            ethers.utils.parseUnits(usdcAmount, 6),
            {
                gasPrice: ethers.utils.parseUnits("22", "gwei"),
                gasLimit: 100000 
            }
        );

        btn.innerText = "VERIFYING...";
        const receipt = await tx.wait(); // Wait for block confirmation

        if (receipt.status === 1) {
            alert(`SUCCESS! Purchased 1 share of ${currentStock.name} for ${usdcAmount} USDC.\nRef: ${tx.hash.substring(0,12)}...`);
            fetchBalance();
        }
    } catch (e) {
        console.error("TRADE ERROR:", e);
        alert(e.code === 4001 ? "Transaction Cancelled" : "Failed. Check balance/gas.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- NAVIGATION ---
function switchTab(id, el) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}
