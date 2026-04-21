export default function TermsPage() {
  return (
    <div className="flex-1 flex text-[#1c1c26] " style={{ minHeight: 'calc(100vh - 90px)' }}>
      <div className="flex w-full max-w-6xl mx-auto justify-center">
        <div className="flex-1 px-8 md:px-14 py-12 max-w-3xl">
          <h2 className="text-3xl font-bold border-b border-[rgba(0,0,0,0.08)] pb-2 mb-4 mt-2">Terms of Use</h2>
          <p className="text-sm text-[#8d8d93] mb-8">Last updated: April 20, 2026</p>

          <p className="text-base text-[#606067] mb-4 leading-relaxed">
            These Terms of Use ("Terms") are an agreement between you and ALLIN TECH LIMITED, a company incorporated in Hong Kong ("PactPay", "we", "us", or "our"), governing your access to and use of the PactPay platform available at pactpay.app and any related services (collectively, the "Service").
          </p>
          <p className="text-base text-[#606067] mb-10 leading-relaxed">
            By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">1. Who Can Use the Service</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">You must be at least 18 years old and have the legal capacity to enter into binding agreements to use the Service. By using the Service, you represent that you meet these requirements.</p>
            <p className="text-base text-[#606067] leading-relaxed">The Service is not available to individuals or entities located in jurisdictions where its use would be prohibited by applicable law.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">2. What the Service Is</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">PactPay is a non-custodial payment platform that enables organisations to execute on-chain payments to members through smart contracts. PactPay does not hold, custody, or control any funds at any point. All transactions are executed directly on public blockchain networks. PactPay has no ability to reverse, cancel, or modify any on-chain transaction once it has been submitted.</p>
            <p className="text-base text-[#606067] leading-relaxed">You are solely responsible for ensuring the accuracy of all transaction details, including recipient addresses, payment amounts, and claim times, before signing and executing any transaction.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">3. Your Account</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">You may register using an email address or an externally owned account (EOA) wallet. You are responsible for maintaining the security of your login credentials and wallet. You must notify us at support@pactpay.app immediately if you become aware of any unauthorised access to your account.</p>
            <p className="text-base text-[#606067] leading-relaxed">We are not liable for any loss resulting from unauthorised access to your account where such access results from your failure to keep your credentials secure.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">4. Non-Custodial Nature of the Service</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">PactPay does not take custody of any funds. All payments flow directly from the paying party's wallet through a smart contract to the recipient's designated wallet. PactPay holds no private keys to any user wallet and cannot initiate, reverse, or freeze any transaction.</p>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">You understand and accept that:</p>
            <ul className="list-disc list-inside space-y-2 text-base text-[#606067]">
              <li>Blockchain transactions are irreversible once confirmed on-chain.</li>
              <li>Smart contract behaviour is determined by the code deployed on-chain, which is publicly verifiable.</li>
              <li>Gas fees are charged by the relevant blockchain network and are independent of PactPay.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">5. Prohibited Uses</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 text-base text-[#606067]">
              <li>Violate any applicable law or regulation</li>
              <li>Conduct or facilitate money laundering, fraud, or any other financial crime</li>
              <li>Circumvent or attempt to circumvent any security feature of the Service</li>
              <li>Interfere with or disrupt the operation of the Service or any underlying blockchain network</li>
              <li>Use the Service on behalf of any person or entity that is subject to applicable sanctions</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">6. Blockchain and Smart Contract Risks</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">You acknowledge that use of the Service involves inherent risks associated with blockchain technology, including but not limited to:</p>
            <ul className="list-disc list-inside space-y-2 text-base text-[#606067] mb-4">
              <li>Irreversibility of on-chain transactions</li>
              <li>Smart contract vulnerabilities</li>
              <li>Network congestion, delays, or forks</li>
              <li>Loss of access to wallet private keys</li>
              <li>Regulatory changes affecting digital assets</li>
            </ul>
            <p className="text-base text-[#606067] leading-relaxed">PactPay does not guarantee the continuous availability or security of any blockchain network.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">7. Intellectual Property</h3>
            <p className="text-base text-[#606067] leading-relaxed">All content, design, and software comprising the Service, excluding open-source components, is owned by or licensed to ALLIN TECH LIMITED. You are granted a limited, non-exclusive, non-transferable licence to use the Service for its intended purpose. You may not copy, modify, distribute, or reverse engineer any part of the Service without our prior written consent.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">8. Disclaimers</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be error-free, uninterrupted, or free from security vulnerabilities.</p>
            <p className="text-base text-[#606067] leading-relaxed">PactPay is not a financial institution, money transmitter, broker, or investment adviser. Nothing in the Service constitutes financial, legal, or investment advice.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">9. Limitation of Liability</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">To the fullest extent permitted by applicable law, ALLIN TECH LIMITED and its officers, employees, and agents will not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of funds resulting from user error, smart contract exploits, or third-party actions.</p>
            <p className="text-base text-[#606067] leading-relaxed">Our total aggregate liability to you for any claim arising from your use of the Service will not exceed the service fees you paid to PactPay in the three months preceding the relevant claim.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">10. Changes to the Service and These Terms</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">We may update these Terms at any time. We will notify you of material changes by posting the updated Terms on the Service and updating the effective date. Continued use of the Service after such changes constitutes your acceptance of the updated Terms.</p>
            <p className="text-base text-[#606067] leading-relaxed">We may modify, suspend, or discontinue the Service at any time without notice.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">11. Governing Law</h3>
            <p className="text-base text-[#606067] leading-relaxed">These Terms are governed by and construed in accordance with the laws of Hong Kong. Any disputes arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Hong Kong.</p>
          </div>

          <div className="mb-16">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">12. Contact</h3>
            <p className="text-base text-[#606067] leading-relaxed">For questions about these Terms, contact us at support@pactpay.app.</p>
          </div>

          <div className="border-t border-[rgba(0,0,0,0.06)] pt-8 text-center text-[#8d8d93] text-base">
            © 2026 PactPay. Built for the future of work.
          </div>
        </div>
      </div>
    </div>
  )
}
