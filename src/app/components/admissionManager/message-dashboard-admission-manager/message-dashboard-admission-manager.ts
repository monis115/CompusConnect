import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { AdmissionManagerService } from '../../../services/admission-manager.service';

// Interfaces
interface MessageDTO {
  id: number;
  content: string;
  timestamp: string;
  senderRole: 'AGENT' | 'MANAGER';
  isRead: boolean;
  studentId: number;
  studentName: string;
  studentApplicationId: string;
  agentId: number;
  agentName: string;
  managerId: number;
  managerName: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read'; // Delivery status
  reactions?: string[]; // Emoji reactions
  attachments?: MessageAttachment[]; // File attachments
}

interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'audio';
  url: string;
  size: number;
}

interface Conversation {
  studentId: number;
  studentName: string;
  studentApplicationId: string;
  agentId: number;
  agentName: string;
  latestMessage: string;
  latestTimestamp: Date;
  unreadCount: number;
  isTyping?: boolean; // Typing indicator
  isPinned?: boolean; // Pinned conversations
  isMuted?: boolean; // Muted notifications
  isArchived?: boolean; // Archived conversations
  online?: boolean; // Online status
}

interface Student {
  id: number;
  fullName: string;
  applicationId?: string;
  email: string;
  agentName?: string;
  agentId?: number;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

interface MessageDraft {
  studentId: number;
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-message-dashboard-admission-manager',
  standalone: false,
  templateUrl: './message-dashboard-admission-manager.html',
  styleUrl: './message-dashboard-admission-manager.css',
})
export class MessageDashboardAdmissionManager implements OnInit, OnDestroy {
  @ViewChild('messageInput') messageInput?: ElementRef;

  private destroy$ = new Subject<void>();
  private draftSaveInterval$ = interval(5000); // Auto-save drafts every 5s

  // Manager data
  managerId: number | null = null;
  managerUsername: string | null = null;

  // Conversations and messages
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: MessageDTO[] = [];

  // Students list for new chat
  allStudents: Student[] = [];
  filteredStudents: Student[] = [];

  // UI State
  isLoadingInbox = false;
  isLoadingMessages = false;
  isSendingMessage = false;
  isRefreshingChats = false;
  showNewChatModal = false;
  showCommandPalette = false;
  showEmojiPicker = false;
  showMessageActions = false;
  selectedMessageId: number | null = null;

  newMessageContent = '';
  searchQuery = '';
  commandQuery = '';

  // Advanced Features
  messageDrafts: Map<number, string> = new Map();
  messageTemplates: MessageTemplate[] = [];

  // Theme
  isDarkMode = false;

  // Mobile
  isMobileSidebarOpen = false;

  // Keyboard shortcuts
  shortcuts = {
    'Ctrl+K': 'Quick Search',
    'Ctrl+N': 'New Chat',
    'Enter': 'Send Message',
    'Shift+Enter': 'New Line',
    'Esc': 'Close Modal'
  };

  // Sound enabled
  soundEnabled = true;

  constructor(
    private admissionService: AdmissionManagerService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.managerUsername = sessionStorage.getItem('userId');
    if (!this.managerUsername) {
      console.error('Manager username not found in session');
      return;
    }

    this.loadManagerProfile();
    this.setupDraftAutoSave();
    this.loadThemePreference();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== KEYBOARD SHORTCUTS ==========
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl/Cmd + K: Quick Search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.showCommandPalette = !this.showCommandPalette;
      this.cdr.detectChanges();
    }

