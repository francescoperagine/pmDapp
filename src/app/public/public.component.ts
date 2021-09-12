import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Web3Service } from '../web3.service';
import { Thesis } from '../thesis.model';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-public',
  templateUrl: './public.component.html',
  styleUrls: ['./public.component.css']
})

export class PublicComponent implements OnInit {
  departmentList;
  verificationHasResult: boolean = false;
  verificationHasException: boolean = false;
  verificationForm: FormGroup;
  fileLabelName: string = "Select or drag the thesis JSON file";
  fileContent;
  fileUrl;
  currentRouter = this.router.url;

  constructor(private ws: Web3Service, private changeDetector: ChangeDetectorRef, private router: Router) {
    console.log("PublicComponent constructor");
  }

  async ngOnInit(): Promise<void> {
    console.log("PublicComponent ngOnInit");
    this.formInit();
    this.changeDetector.detectChanges();
  }

  formInit() {
    this.verificationForm = new FormGroup({
      'file' : new FormControl(null, Validators.required),
    });
  }

  onFileChange(event) {
    console.log("PublicComponent onFileChange");
    let file = event.srcElement.files[0];
    this.fileLabelName = file.name;
    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = () => {
      this.fileContent = fileReader.result;
      console.log(this.fileContent);
    }
    fileReader.onerror = (error) => {
      console.log(error);
    }
    this.changeDetector.markForCheck();
  }

  async onThesisVerification(){
    console.log("PublicComponent onThesisVerification ");
    this.verificationHasResult = false;
    this.verificationHasException = false;
    let thesisRaw = JSON.parse(<string> this.fileContent);
    let thesis = new Thesis();
    thesis.department = thesisRaw.department;
    thesis.secretariat = thesisRaw.secretariat;
    thesis.author = thesisRaw.author;
    thesis.supervisor = thesisRaw.supervisor;
    thesis.registrationDate = thesisRaw.registrationDate;
    thesis.publicationDate = thesisRaw.publicationDate;
    thesis.hash = thesisRaw.hash;
    try {
      var thesisDataHash = await this.ws.web3.utils.sha3(JSON.stringify(thesis));
      let verifySignatureMethod = this.ws.contract.methods.verifySecretariatSignature(thesis.hash, thesisDataHash, thesis.signature);
      this.verificationHasResult = await this.ws.callProxy(verifySignatureMethod);
    } catch(error) {
      this.verificationHasException = true;
      console.log(error);
    }
    this.fileUrl = await this.ws.getFileUrl(thesis.hash);
    this.verificationForm.reset();
  }

  reload(){
    this.router.navigate([this.currentRouter])
  }
}
