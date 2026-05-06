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

// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT_ADDRESS = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C";
const ARC_CHAIN_ID = "0x4cef52";
const RPC_URL = "https://rpc.testnet.arc.network";
const INR_RATE = 94.25;

let userAddress = "";
let provider;
let signer;

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

    await fetchBalance();
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

    document.getElementById("userPortfolio").innerText = "₹0.00";
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

    if (type === "SELL") {
        sellStock(stock, qty, inrAmount, usdcAmount);
        return;
    }

    await buyStock(stock, qty, inrAmount, usdcAmount);
}

async function buyStock(stock, qty, inrAmount, usdcAmount) {
    try {
        await loadEthers();

        const confirmed = confirm(`Buy ${qty} ${stock.n} for ${usdcAmount.toFixed(2)} USDC?`);
        if (!confirmed) return;

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

        alert("Order submitted. Waiting for confirmation...");
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
        await fetchBalance();

        alert(`Transaction confirmed. ${stock.n} BUY completed.`);
    } catch (error) {
        console.error("Buy failed:", error);
        showValidationError(error.message || "Transaction failed");
    }
}

function sellStock(stock, qty, inrAmount, usdcAmount) {
    const ownedQty = holdings[stock.n] || 0;

    if (ownedQty < qty) {
        showValidationError(`You only have ${ownedQty} ${stock.n}`);
        return;
    }

    const confirmed = confirm(`Sell ${qty} ${stock.n}?`);
    if (!confirmed) return;

    holdings[stock.n] -= qty;

    if (holdings[stock.n] <= 0) {
        delete holdings[stock.n];
    }

    saveHoldings();

    addHistory({
        type: "SELL",
        stock: stock.n,
        qty,
        inrAmount,
        usdcAmount,
        txHash: "LOCAL_SELL_ORDER",
        date: new Date().toLocaleString()
    });

    renderHoldings();
    renderHistory();

    alert(`${stock.n} SELL order completed.`);
}

async function fetchBalance() {
    if (!userAddress || !provider) return;

    try {
        await loadEthers();

        const usdcContract = new ethers.Contract(
            USDC_ADDR,
            ["function balanceOf(address account) view returns (uint256)"],
            provider
        );

        const balance = await usdcContract.balanceOf(userAddress);
        const formattedBalance = Number(ethers.utils.formatUnits(balance, 6));
        const inrValue = formattedBalance * INR_RATE;

        document.getElementById("userPortfolio").innerText =
            "₹" + inrValue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    } catch (error) {
        console.error("Balance update failed:", error);
    }
}

function saveHoldings() {
    localStorage.setItem("indistockHoldings", JSON.stringify(holdings));
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
                        <p style="font-size:11px; color:var(--text-dim);">${qty} shares</p>
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
        const color = tx.type === "BUY" ? "var(--buy-green)" : "var(--sell-red)";

        list.innerHTML += `
            <div class="watchlist-item">
                <div>
                    <p style="font-weight:800; color:${color};">${tx.type} ${tx.stock}</p>
                    <p style="font-size:11px; color:var(--text-dim);">${tx.qty} shares • ${tx.date}</p>
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
