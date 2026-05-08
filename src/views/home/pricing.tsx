export default function PricingPage() {
  const networkPricing = [
    {
      name: 'Ethereum',
      subtitle: 'Mainnet',
      earlyAccessPrice: '10',
      standardPrice: '20',
      savingsLabel: 'Save 50%',
      accent: true,
    },
    {
      name: 'BSC & other L2s',
      subtitle: 'Base, Arbitrum, Polygon and more',
      earlyAccessPrice: '2',
      standardPrice: '5',
      savingsLabel: 'Save 60%',
      accent: false,
    },
  ]

  const faqs = [
    {
      q: 'Is there a monthly subscription?',
      a: "No. You only pay when you execute a payment. If you don't run payroll that month, you pay nothing.",
    },
    {
      q: 'Who pays the gas fee?',
      a: "Gas is paid by the executing wallet (the Owner's EOA). It's separate from the service fee and goes entirely to the network.",
    },
    {
      q: 'What does "per member per execution" mean exactly?',
      a: "Each time you click Execute on a transaction, the fee is 10 or 2 USDC/USDT × number of members in that transaction. If you pay 10 people monthly, that's 20-100 U/month in total fees depending on the network you use.",
    },
    {
      q: 'Do you offer custom pricing for larger teams?',
      a: (
        <>
          Yes, if your organisation has a large team or high-frequency payroll needs, reach out to us at{' '}
          <a href="mailto:support@pactpay.app" className="text-[#5e85ee] font-medium hover:underline">support@pactpay.app</a>{' '}
          and we'll put together a custom plan.
        </>
      ),
    },
  ]

  return (
    <div className="flex-1 text-[#1c1c26]">

      {/* Hero */}
      <section className="pt-12 pb-14 px-6 text-center">
        <span className="inline-block text-[#5e85ee] font-semibold tracking-widest uppercase text-xs mb-5 px-3 py-1 rounded-full bg-[rgba(94,133,238,0.08)]">
          PRICING
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
          Simple, transparent pricing.<br className="hidden md:block" /> Pay only when you pay.
        </h1>
        <p className="text-lg text-[#606067] max-w-xl mx-auto leading-relaxed">
          No subscriptions. No platform fees.<br />
          You pay a flat fee per execution, that's it.
        </p>
      </section>

      {/* Cards */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {networkPricing.map((network) => (
            <div
              key={network.name}
              className={
                network.accent
                  ? 'bg-white border-2 border-[#5e85ee] rounded-[24px] p-8 flex flex-col justify-between shadow-xl shadow-[rgba(94,133,238,0.12)]'
                  : 'bg-white/70 backdrop-blur-sm border border-[rgba(0,0,0,0.08)] rounded-[24px] p-8 flex flex-col justify-between hover:shadow-md transition-shadow'
              }
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#1c1c26]">{network.name}</h3>
                    <p className="text-sm text-[#606067] mt-1">{network.subtitle}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[rgba(94,133,238,0.1)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5e85ee] whitespace-nowrap">
                    {network.savingsLabel}
                  </span>
                </div>

                <div className="rounded-[18px] bg-[rgba(94,133,238,0.06)] border border-[rgba(94,133,238,0.14)] p-5 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e85ee] mb-2">Early access</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-[#5e85ee]">{network.earlyAccessPrice}</span>
                    <span className="text-sm text-[#8d8d93] font-medium">USD / execution to 1 member</span>
                  </div>
                </div>

                <div className="rounded-[18px] bg-white border border-[rgba(0,0,0,0.08)] p-5 mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1c1c26]">Standard</p>
                    {/* <span className="text-xs font-semibold text-[#5e85ee]">{network.savingsLabel}</span> */}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#1c1c26]">{network.standardPrice}</span>
                    <span className="text-sm text-[#8d8d93] font-medium">USD / execution to 1 member</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.location.href = '/welcome/sign-in'}
                className={
                  network.accent
                    ? 'w-full text-center bg-[#5e85ee] text-white text-sm font-semibold py-3 rounded-[12px] hover:bg-[#4a70d8] transition-colors shadow-md shadow-[rgba(94,133,238,0.3)]'
                    : 'w-full text-center bg-[#1c1c26] text-white text-sm font-semibold py-3 rounded-[12px] hover:bg-[#2e2e3a] transition-colors'
                }
              >
                Get started
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-[#8d8d93] mt-10 text-sm italic">
          Large team or high-frequency payroll?{' '}
          <a href="mailto:support@pactpay.app" className="text-[#5e85ee] hover:underline">Contact us</a>{' '}
          for custom pricing.
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-[rgba(94,133,238,0.06)] border border-[rgba(94,133,238,0.15)] rounded-[24px] p-8">
          <h4 className="text-[#5e85ee] font-bold mb-3 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            How the fee works
          </h4>
          <p className="text-[#1c1c26] leading-relaxed text-sm">
            When you execute a payment to 5 members on BSC, the fee is{' '}
            <span className="font-bold">5 × 2 USDC/USDT = 10 USDC/USDT</span>, charged from your wallet alongside the payout. Gas is separate and goes entirely to the network.
            <br /><br />
            <span className="font-semibold text-[#5e85ee]">PactPay never holds your funds</span> - the fee is only charged at the moment of on-chain execution.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-10 text-[#1c1c26]">Common Questions</h2>
        <div className="space-y-6">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-[16px] p-6">
              <h4 className="font-semibold mb-2 text-[#1c1c26] text-sm">Q: {q}</h4>
              <p className="text-[#606067] leading-relaxed text-sm">A: {a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-[rgba(0,0,0,0.06)] py-10 text-center text-[#8d8d93] text-sm">
        &copy; 2026 PactPay. Built for the future of work.
      </div>
    </div>
  )
}
