import { useState } from 'react';
import { authTelegram } from '../services/api';

export default function AuthTestPage() {
  const [authData, setAuthData] = useState({
    id: 338067005,
    first_name: 'Test',
    last_name: '',
    username: 'test_user',
    language_code: 'ru',
  });
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAuth = async (source: 'fallback' | 'url' | 'initData') => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Construct initData based on source
      let initDataStr = '';
      const params = new URLSearchParams();
      params.set('user', JSON.stringify(authData));
      params.set('auth_date', Math.floor(Date.now() / 1000).toString());
      
      if (source === 'initData') {
        // Would need a real hash, but we'll skip it for testing
        params.set('hash', 'test_hash_abc123');
      }
      
      initDataStr = params.toString();
      
      console.log('Testing auth with:', {
        source,
        initData: initDataStr.substring(0, 80),
      });
      
      const response = await authTelegram({
        telegram_init_data: initDataStr,
        telegram_init_data_source: source,
        id: authData.id,
        first_name: authData.first_name,
        last_name: authData.last_name,
        username: authData.username,
        language_code: authData.language_code,
      });
      
      setResult(response);
      console.log('Auth success:', response);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message;
      setError(errorMsg);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🔐 Auth Test Page</h1>
      
      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Test User Data</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input
            type="number"
            placeholder="User ID"
            value={authData.id}
            onChange={(e) => setAuthData({ ...authData, id: parseInt(e.target.value) })}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="text"
            placeholder="First Name"
            value={authData.first_name}
            onChange={(e) => setAuthData({ ...authData, first_name: e.target.value })}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={authData.last_name}
            onChange={(e) => setAuthData({ ...authData, last_name: e.target.value })}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="text"
            placeholder="Username"
            value={authData.username}
            onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => testAuth('fallback')}
          disabled={loading}
          style={{
            padding: '12px',
            background: '#C9A96E',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Testing...' : 'Test Fallback'}
        </button>
        
        <button
          onClick={() => testAuth('url')}
          disabled={loading}
          style={{
            padding: '12px',
            background: '#C9A96E',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Testing...' : 'Test URL'}
        </button>
        
        <button
          onClick={() => testAuth('initData')}
          disabled={loading}
          style={{
            padding: '12px',
            background: '#C9A96E',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Testing...' : 'Test InitData'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fee',
          border: '1px solid #f00',
          color: '#d00',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          background: '#efe',
          border: '1px solid #0f0',
          color: '#0a0',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <strong>✅ Success!</strong>
          <pre style={{ background: '#000', color: '#0f0', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
