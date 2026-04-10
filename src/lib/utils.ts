import { clsx, type ClassValue } from "clsx"
import { formatUnits, parseUnits } from "ethers"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 货币精度配置
 * 根据货币符号返回对应的小数位数
 */
const CURRENCY_DECIMALS: Record<string, number> = {
  // 稳定币
  USDC: 6,
  USDT: 6,
  DAI: 18,
  BUSD: 18,
  TUSD: 18,
  USDP: 18,
  GUSD: 2,
  FRAX: 18,
  LUSD: 18,
  // 主流加密货币
  ETH: 18,
  WETH: 18,
  BTC: 8,
  WBTC: 8,
  // 默认值
  DEFAULT: 18,
}

/**
 * 根据货币名称获取小数位数
 * @param currency 货币符号（如 'USDC', 'ETH'）
 * @returns 小数位数
 */
export function getCurrencyDecimals(currency: string): number {
  const upperCurrency = currency.toUpperCase()
  return CURRENCY_DECIMALS[upperCurrency] ?? CURRENCY_DECIMALS.DEFAULT
}

/**
 * 高精度加法运算
 * @param amounts 金额字符串数组
 * @param currency 货币符号
 * @returns 总金额字符串
 */
export function sumAmounts(amounts: string[], currency: string): string {
  const decimals = getCurrencyDecimals(currency)
  
  const total = amounts.reduce((sum, amount) => {
    if (!amount || amount === '') return sum
    try {
      const parsed = parseUnits(amount, decimals)
      return sum + parsed
    } catch {
      return sum
    }
  }, BigInt(0))
  
  return formatUnits(total, decimals)
}

/**
 * 高精度金额相加（两个金额）
 * @param a 金额字符串
 * @param b 金额字符串
 * @param currency 货币符号
 * @returns 相加后的金额字符串
 */
export function addAmounts(a: string, b: string, currency: string): string {
  return sumAmounts([a, b], currency)
}

/**
 * 高精度金额相减
 * @param a 被减数金额字符串
 * @param b 减数金额字符串
 * @param currency 货币符号
 * @returns 相减后的金额字符串
 */
export function subtractAmounts(a: string, b: string, currency: string): string {
  const decimals = getCurrencyDecimals(currency)
  
  try {
    const parsedA = parseUnits(a || '0', decimals)
    const parsedB = parseUnits(b || '0', decimals)
    const result = parsedA - parsedB
    return formatUnits(result, decimals)
  } catch {
    return '0'
  }
}

/**
 * 格式化金额显示（带千分位）
 * @param amount 金额字符串
 * @param currency 货币符号
 * @param maxDecimals 最大显示小数位数（可选，默认保留全部）
 * @returns 格式化后的金额字符串
 */
/**
 * 格式化日期时间，精确到时分
 * @param date Date 对象或可解析的日期字符串
 * @returns 如 "2026/04/09 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

export function formatAmount(
  amount: string,
  currency: string,
  maxDecimals?: number
): string {
  if (!amount || amount === '') return '0'
  
  try {
    const decimals = getCurrencyDecimals(currency)
    // 先解析再格式化，确保数值有效
    const parsed = parseUnits(amount, decimals)
    let formatted = formatUnits(parsed, decimals)
    
    // 处理小数位数限制
    if (maxDecimals !== undefined) {
      const [intPart, decPart] = formatted.split('.')
      if (decPart && decPart.length > maxDecimals) {
        formatted = maxDecimals > 0 
          ? `${intPart}.${decPart.slice(0, maxDecimals)}`
          : intPart
      }
    }
    
    // 添加千分位
    const [integerPart, decimalPart] = formatted.split('.')
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
  } catch {
    return amount
  }
}
