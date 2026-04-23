from flask import request, jsonify
from werkzeug.utils import secure_filename
import os
from predict_image import process_image
from datetime import datetime

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload(app):
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    @app.route('/upload_image', methods=['POST'])
    def handle_upload():
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        try:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            original_filename = secure_filename(file.filename)
            filename = f"{timestamp}_{original_filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Save original file
            file.save(file_path)
            
            # Process image and get result filename and labels
            processed_filename, detected_labels = process_image(file_path, filename)
            
            return jsonify({
                'message': 'File processed successfully',
                'filename': processed_filename,
                'original_filename': original_filename,
                'detected_labels': detected_labels
            }), 200

        except Exception as e:
            return jsonify({'error': str(e)}), 500