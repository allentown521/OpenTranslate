class MetaData {
  algorithm: string;
  service: string;
  region: string;
  date: string;

  constructor(
    algorithm: string,
    service: string,
    region: string,
    date: string
  ) {
    this.algorithm = algorithm;
    this.service = service;
    this.region = region;
    this.date = date;
  }

  getCredentialScope(): string {
    return `${this.date}/${this.region}/${this.service}/request`;
  }
}

export default MetaData;
