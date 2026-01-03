import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '../context/CustomAuthContext';
import '../styles/login.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useCustomAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await login(username, password);
      if (error) {
        setError(error);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-grid">
        {/* Left Column - Empty */}
        <div className="login-column login-column-left">
          {/* Empty left column */}
        </div>

        {/* Center Column - Login Form with gray background */}
        <div className="login-column login-column-center">
          <div className="login-form-container">
            <h2 className="login-title">Accedi al tuo account</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="form-input"
                  placeholder="Inserisci il tuo username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="form-input"
                  placeholder="Inserisci la tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="login-button"
                >
                  {loading ? 'Caricamento...' : 'Accedi'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Empty */}
        <div className="login-column login-column-right">
          {/* Empty right column */}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
