import { z } from "zod";

if (typeof fetch === "undefined") {
    global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}
// Helper function to handle HTTP requests with authentication
async function call({ host, path, method = "GET", body, auth }) {
    const url = new URL(path, host);

    const headers = {};
    let fetchOptions = { method, headers };

    // Handle authentication
    if (auth) {
        if (auth.type === "query") {
            if (auth.user && auth.pass) {
                url.searchParams.append("user", auth.user);
                url.searchParams.append("pass", auth.pass);
            }
        } else if (auth.type === "basic") {
            if (auth.user && auth.pass) {
                headers["Authorization"] = "Basic " + btoa(`${auth.user}:${auth.pass}`);
            }
        } else if (auth.type === "bearer") {
            if (auth.token) {
                headers["Authorization"] = "Bearer " + auth.token;
            }
        }
    }

    if (body) {
        headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(body);
    }

    fetchOptions.headers = headers;

    const response = await fetch(url.toString(), fetchOptions);
    return response;
}

// For query parameter auth: { type: "query", user: "admin", pass: "secret" }
// For basic auth: { type: "basic", user: "admin", pass: "secret" }
// For bearer token: { type: "bearer", token: "your-oauth2-token" }

export function registerTools(server, host, auth) {
    // Get the plain value of a state
    server.tool(
        "getPlainValue",
        {
            stateID: z.string().describe("The ID of the state to retrieve the plain value for."),
        },
        {
            description: `This function retrieves the plain value of a specific ioBroker state.

Parameters:
  - stateID (string): The ID of the state to retrieve.

The function returns the plain value of the specified state.`,
        },
        async (args) => {
            const response = await call({
                host,
                path: `/getPlainValue/${args.stateID}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch plain value for stateID: ${args.stateID}`);
            }
            const plainValue = await response.text();

            return {
                content: [
                    {
                        type: "text",
                        text: plainValue,
                    },
                ],
            };
        },
    );

    // Get the value and additional information of a state
    server.tool(
        "getState",
        {
            stateID: z.string().describe("The ID of the state to retrieve."),
        },
        {
            description: `This function retrieves the value and additional information of a specific ioBroker state.

Parameters:
  - stateID (string): The ID of the state to retrieve.

The function returns the value and additional information of the specified state in JSON format.`,
        },
        async (args) => {
            const response = await call({
                host,
                path: `/get/${args.stateID}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch state information for stateID: ${args.stateID}`);
            }
            const stateInfo = await response.json();

            return {
                content: [
                    {
                        type: "json",
                        json: stateInfo,
                    },
                ],
            };
        },
    );

    // Set the value of a state
    server.tool(
        "setState",
        {
            stateID: z.string().describe("The ID of the state to set."),
            value: z.union([z.string(), z.number(), z.boolean()]).describe("The value to set for the state."),
        },
        {
            description: `This function sets the value of a specific ioBroker state.

Parameters:
  - stateID (string): The ID of the state to set.
  - value (string | number | boolean): The value to set for the state.

The function returns true if the value was successfully set.`,
        },
        async (args) => {
            const response = await call({
                host,
                path: `/set/${args.stateID}?value=${encodeURIComponent(args.value)}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to set value for stateID: ${args.stateID}`);
            }
            const result = await response.text();

            return {
                content: [
                    {
                        type: "text",
                        text: result,
                    },
                ],
            };
        },
    );

    // Toggle the value of a state
    server.tool(
        "toggleState",
        {
            stateID: z.string().describe("The ID of the state to toggle."),
        },
        {
            description: `This function toggles the value of a specific ioBroker state (e.g., switches between true and false).

Parameters:
  - stateID (string): The ID of the state to toggle.

The function returns true if the state was successfully toggled.`,
        },
        async (args) => {
            const response = await call({
                host,
                path: `/toggle/${args.stateID}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to toggle state for stateID: ${args.stateID}`);
            }
            const result = await response.text();

            return {
                content: [
                    {
                        type: "text",
                        text: result,
                    },
                ],
            };
        },
    );

    // Get the values and additional information for multiple states
    server.tool(
        "getBulkStates",
        {
            stateIDs: z.string().describe("A comma-separated list of state IDs to retrieve."),
        },
        {
            description: `This function retrieves the values and additional information for multiple ioBroker states.

Parameters:
  - stateIDs (string): A comma-separated list of state IDs to retrieve.

The function returns the values and additional information for the specified states in JSON format.`,
        },
        async (args) => {
            const response = await call({
                host,
                path: `/getBulk/${args.stateIDs}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch bulk state information for stateIDs: ${args.stateIDs}`);
            }
            const bulkStateInfo = await response.json();

            return {
                content: [
                    {
                        type: "json",
                        json: bulkStateInfo,
                    },
                ],
            };
        },
    );

    // Set the values of multiple states
    server.tool(
        "setBulkStates",
        {
            states: z
                .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
                .describe("A JSON object where the keys are state IDs and the values are the values to set."),
        },
        {
            description: `This function sets the values of multiple ioBroker states.

Parameters:
  - states (object): A JSON object where the keys are state IDs and the values are the values to set.

The function returns true if the values were successfully set.`,
        },
        async (args) => {
            const response = await call({
                host,
                path: "/setBulk",
                method: "POST",
                body: args.states,
                auth,
            });
            if (!response.ok) {
                throw new Error("Failed to set bulk state values.");
            }
            const result = await response.text();

            return {
                content: [
                    {
                        type: "text",
                        text: result,
                    },
                ],
            };
        },
    );

    // Get the values and additional information for states matching a pattern
    server.tool(
        "getStates",
        {
            pattern: z.string().describe("A pattern to match state IDs (e.g., *.state)."),
        },
        {
            description: `This function retrieves the values and additional information for ioBroker states that match a specific pattern.

Parameters:
  - pattern (string): A pattern to match state IDs (e.g., *.state).

The function returns the values and additional information for the matching states in JSON format.`,
        },
        async (args) => {
            const response = await call({
                host,
                path: `/states?pattern=${encodeURIComponent(args.pattern)}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch states matching pattern: ${args.pattern}`);
            }
            const states = await response.json();

            return {
                content: [
                    {
                        type: "json",
                        json: states,
                    },
                ],
            };
        },
    );

    // Get all enums
    server.tool(
        "getEnums",
        {},
        {
            description: `This function retrieves all enums from the ioBroker system.

The function uses the pattern "enum.*" and ensures that only objects of type "enum" are returned.

The function returns all enums in JSON format.`,
        },
        async () => {
            const response = await call({
                host,
                path: "/objects?pattern=enum.*&type=enum",
                auth,
            });
            if (!response.ok) {
                throw new Error("Failed to fetch enums.");
            }
            const enums = await response.json();

            return {
                content: [
                    {
                        type: "json",
                        json: enums,
                    },
                ],
            };
        },
    );

    // Get the objects matching a pattern and optional type
    server.tool(
        "getObjects",
        {
            pattern: z.string().describe("A pattern to match object IDs (e.g., *.object)."),
            type: z
                .string()
                .optional()
                .describe(
                    `An optional type to filter objects. Available types:
  - state: Represents a single value or property.
  - channel: Groups related states together.
  - device: Represents a physical or virtual device.
  - enum: Represents a category or group of objects.
  - adapter: Represents an ioBroker adapter instance.
  - instance: Represents a specific instance of an adapter.
  - host: Represents the ioBroker host system.
  - meta: Represents metadata, such as files or auxiliary data.
  - config: Represents configuration data.
  - script: Represents a script created in ioBroker.
  - user: Represents a user in the ioBroker system.
  - group: Represents a group of users in the ioBroker system.`,
                ),
        },
        {
            description: `This function retrieves ioBroker objects that match a specific pattern and optionally filters them by type.

Parameters:
  - pattern (string): A pattern to match object IDs (e.g., *.object).
  - type (string, optional): An optional type to filter objects. Available types include:
    - state, channel, device, enum, adapter, instance, host, meta, config, script, user, group.

The function returns the objects matching the pattern and type in JSON format.`,
        },
        async (args) => {
            // Build the query string with optional type
            let query = `pattern=${encodeURIComponent(args.pattern)}`;
            if (args.type) {
                query += `&type=${encodeURIComponent(args.type)}`;
            }

            const response = await call({
                host,
                path: `/objects?${query}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch objects matching pattern: ${args.pattern}${
                        args.type ? ` and type: ${args.type}` : ""
                    }`,
                );
            }
            const objects = await response.json();

            return {
                content: [
                    {
                        type: "json",
                        json: objects,
                    },
                ],
            };
        },
    );

    // Search for data points (state IDs) matching a pattern
    server.tool(
        "search",
        {
            pattern: z.string().describe("A pattern to match data point IDs (e.g., system.adapter.admin.0*)."),
        },
        {
            description: `This function retrieves a list of data points (state IDs) that match a specific pattern.

Behavior:
  - If a data source (e.g., History, SQL) is configured, only data points known to the data source are listed.
  - If the option 'List all data points' is enabled or no data source is configured, all data points are listed.

Parameters:
  - pattern (string): A pattern to match data point IDs (e.g., system.adapter.admin.0*).

The function returns the matching data points in JSON format.`,
        },
        async (args) => {
            // Build the query string
            const query = `pattern=${encodeURIComponent(args.pattern)}`;

            const response = await call({
                host,
                path: `/search?${query}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to perform search for pattern: ${args.pattern}`);
            }
            const searchResults = await response.json();

            return {
                content: [
                    {
                        type: "json",
                        json: searchResults,
                    },
                ],
            };
        },
    );

    server.tool(
        "query",
        {
            stateIDs: z
                .string()
                .describe(
                    "A comma-separated list of state IDs to query (e.g., system.host.iobroker-dev.load,system.host.iobroker-dev.memHeapUsed).",
                ),
            dateFrom: z
                .string()
                .optional()
                .describe(
                    "The start date/time for the query. Can be an ISO 8601 date (e.g., 2019-06-08T01:00:00.000Z) or a relative time pattern (e.g., -1h, today).",
                ),
            dateTo: z
                .string()
                .optional()
                .describe(
                    "The end date/time for the query. Can be an ISO 8601 date (e.g., 2019-06-08T01:00:10.000Z) or a relative time pattern (e.g., now, today).",
                ),
            noHistory: z
                .boolean()
                .optional()
                .describe("If true, retrieves only the current value of the data points instead of historical data."),
        },
        {
            description: `This function retrieves historical or current data for specified data points (state IDs) over a given time period or based on relative time patterns.

Behavior:
  - If a data source (e.g., History, SQL) is configured, historical data for the specified period is retrieved.
  - If no data source is configured or the 'noHistory' parameter is set to true, only the current value of the data points is retrieved.

Parameters:
  - stateIDs (string): A comma-separated list of state IDs to query.
  - dateFrom (string, optional): The start date/time for the query (ISO 8601 or relative time pattern).
  - dateTo (string, optional): The end date/time for the query (ISO 8601 or relative time pattern).
  - noHistory (boolean, optional): If true, retrieves only the current value of the data points.

Relative Time Patterns:
  - hour, thisHour, or this hour: Start of the current hour.
  - last hour or lastHour: Start of the previous hour.
  - today: Start of the current day.
  - yesterday: Start of the previous day.
  - week, thisWeek, or this week: Start of the current week.
  - lastWeek or last week: Start of the previous week.
  - month, thisMonth, or this month: Start of the current month.
  - lastMonth or last month: Start of the previous month.
  - year, thisYear, or this year: Start of the current year.
  - lastYear or last year: Start of the previous year.
  - -Nd: N days ago.
  - -NM: N months ago.
  - -Ny: N years ago.
  - -Nh: N hours ago.
  - -Nm: N minutes ago.
  - -Ns: N seconds ago.

Note:
  - You can use the 'search' tool to find relevant state IDs to use in this query.

The function returns the matching data points and their values in JSON format.`,
        },
        async (args) => {
            // Build the query string with optional parameters
            let query = `stateIDs=${encodeURIComponent(args.stateIDs)}`;
            if (args.dateFrom) {
                query += `&dateFrom=${encodeURIComponent(args.dateFrom)}`;
            }
            if (args.dateTo) {
                query += `&dateTo=${encodeURIComponent(args.dateTo)}`;
            }
            if (args.noHistory) {
                query += `&noHistory=true`;
            }

            const response = await call({
                host,
                path: `/query?${query}`,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to perform query for stateIDs: ${args.stateIDs}`);
            }
            const queryResults = await response.json();

            return {
                content: [
                    {
                        type: "json",
                        json: queryResults,
                    },
                ],
            };
        },
    );
}
