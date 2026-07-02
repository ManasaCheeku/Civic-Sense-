from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Citizen", nullable=False) # Citizen, Authority, Admin

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, unique=True, index=True, nullable=False)
    vehicle_type = Column(String, default="unknown", nullable=False) # car, bus, truck, motorcycle

    violations = relationship("Violation", back_populates="vehicle")

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    violation_type = Column(String, nullable=False) # Footpath Parking, No Parking Zone, etc.
    confidence = Column(Float, nullable=False)
    summary = Column(String, nullable=True) # AI-written violation summary
    review_status = Column(String, default="Pending", nullable=False) # Pending, Approved, Rejected
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location = Column(String, nullable=True)
    image_path = Column(String, nullable=False) # Path to uploaded raw image
    annotated_image = Column(String, nullable=True) # Path to annotated image
    pdf_report = Column(String, nullable=True) # Path to generated PDF report
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="violations")

    @property
    def confidence_level(self):
        if self.confidence >= 0.85:
            return "High"
        if self.confidence >= 0.65:
            return "Medium"
        return "Low"

class GeofenceZone(Base):
    __tablename__ = "geofence_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, nullable=False)
    violation_type = Column(String, nullable=False)
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
