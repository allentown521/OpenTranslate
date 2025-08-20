import {
  Language,
  Translator,
  TranslateError,
  TranslateQueryResult
} from "@opentranslate2/translator";
import md5 from "md5";
import qs from "qs";

const langMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "zh"],
  ["zh-TW", "zh"],
  ["en", "en"],
  ["ar", "ar"],
  ["de", "de"],
  ["ru", "ru"],
  ["fr", "fr"],
  ["fi", "fil"],
  ["ko", "ko"],
  ["ms", "ms"],
  ["pt", "pt"],
  ["ja", "ja"],
  ["th", "th"],
  ["tr", "tr"],
  ["es", "es"],
  ["it", "it"],
  ["hi", "hi"],
  ["id", "id"],
  ["vi", "vi"]
];

export interface TencentSmartConfig {
  useLangDirect?: boolean;
}

type TencentSmartTranslateResult = {
  auto_translation: Array<string>;
  src_lang: Language;
  tgt_lang: Language;
};

export class TencentSmart extends Translator<TencentSmartConfig> {
  readonly name = "tencent-smart";

  readonly endpoint = "https://transmart.qq.com/api/imt";

  protected async query(
    text: string,
    from: Language,
    to: Language,
    config: TencentSmartConfig
  ): Promise<TranslateQueryResult> {
    type TencentSmartTranslateError = {
      error_code: "54001" | string;
      error_msg: "Invalid Sign" | string;
    };

    const salt = Date.now();
    const { endpoint } = this;

    const res = await this.request<TencentSmartTranslateResult>({
      url: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        referer: "https://transmart.qq.com/zh-CN/index"
      },
      data: qs.stringify({
        header: {
          fn: "auto_translation",
          client_key:
            "browser-chrome-110.0.0-Mac OS-df4bd4c5-a65d-44b2-a40f-42f34f3535f2-1677486696487"
        },
        type: "plain",
        model_category: "normal",
        source: {
          text_list: [text],
          lang: TencentSmart.langMap.get(from) || "auto"
        },
        target: {
          lang: TencentSmart.langMap.get(to) || "auto"
        }
      })
    }).catch(e => {
      console.error(new Error(`[TencentSmart service]${e}`));
      throw e;
    });

    const { data } = res;

    const {
      auto_translation: transResult,
      src_lang: langDetected
    } = data as TencentSmartTranslateResult;
    const detectedFrom = TencentSmart.langMapReverse.get(
      langDetected
    ) as Language;

    return {
      text,
      from: detectedFrom,
      to,
      origin: {
        paragraphs: text.split(/\n+/),
      },
      trans: {
        paragraphs: transResult,
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
    return [...TencentSmart.langMap.keys()];
  }


}

export default TencentSmart;
