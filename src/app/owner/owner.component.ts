import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, SimpleChanges, OnChanges} from '@angular/core';
import { Web3Service } from '../web3.service';
import { Element } from '../element.enum.model';
import { Subscription, Observable } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-owner',
  templateUrl: './owner.component.html',
  styleUrls: ['./owner.component.css']
})

export class OwnerComponent implements OnInit {
  private isOwnerSubscription: Subscription;
  departmentForm: FormGroup;
  isOwner: boolean = false;
  // @Input() isOwner: boolean = false;
  // @Input() element: Element;
  departmentList;
  departmentCreated = false;
  departmentCreationException = "";
  currentRouter = this.router.url;
  
  constructor(private ws: Web3Service, private changeDetector: ChangeDetectorRef, private router: Router) {
    console.log("OwnerComponent constructor");
  }
  
  ngOnInit() {
    console.log("OwnerComponent ngOnInit");
    this.formInit();
    this.isOwnerSubscription = this.ws.isOwner.subscribe(async isOwner => {
      this.isOwner = isOwner;
      this.changeDetector.detectChanges();
    })
  }

  formInit() {
    this.departmentForm = new FormGroup({
      'address' : new FormControl(null, Validators.required, this.addressValidator.bind(this)),
      'name' : new FormControl(null, Validators.required),
    });
  }

  addressValidator(control: FormControl): Promise<any> | Observable<any> {
    return this.ws.addressValidator(control);
  }

  async onCreateDepartment() {
    console.log("OwnerComponent onCreateDepartment");
    let bytes32Address = this.ws.addressToBytes32(this.departmentForm.value.address);
    let bytes32Name = this.ws.web3.utils.toHex(this.departmentForm.value.name);
    let method = this.ws.contract.methods.createDepartment(bytes32Address, bytes32Name);
    try {
      await this.ws.sendProxy(method);
      this.departmentCreated = true;
      this.ws.elementIsCreated.next(Element.DEPARTMENT);
    } catch(error) {
      console.log(error);
      this.departmentCreated = false;
      this.departmentCreationException = "Address already in use.";
    }
    this.reload();
  }

  reload(){
    this.router.navigate([this.currentRouter])
  }

  ngOnDestroy(): void {
    console.log("OwnerComponent ngOnDestroy");
    this.isOwnerSubscription.unsubscribe();
  }
}
