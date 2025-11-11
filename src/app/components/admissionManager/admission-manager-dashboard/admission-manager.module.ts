import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdmissionManagerDashboard } from './admission-manager-dashboard';
import { HttpClientModule } from '@angular/common/http';

// 1. IMPORT THE ROUTING MODULE
import { AdmissionManagerRoutingModule } from './admission-manager-routing.module';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { MatIcon } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AdmissionManagerDashboard],
  imports: [
    CommonModule,
    HttpClientModule,
    // 2. ADD IT TO THE 'imports' ARRAY
    AdmissionManagerRoutingModule,
    MatProgressSpinner,
    MatIcon,
    MatFormFieldModule,
    FormsModule
]
})
export class AdmissionManagerModule { }