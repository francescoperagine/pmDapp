import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { OwnerComponent } from './owner/owner.component';
import { DepartmentComponent } from './department/department.component';
import { SecretariatComponent } from './secretariat/secretariat.component';
import { PublicComponent } from './public/public.component';
import { Web3Service } from './web3.service';
import { StakeholderComponent } from './stakeholder/stakeholder.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlternateBackgroundColorDirective } from './shared/alternate-background-color.directive';

const routes: Routes = [
  {path: 'app-component', component:AppComponent},
  {path: 'owner-component', component:OwnerComponent},
  {path: 'department-component', component:DepartmentComponent},
  {path: 'secretariat-component', component:SecretariatComponent},
  {path: 'stakeholder-component', component: StakeholderComponent},
  {path: 'public-component', component:PublicComponent}
];

@NgModule({
  declarations: [
    AppComponent,
    OwnerComponent,
    SecretariatComponent,
    PublicComponent,
    DepartmentComponent,
    StakeholderComponent,
    AlternateBackgroundColorDirective,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule],
  providers: [Web3Service],
  bootstrap: [AppComponent]
})
export class AppModule { }
