const ETHERS_CDN = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";

function loadEthers() {
    return new Promise((resolve, reject) => {
        if (window.ethers) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = ETHERS_CDN;
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Ethers library failed to load"));

        document.head.appendChild(script);
    });
}

const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT_ADDRESS = "0x589c5c0C9ce60ce6624480b9E9770b61A8934a8a";
const ARC_CHAIN_ID = "0x4cef52";
const RPC_URL = "https://rpc.testnet.arc.network";
const INR_RATE = 94.25;

let userAddress = "";
let provider;
let signer;
let pendingTrade = null;
let appWalletUsdcBalance = Number(localStorage.getItem("appWalletUsdcBalance")) || 0;

const stocks = [
    { n: "RELIANCE", p: 2985, c: "#e31e24" },
    { n: "HDFCBANK", p: 1532, c: "#00529b" },
    { n: "TCS", p: 3945, c: "#00a1e1" },
    { n: "TATAMOTORS", p: 1012, c: "#ff8c00" },
    { n: "SBIN", p: 825, c: "#007cc3" },
    { n: "ZOMATO", p: 188, c: "#e23744" },
    { n: "ADANIENT", p: 3120, c: "#334155" },
    { n: "ITC", p: 420, c: "#0f766e" },
    { n: "WIPRO", p: 455, c: "#4b2b8d" },
    { n: "TITAN", p: 3240, c: "#b45309" }
];

let holdings = JSON.parse(localStorage.getItem("indistockHoldings")) || {};
let history = JSON.parse(localStorage.getItem("indistockHistory")) || [];

window.addEventListener("load", async () => {
    try {
        await loadEthers();

        initMarket();
        updateCalc();
        renderHoldings();
        renderHistory();
        updatePortfolioValue();
        updateAppWalletBalance();

        if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
            try {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length > 0) {
                    await setupWallet(accounts[0], false);
                }
            } catch (error) {
                console.error("Auto wallet restore failed:", error);
            }
        }

        if (window.ethereum) {
            window.ethereum.on("accountsChanged", async (accounts) => {
                if (!accounts || accounts.length === 0) {
                    disconnectWalletUI();
                    return;
                }

                await setupWallet(accounts[0], false);
            });

            window.ethereum.on("chainChanged", () => {
                window.location.reload();
            });
        }
    } catch (error) {
        console.error(error);
        showValidationError(error.message || "App failed to load");
    }
});

function initMarket() {
    const list = document.getElementById("marketList");
    if (!list) return;

    list.innerHTML = "";

    stocks.forEach((stock) => {
        const change = getRandomChange();
        const changeColor = change >= 0 ? "var(--buy-green)" : "var(--sell-red)";
        const changeText = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

        list.innerHTML += `
            <div class="watchlist-item" onclick="goToTrade('${stock.p}')">
                <div class="w-info">
                    <div class="w-logo" style="background:${stock.c};">${stock.n[0]}</div>
                    <div class="w-name">
                        <p>${stock.n}</p>
                        <p style="font-size:11px; color:var(--text-dim);">Indian Equity Token</p>
                    </div>
                </div>
                <p style="font-weight:700;">
                    ₹${stock.p.toLocaleString("en-IN")}
                    <span style="color:${changeColor}; font-size:10px;">${changeText}</span>
                </p>
            </div>
        `;
    });
}

function getRandomChange() {
    return Number((Math.random() * 6 - 2.5).toFixed(2));
}

async function connectWallet() {
    try {
        await loadEthers();

        if (!window.ethereum) {
            const currentUrl = window.location.href.replace(/https?:\/\//, "");
            window.location.href = "https://metamask.app.link/dapp/" + currentUrl;
            return;
        }

        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        if (!accounts || accounts.length === 0) {
            showValidationError("No wallet account found");
            return;
        }

        await addOrSwitchArcChain();
        await setupWallet(accounts[0], true);
    } catch (error) {
        console.error("Wallet connection failed:", error);

        if (error.code === 4001) {
            showValidationError("Wallet connection rejected");
            return;
        }

        showValidationError(error.message || "Wallet connection failed");
    }
}

async function addOrSwitchArcChain() {
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ARC_CHAIN_ID }]
        });
    } catch (switchError) {
        if (switchError.code !== 4902) {
            throw switchError;
        }

        await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: ARC_CHAIN_ID,
                chainName: "Arc Testnet",
                rpcUrls: [RPC_URL],
                nativeCurrency: {
                    name: "USDC",
                    symbol: "USDC",
                    decimals: 18
                },
                blockExplorerUrls: ["https://testnet.arcscan.app"]
            }]
        });

        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ARC_CHAIN_ID }]
        });
    }
}

