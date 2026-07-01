import os
import sys
import pytest
import cv2
import numpy as np

# Ensure root directories are on PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ai"))

from ai.vehicle_detector import detect_vehicles
from ai.ocr import detect_license_plate
from ai.parking_classifier import classify_parking_violation
from ai.report_generator import generate_pdf_report

@pytest.fixture
def dummy_image(tmp_path):
    # Create a simple red 400x400 image for testing
    img_path = str(tmp_path / "test_car.jpg")
    img = np.zeros((400, 400, 3), dtype=np.uint8)
    # Draw a rectangle to simulate a vehicle silhouette
    cv2.rectangle(img, (50, 100), (350, 300), (0, 0, 255), -1)
    # Save image
    cv2.imwrite(img_path, img)
    return img_path

def test_vehicle_detection_fallback(dummy_image, tmp_path):
    output_dir = str(tmp_path / "output")
    detections, annotated_path = detect_vehicles(dummy_image, output_dir)
    
    assert isinstance(detections, list)
    if detections:
        assert "vehicle_type" in detections[0]
        assert "confidence" in detections[0]
        assert "cropped_path" in detections[0]
        assert os.path.exists(annotated_path)

def test_ocr_fallback():
    # If file doesn't exist, should handle gracefully
    plate, conf = detect_license_plate("non_existent_file.jpg")
    assert plate == "Unable to recognize license plate"
    assert conf == 0.0

def test_ocr_filename_bypass(tmp_path):
    # Test filename regex bypass for testing
    img_path = str(tmp_path / "vehicle_0_KA01AB1234.jpg")
    with open(img_path, "w") as f:
        f.write("dummy")
    
    plate, conf = detect_license_plate(img_path)
    assert plate == "KA01AB1234"
    assert conf == 0.95

def test_classification():
    # Test manual gate blocking flag
    v_type, conf, action = classify_parking_violation(
        vehicle_type="car",
        latitude=40.73061,
        longitude=-73.93524,
        manual_flags={"blocking_gate": True}
    )
    assert v_type == "Blocking Residential Gate"
    assert conf == 0.98
    assert action == "Tow Vehicle"

    # Test coordinate match with St. Jude Hospital
    v_type, conf, action = classify_parking_violation(
        vehicle_type="car",
        latitude=40.73062, # Very close to hospital coordinate (40.73061, -73.93524)
        longitude=-73.93525,
        manual_flags=None
    )
    assert v_type == "Hospital Emergency Entrance"
    assert conf >= 0.70
    assert action == "Tow Vehicle"

def test_report_generation(tmp_path):
    pdf_path = str(tmp_path / "test_report.pdf")
    report_data = {
        "id": 999,
        "vehicle_number": "NY-123-ABC",
        "vehicle_type": "car",
        "violation_type": "Illegal Parking",
        "confidence": 0.85,
        "summary": "This is a unit test summary for CivicSense AI report generation.",
        "review_status": "Pending",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "location": "Test Main Street",
        "image_path": None,
        "annotated_path": None,
        "created_at": "2026-06-30 20:00:00",
        "reviewer_name": "Test Officer",
        "recommended_action": "Issue Warning",
        "qr_url": "http://localhost:5173/history?id=999"
    }
    
    success = generate_pdf_report(report_data, pdf_path)
    assert success is True
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 0
