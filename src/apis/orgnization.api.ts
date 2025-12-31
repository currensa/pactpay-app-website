import { AxiosInstance } from "axios";

interface Organization {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export class OrgnizationApi {
  constructor(private readonly request: AxiosInstance) {}

  async createOrganization(name: string, description: string) {
    
  }

}
