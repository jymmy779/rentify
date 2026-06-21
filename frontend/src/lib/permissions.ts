import { UserRole } from '@/types';

type RoleInput = UserRole | null | undefined;

const activeRoles: UserRole[] = ['owner', 'admin', 'staff'];
const manageableRoles: UserRole[] = ['owner', 'admin', 'staff', 'pending'];

export const isActiveRole = (role: RoleInput): role is 'owner' | 'admin' | 'staff' => {
  return activeRoles.includes(role as UserRole);
};

export const canCreateUser = (actorRole: RoleInput, targetRole: RoleInput): boolean => {
  if (!isActiveRole(actorRole) || !isActiveRole(targetRole)) return false;

  if (actorRole === 'owner') {
    return targetRole === 'admin' || targetRole === 'staff';
  }

  if (actorRole === 'admin') {
    return targetRole === 'staff';
  }

  return false;
};

export const canEditUserProfile = (
  actorRole: RoleInput,
  targetRole: RoleInput,
  isSelf = false
): boolean => {
  if (!isActiveRole(actorRole) || !targetRole) return false;

  if (isSelf) {
    return true;
  }

  if (actorRole === 'owner') {
    return targetRole !== 'owner';
  }

  if (actorRole === 'admin') {
    return targetRole === 'staff' || targetRole === 'pending';
  }

  return false;
};

export const canSetUserRole = (
  actorRole: RoleInput,
  targetRole: RoleInput,
  desiredRole: RoleInput,
  isSelf = false
): boolean => {
  if (!isActiveRole(actorRole) || !targetRole || !desiredRole) return false;

  if (!manageableRoles.includes(desiredRole)) return false;

  if (isSelf) {
    return actorRole === 'owner' && desiredRole === 'admin';
  }

  if (actorRole === 'owner') {
    if (targetRole === 'owner') return false;

    if (desiredRole === 'owner') {
      return targetRole === 'admin';
    }

    return ['admin', 'staff', 'pending'].includes(desiredRole);
  }

  if (actorRole === 'admin') {
    return targetRole === 'staff' || targetRole === 'pending';
  }

  return false;
};

export const getAssignableRoles = (
  actorRole: RoleInput,
  targetRole: RoleInput,
  isSelf = false
): UserRole[] => {
  if (!isActiveRole(actorRole) || !targetRole) return [];

  if (isSelf) {
    return actorRole === 'owner' ? ['admin'] : [];
  }

  if (actorRole === 'owner') {
    if (targetRole === 'admin') {
      return ['owner', 'admin', 'staff', 'pending'];
    }

    if (targetRole === 'staff' || targetRole === 'pending') {
      return ['admin', 'staff', 'pending'];
    }
  }

  if (actorRole === 'admin' && (targetRole === 'staff' || targetRole === 'pending')) {
    return ['staff', 'pending'];
  }

  return [];
};

export const canResetUserPassword = (
  actorRole: RoleInput,
  targetRole: RoleInput,
  isSelf = false
): boolean => {
  if (!isActiveRole(actorRole) || !targetRole) return false;

  if (isSelf) {
    return true;
  }

  if (actorRole === 'owner') {
    return targetRole !== 'owner';
  }

  if (actorRole === 'admin') {
    return targetRole === 'staff' || targetRole === 'pending';
  }

  return false;
};

export const canDeleteUser = (
  actorRole: RoleInput,
  targetRole: RoleInput,
  isSelf = false
): boolean => {
  if (!isActiveRole(actorRole) || !targetRole || isSelf) return false;

  if (actorRole === 'owner') {
    return targetRole !== 'owner';
  }

  if (actorRole === 'admin') {
    return targetRole === 'staff' || targetRole === 'pending';
  }

  return false;
};

export const canManageVillas = (role: RoleInput): boolean => {
  return role === 'owner' || role === 'admin';
};
