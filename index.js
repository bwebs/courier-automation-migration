import fetch from "node-fetch";

import get from "lodash/get.js";

import {
  getAutomationNodesGraphQL,
  getAutomationTemplateGraphQL,
  getHeaders,
  saveAutomationV2GraphQL,
  saveAutomationV2TemplateQl,
} from "./utils.js";
import { authorizations, graphqlEndpoint } from "./variables.js";

const getAutomation = async (environment, locale, template_id) => {
  const headers = getHeaders(locale);
  const body_template = getAutomationTemplateGraphQL(template_id);
  const body_nodes = getAutomationNodesGraphQL(template_id);

  const response_graph = await fetch(graphqlEndpoint(environment)[locale], {
    method: "POST",
    headers,
    body: JSON.stringify(body_template),
  });

  const template = await response_graph.json();
  const response_nodes = await fetch(graphqlEndpoint(environment)[locale], {
    method: "POST",
    headers,
    body: JSON.stringify(body_nodes),
  });
  const nodes = await response_nodes.json();
  return {
    template: get(template, "data.automationsV2.template", {}),
    nodes: get(nodes, "data.automationsV2.nodes", []),
  };
};

const updateVariables = (content) => {
  return content.replace(/api\.courier\.com/, "api.eu.courier.com");
};

const updateAutomation = async (environment, locale, nodes, template) => {
  const headers = getHeaders(locale);
  const body_nodes = saveAutomationV2GraphQL(nodes, template);
  const body_template = saveAutomationV2TemplateQl(nodes, template);
  // console.log('body_nodes', body_nodes.variables);
  const response_nodes = await fetch(graphqlEndpoint(environment)[locale], {
    method: "POST",
    headers,
    body: updateVariables(JSON.stringify(body_nodes)),
  });
  const response_template = await fetch(graphqlEndpoint(environment)[locale], {
    method: "POST",
    headers,
    body: updateVariables(JSON.stringify(body_template)),
  });
  return {
    nodes: await response_nodes.json(),
    template: await response_template.json(),
  };
};

const syncAutomations = async (environment) => {
  const automations = await fetch(graphqlEndpoint(environment)["us"], {
    headers: getHeaders("us"),
    method: "POST",
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
    ["data", "automationsV2", "templates", "templates"],
    [],
  );
  for (let i = 0; i < automation_ids.length; i++) {
    const automation = automation_ids[i];

    const { template, nodes } = await getAutomation(
      environment,
      "us",
      automation.id,
    );
    const saved = await updateAutomation(environment, "eu", nodes, template);
    console.log(
      `Saved - ${get(saved, [
        "template",
        "data",
        "automationsV2",
        "saveTemplate",
        "name",
      ])} - (${automation.id})`,
    );
  }
};

// check JWT expiration
const checkJWTExpiration = (locale) => {
  const payload = JSON.parse(
    Buffer.from(authorizations[locale].split(".")[1], "base64").toString(
      "utf-8",
    ),
  );
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw Error("JWT expired: " + locale);
  }
};

checkJWTExpiration("us");
checkJWTExpiration("eu");

syncAutomations(process.argv.first || "test");
