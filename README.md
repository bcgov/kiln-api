# Kiln API

The Kiln API is a middleware service within the BC Government Social Sector Forms Foundry ecosystem. It facilitates interactions between the ICM frontend, the Kiln form renderer, and the Communications Layer, enabling dynamic viewing, editing, and rendering of forms for business processes.

## Overview

- **Purpose**: Acts as a backend gateway for form-related requests, providing form templates and initial form data from the ICM Siebel REST API via the Communications Layer.
- **Main Responsibilities**:
  - Serves the ICM frontend for viewing and editing forms.
  - Retrieves and binds form templates and data for rendering using Kiln.
  - Communicates with the Forms Foundry Communications Layer to fetch form templates and integrate ICM data.
  - Supports PDF generation from form data and templates.

## Architecture

- **ICM Frontend**: Users interact with forms via the ICM Siebel application frontend.
- **Kiln API**: Receives requests to view/edit forms, loads templates (via Klamm[https://github.com/bcgov/klamm]) and data, integrates with Communications Layer and ICM Siebel REST API.
- **Kiln Renderer**: Binds templates and initial data, renders forms for editing.
- **Communications Layer**: Centralized service for form templates and ICM data.

## Main Endpoints

| Endpoint                      | Method | Description                                                     |
|-------------------------------|--------|-----------------------------------------------------------------|
| `/api/view`                   | GET    | Returns form data/template for view-only mode                   |
| `/api/edit`                   | GET    | Returns form data/template for editing                          |
| `/api/pdfRender/:templateId`  | POST   | Generates a PDF from form data and a given template             |
| `/api/generatePDFFromJson`    | POST   | Generates a PDF from provided JSON data                         |
| `/api/generateNewTemplate`    | POST   | Creates a new form template                                     |
| `/api/loadPortalForm`         | POST   | Loads a portal form with associated data                        |
| `/api/examples`               | GET    | Example endpoints for testing/development                       |

Additional CRUD and health check endpoints are provided for service monitoring and integration.

## Getting Started

### Prerequisites

- Node.js v20+
- npm

### Installation

```sh
npm install
```

### Running the Service

**Development mode:**

```sh
npm run dev
```

Or debug:

```sh
npm run dev:debug
```

**Production mode:**

```sh
npm run compile
npm start
```

### Testing

Run Mocha unit tests:

```sh
npm test
```

Or debug tests:

```sh
npm run test:debug
```

### API Explorer

Visit [http://localhost:3000/api-explorer/](http://localhost:3000/api-explorer/) for interactive API documentation (Swagger UI).

## Docker

A multi-stage Dockerfile is provided for building and deploying the API in containerized environments (such as OpenShift).

## Helm/Deployment

Helm charts are included in the `helm/` directory for Kubernetes deployments. Custom labels and naming conventions are supported for SDPR platform compliance.

## Core Files

- `server/routes.ts`: Configures all API routes and handlers.
- `server/api/controllers/*.ts`: Implements endpoint logic.
- `server/api/services/icm.client.ts`, `icm.service.ts`: Encapsulates integration with ICM Siebel REST API and Communications Layer.
- `server/common/api.yaml`: OpenAPI specification for validation and documentation.

## Contribution & Customization

To add or modify endpoints:
- Update route mappings in `server/routes.ts`.
- Implement business logic in the relevant controller/service files.
- Adjust OpenAPI spec in `server/common/api.yaml` for validation and documentation.

## Environment Variables

The following environment variables are required for integration:

- `COMM_API_PDFTEMPLATE_ENDPOINT_URL`: URL for PDF template rendering.
- `COMM_API_TIMEOUT`: Timeout for Communications Layer requests.

Refer to deployment documentation for additional configuration options.

## License

[Apache 2.0](LICENSE)

