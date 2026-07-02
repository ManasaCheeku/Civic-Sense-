import os
import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, Base, get_db
from . import models, schemas, crud, auth

# AI Module Imports
from ai.vehicle_detector import detect_vehicles
from ai.ocr import detect_license_plate
from ai.parking_classifier import classify_parking_violation

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Main")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def resolve_upload_path(image_path: str) -> str:
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    candidate = Path(image_path)
    if image_path.startswith("/uploads/"):
        candidate = upload_root / Path(image_path).name
    elif not candidate.is_absolute():
        candidate = upload_root / candidate.name

    resolved = candidate.resolve()
    if upload_root not in resolved.parents and resolved != upload_root:
        raise HTTPException(status_code=400, detail="Invalid image path")
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Uploaded image path not found on server")
    return str(resolved)

def validate_image_upload(file: UploadFile):
    ext = Path(file.filename or "").suffix.lower()
    if file.content_type not in ALLOWED_IMAGE_TYPES or ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPG, PNG, and WEBP image uploads are allowed"
        )
    return ext

def calculate_weighted_confidence(vehicle_conf: float, ocr_conf: float, classify_conf: float, plate_text: str) -> float:
    ocr_score = ocr_conf if ocr_conf > 0 else 0.20
    score = (vehicle_conf * 0.50) + (classify_conf * 0.30) + (ocr_score * 0.20)
    if plate_text == "Unable to recognize license plate":
        score -= 0.08
    return round(min(0.99, max(0.0, score)), 2)

def confidence_level(score: float) -> str:
    if score >= 0.85:
        return "High"
    if score >= 0.65:
        return "Medium"
    return "Low"

# 1. Initialize Tables & Seed Data
Base.metadata.create_all(bind=engine)

def seed_users():
    if settings.ENV == "production" and not settings.DEMO_ACCOUNTS_ENABLED:
        return
    db = next(get_db())
    try:
        # Check if users already exist
        default_users = [
            {"name": "Citizen User", "email": "citizen@civicsense.ai", "password": "password123", "role": "Citizen"},
            {"name": "Authority Officer", "email": "authority@civicsense.ai", "password": "password123", "role": "Authority"},
            {"name": "Admin Manager", "email": "admin@civicsense.ai", "password": "password123", "role": "Admin"}
        ]
        for u in default_users:
            existing = crud.get_user_by_email(db, u["email"])
            if not existing:
                crud.create_user(db, schemas.UserCreate(
                    name=u["name"],
                    email=u["email"],
                    password=u["password"],
                    role=u["role"]
                ))
                logger.info(f"Seeded user: {u['email']}")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

seed_users()

def seed_geofences():
    db = next(get_db())
    try:
        crud.seed_geofence_zones(db)
    except Exception as e:
        logger.error(f"Error seeding geofence zones: {e}")
    finally:
        db.close()

seed_geofences()

# 2. Setup FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for CivicSense AI smart compliance platform"
)

# CORS configuration
allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount upload directory to serve evidence images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# 3. Routes

