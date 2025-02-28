import fetch from 'node-fetch';

import get from 'lodash/get.js';
import omit from 'lodash/omit.js';

import {
    getAutomationNodesGraphQL,
    getAutomationTemplateGraphQL,
    getHeaders,
    saveAutomationV2GraphQL,
    saveAutomationV2TemplateQl,
} from './utils.js';
import { authorizations, graphqlEndpoint } from './variables.js';

const getAutomation = async (environment, locale, template_id) => {
    const headers = getHeaders(locale);
    const body_template = getAutomationTemplateGraphQL(template_id);
    const body_nodes = getAutomationNodesGraphQL(template_id);

    const response_graph = await fetch(graphqlEndpoint(environment)[locale], {
        method: 'POST',
        headers,
        body: JSON.stringify(body_template),
    });

    const template = await response_graph.json();
    const response_nodes = await fetch(graphqlEndpoint(environment)[locale], {
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

const updateAutomation = async (environment, locale, nodes, template) => {
    const headers = getHeaders(locale);
    const body_nodes = saveAutomationV2GraphQL(nodes, template);
    const body_template = saveAutomationV2TemplateQl(nodes, template);
    const response_nodes = await fetch(graphqlEndpoint(environment)[locale], {
        method: 'POST',
        headers,
        body: JSON.stringify(body_nodes),
    });
    const response_template = await fetch(
        graphqlEndpoint(environment)[locale],
        {
            method: 'POST',
            headers,
            body: JSON.stringify(body_template),
        }
    );
    return {
        nodes: await response_nodes.json(),
        template: await response_template.json(),
    };
};

const syncAutomations = async (environment) => {
    const automations = await fetch(graphqlEndpoint(environment)['us'], {
        headers: getHeaders('us'),
        method: 'POST',
        body: JSON.stringify({
            variables: {},
            query: `{
                  automationTemplates {
                    nodes {
                      name
                      id
                      template
                      templateId
                      createdAt
                      updatedAt
                      publishedAt
                      __typename
                }
                __typename
          }
              automationsV2 {
                    templates {
                      templates
                      __typename
                }
                __typename
          }
        }
            `,
        }),
    });
    const automation_data = await automations.json();
    const automation_ids = get(
        automation_data,
        ['data', 'automationsV2', 'templates', 'templates'],
        []
    );
    for (let i = 0; i < automation_ids.length; i++) {
        const automation = automation_ids[i];

        const { template, nodes } = await getAutomation(
            environment,
            'us',
            automation.id
        );
        const saved = await updateAutomation(
            environment,
            'eu',
            nodes,
            template
        );
        console.log(
            `Saved - ${get(saved, [
                'template',
                'data',
                'automationsV2',
                'saveTemplate',
                'name',
            ])} - (${automation.id})`
        );
    }
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


const getSections = async (environment, locale) => {
    const headers = getHeaders(locale);
    const url = graphqlEndpoint(environment)[locale];
    const body = {
        variables: {},
        query: `{
              preferenceSections {
                nodes {
                  name
                  sectionId
                  sectionIndex
                  routingOptions
                  hasCustomRouting
                  preferenceGroups {
                    nodes {
                      defaultStatus
                      linkedNotifications
                      allowedPreferences
                      routingOptions
                      isArchived
                      topicIndex
                      notificationTemplates {
                        nodes {
                          name
                          templateId
                          id
                          __typename
                    }
                    __typename
              }
                  templateId
                  templateName
                  topicIndex
                  __typename
            }
                __typename
          }
              __typename
        }
            __typename
      }
    }`,
    };
    const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await r.json();
    return get(data, 'data.preferenceSections.nodes', []);
};
const saveSection = async (environment, locale, section) => {
    const headers = getHeaders(locale);
    const url = graphqlEndpoint(environment)[locale];
    const body = {
        operationName: 'SavePreferenceSection',
        variables: {
            section: omit(section, ['__typename', 'preferenceGroups']),
        },
        query: 'mutation SavePreferenceSection($section: PreferenceSectionDataInput!) {\n  savePreferenceSection(section: $section) {\n    name\n    sectionId\n    sectionIndex\n    preferenceGroups {\n      nodes {\n        defaultStatus\n        linkedNotifications\n        templateId\n        templateName\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
    };
    const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await r.json();
    return data;
};

const saveTopic = async (environment, locale, topic, sectionId) => {
    const headers = getHeaders(locale);
    const url = graphqlEndpoint(environment)[locale];
    const body = {
        operationName: 'savePreferenceTemplate',
        variables: {
            template: omit(topic, [
                '__typename',
                'linkedNotifications',
                'notificationTemplates',
            ]),
        },
        query: 'mutation savePreferenceTemplate($template: PreferenceTemplateDataInput!, $isCopying: Boolean) {\n  savePreferenceTemplate(template: $template, isCopying: $isCopying) {\n    allowedPreferences\n    created\n    defaultStatus\n    id\n    isArchived\n    routingOptions\n    templateId\n    templateName\n    topicIndex\n    __typename\n  }\n}\n',
    };
    const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await r.json();
    const sbody = {
        operationName: 'addPreferenceGroup',
        variables: {
            sectionId: sectionId,
            preferenceGroupId: topic.templateId,
        },
        query: `mutation addPreferenceGroup($sectionId: String!, $preferenceGroupId: String!) {
              addPreferenceGroup(sectionId: $sectionId, preferenceGroupId: $preferenceGroupId) {
                name
                sectionId
                preferenceGroups {
                  nodes {
                    templateName
                    templateId
                    defaultStatus
                    linkedNotifications
                    __typename
              }
              __typename
        }
            __typename
      }
    }
        `,
    };

    const s = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(sbody),
    });
    const data2 = await s.json();

    return data;
};

const saveTemplateLink = async (environment, locale, template_id, topic_id) => {
    const headers = getHeaders(locale);
    const url = graphqlEndpoint(environment)[locale];
    const body = {
        operationName: 'UpdateNotificationPreferenceTemplate',
        variables: {
            notificationId: template_id,
            preferenceTemplateId: topic_id,
        },
        query: 'mutation UpdateNotificationPreferenceTemplate($notificationId: String!, $preferenceTemplateId: String) {\n  updateNotificationPreferenceTemplate(\n    notificationId: $notificationId\n    preferenceTemplateId: $preferenceTemplateId\n  ) {\n    notificationId\n    preferenceTemplateId\n    __typename\n  }\n}\n',
    };
    const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await r.json();
    return data;
};

const syncPreferences = async (from_environment, to_environment, from_locale, to_locale) => {
    const all_sections = await getSections(from_environment, from_locale);
    // console.log(JSON.stringify(all_sections, null, 2));
    for (let i = 0; i < all_sections.length; i++) {
        const section = get(all_sections, [i], {
            preferenceGroups: { nodes: [] },
        });
        const saved_section = await saveSection(to_environment, to_locale, section);
        const topics = get(section, ['preferenceGroups', 'nodes'], []);
        for (let j = 0; j < topics.length; j++) {
            // for (let j = 0; j < 1; j++) {
            const topic = get(topics, [j]);
            const saved_topic = await saveTopic(
                to_environment,
                to_locale,
                topic,
                section.sectionId
            );
            const templates = get(topic, 'notificationTemplates.nodes', []);
            for (let k = 0; k < templates.length; k++) {
                const template = templates[k];

                const saved_template = await saveTemplateLink(
                    to_environment,
                    to_locale,
                    // base64 decode template.id
                    JSON.parse(
                        Buffer.from(template.id, 'base64').toString('utf-8')
                    ).id,
                    topic.templateId
                );
            }
        }
    }
};

checkJWTExpiration('us');
checkJWTExpiration('eu');
syncAutomations('test');
syncPreferences('prod', 'test', 'eu', 'eu');
