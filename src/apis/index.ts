import { AccountApi } from "./account.api";
import request from "./request";

export default {
  auth: new AccountApi(request),
}
