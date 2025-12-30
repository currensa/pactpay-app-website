import api from "@/apis";
import { SIWXConfig, SIWXMessage, SIWXSession } from "@reown/appkit";
import type { CaipNetworkId } from "@reown/appkit-common";

const STORAGE_KEY = "pactpay_siwx_sessions";
const TOKEN_STORAGE_KEY = "pactpay_token";

class PactPayAuthorization implements SIWXConfig {
  async createMessage(input: SIWXMessage.Input): Promise<SIWXMessage> {
    const { nonce } = await api.account.getNonce();
    const now = new Date();
    const expirationTime = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24小时后过期

    const messageData: SIWXMessage.Data = {
      accountAddress: input.accountAddress,
      chainId: input.chainId,
      domain: location.origin,
      uri: location.href,
      version: "1",
      nonce,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      requestId: crypto.randomUUID(),
    };

    return {
      ...messageData,
      toString: () => this.formatMessage(messageData),
    };
  }

  async addSession(session: SIWXSession): Promise<void> {
    // 先验证签名并获取 token，只有成功后才保存会话
    const token = await this.verifySignatureAndGetToken(session);
    const sessions = this.getStoredSessions();
    const index = this.findSessionIndex(sessions, session.data.chainId, session.data.accountAddress);

    if (index >= 0) sessions[index] = session;
    else sessions.push(session);

    await this.storeSessions(sessions);
    this.saveToken(token);
  }

  /**
   * 删除指定的Session
   * @param chainId
   * @param address
   */
  async revokeSession(chainId: CaipNetworkId, address: string): Promise<void> {
    const storedSessions = this.getStoredSessions();
    // 保留所有不匹配的会话（即删除所有匹配的会话）
    const remainingSessions = storedSessions.filter(
      (session) =>
        session.data.chainId !== chainId ||
        session.data.accountAddress.toLowerCase() !== address.toLowerCase()
    );

    await this.storeSessions(remainingSessions);

    // 如果所有会话都被删除了，清除 token
    if (remainingSessions.length === 0) {
      this.clearToken();
    }
  }

  async setSessions(sessions: SIWXSession[]): Promise<void> {
    await this.storeSessions(sessions);
  }

  async getSessions(chainId: CaipNetworkId, address: string): Promise<SIWXSession[]> {
    // 如果没有 token，说明需要重新登录
    if (!this.getToken()) {
      await this.clearAllSessions();
      return [];
    }

    const sessions = this.getStoredSessions();
    const validSessions = sessions.filter((session) =>
      this.isSessionMatch(session, chainId, address) && this.isSessionValid(session)
    );

    // 清理过期会话
    if (validSessions.length !== sessions.length) {
      const allValidSessions = sessions.filter((s) => this.isSessionValid(s));
      await this.storeSessions(allValidSessions);

      if (allValidSessions.length === 0) {
        this.clearToken();
      }
    }

    return validSessions;
  }

  // ========== 私有辅助方法 ==========

  private formatMessage(data: SIWXMessage.Data): string {
    const parts = [
      `${data.domain} wants you to sign in with your Ethereum account:`,
      `${data.accountAddress}\n`,
    ];

    if (data.statement) parts.push(`${data.statement}\n`);
    parts.push(`URI: ${data.uri}`);
    parts.push(`Version: ${data.version}`);
    parts.push(`Chain ID: ${data.chainId}`);
    parts.push(`Nonce: ${data.nonce}`);
    parts.push(`Issued At: ${data.issuedAt}`);
    if (data.expirationTime) parts.push(`Expiration Time: ${data.expirationTime}`);
    if (data.requestId) parts.push(`Request ID: ${data.requestId}`);

    return parts.join("\n");
  }

  private async verifySignatureAndGetToken(session: SIWXSession): Promise<string> {
    const response = (await api.account.login({
      type: "wallet",
      address: session.data.accountAddress,
      chainId: session.data.chainId,
      signature: session.signature,
    })) as { token?: string };

    if (!response?.token) {
      throw new Error("Backend did not return a token");
    }

    return response.token;
  }

  private findSessionIndex(sessions: SIWXSession[], chainId: CaipNetworkId, address: string): number {
    return sessions.findIndex(
      (s) => s.data.chainId === chainId && s.data.accountAddress.toLowerCase() === address.toLowerCase()
    );
  }

  private isSessionMatch(session: SIWXSession, chainId: CaipNetworkId, address: string): boolean {
    return (
      session.data.chainId === chainId &&
      session.data.accountAddress.toLowerCase() === address.toLowerCase()
    );
  }

  private isSessionValid(session: SIWXSession): boolean {
    const now = new Date();

    // 检查是否过期
    if (session.data.expirationTime) {
      const expirationDate = new Date(session.data.expirationTime);
      if (expirationDate <= now) return false;
    }

    // 检查 notBefore
    if (session.data.notBefore) {
      const notBeforeDate = new Date(session.data.notBefore);
      if (notBeforeDate > now) return false;
    }

    return true;
  }

  private saveToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem("token", token); // 用于 API 请求
  }

  private getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem("token");
  }

  private async clearAllSessions(): Promise<void> {
    const sessions = this.getStoredSessions();
    if (sessions.length > 0) {
      await this.storeSessions([]);
    }
  }

  private getStoredSessions(): SIWXSession[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as SIWXSession[]) : [];
    } catch (error) {
      console.error("Failed to parse stored sessions:", error);
      return [];
    }
  }

  /**
   * 存储会话列表（替换所有现有会话）
   * 在存储前会验证会话结构
   */
  private async storeSessions(sessions: SIWXSession[]): Promise<void> {
    if (typeof window === "undefined") return;

    // 验证会话结构
    for (const session of sessions) {
      if (!session.data || !session.message || !session.signature) {
        throw new Error("Invalid session structure");
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to store sessions:", error);
      throw new Error("Failed to store sessions");
    }
  }
}

export default new PactPayAuthorization();
