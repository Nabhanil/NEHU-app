import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import './App.css';

function App() {
  const [caption, setCaption] = useState('');
  const [cameraType, setCameraType] = useState('');
  const [ipCameraUrl, setIpCameraUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);

  const capture = useCallback(async () => {
    if (!cameraType) return;

    let imageSrc = '';
    if (cameraType === 'local' && webcamRef.current) {
      imageSrc = webcamRef.current.getScreenshot();
    } else if (cameraType === 'ip' && ipCameraUrl) {
      imageSrc = `${ipCameraUrl}/shot.jpg`;
    }

    if (!imageSrc) return;

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
  }, [cameraType, ipCameraUrl]);

  useEffect(() => {
    if (isCapturing) {
      intervalRef.current = setInterval(capture, 3000); // Capture every 3 seconds
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isCapturing, capture]);

  const resetToHome = () => {
    setIsCapturing(false);
    setCameraType('');
    setCaption('');
    setIpCameraUrl('');
  };

  return (
    <div className="app">
      <h1 className="app-title">NEHU Sign Bank</h1>

      {!cameraType ? (
        <div className="home">
          <button className="nav-button">Sign Language Tutorial</button>
          <button className="nav-button">Sign Letters</button>
          <button className="highlight-button" onClick={() => setCameraType('select')}>Generate Caption</button>
        </div>
      ) : cameraType === 'select' ? (
        <div className="camera-selection">
          <h3>Select Camera Source:</h3>
          <button onClick={() => setCameraType('local')}>Use Local Webcam</button>
          <button onClick={() => setCameraType('ip')}>Use IP Webcam</button>
          <button onClick={resetToHome}>Back to Home</button>
        </div>
      ) : (
        <div className="detection">
          {cameraType === 'ip' && (
            <div className="ip-setup">
              <input
                type="text"
                placeholder="Enter IP Webcam URL (e.g. http://192.168.x.x:8080)"
                value={ipCameraUrl}
                onChange={(e) => setIpCameraUrl(e.target.value)}
              />
            </div>
          )}

          <div className="webcam-container">
            {cameraType === 'local' ? (
              <Webcam
                className="webcam"
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'user' }}
              />
            ) : (
              ipCameraUrl && <img src={`${ipCameraUrl}/video`} alt="IP Camera Feed" className="webcam" />
            )}
          </div>

          <div className="buttons">
            <button onClick={() => setIsCapturing(true)} disabled={isCapturing}>
              Start Prediction
            </button>
            <button onClick={() => setIsCapturing(false)} disabled={!isCapturing}>
              Stop Prediction
            </button>
            <button onClick={resetToHome}>Back to Home</button>
          </div>

          <div className="caption">
            {loading && <div className="loader"></div>}
            <h2>Predicted Caption:</h2>
            <p>{caption}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
