import { z } from "zod";
import {appendFileSync } from "node:fs";

/*  function log(msg){
appendFileSync( '/home/holger/errorlog', msg + '\n');
}  */
if (typeof fetch === "undefined") {
    global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}
// Helper function to handle HTTP requests with authentication
async function call({ host, path, method = "GET", body, auth }) {
    const url = new URL(path, host);
//log("call: " + url.toString() + " method: " + method + " body: " + JSON.stringify(body) + " auth: " + JSON.stringify(auth));
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
  "api-docs",
  `this functions returns a general overview of how to use this api. if you the AI is new to this API, call this function to find your way around here
  `,
  {},
   async (args) => {
            return {
                content: [
                    {
                        type: "text",
                        text: `
IMPORTANT: call getState(0_userdata.0.isams_memory) to get the current memory of the AI. 
IMPORTANT: if getState does not exist, ask the user to create it for you. USE setState(0_userdata.0.isams_memory) to remember things you learn about the users system and how to controll it


getStates and getObjects do not work with starting "*"
If you find a state or object during conversation that belongs to a certain function or room, you can remember it by using setObject and storing the id in the corresponding enum object. 
You can use setObject to store arbitrary data you need to remember about these objects in the objects common.custom.isams.data field; if it does not exist you can add it.
Use getEnums to find available rooms and functions.
If you find, for example, objects in the lighting function, chances are you will find more possible lights in the same adapter. Let's say you find that hue.0.kitchenlight belongs to the light or lighting enum—you can and should look at getObjects(hue.0.*) to find all objects in the hue adapter to determine if their role indicates it's a light.
If so, you can add the object to the lighting enum by using setObject() and then use getEnums to find the enum again.
Fetch and read: https://raw.githubusercontent.com/ioBroker/ioBroker.docs/refs/heads/master/docs/en/dev/objectsschema.md

IMPORTANT: When you want to switch a device (e.g., a Zigbee or Hue light) on or off, do not set the device or group object directly. Instead, always use getObjects(<deviceId>.*, "state") to retrieve all related states. Look for a state with the role "switch" or "switch.light" (for example, <deviceId>.state, <deviceId>.on, or similar). The main switch state may be named .state, .on, or something adapter-specific. Only this state will reliably switch the device on or off. Do not set the device object itself.

ADAPTER NOTE: For Zigbee, the main switch is usually <deviceId>.state. For Hue, it is usually <deviceId>.on. Always check both the role (should be "switch" or "switch.light") and the state name/id (should be .state, .on, or similar). Do not assume the state name—always enumerate states and check their roles and names.

TIP: When using getObjects, always restrict the call as much as possible by using the type parameter in addition to the pattern. For example, type="device", type="channel", or type="folder" usually return fewer objects than type="state". This not only improves performance, but also avoids hitting the tokenization limit and prevents call loops.

TIP: You can also use patterns like bmw.*.*Level* to find all states with "Level" in their ID, regardless of hierarchy. This is especially useful for discovering values such as chargingLevelPercent for electric vehicles, or any other deeply nested state containing a specific keyword.

BEST PRACTICE: To robustly control devices, always:
1. Use getEnums to find available rooms/functions and their assigned objects.
2. Use getObjects(<deviceId>.*, "state") to enumerate all substates for a device.
3. Identify the main switch state by checking for role "switch" or "switch.light" and a name/id like .state, .on, or similar.
4. Use setState on the identified state to control the device.
5. Never guess the state name—always check both role and id.
6. For group control, use the group state (e.g., zigbee.0.group_8.state) if available, following the same pattern.

FINDING ADAPTERS: Room and function memberships (enums) can be incomplete or outdated. To discover which adapters are in use for devices (e.g., lights), use getEnums to list all enums for functions and rooms. Examine the member IDs in these enums to collect adapter prefixes (e.g., zigbee.0.*, hue.0.*, homekit-controller.0.*). Use these prefixes to enumerate all devices and states in those adapters with getObjects, regardless of enum completeness. This ensures robust device discovery even if enum assignments are missing or stale.

IMPORTANT: To find arbitrary objects (states, devices, etc.) by substring or keyword in their IDs, you MUST NOT use a leading wildcard (e.g., *.battery*). Instead, iterate over all possible starting characters (a-z, 0-9, etc.) and use patterns like a*.*battery*, b*.*battery*, ..., z*.*battery*. This is the only robust and performant way to search for objects containing a substring anywhere in their ID in ioBroker. This approach is CRITICAL for reliable discovery and is a best practice for all object searches!

Example strategy:
1. Identify the substring/keyword you want to find (e.g., "Battery").
2. For each starting character (a-z, 0-9), use a pattern like a*.*Battery*, b*.*Battery*, ..., z*.*Battery*.
3. For each pattern, call getObjects(pattern, type) to retrieve matching objects.
4. Aggregate results from all patterns for a complete list.

NEVER use a pattern starting with * (e.g., *.battery*)—it will not work and is not supported by ioBroker.

This approach ensures adapter-agnostic, context-aware device control and avoids common pitfalls.
                        `,
                    },
                ],
            };
        }
);
    server.tool(
        "getPlainValue",
        `This function retrieves the plain value of a specific ioBroker state.

Parameters:
  - stateID (string): The ID of the state to retrieve.

The function returns the plain value of the specified state.`,
        {
            stateID: z.string().describe("The ID of the state to retrieve the plain value for."),
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
        `This function retrieves the value and additional information of a specific ioBroker state.

Parameters:
  - stateID (string): The ID of the state to retrieve.

The function returns the value and additional information of the specified state in JSON format.`,
        {
            stateID: z.string().describe("The ID of the state to retrieve."),
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
                        type: "text",
                        text: JSON.stringify(stateInfo),
                    },
                ],
            };
        },
    );

    // Set the value of a state
    server.tool(
        "setState",
        `This function sets the value of a specific ioBroker state.

Parameters:
  - stateID (string): The ID of the state to set.
  - value (string | number | boolean): The value to set for the state.

The function returns true if the value was successfully set.`,
        {
            stateID: z.string().describe("The ID of the state to set."),
            value: z.union([z.string(), z.number(), z.boolean()]).describe("The value to set for the state."),
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
        `This function toggles the value of a specific ioBroker state (e.g., switches between true and false).

Parameters:
  - stateID (string): The ID of the state to toggle.

The function returns true if the state was successfully toggled.`,
        {
            stateID: z.string().describe("The ID of the state to toggle."),
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
        `This function retrieves the values and additional information for multiple ioBroker states.

Parameters:
  - stateIDs (string): A comma-separated list of state IDs to retrieve.

The function returns the values and additional information for the specified states in JSON format.`,
        {
            stateIDs: z.string().describe("A comma-separated list of state IDs to retrieve."),
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
                        type: "text",
                        text: JSON.stringify(bulkStateInfo),
                    },
                ],
            };
        },
    );

    // Set the values of multiple states
    server.tool(
        "setBulkStates",
        `This function sets the values of multiple ioBroker states.

Parameters:
  - states (object): A JSON object where the keys are state IDs and the values are the values to set.

The function returns true if the values were successfully set.`,
        {
            states: z
                .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
                .describe("A JSON object where the keys are state IDs and the values are the values to set."),
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
        `This function retrieves the values and additional information for ioBroker states that match a specific pattern.

Parameters:
  - pattern (string): A pattern to match state IDs (e.g., hue.0.* or hue.*.on).

The function returns the current values for the matching states in JSON format. if you need additinali nfo for this state use getObject(id)`,
        {
            pattern: z.string().describe("A pattern to match state IDs (e.g., hue.*)."),
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
                        type: "text",
                        text: JSON.stringify(states),
                    },
                ],
            };
        },
    );

    // Get all enums
    server.tool(
        "getEnums",
        `This function retrieves all enums from the ioBroker system, including categories such as rooms and functions (e.g., lighting, heating, power consumption, shutters etc.).

Use this tool to discover available rooms, functions, and their assigned objects and states.

The function returns all enums in JSON format.`,
        {},
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
                        type: "text",
                        text: JSON.stringify(enums),
                    },
                ],
            };
        },
    );

    // Get the objects matching a pattern and optional type
    server.tool(
        "getObjects",
        `This function retrieves ioBroker objects that match a specific pattern and optionally filters them by type.

Parameters:
  - pattern (string): A pattern to match object IDs (e.g., hue.0.* or hue.*.on ).
  - type (string, optional): An optional type to filter objects. Available types include:
    - state, channel, device, enum, adapter, instance, host, meta, config, script, user, group.

The function returns the objects matching the pattern and type in JSON format.`,
        {
            pattern: z.string().describe("A pattern to match object IDs (e.g., hue.*.on or hue.0.*)."),
            type: z
                .string()
                .optional()
                .describe(
                    `An optional type to filter objects. Available types:\n  - state: Represents a single value or property.\n  - channel: Groups related states together.\n  - device: Represents a physical or virtual device.\n  - enum: Represents a category or group of objects.\n  - adapter: Represents an ioBroker adapter instance.\n  - instance: Represents a specific instance of an adapter.\n  - host: Represents the ioBroker host system.\n  - meta: Represents metadata, such as files or auxiliary data.\n  - config: Represents configuration data.\n  - script: Represents a script created in ioBroker.\n  - user: Represents a user in the ioBroker system.\n  - group: Represents a group of users in the ioBroker system.`,
                ),
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
                        type: "text",
                        text: JSON.stringify(objects),
                    },
                ],
            };
        },
    );

    // Search for data points (state IDs) matching a pattern (History adapter only)
    server.tool(
        "getHistoryStates",
        `List states configured for historical logging in the History adapter (not a general state search)

Parameters:
  - pattern (string): Pattern to match historically logged state IDs. This function only returns states that are configured in the History adapter for data collection, not all available states in the system.

The function returns the matching data points in JSON format.`,
        {
            pattern: z.string().describe("Pattern to match historically logged state IDs. This function only returns states that are configured in the History adapter for data collection, not all available states in the system."),
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
                        type: "text",
                        text: JSON.stringify(searchResults),
                    },
                ],
            };
        },
    );

    // Query historical or current data for specified data points (History/SQL adapter)
    server.tool(
        "queryHistory",
        `Query historical or current data for specified data points (state IDs) over a given time period or based on relative time patterns. Only states configured for logging in the History/SQL adapter will return historical data. For all others, only the current value is available.

Behavior:
  - If a data source (e.g., History, SQL) is configured, historical data for the specified period is retrieved.
  - If no data source is configured or the 'noHistory' parameter is set to true, only the current value of the data points is retrieved.

Parameters:
  - stateIDs (string): A comma-separated list of state IDs to query. Only states configured for logging in the History/SQL adapter will return historical data.
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
  - You can use the 'getHistoryStates' tool to find relevant state IDs to use in this query.

The function returns the matching data points and their values in JSON format.`,
        {
            stateIDs: z
                .string()
                .describe(
                    "A comma-separated list of state IDs to query (e.g., system.host.iobroker-dev.load,system.host.iobroker-dev.memHeapUsed). Only states configured for logging in the History/SQL adapter will return historical data.",
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
        async (args) => {
            // Build the path with stateIDs as part of the path, not as a query parameter
            let path = `/query/${encodeURIComponent(args.stateIDs)}`;
            let query = "";
            if (args.dateFrom) {
                query += `dateFrom=${encodeURIComponent(args.dateFrom)}`;
            }
            if (args.dateTo) {
                query += (query ? "&" : "") + `dateTo=${encodeURIComponent(args.dateTo)}`;
            }
            if (args.noHistory) {
                query += (query ? "&" : "") + `noHistory=true`;
            }
            if (query) {
                path += `?${query}`;
            }

            const response = await call({
                host,
                path,
                auth,
            });
            if (!response.ok) {
                throw new Error(`Failed to perform query for stateIDs: ${args.stateIDs}`);
            }
            const queryResults = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(queryResults),
                    },
                ],
            };
        },
    );
}