async function setupWallet(address, shouldSave) {
    await loadEthers();

    userAddress = address;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    const btn = document.getElementById("walletBtn");
    if (btn) {
        btn.innerText = shortAddress(address);
        btn.classList.add("btn-connected");
    }

    if (shouldSave) {
        localStorage.setItem("isWalletConnected", "true");
    }

    updatePortfolioValue();
    updateAppWalletBalance();
}

function disconnectWalletUI() {
    userAddress = "";
    provider = null;
    signer = null;

    const btn = document.getElementById("walletBtn");
    if (btn) {
        btn.innerText = "Connect Wallet";
        btn.classList.remove("btn-connected");
    }

    updatePortfolioValue();
    updateAppWalletBalance();
    localStorage.removeItem("isWalletConnected");
}

function shortAddress(address) {
    return address.substring(0, 6) + "..." + address.slice(-4).toUpperCase();
}

function connect() {
    connectWallet();
}

function updateCalc() {
    const stockSelect = document.getElementById("stockSelect");
    const qtyInput = document.getElementById("tradeQty");

    if (!stockSelect || !qtyInput) return;

    const price = Number(stockSelect.value);
    const qty = Math.max(1, Number(qtyInput.value || 1));
    const inr = price * qty;
    const usdc = inr / INR_RATE;

    document.getElementById("calcInr").innerText = "₹" + inr.toLocaleString("en-IN");
    document.getElementById("calcUsdc").innerText = usdc.toFixed(2) + " USDC";
}

function getSelectedStock() {
    const price = Number(document.getElementById("stockSelect").value);
    return stocks.find((stock) => stock.p === price) || stocks[0];
}

function goToTrade(price) {
    switchTab("market", document.querySelectorAll(".nav-item")[1]);

    const stockSelect = document.getElementById("stockSelect");
    stockSelect.value = price;

    updateCalc();
}

async function processTrade(type) {
    if (!userAddress) {
        await connectWallet();
        if (!userAddress) return;
    }

    const stock = getSelectedStock();
    const qty = Math.max(1, Number(document.getElementById("tradeQty").value || 1));
    const inrAmount = stock.p * qty;
    const usdcAmount = inrAmount / INR_RATE;

    openTradeModal(type, stock, qty, inrAmount, usdcAmount);
}

function openTradeModal(type, stock, qty, inrAmount, usdcAmount) {
    pendingTrade = { type, stock, qty, inrAmount, usdcAmount };

    const isBuy = type === "BUY";
    const now = new Date().toLocaleString("en-IN");

    document.getElementById("tradeModalTitle").innerText = isBuy ? "Confirm Buy Order" : "Confirm Sell Order";
    document.getElementById("tradeModalSubtitle").innerText = isBuy ? "Review before placing buy order" : "Review before placing sell order";

    const icon = document.getElementById("tradeModalIcon");
    icon.innerText = isBuy ? "↑" : "↓";
    icon.classList.toggle("sell", !isBuy);

    document.getElementById("modalStockName").innerText = stock.n;
    document.getElementById("modalQty").innerText = qty + (qty === 1 ? " share" : " shares");
    document.getElementById("modalAmount").innerText = usdcAmount.toFixed(2) + " USDC";
    document.getElementById("modalDateTime").innerText = now;

    const confirmBtn = document.getElementById("modalConfirmBtn");
    confirmBtn.disabled = false;
    confirmBtn.innerText = isBuy ? "Buy Now" : "Sell Now";
    confirmBtn.classList.toggle("sell", !isBuy);
    confirmBtn.onclick = confirmPendingTrade;

    document.getElementById("tradeModalActions").classList.remove("hidden");
    document.getElementById("modalDoneBtn").classList.add("hidden");
    document.getElementById("tradeModal").classList.remove("hidden");
}

function closeTradeModal() {
    document.getElementById("tradeModal").classList.add("hidden");
    pendingTrade = null;
}

async function confirmPendingTrade() {
    if (!pendingTrade) return;

    const { type, stock, qty, inrAmount, usdcAmount } = pendingTrade;
    const confirmBtn = document.getElementById("modalConfirmBtn");

    confirmBtn.disabled = true;
    confirmBtn.innerText = type === "BUY" ? "Buying..." : "Selling...";

    if (type === "BUY") {
        await executeBuyStock(stock, qty, inrAmount, usdcAmount);
    } else {
        await executeSellStock(stock, qty, inrAmount, usdcAmount);
    }
}

