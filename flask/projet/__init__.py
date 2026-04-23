from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
from upload_image import upload
from Reader_qr_barcode import register_qr_barcode_routes
from face_recognition_api import register_face_routes  # Import the face recognition routes

def create_app():
    app = Flask(__name__)
    
    # Set up CORS
    CORS(app, resources={
        r"/upload_image": {"origins": "http://localhost:4200"},
        r"/read_barcode": {"origins": "http://localhost:4200"},
        r"/show_items/*": {"origins": "http://localhost:4200"},
        r"/barcode_results/*": {"origins": "http://localhost:4200"},
        r"/register_face": {"origins": "http://localhost:4200"},
        r"/verify_face": {"origins": "http://localhost:4200"},
    })

    # Upload and processed folders
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['PROCESSED_FOLDER'] = 'processed'
    app.config['PERSONS_FOLDER'] = 'persons'  # Folder for face images
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PERSONS_FOLDER'], exist_ok=True)

    # Register upload route
    upload(app)

    # Register barcode/QR code processing routes
    register_qr_barcode_routes(app)
    
    # Register face recognition routes
    register_face_routes(app)

    @app.route('/api/healthcheck')
    def healthcheck():
        return jsonify({"status": "healthy"})

    @app.route('/show_items/<filename>', methods=['GET'])
    def serve_processed_image(filename):
        try:
            return send_from_directory(app.config['PROCESSED_FOLDER'], filename)
        except FileNotFoundError:
            return jsonify({"error": "Image not found"}), 404
        
    @app.route('/barcode_results/<filename>', methods=['GET'])
    def get_result(filename):
            try:
                return send_from_directory(app.config['PROCESSED_FOLDER'], filename)
            except FileNotFoundError:
                return jsonify({"error": "Image not found"}), 404

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)