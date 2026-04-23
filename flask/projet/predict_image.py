import os
import cv2
from ultralytics import YOLO
import uuid

# ==== Configuration ====

# Model paths
MODELS_FOLDER = 'Models'
os.makedirs(MODELS_FOLDER, exist_ok=True)

classification_person_clothes = os.path.join(MODELS_FOLDER, 'classification_person_clothes.pt')
classification_Man_Woman = os.path.join(MODELS_FOLDER, 'classification_Man_Woman.pt')
Detection_clothes_man = os.path.join(MODELS_FOLDER, 'Detection_clothes_man.pt')
Detection_clothes_woman = os.path.join(MODELS_FOLDER, 'Detection_clothes_woman.pt')
Detection_clothes_Unisex_half_1 = os.path.join(MODELS_FOLDER, 'Detection_clothes_Unisex_half_1.pt')
Detection_clothes_Unisex_half_2 = os.path.join(MODELS_FOLDER, 'Detection_clothes_Unisex_half_2.pt')

# Output folder
PROCESSED_FOLDER = 'processed'
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# ==== Load Models ====

model_classification_person_clothes = YOLO(classification_person_clothes)
model_classification_Man_Woman = YOLO(classification_Man_Woman)

model_Detection_clothes_man = YOLO(Detection_clothes_man)
model_Detection_clothes_woman = YOLO(Detection_clothes_woman)
model_Detection_clothes_Unisex_half_1 = YOLO(Detection_clothes_Unisex_half_1)
model_Detection_clothes_Unisex_half_2 = YOLO(Detection_clothes_Unisex_half_2)

# ==== Helper Function to Draw Boxes ====

def draw_boxes(image, results, prefix=""):
    if not results:
        return image, []

    labels = []
    boxes = results[0].boxes
    names = results[0].names

    if boxes is not None and len(boxes) > 0:
        for box in boxes:
            conf = float(box.conf[0])
            if conf < 0.6:
                continue  # Skip low confidence detections

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_id = int(box.cls[0])
            label = f"{prefix}{names[cls_id]}"
            labels.append(f"{label} {conf:.2f}")

            # Draw bounding box and label
            cv2.rectangle(image, (x1, y1), (x2, y2), (255, 0, 0), 2)

            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.7
            thickness = 2
            text_color = (255, 255, 255)
            background_color = (255, 0, 0)

            text = f"{label} {conf:.2f}"
            (text_width, text_height), _ = cv2.getTextSize(text, font, font_scale, thickness)

            cv2.rectangle(image, (x1, y1 - text_height - 10),
                         (x1 + text_width, y1 - 10), background_color, -1)

            cv2.putText(image, text,
                        (x1, y1 - 10), font, font_scale,
                        text_color, thickness)

    return image, labels


# ==== Main Image Processing Function ====

def process_image(original_path, original_filename):
    # Load image
    image = cv2.imread(original_path)
    if image is None:
        raise ValueError("Failed to read image")

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    all_labels = []

    # Step 1: Classify as Person or Clothes
    result_pc = model_classification_person_clothes(original_path)[0]
    cls_id_pc = int(result_pc.probs.top1)
    label_pc = result_pc.names[cls_id_pc]
    all_labels.append(f"Primary Classification: {label_pc}")

    if label_pc == "Person":
        # Step 2: Classify as Man or Woman
        result_gender = model_classification_Man_Woman(original_path)[0]
        cls_id_gender = int(result_gender.probs.top1)
        gender_label = result_gender.names[cls_id_gender]
        all_labels.append(f"Gender: {gender_label}")

        # Step 3: Run detections for Person
        if gender_label == "Man":
            results_man = model_Detection_clothes_man(original_path)
            image_rgb, labels = draw_boxes(image_rgb, results_man, "Man_")
            all_labels.extend(labels)
        elif gender_label == "Woman":
            results_woman = model_Detection_clothes_woman(original_path)
            image_rgb, labels = draw_boxes(image_rgb, results_woman, "Woman_")
            all_labels.extend(labels)

        # Always run both Unisex models too
        results_unisex_1 = model_Detection_clothes_Unisex_half_1(original_path)
        results_unisex_2 = model_Detection_clothes_Unisex_half_2(original_path)

        image_rgb, labels1 = draw_boxes(image_rgb, results_unisex_1, "Unisex_")
        image_rgb, labels2 = draw_boxes(image_rgb, results_unisex_2, "Unisex_")
        all_labels.extend(labels1 + labels2)

    else:
        # Step 4: Detected as Clothes → run all models
        results_man = model_Detection_clothes_man(original_path)
        results_woman = model_Detection_clothes_woman(original_path)

        results_unisex_1 = model_Detection_clothes_Unisex_half_1(original_path)
        results_unisex_2 = model_Detection_clothes_Unisex_half_2(original_path)

        image_rgb, labels_man = draw_boxes(image_rgb, results_man, "Man_")
        image_rgb, labels_woman = draw_boxes(image_rgb, results_woman, "Woman_")
        image_rgb, labels_uni1 = draw_boxes(image_rgb, results_unisex_1, "Unisex_")
        image_rgb, labels_uni2 = draw_boxes(image_rgb, results_unisex_2, "Unisex_")
        
        all_labels.extend(labels_man + labels_woman + labels_uni1 + labels_uni2)

    # Save processed image
    file_ext = os.path.splitext(original_filename)[1]
    processed_filename = f"processed_{uuid.uuid4().hex}{file_ext}"
    output_path = os.path.join(PROCESSED_FOLDER, processed_filename)

    cv2.imwrite(output_path, cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR))

    return processed_filename, all_labels


