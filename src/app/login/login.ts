import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Socket } from '../services/socket';
import { Router } from '@angular/router';
import { Chataudiovideo } from '../chataudiovideo/chataudiovideo';

@Component({
  selector: 'app-login',
  imports: [CommonModule , ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit,OnDestroy {

  loginFormGroup!:FormGroup
  socketService = inject(Socket)
  router = inject(Router)

  serverLoader = false
  loaderPercentage = 0

  serverLoaderClearInterval:any
  constructor(){
    
  }

  ngOnInit(){
    this.loginFormGroup = new FormGroup({
      username: new FormControl('',Validators.required)
    })
  }

  submitForm(){
    this.serverLoader = true
    this.serverLoaderClearInterval=setInterval(() => {
      if (!(this.loaderPercentage == 100)) {
        this.loaderPercentage += 1
      }
    }, 1000);
    this.socketService.initiateSocket(this.loginFormGroup.value.username).then((res)=>{
      console.log(res);
      sessionStorage.setItem("username",this.loginFormGroup.value.username)
      this.router.navigateByUrl('/chat')
    })
  }

  ngOnDestroy(): void {
      clearInterval(this.serverLoaderClearInterval)
  }

}
