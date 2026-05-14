import { useEffect, useRef, useState } from 'react'

const navItems = [
  { label: 'Overview', id: 'overview' },
  { label: 'What is PactPay', id: 'what-is-pactpay', sub: true },
  { label: 'Core principles', id: 'core-principles', sub: true },
  { label: 'Getting Started', id: 'getting-started' },
  { label: 'How it works', id: 'how-it-works', sub: true },
  { label: 'For organisations', id: 'for-organisations', sub: true },
  { label: 'For members', id: 'for-members', sub: true },
  { label: 'Mechanism', id: 'mechanism' },
  { label: 'Why non-custodial', id: 'non-custodial', sub: true },
  { label: 'Address protection', id: 'address-protection', sub: true },
  { label: 'API Services', id: 'api-services' },
  { label: 'Reference', id: 'reference' },
  { label: 'Pricing', id: 'doc-pricing', sub: true },
  { label: 'FAQ', id: 'faq', sub: true },
]

const permissionRows = [
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

const apiModelPricingRows = [
  ['Anthropic', 'Claude Opus 4.7', '$5 / MTok', '$25 / MTok', '$3.25 / MTok', '$16.25 / MTok', '65%'],
  ['Anthropic', 'Claude Opus 4.6', '$5 / MTok', '$25 / MTok', '$3.25 / MTok', '$16.25 / MTok', '65%'],
  ['Anthropic', 'Claude Opus 4.5', '$5 / MTok', '$25 / MTok', '$3.25 / MTok', '$16.25 / MTok', '65%'],
  ['Anthropic', 'Claude Opus 4.1', '$15 / MTok', '$75 / MTok', '$9.75 / MTok', '$48.75 / MTok', '65%'],
  ['Anthropic', 'Claude Opus 4', '$15 / MTok', '$75 / MTok', '$9.75 / MTok', '$48.75 / MTok', '65%'],
  ['Anthropic', 'Claude Sonnet 4.6', '$3 / MTok', '$15 / MTok', '$1.95 / MTok', '$9.75 / MTok', '65%'],
  ['Anthropic', 'Claude Sonnet 4.5', '$3 / MTok', '$15 / MTok', '$1.95 / MTok', '$9.75 / MTok', '65%'],
  ['Anthropic', 'Claude Sonnet 4', '$3 / MTok', '$15 / MTok', '$1.95 / MTok', '$9.75 / MTok', '65%'],
  ['Anthropic', 'Claude Haiku 4.5', '$1 / MTok', '$5 / MTok', '$0.65 / MTok', '$3.25 / MTok', '65%'],
  ['OpenAI', 'gpt-5.5', '$5.00 / MTok', '$30.00 / MTok', '$3.25 / MTok', '$19.50 / MTok', '65%'],
  ['OpenAI', 'gpt-5.5-pro', '$30.00 / MTok', '$180.00 / MTok', '$19.50 / MTok', '$117.00 / MTok', '65%'],
  ['OpenAI', 'gpt-5.4', '$2.50 / MTok', '$15.00 / MTok', '$1.625 / MTok', '$9.75 / MTok', '65%'],
  ['OpenAI', 'gpt-5.4-mini', '$0.75 / MTok', '$4.50 / MTok', '$0.4875 / MTok', '$2.925 / MTok', '65%'],
  ['OpenAI', 'gpt-5.4-nano', '$0.20 / MTok', '$1.25 / MTok', '$0.13 / MTok', '$0.8125 / MTok', '65%'],
  ['OpenAI', 'gpt-5.4-pro', '$30.00 / MTok', '$180.00 / MTok', '$19.50 / MTok', '$117.00 / MTok', '65%'],
]

function SectionAnchor({ id }: { id: string }) {
  return <span id={id} className="block" style={{ scrollMarginTop: '5rem' }} />
}

export default function DocumentPage() {
  const [activeId, setActiveId] = useState('overview')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      // Match by id directly, or by label (case-insensitive, spaces -> hyphens)
      const match = navItems.find(
        (item) =>
          item.id === hash ||
          item.label.toLowerCase().replace(/\s+/g, '-') === hash.toLowerCase().replace(/\s+/g, '-') ||
          item.label.toLowerCase() === decodeURIComponent(hash).toLowerCase()
      )
      const targetId = match?.id ?? hash
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [])

  useEffect(() => {
    const ids = navItems.map((item) => item.id)
    const threshold = window.innerHeight * 0.35

    const updateActive = () => {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= threshold) {
          current = id
        }
      }
      setActiveId(current)
    }

    window.addEventListener('scroll', updateActive, { passive: true })
    updateActive()
    return () => window.removeEventListener('scroll', updateActive)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex-1 flex text-[#1c1c26]" style={{ minHeight: 'calc(100vh - 90px)' }}>
      <div className="flex w-full max-w-6xl mx-auto">

        {/* Sidebar */}
        <aside className="hidden md:block w-[280px] flex-shrink-0 sticky top-[90px] self-start h-[calc(100vh-90px)] overflow-y-auto border-r border-[rgba(0,0,0,0.06)] bg-white/60 backdrop-blur-sm py-8 px-4">
          {/* <p className="text-sm font-bold text-[#5e85ee] uppercase tracking-widest mb-5 px-3">PactPay Docs</p> */}
          <ul className="space-y-0.5">
            {navItems.map(({ label, id, sub }) => (
              <li key={id}>
                <button
                  onClick={() => scrollTo(id)}
                  className={`w-full text-left px-3 py-1.5 rounded-[8px] text-base transition-all
                  ${sub ? 'pl-6 text-sm' : 'font-semibold'}
                  ${activeId === id
                      ? 'bg-[rgba(94,133,238,0.08)] text-[#5e85ee] font-medium'
                      : 'text-[#606067] hover:text-[#1c1c26] hover:bg-[rgba(0,0,0,0.03)]'
                    }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <div ref={contentRef} className="flex-1 px-8 md:px-14 py-12 max-w-3xl">

          {/* Overview */}
          <SectionAnchor id="overview" />
          <h2 className="text-3xl font-bold border-b border-[rgba(0,0,0,0.08)] pb-2 mb-6 mt-2">Overview</h2>

          <SectionAnchor id="what-is-pactpay" />
          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">What is PactPay</h3>
          <p className="text-[#606067] mb-3 text-base leading-relaxed">PactPay is a non-custodial crypto payment platform. Organisations can define custom payment rules and schedules, then execute payments to their members through smart contracts. No fund custody. No KYC required.</p>
          <p className="text-[#606067] mb-6 text-base leading-relaxed">PactPay is built for Web3 teams, DAOs, and any organisation that pays contributors in cryptocurrency and values privacy, on-chain transparency, and self-custody.</p>

          <SectionAnchor id="core-principles" />
          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">Core principles</h3>
          <ol className="space-y-3 text-base text-[#606067] list-decimal list-inside leading-relaxed">
            <li><strong className="text-[#1c1c26]">Self-Custody by Default</strong> - Funds stay in the payer's control at all times. No third party is involved. Payment logic is defined and signed by the payer.</li>
            <li><strong className="text-[#1c1c26]">Anonymous by Design</strong> - A single EOA address is all you need to register, pay, and receive. No identity binding is required.</li>
            <li><strong className="text-[#1c1c26]">Invisible Identity Layer</strong> - Your identity is used for verification but never exposed. Only a shielded identity exists on-chain. Your real address is untraceable.</li>
            <li><strong className="text-[#1c1c26]">Dual-Address Isolation</strong> - Your shielded identity and your receiving address are fully isolated from each other. Both can be changed independently at any time.</li>
          </ol>

          {/* Getting Started */}
          <SectionAnchor id="getting-started" />
          <h2 className="text-3xl font-bold border-b border-[rgba(0,0,0,0.08)] pb-2 mb-6 mt-14">Getting Started</h2>

          <SectionAnchor id="how-it-works" />
          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">How it works</h3>
          <p className="text-[#606067] mb-3 text-base leading-relaxed">PactPay has two roles: Organisation (the paying party) and Member (the receiving party). The entire flow happens on-chain with no intermediary.</p>
          <div className="bg-[rgba(94,133,238,0.06)] border-l-4 border-[#5e85ee] rounded-r-[12px] px-4 py-3 mb-4 text-base text-[#606067] italic">
            Note: Payments are not sent automatically. Members must actively claim their payment after the claim time arrives.
          </div>
          <p className="text-base font-semibold text-[#1c1c26] mb-2">Organisation flow</p>
          <ol className="list-decimal list-inside space-y-1 text-base text-[#606067] mb-5">
            <li>Connect your wallet or sign in with email and register</li>
            <li>Create your organisation</li>
            <li>Invite members</li>
            <li>Create and execute payment transactions</li>
          </ol>
          <p className="text-base font-semibold text-[#1c1c26] mb-2">Member flow</p>
          <ol className="list-decimal list-inside space-y-1 text-base text-[#606067]">
            <li>Register an account, connect your EOA wallet, and complete two signing steps to generate your shielded identity</li>
            <li>Join an organisation</li>
            <li>Wait for the organisation to create and execute a transaction</li>
            <li>Once the claim time arrives, claim your payment to any wallet address via your shielded identity</li>
          </ol>

          <SectionAnchor id="for-organisations" />
          <h3 className="text-xl font-bold mb-3 mt-10 text-[#1c1c26]">For organisations</h3>
          <ol className="list-decimal list-inside space-y-2 text-base text-[#606067] mb-6 leading-relaxed">
            <li>Go to pactpay.app and connect your wallet or sign in with email.</li>
            <li>Create your organisation and fill in the basic details.</li>
            <li>Go to Members, click Invite Members, share the invite link, and approve incoming members.</li>
            <li>Configure payment settings, including chain and token type.</li>
            <li>On the Members page, set the payment amount for each member.</li>
            <li>Go to Transactions, click New Transaction, select members, confirm amounts, and set a claim time.</li>
            <li>Review the transaction summary and click Sign & Execute. Make sure to execute before the claim time.</li>
            <li>You can also assign other members as Admin or Operator to help manage and execute transactions.</li>
          </ol>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {['Permission', 'Owner', 'Admin', 'Operator'].map((h) => (
                    <th key={h} className="px-3 py-2 border border-[rgba(0,0,0,0.08)] text-[#8d8d93] font-medium text-left text-sm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionRows.map(([perm, ...roles]) => (
                  <tr key={perm} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="px-3 py-2 border border-[rgba(0,0,0,0.08)] text-[#606067] font-medium text-sm">{perm}</td>
                    {roles.map((v, i) => (
                      <td key={i} className={`px-3 py-2 border border-[rgba(0,0,0,0.08)] text-sm ${v === 'Yes' ? 'text-[#5ddd22] text-center' : 'text-[#606067] text-left'}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionAnchor id="for-members" />
          <h3 className="text-xl font-bold mb-3 mt-10 text-[#1c1c26]">For members</h3>
          <ol className="list-decimal list-inside space-y-2 text-base text-[#606067] leading-relaxed">
            <li>Go to pactpay.app, connect your EOA wallet, and complete registration.</li>
            <li>Use the invite link or code from your organisation to join, then wait for approval.</li>
            <li>Once the organisation executes a payment transaction, you will receive an email notification and can check the claim time.</li>
            <li>When the claim time arrives, go to the platform and claim your payment.</li>
          </ol>

          {/* Mechanism */}
          <SectionAnchor id="mechanism" />
          <h2 className="text-3xl font-bold border-b border-[rgba(0,0,0,0.08)] pb-2 mb-6 mt-14">Mechanism</h2>

          <SectionAnchor id="non-custodial" />
          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">Why funds are truly non-custodial</h3>
          <p className="text-base text-[#606067] mb-3 leading-relaxed">Many platforms claim to be secure, but funds actually pass through platform-controlled accounts. PactPay works differently:</p>
          <pre className="bg-[#1c1c26] text-[#f5f5f5] text-sm rounded-[12px] px-5 py-4 overflow-x-auto mb-4 leading-relaxed">{`Your EOA wallet
    -> Sign and initiate transaction
Payment smart contract (on-chain, publicly verifiable)
    -> Unlocks automatically when claim time arrives
Member's receiving wallet`}</pre>
          <p className="text-base text-[#606067] mb-3 leading-relaxed">There is no PactPay-controlled account anywhere in this path. The payment smart contract logic is fully public.</p>
          <p className="text-base font-semibold text-[#1c1c26] mb-1">Contract addresses:</p>
          <p className="text-base text-[#606067] mb-4">
            Sepolia Testnet:{' '}
            <a href="https://sepolia.etherscan.io/address/0x5F2E184B850E552f1B66f754EAD5d278475f6811" target="_blank" rel="noreferrer" className="text-[#5e85ee] hover:underline break-all">
              0x5F2E184B850E552f1B66f754EAD5d278475f6811
            </a>
          </p>
          <p className="text-base text-[#606067] mb-2">When an operator creates and signs a transaction, the following parameters are encoded on-chain:</p>
          <ul className="list-disc list-inside space-y-1 text-base text-[#606067] mb-4">
            <li>The recipient list (each member's shielded identity address)</li>
            <li>The amount for each recipient</li>
            <li>The claim time</li>
          </ul>
          <p className="text-base text-[#606067] mb-3 leading-relaxed">Once signed, these parameters are locked. Neither PactPay nor the operator can modify them without creating a new transaction.</p>
          <p className="text-base font-semibold text-[#1c1c26] mb-2">Two execution scenarios:</p>
          <ul className="list-disc list-inside space-y-2 text-base text-[#606067] mb-4">
            <li><strong className="text-[#1c1c26]">Execute before claim time:</strong> Funds enter the contract. The contract checks <code className="bg-[rgba(0,0,0,0.05)] px-1 rounded text-[#d92b2b] text-sm">block.timestamp &lt; claimTime</code> and rejects claims until the condition is met.</li>
            <li><strong className="text-[#1c1c26]">Execute after claim time:</strong> <code className="bg-[rgba(0,0,0,0.05)] px-1 rounded text-[#d92b2b] text-sm">block.timestamp &gt;= claimTime</code> is already satisfied - members can claim immediately.</li>
          </ul>
          <p className="text-base text-[#606067] leading-relaxed"><strong className="text-[#1c1c26]">Members pull funds actively - nothing is pushed.</strong> Funds can only leave the contract when the member themselves signs the claim transaction. PactPay cannot withdraw on a member's behalf.</p>

          <SectionAnchor id="address-protection" />
          <h3 className="text-xl font-bold mb-3 mt-10 text-[#1c1c26]">How your address is protected</h3>
          <ul className="list-disc list-inside space-y-2 text-base text-[#606067] mb-4 leading-relaxed">
            <li>When you register, the system derives an encrypted shielded identity from your EOA address and stores it on-chain.</li>
            <li>All on-chain transaction records reference only the shielded identity address. Your real EOA is never directly linked.</li>
            <li>Your shielded identity and your receiving address are independent of each other. Both can be changed at any time.</li>
          </ul>
          <ul className="list-disc list-inside space-y-1 text-base text-[#606067]">
            <li><strong className="text-[#1c1c26]">Verification:</strong> The contract confirms that an operation is authorised.</li>
            <li><strong className="text-[#1c1c26]">Privacy:</strong> No one can infer from on-chain records who performed the operation.</li>
          </ul>

          {/* API Services */}
          <SectionAnchor id="api-services" />
          <h2 className="text-3xl font-bold border-b border-[rgba(0,0,0,0.08)] pb-2 mb-6 mt-14">API Services</h2>
          <p className="text-base text-[#606067] mb-4 leading-relaxed">
            PactPay allows organisations to purchase access to mainstream large language model APIs directly through the platform.
            Payments are made in the same network and token as transaction settings, with no platform fee and no refunds.
          </p>

          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-base text-[#606067] mb-6 leading-relaxed">
            <li>Create a usage plan under Payees -&gt; AI API.</li>
            <li>Top up the plan via a transaction. The balance is available immediately after the transaction is confirmed on-chain.</li>
            <li>Create API keys under each usage plan. Each key can be assigned an optional spend limit and model restrictions.</li>
            <li>Use the key to call supported models via the unified API endpoint.</li>
          </ol>

          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">Usage plans</h3>
          <p className="text-base text-[#606067] mb-4 leading-relaxed">
            A usage plan is the top-level container for API access.
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {['Field', 'Description'].map((h) => (
                    <th key={h} className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#8d8d93] font-medium text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Plan ID', 'System-assigned identifier'],
                  ['Plan name', 'Set by the organisation, for internal reference only'],
                  ['Budget', 'A reference budget value set by the organisation'],
                  ['Status', 'Funded - plan has remaining balance / Unfunded - balance is zero'],
                ].map(([field, description]) => (
                  <tr key={field} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#1c1c26] font-medium">{field}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067]">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">API keys</h3>
          <p className="text-base text-[#606067] mb-4 leading-relaxed">
            Each plan can have multiple API keys. Keys share the plan&apos;s balance.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {['Field', 'Description'].map((h) => (
                    <th key={h} className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#8d8d93] font-medium text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['API name', 'Set by the creator, for identification purposes'],
                  ['Quota', 'Per-key spend cap. Can be set to Unlimited (capped by plan balance) or a specific amount'],
                  ['Expiration', 'Never expires, or a custom date. Once expired, the key stops working'],
                  ['Model restrictions', 'Optionally restrict which models this key can access. Leave blank to allow all'],
                  ['Status', 'Active / Disabled'],
                ].map(([field, description]) => (
                  <tr key={field} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#1c1c26] font-medium">{field}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067]">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reference */}
          <SectionAnchor id="reference" />
          <h2 className="text-3xl font-bold border-b border-[rgba(0,0,0,0.08)] pb-2 mb-6 mt-14">Reference</h2>

          <SectionAnchor id="doc-pricing" />
          <h3 className="text-xl font-bold mb-3 mt-8 text-[#1c1c26]">Pricing</h3>
          <p className="text-base text-[#606067] mb-4 leading-relaxed">No monthly subscription. You pay per execution per member:</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {['Network', 'Standard', 'Early Access (Now)'].map((h) => (
                    <th key={h} className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#8d8d93] font-medium text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Ethereum', '20U', '10U'],
                  ['BSC or L2s', '5U', '2U'],
                ].map(([network, standard, earlyAccess]) => (
                  <tr key={network} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#1c1c26] font-medium">{network}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067]">{standard}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#5e85ee] font-semibold">{earlyAccess}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base text-[#606067] mb-2 leading-relaxed">Fee calculation example: Executing a USDC payment to 5 members at the early access rate on BSC or other L2s costs 5 x 2 USDC = 10 USDC in service fees, plus gas (paid by the organisation's wallet directly to the network). The service fee is charged when the first member claims. If no one claims, no fee is incurred. Gas fees for member claims are covered by PactPay.</p>
          <p className="text-base text-[#606067] mb-6 leading-relaxed">For large teams or high-frequency payment needs, contact <strong className="text-[#1c1c26]">support@pactpay.app</strong> to discuss a custom plan.</p>

          <p className="text-base text-[#606067] mb-3 leading-relaxed">API purchases are billed at cost. PactPay charges no platform fee on AI API purchases.</p>
          <ul className="list-disc list-inside space-y-2 text-base text-[#606067] mb-5 leading-relaxed">
            <li>Payment is made in the same network and token as transaction settings.</li>
            <li>Gas is paid by the organisation&apos;s wallet directly to the network.</li>
            <li>All AI API purchases are non-refundable.</li>
          </ul>

          <p className="text-base font-semibold text-[#1c1c26] mb-3">Main supported models and API prices (MTok = Million tokens)</p>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {['Provider', 'Model', 'Input Price', 'Output Price', 'PactPay Input Price', 'PactPay Output Price', 'PactPay Rate'].map((h) => (
                    <th key={h} className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#8d8d93] font-medium text-left whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apiModelPricingRows.map(([provider, model, inputPrice, outputPrice, pactPayInputPrice, pactPayOutputPrice, pactPayRate]) => (
                  <tr key={`${provider}-${model}`} className="hover:bg-[rgba(0,0,0,0.01)]">
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#1c1c26] font-medium whitespace-nowrap">{provider}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067] whitespace-nowrap">{model}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067] whitespace-nowrap">{inputPrice}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067] whitespace-nowrap">{outputPrice}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067] whitespace-nowrap">{pactPayInputPrice}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#606067] whitespace-nowrap">{pactPayOutputPrice}</td>
                    <td className="px-4 py-3 border border-[rgba(0,0,0,0.08)] text-[#5e85ee] font-semibold whitespace-nowrap">{pactPayRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base text-[#606067] leading-relaxed">Note: Prices shown for OpenAI models are Standard tier short context (&le;200K input tokens); long context (&gt;200K) doubles input price and adds 50% to output price. This applies only to gpt-5.5, gpt-5.5-pro, gpt-5.4, and gpt-5.4-pro.</p>

          <SectionAnchor id="faq" />
          <h3 className="text-xl font-bold mb-5 mt-10 text-[#1c1c26]">FAQ</h3>

          <p className="text-sm font-bold text-[#8d8d93] uppercase tracking-widest mb-3">For organisations</p>
          <div className="space-y-4 mb-8">
            {[
              ['When is the service fee charged?', 'The service fee is charged when the first member claims after a payment is executed. If no members claim, no fee is incurred.'],
              ['What happens if I execute a transaction after the claim time has passed?', 'Funds are released immediately upon entering the contract. Members can claim right away without waiting.'],
              ['Can I modify member payment amounts after a transaction is executed?', 'No. Amounts are locked at the point of signing. To make adjustments, you will need to create a new transaction.'],
              ['Who pays the gas fee for executing a transaction?', "The organisation's wallet pays the gas fee. This fee is charged directly by the blockchain network and is separate from PactPay."],
              ['Can I cancel a transaction after it has been executed?', 'Yes. You can request a refund at any time before all members have completed their claims.'],
              ['When is the balance available after topping up?', 'As soon as the on-chain transaction is confirmed. There is no additional processing delay.'],
              ['Can I top up a plan multiple times?', 'Yes. Each top-up is a separate transaction and the balance accumulates.'],
              ["What happens when a key's quota is exhausted?", "The key stops accepting requests. The plan's remaining balance is unaffected and can be used by other keys."],
              ['Can I recover a revoked key?', 'No. Revocation is permanent. Create a new key if needed.'],
              ["Can I change a key's quota or model restrictions after creation?", 'Yes, via the Edit action on the key.'],
              ['Is there a limit on the number of keys per plan?', 'No hard limit is enforced currently.'],
            ].map(([q, a]) => (
              <div key={q} className="bg-white/60 border border-[rgba(0,0,0,0.06)] rounded-[14px] px-5 py-4">
                <p className="text-base font-semibold text-[#1c1c26] mb-1">{q}</p>
                <p className="text-base text-[#606067]">{a}</p>
              </div>
            ))}
          </div>

          <p className="text-sm font-bold text-[#8d8d93] uppercase tracking-widest mb-3">For members</p>
          <div className="space-y-4 mb-16">
            {[
              ['How do I join an organisation?', 'Ask your organisation for an invite link or invite code. After registering, your membership will be pending until the organisation approves it.'],
              ["Why can't I see a Claim button?", "Either the claim time has not arrived yet, or the organisation has not executed the transaction. Check the transaction status in the Data Summary on your home page, or contact your organisation to confirm."],
              ['Where are my funds before I claim?', 'Your funds are held in the payment smart contract, locked until the claim time. The contract content is publicly verifiable on-chain.'],
              ['Can I change my login or claim wallet?', 'Only if you have no unclaimed transactions. If unclaimed transactions exist, changing your wallet will break the signature match and those transactions will no longer be claimable.'],
              ['Can I change my receiving wallet?', 'Yes. You can update your receiving wallet address at any time during the claim process. The new address takes effect immediately for that claim.'],
              ['Do I need to do anything before the claim time?', 'Nothing at all. Wait for the claim time to arrive. You will receive an email notification when it is time to return to the platform and claim.'],
              ['Do I need to pay gas to claim?', 'No. Gas fees for member claims are covered by PactPay.'],
            ].map(([q, a]) => (
              <div key={q} className="bg-white/60 border border-[rgba(0,0,0,0.06)] rounded-[14px] px-5 py-4">
                <p className="text-base font-semibold text-[#1c1c26] mb-1">{q}</p>
                <p className="text-base text-[#606067]">{a}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[rgba(0,0,0,0.06)] pt-8 text-center text-[#8d8d93] text-base">
            (c) 2026 PactPay. Built for the future of work.
          </div>
        </div>
      </div>
    </div>
  )
}
