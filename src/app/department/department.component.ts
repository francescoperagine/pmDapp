import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { Web3Service } from '../web3.service';
import { Element } from '../element.enum.model';
import { Subscription, Observable } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-department',
  templateUrl: './department.component.html',
  styleUrls: ['./department.component.css']
})

export class DepartmentComponent implements OnInit {
  private isDepartmentSubscription: Subscription;
  private elementCreatedSubscription: Subscription;
  secretariatForm: FormGroup;
  isDepartment: boolean = false;
  secretariatList;
  secretariatCreated = false;
  secretariatCreationException = "";
  currentRouter = this.router.url;

  constructor(private ws: Web3Service, private changeDetector: ChangeDetectorRef, private router: Router) {
    console.log("DepartmentComponent constructor");
  }

  async ngOnInit(): Promise<void> {
    console.log("DepartmentComponent ngOnInit");
    this.isDepartmentSubscription = this.ws.isDepartment.subscribe(async isDepartment => {
      this.isDepartment = isDepartment;
      this.changeDetector.detectChanges();
      if(this.isDepartment) {
        this.secretariatList = await this.getSecretariatList();
      }
    })
    this.elementCreatedSubscription = this.ws.elementIsCreated.subscribe(async element => {
      if(element == Element.DEPARTMENT || element == Element.SECRETARIAT) {
        console.log("DepartmentComponent element created " + element);
        this.changeDetector.detectChanges();
      }
    })
    this.formInit();
  }

  formInit() {
    this.secretariatForm = new FormGroup({
      'address' : new FormControl(null, Validators.required, this.addressValidator.bind(this)),
    });
  }

  addressValidator(control: FormControl): Promise<any> | Observable<any> {
    return this.ws.addressValidator(control);
  }

  async getSecretariatList() {
    console.log("DepartmentComponent getSecretariatList");
    let that = this;
    let data = this.ws.web3.utils.toHex(this.ws.addressToBytes32(this.ws.getAccount()));
    let method = this.ws.contract.methods.getSecretariatList(data);
    return this.ws.callProxy(method).then(function(result) {
      let addresses: string[] = new Array();
      for(let bytes32dep of result) {
        addresses.push(that.ws.bytes32ToAddress(bytes32dep));
      } 
      return addresses;
    })
  }
  
  async onCreateSecretariat() {
    console.log("DepartmentComponent onCreateSecretariat");
    let address = this.secretariatForm.value.address;
    let bytes32Address = this.ws.addressToBytes32(address);
    try {
      let method = this.ws.contract.methods.createSecretariat(bytes32Address);
      await this.ws.sendProxy(method);
      this.secretariatCreated = true;
      this.ws.elementIsCreated.next(Element.SECRETARIAT);
    } catch(error) {
      console.log(error);
      this.secretariatCreated = false;
      this.secretariatCreationException = "Address already in use.";
    }
    this.reload();
  }

  reload(){
    this.router.navigate([this.currentRouter])
  }

  ngOnDestroy(): void {
    console.log("DepartmentComponent ngOnDestroy");
    this.isDepartmentSubscription.unsubscribe();
    this.elementCreatedSubscription.unsubscribe();
  }
}
