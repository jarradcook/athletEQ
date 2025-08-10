import React from 'react';

export default function TrainerTable({ rows }) {
  return (
    <div style={{overflowX:'auto', background:'#fff', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead>
          <tr style={{ background:'#f6f8fa' }}>
            <th style={th}>Date</th>
            <th style={th}>Horse</th>
            <th style={th}>Training type</th>
            <th style={th}>Track condition</th>
            <th style={th}>Score</th>
            <th style={th}>Phase</th>
            <th style={th}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} style={{ borderTop:'1px solid #eee' }}>
              <td style={td}>{r.Date || '—'}</td>
              <td style={td}>{r.Horse || '—'}</td>
              <td style={td}>{r['Training type'] || '—'}</td>
              <td style={td}>{r['Track condition'] || '—'}</td>
              <td style={{...td, fontWeight:700, color:r.Color || '#333' }}>
                {r.Score10 != null ? r.Score10 : '—'}
              </td>
              <td style={td}>{r.Phase || '—'}</td>
              <td style={td}>{r.Reason || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { textAlign:'left', padding:'10px 12px', color:'#333', fontWeight:700, borderBottom:'1px solid #e8e8e8' };
const td = { textAlign:'left', padding:'10px 12px', color:'#333' };