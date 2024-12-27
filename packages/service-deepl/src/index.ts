import {
  Language,
  Translator,
  TranslateQueryResult,
  TranslateError
} from "@opentranslate2/translator";
import qs from "qs";
import axios from "axios";

const fromLangMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "ZH"],
  ["zh-TW", "ZH"],
  ["en", "EN"],
  ["de", "DE"],
  ["fr", "FR"],
  ["it", "IT"],
  ["ja", "JA"],
  ["es", "ES"],
  ["nl", "NL"],
  ["pl", "PL"],
  ["pt", "PT"],
  ["ru", "RU"]
];

const toLangMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "ZH-HANS"],
  ["zh-TW", "ZH-HANT"],
  ["en", "EN"],
  ["de", "DE"],
  ["fr", "FR"],
  ["it", "IT"],
  ["ja", "JA"],
  ["es", "ES"],
  ["nl", "NL"],
  ["pl", "PL"],
  ["pt", "PT"],
  ["ru", "RU"]
];

export interface DeeplConfig {
  auth_key: string;
  /**
   * depending on you subscription (https://api.deepl.com/v2 for Pro, https://api-free.deepl.com/v2 for Free).
   */
  base_url?: string;
  /**
   * Sets whether the translation engine should first split the input into sentences.
   * This is enabled by default. Possible values are:
   *
   * - "0" - no splitting at all, whole input is treated as one sentence
   * - "1" (default) - splits on interpunction and on newlines
   * - "nonewlines" - splits on interpunction only, ignoring newlines
   *
   * For applications that send one sentence per text parameter,
   * it is advisable to set split_sentences=0,
   * in order to prevent the engine from splitting the sentence unintentionally.
   */
  split_sentences?: "0" | "1" | "nonewlines";
  /**
   * Sets whether the translation engine should respect the original formatting,
   * even if it would usually correct some aspects. Possible values are:
   *
   * - "0" (default)
   * - "1"
   *
   * The formatting aspects affected by this setting include:
   * - Punctuation at the beginning and end of the sentence
   * - Upper/lower case at the beginning of the sentence
   */
  preserve_formatting?: "0" | "1";
  /**
   * Sets whether the translated text should lean towards formal or informal language.
   * This feature currently works for all target languages
   * except "EN" (English), "EN-GB" (British English), "EN-US" (American English), "ES" (Spanish), "JA" (Japanese) and "ZH" (Chinese).
   * Possible options are:
   *
   * - "default" (default)
   * - "more" - for a more formal language
   * - "less" - for a more informal language
   */
  formality?: "default" | "more" | "less";
  /**
   * Sets which kind of tags should be handled. Options currently available:
   * - "xml"
   */
  tag_handling?: string[];
  /** Comma-separated list of XML tags which never split sentences. */
  non_splitting_tags?: string[];
  /** Please see the "Handling XML" section for further details. */
  outline_detection?: string;
  /** Comma-separated list of XML tags which always cause splits. */
  splitting_tags?: string[];
  /** Comma-separated list of XML tags that indicate text not to be translated. */
  ignore_tags?: string[];
}

interface DeeplResult {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>; // deepl official
  data: string; // deeplx
  result: {
    // web
    texts: Array<{
      text: string;
    }>;
  };
}

export class Deepl extends Translator<DeeplConfig> {
  /** Translator lang to custom lang */
  private static readonly fromLangMap = new Map(fromLangMap);
  private static readonly toLangMap = new Map(toLangMap);

  /** Custom lang to translator lang */
  private static readonly fromLangMapReverse = new Map(
    fromLangMap.map(([translatorLang, lang]) => [lang, translatorLang])
  );