async function executeBuyStock(stock, qty, inrAmount, usdcAmount) {
    try {
        await loadEthers();

        if (!signer) {
            showValidationError("Wallet signer not ready");
            return;
        }

        const usdcContract = new ethers.Contract(
            USDC_ADDR,
            ["function transfer(address to, uint256 value) public returns (bool)"],
            signer
        );

        const tx = await usdcContract.transfer(
            MERCHANT_ADDRESS,
            ethers.utils.parseUnits(usdcAmount.toFixed(6), 6)
        );

        await tx.wait();

        holdings[stock.n] = (holdings[stock.n] || 0) + qty;
        saveHoldings();

        addHistory({
            type: "BUY",
            stock: stock.n,
            qty,
            inrAmount,
            usdcAmount,
            txHash: tx.hash,
            date: new Date().toLocaleString()
        });

        renderHoldings();
        renderHistory();
        updatePortfolioValue();

        showTradeSuccess("BUY", stock, qty, usdcAmount);
    } catch (error) {
        console.error("Buy failed:", error);
        resetTradeConfirmButton("BUY");
        showValidationError(error.message || "Transaction failed");
    }
}

async function executeSellStock(stock, qty, inrAmount, usdcAmount) {
    try {
        const ownedQty = holdings[stock.n] || 0;

        if (ownedQty < qty) {
            resetTradeConfirmButton("SELL");
            showValidationError(`You only have ${ownedQty} ${stock.n}`);
            return;
        }

        holdings[stock.n] -= qty;

        if (holdings[stock.n] <= 0) {
            delete holdings[stock.n];
        }

        appWalletUsdcBalance += usdcAmount;

        saveHoldings();
        saveAppWallet();

        addHistory({
            type: "SELL",
            stock: stock.n,
            qty,
            inrAmount,
            usdcAmount,
            txHash: "APP_WALLET_CREDIT",
            date: new Date().toLocaleString()
        });

        renderHoldings();
        renderHistory();
        updatePortfolioValue();
        updateAppWalletBalance();

        showTradeSuccess("SELL", stock, qty, usdcAmount);
    } catch (error) {
        console.error("Sell failed:", error);
        resetTradeConfirmButton("SELL");
        showValidationError(error.message || "Sell failed");
    }
}

function showTradeSuccess(type, stock, qty, usdcAmount) {
    const isBuy = type === "BUY";

    const icon = document.getElementById("tradeModalIcon");
    icon.innerText = "✓";
    icon.classList.toggle("sell", !isBuy);

    document.getElementById("tradeModalTitle").innerText = isBuy ? "Buy Successful" : "Sell Successful";
    document.getElementById("tradeModalSubtitle").innerText = `${stock.n} order completed successfully`;
    document.getElementById("modalStockName").innerText = stock.n;
    document.getElementById("modalQty").innerText = qty + (qty === 1 ? " share" : " shares");
    document.getElementById("modalAmount").innerText = usdcAmount.toFixed(2) + " USDC";
    document.getElementById("modalDateTime").innerText = new Date().toLocaleString("en-IN");

    document.getElementById("tradeModalActions").classList.add("hidden");
    document.getElementById("modalDoneBtn").classList.remove("hidden");
}

function resetTradeConfirmButton(type) {
    const isBuy = type === "BUY";
    const confirmBtn = document.getElementById("modalConfirmBtn");

    if (!confirmBtn) return;

    confirmBtn.disabled = false;
    confirmBtn.innerText = isBuy ? "Buy Now" : "Sell Now";
}

function getPortfolioValue() {
    let totalValue = 0;

    Object.entries(holdings).forEach(([stockName, qty]) => {
        const stock = stocks.find((item) => item.n === stockName);

        if (stock) {
            totalValue += stock.p * qty;
        }
    });

    return totalValue;
}

function updatePortfolioValue() {
    const totalValue = getPortfolioValue();
    const portfolioEl = document.getElementById("userPortfolio");

    if (!portfolioEl) return;

    portfolioEl.innerText =
        "₹" + totalValue.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
}

function saveHoldings() {
    localStorage.setItem("indistockHoldings", JSON.stringify(holdings));
}

function saveAppWallet() {
    localStorage.setItem("appWalletUsdcBalance", String(appWalletUsdcBalance));
}

