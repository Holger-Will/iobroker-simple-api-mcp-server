# ioBroker Simple-API MCP Server

This project provides a [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/spec) server that connects to your [ioBroker](https://www.iobroker.net/) instance via the [simple-api adapter](https://github.com/ioBroker/ioBroker.simple-api). It enables MCP-compatible clients (such as Claude Desktop, Cursor, VSCode, etc.) to interact with your ioBroker installation using standardized tools.

---

## Features

- Exposes ioBroker simple-api endpoints as MCP tools
- Supports authentication via query parameters, Basic Auth, or Bearer tokens
- Easily configurable via CLI arguments or environment variables
- Designed for use with MCP clients (stdio transport)

---

## Installation

You can run this server directly with `npx` (no installation required) or clone and run locally.

#
## Usage with MCP Clients

Add the following to your MCP client configuration (e.g., Claude Desktop, Cursor, VSCode, etc.):

```json
"servers": {
  "iobroker-simple-api-mcp-server": {
    "type": "stdio",
    "command": "npx",
    "args": [
      "iobroker-simple-api-mcp-server",
      "--host=http://localhost:8087",
      "--authType=query",
      "--user=admin",
      "--pass=secret"
    ]
  }
}
```

You can also provide authentication and host information via environment variables:

```sh
IOB_AUTH_TYPE=query IOB_USER=admin IOB_PASS=secret IOB_HOST=http://localhost:8087 
```

---

## Authentication Options

- **Query parameters:**  
  `--authType=query --user=admin --pass=secret`
- **Basic Auth:**  
  `--authType=basic --user=admin --pass=secret`
- **Bearer Token:**  
  `--authType=bearer --token=YOUR_TOKEN`

All options can be set via CLI arguments or environment variables (`IOB_AUTH_TYPE`, `IOB_USER`, `IOB_PASS`, `IOB_TOKEN`, `IOB_HOST`).

---

## Supported Tools

- `getPlainValue(stateID)` – Get the plain value of a state
- `getState(stateID)` – Get the value and info of a state
- `setState(stateID, value)` – Set the value of a state
- `toggleState(stateID)` – Toggle a boolean state
- ...and more (see [ioBroker.simple-api documentation](https://github.com/ioBroker/ioBroker.simple-api/blob/master/README.md))

---

## License

MIT

---

## Credits

- [ioBroker.simple-api](https://github.com/ioBroker/ioBroker.simple-api)
- [Model Context Protocol](https://github.com/modelcontextprotocol/spec)