  protected async query(
    text: string,
    from: Language,
    to: Language,
    config: DeeplConfig
  ): Promise<TranslateQueryResult> {
    const defaultBaseUrl = "https://api.deepl.com/v2";
    const finalBaseUrl = config.base_url || defaultBaseUrl;
    const isWeb = finalBaseUrl.includes("jsonrpc");
    const isOfficial = finalBaseUrl.includes("deepl.com") && !isWeb;
    let response;
    if (!isWeb) {
      response = await this.request<DeeplResult>({
        url: finalBaseUrl + "/translate",
        method: "post",
        data: {
          ...config,
          text: isOfficial ? [text] : text,
          ["source_lang"]: Deepl.fromLangMap.get(from),
          ["target_lang"]: Deepl.toLangMap.get(to)
        },
        headers: {
          Authorization: `DeepL-Auth-Key ${config.auth_key}`
        }
      }).catch(error => {
        // https://developers.deepl.com/docs/api-reference/translate/openapi-spec-for-text-translation
        if (error && error.response && error.response.status) {
          switch (error.response.status) {
            case 400:
              throw new TranslateError(
                "AUTH_ERROR",
                error.response.data?.message
              );
            case 403:
              throw new TranslateError(
                "AUTH_ERROR",
                "Authorization failed. Please supply a valid DeepL-Auth-Key via the Authorization header."
              );
            case 429:
              throw new TranslateError(
                "TOO_MANY_REQUESTS",
                "Too many requests. Please wait and resend your request."
              );
            case 456:
              throw new TranslateError(
                "USEAGE_LIMIT",
                "Quota exceeded. The character limit has been reached."
              );
            default:
              throw new TranslateError("UNKNOWN", error.response.data?.message);
          }
        } else {
          throw new TranslateError("UNKNOWN", error.response.data?.message);
        }
      });
    } else {
      // refrer pot translation app
      const rand = this.getRandomNumber();
      const body = {
        jsonrpc: "2.0",
        method: "LMT_handle_texts",
        params: {
          splitting: "newlines",
          lang: {
            ["source_lang_user_selected"]: Deepl.fromLangMap.get(from),
            ["target_lang"]: (Deepl.toLangMap.get(to) || "").slice(0, 2) // todo: not support zh-TW.
          },
          texts: [{ text, requestAlternatives: 3 }],
          timestamp: this.getTimeStamp(this.getICount(text))
        },
        id: rand
      };

      let bodyStr = JSON.stringify(body);

      // https://github.com/you-apps/TranslateYou/blob/44c69d2783304460a5b0f5bdb949d9089893abbe/app/src/main/java/com/bnyro/translate/api/deepl/DeeplEngine.kt#L124
      // The random ID determines the spacing to use, do NOT change it
      // This is how the client side of the web service works and the server-side
      // expects the same, otherwise you will get soft-banned
      if ((rand + 5) % 29 === 0 || (rand + 3) % 13 === 0) {
        bodyStr = bodyStr.replace('"method":"', '"method" : "');
      } else {
        bodyStr = bodyStr.replace('"method":"', '"method": "');
      }

      response = await this.request<DeeplResult>({
        url: finalBaseUrl,
        method: "post",
        headers: { "Content-Type": "application/json" },
        data: bodyStr
      }).catch(error => {
        // 处理错误
        if (error && error.response && error.response.status) {
          switch (error.response.status) {
            case 403:
              throw new TranslateError("AUTH_ERROR");
            case 429:
              throw new TranslateError("TOO_MANY_REQUESTS");
            default:
              throw new TranslateError("UNKNOWN");
          }
        } else {
          throw new TranslateError("UNKNOWN");
        }
      });
    }

    if (!response || !response.data) {
      throw new TranslateError("NETWORK_ERROR");
    }

    if (isOfficial) {
      const { translations } = response.data;
      return {
        text: text,
        from:
          (translations[0] &&
            Deepl.fromLangMapReverse.get(
              translations[0].detected_source_language
            )) ||
          from,
        to,
        origin: { paragraphs: text.split(/\n+/) },
        trans: { paragraphs: translations.map(t => t.text) }
      };
    } else if (isWeb) {
      const { result } = response.data;
      return {
        text: text,
        from: from,
        to: to,
        origin: { paragraphs: text.split(/\n+/) },
        trans: { paragraphs: result.texts.map(t => t.text.trim()) }
      };
    } else {
      // deeplx and not v2 api, https://deeplx.owo.network/endpoints/free.html
      const { data } = response.data;
      return {
        text: text,
        from: from,
        to: to,
        origin: { paragraphs: text.split(/\n+/) },
        trans: { paragraphs: [data] }
      };
    }
  }

  readonly name = "deepl";

  getRandomNumber(): number {
    const rand = Math.floor(Math.random() * 99999) + 100000;
    return rand * 1000;
  }

  getTimeStamp(iCount: number): number {
    const ts = Date.now();
    if (iCount !== 0) {
      iCount = iCount + 1;
      return ts - (ts % iCount) + iCount;
    } else {
      return ts;
    }
  }

  getSupportLanguages(): Language[] {
    return [...Deepl.toLangMap.keys()];
  }

  getICount(translateText: string): number {
    return translateText.split("i").length - 1;
  }
  // async detect(text: string): Promise<Language> {
  // }

  // async textToSpeech(text: string, lang: Language): Promise<string | null> {
  // }
}

export default Deepl;
