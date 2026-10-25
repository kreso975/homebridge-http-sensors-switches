import http from 'http'; 
import https from 'https';

export class HttpsAgentManager {
  private httpAgent?: http.Agent; 
  private httpsAgent?: https.Agent;

  constructor(
    private readonly trustedCert?: string,
    private readonly ignoreCertErrors?: boolean,
    private readonly url?: string,
  ) {}

  public getAgent(): http.Agent | https.Agent | undefined {
    const isHttps = this.url?.toLowerCase().startsWith('https://');

    if (isHttps) {
      if (this.httpsAgent) { 
        return this.httpsAgent; 
      }
      if (this.trustedCert) {
        const normalizedCert = this.trustedCert.replace(/\\n/g, '\n');
        this.httpsAgent = new https.Agent({ ca: normalizedCert, rejectUnauthorized: true });
      } else if (this.ignoreCertErrors) {
        this.httpsAgent = new https.Agent({ rejectUnauthorized: false });
      }
      return this.httpsAgent;
    } else {
      if (this.httpAgent) {
        return this.httpAgent;
      }
      
      this.httpAgent = new http.Agent({ 
        keepAlive: true, 
        maxSockets: 100,
        maxFreeSockets: 50, // Lowering this forces the agent to cycle through sockets more frequently
        timeout: 7500,     // The socket-level timeout
      });
      return this.httpAgent;
    }
  }
}