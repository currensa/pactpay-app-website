import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { IconGlobe } from '@tabler/icons-react'
import { useState } from 'react'

export default function PreferencesSettings() {
  const [language, setLanguage] = useState('en')
  const [currency, setCurrency] = useState('usd')

  return (
    <div className="max-w-4xl space-y-6">
      {/* General Preferences Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-green-100 text-green-600">
            <IconGlobe className="h-[18px] w-[18px]" />
          </span>
          <h2 className="text-lg font-semibold">General Preferences</h2>
        </div>

        <Card>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Display Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD - US Dollar</SelectItem>
                    <SelectItem value="eur">EUR - Euro</SelectItem>
                    <SelectItem value="cny">CNY - Chinese Yuan</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  All token amounts will be estimated in this currency for reference
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Global Notifications</h3>

              <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Email Notifications</div>
                  <div className="text-muted-foreground text-xs">Notifications will be sent to: alice@example.com</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Push Notifications</div>
                  <div className="text-muted-foreground text-xs">Receive browser push notifications</div>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
