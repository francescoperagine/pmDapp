import { Component, OnInit, ViewChild, ChangeDetectorRef, Input } from '@angular/core';
import { Web3Service } from '../web3.service';
import { Element } from '../element.enum.model';
import { Thesis } from '../thesis.model';
import { NgForm } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-stakeholder',
  templateUrl: './stakeholder.component.html',
  styleUrls: ['./stakeholder.component.css']
})

export class StakeholderComponent implements OnInit {
  
  private isStakeholderSubscription: Subscription;
  private isSecretariatSubscription: Subscription;
  private elementCreatedSubscription: Subscription;
  private permissionSubmitSubscription: Subscription;
  @ViewChild('f', { static: false }) setPermissionForm: NgForm;
  isStakeholder: boolean = false;
  isSecretariat: boolean = false;
  thesisList;
  permissionSubmitted = new Subject<string>();
  permissionSubmitException = "";
  thesisSignature = "";
  thesisHasBeenSigned: boolean = false;
  currentRouter = this.router.url;

  constructor(private ws: Web3Service, private changeDetector: ChangeDetectorRef, private router: Router) {
    console.log("StakeholderComponent constructor");
  }

  ngOnInit(): void {
    console.log("StakeholderComponent ngOnInit");
    this.isStakeholderSubscription = this.ws.isStakeholder.subscribe(isStakeholder => {
      this.isStakeholder = isStakeholder;
      this.changeDetector.detectChanges();
      if(isStakeholder) {
        this.reloadUI();
      }
    })
    this.isSecretariatSubscription = this.ws.isSecretariat.subscribe(isSecretariat => {
      this.isSecretariat = isSecretariat;
      if(this.isSecretariat){
        this.changeDetector.detectChanges();
      }
    })
    this.elementCreatedSubscription = this.ws.elementIsCreated.subscribe(element => {
      if(element == Element.THESIS && this.isStakeholder) {
        this.changeDetector.detectChanges();
      }
    })
    this.permissionSubmitSubscription = this.permissionSubmitted.subscribe(thesis => {
      if(this.thesisList.some(thesisPermission => thesisPermission.hash.includes(thesis))) {
        console.log("thesis changed " + thesis );
        this.reloadUI();
      }
    })       
  }

  async reloadUI() {
    console.log("StakeholderComponent reloadUI");
    this.thesisList = await this.getThesisList();
    this.changeDetector.detectChanges();
  }

  async onFinalize(thesisHash) {
    console.log("StakeholderComponent onFinalize");
    let thesisData = await this.ws.callProxy(this.ws.contract.methods.getThesis(thesisHash));
    let thesis = this.getThesis(thesisData);
    thesis.hash = thesisHash;
    let that = this;
    try {
      var thesisDataHash = await that.ws.web3.utils.sha3(JSON.stringify(thesis));
      await this.ws.sendProxy(this.ws.contract.methods.finalizeThesis(thesisHash));
      thesis.signature = await that.ws.web3.eth.sign(thesisDataHash, that.ws.getAccount());
      this.thesisSignature = thesis.signature;
      this.thesisHasBeenSigned = true;
      this.jsonDownloader(thesis, thesisHash);
    } catch (error) {
      this.permissionSubmitException = "Something went wrong.";
    } 
    this.reloadUI();
  }

  getThesis(thesisData){
    console.log("StakeholderComponent newThesis");
    let thesis = new Thesis();
    thesis.department = thesisData.department;
    thesis.secretariat = thesisData.secretariat;
    thesis.author = thesisData.author;
    thesis.supervisor = thesisData.supervisor;
    thesis.registrationDate = thesisData.registrationDate;
    thesis.publicationDate = thesisData.publicationDate;
    return thesis;
  } 

  async hasStakeholderRole(account) {
    console.log("StakeholderComponent hasStakeholderRole");
    let bytes32Address = this.ws.web3.utils.toHex(this.ws.addressToBytes32(account));
    return await this.ws.callProxy(this.ws.contract.methods.isStakeholder(bytes32Address));
  }

  private async getThesisList() {
    console.log("StakeholderComponent getThesisPermissions");
     /**
     * @dev returns an array with a single 0x0 element if there's no active thesis to sign. 
     */
    let thesisHashList = await this.getThesisHashList();
    let set = new Set();
    for(let i = 0; i < thesisHashList.length; i++) {
      if(thesisHashList[i] != '0x0000000000000000000000000000000000000000000000000000000000000000') {
        set.add(thesisHashList[i]);
      }
    }
    let thesisList = [];
    for(let thesisHash of set) {
      let permissions = await this.ws.callProxy(this.ws.contract.methods.getThesisPermissionStatus(thesisHash));
      let ownPermission = await this.ws.callProxy(this.ws.contract.methods.getThesisPermission(thesisHash));
      let fileUrl = await this.ws.getFileUrl(thesisHash);
      let thesis = new Thesis();
      thesis.hash = thesisHash;
      thesis.secretariatPermission = permissions.secretariat;
      thesis.authorPermission = permissions.author;
      thesis.supervisorPermission = permissions.supervisor;
      thesis.ownPermission = ownPermission;
      thesis.fileUrl = fileUrl;
      console.log(thesis);
      thesisList.push(thesis);
    }
    console.log(thesisList);
    return thesisList;
  }

  async getThesisHashList() {
    console.log("StakeholderComponent getThesistList");
    let data = this.ws.web3.utils.toHex(this.ws.addressToBytes32(this.ws.getAccount()));
    let method = this.ws.contract.methods.getThesisOfStakeholder(data);
    let result = await this.ws.callProxy(method);
    console.log(result);
    return result;
  }

  async onSetPermission(thesisHash: string, permission: boolean) {
    console.log("StakeholderComponent onSetPermission " + thesisHash + " " + permission);
    let setPermission = this.ws.contract.methods.setPermission(thesisHash, permission);
    await this.ws.sendProxy(setPermission);
    this.permissionSubmitted.next(thesisHash);
  }

  jsonDownloader(object, filename) {
    console.log("SecretariatComponent jsonDownloader filename " + filename);
    console.log(object);
    let fileContent = JSON.stringify(object, null, 0);
    let downloader = document.createElement('a');
    downloader.href = "data:text/json;charset=UTF-8," + encodeURIComponent(fileContent);
    downloader.download = filename + '.json';
    // trigger the download
    downloader.click();
  }

  reload(){
    this.router.navigate([this.currentRouter])
  }

  ngOnDestroy(): void {
    console.log("OwnerComponent ngOnDestroy");
    this.isStakeholderSubscription.unsubscribe();
    this.isSecretariatSubscription.unsubscribe();
    this.elementCreatedSubscription.unsubscribe();
    this.permissionSubmitSubscription.unsubscribe();
  }
}
