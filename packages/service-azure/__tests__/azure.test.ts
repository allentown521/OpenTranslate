import { Azure } from "../src";

describe("Azure", () => {
  const azure = new Azure({
    config: {
      //please refer to https://fanyi.caiyunapp.com/#/api
      subscriptionKey: process.env.AZURE_SUBSCRIPTION_KEY as string,
      region: process.env.AZURE_REGION as string,
      free: true
    }
  });

  it("should translate successfully", async () => {
    const result = await azure
      .translate("I love you", "auto", "zh-CN")
      .catch(e => console.log(e));
    expect(result).toEqual({
      engine: "azure",
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
        paragraphs: [expect.stringContaining("月色很美")],
        tts: expect.any(String)
      }
    });
  }, 5000);

  it("should translate English successfully", async () => {
    const result = await azure
      .translate("I love you", "en", "zh-CN")
      .catch(e => console.log(e));
    expect(result).toEqual({
      engine: "azure",
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
        paragraphs: [expect.stringContaining("月色很美")],
        tts: expect.any(String)
      }
    });
  }, 5000);
});
