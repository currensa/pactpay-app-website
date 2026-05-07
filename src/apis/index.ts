import { AccountApi } from './account.api'
import { ChainAssetApi } from './chain-asset.api'
import { FavoriteAddressApi } from './favorite-address.api'
import { NotificationApi } from './notification.api'
import { OnboardingApi } from './onboarding.api'
import { OrgnizationApi } from './orgnization.api'
import { StatisticsApi } from './statistics.api'
import { TransactionApi } from './transaction.api'
import { StorageApi } from './storage.api'

import request from './request'

export default {
  auth: new AccountApi(request),
  organization: new OrgnizationApi(request),
  chainAsset: new ChainAssetApi(request),
  transaction: new TransactionApi(request),
  statistics: new StatisticsApi(request),
  notification: new NotificationApi(request),
  favoriteAddress: new FavoriteAddressApi(request),
  storage: new StorageApi(request),
  onboarding: new OnboardingApi(request),
}
