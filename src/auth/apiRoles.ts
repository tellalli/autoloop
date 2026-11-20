import type { Role } from './auth.types';

// Same admitted BeWhere roles as atagforbusiness. No Access (0) and System (8)
// cannot sign in. The local ticket store uses Master for read-all access;
// every other admitted role can read and save only its own tickets.
export const API_ROLE_NAMES: Readonly<Record<number, Role | undefined>> = {
  [-2]: 'Installer',
  [-1]: 'Driver',
  1: 'User',
  2: 'Manager',
  3: 'Supervisor',
  4: 'Integrator',
  5: 'Administrator',
  6: 'Dealer',
  7: 'Master',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && Object.values(API_ROLE_NAMES).includes(value as Role);
}
