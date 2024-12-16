interface DataMapInterface {
  [key: string]: any;
  set(key: string, value: any): void;
  get(key: string): any;
  delete(key: string): boolean;
}

export class DataMap implements DataMapInterface {
  [key: string]: any;

  constructor(data: Record<string, any> = {}) {
    Object.keys(data).forEach(key => {
      this[key] = data[key];
    });
  }

  set(key: string, value: any): void {
    this[key] = value;
  }

  get(key: string): any {
    return this[key];
  }

  delete(key: string): boolean {
    return delete this[key];
  }
}

export class Query extends DataMap {
  toString(): string {
    const queryList: string[] = [];
    const keys = Object.keys(this).sort();
    keys.forEach(key => {
      queryList.push(`${key}=${this[key]}`);
    });
    return queryList.join("&");
  }
}

export class Body extends DataMap {
  toString(): string {
    return JSON.stringify(this);
  }
}

export class Header extends DataMap {
  toString(): string {
    let str = "";
    const keys = Object.keys(this).sort();
    keys.forEach(key => {
      str += `${key.toLowerCase()}:${this[key]}\n`;
    });
    return str;
  }

  getSignedHeaders(): string {
    const keys = Object.keys(this).sort();
    const headerList = keys.map(v => v.toLowerCase());
    return headerList.join(";");
  }
}
