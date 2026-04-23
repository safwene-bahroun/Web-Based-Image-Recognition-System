import os
import re
import traceback
from datetime import datetime

import cv2
import numpy as np
from flask import request, jsonify
from pyzbar import pyzbar
import easyocr
from ultralytics import YOLO
from werkzeug.utils import secure_filename

# -----------------------------------------------------------------------------
# Configuration ----------------------------------------------------------------
# -----------------------------------------------------------------------------

MODELS_FOLDER = "models"
MODEL_FILENAME = "barcode_qr.pt"  # your custom YOLO model
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

# Ensure folders exist
os.makedirs(MODELS_FOLDER, exist_ok=True)
MODEL_PATH = os.path.join(MODELS_FOLDER, MODEL_FILENAME)

# -----------------------------------------------------------------------------
# Model loading (do this ONCE per python process) ------------------------------
# -----------------------------------------------------------------------------

yolo_model = YOLO(MODEL_PATH)  # Ultralytics model
reader = easyocr.Reader(["ar","fa","ur","ug","en"], gpu=True)  # load EasyOCR once (GPU if available)

# -----------------------------------------------------------------------------
# Helper functions -------------------------------------------------------------
# -----------------------------------------------------------------------------

def allowed_file(filename: str) -> bool:
    """Validate file extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def decode_barcodes(img_bgr: np.ndarray):
    """Return pyzbar results + image annotated with rectangles."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    barcodes = pyzbar.decode(gray)
    results = []

    for barcode in barcodes:
        x, y, w, h = barcode.rect
        cv2.rectangle(img_bgr, (x, y), (x + w, y + h), (0, 255, 0), 2)
        data = barcode.data.decode("utf-8")
        barcode_type = barcode.type
        results.append({
            "type": barcode_type,
            "data": data,
            "bounding_box": {"x": x, "y": y, "w": w, "h": h},
        })
        cv2.putText(img_bgr, f"{barcode_type}: {data}", (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    return img_bgr, results


def extract_text(img_bgr: np.ndarray):
    """Read text with EasyOCR, keep numeric only, annotate, return concatenation."""
    ocr_results = reader.readtext(img_bgr, paragraph=False)
    extracted_text = []
    concatenated = ""

    for bbox, text, conf in ocr_results:
        numeric = re.sub(r"[^0-9]", "", text)
        if not numeric:
            continue

        concatenated += numeric
        (tl, tr, br, bl) = bbox
        tl, br = map(lambda p: (int(p[0]), int(p[1])), (tl, br))
        cv2.rectangle(img_bgr, tl, br, (0, 0, 255), 2)
        cv2.putText(img_bgr, numeric, (tl[0], tl[1] - 10), cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (0, 0, 255), 2)
        extracted_text.append({
            "text": numeric,
            "confidence": float(conf),
            "bounding_box": {"top_left": tl, "bottom_right": br},
        })
    return img_bgr, extracted_text, concatenated


def deduplicate(items, key="data"):
    """Remove duplicates based on a key field."""
    seen = set()
    unique = []
    for itm in items:
        k = itm.get(key)
        if k not in seen:
            seen.add(k)
            unique.append(itm)
    return unique


def process_roi(roi: np.ndarray, x1: int, y1: int, x2: int, y2: int):
    """Run BOTH pyzbar & EasyOCR on the ROI and merge results."""
    combined_barcodes, combined_text = [], []

    # 1) pyzbar
    roi_barcode_vis, pb_results = decode_barcodes(roi.copy())
    combined_barcodes.extend(pb_results)

    # 2) easyocr
    roi_ocr_vis, text_results, concat_digits = extract_text(roi.copy())
    combined_text.extend(text_results)

    if concat_digits:
        combined_barcodes.append({
            "type": "OCR_FALLBACK",
            "data": concat_digits,
            "bounding_box": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
        })

    # Merge visualizations (prioritize pyzbar overlays, then OCR)
    roi_vis = roi.copy()
    roi_vis = roi_barcode_vis if pb_results else roi_vis
    roi_vis = roi_ocr_vis if text_results else roi_vis

    return roi_vis, deduplicate(combined_barcodes), combined_text


def detect_and_process(img_bgr: np.ndarray):
    """Run YOLO detection, then process every barcode / QR ROI."""
    detections = yolo_model(img_bgr)
    vis = img_bgr.copy()

    all_barcodes, all_text = [], []

    for det in detections:
        boxes = det.boxes.xyxy.cpu().numpy()
        clss = det.boxes.cls.cpu().numpy()
        confs = det.boxes.conf.cpu().numpy()

        for box, cls_id, conf in zip(boxes, clss, confs):
            class_name = yolo_model.names[int(cls_id)]
            if class_name.lower() not in {"barcode", "qr code"}:
                continue

            if conf < 0.2:  # ignore ultra‑low confidence boxes
                continue

            x1, y1, x2, y2 = map(int, box)

            # Enlarge ROI if medium confidence
            if conf < 0.5:
                w, h = x2 - x1, y2 - y1
                x1, y1 = max(0, x1 - int(0.2 * w)), max(0, y1 - int(0.2 * h))
                x2, y2 = min(img_bgr.shape[1], x2 + int(0.2 * w)), min(img_bgr.shape[0], y2 + int(0.2 * h))

            roi = img_bgr[y1:y2, x1:x2]
            if roi.size == 0:
                continue

            roi_vis, barcodes, texts = process_roi(roi, x1, y1, x2, y2)
            all_barcodes.extend(barcodes)
            all_text.extend(texts)

            vis[y1:y2, x1:x2] = roi_vis
            cv2.rectangle(vis, (x1, y1), (x2, y2), (255, 0, 0), 2)
            cv2.putText(vis, f"{class_name} {conf:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

    results = {
        "barcodes": deduplicate(all_barcodes),
        "text": all_text,
    }
    return vis, results

# -----------------------------------------------------------------------------
# Flask route factory ----------------------------------------------------------
# -----------------------------------------------------------------------------

def register_qr_barcode_routes(app):
    """Call this from your main Flask app factory."""

    # ensure the processed folder exists and is configured
    app.config.setdefault("PROCESSED_FOLDER", "processed")
    os.makedirs(app.config["PROCESSED_FOLDER"], exist_ok=True)

    @app.route("/read_barcode", methods=["POST"])
    def read_barcode_endpoint():
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400

        try:
            data = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(data, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Unable to decode image")

            # downscale huge images (>1600 px longest side)
            h, w = img.shape[:2]
            if max(h, w) > 1600:
                scale = 1600 / max(h, w)
                img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

            processed_img, results = detect_and_process(img)

            # Save visualization
            safe_name = secure_filename(file.filename)
            out_name = f"processed_{datetime.now().strftime('%Y%m%dT%H%M%S')}_{safe_name}"
            out_path = os.path.join(app.config["PROCESSED_FOLDER"], out_name)
            cv2.imwrite(out_path, processed_img)

            return jsonify({"success": True, "filename": out_name, "results": results})

        except Exception as e:
            traceback.print_exc()
            return jsonify({"success": False, "error": str(e)}), 500