import React from 'react';

export default function SectionalTimesBox({ selectedRow }) {
  const lastSections = [
    { label: 'Last 800m', key: 'Time last 800m' },
    { label: 'Last 600m', key: 'Time last 600m' },
    { label: 'Last 400m', key: 'Time last 400m' },
    { label: 'Last 200m', key: 'Time last 200m' }
  ];

  const bestSections = [
  { label: 'Best 800m', key: 'Time best 800m' },
  { label: 'Best 600m', key: 'Time best 600m' },
  { label: 'Best 400m', key: 'Time best 400m' },
  { label: 'Best 200m', key: 'Time best 200m' }
];

  if (!selectedRow) return null;

  return (
    <div
      style={{
        backgroundColor: '#f0f0f0',
        padding: '1rem',
        borderRadius: '10px',
        marginTop: '30px',
        maxWidth: '700px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h3 style={{ marginBottom: '1rem', color: '#1B3A66' }}>Sectional Times</h3>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>Segment</th>
            <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {lastSections.map(({ label, key }) => (
            <tr key={key}>
              <td style={{ padding: '4px 0' }}>{label}</td>
              <td style={{ padding: '4px 0' }}>{selectedRow[key] || 'N/A'}</td>
            </tr>
          ))}
          <tr>
            <td colSpan="2" style={{ borderTop: '2px solid black', padding: '0.5rem 0' }}>
              🏁 Finish Line
            </td>
          </tr>
          {bestSections.map(({ label, key }) => (
            <tr key={key}>
              <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{label}</td>
              <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{selectedRow[key] || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}