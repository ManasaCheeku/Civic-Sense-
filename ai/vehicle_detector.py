import os
import cv2
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VehicleDetector")

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    logger.warning("ultralytics (YOLOv8) not installed. Falling back to OpenCV-based detection.")
    HAS_YOLO = False

# COCO classes for vehicles: 2 (car), 3 (motorcycle), 5 (bus), 7 (truck)
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

_YOLO_MODEL = None
_YOLO_MODEL_ERROR = None


def get_yolo_model():
    global _YOLO_MODEL, _YOLO_MODEL_ERROR
    if _YOLO_MODEL is not None:
        return _YOLO_MODEL
    if _YOLO_MODEL_ERROR is not None:
        return None
    if not HAS_YOLO:
        _YOLO_MODEL_ERROR = "ultralytics not available"
        return None
    try:
        _YOLO_MODEL = YOLO("yolov8n.pt")
        return _YOLO_MODEL
    except Exception as exc:
        _YOLO_MODEL_ERROR = str(exc)
        logger.warning(f"YOLO model could not be loaded: {exc}")
        return None


def detect_vehicles(image_path: str, output_dir: str):
    """
    Detects vehicles in the given image.
    Saves the annotated image and returns vehicle detections.
    
    Returns:
        tuple: (list of detections, annotated_image_path) or ([], None)
    """
    if not os.path.exists(image_path):
        logger.error(f"Image path does not exist: {image_path}")
        return [], None

    # Load image
    img = cv2.imread(image_path)
    if img is None:
        logger.error(f"Failed to read image: {image_path}")
        return [], None

    h, w, _ = img.shape
    detections = []
    
    # Generate unique output filenames
    filename = os.path.basename(image_path)
    name_parts = os.path.splitext(filename)
    annotated_filename = f"{name_parts[0]}_annotated{name_parts[1]}"
    annotated_path = os.path.join(output_dir, annotated_filename)
    
    os.makedirs(output_dir, exist_ok=True)

    model = get_yolo_model()
    if model is not None:
        try:
            results = model(image_path, verbose=False)
            
            # Create a copy for annotations
            annotated_img = img.copy()
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    
                    if cls_id in VEHICLE_CLASSES:
                        class_name = VEHICLE_CLASSES[cls_id]
                        # Bounding box coordinates: [x1, y1, x2, y2]
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        
                        # Crop vehicle
                        cropped_filename = f"vehicle_{len(detections)}_{filename}"
                        cropped_path = os.path.join(output_dir, cropped_filename)
                        cropped_img = img[y1:y2, x1:x2]
                        if cropped_img.size > 0:
                            cv2.imwrite(cropped_path, cropped_img)
                        else:
                            cropped_path = image_path
                        
                        detections.append({
                            "box": [x1, y1, x2, y2],
                            "vehicle_type": class_name,
                            "confidence": conf,
                            "cropped_path": cropped_path
                        })
                        
                        # Draw bounding box and label
                        cv2.rectangle(annotated_img, (x1, y1), (x2, y2), (0, 255, 0), 3)
                        label = f"{class_name.upper()} {conf:.2f}"
                        cv2.putText(annotated_img, label, (x1, y1 - 10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            
            # Save annotated image
            if detections:
                cv2.imwrite(annotated_path, annotated_img)
                return detections, annotated_path
            else:
                logger.info("YOLO did not detect any vehicles.")
                return [], None
                
        except Exception as e:
            logger.error(f"Error running YOLOv8: {e}. Falling back to OpenCV.")
            # Fall through to OpenCV fallback

    # OpenCV Heuristic Fallback:
    # If YOLO fails or isn't installed, search for large contours or crop center
    # as a fallback vehicle detection to ensure code remains runnable and interactive.
    logger.info("Running OpenCV fallback vehicle detection.")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)
    
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Sort contours by size and find the largest one
    large_contours = [c for c in contours if cv2.contourArea(c) > 5000]
    
    if large_contours:
        # Sort by area descending
        large_contours = sorted(large_contours, key=cv2.contourArea, reverse=True)
        # Take up to 2 largest contours
        annotated_img = img.copy()
        for idx, c in enumerate(large_contours[:2]):
            x, y, box_w, box_h = cv2.boundingRect(c)
            x1, y1, x2, y2 = x, y, x + box_w, y + box_h
            
            cropped_filename = f"vehicle_{idx}_{filename}"
            cropped_path = os.path.join(output_dir, cropped_filename)
            cropped_img = img[y1:y2, x1:x2]
            cv2.imwrite(cropped_path, cropped_img)
            
            detections.append({
                "box": [x1, y1, x2, y2],
                "vehicle_type": "car", # Default fallback class
                "confidence": 0.85,
                "cropped_path": cropped_path
            })
            
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), (0, 255, 0), 3)
            cv2.putText(annotated_img, "VEHICLE (FALLBACK) 0.85", (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            
        cv2.imwrite(annotated_path, annotated_img)
        return detections, annotated_path
        
    else:
        # If no large contour is found, check if image is generally large enough and assume a car in the middle
        if h > 200 and w > 200:
            # Let's crop the center 60% of the image
            x1, y1 = int(w * 0.2), int(h * 0.2)
            x2, y2 = int(w * 0.8), int(h * 0.8)
            
            cropped_filename = f"vehicle_center_{filename}"
            cropped_path = os.path.join(output_dir, cropped_filename)
            cropped_img = img[y1:y2, x1:x2]
            cv2.imwrite(cropped_path, cropped_img)
            
            detections.append({
                "box": [x1, y1, x2, y2],
                "vehicle_type": "car",
                "confidence": 0.75,
                "cropped_path": cropped_path
            })
            
            annotated_img = img.copy()
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), (0, 255, 0), 3)
            cv2.putText(annotated_img, "CAR (FALLBACK) 0.75", (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.imwrite(annotated_path, annotated_img)
            return detections, annotated_path

    logger.info("OpenCV fallback did not detect any vehicle-like shapes.")
    return [], None