    // Ctrl/Cmd + N: New Chat
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      this.openNewChatModal();
    }

    // Escape: Close modals
    if (event.key === 'Escape') {
      this.closeAllModals();
    }
  }

  // ========== DATA LOADING ==========
  loadManagerProfile(): void {
    if (!this.managerUsername) return;

    this.admissionService.getManagerDetails(this.managerUsername)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.managerId = data.id;
          this.extractStudents(data);
          this.loadInbox();
          this.loadDrafts();
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading manager profile:', err)
      });
  }

  extractStudents(managerData: any): void {
    const studentMap = new Map<number, Student>();

    // Extract from top-level students
    if (managerData.students) {
      managerData.students.forEach((s: any) => {
        studentMap.set(s.id, {
          id: s.id,
          fullName: s.fullName,
          applicationId: s.applicationId,
          email: s.email,
          agentName: s.agent?.name || s.agentName || 'Unknown Agent',
          agentId: s.agent?.id || s.agentId || 0
        });
      });
    }

    // Extract from colleges -> universityPerson -> students
    if (managerData.colleges) {
      managerData.colleges.forEach((college: any) => {
        if (college.universityPerson?.students) {
          college.universityPerson.students.forEach((s: any) => {
            studentMap.set(s.id, {
              id: s.id,
              fullName: s.fullName,
              applicationId: s.applicationId,
              email: s.email,
              agentName: s.agent?.name || s.agentName || 'Unknown Agent',
              agentId: s.agent?.id || s.agentId || 0
            });
          });
        }
      });
    }

    this.allStudents = Array.from(studentMap.values());
    this.filteredStudents = [...this.allStudents];
  }

  loadInbox(): void {
    if (!this.managerId) return;

    this.isLoadingInbox = true;
    this.cdr.detectChanges();

    this.admissionService.getManagerMessages(this.managerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: MessageDTO[]) => {
          this.processInbox(messages);
          this.isLoadingInbox = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading inbox:', err);
          this.isLoadingInbox = false;
          this.cdr.detectChanges();
        }
      });
  }

  processInbox(messages: MessageDTO[]): void {
    const convMap = new Map<number, Conversation>();

    messages.forEach(msg => {
      if (!convMap.has(msg.studentId)) {
        convMap.set(msg.studentId, {
          studentId: msg.studentId,
          studentName: msg.studentName,
          studentApplicationId: msg.studentApplicationId,
          agentId: msg.agentId,
          agentName: msg.agentName,
          latestMessage: msg.content,
          latestTimestamp: new Date(msg.timestamp),
          unreadCount: 0,
          isTyping: false,
          isPinned: false,
          isMuted: false,
          isArchived: false,
          online: Math.random() > 0.5 // Simulated online status
        });
      }

      const conv = convMap.get(msg.studentId)!;
      const msgTime = new Date(msg.timestamp);

      if (msgTime > conv.latestTimestamp) {
        conv.latestMessage = msg.content;
        conv.latestTimestamp = msgTime;
      }

      if (!msg.isRead && msg.senderRole === 'AGENT') {
        conv.unreadCount++;
      }
    });

    this.conversations = Array.from(convMap.values())
      .sort((a, b) => {
        // Pinned first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.latestTimestamp.getTime() - a.latestTimestamp.getTime();
      });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.loadMessages(conversation.studentId);
    this.loadDraftForConversation(conversation.studentId);
    this.isMobileSidebarOpen = false; // Close mobile sidebar
    this.cdr.detectChanges();

    // Auto-focus input
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  loadMessages(studentId: number): void {
    this.isLoadingMessages = true;
    this.messages = [];
    this.cdr.detectChanges();

    this.admissionService.getStudentMessages(studentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: MessageDTO[]) => {
          this.messages = messages.map(msg => ({
            ...msg,
            status: msg.isRead ? 'read' : 'delivered' as 'read' | 'delivered'
          })).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          this.isLoadingMessages = false;
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => {
          console.error('Error loading messages:', err);
          this.isLoadingMessages = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ========== MESSAGE SENDING ==========
  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.selectedConversation) return;

    const payload = {
      agentId: this.selectedConversation.agentId,
      studentId: this.selectedConversation.studentId,
      content: this.newMessageContent.trim(),
      senderRole: 'MANAGER'
    };

    this.isSendingMessage = true;
    this.cdr.detectChanges();

    // Play send sound
    this.playSound('send');

    // Optimistic UI update
    const optimisticMessage: MessageDTO = {
      id: Date.now(),
      content: payload.content,
      timestamp: new Date().toISOString(),
      senderRole: 'MANAGER',
      isRead: true,
      studentId: payload.studentId,
      studentName: this.selectedConversation.studentName,
      studentApplicationId: this.selectedConversation.studentApplicationId,
      agentId: payload.agentId,
      agentName: this.selectedConversation.agentName,
      managerId: this.managerId!,
      managerName: '',
      status: 'sending'
    };

    this.messages.push(optimisticMessage);
    this.newMessageContent = '';
    this.clearDraft(this.selectedConversation.studentId);
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 50);

    this.admissionService.sendMessage(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSendingMessage = false;
          // Update status to sent
          const sentMsg = this.messages.find(m => m.id === optimisticMessage.id);
          if (sentMsg) {
            sentMsg.status = 'sent';
            // Simulate delivery after 1s
            setTimeout(() => {
              sentMsg.status = 'delivered';
              this.cdr.detectChanges();
            }, 1000);
          }
          this.loadInbox(); // Refresh inbox
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error sending message:', err);
          this.isSendingMessage = false;
          this.playSound('error');
          // Remove optimistic message on error
          this.messages = this.messages.filter(m => m.id !== optimisticMessage.id);
          this.cdr.detectChanges();
        }
      });
  }

  // ========== MESSAGE ACTIONS ==========
  copyMessage(message: MessageDTO): void {
    navigator.clipboard.writeText(message.content);
    this.playSound('success');
    // Show toast notification (simplified)
    console.log('Message copied!');
  }

  deleteMessage(messageId: number): void {
    if (confirm('Delete this message?')) {
      this.messages = this.messages.filter(m => m.id !== messageId);
      this.playSound('success');
      this.cdr.detectChanges();
    }
  }

  showActionsForMessage(messageId: number): void {
    this.selectedMessageId = this.selectedMessageId === messageId ? null : messageId;
    this.cdr.detectChanges();
  }

  // ========== CONVERSATION MANAGEMENT ==========
  pinConversation(conversation: Conversation): void {
    conversation.isPinned = !conversation.isPinned;
    this.sortConversations();
    this.playSound('success');
  }

  muteConversation(conversation: Conversation): void {
    conversation.isMuted = !conversation.isMuted;
    this.playSound('success');
  }

  archiveConversation(conversation: Conversation): void {
    conversation.isArchived = true;
    this.conversations = this.conversations.filter(c => !c.isArchived);
    this.selectedConversation = null;
    this.playSound('success');
    this.cdr.detectChanges();
  }

  sortConversations(): void {
    this.conversations.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.latestTimestamp.getTime() - a.latestTimestamp.getTime();
    });
    this.cdr.detectChanges();
  }

  // ========== DRAFTS ==========
  setupDraftAutoSave(): void {
    this.draftSaveInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.newMessageContent && this.selectedConversation) {
          this.saveDraft(this.selectedConversation.studentId, this.newMessageContent);
        }
      });
  }

  saveDraft(studentId: number, content: string): void {
    this.messageDrafts.set(studentId, content);
    localStorage.setItem(`draft_${studentId}`, content);
  }

  loadDrafts(): void {
    // Load all drafts from localStorage
    this.allStudents.forEach(student => {
      const draft = localStorage.getItem(`draft_${student.id}`);
      if (draft) {
        this.messageDrafts.set(student.id, draft);
      }
    });
  }

  loadDraftForConversation(studentId: number): void {
    const draft = this.messageDrafts.get(studentId);
    if (draft) {
      this.newMessageContent = draft;
      this.cdr.detectChanges();
    }
  }

  clearDraft(studentId: number): void {
    this.messageDrafts.delete(studentId);
    localStorage.removeItem(`draft_${studentId}`);
  }

  // ========== MODAL MANAGEMENT ==========
  openNewChatModal(): void {
    this.showNewChatModal = true;
    this.searchQuery = '';
    this.filteredStudents = [...this.allStudents];
    this.cdr.detectChanges();
  }

  closeNewChatModal(): void {
    this.showNewChatModal = false;
    this.searchQuery = '';
    this.cdr.detectChanges();
  }

  closeAllModals(): void {
    this.showNewChatModal = false;
    this.showCommandPalette = false;
    this.showEmojiPicker = false;
    this.showMessageActions = false;
    this.cdr.detectChanges();
  }

  // ========== SEARCH & FILTER ==========
  filterStudents(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredStudents = [...this.allStudents];
    } else {
      this.filteredStudents = this.allStudents.filter(s =>
        s.fullName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.applicationId?.toLowerCase().includes(query)
      );
    }
    this.cdr.detectChanges();
  }

  filterConversations(query: string): void {
    // Implement fuzzy search for conversations
    const lowerQuery = query.toLowerCase();
    this.conversations = this.conversations.filter(conv =>
      conv.studentName.toLowerCase().includes(lowerQuery) ||
      conv.studentApplicationId.toLowerCase().includes(lowerQuery) ||
      conv.latestMessage.toLowerCase().includes(lowerQuery)
    );
    this.cdr.detectChanges();
  }

  startChatWithStudent(student: Student): void {
    // Check if conversation already exists
    const existing = this.conversations.find(c => c.studentId === student.id);

    if (existing) {
      this.selectConversation(existing);
    } else {
      // Create a new conversation placeholder
      const newConv: Conversation = {
        studentId: student.id,
        studentName: student.fullName,
        studentApplicationId: student.applicationId || '',
        agentId: student.agentId || 0,
        agentName: student.agentName || 'Agent',
        latestMessage: 'Start a new conversation',
        latestTimestamp: new Date(),
        unreadCount: 0,
        isTyping: false,
        isPinned: false,
        online: true
      };

      this.selectedConversation = newConv;
      this.messages = [];
      this.cdr.detectChanges();
    }

    this.closeNewChatModal();
  }

  // ========== THEME ==========
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    document.querySelector('.message-dashboard')?.classList.toggle('dark-mode', this.isDarkMode);
  }

  loadThemePreference(): void {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme === 'dark';
    if (this.isDarkMode) {
      setTimeout(() => {
        document.querySelector('.message-dashboard')?.classList.add('dark-mode');
      }, 100);
    }
  }

  // ========== MOBILE ==========
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    this.cdr.detectChanges();
  }

  // ========== UTILITIES ==========
  scrollToBottom(): void {
    const chatArea = document.querySelector('.messages-list');
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  formatTime(timestamp: string | Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  truncate(text: string, length: number = 50): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  // ========== SOUND EFFECTS ==========
  playSound(type: 'send' | 'receive' | 'success' | 'error'): void {
    if (!this.soundEnabled) return;

    // Web Audio API for simple notification sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different sounds
    const frequencies = {
      send: 800,
      receive: 600,
      success: 1000,
      error: 300
    };

    oscillator.frequency.value = frequencies[type];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('soundEnabled', String(this.soundEnabled));
  }

  // ========== REFRESH CHATS ==========
  refreshChats(): void {
    if (this.isRefreshingChats) return;

    this.isRefreshingChats = true;
    this.cdr.detectChanges();

    // Reload inbox after a short delay for UX
    setTimeout(() => {
      this.loadInbox();

      // Keep spinner for 1.9 seconds as requested
      setTimeout(() => {
        this.isRefreshingChats = false;
        this.playSound('success');
        this.cdr.detectChanges();
      }, 1900);
    }, 0);
  }

  // ========== MESSAGE INPUT ==========
  onMessageInputKeyDown(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
