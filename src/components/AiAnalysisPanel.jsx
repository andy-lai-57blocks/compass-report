export default function AiAnalysisPanel({ analysisUnits, aiAnalysisMap }) {
  if (!analysisUnits || analysisUnits.length === 0) return null;

  // Filter to units that have AI results, then sort by combined score descending
  const analyzedUnits = analysisUnits
    .filter(u => u.aiResult && !u.aiResult.error && u.aiResult.aiScore != null)
    .sort((a, b) => {
      const scoreA = a.stats?.combinedScore || 0;
      const scoreB = b.stats?.combinedScore || 0;
      return scoreB - scoreA;
    });

  if (analyzedUnits.length === 0) {
    return (
      <div className="section" style={{ border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}>
        <h2>AI Analysis</h2>
        <p style={{ color: '#dc2626', fontSize: 14 }}>
          {analysisUnits[0]?.aiResult?.error || 'No AI analysis results available.'}
        </p>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  const getMedalBg = (index) => {
    if (index === 0) return '#fff7ed';
    if (index === 1) return '#f0f9ff';
    if (index === 2) return '#fdf2f8';
    return '#f9fafb';
  };

  const getMedalBorder = (index) => {
    if (index === 0) return '#fbbf24';
    if (index === 1) return '#93c5fd';
    if (index === 2) return '#f9a8d4';
    return '#e5e7eb';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="section" style={{ border: '1px solid #c7d2fe' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, background: '#eef2ff', fontSize: 18,
        }}>🤖</span>
        <div>
          <h2 style={{ margin: 0 }}>AI Skill & Knowledge Score</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
            Evaluating how well each knowledge area helps AI assistants build 0→MVP projects with fewer hallucinations and higher quality output
          </p>
        </div>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12,
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          padding: '2px 10px',
          borderRadius: 12,
        }}>
          {analyzedUnits.length} areas · AI weight: 70%
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {analyzedUnits.map((unit, index) => (
          <div key={unit.path} style={{
            border: `1px solid ${getMedalBorder(index)}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: getMedalBg(index),
              borderBottom: `1px solid ${getMedalBorder(index)}`,
            }}>
              {index < 3 && (
                <span style={{ fontSize: 18 }}>{medals[index]}</span>
              )}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {unit.topDir}
              </span>
              <span style={{ color: '#9ca3af' }}>→</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                {unit.parent && unit.parent !== unit.name ? `${unit.parent} → ` : ''}{unit.name}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{unit.fileCount} files</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                  height: 24,
                  padding: '0 6px',
                  borderRadius: 6,
                  backgroundColor: getScoreColor(unit.stats?.combinedScore || 0),
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                }}>
                  {unit.stats?.combinedScore || unit.stats?.avgQuality || 0}
                </span>
              </span>
            </div>

            {/* Content */}
            <div style={{ padding: '12px 14px' }}>
              {unit.aiResult.assessment && (
                <p style={{
                  fontSize: 13,
                  color: '#374151',
                  lineHeight: 1.6,
                  marginBottom: 10,
                }}>
                  {unit.aiResult.assessment}
                </p>
              )}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {/* Hallucination Risks - highlighted */}
                {unit.aiResult.hallucinationRisks && unit.aiResult.hallucinationRisks.length > 0 && (
                  <div style={{ flex: '1 1 250px' }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#dc2626',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      🚨 Hallucination Risks
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: 14,
                      fontSize: 12,
                      color: '#4b5563',
                      lineHeight: 1.6,
                    }}>
                      {unit.aiResult.hallucinationRisks.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Strengths */}
                {unit.aiResult.strengths && unit.aiResult.strengths.length > 0 && (
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#059669',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 4,
                    }}>✅ What Helps AI Quality</div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: 14,
                      fontSize: 12,
                      color: '#4b5563',
                      lineHeight: 1.6,
                    }}>
                      {unit.aiResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {unit.aiResult.improvements && unit.aiResult.improvements.length > 0 && (
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#d97706',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 4,
                    }}>💡 Would Improve AI Output</div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: 14,
                      fontSize: 12,
                      color: '#4b5563',
                      lineHeight: 1.6,
                    }}>
                      {unit.aiResult.improvements.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {unit.aiResult.recommendations && unit.aiResult.recommendations.length > 0 && (
                <div style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  backgroundColor: '#fffbeb',
                  borderRadius: 8,
                  border: '1px solid #fde68a',
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#d97706',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 4,
                  }}>🎯 Actionable Recommendations</div>
                  <ul style={{
                    margin: 0,
                    paddingLeft: 14,
                    fontSize: 12,
                    color: '#4b5563',
                    lineHeight: 1.6,
                  }}>
                    {unit.aiResult.recommendations.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
