import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdmissionManagerDashboard } from './admission-manager-dashboard';

const routes: Routes = [
  { path: '', component: AdmissionManagerDashboard }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdmissionManagerRoutingModule { }