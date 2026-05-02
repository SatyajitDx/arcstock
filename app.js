/**
 * ARC INDIPAY - OFFICIAL WEB3 LOGIC
 * Integrated with your Glass UI & Dropdown Menu
 */

const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const INR_RATE = 94.25; 

let userAddr = "", provider, signer;

// --- WALLET CORE ---
async function connect() {
    if (!window.ethereum) return alert("Please install MetaMask!");

    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Auto-switch to Arc Testnet
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (err) {
            if (err.code === 4902) {
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
        
        updateUI(true);
        fetchBalance();
        
    } catch (e) {
        console.error("Connection failed", e);
    }
}

function disconnectWallet() {
    userAddr = "";
    provider = null;
    signer = null;
    updateUI(false);
    toggleProfile(); // Close dropdown
    document.getElementById("usdcBal").innerText = "0.00";
    document.getElementById("inrBal").innerText = "0.00";
}

// --- UI UPDATES ---
function updateUI(isConnected) {
    const label = document.getElementById("walletLabel");
    const dot = document.getElementById("dot");
    const menu = document.getElementById("profileMenu");

    if (isConnected) {
        // Formatted Address: Prefix + last 5 characters
        const displayAddr = userAddr.substring(0, 4) + "..." + userAddr.slice(-5).toUpperCase();
        label.innerText = displayAddr;
        dot.classList.replace("bg-red-500", "bg-green-500");
    } else {
        label.innerText = "Connect Wallet";
        dot.classList.replace("bg-green-500", "bg-red-500");
    }
}

function toggleProfile() {
    if(!userAddr) {
        connect();
    } else {
        document.getElementById("profileMenu").classList.toggle("show");
    }
}

// --- UTILS ---
async function fetchBalance() {
    if (!userAddr) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddr);
        const usdc = ethers.utils.formatUnits(bal, 6);
        
        document.getElementById("usdcBal").innerText = parseFloat(usdc).toFixed(2);
        document.getElementById("inrBal").innerText = (parseFloat(usdc) * INR_RATE).toLocaleString('en-IN');
    } catch (e) {
        console.error(e);
    }
}

function copyAddr() {
    if(userAddr) {
        navigator.clipboard.writeText(userAddr);
        alert("Address Copied!");
        toggleProfile();
    }
}

// Close dropdown when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.relative')) {
        const dropdowns = document.getElementsByClassName("dropdown-menu");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
}
