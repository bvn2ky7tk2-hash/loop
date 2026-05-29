export const isTenantEnforced = (): boolean =>
  process.env.DEPLOYMENT_MODE !== 'onprem' && process.env.TENANT_ENFORCEMENT !== 'false';

export const getDefaultTenantId = (): string | undefined =>
  process.env.DEFAULT_TENANT_ID || undefined;
