import {
  Language,
  Translator,
  TranslateError,
  TranslateQueryResult
} from "@opentranslate2/translator";
import SHA256 from "crypto-js/sha256";
import EncHEX from "crypto-js/enc-hex";
import CryptoJS from "crypto-js";

// https://help.aliyun.com/zh/machine-translation/support/supported-languages-and-codes?spm=a2c4g.11186623.0.0.6a097467jYw553
const langMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "zh"],
  ["en", "en"],
  ["yue", "yue"],
  ["wyw", "wyw"],
  ["ja", "ja"],
  ["ko", "ko"],
  ["fr", "fr"],
  ["es", "es"],
  ["th", "th"],
  ["ar", "ar"],
  ["ru", "ru"],
  ["pt", "pt"],
  ["de", "de"],
  ["it", "it"],
  ["el", "el"],
  ["nl", "nl"],
  ["pl", "pl"],
  ["bg", "bul"],
  ["et", "est"],
  ["da", "dan"],
  ["fi", "fin"],
  ["cs", "cs"],
  ["ro", "rom"],
  ["sl", "slo"],
  ["sv", "swe"],
  ["hu", "hu"],
  ["zh-TW", "zh-Hant"],
  ["vi", "vie"]
];

export interface VolcConfig {
  accessKeyId: string;
  accessKeySecret: string;
}

export class VolcTranslator extends Translator<VolcConfig> {
  readonly name = "volc";

  readonly endpoint = "https://open.volcengineapi.com";
  private calculateSignature(
    method: string,
    params: Record<string, any>,
    secret: string
  ): string {
    const currTime = this.getCurrentFormatDate();
    const bodyHash = this.calculateBodyHash(params);

    // 构造规范化请求字符串
    const canonicalRequest = [
      method,
      "/",
      new URLSearchParams({
        Action: params.Action,
        Version: params.Version
      }).toString(),
      this.canonicalHeaders(bodyHash),
      this.signedHeaders(),
      bodyHash
    ].join("\n");

    const hashCanonicalRequest = CryptoJS.SHA256(canonicalRequest).toString(
      CryptoJS.enc.Hex
    );

    // 构造签名字符串
    const date = currTime.substring(0, 8);
    const credentialScope = `${date}/cn-north-1/translate/request`;
    const signingStr = [
      "HMAC-SHA256",
      currTime,
      credentialScope,
      hashCanonicalRequest
    ].join("\n");

    // 计算签名密钥
    const kDate = CryptoJS.HmacSHA256(date, secret);
    const kRegion = CryptoJS.HmacSHA256("cn-north-1", kDate);
    const kService = CryptoJS.HmacSHA256("translate", kRegion);
    const signingKey = CryptoJS.HmacSHA256("request", kService);

    // 计算最终签名
    return CryptoJS.HmacSHA256(signingStr, signingKey).toString(
      CryptoJS.enc.Hex
    );
  }

  private canonicalHeaders(bodyHash: string): string {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      host: "open.volcengineapi.com",
      "x-content-sha256": bodyHash,
      "x-date": this.getCurrentFormatDate()
    };

    // 确保按照字典序排序
    return (
      Object.keys(headers)
        .sort()
        .map(key => `${key}:${headers[key].trim().replace(/\s+/g, " ")}`) // 规范化头部值
        .join("\n") + "\n"
    );
  }

  private signedHeaders(): string {
    return "content-type;host;x-content-sha256;x-date";
  }

  private createScope(date: string, region: string, service: string): string {
    return [date, region, service, "request"].join("/");
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/\!/g, "%21")
      .replace(/\'/g, "%27")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/\*/g, "%2A")
      .replace(/%20/g, "+");
  }

  protected async query(
    text: string,
    from: Language,
    to: Language,
    config: VolcConfig
  ): Promise<TranslateQueryResult> {
    type VolcTranslateError = {
      Code: "200" | string;
      Message: "Invalid Sign" | string;
    };

    type VolcTranslateResult = {
      ResponseMetadata: {
        Action?: string;
        Error?: {
          Code: string;
          Message: string;
          CodeN: number;
        };
      };
      TranslationList: Array<{
        DetectedSourceLanguage?: string;
        Extra?: string;
        Translation: string;
      }>;
    };

    const { accessKeyId, accessKeySecret } = config;

    // URL参数
    const urlParams = {
      Action: "TranslateText",
      Version: "2020-06-01"
    };

    // 表单参数
    const formParams = {
      SourceLanguage: VolcTranslator.langMap.get(from) || "",
      TargetLanguage: VolcTranslator.langMap.get(to) || "",
      TextList: [text]
    };

    // 计算签名
    const signature = this.calculateSignature(
      "POST",
      urlParams,
      accessKeySecret
    );

    const res = await this.request<VolcTranslateResult>({
      method: "POST",
      url: this.endpoint,
      params: {
        ...urlParams
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: this.buildAuthHeader(signature, accessKeyId),
        "X-Date": this.getCurrentFormatDate(),
        "X-Content-Sha256": this.calculateBodyHash(formParams)
      },
      data: formParams
    }).catch(e => {
      console.error(new Error("[Volc service]" + e));
      throw e;
    });

    const code =
      res.data.ResponseMetadata.Error && res.data.ResponseMetadata.Error.CodeN;
    if (code) {
      // https://www.volcengine.com/docs/4640/65067
      console.error(new Error("[Volc service]" + code));
      switch (code) {
        case 100009:
          throw new TranslateError("AUTH_ERROR");
        case 100018: // todo docs is not mentioned
          throw new TranslateError("USEAGE_LIMIT");
        default:
          throw new TranslateError("UNKNOWN");
      }
    }

    return {
      text,
      from: from,
      to,
      origin: {
        paragraphs: text.split(/\n+/)
      },
      trans: {
        paragraphs: [res.data.TranslationList[0].Translation]
      }
    };
  }

  private calculateBodyHash(formParams: Record<string, any>): string {
    const body = JSON.stringify(formParams);
    return SHA256(body).toString(EncHEX);
  }

  private getCurrentFormatDate(): string {
    const date = new Date();
    return date
      .toISOString()
      .replace(/[-:]/g, "") // 移除破折号和冒号
      .replace(/\.\d{3}/, ""); // 移除毫秒
  }

  private buildAuthHeader(signature: string, accessKeyId: string): string {
    const date = this.getCurrentFormatDate().substring(0, 8);
    const credentialScope = `${date}/cn-north-1/translate/request`;
    return `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=content-type;host;x-content-sha256;x-date, Signature=${signature}`;
  }

  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang])
  );

  getSupportLanguages(): Language[] {
    return [...VolcTranslator.langMap.keys()];
  }
}

export default VolcTranslator;