function updateAppWalletBalance() {
    const walletInrEl = document.getElementById("appWalletInr");
    const walletUsdcEl = document.getElementById("appWalletUsdc");
    const homeWalletEl = document.getElementById("walletBalanceText");

    const inrValue = appWalletUsdcBalance * INR_RATE;

    if (walletInrEl) {
        walletInrEl.innerText =
            "₹" + inrValue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    }

    if (walletUsdcEl) {
        walletUsdcEl.innerText = appWalletUsdcBalance.toFixed(2) + " USDC";
    }

    if (homeWalletEl) {
        homeWalletEl.innerText =
            "Wallet: ₹" + inrValue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + " (" + appWalletUsdcBalance.toFixed(2) + " USDC)";
    }
}

function switchWalletPanel(panel) {
    const depositPanel = document.getElementById("depositPanel");
    const withdrawPanel = document.getElementById("withdrawPanel");
    const depositBtn = document.getElementById("depositTabBtn");
    const withdrawBtn = document.getElementById("withdrawTabBtn");

    if (!depositPanel || !withdrawPanel || !depositBtn || !withdrawBtn) return;

    depositPanel.classList.toggle("active", panel === "deposit");
    withdrawPanel.classList.toggle("active", panel === "withdraw");

    depositBtn.classList.toggle("active", panel === "deposit");
    withdrawBtn.classList.toggle("active", panel === "withdraw");
}

function depositDemo() {
    const amount = Number(document.getElementById("depositUsdcAmount").value || 0);

    if (!amount || amount <= 0) {
        showValidationError("Enter valid USDC amount");
        return;
    }

    appWalletUsdcBalance += amount;
    saveAppWallet();

    addHistory({
        type: "DEPOSIT",
        stock: "APP WALLET",
        qty: 1,
        inrAmount: amount * INR_RATE,
        usdcAmount: amount,
        txHash: "DEMO_DEPOSIT",
        date: new Date().toLocaleString()
    });

    document.getElementById("depositUsdcAmount").value = "";

    renderHistory();
    updateAppWalletBalance();
    showValidationError(`Deposit successful: ${amount.toFixed(2)} USDC`);
}

async function withdrawUsdc() {
    try {
        if (!userAddress) {
            await connectWallet();
            if (!userAddress) return;
        }

        const amount = Number(document.getElementById("withdrawUsdcAmount").value || 0);

        if (!amount || amount <= 0) {
            showValidationError("Enter valid USDC amount");
            return;
        }

        if (amount > appWalletUsdcBalance) {
            showValidationError("Insufficient wallet balance");
            return;
        }

        const response = await fetch("/api/withdraw-usdc", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userAddress,
                usdcAmount: amount.toFixed(6)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "USDC withdraw failed");
        }

        appWalletUsdcBalance -= amount;
        saveAppWallet();

        addHistory({
            type: "USDC WITHDRAW",
            stock: "ARC WALLET",
            qty: 1,
            inrAmount: amount * INR_RATE,
            usdcAmount: amount,
            txHash: data.txHash,
            date: new Date().toLocaleString()
        });

        document.getElementById("withdrawUsdcAmount").value = "";

        renderHistory();
        updateAppWalletBalance();
        showValidationError(`USDC withdraw successful: ${amount.toFixed(2)} USDC`);
    } catch (error) {
        console.error("USDC withdraw failed:", error);
        showValidationError(error.message || "USDC withdraw failed");
    }
}

function withdrawToBank() {
    const bankName = document.getElementById("bankName").value;
    const fullName = document.getElementById("bankFullName").value.trim();
    const accountNumber = document.getElementById("bankAccountNumber").value.trim();
    const ifsc = document.getElementById("bankIfsc").value.trim().toUpperCase();
    const inrAmount = Number(document.getElementById("bankInrAmount").value || 0);
    const usdcAmount = inrAmount / INR_RATE;

    if (!bankName || !fullName || !accountNumber || !ifsc || !inrAmount) {
        showValidationError("Please fill all bank details");
        return;
    }

    if (inrAmount <= 0) {
        showValidationError("Enter valid INR amount");
        return;
    }

    if (usdcAmount > appWalletUsdcBalance) {
        showValidationError("Insufficient wallet balance");
        return;
    }

    appWalletUsdcBalance -= usdcAmount;
    saveAppWallet();

    addHistory({
        type: "BANK WITHDRAW",
        stock: bankName,
        qty: 1,
        inrAmount,
        usdcAmount,
        txHash: "DEMO_BANK_WITHDRAW",
        date: new Date().toLocaleString()
    });

    document.getElementById("bankName").value = "";
    document.getElementById("bankFullName").value = "";
    document.getElementById("bankAccountNumber").value = "";
    document.getElementById("bankIfsc").value = "";
    document.getElementById("bankInrAmount").value = "";

    renderHistory();
    updateAppWalletBalance();

    showValidationError(`Bank withdrawal successful: ₹${inrAmount.toLocaleString("en-IN")}`);
}

