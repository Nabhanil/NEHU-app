import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import mediapipe as mp
import joblib

app = Flask(__name__)
CORS(app)

# Load your model and PCA
svm_model = joblib.load('hand_svm_model.pkl')
pca = joblib.load('pca_transform.pkl')

# ✅ Landmark Normalization Function
def normalize_landmarks(X):
    X_norm = np.zeros_like(X)
    for i in range(X.shape[0]):
        x_coords = X[i][:21]
        y_coords = X[i][21:]
        x_min, x_max = x_coords.min(), x_coords.max()
        y_min, y_max = y_coords.min(), y_coords.max()
        X_norm[i][:21] = (x_coords - x_min) / (x_max - x_min + 1e-5)
        X_norm[i][21:] = (y_coords - y_min) / (y_max - y_min + 1e-5)
    return X_norm

# ✅ Landmark Extraction Function
def extract_landmarks_from_image(image_bytes):
    np_array = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.7)
    results = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

    if not results.multi_hand_landmarks:
        return "No Hand Detected"

    landmarks = results.multi_hand_landmarks[0].landmark

    x_coords = [lm.x for lm in landmarks]
    y_coords = [lm.y for lm in landmarks]

    features = np.array(x_coords + y_coords).reshape(1, -1)
    features = normalize_landmarks(features)

    # Apply PCA and predict
    features_pca = pca.transform(features)
    prediction = svm_model.predict(features_pca)[0]

    return prediction

# ✅ Prediction Route
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    image_data = data.get('image')
    camera_type = data.get('camera_type')

    if not image_data or not camera_type:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        if camera_type == 'local':
            if ',' in image_data:
                image_bytes = base64.b64decode(image_data.split(',')[1])
            else:
                return jsonify({'error': 'Invalid base64 image format'}), 400

        elif camera_type == 'ip':
            response = requests.get(image_data)
            if response.status_code == 200:
                image_bytes = response.content
            else:
                return jsonify({'error': 'Failed to fetch image from IP camera'}), 400
        else:
            return jsonify({'error': 'Unknown camera type'}), 400

        label = extract_landmarks_from_image(image_bytes)

        return jsonify({'caption': label})

    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True)
