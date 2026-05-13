import { useState } from 'react';

export default function DetailTable({ files }) {
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [searchText, setSearchText] = useState('');

  // Get all unique top-level directories from hierarchy
  const topDirs = [...new Set(files
    .filter(f => f.hierarchy && f.hierarchy[0])
    .map(f => f.hierarchy[0].split('/')[0])
  )];

  const filtered = files.filter(f => {
    if (filter !== 'all') {
      const topDir = (f.hierarchy && f.hierarchy[0]) ? f.hierarchy[0].split('/')[0] : '';
      if (topDir !== filter) return false;
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      return f.name.toLowerCase().includes(q) ||
        (f.owner && f.owner.toLowerCase().includes(q)) ||
        (f.dirName && f.dirName.toLowerCase().includes(q));
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortKey === 'quality') {
      aVal = a.quality?.score || 0;
      bVal = b.quality?.score || 0;
    } else {
      aVal = a[sortKey];
      bVal = b[sortKey];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortKey !== columnKey) return <span style={{ color: '#d1d5db', marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const getQualityColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <option value="all">All Directories</option>
          {topDirs.map(dir => (
            <option key={dir} value={dir}>{dir}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search files..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            flex: 1,
            maxWidth: 250,
          }}
        />
        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 13 }}>
          {sorted.length} files
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th onClick={() => handleSort('name')} style={thStyle}>
                File Name <SortIcon columnKey="name" />
              </th>
              <th onClick={() => handleSort('dirName')} style={thStyle}>
                Directory <SortIcon columnKey="dirName" />
              </th>
              <th onClick={() => handleSort('owner')} style={thStyle}>
                Owner <SortIcon columnKey="owner" />
              </th>
              <th onClick={() => handleSort('size')} style={thStyle}>
                Size (KB) <SortIcon columnKey="size" />
              </th>
              <th onClick={() => handleSort('quality')} style={thStyle}>
                Quality <SortIcon columnKey="quality" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((file, i) => (
              <tr
                key={file.path}
                style={{
                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <td style={tdStyle}>
                  <span title={file.path}>{file.name}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{file.dirName}</span>
                </td>
                <td style={tdStyle}>
                  {file.owner
                    ? <span className="mini-badge">{file.owner}</span>
                    : <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
                <td style={tdStyle}>
                  {(file.size / 1024).toFixed(1)}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 50,
                      height: 6,
                      backgroundColor: '#e5e7eb',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${file.quality?.score || 0}%`,
                        height: '100%',
                        backgroundColor: getQualityColor(file.quality?.score || 0),
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{
                      fontWeight: 600,
                      color: getQualityColor(file.quality?.score || 0),
                      fontSize: 12,
                    }}>
                      {file.quality?.score || 0}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  fontSize: 12,
};

const tdStyle = {
  padding: '6px 12px',
  color: '#4b5563',
};
