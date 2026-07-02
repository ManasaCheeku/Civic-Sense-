from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
import os

from . import models, schemas
from .auth import hash_password
from ai.report_generator import generate_pdf_report
from .config import settings

# User operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Geofence operations
DEFAULT_GEOFENCE_ZONES = [
    {
        "name": "St. Jude Hospital - Emergency Access Area",
        "latitude": 40.73061,
        "longitude": -73.93524,
        "radius_meters": 50.0,
        "violation_type": "Hospital Emergency Entrance",
    },
    {
        "name": "Metro High School - Student drop-off zone",
        "latitude": 40.73161,
        "longitude": -73.93624,
        "radius_meters": 30.0,
        "violation_type": "School / College Entrance",
    },
    {
        "name": "Downtown Boulevard - Official No-Parking Segment",
        "latitude": 40.72961,
        "longitude": -73.93424,
        "radius_meters": 40.0,
        "violation_type": "No Parking Zone",
    },
]

def seed_geofence_zones(db: Session):
    if db.query(models.GeofenceZone).count() > 0:
        return
    for zone in DEFAULT_GEOFENCE_ZONES:
        db.add(models.GeofenceZone(**zone))
    db.commit()

def get_geofence_zones(db: Session, active_only: bool = False):
    query = db.query(models.GeofenceZone)
    if active_only:
        query = query.filter(models.GeofenceZone.is_active == 1)
    return query.order_by(models.GeofenceZone.name.asc()).all()

def get_geofence_zone(db: Session, zone_id: int):
    return db.query(models.GeofenceZone).filter(models.GeofenceZone.id == zone_id).first()

def create_geofence_zone(db: Session, zone: schemas.GeofenceZoneCreate):
    db_zone = models.GeofenceZone(
        name=zone.name,
        latitude=zone.latitude,
        longitude=zone.longitude,
        radius_meters=zone.radius_meters,
        violation_type=zone.violation_type,
        is_active=1 if zone.is_active else 0,
    )
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

def update_geofence_zone(db: Session, zone_id: int, zone_update: schemas.GeofenceZoneUpdate):
    db_zone = get_geofence_zone(db, zone_id)
    if not db_zone:
        return None
    for field, value in zone_update.model_dump(exclude_unset=True).items():
        if field == "is_active":
            value = 1 if value else 0
        setattr(db_zone, field, value)
    db_zone.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_zone)
    return db_zone

def delete_geofence_zone(db: Session, zone_id: int):
    db_zone = get_geofence_zone(db, zone_id)
    if not db_zone:
        return False
    db.delete(db_zone)
    db.commit()
    return True

# Vehicle operations
def get_vehicle_by_number(db: Session, vehicle_number: str):
    return db.query(models.Vehicle).filter(models.Vehicle.vehicle_number == vehicle_number).first()

def create_vehicle(db: Session, vehicle: schemas.VehicleCreate):
    db_vehicle = models.Vehicle(
        vehicle_number=vehicle.vehicle_number,
        vehicle_type=vehicle.vehicle_type
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

# Violation operations
def get_violation(db: Session, violation_id: int):
    return db.query(models.Violation).filter(models.Violation.id == violation_id).first()

def get_violations(db: Session, skip: int = 0, limit: int = 100, status: str = None, search: str = None):
    query = db.query(models.Violation).join(models.Vehicle, isouter=True)
    
    if status:
        query = query.filter(models.Violation.review_status == status)
        
    if search:
        # Search by license plate
        query = query.filter(models.Vehicle.vehicle_number.ilike(f"%{search}%"))
        
    return query.order_by(desc(models.Violation.created_at)).offset(skip).limit(limit).all()

def create_violation(db: Session, violation_data: schemas.ViolationCreate):
    # 1. Resolve or create vehicle
    db_vehicle = None
    if violation_data.vehicle_number:
        db_vehicle = get_vehicle_by_number(db, violation_data.vehicle_number)
        if not db_vehicle:
            # Create a new vehicle record
            db_vehicle = models.Vehicle(
                vehicle_number=violation_data.vehicle_number,
                vehicle_type=violation_data.vehicle_type or "unknown"
            )
            db.add(db_vehicle)
            db.commit()
            db.refresh(db_vehicle)

    # 2. Create violation record
    db_violation = models.Violation(
        vehicle_id=db_vehicle.id if db_vehicle else None,
        violation_type=violation_data.violation_type,
        confidence=violation_data.confidence,
        summary=violation_data.summary,
        review_status="Pending",
        latitude=violation_data.latitude,
        longitude=violation_data.longitude,
        location=violation_data.location or "Unknown Smart-City Street",
        image_path=violation_data.image_path,
        annotated_image=violation_data.annotated_image,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_violation)
    db.commit()
    db.refresh(db_violation)

    # 3. Generate initial PDF report
    pdf_filename = f"report_{db_violation.id}.pdf"
    pdf_path = os.path.join(settings.REPORT_DIR, pdf_filename)
    
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
        "reviewer_name": "Pending Review",
        "recommended_action": "Request Manual Verification",
        "qr_url": f"http://localhost:5173/history?id={db_violation.id}"
    }
    
    success = generate_pdf_report(report_data, pdf_path)
    if success:
        # Save relative URL/path for downloads
        db_violation.pdf_report = f"/api/reports/{db_violation.id}/download"
        db.commit()
        db.refresh(db_violation)

    return db_violation

def update_violation_status(db: Session, violation_id: int, status_update: schemas.ViolationUpdateStatus):
    db_violation = get_violation(db, violation_id)
    if not db_violation:
        return None
        
    db_violation.review_status = status_update.review_status
    db_violation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_violation)
    
    # Regenerate the PDF report with updated approval status, reviewer, and actions
    actions_mapping = {
        "Hospital Emergency Entrance": "Tow Vehicle",
        "Blocking Residential Gate": "Tow Vehicle",
        "Footpath Parking": "Tow Vehicle",
        "Illegal Parking": "Issue Warning",
        "Double Parking": "Issue Warning",
        "No Parking Zone": "Issue Warning",
        "School / College Entrance": "Issue Warning"
    }
    
    recommended_action = "Request Manual Verification"
    if status_update.review_status == "Approved":
        recommended_action = actions_mapping.get(db_violation.violation_type, "Issue Warning")
    elif status_update.review_status == "Rejected":
        recommended_action = "Case Rejected - No Action Required"
    elif status_update.review_status == "Dismissed":
        recommended_action = "Case Dismissed"

    pdf_filename = f"report_{db_violation.id}.pdf"
    pdf_path = os.path.join(settings.REPORT_DIR, pdf_filename)
    
    db_vehicle = db_violation.vehicle
    
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
        "reviewer_name": status_update.reviewer_name or "Authorized Traffic Controller",
        "recommended_action": recommended_action,
        "qr_url": f"http://localhost:5173/history?id={db_violation.id}"
    }
    
    generate_pdf_report(report_data, pdf_path)
    
    return db_violation
