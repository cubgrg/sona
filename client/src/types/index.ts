export interface Location {
  id: string;
  name: string;
  address: string | null;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  role?: string;
  locationId?: string | null;
  location?: Location | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count: { members: number };
}

export interface ChannelDetail extends Channel {
  members: {
    userId: string;
    role: string;
    user: Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'status'>;
  }[];
}

export interface Conversation {
  id: string;
  createdAt: string;
  members: {
    userId: string;
    user: Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'status'>;
  }[];
  messages?: {
    id: string;
    content: string;
    createdAt: string;
    author: Pick<User, 'id' | 'displayName'>;
  }[];
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string | null;
  conversationId: string | null;
  threadParentId: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  author: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  _count?: { threadReplies: number };
  reactions?: ReactionData[];
}

export interface ThreadData {
  parent: Message;
  replies: Message[];
}

export interface ReactionData {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
  user: Pick<User, 'id' | 'displayName'>;
}

export interface SearchResult extends Message {
  channel?: { id: string; name: string } | null;
}

// --- Hospitality types ---

export interface Shift {
  id: string;
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  notes: string | null;
  location: Location;
}

export type FeedPostType = 'announcement' | 'event' | 'employee_of_month' | 'policy_update' | 'praise';

export interface FeedReaction {
  id: string;
  emoji: string;
  userId: string;
  feedPostId: string;
  user: Pick<User, 'id' | 'displayName'>;
}

export interface Praise {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  category: string | null;
  createdAt: string;
  fromUser: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  toUser: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
}

export interface FeedPost {
  id: string;
  authorId: string;
  type: FeedPostType;
  title: string | null;
  content: string;
  imageUrl: string | null;
  locationScope: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'displayName' | 'avatarUrl'> & { role?: string };
  reactions: FeedReaction[];
  praise?: Praise | null;
}

export interface UnreadChannel {
  id: string;
  name: string;
  count: number;
}

export interface PayPeriod {
  id: string;
  startDate: string;
  endDate: string;
  payDate: string;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  netPay: number;
  status: string;
}

export interface DashboardData {
  user: Pick<User, 'id' | 'displayName'> & { role: string; locationId: string | null; location: Location | null };
  nextShift: Shift | null;
  weekShifts: Shift[];
  unreadSummary: { totalUnread: number; channels: UnreadChannel[] };
  recentPraise: Praise[];
  nextPay: PayPeriod | null;
}
