// Frontend-only ticker data for US and NSE markets
export const TICKER_DATA = [
  // US Stocks (NASDAQ/NYSE)
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
  { symbol: "GOOG", name: "Alphabet Inc. Class C", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", exchange: "NASDAQ" },
  { symbol: "ADBE", name: "Adobe Inc.", exchange: "NASDAQ" },
  { symbol: "CRM", name: "Salesforce Inc.", exchange: "NYSE" },
  { symbol: "ORCL", name: "Oracle Corporation", exchange: "NYSE" },
  { symbol: "INTC", name: "Intel Corporation", exchange: "NASDAQ" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", exchange: "NASDAQ" },
  { symbol: "BABA", name: "Alibaba Group Holding Limited", exchange: "NYSE" },
  { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE" },
  { symbol: "MA", name: "Mastercard Incorporated", exchange: "NYSE" },
  { symbol: "UNH", name: "UnitedHealth Group Incorporated", exchange: "NYSE" },
  { symbol: "HD", name: "The Home Depot Inc.", exchange: "NYSE" },
  { symbol: "PG", name: "The Procter & Gamble Company", exchange: "NYSE" },
  { symbol: "BAC", name: "Bank of America Corporation", exchange: "NYSE" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", exchange: "NYSE" },
  { symbol: "CVX", name: "Chevron Corporation", exchange: "NYSE" },
  { symbol: "WMT", name: "Walmart Inc.", exchange: "NYSE" },
  { symbol: "KO", name: "The Coca-Cola Company", exchange: "NYSE" },
  { symbol: "PEP", name: "PepsiCo Inc.", exchange: "NASDAQ" },
  { symbol: "MRK", name: "Merck & Co. Inc.", exchange: "NYSE" },
  { symbol: "ABBV", name: "AbbVie Inc.", exchange: "NYSE" },
  { symbol: "TMO", name: "Thermo Fisher Scientific Inc.", exchange: "NYSE" },
  { symbol: "COST", name: "Costco Wholesale Corporation", exchange: "NASDAQ" },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ" },
  { symbol: "ACN", name: "Accenture plc", exchange: "NYSE" },
  { symbol: "LLY", name: "Eli Lilly and Company", exchange: "NYSE" },
  { symbol: "BMY", name: "Bristol-Myers Squibb Company", exchange: "NYSE" },
  { symbol: "QCOM", name: "QUALCOMM Incorporated", exchange: "NASDAQ" },
  { symbol: "T", name: "AT&T Inc.", exchange: "NYSE" },
  { symbol: "VZ", name: "Verizon Communications Inc.", exchange: "NYSE" },
  { symbol: "IBM", name: "International Business Machines Corporation", exchange: "NYSE" },
  { symbol: "DIS", name: "The Walt Disney Company", exchange: "NYSE" },
  { symbol: "NKE", name: "NIKE Inc.", exchange: "NYSE" },
  { symbol: "MCD", name: "McDonald's Corporation", exchange: "NYSE" },
  
  // NSE India Stocks
  { symbol: "RELIANCE.NS", name: "Reliance Industries Limited", exchange: "NSE" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Limited", exchange: "NSE" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Limited", exchange: "NSE" },
  { symbol: "INFY.NS", name: "Infosys Limited", exchange: "NSE" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Limited", exchange: "NSE" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Limited", exchange: "NSE" },
  { symbol: "SBIN.NS", name: "State Bank of India", exchange: "NSE" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Limited", exchange: "NSE" },
  { symbol: "ITC.NS", name: "ITC Limited", exchange: "NSE" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Limited", exchange: "NSE" },
  { symbol: "LT.NS", name: "Larsen & Toubro Limited", exchange: "NSE" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies Limited", exchange: "NSE" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints Limited", exchange: "NSE" },
  { symbol: "AXISBANK.NS", name: "Axis Bank Limited", exchange: "NSE" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki India Limited", exchange: "NSE" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries Limited", exchange: "NSE" },
  { symbol: "TITAN.NS", name: "Titan Company Limited", exchange: "NSE" },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement Limited", exchange: "NSE" },
  { symbol: "WIPRO.NS", name: "Wipro Limited", exchange: "NSE" },
  { symbol: "NESTLEIND.NS", name: "Nestle India Limited", exchange: "NSE" },
  { symbol: "POWERGRID.NS", name: "Power Grid Corporation of India Limited", exchange: "NSE" },
  { symbol: "NTPC.NS", name: "NTPC Limited", exchange: "NSE" },
  { symbol: "TECHM.NS", name: "Tech Mahindra Limited", exchange: "NSE" },
  { symbol: "ONGC.NS", name: "Oil and Natural Gas Corporation Limited", exchange: "NSE" },
  { symbol: "M&M.NS", name: "Mahindra & Mahindra Limited", exchange: "NSE" },
  { symbol: "JSWSTEEL.NS", name: "JSW Steel Limited", exchange: "NSE" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors Limited", exchange: "NSE" },
  { symbol: "INDUSINDBK.NS", name: "IndusInd Bank Limited", exchange: "NSE" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Limited", exchange: "NSE" },
  { symbol: "HDFCLIFE.NS", name: "HDFC Life Insurance Company Limited", exchange: "NSE" },
  { symbol: "GRASIM.NS", name: "Grasim Industries Limited", exchange: "NSE" },
  { symbol: "CIPLA.NS", name: "Cipla Limited", exchange: "NSE" },
  { symbol: "DIVISLAB.NS", name: "Divi's Laboratories Limited", exchange: "NSE" },
  { symbol: "DRREDDY.NS", name: "Dr. Reddy's Laboratories Limited", exchange: "NSE" },
  { symbol: "EICHERMOT.NS", name: "Eicher Motors Limited", exchange: "NSE" },
  { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv Limited", exchange: "NSE" },
  { symbol: "BRITANNIA.NS", name: "Britannia Industries Limited", exchange: "NSE" },
  { symbol: "SHREECEM.NS", name: "Shree Cement Limited", exchange: "NSE" },
  { symbol: "COALINDIA.NS", name: "Coal India Limited", exchange: "NSE" },
  { symbol: "BPCL.NS", name: "Bharat Petroleum Corporation Limited", exchange: "NSE" },
  { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp Limited", exchange: "NSE" },
  { symbol: "UPL.NS", name: "UPL Limited", exchange: "NSE" },
  { symbol: "TATACONSUM.NS", name: "Tata Consumer Products Limited", exchange: "NSE" },
  { symbol: "SBILIFE.NS", name: "SBI Life Insurance Company Limited", exchange: "NSE" },
  { symbol: "ADANIPORTS.NS", name: "Adani Ports and Special Economic Zone Limited", exchange: "NSE" },
  { symbol: "GODREJCP.NS", name: "Godrej Consumer Products Limited", exchange: "NSE" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel Limited", exchange: "NSE" },
  { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals Enterprise Limited", exchange: "NSE" },
  { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto Limited", exchange: "NSE" },
  { symbol: "HINDALCO.NS", name: "Hindalco Industries Limited", exchange: "NSE" },
  { symbol: "VEDL.NS", name: "Vedanta Limited", exchange: "NSE" },
  { symbol: "ADANIENT.NS", name: "Adani Enterprises Limited", exchange: "NSE" },
  { symbol: "BANKBARODA.NS", name: "Bank of Baroda", exchange: "NSE" },
  { symbol: "IOC.NS", name: "Indian Oil Corporation Limited", exchange: "NSE" },
  { symbol: "GAIL.NS", name: "GAIL (India) Limited", exchange: "NSE" },
  { symbol: "HAL.NS", name: "Hindustan Aeronautics Limited", exchange: "NSE" },
  { symbol: "IRCTC.NS", name: "Indian Railway Catering and Tourism Corporation Limited", exchange: "NSE" },
  { symbol: "ZOMATO.NS", name: "Zomato Limited", exchange: "NSE" },
  { symbol: "PAYTM.NS", name: "One 97 Communications Limited", exchange: "NSE" },
  { symbol: "NYKAA.NS", name: "FSN E-Commerce Ventures Limited", exchange: "NSE" },
  { symbol: "POLICYBZR.NS", name: "PB Fintech Limited", exchange: "NSE" }
];

// Function to search tickers
export const searchTickers = (searchTerm, limit = 20) => {
  if (!searchTerm) {
    // Return popular tickers when no search term
    return TICKER_DATA.slice(0, limit);
  }
  
  const term = searchTerm.toLowerCase();
  
  return TICKER_DATA
    .filter(ticker => 
      ticker.symbol.toLowerCase().includes(term) ||
      ticker.name.toLowerCase().includes(term)
    )
    .slice(0, limit);
};

// Function to get ticker by symbol
export const getTickerBySymbol = (symbol) => {
  return TICKER_DATA.find(ticker => 
    ticker.symbol.toLowerCase() === symbol.toLowerCase()
  );
};
