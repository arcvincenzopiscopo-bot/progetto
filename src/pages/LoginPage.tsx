import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '../context/CustomAuthContext';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Login</h2>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <table className="w-full border-2 border-indigo-600 rounded-lg border-collapse">
          <tbody>
            <tr>
              <td colSpan={2} className="bg-indigo-600 text-white text-center py-3 font-semibold">
                Accesso Utente
              </td>
            </tr>
            <tr>
              <td className="border border-indigo-300 px-4 py-3 text-right font-medium text-gray-700 bg-indigo-50">
                Username:
              </td>
              <td className="border border-indigo-300 px-4 py-3">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-indigo-300 px-4 py-3 text-right font-medium text-gray-700 bg-indigo-50">
                Password:
              </td>
              <td className="border border-indigo-300 px-4 py-3">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-indigo-300 px-4 py-3 text-center bg-indigo-50">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-8 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Accedi'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
