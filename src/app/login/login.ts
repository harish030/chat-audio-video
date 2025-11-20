import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
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
export class Login implements OnInit {

  loginFormGroup!:FormGroup
  socketService = inject(Socket)
  router = inject(Router)
  constructor(){
    
  }

  ngOnInit(){
    this.loginFormGroup = new FormGroup({
      username: new FormControl('',Validators.required)
    })
  }

  submitForm(){
    console.log(this.loginFormGroup.value);
    this.socketService.initiateSocket(this.loginFormGroup.value.username).then((res)=>{
      console.log(res);
      sessionStorage.setItem("username",this.loginFormGroup.value.username)
      this.router.navigateByUrl('/chat')
    })
  }

}
