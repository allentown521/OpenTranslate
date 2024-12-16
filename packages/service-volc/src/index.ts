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
      { ...urlParams, ...formParams }, // 合并所有参数用于签名
      accessKeySecret
    );

    const res = await this.request<VolcTranslateResult>({
      method: "POST",
      url: this.endpoint,
      params: {
        ...urlParams,
        Signature: signature
      },
      headers: {
        "Content-Type": "application/json"
      },
      data: formParams
    }).catch(e => {
      console.error(new Error("[Volc service]" + e));
      throw e;
    });

    const code = res.data.ResponseMetadata.Error?.CodeN;
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
