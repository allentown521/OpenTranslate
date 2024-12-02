/* eslint-disable @typescript-eslint/camelcase */
import {
  Language,
  Translator,
  TranslateQueryResult,
  TranslateError
} from "@opentranslate2/translator";
import qs from "qs";
import axios from "axios";

type CaiyunTranslateResult = {
  confidence: number;
  target: string[];
  rc: number;
};

const langMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "zh"],
  ["en", "en"],
  ["ja", "ja"]
];

export interface CaiyunConfig {
  token: string;
}

export class Caiyun extends Translator<CaiyunConfig> {
  readonly name = "caiyun";

  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang])
  );

  getSupportLanguages(): Language[] {
    return [...Caiyun.langMap.keys()];
  }

  async textToSpeech(text: string, lang: Language): Promise<string> {
    return `https://fanyi.baidu.com/gettts?${qs.stringify({
      lan: Caiyun.langMap.get(lang !== "auto" ? lang : "zh-CN") || "zh",
      text,
      spd: 5
    })}`;
  }

  protected async query(
    text: string,
    from: Language,
    to: Language,
    config: CaiyunConfig
  ): Promise<TranslateQueryResult> {
    const detect = from === "auto";
    const source = text.split(/\n+/);
    const response = await this.request<CaiyunTranslateResult>(
      "https://api.interpreter.caiyunai.com/v1/translator",
      {
        headers: {
          "content-type": "application/json",
          "x-authorization": "token " + config.token
        },
        method: "POST",
        data: JSON.stringify({
          source,
          trans_type: `${Caiyun.langMap.get(from)}2${Caiyun.langMap.get(to)}`,
          detect
        })
      }
    ).catch(error => {
      // https://api.interpreter.caiyunai.com/v1/translator
      if (error && error.response && error.response.status) {
        switch (error.response.status) {
          case 401:
            throw new TranslateError("AUTH_ERROR");
          case 500: // never happen now , need to check
            throw new TranslateError("USEAGE_LIMIT");
          default:
            throw new TranslateError("UNKNOWN");
        }
      } else {
        throw new TranslateError("UNKNOWN");
      }
    });

    const result = response.data;
    return {
      text: text,
      from: detect ? await this.detect(text) : from,
      to,
      origin: {
        paragraphs: source,
        tts: await this.textToSpeech(text, from)
      },
      trans: {
        paragraphs: result.target,
        tts: await this.textToSpeech(result.target.join(" "), to)
      }
    };
  }
}

export default Caiyun;
