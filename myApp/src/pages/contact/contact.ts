import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { OnInit } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/Rx';

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})
export class ContactPage implements OnInit {
  newMessage;
  messages = [];
  chatContext;

  constructor(
    public navCtrl: NavController,
    private http: Http
  ) { }

  ngOnInit(){
    this.messages = [];
  }

  requestResponse(msg){
    return this.http.post('https://app-back-end-calories.mybluemix.net/api/sendmessage',{text: msg, id: JSON.stringify(this.chatContext)}).map((res) => {
      return res.json();
    });
  }
  sendMessage(){
    console.log(this.newMessage);
    this.messages = this.messages.reverse();
    this.messages.push({msg: this.newMessage, bot: false});
    this.requestResponse(this.newMessage).subscribe((res) => {
      this.messages.push({msg: res.res, bot: true});
      this.chatContext = res.id;
      this.messages = this.messages.reverse();
    });
    this.newMessage = '';
  }
}
