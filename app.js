<script>
        // --- CONFIGURATION ---
        const USDC_ADDR = "0x3600000000000000000000000000000000000000";
        const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
        const ARC_CHAIN_ID = '0x4cef52'; 
        const RPC_URL = 'https://rpc.testnet.arc.network';
        const INR_RATE = 94.25; 
        
        let userAddr = "", provider, signer;

        const stocks = [
            {n:"RELIANCE", p:2985}, {n:"HDFCBANK", p:1532}, {n:"TCS", p:3945}, {n:"TATAMOTORS", p:1012}, {n:"SBIN", p:825},
            {n:"ZOMATO", p:188}, {n:"ADANIENT", p:3120}, {n:"ITC", p:420}, {n:"WIPRO", p:455}, {n:"TITAN", p:3240}
        ];

        // Initialize Market List without touching layout
        function init() {
            const list = document.getElementById("marketList");
            list.innerHTML = ""; // Clear for re-init
            stocks.forEach(s => {
                list.innerHTML += `<div class="watchlist-item" onclick="goToTrade('${s.p}')">
                    <div class="w-info"><div class="w-logo" style="background:#334155;">${s.n[0]}</div><p>${s.n}</p></div>
                    <p>₹${s.p}</p>
                </div>`;
            });
        }

        // --- WALLET CONNECT LOGIC ---
        async function connect() {
            if(!window.ethereum) return alert("Install Metamask");
            
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                
                // Automatic Network Switch to Arc Testnet
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
                
                // Update UI to 0x...last 4 chars
                document.getElementById("walletBtn").innerText = userAddr.substring(0,4) + "..." + userAddr.slice(-4).toUpperCase();
                document.getElementById("walletBtn").style.background = "var(--buy-green)";
                
                fetchBalance();
            } catch (e) {
                console.error("Connection failed", e);
            }
        }

        // --- CALCULATION & TRADING ---
        function updateCalc() {
            const price = document.getElementById("stockSelect").value;
            const qty = document.getElementById("tradeQty").value || 1;
            const inr = price * qty;
            document.getElementById("calcInr").innerText = "₹" + inr.toLocaleString('en-IN');
            document.getElementById("calcUsdc").innerText = (inr / INR_RATE).toFixed(2) + " USDC";
        }

        async function processTrade(type) {
            if(!userAddr) return connect();
            const btn = event.target;
            try {
                const usdcAmt = document.getElementById("calcUsdc").innerText.split(' ')[0];
                btn.innerText = "WAITING...";
                
                const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address to, uint256 value) public returns (bool)"], signer);
                const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(usdcAmt, 6));
                
                btn.innerText = "CONFIRMING...";
                await tx.wait();
                alert(`Stock ${type} completed on Arc Testnet!`);
                fetchBalance();
            } catch(e) { 
                alert("Transaction Failed!"); 
                console.error(e);
            } finally {
                btn.innerText = type;
            }
        }

        // --- NAVIGATION & UTILS ---
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

        async function fetchBalance() {
            if(!userAddr) return;
            try {
                const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
                const bal = await contract.balanceOf(userAddr);
                const f = ethers.utils.formatUnits(bal, 6);
                document.getElementById("userPortfolio").innerText = "₹" + (parseFloat(f) * INR_RATE).toLocaleString('en-IN');
            } catch(e) {
                console.error("Balance fetch error", e);
            }
        }

        window.onload = init;
    </script>
