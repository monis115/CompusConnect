# Implementation Plan - MessageDashboard Component

## Goal
Create a professional, "Google Chat" style messaging component for the Agent Dashboard.

## Proposed Changes

### Component Logic (`message-dashboard.ts`)
- **Imports**: `HttpClient`, `AdminAuthService`.
- **Properties**: `agentId`, `students`, `activeChats`, `selectedStudent`, `messages`, `newMessage`, `showNewChatModal`, `searchQuery`.
- **Methods**: `ngOnInit`, `fetchStudents`, `openNewChat`, `startChat`, `selectChat`, `fetchMessages`, `sendMessage`.

### Template Structure (`message-dashboard.html`)
- **Layout**: Sidebar + Main Chat.
- **Sidebar**: "New Chat" button, Active Chats list.
- **Main Chat**: Header, Message List, Input Area.
- **Modal**: Student search and selection.

### Styling (`message-dashboard.css`)
- **Theme**: Google Chat aesthetic.
- **Bubbles**: Distinct styles for sent/received.
