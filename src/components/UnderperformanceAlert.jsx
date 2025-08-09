import React from 'react';

export default function UnderperformanceAlert({ title, issues }) {
  if (!issues || issues.length === 0) return null;

  const getColor = (severity) => {
    switch (severity) {
      case 'red':
        return '#F87171';
      case 'orange':
        return '#FBBF24';
      case 'yellow':
        return '#FEF08A';
      case 'green':
        return '#BBF7D0';
      default:
        return '#E5E7EB'; // gray fallback
    }
  };

  return (
    <div
      style={{
        backgroundColor: getColor(issues[0].severity),
        padding: '1rem',
        borderRadius: '10px',
        fontFamily: 'Arial, sans-serif',
        flex: 1,
        minWidth: '300px',
        color: '#1B3A66'
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ul style={{ paddingLeft: '1rem' }}>
        {issues.map((issue, i) => (
          <li key={i}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}