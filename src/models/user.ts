export interface User {
  id: number;
  name: string;
  email: string;
  region?: string | null;
  language?: string | null;
  created_at: string;
}
