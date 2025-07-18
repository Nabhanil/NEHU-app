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

# ✅ Load bundled PCA & SVM for version 6
bundle = joblib.load('hand_svm_model6.pkl')
if isinstance(bundle, dict):
    svm_model = bundle['svc']      # Extract the trained SVM
    pca       = bundle['pca']      # Extract the PCA transformer
else:
    # Fallback if bundle wasn't used; load separately
    svm_model = joblib.load('hand_svm_model6.pkl')
    pca       = joblib.load('pca_transform6.pkl')

# ✅ Initialize Mediapipe Hands once
glob_mp_hands = mp.solutions.hands  # type: ignore
hands = glob_mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.7
)

# ✅ Landmark Normalization
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

# ✅ Landmark Extraction + Prediction
def extract_landmarks_from_image(image_bytes):
    np_array = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    frame = cv2.resize(frame, (640, 480))

    results = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    if not results.multi_hand_landmarks:
        return "No Hand Detected"

    lm = results.multi_hand_landmarks[0].landmark
    x_coords = [pt.x for pt in lm]
    y_coords = [pt.y for pt in lm]
    feats = np.array(x_coords + y_coords).reshape(1, -1)
    feats = normalize_landmarks(feats)

    feats_pca = pca.transform(feats)
    return svm_model.predict(feats_pca)[0]

# ✅ Prediction Endpoint
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    image_data  = data.get('image')
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
            try:
                resp = requests.get(image_data, timeout=3)
                if resp.status_code == 200:
                    image_bytes = resp.content
                else:
                    return jsonify({'error': 'Failed to fetch image from IP camera'}), 400
            except requests.exceptions.Timeout:
                return jsonify({'error': 'IP camera request timed out'}), 408

        else:
            return jsonify({'error': 'Unknown camera type'}), 400

        label = extract_landmarks_from_image(image_bytes)
        return jsonify({'caption': label})

    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
