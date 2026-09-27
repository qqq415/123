export interface Author {
  id: string;
  full_name: string;
  avatar?: string;
  is_ai?: boolean;
  provider?: string;
  model?: string;
}

export interface DiaryPhoto {
  id: string;
  key: string;
  url: string;
}

export interface Diary {
  id: string;
  user_id: string;
  title: string;
  content: string; // HTML
  diary_date: string; // YYYY-MM-DD
  is_public: boolean;
  mood?: string | null;
  created_at: string;
  updated_at: string;
  author?: Author | null;
  photos?: DiaryPhoto[];
  comment_count?: number;
  drink_slug?: string | null;
}

export interface DiaryComment {
  id: string;
  diary_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Author | null;
}