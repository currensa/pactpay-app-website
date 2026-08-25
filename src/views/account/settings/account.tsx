import { ApiKeySection } from '@/views/orgs/components/api-key-section'

/**
 * 账户与安全设置页（用户级，AccountLayout 下）。
 *
 * 后端移除 /orgs/:orgId/api-keys 后，API Key 改为用户级资源（/api/api-keys），
 * 仅展示当前登录用户自己的 Key。组织设置页仍保留同一组件作为管理员入口，
 * 但数据来源相同——都是当前用户自己的 Key。
 */
export default function AccountSettings() {
  return (
    <div className="flex flex-col gap-[20px]">
      <ApiKeySection />
    </div>
  )
}
