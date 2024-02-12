import dotenv from 'dotenv';
dotenv.config();

const tenant_id = process.env.TENANT_ID;
export const domains = {
    us: 'api.courier.com',
    eu: 'api.eu.courier.com',
};
export const authorizations = {
    us: process.env.US_AUTHORIZATION,
    eu: process.env.EU_AUTHORIZATION,
};
export const endpoint = {
    us: `https://${domains.us}/studio/q?tenantId=${tenant_id}`,
    eu: `https://${domains.eu}/studio/q?tenantId=${tenant_id}`,
};

export const automation_ids = ['909486cb-ad92-4420-ba8f-22413b6b4f2a'];
