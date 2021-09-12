import { Component, OnInit, ChangeDetectorRef, Input, SimpleChanges } from '@angular/core';
import { Web3Service } from '../web3.service';
import { Element } from '../element.enum.model';
import { Thesis } from '../thesis.model';
import { Subscription, Observable } from 'rxjs';
import { FormGroup, FormControl, Validators} from '@angular/forms';
import {Router, NavigationEnd,ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-secretariat',
  templateUrl: './secretariat.component.html',
  styleUrls: ['./secretariat.component.css']
})

export class SecretariatComponent implements OnInit {
  private isSecretariatSubscription: Subscription;
  private elementCreatedSubscription: Subscription;
  thesisForm: FormGroup;
  isSecretariat;
  @Input() element: Element;
  isAuthor: boolean = false;
  isSupervisor: boolean = false;
  thesisHash = "";
  thesisCreated: boolean = false;
  thesisCreationException = false;
  thesisCreationExceptionMessage = "";
  currentRouter = this.router.url;
  mySubscription: any;


  constructor(private ws: Web3Service, private changeDetector: ChangeDetectorRef, private router: Router) {
    console.log("SecretariatComponent constructor");
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
    this.mySubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Trick the Router into believing it's last link wasn't previously loaded
        this.router.navigated = false;
      }
    });
  }
  
  async ngOnInit() {
    console.log("SecretariatComponent ngOnInit");
    this.isSecretariatSubscription = this.ws.isSecretariat.subscribe(async isSecretariat => {
      this.isSecretariat = isSecretariat;
      this.changeDetector.detectChanges();
    })
    this.elementCreatedSubscription = this.ws.elementIsCreated.subscribe(async element => {
      if(element == Element.SECRETARIAT) {
        console.log("SecretariatComponent element created " + element);
      }
    });
    
    this.formInit();
  }

  async ngOnChanges(changes: SimpleChanges) {
    console.log(changes);
    for (const propName in changes) {
      if (changes.hasOwnProperty(propName)) {
        switch (propName) {
          case 'isSecretariat': {
            console.log("si cambia?!");
            this.changeDetector.detectChanges();
          }
          case 'secretariat': {
            console.log("ma allora?!" + await this.ws.getAccount());
            this.changeDetector.detectChanges();
          }
        }
      }
    }
  }

  formInit() {
    this.thesisForm = new FormGroup({
      'title' : new FormControl(null, Validators.required),
      'course' : new FormControl(null, Validators.required),
      'author' : new FormControl(null, Validators.required, /*this.addressUniqueValidator.bind(this)],*/ this.addressValidator.bind(this)),
      'supervisor' : new FormControl(null, Validators.required, /*this.addressUniqueValidator.bind(this)],*/ this.addressValidator.bind(this)),
      'publicationDate' : new FormControl(null, Validators.required/*, this.dateValidator.bind(this)*/),
      'embargoPeriod' : new FormControl(null, Validators.pattern('\\-?\\d*\\.?\\d{1,2}')),
      'fileUrl' : new FormControl(null, Validators.required/*, this.urlValidator.bind(this)*/)
    });
  }

  // addressUniqueValidator(control: FormControl): {[key: string]: boolean} {
  //   return this.ws.addressUniqueValidator(control);
  // }

  addressValidator(control: FormControl): Promise<any> | Observable<any> {
    return this.ws.addressValidator(control);
  }

  dateValidator(control: FormControl): {[key: string]: boolean} {
    let pattern = /^\d{2}([./-])\d{2}\1\d{4}$/
    if(pattern.test(control.value) != true) {
      return {'dateNotValid': true};
    }
    return null;
  }

  urlValidator(control: FormControl): {[key: string]: boolean} {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    if(pattern.test(control.value) != true) {
      return {'urlNotValid': true};
    }
    return null;
  }
 
  async onCreateThesis() {
    console.log("SecretariatComponent onCreateThesis");
    let thesis = await this.getThesis();
    try {
      this.thesisHash = await this.sendToContract(thesis);
      this.thesisCreated = true;
      this.thesisForm.reset();
    } catch(error) {
      console.log(error);
      this.thesisCreationExceptionMessage ="Operation reverted by the EVM."
      this.thesisCreationException = true;
    }
  }

  async getThesis(){
    console.log("SecretariatComponent createThesis");
    console.log(this.thesisForm);
    let thesis = new Thesis();
    thesis.department = await this.getDepartmentOfSecretariat(this.ws.getAccount());
    thesis.secretariat = this.ws.getAccount();
    thesis.author = this.thesisForm.value.author;
    thesis.supervisor = this.thesisForm.value.supervisor;
    thesis.registrationDate = new Date().getTime();
    thesis.publicationDate = this.thesisForm.value.publicationDate;
    thesis.title = this.thesisForm.value.title;
    thesis.course = this.thesisForm.value.course;
    thesis.embargoPeriod = this.thesisForm.value.embargoPeriod;
    thesis.fileUrl = this.thesisForm.value.fileUrl;
    return thesis;
  } 

  async sendToContract(thesis) {
    let author = this.ws.web3.utils.toHex(this.ws.addressToBytes32(thesis.author));
    let supervisor = this.ws.web3.utils.toHex(this.ws.addressToBytes32(thesis.supervisor));
    let title = this.ws.web3.utils.toHex(thesis.title);
    let course = this.ws.web3.utils.toHex(thesis.course);
    let publicationDate = new Date(this.thesisForm.value.publicationDate).getTime();
    let embargoPeriod = thesis.embargoPeriod * 86400000;
    let fileUrl = this.ws.web3.utils.toHex(thesis.fileUrl);

    let that = this;
    let thesisMethod = this.ws.contract.methods.createThesis(author, supervisor, thesis.registrationDate, title, course);
    return await this.ws.sendProxy(thesisMethod).then(async function(result){
      let thesisHash = result.events.LogCreateThesis.returnValues.thesisHash;
      let argsMethod = that.ws.contract.methods.setThesisArguments(thesisHash, publicationDate, embargoPeriod, fileUrl);
      that.ws.elementIsCreated.next(Element.THESIS);
      await that.ws.sendProxy(argsMethod);
      return thesisHash;
    })
  }

  async getDepartmentOfSecretariat(secretariat) {
    console.log("SecretariatComponent getDepartmentOfSecretariat");
    let bytes32Address = this.ws.addressToBytes32(secretariat);
    let method = this.ws.contract.methods.getDepartmentOfSecretariat(bytes32Address);
    let result = await this.ws.callProxy(method);
    console.log("SecretariatComponent getDepartmentOfSecretariat \n\t" + result);
    return this.ws.bytes32ToAddress(result);
  }

  ngOnDestroy(): void {
    console.log("SecretariatComponent ngOnDestroy");
    this.isSecretariatSubscription.unsubscribe();
    this.mySubscription.unsubscribe();
    this.elementCreatedSubscription.unsubscribe();
  }
}
