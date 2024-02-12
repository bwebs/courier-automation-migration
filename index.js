import fetch from 'node-fetch';

import get from 'lodash/get.js';
import {
    getAutomationNodesGraphQL,
    getAutomationTemplateGraphQL,
    getHeaders,
    saveAutomationV2GraphQL,
    saveAutomationV2TemplateQl,
} from './utils.js';
import { authorizations, automation_ids, endpoint } from './variables.js';

const getAutomation = async (locale, template_id) => {
    const headers = getHeaders(locale);
    const body_template = getAutomationTemplateGraphQL(template_id);
    const body_nodes = getAutomationNodesGraphQL(template_id);

    const response_graph = await fetch(endpoint[locale], {
        method: 'POST',
        headers,
        body: JSON.stringify(body_template),
    });

    const template = await response_graph.json();
    const response_nodes = await fetch(endpoint[locale], {
        method: 'POST',
        headers,
        body: JSON.stringify(body_nodes),
    });
    const nodes = await response_nodes.json();
    return {
        template: get(template, 'data.automationsV2.template', {}),
        nodes: get(nodes, 'data.automationsV2.nodes', []),
    };
};

const updateAutomation = async (locale, nodes, template) => {
    const headers = getHeaders(locale);
    const body_nodes = saveAutomationV2GraphQL(nodes, template);
    const body_template = saveAutomationV2TemplateQl(nodes, template);
    const response_nodes = await fetch(endpoint[locale], {
        method: 'POST',
        headers,
        body: JSON.stringify(body_nodes),
    });
    const response_template = await fetch(endpoint[locale], {
        method: 'POST',
        headers,
        body: JSON.stringify(body_template),
    });
    return {
        nodes: await response_nodes.json(),
        template: await response_template.json(),
    };
};

const test = async () => {
    automation_ids.forEach(async (automation_id) => {
        const { template, nodes } = await getAutomation('us', automation_id);
        const saved = await updateAutomation('eu', nodes, template);
        console.log(
            `Saved - ${get(saved, [
                'template',
                'data',
                'automationsV2',
                'saveTemplate',
                'name',
            ])} - (${automation_id})`
        );
    });
};

// check JWT expiration
const checkJWTExpiration = (locale) => {
    const payload = JSON.parse(
        Buffer.from(authorizations[locale].split('.')[1], 'base64').toString(
            'utf-8'
        )
    );
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
        throw Error('JWT expired: ' + locale);
    }
};

checkJWTExpiration('us');
checkJWTExpiration('eu');

test();
