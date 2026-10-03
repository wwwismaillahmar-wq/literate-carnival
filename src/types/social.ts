export type ContentVisibility = 'public' | 'friends' | 'private';
export type ContentStatus =
  | 'draft'
  | 'pending'
  | 'needs_revision'
  | 'accepted'
  | 'published'
  | 'rejected'
  | 'archived';

export type FriendshipStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'blocked';

export type MediaType = 'image' | 'video' | 'file';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  visibility: ContentVisibility;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Contribution {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  visibility: ContentVisibility;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface MediaAsset {
  id: string;
  owner_id: string;
  post_id: string | null;
  contribution_id: string | null;
  bucket_id: string;
  object_path: string;
  media_type: MediaType;
  mime_type: string;
  file_size: number | null;
  created_at: string;
}

export interface ModerationReview {
  id: string;
  reviewer_id: string | null;
  post_id: string | null;
  contribution_id: string | null;
  decision: ContentStatus;
  note: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}
