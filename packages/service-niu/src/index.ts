/* eslint-disable @typescript-eslint/camelcase */
import {
  Language,
  Translator,
  TranslateQueryResult,
  TranslateError
} from "@opentranslate2/translator";
import qs from "qs";
import axios from "axios";

type NiuTranslateResult = {
  from: string;
  to: string;
  src_text?: string;
  tgt_text: string;
  error_code?: string;
  error_msg?: string;
};

// https://niutrans.com/documents/contents/trans_text#languageList
const langMap: [Language, string][] = [
  ["auto", ""],
  ["en", "en"],
  ["zh-CN", "zh"],
  ["zh-TW", "cht"],
  ["de", "de"],
  ["ru", "ru"],
  ["pt", "pt"],
  ["es", "es"],
  ["ja", "ja"],
  ["ko", "ko"],
  ["fr", "fr"],
  ["ar", "ar"],
  ["id", "id"],
  ["vi", "vi"],
  ["it", "it"]
];

export interface NiuConfig {
  apikey: string;
}

export class Niu extends Translator<NiuConfig> {
  readonly name = "niu";

  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang])
  );

  getSupportLanguages(): Language[] {
    return [...Niu.langMap.keys()];
  }

  protected async query(
    text: string,
    from: Language,
    to: Language,
    config: NiuConfig
  ): Promise<TranslateQueryResult> {
    // https://niutrans.com/documents/contents/trans_text
    const response = await this.request<NiuTranslateResult>({
      url: "https://api.niutrans.com/NiuTransServer/translation",
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      data: {
        src_text: text,
        from: Niu.langMap.get(from),
        to: Niu.langMap.get(to),
        apikey: config.apikey
      }
    }).catch(error => {
      console.log(error);
      throw new TranslateError("UNKNOWN");
    });

    const result = response.data;
    const errorCode = result.error_code;
    // https://niutrans.com/documents/contents/trans_text#error
    if (errorCode) {
      switch (errorCode) {
        case "13001":
          // 字符流量不足或者没有访问权限
          throw new TranslateError("AUTH_ERROR", result.error_msg);
        default:
          throw new TranslateError("UNKNOWN", result.error_msg);
      }
    }

    return {
      text: text,
      from: from,
      to,
      origin: {
        paragraphs: [text]
      },
      trans: {
        paragraphs: [result.tgt_text]
      }
    };
  }
}

export default Niu;
