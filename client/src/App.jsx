import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import './App.css';

function App() {
  const [caption, setCaption] = useState('');
  const [cameraType, setCameraType] = useState('');
  const [ipCameraUrl, setIpCameraUrl] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);

  const capture = useCallback(async () => {
    let imageSrc = '';

    if (cameraType === 'local') {
      imageSrc = webcamRef.current.getScreenshot();
    } else if (cameraType === 'ip' && ipCameraUrl) {
      imageSrc = `${ipCameraUrl}/shot.jpg`;
    }

    if (imageSrc) {
      try {
        setLoading(true);
        const response = await axios.post('http://localhost:5000/predict', {
          image: imageSrc,
          camera_type: cameraType,
        });
        setCaption(response.data.caption);
      } catch (error) {
        console.error('Error sending image:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [cameraType, ipCameraUrl]);

  const startCapturing = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(capture, 400);
  };

  const stopCapturing = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const resetToHome = () => {
    stopCapturing();
    setCameraType('');
    setIsDetecting(false);
    setCaption('');
    setIpCameraUrl('');
  };

  return (
    <div className="app">
      <h1 className="app-title">NEHU Sign Bank</h1>

      {!isDetecting && (
        <div className="home">
          <button className="nav-button">Sign Language Tutorial</button>
          <button className="nav-button">Sign Letters</button>
          <button className="highlight-button" onClick={() => setIsDetecting(true)}>
            Generate Caption
          </button>
        </div>
      )}

      {isDetecting && !cameraType && (
        <div className="camera-selection detection">
          <h3>Select Camera Source:</h3>
          <button onClick={() => setCameraType('local')}>Use Local Webcam</button>
          <button onClick={() => setCameraType('ip')}>Use IP Webcam</button>
          <button onClick={resetToHome}>Back to Home</button>
        </div>
      )}

      {isDetecting && cameraType === 'ip' && (
        <div className="ip-setup detection">
          <input
            type="text"
            placeholder="Enter IP Webcam URL (e.g. http://192.168.x.x:8080)"
            value={ipCameraUrl}
            onChange={(e) => setIpCameraUrl(e.target.value)}
          />
        </div>
      )}

      {isDetecting && cameraType === 'local' && (
        <div className="webcam-container detection">
          <Webcam
            className="webcam"
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: 'user' }}
          />
        </div>
      )}

      {isDetecting && cameraType === 'ip' && ipCameraUrl && (
        <div className="webcam-container detection">
          <img
            src={`${ipCameraUrl}/video`}
            alt="IP Camera Feed"
            className="webcam"
          />
        </div>
      )}

      {isDetecting && cameraType && (
        <div className="buttons detection">
          <button onClick={startCapturing}>Start Prediction</button>
          <button onClick={stopCapturing}>Stop Prediction</button>
          <button onClick={resetToHome}>Back to Home</button>
        </div>
      )}

      {isDetecting && (
        <div className="caption detection">
          {loading && <div className="loader"></div>}
          <h2>Predicted Caption:</h2>
          <p>{caption}</p>
        </div>
      )}
    </div>
  );
}

export default App;
