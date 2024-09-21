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
      content: this.discordMessage,
      allowed_mentions: {
        parse: ['users', 'roles'],
      },
    });
    
  }

    
  public async discordSimpleSend(): Promise<string> {
    try {
      await axios({
        url: this.discordWebhook,
        data: this.PostData,
        method: 'post',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return new Promise((resolve) => {
        setTimeout(() => resolve('Success sending Discord Message'), 1000);
      });

    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        return(String(error.message));
      }
      return new Promise((resolve) => {
        setTimeout(() => resolve('Error sending Discord message'), 1000);
      });
    }

  }
  
}