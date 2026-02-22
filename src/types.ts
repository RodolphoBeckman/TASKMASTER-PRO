export interface User {
  id: number;
  username: string;
  role: 'master' | 'collaborator';
  name: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assigned_to: number;
  assigned_name?: string;
  status: 'pending' | 'completed' | 'failed';
  failure_reason?: string;
  due_date: string;
}

export interface TimeLog {
  id: number;
  user_id: number;
  type: 'start' | 'pause' | 'resume' | 'end';
  timestamp: string;
}

export interface Feedback {
  id: number;
  user_id: number;
  content: string;
  date: string;
}
