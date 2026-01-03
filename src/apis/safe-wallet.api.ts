import SafeApiKit from '@safe-global/api-kit'

const API_KEY =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzYWZlLWF1dGgtc2VydmljZSIsInN1YiI6IjBiMzI5MjYxNmU1ZTQyNDc4NmVlZDhjZDRjOWMzOGZmXzUxODY5YTY5N2VmYjRlMzA5NzA5YjFkYTlhMWVkNjI1Iiwia2V5IjoiMGIzMjkyNjE2ZTVlNDI0Nzg2ZWVkOGNkNGM5YzM4ZmZfNTE4NjlhNjk3ZWZiNGUzMDk3MDliMWRhOWExZWQ2MjUiLCJhdWQiOlsic2FmZS1hdXRoLXNlcnZpY2UiXSwiZXhwIjoxOTI1MTg2NjExLCJyb2xlcyI6W10sImRhdGEiOnt9fQ.EsVaMNoFfInvfEAEPWkLP-XD6Wyg6lmFHHy91fL0ZMc_PX6jVhm7FvarQk06Mf68Ft5rCCI-gXQcBkrpRimoVw'

export class SafeWalletApi {
  private client: SafeApiKit

  constructor(chainId: bigint) {
    this.client = new SafeApiKit({ chainId, apiKey: API_KEY })
  }

  getSafeInfo(safeAddress: string) {
    return this.client.getSafeInfo(safeAddress)
  }

  getSafesByOwner(ownerAddress: string) {
    return this.client.getSafesByOwner(ownerAddress)
  }
}
