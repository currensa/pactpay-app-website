import { AxiosInstance } from 'axios'

export interface OnboardingRecord {
  completedSteps: string[]
  dismissed: boolean
  orgId?: string
}

export class OnboardingApi {
  constructor(private readonly request: AxiosInstance) {}

  async getGuide(orgId?: string) {
    const res = await this.request.get<OnboardingRecord>('/onboarding', {
      params: orgId ? { orgId } : undefined,
    })
    return res.data
  }

  async patchGuide(payload: { dismissed?: boolean; orgId?: string }) {
    const res = await this.request.patch<OnboardingRecord>('/onboarding', payload)
    return res.data
  }
}
