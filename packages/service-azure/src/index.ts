/* eslint-disable @typescript-eslint/camelcase */
import {
  Language,
  Translator,
  TranslateQueryResult,
  TranslateError
} from "@opentranslate2/translator";
import { Base64 } from 'js-base64';

type AzureTranslateResult = [
  {
    translations: {
      text: string;
      to: string;
    }[];
    detectedLanguage: {
      language: string;
      score: number;
    };
  }
];

const langMap: [Language, string][] = [
  ["auto", ""],
  ["zh-CN", "zh-Hans"],
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
  ["bg", "bg"],
  ["et", "et"],
  ["da", "da"],
  ["fi", "fi"],
  ["cs", "cs"],
  ["ro", "ro"],
  ["sl", "sl"],
  ["sv", "sv"],
  ["hu", "hu"],
  ["vi", "vi"]
];

export interface AzureConfig {
  subscriptionKey?: string;
  region?: string;
  free: boolean; // free or paid
}

export class Azure extends Translator<AzureConfig> {
  readonly name = "azure";
  token = "";
  expiration = 0;

  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang])
  );

  getSupportLanguages(): Language[] {
    return [...Azure.langMap.keys()];
  }

  parseMSToken(token: string): number {
    try {
      const expStr = token.split(".")[1];
      return JSON.parse(Base64.decode(expStr)).exp;
    } catch (err) {
      console.error("Error parsing token", err);
    }
    return 0;
  }

  protected async query(
    text: string,
    from: Language,
    to: Language,
    config: AzureConfig
  ): Promise<TranslateQueryResult> {
    const source = text.split(/\n+/);
    if (config.free) {
      // 通过抓包Microsoft Edge浏览器提供的翻译服务拿到
      const token_url = "https://edge.microsoft.com/translate/auth";

      // 查询内存缓存
      const now = Date.now();
      if (!this.token || !(this.expiration * 1000 > now + 1000)) {
        const tokenJson = await this.request({
          url: token_url,
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42"
          },
          responseType: "text"
        });
        this.token = tokenJson.data as string;
        this.expiration = this.parseMSToken(this.token);
      }
    }

    // referer: pot translation app
    // seems only authorization is needed
    const freeHeaders = {
      accept: "*/*",
      "accept-language":
        "zh-TW,zh;q=0.9,ja;q=0.8,zh-CN;q=0.7,en-US;q=0.6,en;q=0.5",
      authorization: `Bearer ${this.token}`,
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua":
        '"Microsoft Edge";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      Referer: "https://appsumo.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42"
    };
    const paidHeaders = {
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      ...(config.region && { "Ocp-Apim-Subscription-Region": config.region })
    };
    const response = await this.request<AzureTranslateResult>({
      url: "https://api.cognitive.microsofttranslator.com/translate",
      headers: {
        "content-type": "application/json",
        ...(config.free ? freeHeaders : paidHeaders),
        includeSentenceLength: "true"
      },
      method: "POST",
      params: {
        "api-version": "3.0",
        to: Azure.langMap.get(to)
      },
      data: source.map(text => ({
        Text: text
      }))
    }).catch(error => {
      // https://api.interpreter.caiyunai.com/v1/translator
      if (error && error.response && error.response.status) {
        switch (error.response.status) {
          case 401:
          case 403:
            throw new TranslateError(
              "AUTH_ERROR",
              error.response.data?.error?.message
            );
          case 429:
            throw new TranslateError(
              "TOO_MANY_REQUESTS",
              error.response.data?.error?.message
            );
          case 500: // never happen now , need to check
            throw new TranslateError(
              "USEAGE_LIMIT",
              error.response.data?.error?.message
            );
          default:
            throw new TranslateError(
              "UNKNOWN",
              error.response.data?.error?.message
            );
        }
      } else {
        throw new TranslateError("UNKNOWN");
      }
    });

    const result = response.data;
    return {
      text: text,
      from: from,
      to,
      origin: {
        paragraphs: source
      },
      trans: {
        paragraphs: result.map(translation => translation.translations[0].text)
      }
    };
  }
}

export default Azure;
