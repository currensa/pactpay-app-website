import { usePublicCopy } from '@/views/public/copy'

export default function TermsPage() {
  const { language } = usePublicCopy()
  const isZh = language === 'zh-CN'

  const sections = isZh
    ? [
        { title: '1. 谁可以使用本服务', body: ['你必须年满 18 周岁，并具备订立具有法律约束力协议的能力。使用本服务即表示你声明自己符合这些要求。', '若你所在司法辖区法律禁止使用本服务，则你不得使用本服务。'] },
        { title: '2. 本服务是什么', body: ['PactPay 是一个非托管支付平台，使组织能够通过智能合约向成员执行链上付款。PactPay 在任何时候都不持有、托管或控制用户资金。所有交易都直接在公有区块链网络上执行。一旦链上交易被提交，PactPay 无法撤销、取消或修改。', '在签名并执行任何交易之前，你应自行确保包括收款地址、付款金额和领取时间在内的所有交易信息准确无误。'] },
        { title: '3. 你的账户', body: ['你可以通过邮箱地址或 EOA 钱包注册。你有责任妥善保管登录凭证和钱包安全。若发现任何未经授权的账户访问，应立即通过 support@pactpay.app 联系我们。', '若因你未妥善保管凭证而导致账户被未经授权访问，我们不对此造成的损失承担责任。'] },
        { title: '4. 服务的非托管性质', body: ['PactPay 不托管任何资金。所有付款都直接从付款方钱包，经由智能合约流向收款方指定的钱包。PactPay 不持有任何用户钱包私钥，也无法发起、撤销或冻结任何交易。', '你理解并接受：'] , list: ['区块链交易一旦在链上确认即不可逆。', '智能合约行为由链上部署的代码决定，并可被公开验证。', 'Gas 费由相关区块链网络收取，与 PactPay 无关。'] },
        { title: '5. 禁止用途', body: ['你同意不会将本服务用于：'], list: ['违反任何适用法律或法规', '进行或协助洗钱、欺诈或其他金融犯罪', '绕过或试图绕过本服务的任何安全机制', '干扰或破坏本服务或其底层区块链网络的运行', '代表受到适用制裁的个人或实体使用本服务'] },
        { title: '6. 区块链与智能合约风险', body: ['你确认，使用本服务涉及区块链技术固有风险，包括但不限于：'], list: ['链上交易不可逆', '智能合约漏洞', '网络拥堵、延迟或分叉', '钱包私钥丢失', '影响数字资产的监管变化'], tail: 'PactPay 不保证任何区块链网络持续可用或绝对安全。' },
        { title: '7. 知识产权', body: ['除开源组件外，构成本服务的所有内容、设计与软件均归 ALLIN TECH LIMITED 所有或经其授权。你仅获得有限的、非独占、不可转让的使用许可，以按预期目的使用本服务。未经我们事先书面同意，你不得复制、修改、分发或逆向工程本服务的任何部分。'] },
        { title: '8. 免责声明', body: ['本服务按“现状”和“可用性”提供，不附带任何明示或默示担保。我们不保证本服务无错误、不中断或不存在安全漏洞。', 'PactPay 不是金融机构、汇款机构、经纪商或投资顾问。本服务中的任何内容均不构成金融、法律或投资建议。'] },
        { title: '9. 责任限制', body: ['在适用法律允许的最大范围内，ALLIN TECH LIMITED 及其管理人员、员工和代理人不对你因使用本服务而产生的任何间接、附带、特殊或后果性损害承担责任，包括但不限于因用户操作错误、智能合约被利用或第三方行为导致的资金损失。', '就任何因你使用本服务而产生的索赔，我们对你的累计总责任不超过相关索赔发生前三个月内你向 PactPay 支付的服务费总额。'] },
        { title: '10. 服务和条款的变更', body: ['我们可随时更新本条款。若有重大变更，我们会在服务中发布更新后的条款并更新生效日期。你在变更后继续使用本服务，即视为接受更新后的条款。', '我们也可在不另行通知的情况下修改、暂停或终止本服务。'] },
        { title: '11. 适用法律', body: ['本条款受香港法律管辖并按其解释。任何因本条款引起或与之相关的争议，应由香港法院专属管辖。'] },
        { title: '12. 联系方式', body: ['如果你对本条款有任何疑问，请通过 support@pactpay.app 联系我们。'] },
      ]
    : [
        { title: '1. Who Can Use the Service', body: ['You must be at least 18 years old and have the legal capacity to enter into binding agreements to use the Service. By using the Service, you represent that you meet these requirements.', 'The Service is not available to individuals or entities located in jurisdictions where its use would be prohibited by applicable law.'] },
        { title: '2. What the Service Is', body: ['PactPay is a non-custodial payment platform that enables organisations to execute on-chain payments to members through smart contracts. PactPay does not hold, custody, or control any funds at any point. All transactions are executed directly on public blockchain networks. PactPay has no ability to reverse, cancel, or modify any on-chain transaction once it has been submitted.', 'You are solely responsible for ensuring the accuracy of all transaction details, including recipient addresses, payment amounts, and claim times, before signing and executing any transaction.'] },
        { title: '3. Your Account', body: ['You may register using an email address or an externally owned account (EOA) wallet. You are responsible for maintaining the security of your login credentials and wallet. You must notify us at support@pactpay.app immediately if you become aware of any unauthorised access to your account.', 'We are not liable for any loss resulting from unauthorised access to your account where such access results from your failure to keep your credentials secure.'] },
        { title: '4. Non-Custodial Nature of the Service', body: ["PactPay does not take custody of any funds. All payments flow directly from the paying party's wallet through a smart contract to the recipient's designated wallet. PactPay holds no private keys to any user wallet and cannot initiate, reverse, or freeze any transaction.", 'You understand and accept that:'], list: ['Blockchain transactions are irreversible once confirmed on-chain.', 'Smart contract behaviour is determined by the code deployed on-chain, which is publicly verifiable.', 'Gas fees are charged by the relevant blockchain network and are independent of PactPay.'] },
        { title: '5. Prohibited Uses', body: ['You agree not to use the Service to:'], list: ['Violate any applicable law or regulation', 'Conduct or facilitate money laundering, fraud, or any other financial crime', 'Circumvent or attempt to circumvent any security feature of the Service', 'Interfere with or disrupt the operation of the Service or any underlying blockchain network', 'Use the Service on behalf of any person or entity that is subject to applicable sanctions'] },
        { title: '6. Blockchain and Smart Contract Risks', body: ['You acknowledge that use of the Service involves inherent risks associated with blockchain technology, including but not limited to:'], list: ['Irreversibility of on-chain transactions', 'Smart contract vulnerabilities', 'Network congestion, delays, or forks', 'Loss of access to wallet private keys', 'Regulatory changes affecting digital assets'], tail: 'PactPay does not guarantee the continuous availability or security of any blockchain network.' },
        { title: '7. Intellectual Property', body: ['All content, design, and software comprising the Service, excluding open-source components, is owned by or licensed to ALLIN TECH LIMITED. You are granted a limited, non-exclusive, non-transferable licence to use the Service for its intended purpose. You may not copy, modify, distribute, or reverse engineer any part of the Service without our prior written consent.'] },
        { title: '8. Disclaimers', body: ['The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be error-free, uninterrupted, or free from security vulnerabilities.', 'PactPay is not a financial institution, money transmitter, broker, or investment adviser. Nothing in the Service constitutes financial, legal, or investment advice.'] },
        { title: '9. Limitation of Liability', body: ['To the fullest extent permitted by applicable law, ALLIN TECH LIMITED and its officers, employees, and agents will not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of funds resulting from user error, smart contract exploits, or third-party actions.', 'Our total aggregate liability to you for any claim arising from your use of the Service will not exceed the service fees you paid to PactPay in the three months preceding the relevant claim.'] },
        { title: '10. Changes to the Service and These Terms', body: ['We may update these Terms at any time. We will notify you of material changes by posting the updated Terms on the Service and updating the effective date. Continued use of the Service after such changes constitutes your acceptance of the updated Terms.', 'We may modify, suspend, or discontinue the Service at any time without notice.'] },
        { title: '11. Governing Law', body: ['These Terms are governed by and construed in accordance with the laws of Hong Kong. Any disputes arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Hong Kong.'] },
        { title: '12. Contact', body: ['For questions about these Terms, contact us at support@pactpay.app.'] },
      ]

  return (
    <div className="flex flex-1 text-[#1c1c26]" style={{ minHeight: 'calc(100vh - 90px)' }}>
      <div className="mx-auto flex w-full max-w-6xl justify-center">
        <div className="max-w-3xl flex-1 px-8 py-12 md:px-14">
          <h2 className="mb-4 mt-2 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">
            {isZh ? '使用条款' : 'Terms of Use'}
          </h2>
          <p className="mb-8 text-sm text-[#8d8d93]">{isZh ? '最后更新：2026 年 4 月 20 日' : 'Last updated: April 20, 2026'}</p>

          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '本《使用条款》（以下简称“条款”）是你与香港注册公司 ALLIN TECH LIMITED（以下简称“PactPay”、“我们”）之间的协议，用于约束你对 pactpay.app 上 PactPay 平台及相关服务（统称“本服务”）的访问和使用。'
              : 'These Terms of Use ("Terms") are an agreement between you and ALLIN TECH LIMITED, a company incorporated in Hong Kong ("PactPay", "we", "us", or "our"), governing your access to and use of the PactPay platform available at pactpay.app and any related services (collectively, the "Service").'}
          </p>
          <p className="mb-10 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '访问或使用本服务即表示你同意受本条款约束。如果你不同意，请不要使用本服务。'
              : 'By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.'}
          </p>

          {sections.map(section => (
            <div key={section.title} className="mb-8">
              <h3 className="mb-3 text-xl font-bold text-[#1c1c26]">{section.title}</h3>
              {section.body.map((paragraph, index) => (
                <p key={index} className="mb-3 text-base leading-relaxed text-[#606067] last:mb-0">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="list-inside list-disc space-y-2 text-base text-[#606067]">
                  {section.list.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.tail && <p className="mt-4 text-base leading-relaxed text-[#606067]">{section.tail}</p>}
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
