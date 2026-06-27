import { TasksBoardComponent } from '../../shared/tasks-board/tasks-board';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// Routing
import { AdmissionManagerRoutingModule } from './admission-manager-routing.module';

// Components
import { AdmissionManagerDashboard } from './admission-manager-dashboard';
import { MessageDashboardAdmissionManager } from '../message-dashboard-admission-manager/message-dashboard-admission-manager';

// Charts (Required for the Graphs)
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

// Angular Material (Optional: The new dashboard uses custom CSS, but keeping these is fine)
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { MatIcon } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";


@NgModule({
  declarations: [
    AdmissionManagerDashboard,
    MessageDashboardAdmissionManager
  ],
  imports: [
    TasksBoardComponent,
    CommonModule,
    HttpClientModule,
    FormsModule,
    AdmissionManagerRoutingModule,
    // Critical for Graphs:
    BaseChartDirective,
    // Material Modules (Safe to keep):
    MatProgressSpinner,
    MatIcon,
    MatFormFieldModule
  ],
  providers: [
    // Critical for Chart.js registration:
    provideCharts(withDefaultRegisterables())
  ]
})
export class AdmissionManagerModule { }