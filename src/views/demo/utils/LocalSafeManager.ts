import Safe from '@safe-global/protocol-kit';
import {
  SafeSignature,
  SafeTransactionDataPartial
} from '@safe-global/safe-core-sdk-types';

// 定义存储在 LocalStorage 中的数据结构
interface StoredSafeTx {
  safeTxHash: string;
  data: SafeTransactionDataPartial; // 原始交易参数
  signatures: Record<string, SafeSignature>; // 签名集合 (Key为signer地址)
}

export class LocalSafeManager {
  
  /**
   * 初始化 Protocol Kit
   */
  private async getKit(walletProvider: any, signerAddress: string, safeAddress: string) {
    return await Safe.init({
      provider: walletProvider,
      signer: signerAddress,
      safeAddress: safeAddress
    });
  }

  /**
   * 步骤 1 & 2: 创建交易 + 签名 (并保存到 LocalStorage)
   * 如果是第一个人，创建数据；如果是第二个人，追加签名。
   */
  async signAndStore(
    walletProvider: any,
    signerAddress: string,
    safeAddress: string,
    txData: SafeTransactionDataPartial
  ): Promise<string> {
    const kit = await this.getKit(walletProvider, signerAddress, safeAddress);

    // 1. 创建交易对象
    const safeTransaction = await kit.createTransaction({ transactions: [txData] });
    const safeTxHash = await kit.getTransactionHash(safeTransaction);

    // 2. 检查 LocalStorage 是否已有该交易记录
    let storageRecord: StoredSafeTx = this.loadFromStorage(safeTxHash) || {
      safeTxHash,
      data: txData,
      signatures: {}
    };

    console.log(`[Status] User ${signerAddress} is signing hash: ${safeTxHash}`);

    // 3. 签名 (使用 eth_sign 或 EIP-712)
    // signHash 会返回一个标准的 SafeSignature 对象
    const signature = await kit.signHash(safeTxHash);

    // 4. 追加签名到记录中
    // 注意：ProtocolKit 返回的 signature 对象中，signer 可能是小写，这里统一处理
    storageRecord.signatures[signerAddress.toLowerCase()] = signature;

    // 5. 保存回 LocalStorage
    this.saveToStorage(safeTxHash, storageRecord);
    console.log(`[Success] Signature saved. Total signatures: ${Object.keys(storageRecord.signatures).length}`);

    return safeTxHash;
  }

  /**
   * 步骤 3: 执行交易
   * 从 LocalStorage 读取所有签名 -> 重建对象 -> 上链
   */
  async executeFromStorage(
    walletProvider: any,
    signerAddress: string,
    safeAddress: string,
    safeTxHash: string
  ) {
    const kit = await this.getKit(walletProvider, signerAddress, safeAddress);
    
    // 1. 读取数据
    const record = this.loadFromStorage(safeTxHash);
    if (!record) {
      throw new Error("Transaction not found in local storage");
    }

    // 2. 重建 SafeTransaction 对象
    // 我们需要用原始数据重新 create 一次，以获得基础对象结构
    let safeTransaction = await kit.createTransaction({ transactions: [record.data] });

    // 3. 注入所有收集到的签名
    // Protocol Kit 的 addSignature 会自动处理内部 Map 的构建
    Object.values(record.signatures).forEach((sig) => {
      safeTransaction.addSignature(sig);
    });

    console.log(`[Status] Executing transaction with ${safeTransaction.signatures.size} signatures...`);

    // 4. 执行 (ProtocolKit 内部会自动对签名进行排序和编码)
    const executeTxResponse = await kit.executeTransaction(safeTransaction);
    
    console.log(`[Success] Transaction broadcasted! Hash: ${executeTxResponse.hash}`);
    
    // 等待上链（可选）
    // await executeTxResponse.transactionResponse?.wait();
    
    return executeTxResponse;
  }

  // --- LocalStorage Helpers ---

  private loadFromStorage(hash: string): StoredSafeTx | null {
    const item = localStorage.getItem(`safe_tx_${hash}`);
    if (!item) return null;
    // 需要处理 JSON 解析，注意 BigInt 序列化问题（如果有）
    // 简单起见这里假设没有复杂的 BigInt，或者使用了自定义 reviver
    return JSON.parse(item);
  }

  private saveToStorage(hash: string, data: StoredSafeTx) {
    // 简单序列化。实际项目中建议用 'json-bigint' 处理 value 等字段
    localStorage.setItem(`safe_tx_${hash}`, JSON.stringify(data));
  }
}