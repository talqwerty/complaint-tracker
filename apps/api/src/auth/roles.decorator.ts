import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Restrict a route to the given roles. Enforced by RolesGuard.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