@app.post("/api/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user.role = "Citizen"
    return crud.create_user(db, user)

@app.post("/api/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user_credentials.email)
    if not db_user or not auth.verify_password(user_credentials.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": db_user.email, "role": db_user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role,
        "name": db_user.name,
        "email": db_user.email
    }

@app.post("/api/upload")
def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Saves an uploaded image locally and returns its path and URL.
    """
    ext = validate_image_upload(file)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    stored_name = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    bytes_written = 0

    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Image exceeds {settings.MAX_UPLOAD_SIZE_MB}MB upload limit"
                    )
                buffer.write(chunk)

        if HAS_CV2 and cv2.imread(file_path) is None:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="Uploaded file is not a readable image")

        relative_url = f"/uploads/{stored_name}"
        return {"filename": stored_name, "file_path": file_path, "url": relative_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@app.post("/api/detect", response_model=List[schemas.ViolationResponse])
def run_detection_pipeline(
    image_path: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location: Optional[str] = Form(None),
    blocking_gate: Optional[bool] = Form(None),
    footpath_parking: Optional[bool] = Form(None),
    double_parking: Optional[bool] = Form(None),
    no_parking_zone: Optional[bool] = Form(None),
    violation_category: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Main AI Detection Pipeline:
    1. Detects vehicle bounding boxes using YOLO.
    2. Runs OCR on detected vehicles.
    3. Classifies violation rule-based.
    4. Generates an AI summary.
    5. Saves records to Database.
    6. Generates PDF.
    """
    image_path = resolve_upload_path(image_path)

    # 1. Run YOLO Vehicle Detection
    logger.info(f"Running YOLO detection on: {image_path}")
    detections, annotated_path = detect_vehicles(image_path, settings.UPLOAD_DIR)
    
    if not detections:
        # Return a graceful message when no vehicle is found
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="No vehicle detected. Please upload an image with a visible vehicle."
        )

    violations_created = []
    
    # Pack manual context flags
    manual_flags = {
        "blocking_gate": blocking_gate,
        "footpath_parking": footpath_parking,
        "double_parking": double_parking,
        "no_parking_zone": no_parking_zone,
        "violation_category": violation_category
    }

    # 2. Iterate detections and process
    active_zones = crud.get_geofence_zones(db, active_only=True)
    for idx, det in enumerate(detections):
        # Cropped vehicle path
        crop_path = det["cropped_path"]
        v_type = det["vehicle_type"]
        v_conf = det["confidence"]
        
        # Run EasyOCR
        logger.info(f"Running OCR on cropped region: {crop_path}")
        plate_text, ocr_conf = detect_license_plate(crop_path)
        
        # 3. Classify violation based on rules
        violation_type, classify_conf, recommended_action = classify_parking_violation(
            vehicle_type=v_type,
            latitude=latitude,
            longitude=longitude,
            manual_flags=manual_flags,
            restricted_zones=active_zones
        )
        
        overall_confidence = calculate_weighted_confidence(v_conf, ocr_conf, classify_conf, plate_text)
        confidence_label = confidence_level(overall_confidence)
        
        # 4. Generate AI written summary
        # If plate was recognized
        plate_display = plate_text if plate_text != "Unable to recognize license plate" else "[Unreadable Plate]"
        
        summary = (
            f"A {v_type} was detected committing a '{violation_type}' violation. "
            f"License Plate: {plate_display}. "
            f"Detection Confidence: {int(overall_confidence * 100)}% ({confidence_label}). "
            f"Recommended Enforcement Action: {recommended_action}. "
            f"This case has been registered and is pending review by the traffic authority."
        )
        
        # 5. Save to Database via CRUD
        # Build relative paths for URLs
        rel_image_path = f"/uploads/{os.path.basename(image_path)}"
        rel_annotated_path = f"/uploads/{os.path.basename(annotated_path)}" if annotated_path else None
        
        violation_schema = schemas.ViolationCreate(
            violation_type=violation_type,
            confidence=overall_confidence,
            summary=summary,
            latitude=latitude,
            longitude=longitude,
            location=location,
            vehicle_number=plate_text,
            vehicle_type=v_type,
            image_path=rel_image_path,
            annotated_image=rel_annotated_path
        )
        
        db_violation = crud.create_violation(db, violation_schema)
        violations_created.append(db_violation)
        
    return violations_created

@app.get("/api/violations", response_model=List[schemas.ViolationResponse])
def get_violations(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.get_violations(db, skip=skip, limit=limit, status=status, search=search)

@app.put("/api/violations/{id}", response_model=schemas.ViolationResponse)
def update_violation_status(
    id: int,
    status_update: schemas.ViolationUpdateStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_authority_user) # Only Authority/Admin
):
    # Set reviewer name from user session
    status_update.reviewer_name = current_user.name
    
    db_violation = crud.update_violation_status(db, id, status_update)
    if not db_violation:
        raise HTTPException(status_code=404, detail="Violation record not found")
    return db_violation

@app.get("/api/geofences", response_model=List[schemas.GeofenceZoneResponse])
def list_geofence_zones(
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.get_geofence_zones(db, active_only=active_only)

@app.post("/api/geofences", response_model=schemas.GeofenceZoneResponse, status_code=status.HTTP_201_CREATED)
def create_geofence_zone(
    zone: schemas.GeofenceZoneCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_authority_user)
):
    return crud.create_geofence_zone(db, zone)

@app.put("/api/geofences/{zone_id}", response_model=schemas.GeofenceZoneResponse)
def update_geofence_zone(
    zone_id: int,
    zone_update: schemas.GeofenceZoneUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_authority_user)
):
    db_zone = crud.update_geofence_zone(db, zone_id, zone_update)
    if not db_zone:
        raise HTTPException(status_code=404, detail="Geofence zone not found")
    return db_zone

