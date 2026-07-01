import math
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ParkingClassifier")

# Configurable restricted zones for the MVP (can be extended)
# Defaults represent a mock coordinate system centered near a smart city location
RESTRICTED_ZONES = [
    {
        "name": "St. Jude Hospital - Emergency Access Area",
        "latitude": 40.73061,
        "longitude": -73.93524,
        "radius_meters": 50.0,
        "violation_type": "Hospital Emergency Entrance"
    },
    {
        "name": "Metro High School - Student drop-off zone",
        "latitude": 40.73161,
        "longitude": -73.93624,
        "radius_meters": 30.0,
        "violation_type": "School / College Entrance"
    },
    {
        "name": "Downtown Boulevard - Official No-Parking Segment",
        "latitude": 40.72961,
        "longitude": -73.93424,
        "radius_meters": 40.0,
        "violation_type": "No Parking Zone"
    }
]

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculates the great-circle distance between two points in meters.
    """
    R = 6371000  # Radius of earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def classify_parking_violation(vehicle_type: str, latitude: float, longitude: float, manual_flags: dict = None) -> tuple:
    """
    Classifies the parking violation based on coordinates and manual/context flags.
    
    Args:
        vehicle_type: Type of vehicle (car, bus, truck, motorcycle)
        latitude: Incident latitude
        longitude: Incident longitude
        manual_flags: Optional flags passed from frontend (e.g. {"blocking_gate": True})
        
    Returns:
        tuple: (violation_type: str, confidence: float, recommended_action: str)
    """
    # 1. Manual Flags take highest precedence for specific scenarios
    if manual_flags:
        if manual_flags.get("footpath_parking"):
            return "Footpath Parking", 0.95, "Tow Vehicle"
        if manual_flags.get("blocking_gate"):
            return "Blocking Residential Gate", 0.98, "Tow Vehicle"
        if manual_flags.get("double_parking"):
            return "Double Parking", 0.90, "Issue Warning"
        if manual_flags.get("no_parking_zone"):
            return "No Parking Zone", 0.88, "Issue Warning"

    # 2. Check GPS Coordinates against known restricted zones
    if latitude is not None and longitude is not None:
        for zone in RESTRICTED_ZONES:
            distance = haversine_distance(latitude, longitude, zone["latitude"], zone["longitude"])
            logger.info(f"Distance to {zone['name']}: {distance:.2f} meters")
            if distance <= zone["radius_meters"]:
                # Match found
                violation = zone["violation_type"]
                # Confidence scales inversely with distance from center of zone
                ratio = 1.0 - (distance / zone["radius_meters"]) * 0.3  # Min 0.7 confidence
                confidence = round(max(0.70, ratio), 2)
                
                recommended_action = "Request Manual Verification"
                if "Emergency" in violation or "Hospital" in violation:
                    recommended_action = "Tow Vehicle"
                elif "Entrance" in violation:
                    recommended_action = "Issue Warning"
                
                return violation, confidence, recommended_action

    # 3. Heuristic Rules based on vehicle and manual category if provided
    # If a manual category is explicitly requested
    if manual_flags and manual_flags.get("violation_category"):
        req_cat = manual_flags.get("violation_category")
        actions = {
            "Illegal Parking": "Issue Warning",
            "Footpath Parking": "Tow Vehicle",
            "Double Parking": "Issue Warning",
            "Blocking Residential Gate": "Tow Vehicle",
            "Hospital Emergency Entrance": "Tow Vehicle",
            "School / College Entrance": "Issue Warning",
            "No Parking Zone": "Issue Warning"
        }
        return req_cat, 0.85, actions.get(req_cat, "Request Manual Verification")

    # 4. Default violation if a vehicle was detected and uploaded in this context
    # Usually people upload violations, so default to Illegal Parking
    return "Illegal Parking", 0.75, "Request Manual Verification"
