'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function TestTokenPage() {
  const { getToken, isSignedIn, userId } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status?: number; data?: unknown; error?: string } | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      getToken()
        .then((t) => {
          setToken(t);
          setError(null);
        })
        .catch((e) => {
          setError(e.message);
        });
    }
  }, [isSignedIn, getToken]);

  const testApi = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/test-auth', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setTestResult({ status: response.status, data });
    } catch (e) {
      setTestResult({ error: e instanceof Error ? e.message : 'Unknown error' });
    }
  };

  if (!isSignedIn) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Test Token Page</h1>
        <p>Please sign in first to get your token.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px' }}>
      <h1>Test Token Page</h1>
      <p>
        <strong>User ID:</strong> {userId}
      </p>

      {error && (
        <div style={{ padding: '10px', background: '#fee', color: '#c00', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2>Your Clerk JWT Token:</h2>
        <textarea
          readOnly
          value={token || 'Loading...'}
          style={{
            width: '100%',
            height: '150px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Copy this token and use it in your API tests (curl, Postman, etc.)
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={testApi}
          disabled={!token}
          style={{
            padding: '10px 20px',
            background: token ? '#0070f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: token ? 'pointer' : 'not-allowed',
          }}
        >
          Test API Endpoint
        </button>
      </div>

      {testResult && (
        <div
          style={{
            padding: '15px',
            background: testResult.status === 200 ? '#efe' : '#fee',
            border: `1px solid ${testResult.status === 200 ? '#0c0' : '#c00'}`,
            borderRadius: '4px',
          }}
        >
          <h3>Test Result:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

