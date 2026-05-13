import { useState, useEffect } from 'react';
import { getReport } from './services/githubApi';
import TreeView from './components/TreeView';
import DetailTable from './components/DetailTable';
import AiAnalysisPanel from './components/AiAnalysisPanel';
import './App.css';

function App() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getReport();
        if (!cancelled) {
          setReportData(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 style={{ userSelect: 'none' }}>
          Compass Repository Report
        </h1>
        <p className="subtitle">
          Hierarchical analysis of 57Blocks' institutional knowledge layer — Firm-Wide Conventions,
          Vertical Domain Knowledge, and Engagement Patterns
        </p>
        {reportData && (
          <div className="header-actions">
            <span className="analyzed-at">Last analyzed: {reportData.generatedAtFormatted}</span>
          </div>
        )}
      </header>

      {loading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
          <p className="progress-text">Loading report...</p>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <div style={{ marginTop: 8, fontSize: 13 }}>
            Make sure <code>public/report.json</code> exists. Run <code>npm run report</code> to generate it.
          </div>
        </div>
      )}

      {reportData && (
        <div className="report-content">
          {/* Summary Cards */}
          <section className="summary-cards">
            <div className="card">
              <span className="card-icon">📁</span>
              <div>
                <div className="card-value">{reportData.summary.totalFiles}</div>
                <div className="card-label">Total Files</div>
              </div>
            </div>
            <div className="card">
              <span className="card-icon">🗂️</span>
              <div>
                <div className="card-value">{Object.keys(reportData.summary.directories).length}</div>
                <div className="card-label">Top Categories</div>
              </div>
            </div>
            <div className="card">
              <span className="card-icon">🎯</span>
              <div>
                <div className="card-value">{reportData.analysisUnits?.length || 0}</div>
                <div className="card-label">AI-Analyzed Areas</div>
              </div>
            </div>
            <div className="card">
              <span className="card-icon">⭐</span>
              <div>
                <div className="card-value">
                  {reportData.analysisUnits && reportData.analysisUnits.length > 0
                    ? Math.round(
                        reportData.analysisUnits
                          .filter(u => u.stats?.combinedScore)
                          .reduce((a, u) => a + u.stats.combinedScore, 0) /
                        reportData.analysisUnits.filter(u => u.stats?.combinedScore).length
                      )
                    : '—'}
                </div>
                <div className="card-label">Avg Combined Score</div>
              </div>
            </div>
          </section>

          {/* Top Directory Summary */}
          <section className="section">
            <h2>Top-Level Summary</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Directory</th>
                  <th>File Count</th>
                  <th>Static Quality</th>
                  <th>AI Score</th>
                  <th>Combined</th>
                  <th>Top Contributors</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportData.summary.directories).map(([dir, stats]) => {
                  const children = reportData.trees?.find(t => t.name === dir)?.children || [];
                  const aiScores = children
                    .flatMap(c => {
                      if (c.name === 'Engineering') return c.children?.map(sub => sub.stats?.aiScore).filter(Boolean);
                      return [c.stats?.aiScore].filter(Boolean);
                    });
                  const avgAi = aiScores.length > 0 ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length) : null;
                  const combinedScores = children
                    .flatMap(c => {
                      if (c.name === 'Engineering') return c.children?.map(sub => sub.stats?.combinedScore).filter(Boolean);
                      return [c.stats?.combinedScore].filter(Boolean);
                    });
                  const avgCombined = combinedScores.length > 0 ? Math.round(combinedScores.reduce((a, b) => a + b, 0) / combinedScores.length) : null;

                  return (
                    <tr key={dir}>
                      <td>
                        <span className="category-badge" data-category={dir === 'Firm-Wide Conventions' ? 'convention' : dir === 'Vertical Domain Knowledge' ? 'knowledge' : 'other'}>
                          {dir}
                        </span>
                      </td>
                      <td><strong>{stats.fileCount}</strong></td>
                      <td><span className={`quality-badge ${stats.avgQuality >= 70 ? 'high' : stats.avgQuality >= 40 ? 'medium' : 'low'}`}>{stats.avgQuality}</span></td>
                      <td>{avgAi != null ? <span className={`quality-badge ${avgAi >= 70 ? 'high' : avgAi >= 40 ? 'medium' : 'low'}`}>{avgAi}</span> : <span style={{color:'#9ca3af'}}>—</span>}</td>
                      <td>{avgCombined != null ? <strong style={{color: '#7c3aed'}}>{avgCombined}</strong> : <span style={{color:'#9ca3af'}}>—</span>}</td>
                      <td style={{ fontSize: 12 }}>
                        {stats.ownerCount && Object.entries(stats.ownerCount)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3).map(([name, count]) => (
                          <span key={name} className="mini-badge" style={{ marginRight: 4 }}>
                            {name}: {count}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* AI Analysis - Per second-level directory */}
          {reportData.analysisUnits && reportData.analysisUnits.length > 0 && (
            <AiAnalysisPanel
              analysisUnits={reportData.analysisUnits}
              aiAnalysisMap={reportData.aiAnalysisMap}
            />
          )}

          {/* Hierarchical Tree View */}
          <TreeView trees={reportData.trees} aiResults={reportData.aiAnalysisMap} />

          {/* Detail Table */}
          <section className="section">
            <h2>All Files</h2>
            <DetailTable files={reportData.files} />
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
