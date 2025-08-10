import React from 'react';

export default function ReadinessCard({ score, color, reason }) {
  return (
    <div style={{
      display:'flex',
      alignItems:'center',
      gap:24,
      background:'#fff',
      borderRadius:12,
      boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
      padding:'18px 20px',
      marginBottom:16
    }}>
      <div>
        <div style={{fontSize:12, color:'#666'}}>Readiness Score</div>
        <div style={{fontSize:48, fontWeight:800, color: color || '#333'}}>
          {score != null ? `${score}/10` : '—'}
        </div>
      </div>
      <div style={{fontSize:14, color:'#333'}}>{reason || '—'}</div>
    </div>
  );
}