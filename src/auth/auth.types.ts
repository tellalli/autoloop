export type Role =
  | 'Installer' | 'Driver' | 'User' | 'Manager' | 'Supervisor'
  | 'Integrator' | 'Administrator' | 'Dealer' | 'Master';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  token: string;
  accountId: string;
  accountName: string;
}
