import cv2
import numpy as np
import face_recognition
import os
from flask import request, jsonify
from werkzeug.utils import secure_filename

# Path to the folder where face images will be saved
PERSONS_DIR = os.path.join(os.path.dirname(__file__), 'persons')
os.makedirs(PERSONS_DIR, exist_ok=True)  # Make sure the folder exists

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_known_faces():
    images = []
    classNames = []
    if not os.path.exists(PERSONS_DIR):
        return [], []
    
    personsList = os.listdir(PERSONS_DIR)
    for cl in personsList:
        try:
            curPerson = cv2.imread(f'{PERSONS_DIR}/{cl}')
            if curPerson is not None:
                images.append(curPerson)
                classNames.append(os.path.splitext(cl)[0])
        except Exception as e:
            print(f"Error loading image {cl}: {e}")
    return images, classNames

def find_encodings(images):
    encodeList = []
    for img in images:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(img)
        if len(encodings) > 0:
            encodeList.append(encodings[0])
    return encodeList

# Load known faces at startup
known_images, known_names = load_known_faces()
known_encodings = find_encodings(known_images)
print(f'Loaded {len(known_encodings)} known face encodings.')

def register_face_routes(app):
    @app.route('/register_face', methods=['POST'])
    def register_face():
        if 'name' not in request.form or 'image' not in request.files:
            return jsonify({'message': 'Name and image are required.'}), 400

        name = request.form['name'].strip()
        image = request.files['image']

        if name == '':
            return jsonify({'message': 'Name cannot be empty.'}), 400
        if image.filename == '':
            return jsonify({'message': 'No file selected.'}), 400
        if not allowed_file(image.filename):
            return jsonify({'message': 'Unsupported file type. Use JPG or PNG.'}), 400

        filename = secure_filename(f"{name}.jpg")  # Normalize + force .jpg extension
        filepath = os.path.join(PERSONS_DIR, filename)

        try:
            image.save(filepath)
            # Update the known faces list
            new_image = cv2.imread(filepath)
            if new_image is not None:
                known_images.append(new_image)
                known_names.append(name)
                encoding = face_recognition.face_encodings(cv2.cvtColor(new_image, cv2.COLOR_BGR2RGB))
                if len(encoding) > 0:
                    known_encodings.append(encoding[0])
            return jsonify({'message': f'{name} registered successfully.'}), 200
        except Exception as e:
            return jsonify({'message': f'Error saving file: {str(e)}'}), 500

    @app.route('/verify_face', methods=['POST'])
    def verify_face():
        if 'image' not in request.files:
            return jsonify({'message': 'Image is required.'}), 400

        image = request.files['image']
        if image.filename == '':
            return jsonify({'message': 'No file selected.'}), 400
        if not allowed_file(image.filename):
            return jsonify({'message': 'Unsupported file type. Use JPG or PNG.'}), 400

        try:
            # Save the temporary image
            temp_path = os.path.join(PERSONS_DIR, 'temp_verify.jpg')
            image.save(temp_path)
            
            # Load and process the image
            img = cv2.imread(temp_path)
            if img is None:
                return jsonify({'message': 'Could not read the image.'}), 400
                
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Find faces in the image
            face_locations = face_recognition.face_locations(img_rgb)
            if not face_locations:
                return jsonify({'verified': False, 'message': 'No face detected in the image.'}), 200
                
            # Get encodings for each face
            face_encodings = face_recognition.face_encodings(img_rgb, face_locations)
            
            results = []
            for face_encoding in face_encodings:
                # Compare with known faces
                matches = face_recognition.compare_faces(known_encodings, face_encoding)
                face_distances = face_recognition.face_distance(known_encodings, face_encoding)
                
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        name = known_names[best_match_index]
                        confidence = 1 - face_distances[best_match_index]
                        results.append({
                            'verified': True,
                            'name': name,
                            'confidence': float(confidence)
                        })
                    else:
                        results.append({
                            'verified': False,
                            'message': 'Face not recognized'
                        })
                else:
                    results.append({
                        'verified': False,
                        'message': 'No known faces to compare with'
                    })
            print (results)
            # Clean up temporary file
            try:
                os.remove(temp_path)
            except:
                pass
                
            return jsonify({'results': results}), 200

            
        except Exception as e:
            return jsonify({'message': f'Error processing image: {str(e)}'}), 500