function renderHoldings() {
    const list = document.getElementById("holdingsList");
    if (!list) return;

    const entries = Object.entries(holdings);

    if (entries.length === 0) {
        list.innerHTML = `<p style="color:var(--text-dim); font-size:13px;">No assets yet.</p>`;
        return;
    }

    list.innerHTML = "";

    entries.forEach(([stockName, qty]) => {
        const stock = stocks.find((item) => item.n === stockName);
        const price = stock ? stock.p : 0;
        const value = price * qty;

        list.innerHTML += `
            <div class="watchlist-item" onclick="goToTrade('${price}')">
                <div class="w-info">
                    <div class="w-logo" style="background:${stock ? stock.c : "#334155"};">${stockName[0]}</div>
                    <div>
                        <p style="font-weight:800;">${stockName}</p>
                        <p style="font-size:11px; color:var(--text-dim);">${qty} ${qty === 1 ? "share" : "shares"}</p>
                    </div>
                </div>
                <p style="font-weight:700;">₹${value.toLocaleString("en-IN")}</p>
            </div>
        `;
    });
}

function addHistory(tx) {
    history.unshift(tx);
    history = history.slice(0, 30);
    localStorage.setItem("indistockHistory", JSON.stringify(history));
}

function renderHistory() {
    const list = document.getElementById("txList");
    if (!list) return;

    if (history.length === 0) {
        list.innerHTML = `<p style="color:var(--text-dim); font-size:13px;">No transactions yet.</p>`;
        return;
    }

    list.innerHTML = "";

    history.forEach((tx) => {
        const color = tx.type.includes("BUY") || tx.type.includes("DEPOSIT") ? "var(--buy-green)" : "var(--sell-red)";
        const hasRealTx =
            tx.txHash &&
            !["LOCAL_SELL_ORDER", "APP_WALLET_CREDIT", "DEMO_BANK_WITHDRAW", "DEMO_DEPOSIT"].includes(tx.txHash);

        const explorerUrl = `https://testnet.arcscan.app/tx/${tx.txHash}`;

        const statusText = hasRealTx
            ? "View on Arcscan"
            : tx.txHash === "APP_WALLET_CREDIT"
                ? "Credited to app wallet"
                : tx.txHash === "DEMO_BANK_WITHDRAW"
                    ? "Bank withdrawal success"
                    : tx.txHash === "DEMO_DEPOSIT"
                        ? "Demo deposit"
                        : "App wallet entry";

        list.innerHTML += `
            <div class="watchlist-item" ${hasRealTx ? `onclick="window.open('${explorerUrl}', '_blank')"` : ""}>
                <div>
                    <p style="font-weight:800; color:${color};">${tx.type} ${tx.stock}</p>
                    <p style="font-size:11px; color:var(--text-dim);">${tx.qty} ${tx.qty === 1 ? "share" : "shares"} • ${tx.date}</p>
                    <p style="font-size:10px; color:${hasRealTx ? "var(--accent-blue)" : "var(--text-dim)"};">
                        ${statusText}
                    </p>
                </div>
                <div style="text-align:right;">
                    <p style="font-weight:700;">${tx.usdcAmount.toFixed(2)} USDC</p>
                    <p style="font-size:10px; color:var(--text-dim);">₹${tx.inrAmount.toLocaleString("en-IN")}</p>
                </div>
            </div>
        `;
    });
}

function switchTab(id, el) {
    document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.remove("active");
    });

    document.getElementById(id).classList.add("active");

    document.querySelectorAll(".nav-item").forEach((nav) => {
        nav.classList.remove("active");
    });

    if (el) {
        el.classList.add("active");
    }
}

function showValidationError(message) {
    const validModal = document.getElementById("validModal");
    const validText = document.getElementById("validText");

    if (validModal && validText) {
        validText.innerText = String(message).toUpperCase();
        validModal.classList.remove("hidden");
    } else {
        alert(message);
    }
}
