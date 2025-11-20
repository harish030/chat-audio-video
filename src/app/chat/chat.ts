import { Component, inject } from '@angular/core';
import { Socket } from '../services/socket';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
interface UserList {
  username: string,
  socketId: string,
  userStatus: string
}
interface OwnObject {
  [key: string]: any;
}
@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss'
})
export class Chat {
  clientService = inject(Socket)
  userList: Array<UserList> = []
  currentReceiverUser!: UserList
  ownUser!: UserList
  messageContent: any;
  hash: Map<string, any> = new Map<string, any>()

  check:Array<string> = new Array(5)

  constructor(private httpClient: HttpClient) {
  }

  async ngOnInit() {
    // if (sessionStorage.getItem("username")) {
    //   await this.clientService.initiateSocket(sessionStorage.getItem("username") || "")
    // }
    // console.log(this.clientService.client.connected);

    if (this.clientService.client.connected) {
      //  this.clientService.client.publish({ destination: '/app/chatroom-list'});

      this.clientService.client.subscribe('/chat/chatroom', (message) => {
        console.log('📩 Message received:', message);
        const userData = JSON.parse(message.body)
        if (userData.userStatus == "JOIN") {
          if (this.userList.length == 0) {
             this.currentReceiverUser = {
          username: userData?.username,
          socketId: userData?.socketId,
          userStatus: userData?.userStatus
        }
          }
          this.userList.push(JSON.parse(message.body))
          
          this.clientService.client.subscribe(`/user/${JSON.parse(message.body).socketId}_${this.ownUser.socketId}/queue/messages`, (msg) => {
            console.log("Private:", JSON.parse(msg.body));
            const messageDetail = JSON.parse(msg.body)
            const messageDetails = {
              message: messageDetail.message,
              sender: messageDetail.sender,
              receiver: messageDetail.receiver,
              time: new Date().toISOString()
            }
            console.log(messageDetails);

           if (this.hash.has(`${messageDetail.sender}_${messageDetail.receiver}`)) {
                    const hashValue = this.hash.get(`${messageDetail.sender}_${messageDetail.receiver}`)
                    const out = [...hashValue, messageDetails]
                    this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, out)
                    console.log(this.hash);

                  }
                  else {
                    const result = [messageDetails]
                    this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, result)
                    console.log(this.hash);

                  }
          });
        }
        else if (userData.userStatus == "LEAVE") {
          this.userList = this.userList.filter((data) => {
            return data.socketId != userData.socketId
          })
          if (this.currentReceiverUser.socketId == userData.socketId) {
            if (this.userList.length != 0) {
               this.currentReceiverUser = {
          username: this.userList?.[0]?.username,
          socketId: this.userList?.[0]?.socketId,
          userStatus: this.userList?.[0]?.userStatus
        }
            }
          }
        }

      });
      setTimeout(() => {
        this.clientService.client.subscribe('/chat/chatrooms', (message) => {
        console.log('📩 connected user:', message);
        const users = JSON.parse(message.body)
        Object.keys(users).forEach((key, index) => {
          const value = users[key];
          const modifiedObj = {
            username: key,
            socketId: value,
            userStatus: "JOIN"
          }
          this.userList.push(modifiedObj)
          console.log("check");

        });
        console.log("userlist", this.userList);

        this.currentReceiverUser = {
          username: this.userList?.[0]?.username,
          socketId: this.userList?.[0]?.socketId,
          userStatus: this.userList?.[0]?.userStatus
        }

      });
      }, 2000);
      

        this.httpClient.get("https://communicationapi-3.onrender.com/getuserlist").subscribe({
          next: (value) => {
            console.log(value);
            const users: OwnObject = value;
            Object.keys(users).forEach(key => {
              const value = users[key];
              const modifiedObj: UserList = {
                username: value,
                socketId: key,
                userStatus: "JOIN",
              }
              if (value == sessionStorage.getItem("username")) {
                this.ownUser = modifiedObj
                
              }
            })
            Object.keys(users).forEach(key => {
              const value = users[key];
              const modifiedObj: UserList = {
                username: value,
                socketId: key,
                userStatus: "JOIN",
              }
              if (value == sessionStorage.getItem("username")) {
                
              }
              else {

                this.clientService.client.subscribe(`/user/${modifiedObj.socketId}_${this.ownUser.socketId}/queue/messages`, (msg) => {
                  console.log("Private:", JSON.parse(msg.body));
                  const messageDetail = JSON.parse(msg.body)
                  const messageDetails = {
                    message: messageDetail.message,
                    sender: messageDetail.sender,
                    receiver: messageDetail.receiver,
                    time: new Date().toISOString()
                  }
                  console.log(messageDetails);

                  if (this.hash.has(`${messageDetail.sender}_${messageDetail.receiver}`)) {
                    const hashValue = this.hash.get(`${messageDetail.sender}_${messageDetail.receiver}`)
                    const out = [...hashValue, messageDetails]
                    this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, out)
                    console.log(this.hash);

                  }
                  else {
                    const result = [messageDetails]
                    this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, result)
                    console.log(this.hash);

                  }
                });
                this.userList.push(modifiedObj)
              }
              this.currentReceiverUser = {
                username: this.userList?.[0]?.username,
                socketId: this.userList?.[0]?.socketId,
                userStatus: this.userList?.[0]?.userStatus
              }

            });
          },
        })
    }
  }

  submitChat() {

    const messageDetails = {
      message: this.messageContent,
      sender: this.ownUser.socketId,
      receiver: this.currentReceiverUser.socketId,
      time: new Date().toISOString()
    }
    if (this.hash.has(`${messageDetails.receiver}_${this.ownUser.socketId}`)) {
                    const hashValue = this.hash.get(`${messageDetails.receiver}_${this.ownUser.socketId}`)
                    const out = [...hashValue, messageDetails]
                    this.hash.set(`${messageDetails.receiver}_${this.ownUser.socketId}`, out)
                    console.log(this.hash);

                  }
                  else {
                    const result = [messageDetails]
                    this.hash.set(`${messageDetails.receiver}_${this.ownUser.socketId}`, result)
                    console.log(this.hash);

                  }
    console.log({ sender: this.ownUser.socketId, receiver: this.currentReceiverUser.socketId, message: this.messageContent });

    this.clientService.client.publish({
      destination: "/app/private-message",
      body: JSON.stringify({ sender: this.ownUser.socketId, receiver: this.currentReceiverUser.socketId, message: this.messageContent })
    });

  }


  changeReciverUser(receiverUser:UserList){
    console.log(receiverUser);
    
    this.currentReceiverUser = {
                username: receiverUser?.username,
                socketId: receiverUser?.socketId,
                userStatus: receiverUser?.userStatus
              }
              console.log(`${this.currentReceiverUser?.socketId}_${this.ownUser?.socketId}`);
              
    console.log(this.hash.get(`${this.currentReceiverUser?.socketId}_${this.ownUser?.socketId}`));
    
  }
}
