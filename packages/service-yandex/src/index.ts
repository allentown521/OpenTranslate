import {
  Language,
  Translator,
  TranslateError,
  TranslateQueryResult
} from "@opentranslate2/translator";
import qs from "qs";

function truncate(q: string): string {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

const langMap: [Language, string][] = [
  ["auto", ""],
  ["en", "en"],
  ["zh-CN", "zh"],
  ["zh-TW", "zh"],
  ["ru", "ru"],
  ["pt", "pt"],
  ["es", "es"],
  ["de", "de"],
  ["ja", "ja"],
  ["ko", "ko"],
  ["fr", "fr"],
  ["ar", "ar"],
  ["id", "id"],
  ["vi", "vi"],
  ["it", "it"]
];

interface YandexTranslateResult {
  text: string[];
  lang: string;
}

export class Yandex extends Translator {
  readonly name = "yandex";

  /** Translator lang to custom lang */
  private static readonly langMap = new Map<Language, string>(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map<string, Language>(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang])
  );

  protected async query(
    text: string,
    from: Language,
    to: Language,
    config: Record<string, any>
  ): Promise<TranslateQueryResult> {
    const res = await this.request<YandexTranslateResult>({
      url: "https://translate.yandex.net/api/v1/tr.json/translate",
      method: "post",
      data: qs.stringify({
        sourceLang: from,
        targetLang: to,
        text,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...config.headers
        }
      })
    }).catch(error => {
      console.log("Yandex translate error", error);
      if (error?.response?.status) {
        switch (error.response.status) {
          case 403: // user-agent is needed else it will return 403
            throw new TranslateError(
              "AUTH_ERROR",
              error.response.data?.message
            );
          default:
            throw new TranslateError(
              "UNKNOWN",
              error.response.data?.message
            );
        }
      }
      throw error;
    });

    if (!res || !res.data) {
      throw new TranslateError("UNKNOWN");
    }

    const result = res.data;
    const tts = await this.textToSpeech(text, from);

    return {
      text,
      from: result.lang.split("-")[0] as Language,
      to,
      origin: {
        paragraphs: text.split(/\n+/),
        tts: tts || undefined
      },
      trans: {
        paragraphs: result.text
      }
    };
  }

  getSupportLanguages(): Language[] {
    return [...Yandex.langMap.keys()];
  }

  async detect(text: string, config?: Record<string, any>): Promise<Language> {
    try {
      return (await this.translate(text, "auto", "zh", config)).from;
    } catch (e) {
      return "en";
    }
  }
}

export default Yandex;
