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
export const graphqlEndpoint = (environment) => ({
    us: `https://${domains.us}/studio/q?tenantId=${tenant_id}${
        environment === 'test' ? '&env=test' : ''
    }`,
    eu: `https://${domains.eu}/studio/q?tenantId=${tenant_id}${
        environment === 'test' ? '&env=test' : ''
    }`,
});

export const getRestEndpoint = (environment, path, query = {}) => {
    const params = new URLSearchParams({ ...query, tenantId: tenant_id });
    return {
        us: `https://api.courier.com/studio${
            environment === 'test' ? '/test' : ''
        }${path}?${params.toString()}`,
        eu: `https://api.eu.courier.com/studio${
            environment === 'test' ? '/test' : ''
        }${path}?${params.toString()}`,
    };
};
