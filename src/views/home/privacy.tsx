export default function PrivacyPage() {
  return (
    <div className="flex-1 flex text-[#1c1c26] " style={{ minHeight: 'calc(100vh - 90px)' }}>
      <div className="flex w-full max-w-6xl mx-auto justify-center">
        <div className="flex-1 px-8 md:px-14 py-12 max-w-3xl">
          <h2 className="text-3xl font-bold border-b border-[rgba(0,0,0,0.08)] pb-2 mb-4 mt-2">Privacy Policy</h2>
          <p className="text-sm text-[#8d8d93] mb-8">Last updated: April 20, 2026</p>

          <p className="text-base text-[#606067] mb-10 leading-relaxed">
            This Privacy Policy describes how ALLIN TECH LIMITED ("PactPay", "we", "us", or "our") collects, uses, and handles information when you use the PactPay platform at pactpay.app (the "Service").
          </p>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">1. What Information We Collect</h3>
            <p className="text-base font-semibold text-[#1c1c26] mb-2">Information you provide directly:</p>
            <ul className="list-disc list-inside space-y-1 text-base text-[#606067] mb-4">
              <li>Email address, if you register or log in using email</li>
              <li>Any information you submit when contacting support</li>
            </ul>
            <p className="text-base font-semibold text-[#1c1c26] mb-2">Information collected automatically:</p>
            <ul className="list-disc list-inside space-y-1 text-base text-[#606067] mb-4">
              <li>Blockchain wallet addresses used to interact with the Service</li>
              <li>Log data including IP address, browser type, pages visited, and timestamps</li>
              <li>Device information such as operating system and browser version</li>
            </ul>
            <p className="text-base font-semibold text-[#1c1c26] mb-2">What we do not collect:</p>
            <p className="text-base text-[#606067] leading-relaxed">We do not collect government-issued identification, financial account details, or any KYC-related documents. PactPay requires no identity verification to use the Service.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">2. How We Use Your Information</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-base text-[#606067] mb-4">
              <li>Operate and maintain the Service</li>
              <li>Send transactional notifications, such as payment and claim status emails</li>
              <li>Respond to support requests</li>
              <li>Monitor for security incidents and prevent abuse</li>
              <li>Improve the Service through aggregated, non-identifiable usage analysis</li>
            </ul>
            <p className="text-base text-[#606067] leading-relaxed">We do not sell your personal information to third parties.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">3. Blockchain Data</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">Transactions executed through the Service are recorded on public blockchain networks. On-chain data, including wallet addresses and transaction amounts, is publicly accessible and cannot be deleted or modified by PactPay. By using the Service, you acknowledge that certain transaction data will be permanently stored on-chain.</p>
            <p className="text-base text-[#606067] leading-relaxed">PactPay uses a shielded identity mechanism to reduce the linkability between your login wallet and your on-chain activity. However, you should understand that public blockchain data is inherently transparent.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">4. Sharing of Information</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">We do not sell or rent your personal information. We may share your information only in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 text-base text-[#606067]">
              <li><strong className="text-[#1c1c26]">Service providers:</strong> Third-party vendors that help us operate the Service, such as hosting providers and email delivery services, who are bound by appropriate confidentiality obligations</li>
              <li><strong className="text-[#1c1c26]">Legal requirements:</strong> Where disclosure is required by applicable law, court order, or lawful government request</li>
              <li><strong className="text-[#1c1c26]">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, subject to appropriate confidentiality arrangements</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">5. Data Retention</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">We retain personal information only for as long as necessary to fulfil the purposes described in this Policy or as required by applicable law. Email addresses and log data are deleted or anonymised when no longer needed for the operation of the Service.</p>
            <p className="text-base text-[#606067] leading-relaxed">On-chain transaction data is permanent and beyond our control to delete.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">6. Security</h3>
            <p className="text-base text-[#606067] leading-relaxed">We implement reasonable technical and organisational measures to protect your personal information against unauthorised access, loss, or misuse. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">7. Cookies</h3>
            <p className="text-base text-[#606067] leading-relaxed">The Service uses only essential cookies necessary for basic functionality such as session management. We do not use tracking or advertising cookies.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">8. Your Rights</h3>
            <p className="text-base text-[#606067] mb-3 leading-relaxed">Depending on your location, you may have rights to access, correct, or request deletion of your personal information held by us. To exercise these rights, contact us at support@pactpay.app.</p>
            <p className="text-base text-[#606067] leading-relaxed">Note that we cannot delete data that has been recorded on a public blockchain.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">9. Minors</h3>
            <p className="text-base text-[#606067] leading-relaxed">The Service is intended for users aged 18 and above. We do not knowingly collect personal information from minors. If we become aware that we have collected information from a minor, we will delete it promptly.</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">10. Changes to This Policy</h3>
            <p className="text-base text-[#606067] leading-relaxed">We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated Policy on the Service and updating the effective date. Continued use of the Service after such changes constitutes your acceptance of the updated Policy.</p>
          </div>

          <div className="mb-16">
            <h3 className="text-xl font-bold mb-3 text-[#1c1c26]">11. Contact</h3>
            <p className="text-base text-[#606067] leading-relaxed">For privacy-related questions, contact us at support@pactpay.app.</p>
          </div>

          <div className="border-t border-[rgba(0,0,0,0.06)] pt-8 text-center text-[#8d8d93] text-base">
            © 2026 PactPay. Built for the future of work.
          </div>
        </div>
      </div>
    </div>
  )
}
