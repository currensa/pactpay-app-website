// Utility Functions

export function generateId(): string {
  // Generate a UUID v4 without external dependency
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: string, decimals: number = 18): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    
    if (fractionalPart === BigInt(0)) {
      return integerPart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmed = fractionalStr.replace(/0+$/, '');
    return `${integerPart}.${trimmed}`;
  } catch (error) {
    return '0';
  }
}

export function parseAmount(amount: string, decimals: number = 18): string {
  try {
    const parts = amount.split('.');
    const integerPart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    
    const value = BigInt(integerPart) * BigInt(10 ** decimals) + BigInt(fractionalPart);
    return value.toString();
  } catch (error) {
    return '0';
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidENS(name: string): boolean {
  return /^[a-z0-9-]+\.eth$/.test(name);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Token helpers
export const COMMON_TOKENS = {
  1: [ // Ethereum Mainnet
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  ],
  5: [ // Goerli Testnet
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Goerli ETH', decimals: 18 },
    { address: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  11155111: [ // Sepolia Testnet
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Sepolia ETH', decimals: 18 },
    { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
};

export function getTokenInfo(chainId: number, tokenAddress: string) {
  const tokens = COMMON_TOKENS[chainId as keyof typeof COMMON_TOKENS] || [];
  return tokens.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase());
}

export function getDefaultToken(chainId: number) {
  const tokens = COMMON_TOKENS[chainId as keyof typeof COMMON_TOKENS] || [];
  return tokens[0]; // ETH
}

// CSV Helpers
export function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  });
}

export function generateCSV(data: string[][]): string {
  return data.map(row => 
    row.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}
