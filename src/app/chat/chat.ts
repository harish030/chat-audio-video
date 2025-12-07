import { Component, inject } from '@angular/core';
import { Socket } from '../services/socket';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

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

  check: Array<string> = new Array(5)

  isSideBarOpen = false

  client!: IAgoraRTCClient;
  // Local audio track
  localAudioTrack!: IMicrophoneAudioTrack;
  // Connection parameters
  appId = "48b5127bfa5e4dd582f08a1adcfd77f6";
  channel = "c5e9589a20ca4fdd84579509518ca491";
  token = "<-- Insert token -->";
  uid = 0; // User ID

  audioActive = false

  currentAudioDetails:any = {
    active:false
  }

  constructor(private httpClient: HttpClient) {
  }

  async ngOnInit() {
    if (sessionStorage.getItem("username")) {
      await this.clientService.initiateSocket(sessionStorage.getItem("username") || "")
    }
    console.log(this.clientService.client.connected);
    this.initializeClient()
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
            if (messageDetail.communicationType == "CHAT") {
              const messageDetails = {
                message: messageDetail.message,
                sender: messageDetail.sender,
                receiver: messageDetail.receiver,
                time: new Date().toISOString(),
                communicationType: messageDetail.communicationType
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
            }
            else if (messageDetail.communicationType == "AUDIO") {
              if (messageDetail.communicationRequestType == "LEAVE") {
                    this.currentAudioDetails={
                      active:false
                    }
                    if(this.client){
                      this.leaveAgoraChannel()
                    }
                    return
              }
              const messageDetails = {
                message: messageDetail.token,
                sender: messageDetail.sender,
                receiver: messageDetail.receiver,
                token: messageDetail.token,
                time: new Date().toISOString(),
                communicationType: messageDetail.communicationType,
                communicationRequestType: messageDetail.communicationRequestType,
                senderName: messageDetail.senderName,
                receiverName: messageDetail.receiverName
              }
              console.log(messageDetails);
              this.currentAudioDetails = {
                  ...this.currentAudioDetails,
                  ...messageDetails,
                  active:true
                }
                 console.log(messageDetails);
                console.log(this.currentAudioDetails);
              if (messageDetail.communicationRequestType == "JOIN") {
                
                this.joinChannel(`${messageDetails.sender}_${messageDetail.receiver}`,messageDetails.sender,messageDetails.token)
              }
              // if (this.hash.has(`${messageDetail.sender}_${messageDetail.receiver}`)) {
              //   const hashValue = this.hash.get(`${messageDetail.sender}_${messageDetail.receiver}`)
              //   const out = [...hashValue, messageDetails]
              //   this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, out)
              //   console.log(this.hash);
              // }
              // else {
              //   const result = [messageDetails]
              //   this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, result)
              //   console.log(this.hash);

              // }
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
            else {
              this.currentReceiverUser = {
                username: "",
                socketId: "",
                userStatus: this.userList?.[0]?.userStatus
              }
            }
          }
          this.hash.delete(`${userData?.socketId}_${this.ownUser.socketId}`)
          if (this.currentAudioDetails.active == true) {
            if ((userData.socketId == this.currentAudioDetails.sender) || (userData.socketId == this.currentAudioDetails.receiver)) {
              this.currentAudioDetails={
                      active:false
                    }
                    if(this.client){
                      this.leaveAgoraChannel()
                    }
                    return
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

                if (messageDetail.communicationType == "CHAT") {
                  const messageDetails = {
                    message: messageDetail.message,
                    sender: messageDetail.sender,
                    receiver: messageDetail.receiver,
                    time: new Date().toISOString(),
                    communicationType: messageDetail.communicationType

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
                }
                else if (messageDetail.communicationType == "AUDIO") {
                  if (messageDetail.communicationRequestType == "LEAVE") {
                    this.currentAudioDetails={
                      active:false
                    }
                    if(this.client){
                      this.leaveAgoraChannel()
                    }
                    return
                  }
                  const messageDetails = {
                    message: messageDetail.token,
                    sender: messageDetail.sender,
                    receiver: messageDetail.receiver,
                    token: messageDetail.token,
                    time: new Date().toISOString(),
                    communicationType: messageDetail.communicationType,
                    communicationRequestType: messageDetail.communicationRequestType,
                    senderName: messageDetail.senderName,
                    receiverName: messageDetail.receiverName

                  }
                   this.currentAudioDetails = {
                  ...this.currentAudioDetails,
                  ...messageDetails,
                  active:true
                }
                console.log(messageDetails);
                console.log(this.currentAudioDetails);
                
                
                  if (messageDetail.communicationRequestType == "JOIN") {
                    this.joinChannel(`${messageDetails.sender}_${messageDetail.receiver}`,messageDetails.sender,messageDetails.token)
                  }
                  console.log(messageDetails);

                  // if (this.hash.has(`${messageDetail.sender}_${messageDetail.receiver}`)) {
                  //   const hashValue = this.hash.get(`${messageDetail.sender}_${messageDetail.receiver}`)
                  //   const out = [...hashValue, messageDetails]
                  //   this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, out)
                  //   console.log(this.hash);

                  // }
                  // else {
                  //   const result = [messageDetails]
                  //   this.hash.set(`${messageDetail.sender}_${messageDetail.receiver}`, result)
                  //   console.log(this.hash);

                  // }
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
      time: new Date().toISOString(),
      communicationType: "CHAT",
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

    this.clientService.client.publish({
      destination: "/app/private-message",
      body: JSON.stringify({ sender: this.ownUser.socketId, receiver: this.currentReceiverUser.socketId, message: this.messageContent, communicationType: "CHAT", communicationRequestType: "" })
    });

    this.messageContent = ""

  }


  changeReciverUser(receiverUser: UserList) {
    console.log(receiverUser);

    this.currentReceiverUser = {
      username: receiverUser?.username,
      socketId: receiverUser?.socketId,
      userStatus: receiverUser?.userStatus
    }
    console.log(`${this.currentReceiverUser?.socketId}_${this.ownUser?.socketId}`);

    console.log(this.hash.get(`${this.currentReceiverUser?.socketId}_${this.ownUser?.socketId}`));

  }




  initializeClient() {
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Set up event listeners for remote tracks
    this.client.on("user-published", async (user: any, mediaType: any) => {
      // Subscribe to the remote user when the SDK triggers the "user-published" event
      await this.client.subscribe(user, mediaType);
      console.log("subscribe success");
      // If the remote user publishes an audio track.
      if (mediaType === "audio") {
        // Get the RemoteAudioTrack object in the AgoraRTCRemoteUser object.
        const remoteAudioTrack = user.audioTrack;
        // Play the remote audio track.
        remoteAudioTrack.play();
      }
    });
    // Listen for the "user-unpublished" event
    this.client.on("user-unpublished", async (user) => {
      // Remote user unpublished
    });
  }
  async joinChannel(channel: string, user: string, token: string) {
    await this.client.join(this.appId, channel, token, user);
    await this.createLocalAudioTrack();
    await this.publishLocalAudio();
    console.log("Publish success!");
  }

  async publishLocalAudio() {
    await this.client.publish([this.localAudioTrack]);
  }

  async createLocalAudioTrack() {
    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  }

  initiateAudio() {
    this.audioActive = true
    const messageDetails = {
      message: this.messageContent,
      sender: this.ownUser.socketId,
      receiver: this.currentReceiverUser.socketId,
      time: new Date().toISOString(),
      communicationType: "AUDIO",
      communicationRequestType: "REQUEST",
      senderName: this.ownUser.username,
      receiverName: this.currentReceiverUser.username
    }
    this.currentAudioDetails = {
      ...messageDetails,
      active:true
    }
    // if (this.hash.has(`${messageDetails.receiver}_${this.ownUser.socketId}`)) {
    //   const hashValue = this.hash.get(`${messageDetails.receiver}_${this.ownUser.socketId}`)
    //   const out = [...hashValue, messageDetails]
    //   this.hash.set(`${messageDetails.receiver}_${this.ownUser.socketId}`, out)
    //   console.log(this.hash);

    // }
    // else {
    //   const result = [messageDetails]
    //   this.hash.set(`${messageDetails.receiver}_${this.ownUser.socketId}`, result)
    //   console.log(this.hash);

    // }
    this.clientService.client.publish({
      destination: "/app/private-message",
      body: JSON.stringify({ sender: this.ownUser.socketId, receiver: this.currentReceiverUser.socketId, message: this.messageContent, communicationType: "AUDIO", communicationRequestType: "REQUEST", senderName: this.ownUser.username, receiverName: this.currentReceiverUser.username })
    });
  }

  joinAudio(audioInfo: any) {
    console.log(audioInfo);

    const messageDetails = {
      ...audioInfo,
      communicationRequestType: "JOIN"
    }
    this.currentAudioDetails = {
        ...this.currentAudioDetails,
        ...messageDetails
    }
    console.log(this.currentAudioDetails);
    
    // if (this.hash.has(`${messageDetails.sender}_${messageDetails.receiver}`)) {
    //   const hashValue = this.hash.get(`${messageDetails.sender}_${messageDetails.receiver}`)
    //   const alter = hashValue?.map((data: any) => {
    //     console.log(data?.token);
    //     console.log(messageDetails?.token);

    //     if (data?.token == messageDetails?.token) {
    //       return { ...data, ...messageDetails }
    //     }
    //     else data
    //   })
    //   console.log(alter);

    //   const out = [...alter]
    //   this.hash.set(`${messageDetails.sender}_${messageDetails.receiver}`, out)
    //   console.log(this.hash);

    // }
    // else {
    //   const result = [messageDetails]
    //   this.hash.set(`${messageDetails.sender}_${messageDetails.receiver}`, result)
    //   console.log(this.hash);

    // }
    this.joinChannel(`${audioInfo.sender}_${audioInfo.receiver}`, audioInfo.receiver, audioInfo.token)
    this.clientService.client.publish({
      destination: "/app/private-message",
      body: JSON.stringify({ sender: messageDetails.sender, receiver: messageDetails.receiver, message: this.messageContent, communicationType: "AUDIO", communicationRequestType: "JOIN" , senderName:messageDetails.senderName,receiverName: messageDetails.receiverName })
    });
  }


  cancelAudio(audioInfo: any){
    const messageDetails = {
      ...audioInfo,
      communicationRequestType: "LEAVE"
    }
    this.currentAudioDetails = {
        ...this.currentAudioDetails,
        ...messageDetails
    }
    
    
    this.clientService.client.publish({
      destination: "/app/private-message",
      body: JSON.stringify({ sender: (this.ownUser.socketId == messageDetails.sender) ? messageDetails.receiver : messageDetails.sender, receiver: (this.ownUser.socketId == messageDetails.sender) ? messageDetails.sender : messageDetails.receiver, message: this.messageContent, communicationType: "AUDIO", communicationRequestType: "LEAVE" , senderName:messageDetails.senderName,receiverName: messageDetails.receiverName })
    });
    if (messageDetails.communicationRequestType == "LEAVE") {
                    this.currentAudioDetails={
                      active:false
                    }
                    if(this.client){
                      this.leaveAgoraChannel()
                    }
                    
    }
  }


  async leaveAgoraChannel() {
  // Unpublish local tracks
  if (this.localAudioTrack) {
    await this.client.unpublish(this.localAudioTrack);
    this.localAudioTrack.close();
  }
  // if (localTracks.videoTrack) {
  //   await client.unpublish(localTracks.videoTrack);
  //   localTracks.videoTrack.close();
  //   localTracks.videoTrack = null;
  // }

  // Leave the channel
  await this.client.leave();

  console.log("Left the channel successfully.");
  // You might want to update your UI here to reflect that the user has left
}

}
