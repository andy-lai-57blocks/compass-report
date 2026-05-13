import { useState } from 'react';

function TreeNode({ node, defaultExpanded, aiResults }) {
  const [expanded, setExpanded] = useState(defaultExpanded || node.depth < 2);

  const hasChildren = node.children && node.children.length > 0;
  const hasFiles = node.files && node.files.length > 0;

  // Check if this node has an AI result (from analysisUnits)
  const aiResult = aiResults?.[node.path];

  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getDirIcon = () => {
    if (node.name === 'Firm-Wide Conventions') return '🏢';
    if (node.name === 'Vertical Domain Knowledge') return '📚';
    if (node.name === 'Engagement Patterns') return '🤝';
    if (node.name === 'Engineering') return '⚙️';
    return '📁';
  };

  // The score to display: combinedScore > aiScore > avgQuality
  const displayScore = node.stats?.combinedScore || node.stats?.aiScore || node.stats?.avgQuality;
  const hasAi = node.stats?.aiScore != null;

  return (
    <div style={{ marginLeft: node.depth > 0 ? 20 : 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          borderRadius: 6,
          cursor: (hasChildren || hasFiles) ? 'pointer' : 'default',
          transition: 'background 0.15s',
          fontSize: node.depth === 0 ? 15 : 14,
          fontWeight: node.depth <= 1 ? 600 : 400,
          color: node.depth === 0 ? '#111827' : '#374151',
          backgroundColor: hasAi ? '#faf5ff' : 'transparent',
        }}
        onClick={() => { if (hasChildren || hasFiles) setExpanded(!expanded); }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hasAi ? '#f3e8ff' : '#f3f4f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = hasAi ? '#faf5ff' : 'transparent'; }}
      >
        {(hasChildren || hasFiles) ? (
          <span style={{ width: 16, textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
            {expanded ? '▼' : '▶'}
          </span>
        ) : <span style={{ width: 16 }} />}
        <span>{getDirIcon()}</span>
        <span>{node.name}</span>
        {hasAi && (
          <span style={{
            fontSize: 10,
            backgroundColor: '#7c3aed',
            color: '#fff',
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
          }}>AI</span>
        )}
        <span style={{
          fontSize: 12,
          color: '#9ca3af',
          marginLeft: 'auto',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          {node.stats && (
            <>
              <span title="Files">{node.stats.fileCount} files</span>
              <span
                title={hasAi ? 'AI-weighted score (70% AI + 30% static)' : 'Static quality score'}
                style={{
                  color: getScoreColor(displayScore),
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {displayScore}
              </span>
            </>
          )}
        </span>
      </div>

      {expanded && (
        <div style={{ borderLeft: '2px solid #e5e7eb', marginLeft: 12, paddingLeft: 4 }}>
          {aiResult && aiResult.assessment && (
            <div style={{
              margin: '4px 0 8px 16px',
              padding: '8px 12px',
              backgroundColor: '#faf5ff',
              borderRadius: 8,
              border: '1px solid #e9d5ff',
              fontSize: 12,
              color: '#6b21a8',
              lineHeight: 1.5,
            }}>
              <strong>AI Assessment:</strong> {aiResult.assessment}
              {aiResult.strengths && aiResult.strengths.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {aiResult.strengths.map((s, i) => (
                    <span key={i} style={{
                      padding: '1px 6px',
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      borderRadius: 6,
                      fontSize: 11,
                    }}>✅ {s}</span>
                  ))}
                </div>
              )}
              {aiResult.weaknesses && aiResult.weaknesses.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {aiResult.weaknesses.map((s, i) => (
                    <span key={i} style={{
                      padding: '1px 6px',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      borderRadius: 6,
                      fontSize: 11,
                    }}>⚠️ {s}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {node.files && node.files.map((file, i) => (
            <div key={file.path} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px', fontSize: 13, color: '#6b7280',
            }}>
              <span style={{ width: 16 }} />
              <span>📄</span>
              <span>{file.name}</span>
              {file.owner && (
                <span style={{
                  fontSize: 11, backgroundColor: '#eef2ff', color: '#4f46e5',
                  padding: '1px 6px', borderRadius: 8,
                }}>{file.owner}</span>
              )}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                {file.quality && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: getScoreColor(file.quality.score),
                    backgroundColor: `${getScoreColor(file.quality.score)}15`,
                    padding: '1px 6px', borderRadius: 8,
                  }}>{file.quality.score}</span>
                )}
              </span>
            </div>
          ))}

          {node.children && node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              defaultExpanded={child.depth < 2}
              aiResults={aiResults}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({ trees, aiResults }) {
  if (!trees || trees.length === 0) {
    return <div style={{ color: '#9ca3af', padding: 20 }}>No data to display.</div>;
  }

  return (
    <div className="section">
      <h2>Hierarchical Structure</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Click to expand/collapse. <span style={{ backgroundColor: '#faf5ff', padding: '1px 6px', borderRadius: 4, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Purple highlighted</span> items have AI analysis (70% AI score + 30% static score).
      </p>
      {trees.map((tree) => (
        <TreeNode key={tree.path} node={tree} defaultExpanded={true} aiResults={aiResults} />
      ))}
    </div>
  );
}
