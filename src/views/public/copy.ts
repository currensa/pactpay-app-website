import type { PreferenceLanguage } from '@/apis/preference.api'
import { DEFAULT_LANGUAGE } from '@/i18n/messages'
import { useTranslation } from '@/utils/i18n'

const PUBLIC_COPY = {
  'en-US': {
    common: {
      loading: 'Loading...',
      getStarted: 'Get Started',
      termsOfUse: 'Terms of Use',
      privacyPolicy: 'Privacy Policy',
    },
    homeLayout: {
      pricing: 'Pricing',
      document: 'Document',
      testing: 'Testing',
      logIn: 'Log in',
      signUp: 'Sign up',
    },
    homeContent: {
      heroTitle: ['Pay Anyone, Anywhere.', 'No KYC. No Org Exposure. No Custody.'],
      features: [
        {
          title: 'Self-Custody by Default',
          description:
            "Funds remain fully controlled by the payer at all times, with no need for third-party custody. The payment logic is defined and locked by the payer's signature, while the smart contract is solely responsible for execution.",
        },
        {
          title: 'Anonymous by Design',
          description:
            'A single EOA is all you need to handle registration, payments, and receiving funds. Zero identity binding required, your real-world information remains completely inaccessible, even to us.',
        },
        {
          title: 'Invisible Identity Layer',
          description:
            'Identity is utilized solely for verification and is never exposed. Only an encrypted proxy identity resides on-chain, ensuring your real address remains completely untraceable.',
        },
        {
          title: 'Dual-Address Isolation',
          description:
            'The proxy address and receiving address are strictly isolated, and both can be dynamically rotated. This ensures strict unlinkability for every flow of funds.',
        },
      ],
      advantagesTitle: ['What are the', 'advantages', 'of pactpay?'],
      footerTitle: 'Pay smarter, not harder.',
      footerCta: "Let's Go!",
      copyright: 'Copyright All Rights Reserved by PactPay',
    },
    welcomeSection: {
      heroTitle: ['Pay Anyone, Anywhere.', 'No KYC. No Org Exposure. No Custody.'],
      ctaTitle: 'Get Started',
      ctaDescription: 'Connect your wallet or sign in with email to get started',
    },
    login: {
      welcomeBack: 'Welcome Back',
      createAccount: 'Create PactPay Account',
      connectWallet: 'Connect wallet',
      connectAnotherWallet: 'Connect Another Wallet',
      continueWithWallet: 'Continue with {address}',
      continueWithEmail: 'Continue with email',
      continueWithGoogle: 'Continue with Google',
      signInWithGoogle: 'Signing in with Google...',
      or: 'or',
      emailPlaceholder: 'Your email address',
      sendCode: 'Send a code',
      resendCode: 'Resend code',
      resendIn: 'Resend in {seconds}s',
      codePlaceholder: 'Enter code (case insensitive)',
      agreePrefix: 'By continuing, you agree to our',
      agreeMiddle: 'and acknowledge our',
      agreeSuffix: '.',
      googleUnavailable: 'Google Sign-In is unavailable right now.',
      googleMissingCredential: 'Google Sign-In did not return a credential.',
      googleFailed: 'Google Sign-In failed. Please try again.',
      googleLoadFailed: 'Google Sign-In failed to load. Please refresh and try again.',
      alreadyMemberTitle: 'Already a member',
      alreadyMemberDescription: 'You have already joined this organization.',
    },
    identity: {
      titleTop: 'How do you want to',
      titleBottom: 'use PactPay',
      organization: 'Organization',
      organizationDescription: 'Create and manage an organization, set up payment plans, and pay members.',
      createOrganization: 'Create Organization',
      member: 'Member',
      memberDescription: 'Join an organization to receive payments and view transaction history.',
      joinOrganization: 'Join Organization',
    },
    selectOrganization: {
      loading: 'Loading organizations...',
      title: 'Select Organization',
      description: 'Choose an organization to manage',
      memberDashboard: 'Member Dashboard',
      token: 'Token',
      lastPayout: 'Last Payout',
      members: 'Members',
      enter: 'Enter',
      newOrganization: 'New Organization',
      newOrganizationDescription: 'Create and manage payroll',
      emptyValue: '--',
      dateLocale: 'en-US',
    },
    createOrganization: {
      role: 'Administrator',
      description: 'Create and manage an organization, set up payment plans, and pay contractors.',
      uploadAvatar: 'Upload avatar (optional)',
      displayNamePlaceholder: 'Enter your display name',
      organizationNamePlaceholder: 'Enter Organization Name',
      referralCodePlaceholder: 'Enter referral code (optional)',
      receivePayrollTitle: 'Will you also receive payments from this organisation?',
      receivePayrollLabel: 'Yes, bind a receiving wallet',
      receivePayrollDescription: "I'll also receive payroll from this organisation",
      back: 'Back',
      creating: 'Creating...',
      create: 'Create',
    },
    joinOrganization: {
      role: 'Member',
      description: 'Join an organization to receive payments and view transaction history.',
      uploadAvatar: 'Upload avatar (optional)',
      displayNamePlaceholder: 'Enter your display name',
      organizationCodePlaceholder: 'Enter Organization Code',
      codeHelp: "Don't have a code? Ask your organization admin for an invite link or code.",
      back: 'Back',
      join: 'Join Organization',
    },
    bindWallet: {
      titleTop: 'Secure your',
      titleBottom: 'PactPay access',
      cardTitle: 'Bind Wallet',
      description:
        'Your wallet address will be used to generate an encrypted identity, which will be used for fund claiming in PactPay.',
      connectWallet: 'Connect Wallet',
      confirm: 'Confirm',
      submitFailed: 'Failed to submit. Please try again.',
    },
    mcpAuth: {
      invalidCallback: 'Missing or invalid callback URL.',
      sendFailed: 'Failed to send token.',
      tokenMissing: 'Login succeeded but token is missing in local storage.',
      doneTitle: 'Authentication complete',
      doneDescription: 'The token has been sent to the local MCP server. You can return to your MCP client and close this page.',
      errorTitle: 'Authentication failed',
      unknownError: 'Unknown error.',
      connectingTitle: 'Connecting to MCP server',
      checking: 'Checking saved session...',
      submitting: 'Sending token to local MCP server...',
    },
  },
  'zh-CN': {
    common: {
      loading: '加载中...',
      getStarted: '开始使用',
      termsOfUse: '使用条款',
      privacyPolicy: '隐私政策',
    },
    homeLayout: {
      pricing: '定价',
      document: '文档',
      testing: '测试',
      logIn: '登录',
      signUp: '注册',
    },
    homeContent: {
      heroTitle: ['向任何人付款，覆盖任何地区。', '无需 KYC，无需暴露组织信息，无需托管。'],
      features: [
        {
          title: '默认自托管',
          description:
            '资金始终由付款方完全掌控，无需第三方托管。支付逻辑由付款方签名后锁定，智能合约只负责按规则执行。',
        },
        {
          title: '天然匿名',
          description:
            '只需一个 EOA 钱包地址即可完成注册、付款和收款。无需身份绑定，现实世界信息对任何人都不可见，包括我们。',
        },
        {
          title: '隐形身份层',
          description:
            '身份仅用于校验，从不直接暴露。链上只存在加密后的代理身份，真实地址始终不可追踪。',
        },
        {
          title: '双地址隔离',
          description:
            '代理地址与收款地址严格隔离，并且都可以动态轮换，确保每一笔资金流都保持强匿名性。',
        },
      ],
      advantagesTitle: ['PactPay 的', '优势', '是什么？'],
      footerTitle: '更聪明地支付，而不是更费力地支付。',
      footerCta: '立即开始',
      copyright: 'PactPay 版权所有',
    },
    welcomeSection: {
      heroTitle: ['向任何人付款，覆盖任何地区。', '无需 KYC，无需暴露组织信息，无需托管。'],
      ctaTitle: '开始使用',
      ctaDescription: '连接钱包或使用邮箱登录即可开始使用',
    },
    login: {
      welcomeBack: '欢迎回来',
      createAccount: '创建 PactPay 账户',
      connectWallet: '连接钱包',
      connectAnotherWallet: '连接其他钱包',
      continueWithWallet: '使用 {address} 继续',
      continueWithEmail: '使用邮箱继续',
      continueWithGoogle: '使用 Google 继续',
      signInWithGoogle: '正在使用 Google 登录...',
      or: '或',
      emailPlaceholder: '输入邮箱地址',
      sendCode: '发送验证码',
      resendCode: '重新发送验证码',
      resendIn: '{seconds} 秒后重发',
      codePlaceholder: '输入验证码（不区分大小写）',
      agreePrefix: '继续即表示你同意我们的',
      agreeMiddle: '并确认你已阅读我们的',
      agreeSuffix: '。',
      googleUnavailable: '当前无法使用 Google 登录。',
      googleMissingCredential: 'Google 登录未返回有效凭证。',
      googleFailed: 'Google 登录失败，请重试。',
      googleLoadFailed: 'Google 登录组件加载失败，请刷新后重试。',
      alreadyMemberTitle: '已是成员',
      alreadyMemberDescription: '你已经加入该组织。',
    },
    identity: {
      titleTop: '你希望如何',
      titleBottom: '使用 PactPay',
      organization: '组织方',
      organizationDescription: '创建并管理组织，配置支付方案，并向成员付款。',
      createOrganization: '创建组织',
      member: '成员',
      memberDescription: '加入组织以接收付款并查看交易记录。',
      joinOrganization: '加入组织',
    },
    selectOrganization: {
      loading: '正在加载组织...',
      title: '选择组织',
      description: '选择要管理的组织',
      memberDashboard: '成员端首页',
      token: '代币',
      lastPayout: '最近一次发放',
      members: '成员数',
      enter: '进入',
      newOrganization: '新建组织',
      newOrganizationDescription: '创建并管理发薪',
      emptyValue: '--',
      dateLocale: 'zh-CN',
    },
    createOrganization: {
      role: '管理员',
      description: '创建并管理组织，配置支付方案，并向协作者付款。',
      uploadAvatar: '上传头像（可选）',
      displayNamePlaceholder: '输入你的展示名称',
      organizationNamePlaceholder: '输入组织名称',
      referralCodePlaceholder: '输入推荐码（可选）',
      receivePayrollTitle: '你也会从这个组织接收付款吗？',
      receivePayrollLabel: '是的，绑定收款钱包',
      receivePayrollDescription: '我也会从这个组织接收薪资或付款',
      back: '返回',
      creating: '创建中...',
      create: '创建',
    },
    joinOrganization: {
      role: '成员',
      description: '加入组织以接收付款并查看交易记录。',
      uploadAvatar: '上传头像（可选）',
      displayNamePlaceholder: '输入你的展示名称',
      organizationCodePlaceholder: '输入组织邀请码',
      codeHelp: '没有邀请码？请向组织管理员索取邀请链接或邀请码。',
      back: '返回',
      join: '加入组织',
    },
    bindWallet: {
      titleTop: '保护你的',
      titleBottom: 'PactPay 访问权限',
      cardTitle: '绑定钱包',
      description: '你的钱包地址将用于生成加密身份，并用于在 PactPay 中完成资金领取。',
      connectWallet: '连接钱包',
      confirm: '确认',
      submitFailed: '提交失败，请重试。',
    },
    mcpAuth: {
      invalidCallback: '缺少回调地址或回调地址无效。',
      sendFailed: '发送令牌失败。',
      tokenMissing: '登录成功，但本地存储中缺少令牌。',
      doneTitle: '认证完成',
      doneDescription: '令牌已发送到本地 MCP 服务器。你现在可以返回 MCP 客户端并关闭此页面。',
      errorTitle: '认证失败',
      unknownError: '未知错误。',
      connectingTitle: '正在连接 MCP 服务器',
      checking: '正在检查已保存的会话...',
      submitting: '正在向本地 MCP 服务器发送令牌...',
    },
  },
} as const

export type PublicCopy = (typeof PUBLIC_COPY)['en-US']

export function getPublicCopy(language: PreferenceLanguage): PublicCopy {
  return PUBLIC_COPY[language] ?? PUBLIC_COPY[DEFAULT_LANGUAGE]
}

export function usePublicCopy() {
  const { language } = useTranslation()

  return {
    language,
    copy: getPublicCopy(language),
  }
}
