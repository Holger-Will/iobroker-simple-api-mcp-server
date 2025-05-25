#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "@modelcontextprotocol/sdk/server/tools.js";

// Helper to parse CLI args
function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

// Read auth info from env or CLI args
const authType = getArg("authType") || process.env.IOB_AUTH_TYPE; // "query", "basic", or "bearer"
const user = getArg("user") || process.env.IOB_USER;
const pass = getArg("pass") || process.env.IOB_PASS;
const token = getArg("token") || process.env.IOB_TOKEN;

let auth;
if (authType === "bearer" && token) {
  auth = { type: "bearer", token };
} else if ((authType === "basic" || authType === "query") && user && pass) {
  auth = { type: authType, user, pass };
} else {
  auth = undefined; // No auth
}

const host = getArg("host") || process.env.IOB_HOST || "http://localhost:8087";

const server = new McpServer({
  name: "iobroker-simple-api-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

registerTools(server, host, auth);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ioBroker MCP Server is running...");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});