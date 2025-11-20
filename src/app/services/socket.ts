import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client, Stomp } from '@stomp/stompjs';

@Injectable({
  providedIn: 'root'
})
export class Socket {
  public client:Client = new Client()
  initiateSocket(username:string):Promise<any>{
    return new Promise((res,rej)=>{
      this.client = new Client({
      webSocketFactory: () => new SockJS('https://communicationapi-3.onrender.com/ws'),
      reconnectDelay: 5000,
      connectHeaders:{
        username:username
      },
      debug: (msg) => console.log(msg),
      onConnect: (frame) => {
        console.log('✅ Connected:', frame)
        res(true)
        // Subscribe to a topic (broadcast from server)
        // this.client.subscribe('/topic/greetings', (message) => {
        //   console.log('📩 Message received:', message.body);
        // });

        // this.client.subscribe('/chat/chatroom', (message) => {
        //   console.log('📩 Usninier Joined received:', message.body);
        // });
        this.client.subscribe('/user/queue/connected-users', (message) => {
          console.log('📩 connected users:', message);
        });

        // Example: send message to backend
        // setTimeout(() => {
        //           this.client.publish({ destination: '/app/hello', body: JSON.stringify({ name: 'Angular client' }) });

        // }, 5000);
                // client.publish({ destination: '/app/helloh', body: JSON.stringify({ name: 'Angular client' }) });

      },
      onWebSocketError: (err) => {
        console.error('❌ WebSocket Error:', err);
      }
    });
        this.client.activate();

    })
    

  }
  
}
