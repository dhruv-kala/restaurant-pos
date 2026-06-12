export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  outletId: string | null;
  roles: string[];
  permissions?: string[];
}
