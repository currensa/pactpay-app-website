import COS from 'cos-js-sdk-v5'
import { AxiosInstance } from 'axios'

export interface UploadCredentials {
  credentials: { tmpSecretId: string; tmpSecretKey: string; sessionToken: string }
  bucket: string
  region: string
  key: string
  startTime: number
  expiredTime: number
}

export class StorageApi {
  constructor(private readonly request: AxiosInstance) {}

  async getUploadCredentials(filename: string): Promise<UploadCredentials> {
    const res = await this.request.post<UploadCredentials>('/storage/upload-credentials', { filename })
    return res.data
  }

  /**
   * 获取凭证并直接上传文件到 COS
   * @returns 文件的公开访问 URL
   */
  async uploadFile(file: File): Promise<string> {
    const cred = await this.getUploadCredentials(file.name)

    const cos = new COS({
      getAuthorization: (_options, callback) => {
        callback({
          TmpSecretId: cred.credentials.tmpSecretId,
          TmpSecretKey: cred.credentials.tmpSecretKey,
          SecurityToken: cred.credentials.sessionToken,
          StartTime: cred.startTime,
          ExpiredTime: cred.expiredTime,
        })
      },
    })

    await new Promise<void>((resolve, reject) => {
      cos.putObject(
        {
          Bucket: cred.bucket,
          Region: cred.region,
          Key: cred.key,
          Body: file,
        },
        err => (err ? reject(err) : resolve()),
      )
    })

    return `https://${cred.bucket}.cos.${cred.region}.myqcloud.com/${cred.key}`
  }
}
