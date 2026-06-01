import { usePublicCopy } from '@/views/public/copy'
import { useEffect, useMemo, useState } from 'react'

type NavItem = { label: string; id: string; sub?: boolean }

const contractAddresses = [
  {
    chain: 'Base',
    environment: 'Mainnet',
    address: '0x16458100Aa146046067831827cdB91f6a6E0535D',
    href: 'https://basescan.org/address/0x16458100aa146046067831827cdb91f6a6e0535d',
  },
  {
    chain: 'BNB Smart Chain',
    environment: 'Mainnet',
    address: '0x16458100Aa146046067831827cdB91f6a6E0535D',
    href: 'https://bscscan.com/address/0x16458100aa146046067831827cdb91f6a6e0535d',
  },
  {
    chain: 'Sepolia',
    environment: 'Testnet',
    address: '0x5F2E184B850E552f1B66f754EAD5d278475f6811',
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
            { label: '核心原则', id: 'core-principles', sub: true },
            { label: '快速开始', id: 'getting-started' },
            { label: '工作流程', id: 'how-it-works', sub: true },
            { label: '面向组织', id: 'for-organisations', sub: true },
            { label: '面向成员', id: 'for-members', sub: true },
            { label: '机制', id: 'mechanism' },
            { label: '为何是非托管', id: 'non-custodial', sub: true },
            { label: '合约地址', id: 'contract-addresses', sub: true },
            { label: '地址保护', id: 'address-protection', sub: true },
            { label: 'API 服务', id: 'api-services' },
            { label: 'MCP 服务器', id: 'mcp-server', sub: true },
            { label: '参考信息', id: 'reference' },
            { label: '定价', id: 'doc-pricing', sub: true },
            { label: 'FAQ', id: 'faq', sub: true },
          ]
        : [
            { label: 'Overview', id: 'overview' },
            { label: 'What is PactPay', id: 'what-is-pactpay', sub: true },
            { label: 'Core principles', id: 'core-principles', sub: true },
            { label: 'Getting Started', id: 'getting-started' },
            { label: 'How it works', id: 'how-it-works', sub: true },
            { label: 'For organisations', id: 'for-organisations', sub: true },
            { label: 'For members', id: 'for-members', sub: true },
            { label: 'Mechanism', id: 'mechanism' },
            { label: 'Why non-custodial', id: 'non-custodial', sub: true },
            { label: 'Contract addresses', id: 'contract-addresses', sub: true },
            { label: 'Address protection', id: 'address-protection', sub: true },
            { label: 'API Services', id: 'api-services' },
            { label: 'MCP server', id: 'mcp-server', sub: true },
            { label: 'Reference', id: 'reference' },
            { label: 'Pricing', id: 'doc-pricing', sub: true },
            { label: 'FAQ', id: 'faq', sub: true },
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

  const permissionHeaders = isZh ? ['权限', 'Owner', 'Admin', 'Operator'] : ['Permission', 'Owner', 'Admin', 'Operator']
  const permissionRows = isZh
    ? [
        ['查看成员列表', '是', '是', '是'],
        ['搜索、筛选、排序', '是', '是', '是'],
        ['导出成员列表', '是', '是', '是'],
        ['审批待加入成员', '是', '是', '是'],
        ['编辑成员付款金额', '是', '是', '是'],
        ['发送登录提醒邮件', '是', '是', '是'],
        ['任命 Admin', '是', '是', '是'],
        ['任命或降级 Operator', '是', '是', '是'],
        ['移除成员', '是（Admin / Op / Member）', '是（仅 Op / Member）', '是（仅 Member）'],
        ['被移除或变更角色', '不可被移除', '仅 Owner', 'Owner 或 Admin'],
        ['删除组织', '是', '是', '是'],
        ['邀请成员', '是', '是', '是'],
        ['创建交易', '是', '是', '是'],
        ['执行交易', '是', '是', '是'],
      ]
    : [
        ['View member list', 'Yes', 'Yes', 'Yes'],
        ['Search, filter, sort', 'Yes', 'Yes', 'Yes'],
        ['Export member list', 'Yes', 'Yes', 'Yes'],
        ['Approve or reject pending members', 'Yes', 'Yes', 'Yes'],
        ['Edit member payment amount', 'Yes', 'Yes', 'Yes'],
        ['Send login reminder emails', 'Yes', 'Yes', 'Yes'],
        ['Appoint Admin', 'Yes', 'Yes', 'Yes'],
        ['Appoint or demote Operator', 'Yes', 'Yes', 'Yes'],
        ['Remove members', 'Yes (Admin, Op, Mem)', 'Yes (Op, Mem only)', 'Yes (Mem only)'],
        ['Be removed or have role changed', 'Cannot be removed', 'Owner only', 'Owner or Admin'],
        ['Delete organisation', 'Yes', 'Yes', 'Yes'],
        ['Invite members', 'Yes', 'Yes', 'Yes'],
        ['Create transaction', 'Yes', 'Yes', 'Yes'],
        ['Execute transaction', 'Yes', 'Yes', 'Yes'],
      ]

  const faqOrg = isZh
    ? [
        ['服务费何时收取？', '服务费会在付款执行后第一位成员领取时收取。如果没有成员领取，则不会产生服务费。'],
        ['如果我在领取时间之后才执行交易，会怎样？', '资金进入合约后会立即释放，成员无需等待即可直接领取。'],
        ['交易执行后还能修改成员付款金额吗？', '不能。金额会在签名时锁定，如需调整，需要重新创建交易。'],
        ['执行交易的 Gas 费由谁承担？', '由组织钱包直接向区块链网络支付，独立于 PactPay 服务费。'],
        ['交易执行后可以取消吗？', '可以。在所有成员完成领取前，你都可以发起退款请求。'],
      ]
    : [
        ['When is the service fee charged?', 'The service fee is charged when the first member claims after a payment is executed. If no members claim, no fee is incurred.'],
        ['What happens if I execute a transaction after the claim time has passed?', 'Funds are released immediately upon entering the contract. Members can claim right away without waiting.'],
        ['Can I modify member payment amounts after a transaction is executed?', 'No. Amounts are locked at the point of signing. To make adjustments, you will need to create a new transaction.'],
        ['Who pays the gas fee for executing a transaction?', "The organisation's wallet pays the gas fee. This fee is charged directly by the blockchain network and is separate from PactPay."],
        ['Can I cancel a transaction after it has been executed?', 'Yes. You can request a refund at any time before all members have completed their claims.'],
      ]

  const faqMember = isZh
    ? [
        ['如何加入组织？', '向组织索取邀请链接或邀请码。注册后，你的成员状态会先处于待审批。'],
        ['为什么我看不到 Claim 按钮？', '可能是领取时间未到，或组织尚未执行该交易。请检查交易状态，或联系组织确认。'],
        ['领取前资金在哪里？', '资金保存在支付智能合约中，并在领取时间之前保持锁定。合约内容可在链上公开验证。'],
        ['我可以更换登录钱包或收款钱包吗？', '登录钱包在存在未领取交易时不建议更换，否则会导致签名不匹配。收款钱包可以在领取时按需更换。'],
        ['领取需要支付 Gas 费吗？', '不需要。成员领取的 Gas 费由 PactPay 承担。'],
      ]
    : [
        ['How do I join an organisation?', 'Ask your organisation for an invite link or invite code. After registering, your membership will be pending until the organisation approves it.'],
        ["Why can't I see a Claim button?", "Either the claim time has not arrived yet, or the organisation has not executed the transaction. Check the transaction status or contact your organisation to confirm."],
        ['Where are my funds before I claim?', 'Your funds are held in the payment smart contract, locked until the claim time. The contract content is publicly verifiable on-chain.'],
        ['Can I change my login or receiving wallet?', 'Changing the login wallet while unclaimed transactions exist can break signature matching. The receiving wallet can be updated during the claim flow.'],
        ['Do I need to pay gas to claim?', 'No. Gas fees for member claims are covered by PactPay.'],
      ]

  return (
    <div className="flex flex-1 text-[#1c1c26]" style={{ minHeight: 'calc(100vh - 90px)' }}>
      <div className="mx-auto flex w-full max-w-6xl">
        <aside className="sticky top-[90px] hidden h-[calc(100vh-90px)] w-[280px] flex-shrink-0 self-start overflow-y-auto border-r border-[rgba(0,0,0,0.06)] bg-white/60 px-4 py-8 backdrop-blur-sm md:block">
          <ul className="space-y-0.5">
            {navItems.map(({ label, id, sub }) => (
              <li key={id}>
                <button
                  onClick={() => scrollTo(id)}
                  className={`w-full rounded-[8px] px-3 py-1.5 text-left text-base transition-all ${
                    sub ? 'pl-6 text-sm' : 'font-semibold'
                  } ${
                    activeId === id
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

        <div className="max-w-3xl flex-1 px-4 py-8 sm:px-6 md:px-14 md:py-12">
          <div className="mb-6 overflow-x-auto rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/70 p-3 md:hidden">
            <div className="flex gap-2">
              {navItems.map(({ label, id, sub }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${
                    activeId === id
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
              ? 'PactPay 是一个面向组织的非托管加密支付平台。你可以在一个地方向贡献者付款、采购服务并管理全部加密支出，无需 KYC、无需资金托管、无需暴露组织信息，也不依赖中介。'
              : 'PactPay is a non-custodial crypto payment platform for organisations. Pay contributors, purchase services, and manage all crypto spending in one place with no KYC, no fund custody, no org info needed, and no intermediary.'}
          </p>
          <p className="mb-6 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'PactPay 适用于 Web3 团队、DAO 以及任何以加密资产运作的组织。无论你是在发薪，还是采购 AI API、云服务等基础设施，所有支付都会通过保护隐私的智能合约完成。'
              : "PactPay is built for Web3 teams, DAOs, and any organisation that operates in crypto. Whether you're running payroll or buying infrastructure like AI APIs and cloud services, every payment goes through a smart contract that guards your privacy."}
          </p>

          <SectionAnchor id="core-principles" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '核心原则' : 'Core principles'}</h3>
          <ol className="list-inside list-decimal space-y-3 text-base leading-relaxed text-[#606067]">
            <li><strong className="text-[#1c1c26]">{isZh ? '默认自托管' : 'Self-Custody by Default'}</strong> {isZh ? '资金始终由付款方控制，不经第三方托管。' : 'Funds stay in the payer’s control at all times.'}</li>
            <li><strong className="text-[#1c1c26]">{isZh ? '天然匿名' : 'Anonymous by Design'}</strong> {isZh ? '一个 EOA 地址即可注册、支付和收款，无需身份绑定。' : 'A single EOA address is all you need to register, pay, and receive.'}</li>
            <li><strong className="text-[#1c1c26]">{isZh ? '隐形身份层' : 'Invisible Identity Layer'}</strong> {isZh ? '身份仅用于验证，链上只保留受保护身份。' : 'Your identity is used for verification but never exposed on-chain.'}</li>
            <li><strong className="text-[#1c1c26]">{isZh ? '双地址隔离' : 'Dual-Address Isolation'}</strong> {isZh ? '受保护身份与收款地址完全隔离，可独立更换。' : 'Your shielded identity and receiving address are fully isolated from each other.'}</li>
          </ol>

          <SectionAnchor id="getting-started" />
          <h2 className="mb-6 mt-14 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? '快速开始' : 'Getting Started'}</h2>

          <SectionAnchor id="how-it-works" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '工作流程' : 'How it works'}</h3>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh
              ? 'PactPay 主要分为两种角色：组织方（付款方）和成员（收款方）。整个流程都在链上完成，不依赖任何中介。'
              : 'PactPay has two roles: Organisation (the paying party) and Member (the receiving party). The entire flow happens on-chain with no intermediary.'}
          </p>
          <div className="mb-4 rounded-r-[12px] border-l-4 border-[#5e85ee] bg-[rgba(94,133,238,0.06)] px-4 py-3 text-base italic text-[#606067]">
            {isZh ? '注意：付款不会自动推送。成员需要在领取时间到达后主动发起领取。' : 'Note: Payments are not sent automatically. Members must actively claim their payment after the claim time arrives.'}
          </div>
          <p className="mb-2 text-base font-semibold text-[#1c1c26]">{isZh ? '组织方流程' : 'Organisation flow'}</p>
          <ol className="mb-5 list-inside list-decimal space-y-1 text-base text-[#606067]">
            <li>{isZh ? '连接钱包或使用邮箱登录并注册' : 'Connect your wallet or sign in with email and register'}</li>
            <li>{isZh ? '创建组织' : 'Create your organisation'}</li>
            <li>{isZh ? '邀请成员（可选）' : 'Invite members (optional)'}</li>
            <li>{isZh ? '创建并执行面向成员或服务的付款交易' : 'Create and execute payment transactions to people or services'}</li>
          </ol>
          <p className="mb-2 text-base font-semibold text-[#1c1c26]">{isZh ? '成员流程' : 'Member flow'}</p>
          <ol className="list-inside list-decimal space-y-1 text-base text-[#606067]">
            <li>{isZh ? '注册账户，连接 EOA 钱包，并完成两次签名生成受保护身份' : 'Register an account, connect your EOA wallet, and complete two signing steps to generate your shielded identity'}</li>
            <li>{isZh ? '加入组织' : 'Join an organisation'}</li>
            <li>{isZh ? '等待组织创建并执行交易' : 'Wait for the organisation to create and execute a transaction'}</li>
            <li>{isZh ? '领取时间到达后，通过受保护身份将付款领取到任意钱包地址' : 'Once the claim time arrives, claim your payment to any wallet address via your shielded identity'}</li>
          </ol>

          <SectionAnchor id="for-organisations" />
          <h3 className="mb-3 mt-10 text-xl font-bold text-[#1c1c26]">{isZh ? '面向组织' : 'For organisations'}</h3>
          <p className="mb-1 text-base font-semibold text-[#1c1c26]">{isZh ? '基础设置' : 'Setting up'}</p>
          <ol className="mb-6 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '访问 pactpay.app，连接钱包或使用邮箱登录。' : 'Go to pactpay.app and connect your wallet or sign in with email.'}</li>
            <li>{isZh ? '创建组织并填写基础信息。' : 'Create your organisation and fill in the basic details.'}</li>
            <li>{isZh ? '在 Settings 中配置交易使用的链和代币。' : 'Configure payment settings under Settings, including chain and token type.'}</li>
          </ol>
          <p className="mb-1 text-base font-semibold text-[#1c1c26]">{isZh ? '发薪流程' : 'Running payroll'}</p>
          <ol className="mb-6 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '前往 Payees → People，邀请成员并审批加入请求。' : 'Go to Payees → People, click Invite Members, share the invite link, and approve incoming members.'}</li>
            <li>{isZh ? '在 People 页面为成员设置付款金额。' : 'Set the payment amount for each member on the People page.'}</li>
            <li>{isZh ? '前往 Transactions，新建交易，选择成员、金额和领取时间。' : 'Go to Transactions, click New Transaction, select members and amounts, and set a claim time.'}</li>
            <li>{isZh ? '确认摘要后点击 Sign & Execute，并确保在领取时间前完成执行。' : 'Review the transaction summary and click Sign & Execute before the claim time.'}</li>
            <li>{isZh ? '你可以给成员分配 Admin 或 Operator 角色，协助管理和执行交易。' : 'You can assign members as Admin or Operator to help manage and execute transactions.'}</li>
          </ol>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {permissionHeaders.map(header => (
                    <th key={header} className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-left text-sm font-medium text-[#8d8d93]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionRows.map(([perm, ...roles]) => (
                  <tr key={perm} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="border border-[rgba(0,0,0,0.08)] px-3 py-2 text-sm font-medium text-[#606067]">{perm}</td>
                    {roles.map((value, index) => (
                      <td key={index} className={`border border-[rgba(0,0,0,0.08)] px-3 py-2 text-sm ${value === 'Yes' || value === '是' ? 'text-center text-[#5ddd22]' : 'text-left text-[#606067]'}`}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-1 mt-6 text-base font-semibold text-[#1c1c26]">{isZh ? '采购服务' : 'Purchasing services'}</p>
          <ol className="mb-6 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '除发薪外，组织还可以通过 PactPay 直接采购服务，并使用加密资产支付。' : 'Beyond payroll, organisations can purchase services directly through PactPay and pay with crypto.'}</li>
            <li>{isZh ? '可用服务会列在 Payees → Services 下。' : 'Available services are listed under Payees → Services.'}</li>
            <li>{isZh ? '服务采购会沿用与发薪相同的链上支付流程，支付确认后服务自动开通。' : 'Service purchases go through the same on-chain payment flow as payroll. Once payment is confirmed, the service is provisioned automatically.'}</li>
            <li>{isZh ? '服务采购不使用 claim time，支付确认后直接生效。' : 'Service transactions do not use claim time and settle directly on confirmation.'}</li>
          </ol>

          <SectionAnchor id="for-members" />
          <h3 className="mb-3 mt-10 text-xl font-bold text-[#1c1c26]">{isZh ? '面向成员' : 'For members'}</h3>
          <ol className="list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '访问 pactpay.app，连接 EOA 钱包并完成注册。' : 'Go to pactpay.app, connect your EOA wallet, and complete registration.'}</li>
            <li>{isZh ? '使用组织提供的邀请链接或邀请码加入，并等待审批。' : 'Use the invite link or code from your organisation to join, then wait for approval.'}</li>
            <li>{isZh ? '组织执行付款后，你会收到邮件通知，并可查看领取时间。' : 'Once the organisation executes a payment transaction, you will receive an email notification and can check the claim time.'}</li>
            <li>{isZh ? '领取时间到达后，返回平台并发起领取。' : 'When the claim time arrives, go to the platform and claim your payment.'}</li>
          </ol>

          <SectionAnchor id="mechanism" />
          <h2 className="mb-6 mt-14 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? '机制' : 'Mechanism'}</h2>

          <SectionAnchor id="non-custodial" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '为何是真正的非托管' : 'Why funds are truly non-custodial'}</h3>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh ? '许多平台声称安全，但资金实际上经过平台控制账户。PactPay 不同：' : 'Many platforms claim to be secure, but funds actually pass through platform-controlled accounts. PactPay works differently:'}
          </p>
          <pre className="mb-4 overflow-x-auto rounded-[12px] bg-[#1c1c26] px-5 py-4 text-sm leading-relaxed text-[#f5f5f5]">{isZh ? `你的 EOA 钱包
    -> 发起签名并执行交易
支付智能合约（链上，可公开验证）
    -> 在领取时间到达后自动释放
成员收款钱包` : `Your EOA wallet
    -> Sign and initiate transaction
Payment smart contract (on-chain, publicly verifiable)
    -> Unlocks automatically when claim time arrives
Member's receiving wallet`}</pre>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh ? '这条路径上不存在任何 PactPay 控制的账户。支付智能合约逻辑完全公开。' : 'There is no PactPay-controlled account anywhere in this path. The payment smart contract logic is fully public.'}
          </p>

          <SectionAnchor id="contract-addresses" />
          <div className="mb-5 rounded-[18px] border border-[rgba(94,133,238,0.12)] bg-[linear-gradient(135deg,rgba(94,133,238,0.08),rgba(255,255,255,0.98))] p-4 md:p-5">
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
          </div>

          <p className="mb-2 text-base text-[#606067]">{isZh ? '当操作员创建并签名交易时，以下参数会被编码到链上：' : 'When an operator creates and signs a transaction, the following parameters are encoded on-chain:'}</p>
          <ul className="mb-4 list-inside list-disc space-y-1 text-base text-[#606067]">
            <li>{isZh ? '收款人列表（每位成员的受保护身份地址）' : "The recipient list (each member's shielded identity address)"}</li>
            <li>{isZh ? '每位收款人的金额' : 'The amount for each recipient'}</li>
            <li>{isZh ? '领取时间' : 'The claim time'}</li>
          </ul>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">{isZh ? '一旦签名完成，这些参数即被锁定。无论是 PactPay 还是操作员，都不能在不新建交易的情况下修改它们。' : 'Once signed, these parameters are locked. Neither PactPay nor the operator can modify them without creating a new transaction.'}</p>

          <SectionAnchor id="address-protection" />
          <h3 className="mb-3 mt-10 text-xl font-bold text-[#1c1c26]">{isZh ? '地址如何被保护' : 'How your address is protected'}</h3>
          <ul className="mb-4 list-inside list-disc space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '注册时，系统会根据你的 EOA 地址生成一个加密的受保护身份，并记录到链上。' : 'When you register, the system derives an encrypted shielded identity from your EOA address and stores it on-chain.'}</li>
            <li>{isZh ? '链上交易记录只引用受保护身份地址，不直接关联真实 EOA。' : 'All on-chain transaction records reference only the shielded identity address. Your real EOA is never directly linked.'}</li>
            <li>{isZh ? '受保护身份和收款地址彼此独立，且都可以随时更换。' : 'Your shielded identity and your receiving address are independent of each other. Both can be changed at any time.'}</li>
          </ul>

          <SectionAnchor id="api-services" />
          <h2 className="mb-6 mt-14 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? 'API 服务' : 'API Services'}</h2>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh ? 'PactPay 支持组织直接在平台内购买主流大语言模型 API 服务。付款使用与交易设置相同的链和代币，不收平台费，且不支持退款。' : 'PactPay allows organisations to purchase access to mainstream large language model APIs directly through the platform. Payments are made in the same network and token as transaction settings, with no platform fee and no refunds.'}
          </p>
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '工作方式' : 'How it works'}</h3>
          <ol className="mb-6 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '在 Payees → AI API 下创建 usage plan。' : 'Create a usage plan under Payees -> AI API.'}</li>
            <li>{isZh ? '通过交易为 plan 充值，链上确认后余额立即可用。' : 'Top up the plan via a transaction. The balance is available immediately after the transaction is confirmed on-chain.'}</li>
            <li>{isZh ? '在 plan 下创建 API key，并可设置配额和模型限制。' : 'Create API keys under each usage plan with optional spend limits and model restrictions.'}</li>
            <li>{isZh ? '使用统一 API 端点调用支持的模型。' : 'Use the key to call supported models via the unified API endpoint.'}</li>
          </ol>

          <SectionAnchor id="mcp-server" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? 'MCP 服务器' : 'MCP server'}</h3>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh ? 'PactPay MCP Server 可让 AI 客户端通过浏览器授权接入 PactPay，并查询 usage plan、余额、用量和 API key。' : 'PactPay MCP Server lets AI clients connect to PactPay for browser-based authentication, usage plan queries, balance checks, and API key management.'}
          </p>
          <div className="mb-6 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/60 px-5 py-4">
            <p className="mb-2 text-base font-semibold text-[#1c1c26]">{isZh ? '安装' : 'Install'}</p>
            <pre className="mb-3 overflow-x-auto rounded-[10px] bg-[#1c1c26] px-4 py-3 text-sm text-[#f5f5f5]">npx -y @pactpay/mcp-server</pre>
            <p className="text-base leading-relaxed text-[#606067]">
              {isZh ? '包名：' : 'Package: '}
              <a href="https://www.npmjs.com/package/@pactpay/mcp-server" target="_blank" rel="noreferrer" className="text-[#5e85ee] underline underline-offset-2">
                @pactpay/mcp-server
              </a>
            </p>
          </div>

          <SectionAnchor id="reference" />
          <h2 className="mb-6 mt-14 border-b border-[rgba(0,0,0,0.08)] pb-2 text-3xl font-bold">{isZh ? '参考信息' : 'Reference'}</h2>

          <SectionAnchor id="doc-pricing" />
          <h3 className="mb-3 mt-8 text-xl font-bold text-[#1c1c26]">{isZh ? '定价' : 'Pricing'}</h3>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">{isZh ? '没有月费。服务费按“每次执行 / 每位成员”计算：' : 'No monthly subscription. You pay per execution per member:'}</p>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {(isZh ? ['网络', '标准价', '当前早期体验价'] : ['Network', 'Standard', 'Early Access (Now)']).map(header => (
                    <th key={header} className="border border-[rgba(0,0,0,0.08)] px-4 py-3 text-left font-medium text-[#8d8d93]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(isZh ? [['Ethereum', '20U', '10U'], ['BSC 或 L2', '5U', '2U']] : [['Ethereum', '20U', '10U'], ['BSC or L2s', '5U', '2U']]).map(([network, standard, early]) => (
                  <tr key={network} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="border border-[rgba(0,0,0,0.08)] px-4 py-3 font-medium text-[#1c1c26]">{network}</td>
                    <td className="border border-[rgba(0,0,0,0.08)] px-4 py-3 text-[#606067]">{standard}</td>
                    <td className="border border-[rgba(0,0,0,0.08)] px-4 py-3 font-semibold text-[#5e85ee]">{early}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionAnchor id="faq" />
          <h3 className="mb-5 mt-10 text-xl font-bold text-[#1c1c26]">FAQ</h3>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#8d8d93]">{isZh ? '面向组织' : 'For organisations'}</p>
          <div className="mb-8 space-y-4">
            {faqOrg.map(([q, a]) => (
              <div key={q} className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/60 px-5 py-4">
                <p className="mb-1 text-base font-semibold text-[#1c1c26]">{q}</p>
                <p className="text-base text-[#606067]">{a}</p>
              </div>
            ))}
          </div>

          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#8d8d93]">{isZh ? '面向成员' : 'For members'}</p>
          <div className="mb-16 space-y-4">
            {faqMember.map(([q, a]) => (
              <div key={q} className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/60 px-5 py-4">
                <p className="mb-1 text-base font-semibold text-[#1c1c26]">{q}</p>
                <p className="text-base text-[#606067]">{a}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[rgba(0,0,0,0.06)] pt-8 text-center text-base text-[#8d8d93]">
            {isZh ? '© 2026 PactPay。面向未来工作的支付基础设施。' : '© 2026 PactPay. Built for the future of work.'}
          </div>
        </div>
      </div>
    </div>
  )
}
