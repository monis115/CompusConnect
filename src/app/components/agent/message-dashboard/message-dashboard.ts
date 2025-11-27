import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminAuthService } from '../../../services/admin-auth-service';
import { AgentService, AgentData } from '../../../services/agent.service';

interface Student {
  id: number;
  name: string;
  applicationId: string;
}

interface Message {
  id?: number;
  content: string;
  senderRole: 'AGENT' | 'ADMISSION_MANAGER' | 'DOC_MANAGER' | 'UNIVERSITY';
  timestamp?: string;
  studentId?: number;
  agentId?: string | number;
  studentName?: string;
  studentApplicationId?: string;
  read?: boolean;
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
  messages: Message[] = [];

  // State
  selectedStudent: Student | null = null;
  newMessage: string = '';
  isNewChatModalOpen: boolean = false;
  searchQuery: string = '';
  isLoadingMessages: boolean = false;

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
      next: (data: AgentData) => {
        this.agentId = data.id;
        this.fetchStudents();
        this.fetchRecentChats();
      },
      error: (err) => console.error('Failed to fetch agent profile', err)
    });
  }

  fetchStudents(): void {
    if (!this.agentUsername) return;
    const url = `http://localhost:8080/api/agents/${this.agentUsername}/students`;
    this.http.get<Student[]>(url).subscribe({
      next: (data) => {
        this.allStudents = data;
        this.filteredStudents = data;
      },
      error: (err) => console.error('Failed to fetch students', err)
    });
  }

  fetchRecentChats(): void {
    if (!this.agentId) return;
    const url = `http://localhost:8080/api/messages/agent/${this.agentId}`;
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

    // Sort messages by timestamp descending to get most recent first
    messages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    messages.forEach(msg => {
      if (msg.studentId && !uniqueStudentIds.has(msg.studentId)) {
        uniqueStudentIds.add(msg.studentId);
        chats.push({
          id: msg.studentId,
          name: msg.studentName || 'Unknown Student',
          applicationId: msg.studentApplicationId || ''
        });
      }
    });

    this.activeChats = chats;
    this.cdr.detectChanges();
  }

  fetchMessages(studentId: number): void {
    this.isLoadingMessages = true;
    const url = `http://localhost:8080/api/messages/student/${studentId}`;
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

    const url = `http://localhost:8080/api/messages/send`;

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
        // Optionally refresh messages or just keep the optimistic one
        // this.fetchMessages(this.selectedStudent!.id); 
      },
      error: (err) => {
        console.error('Failed to send message', err);
        // Handle error (maybe remove the optimistic message)
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

  startChat(student: Student): void {
    // Add to active chats if not already there
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
