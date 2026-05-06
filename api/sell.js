const { ethers } = require("ethers");

const RPC_URL = "https://rpc.testnet.arc.network";
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MAX_SELL_USDC = 50;

const USDC_ABI = [
    "function transfer(address to, uint256 value) public returns (bool)"
];

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const { userAddress, usdcAmount } = body || {};
        const amount = Number(usdcAmount);

        if (!process.env.MERCHANT_PRIVATE_KEY) {
            return res.status(500).json({ error: "Merchant private key missing" });
        }

        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: "Invalid user address" });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid USDC amount" });
        }

        if (amount > MAX_SELL_USDC) {
            return res.status(400).json({
                error: `Demo sell limit is ${MAX_SELL_USDC} USDC`
            });
        }

        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const merchantWallet = new ethers.Wallet(process.env.MERCHANT_PRIVATE_KEY, provider);

        const usdcContract = new ethers.Contract(
            USDC_ADDR,
            USDC_ABI,
            merchantWallet
        );

        const tx = await usdcContract.transfer(
            userAddress,
            ethers.utils.parseUnits(amount.toFixed(6), 6)
        );

        await tx.wait();

        return res.status(200).json({
            success: true,
            txHash: tx.hash
        });
    } catch (error) {
        console.error("Sell payout failed:", error);

        return res.status(500).json({
            error: error.message || "Sell payout failed"
        });
    }
};
