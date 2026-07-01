# CivicSense AI – AI-Powered Smart Traffic & Civic Compliance Platform

An AI-powered smart city compliance platform that helps municipal authorities detect, catalog, and manage parking and civic violations using Computer Vision (YOLOv8 & EasyOCR).

---

## 📌 Problem Statement & Objectives
Modern urban corridors face high congestion and safety risks due to traffic and parking infractions blocking critical access areas (fire lanes, hospital emergency entrances, schools, footpaths, and residential gates). Manual enforcement is slow, resource-heavy, and prone to oversight.

**CivicSense AI** automates this by processing citizen-reported or CCTV images, identifying vehicles and license plates via deep learning, classifying zoning infractions with a rule-based engine, and creating review dockets for municipal authorities to approve, reject, or dismiss before compiling official signed PDF compliance dossiers.

---

## ⚙️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, React Router, Axios, Recharts, Leaflet, React Leaflet, React Icons
- **Backend**: FastAPI, SQLAlchemy (SQLite by default, supports PostgreSQL via `DATABASE_URL` env var), Pydantic, PyJWT, Bcrypt
- **AI Models**: YOLOv8 (via `ultralytics`), EasyOCR, OpenCV, NumPy
- **Document Rendering**: ReportLab (PDF), QRCode (Vector QR generator)
- **Deployment & Containers**: Docker, Docker Compose, Render, Vercel

---

## 📁 Folder Structure

```
civicsense-ai/
├── ai/                      # AI Pipeline Modules
│   ├── vehicle_detector.py  # YOLOv8 vehicle detection
│   ├── ocr.py               # EasyOCR license plate reader
│   ├── parking_classifier.py# Proximity & context rule engine
│   └── report_generator.py  # ReportLab PDF & QR compiler
├── backend/                 # FastAPI REST Application
│   ├── app/
│   │   ├── auth.py          # Cryptography & route guards
│   │   ├── config.py        # Settings & directory initialization
│   │   ├── crud.py          # Database queries & updates
│   │   ├── database.py      # SQLAlchemy configuration
│   │   ├── main.py          # CORS, routing & seeding
│   │   ├── models.py        # SQLAlchemy schema models
│   │   └── schemas.py       # Pydantic validation schemas
│   ├── tests/
│   │   ├── test_ai.py       # AI module pytest suite
│   │   └── test_backend.py  # API route integration tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # React Single Page App
│   ├── src/
│   │   ├── components/      # Nav, Sidebar, MapView, guards
│   │   ├── context/         # AuthContext JWT session
│   │   ├── pages/           # Landing, Dashboard, Upload, Result, History, Admin
│   │   ├── utils/           # Axios API Client
│   │   ├── App.jsx          # Route declarations
│   │   └── index.css        # Styles & Leaflet custom overlays
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── architecture.md      # GIS diagram and details
├── docker-compose.yml       # Docker compose build setup
└── README.md                # Master guide
```

---

## 🚀 Installation & Local Startup

### Prerequisites
- Python 3.12+ (or 3.13)
- Bun (or Node.js + npm)
- Git

### 1. Clone & Set Up Backend
```bash
cd civicsense-ai/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate # On Linux/macOS run: source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

Create a `.env` file in the project root using the provided `.env.example` template:
```bash
cp .env.example .env
```

Required variables:
- `SECRET_KEY`: long random secret for JWT signing
- `CORS_ORIGINS`: comma-separated allowed origins
- `DEMO_ACCOUNTS_ENABLED`: set to `true` only in development

### 2. Run Backend Dev Server
```bash
# Starts hot-reloading server on http://localhost:8000
uvicorn app.main:app --reload
```

The backend now resolves the shared AI package correctly when started from the backend folder.
*Note: On first startup, the server automatically seeds three default test accounts:*
- **Citizen Account**: `citizen@civicsense.ai` | `password123`
- **Authority Account**: `authority@civicsense.ai` | `password123`
- **Admin Account**: `admin@civicsense.ai` | `password123`

---

### 3. Set Up & Run Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Run Vite dev server on http://localhost:5173
npm run dev
```

---

## 🐳 Docker Deployment
To run the entire full-stack application instantly inside local containers:
```bash
# From root directory
docker-compose up --build
```
- **React Frontend**: http://localhost:3000
- **FastAPI Backend**: http://localhost:8000
- **API Swagger Docs**: http://localhost:8000/docs

---

## 🧪 Testing Suite
We include full integration tests for the API and deep learning fallbacks:

```bash
cd backend
# Execute all pytest specifications
pytest
```

---

## 🔌 API Documentation

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| `POST` | `/api/login` | Authenticate credentials and retrieve JWT token | None |
| `POST` | `/api/register` | Create a new user profile | None |
| `POST` | `/api/upload` | Save a raw incident image | JWT (Any) |
| `POST` | `/api/detect` | Execute AI pipeline (YOLO + OCR + Rule Engine) | JWT (Any) |
| `GET` | `/api/violations` | Retrieve violations log with plate/status filters | JWT (Any) |
| `PUT` | `/api/violations/{id}` | Approve, Reject, or Dismiss compliance dockets | JWT (Authority/Admin) |
| `GET` | `/api/dashboard` | Fetch aggregated dashboard counts & charts | JWT (Any) |
| `GET` | `/api/analytics` | Fetch GIS metrics & weekly status ratios | JWT (Any) |
| `GET` | `/api/reports/{id}/download` | Retrieve compiled PDF compliance dossier | None |

---

## 🔮 Future Scope
- **wrong-lane & overspeed**: Implement object tracking algorithms over consecutive frames to calculate speeds and detect wrong-way traffic.
- **helmet & seatbelt detection**: Run secondary classification models over bounding box crops.
- **Live CCTV streams**: Integrate RTSP camera feeds directly into Leaflet map GIS markers.
- **e-Challan Integration**: Program webhooks to automatically submit verified dossiers to government citation APIs.

---

## 📄 License
This project is submitted under the MIT License.
