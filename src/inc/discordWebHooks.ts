// discordWebHooks.ts

import axios, { AxiosError } from 'axios';

export class discordWebHooks {
  public PostData: string;

  constructor(
    public discordWebhook: string,
    public discordUsername: string,
    public discordAvatar: string,
    public discordMessage: string,
    
  ) {
    
    this.PostData = JSON.stringify({ 
      username: this.discordUsername, 
      avatar_url: this.discordAvatar, 
      content: this.discordMessage });
    
  }
  
  
  public async discordSimpleSend() {
    try {
      const response = await axios({
        url: this.discordWebhook,
        data: this.PostData,
        method: 'post',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = response.data;
      return(String(data));
    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        return(String(error.message));
      }
      
    }
  }

  
}

