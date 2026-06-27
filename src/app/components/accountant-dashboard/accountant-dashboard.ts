import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, Inject, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil, finalize, interval } from 'rxjs';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import {
  AccountantService,
  Accountant,
  Student,
  ApprovePaymentPayload,
  RejectPaymentPayload,
  DashboardStats,
  CollectionSummary,
  RecentActivity,
  AssignedStudent,
  AccountantCredit,
  SubAccount
} from '../../services/accountant.service';
import { BeneficiaryService } from '../../services/beneficiary.service';
import { PaymentRequestService, PaymentRequest } from '../../services/payment-request.service';
import { environment } from '../../../environments/environment';
import { FileService } from '../../services/file.service';
import { ChartConfiguration, ChartOptions, ChartData, ChartType } from 'chart.js';
import { ReportService, ReportResponseDTO, ReportRequest } from '../../services/report.service';

@Component({
  selector: 'app-accountant-dashboard',
  standalone: false,
  templateUrl: './accountant-dashboard.html',
  styleUrl: './accountant-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.85)' }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
    trigger('slideInRight', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(100%)' })),
      ])
    ]),
    trigger('staggerIn', [
      transition(':enter', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
  ],
})
export class AccountantDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private avatarColors = ['#059669', '#0F766E', '#14B8A6', '#3B82F6', '#7C3AED', '#EC4899'];

  // User Data
  accountantData: Accountant | null = null;
  username: string = '';

  // Smart Calculator State
  showCalculator = false;
  calcDisplay = '0';
  calcEquation = '';
  calcMemory = 0;
  calcNewNumber = true;
  calcPendingOp: string | null = null;
  calcPrevNum = 0;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Command Palette (Cmd+K or Ctrl+K)
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleCommandPalette();
      return;
    }
    // Command Palette Navigation
    if (this.showCommandPalette) {
      if (event.key === 'Escape') this.showCommandPalette = false;
      return;
    }

    // Calculator Keybinds
    if (!this.showCalculator) return;
    const key = event.key;
    if (/[0-9\.]/.test(key)) this.calcAppend(key);
    else if (['+', '-', '*', '/'].includes(key)) this.calcOp(key);
    else if (key === 'Enter' || key === '=') { event.preventDefault(); this.calcEqual(); }
    else if (key === 'Escape' || key === 'c' || key === 'C') this.calcClear();
    else if (key === 'Backspace') this.calcBackspace();
  }

  // --- SMART FINANCIAL INSIGHTS ---
  get insightMessage(): string {
    const net = this.totalBalance + (this.stats?.totalAmountPending || 0) - ((this.stats?.totalVisaRequestedByVisaMan || 0) - (this.stats?.totalAccToVisaManPaidAmount || 0)) - this.getTotalBorrowedFunds();
    const emiCount = this.upcomingCredits.length;
    const reqCount = this.pendingFundRequestsCount;
    let msg = `Your true net balance is ${net >= 0 ? 'positive' : 'negative'} (₹${Math.abs(net).toLocaleString('en-IN')}). `;
    if (emiCount > 0) msg += `You have ${emiCount} EMI${emiCount > 1 ? 's' : ''} due in the next 30 days. `;
    if (reqCount > 0) msg += `There ${reqCount > 1 ? 'are' : 'is'} ${reqCount} pending fund request${reqCount > 1 ? 's' : ''} to review.`;
    if (emiCount === 0 && reqCount === 0) msg += `All accounts are settled and no immediate action is required today.`;
    return msg;
  }

  // --- LIVE CURRENCY CONVERTER ---
  showCurrencyConverter = false;
  currencyBaseAmount = 1;
  currencyTarget = 'USD';
  exchangeRates: { [key: string]: number } = {
    'USD': 83.45,
    'GBP': 105.20,
    'EUR': 90.15,
    'AUD': 54.80,
    'CAD': 61.35
  };

  get convertedCurrencyAmount(): number {
    return this.currencyBaseAmount * (this.exchangeRates[this.currencyTarget] || 1);
  }

  toggleCurrencyConverter() {
    this.showCurrencyConverter = !this.showCurrencyConverter;
    if (this.showCurrencyConverter) this.showCalculator = false;
  }

  // --- QUICK RECEIPT GENERATOR ---
  showReceiptModal = false;
  selectedReceiptTransaction: any = null;

  openReceipt(transaction: any) {
    this.selectedReceiptTransaction = transaction;
    this.showReceiptModal = true;
    this.cdr.detectChanges();
  }

  closeReceipt() {
    this.showReceiptModal = false;
    this.selectedReceiptTransaction = null;
  }

  printReceipt() {
    window.print();
  }

  // --- GLOBAL COMMAND PALETTE ---
  showCommandPalette = false;
  paletteSearchQuery = '';
  paletteActions = [
    { title: 'Add Credit / Funds', icon: 'fas fa-plus-circle', action: () => this.openAddFundsModal() },
    { title: 'Internal Transfer', icon: 'fas fa-exchange-alt', action: () => this.openInternalTransferModal() },
    { title: 'Fund Wallet', icon: 'fas fa-wallet', action: () => this.openFundWalletModal() },
    { title: 'Record Expense', icon: 'fas fa-file-invoice-dollar', action: () => this.openExpenseModal(this.walletSubAccounts[0]?.id || 0) },
    { title: 'Go to Transactions', icon: 'fas fa-list', action: () => this.switchView('transactions') },
    { title: 'Go to Fund Requests', icon: 'fas fa-hand-holding-usd', action: () => this.switchView('funds') },
    { title: 'Go to Reports', icon: 'fas fa-chart-line', action: () => this.switchView('reports') },
    { title: 'Refresh Data', icon: 'fas fa-sync', action: () => this.refreshData() }
  ];

  get filteredPaletteActions() {
    if (!this.paletteSearchQuery) return this.paletteActions;
    const q = this.paletteSearchQuery.toLowerCase();
    return this.paletteActions.filter(a => a.title.toLowerCase().includes(q));
  }

  toggleCommandPalette() {
    this.showCommandPalette = !this.showCommandPalette;
    if (this.showCommandPalette) {
      this.paletteSearchQuery = '';
      setTimeout(() => {
        const input = document.getElementById('paletteSearchInput');
        if (input) input.focus();
      }, 50);
    }
  }

  executePaletteAction(actionObj: any) {
    this.showCommandPalette = false;
    actionObj.action();
  }

  // ==========================================
  // WORLD-CLASS ENTERPRISE HUB STATE
  // ==========================================

  // 1. AI Forecaster
  showForecastModal = false;
  isForecastLoading = false;
  forecastDataPoints: number[] = [];
  maxForecastValue: number = 700000;
  openForecast() { 
    this.showForecastModal = true; 
    this.isForecastLoading = true;
    this.accountantService.getEnterpriseForecast(this.username).subscribe({
      next: (res) => {
        this.forecastDataPoints = res.map(p => p.amount);
        this.maxForecastValue = Math.max(...this.forecastDataPoints, 1);
        this.isForecastLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { console.error(err); this.isForecastLoading = false; }
    });
  }
  closeForecast() { this.showForecastModal = false; }

  // 2. Global Heatmap
  showHeatmapModal = false;
  isHeatmapLoading = false;
  heatmapData: any[] = [];
  openHeatmap() { 
    this.showHeatmapModal = true; 
    this.isHeatmapLoading = true;
    this.accountantService.getEnterpriseHeatmap(this.username).subscribe({
      next: (res) => {
        this.heatmapData = res.map(r => ({
           country: r.name, students: r.students, revenue: r.revenue, 
           top: (Math.random() * 60 + 20) + '%', left: (Math.random() * 60 + 20) + '%'
        }));
        this.isHeatmapLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { console.error(err); this.isHeatmapLoading = false; }
    });
  }
  closeHeatmap() { this.showHeatmapModal = false; }

  // 3. Smart Audit
  showAuditModal = false;
  isAuditLoading = false;
  auditLogs: any[] = [];
  openAudit() { 
    this.showAuditModal = true; 
    this.isAuditLoading = true;
    this.accountantService.getEnterpriseAudit(this.username).subscribe({
      next: (res) => {
        this.auditLogs = res.map(a => ({
          type: a.risk === 'Critical' ? 'danger' : (a.risk === 'High' ? 'warning' : 'info'),
          msg: a.details,
          time: a.time,
          status: a.event
        }));
        this.isAuditLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { console.error(err); this.isAuditLoading = false; }
    });
  }
  closeAudit() { this.showAuditModal = false; }

  // 4. EOD Vault
  showEodModal = false;
  eodRunning = false;
  eodCompleted = false;
  eodSteps = [
    { title: 'Verifying Master Ledgers', done: false, active: false },
    { title: 'Scanning for Pending Receipts', done: false, active: false },
    { title: 'Reconciling Cash vs Bank', done: false, active: false },
    { title: 'Generating Z-Report & Locking Day', done: false, active: false }
  ];

  openEodVault() { 
    this.showEodModal = true;
    this.eodRunning = false;
    this.eodCompleted = false;
    this.eodSteps.forEach(s => { s.done = false; s.active = false; });
  }
  eodResult: any = null;

  closeEodVault() { 
    this.showEodModal = false; 
    this.eodCompleted = false;
    this.eodResult = null;
    this.eodSteps.forEach(s => { s.active = false; s.done = false; });
  }

  executeEodReconciliation() {
    if (this.eodRunning || this.eodCompleted) return;
    this.eodRunning = true;
    let currentStep = 0;
    
    const runStep = () => {
      if (currentStep > 0) {
        this.eodSteps[currentStep - 1].active = false;
        this.eodSteps[currentStep - 1].done = true;
      }
      if (currentStep < this.eodSteps.length) {
        this.eodSteps[currentStep].active = true;
        this.cdr.detectChanges();
        currentStep++;
        setTimeout(runStep, 1000); 
      } else {
        this.accountantService.lockEodVault(this.username).subscribe({
          next: (res) => {
            this.eodRunning = false;
            this.eodCompleted = true;
            this.eodResult = res;
            this.cdr.detectChanges();
          },
          error: (err) => { console.error(err); this.eodRunning = false; }
        });
      }
    };
    
    runStep();
  }

  toggleCalculator() {
    this.showCalculator = !this.showCalculator;
    if (this.showCalculator) {
       this.calcDisplay = '0';
       this.calcEquation = '';
       this.calcPendingOp = null;
       this.calcNewNumber = true;
    }
  }

  calcAppend(char: string) {
    if (this.calcNewNumber) {
      this.calcDisplay = char === '.' ? '0.' : char;
      this.calcNewNumber = false;
    } else {
      if (char === '.' && this.calcDisplay.includes('.')) return;
      this.calcDisplay = this.calcDisplay === '0' && char !== '.' ? char : this.calcDisplay + char;
    }
  }

  calcBackspace() {
    if (this.calcNewNumber) return;
    this.calcDisplay = this.calcDisplay.length > 1 ? this.calcDisplay.slice(0, -1) : '0';
    if (this.calcDisplay === '0') this.calcNewNumber = true;
  }

  calcOp(op: string) {
    const currentNum = parseFloat(this.calcDisplay);
    if (this.calcPendingOp && !this.calcNewNumber) {
      this.calcEqual();
    } else {
      this.calcPrevNum = currentNum;
    }
    this.calcPendingOp = op;
    this.calcEquation = `${this.calcPrevNum} ${op}`;
    this.calcNewNumber = true;
  }

  calcEqual() {
    if (!this.calcPendingOp) return;
    const currentNum = parseFloat(this.calcDisplay);
    let res = 0;
    switch (this.calcPendingOp) {
      case '+': res = this.calcPrevNum + currentNum; break;
      case '-': res = this.calcPrevNum - currentNum; break;
      case '*': res = this.calcPrevNum * currentNum; break;
      case '/': res = currentNum !== 0 ? this.calcPrevNum / currentNum : 0; break;
    }
    // Round to max 6 decimals
    res = Math.round(res * 1000000) / 1000000;
    this.calcDisplay = res.toString();
    this.calcEquation = `${this.calcPrevNum} ${this.calcPendingOp} ${currentNum} =`;
    this.calcPrevNum = res;
    this.calcPendingOp = null;
    this.calcNewNumber = true;
  }

  calcClear() {
    this.calcDisplay = '0';
    this.calcEquation = '';
    this.calcPendingOp = null;
    this.calcPrevNum = 0;
    this.calcNewNumber = true;
  }

  calcMemoryAction(action: string) {
    const num = parseFloat(this.calcDisplay);
    if (action === 'MC') this.calcMemory = 0;
    if (action === 'MR') { this.calcDisplay = this.calcMemory.toString(); this.calcNewNumber = true; }
    if (action === 'M+') this.calcMemory += num;
    if (action === 'M-') this.calcMemory -= num;
  }

  // Dashboard Data
  stats: DashboardStats | null = null;
  collections: CollectionSummary[] = [];
  activities: RecentActivity[] = [];
  students: AssignedStudent[] = [];
  filteredStudents: AssignedStudent[] = [];
  listAgentFilter: string = 'ALL';
  listCollegeFilter: string = 'ALL';
  listDateFrom: string = '';
  listDateTo: string = '';
  selectedStudent: Student | null = null;
  credits: AccountantCredit[] = [];
  includeCreditInBalance: boolean = true;
  showScheduleAction: boolean = true;
  showPurposeAction: boolean = true;
  allStudentsData: any;

  // Passbooks
  visaManPassbooks: any[] = [];
  agentPassbooks: any[] = [];
  activePassbookTab: 'visaman' | 'agent' = 'visaman';

  // Animated Counters
  animatedStats = {
    totalStudentsAssigned: 0,
    pendingPayments: 0,
    paymentsReceived: 0,
    paymentsNotReceived: 0,
    totalAmountReceived: 0,
    totalAmountPending: 0,
    totalVisaRequestedByVisaMan: 0,
    totalAccToVisaManPaidAmount: 0
  };

  liabilitySummary: import('../../services/accountant.service').LiabilityDashboardSummary | null = null;

  // SubAccounts
  subAccounts: SubAccount[] = [];
  get bankSubAccounts() { return this.subAccounts.filter(a => a.accountType !== 'CASH' && a.accountType !== 'WALLET' && a.bankName !== 'CASH'); }
  get topBankAccounts() { return [...this.bankSubAccounts].sort((a, b) => (b.balance || 0) - (a.balance || 0)); }
  get walletSubAccounts() {
    const wallets = this.subAccounts.filter(a => a.accountType === 'WALLET');
    return wallets.length > 0 ? [wallets[0]] : [];
  }
  get cashSubAccounts() { return this.subAccounts.filter(a => a.accountType === 'CASH' || a.bankName === 'CASH'); }
  get cashAndWalletSubAccounts() { return [...this.cashSubAccounts, ...this.walletSubAccounts]; }
  get totalBankBalance() { return this.bankSubAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0); }
  get totalCashBalance() { return this.cashSubAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0); }
  get totalWalletBalance() { return this.walletSubAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0); }
  get totalBalance() { return this.totalBankBalance + this.totalCashBalance + this.totalWalletBalance; }
  showAddSubAccountModal = false;
  newSubAccount: any = { bankName: '', accountNumber: '', swiftBic: '', beneficiaryName: '', branchAddress: '', relationshipManager: '', accountType: 'BANK', cashAccountName: '', companyAccount: '', location: '', contactNo: '' };

  // --- Transactions Modal & Tab ---
  selectedSubAccountForTx: any = null;
  subAccountTransactions: any[] = [];

  allTransactions: any[] = [];
  transactionCurrentPage: number = 0;
  transactionTotalPages: number = 0;
  transactionTotalElements: number = 0;
  transactionPageSize: number = 100;

  // Advanced Transaction Filters
  showAdvancedTxFilters: boolean = false;
  advFilterRole: string = 'AGENT';
  advFilterUserId: string = 'all';
  advFilterCollege: string = 'all';

  advTotalInflow: number = 0;
  advTotalOutflow: number = 0;
  advBalance: number = 0;
  advTransactions: any[] = [];

  uniqueAdvAgents: string[] = [];
  uniqueAdvDocManagers: string[] = [];
  uniqueAdvVisaManagers: string[] = [];
  uniqueAdvColleges: string[] = [];

  creditsCurrentPage: number = 1;
  creditsPageSize: number = 10;

  calendarCurrentPage: number = 1;
  calendarPageSize: number = 10;

  selectedCalendarYear: number = new Date().getFullYear();
  selectedCalendarMonth: number = new Date().getMonth();

  // --- NEW DASHBOARD WIDGETS ---
  selectedCashFlowPeriod: 'day' | 'week' | 'month' | 'year' = 'month';

  setCashFlowPeriod(period: 'day' | 'week' | 'month' | 'year') {
    this.selectedCashFlowPeriod = period;
  }

  get cashFlowTransactions(): any[] {
    const now = new Date();
    return this.allTransactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      if (this.selectedCashFlowPeriod === 'day') {
        return txDate.toDateString() === now.toDateString();
      } else if (this.selectedCashFlowPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= weekAgo;
      } else if (this.selectedCashFlowPeriod === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (this.selectedCashFlowPeriod === 'year') {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  get cashFlowInflow(): number {
    return this.cashFlowTransactions
      .filter(tx => tx.transactionType === 'CREDIT' || tx.inflow > 0)
      .reduce((sum, tx) => sum + (tx.amount || tx.inflow || 0), 0);
  }

  get cashFlowOutflow(): number {
    return this.cashFlowTransactions
      .filter(tx => tx.transactionType === 'DEBIT' || tx.outflow > 0)
      .reduce((sum, tx) => sum + (tx.amount || tx.outflow || 0), 0);
  }

  get cashFlowDonutStyle(): string {
    const inflow = this.cashFlowInflow;
    const outflow = this.cashFlowOutflow;
    const total = inflow + outflow;
    if (total === 0) {
      return 'conic-gradient(#e2e8f0 0% 100%)';
    }
    const inflowPercent = (inflow / total) * 100;
    return `conic-gradient(#10b981 0% ${inflowPercent}%, #ef4444 ${inflowPercent}% 100%)`;
  }

  get topInflowBank(): any {
    const bankTotals: { [key: string]: number } = {};
    this.cashFlowTransactions
      .filter(tx => tx.transactionType === 'CREDIT' || tx.inflow > 0)
      .forEach(tx => {
        const name = tx.subAccount?.bankName || tx.subAccount?.cashAccountName || tx.accountName || tx.bankName || 'Other';
        bankTotals[name] = (bankTotals[name] || 0) + (tx.amount || tx.inflow || 0);
      });
    const sorted = Object.entries(bankTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return { name: 'N/A', amount: 0, percent: 0 };
    const maxAmount = sorted[0][1];
    return { name: sorted[0][0], amount: maxAmount, percent: this.cashFlowInflow ? (maxAmount / this.cashFlowInflow) * 100 : 0 };
  }

  get topOutflowBank(): any {
    const bankTotals: { [key: string]: number } = {};
    this.cashFlowTransactions
      .filter(tx => tx.transactionType === 'DEBIT' || tx.outflow > 0)
      .forEach(tx => {
        const name = tx.subAccount?.bankName || tx.subAccount?.cashAccountName || tx.accountName || tx.bankName || 'Other';
        bankTotals[name] = (bankTotals[name] || 0) + (tx.amount || tx.outflow || 0);
      });
    const sorted = Object.entries(bankTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return { name: 'N/A', amount: 0, percent: 0 };
    const maxAmount = sorted[0][1];
    return { name: sorted[0][0], amount: maxAmount, percent: this.cashFlowOutflow ? (maxAmount / this.cashFlowOutflow) * 100 : 0 };
  }

  get recentTransactions(): any[] {
    return [...this.cashFlowTransactions]
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, 11);
  }

  get upcomingCredits(): any[] {
    // For loans due this month, we look at the calendarInstallments
    const now = new Date();
    return this.calendarInstallments.filter(inst => {
      if (inst.status !== 'PENDING' && inst.status !== 'OVERDUE') return false;
      const dueDate = new Date(inst.dueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).slice(0, 3);
  }
  // -----------------------------
  monthsList = [
    { value: 0, label: 'Jan' }, { value: 1, label: 'Feb' },
    { value: 2, label: 'Mar' }, { value: 3, label: 'Apr' },
    { value: 4, label: 'May' }, { value: 5, label: 'Jun' },
    { value: 6, label: 'Jul' }, { value: 7, label: 'Aug' },
    { value: 8, label: 'Sep' }, { value: 9, label: 'Oct' },
    { value: 10, label: 'Nov' }, { value: 11, label: 'Dec' }
  ];

  get filteredMonthInstallments(): any[] {
    return this.calendarInstallments.filter(inst => {
      if (!inst.dueDate) return false;
      const date = new Date(inst.dueDate);
      return date.getFullYear() === this.selectedCalendarYear && date.getMonth() === this.selectedCalendarMonth;
    });
  }

  get paginatedCalendar(): any[] {
    const start = (this.calendarCurrentPage - 1) * this.calendarPageSize;
    return this.filteredMonthInstallments.slice(start, start + this.calendarPageSize);
  }

  get totalCalendarPages(): number {
    return Math.ceil(this.filteredMonthInstallments.length / this.calendarPageSize) || 1;
  }

  get calendarStartIndex(): number {
    if (this.filteredMonthInstallments.length === 0) return 0;
    return (this.calendarCurrentPage - 1) * this.calendarPageSize + 1;
  }

  get calendarEndIndex(): number {
    return Math.min(this.calendarCurrentPage * this.calendarPageSize, this.filteredMonthInstallments.length);
  }

  selectCalendarMonth(month: number) {
    this.selectedCalendarMonth = month;
    this.calendarCurrentPage = 1;
  }

  changeCalendarYear(delta: number) {
    this.selectedCalendarYear += delta;
    this.calendarCurrentPage = 1;
  }

  nextCalendarPage(): void {
    if (this.calendarCurrentPage < this.totalCalendarPages) this.calendarCurrentPage++;
  }

  prevCalendarPage(): void {
    if (this.calendarCurrentPage > 1) this.calendarCurrentPage--;
  }

  // Pay Installment Modal
  showPayInstallmentModal = false;
  selectedInstallmentToPay: any = null;
  installmentPaymentForm = { subAccountId: null as number | null, amount: 0, notes: 'Early Repayment' };
  isPayingInstallment = false;

  openPayInstallmentModal(inst: any) {
    this.selectedInstallmentToPay = inst;
    this.installmentPaymentForm.amount = inst.installmentAmount - inst.paidAmount;
    this.installmentPaymentForm.subAccountId = null;
    this.installmentPaymentForm.notes = 'Payment for Installment #' + (inst.installmentNum || 'N/A');
    this.showPayInstallmentModal = true;
    this.cdr.detectChanges();
  }

  closePayInstallmentModal() {
    this.showPayInstallmentModal = false;
    this.selectedInstallmentToPay = null;
    this.cdr.detectChanges();
  }

  submitInstallmentPayment() {
    if (!this.selectedInstallmentToPay || !this.installmentPaymentForm.subAccountId || this.installmentPaymentForm.amount <= 0) return;
    this.isPayingInstallment = true;
    this.accountantService.repayCredit(
      this.selectedInstallmentToPay.credit.id,
      this.installmentPaymentForm.amount,
      this.installmentPaymentForm.subAccountId,
      this.installmentPaymentForm.notes,
      this.username
    ).subscribe({
      next: () => {
        this.isPayingInstallment = false;
        this.closePayInstallmentModal();
        this.showToast('Payment successful', 'success');
        this.loadLiabilitySummary();
        this.loadSubAccounts();
      },
      error: (err: any) => {
        this.isPayingInstallment = false;
        this.showToast('Failed to process payment', 'error');
        console.error(err);
      }
    });
  }

  get paginatedCredits(): any[] {
    const startIndex = (this.creditsCurrentPage - 1) * this.creditsPageSize;
    return this.credits.slice(startIndex, startIndex + this.creditsPageSize);
  }

  get totalCreditsPages(): number {
    return Math.ceil(this.credits.length / this.creditsPageSize) || 1;
  }

  get activeLoansCount(): number {
    return this.credits.filter(c => c.status === 'ACTIVE').length;
  }

  nextCreditsPage(): void {
    if (this.creditsCurrentPage < this.totalCreditsPages) {
      this.creditsCurrentPage++;
    }
  }

  prevCreditsPage(): void {
    if (this.creditsCurrentPage > 1) {
      this.creditsCurrentPage--;
    }
  }

  get creditsStartIndex(): number {
    if (this.credits.length === 0) return 0;
    return (this.creditsCurrentPage - 1) * this.creditsPageSize + 1;
  }

  get creditsEndIndex(): number {
    return Math.min(this.creditsCurrentPage * this.creditsPageSize, this.credits.length);
  }

  isTxLoading = false;
  txFilterTab: 'ALL' | 'INFLOW' | 'OUTFLOW' | 'INTERNAL' = 'ALL';
  txFilterType: 'ALL' | 'CREDIT' | 'DEBIT' = 'ALL';
  txFilterBankId: string = '';
  txFilterStartDate: string = '';
  txFilterEndDate: string = '';
  showTransactionTotals: boolean = false;

  // --- Payment Collection Redesign State ---
  isSendingReminder: Record<number, boolean> = {};
  recentStatusChange: Record<number, string> = {};
  toastState = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  };

  globalOverlay = {
    show: false,
    status: 'loading' as 'loading' | 'success' | 'error',
    message: '',
    icon: ''
  };

  // --- Internal Transfer State ---
  showInternalTransferModal = false;
  internalTransferStep: 'form' | 'processing' | 'success' | 'error' = 'form';
  internalTransferError: string = '';
  transferSourceId: number | null = null;
  transferDestId: number | null = null;
  transferAmount: number | null = null;
  transferDescription: string = '';
  isTransferring = false;

  openInternalTransferModal() {
    this.showInternalTransferModal = true;
    this.internalTransferStep = 'form';
    this.internalTransferError = '';
    this.transferSourceId = null;
    this.transferDestId = null;
    this.transferAmount = null;
    this.transferDescription = '';
  }

  closeInternalTransferModal() {
    this.showInternalTransferModal = false;
  }

  get isInternalTransferValid(): boolean {
    if (!this.transferSourceId || !this.transferDestId || !this.transferAmount || !this.transferDescription) {
      return false;
    }
    if (this.transferSourceId === this.transferDestId) return false;
    if (this.transferAmount <= 0) return false;
    if (this.hasInsufficientBalance()) return false;
    return true;
  }

  hasInsufficientBalance(): boolean {
    if (!this.transferSourceId || !this.transferAmount) return false;
    const sourceAcc = this.bankSubAccounts.find(acc => acc.id === this.transferSourceId);
    if (sourceAcc) {
      const availableBalance = sourceAcc.balance || 0;
      return this.transferAmount > availableBalance;
    }
    return false;
  }

  getSourceBalance(): number {
    if (!this.transferSourceId) return 0;
    const sourceAcc = this.bankSubAccounts.find(acc => acc.id === this.transferSourceId);
    return sourceAcc ? (sourceAcc.balance || 0) : 0;
  }

  submitInternalTransfer() {
    if (!this.transferSourceId || !this.transferDestId || !this.transferAmount || !this.transferDescription) {
      this.showToast('Please fill all required fields.', 'error');
      return;
    }
    if (!this.isInternalTransferValid) {
      return;
    }

    this.isTransferring = true;
    this.internalTransferStep = 'processing';
    this.internalTransferError = '';

    const payload = {
      sourceId: this.transferSourceId,
      destId: this.transferDestId,
      amount: this.transferAmount,
      description: this.transferDescription
    };

    const startTime = Date.now();
    this.http.post('http://localhost:8080/api/accountant/subaccounts/internal-transfer', payload).subscribe({
      next: (res: any) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1900 - elapsed);

        setTimeout(() => {
          this.isTransferring = false;
          this.internalTransferStep = 'success';
          this.loadSubAccounts(); // Refresh balances
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1900 - elapsed);

        setTimeout(() => {
          this.isTransferring = false;
          this.internalTransferStep = 'error';
          this.internalTransferError = err.error || 'Transaction Declined: Unable to process the transfer at this time.';
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }

  // ==========================================
  // WALLET LOGIC
  // ==========================================
  showFundWalletModal = false;
  fundWalletStep: 'form' | 'processing' | 'success' | 'error' = 'form';
  fundWalletError = '';
  fundWalletForm = {
    sourceId: null as number | null,
    destId: null as number | null,
    amount: null as number | null,
    reason: ''
  };
  isFundingWallet = false;

  openFundWalletModal() {
    this.showFundWalletModal = true;
    this.fundWalletStep = 'form';
    this.fundWalletError = '';
    const globalWallet = this.walletSubAccounts[0];
    this.fundWalletForm = { sourceId: null, destId: (globalWallet && globalWallet.id) ? globalWallet.id : null, amount: null, reason: '' };
  }

  closeFundWalletModal() {
    this.showFundWalletModal = false;
  }

  get isFundWalletValid(): boolean {
    const f = this.fundWalletForm;
    if (!f.sourceId || !f.destId || !f.amount || !f.reason) return false;
    if (f.amount <= 0) return false;

    // Check balance
    const sourceAcc = this.subAccounts.find(a => a.id === f.sourceId);
    if (sourceAcc && (sourceAcc.balance || 0) < f.amount) return false;

    return true;
  }

  submitFundWallet() {
    if (!this.isFundWalletValid) return;
    this.isFundingWallet = true;
    this.fundWalletStep = 'processing';
    this.fundWalletError = '';

    const payload = {
      sourceId: this.fundWalletForm.sourceId,
      destId: this.fundWalletForm.destId,
      amount: this.fundWalletForm.amount,
      description: 'Fund Wallet: ' + this.fundWalletForm.reason
    };

    const startTime = Date.now();
    this.http.post('http://localhost:8080/api/accountant/subaccounts/internal-transfer', payload).subscribe({
      next: () => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1500 - elapsed);
        setTimeout(() => {
          this.isFundingWallet = false;
          this.fundWalletStep = 'success';
          this.loadSubAccounts();
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1500 - elapsed);
        setTimeout(() => {
          this.isFundingWallet = false;
          this.fundWalletStep = 'error';
          this.fundWalletError = err.error?.message || err.error || 'Failed to fund wallet.';
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }

  showExpenseModal = false;
  expenseStep: 'form' | 'processing' | 'success' | 'error' = 'form';
  expenseError = '';
  expenseForm = {
    sourceId: null as number | null,
    amount: null as number | null,
    spenderName: '',
    expenseDate: new Date().toISOString().split('T')[0],
    category: 'Office Supplies',
    reason: ''
  };
  isRecordingExpense = false;

  expenseCategories = [
    'Visa Fee',
    'University Fee',
    'Package Settlement',
    'Metro / Transport',
    'Food & Meals',
    'Office Supplies',
    'Maintenance & Repairs',
    'Utilities & Internet',
    'Marketing & Advertising',
    'Software & Subscriptions',
    'Legal & Professional Fees',
    'Employee Welfare',
    'Postage & Courier',
    'Training & Development',
    'Events & Exhibitions',
    'Miscellaneous / Other'
  ];

  openExpenseModal(walletId: number) {
    this.showExpenseModal = true;
    this.expenseStep = 'form';
    this.expenseError = '';
    this.expenseForm = {
      sourceId: walletId,
      amount: null,
      spenderName: '',
      expenseDate: new Date().toISOString().split('T')[0],
      category: 'Office Supplies',
      reason: ''
    };
  }

  closeExpenseModal() {
    this.showExpenseModal = false;
  }

  get isExpenseValid(): boolean {
    const f = this.expenseForm;
    if (!f.sourceId || !f.amount || !f.spenderName || !f.expenseDate || !f.category || !f.reason) return false;
    if (f.amount <= 0) return false;
    return true;
  }

  submitExpense() {
    if (!this.isExpenseValid) return;
    this.isRecordingExpense = true;
    this.expenseStep = 'processing';
    this.expenseError = '';

    const payload = {
      sourceId: this.expenseForm.sourceId,
      amount: this.expenseForm.amount,
      withdrawerName: this.expenseForm.spenderName,
      withdrawnDate: this.expenseForm.expenseDate,
      transactionId: '',
      paymentMethod: 'CASH', // Locked to CASH for wallets
      chequeDetails: `[${this.expenseForm.category}] ${this.expenseForm.reason}` // Mapped to reason in backend
    };

    const startTime = Date.now();
    this.http.post('http://localhost:8080/api/accountant/subaccounts/withdraw', payload).subscribe({
      next: () => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1500 - elapsed);
        setTimeout(() => {
          this.isRecordingExpense = false;
          this.expenseStep = 'success';
          this.loadSubAccounts();
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1500 - elapsed);
        setTimeout(() => {
          this.isRecordingExpense = false;
          this.expenseStep = 'error';
          this.expenseError = err.error?.message || err.error || 'Failed to record expense.';
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }



  // --- Withdraw State ---
  showWithdrawModal = false;
  withdrawStep: 'form' | 'processing' | 'success' | 'error' = 'form';
  withdrawError: string = '';
  showWithdrawPaymentDropdown = false;
  withdrawForm = {
    sourceId: null as number | null,
    paymentMethod: 'CASH',
    withdrawerName: '',
    withdrawnDate: '',
    amount: null as number | null,
    transactionId: '',
    chequeDetails: ''
  };

  getWithdrawSelectedPaymentMethod() {
    return this.paymentMethods.find(p => p.id === this.withdrawForm.paymentMethod) || this.paymentMethods[1]; // default CASH
  }

  selectWithdrawPaymentMethod(methodId: string) {
    this.withdrawForm.paymentMethod = methodId;
    this.showWithdrawPaymentDropdown = false;
  }

  openWithdrawModal() {
    this.showWithdrawModal = true;
    this.withdrawStep = 'form';
    this.withdrawError = '';
    this.withdrawForm = {
      sourceId: null,
      paymentMethod: 'CASH',
      withdrawerName: '',
      withdrawnDate: new Date().toISOString().split('T')[0],
      amount: null,
      transactionId: '',
      chequeDetails: ''
    };
  }

  closeWithdrawModal() {
    this.showWithdrawModal = false;
  }

  get isWithdrawValid(): boolean {
    const f = this.withdrawForm;
    if (!f.sourceId || !f.paymentMethod || !f.withdrawerName || !f.withdrawnDate || !f.amount) {
      return false;
    }
    if (f.amount <= 0) return false;

    if (f.paymentMethod === 'CHEQUE') {
      if (!f.chequeDetails || f.chequeDetails.trim() === '') return false;
    }

    return true;
  }

  submitWithdrawal() {
    if (!this.isWithdrawValid) {
      this.showToast('Please fill all required fields correctly.', 'error');
      return;
    }

    this.withdrawStep = 'processing';
    this.withdrawError = '';

    const payload = { ...this.withdrawForm };

    const startTime = Date.now();
    this.http.post('http://localhost:8080/api/accountant/subaccounts/withdraw', payload).subscribe({
      next: (res: any) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        setTimeout(() => {
          this.withdrawStep = 'success';
          this.loadSubAccounts(); // Refresh balances
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        setTimeout(() => {
          this.withdrawStep = 'error';
          this.withdrawError = err.error || 'Transaction Declined: Unable to process the withdrawal at this time.';
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }
  // --- Funds Transfer State ---
  showFundsTransferModal = false;
  fundsTransferStep: 'form' | 'processing' | 'success' | 'error' = 'form';
  fundsTransferError: string = '';
  showFundsTransferPaymentDropdown = false;
  transferCategories = [
    'FEE SETTLEMENT', 'COURIER', 'VISA SERVICES', 'TRAVEL', 'FOOD', 'HOTEL & STAYS',
    'UNIVERSITY', 'TICKET', 'MARKETING', 'OFFICE EXPENSE', 'MISC'
  ];

  fundsTransferForm = {
    sourceId: null as number | null,
    destinationType: 'MANUAL' as 'BENEFICIARY' | 'MANUAL',
    beneficiaryId: null as number | null,
    paymentMethod: 'NEFT',

    // Manual Details
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
    chequeNumber: '',

    amount: null as number | null,
    category: 'FEE SETTLEMENT',
    reason: '',
    transactionId: '',
    transferDate: new Date().toISOString().split('T')[0]
  };

  getFundsTransferSelectedPaymentMethod() {
    return this.paymentMethods.find(p => p.id === this.fundsTransferForm.paymentMethod) || this.paymentMethods[0];
  }

  selectFundsTransferPaymentMethod(methodId: string) {
    this.fundsTransferForm.paymentMethod = methodId;
    this.showFundsTransferPaymentDropdown = false;
  }

  openFundsTransferModal() {
    this.showFundsTransferModal = true;
    this.fundsTransferStep = 'form';
    this.fundsTransferError = '';
    this.fundsTransferForm = {
      sourceId: null,
      destinationType: 'MANUAL',
      beneficiaryId: null,
      paymentMethod: 'NEFT',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      upiId: '',
      chequeNumber: '',
      amount: null,
      category: 'FEE SETTLEMENT',
      reason: '',
      transactionId: '',
      transferDate: new Date().toISOString().split('T')[0]
    };
  }

  closeFundsTransferModal() {
    this.showFundsTransferModal = false;
  }

  get isFundsTransferValid(): boolean {
    const f = this.fundsTransferForm;
    if (!f.sourceId || !f.amount || !f.transferDate || !f.category) return false;
    if (f.amount <= 0) return false;

    if (f.destinationType === 'BENEFICIARY' && !f.beneficiaryId) return false;

    if (f.destinationType === 'MANUAL') {
      if (f.paymentMethod === 'NEFT' || f.paymentMethod === 'IMPS' || f.paymentMethod === 'RTGS') {
        if (!f.accountNumber || !f.ifscCode || !f.accountHolderName) return false;
      } else if (f.paymentMethod === 'UPI') {
        if (!f.upiId) return false;
      } else if (f.paymentMethod === 'CHEQUE') {
        if (!f.chequeNumber) return false;
      }
    }

    return true;
  }

  submitFundsTransfer() {
    if (!this.isFundsTransferValid) {
      this.showToast('Please fill all required fields correctly.', 'error');
      return;
    }

    this.fundsTransferStep = 'processing';
    this.fundsTransferError = '';

    const f = this.fundsTransferForm;

    // Construct withdrawal name and chequeDetails for the backend /withdraw endpoint
    let beneficiaryName = '';
    let detailsStr = '';

    if (f.destinationType === 'BENEFICIARY') {
      const b = this.beneficiaries.find(ben => ben.id === Number(f.beneficiaryId));
      if (b) {
        beneficiaryName = b.beneficiaryName;
        if (f.paymentMethod === 'UPI') {
          detailsStr = `To Beneficiary: ${b.beneficiaryName} (UPI: ${b.upiId || 'N/A'})`;
        } else {
          detailsStr = `To Beneficiary: ${b.beneficiaryName} (A/C: ${b.accountNumber || 'N/A'}, Bank: ${b.bankName || 'N/A'})`;
        }
      } else {
        beneficiaryName = 'Unknown Beneficiary';
      }
    } else {
      // Manual
      if (f.paymentMethod === 'UPI') {
        beneficiaryName = f.upiId;
        detailsStr = `To UPI ID: ${f.upiId}`;
      } else if (f.paymentMethod === 'NEFT' || f.paymentMethod === 'IMPS' || f.paymentMethod === 'RTGS') {
        beneficiaryName = f.accountHolderName;
        detailsStr = `To: ${f.accountHolderName} | A/C: ${f.accountNumber} | IFSC: ${f.ifscCode}`;
      } else if (f.paymentMethod === 'CHEQUE') {
        beneficiaryName = 'Cheque Issuance';
        detailsStr = `Cheque No: ${f.chequeNumber}`;
      } else {
        beneficiaryName = 'Cash Transfer';
        detailsStr = 'Cash Transfer';
      }
    }

    detailsStr += ` | Purpose: [${f.category}] ${f.reason}`;

    const payload = {
      sourceId: f.sourceId,
      amount: f.amount,
      withdrawerName: beneficiaryName,
      withdrawnDate: f.transferDate,
      transactionId: f.transactionId,
      paymentMethod: f.paymentMethod,
      chequeDetails: detailsStr
    };

    const startTime = Date.now();
    this.http.post('http://localhost:8080/api/accountant/subaccounts/withdraw', payload).subscribe({
      next: (res: any) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        setTimeout(() => {
          this.fundsTransferStep = 'success';
          this.loadSubAccounts(); // Refresh balances
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        setTimeout(() => {
          this.fundsTransferStep = 'error';
          this.fundsTransferError = err.error?.message || err.error || 'Transaction Declined: Unable to process funds transfer.';
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }
  // --- Deposit State ---
  showDepositModal = false;
  depositStep: 'form' | 'processing' | 'success' | 'error' = 'form';
  depositError: string = '';
  depositForm = {
    destId: null as number | null,
    paymentMethod: 'NEFT',
    depositorName: '',
    depositedDate: '',
    amount: null as number | null,
    transactionId: ''
  };

  maxDate: string = new Date().toISOString().split('T')[0];

  showPaymentDropdown: boolean = false;
  paymentMethods = [
    { id: 'NEFT', label: 'NEFT', icon: 'M3 21h18M5 21V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13M9 21V10M15 21V10' }, // Bank
    { id: 'CASH', label: 'CASH', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' }, // Dollar
    { id: 'UPI', label: 'UPI Transfer', icon: 'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z' }, // Bookmark/Mobile
    { id: 'IMPS', label: 'IMPS', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' }, // Lightning
    { id: 'RTGS', label: 'RTGS', icon: 'M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3' }, // Repeat
    { id: 'CHEQUE', label: 'Cheque', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' } // File Text
  ];

  getPaymentMethodInfo(tx: any) {
    if (!tx) return null;

    let method = 'OTHER';
    const pm = tx.paymentMethod ? String(tx.paymentMethod).toUpperCase() : 'UNKNOWN';
    const desc = (tx.description || '').toLowerCase();

    if (pm !== 'UNKNOWN' && pm !== 'NULL' && pm !== '') {
      method = pm;
    } else {
      // Legacy fallback parsing
      if (desc.includes('neft')) method = 'NEFT';
      else if (desc.includes('cash')) method = 'CASH';
      else if (desc.includes('upi')) method = 'UPI';
      else if (desc.includes('imps')) method = 'IMPS';
      else if (desc.includes('rtgs')) method = 'RTGS';
      else if (desc.includes('cheque')) method = 'CHEQUE';
      else if (desc.includes('bank_transfer')) method = 'BANK_TRANSFER';
      else if (desc.includes('internal') || desc.includes('(to ') || desc.includes('(from ')) method = 'INTERNAL';
    }

    if (method === 'NEFT') return { label: 'NEFT', icon: 'M3 21h18M5 21V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13M9 21V10M15 21V10', color: '#6366f1', bg: '#e0e7ff' };
    if (method === 'CASH') return { label: 'CASH', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#10b981', bg: '#d1fae5' };
    if (method === 'UPI') return { label: 'UPI', icon: 'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z', color: '#8b5cf6', bg: '#ede9fe' };
    if (method === 'IMPS') return { label: 'IMPS', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', color: '#f59e0b', bg: '#fef3c7' };
    if (method === 'RTGS') return { label: 'RTGS', icon: 'M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3', color: '#0ea5e9', bg: '#e0f2fe' };
    if (method === 'CHEQUE') return { label: 'CHEQUE', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', color: '#f43f5e', bg: '#ffe4e6' };
    if (method === 'BANK_TRANSFER') return { label: 'BANK TRF', icon: 'M3 21h18M5 21V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13M9 21V10M15 21V10', color: '#0369a1', bg: '#e0f2fe' };
    if (method === 'INTERNAL') return { label: 'INTERNAL', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m4 5H4m0 0l4 4m-4-4l4-4', color: '#64748b', bg: '#f1f5f9' };
    if (method === 'LOAN') return { label: 'LOAN', icon: 'M3 21h18M5 21V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13M9 21V10M15 21V10', color: '#1d4ed8', bg: '#dbeafe' };
    if (method === 'LOAN_REPAYMENT') return { label: 'REPAYMENT', icon: 'M12 19V5m0 14l-4-4m4 4l4-4', color: '#059669', bg: '#d1fae5' };
    if (method === 'LOAN_FORECLOSURE') return { label: 'FORECLOSURE', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: '#dc2626', bg: '#fee2e2' };

    return { label: method === 'OTHER' ? 'OTHER' : method, icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#64748b', bg: '#f1f5f9' };
  }

  getSelectedPaymentMethod() {
    return this.paymentMethods.find(p => p.id === this.depositForm.paymentMethod) || this.paymentMethods[0];
  }

  selectPaymentMethod(methodId: string) {
    this.depositForm.paymentMethod = methodId;
    this.showPaymentDropdown = false;
  }


  openDepositModal() {
    this.showDepositModal = true;
    this.depositStep = 'form';
    this.depositError = '';
    this.depositForm = {
      destId: null,
      paymentMethod: 'NEFT',
      depositorName: '',
      depositedDate: '',
      amount: null,
      transactionId: ''
    };
  }

  closeDepositModal() {
    this.showDepositModal = false;
  }

  get isDepositValid(): boolean {
    const f = this.depositForm;
    if (!f.destId || !f.paymentMethod || !f.depositorName || !f.depositedDate || !f.amount) {
      return false;
    }
    if (f.amount <= 0) return false;
    return true;
  }

  submitDeposit() {
    if (!this.isDepositValid) {
      this.showToast('Please fill all required fields correctly.', 'error');
      return;
    }

    this.depositStep = 'processing';
    this.depositError = '';

    const payload = { ...this.depositForm };

    const startTime = Date.now();
    this.http.post('http://localhost:8080/api/accountant/subaccounts/deposit', payload).subscribe({
      next: (res: any) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        setTimeout(() => {
          this.depositStep = 'success';
          this.loadSubAccounts(); // Refresh balances
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        setTimeout(() => {
          this.depositStep = 'error';
          this.depositError = err.error || 'Transaction Declined: Unable to process the deposit at this time.';
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }

  // --- Sidebar Badges ---
  get visaFeeSettlementBadgeCount(): number {
    if (!this.visaPendingStudents) return 0;
    return this.visaPendingStudents.filter((s: any) => this.getFundReleaseStatus(s) === 'FUND_RELEASE_PENDING').length;
  }

  get paymentCollectionBadgeCount(): number {
    if (!this.activePaymentCollectionStudents) return 0;
    return this.activePaymentCollectionStudents.filter((s: any) => this.getCollectionStatus(s) !== 'PAID').length;
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toastState = { show: true, message, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toastState.show = false;
      this.cdr.detectChanges();
    }, 3500);
  }

  // Outstanding Recovery & Fund Release
  fundReleaseForms: { [studentId: number]: any } = {};
  fundReleaseFiles: { [studentId: number]: File } = {};
  showInlineReleaseFund: boolean = false;

  // Partial Payment & Cash Settlement
  showCashSettlementModal: boolean = false;
  cashSettlementData: any = { depositType: 'BANK', amount: 0, date: '', subAccountId: '', remarks: '', file: null };

  // Transaction History Sidebar
  isPaymentSidebarOpen: boolean = false;
  selectedPaymentTransactions: any[] = [];
  selectedStudentForTransactions: any = null;
  isLoadingTransactions: boolean = false;

  Math = Math;
  outstandingRecoveryData: any[] = [];

  get filteredTransactions(): any[] {
    return this.subAccountTransactions.filter(tx => {
      const matchType = this.txFilterType === 'ALL' || tx.transactionType === this.txFilterType;
      const txDate = new Date(tx.transactionDate);
      const matchStart = !this.txFilterStartDate || txDate >= new Date(this.txFilterStartDate);

      // End date should include the whole day
      let matchEnd = true;
      if (this.txFilterEndDate) {
        const endDate = new Date(this.txFilterEndDate);
        endDate.setHours(23, 59, 59, 999);
        matchEnd = txDate <= endDate;
      }

      return matchType && matchStart && matchEnd;
    });
  }

  get totalFilteredCredit(): number {
    return this.filteredTransactions
      .filter(tx => tx.transactionType === 'CREDIT')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  get totalFilteredDebit(): number {
    return this.filteredTransactions
      .filter(tx => tx.transactionType === 'DEBIT')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  // UI State
  selectedSettlementStudent: any = null;
  activeView: 'dashboard' | 'pending' | 'payment-collection' | 'subaccounts' | 'beneficiaries' | 'transactions' | 'recovery' | 'credit-ledger' | 'reports' | 'settings' | 'profile' | 'approved' | 'rejected' | 'funds' | 'visa-accounts' | 'all-students' | 'tasks' = 'dashboard';

  // Payment Collection Sub-tab
  activePaymentCollectionTab: 'all' | 'needs-request' | 'pending' | 'partially-paid' | 'paid' | 'excess' = 'all';

  isSidebarCollapsed = false;

  // History Modal State
  showHistoryModal: boolean = false;
  selectedHistoryRequest: any = null;

  openHistoryModal(req: any): void {
    this.selectedHistoryRequest = req;
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedHistoryRequest = null;
  }

  // Transaction History Sidebar Methods
  openPaymentHistorySidebar(student: any): void {
    this.selectedStudentForTransactions = student;
    this.isPaymentSidebarOpen = true;
    this.isLoadingTransactions = true;
    this.selectedPaymentTransactions = [];

    // Fetch from backend
    this.http.get<any[]>(`${environment.apiUrl}/api/visa/payment-transactions/${student.id}`).subscribe({
      next: (data) => {
        this.selectedPaymentTransactions = data;
        this.isLoadingTransactions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching transactions', err);
        this.isLoadingTransactions = false;
        this.cdr.detectChanges();
      }
    });
  }

  closePaymentHistorySidebar(): void {
    this.isPaymentSidebarOpen = false;
    this.selectedStudentForTransactions = null;
    this.selectedPaymentTransactions = [];
  }

  getRoleIconAndColor(role: string): { icon: string, color: string, bg: string } {
    if (!role) return { icon: 'fas fa-user', color: '#6b7280', bg: '#f3f4f6' };
    switch (role.toUpperCase()) {
      case 'ACCOUNTANT': return { icon: 'fas fa-calculator', color: '#4f46e5', bg: '#e0e7ff' };
      case 'AGENT': return { icon: 'fas fa-user-tie', color: '#d97706', bg: '#fef3c7' };
      case 'VISA_MANAGER': return { icon: 'fas fa-id-card', color: '#059669', bg: '#d1fae5' };
      default: return { icon: 'fas fa-user', color: '#6b7280', bg: '#f3f4f6' };
    }
  }

  getTxnTypeColor(type: string): { color: string, bg: string } {
    if (!type) return { color: '#6b7280', bg: '#f3f4f6' };
    if (type.includes('CONFIRMED') || type.includes('RECEIVED') || type === 'AGENT_PAID') return { color: '#059669', bg: '#d1fae5' }; // Emerald
    if (type.includes('REQUESTED') || type.includes('SENT')) return { color: '#ea580c', bg: '#ffedd5' }; // Orange
    if (type.includes('PAID')) return { color: '#0284c7', bg: '#e0f2fe' }; // Blue
    if (type.includes('REJECTED') || type.includes('FAILED')) return { color: '#dc2626', bg: '#fee2e2' }; // Red
    return { color: '#4b5563', bg: '#f3f4f6' }; // Gray
  }

  getBeneficiaryTypeDetails(type: string): { icon: string, color: string, bg: string } {
    if (!type) return { icon: 'M12 4v16m8-8H4', color: '#6b7280', bg: '#f3f4f6' };
    const t = type.toLowerCase();
    if (t.includes('university')) return { icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z', color: '#4f46e5', bg: '#e0e7ff' }; // Indigo
    if (t.includes('visa')) return { icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M2 10h20', color: '#059669', bg: '#d1fae5' }; // Emerald
    if (t.includes('travel')) return { icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z', color: '#0ea5e9', bg: '#e0f2fe' }; // Sky Blue
    if (t.includes('courier')) return { icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12', color: '#d97706', bg: '#fef3c7' }; // Amber
    if (t.includes('agent')) return { icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', color: '#8b5cf6', bg: '#ede9fe' }; // Violet
    if (t.includes('admission')) return { icon: 'M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z M10 2c1 .5 2 2 2 5', color: '#f43f5e', bg: '#ffe4e6' }; // Rose
    if (t.includes('freelancer')) return { icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', color: '#14b8a6', bg: '#ccfbf1' }; // Teal
    return { icon: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#475569', bg: '#f1f5f9' }; // Slate
  }

  getPendingAmount(req: any): number {
    return (req.remainingAmount !== undefined) ? req.remainingAmount : Math.max(0, (req.requestedAmount || 0) - (req.amountPaid || 0));
  }
  isLoading = true;
  isRefreshing = false;
  isSubmitting = false;
  searchTerm = '';
  isFullscreen = false;
  activeVerificationTab: 'telex' | 'visa' = 'telex';

  // Rejection Remarks
  rejectionRemarks: string = '';

  // Verification Filters
  verificationFilterPaidTo: string = 'ALL';

  // Accounts Section Filters
  accountsFilterType: string = 'ALL'; // ALL, VISA, AGENT
  reportViewMode: 'agent' | 'college' = 'agent';
  accountsSearchTerm: string = '';

  // Reports Section
  reportDateFrom: string = '';
  reportDateTo: string = '';
  reportPaidToFilter: string = 'ALL';

  // Modals
  showDetailModal = false;
  showApproveModal = false;
  showRejectModal = false;
  // Success Modal State
  showSuccessModal = false;
  successMessage = '';
  successTitle = 'Payment Verified!';

  // Approve Form
  approveForm = {
    receivedAmount: null as number | null,
    receivedDate: ''
  };

  // --- Beneficiary Accounts State ---
  beneficiaries: any[] = [];
  isBeneficiaryWizardOpen = false;
  beneficiaryWizardStep = 1;
  newBeneficiary: any = {
    beneficiaryType: 'Visa Manager',
    beneficiaryName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    upiId: '',
    mobileNumber: '',
    emailAddress: '',
    status: 'Active'
  };

  // Visa Payment Modal States
  showSendBankDetailsModal = false;
  showConfirmPaymentModal = false;
  processingId: number | null = null;

  // Visa Payment Form Data
  bankDetailsAmount: number = 0;
  bankDetailsCurrency: string = 'INR';
  bankName: string = '';
  accountNumber: string = '';
  swiftCode: string = '';
  beneficiaryName: string = '';

  // Dropdown state for tables
  activeDropdownId: number | null = null;

  toggleDropdown(id: number, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownId === id) {
      this.activeDropdownId = null;
    } else {
      this.activeDropdownId = id;
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activeDropdownId = null;
  }
  branchAddress: string = '';

  // New Collections & Fund Release State
  collectionRequests: any[] = [];
  filteredCollectionRequests: any[] = [];
  fundReleases: any[] = [];
  selectedSubAccountId: number | null = null;
  receivedAmount: number = 0;
  receivedDate: string = '';

  // Pay Visa Man Form Data
  showPayVisaManModal = false;
  payVisaManForm = {
    amountToPay: null as number | null,
    mode: 'UPI',
    txId: '',
    paymentDate: '',
    subAccountId: null as number | null
  };

  // Add Funds (Credit) Modal State
  showAddFundsModal = false;
  creditForm: AccountantCredit = {
    amount: 0,
    method: 'FRIEND',
    creditDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    interestRate: 0,
    friendName: '',
    friendPhone: '',
    bankName: '',
    loanTenureMonths: 0,
    cardInfo: '',
    emiDetails: '',
    totalRepaymentAmount: 0,
    installmentAmount: 0,
    repaymentStructure: 'LUMP_SUM'
  };

  // Logout
  isLogoutModalOpen = false;
  isLoggingOut = false;
  logoutMessages = [
    'Great work verifying payments today!',
    'Financial accuracy matters. Thank you!',
    'Your diligence keeps the process running smoothly!',
    'See you next time. Take care!',
    'Every verification counts. Well done!'
  ];
  currentLogoutMessage = '';

  // --- Reports State ---
  reportCategories = [
    {
      name: 'FINANCIAL REPORTS',
      reports: [
        { id: 'profit-loss-statement', name: 'Profit & Loss Statement', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#10b981', bg: '#ecfdf5' }, // Green (Money)
        { id: 'balance-sheet', name: 'Balance Sheet', icon: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3', color: '#6366f1', bg: '#e0e7ff' }, // Indigo (Chart)
        { id: 'cash-book', name: 'Cash Book', icon: 'M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z', color: '#f59e0b', bg: '#fef3c7' }, // Amber (Wallet)
        { id: 'bank-book', name: 'Bank Book', icon: 'M4 19h16M2 23h20M12 2L2 7l10 5 10-5-10-5zM4 10v9M20 10v9M8 10v9M16 10v9', color: '#3b82f6', bg: '#eff6ff' }, // Blue (Bank)
        { id: 'general-ledger', name: 'General Ledger', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', color: '#8b5cf6', bg: '#f5f3ff' }, // Violet (Book)
        { id: 'unified-transaction-summary', name: 'Unified User Transaction Summary', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 14v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75', color: '#ec4899', bg: '#fdf2f8' } // Pink (Users)
      ]
    },
    {
      name: 'COLLECTION REPORTS',
      reports: [
        { id: 'collection-summary', name: 'Collection Summary', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', color: '#0ea5e9', bg: '#e0f2fe' }, // Sky
        { id: 'student-collection', name: 'Student Collection', icon: 'M12 14v4M12 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', color: '#14b8a6', bg: '#ccfbf1' }, // Teal
        { id: 'student-detailed-statement', name: 'Student Detailed Statement', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', color: '#06b6d4', bg: '#cffafe' }, // Cyan
        { id: 'agent-collection', name: 'Agent Collection', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', color: '#f43f5e', bg: '#ffe4e6' }, // Rose
        { id: 'agent-detailed-statement', name: 'Agent Detailed Statement', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', color: '#d946ef', bg: '#fae8ff' }, // Fuchsia
        { id: 'agent-college-wise', name: 'Agent College-Wise Performance', icon: 'M12 20V10M18 20V4M6 20v-4', color: '#84cc16', bg: '#ecfccb' }, // Lime
        { id: 'university-collection', name: 'University Collection', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 0 1 .665 6.479A11.952 11.952 0 0 0 12 20.055a11.952 11.952 0 0 0-6.824-2.998 12.078 12.078 0 0 1 .665-6.479L12 14z M12 14v7', color: '#3b82f6', bg: '#eff6ff' }, // Blue
        { id: 'purpose-wise-collection', name: 'Purpose Wise Collection', icon: 'M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z', color: '#a855f7', bg: '#f3e8ff' } // Purple
      ]
    },
    {
      name: 'TRANSACTION REPORTS',
      reports: [
        { id: 'transaction-summary', name: 'Transaction Summary', icon: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7', color: '#f97316', bg: '#ffedd5' }, // Orange
        { id: 'inflow-report', name: 'Inflow Report', icon: 'M12 19V5M5 12l7-7 7 7', color: '#10b981', bg: '#ecfdf5' }, // Green (Arrow Up)
        { id: 'outflow-report', name: 'Outflow Report', icon: 'M12 5v14M19 12l-7 7-7-7', color: '#ef4444', bg: '#fef2f2' } // Red (Arrow Down)
      ]
    },
    {
      name: 'ACCOUNT & OTHER REPORTS',
      reports: [
        { id: 'account-statement', name: 'Account Statement', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', color: '#64748b', bg: '#f1f5f9' }, // Slate
        { id: 'beneficiary-report', name: 'Beneficiary Report', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', color: '#eab308', bg: '#fef9c3' }, // Yellow
        { id: 'fund-request-report', name: 'Fund Request Report', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: '#0ea5e9', bg: '#e0f2fe' }, // Sky Blue
        { id: 'credit-loan-report', name: 'Credit / Loan Report', icon: 'M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z', color: '#f43f5e', bg: '#ffe4e6' }, // Rose
        { id: 'interest-report', name: 'Interest Report', icon: 'M23 6l-9.5 9.5-5-5L1 18', color: '#8b5cf6', bg: '#f5f3ff' } // Violet
      ]
    }
  ];

  selectedReportCategory: string | null = null;
  selectedReportId: string | null = null;
  selectedReportName: string | null = null;
  selectedReportConfig: any = null;
  reportData: ReportResponseDTO | null = null;
  isReportLoading: boolean = false;
  reportSearch: string = '';
  reportDateRange: string = 'month';

  activeReportTab: string = 'All Reports';

  get filteredReportCategories() {
    if (this.activeReportTab === 'All Reports') {
      return this.reportCategories;
    }
    return this.reportCategories.filter(c => c.name.toLowerCase().includes(this.activeReportTab.toLowerCase().replace(' reports', '')));
  }

  constructor(
    private accountantService: AccountantService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private beneficiaryService: BeneficiaryService,
    private http: HttpClient,
    private paymentRequestService: PaymentRequestService,
    private fileService: FileService,
    private sanitizer: DomSanitizer,
    private reportService: ReportService
  ) { }

  getBackendCategory(categoryName: string): string {
    return categoryName.toLowerCase().replace(/ & other/g, '').replace(/ & /g, '-').replace(/ /g, '-');
  }

  selectReport(categoryName: string, report: any) {
    this.selectedReportCategory = this.getBackendCategory(categoryName);
    this.selectedReportId = report.id;
    this.selectedReportName = report.name;
    this.selectedReportConfig = report;
    this.fetchReportData();
  }

  closeReport() {
    this.selectedReportId = null;
    this.selectedReportName = null;
    this.selectedReportConfig = null;
    this.reportData = null;
  }

  onDateRangeChange() {
    if (this.reportDateRange !== 'custom') {
      this.reportDateFrom = '';
      this.reportDateTo = '';
    }
    this.fetchReportData();
  }

  onCustomDateChange() {
    if (this.reportDateFrom || this.reportDateTo) {
      this.reportDateRange = 'custom';
    }
  }

  resetReportFilters() {
    this.reportDateRange = 'month';
    this.reportDateFrom = '';
    this.reportDateTo = '';
    this.reportSearch = '';
    this.fetchReportData();
  }

  fetchReportData() {
    if (!this.selectedReportCategory || !this.selectedReportId) return;

    this.isReportLoading = true;

    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;
    const today = new Date();

    if (this.reportDateRange === 'custom') {
      startDate = this.reportDateFrom || undefined;
      endDate = this.reportDateTo || undefined;
    } else if (this.reportDateRange !== 'all') {
      const getLocalDateStr = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      };
      endDate = getLocalDateStr(today);
      const start = new Date(today);
      if (this.reportDateRange === 'today') {
        // start is today
      } else if (this.reportDateRange === 'week') {
        start.setDate(today.getDate() - 7);
      } else if (this.reportDateRange === 'month') {
        start.setMonth(today.getMonth() - 1);
      } else if (this.reportDateRange === 'year') {
        start.setMonth(today.getMonth() - 12);
      }
      startDate = getLocalDateStr(start);
    }

    const req: ReportRequest = {
      category: this.selectedReportCategory,
      reportName: this.selectedReportId,
      page: 0,
      size: 50,
      search: this.reportSearch,
      startDate: startDate,
      endDate: endDate
    };

    this.reportService.getReportData(req).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isReportLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch report', err);
        this.reportData = null;
        this.isReportLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  exportReport(format: 'pdf' | 'excel') {
    if (!this.selectedReportCategory || !this.selectedReportId) return;

    const req: ReportRequest = {
      category: this.selectedReportCategory,
      reportName: this.selectedReportId,
      page: 0,
      size: 50,
      search: this.reportSearch,
      startDate: this.reportDateRange === 'custom' ? (this.reportDateFrom || undefined) : undefined,
      endDate: this.reportDateRange === 'custom' ? (this.reportDateTo || undefined) : undefined
    };

    // If using predefined range, calculate it for export
    if (this.reportDateRange !== 'custom' && this.reportDateRange !== 'all') {
      const today = new Date();
      const getLocalDateStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      req.endDate = getLocalDateStr(today);
      const start = new Date(today);
      if (this.reportDateRange === 'week') start.setDate(today.getDate() - 7);
      else if (this.reportDateRange === 'month') start.setMonth(today.getMonth() - 1);
      else if (this.reportDateRange === 'year') start.setMonth(today.getMonth() - 12);
      req.startDate = getLocalDateStr(start);
    }

    this.reportService.exportReport(req, format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.selectedReportId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Export failed', err);
        this.showToast('Export failed. Make sure the backend is running and the report is implemented.', 'error');
      }
    });
  }

  exportReportFromCard(category: string, report: any, format: 'pdf' | 'excel') {
    // List of reports that require user input (like search/filtering) before downloading
    const requiresInputReports = [
      'student-detailed-statement',
      'agent-detailed-statement',
      'agent-college-wise'
    ];

    if (requiresInputReports.includes(report.id)) {
      this.showToast(`The ${report.name} requires specific filters. Please click 'View Report' to select options before downloading.`, 'info');
      return;
    }

    // Convert category to backend format
    const backendCategory = this.getBackendCategory(category);

    // For reports that don't strictly require input, download directly with default parameters
    const req: ReportRequest = {
      category: backendCategory,
      reportName: report.id,
      page: 0,
      size: 50,
      search: '' // default empty search
    };

    this.reportService.exportReport(req, format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.id}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Export failed', err);
        this.showToast('Export failed. Make sure the backend is running and the report is implemented.', 'error');
      }
    });
  }

  ngOnInit(): void {
    this.username = sessionStorage.getItem('userId') || '';
    this.loadDashboardData();
    this.loadSubAccounts();
    this.fetchOutstandingRecovery();
    this.loadBeneficiaries();
    this.loadFundReleases();
    this.loadAlerts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading ---

  loadPassbooks(): void {
    this.loadLiabilitySummary(); // Added to refresh liability summary whenever passbooks are refreshed

    this.accountantService.getVisaManPassbooks()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.visaManPassbooks = data;
        this.cdr.detectChanges();
      });

    this.accountantService.getAgentPassbooks()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.agentPassbooks = data;
        this.cdr.detectChanges();
      });

    this.accountantService.getAllCredits(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.credits = data || [];
        this.cdr.detectChanges();
      });
  } // <-- Added closing brace for loadPassbooks()

  // --- Liability Dashboard Properties ---
  calendarInstallments: any[] = [];
  activeLiabilityTab: 'credits' | 'calendar' = 'credits';

  // --- Alerts Properties ---
  alerts: any[] = [];
  unreadAlertsCount: number = 0;
  showNotificationsModal: boolean = false;

  loadAlerts(): void {
    if (!this.username) return;
    this.accountantService.getFinancialAlerts(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.alerts = data;
          this.unreadAlertsCount = this.alerts.filter(a => !a.read).length;
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading alerts:', err)
      });
  }

  markAlertAsRead(alert: any): void {
    if (alert.read) return;
    this.accountantService.markAlertAsRead(alert.id).subscribe({
      next: () => {
        alert.read = true;
        this.unreadAlertsCount = this.alerts.filter(a => !a.read).length;
        this.cdr.detectChanges();
      }
    });
  }

  openNotificationsModal(): void {
    this.showNotificationsModal = true;
  }

  closeNotificationsModal(): void {
    this.showNotificationsModal = false;
  }

  loadLiabilitySummary(): void {
    if (!this.username) return;
    this.accountantService.getLiabilityDashboardSummary(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.liabilitySummary = data;
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading liability summary:', err)
      });

    this.accountantService.getLiabilityCalendar(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.calendarInstallments = data;
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading liability calendar:', err)
      });
  }

  loadFundReleases(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/fund-release/all`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.fundReleases = res;
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Failed to load fund releases', err)
      });
  }

  loadDashboardData(): void {
    this.loadPassbooks();
    this.loadFundRequests();
    this.loadSubAccounts();
    this.loadAllTransactions(); // Ensure all transactions are loaded for dashboard widgets
    if (!this.username) {
      this.isLoading = false;
      this.router.navigate(['/AdminLogin']);
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (this.isLoading || this.isRefreshing) {
        console.warn('Loading timeout - resetting loading states');
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      }
    }, 15000);

    // Fetch all dashboard data concurrently
    this.accountantService.getAllDashboardData(this.username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          clearTimeout(safetyTimeout);
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: any) => {
          this.stats = data.stats;
          this.collections = data.collections;
          this.activities = data.activities;
          this.students = data.students;
          this.filteredStudents = [...this.students];

          // Animate counters
          this.animateCounters();

          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error loading dashboard data:', error);
          // Fallback to original API if new endpoints don't exist
          this.loadFallbackData();
        }
      });

    // Also get accountant profile with full student data
    this.accountantService.getAccountantDetails(this.username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.accountantData = data;

          // Use the full student data from accountant profile (includes action, actionOnUser, visa fields)
          if (data.students && data.students.length > 0) {
            this.students = data.students.map((s: any) => ({
              id: s.id,
              studentId: s.id,
              applicationId: s.applicationId || '',
              fullName: s.fullName,
              email: s.email,
              contactNo: s.contactNo,
              applicationStatus: s.applicationStatus,
              paymentStatus: s.paymentStatus || 'Pending',
              hasPaid: s.hasPaid,
              paidAmount: s.paidAmount,
              paidTo: s.paidTo,
              ttCopyPath: s.ttCopyPath,
              paymentConfirmationPath: s.paymentConfirmationPath,
              // Visa payment workflow fields from full student data
              action: s.action,
              actionOnUser: s.actionOnUser,
              visaPaymentRequestedAmount: s.visaPaymentRequestedAmount,
              visaPaymentRequestedCurrency: s.visaPaymentRequestedCurrency,
              visaManServiceCharge: s.visaManServiceCharge,
              visaPaymentTxId: s.visaPaymentTxId,
              visaPaymentConfirmationPath: s.visaPaymentConfirmationPath,
              visaPaymentReceivedAmount: s.visaPaymentReceivedAmount,
              visaPaymentReceivedDate: s.visaPaymentReceivedDate,
              // Accountant -> VisaMan payout tracking (banking ledger)
              accToVisaManPaidAmount: s.accToVisaManPaidAmount,
              accToVisaManPaymentDate: s.accToVisaManPaymentDate,
              accToVisaManTxId: s.accToVisaManTxId,
              accToVisaManMode: s.accToVisaManMode,
              accToVisaManStatus: s.accToVisaManStatus || 'PENDING',
              visaMan: s.visaMan,
              agentFullName: s.agentFullName || s.agent?.fullName,
              collegeName: s.collegeName || s.college?.collegeName,
              appliedFor: s.appliedFor,
              paymentRejectionRemarks: s.paymentRejectionRemarks,
              visaManFullName: s.visaManFullName || s.visaMan?.fullName,
              agentUserFullName: s.agentUserFullName || s.agent?.fullName
            }));
            this.filteredStudents = [...this.students];

            // Update selectedSettlementStudent reference so UI updates automatically
            if (this.selectedSettlementStudent) {
              const updated = this.students.find(s => s.id === this.selectedSettlementStudent.id);
              if (updated) {
                this.selectedSettlementStudent = updated;
              }
            }
          }

          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading accountant profile:', err)
      });

    // Fetch Collection Requests
    this.http.get<any[]>(`${environment.apiUrl}/api/collections/all`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.collectionRequests = data;
          this.filteredCollectionRequests = [...data];
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading collections', err)
      });
  }

  loadFallbackData(): void {
    // Fallback to original API structure
    this.accountantService.getAccountantDetails(this.username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: any) => {
          this.accountantData = data;
          const students = data.students || [];

          // Calculate stats from students
          const pending = students.filter((s: { hasPaid: any; paymentStatus: string; }) => s.hasPaid && s.paymentStatus !== 'Received' && s.paymentStatus !== 'Not Received');
          const received = students.filter((s: { paymentStatus: string; applicationStatus: string; }) => s.paymentStatus === 'Received' || s.applicationStatus === 'FEE_RECEIVED');
          const notReceived = students.filter((s: { paymentStatus: string; applicationStatus: string; }) => s.paymentStatus === 'Not Received' || s.applicationStatus === 'PAYMENT_NOT_RECEIVED');

          // Compute visa totals from student data (banking ledger consistency)
          const totalVisaReq = students.reduce((sum: any, s: any) => {
            return sum + ((s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0));
          }, 0);
          const totalVisaPaid = students.reduce((sum: any, s: any) => {
            return sum + (s.accToVisaManPaidAmount || 0);
          }, 0);

          this.stats = {
            totalStudentsAssigned: students.length,
            pendingPayments: pending.length,
            paymentsReceived: received.length,
            paymentsNotReceived: notReceived.length,
            totalAmountReceived: received.reduce((sum: any, s: { paidAmount: any; }) => sum + (s.paidAmount || 0), 0),
            totalAmountPending: pending.reduce((sum: any, s: { paidAmount: any; }) => sum + (s.paidAmount || 0), 0),
            totalVisaRequestedByVisaMan: totalVisaReq,
            totalAccToVisaManPaidAmount: totalVisaPaid
          };

          // Map to AssignedStudent format
          this.students = students.map((s: { id: any; applicationId: any; fullName: any; email: any; contactNo: any; applicationStatus: any; paymentStatus: any; hasPaid: any; paidAmount: any; paidTo: any; ttCopyPath: any; paymentConfirmationPath: any; }) => ({
            studentId: s.id,
            applicationId: s.applicationId,
            fullName: s.fullName,
            email: s.email,
            contactNo: s.contactNo,
            applicationStatus: s.applicationStatus,
            paymentStatus: s.paymentStatus || 'Pending',
            hasPaid: s.hasPaid,
            paidAmount: s.paidAmount,
            paidTo: s.paidTo,
            ttCopyPath: s.ttCopyPath,
            paymentConfirmationPath: s.paymentConfirmationPath,
            // Visa payment workflow fields
            action: (s as any).action,
            actionOnUser: (s as any).actionOnUser,
            visaPaymentRequestedAmount: (s as any).visaPaymentRequestedAmount,
            visaPaymentRequestedCurrency: (s as any).visaPaymentRequestedCurrency,
            visaManServiceCharge: (s as any).visaManServiceCharge,
            visaPaymentTxId: (s as any).visaPaymentTxId,
            visaPaymentConfirmationPath: (s as any).visaPaymentConfirmationPath,
            visaPaymentReceivedAmount: (s as any).visaPaymentReceivedAmount,
            visaPaymentReceivedDate: (s as any).visaPaymentReceivedDate,
            // Accountant -> VisaMan payout tracking (banking ledger)
            accToVisaManPaidAmount: (s as any).accToVisaManPaidAmount,
            accToVisaManPaymentDate: (s as any).accToVisaManPaymentDate,
            accToVisaManTxId: (s as any).accToVisaManTxId,
            accToVisaManMode: (s as any).accToVisaManMode,
            accToVisaManStatus: (s as any).accToVisaManStatus || 'PENDING',
            visaMan: (s as any).visaMan,
            agentFullName: (s as any).agentFullName || (s as any).agent?.fullName,
            collegeName: (s as any).collegeName || (s as any).college?.collegeName,
            appliedFor: (s as any).appliedFor,
            paymentRejectionRemarks: (s as any).paymentRejectionRemarks,
            visaManFullName: (s as any).visaManFullName || (s as any).visaMan?.fullName,
            agentUserFullName: (s as any).agentUserFullName || (s as any).agent?.fullName
          }));
          this.filteredStudents = [...this.students];

          this.animateCounters();
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading fallback data:', err)
      });
  }

  loadSubAccounts(): void {
    this.accountantService.getSubAccounts().subscribe({
      next: (data: SubAccount[]) => {
        this.subAccounts = data;
        this.cdr.detectChanges();
        this.ensureGlobalPettyCashExists();
      },
      error: (err: any) => {
        console.error('Error fetching SubAccounts', err);
      }
    });
  }

  private isEnsuringWallet = false;

  ensureGlobalPettyCashExists(): void {
    if (this.isEnsuringWallet) return;
    const existingWallet = this.subAccounts.find(acc => acc.accountType === 'WALLET');
    if (!existingWallet) {
      this.isEnsuringWallet = true;
      const payload: any = {
        bankName: 'Global Petty Cash',
        accountNumber: 'PETTYCASH-' + Date.now(),
        accountType: 'WALLET',
        branchAddress: 'HQ',
        beneficiaryName: 'Accountant'
      };
      this.accountantService.createSubAccount(payload).pipe(finalize(() => this.isEnsuringWallet = false)).subscribe({
        next: (saved: SubAccount) => {
          this.subAccounts.push(saved);
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Failed to auto-create Global Petty Cash Wallet', err)
      });
    }
  }

  // Add/Update SubAccount
  openAddSubAccountModal(): void {
    this.newSubAccount = { bankName: '', accountNumber: '', swiftBic: '', beneficiaryName: '', branchAddress: '', relationshipManager: '', accountType: 'BANK', cashAccountName: '' };
    this.showAddSubAccountModal = true;
  }

  isSubAccountFormValid(): boolean {
    if (this.newSubAccount.accountType === 'BANK') {
      return !!this.newSubAccount.bankName && !!this.newSubAccount.accountNumber;
    } else {
      return !!this.newSubAccount.cashAccountName;
    }
  }

  closeAddSubAccountModal(): void {
    this.showAddSubAccountModal = false;
  }

  submitSubAccount(): void {
    if (this.newSubAccount.accountType === 'BANK') {
      if (!this.newSubAccount.bankName || !this.newSubAccount.accountNumber) return;
    } else if (this.newSubAccount.accountType === 'CASH') {
      if (!this.newSubAccount.cashAccountName) return;
      this.newSubAccount.bankName = this.newSubAccount.cashAccountName;
      this.newSubAccount.accountNumber = 'CASH-' + Date.now();
    }
    this.isSubmitting = true;
    this.cdr.detectChanges();

    this.accountantService.createSubAccount(this.newSubAccount)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (saved: SubAccount) => {
          this.subAccounts.push(saved);
          this.closeAddSubAccountModal();
          this.showSuccess('Bank account has been added successfully!', 'Bank Account Added!');
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error saving subaccount', err);
          this.showErrorToast('Failed to create Bank Account. Please try again.');
        }
      });
  }

  // --- Transactions Modal ---
  viewTransactions(acc: any): void {
    this.selectedSubAccountForTx = acc;
    this.subAccountTransactions = [];
    this.isTxLoading = true;
    this.cdr.detectChanges();

    this.http.get<any[]>(`http://localhost:8080/api/accountant/subaccounts/${acc.id}/transactions`)
      .pipe(finalize(() => { this.isTxLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          this.subAccountTransactions = res;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to fetch transactions', err);
          this.showErrorToast('Failed to load transaction history');
        }
      });
  }

  closeTransactionsModal(): void {
    this.selectedSubAccountForTx = null;
    this.subAccountTransactions = [];
    this.txFilterType = 'ALL';
    this.txFilterStartDate = '';
    this.txFilterEndDate = '';
    this.cdr.detectChanges();
  }

  loadAllTransactions(): void {
    if (this.showAdvancedTxFilters) {
      this.applyAdvancedTxFilters();
      return;
    }
    this.isTxLoading = true;
    this.accountantService.getAllSubAccountTransactions(
      this.transactionCurrentPage,
      this.transactionPageSize,
      this.txFilterBankId || undefined,
      this.txFilterStartDate || undefined,
      this.txFilterEndDate || undefined
    ).subscribe({
      next: (res: any) => {
        this.isTxLoading = false;
        this.allTransactions = res.content || [];
        this.transactionTotalPages = res.totalPages || 0;
        this.transactionTotalElements = res.totalElements || 0;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to fetch all transactions', err);
        this.isTxLoading = false;
        this.showErrorToast('Failed to load transactions');
      }
    });
  }

  loadAdvancedFilterOptions(): void {
    this.accountantService.getAdvancedFilterOptions().subscribe({
      next: (res: any) => {
        this.uniqueAdvAgents = res.agents || [];
        this.uniqueAdvDocManagers = res.docManagers || [];

        // Backend doesn't reliably return visaManagers, extract them locally
        const vmSet = new Set<string>(res.visaManagers || []);
        this.visaManPassbooks.forEach((pb: any) => {
          if (pb.requesterFullName) vmSet.add(pb.requesterFullName);
          else if (pb.requesterName) vmSet.add(pb.requesterName);
        });
        this.uniqueAdvVisaManagers = Array.from(vmSet).sort();

        this.uniqueAdvColleges = res.colleges || [];
      },
      error: (err: any) => {
        console.error('Failed to load advanced filter options', err);
      }
    });
  }

  toggleAdvancedTxFilters(): void {
    this.showAdvancedTxFilters = !this.showAdvancedTxFilters;
    if (this.showAdvancedTxFilters) {
      // Fetch options when we open the view
      this.loadAdvancedFilterOptions();
    }
  }

  applyAdvancedTxFilters(): void {
    this.isTxLoading = true;

    let finalUserId = this.advFilterUserId;
    if (finalUserId && finalUserId !== 'all') {
      finalUserId = finalUserId.replace(' (Visa Manager)', '').replace(' (Doc Manager)', '');
    }

    const payload = {
      role: this.advFilterRole,
      userId: finalUserId,
      collegeName: this.advFilterCollege,
      startDate: this.txFilterStartDate || null,
      endDate: this.txFilterEndDate || null
    };

    this.accountantService.getAdvancedTransactionSummary(payload).subscribe({
      next: (res: any) => {
        this.isTxLoading = false;
        this.advTransactions = res.transactions || [];
        this.advTotalInflow = res.totalInflow || 0;
        this.advTotalOutflow = res.totalOutflow || 0;
        this.advBalance = res.balance || 0;
        // Mock pagination for advanced view since it returns a list
        this.allTransactions = this.advTransactions.map((tx: any, index: number) => {
          const isCredit = tx.inflow > 0;
          return {
            id: 'adv_' + index,
            transactionDate: tx.date,
            subAccount: { bankName: tx.userName || tx.role || 'Unknown User' },
            paymentMethod: 'OTHER',
            description: tx.particulars,
            referenceId: '-',
            transactionType: isCredit ? 'CREDIT' : (tx.outflow > 0 ? 'DEBIT' : 'OTHER'),
            amount: isCredit ? tx.inflow : tx.outflow,
            status: 'COMPLETED'
          };
        });
        this.transactionTotalPages = 1;
        this.transactionTotalElements = this.advTransactions.length;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to fetch advanced transactions', err);
        this.isTxLoading = false;
        this.showErrorToast('Failed to load advanced transactions');
      }
    });
  }

  clearAdvancedTxFilters(): void {
    this.advFilterRole = 'AGENT';
    this.advFilterUserId = 'all';
    this.advFilterCollege = 'all';
    this.txFilterStartDate = '';
    this.txFilterEndDate = '';
    this.advTransactions = [];
    this.advTotalInflow = 0;
    this.advTotalOutflow = 0;
    this.advBalance = 0;

    // Close the modal
    this.showAdvancedTxFilters = false;

    // Reset to normal table data
    this.loadAllTransactions();
  }

  exportAdvancedTransactions(): void {
    if (!this.advTransactions || this.advTransactions.length === 0) {
      this.showErrorToast('No transactions to export.');
      return;
    }

    let csvContent = "Date,Role,User Name,Particulars,Inflow,Outflow\n";
    this.advTransactions.forEach(tx => {
      const row = [
        `"${tx.date || ''}"`,
        `"${tx.role || ''}"`,
        `"${tx.userName || ''}"`,
        `"${(tx.particulars || '').replace(/"/g, '""')}"`,
        `"${tx.inflow || 0}"`,
        `"${tx.outflow || 0}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Advanced_Report_${this.advFilterRole}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Repayment Logic ---
  openRepaymentModal(credit: any): void {
    this.selectedCreditForRepayment = credit;
    this.repaymentForm = {
      amount: 0,
      subAccountId: null,
      notes: '',
      repaymentType: credit.repaymentStructure === 'INSTALLMENTS' ? 'STANDARD' : 'CUSTOM'
    };

    if (credit.repaymentStructure === 'INSTALLMENTS') {
      this.currentInstallmentNum = 0;
      this.totalInstallments = credit.loanTenureMonths || 1;

      this.http.get<any[]>(`${environment.apiUrl}/api/accountant/credits/${credit.id}/installments`).subscribe(installments => {
        const active = installments.find(i => i.status !== 'PAID');
        if (active) {
          this.currentInstallmentNum = active.installmentNum;
          const penalty = active.penaltyAmount || 0;
          const remaining = active.installmentAmount + penalty - (active.paidAmount || 0);
          this.repaymentForm.amount = remaining;
          // Also set the correct standard EMI for when they toggle 'STANDARD' repayment type
          this.selectedCreditForRepayment.installmentAmount = active.installmentAmount + penalty;
        } else {
          this.currentInstallmentNum = this.totalInstallments;
          this.repaymentForm.amount = credit.outstandingAmount;
        }
        this.cdr.detectChanges();
      });
    } else {
      this.repaymentForm.amount = credit.outstandingAmount;
    }

    this.showRepaymentModal = true;
    this.cdr.detectChanges();
  }

  onRepaymentTypeChange(): void {
    if (this.repaymentForm.repaymentType === 'STANDARD' && this.selectedCreditForRepayment?.repaymentStructure === 'INSTALLMENTS') {
      this.repaymentForm.amount = this.selectedCreditForRepayment.installmentAmount;
    }
  }

  closeRepaymentModal(): void {
    this.showRepaymentModal = false;
    this.showRepaymentSuccess = false;
    this.selectedCreditForRepayment = null;
    this.cdr.detectChanges();
  }

  submitRepayment(): void {
    this.resetActionMessages();
    if (!this.repaymentForm.amount || this.repaymentForm.amount <= 0) {
      this.actionErrorMessage = 'Amount must be greater than 0.';
      return;
    }
    if (this.repaymentForm.amount > this.selectedCreditForRepayment.outstandingAmount) {
      this.actionErrorMessage = 'Repayment cannot exceed outstanding balance.';
      return;
    }
    if (!this.repaymentForm.subAccountId) {
      this.actionErrorMessage = 'Please select an account to pay from.';
      return;
    }

    this.isRepaying = true;
    this.accountantService.repayCredit(this.selectedCreditForRepayment.id, this.repaymentForm.amount, this.repaymentForm.subAccountId, this.repaymentForm.notes, this.username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.isRepaying = false; this.cdr.detectChanges(); })
      )
      .subscribe({
        next: (res: any) => {
          this.actionSuccessMessage = 'Repayment recorded successfully!';
          this.loadDashboardData(); // Reload to refresh balances and credits
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.actionErrorMessage = 'Failed to record repayment: ' + (err.error || 'Unknown error');
        }
      });
  }

  // --- Purpose Panel ---
  selectedCreditForPurpose: any = null;
  showPurposePanel: boolean = false;

  openPurposePanel(credit: any): void {
    this.selectedCreditForPurpose = credit;
    this.resetEditModes();
    this.showPurposePanel = true;
    this.cdr.detectChanges();
  }

  closePurposePanel(): void {
    this.showPurposePanel = false;
    setTimeout(() => {
      this.selectedCreditForPurpose = null;
      this.cdr.detectChanges();
    }, 300); // Wait for transition
  }

  // --- Installments / Schedule Logic ---
  isScheduleLoading: boolean = false;

  openInstallmentsModal(credit: any): void {
    this.selectedCreditForInstallments = credit;
    this.selectedCreditInstallments = [];
    this.isScheduleLoading = true;
    this.showInstallmentsModal = true;
    this.cdr.detectChanges();

    this.accountantService.getCreditInstallments(credit.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isScheduleLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          setTimeout(() => {
            this.selectedCreditInstallments = data || [];
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.showErrorToast('Failed to load installments.');
        }
      });
  }

  closeInstallmentsModal(): void {
    this.showInstallmentsModal = false;
    this.selectedCreditForInstallments = null;
    this.cdr.detectChanges();
  }

  countInstallmentsByStatus(status: string): number {
    if (!this.selectedCreditInstallments) return 0;
    return this.selectedCreditInstallments.filter(i => i.status === status).length;
  }

  // --- Credit Details Modal ---
  showCreditDetailsModal: boolean = false;
  selectedCreditForDetails: any = null;

  openCreditDetailsModal(credit: any): void {
    this.selectedCreditForDetails = credit;
    this.showCreditDetailsModal = true;
  }

  closeCreditDetailsModal(): void {
    this.showCreditDetailsModal = false;
    this.selectedCreditForDetails = null;
  }

  // Modal Inline Messages
  actionSuccessMessage: string = '';
  actionErrorMessage: string = '';

  resetActionMessages(): void {
    this.actionSuccessMessage = '';
    this.actionErrorMessage = '';
  }

  // --- Foreclosure Logic ---
  showForeclosureModal: boolean = false;
  selectedCreditForForeclosure: any = null;
  foreclosureForm = { chargePercentage: 0, subAccountId: null as number | null };
  isForeclosing: boolean = false;

  openForeclosureModal(credit: any): void {
    this.resetActionMessages();
    this.selectedCreditForForeclosure = credit;
    this.foreclosureForm.chargePercentage = 0;
    this.foreclosureForm.subAccountId = null;
    this.showForeclosureModal = true;
    this.cdr.detectChanges();
  }

  closeForeclosureModal(): void {
    this.showForeclosureModal = false;
    this.selectedCreditForForeclosure = null;
    this.cdr.detectChanges();
  }

  submitForeclosure(): void {
    if (!this.selectedCreditForForeclosure) return;
    this.isForeclosing = true;
    this.resetActionMessages();
    this.accountantService.forecloseCredit(
      this.selectedCreditForForeclosure.id,
      this.foreclosureForm.chargePercentage,
      this.username,
      this.foreclosureForm.subAccountId
    )
      .pipe(finalize(() => { this.isForeclosing = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          this.actionSuccessMessage = 'Loan foreclosed successfully!';
          this.loadDashboardData();
        },
        error: (err) => this.actionErrorMessage = 'Failed to foreclose loan: ' + (err.error || 'Unknown error')
      });
  }



  // --- Ledger Logic ---
  showLedgerModal: boolean = false;
  selectedCreditForLedger: any = null;
  ledgerEntries: any[] = [];
  isLedgerLoading: boolean = false;

  downloadClosureCertificate(creditId: number): void {
    this.accountantService.downloadClosureCertificate(creditId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Closure_Certificate_CR_${creditId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Download failed', err);
        this.showErrorToast('Failed to download closure certificate. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  openLedgerModal(credit: any): void {
    this.selectedCreditForLedger = credit;
    this.showLedgerModal = true;
    this.isLedgerLoading = true;
    this.ledgerEntries = [];
    this.cdr.detectChanges();

    this.accountantService.getCreditLedger(credit.id)
      .pipe(finalize(() => { this.isLedgerLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (data) => this.ledgerEntries = data,
        error: () => this.showErrorToast('Failed to load ledger entries')
      });
  }

  closeLedgerModal(): void {
    this.showLedgerModal = false;
    this.selectedCreditForLedger = null;
    this.cdr.detectChanges();
  }

  applyTxFilters(): void {
    this.transactionCurrentPage = 0;
    this.loadAllTransactions();
  }

  clearTxFilters(): void {
    this.txFilterBankId = '';
    this.txFilterStartDate = '';
    this.txFilterEndDate = '';
    this.txFilterTab = 'ALL';
    this.transactionCurrentPage = 0;
    this.loadAllTransactions();
  }

  changeTransactionPage(page: number): void {
    if (page >= 0 && page < this.transactionTotalPages) {
      this.transactionCurrentPage = page;
      this.loadAllTransactions();
    }
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  setTxTab(tab: 'ALL' | 'INFLOW' | 'OUTFLOW' | 'INTERNAL') {
    this.txFilterTab = tab;
  }

  isInternalTx(tx: any): boolean {
    const pm = tx.paymentMethod ? String(tx.paymentMethod).toUpperCase() : 'UNKNOWN';
    if (pm === 'INTERNAL') return true;
    const desc = (tx.description || '').toLowerCase();
    return desc.includes('internal') || desc.includes('(to ') || desc.includes('(from ');
  }

  get displayedTransactions() {
    if (this.showAdvancedTxFilters) {
      if (this.txFilterTab === 'ALL') return this.allTransactions;
      if (this.txFilterTab === 'INFLOW') return this.allTransactions.filter(tx => tx.inflow > 0);
      if (this.txFilterTab === 'OUTFLOW') return this.allTransactions.filter(tx => tx.outflow > 0);
      if (this.txFilterTab === 'INTERNAL') return []; // Internal not applicable for advanced
      return this.allTransactions;
    }

    if (this.txFilterTab === 'ALL') return this.allTransactions;
    if (this.txFilterTab === 'INFLOW') return this.allTransactions.filter(tx => tx.transactionType === 'CREDIT' && !this.isInternalTx(tx));
    if (this.txFilterTab === 'OUTFLOW') return this.allTransactions.filter(tx => tx.transactionType === 'DEBIT' && !this.isInternalTx(tx));
    if (this.txFilterTab === 'INTERNAL') return this.allTransactions.filter(tx => this.isInternalTx(tx));
    return this.allTransactions;
  }

  get displayedTotalInflow(): number {
    if (!this.displayedTransactions) return 0;
    return this.displayedTransactions.reduce((sum, tx) => {
      const isCredit = tx.transactionType === 'CREDIT' || tx.inflow > 0;
      if (isCredit && !this.isInternalTx(tx)) return sum + Number(tx.amount || tx.inflow || 0);
      return sum;
    }, 0);
  }

  get displayedTotalOutflow(): number {
    if (!this.displayedTransactions) return 0;
    return this.displayedTransactions.reduce((sum, tx) => {
      const isDebit = tx.transactionType === 'DEBIT' || tx.outflow > 0;
      if (isDebit && !this.isInternalTx(tx)) return sum + Number(tx.amount || tx.outflow || 0);
      return sum;
    }, 0);
  }

  exportTransactions() {
    if (!this.displayedTransactions || this.displayedTransactions.length === 0) return;

    const headers = ['Date', 'Account / Source', 'Payment Type', 'Description', 'Type', 'Amount'];
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const tx of this.displayedTransactions) {
      const date = new Date(tx.transactionDate).toLocaleString();
      const account = `"${tx.subAccount?.bankName || tx.subAccount?.cashAccountName || 'Unknown Bank'} - ${tx.subAccount?.accountNumber || ''}"`;
      const pmInfo = this.getPaymentMethodInfo(tx);
      const paymentType = pmInfo ? pmInfo.label : 'OTHER';
      const description = `"${(tx.description || '').replace(/"/g, '""')}"`;
      const type = tx.transactionType;
      const amount = tx.amount;
      csvRows.push([date, account, paymentType, description, type, amount].join(','));
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  animateCounters(): void {
    if (!this.stats) return;

    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    const targets = { ...this.stats };
    const current = { ...this.animatedStats };

    let step = 0;
    const animationInterval = setInterval(() => {
      step++;
      const progress = this.easeOutQuart(step / steps);

      this.animatedStats = {
        totalStudentsAssigned: Math.round(current.totalStudentsAssigned + (targets.totalStudentsAssigned - current.totalStudentsAssigned) * progress),
        pendingPayments: Math.round(current.pendingPayments + (targets.pendingPayments - current.pendingPayments) * progress),
        paymentsReceived: Math.round(current.paymentsReceived + (targets.paymentsReceived - current.paymentsReceived) * progress),
        paymentsNotReceived: Math.round(current.paymentsNotReceived + (targets.paymentsNotReceived - current.paymentsNotReceived) * progress),
        totalAmountReceived: Math.round(current.totalAmountReceived + (targets.totalAmountReceived - current.totalAmountReceived) * progress),
        totalAmountPending: Math.round(current.totalAmountPending + (targets.totalAmountPending - current.totalAmountPending) * progress),
        totalVisaRequestedByVisaMan: Math.round(current.totalVisaRequestedByVisaMan + (targets.totalVisaRequestedByVisaMan - current.totalVisaRequestedByVisaMan) * progress),
        totalAccToVisaManPaidAmount: Math.round(current.totalAccToVisaManPaidAmount + (targets.totalAccToVisaManPaidAmount - current.totalAccToVisaManPaidAmount) * progress)
      };

      this.cdr.detectChanges();

      if (step >= steps) {
        clearInterval(animationInterval);
        this.animatedStats = { ...targets };
        this.cdr.detectChanges();
      }
    }, stepDuration);
  }

  easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.cdr.detectChanges();
    this.loadDashboardData();
    this.loadPassbooks();
  }

  viewPettyCashTransactions() {
    if (this.walletSubAccounts && this.walletSubAccounts.length > 0) {
      this.txFilterBankId = this.walletSubAccounts[0]?.id?.toString() || '';
    }
    this.switchView('transactions');
  }

  openProfitAndLossReport() {
    this.switchView('reports');
    const report = this.reportCategories
      .find(c => c.name === 'FINANCIAL REPORTS')
      ?.reports.find(r => r.id === 'profit-loss-statement');
    if (report) {
      this.selectReport('FINANCIAL REPORTS', report);
    }
  }

  openCollectionsFromHub() {
    this.switchView('payment-collection');
    this.collectionFilterStatuses = ['PENDING_COLLECTION', 'PENDING_AGENT_PAYMENT'];
  }

  openVisaDeptFromHub() {
    this.switchView('pending');
    this.settlementStatusFilter = 'FUND_RELEASE_PENDING';
    this.visaSettlementCurrentPage = 1;
  }

  // --- Navigation & View Switching ---
  switchView(view: 'dashboard' | 'pending' | 'payment-collection' | 'subaccounts' | 'beneficiaries' | 'transactions' | 'recovery' | 'credit-ledger' | 'reports' | 'settings' | 'profile' | 'approved' | 'rejected' | 'funds' | 'visa-accounts' | 'all-students' | 'tasks'): void {
    this.activeView = view;

    // Clear modals when switching views
    this.showAddSubAccountModal = false;
    this.showSendBankDetailsModal = false;
    this.showConfirmPaymentModal = false;

    // reset payment collection tab if navigating away/to it
    if (view === 'payment-collection') {
      this.activePaymentCollectionTab = 'all';
    }

    if (view === 'reports') {
      this.refreshData();
      this.loadPassbooks(); // Trigger full refresh to ensure all agent/college data is loaded for accurate reports
    }

    // Load data based on view
    if (view === 'subaccounts') {
      this.loadSubAccounts();
    } else if (view === 'beneficiaries') {
      this.loadBeneficiaries();
    } else if (view === 'credit-ledger') {
      this.loadPassbooks();
    } else if (view === 'transactions') {
      this.transactionCurrentPage = 0;
      this.loadAllTransactions();
    }

    this.searchTerm = '';
    if (view === 'funds') {
      this.loadFundRequests();
    } else {
      this.filterStudents();
    }
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  setPaymentCollectionTab(tab: 'all' | 'needs-request' | 'pending' | 'partially-paid' | 'paid' | 'excess'): void {
    this.activePaymentCollectionTab = tab;
    this.cdr.markForCheck();
  }

  // --- Outstanding Tracking Dashboard Properties ---
  paymentCollectionSearchTerm: string = '';
  collectionFilterAgent: string = 'all';
  collectionFilterCollege: string = 'all';
  collectionFilterStatuses: string[] = ['all'];
  collectionMinAmount: number | null = null;
  collectionMaxAmount: number | null = null;

  // Metrics
  totalCollectionRequested: number = 0;
  totalCollectionConfirmed: number = 0;
  totalCollectionOutstanding: number = 0;
  amountPartiallyPaid: number = 0;
  amountPendingCollection: number = 0;

  // Charts Options
  donutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, boxWidth: 8, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.formattedValue} INR`
        }
      }
    }
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 10, boxWidth: 8, font: { size: 10 } } }
    }
  };

  // Charts Data
  collectionPercentChartData: ChartData<'doughnut'> = {
    labels: ['Collected', 'Outstanding'],
    datasets: [{ data: [0, 0], backgroundColor: ['#059669', '#f43f5e'], borderWidth: 0 }]
  };

  agentPerformanceChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Paid', backgroundColor: '#0ea5e9', borderRadius: 4, barPercentage: 0.6 },
      { data: [], label: 'Outstanding', backgroundColor: '#f43f5e', borderRadius: 4, barPercentage: 0.6 }
    ]
  };

  collegeOutstandingChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Outstanding Amount', backgroundColor: '#f43f5e', borderRadius: 4, barPercentage: 0.5 }]
  };

  statusDistributionChartData: ChartData<'pie'> = {
    labels: ['Paid', 'Partially Paid', 'Pending Collection', 'Verification Pending'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#059669', '#d97706', '#f43f5e', '#6366f1'], borderWidth: 0 }]
  };

  get activePaymentCollectionStudents(): any[] {
    return this.visaPendingStudents;
  }

  get uniqueCollectionAgents(): string[] {
    const agents = this.activePaymentCollectionStudents.map(s => s.agentFullName || 'Unknown').filter(Boolean);
    return Array.from(new Set(agents)).sort();
  }

  get uniqueCollectionColleges(): string[] {
    const colleges = this.activePaymentCollectionStudents.map(s => s.collegeName || s.universityName || 'Unknown').filter(Boolean);
    return Array.from(new Set(colleges)).sort();
  }

  toggleCollectionStatusFilter(status: string): void {
    const idx = this.collectionFilterStatuses.indexOf(status);
    if (idx > -1) {
      this.collectionFilterStatuses.splice(idx, 1);
      if (this.collectionFilterStatuses.length === 0) this.collectionFilterStatuses = ['all'];
    } else {
      // Remove 'all' if a specific status is clicked
      const allIdx = this.collectionFilterStatuses.indexOf('all');
      if (allIdx > -1) this.collectionFilterStatuses.splice(allIdx, 1);
      this.collectionFilterStatuses.push(status);
    }
  }

  private _lastCollectionMetricsHash: string = '';

  calculatePaymentCollectionMetrics(students: any[]): void {
    const hash = students.length + '_' + students.reduce((acc, s) => acc + (s.id || 0) + (s.visaPaymentRequestedAmount || 0) + (s.visaPaymentReceivedAmount || 0), 0);
    if (this._lastCollectionMetricsHash === hash) {
      return;
    }
    this._lastCollectionMetricsHash = hash;

    let req = 0;
    let conf = 0;
    let part = 0;
    let pend = 0;

    const agentMap: Record<string, { paid: number, out: number }> = {};
    const collegeMap: Record<string, number> = {};
    const statusCount = { paid: 0, partial: 0, pending: 0, verification: 0 };

    students.forEach(s => {
      const sReq = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      const sRec = s.visaPaymentReceivedAmount || 0;
      const sOut = Math.max(0, sReq - sRec);

      req += sReq;
      conf += sRec;

      const st = this.getCollectionStatus(s);
      if (st === 'PARTIALLY_PAID') part += sOut;
      if (st === 'PENDING_COLLECTION' || st === 'PENDING_AGENT_PAYMENT') pend += sOut;

      // Status Chart
      if (st === 'PAID') statusCount.paid++;
      else if (st === 'PARTIALLY_PAID') statusCount.partial++;
      else if (st === 'VERIFICATION_PENDING') statusCount.verification++;
      else statusCount.pending++;

      // Agent Chart
      const agent = s.agentFullName || 'Unknown';
      if (!agentMap[agent]) agentMap[agent] = { paid: 0, out: 0 };
      agentMap[agent].paid += sRec;
      agentMap[agent].out += sOut;

      // College Chart
      if (sOut > 0) {
        const college = s.collegeName || s.universityName || 'Unknown';
        collegeMap[college] = (collegeMap[college] || 0) + sOut;
      }
    });

    this.totalCollectionRequested = req;
    this.totalCollectionConfirmed = conf;
    this.totalCollectionOutstanding = Math.max(0, req - conf);
    this.amountPartiallyPaid = part;
    this.amountPendingCollection = pend;

    // Update Charts
    this.collectionPercentChartData = {
      labels: ['Collected', 'Outstanding'],
      datasets: [{ data: [conf, this.totalCollectionOutstanding], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0 }]
    };

    const agents = Object.keys(agentMap).slice(0, 10); // Top 10
    this.agentPerformanceChartData = {
      labels: agents,
      datasets: [
        { data: agents.map(a => agentMap[a].paid), label: 'Paid', backgroundColor: '#3b82f6', borderRadius: 4 },
        { data: agents.map(a => agentMap[a].out), label: 'Outstanding', backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    };

    const colleges = Object.keys(collegeMap).sort((a, b) => collegeMap[b] - collegeMap[a]).slice(0, 8); // Top 8 by debt
    this.collegeOutstandingChartData = {
      labels: colleges.map(c => c.length > 15 ? c.substring(0, 15) + '...' : c),
      datasets: [{ data: colleges.map(c => collegeMap[c]), label: 'Outstanding Amount', backgroundColor: '#f43f5e', borderRadius: 4 }]
    };

    this.statusDistributionChartData = {
      labels: ['Paid', 'Partially Paid', 'Pending Collection', 'Verification Pending'],
      datasets: [{ data: [statusCount.paid, statusCount.partial, statusCount.pending, statusCount.verification], backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6366f1'], borderWidth: 0 }]
    };

    this.cdr.detectChanges();
  }

  // Global Collection Dashboard Getters
  getTotalCollectionRequested(): number {
    return this.students ? this.students.reduce((sum, s) => sum + (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0), 0) : 0;
  }

  getTotalCollectionConfirmed(): number {
    return this.students ? this.students.reduce((sum, s) => sum + (s.visaPaymentReceivedAmount || 0), 0) : 0;
  }

  // Recent Petty Cash / Wallet Outflows
  get recentPettyCashOutflows(): any[] {
    return this.allTransactions
      .filter(tx => {
        const sub = tx.subAccount;
        const isCashOrWallet = sub && (sub.accountType === 'CASH' || sub.accountType === 'WALLET' || sub.bankName === 'CASH');
        const isOutflow = tx.transactionType === 'DEBIT' || tx.outflow > 0;
        return isCashOrWallet && isOutflow;
      })
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, 5);
  }

  // AI Financial Insights
  get aiInsights(): { type: 'success' | 'warning' | 'danger' | 'info', icon: string, text: string }[] {
    const insights: { type: 'success' | 'warning' | 'danger' | 'info', icon: string, text: string }[] = [];

    const netBalance = this.totalBalance + (this.stats?.totalAmountPending || 0)
      - ((this.stats?.totalVisaRequestedByVisaMan || 0) - (this.stats?.totalAccToVisaManPaidAmount || 0))
      - this.getTotalBorrowedFunds();

    const pendingVisa = this.getPendingToVisaMan();
    const cashBalance = this.totalCashBalance + this.totalWalletBalance;
    const bankBalance = this.totalBankBalance;
    const totalAssets = this.totalBalance;
    const outstanding = this.stats?.totalAmountPending || 0;
    const borrowed = this.getTotalBorrowedFunds();

    // Net Balance Analysis
    if (netBalance < 0) {
      insights.push({ type: 'danger', icon: 'alert-triangle', text: `Net balance is negative (₹${Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}). Consider collecting outstanding receivables or reducing liabilities urgently.` });
    } else if (netBalance > 0 && netBalance < totalAssets * 0.1) {
      insights.push({ type: 'warning', icon: 'trending-down', text: `Net balance is thin at just ${((netBalance / totalAssets) * 100).toFixed(1)}% of assets. Build a buffer by accelerating collections.` });
    } else if (netBalance > 0) {
      insights.push({ type: 'success', icon: 'check-circle', text: `Net position is healthy. Continue maintaining current collection pace.` });
    }

    // Visa Dues
    if (pendingVisa > 0 && pendingVisa > outstanding) {
      insights.push({ type: 'danger', icon: 'globe', text: `Visa dues (₹${pendingVisa.toLocaleString('en-IN', { maximumFractionDigits: 0 })}) exceed outstanding receivables. Prioritize agent collections to cover visa payments.` });
    } else if (pendingVisa > 0) {
      insights.push({ type: 'warning', icon: 'globe', text: `₹${pendingVisa.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in visa dues pending. Once agent collections confirm, settle visa payments promptly.` });
    }

    // Cash Concentration
    if (cashBalance > 0 && totalAssets > 0 && (cashBalance / totalAssets) > 0.4) {
      insights.push({ type: 'info', icon: 'lightbulb', text: `${((cashBalance / totalAssets) * 100).toFixed(0)}% of assets are in cash/wallet. Consider moving excess to bank accounts for better security.` });
    }

    // Collection Efficiency
    const requested = this.getTotalCollectionRequested();
    const confirmed = this.getTotalCollectionConfirmed();
    if (requested > 0) {
      const rate = (confirmed / requested) * 100;
      if (rate >= 95) {
        insights.push({ type: 'success', icon: 'target', text: `Collection rate is excellent at ${rate.toFixed(1)}%. Keep up the follow-ups with agents.` });
      } else if (rate < 80) {
        insights.push({ type: 'warning', icon: 'bar-chart', text: `Collection rate is ${rate.toFixed(1)}%. Follow up with agents who have outstanding balances.` });
      }
    }

    // Borrowed Funds
    if (borrowed > 0 && totalAssets > 0 && (borrowed / totalAssets) > 0.5) {
      insights.push({ type: 'danger', icon: 'bank', text: `Borrowed funds are ${((borrowed / totalAssets) * 100).toFixed(0)}% of total assets. Plan repayments to reduce credit exposure.` });
    }

    // If no warnings or issues, add encouraging message
    if (insights.length === 0) {
      insights.push({ type: 'success', icon: 'star', text: `All financial metrics look stable. No immediate actions required.` });
    }

    return insights.slice(0, 4);
  }

  get filteredPaymentCollectionStudents(): any[] {
    let filtered = this.activePaymentCollectionStudents;

    // Apply Search
    if (this.paymentCollectionSearchTerm && this.paymentCollectionSearchTerm.trim() !== '') {
      const term = this.paymentCollectionSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(s => {
        const nameMatch = s.fullName?.toLowerCase().includes(term);
        const emailMatch = s.email?.toLowerCase().includes(term);
        const appIdMatch = s.applicationId?.toLowerCase().includes(term);
        return nameMatch || emailMatch || appIdMatch;
      });
    }

    // Apply Agent Filter
    if (this.collectionFilterAgent !== 'all') {
      filtered = filtered.filter(s => (s.agentFullName || 'Unknown') === this.collectionFilterAgent);
    }

    // Apply College Filter
    if (this.collectionFilterCollege !== 'all') {
      filtered = filtered.filter(s => (s.collegeName || s.universityName || 'Unknown') === this.collectionFilterCollege);
    }

    // Apply Status Filter
    if (!this.collectionFilterStatuses.includes('all')) {
      filtered = filtered.filter(s => this.collectionFilterStatuses.includes(this.getCollectionStatus(s)));
    }

    // Apply Amount Range
    filtered = filtered.filter(s => {
      const req = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      const rec = s.visaPaymentReceivedAmount || 0;
      const out = Math.max(0, req - rec);

      if (this.collectionMinAmount !== null && out < this.collectionMinAmount) return false;
      if (this.collectionMaxAmount !== null && out > this.collectionMaxAmount) return false;
      return true;
    });

    // We must call calculatePaymentCollectionMetrics to update charts based on *current filtered data*
    // However, calling it inside a getter can cause ExpressionChangedAfterItHasBeenCheckedError if it mutates bound properties.
    // So we use a setTimeout or compute charts independently. 
    // To be safe in angular, we just return the filtered list, and rely on an explicit filter button or change event to update metrics.
    // Wait, since we are doing data binding, we can just compute it directly here if we use pure objects.
    // But mutating `this.totalCollectionRequested` in a getter is bad. 
    // Instead, I'll update metrics directly. Angular allows it in OnPush if careful, but setTimeout is safer.
    setTimeout(() => this.calculatePaymentCollectionMetrics(filtered), 0);

    return filtered.sort((a, b) => this.getLatestUpdateTimestamp(b) - this.getLatestUpdateTimestamp(a));
  }

  private getLatestUpdateTimestamp(student: any): number {
    let maxTime = new Date(student.createdAt || 0).getTime();

    // Check all possible date fields that could indicate an update
    const dateFields = [
      'updatedAt',
      'visaFeePaymentDate',
      'visaPaymentReceivedDate',
      'visaBankDetailsSentDate',
      'accToVisaManPaymentDate',
      'paymentReceivedDate',
      'telexPaymentReceivedDate',
      'docReceivedDate',
      'docTentativeReachDate',
      'docReturnedDate'
    ];

    for (const field of dateFields) {
      if (student[field]) {
        const time = new Date(student[field]).getTime();
        if (time > maxTime) maxTime = time;
      }
    }

    // Check history if available
    if (student.studentStatusHistory && Array.isArray(student.studentStatusHistory)) {
      for (const history of student.studentStatusHistory) {
        if (history.updatedAt) {
          const time = new Date(history.updatedAt).getTime();
          if (time > maxTime) maxTime = time;
        }
      }
    }

    // As a final fallback to differentiate same-time entries, add id
    return maxTime + (student.id ? student.id / 1000000 : 0);
  }

  get paymentCollectionCounts() {
    const all = this.activePaymentCollectionStudents;
    return {
      all: all.length,
      needsRequest: all.filter((s: any) => s.action === 'SEND_BANK_DETAILS_TO_AGENT').length,
      pending: all.filter((s: any) => {
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && received === 0;
      }).length,
      partiallyPaid: all.filter((s: any) => {
        const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && received > 0 && received < requested;
      }).length,
      paid: all.filter((s: any) => {
        const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && requested > 0 && received === requested;
      }).length,
      excess: all.filter((s: any) => {
        const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
        const received = s.visaPaymentReceivedAmount || 0;
        return s.action !== 'SEND_BANK_DETAILS_TO_AGENT' && requested > 0 && received > requested;
      }).length
    };
  }

  // --- Payment Collection Actions ---
  openPaymentCollectionAction(student: any, actionType: 'generate_request' | 'verify_payment' | 'record_payment' | 'request_remaining' | 'cash_settlement'): void {
    if (!student) return;

    const requested = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
    const received = student.visaPaymentReceivedAmount || 0;
    const pendingAmount = requested - received;

    if (actionType === 'generate_request' || actionType === 'request_remaining') {
      this.openSendBankDetailsModal(student);
    } else if (actionType === 'verify_payment') {
      this.openConfirmPaymentModal(student);
    } else if (actionType === 'cash_settlement' || actionType === 'record_payment') {
      this.selectedSettlementStudent = student;
      this.showCashSettlementModal = true;
      this.cashSettlementStep = 'form';
      this.cashSettlementData = {
        depositType: 'BANK',
        amount: pendingAmount,
        date: new Date().toISOString().split('T')[0],
        remarks: '',
        file: null,
        subAccountId: ''
      };
    }
  }

  closeCashSettlementModal(): void {
    this.showCashSettlementModal = false;
    this.selectedSettlementStudent = null;
  }

  onCashSettlementFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.cashSettlementData.file = event.target.files[0];
    }
  }

  cashSettlementStep: 'form' | 'processing' | 'success' = 'form';

  submitCashSettlement(): void {
    if (!this.selectedSettlementStudent || !this.cashSettlementData.amount || !this.cashSettlementData.subAccountId) return;

    this.isSubmitting = true;
    this.cashSettlementStep = 'processing';
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('accountantUsername', this.username);
    formData.append('amount', this.cashSettlementData.amount.toString());
    formData.append('date', this.cashSettlementData.date);
    formData.append('subAccountId', this.cashSettlementData.subAccountId.toString());

    if (this.cashSettlementData.remarks) {
      formData.append('remarks', this.cashSettlementData.remarks);
    }
    if (this.cashSettlementData.file) {
      formData.append('file', this.cashSettlementData.file);
    }
    formData.append('settlementType', 'CASH');

    this.http.post(`${environment.apiUrl}/api/visa/cash-settlement/${this.selectedSettlementStudent.id}`, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          this.recentStatusChange[this.selectedSettlementStudent.id] = 'updated';
          this.cashSettlementStep = 'success';
          this.cdr.detectChanges();
          this.refreshData();

          setTimeout(() => {
            this.closeCashSettlementModal();
            delete this.recentStatusChange[res.id || this.selectedSettlementStudent.id];
            this.cdr.detectChanges();
          }, 2000);
        },
        error: (err: any) => {
          console.error('Error submitting cash settlement', err);
          this.cashSettlementStep = 'form';
          this.showToast('Failed to record cash settlement', 'error');
        }
      });
  }

  get isAnyActionLoading(): boolean {
    return this.globalOverlay.show;
  }

  showGlobalLoading(message: string, icon: string = '') {
    this.globalOverlay = { show: true, status: 'loading', message, icon };
    this.cdr.detectChanges();
  }

  showGlobalSuccess(message: string) {
    this.globalOverlay.status = 'success';
    this.globalOverlay.message = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.globalOverlay.show = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  showGlobalError(message: string) {
    this.globalOverlay.status = 'error';
    this.globalOverlay.message = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.globalOverlay.show = false;
      this.cdr.detectChanges();
    }, 2500);
  }

  sendCollectionReminder(student: any): void {
    if (!student.id) return;
    this.isSendingReminder[student.id] = true;
    this.showGlobalLoading('Hang tight! Sending reminder...', 'email');
    this.cdr.detectChanges();

    this.http.post(`${environment.apiUrl}/api/visa/send-reminder/${student.id}`, { accountantUsername: this.username }, { responseType: 'text' })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSendingReminder[student.id] = false;
          // don't close overlay here, let success/error handle it
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.showGlobalSuccess('Reminder sent successfully!');
          this.refreshData();
        },
        error: (err) => {
          console.error('Error sending reminder', err);
          this.showGlobalError('Failed to send reminder');
        }
      });
  }

  selectSettlementStudent(student: any): void {
    this.selectedSettlementStudent = student;
    if (student) {
      this.initFundReleaseForm(student);
    }
  }

  // --- Modals ---
  get visaAccountsStudents(): any[] {
    return this.students.filter((s: any) => !!s.visaPaymentRequestedAmount && s.visaPaymentRequestedAmount > 0);
  }

  get totalVisaRequested(): number {
    return this.visaAccountsStudents.reduce((sum, s) => sum + (s.visaPaymentRequestedAmount || 0), 0);
  }

  get totalVisaReceived(): number {
    return this.visaAccountsStudents.reduce((sum, s) => sum + (s.visaPaymentReceivedAmount || 0), 0);
  }

  get totalServiceChargeRequested(): number {
    return this.visaAccountsStudents.reduce((sum, s) => sum + (s.visaManServiceCharge || 0), 0);
  }

  get totalServiceChargeEarned(): number {
    return this.visaAccountsStudents.reduce((sum, s) => {
      const received = s.visaPaymentReceivedAmount || 0;
      if (received > 0) {
        return sum + (s.visaManServiceCharge || 0);
      }
      return sum;
    }, 0);
  }

  get disbursedRecordsCount(): number {
    return this.visaAccountsStudents.filter(s => s.accToVisaManPaidAmount && s.accToVisaManPaidAmount > 0).length;
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.cdr.detectChanges();
  }

  // --- Filtering ---

  filterStudents(): void {
    const term = this.searchTerm.toLowerCase();

    let sourceList = this.students;

    // Filter by payment status based on view
    if (this.activeView === 'pending') {
      sourceList = this.students.filter(s =>
        s.applicationStatus === 'TELEX_INITIATED' &&
        s.paymentStatus !== 'Received' &&
        s.paymentStatus !== 'Not Received'
      );
    } else if (this.activeView === 'approved') {
      sourceList = this.students.filter(s => s.paymentStatus === 'Received');
    } else if (this.activeView === 'rejected') {
      sourceList = this.students.filter(s => s.paymentStatus === 'Not Received');
    }

    this.filteredStudents = sourceList.filter(student => {
      const matchSearch = !term ||
        student.fullName?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.applicationId?.toLowerCase().includes(term);

      const matchAgent = this.listAgentFilter === 'ALL' || student.agentFullName === this.listAgentFilter;
      const matchCollege = this.listCollegeFilter === 'ALL' || student.collegeName === this.listCollegeFilter;

      const dateStr = (student as any).paymentReceivedDate || (student as any).visaPaymentReceivedDate;
      const dateVal = dateStr ? new Date(dateStr) : null;
      const matchDateFrom = !this.listDateFrom || !dateVal || dateVal >= new Date(this.listDateFrom);
      const matchDateTo = !this.listDateTo || !dateVal || dateVal <= new Date(this.listDateTo);

      return matchSearch && matchAgent && matchCollege && matchDateFrom && matchDateTo;
    });

    this.cdr.detectChanges();
  }

  // --- Reports Logic (Agent×College Aggregate Tracking) ---

  /** Only fee-payment students (hasPaid or paymentStatus set) filtered by controls */
  get reportBaseStudents(): any[] {
    return this.students.filter(s => {
      if (!s.paidAmount || s.paidAmount <= 0) return false;
      const matchPaidTo = this.reportPaidToFilter === 'ALL' || s.paidTo === this.reportPaidToFilter;
      // Use a generic date field — try payment received or fallback
      const dateStr = (s as any).paymentReceivedDate || (s as any).visaPaymentReceivedDate;
      const dateVal = dateStr ? new Date(dateStr) : null;
      const matchDateFrom = !this.reportDateFrom || !dateVal || dateVal >= new Date(this.reportDateFrom);
      const matchDateTo = !this.reportDateTo || !dateVal || dateVal <= new Date(this.reportDateTo);
      return matchPaidTo && matchDateFrom && matchDateTo;
    });
  }

  get uniqueAgents(): string[] {
    return [...new Set(this.students.map(s => s.agentFullName).filter(Boolean))] as string[];
  }

  get reportUniqueAgents(): string[] {
    const agents = new Set<string>();
    this.students.forEach(s => {
      if (s.agentFullName) agents.add(s.agentFullName);
    });
    this.agentPassbooks.forEach(pb => {
      if (pb.paidByAgentFullName) agents.add(pb.paidByAgentFullName);
      else if (pb.paidByAgent) agents.add(pb.paidByAgent);
    });
    return Array.from(agents).sort();
  }

  get reportUniqueUsers(): { label: string, value: string, role: string }[] {
    return [];
  }


  get uniqueColleges(): string[] {
    return [...new Set(this.students.map(s => s.collegeName).filter(Boolean))] as string[];
  }

  /** Agent-wise aggregate rows */
  get reportAgentRows(): { agent: string, students: number, toCompany: number, toUniversity: number, total: number, colleges: { name: string, students: number, amount: number }[] }[] {
    const map = new Map<string, { students: number, toCompany: number, toUniversity: number, total: number, collegeMap: Map<string, { students: number, amount: number }> }>();

    for (const s of this.reportBaseStudents) {
      const agentName = s.agentFullName || 'Unknown Agent';
      if (!map.has(agentName)) {
        map.set(agentName, { students: 0, toCompany: 0, toUniversity: 0, total: 0, collegeMap: new Map() });
      }
      const row = map.get(agentName)!;
      row.students++;
      row.total += (s.paidAmount || 0);
      if (s.paidTo === 'COMPANY') row.toCompany += (s.paidAmount || 0);
      if (s.paidTo === 'UNIVERSITY') row.toUniversity += (s.paidAmount || 0);

      const collegeName = s.collegeName || 'Unassigned';
      if (!row.collegeMap.has(collegeName)) {
        row.collegeMap.set(collegeName, { students: 0, amount: 0 });
      }
      const cRow = row.collegeMap.get(collegeName)!;
      cRow.students++;
      cRow.amount += (s.paidAmount || 0);
    }

    return Array.from(map.entries()).map(([agent, data]) => ({
      agent,
      students: data.students,
      toCompany: data.toCompany,
      toUniversity: data.toUniversity,
      total: data.total,
      colleges: Array.from(data.collegeMap.entries())
        .map(([name, c]) => ({ name, students: c.students, amount: c.amount }))
        .sort((a, b) => b.amount - a.amount)
    })).sort((a, b) => b.total - a.total);
  }

  /** College-wise aggregate rows */
  get reportCollegeRows(): { college: string, students: number, toCompany: number, toUniversity: number, total: number }[] {
    const map = new Map<string, { students: number, toCompany: number, toUniversity: number, total: number }>();

    for (const s of this.reportBaseStudents) {
      const collegeName = s.collegeName || 'Unassigned';
      if (!map.has(collegeName)) {
        map.set(collegeName, { students: 0, toCompany: 0, toUniversity: 0, total: 0 });
      }
      const row = map.get(collegeName)!;
      row.students++;
      row.total += (s.paidAmount || 0);
      if (s.paidTo === 'COMPANY') row.toCompany += (s.paidAmount || 0);
      if (s.paidTo === 'UNIVERSITY') row.toUniversity += (s.paidAmount || 0);
    }

    return Array.from(map.entries()).map(([college, data]) => ({
      college,
      ...data
    })).sort((a, b) => b.total - a.total);
  }

  /** Grand totals for the report */
  get reportGrandTotal(): number {
    return this.reportBaseStudents.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }
  get reportTotalToCompany(): number {
    return this.reportBaseStudents.filter(s => s.paidTo === 'COMPANY').reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }
  get reportTotalToUniversity(): number {
    return this.reportBaseStudents.filter(s => s.paidTo === 'UNIVERSITY').reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }
  get reportTotalStudents(): number {
    return this.reportBaseStudents.length;
  }

  // Track expanded agent rows in the report
  expandedReportAgents: Set<string> = new Set();
  toggleReportAgent(agent: string): void {
    if (this.expandedReportAgents.has(agent)) {
      this.expandedReportAgents.delete(agent);
    } else {
      this.expandedReportAgents.add(agent);
    }
    this.cdr.detectChanges();
  }

  // --- Dashboard Detailed Summaries ---
  get dashboardTotalToCompany(): number {
    return this.students.filter(s => s.paidTo === 'COMPANY' && s.paymentStatus === 'Received')
      .reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }

  get dashboardTotalToUniversity(): number {
    return this.students.filter(s => s.paidTo === 'UNIVERSITY' && s.paymentStatus === 'Received')
      .reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }

  get dashboardTopAgents(): { name: string, amount: number }[] {
    const agentMap = new Map<string, number>();
    this.students.filter(s => s.paymentStatus === 'Received' && s.agentFullName).forEach(s => {
      agentMap.set(s.agentFullName!, (agentMap.get(s.agentFullName!) || 0) + (s.paidAmount || 0));
    });
    return Array.from(agentMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
  }

  get dashboardTopColleges(): { name: string, amount: number }[] {
    const collegeMap = new Map<string, number>();
    this.students.filter(s => s.paymentStatus === 'Received' && s.collegeName).forEach(s => {
      collegeMap.set(s.collegeName!, (collegeMap.get(s.collegeName!) || 0) + (s.paidAmount || 0));
    });
    return Array.from(collegeMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
  }

  // --- Collection Summary Helpers ---

  getCollectionByPeriod(period: string): CollectionSummary | null {
    return this.collections.find(c => c.period === period) || null;
  }

  getCollectionProgress(collection: CollectionSummary): number {
    if (!this.stats || this.stats.totalAmountReceived === 0) return 0;
    const maxAmount = Math.max(...this.collections.map(c => c.totalAmount), 1);
    return (collection.totalAmount / maxAmount) * 100;
  }

  getPeriodLabel(period: string): string {
    const labels: { [key: string]: string } = {
      'TODAY': 'Today',
      'THIS_WEEK': 'This Week',
      'THIS_MONTH': 'This Month',
      'THIS_YEAR': 'This Year'
    };
    return labels[period] || period;
  }

  getPeriodIcon(period: string): string {
    const icons: { [key: string]: string } = {
      'TODAY': 'calendar-day',
      'THIS_WEEK': 'calendar-week',
      'THIS_MONTH': 'calendar',
      'THIS_YEAR': 'calendar-alt'
    };
    return icons[period] || 'calendar';
  }

  // --- Activity Helpers ---

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getActivityIcon(action: string): string {
    return action === 'PAYMENT_RECEIVED' ? 'check-circle' : 'x-circle';
  }

  getActivityColor(action: string): string {
    return action === 'PAYMENT_RECEIVED' ? 'success' : 'danger';
  }

  // --- Modal Actions ---

  openDetailModal(student: AssignedStudent): void {
    // Map to full Student interface for modal
    this.selectedStudent = {
      id: student.studentId,
      applicationId: student.applicationId,
      fullName: student.fullName,
      email: student.email,
      contactNo: student.contactNo,
      applicationStatus: student.applicationStatus,
      paymentStatus: student.paymentStatus,
      hasPaid: student.hasPaid,
      paidAmount: student.paidAmount,
      paidTo: student.paidTo,
      ttCopyPath: student.ttCopyPath,
      paymentConfirmationPath: student.paymentConfirmationPath
    } as Student;
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    setTimeout(() => { this.selectedStudent = null; }, 200);
    this.cdr.detectChanges();
  }

  openApproveModal(student: any): void {
    if (this.isActionDisabled(student)) return;

    this.selectedStudent = student;
    this.approveForm = {
      receivedAmount: student.paidAmount,
      receivedDate: this.formatDateForInput(new Date())
    };
    this.showApproveModal = true;
    this.cdr.detectChanges();
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
    this.approveForm = { receivedAmount: null, receivedDate: '' };
    this.cdr.detectChanges();
  }

  openRejectModal(student: any): void {
    if (this.isActionDisabled(student)) return;

    this.selectedStudent = student;
    this.rejectionRemarks = '';
    this.showRejectModal = true;
    this.cdr.detectChanges();
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectionRemarks = '';
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.cdr.detectChanges();
  }

  openPayVisaManModal(student: any): void {
    this.selectedStudent = student;
    const requested = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;
    const alreadyPaid = student.accToVisaManPaidAmount || 0;
    const remaining = (requested + serviceCharge) - alreadyPaid;

    this.payVisaManForm = {
      amountToPay: remaining > 0 ? remaining : null,
      mode: 'UPI',
      txId: '',
      paymentDate: this.formatDateForInput(new Date()),
      subAccountId: null
    };
    this.showPayVisaManModal = true;
    this.cdr.detectChanges();
  }

  closePayVisaManModal(): void {
    this.showPayVisaManModal = false;
    this.cdr.detectChanges();
  }

  /**
   * Open the Pay VisaMan modal from a passbook record.
   * Maps the passbook record fields to a student-like object so the existing modal logic works.
   */
  openPayVisaManFromPassbook(record: any): void {
    // Find matching student from loaded students by applicationId
    const matchingStudent = this.students.find(s => s.applicationId === record.applicationId);

    // Build a student-like object for the modal
    const studentLike: any = {
      id: matchingStudent ? matchingStudent.studentId : null,
      studentId: matchingStudent ? matchingStudent.studentId : null,
      fullName: record.studentName,
      applicationId: record.applicationId,
      visaPaymentRequestedAmount: record.visaAmountRequest || 0,
      visaManServiceCharge: record.serviceChargeRequested || 0,
      accToVisaManPaidAmount: record.totalAmountPaidByAccountant || 0,
      visaPaymentRequestedCurrency: 'INR',
      visaMan: { username: record.requesterName }
    };

    if (!studentLike.id) {
      this.showErrorToast('Cannot find the matching student record. Please ensure the student data is loaded.');
      return;
    }

    this.openPayVisaManModal(studentLike);
  }

  // --- API Actions ---

  confirmApprove(): void {
    if (!this.selectedStudent || !this.accountantData) return;
    if (!this.approveForm.receivedAmount || !this.approveForm.receivedDate) {
      this.showErrorToast('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const studentId = (this.selectedStudent as any).studentId || this.selectedStudent.id;

    const payload: ApprovePaymentPayload = {
      receivedAmount: this.approveForm.receivedAmount,
      receivedDate: this.approveForm.receivedDate,
      accountantUsername: this.accountantData.username
    };

    this.accountantService.approvePayment(studentId, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closeApproveModal();
          this.showSuccess('Payment verified successfully! Status updated to FEE_RECEIVED.');
          this.refreshData();
        },
        error: (err: any) => {
          console.error('Approve error:', err);
          this.showErrorToast('Failed to approve payment. Please try again.');
        }
      });
  }

  confirmReject(): void {
    if (!this.selectedStudent || !this.accountantData) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const studentId = (this.selectedStudent as any).studentId || this.selectedStudent.id;

    const payload: RejectPaymentPayload = {
      accountantUsername: this.accountantData.username,
      rejectionRemarks: this.rejectionRemarks
    };

    this.accountantService.rejectPayment(studentId, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closeRejectModal();
          this.showSuccess('Payment marked as NOT RECEIVED.', 'Payment Rejected');
          this.refreshData();
        },
        error: (err: any) => {
          console.error('Reject error:', err);
          this.showErrorToast('Failed to reject payment. Please try again.');
        }
      });
  }

  confirmPayVisaMan(): void {
    if (!this.selectedStudent || !this.accountantData) return;
    if (!this.payVisaManForm.amountToPay || !this.payVisaManForm.paymentDate || !this.payVisaManForm.mode) {
      this.showErrorToast('Please fill in all required fields.');
      return;
    }
    if (!this.payVisaManForm.subAccountId) {
      this.showErrorToast('Please select a Bank Account to debit from.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const studentId = (this.selectedStudent as any).studentId || this.selectedStudent.id;

    const payload = {
      amountToPay: this.payVisaManForm.amountToPay,
      paymentDate: this.payVisaManForm.paymentDate,
      mode: this.payVisaManForm.mode,
      txId: this.payVisaManForm.txId,
      subAccountId: this.payVisaManForm.subAccountId,
      accountantUsername: this.accountantData.username
    };

    this.accountantService.payVisaMan(studentId, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closePayVisaManModal();
          this.showSuccess('Payment accurately recorded and subtracted from pending Visa Man payout!', 'Payment Recorded');
          this.refreshData();
        },
        error: (err: any) => {
          console.error('Pay Visa Man error:', err);
          const errorMsg = typeof err.error === 'string' ? err.error : (err.error?.message || 'Failed to pay Visa Man.');
          this.showErrorToast(errorMsg);
        }
      });
  }

  showSuccess(message: string, title: string = 'Payment Verified!'): void {
    this.successTitle = title;
    this.successMessage = message;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  // --- Action Validation ---

  isActionDisabled(student: any): boolean {
    return (
      student.paymentStatus === 'Received' ||
      student.paymentStatus === 'Not Received' ||
      student.applicationStatus === 'FEE_RECEIVED' ||
      student.applicationStatus === 'PAYMENT_NOT_RECEIVED'
    );
  }

  canApprove(student: any): boolean {
    return student.hasPaid && !this.isActionDisabled(student);
  }

  canReject(student: any): boolean {
    return student.hasPaid && !this.isActionDisabled(student);
  }

  // --- Helpers ---

  getDocUrl(path: string | null): string {
    return this.fileService.getFileUrl(path);
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '$0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getStatusLabel(status: string | null): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStatusClass(status: string | null): string {
    if (!status) return 'status-default';
    const statusMap: { [key: string]: string } = {
      'FEE_RECEIVED': 'status-success',
      'PAYMENT_NOT_RECEIVED': 'status-danger',
      'TELEX_PAYMENT_DOCS_SUBMITTED': 'status-info',
      'PENDING': 'status-warning'
    };
    return statusMap[status] || 'status-default';
  }

  getPaymentStatusClass(student: any): string {
    if (student.paymentStatus === 'Received' || student.applicationStatus === 'FEE_RECEIVED') {
      return 'badge-success';
    }
    if (student.paymentStatus === 'Not Received' || student.applicationStatus === 'PAYMENT_NOT_RECEIVED') {
      return 'badge-danger';
    }
    if (student.hasPaid) {
      return 'badge-warning';
    }
    return 'badge-default';
  }

  getPaymentStatusLabel(student: any): string {
    if (student.paymentStatus === 'Received' || student.applicationStatus === 'FEE_RECEIVED') {
      return 'Verified ✓';
    }
    if (student.paymentStatus === 'Not Received' || student.applicationStatus === 'PAYMENT_NOT_RECEIVED') {
      return 'Not Received';
    }
    if (student.hasPaid) {
      return 'Pending Verification';
    }
    return 'Not Paid';
  }

  getAvatarColor(name: string): string {
    if (!name) return this.avatarColors[0];
    return this.avatarColors[name.charCodeAt(0) % this.avatarColors.length];
  }

  // --- Counts for Sidebar ---

  get pendingCount(): number {
    // Use actual pending verification counts (telex + visa)
    return this.telexPendingStudents.length + this.visaPendingStudents.length;
  }

  get approvedCount(): number {
    return this.stats?.paymentsReceived || 0;
  }

  get rejectedCount(): number {
    return this.stats?.paymentsNotReceived || 0;
  }

  get totalStudents(): number {
    return this.stats?.totalStudentsAssigned || 0;
  }

  // --- Actions Needed Section Helpers ---

  /**
   * Check if there are pending telex fee verifications
   */
  get hasPendingTelexFees(): boolean {
    return this.students.some(s =>
      s.hasPaid && !this.isActionDisabled(s) && s.actionOnUser !== 'accountant'
    );
  }

  /**
   * Check if there are pending visa payment actions
   */
  get hasPendingVisaActions(): boolean {
    return this.students.some(s =>
      s.actionOnUser === 'accountant' &&
      (s.action === 'SEND_BANK_DETAILS_TO_AGENT' || s.action === 'CONFIRM_VISA_PAYMENT')
    );
  }

  /**
   * Get students pending telex fee verification
   */
  get telexPendingStudents(): AssignedStudent[] {
    return this.students.filter(s =>
      s.applicationStatus === 'TELEX_INITIATED' &&
      !this.isActionDisabled(s) &&
      s.actionOnUser !== 'accountant'
    );
  }

  /**
   * Get students pending visa payment actions
   */
  get visaPendingStudents(): AssignedStudent[] {
    return this.students.filter(s => {
      // Must have a visa payment request to be in this section
      if (!s.visaPaymentRequestedAmount || s.visaPaymentRequestedAmount <= 0) return false;

      const requested = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      const received = s.visaPaymentReceivedAmount || 0;
      const released = s.accToVisaManPaidAmount || 0;

      const isFullyCollected = received >= requested;
      const isFullyReleased = released >= requested;

      // If both collection and release are completely done, only show if there's a pending manual action
      if (isFullyCollected && isFullyReleased) {
        return s.action === 'SEND_BANK_DETAILS_TO_AGENT' ||
          s.action === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT' ||
          s.action === 'CONFIRM_VISA_PAYMENT';
      }

      // Otherwise, the workflow is still ongoing, keep it visible!
      return true;
    });
  }

  hasCollectionRequest(studentId: any): boolean {
    return this.collectionRequests.some(r => r.studentId == studentId);
  }

  // Visa Settlement Filters
  settlementSearchTerm: string = '';
  settlementStatusFilter: string = 'ALL';
  settlementAgentFilter: string = 'ALL';
  settlementCollegeFilter: string = 'ALL';

  // --- Visa Settlement KPI Getters ---

  get vsKpiSettledCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'SETTLED').length;
  }
  get vsKpiConfirmPendingCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'CONFIRMATION_PENDING').length;
  }
  get vsKpiReleasePendingCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'FUND_RELEASE_PENDING').length;
  }
  get vsKpiCollectionPendingCount(): number {
    return this.visaPendingStudents.filter(s => this.getFundReleaseStatus(s) === 'COLLECTION_PENDING').length;
  }
  get vsKpiTotalFeeAmount(): number {
    return this.visaPendingStudents.reduce((sum, s) => sum + (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0), 0);
  }
  get vsKpiTotalReleasedAmount(): number {
    return this.visaPendingStudents.reduce((sum, s) => {
      // If it's already settled or confirmation pending, the accountant has released it
      const status = this.getFundReleaseStatus(s);
      if (status === 'SETTLED' || status === 'CONFIRMATION_PENDING' || (s.accToVisaManPaidAmount || 0) > 0) {
        return sum + (s.accToVisaManPaidAmount || ((s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0)));
      }
      return sum;
    }, 0);
  }

  // --- Visa Settlement Unique Agents & Colleges (for filter dropdowns) ---
  get vsUniqueAgents(): string[] {
    const agents = this.visaPendingStudents
      .map(s => s.agentFullName || '')
      .filter(a => a.length > 0);
    return [...new Set(agents)].sort();
  }

  get vsUniqueColleges(): string[] {
    const colleges = this.visaPendingStudents
      .map(s => s.collegeName || '')
      .filter(c => c.length > 0);
    return [...new Set(colleges)].sort();
  }

  // --- Visa Settlement Chart Data ---
  get vsStatusChartData(): ChartConfiguration<'doughnut'>['data'] {
    return {
      labels: ['Settled', 'Confirm Pending', 'Release Pending', 'Collection Pending'],
      datasets: [{
        data: [
          this.vsKpiSettledCount,
          this.vsKpiConfirmPendingCount,
          this.vsKpiReleasePendingCount,
          this.vsKpiCollectionPendingCount
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }]
    };
  }

  vsStatusChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4
      }
    }
  };

  get vsAgentChartData(): ChartConfiguration<'bar'>['data'] {
    const agentMap = new Map<string, number>();
    this.visaPendingStudents.forEach(s => {
      const agent = s.agentFullName || 'Unknown';
      const fee = (s.visaPaymentRequestedAmount || 0) + (s.visaManServiceCharge || 0);
      agentMap.set(agent, (agentMap.get(agent) || 0) + fee);
    });
    const sorted = [...agentMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: sorted.map(e => e[0].length > 14 ? e[0].substring(0, 14) + '…' : e[0]),
      datasets: [{
        data: sorted.map(e => e[1]),
        backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 28
      }]
    };
  }

  vsAgentChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => ` Fee: ${ctx.parsed.x?.toLocaleString() || 0}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 11 } },
        border: { display: false }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#475569', font: { family: "'Inter', sans-serif", size: 12, weight: 600 as any } },
        border: { display: false }
      }
    }
  };

  get filteredVisaPendingStudents(): AssignedStudent[] {
    let filtered = this.visaPendingStudents;

    if (this.settlementStatusFilter !== 'ALL') {
      filtered = filtered.filter(s => this.getFundReleaseStatus(s) === this.settlementStatusFilter);
    }

    if (this.settlementAgentFilter !== 'ALL') {
      filtered = filtered.filter(s => (s.agentFullName || '') === this.settlementAgentFilter);
    }

    if (this.settlementCollegeFilter !== 'ALL') {
      filtered = filtered.filter(s => (s.collegeName || '') === this.settlementCollegeFilter);
    }

    if (this.settlementSearchTerm) {
      const term = this.settlementSearchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.fullName && s.fullName.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.applicationId && s.applicationId.toLowerCase().includes(term))
      );
    }

    return filtered.sort((a, b) => this.getLatestUpdateTimestamp(b) - this.getLatestUpdateTimestamp(a));
  }

  resetVisaSettlementFilters(): void {
    this.settlementSearchTerm = '';
    this.settlementStatusFilter = 'ALL';
    this.settlementAgentFilter = 'ALL';
    this.settlementCollegeFilter = 'ALL';
    this.visaSettlementCurrentPage = 1;
  }

  // --- Visa Settlement Pagination ---
  visaSettlementCurrentPage: number = 1;
  visaSettlementPageSize: number = 10;

  get paginatedVisaPendingStudents(): AssignedStudent[] {
    const startIndex = (this.visaSettlementCurrentPage - 1) * this.visaSettlementPageSize;
    return this.filteredVisaPendingStudents.slice(startIndex, startIndex + this.visaSettlementPageSize);
  }

  get visaSettlementTotalPages(): number {
    return Math.ceil(this.filteredVisaPendingStudents.length / this.visaSettlementPageSize) || 1;
  }

  nextVisaSettlementPage(): void {
    if (this.visaSettlementCurrentPage < this.visaSettlementTotalPages) {
      this.visaSettlementCurrentPage++;
    }
  }

  prevVisaSettlementPage(): void {
    if (this.visaSettlementCurrentPage > 1) {
      this.visaSettlementCurrentPage--;
    }
  }

  get visaSettlementStartIndex(): number {
    if (this.filteredVisaPendingStudents.length === 0) return 0;
    return (this.visaSettlementCurrentPage - 1) * this.visaSettlementPageSize + 1;
  }

  get visaSettlementEndIndex(): number {
    return Math.min(this.visaSettlementCurrentPage * this.visaSettlementPageSize, this.filteredVisaPendingStudents.length);
  }

  // --- Fullscreen ---

  toggleFullscreen(): void {
    const elem = document.documentElement;
    if (!this.isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      }
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      this.isFullscreen = false;
    }
    this.cdr.detectChanges();
  }

  // ======================= VISA PAYMENT WORKFLOW =======================

  /**
   * Get action button config for visa payment workflow
   */
  getVisaActionButton(student: any): { label: string, action: string, icon: string } | null {
    if (student.actionOnUser !== 'accountant') return null;

    switch (student.action) {
      case 'SEND_BANK_DETAILS_TO_AGENT':
        return { label: 'Send Bank Details', action: 'sendBankDetails', icon: 'credit-card' };
      case 'CONFIRM_VISA_PAYMENT':
        return { label: 'Confirm Payment', action: 'confirmPayment', icon: 'check-circle' };
      default:
        return null;
    }
  }

  getCollectionStatus(student: any): string {
    const requested = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
    const received = student.visaPaymentReceivedAmount || 0;

    // 1. VERIFICATION_PENDING: Agent submitted a payment that needs accountant confirmation.
    //    Backend ONLY sets this action when agent submits a new payment.
    //    Backend changes it away as soon as accountant confirms.
    if (student.action === 'CONFIRM_VISA_PAYMENT') {
      return 'VERIFICATION_PENDING';
    }

    // 2. PAID: All money collected
    if (received > 0 && received >= requested) {
      return 'PAID';
    }

    // 3. PENDING_AGENT_PAYMENT: Request sent to agent, waiting for their payment
    if (student.action === 'SEND_VISA_PAYMENT_TO_ACCOUNTANT') {
      return 'PENDING_AGENT_PAYMENT';
    }

    // 4. PARTIALLY_PAID or PENDING_COLLECTION: Accountant needs to act
    if (student.action === 'SEND_BANK_DETAILS_TO_AGENT') {
      if (received > 0 && received < requested) return 'PARTIALLY_PAID';
      return 'PENDING_COLLECTION';
    }

    // Fallback
    return 'PENDING_COLLECTION';
  }

  sendBankDetailsStep: 'form' | 'processing' | 'success' = 'form';

  /**
   * Open modal to send bank details to agent
   */
  openSendBankDetailsModal(student: any): void {
    console.log('Sending Bank Details for Student:', student); // DEBUG: Check if visaManServiceCharge is present
    this.selectedStudent = student;
    // Calculate total: Requested Visa Fee + Service Charge - Received Amount
    const visaFee = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;
    const received = student.visaPaymentReceivedAmount || 0;
    const rawTotal = (visaFee + serviceCharge) - received;
    this.bankDetailsAmount = Number(rawTotal.toFixed(2));

    this.bankDetailsCurrency = student.visaPaymentRequestedCurrency || 'INR';
    // Reset bank details form
    this.bankName = '';
    this.accountNumber = '';
    this.swiftCode = '';
    this.beneficiaryName = '';
    this.branchAddress = '';
    this.sendBankDetailsStep = 'form';
    this.showSendBankDetailsModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Close send bank details modal
   */
  closeSendBankDetailsModal(): void {
    this.showSendBankDetailsModal = false;
    this.selectedStudent = null;
    // Reset form fields
    this.bankName = '';
    this.accountNumber = '';
    this.swiftCode = '';
    this.beneficiaryName = '';
    this.branchAddress = '';
    this.sendBankDetailsStep = 'form';
    this.cdr.detectChanges();
  }

  confirmPaymentStep: 'form' | 'processing' | 'success' = 'form';

  /**
   * Open modal to confirm visa payment received
   */
  disbursedAmount: number | null = null;
  disbursementMode: string = 'CASH';
  disbursementTxId: string = '';
  disbursementDate: string = '';

  openConfirmPaymentModal(student: any): void {
    this.selectedStudent = student;
    // Pre-fill with outstanding amount: (base visa fee + service charge) - already received
    const baseFee = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;
    const alreadyReceived = student.visaPaymentReceivedAmount || 0;
    this.receivedAmount = (baseFee + serviceCharge) - alreadyReceived;
    this.receivedDate = new Date().toISOString().split('T')[0];
    this.confirmPaymentStep = 'form';
    this.showConfirmPaymentModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Close confirm payment modal
   */
  closeConfirmPaymentModal(): void {
    this.showConfirmPaymentModal = false;
    this.selectedStudent = null;
    this.confirmPaymentStep = 'form';
    this.cdr.detectChanges();
  }

  /**
   * Send bank details to Agent for visa payment
   * Called when student.action === 'SEND_BANK_DETAILS_TO_AGENT'
   */
  sendBankDetailsToAgent(studentId: number): void {
    if (!this.bankDetailsAmount || this.bankDetailsAmount <= 0) {
      this.showErrorToast('Please enter a valid amount');
      return;
    }
    if (!this.selectedSubAccountId) {
      this.showErrorToast('Please select a SubAccount');
      return;
    }

    this.processingId = studentId;
    this.sendBankDetailsStep = 'processing';
    this.cdr.detectChanges();

    const body = {
      accountantUsername: this.username,
      amount: this.bankDetailsAmount,
      currency: this.bankDetailsCurrency,
      subAccountId: this.selectedSubAccountId
    };

    this.http.post(`${environment.apiUrl}/api/visa/send-bank-details/${studentId}`, body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.sendBankDetailsStep = 'success';
          this.refreshData();
          setTimeout(() => {
            if (this.showSendBankDetailsModal) {
              this.closeSendBankDetailsModal();
            }
          }, 2000);
        },
        error: (err: any) => {
          this.sendBankDetailsStep = 'form';
          console.error('Error sending bank details:', err);
          this.showErrorToast('Failed to send bank details: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
  }

  /**
   * Send Reminder email to Agent
   */
  sendReminderEmail(student: any): void {
    if (!student || !student.id) return;

    this.processingId = student.id;
    this.cdr.detectChanges();

    const body = {
      accountantUsername: this.username
    };

    this.http.post(`${environment.apiUrl}/api/visa/send-reminder/${student.id}`, body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.showSuccess('Reminder sent successfully!', 'Reminder Sent');
          this.refreshData();
        },
        error: (err: any) => {
          console.error('Error sending reminder:', err);
          this.showErrorToast('Failed to send reminder: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
  }

  /**
   * Confirm visa payment received from Agent
   * Called when student.action === 'CONFIRM_VISA_PAYMENT'
   */
  confirmVisaPaymentReceived(studentId: number, receivedAmt: number, receivedDt: string): void {
    if (!receivedAmt || receivedAmt <= 0) {
      this.showErrorToast('Please enter a valid received amount');
      return;
    }
    if (!receivedDt) {
      this.showErrorToast('Please select a received date');
      return;
    }

    this.processingId = studentId;
    this.confirmPaymentStep = 'processing';
    this.cdr.detectChanges();

    const body = {
      accountantUsername: this.username,
      amount: receivedAmt, // Make sure amount is correct here
      receivedAmount: receivedAmt,
      receivedDate: receivedDt
    };

    this.http.post(`${environment.apiUrl}/api/visa/confirm-payment/${studentId}`, body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.processingId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.confirmPaymentStep = 'success';
          // Reload both students and passbooks fresh — no delay
          this.refreshData();
          setTimeout(() => {
            if (this.showConfirmPaymentModal) {
              this.closeConfirmPaymentModal();
            }
          }, 2000);
        },
        error: (err: any) => {
          this.confirmPaymentStep = 'form';
          console.error('Error confirming payment:', err);
          this.showErrorToast('Failed to confirm payment: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
  }

  /**
   * Show error modal message
   */
  showErrorModal = false;
  errorMessage = '';

  showErrorToast(message: string): void {
    this.errorMessage = message;
    this.showErrorModal = true;
    this.cdr.detectChanges();
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.cdr.detectChanges();
  }

  /**
   * Check if student needs visa action from accountant
   */
  needsVisaAction(student: any): boolean {
    return student.actionOnUser === 'accountant' &&
      (student.action === 'SEND_BANK_DETAILS_TO_AGENT' || student.action === 'CONFIRM_VISA_PAYMENT');
  }

  // --- Logout ---

  openLogoutModal(): void {
    this.isLogoutModalOpen = true;
    this.cdr.detectChanges();
  }

  cancelLogout(): void {
    this.isLogoutModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmLogout(): void {
    this.isLogoutModalOpen = false;
    this.currentLogoutMessage = this.logoutMessages[Math.floor(Math.random() * this.logoutMessages.length)];
    this.isLoggingOut = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      sessionStorage.clear();
      this.router.navigate(['/AdminLogin']);
    }, 2900);
  }

  logout(): void {
    this.openLogoutModal();
    this.showSendBankDetailsModal = false;
    this.cdr.detectChanges();
  }

  // ============================================
  // FUND REQUESTS (REQUESTED MONEY)
  // ============================================
  fundRequests: PaymentRequest[] = [];
  filteredFundRequests: PaymentRequest[] = [];

  // Pagination
  fundRequestsCurrentPage: number = 1;
  fundRequestsPageSize: number = 50;

  get paginatedFundRequests(): PaymentRequest[] {
    const startIndex = (this.fundRequestsCurrentPage - 1) * this.fundRequestsPageSize;
    return this.filteredFundRequests.slice(startIndex, startIndex + this.fundRequestsPageSize);
  }

  get totalFundRequestPages(): number {
    return Math.ceil(this.filteredFundRequests.length / this.fundRequestsPageSize) || 1;
  }

  nextFundRequestPage(): void {
    if (this.fundRequestsCurrentPage < this.totalFundRequestPages) {
      this.fundRequestsCurrentPage++;
    }
  }

  prevFundRequestPage(): void {
    if (this.fundRequestsCurrentPage > 1) {
      this.fundRequestsCurrentPage--;
    }
  }

  get fundRequestsStartIndex(): number {
    if (this.filteredFundRequests.length === 0) return 0;
    return (this.fundRequestsCurrentPage - 1) * this.fundRequestsPageSize + 1;
  }

  get fundRequestsEndIndex(): number {
    return Math.min(this.fundRequestsCurrentPage * this.fundRequestsPageSize, this.filteredFundRequests.length);
  }

  // Filters
  fundFilterRequester: string = '';
  fundFilterDate: string = '';
  fundFilterStatus: string = '';
  selectedFundRequest: PaymentRequest | null = null;
  showFundPaymentModal = false;

  fundPaymentForm = {
    amountPaid: 0,
    transactionId: '',
    paymentMode: 'NEFT',
    subAccountId: null as number | null,
    beneficiaryId: null as number | null
  };
  isFundSubmitting = false;
  isFundPaymentSuccess = false;
  isRejectingFund = false;
  showFundPaymentMenu = false;
  fundRejectionRemarks = '';
  showRejectionReasonModal = false;
  viewingRejectionReason = '';

  get fundSourceAccounts() {
    return this.subAccounts.filter(a => a.accountType !== 'CASH' && a.bankName !== 'CASH');
  }

  get isFundPaymentBalanceSufficient(): boolean {
    if (!this.fundPaymentForm.subAccountId || !this.fundPaymentForm.amountPaid) return true;
    const acc = this.fundSourceAccounts.find(a => a.id === this.fundPaymentForm.subAccountId);
    if (!acc) return false;
    return (acc.balance || 0) >= this.fundPaymentForm.amountPaid;
  }

  get isBeneficiarySelectionValid(): boolean {
    if (this.fundPaymentForm.paymentMode === 'CASH' || this.fundPaymentForm.paymentMode === 'AUTO_FILL') {
      return true;
    }
    return !!this.fundPaymentForm.beneficiaryId;
  }

  loadFundRequests(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.paymentRequestService.getAllRequests().subscribe({
      next: (data: any) => {
        this.fundRequests = data;
        // Compute stats or remaining amounts if not from backend
        this.fundRequests.forEach(req => {
          if (req.remainingAmount === undefined) {
            req.remainingAmount = (req.requestedAmount || 0) - (req.amountPaid || 0);
          }
        });
        this.applyFundFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading fund requests', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFundFilters(): void {
    this.filteredFundRequests = this.fundRequests.filter(req => {
      let match = true;
      if (this.fundFilterStatus) {
        match = match && req.status === this.fundFilterStatus;
      }
      if (this.fundFilterRequester) {
        const q = this.fundFilterRequester.toLowerCase();
        const fName = (req.requesterFullName || '').toLowerCase();
        const uName = (req.requesterUsername || '').toLowerCase();
        match = match && (fName.includes(q) || uName.includes(q));
      }
      if (this.fundFilterDate) {
        if (req.createdAt) {
          try {
            const d = new Date(req.createdAt).toISOString().split('T')[0];
            match = match && d === this.fundFilterDate;
          } catch (e) { match = false; }
        } else {
          match = false;
        }
      }
      return match;
    });
    this.fundRequestsCurrentPage = 1;
  }

  resetFundFilters(): void {
    this.fundFilterRequester = '';
    this.fundFilterDate = '';
    this.fundFilterStatus = '';
    this.applyFundFilters();
  }

  openFundPaymentModal(request: PaymentRequest): void {
    this.selectedFundRequest = request;
    // Default to remaining amount
    const remaining = request.remainingAmount !== undefined ? request.remainingAmount : ((request.requestedAmount || 0) - (request.amountPaid || 0));

    // Try to pre-select a payment mode based on requesterPaymentMode
    let defaultMode = 'NEFT';
    if (request.requesterPaymentMode) {
      const reqMode = request.requesterPaymentMode.toUpperCase();
      if (reqMode.includes('UPI')) defaultMode = 'UPI';
      else if (reqMode.includes('CASH')) defaultMode = 'CASH';
      else if (reqMode.includes('IMPS')) defaultMode = 'IMPS';
      else if (reqMode.includes('RTGS')) defaultMode = 'RTGS';
      else if (reqMode.includes('CHEQUE')) defaultMode = 'CHEQUE';
      else defaultMode = 'AUTO_FILL'; // Auto-fill from details
    }

    this.fundPaymentForm = {
      amountPaid: remaining > 0 ? remaining : 0,
      transactionId: '',
      paymentMode: defaultMode,
      subAccountId: null,
      beneficiaryId: null
    };
    this.isFundPaymentSuccess = false;
    this.isFundSubmitting = false;
    this.isRejectingFund = false;
    this.showFundPaymentMenu = false;
    this.fundRejectionRemarks = '';
    this.showFundPaymentModal = true;
    this.cdr.detectChanges();
  }

  getGeneratedQrCodeUrl(request: PaymentRequest | null): string | null {
    if (!request) return null;
    if (request.qrCode) return request.qrCode;

    // If no explicit qrCode, but there's a UPI ID in the details, generate one
    if (request.bankDetails) {
      // Regex to find a standard UPI ID pattern (e.g. name@bank)
      const match = request.bankDetails.match(/([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/);
      if (match) {
        const upiId = match[1];
        // Standard UPI Intent URI format
        const remaining = request.remainingAmount !== undefined ? request.remainingAmount : ((request.requestedAmount || 0) - (request.amountPaid || 0));
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(request.requesterFullName || '')}&am=${remaining > 0 ? remaining : 0}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;
      }
    }
    return null;
  }

  closeFundPaymentModal(): void {
    this.showFundPaymentModal = false;
    this.selectedFundRequest = null;
    this.isFundPaymentSuccess = false;
    this.isFundSubmitting = false;
    this.cdr.detectChanges();
  }

  showPurposeModalFlag: boolean = false;
  viewingPurposeText: string = '';

  openPurposeModal(purpose: string): void {
    this.viewingPurposeText = purpose || 'No purpose provided.';
    this.showPurposeModalFlag = true;
  }

  closePurposeModal(): void {
    this.showPurposeModalFlag = false;
  }

  openRejectionReason(reason: string): void {
    this.viewingRejectionReason = reason || 'No rejection reason provided.';
    this.showRejectionReasonModal = true;
  }

  closeRejectionReason(): void {
    this.showRejectionReasonModal = false;
  }

  editModePurpose = false;
  editModeLateFee = false;
  isUpdatingDetails = false;
  detailsUpdateSuccess = '';
  showPurposeText = false;
  updatePayload: any = {
    purpose: '',
    lateFeeType: 'PERCENTAGE',
    lateFeeValue: 0,
    fixedLateFine: 0
  };

  resetEditModes() {
    this.editModePurpose = false;
    this.editModeLateFee = false;
    this.detailsUpdateSuccess = '';
    this.showPurposeText = localStorage.getItem('showPurposeText') === 'true';
    if (this.selectedCreditForPurpose) {
      this.updatePayload = {
        purpose: this.selectedCreditForPurpose.purpose || '',
        lateFeeType: this.selectedCreditForPurpose.lateFeeType || 'PERCENTAGE',
        lateFeeValue: this.selectedCreditForPurpose.lateFeeValue || 0,
        fixedLateFine: this.selectedCreditForPurpose.fixedLateFine || 0
      };
    }
  }

  togglePurposeText() {
    this.showPurposeText = !this.showPurposeText;
    localStorage.setItem('showPurposeText', this.showPurposeText ? 'true' : 'false');
  }

  toggleEditPurpose() {
    this.editModePurpose = true;
  }

  toggleEditLateFee() {
    this.editModeLateFee = true;
  }

  cancelEditPurpose() {
    this.editModePurpose = false;
    if (this.selectedCreditForPurpose) {
      this.updatePayload.purpose = this.selectedCreditForPurpose.purpose || '';
    }
  }

  cancelEditLateFee() {
    this.editModeLateFee = false;
    if (this.selectedCreditForPurpose) {
      this.updatePayload.lateFeeType = this.selectedCreditForPurpose.lateFeeType || 'PERCENTAGE';
      this.updatePayload.lateFeeValue = this.selectedCreditForPurpose.lateFeeValue || 0;
      this.updatePayload.fixedLateFine = this.selectedCreditForPurpose.fixedLateFine || 0;
    }
  }

  saveCreditDetails(section: 'purpose' | 'lateFee') {
    if (!this.selectedCreditForPurpose || !this.selectedCreditForPurpose.id) return;

    this.isUpdatingDetails = true;
    this.detailsUpdateSuccess = '';
    this.cdr.detectChanges();

    const payload: any = {};
    if (section === 'purpose') {
      payload.purpose = this.updatePayload.purpose;
    } else {
      payload.lateFeeType = this.updatePayload.lateFeeType;
      payload.lateFeeValue = this.updatePayload.lateFeeValue;
      payload.fixedLateFine = this.updatePayload.fixedLateFine;
    }

    this.accountantService.updateCreditDetails(this.selectedCreditForPurpose.id, payload).subscribe({
      next: (updatedCredit) => {
        this.isUpdatingDetails = false;

        // Update local object
        if (this.selectedCreditForPurpose) {
          if (section === 'purpose') {
            this.selectedCreditForPurpose.purpose = updatedCredit.purpose;
          } else {
            this.selectedCreditForPurpose.lateFeeType = updatedCredit.lateFeeType;
            this.selectedCreditForPurpose.lateFeeValue = updatedCredit.lateFeeValue;
            this.selectedCreditForPurpose.fixedLateFine = updatedCredit.fixedLateFine;
          }
        }

        // Update list
        const index = this.credits.findIndex(c => c.id === updatedCredit.id);
        if (index !== -1) {
          this.credits[index] = updatedCredit;
        }

        if (section === 'purpose') this.editModePurpose = false;
        if (section === 'lateFee') this.editModeLateFee = false;

        this.detailsUpdateSuccess = 'Updated successfully!';
        this.cdr.detectChanges(); // Force UI update so success message shows without clicking

        setTimeout(() => {
          this.detailsUpdateSuccess = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.isUpdatingDetails = false;
        console.error('Error updating details', err);
        alert('Failed to update details.');
        this.cdr.detectChanges();
      }
    });
  }

  submitFundReject(): void {
    if (!this.selectedFundRequest || !this.selectedFundRequest.id) return;

    if (!this.fundRejectionRemarks || this.fundRejectionRemarks.trim().length === 0) {
      this.showErrorToast('Please provide a reason for rejection');
      return;
    }

    this.isFundSubmitting = true;
    this.cdr.detectChanges();

    // Simulating 2.9 second spinner
    setTimeout(() => {
      this.paymentRequestService.updateStatus(this.selectedFundRequest!.id!, { status: 'REJECTED', rejectionRemarks: this.fundRejectionRemarks }).subscribe({
        next: (res: any) => {
          this.isFundSubmitting = false;
          this.isRejectingFund = false;
          this.showFundPaymentModal = false;
          this.showSuccess('Fund request rejected successfully', 'Request Rejected');
          this.loadFundRequests();
        },
        error: (err: any) => {
          this.isFundSubmitting = false;
          this.showErrorToast('Failed to reject fund request');
          console.error(err);
        }
      });
    }, 2900);
  }

  submitFundPayment(): void {
    if (!this.selectedFundRequest || !this.selectedFundRequest.id) return;

    if (!this.isFundPaymentBalanceSufficient || !this.isBeneficiarySelectionValid) return;

    this.isFundSubmitting = true;

    // Validation
    if (this.fundPaymentForm.paymentMode !== 'CASH' && !this.fundPaymentForm.transactionId) {
      this.showErrorToast('Transaction ID is required for online payments.');
      return;
    }
    if (this.fundPaymentForm.amountPaid <= 0) {
      this.showErrorToast('Please enter a valid amount.');
      return;
    }

    const remaining = this.selectedFundRequest.remainingAmount !== undefined
      ? this.selectedFundRequest.remainingAmount
      : ((this.selectedFundRequest.requestedAmount || 0) - (this.selectedFundRequest.amountPaid || 0));

    if (this.fundPaymentForm.amountPaid > remaining) {
      this.showErrorToast(`Amount cannot exceed the remaining balance of ₹${remaining}`);
      return;
    }

    // SubAccount balance validation
    if (!this.fundPaymentForm.subAccountId) {
      this.showErrorToast('Please select a Source Account to pay from.');
      return;
    }
    const selectedAcc = this.subAccounts.find(a => a.id === this.fundPaymentForm.subAccountId);
    if (selectedAcc && (selectedAcc.balance || 0) < this.fundPaymentForm.amountPaid) {
      this.showErrorToast(`Insufficient balance in ${selectedAcc.bankName}. Available: ₹${selectedAcc.balance?.toFixed(2)}, Required: ₹${this.fundPaymentForm.amountPaid}`);
      return;
    }

    this.isFundSubmitting = true;

    // Auto-fill logic handling
    let finalPaymentMode = this.fundPaymentForm.paymentMode;
    if (finalPaymentMode === 'AUTO_FILL') {
      finalPaymentMode = this.selectedFundRequest.requesterPaymentMode || 'NEFT';
    }

    let finalTransactionId = finalPaymentMode === 'CASH' ? null : this.fundPaymentForm.transactionId;
    if (this.fundPaymentForm.beneficiaryId && finalTransactionId) {
      const b = this.beneficiaries.find((x: any) => x.id === this.fundPaymentForm.beneficiaryId);
      if (b) {
        finalTransactionId += ` (To: ${b.beneficiaryName})`;
      }
    }

    const payload = {
      amountPaid: this.fundPaymentForm.amountPaid,
      accountantPaymentMode: finalPaymentMode,
      transactionId: finalTransactionId,
      subAccountId: this.fundPaymentForm.subAccountId,
      beneficiaryId: this.fundPaymentForm.beneficiaryId
    };

    this.isFundSubmitting = true;
    const startTime = Date.now();

    this.paymentRequestService.payRequest(this.selectedFundRequest.id, payload).subscribe({
      next: () => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 2900 - elapsed); // Ensure spinner shows for 2.9 seconds

        setTimeout(() => {
          this.isFundSubmitting = false;
          this.isFundPaymentSuccess = true;
          this.cdr.detectChanges();

          // Show the success screen inside the modal for 1.5 seconds, then close
          setTimeout(() => {
            this.closeFundPaymentModal();
            this.loadFundRequests();
          }, 1500);
        }, delay);
      },
      error: (err: any) => {
        console.error('Error processing payment', err);
        this.isFundSubmitting = false;
        this.showErrorToast('Failed to process payment');
        this.cdr.detectChanges();
      }
    });
  }

  getFundStatusClass(status: string | undefined): string {
    if (!status) return 'status-default';
    switch (status) {
      case 'PENDING': return 'status-warning';
      case 'PAID': return 'status-success';
      case 'PARTIAL': return 'status-info';
      case 'REJECTED': return 'status-danger';
      default: return 'status-default';
    }
  }

  // Count of pending/partial fund requests (not fully paid)
  get pendingFundRequestsCount(): number {
    return this.fundRequests.filter(r => r.status === 'PENDING' || r.status === 'PARTIAL').length;
  }

  // Format DateTime for passbook
  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    // dateStr might be an array if LocalDateTime is serialized as array by Jackson, but usually it's string.
    // Let's assume standard ISO string from backend since it's typically configured so in modern Spring Boot
    if (Array.isArray(dateStr)) {
      // [year, month, day, hour, minute]
      dateStr = `${dateStr[0]}-${String(dateStr[1]).padStart(2, '0')}-${String(dateStr[2]).padStart(2, '0')}T${String(dateStr[3]).padStart(2, '0')}:${String(dateStr[4]).padStart(2, '0')}`;
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPassbookStatusClass(status: string): string {
    if (!status) return 'pb-status-pending';
    switch (status) {
      case 'INITIATED': return 'pb-status-initiated';
      case 'SENT_TO_AGENT': return 'pb-status-warning';
      case 'ACCOUNTANT_CONFIRMED': return 'pb-status-info';
      case 'PAID_TO_VISAMAN': return 'pb-status-success';
      case 'COMPLETED': return 'pb-status-completed';
      default: return 'pb-status-pending';
    }
  }

  // ═══════════ FINANCIAL SUMMARY COMPUTATIONS ═══════════

  // --- Agent Transactions (Money IN) ---
  getTotalRequestedFromAgents(): number {
    return this.agentPassbooks.reduce((sum: number, p: any) => sum + (p.requestedAmountByAccountantToAgent || 0), 0);
  }

  getTotalReceivedFromAgents(): number {
    return this.agentPassbooks.reduce((sum: number, p: any) => sum + (p.amountPaidByAgent || 0), 0);
  }

  getTotalConfirmedFromAgents(): number {
    return this.agentPassbooks.reduce((sum: number, p: any) => sum + (p.amountConfirmedByAccountant || 0), 0);
  }

  getPendingFromAgents(): number {
    const requested = this.getTotalRequestedFromAgents();
    const confirmed = this.getTotalConfirmedFromAgents();
    return Math.max(0, requested - confirmed);
  }

  getAgentCollectionRate(): number {
    const requested = this.getTotalRequestedFromAgents();
    if (requested === 0) return 0;
    return Math.min(100, (this.getTotalConfirmedFromAgents() / requested) * 100);
  }

  // --- VisaMan Payouts (Money OUT) ---
  getTotalVisaFeeRequested(): number {
    return this.visaManPassbooks.reduce((sum: number, p: any) => sum + (p.visaAmountRequest || 0), 0);
  }

  getTotalServiceCharge(): number {
    return this.visaManPassbooks.reduce((sum: number, p: any) => sum + (p.serviceChargeRequested || 0), 0);
  }

  getTotalOwedToVisaMan(): number {
    return this.getTotalVisaFeeRequested() + this.getTotalServiceCharge();
  }

  getTotalPaidToVisaMan(): number {
    return this.visaManPassbooks.reduce((sum: number, p: any) => sum + (p.totalAmountPaidByAccountant || 0), 0);
  }

  getPendingToVisaMan(): number {
    return Math.max(0, this.getTotalOwedToVisaMan() - this.getTotalPaidToVisaMan());
  }

  getVisaManPayoutRate(): number {
    const owed = this.getTotalOwedToVisaMan();
    if (owed === 0) return 0;
    return Math.min(100, (this.getTotalPaidToVisaMan() / owed) * 100);
  }

  // --- Fund Requests (Money OUT) ---
  getTotalPaidToFundRequests(): number {
    return this.fundRequests.reduce((sum: number, req: any) => sum + (req.amountPaid || 0), 0);
  }

  // --- Net Balance ---
  getTotalBorrowedFunds(): number {
    return this.credits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
  }

  getTotalCredits(): number {
    return this.credits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
  }

  getOutstandingCredits(): number {
    return this.credits.reduce((sum, credit) => sum + (credit.outstandingAmount || 0), 0);
  }

  getRepaidCredits(): number {
    return this.credits.reduce((sum, credit) => sum + (credit.amountRepaid || 0), 0);
  }

  getNetCashBalance(): number {
    let balance = this.getTotalConfirmedFromAgents() - this.getTotalPaidToVisaMan() - this.getTotalPaidToFundRequests();
    if (this.includeCreditInBalance) {
      balance += this.getTotalBorrowedFunds();
    }
    return balance;
  }

  toggleCreditInclusion(): void {
    this.includeCreditInBalance = !this.includeCreditInBalance;
  }

  // --- Add Funds Modal Logic ---
  showAddFundsSuccess = false;
  generatedSchedule: any[] = [];

  // Repayment & Installments
  showRepaymentSuccess = false;
  showRepaymentModal = false;
  repaymentForm: any = { amount: 0, subAccountId: null, notes: '', repaymentType: 'STANDARD' };
  selectedCreditForRepayment: any = null;
  isRepaying = false;

  // Installment Tracking
  currentInstallmentNum: number = 1;
  totalInstallments: number = 1;

  showInstallmentsModal = false;
  selectedCreditInstallments: any[] = [];
  selectedCreditForInstallments: any = null;

  getSubAccountBalance(id: number | null | undefined): number {
    if (!id) return 0;
    const acc = this.subAccounts.find(a => a.id === id);
    return acc?.balance || 0;
  }

  openAddFundsModal(): void {
    this.creditForm = {
      amount: 0,
      method: 'FRIEND',
      creditDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      interestRate: 0,
      friendName: '',
      friendPhone: '',
      bankName: '',
      loanTenureMonths: 0,
      cardInfo: '',
      emiDetails: '',
      subAccountId: null,
      purpose: '',
      totalRepaymentAmount: 0,
      installmentAmount: 0,
      repaymentStructure: 'LUMP_SUM',
      lateFeeType: 'PERCENTAGE',
      lateFeeValue: 0,
      fixedLateFine: 0
    };
    this.showAddFundsModal = true;
    this.cdr.detectChanges();
  }

  closeAddFundsModal(): void {
    this.showAddFundsModal = false;
    this.showAddFundsSuccess = false;
    this.generatedSchedule = [];
    this.cdr.detectChanges();
  }

  calculateEMI(): void {
    const principal = this.creditForm.amount || 0;
    const months = this.creditForm.loanTenureMonths || 0;
    const rate = this.creditForm.interestRate || 0;

    if (principal <= 0 || months <= 0) {
      this.creditForm.installmentAmount = 0;
      this.creditForm.totalRepaymentAmount = principal;
      this.generatedSchedule = [];
      return;
    }

    if (this.creditForm.repaymentStructure === 'LUMP_SUM') {
      // Simple Interest: P + (P * r/100 * months/12)
      if (rate > 0) {
        const interest = principal * (rate / 100) * (months / 12);
        this.creditForm.totalRepaymentAmount = Math.round(principal + interest);
      } else {
        this.creditForm.totalRepaymentAmount = principal;
      }
      this.creditForm.installmentAmount = 0;
      this.generatedSchedule = [];
    } else {
      // Installments - Reducing Balance EMI
      if (rate > 0) {
        const r = rate / 12 / 100;
        const num = principal * r * Math.pow(1 + r, months);
        const den = Math.pow(1 + r, months) - 1;
        const emi = num / den;

        this.creditForm.installmentAmount = Math.round(emi);
        this.creditForm.totalRepaymentAmount = Math.round(emi * months);
      } else {
        this.creditForm.installmentAmount = Math.round(principal / months);
        this.creditForm.totalRepaymentAmount = principal;
      }
      this.generateSchedule();
    }
  }

  onTotalRepaymentChange(newValue: number): void {
    this.creditForm.totalRepaymentAmount = newValue;
    if (this.creditForm.repaymentStructure === 'INSTALLMENTS' && (this.creditForm.loanTenureMonths || 0) > 0) {
      this.creditForm.installmentAmount = Math.round(newValue / (this.creditForm.loanTenureMonths || 1));
      this.generateSchedule();
    }
  }

  generateSchedule(): void {
    this.generatedSchedule = [];
    if (this.creditForm.repaymentStructure !== 'INSTALLMENTS' || !this.creditForm.dueDate || (this.creditForm.loanTenureMonths || 0) <= 0) {
      return;
    }

    let currentDate = new Date(this.creditForm.dueDate);
    const months = this.creditForm.loanTenureMonths || 0;
    for (let i = 1; i <= months; i++) {
      this.generatedSchedule.push({
        installmentNum: i,
        date: currentDate.toISOString().split('T')[0],
        amount: this.creditForm.installmentAmount
      });
      // Increment by 1 month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  submitCredit(): void {
    if (!this.creditForm.amount || this.creditForm.amount <= 0) {
      this.showErrorToast('Amount must be greater than 0.');
      return;
    }
    if (!this.creditForm.subAccountId) {
      this.showErrorToast('Please select a Bank Account to credit to.');
      return;
    }


    // Set basic validation based on method
    if (this.creditForm.method === 'FRIEND' && (!this.creditForm.friendName || !this.creditForm.friendPhone)) {
      this.showErrorToast('Please fill out Friend Name and Phone.');
      return;
    }
    if (this.creditForm.method === 'LOAN' && !this.creditForm.bankName) {
      this.showErrorToast('Please provide the Bank Name for the loan.');
      return;
    }
    if (this.creditForm.method === 'CREDIT_CARD' && !this.creditForm.cardInfo) {
      this.showErrorToast('Please provide the Credit Card info.');
      return;
    }

    this.isSubmitting = true;
    this.accountantService.addCredit(this.creditForm, this.username)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.isSubmitting = false; this.cdr.detectChanges(); })
      )
      .subscribe({
        next: (res: any) => {
          this.credits.unshift(res);
          this.showAddFundsSuccess = true;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to add credit', err);
          this.showErrorToast('Failed to add funds. Please check your inputs.');
        }
      });
  }

  // ======================= FUND RELEASE =======================
  showReleaseFundModal: boolean = false;
  selectedReleaseStudent: any = null;

  openReleaseFundModal(student: any) {
    if (student.action === 'SEND_BANK_DETAILS_TO_AGENT') {
      this.showErrorToast("Cannot release funds. A Request must be generated first.");
      return;
    }
    this.selectedReleaseStudent = student;
    this.initFundReleaseForm(student);
    this.showInlineReleaseFund = true;
  }

  closeReleaseFundModal() {
    this.showInlineReleaseFund = false;
    this.showReleaseFundModal = false;
    this.selectedReleaseStudent = null;
  }

  initFundReleaseForm(student: any) {
    const studentId = student.id;
    if (!this.fundReleaseForms[studentId]) {
      const totalAmount = (student.visaPaymentRequestedAmount || 0) + (student.visaManServiceCharge || 0);
      this.fundReleaseForms[studentId] = {
        visaFee: null,
        serviceCharge: null,
        totalReleasedAmount: totalAmount,
        sourceAccountId: null,
        beneficiaryAccountId: null,
        transactionReference: '',
        transferDate: '',
        remarks: ''
      };
    }
  }

  getSelectedBeneficiary(studentId: number): any {
    const form = this.fundReleaseForms[studentId];
    if (!form || !form.beneficiaryAccountId) return null;
    return this.beneficiaries.find((b: any) => b.id == form.beneficiaryAccountId) || null;
  }

  onFundReleaseFileSelected(event: any, studentId: number) {
    const file = event.target.files[0];
    if (file) {
      this.fundReleaseFiles[studentId] = file;
    }
  }

  showConfirmReleaseFundModal = false;
  selectedStudentForRelease: any = null;

  releaseFundsToVM(student: any) {
    const form = this.fundReleaseForms[student.id];

    if (!form || !form.totalReleasedAmount || !form.transactionReference) {
      this.showErrorToast('Please fill in all required fields (Total Amount, Ref).');
      return;
    }

    this.selectedStudentForRelease = student;
    this.showConfirmReleaseFundModal = true;
  }

  closeConfirmReleaseModal() {
    this.showConfirmReleaseFundModal = false;
    this.selectedStudentForRelease = null;
  }

  executeReleaseFunds() {
    if (!this.selectedStudentForRelease) return;
    const student = this.selectedStudentForRelease;
    const form = this.fundReleaseForms[student.id];
    const visaFee = student.visaPaymentRequestedAmount || 0;
    const serviceCharge = student.visaManServiceCharge || 0;

    const formData = new FormData();
    formData.append('accountantUsername', this.username);
    formData.append('sourceAccountId', form.sourceAccountId ? form.sourceAccountId.toString() : '');
    formData.append('beneficiaryAccountId', form.beneficiaryAccountId ? form.beneficiaryAccountId.toString() : '');
    formData.append('visaFee', visaFee.toString());
    formData.append('serviceCharge', serviceCharge.toString());
    formData.append('transferDate', form.transferDate);
    formData.append('transactionReference', form.transactionReference);

    if (form.remarks) {
      formData.append('remarks', form.remarks);
    }

    if (this.fundReleaseFiles[student.id]) {
      formData.append('receipt', this.fundReleaseFiles[student.id]);
    }

    this.isSubmitting = true;
    this.http.post(`${environment.apiUrl}/api/fund-release/release/${student.id}`, formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showSuccess('Funds released to Visa Manager successfully!', 'Payment Released Successfully');
        this.closeConfirmReleaseModal();
        this.closeReleaseFundModal();

        // Eagerly update UI state so button disappears immediately
        if (this.selectedSettlementStudent) {
          this.selectedSettlementStudent.accToVisaManPaidAmount = visaFee + serviceCharge;
          this.selectedSettlementStudent.accToVisaManStatus = 'RELEASED_PENDING_CONFIRMATION';
          this.cdr.detectChanges();
        }

        // Refresh data
        this.refreshData();
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error releasing funds:', error);
        this.showErrorToast('Failed to release funds. ' + (error.error?.message || error.message));
      }
    });
  }

  fetchOutstandingRecovery() {
    this.http.get<any[]>(`${environment.apiUrl}/api/accountant/outstanding-recovery?username=${this.username}`).subscribe({
      next: (res: any) => {
        this.outstandingRecoveryData = res;
      },
      error: (err: any) => {
        console.error('Failed to fetch outstanding recovery', err);
      }
    });
  }

  // Calculate Visa Settlement Status
  getCurrentEmiStatus(credit: any): string {
    if (credit.repaymentStructure !== 'INSTALLMENTS' || !credit.installmentAmount) {
      return 'N/A';
    }
    if (credit.status === 'CLOSED' || credit.status === 'FORECLOSED') {
      return '';
    }
    // If we have the installments loaded, use them for accurate status
    if (credit._installments && credit._installments.length > 0) {
      const nextPending = credit._installments.find((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE');
      if (nextPending) {
        const paid = Number(nextPending.paidAmount) || 0;
        if (paid > 0.01) {
          return 'In Progress';
        }
        return nextPending.status === 'OVERDUE' ? 'Overdue' : 'Upcoming';
      }
      return '';
    }
    // Fallback: simple arithmetic
    return 'Upcoming';
  }

  getCurrentEmiInfo(credit: any): string {
    if (credit.repaymentStructure !== 'INSTALLMENTS' || !credit.installmentAmount) {
      return 'N/A';
    }
    const repaid = Number(credit.amountRepaid) || 0;
    const emi = Number(credit.installmentAmount);

    const ratio = repaid / emi;
    const fullEmisPaid = Math.floor(ratio + 0.001);
    const currentActiveEmi = fullEmisPaid + 1;
    const total = credit.loanTenureMonths || 1;

    if (credit.status === 'CLOSED' || currentActiveEmi > total) {
      return 'Completed';
    }
    if (credit.status === 'FORECLOSED') {
      return 'Foreclosed';
    }
    return `EMI ${currentActiveEmi}/${total}`;
  }

  getLastPaidEmiInfo(credit: any): string | null {
    if (credit.repaymentStructure !== 'INSTALLMENTS' || !credit.installmentAmount) {
      return null;
    }
    const repaid = Number(credit.amountRepaid) || 0;
    const emi = Number(credit.installmentAmount);

    const ratio = repaid / emi;
    const fullEmisPaid = Math.floor(ratio + 0.001);

    if (fullEmisPaid > 0) {
      return `EMI ${fullEmisPaid} Paid`;
    }
    return null;
  }

  getFundReleaseStatus(student: any): string {
    if (student.accToVisaManStatus === 'CONFIRMED' || student.accToVisaManStatus === 'FUNDS_CONFIRMED' || student.accToVisaManStatus === 'FULLY_PAID' || student.accToVisaManStatus === 'SETTLED' || student.accToVisaManStatus === 'FEE_RECEIVED') {
      return 'SETTLED';
    }
    if (student.accToVisaManPaidAmount > 0 || student.accToVisaManStatus === 'RELEASED_PENDING_CONFIRMATION') {
      return 'CONFIRMATION_PENDING';
    }
    if (student.action !== 'SEND_BANK_DETAILS_TO_AGENT' || student.visaPaymentReceivedAmount > 0) {
      return 'FUND_RELEASE_PENDING';
    }
    return 'COLLECTION_PENDING';
  }

  // --- Beneficiary Accounts Methods ---
  loadBeneficiaries(): void {
    this.beneficiaryService.getAllBeneficiaries().subscribe({
      next: (data: any) => {
        this.beneficiaries = data;
      },
      error: (err: any) => console.error('Error loading beneficiaries:', err)
    });
  }

  getActiveBeneficiaries() {
    return this.beneficiaries.filter(b => b.status === 'Active');
  }

  beneficiarySearchTerm: string = '';
  isEditingBeneficiary: boolean = false;

  get filteredBeneficiaries(): any[] {
    if (!this.beneficiarySearchTerm.trim()) {
      return this.beneficiaries;
    }
    const term = this.beneficiarySearchTerm.toLowerCase();
    return this.beneficiaries.filter(b =>
      (b.beneficiaryName && b.beneficiaryName.toLowerCase().includes(term)) ||
      (b.bankName && b.bankName.toLowerCase().includes(term)) ||
      (b.accountNumber && b.accountNumber.toLowerCase().includes(term)) ||
      (b.beneficiaryType && b.beneficiaryType.toLowerCase().includes(term))
    );
  }

  hasReleasedFunds(studentId: number): boolean {
    return this.fundReleases.some(r => r.student?.id === studentId);
  }

  openBeneficiaryWizard(): void {
    this.isBeneficiaryWizardOpen = true;
    this.beneficiaryWizardStep = 1;
    this.isEditingBeneficiary = false;
    this.newBeneficiary = {
      beneficiaryType: 'Visa Manager',
      beneficiaryName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      upiId: '',
      mobileNumber: '',
      emailAddress: '',
      status: 'Active'
    };
  }

  editBeneficiary(beneficiary: any): void {
    this.isEditingBeneficiary = true;
    this.newBeneficiary = { ...beneficiary };
    this.isEditBeneficiaryModalOpen = true;
  }

  isEditBeneficiaryModalOpen: boolean = false;
  isUpdatingBeneficiary: boolean = false;
  updateBeneficiarySuccess: boolean = false;

  isViewBeneficiaryModalOpen: boolean = false;
  selectedBeneficiaryToView: any = null;

  viewBeneficiary(b: any): void {
    this.selectedBeneficiaryToView = b;
    this.isViewBeneficiaryModalOpen = true;
    this.cdr.detectChanges();
  }

  closeViewBeneficiaryModal(): void {
    this.isViewBeneficiaryModalOpen = false;
    this.selectedBeneficiaryToView = null;
    this.cdr.detectChanges();
  }

  closeEditBeneficiaryModal(): void {
    this.isEditBeneficiaryModalOpen = false;
    this.isEditingBeneficiary = false;
    setTimeout(() => this.updateBeneficiarySuccess = false, 300);
  }

  async updateBeneficiary(): Promise<void> {
    if (this.newBeneficiary.id) {
      this.isUpdatingBeneficiary = true;
      this.updateBeneficiarySuccess = false;
      this.cdr.detectChanges();

      const startTime = Date.now();

      try {
        await import('rxjs').then(m => m.firstValueFrom(
          this.http.put(`http://localhost:8080/api/accountant/beneficiary-accounts/${this.newBeneficiary.id}`, this.newBeneficiary)
        ));

        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        await new Promise(resolve => setTimeout(resolve, delay));

        this.loadBeneficiaries();
        this.isUpdatingBeneficiary = false;
        this.updateBeneficiarySuccess = true;
        this.cdr.detectChanges();

      } catch (err) {
        console.error('Error updating beneficiary:', err);
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 3000 - elapsed);

        await new Promise(resolve => setTimeout(resolve, delay));

        this.isUpdatingBeneficiary = false;
        this.updateBeneficiarySuccess = false;
        this.cdr.detectChanges();
      }
    }
  }

  closeBeneficiaryWizard(): void {
    this.isBeneficiaryWizardOpen = false;
  }

  nextBeneficiaryStep(): void {
    if (this.beneficiaryWizardStep < 3) {
      this.beneficiaryWizardStep++;
    }
  }

  prevBeneficiaryStep(): void {
    if (this.beneficiaryWizardStep > 1) {
      this.beneficiaryWizardStep--;
    }
  }

  submitBeneficiary(): void {
    this.beneficiaryService.createBeneficiary(this.newBeneficiary).subscribe({
      next: (res: any) => {
        this.loadBeneficiaries();
        this.showSuccess('Beneficiary Created Successfully!', `${res.beneficiaryName} has been added.`);
        this.closeBeneficiaryWizard();
      },
      error: (err: any) => {
        console.error('Error creating beneficiary:', err);
      }
    });
  }
}
