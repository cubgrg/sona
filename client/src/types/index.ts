export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
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

export interface SearchResult extends Message {
  channel?: { id: string; name: string } | null;
}