@app.delete("/api/geofences/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_geofence_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_authority_user)
):
    if not crud.delete_geofence_zone(db, zone_id):
        raise HTTPException(status_code=404, detail="Geofence zone not found")
    return None

@app.get("/api/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns high level aggregated dashboard statistics.
    """
    try:
        # Basic Counts
        total_violations = db.query(models.Violation).count()
        illegal_parking = db.query(models.Violation).filter(models.Violation.violation_type == "Illegal Parking").count()
        reports_generated = db.query(models.Violation).filter(models.Violation.pdf_report != None).count()
        
        # Today's cases count
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_cases = db.query(models.Violation).filter(models.Violation.created_at >= today_start).count()
        
        now = datetime.now()
        months_list = []
        for i in range(5, -1, -1):
            m_date = now - timedelta(days=30 * i)
            m_name = m_date.strftime("%b")
            # Count for this month
            start_date = datetime(m_date.year, m_date.month, 1)
            if m_date.month == 12:
                end_date = datetime(m_date.year + 1, 1, 1)
            else:
                end_date = datetime(m_date.year, m_date.month + 1, 1)
                
            cnt = db.query(models.Violation).filter(
                models.Violation.created_at >= start_date,
                models.Violation.created_at < end_date
            ).count()
            months_list.append(schemas.ChartDataPoint(name=m_name, value=cnt))
            
        # Violation Type Distribution
        type_rows = (
            db.query(models.Violation.violation_type, func.count(models.Violation.id))
            .group_by(models.Violation.violation_type)
            .order_by(func.count(models.Violation.id).desc())
            .all()
        )
        type_dist = [schemas.ChartDataPoint(name=t, value=cnt) for t, cnt in type_rows]
            
        # Recent Reports (max 5)
        recent_viols = db.query(models.Violation).order_by(desc(models.Violation.created_at)).limit(5).all()
        recent_reports = []
        for v in recent_viols:
            recent_reports.append(schemas.RecentReport(
                id=v.id,
                vehicle_number=v.vehicle.vehicle_number if v.vehicle else "Unable to recognize license plate",
                violation_type=v.violation_type,
                review_status=v.review_status,
                created_at=v.created_at.strftime('%Y-%m-%d %H:%M')
            ))
            
        return schemas.DashboardStats(
            total_violations=total_violations,
            illegal_parking=illegal_parking,
            reports_generated=reports_generated,
            today_cases=today_cases,
            monthly_chart=months_list,
            type_distribution=type_dist,
            recent_reports=recent_reports
        )
    except Exception as e:
        logger.error(f"Failed to fetch dashboard stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load dashboard metrics")

@app.get("/api/analytics", response_model=schemas.AnalyticsStats)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns analytics distributions.
    """
    try:
        now = datetime.utcnow()
        trends = []
        for i in range(3, -1, -1):
            start = (now - timedelta(weeks=i + 1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end = (now - timedelta(weeks=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            cnt = db.query(models.Violation).filter(
                models.Violation.created_at >= start,
                models.Violation.created_at < end
            ).count()
            trends.append(schemas.ChartDataPoint(name=f"Week {4 - i}", value=cnt))
        
        status_rows = (
            db.query(models.Violation.review_status, func.count(models.Violation.id))
            .group_by(models.Violation.review_status)
            .all()
        )
        status_dist = [schemas.ChartDataPoint(name=s, value=cnt) for s, cnt in status_rows]

        type_rows = (
            db.query(models.Violation.violation_type, func.count(models.Violation.id))
            .group_by(models.Violation.violation_type)
            .order_by(func.count(models.Violation.id).desc())
            .all()
        )
        type_dist = [schemas.ChartDataPoint(name=t, value=cnt) for t, cnt in type_rows]

        monthly_trends = []
        for i in range(5, -1, -1):
            m_date = datetime.now() - timedelta(days=30 * i)
            start_date = datetime(m_date.year, m_date.month, 1)
            end_date = datetime(m_date.year + 1, 1, 1) if m_date.month == 12 else datetime(m_date.year, m_date.month + 1, 1)
            cnt = db.query(models.Violation).filter(
                models.Violation.created_at >= start_date,
                models.Violation.created_at < end_date
            ).count()
            monthly_trends.append(schemas.ChartDataPoint(name=m_date.strftime("%b"), value=cnt))

        gps_rows = (
            db.query(
                models.Violation.latitude,
                models.Violation.longitude,
                models.Violation.location,
                func.count(models.Violation.id).label("intensity")
            )
            .filter(models.Violation.latitude != None, models.Violation.longitude != None)
            .group_by(models.Violation.latitude, models.Violation.longitude, models.Violation.location)
            .order_by(desc("intensity"))
            .limit(100)
            .all()
        )
        heatmap_points = [
            schemas.HeatmapPoint(
                latitude=lat,
                longitude=lng,
                intensity=count,
                label=location or "Unknown Location"
            )
            for lat, lng, location, count in gps_rows
        ]

        offender_rows = (
            db.query(
                models.Vehicle.vehicle_number,
                models.Vehicle.vehicle_type,
                func.count(models.Violation.id).label("violation_count"),
                func.max(models.Violation.created_at).label("latest_seen")
            )
            .join(models.Violation, models.Vehicle.id == models.Violation.vehicle_id)
            .group_by(models.Vehicle.id)
            .having(func.count(models.Violation.id) > 1)
            .order_by(desc("violation_count"), desc("latest_seen"))
            .limit(10)
            .all()
        )
        repeat_offenders = []
        for vehicle_number, vehicle_type, violation_count, latest_seen in offender_rows:
            latest = (
                db.query(models.Violation)
                .join(models.Vehicle, models.Vehicle.id == models.Violation.vehicle_id)
                .filter(models.Vehicle.vehicle_number == vehicle_number)
                .order_by(desc(models.Violation.created_at))
                .first()
            )
            repeat_offenders.append(schemas.RepeatOffender(
                vehicle_number=vehicle_number,
                vehicle_type=vehicle_type,
                violation_count=violation_count,
                latest_violation=latest.violation_type if latest else "Unknown",
                latest_status=latest.review_status if latest else "Unknown"
            ))
            
        return schemas.AnalyticsStats(
            violation_trends=trends,
            distribution_by_type=type_dist,
            status_distribution=status_dist,
            monthly_trends=monthly_trends,
            heatmap_points=heatmap_points,
            repeat_offenders=repeat_offenders
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/{id}/download")
def download_pdf_report(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Downloads the PDF report for the given violation ID.
    """
    db_violation = crud.get_violation(db, id)
    if not db_violation:
        raise HTTPException(status_code=404, detail="Violation record not found")
        
    pdf_filename = f"report_{db_violation.id}.pdf"
    pdf_path = os.path.join(settings.REPORT_DIR, pdf_filename)
    
    if not os.path.exists(pdf_path):
        # Try to regenerate if missing
        db_vehicle = db_violation.vehicle
        actions_mapping = {
            "Hospital Emergency Entrance": "Tow Vehicle",
            "Blocking Residential Gate": "Tow Vehicle",
            "Footpath Parking": "Tow Vehicle",
            "Illegal Parking": "Issue Warning",
            "Double Parking": "Issue Warning",
            "No Parking Zone": "Issue Warning"
        }
        
        report_data = {
            "id": db_violation.id,
            "vehicle_number": db_vehicle.vehicle_number if db_vehicle else "Unable to recognize license plate",
            "vehicle_type": db_vehicle.vehicle_type if db_vehicle else "unknown",
            "violation_type": db_violation.violation_type,
            "confidence": db_violation.confidence,
            "summary": db_violation.summary,
            "review_status": db_violation.review_status,
            "latitude": db_violation.latitude,
            "longitude": db_violation.longitude,
            "location": db_violation.location,
            "image_path": db_violation.image_path,
            "annotated_path": db_violation.annotated_image,
            "created_at": db_violation.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "reviewer_name": "Authorized Controller",
            "recommended_action": actions_mapping.get(db_violation.violation_type, "Issue Warning"),
            "qr_url": f"http://localhost:5173/history?id={db_violation.id}"
        }
        from ai.report_generator import generate_pdf_report
        success = generate_pdf_report(report_data, pdf_path)
        if not success:
            raise HTTPException(status_code=404, detail="PDF report does not exist and could not be generated")
            
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_filename
    )
