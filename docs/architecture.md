# CivicSense AI – Architecture Dossier

This document outlines the architectural components, data pipelines, and design decisions for the **CivicSense AI** platform.

```mermaid
graph TD
    A[Citizen / User Upload] -->|POST /api/upload| B[FastAPI Endpoint]
    B -->|Save Image| C[(Local Storage /uploads)]
    B -->|Trigger Detection| D[AI Pipeline Orchestrator]
    
    subgraph AI Module (ai/)
        D -->|Inference| E[YOLOv8 Vehicle Detector]
        E -->|Cropped Car/Plate Box| F[EasyOCR Plate Extractor]
        F -->|Plate Alphanumeric Text| G[Zoning Rule Engine]
        G -->|Violation + Action| H[Summary Generator]
    end
    
    H -->|Save Metadata| I[(SQLite / PostgreSQL DB)]
    I -->|Initial report| J[ReportLab PDF Generator]
    J -->|QR + Evidence Image| K[(Reports Storage /reports)]
    
    L[Municipal Officer / Authority] -->|Login| M[React Client]
    M -->|GET /api/dashboard| B
    M -->|PUT /api/violations/ID| B
    B -->|Review Decision| I
    B -->|Regenerate PDF| J
```

## System Breakdown

### 1. Frontend Client (React + Vite + Tailwind CSS)
- **Routing & Guards**: Private routes verify JWT expiry, redirecting unauthorized traffic and routing by role (`Citizen` vs `Authority` vs `Admin`).
- **Interactive GIS Map**: Integrates Leaflet (no token required) to render pins representing municipal infractions. Active visual rings pulse with custom colors corresponding to the review status.
- **Charts Dashboard**: Leverages Recharts area and bar components to show weekly and category compliance distributions.

### 2. Backend Server (FastAPI + SQLAlchemy)
- **MVC Architecture**: Models map to database tables via SQLAlchemy. Schemas enforce inputs via Pydantic. Controllers manage routes inside `main.py`.
- **JWT Cryptography**: Encrypts claims including user email and roles, signing tokens using the `HS256` standard.
- **Static Asset Streaming**: Mounts local `/uploads` directory to serve evidence media securely to the frontend dashboard.

### 3. AI Enforcement Pipeline
- **Vehicle Localization**: Runs `ultralytics` YOLOv8n to locate vehicles, cropping boundary coordinates dynamically.
- **Text Recognition**: Runs EasyOCR over plate crops, checking alphanumeric regex patterns and filtering out weak predictions (confidence < 35%) to prevent noise.
- **Compliance Rules**: Compares coordinates with municipal geofenced coordinates using the Haversine distance formula.
- **Summary Generator**: Produces written summaries detailing the vehicle category, location, infraction type, confidence, and recommended action.
- **PDF Compiler**: Utilizes ReportLab flowables to draw table metadata, embed images, draw vector signatures, and stamp custom QR verification codes.
