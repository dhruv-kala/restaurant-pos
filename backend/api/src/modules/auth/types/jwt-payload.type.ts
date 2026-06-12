export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  tenantId: string | null;
  outletId: string | null;
  roles: string[];
  permissions?: string[];
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
  exp?: number;
  iat?: number;
}
