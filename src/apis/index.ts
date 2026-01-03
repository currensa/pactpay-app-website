import { AccountApi } from './account.api'
import { ChainAssetApi } from './chain-asset.api'
import { OrgnizationApi } from './orgnization.api'
import request from './request'

export default {
  auth: new AccountApi(request),
  organization: new OrgnizationApi(request),
  chainAsset: new ChainAssetApi(request)
}
