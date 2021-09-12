import { Injectable } from '@angular/core';
import { Subject, Subscription, Observable } from 'rxjs';
import { FormControl } from '@angular/forms';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
var Web3 = require('web3');
declare let window: any;
const managementConsoleAbi = require('../../truffle/build/contracts/ManagementConsole.json').abi;
const proxyContractAddress = '0xCfEB869F69431e42cdB54A4F4f105C19C080A601';

@Injectable({
  providedIn: 'root',
})

export class Web3Service {
  web3: any;
  contract;

  elementIsCreated = new Subject<string>();
  private elementCreatedSubscription: Subscription;
  isOwner = new Subject<boolean>();
  isDepartment = new Subject<boolean>();
  isSecretariat = new Subject<boolean>();
  isStakeholder = new Subject<boolean>();

  private account;
  departmentCreatedEvent;
  secretariatCreatedEvent;
  thesisCreatedEvent;
  thesisFinalizedEvent;

  constructor() {
    console.log("Web3Service constructor");
    this.init();
    this.contract = new this.web3.eth.Contract(managementConsoleAbi, proxyContractAddress);

    console.log(this.contract);
  }

  private async init() {
    console.log("Web3Service init");

    if (window.ethereum === undefined) {
      alert('Non-Ethereum browser detected. Install MetaMask.');
    } else {
      this.web3 = new Web3(Web3.currentProvider || "ws://localhost:8545");
      console.log("Web3 version: " + this.web3.version);
      await this.setAccount();
    }
    this.elementCreatedSubscription = this.elementIsCreated.subscribe(async () => {
      await this.roleSubscription();
    });
    this.eventWatcher();
  }

  eventWatcher() {
    this.departmentCreatedEvent = this.contract.events.LogCreateDepartment({fromBlock: 0}, function(error, result) {
        console.log("New department created: " );
        // console.log(error);
        console.log(result);
    });
    this.secretariatCreatedEvent = this.contract.events.LogCreateSecretariat(/*{fromBlock: 0}, */function(result) {
      console.log("New department created: " + result);
  });
    this.thesisCreatedEvent = this.contract.events.LogCreateThesis(/*{fromBlock: 0}, */function(result) {
      console.log("New department created: " + result);
  });
    this.thesisFinalizedEvent = this.contract.events.LogFinalizeThesis(/*{fromBlock: 0}, */function(result) {
      console.log("New department created: " + result);
  });
  }

  public async setAccount() {
    console.log('Web3Service setAccount');
    let that = this;
    await this.loadAccount();
    window.ethereum.on('accountsChanged', async function () {
      console.log("account changed from " + that.account);
      await that.loadAccount();
      console.log("account changed to" + that.account);
    });
  }

  async loadAccount() {
    let accounts = await window.ethereum.enable();
    this.account = accounts[0];
    this.roleSubscription();
  }

  async roleSubscription() {
    console.log("Web3Service roleChecker");
    let roles = await this.roleChecker();
    this.isOwner.next(roles.owner);
    this.isDepartment.next(roles.department);
    this.isSecretariat.next(roles.secretariat);
    this.isStakeholder.next(roles.stakeholder);
  }

  async roleChecker() {
    let bytes32Address = this.web3.utils.toHex(this.addressToBytes32(this.account));
    let owner = await this.callProxy(this.contract.methods.isOwner());
    let department = await this.callProxy(this.contract.methods.isDepartment(bytes32Address));
    let secretariat = await this.callProxy(this.contract.methods.isSecretariat(bytes32Address));
    let stakeholder = await this.callProxy(this.contract.methods.isStakeholder(bytes32Address));
    console.log("Owner\t" + owner + "\nDepartment\t" + department + "\nSecretariat\t" + secretariat + "\nStakeholder\t" + stakeholder);
    return {owner, department, secretariat, stakeholder};
  }

  getAccount() {
    return this.account;
  }

  async callProxy(method) {
    return await method.call({from: this.account});
  }

  async sendProxy(method) {
    let gasPrice = await this.web3.eth.getGasPrice();
    let estimatedGas = await method.estimateGas({from: this.account});
    let result = await method.send({from: this.account, gas:estimatedGas, gasPrice: gasPrice});
    console.log(result);
    return result;
  }

  async getFileUrl(thesisHash) {
    try {
      let getFileMethod = this.contract.methods.getFileUrl(thesisHash);
      return this.web3.utils.hexToAscii(await this.callProxy(getFileMethod));
    } catch(error) {
      console.log(error);
    }
  }

  addressToBytes32(address: string) {
    let zeroArray = new Array(25).fill(0);
    zeroArray[0] = "0x";
    zeroArray.push(address.slice(2,42));
    return zeroArray.join('');
  }

  bytes32ToAddress(bytes32Address: string) {
    let array = new Array(3);
    array[0] = "0x";
    array.push(bytes32Address.slice(26, 66));
    return array.join('');
  }

  addressValidator(control: FormControl): Promise<any> | Observable<any> {
    const promise = new Promise<any>((resolve, reject) => {
      if(this.web3.utils.isAddress(control.value) != true) {
        resolve({'addressNotValid': true});
      } else {
        resolve(null);
      }
    })
    return promise;
  }

  // addressUniqueValidator(control: FormControl): {[key: string]: boolean} {
  //   if(control.value == this.account) {
  //     return {'addressNotUnique': true};
  //   }
  //   return null;
  // }

  ngOnDestroy(): void {
    console.log("Web3Service ngOnDestroy");
    this.elementCreatedSubscription.unsubscribe();
  }
}