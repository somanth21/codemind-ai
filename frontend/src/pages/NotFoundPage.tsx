import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>404 - Page Not Found</h1>
      <p style={{ margin: '16px 0', color: '#666' }}>The requested engineering route does not exist.</p>
      <Link to="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
        Return to Dashboard
      </Link>
    </div>
  );
};
