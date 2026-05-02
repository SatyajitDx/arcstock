/**
 * INDISTOCK - Updated Connection & UI Logic
 */

const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const INR_RATE = 94.25; 

let userAddr = "", provider, signer;

async function connect() {
    if (!window.ethereum) return alert("MetaMask is not installed!");

    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
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

function updateWalletUI(isConnected) {
    const walletBtn = document.getElementById("walletBtn");
    const headerContainer = walletBtn.parentElement;
    
    // Remove existing disconnect button if it exists
    const existingDisconnect = document.getElementById("disconnectBtn");
    if (existingDisconnect) existingDisconnect.remove();

    if (isConnected) {
        // Format: 0x... + last 5 characters
        const formattedAddr = userAddr.substring(0, 4) + "..." + userAddr.slice(-5).toUpperCase();
        walletBtn.innerText = formattedAddr;
        walletBtn.style.background = "var(--buy-green)";
        walletBtn.onclick = null; // Disable click on the address button

        // Create Disconnect Button
        const disconnectBtn = document.createElement("button");
        disconnectBtn.id = "disconnectBtn";
        disconnectBtn.innerText = "Disconnect Wallet";
        disconnectBtn.style.cssText = `
            display: block;
            margin-top: 5px;
            font-size: 9px;
            color: var(--sell-red);
            background: none;
            border: none;
            cursor: pointer;
            font-weight: 700;
            text-transform: uppercase;
        `;
        disconnectBtn.onclick = disconnect;
        
        // Wrap buttons in a container for alignment if necessary
        headerContainer.appendChild(disconnectBtn);
    } else {
        walletBtn.innerText = "Connect Wallet";
        walletBtn.style.background = "var(--accent-blue)";
        walletBtn.onclick = connect;
    }
}

// Ensure init and other functions (fetchBalance, switchTab, etc.) remain in your file.
