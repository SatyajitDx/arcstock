<script>
    const USDC_ADDR = "0x3600000000000000000000000000000000000000";
    const MERCHANT = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
    const INR_RATE = 94.25;
    let userAddr = "", provider, signer;

    const stocks = [
        {n:"RELIANCE", p:2985}, {n:"HDFCBANK", p:1532}, {n:"TCS", p:3945}, {n:"TATAMOTORS", p:1012}, {n:"SBIN", p:825},
        {n:"ZOMATO", p:188}, {n:"ADANIENT", p:3120}, {n:"ITC", p:420}, {n:"WIPRO", p:455}, {n:"TITAN", p:3240}
    ];

    function init() {
        const list = document.getElementById("marketList");
        list.innerHTML = ""; // Clear existing
        stocks.forEach(s => {
            list.innerHTML += `<div class="watchlist-item" onclick="goToTrade('${s.p}')">
                <div class="w-info"><div class="w-logo" style="background:#334155;">${s.n[0]}</div><p>${s.n}</p></div>
                <p>₹${s.p}</p>
            </div>`;
        });
    }

    function goToTrade(price) {
        switchTab('market', document.querySelectorAll('.nav-item')[1]);
        document.getElementById('stockSelect').value = price;
        updateCalc();
    }

    // --- CONNECT WALLET FIX ---
    async function connect() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request accounts
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                userAddr = accounts[0];
                
                // Initialize Ethers Provider
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();

                // Update UI
                const btn = document.getElementById("walletBtn");
                btn.innerText = userAddr.substring(0,6) + "..." + userAddr.slice(-4).toUpperCase();
                btn.style.background = "#10b981"; // Success Green

                console.log("Connected:", userAddr);
                fetchBalance();
            } catch (err) {
                console.error("User rejected connection", err);
                alert("Connection rejected by user.");
            }
        } else {
            alert("MetaMask nahi mila! Please install MetaMask extension.");
            window.open('https://metamask.io/download/', '_blank');
        }
    }

    function updateCalc() {
        const price = document.getElementById("stockSelect").value;
        const qty = document.getElementById("tradeQty").value;
        const inr = price * qty;
        document.getElementById("calcInr").innerText = "₹" + inr.toLocaleString();
        document.getElementById("calcUsdc").innerText = (inr / INR_RATE).toFixed(2) + " USDC";
    }

    async function processTrade(type) {
        if(!userAddr) {
            await connect();
            if(!userAddr) return;
        }
        
        try {
            const usdcAmt = document.getElementById("calcUsdc").innerText.split(' ')[0];
            const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address to, uint256 value) public returns (bool)"], signer);
            
            // Note: USDC usually has 6 decimals
            const amountInUnits = ethers.utils.parseUnits(usdcAmt, 6);
            
            const tx = await contract.transfer(MERCHANT, amountInUnits);
            alert(`Order Sent to Blockchain... Hash: ${tx.hash.substring(0,10)}`);
            
            await tx.wait();
            alert(`Order Confirmed! Stock ${type} complete.`);
            fetchBalance();
        } catch(e) {
            console.error(e);
            alert("Transaction Failed! Check balance or Network.");
        }
    }

    function switchTab(id, el) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if(el) el.classList.add('active');
    }

    async function fetchBalance() {
        if(!userAddr || !provider) return;
        try {
            const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
            const bal = await contract.balanceOf(userAddr);
            const f = ethers.utils.formatUnits(bal, 6);
            document.getElementById("userPortfolio").innerText = "₹" + (f * INR_RATE).toLocaleString('en-IN', {maximumFractionDigits: 2});
        } catch (e) {
            console.error("Balance fetch error:", e);
        }
    }

    window.onload = init;
</script>
