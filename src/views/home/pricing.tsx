import { usePublicCopy } from '@/views/public/copy'

export default function PricingPage() {
  const { language, copy } = usePublicCopy()
  const isZh = language === 'zh-CN'

  const networkPricing = isZh
    ? [
        { name: '以太坊', subtitle: '主网', earlyAccessPrice: '10', standardPrice: '20', savingsLabel: '立省 50%', accent: true },
        { name: 'BSC 与其他 L2', subtitle: 'Base、Arbitrum、Polygon 等', earlyAccessPrice: '2', standardPrice: '5', savingsLabel: '立省 60%', accent: false },
      ]
    : [
        { name: 'Ethereum', subtitle: 'Mainnet', earlyAccessPrice: '10', standardPrice: '20', savingsLabel: 'Save 50%', accent: true },
        { name: 'BSC & other L2s', subtitle: 'Base, Arbitrum, Polygon and more', earlyAccessPrice: '2', standardPrice: '5', savingsLabel: 'Save 60%', accent: false },
      ]

  const faqs = isZh
    ? [
        { q: '有月费订阅吗？', a: '没有。只有在你执行付款时才会收费。如果当月没有发薪或付款，就不会产生费用。' },
        { q: 'Gas 费由谁支付？', a: 'Gas 费由执行交易的钱包（Owner 的 EOA 钱包）支付。它独立于服务费，并全部支付给区块链网络。' },
        { q: '“每次执行、每位成员”具体是什么意思？', a: '每次你对一笔交易点击 Execute，费用都会按该交易中的成员数量计算。例如你每月给 10 个人付款，总费用会根据所选网络不同，约为每月 20 到 100 U。' },
        { q: '大团队可以定制报价吗？', a: <>可以。如果你的组织规模较大，或发薪频率较高，请联系 <a href="mailto:support@pactpay.app" className="font-medium text-[#5e85ee] hover:underline">support@pactpay.app</a>，我们可以提供定制方案。</> },
      ]
    : [
        { q: 'Is there a monthly subscription?', a: "No. You only pay when you execute a payment. If you don't run payroll that month, you pay nothing." },
        { q: 'Who pays the gas fee?', a: "Gas is paid by the executing wallet (the Owner's EOA). It's separate from the service fee and goes entirely to the network." },
        { q: 'What does "per member per execution" mean exactly?', a: "Each time you click Execute on a transaction, the fee is charged per member in that transaction. If you pay 10 people monthly, the total fee depends on the network you use." },
        { q: 'Do you offer custom pricing for larger teams?', a: <>Yes, if your organisation has a large team or high-frequency payroll needs, reach out to us at <a href="mailto:support@pactpay.app" className="font-medium text-[#5e85ee] hover:underline">support@pactpay.app</a> and we'll put together a custom plan.</> },
      ]

  return (
    <div className="flex-1 text-[#1c1c26]">
      <section className="px-6 pb-14 pt-12 text-center">
        <span className="mb-5 inline-block rounded-full bg-[rgba(94,133,238,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#5e85ee]">
          {isZh ? '定价' : 'PRICING'}
        </span>
        <h1 className="mb-5 text-4xl font-extrabold leading-tight md:text-5xl">
          {isZh ? '简单、透明的定价。' : 'Simple, transparent pricing.'}
          <br className="hidden md:block" /> {isZh ? '只有在你付款时才收费。' : 'Pay only when you pay.'}
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-[#606067]">
          {isZh ? '无订阅费，无平台费。' : 'No subscriptions. No platform fees.'}
          <br />
          {isZh ? '按次执行收取固定费用，仅此而已。' : "You pay a flat fee per execution, that's it."}
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {networkPricing.map(network => (
            <div
              key={network.name}
              className={
                network.accent
                  ? 'flex flex-col justify-between rounded-[24px] border-2 border-[#5e85ee] bg-white p-8 shadow-xl shadow-[rgba(94,133,238,0.12)]'
                  : 'flex flex-col justify-between rounded-[24px] border border-[rgba(0,0,0,0.08)] bg-white/70 p-8 backdrop-blur-sm transition-shadow hover:shadow-md'
              }
            >
              <div>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#1c1c26]">{network.name}</h3>
                    <p className="mt-1 text-sm text-[#606067]">{network.subtitle}</p>
                  </div>
                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[rgba(94,133,238,0.1)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5e85ee]">
                    {network.savingsLabel}
                  </span>
                </div>

                <div className="mb-4 rounded-[18px] border border-[rgba(94,133,238,0.14)] bg-[rgba(94,133,238,0.06)] p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5e85ee]">
                    {isZh ? '早期体验价' : 'Early access'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-[#5e85ee]">{network.earlyAccessPrice}</span>
                    <span className="text-sm font-medium text-[#8d8d93]">{isZh ? 'USD / 每次执行 / 每位成员' : 'USD / execution to 1 member'}</span>
                  </div>
                </div>

                <div className="mb-8 rounded-[18px] border border-[rgba(0,0,0,0.08)] bg-white p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1c1c26]">{isZh ? '标准价' : 'Standard'}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#1c1c26]">{network.standardPrice}</span>
                    <span className="text-sm font-medium text-[#8d8d93]">{isZh ? 'USD / 每次执行 / 每位成员' : 'USD / execution to 1 member'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { window.location.href = '/welcome/sign-in' }}
                className={
                  network.accent
                    ? 'w-full rounded-[12px] bg-[#5e85ee] py-3 text-center text-sm font-semibold text-white shadow-md shadow-[rgba(94,133,238,0.3)] transition-colors hover:bg-[#4a70d8]'
                    : 'w-full rounded-[12px] bg-[#1c1c26] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2e2e3a]'
                }
              >
                {copy.common.getStarted}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm italic text-[#8d8d93]">
          {isZh ? '团队规模较大或发薪频率较高？' : 'Large team or high-frequency payroll?'}{' '}
          <a href="mailto:support@pactpay.app" className="text-[#5e85ee] hover:underline">
            {isZh ? '联系我们' : 'Contact us'}
          </a>{' '}
          {isZh ? '获取定制报价。' : 'for custom pricing.'}
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-[24px] border border-[rgba(94,133,238,0.15)] bg-[rgba(94,133,238,0.06)] p-8">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#5e85ee]">
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {isZh ? '费用如何计算' : 'How the fee works'}
          </h4>
          <p className="text-sm leading-relaxed text-[#1c1c26]">
            {isZh ? '例如你在 BSC 上向 5 位成员执行一笔付款，费用为 ' : 'When you execute a payment to 5 members on BSC, the fee is '}
            <span className="font-bold">5 × 2 USDC/USDT = 10 USDC/USDT</span>
            {isZh ? '，会和付款一起从你的钱包扣除。Gas 费独立计算，并全部支付给网络。' : ', charged from your wallet alongside the payout. Gas is separate and goes entirely to the network.'}
            <br /><br />
            <span className="font-semibold text-[#5e85ee]">{isZh ? 'PactPay 永远不会托管你的资金' : 'PactPay never holds your funds'}</span>
            {isZh ? '，服务费只会在链上执行时收取。' : ' - the fee is only charged at the moment of on-chain execution.'}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#1c1c26]">{isZh ? '常见问题' : 'Common Questions'}</h2>
        <div className="space-y-6">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-white/60 p-6 backdrop-blur-sm">
              <h4 className="mb-2 text-sm font-semibold text-[#1c1c26]">{isZh ? `问：${q}` : `Q: ${q}`}</h4>
              <p className="text-sm leading-relaxed text-[#606067]">{isZh ? <>{a}</> : <>A: {a}</>}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[rgba(0,0,0,0.06)] py-10 text-center text-sm text-[#8d8d93]">
        {isZh ? '© 2026 PactPay。面向未来工作的支付基础设施。' : '© 2026 PactPay. Built for the future of work.'}
      </div>
    </div>
  )
}
