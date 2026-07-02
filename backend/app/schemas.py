from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "Citizen" # Citizen, Authority, Admin

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Vehicle Schemas
class VehicleBase(BaseModel):
    vehicle_number: str
    vehicle_type: str

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# Violation Schemas
class ViolationBase(BaseModel):
    violation_type: str
    confidence: float
    summary: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location: Optional[str] = None

class ViolationCreate(ViolationBase):
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    image_path: str
    annotated_image: Optional[str] = None

class ViolationUpdateStatus(BaseModel):
    review_status: str # Approved, Rejected, Dismissed
    reviewer_name: Optional[str] = None

class ViolationResponse(ViolationBase):
    id: int
    vehicle_id: Optional[int] = None
    vehicle: Optional[VehicleResponse] = None
    review_status: str
    confidence_level: str
    image_path: str
    annotated_image: Optional[str] = None
    pdf_report: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Geofence Schemas
class GeofenceZoneBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius_meters: float = Field(gt=0)
    violation_type: str
    is_active: bool = True

class GeofenceZoneCreate(GeofenceZoneBase):
    pass

class GeofenceZoneUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[float] = Field(default=None, gt=0)
    violation_type: Optional[str] = None
    is_active: Optional[bool] = None

class GeofenceZoneResponse(GeofenceZoneBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Dashboard & Analytics Schemas
class MetricCard(BaseModel):
    title: str
    value: int
    change: str
    type: str # increase, decrease, neutral

class ChartDataPoint(BaseModel):
    name: str
    value: int

class RecentReport(BaseModel):
    id: int
    vehicle_number: str
    violation_type: str
    review_status: str
    created_at: str

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    intensity: int
    label: str

class RepeatOffender(BaseModel):
    vehicle_number: str
    vehicle_type: str
    violation_count: int
    latest_violation: str
    latest_status: str

class DashboardStats(BaseModel):
    total_violations: int
    illegal_parking: int
    reports_generated: int
    today_cases: int
    monthly_chart: List[ChartDataPoint]
    type_distribution: List[ChartDataPoint]
    recent_reports: List[RecentReport]

class AnalyticsStats(BaseModel):
    violation_trends: List[ChartDataPoint]
    distribution_by_type: List[ChartDataPoint]
    status_distribution: List[ChartDataPoint]
    monthly_trends: List[ChartDataPoint]
    heatmap_points: List[HeatmapPoint] = []
    repeat_offenders: List[RepeatOffender] = []
