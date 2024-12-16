import { Header } from "./base/Request";

interface InterfaceServiceInfoParams {
  host: string;
  header?: Header;
  credentials?: any;
  connectionTimeout?: number;
  socketTimeout?: number;
  scheme?: string;
}

class ServiceInfo {
  host: string;
  header: Header;
  credentials: any;
  connectionTimeout: number | undefined;
  socketTimeout: number | undefined;
  scheme: string;

  constructor({
    host,
    header = new Header(),
    credentials,
    connectionTimeout,
    socketTimeout,
    scheme = "https"
  }: InterfaceServiceInfoParams) {
    this.host = host;
    this.header = header;
    this.credentials = credentials;
    this.connectionTimeout = connectionTimeout;
    this.socketTimeout = socketTimeout;
    this.scheme = scheme;
  }
}

export default ServiceInfo;
