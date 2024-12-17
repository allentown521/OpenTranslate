import { Niu } from "../src";

describe("Dict Niu", () => {
  const niu = new Niu({
    // please refer to https://fanyi.niuapp.com/#/api
    token: process.env.NIU_TOKEN as string
  });

  it("should translate single word", async () => {
    const result = await niu
      .translate("I love you", "auto", "zh-CN")
      .catch(e => null);
    expect(result).toEqual({
      engine: "niu",
      text: "I love you",
      from: "en",
      to: "zh-CN",
      /** Translation result */
      result: expect.any(String)
    });
  });

  it("should translate paragraph", async () => {
    const result = await niu
      .translate(
        "Choosing a JavaScript testing framework is not easy.",
        "auto",
        "zh-CN"
      )
      .catch(e => null);
    expect(result).toEqual({
      engine: "niu",
      text: "Choosing a JavaScript testing framework is not easy.",
      from: "en",
      to: "zh-CN",
      /** Translation result */
      result: expect.any(String)
    });
  });
});
