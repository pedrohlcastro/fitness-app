import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { Http } from '@angular/http';
import 'rxjs/Rx';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  private options: CameraOptions = {
    quality: 40,
    destinationType: this.camera.DestinationType.DATA_URL,
    encodingType: this.camera.EncodingType.JPEG,
    mediaType: this.camera.MediaType.PICTURE
  }

  image;
  result;

  constructor(
    public navCtrl: NavController,
    private camera: Camera,
    private http: Http
  ){ }

  requestData(){
    return this.http.post('https://app-back-end-calories.mybluemix.net/api/uploadpic',{image: this.image}).map((res) => {
      console.log(res);
      return res.json();
    });
  }
  
  openCamera() {
    this.camera.getPicture(this.options).then((imageData) => {
      this.image = 'data:image/jpeg;base64,' + imageData;
      this.requestData().subscribe((res) => {
        this.result = res;
        console.log(res);
      });
     }, (err) => {
      console.log(err);
    });
  }

}
