import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { AgentService, AgentData } from '../../../services/agent.service';
import { environment } from '../../../../environments/environment';

interface Student {
  id: number;
  name: string;
  applicationId: string;
  university?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageRawDate?: string;
  unreadCount?: number;
  isPending?: boolean;
  isResolved?: boolean;
  program?: string;
  country?: string;
  appliedDate?: string;
  currentStage?: string;
  isActive?: boolean;
  agentName?: string;
  managerName?: string;
  contactNo?: string;
  email?: string;
}

interface Message {
  id?: number;
  content: string;
  senderRole: string; // Changed to string to handle 'MANAGER', 'ADMISSION_MANAGER', etc.
  timestamp?: string;
  studentId?: number;
  agentId?: string | number;
  studentName?: string;
  studentApplicationId?: string;
  read?: boolean;
  attachment?: { name: string; type: string; size: string };
}

@Component({
  selector: 'app-message-dashboard',
  standalone: false,
  templateUrl: './message-dashboard.html',
  styleUrl: './message-dashboard.css',
})
export class MessageDashboard implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Data
  agentUsername: string = '';
  agentId: number | null = null;
  allStudents: Student[] = [];
  filteredStudents: Student[] = [];
  activeChats: Student[] = []; // List of students in the sidebar
  filteredActiveChats: Student[] = [];
  chatSearchQuery: string = '';
  chatDateFilter: string = '';
  activeKpi: string = 'all';
  messages: Message[] = [];

  // KPIs
  stats = {
    totalConversations: 0,
    unreadMessages: 0,
    pendingReplies: 0,
    todayChats: 0
  };

  // UI State
  activeTab: 'ALL' | 'MY' = 'ALL';
  filterUniversity: string = 'All';
  filterStatus: string = 'All';
  filterDateRange: string = '';

  selectedStudent: Student | null = null;
  newMessage: string = '';
  isNewChatModalOpen: boolean = false;
  searchQuery: string = '';
  isLoadingMessages: boolean = false;
  
  isProfileVisible: boolean = false;
  showPhoneDetails: boolean = false;
  showEmailDetails: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AdminAuthService,
    private agentService: AgentService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    if (userData && userData.username) {
      this.agentUsername = userData.username;
      this.fetchAgentProfile();
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  // --- API Calls ---

  fetchAgentProfile(): void {
    this.agentService.getAgentProfile(this.agentUsername).subscribe({
      next: (data: any) => {
        this.agentId = data.id;
        
        // The Agent Profile API returns the full list of students with all details
        const studentsFromAgent = data.student || [];
        
        this.allStudents = studentsFromAgent.map((s: any) => ({
          id: s.id,
          name: s.fullName || 'Unknown',
          applicationId: s.applicationId,
          university: s.college?.collegeName || 'Not Assigned',
          program: s.appliedFor || 'N/A',
          country: s.citizenship || 'Unknown',
          appliedDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Unknown',
          currentStage: s.applicationStatus || 'Pending',
          agentName: s.agent?.fullName || 'N/A',
          managerName: s.admissionManager?.fullName || 'N/A',
          contactNo: s.contactNo || 'No Contact',
          email: s.email || 'No Email',
          unreadCount: 0
        }));
        
        this.filteredStudents = [...this.allStudents];
        this.enrichActiveChats();
        
        this.fetchRecentChats();
      },
      error: (err) => console.error('Failed to fetch agent profile', err)
    });
  }

  toggleProfile(): void {
    this.isProfileVisible = !this.isProfileVisible;
  }

  togglePhone(): void {
    this.showPhoneDetails = !this.showPhoneDetails;
    if (this.showPhoneDetails) this.showEmailDetails = false;
  }

  toggleEmail(): void {
    this.showEmailDetails = !this.showEmailDetails;
    if (this.showEmailDetails) this.showPhoneDetails = false;
  }

  fetchRecentChats(): void {
    if (!this.agentId) return;
    const url = `${environment.apiUrl}/api/messages/agent/${this.agentId}`;
    this.http.get<Message[]>(url).subscribe({
      next: (messages) => {
        this.processRecentChats(messages);
      },
      error: (err) => console.error('Failed to fetch recent chats', err)
    });
  }

  processRecentChats(messages: Message[]): void {
    const uniqueStudentIds = new Set<number>();
    const chats: Student[] = [];

    // Sort messages by timestamp descending
    messages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    messages.forEach(msg => {
      if (msg.studentId) {
        if (!uniqueStudentIds.has(msg.studentId)) {
          uniqueStudentIds.add(msg.studentId);

          // Try to find full student details
          const fullStudent = this.allStudents.find(s => s.id === msg.studentId);
          
          // Calculate KPI flags based on the last message and student status
          const isPending = msg.senderRole !== 'AGENT';
          const isUnread = msg.read === false && isPending;
          
          // We can consider a conversation "Resolved" if the student is Enrolled or explicitly Completed
          const stage = fullStudent?.currentStage?.toLowerCase() || '';
          const isResolved = stage.includes('enrolled') || stage.includes('completed') || stage.includes('resolved');

          chats.push({
            id: msg.studentId,
            name: fullStudent?.name || msg.studentName || 'Unknown Student',
            applicationId: fullStudent?.applicationId || msg.studentApplicationId || '',
            university: fullStudent?.university,
            program: fullStudent?.program,
            country: fullStudent?.country,
            appliedDate: fullStudent?.appliedDate,
            currentStage: fullStudent?.currentStage,
            agentName: fullStudent?.agentName,
            managerName: fullStudent?.managerName,
            contactNo: fullStudent?.contactNo || 'No Contact',
            email: fullStudent?.email || 'No Email',
            lastMessage: msg.content,
            lastMessageTime: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            lastMessageRawDate: msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('en-CA') : '',
            unreadCount: isUnread ? 1 : 0,
            isPending: isPending,
            isResolved: isResolved
          });
        } else {
          // Accumulate unread counts from older messages in the same chat
          const existingChat = chats.find(c => c.id === msg.studentId);
          if (existingChat && msg.read === false && msg.senderRole !== 'AGENT') {
            existingChat.unreadCount = (existingChat.unreadCount || 0) + 1;
          }
        }
      }
    });

    this.activeChats = chats;
    this.filteredActiveChats = [...this.activeChats];
    
    if (this.activeChats.length > 0 && !this.selectedStudent) {
      this.selectedStudent = this.activeChats[0];
      this.fetchMessages(this.selectedStudent.id);
    }
    this.updateStats();
    this.cdr.detectChanges();
  }

  updateStats(): void {
    this.stats.totalConversations = this.activeChats.length;
    this.stats.unreadMessages = this.activeChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    this.stats.pendingReplies = this.activeChats.filter(chat => chat.isPending).length;
    
    const today = new Date().toLocaleDateString('en-CA');
    this.stats.todayChats = this.activeChats.filter(chat => chat.lastMessageRawDate === today).length;
  }

  enrichActiveChats(): void {
    if (!this.activeChats.length || !this.allStudents.length) return;
    this.activeChats = this.activeChats.map(chat => {
      const fullStudent = this.allStudents.find(s => s.id === chat.id);
      if (fullStudent) {
        return {
          ...chat,
          name: fullStudent.name,
          applicationId: fullStudent.applicationId,
          university: fullStudent.university,
          program: fullStudent.program,
          country: fullStudent.country,
          appliedDate: fullStudent.appliedDate,
          currentStage: fullStudent.currentStage,
          agentName: fullStudent.agentName,
          managerName: fullStudent.managerName,
          contactNo: fullStudent.contactNo,
          email: fullStudent.email
        };
      }
      return chat;
    });
    this.filteredActiveChats = [...this.activeChats];
    if (this.selectedStudent) {
      const updated = this.activeChats.find(c => c.id === this.selectedStudent!.id);
      if (updated) this.selectedStudent = updated;
    }
  }

  fetchMessages(studentId: number): void {
    this.isLoadingMessages = true;
    const url = `${environment.apiUrl}/api/messages/student/${studentId}`;
    this.http.get<Message[]>(url).subscribe({
      next: (data) => {
        this.messages = data;
        this.isLoadingMessages = false;
        this.scrollToBottom();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch messages', err);
        this.isLoadingMessages = false;
        this.cdr.detectChanges();
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedStudent || !this.agentId) return;

    const payload = {
      agentId: this.agentId, // Use numeric ID
      studentId: this.selectedStudent.id,
      content: this.newMessage,
      senderRole: 'AGENT'
    };

    const url = `${environment.apiUrl}/api/messages/send`;

    // Optimistic update
    const tempMessage: Message = {
      content: this.newMessage,
      senderRole: 'AGENT',
      timestamp: new Date().toISOString()
    };
    this.messages.push(tempMessage);
    this.newMessage = '';
    this.scrollToBottom();

    this.http.post(url, payload).subscribe({
      next: (res) => {
        this.fetchMessages(this.selectedStudent!.id);
      },
      error: (err) => {
        console.error('Failed to send message', err);
      }
    });
  }

  // --- UI Logic ---

  openNewChatModal(): void {
    this.isNewChatModalOpen = true;
    this.searchQuery = '';
    this.filterStudents();
  }

  closeNewChatModal(): void {
    this.isNewChatModalOpen = false;
  }

  onSearchChange(): void {
    this.filterStudents();
  }

  filterStudents(): void {
    if (!this.searchQuery) {
      this.filteredStudents = this.allStudents;
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredStudents = this.allStudents.filter(s =>
        s.name.toLowerCase().includes(query) ||
        (s.applicationId && s.applicationId.toLowerCase().includes(query))
      );
    }
  }

  setKpiFilter(filter: string): void {
    this.activeKpi = filter;
    this.filterChats();
  }

  filterChats(): void {
    let results = this.activeChats;

    if (this.chatSearchQuery) {
      const query = this.chatSearchQuery.toLowerCase();
      results = results.filter(s =>
        s.name.toLowerCase().includes(query) ||
        (s.applicationId && s.applicationId.toLowerCase().includes(query))
      );
    }

    if (this.chatDateFilter) {
      results = results.filter(s => s.lastMessageRawDate === this.chatDateFilter);
    }

    if (this.activeKpi === 'unread') {
      results = results.filter(s => (s.unreadCount || 0) > 0);
    } else if (this.activeKpi === 'pending') {
      results = results.filter(s => s.isPending);
    } else if (this.activeKpi === 'today') {
      const today = new Date().toLocaleDateString('en-CA');
      results = results.filter(s => s.lastMessageRawDate === today);
    }

    this.filteredActiveChats = [...results];
    this.chatCurrentPage = 1; // Reset to first page on filter
  }

  // --- Pagination ---
  chatCurrentPage: number = 1;
  chatsPerPage: number = 5;

  get paginatedChats(): Student[] {
    const startIndex = (this.chatCurrentPage - 1) * this.chatsPerPage;
    return this.filteredActiveChats.slice(startIndex, startIndex + this.chatsPerPage);
  }

  get chatTotalPages(): number {
    return Math.ceil(this.filteredActiveChats.length / this.chatsPerPage) || 1;
  }

  chatGoToPage(page: number) {
    if (page >= 1 && page <= this.chatTotalPages) {
      this.chatCurrentPage = page;
    }
  }

  isMarkingAsRead: boolean = false;

  markAsRead(): void {
    if (!this.selectedStudent || this.isMarkingAsRead) return;

    this.isMarkingAsRead = true;

    const studentId = this.selectedStudent.id;
    
    // Call backend to persist read status
    this.http.put(`${environment.apiUrl}/api/messages/read/student/${studentId}`, { readerRole: 'AGENT' })
      .subscribe({
        next: () => {
          // Update messages locally
          this.messages.forEach(msg => {
            if (msg.senderRole !== 'AGENT') {
              msg.read = true;
            }
          });

          // Update the student in activeChats
          const chat = this.activeChats.find(c => c.id === studentId);
          if (chat) {
            chat.unreadCount = 0;
            chat.isPending = false;
          }

          if (this.selectedStudent) {
            this.selectedStudent.unreadCount = 0;
            this.selectedStudent.isPending = false;
          }

          // Refresh KPI stats and filters
          this.updateStats();
          this.filterChats();
          this.isMarkingAsRead = false;
        },
        error: (err) => {
          console.error('Failed to mark messages as read', err);
          this.isMarkingAsRead = false;
        }
      });
  }

  startChat(student: Student): void {
    if (!this.activeChats.find(s => s.id === student.id)) {
      this.activeChats.unshift(student);
    }
    this.selectChat(student);
    this.closeNewChatModal();
  }

  selectChat(student: Student): void {
    this.selectedStudent = student;
    this.messages = []; // Clear previous messages
    this.fetchMessages(student.id);
  }

  getStudentDisplayName(student: Student): string {
    if (student.applicationId) {
      return `${student.applicationId}_${student.name}`;
    }
    return student.name;
  }
}
