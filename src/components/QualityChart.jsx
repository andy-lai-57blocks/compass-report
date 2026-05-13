import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export default function QualityChart({ qualitySummary }) {
  const data = Object.entries(qualitySummary).map(([key, val]) => ({
    category: key.charAt(0).toUpperCase() + key.slice(1),
    score: val,
    fullMark: 100,
  }));

  if (data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 350 }}>
      <h3 style={{ marginBottom: 16, color: '#374151' }}>Quality Score by Category</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280' }} />
          <Radar
            name="Quality Score"
            dataKey="score"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.3}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
