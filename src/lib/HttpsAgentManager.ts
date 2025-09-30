import https from 'https';

export class HttpsAgentManager {
  private httpsAgent?: https.Agent;

  constructor(
    private readonly trustedCert?: string,
    private readonly ignoreCertErrors?: boolean,
    private readonly url?: string,
  ) {}

  public getAgent(): https.Agent | undefined {
    if (this.httpsAgent) {
      return this.httpsAgent;
    }

    if (this.trustedCert && this.url?.toLowerCase().startsWith('https://')) {
      const normalizedCert = this.trustedCert.replace(/\\n/g, '\n');
      this.httpsAgent = new https.Agent({ ca: normalizedCert, rejectUnauthorized: true });
    } else if (this.ignoreCertErrors) {
      this.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    return this.httpsAgent;
  }
}