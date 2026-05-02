const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const INR_RATE = 94.25;

// Arc Testnet Details for Auto Switch
const ARC_CHAIN_ID = '0x4cef52'; // Hex for Arc Testnet
const ARC_RPC = 'https://rpc.testnet.arc.network';

let userAddr = "", provider, signer;

async function connect() {
    if (!window.ethereum) return alert("Install Metamask");
    
    try {
        // 1. Request Accounts
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddr = accounts[0];

        // 2. Auto Switch to Arc Chain
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (switchError) {
            // Agar chain add nahi hai toh add karne ka prompt
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Testnet',
                        rpcUrls: [ARC_RPC],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                        blockExplorerUrls: ['https://testnet.arcscan.app']
                    }]
                });
            }
        }

        // 3. Setup Provider & Signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // 4. UI Update: Show Address on Button
        const btn = document.getElementById("walletBtn");
        const label = document.getElementById("walletLabel");
        const shortAddr = userAddr.substring(0, 6) + "..." + userAddr.substring(userAddr.length - 4);
        
        label.innerText = shortAddr;
        btn.style.background = "#10b981"; // Change to green on success
        
        fetchBalance();
    } catch (error) {
        console.error("Connection failed", error);
    }
}

// Portfolio balance fetch logic
async function fetchBalance() {
    if(!userAddr) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddr);
        const f = ethers.utils.formatUnits(bal, 6);
        // Portfolio display logic
        document.getElementById("userPortfolio").innerText = "₹" + (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) {
        console.error("Balance fetch error");
    }
}
