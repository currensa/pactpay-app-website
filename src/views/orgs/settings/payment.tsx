import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentSettings() {
  return (
    <div className="flex h-full flex-col space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Vault</CardTitle>
          <CardDescription>
            Your organization's payment vault for StealthPay payroll. Funds are deposited here and claimed by employees
            using their stealth keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Vault contracts are configured per chain. Contact your admin or refer to the chain settings for vault
            addresses.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
