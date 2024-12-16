/**
 * ApiInfo class represents the information needed for an API request
 */
export interface ApiInfoParams {
  method: string;
  path: string;
  query?: Record<string, any>;
  body?: any;
  header?: Record<string, string>;
}

class ApiInfo {
  method: string;
  path: string;
  query: Record<string, any>;
  body: any;
  header: Record<string, string>;

  constructor({
    method,
    path,
    query = {},
    body = null,
    header = {}
  }: ApiInfoParams) {
    this.method = method;
    this.path = path;
    this.query = query;
    this.body = body;
    this.header = header;
  }

  toString(): string {
    return `method: ${this.method}, path: ${this.path}`;
  }
}

export default ApiInfo;
