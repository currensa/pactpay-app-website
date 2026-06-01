import { usePublicCopy } from '@/views/public/copy'
import { useEffect, useMemo, useState } from 'react'

type NavItem = { id: string; label: string; sub?: boolean }
type TableRow = { field: string; value: string; href?: string }
type FaqItem = { question: string; answer: string }

function SectionAnchor({ id }: { id: string }) {
  return <span id={id} className="block" style={{ scrollMarginTop: '5rem' }} />
}

export default function TestingPage() {
  const { language } = usePublicCopy()
  const isZh = language === 'zh-CN'
  const [activeId, setActiveId] = useState('overview')

  const navItems = useMemo<NavItem[]>(
    () =>
      isZh
        ? [
            { id: 'overview', label: '概览' },
            { id: 'prerequisites', label: '前置准备', sub: true },
            { id: 'step1', label: '步骤 1: 获取 Sepolia ETH' },
            { id: 'step2', label: '步骤 2: 获取测试 USDC' },
            { id: 'step3', label: '步骤 3: 添加 Sepolia 网络' },
            { id: 'step4', label: '步骤 4: 添加 USDC 代币' },
            { id: 'step5', label: '步骤 5: 配置 PactPay 支付设置' },
            { id: 'step6', label: '步骤 6: 添加成员' },
            { id: 'step7', label: '步骤 7: 创建并执行交易' },
            { id: 'troubleshooting', label: '故障排查' },
          ]
        : [
            { id: 'overview', label: 'Overview' },
            { id: 'prerequisites', label: 'Prerequisites', sub: true },
            { id: 'step1', label: 'Step 1: Get Sepolia ETH' },
            { id: 'step2', label: 'Step 2: Get test USDC' },
            { id: 'step3', label: 'Step 3: Add Sepolia network' },
            { id: 'step4', label: 'Step 4: Add USDC token' },
            { id: 'step5', label: 'Step 5: Configure PactPay settings' },
            { id: 'step6', label: 'Step 6: Add a member' },
            { id: 'step7', label: 'Step 7: Create and execute a transaction' },
            { id: 'troubleshooting', label: 'Troubleshooting' },
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

  const networkRows: TableRow[] = isZh
    ? [
        { field: '网络名称', value: 'Sepolia Testnet' },
        { field: 'RPC URL', value: 'https://ethereum-sepolia.publicnode.com', href: 'https://ethereum-sepolia.publicnode.com/' },
        { field: 'Chain ID', value: '11155111' },
        { field: '货币符号', value: 'ETH' },
        { field: '区块浏览器', value: 'https://sepolia.etherscan.io', href: 'https://sepolia.etherscan.io/' },
      ]
    : [
        { field: 'Network name', value: 'Sepolia Testnet' },
        { field: 'RPC URL', value: 'https://ethereum-sepolia.publicnode.com', href: 'https://ethereum-sepolia.publicnode.com/' },
        { field: 'Chain ID', value: '11155111' },
        { field: 'Currency symbol', value: 'ETH' },
        { field: 'Block explorer', value: 'https://sepolia.etherscan.io', href: 'https://sepolia.etherscan.io/' },
      ]

  const troubleshooting: FaqItem[] = isZh
    ? [
        {
          question: '交易失败 / Gas 不足',
          answer: '确认你的钱包里有足够的 Sepolia ETH。回到步骤 1，从水龙头申请更多测试 ETH。',
        },
        {
          question: '钱包里看不到 USDC',
          answer: '检查是否正确导入了步骤 4 中的代币合约地址，并确认钱包当前处于 Sepolia 网络。',
        },
        {
          question: '成员看不到 Claim 按钮',
          answer: '通常是因为领取时间还没到，或者交易还没有执行。先在 Transactions 列表里检查状态。',
        },
        {
          question: 'Faucet 不可用',
          answer: 'Circle 的 USDC 水龙头可能会限流。等几分钟后重试，或者换一个钱包地址。',
        },
      ]
    : [
        {
          question: 'Transaction failed / out of gas',
          answer: 'Make sure you have enough Sepolia ETH in your wallet. Go back to Step 1 and request more from the faucet.',
        },
        {
          question: 'USDC not showing in wallet',
          answer: 'Double-check that you imported the token contract address from Step 4 correctly and that your wallet is on the Sepolia network.',
        },
        {
          question: "Member can't see the Claim button",
          answer: 'Usually the claim time has not arrived yet, or the transaction has not been executed. Check the transaction status in your Transactions list.',
        },
        {
          question: 'Faucet not working',
          answer: "Circle's USDC faucet may hit rate limits. Wait a few minutes and try again, or use a different wallet address.",
        },
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

        <div className="min-w-0 max-w-3xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6 md:px-14 md:py-12 [&_a]:break-all [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_li]:break-words [&_p]:break-words">
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
          <h1 className="mb-4 mt-2 text-3xl font-bold md:text-4xl">
            {isZh ? '在 Sepolia 测试网上测试 PactPay' : 'Testing PactPay on Sepolia Testnet'}
          </h1>
          <p className="mb-8 text-base leading-relaxed text-[#606067]">
            {isZh
              ? '这份指南会带你完成测试环境配置，并在 Sepolia 测试网上发起第一笔薪资交易。整个流程只使用测试资产，不会消耗真实资金。'
              : 'This guide walks you through setting up a test environment and sending your first payroll transaction on the Sepolia testnet. No real funds are used.'}
          </p>

          <SectionAnchor id="prerequisites" />
          <h2 className="mb-4 mt-8 border-b border-[rgba(0,0,0,0.08)] pb-2 text-2xl font-bold">
            {isZh ? '前置准备' : 'Prerequisites'}
          </h2>
          <ul className="mb-10 list-inside list-disc space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '浏览器中已安装 MetaMask 或任意 EOA 钱包' : 'MetaMask or any EOA wallet installed in your browser'}</li>
            <li>{isZh ? '一个 PactPay 组织账号，可前往 pactpay.app 注册' : 'A PactPay organisation account. You can register at pactpay.app'}</li>
          </ul>

          <SectionAnchor id="step1" />
          <h2 className="mb-4 mt-10 text-2xl font-bold">{isZh ? '步骤 1: 获取 Sepolia ETH（用于 Gas）' : 'Step 1 - Get Sepolia ETH (for gas)'}</h2>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh ? '执行交易时需要使用 Sepolia ETH 支付链上 Gas。' : 'You need Sepolia ETH to pay gas fees when executing transactions.'}
          </p>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>
              {isZh ? '访问 ' : 'Go to '}
              <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer" className="text-[#5e85ee] underline underline-offset-2">
                cloud.google.com/application/web3/faucet/ethereum/sepolia
              </a>
            </li>
            <li>{isZh ? '使用 Google 账号登录' : 'Sign in with a Google account'}</li>
            <li>{isZh ? '输入你的钱包地址并申请测试 ETH' : 'Enter your wallet address and request test ETH'}</li>
            <li>{isZh ? '等待 1 到 2 分钟，ETH 会出现在钱包中' : 'Wait 1 to 2 minutes. The ETH will appear in your wallet'}</li>
          </ol>
          <div className="mb-10 rounded-r-[12px] border-l-4 border-[#5e85ee] bg-[rgba(94,133,238,0.06)] px-4 py-3 text-base text-[#606067]">
            {isZh ? 'Google 的水龙头通常最稳定。如果暂时不可用，可以尝试 sepoliafaucet.com 或 Alchemy 的 Sepolia faucet。' : "Google's faucet is currently the most reliable option. If it's unavailable, try sepoliafaucet.com or Alchemy's Ethereum Sepolia faucet."}
          </div>

          <SectionAnchor id="step2" />
          <h2 className="mb-4 mt-10 text-2xl font-bold">{isZh ? '步骤 2: 获取测试 USDC' : 'Step 2 - Get test USDC'}</h2>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh ? '发薪时需要测试版 USDC。建议使用 Circle 官方 faucet 获取。' : "You'll need testnet USDC for payroll. Use Circle's official faucet."}
          </p>
          <ol className="mb-10 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>
              {isZh ? '访问 ' : 'Go to '}
              <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="text-[#5e85ee] underline underline-offset-2">
                faucet.circle.com
              </a>
            </li>
            <li>{isZh ? '网络选择 Ethereum Sepolia' : 'Select Ethereum Sepolia as the network'}</li>
            <li>{isZh ? '输入你的钱包地址' : 'Enter your wallet address'}</li>
            <li>{isZh ? '点击 Send，测试 USDC 通常会在 1 分钟内到账' : 'Click Send. Testnet USDC usually arrives within a minute'}</li>
          </ol>

          <SectionAnchor id="step3" />
          <h2 className="mb-4 mt-10 text-2xl font-bold">{isZh ? '步骤 3: 将 Sepolia 网络添加到钱包' : 'Step 3 - Add Sepolia network to your wallet'}</h2>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh ? '如果你的钱包还没有 Sepolia 网络，可以这样添加：' : 'If Sepolia is not already available in your wallet:'}
          </p>
          <p className="mb-2 text-base font-semibold text-[#1c1c26]">MetaMask</p>
          <ol className="mb-6 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '打开 MetaMask，点击顶部网络选择器' : 'Open MetaMask and click the network selector at the top'}</li>
            <li>{isZh ? '点击 Add network' : 'Click Add network'}</li>
            <li>{isZh ? '从常用测试网列表中选择 Sepolia' : 'Select Sepolia from the list of popular test networks'}</li>
            <li>{isZh ? '点击 Add 确认' : 'Click Add to confirm'}</li>
          </ol>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh ? '如果钱包没有自动显示，也可以手动填入以下参数：' : "If it doesn't appear automatically, add it manually with these settings:"}
          </p>
          <div className="mb-10 overflow-x-auto">
            <table className="min-w-[520px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {[isZh ? '字段' : 'Field', isZh ? '值' : 'Value'].map(header => (
                    <th key={header} className="border border-[rgba(0,0,0,0.08)] px-4 py-3 text-left font-medium text-[#8d8d93]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {networkRows.map(row => (
                  <tr key={row.field}>
                    <td className="border border-[rgba(0,0,0,0.08)] px-4 py-3 font-medium text-[#1c1c26]">{row.field}</td>
                    <td className="border border-[rgba(0,0,0,0.08)] px-4 py-3 text-[#606067]">
                      {row.href ? (
                        <a href={row.href} target="_blank" rel="noreferrer" className="text-[#5e85ee] underline underline-offset-2">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionAnchor id="step4" />
          <h2 className="mb-4 mt-10 text-2xl font-bold">{isZh ? '步骤 4: 将 USDC 代币添加到钱包' : 'Step 4 - Add USDC token to your wallet'}</h2>
          <p className="mb-3 text-base leading-relaxed text-[#606067]">
            {isZh ? '如果钱包没有自动显示测试网 USDC，需要手动导入。' : "If your wallet doesn't display testnet USDC automatically, add it manually."}
          </p>
          <p className="mb-2 text-base font-semibold text-[#1c1c26]">MetaMask</p>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '在 Assets 页签底部点击 Import tokens' : 'Scroll to the bottom of the Assets tab and click Import tokens'}</li>
            <li>{isZh ? '选择 Custom token' : 'Select Custom token'}</li>
            <li>
              {isZh ? '粘贴合约地址：' : 'Paste the contract address: '}
              <code className="break-all">0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238</code>
            </li>
            <li>{isZh ? '确认自动带出的符号和精度为 USDC' : 'Confirm the symbol and decimals auto-fill as USDC'}</li>
            <li>{isZh ? '点击 Add custom token，再点击 Import tokens' : 'Click Add custom token, then Import tokens'}</li>
          </ol>
          <p className="mb-10 text-base leading-relaxed text-[#606067]">
            {isZh ? '你也可以在 Etherscan 上验证这个 USDC 合约：' : 'You can verify the USDC contract on Etherscan:'}{' '}
            <a
              href="https://sepolia.etherscan.io/token/0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
              target="_blank"
              rel="noreferrer"
              className="text-[#5e85ee] underline underline-offset-2"
            >
              sepolia.etherscan.io/token/0x1c7d4b196cb0c7b01d743fbc6116a902379c7238
            </a>
          </p>

          <SectionAnchor id="step5" />
          <h2 className="mb-4 mt-10 text-2xl font-bold">{isZh ? '步骤 5: 在 PactPay 中配置支付设置' : 'Step 5 - Configure payment settings in PactPay'}</h2>
          <ol className="mb-10 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '登录 PactPay，进入 Settings' : 'Log in to PactPay and go to Settings'}</li>
            <li>
              {isZh ? '在 Payment settings 中设置：' : 'Under Payment settings, set:'}
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Network: Sepolia Testnet</li>
                <li>Token: USDC</li>
              </ul>
            </li>
            <li>{isZh ? '保存设置' : 'Save your settings'}</li>
          </ol>

          <SectionAnchor id="step6" />
          <h2 className="mb-4 mt-10 text-2xl font-bold">{isZh ? '步骤 6: 添加成员' : 'Step 6 - Add a member'}</h2>
          <p className="mb-4 text-base leading-relaxed text-[#606067]">
            {isZh ? '发起交易之前，组织里至少需要有一位激活成员。' : 'Before creating a transaction, you need at least one active member in your organisation.'}
          </p>
          <ol className="mb-10 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '进入 Members，点击 + Invite Members' : 'Go to Members and click + Invite Members'}</li>
            <li>{isZh ? '把邀请链接或邀请码发给你的测试账号或同事' : 'Share the invite link or code with your test account or a colleague'}</li>
            <li>{isZh ? '被邀请用户注册 PactPay、加入组织并绑定领取钱包' : 'The invited user registers on PactPay, joins your organisation, and binds their claim wallet'}</li>
            <li>{isZh ? '回到 Members，批准待审核成员，让状态变成 Active' : 'Back in Members, approve the pending member so their status becomes Active'}</li>
            <li>{isZh ? '在 Amount 列通过编辑按钮设置对应的 USDC 金额' : 'Set their USDC amount using the edit icon in the Amount column'}</li>
          </ol>

          <SectionAnchor id="step7" />
          <h2 className="mb-4 mt-10 text-2xl font-bold">{isZh ? '步骤 7: 创建并执行交易' : 'Step 7 - Create and execute a transaction'}</h2>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-base leading-relaxed text-[#606067]">
            <li>{isZh ? '进入 Transactions，点击 + New Transaction' : 'Go to Transactions and click + New Transaction'}</li>
            <li>{isZh ? '输入交易名称，例如 Test payroll' : 'Enter a transaction name, for example Test payroll'}</li>
            <li>{isZh ? '选择激活成员并确认对应的 USDC 金额' : 'Select your active member and confirm the USDC amount'}</li>
            <li>
              {isZh ? '设置 claim time，也就是成员可领取的时间：' : 'Set a claim time, which is when the member can claim:'}
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>{isZh ? '设成几分钟后，用来测试等待流程' : 'Set it a few minutes in the future to test the waiting flow'}</li>
                <li>{isZh ? '或者设成过去时间，用来测试立即领取' : 'Or set it in the past to test immediate claiming'}</li>
              </ul>
            </li>
            <li>{isZh ? '检查摘要中的付款金额、服务费和领取时间，然后点击 Sign & execute' : 'Review the payout amount, service fee, and claim time, then click Sign & execute'}</li>
            <li>{isZh ? '签名并提交交易' : 'Sign the transaction and submit it'}</li>
          </ol>
          <p className="mb-10 text-base leading-relaxed text-[#606067]">
            {isZh ? '链上确认后，成员就可以在 My Payments 页面，在领取时间到达后领取自己的 USDC。' : 'Once confirmed on-chain, the member can go to My Payments and claim their USDC when the claim time arrives.'}
          </p>

          <SectionAnchor id="troubleshooting" />
          <h2 className="mb-5 mt-12 border-b border-[rgba(0,0,0,0.08)] pb-2 text-2xl font-bold">
            {isZh ? '故障排查' : 'Troubleshooting'}
          </h2>
          <div className="space-y-4">
            {troubleshooting.map(item => (
              <div key={item.question} className="rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-white/60 px-5 py-4">
                <p className="mb-1 text-base font-semibold text-[#1c1c26]">{item.question}</p>
                <p className="text-base text-[#606067]">{item.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-[rgba(0,0,0,0.06)] pt-8 text-center text-base text-[#8d8d93]">
            {isZh ? '如有问题，请联系 support@pactpay.app' : 'Questions? Contact us at support@pactpay.app'}
          </div>
        </div>
      </div>
    </div>
  )
}
