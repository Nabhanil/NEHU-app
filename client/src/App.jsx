import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import './App.css';

function App() {
  const [caption, setCaption] = useState('');
  const [cameraType, setCameraType] = useState(''); // 'local' or 'ip'
  const [ipCameraUrl, setIpCameraUrl] = useState('');
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);

  const capture = useCallback(async () => {
    let imageSrc = '';

    if (cameraType === 'local') {
      imageSrc = webcamRef.current.getScreenshot();
    } else if (cameraType === 'ip' && ipCameraUrl) {
      imageSrc = `${ipCameraUrl}/shot.jpg`; // Just send the URL, backend will fetch it
    }

    if (imageSrc) {
      try {
        const response = await axios.post('http://localhost:5000/predict', {
          image: imageSrc,
          camera_type: cameraType,
        });
        setCaption(response.data.caption);
      } catch (error) {
        console.error('Error sending image:', error);
      }
    }
  }, [cameraType, ipCameraUrl]);

  const startCapturing = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(capture, 400); // Reduced interval for smoother capture
  };

  const stopCapturing = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  return (
    <div className="app">
      <h1>NEHU Sign Bank</h1>

      {!cameraType && (
        <div className="camera-selection">
          <h3>Select Camera Source:</h3>
          <button onClick={() => setCameraType('local')}>Use Local Webcam</button>
          <button onClick={() => setCameraType('ip')}>Use IP Webcam</button>
        </div>
      )}

      {cameraType === 'ip' && (
        <div className="ip-setup">
          <input
            type="text"
            placeholder="Enter IP Webcam URL (e.g. http://192.168.x.x:8080)"
            value={ipCameraUrl}
            onChange={(e) => setIpCameraUrl(e.target.value)}
            style={{ padding: '10px', width: '300px', marginBottom: '10px' }}
          />
        </div>
      )}

      {cameraType === 'local' && (
        <Webcam
          className="webcam"
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user' }}
        />
      )}

      {cameraType === 'ip' && ipCameraUrl && (
        <img
          src={`${ipCameraUrl}/video`}
          alt="IP Camera Feed"
          className="webcam"
        />
      )}

      {cameraType && (
        <div className="buttons">
          <button onClick={startCapturing}>Start Prediction</button>
          <button onClick={stopCapturing}>Stop Prediction</button>
        </div>
      )}

      <div className="caption">
        <h2>Predicted Caption:</h2>
        <p>{caption}</p>
      </div>
    </div>
  );
}

export default App;
