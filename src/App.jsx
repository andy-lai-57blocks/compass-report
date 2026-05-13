import { useState, useEffect, useRef } from 'react';
import { getReport, triggerReanalysis, subscribeProgress } from './services/githubApi';
import TreeView from './components/TreeView';
import DetailTable from './components/DetailTable';
import AiAnalysisPanel from './components/AiAnalysisPanel';
import './App.css';

function App() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('Loading report...');
  const [error, setError] = useState('');
  const [analyzedAt, setAnalyzedAt] = useState(null);
  const [serverStatus, setServerStatus] = useState('');
  const [showBackdoor, setShowBackdoor] = useState(false);
  const titleClickCount = useRef(0);

  // On mount: fetch the cached report from the backend
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setProgress('Fetching report from server...');
        const result = await getReport();
        if (cancelled) return;

        if (result.status === 'ready') {
          setReportData(result.report);
          setAnalyzedAt(result.report.generatedAtFormatted);
          setServerStatus(`Last analyzed: ${result.report.generatedAtFormatted}`);
          setProgress('');
          setLoading(false);
        } else if (result.status === 'not_ready') {
          // Server is starting up or hasn't analyzed yet
          setServerStatus(result.analysisStatus?.progress || 'Server is initializing...');
          setProgress(result.analysisStatus?.progress || 'Waiting for initial analysis...');
          // Poll until ready
          pollForReport();
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Cannot connect to backend server at http://localhost:3001. Make sure it's running.`);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function pollForReport() {
    const interval = setInterval(async () => {
      try {
        const result = await getReport();
        if (result.status === 'ready') {
          setReportData(result.report);
          setAnalyzedAt(result.report.generatedAtFormatted);
          setServerStatus(`Last analyzed: ${result.report.generatedAtFormatted}`);
          setProgress('');
          setLoading(false);
          clearInterval(interval);
        } else if (result.analysisStatus?.error) {
          setError(result.analysisStatus.error);
          setLoading(false);
          clearInterval(interval);
        } else {
          setProgress(result.analysisStatus?.progress || 'Waiting...');
          setServerStatus(result.analysisStatus?.progress || '');
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  }

  // Handle re-analysis
  const handleReanalyze = async () => {
    try {
      setLoading(true);
      setError('');
      setProgress('Triggering server re-analysis...');

      await triggerReanalysis();

      // Subscribe to SSE progress
      const unsubscribe = subscribeProgress((status) => {
        setProgress(status.progress || 'Analyzing...');
        setServerStatus(status.progress || '');
        if (status.error) {
          setError(status.error);
          setLoading(false);
          unsubscribe();
        }
        if (!status.running) {
          // Analysis done, refresh report
          setTimeout(async () => {
            try {
              const result = await getReport();
              if (result.status === 'ready') {
                setReportData(result.report);
                setAnalyzedAt(result.report.generatedAtFormatted);
                setServerStatus(`Last analyzed: ${result.report.generatedAtFormatted}`);
              }
            } catch {}
            setLoading(false);
          }, 1000);
        }
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Secret: click title 5 times to show admin backdoor
  const handleTitleClick = () => {
    titleClickCount.current++;
    if (titleClickCount.current >= 5) {
      setShowBackdoor(true);
      titleClickCount.current = 0;
    }
  };

  const handleSecretRefresh = () => {
    handleReanalyze();
    setShowBackdoor(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={handleTitleClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
          Compass Repository Report
        </h1>
        <p className="subtitle">
          Hierarchical analysis of 57Blocks' institutional knowledge layer — Firm-Wide Conventions,
          Vertical Domain Knowledge, and Engagement Patterns
        </p>

        <div className="header-actions">
          {serverStatus && (
            <span className="analyzed-at">{serverStatus}</span>
          )}
          
        </div>

        {/* Backdoor admin panel */}
        {showBackdoor && (
          <div style={{
            marginTop: 12,
            padding: '8px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
          }}>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>🔐 Admin Backdoor</span>
            <button
              onClick={handleSecretRefresh}
              style={{
                padding: '4px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              🔄 Force Server Re-analysis
            </button>
            <button
              onClick={() => setShowBackdoor(false)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: '#9ca3af',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {loading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
          <p className="progress-text">{progress}</p>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <div style={{ marginTop: 8, fontSize: 13 }}>
            Make sure the backend server is running: <code>cd server && node index.js</code>
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
                        {stats.ownerCount && Object.entries(stats.ownerCount).slice(0, 3).map(([name, count]) => (
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
