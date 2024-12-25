import {
  Language,
  Translator,
  TranslateError,
  TranslateQueryResult
} from "@opentranslate2/translator";
import ApiInfo from "./ApiInfo";
import API from "./base/API";
import Credentials from "./Credentials";
import ServiceInfo from "./ServiceInfo";
import { Header, Query, Body } from "./base/Request";

// https://www.volcengine.com/docs/4640/35107
const langMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "zh"],
  ["zh-TW", "zh-Hant"],
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

export interface VolcConfig {
  accessKeyId: string;
  accessKeySecret: string;
}

export class VolcTranslator extends Translator<VolcConfig> {
  readonly name = "volc";

  readonly endpoint = "open.volcengineapi.com";

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

    // 翻译目标语言、翻译文本列表
    const toLang = VolcTranslator.langMap.get(to);
    const textList = [text];

    // api凭证
    const credentials = new Credentials(
      accessKeyId,
      accessKeySecret,
      "translate",
      "cn-north-1"
    );

    // 设置请求的 header、query、body
    const header = new Header({
      "Content-Type": "application/json"
    });
    const query = new Query({
      Action: "TranslateText",
      Version: "2020-06-01"
    });
    const body = new Body({
      TargetLanguage: toLang,
      TextList: textList
    });

    const apiInfo = new ApiInfo({
      method: "POST",
      path: "/",
      query,
      body
    });
    // 设置 service、api信息
    const serviceInfo = new ServiceInfo({
      host: this.endpoint,
      header,
      credentials
    });
    // 生成 API
    const api = API(serviceInfo, apiInfo);

    // https://www.volcengine.com/docs/4640/65067
    const res = await this.request<VolcTranslateResult>({
      method: "POST",
      url: api.url,
      data: api.params,
      headers: api.config.headers
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
