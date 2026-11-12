# TechSphere API kit

Everything you need for the API tasks of the TechSphere internship.

| File | What it is |
|---|---|
| `openapi.yaml` | The API specification (OpenAPI 3). Open it in https://editor.swagger.io or any OpenAPI viewer. |
| `server.py` | The mock server. Needs only Python 3.9 or newer, nothing to install. |
| `fixtures/` | The sample data the server uses (written when it starts). |

## Start the server

    python server.py

The API is then at **http://localhost:4010**, for example http://localhost:4010/products?category=laptops&page=1.
Stop it with Ctrl+C. Restarting it resets the data.

## Sign in

| Email | Password | Role |
|---|---|---|
| student@techsphere.test | Passw0rd! | shopper |
| admin@techsphere.test | Admin123! | admin |

`POST /auth/login` returns a `token`. Send it as `Authorization: Bearer <token>` to the `/account/...`,
`/orders` and `/admin/...` endpoints.

## Calling it

Use a REST client (Postman, Insomnia, Thunder Client, or curl), for example:

    curl "http://localhost:4010/products?sort=price_asc"
    curl -X POST http://localhost:4010/auth/login -H "Content-Type: application/json" \
         -d '{"email":"student@techsphere.test","password":"Passw0rd!"}'

Like a real backend, the data is not perfectly clean. Record what the API actually returns, not what you expect.

## Connecting your app (important for grading)

Read the API address from **`VITE_API_BASE`** and fall back to the local mock:

    const API_BASE = import.meta.env?.VITE_API_BASE ?? 'http://localhost:4010';

When your app is graded, it runs against this same API, and the address is given in `VITE_API_BASE`. An app that calls
a fixed URL or its own mock server makes no requests to it, and every cart, stock and request check fails.
Build your app on the responses this server really returns (for example `{ items, page, total_pages, total }` from
`GET /products`), not on another API's format.
