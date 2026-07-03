import { usePublicCopy } from '@/views/public/copy';
import { useEffect, useMemo, useState } from 'react';

type NavItem = { label: string; id: string; sub?: boolean }

const contractAddresses = [
  // {
  //   chain: 'Base',
  //   environment: 'Mainnet',
  //   address: '0x16458100Aa146046067831827cdB91f6aE0535D',
  //   href: 'https://basescan.org/address/0x16458100aa146046067831827cdb91f6aE0535D',
  // },
  // {
  //   chain: 'BNB Smart Chain',
  //   environment: 'Mainnet',
  //   address: '0x16458100Aa146046067831827cdB91f6aE0535D',
  //   href: 'https://bscscan.com/address/0x16458100aa146046067831827cdb91f6aE0535D',
  // },
  {
    chain: 'Ethereum Sepolia',
    environment: 'Testnet',
    address: '0xA8dC5Fe8890cfd76bc660220cffedFbDa06F85C3',
    href: 'https://sepolia.etherscan.io/address/0x5F2E184B850E552f1B66f754EAD5d278475f6811',
  },
  {
    chain: 'Celo Sepolia',
    environment: 'Testnet',
    address: '0x2DD8a5e171cf59c7be307168efEbf3De2CE7721e',
    href: 'https://sepolia.etherscan.io/address/0x5F2E184B850E552f1B66f754EAD5d278475f6811',
  },
]

function SectionAnchor({ id }: { id: string }) {
  return <span id={id} className="block" style={{ scrollMarginTop: '5rem' }} />
}

