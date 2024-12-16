import ApiInfo from "../ApiInfo";
import SignerV4 from "../auth/SignerV4";
import ServiceInfo from "../ServiceInfo";

interface APIResponse {
  url: string;
  params: any;
  config: {
    headers: Record<string, string>;
  };
}

function API(serviceInfo: ServiceInfo, apiInfo: ApiInfo): APIResponse {
  function getUrl(): string {
    const url =
      serviceInfo.scheme +
      "://" +
      serviceInfo.host +
      apiInfo.path +
      "?" +
      apiInfo.query;
    return url;
  }

  function getConfig(): { headers: Record<string, string> } {
    const config = { headers: SignerV4.sign(serviceInfo, apiInfo) };
    return JSON.parse(JSON.stringify(config));
  }

  function getParams(): any {
    return JSON.parse(apiInfo.body.toString());
  }

  return { url: getUrl(), params: getParams(), config: getConfig() };
}

export default API;
