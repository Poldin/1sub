export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface MintTokenRequest {
  sub: string;
  email?: string;
  scope?: string[];
}

export interface MintTokenResponse {
  token: string;
}