export default function DocumentPage() {
  const { language } = usePublicCopy()
  const isZh = language === 'zh-CN'
  const [activeId, setActiveId] = useState('overview')

  const navItems = useMemo<NavItem[]>(
    () =>
      isZh
        ? [
          { label: '概览', id: 'overview' },
          { label: '什么是 PactPay', id: 'what-is-pactpay', sub: true },
          { label: '核心特点', id: 'core-features', sub: true },
          { label: '快速开始', id: 'getting-started' },
          { label: '核心流程', id: 'core-flow', sub: true },
          { label: '组织方上手指南', id: 'guide-organisations', sub: true },
          { label: '成员方上手指南', id: 'guide-members', sub: true },
          { label: '底层机制', id: 'mechanism' },
          { label: 'GravArc 合约简介', id: 'gravarc-overview', sub: true },
          { label: 'GravArc 隐私保护机制', id: 'gravarc-privacy', sub: true },
          { label: '参考信息', id: 'reference' },
          { label: '定价', id: 'pricing', sub: true },
          { label: '常见问题', id: 'faq', sub: true },
          { label: '名词解释', id: 'glossary', sub: true },
        ]
        : [
          { label: 'Overview', id: 'overview' },
          { label: 'What is PactPay', id: 'what-is-pactpay', sub: true },
          { label: 'Core Features', id: 'core-features', sub: true },
          { label: 'Getting Started', id: 'getting-started' },
          { label: 'Core Flow', id: 'core-flow', sub: true },
          { label: 'Guide for Organisations', id: 'guide-organisations', sub: true },
          { label: 'Guide for Members', id: 'guide-members', sub: true },
          { label: 'Mechanism', id: 'mechanism' },
          { label: 'GravArc Overview', id: 'gravarc-overview', sub: true },
          { label: 'GravArc Privacy Mechanism', id: 'gravarc-privacy', sub: true },
          { label: 'Reference', id: 'reference' },
          { label: 'Pricing', id: 'pricing', sub: true },
          { label: 'FAQs', id: 'faq', sub: true },
          { label: 'Glossary', id: 'glossary', sub: true },
        ],
    [isZh]
  )

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  useEffect(() => {
    const ids = navItems.map(item => item.id)
    const threshold = window.innerHeight * 0.35
    const updateActive = () => {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= threshold) current = id
      }
      setActiveId(current)
    }

    window.addEventListener('scroll', updateActive, { passive: true })
    updateActive()
    return () => window.removeEventListener('scroll', updateActive)
  }, [navItems])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const permissionHeaders = isZh ? ['权限/能力', 'Owner', 'Admin', 'Operator'] : ['Permission/Capability', 'Owner', 'Admin', 'Operator']
  const permissionRows = isZh
    ? [
      ['查看成员列表', '✅', '✅', '✅'],
      ['搜索 / 筛选 / 排序', '✅', '✅', '✅'],
      ['导出成员列表', '✅', '✅', '✅'],
      ['审批待审批成员（Approve/Reject）', '✅', '✅', '✅'],
      ['编辑成员Payment额度', '✅', '✅', '✅'],
      ['发送登录提醒邮件（待激活成员）', '✅', '✅', '✅'],
      ['任命 Admin', '✅', '❌', '❌'],
      ['任命 / 降级 Operator', '✅', '✅', '❌'],
      ['移除成员', '✅（可移 Admin/Operator/Member）', '✅（仅 Operator/Member）', '✅（仅 Member）'],
      ['被移除 / 身份被变更', '❌（不可被删）', '仅 Owner 可操作', 'Owner/Admin 可操作'],
      ['删除组织', '✅', '❌', '❌'],
      ['邀请成员', '✅', '✅', '✅'],
      ['创建 Transaction', '✅', '✅', '✅'],
      ['执行 Transaction（合约划转）', '✅', '✅', '✅'],
    ]
    : [
      ['View member list', '✅', '✅', '✅'],
      ['Search / filter / sort', '✅', '✅', '✅'],
      ['Export member list', '✅', '✅', '✅'],
      ['Approve or reject pending members', '✅', '✅', '✅'],
      ['Edit member payment amount', '✅', '✅', '✅'],
      ['Send login reminder emails (pending members)', '✅', '✅', '✅'],
      ['Appoint Admin', '✅', '❌', '❌'],
      ['Appoint or demote Operator', '✅', '✅', '❌'],
      ['Remove members', '✅ (Admin/Operator/Member)', '✅ (Operator/Member only)', '✅ (Member only)'],
      ['Be removed or role changed', '❌ (Cannot be removed)', 'Owner only', 'Owner or Admin'],
      ['Delete organisation', '✅', '❌', '❌'],
      ['Invite members', '✅', '✅', '✅'],
      ['Create Transaction', '✅', '✅', '✅'],
      ['Execute Transaction (contract transfer)', '✅', '✅', '✅'],
    ]

  const faqItems = isZh
    ? [
      ['注册 PactPay 需要 KYC 吗？', '不需要。一个 EOA 钱包地址即可完成注册，无需提交任何身份信息或组织资料。'],
      ['PactPay 支持哪些支付场景？', '目前支持 member payment 发放。更多场景（AI API 采购、云计算与存储、DeFi 等）持续开放中。'],
      ['支持哪些链和代币？', '支持的链和代币有 Ethereum（USDC/USDT），Base（USDC/USDT）和 BSC（USDC/USDT）。'],
      ['资金安全吗？PactPay 会托管我的资金吗？', '不会。所有资金通过智能合约结算，PactPay 及任何第三方均无法接触或动用用户资金。'],
      ['链上观察者能看到我的交易信息吗？', '不能。GravArc 合约在协议层解耦存款与取款，链上观察者无法将取款溯源至付款方，交易金额和参与方身份均受 ZK 隐私保护。'],
      ['Secret 和 Password 丢失了怎么办？', 'Secret 仅在注册时由 Password 自动生成并在用户设备本地备份明文，在加密后存储在 PactPay 后端服务器，如丢失后可用 Password 重新生成。Password 用于 Secret 生成和解密取款信息，丢失后没有补救措施，请务必在注册时妥善备份。'],
      ['Organisation 可以设置多个管理员吗？', '可以。Owner 可以任命 Admin 和 Operator，不同角色对应不同操作权限，详见权限说明表。'],
      ['Payees 收款时需要支付 gas 吗？', '取款交易通过 Relayer 广播上链，gas 费用由 Relayer 代付，member 无需持有原生代币即可完成 claim。'],
      ['PactPay 支持退款吗？', '不支持。所有交易一经链上执行不可撤销，交易本金和平台手续费均无法退回，请在发起交易前确认收款方信息和金额无误。'],
    ]
    : [
      ['Do I need KYC to register on PactPay?', 'No. An EOA wallet address is all you need — no identity or organizational information required.'],
      ['What payment scenarios does PactPay support?', 'Currently, member payments. More scenarios (AI API procurement, cloud compute and storage, DeFi, etc.) are being rolled out.'],
      ['Which chains and tokens are supported?', 'Ethereum (USDC / USDT), Base (USDC / USDT), and BSC (USDC / USDT).'],
      ['Are my funds safe? Does PactPay hold my funds?', 'No. All funds settle through smart contracts. PactPay — and any third party — cannot touch or move user funds.'],
      ['Can on-chain observers see my transaction information?', 'No. The GravArc contract decouples deposits and withdrawals at the protocol level. On-chain observers cannot trace a withdrawal back to its payer. Transaction amounts and participant identities are all protected by ZK privacy.'],
      ['What if I lose my Secret or Password?', 'Your Secret is generated from your Password during registration and backed up in plaintext on your local device; it is also stored encrypted on PactPay\'s backend servers. If lost, it can be regenerated using your Password. Your Password is used to generate the Secret and to decrypt withdraw information — if lost, it cannot be recovered. Please back it up carefully at registration.'],
      ['Can an Organisation have multiple administrators?', 'Yes. The Owner can appoint Admins and Operators, each with different permissions. See the permissions table above.'],
      ['Do Payees pay gas when claiming?', 'No. Claim transactions are broadcast by the Relayer, which pays the gas. Members do not need to hold the native token to claim.'],
      ['Does PactPay support refunds?', 'No. Once a transaction is executed on-chain, it is irreversible. Neither the transaction principal nor the platform fee can be refunded. Please verify recipient information and amounts carefully before initiating a transaction.'],
    ]

  return (
    <div className="flex min-w-0 flex-1 text-[#1c1c26]" style={{ minHeight: 'calc(100vh - 90px)' }}>
      <div className="mx-auto flex min-w-0 w-full max-w-6xl">
        <aside className="sticky top-[90px] hidden h-[calc(100vh-90px)] w-[280px] flex-shrink-0 self-start overflow-y-auto border-r border-[rgba(0,0,0,0.06)] bg-white/60 px-4 py-8 backdrop-blur-sm md:block">
          <ul className="space-y-0.5">
            {navItems.map(({ label, id, sub }) => (
              <li key={id}>
                <button
                  onClick={() => scrollTo(id)}
                  className={`w-full rounded-[8px] px-3 py-1.5 text-left text-base transition-all ${sub ? 'pl-6 text-sm' : 'font-semibold'
                    } ${activeId === id
                      ? 'bg-[rgba(94,133,238,0.08)] font-medium text-[#5e85ee]'
                      : 'text-[#606067] hover:bg-[rgba(0,0,0,0.03)] hover:text-[#1c1c26]'
                    }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 max-w-3xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6 md:px-14 md:py-12 [&_a]:break-all [&_h2]:break-words [&_h3]:break-words [&_li]:break-words [&_p]:break-words">
          <div className="mb-6 overflow-x-auto rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-3 md:hidden">
            <div className="flex gap-2 flex-wrap">
              {navItems.map(({ label, id, sub }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${activeId === id
                    ? 'bg-[rgba(94,133,238,0.1)] text-[#5e85ee]'
                    : 'bg-white text-[#606067]'
                    } ${sub ? 'opacity-85' : 'font-semibold'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SectionAnchor id="overview" />
          <h2 className="mb-6 mt-2 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? '概览' : 'Overview'}</h2>

          <SectionAnchor id="what-is-pactpay" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '什么是 PactPay' : 'What is PactPay'}</h3>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'PactPay 是为 AI 与人类打造的全球非托管加密支付平台。'
              : 'PactPay is a global non-custodial crypto payment platform built for AI and humans.'}
          </p>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '无论是 Web3 团队、DAO、加密原生组织，还是 Agent、开发者、自由职业者及各类数字服务提供方，都可以通过 PactPay 在全球范围内自由协作，并直接完成价值交换。你可以雇佣其他 Agent 或人类，也可以按需购买 LLM Token、云计算、存储等关键数字服务。所有交易均在 PactPay 打造的隐私化支付基础设施上完成结算。'
              : 'Whether you\'re a Web3 team, a DAO, a crypto-native organization, or an agent, developer, freelancer, or digital service provider — PactPay lets you collaborate freely across the globe and exchange value directly. You can hire other agents or humans, and purchase key digital services such as LLM tokens, cloud compute, and storage. All transactions settle on PactPay\'s privacy-first payment infrastructure.'}
          </p>
          <ul className="mb-6 list-inside list-disc space-y-2 text-base leading-relaxed text-[#606067]">
            <li><strong className="text-[#1c1c26]">{isZh ? '门槛极低' : 'Frictionless onboarding'}</strong> — {isZh
              ? '使用加密数字货币作为支付与结算媒介，仅需一个 EOA 地址即可完成注册、支付与收款，无需 KYC，无需组织信息。'
              : 'Uses crypto as the payment and settlement medium. Register, send, and receive payments with just an EOA address — no KYC, no organizational information required.'}
            </li>
            <li><strong className="text-[#1c1c26]">{isZh ? '资金安全' : 'Fund security'}</strong> — {isZh
              ? '基于智能合约构建链上非托管支付结算系统，所有交易环节资金无需托管给包括 PactPay 在内的任何第三方。'
              : 'An on-chain non-custodial settlement system built on smart contracts. At no point in a transaction are funds held in custody by any third party, including PactPay.'}
            </li>
            <li><strong className="text-[#1c1c26]">{isZh ? '隐私保障' : 'Privacy by design'}</strong> — {isZh
              ? '基于零知识证明构建链上隐私交易能力，合约在协议层解耦存款与取款，链上观察者无法将特定交易溯源至发送方，支付结构的隐私性由代码保障，而非依赖政策与承诺。'
              : 'On-chain private transactions built on zero-knowledge proofs. The contract decouples deposits and withdrawals at the protocol level, so on-chain observers cannot trace any specific transaction back to its sender. Privacy is enforced by code, not by policy or promises.'}
            </li>
          </ul>

          <SectionAnchor id="core-features" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '核心特点' : 'Core Features'}</h3>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '全球协作，无边界支付' : 'Borderless global collaboration'}</h4>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '支持 Agent、开发者、自由职业者及各类数字服务提供方跨境协作与价值交换，一个钱包地址，即可注册、支付、收款，适配各类团队与组织规模，无地域和 KYC 限制。'
              : 'Enables agents, developers, freelancers, and digital service providers to collaborate and exchange value across borders. One wallet address is all you need to register, pay, and receive payments. Works for teams and organizations of any size, with no geographic or KYC restrictions.'}
          </p>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '非托管，资金自主' : 'Non-custodial, fund autonomy'}</h4>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '基于智能合约构建链上结算系统，资金全程由用户自主控制，无需托管给任何第三方，包括 PactPay。'
              : 'Built on smart contracts for on-chain settlement. Users retain full control of their funds at all times — no custody with any third party, including PactPay.'}
          </p>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? 'ZK 隐私保护' : 'ZK privacy protection'}</h4>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '零知识证明在协议层解耦存款与取款，链上观察者无法溯源交易发送方，隐私完全由代码保障。'
              : 'Zero-knowledge proofs decouple deposits and withdrawals at the protocol level. On-chain observers cannot trace a transaction back to its sender. Privacy is fully guaranteed by code.'}
          </p>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? 'AI 原生支持' : 'AI-native support'}</h4>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'EOA 地址即可完成注册与交易，支持 MCP 调用，Agent 可直接作为支付主体参与协作网络。'
              : 'Register and transact with just an EOA address. MCP is natively supported — agents can act directly as payment subjects in the collaboration network.'}
          </p>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '多场景覆盖' : 'Multi-scenario coverage'}</h4>
          <p className="mb-6 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '薪资发放、AI API 采购、云计算与存储付款、DeFi 服务，统一在一套支付基础设施上完成，无需切换平台。'
              : 'Payroll, AI API procurement, cloud compute and storage payments, DeFi services — all on the same payment infrastructure, no platform switching required.'}
          </p>

          <SectionAnchor id="getting-started" />
          <h2 className="mb-6 mt-14 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? '快速开始' : 'Getting Started'}</h2>

          <SectionAnchor id="core-flow" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '核心流程' : 'Core Flow'}</h3>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'PactPay 有两个角色：Organisation（发起支付的一方）和 Payees（接受支付的一方）。整个流程在链上完成，无平台中介。Payees 可以是你的组织成员（Members），或任何外部服务的提供者（Service Providers）。'
              : 'PactPay has two roles: Organisation (the party initiating payments) and Payees (the parties receiving them). The entire flow runs on-chain, with no platform intermediary. Payees can be members of your organization (Members), or providers of any external service (Service Providers).'}
          </p>

          <div className="mb-6 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-6 text-center">
            {/* <div className="text-[#8d8d93] text-sm">{isZh ? '[流程示意图]' : '[Flow diagram]'}</div> */}
            <img src="https://static-resource-1414792139.cos.ap-singapore.myqcloud.com/website-document/how%20it%20works1.png" alt="flow" className="mx-auto" />
          </div>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? 'Organisation 方操作流程' : 'Organisation flow'}</h4>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '连接钱包/邮箱注册并创建组织' : 'Connect wallet or sign in with email, then create an organisation.'}</li>
            <li>{isZh ? '邀请组织成员加入' : 'Invite members to the organisation.'}</li>
            <li>{isZh ? '对成员，或其他服务提供方发起交易' : 'Initiate transactions to members or to external service providers.'}</li>
          </ol>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? 'Member 方操作流程' : 'Member flow'}</h4>
          <ol className="mb-6 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '注册账号、链接钱包、设置密码并生成保护隐私的密钥' : 'Register an account, connect your wallet, set a password, and generate a privacy-protecting key.'}</li>
            <li>{isZh ? '加入组织' : 'Join an organisation.'}</li>
            <li>{isZh ? 'Claim 组织方的 payment' : 'Claim payments sent by the organisation.'}</li>
          </ol>

          <SectionAnchor id="guide-organisations" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '组织方上手指南' : 'Guide for Organisations'}</h3>

          <div className="mb-6 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-6 text-center">
            {/* <div className="text-[#8d8d93] text-sm">{isZh ? '[教学视频]' : '[Tutorial video]'}</div> */}
            <video key={isZh ? 'zh' : 'en'} width="100%" height="auto" autoPlay controls playsInline muted >
              {isZh ?
                <source src={'https://static-resource-1414792139.cos.ap-singapore.myqcloud.com/website-document/document-study-Chinese.mp4'} type="video/mp4" />
                : <source src={'https://static-resource-1414792139.cos.ap-singapore.myqcloud.com/website-document/document-study-English.mp4'} type="video/mp4" />}
            </video>

          </div>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '基础设置' : 'Basic setup'}</h4>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '打开 pactpay.app，连接钱包或者用邮件登陆。' : 'Open pactpay.app. Connect a wallet or sign in with email.'}</li>
            <li>{isZh ? '创建组织，设置你的个人（组织 Owner）信息以及组织的基础信息。' : 'Create an organisation. Fill in your personal info (as the Owner) and the organisation\'s basic details.'}</li>
            <li>{isZh ? '根据你常用的结算链和代币，在 Settings 中配置支付设置并保存。' : 'In Settings, configure your payment settings based on the settlement chain and token you commonly use, then save.'}</li>
          </ol>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '成员管理和转账' : 'Member management and payouts'}</h4>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '前往 Payees → Members → Invite Members，分享邀请链接或邀请码。' : 'Go to Payees → Members → Invite Members. Share the invite link or invite code.'}</li>
            <li>{isZh ? '成员用邀请链接或邀请码注册后，审核通过成员。' : 'After members register via the invite link or code, approve them.'}</li>
            <li>{isZh ? '如果还没有配置支付设置，需要在 Settings 中设置使用的链和代币。' : 'If you haven\'t configured payment settings yet, do so in Settings (chain and token).'}</li>
            <li>{isZh ? '在 Members 页面为每位成员设置打款金额。' : 'On the Members page, set the payment amount for each member.'}</li>
            <li>{isZh ? '前往 Transactions → New Transaction，选择成员、确认金额，提交交易。' : 'Go to Transactions → New Transaction. Select members, confirm amounts, and submit the transaction.'}</li>
            <li>{isZh ? '在 Transactions 中找到这条交易，点击执行按钮并签名，即可完成转账，成员在他们的 PactPay 后台 claim 相应款项即可。' : 'Find the transaction in the Transactions list, click Execute, and sign to complete the transfer. Members can then claim their payments from their PactPay dashboard.'}</li>
            <li>{isZh ? '您还可以设置组织其他成员为 admin 或者 operator 代为管理和执行交易，权限详情如下：' : 'You can also assign Admin or Operator roles to other members of the organisation to delegate management and transaction execution. Permission details below:'}</li>
          </ol>

          <div className="mb-6 overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {permissionHeaders.map(header => (
                    <th key={header} className="border border-[rgba(0,0,0,0.08)] px-3 py-3 text-left font-medium text-[#8d8d93]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionRows.map(([perm, ...roles]) => (
                  <tr key={perm} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 font-medium text-[#606067]">{perm}</td>
                    {roles.map((value, index) => (
                      <td key={index} className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-center text-[#606067]">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '服务购买' : 'Service purchase'}</h4>
          <p className="mb-6 text-base leading-relaxed text-[#606067]">
            {isZh ? '即将开放，敬请期待' : 'Coming soon.'}
          </p>

          <SectionAnchor id="guide-members" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '成员方上手指南' : 'Guide for Members'}</h3>
          <ol className="mb-6 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '通过组织方邀请链接注册账号，或者在注册时填入组织邀请码，即可自动加入组织。' : 'Register through the organisation\'s invite link, or enter the invite code during registration to automatically join the organisation.'}</li>
            <li>{isZh ? '注册过程中，链接钱包执行签名，并设置 password（该 password 用于加密系统自动生成 secret。secret 后续用于 claim 转账时验证身份，请务必妥善保管）。' : 'During registration, connect your wallet and sign, then set a password. The password is used to encrypt an automatically generated secret. This secret is later used to verify your identity when claiming payments — keep it safe.'}</li>
            <li>{isZh ? '等待组织方创建并执行交易。' : 'Wait for the organisation to create and execute a transaction.'}</li>
            <li>{isZh ? '组织方创建交易后，在 Transaction 列表中即可 claim 对应款项至任意钱包地址（需输入 password）。' : 'Once the organisation creates a transaction, claim the payment from your Transaction list to any wallet address (password required).'}</li>
          </ol>

          <SectionAnchor id="mechanism" />
          <h2 className="mb-6 mt-14 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? '底层机制' : 'Mechanism'}</h2>

          <SectionAnchor id="gravarc-overview" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? 'GravArc 合约简介' : 'GravArc Overview'}</h3>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'GravArc 是 PactPay 的链上隐私结算层，负责处理所有需要隐私保护的支付交易。'
              : 'GravArc is PactPay\'s on-chain privacy settlement layer, handling all payment transactions that require privacy protection.'}
          </p>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '在 PactPay 中，当用户发起薪资发放、AI API 采购或云服务付款等交易时，资金通过 GravArc 合约完成结算。合约在协议层将存款与取款完全解耦——付款方与收款方之间不存在任何可观察的链上关联，交易金额、参与方身份及收款地址均受到保护。'
              : 'When users initiate transactions in PactPay — payroll, AI API procurement, cloud service payments, and so on — funds settle through the GravArc contract. The contract fully decouples deposits and withdrawals at the protocol level: there is no observable on-chain link between payer and payee. Transaction amounts, participant identities, and receiving addresses are all protected.'}
          </p>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'GravArc 支持一对多支付场景，单笔交易可同时授权最多 128 个收款方，每个收款方独立取款，互不知情。所有隐私保障由 ZK 电路和智能合约代码强制执行，不依赖 PactPay 的运营政策或任何链下承诺。'
              : 'GravArc supports one-to-many payments — a single transaction can authorize up to 128 payees, and each withdraws independently without knowledge of the others. All privacy guarantees are enforced by the ZK circuit and smart contract code, not by PactPay\'s operational policies or any off-chain commitments.'}
          </p>

          <div className="mb-6 rounded-[18px] border border-[rgba(94,133,238,0.12)] bg-[linear-gradient(135deg,rgba(94,133,238,0.08),rgba(255,255,255,0.98))] p-4 md:p-5">
            <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <p className="text-base font-semibold text-[#1c1c26]">{isZh ? '合约地址' : 'Contract addresses'}</p>
              <span className="inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#5e85ee] shadow-[0_1px_6px_rgba(94,133,238,0.12)]">
                {isZh ? '公开可验证' : 'Public and verifiable'}
              </span>
            </div>
            <div className="grid gap-3">
              {contractAddresses.map(({ chain, environment, address, href }) => (
                <a key={`${chain}-${environment}`} href={href} target="_blank" rel="noreferrer" className="group rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/90 p-4 hover:border-[rgba(94,133,238,0.3)]">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#1c1c26]">{chain}</span>
                    <span className="rounded-full bg-[rgba(94,133,238,0.08)] px-2 py-0.5 text-xs font-medium text-[#5e85ee]">{environment}</span>
                  </div>
                  <code className="block break-all rounded-[10px] bg-[#f6f8fc] px-3 py-2 text-sm text-[#5e85ee] underline decoration-[1.5px] underline-offset-3">{address}</code>
                </a>
              ))}
            </div>
            <div className="mt-4 text-sm text-[#606067]">
              {isZh ? '合约审计报告链接：' : 'Audit report: '}
              <a href="https://github.com/currensa/pactpay-privacy/blob/main/AUDIT.md" target="_blank" rel="noreferrer" className="text-[#5e85ee] underline underline-offset-2">
                https://github.com/currensa/pactpay-privacy/blob/main/AUDIT.md
              </a>
            </div>
          </div>

          <SectionAnchor id="gravarc-privacy" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? 'GravArc 隐私保护机制' : 'GravArc Privacy Mechanism'}</h3>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '非托管性' : 'Non-custodial'}</h4>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'GravArc 是纯链上智能合约，资金流转全程由合约代码控制，没有任何中间方持有或接触用户资金。'
              : 'GravArc is a pure on-chain smart contract. Funds move under contract code control at every step, with no intermediary ever holding or touching user funds.'}
          </p>
          <ul className="mb-4 list-inside list-disc space-y-2 text-base leading-relaxed text-[#606067]">
            <li><strong className="text-[#1c1c26]">{isZh ? '支付方存款' : 'Depositor deposits'}</strong> — {isZh
              ? '直接调用 GravArc.deposit()，资金（ETH 或 ERC-20）由合约锁定，PactPay 及任何第三方均无法动用。'
              : 'Directly calls GravArc.deposit(). Funds (ETH or ERC-20) are locked by the contract. PactPay and any third party cannot move them.'}
            </li>
            <li><strong className="text-[#1c1c26]">{isZh ? '收款方取款' : 'Withdrawee withdraws'}</strong> — {isZh
              ? '直接调用 GravArc.withdraw()，合约验证 ZK Proof 通过后将资金直接转至收款方指定地址，无需任何授权方介入。'
              : 'Directly calls GravArc.withdraw(). After the contract verifies the ZK proof, funds transfer straight to the Withdrawee\'s specified address — no authorizer required.'}
            </li>
            <li><strong className="text-[#1c1c26]">{isZh ? '平台方 Relayer' : 'Relayer'}</strong> — {isZh
              ? 'Relayer 仅负责将收款方构造好的交易广播上链，不接触资金本身，无法修改交易内容，也无法拦截或挪用资金。'
              : 'Only broadcasts the transaction the Withdrawee has already constructed. Never touches funds, cannot modify transaction content, cannot intercept or divert funds.'}
            </li>
          </ul>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '隐私保护机制' : 'Privacy protection'}</h4>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'GravArc 的隐私保护基于三层设计：承诺方案、ZK 证明、链上状态最小化。'
              : 'GravArc\'s privacy is built on three layers: a commitment scheme, ZK proofs, and minimized on-chain state.'}
          </p>

          <h5 className="mb-2 mt-4 text-base font-semibold text-[#1c1c26]">{isZh ? '1. 承诺方案（Commitment Scheme）：存取款链路切断' : '1. Commitment scheme: severing the deposit-withdrawal link'}</h5>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '存款时，Depositor 为每个 Withdrawee 生成随机 nullifier_i，结合 Withdrawee 已公开的 H(secret_i)，计算：'
              : 'At deposit, the Depositor generates a random nullifier_i for each Withdrawee and combines it with the Withdrawee\'s public H(secret_i):'}
          </p>
          <pre className="mb-4 overflow-x-auto whitespace-pre-wrap break-words rounded-[14px] bg-[#1c1c26] px-5 py-4 text-sm leading-relaxed text-[#f5f5f5]">
            {isZh ? `commitment_i = Poseidon(H(secret_i), nullifier_i)
authLeaf_i   = Poseidon(commitment_i, amount_i, token_i)` : `commitment_i = Poseidon(H(secret_i), nullifier_i)
authLeaf_i   = Poseidon(commitment_i, amount_i, token_i)`}
          </pre>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '所有 authLeaf 构建为 Auth Tree，其根 authRoot 作为 Deposit Tree 的叶子写入链上。链上只存储 authRoot，不存储任何 Withdrawee 地址、金额、token 信息。存款与取款之间没有可观察的链上关联。'
              : 'All authLeafs are assembled into an Auth Tree. Its root, authRoot, is written to the Deposit Tree as a leaf. Only authRoot is stored on-chain — no Withdrawee address, amount, or token information. There is no observable on-chain link between a deposit and any withdrawal.'}
          </p>

          <h5 className="mb-2 mt-4 text-base font-semibold text-[#1c1c26]">{isZh ? '2. ZK 证明：取款时不暴露身份' : '2. ZK proof: withdraw without revealing identity'}</h5>

          <div className="mb-4 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-6 text-center">
            {/* <div className="text-[#8d8d93] text-sm">{isZh ? '[ZK 证明示意图]' : '[ZK proof diagram]'}</div> */}
            <img src="https://static-resource-1414792139.cos.ap-singapore.myqcloud.com/website-document/how%20it%20works2.png" alt={isZh ? 'ZK 证明示意图' : 'ZK proof diagram'} className="mx-auto" />
          </div>

          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '取款时，Withdrawee 本地持有 secret（从不上链、从不共享），用 Depositor 加密发送的 nullifier_i 重建 commitment，生成 ZK Proof：'
              : 'At withdrawal, the Withdrawee locally holds secret (never on-chain, never shared). Using the nullifier_i sent (encrypted) by the Depositor, they reconstruct the commitment and generate a ZK proof of:'}
          </p>
          <ul className="mb-4 list-inside list-disc space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '我知道对应 H(secret) 的 secret（身份合法）' : 'I know the secret corresponding to H(secret) (identity is valid).'}</li>
            <li>{isZh ? '我持有的 nullifier 对应 Auth Tree 中某个叶子（Depositor 授权了我）' : 'My nullifier corresponds to some leaf in the Auth Tree (I was authorized by the Depositor).'}</li>
            <li>{isZh ? '该 Auth Tree 根存在于 Deposit Tree 中（存款真实发生）' : 'That Auth Tree root exists in the Deposit Tree (the deposit actually happened).'}</li>
            <li>{isZh ? '我要提取的金额和 token 与 Depositor 授权的完全一致' : 'The amount and token I\'m withdrawing exactly match what the Depositor authorized.'}</li>
          </ul>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '链上只验证 Proof 有效性，不知道 Withdrawee 是谁、对应哪笔存款、其他 Withdrawee 有谁。使用 Groth16（snarkjs / rapidsnark），proof 大小固定，验证 gas 约 221,750。'
              : 'The chain only verifies proof validity. It does not learn who the Withdrawee is, which deposit is being drawn from, or who the other Withdrawees are. GravArc uses Groth16 (via snarkjs / rapidsnark). Proof size is constant; verification costs ~221,750 gas.'}
          </p>

          <h5 className="mb-2 mt-4 text-base font-semibold text-[#1c1c26]">{isZh ? '3. 防双花：Nullifier Hash 上链' : '3. Double-spend prevention: on-chain nullifier hash'}</h5>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '取款时将 nullifierHash = Poseidon(nullifier_i) 作为 public inputs 之一，写入链上，同一 note 再次取款时合约直接拒绝。nullifierHash 本身不泄露 nullifier 原值，也无法关联到存款记录。'
              : 'On withdrawal, nullifierHash = Poseidon(nullifier_i) is submitted as a public input and written on-chain. A second withdrawal from the same note is rejected by the contract. The nullifierHash itself reveals nothing about the original nullifier and cannot be linked back to any deposit record.'}
          </p>

          <h5 className="mb-2 mt-4 text-base font-semibold text-[#1c1c26]">{isZh ? '4. 一对多：多 Withdrawee 互不知情' : '4. One-to-many: Withdrawees are mutually invisible'}</h5>

          <div className="mb-4 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-6 text-center">
            {/* <div className="text-[#8d8d93] text-sm">{isZh ? '[一对多支付示意图]' : '[One-to-many payment diagram]'}</div> */}
            <img src="https://static-resource-1414792139.cos.ap-singapore.myqcloud.com/website-document/how%20it%20works3.png" alt={isZh ? '一对多支付示意图' : 'One-to-many payment diagram'} className="mx-auto" />
          </div>

          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '单笔存款最多支持 128 个 Withdrawee，分为 5 个 tier（8/16/32/64/128）。每个 Withdrawee 仅能看到自己的 Auth Tree 路径，无法得知其他 Withdrawee 的存在、数量或金额。链上观察者只能看到"一笔存款，N 笔取款"，无法确认 N 的真实值，也无法将任何取款关联至发送方。'
              : 'A single deposit supports up to 128 Withdrawees, in 5 tiers (8 / 16 / 32 / 64 / 128). Each Withdrawee sees only their own Auth Tree path — they cannot learn the existence, count, or amounts of any other Withdrawees. On-chain observers see "one deposit, N withdrawals" but cannot verify the true value of N, nor link any withdrawal back to the sender.'}
          </p>

          <h5 className="mb-2 mt-4 text-base font-semibold text-[#1c1c26]">{isZh ? '5. 通信加密：取款信息传递' : '5. Encrypted communication: delivering withdraw information'}</h5>
          <p className="mb-6 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'Depositor 将取款信息（nullifier_i、amount_i、token、Merkle 路径等）使用 Withdrawee 的 NaCl box（tweetnacl）加密后存入链上 Encrypted Message Box。取款信息只有对应 Withdrawee 可以解密，Depositor 加密后也无法再恢复明文。'
              : 'The Depositor encrypts each Withdrawee\'s withdraw information (nullifier_i, amount_i, token, Merkle path, etc.) using the Withdrawee\'s NaCl box (tweetnacl) and stores it in the on-chain Encrypted Message Box. Only the corresponding Withdrawee can decrypt it — not even the Depositor can recover the plaintext after encryption.'}
          </p>

          <SectionAnchor id="reference" />
          <h2 className="mb-6 mt-14 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? '参考信息' : 'Reference'}</h2>

          <SectionAnchor id="pricing" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '定价' : 'Pricing'}</h3>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '向组织成员付款' : 'Paying organisation members'}</h4>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '不收取月费、会员费等，按照实际发生的交易笔数每次收取固定手续费。（一笔 = 对一个收款地址发起的一笔交易，如一次性批量支付给多个地址，则算多次，有几个地址收取几份）'
              : 'No monthly fees, no membership fees. A fixed fee is charged per actual transaction, where "one transaction" means one payment to one recipient address. Batching payments to multiple addresses in a single operation counts as multiple transactions; the fee is charged per address.'}
          </p>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '服务购买' : 'Service purchase'}</h4>
          <p className="mb-6 text-base leading-relaxed text-[#606067]">
            {isZh ? '即将开放' : 'Coming soon.'}
          </p>

          <SectionAnchor id="faq" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '常见问题' : 'FAQs'}</h3>
          <div className="mb-6 space-y-4">
            {faqItems.map(([q, a]) => (
              <div key={q} className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
                <p className="mb-1 text-base font-semibold text-[#1c1c26]">{q}</p>
                <p className="text-base text-[#606067]">{a}</p>
              </div>
            ))}
          </div>

          <SectionAnchor id="glossary" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '名词解释' : 'Glossary'}</h3>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '账号与身份' : 'Account & identity'}</h4>
          <div className="mb-6 space-y-4">
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">EOA (Externally Owned Account)</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '外部账户，即由私钥控制的以太坊钱包地址。PactPay 使用 EOA 地址作为唯一身份标识，无需 KYC 或实名信息即可完成注册与交易。'
                  : 'An Ethereum wallet address controlled by a private key. PactPay uses the EOA address as the sole identity identifier; no KYC or real-name information is needed to register and transact.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">{isZh ? '非托管' : 'Non-custodial'}</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '用户资金全程由用户的私钥控制，平台（包括 PactPay）无法接触或动用用户资金。所有结算逻辑由智能合约强制执行。'
                  : 'User funds are controlled by the user\'s private key at all times. The platform (including PactPay) cannot touch or move them. All settlement logic is enforced by smart contracts.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Secret</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Withdrawee（收款方）本地持有的持久化私密值，从不上链、从不共享。是生成取款证明的核心私有输入。'
                  : 'A persistent private value held locally by the Withdrawee. Never uploaded on-chain, never shared. The core private input for generating withdrawal proofs.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">H(secret)</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Secret 的 Poseidon 哈希值，Depositor 使用此值生成 commitment，但无法从中反推 secret 原值。'
                  : 'The Poseidon hash of the Secret. The Depositor uses this value to construct commitments but cannot derive the original Secret from it.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Password</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '用户在 PactPay 客户端设置的本地密码，用于解密 Withdrawee 收到的加密取款信息（withdraw information）。仅在当前会话中使用一次，不上链存储。'
                  : 'A local password set by the user in the PactPay client. Used to decrypt encrypted withdraw information received by the Withdrawee. Used only once per session; not stored on-chain.'}
              </p>
            </div>
          </div>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '平台功能相关' : 'Platform functionality'}</h4>
          <div className="mb-6 space-y-4">
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Transaction</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'PactPay 中的支付单元，由 Organisation 创建并执行，包含收款方列表、金额、链和代币配置。执行时触发 GravArc 合约的 deposit 操作。'
                  : 'The unit of payment in PactPay. Created and executed by the Organisation. Contains the recipient list, amounts, chain, and token configuration. Execution triggers the deposit operation on the GravArc contract.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Claim</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Payees 在收到 Organisation 发起的 Transaction 后，输入 password 解密取款信息，生成 ZK Proof 并提交至合约完成取款的操作。'
                  : 'After receiving a Transaction from the Organisation, the Payee enters their password to decrypt the withdraw information, generates a ZK proof, and submits it to the contract to complete the withdrawal.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">GravArc {isZh ? '合约' : 'contract'}</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'GravArc 是 PactPay 的链上隐私结算合约，基于零知识证明实现存取款链路的完全解耦，所有交易隐私由代码强制保障。'
                  : 'PactPay\'s on-chain privacy settlement contract. Uses zero-knowledge proofs to fully decouple deposits and withdrawals. All transaction privacy is enforced by code.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">MCP (Model Context Protocol)</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'AI Agent 调用外部工具和服务的标准协议。PactPay 支持通过 MCP 接入，使 Agent 可直接作为支付主体发起或接收交易，无需人工介入。'
                  : 'The standard protocol by which AI agents call external tools and services. PactPay supports MCP integration, so agents can act directly as payment subjects — initiating or receiving transactions without human intervention.'}
              </p>
            </div>
          </div>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? '支付角色' : 'Payment roles'}</h4>
          <div className="mb-6 space-y-4">
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Organisation</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '发起支付的一方，负责创建交易、管理成员、执行链上结算。可设置 Owner、Admin、Operator 三种权限角色。'
                  : 'The party initiating payments. Responsible for creating transactions, managing members, and executing on-chain settlement. Can assign three permission roles: Owner, Admin, Operator.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Payees</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '接受支付的一方，包括组织内部成员（Members）和外部服务提供方（Service Providers）。'
                  : 'The parties receiving payments. Includes internal organisation members (Members) and external Service Providers.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Depositor</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'GravArc 合约层的存款方，对应 Organisation 角色。负责生成 nullifier、构建 Auth Tree、提交存款 ZK Proof 并将加密取款信息发送给各 Withdrawee。'
                  : 'The depositing party at the GravArc contract layer, corresponding to the Organisation role. Responsible for generating nullifiers, constructing the Auth Tree, submitting the deposit ZK proof, and sending encrypted withdraw information to each Withdrawee.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Withdrawee</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'GravArc 合约层的取款方，对应 Payees 角色。持有 secret，解密取款信息后生成 withdraw ZK Proof，独立完成取款。'
                  : 'The withdrawing party at the GravArc contract layer, corresponding to the Payees role. Holds the Secret. Decrypts withdraw information, generates a withdrawal ZK proof, and completes the withdrawal independently.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Relayer</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '负责将 Withdrawee 构造好的取款交易广播上链，Relayer 不接触资金本身，无法修改交易内容，不影响非托管性。'
                  : 'Broadcasts the Withdrawee\'s constructed withdrawal transaction on-chain. Does not touch funds, cannot modify transaction content, does not affect the non-custodial nature of the system.'}
              </p>
            </div>
          </div>

          <h4 className="mb-2 mt-4 text-lg font-semibold text-[#1c1c26]">{isZh ? 'ZK 与密码学' : 'ZK & cryptography'}</h4>
          <div className="mb-6 space-y-4">
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">{isZh ? '零知识证明' : 'Zero-Knowledge Proof'} (ZKP)</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '一种密码学证明机制，允许证明方在不透露任何私密信息的前提下，向验证方证明某个陈述为真。GravArc 使用 ZKP 证明取款合法性，同时不暴露存取款之间的关联。'
                  : 'A cryptographic proof mechanism allowing a prover to convince a verifier that a statement is true without revealing any private information. GravArc uses ZKPs to prove withdrawal legitimacy without exposing the link between deposit and withdrawal.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Groth16</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'GravArc 采用的 ZK 证明方案，基于椭圆曲线配对，生成固定大小的 proof，链上验证 gas 成本固定（约 221,750 gas）。'
                  : 'The ZK proving scheme used by GravArc. Based on elliptic curve pairings. Produces fixed-size proofs with a fixed on-chain verification cost (~221,750 gas).'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Poseidon Hash</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '专为 ZK 电路优化的哈希函数，约束数量远低于 SHA256，是 GravArc 中所有承诺计算的基础哈希原语。'
                  : 'A hash function optimized for ZK circuits, requiring far fewer constraints than SHA256. The primary hash primitive underlying all commitment computations in GravArc.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Nullifier</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Depositor 为每个 Withdrawee 随机生成的一次性值，用于构建 commitment。取款时其哈希值（nullifierHash）写入链上，防止同一 note 被重复取款。'
                  : 'A one-time value randomly generated by the Depositor for each Withdrawee. Used to construct the commitment. On withdrawal, its hash (nullifierHash) is written on-chain to prevent double-spending of the same note.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">NullifierHash</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Poseidon(nullifier) 的计算结果，取款后记录在合约中。链上观察者看到的是 nullifierHash，无法反推 nullifier 原值，也无法关联到对应存款。'
                  : 'The result of Poseidon(nullifier). Recorded in the contract after withdrawal. On-chain observers see only the nullifierHash; they cannot derive the original nullifier, nor link it back to the corresponding deposit.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Commitment</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Poseidon(H(secret), nullifier) 的计算结果，将 Withdrawee 的持久身份与 Depositor 生成的 nullifier 绑定。只有持有 secret 的 Withdrawee 才能构造合法 commitment，进而生成有效取款证明。'
                  : 'The result of Poseidon(H(secret), nullifier). Binds the Withdrawee\'s persistent identity to the nullifier generated by the Depositor. Only a Withdrawee holding the Secret can construct a valid commitment and generate a valid withdrawal proof.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Auth Leaf</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Poseidon(commitment, amount, token) 的计算结果，将收款方身份、金额、token 类型三者绑定为一个叶子节点，进入 Auth Tree。'
                  : 'The result of Poseidon(commitment, amount, token). Binds recipient identity, amount, and token type into a single leaf node in the Auth Tree.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Auth Tree</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '由单笔存款中所有 Withdrawee 的 Auth Leaf 构建的 Merkle Tree，其根（authRoot）作为该笔存款的链上标识写入 Deposit Tree。'
                  : 'A Merkle tree built from all Withdrawees\' Auth Leaves within a single deposit. Its root (authRoot) is written to the Deposit Tree as the on-chain identifier for that deposit.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Auth Root</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'Auth Tree 的根哈希，同时也是 Deposit Tree 的叶子。链上只存储 authRoot，不记录任何 Withdrawee 的具体信息。'
                  : 'The root hash of the Auth Tree. Also serves as a leaf in the Deposit Tree. Only the authRoot is stored on-chain — no specific Withdrawee information.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Deposit Tree</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '全局 Merkle Tree，记录所有历史存款的 authRoot。深度为 20，最多支持 2²⁰ 笔存款。取款时 Withdrawee 需证明对应 authRoot 存在于 Deposit Tree 中。'
                  : 'A global Merkle tree recording the authRoot of every historical deposit. Depth is 20; supports up to 2²⁰ deposits. On withdrawal, the Withdrawee proves that the corresponding authRoot exists in the Deposit Tree.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Merkle Proof</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? '证明某个叶子节点属于某棵 Merkle Tree 的路径数据，包含 pathElements（兄弟节点哈希）和 pathIndices（左右方向）。ZK 电路使用 Merkle Proof 在链下验证成员关系，不需要链上遍历。'
                  : 'Path data proving that a leaf node belongs to a given Merkle tree. Contains pathElements (sibling node hashes) and pathIndices (left/right directions). The ZK circuit uses Merkle proofs to verify membership off-chain, avoiding on-chain traversal.'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 px-5 py-4">
              <p className="mb-1 text-base font-semibold text-[#1c1c26]">Circuit Tier</p>
              <p className="text-base text-[#606067]">
                {isZh
                  ? 'GravArc 为不同 Withdrawee 数量预编译了 5 个电路档位：8、16、32、64、128。Depositor 选择能覆盖实际 Withdrawee 数量的最小档位，未使用的槽位补零。'
                  : 'GravArc pre-compiles 5 circuit tiers for different Withdrawee counts: 8, 16, 32, 64, 128. The Depositor selects the smallest tier that covers the actual Withdrawee count; unused slots are zero-padded.'}
              </p>
            </div>
          </div>

          <div className="border-t border-[rgba(0,0,0,0.06)] pt-8 text-center text-base text-[#8d8d93]">
            {isZh ? '© 2026 PactPay。面向未来工作的支付基础设施。' : '© 2026 PactPay. Built for the future of work.'}
          </div>
        </div>
      </div>
    </div>
  )
}
