import { AccountApi } from './account.api'
import { ChainAssetApi } from './chain-asset.api'
import { OrgnizationApi } from './orgnization.api'
import { StatisticsApi } from './statistics.api'
import { TransactionApi } from './transaction.api'

import request from './request'

export default {
  auth: new AccountApi(request),
  organization: new OrgnizationApi(request),
  chainAsset: new ChainAssetApi(request),
  transaction: new TransactionApi(request),
  statistics: new StatisticsApi(request)
}
