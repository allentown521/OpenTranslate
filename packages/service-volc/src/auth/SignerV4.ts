import MetaData from "./MetaData";
import { getXDate } from "../utils/util";
import CryptoJS from "crypto-js";
import ServiceInfo from "../ServiceInfo";
import ApiInfo from "../ApiInfo";
import { Header } from "../base/Request";

class SignerV4 {
  static sign(serviceInfo: ServiceInfo, apiInfo: ApiInfo): Header {
    const { header, credentials } = serviceInfo;
    const currTime = getXDate();
    const metaData = new MetaData(
      "HMAC-SHA256",
      credentials.service,
      credentials.region,
      currTime
    );

    const XContentSha256 = CryptoJS.SHA256(apiInfo.body.toString()).toString(
      CryptoJS.enc.Hex
    );
    header["X-Date"] = currTime;
    header["X-Content-Sha256"] = XContentSha256;

    const signingStr = this.getSigningStr(apiInfo, header, metaData);
    const signingKey = this.getSigningKey(credentials.sk, metaData);
    const sign = CryptoJS.HmacSHA256(signingStr, signingKey).toString(
      CryptoJS.enc.Hex
    );

    const authorization = [
      `${metaData.algorithm} Credential=${
        credentials.ak
      }/${metaData.getCredentialScope()}`,
      "SignedHeaders=" + header.getSignedHeaders(),
      `Signature=${sign}`
    ].join(", ");

    header["Authorization"] = authorization;
    return header;
  }

  static getSigningStr(
    apiInfo: ApiInfo,
    header: Header,
    metaData: MetaData
  ): string {
    const canonicalRequest = [
      apiInfo.method,
      apiInfo.path,
      apiInfo.query.toString(),
      header.toString(),
      header.getSignedHeaders(),
      header["X-Content-Sha256"]
    ].join("\n");
    const hashCanonicalRequest = CryptoJS.SHA256(canonicalRequest).toString(
      CryptoJS.enc.Hex
    );
    const signingStr = [
      metaData.algorithm,
      metaData.date,
      metaData.getCredentialScope(),
      hashCanonicalRequest
    ].join("\n");
    return signingStr;
  }

  static getSigningKey(sk: string, metaData: MetaData): CryptoJS.WordArray {
    const kDate = CryptoJS.HmacSHA256(metaData.date, sk);
    const kRegion = CryptoJS.HmacSHA256(metaData.region, kDate);
    const kService = CryptoJS.HmacSHA256(metaData.service, kRegion);
    return CryptoJS.HmacSHA256("request", kService);
  }
}

export default SignerV4;
