
// --- Helper functions for partial exits ---
// Get all exit transactions for a trade (array of {transaction_date, price, quantity})
export function getExitTransactions(trade) {
    let txs = trade.exitTransactions || [];
    // If no array but trade has exitPrice and exitDate, treat as single exit
    if ((!txs || !Array.isArray(txs) || txs.length === 0) && trade.exitPrice && trade.exitDate && trade.quantity) {
        txs = [{
            transaction_date: trade.exitDate,
            price: trade.exitPrice,
            quantity: trade.quantity - (trade.remainingQuantity ?? 0)
        }];
    }
    return txs || [];
};

// Get last exit date (latest transaction_date among all exit transactions)
export function getLastExitDate(trade) {
    const exits = getExitTransactions(trade);
    if (!exits.length) return "-";
    // Find the latest exit by comparing dates (handle both string and numeric)
    const last = exits.reduce((latest, tx) => {
        if (!tx.transactionDate) return latest;
        const txDate = typeof tx.transactionDate === 'number' ? new Date(tx.transactionDate) : new Date(tx.transactionDate);
        if (!latest) return tx;
        const latestDate = typeof latest.transactionDate === 'number' ? new Date(latest.transactionDate) : new Date(latest.transactionDate);
        return txDate > latestDate ? tx : latest;
    }, null);
    if (last && last.transactionDate) {
        // Support both numeric and string date
        const dateVal = typeof last.transactionDate === 'number' ? last.transactionDate : Date.parse(last.transactionDate);
        if (!isNaN(dateVal)) {
            return formatDate(dateVal);
        }
    }
    return "-";
};

// Get average exit price (weighted by quantity)
export function getAverageExitPrice(trade) {
    const exits = getExitTransactions(trade);
    if (!exits.length) return "-";
    let totalQty = 0, totalValue = 0;
    exits.forEach(tx => {
        if (tx.price !== undefined && tx.quantity !== undefined) {
            totalQty += Number(tx.quantity);
            totalValue += Number(tx.price) * Number(tx.quantity);
        }
    });
    if (totalQty === 0) return "-";
    if (totalValue === 0) return "0.00"; // Avoid division by zero
    // Return average exit price rounded to 2 decimals
    return (totalValue / totalQty).toFixed(2);
};

export function getPartialPL(trade) {
    if (trade.status.toLowerCase() === 'open') {
        return trade.quantity * Number(trade.currentPrice ? (trade.currentPrice - trade.entryPrice) : 0);
    }
    const exits = getExitTransactions(trade);
    if (!exits.length || !trade.entryPrice || !trade.direction) return "0";
    let pl = 0;
    exits.forEach(tx => {
        if (tx.price !== undefined && tx.quantity !== undefined) {
            const priceDiff = trade.direction.toLowerCase() === 'long'
                ? Number(tx.price) - Number(trade.entryPrice)
                : Number(trade.entryPrice) - Number(tx.price);
            pl += priceDiff * Number(tx.quantity);
        }
    });
    return pl.toFixed(0);
};



export function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = d.toLocaleString('en-US', { month: 'short' });
    const yyyy = d.getFullYear();
    return `${dd} ${mmm} ${yyyy}`;
};

export function getInvested(trade) {
    if (trade.entryPrice && trade.quantity) {
        return (Number(trade.entryPrice) * Number(trade.quantity)).toFixed(2);
    }
    return "-";
};