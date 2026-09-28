export const PACT_PRIVACY_DEFI_ROUTER_ABI = [
  {
    name: 'defiRouting',
    type: 'function',
    inputs: [
      {
        name: 'withdrawProof',
        type: 'tuple',
        components: [
          { name: 'pA', type: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]' },
          { name: 'nullifierHash', type: 'bytes32' },
          { name: 'recipient', type: 'address' },
          { name: 'claimedAmount', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'tier', type: 'uint8' },
          { name: 'depositRoot', type: 'uint256' },
          { name: 'expectedAmount', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'relayer', type: 'address' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      {
        name: 'defiData',
        type: 'tuple',
        components: [
          { name: 'defiFee', type: 'uint256' },
          {
            name: 'defiCalls',
            type: 'tuple[]',
            components: [
              { name: 'target', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' }
            ]
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  { name: 'TamperedDefiData', type: 'error', inputs: [] },
  { name: 'WrongRelayer', type: 'error', inputs: [] },
  { name: 'FeeMustEqualExpectedAmount', type: 'error', inputs: [] },
  { name: 'InsufficientWithdrawn', type: 'error', inputs: [] },
  { name: 'TransferFailed', type: 'error', inputs: [] },
  { name: 'Unauthorized', type: 'error', inputs: [] },
  { name: 'InvalidAddress', type: 'error', inputs: [] }
] as const

export const SWAP_ABI = [
  {
    name: 'swap',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'recipient', type: 'address' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable'
  }
] as const

export const PURE_ROUTER_ABI = [
  {
    name: 'sweepRemaining',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const
