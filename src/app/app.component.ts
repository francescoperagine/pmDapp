import { Component } from '@angular/core';

import { Web3Service } from './web3.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  
  title = 'Procedure Manager DApp';
  private elementCreatedSubscription: Subscription;
  element;

  constructor(private ws: Web3Service){
    console.log("AppComponent constructor");
    this.elementCreatedSubscription = this.ws.elementIsCreated.subscribe(async element => {
      console.log("AppComponent - element created " + element);
      this.element = element;
    });
 }

  // async ngOnInit() {

  // }

  ngOnDestroy(){
      this.elementCreatedSubscription.unsubscribe();
  //   }
  }

}
