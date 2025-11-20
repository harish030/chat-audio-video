import { Routes } from '@angular/router';
import { Chat } from './chat/chat';
import { Login } from './login/login';
import { Chataudiovideo } from './chataudiovideo/chataudiovideo';

export const routes: Routes = [
    {
        path:'',
        redirectTo:'login',
        pathMatch:'full'
    },
    {
        path:'login',
        component:Login
    },
    {
        path:'chat',
        component:Chataudiovideo
    }
];
