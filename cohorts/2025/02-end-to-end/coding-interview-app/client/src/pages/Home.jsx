import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [sessionId, setSessionId] = useState('');
  const navigate = useNavigate();

  const handleCreateSession = () => {
    const newSessionId = crypto.randomUUID();
    navigate(`/session/${newSessionId}`);
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (sessionId.trim()) {
      navigate(`/session/${sessionId}`);
    }
  };

  return (
    <div className="home">
      <div className="home-container">
        <h1>Coding Interview Platform</h1>
        <p>Collaborate on coding problems in real-time</p>

        <div className="home-actions">
          <button onClick={handleCreateSession} className="btn btn-primary">
            Create New Session
          </button>

          <div className="divider">or</div>

          <form onSubmit={handleJoinSession}>
            <input
              type="text"
              placeholder="Enter session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="input"
            />
            <button type="submit" className="btn btn-secondary">
              Join Session
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

