/**
 * Credentials class for storing authentication information
 */
export class Credentials {
  constructor(
    public readonly ak: string,
    public readonly sk: string,
    public readonly service: string,
    public readonly region: string
  ) {}
}

export default Credentials;
