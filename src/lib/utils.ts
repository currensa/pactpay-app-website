import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string | undefined | null) {
  if (!address) {
    return 'N/A';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function parseAmount(amount: string, decimals: number = 18) {
  // Convert decimal amount to wei (smallest unit)
  // e.g., "0.01" with 18 decimals becomes "10000000000000000" wei
  const [integerPart, decimalPart = ''] = amount.split('.');
  const paddedDecimal = decimalPart.padEnd(decimals, '0').slice(0, decimals);
  const weiAmount = integerPart + paddedDecimal;
  return BigInt(weiAmount);
}

// Test cases for parseAmount function:
// parseAmount("0.01", 18) -> BigInt("10000000000000000")
// parseAmount("1.5", 18) -> BigInt("1500000000000000000")
// parseAmount("100", 18) -> BigInt("100000000000000000000")
// parseAmount("0.001", 6) -> BigInt("1000")

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
