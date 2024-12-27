import {
  Language,
  Translator,
  TranslateError,
  TranslateQueryResult
} from "@opentranslate2/translator";
import HmacSHA1 from "crypto-js/hmac-sha1";
import Base64 from "crypto-js/enc-base64";

// https://help.aliyun.com/zh/machine-translation/support/supported-languages-and-codes?spm=a2c4g.11186623.0.0.6a097467jYw553
const langMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "zh"],
  ["zh-TW", "zh-tw"],
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
  ["vi", "vie"]
];

export interface AliyunConfig {
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string; // optional, https://help.aliyun.com/zh/machine-translation/developer-reference/api-alimt-2018-10-12-endpoint
}

export class Aliyun extends Translator<AliyunConfig> {
  readonly name = "aliyun";

  readonly endpoint = "https://mt.cn-hangzhou.aliyuncs.com"; // mt.aliyuncs.com seems broken

  private calculateSignature(
    method: string,
    params: Record<string, string>,
    secret: string
  ): string {
    // 1. 参数排序
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => ({
          ...acc,
          [key]: params[key]
        }),
        {} as Record<string, string>
      );

    // 2. 构造规范化请求字符串
    const canonicalizedQueryString = Object.entries(sortedParams)
      .map(
        ([key, value]) =>
          `${this.percentEncode(key)}=${this.percentEncode(value)}`
      )
      .join("&");

    // 3. 构造待签名字符串
    const stringToSign = [
      method,
      this.percentEncode("/"),
      this.percentEncode(canonicalizedQueryString)
    ].join("&");

    // 4. 计算签名
    const hmac = HmacSHA1(stringToSign, `${secret}&`);
    return Base64.stringify(hmac);
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
    config: AliyunConfig
  ): Promise<TranslateQueryResult> {
    type AliyunTranslateError = {
      Code: "200" | string;
      Message: "Invalid Sign" | string;
    };

    type AliyunTranslateResult = {
      RequestId: string;
      Code: string;
      Message?: string;
      Data: {
        WordCount: string;
        Translated: string;
      };
    };

    const { accessKeyId, accessKeySecret } = config;

    // URL参数
    const urlParams = {
      Action: "TranslateGeneral",
      Version: "2018-10-12",
      Format: "JSON",
      AccessKeyId: accessKeyId,
      SignatureNonce: Date.now().toString(),
      Timestamp: new Date().toISOString(),
      SignatureMethod: "HMAC-SHA1",
      SignatureVersion: "1.0"
    };

    // 表单参数
    const formParams = {
      FormatType: "text",
      Scene: "general",
      SourceLanguage: Aliyun.langMap.get(from) || "",
      TargetLanguage: Aliyun.langMap.get(to) || "",
      SourceText: text
    };

    // 计算签名
    const signature = this.calculateSignature(
      "POST",
      { ...urlParams, ...formParams }, // 合并所有参数用于签名
      accessKeySecret
    );

    const res = await this.request<AliyunTranslateResult>({
      method: "POST",
      url: config.endpoint || this.endpoint,
      params: {
        ...urlParams,
        Signature: signature
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: new URLSearchParams(formParams).toString()
    }).catch(error => {
      console.error(new Error("[Aliyun service]" + error));
      if (error && error.response && error.response.status) {
        switch (error.response.status) {
          case 400: // AccessKeyId is mandatory for this action.
          case 404: // Specified access key is not found.
            throw new TranslateError(
              "AUTH_ERROR",
              (error.response.data as AliyunTranslateError)?.Message
            );
          case 113: // never happen now , need to check
            throw new TranslateError(
              "USEAGE_LIMIT",
              (error.response.data as AliyunTranslateError)?.Message
            );
          default:
            throw new TranslateError(
              "UNKNOWN",
              (error.response.data as AliyunTranslateError)?.Message
            );
        }
      }
    });

    if (!res || !res.data) {
      throw new TranslateError("NETWORK_ERROR");
    }

    return {
      text,
      from: from,
      to,
      origin: {
        paragraphs: text.split(/\n+/)
      },
      trans: {
        paragraphs: [res.data.Data.Translated]
      }
    };
  }

  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang])
  );

  getSupportLanguages(): Language[] {
    return [...Aliyun.langMap.keys()];
  }
}

export default Aliyun;
