import { usePublicCopy } from '@/views/public/copy'

export default function PrivacyPage() {
  const { language } = usePublicCopy()
  const isZh = language === 'zh-CN'

  const sections = isZh
    ? [
        {
          title: '1. 我们收集哪些信息',
          intro: '你直接提供的信息：',
          list: ['如果你通过邮箱注册或登录，我们会收集你的邮箱地址', '当你联系支持团队时主动提交的任何信息'],
          intro2: '自动收集的信息：',
          list2: ['与本服务交互时使用的区块链钱包地址', '日志数据，包括 IP 地址、浏览器类型、访问页面和时间戳', '设备信息，例如操作系统和浏览器版本'],
          tailTitle: '我们不会收集：',
          tail: '我们不会收集政府签发身份证件、金融账户详情或任何 KYC 相关文件。PactPay 使用本服务无需进行身份验证。',
        },
        { title: '2. 我们如何使用你的信息', body: ['我们使用所收集的信息来：'], list: ['运营和维护本服务', '发送交易通知，例如付款和领取状态邮件', '响应支持请求', '监控安全事件并防止滥用', '通过聚合且无法识别个人的信息分析改进本服务'], tail: '我们不会将你的个人信息出售给第三方。' },
        { title: '3. 区块链数据', body: ['通过本服务执行的交易会记录在公有区块链网络上。链上数据（包括钱包地址和交易金额）是公开可访问的，且 PactPay 无法删除或修改。使用本服务即表示你确认某些交易数据会被永久存储在链上。', 'PactPay 使用受保护身份机制，以降低你的登录钱包与链上活动之间的可关联性。但你仍应理解，公有区块链数据天然具有透明性。'] },
        { title: '4. 信息共享', body: ['我们不会出售或出租你的个人信息。仅在以下情况下，我们可能共享你的信息：'], list: ['服务提供商：帮助我们运营本服务的第三方供应商，如托管服务和邮件发送服务，这些供应商需承担适当的保密义务', '法律要求：适用法律、法院命令或合法政府要求要求披露时', '业务转让：在合并、收购或资产出售过程中，在适当保密安排下进行共享'] },
        { title: '5. 数据保留', body: ['我们仅在实现本政策所述目的或适用法律要求的期限内保留个人信息。邮箱地址和日志数据在不再为本服务运营所必需时会被删除或匿名化。', '链上交易数据具有永久性，我们无法删除。'] },
        { title: '6. 安全', body: ['我们采取合理的技术和组织措施，防止你的个人信息被未经授权访问、丢失或滥用。但互联网传输和电子存储都不存在绝对安全，我们无法保证绝对安全。'] },
        { title: '7. Cookies', body: ['本服务仅使用维持基础功能所必需的 Cookie，例如会话管理。我们不使用跟踪或广告 Cookie。'] },
        { title: '8. 你的权利', body: ['根据你所在地区的法律，你可能有权访问、更正或请求删除我们持有的个人信息。如需行使这些权利，请联系 support@pactpay.app。', '请注意，已记录在公有区块链上的数据无法被删除。'] },
        { title: '9. 未成年人', body: ['本服务面向 18 岁及以上用户。我们不会故意收集未成年人的个人信息。如发现误收集未成年人信息，我们会及时删除。'] },
        { title: '10. 本政策的变更', body: ['我们可能不时更新本隐私政策。若有重大变更，我们会通过在服务中发布更新后的政策并更新生效日期来通知你。你在变更后继续使用本服务，即视为接受更新后的政策。'] },
        { title: '11. 联系方式', body: ['如果你有任何隐私相关问题，请通过 support@pactpay.app 联系我们。'] },
      ]
    : [
        { title: '1. What Information We Collect', intro: 'Information you provide directly:', list: ['Email address, if you register or log in using email', 'Any information you submit when contacting support'], intro2: 'Information collected automatically:', list2: ['Blockchain wallet addresses used to interact with the Service', 'Log data including IP address, browser type, pages visited, and timestamps', 'Device information such as operating system and browser version'], tailTitle: 'What we do not collect:', tail: 'We do not collect government-issued identification, financial account details, or any KYC-related documents. PactPay requires no identity verification to use the Service.' },
        { title: '2. How We Use Your Information', body: ['We use the information we collect to:'], list: ['Operate and maintain the Service', 'Send transactional notifications, such as payment and claim status emails', 'Respond to support requests', 'Monitor for security incidents and prevent abuse', 'Improve the Service through aggregated, non-identifiable usage analysis'], tail: 'We do not sell your personal information to third parties.' },
        { title: '3. Blockchain Data', body: ['Transactions executed through the Service are recorded on public blockchain networks. On-chain data, including wallet addresses and transaction amounts, is publicly accessible and cannot be deleted or modified by PactPay. By using the Service, you acknowledge that certain transaction data will be permanently stored on-chain.', 'PactPay uses a shielded identity mechanism to reduce the linkability between your login wallet and your on-chain activity. However, you should understand that public blockchain data is inherently transparent.'] },
        { title: '4. Sharing of Information', body: ['We do not sell or rent your personal information. We may share your information only in the following circumstances:'], list: ['Service providers: Third-party vendors that help us operate the Service, such as hosting providers and email delivery services, who are bound by appropriate confidentiality obligations', 'Legal requirements: Where disclosure is required by applicable law, court order, or lawful government request', 'Business transfers: In connection with a merger, acquisition, or sale of assets, subject to appropriate confidentiality arrangements'] },
        { title: '5. Data Retention', body: ['We retain personal information only for as long as necessary to fulfil the purposes described in this Policy or as required by applicable law. Email addresses and log data are deleted or anonymised when no longer needed for the operation of the Service.', 'On-chain transaction data is permanent and beyond our control to delete.'] },
        { title: '6. Security', body: ['We implement reasonable technical and organisational measures to protect your personal information against unauthorised access, loss, or misuse. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.'] },
        { title: '7. Cookies', body: ['The Service uses only essential cookies necessary for basic functionality such as session management. We do not use tracking or advertising cookies.'] },
        { title: '8. Your Rights', body: ['Depending on your location, you may have rights to access, correct, or request deletion of your personal information held by us. To exercise these rights, contact us at support@pactpay.app.', 'Note that we cannot delete data that has been recorded on a public blockchain.'] },
        { title: '9. Minors', body: ['The Service is intended for users aged 18 and above. We do not knowingly collect personal information from minors. If we become aware that we have collected information from a minor, we will delete it promptly.'] },
        { title: '10. Changes to This Policy', body: ['We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated Policy on the Service and updating the effective date. Continued use of the Service after such changes constitutes your acceptance of the updated Policy.'] },
        { title: '11. Contact', body: ['For privacy-related questions, contact us at support@pactpay.app.'] },
      ]

  return (
    <div className="flex flex-1 text-[#1c1c26]" style={{ minHeight: 'calc(100vh - 90px)' }}>
      <div className="mx-auto flex w-full max-w-6xl justify-center">
        <div className="max-w-3xl flex-1 px-8 py-12 md:px-14">
          <h2 className="mb-4 mt-2 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">
            {isZh ? '隐私政策' : 'Privacy Policy'}
          </h2>
          <p className="mb-8 text-sm text-[#8d8d93]">{isZh ? '最后更新：2026 年 4 月 20 日' : 'Last updated: April 20, 2026'}</p>

          <p className="mb-10 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '本隐私政策说明 ALLIN TECH LIMITED（“PactPay”、“我们”）在你使用 pactpay.app 上的 PactPay 平台（“本服务”）时，如何收集、使用和处理相关信息。'
              : 'This Privacy Policy describes how ALLIN TECH LIMITED ("PactPay", "we", "us", or "our") collects, uses, and handles information when you use the PactPay platform at pactpay.app (the "Service").'}
          </p>

          {sections.map(section => (
            <div key={section.title} className="mb-8">
              <h3 className="mb-3 text-xl font-bold text-[#1c1c26]">{section.title}</h3>
              {section.intro && <p className="mb-2 text-base font-semibold text-[#1c1c26]">{section.intro}</p>}
              {section.list && (
                <ul className="mb-4 list-inside list-disc space-y-1 text-base text-[#606067]">
                  {section.list.map(item => <li key={item}>{item}</li>)}
                </ul>
              )}
              {section.intro2 && <p className="mb-2 text-base font-semibold text-[#1c1c26]">{section.intro2}</p>}
              {section.list2 && (
                <ul className="mb-4 list-inside list-disc space-y-1 text-base text-[#606067]">
                  {section.list2.map(item => <li key={item}>{item}</li>)}
                </ul>
              )}
              {section.tailTitle && <p className="mb-2 text-base font-semibold text-[#1c1c26]">{section.tailTitle}</p>}
              {section.body?.map((paragraph, index) => (
                <p key={index} className="mb-3 text-base leading-relaxed text-[#606067] last:mb-0">{paragraph}</p>
              ))}
              {section.tail && <p className="text-base leading-relaxed text-[#606067]">{section.tail}</p>}
            </div>
          ))}

          <div className="border-t border-[rgba(0,0,0,0.06)] pt-8 text-center text-base text-[#8d8d93]">
            {isZh ? '© 2026 PactPay。面向未来工作的支付基础设施。' : '© 2026 PactPay. Built for the future of work.'}
          </div>
        </div>
      </div>
    </div>
  )
}
