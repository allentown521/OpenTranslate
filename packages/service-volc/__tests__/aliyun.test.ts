import { Aliyun } from "../src";

describe("Dict Baidu", () => {
  //Please refer to https://help.aliyun.com/zh/machine-translation/developer-reference/api-reference-machine-translation-universal-version-call-guide?spm=5176.15007269.console-base_help.dexternal.1afe5d78DUvEPh
  const aliyun = new Aliyun({
    config: {
      accessKeyId: process.env.APP_ID as string,
      key: process.env.KEY as string
    }
  });

  it("should translate en2zh successfully", async () => {
    const En2Zh = await aliyun.translate("I love you", "auto", "zh-CN");

    expect(En2Zh).toEqual({
      engine: "baidu",
      text: "I love you",
      from: "en",
      to: "zh-CN",
      /** 原文 */
      origin: {
        paragraphs: ["I love you"],
        tts: expect.any(String)
      },
      /** 译文 */
      trans: {
        paragraphs: [expect.stringContaining("爱")],
        tts: expect.any(String)
      }
    });
  }, 9000);

  it("should translate zh2en successfully", async () => {
    const zh2En = await aliyun.translate("我爱你", "auto", "en");

    expect(zh2En).toEqual({
      engine: "baidu",
      text: "我爱你",
      from: "zh-CN",
      to: "en",
      /** 原文 */
      origin: {
        paragraphs: ["我爱你"],
        tts: expect.any(String)
      },
      /** 译文 */
      trans: {
        paragraphs: [expect.stringContaining("I love you")],
        tts: expect.any(String)
      }
    });
  }, 9000);

  it("should get supported languages", () => {
    const result = aliyun.getSupportLanguages();

    expect(result).toContain("auto");
    expect(result).toContain("zh-CN");
    expect(result).toContain("en");
  }, 5000);
});
