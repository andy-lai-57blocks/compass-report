import 'dotenv/config';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function callDeepSeek(prompt) {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-key-here') {
    console.warn('  ⚠️  No valid DeepSeek API key set. AI analysis will be skipped.');
    return null;
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are an expert in AI-assisted rapid MVP development. You evaluate documentation repositories designed to guide AI coding assistants (like Cursor, Claude, Copilot) in building products from 0 to MVP efficiently and accurately.

CORE MISSION of these docs: Reduce AI hallucinations, improve AI output quality, and accelerate MVP delivery by providing clear rules, skills, and domain knowledge.

There are TWO types of knowledge areas with different scoring focuses:

=== TYPE 1: Engineering Conventions & Workflow Rules ===
These are firm-wide engineering standards, code patterns, and workflow rules. Score on:
- Hallucination Prevention (40%): Concrete rules (must/always/never), validation patterns, test requirements, edge case handling, constraints
- Output Consistency (25%): Clear conventions that make AI-generated code uniform across the team
- MVP Acceleration (20%): Reusable patterns, scaffolds, quick-start templates, checklists
- Language Consistency (15%): Should be entirely in English. Mixed Chinese/English reduces clarity

=== TYPE 2: Domain Knowledge & Business Logic ===
These are vertical domain expertise (Adtech, Fintech, Healthtech, Web3). Score on:
- Domain Coverage (30%): Depth of domain-specific concepts, terminology, protocols, standards
- Technical Accuracy (25%): Correct API schemas, data models, integration patterns, compliance requirements
- Practical Usefulness (25%): Can AI use this to generate working, domain-appropriate code?
- Language Consistency (20%): Should be entirely in English. Mixed Chinese/English reduces clarity

The user will tell you which type the knowledge area is in the prompt.

Output JSON only:
{
  "aiScore": <0-100>,
  "assessment": "<2-3 sentences specific to this area's strengths and weaknesses>",
  "hallucinationRisks": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "strengths": ["what helps AI quality"],
  "improvements": ["what would make AI output better"],
  "recommendations": ["actionable fix 1", "actionable fix 2"]
}`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`  ❌ DeepSeek API error (${res.status}): ${errText.substring(0, 200)}`);
    return null;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    console.warn('  ⚠️  DeepSeek response was not valid JSON');
    return { raw: content.substring(0, 500) };
  } catch {
    console.warn('  ⚠️  Could not parse DeepSeek response as JSON');
    return { raw: content.substring(0, 500) };
  }
}

function buildUnitPrompt(unit) {
  const fileSummaries = unit.files.map(f => {
    const preview = (f.contentPreview || '').substring(0, 800).replace(/\n/g, '\\n');
    return `[${f.name}] (${(f.size/1024).toFixed(1)}KB, Owner: ${f.owner || 'unknown'})
  Content: ${preview || '(empty)'}`;
  }).join('\n\n');

  const subDirInfo = (unit.children || []).map(c => {
    const childFiles = (c.files || []).map(f => `    - ${f.name}`).join('\n');
    return `  ${c.name}/ (${c.stats?.fileCount || 0} files)${childFiles ? '\n' + childFiles : ''}`;
  }).join('\n');

  const category = unit.category || 'convention';
  const categoryLabel = category === 'convention' ? 'Engineering Conventions & Workflow Rules' : 'Domain Knowledge & Business Logic';

  return `
## Knowledge Area: ${unit.topDir} → ${unit.parent ? unit.parent + ' → ' : ''}${unit.name}
Type: ${categoryLabel}
Files count: ${unit.fileCount}
Sub-directories:${subDirInfo ? '\n' + subDirInfo : ' (none)'}

### File Contents:
${fileSummaries || '(no content files)'}

Evaluate how well this knowledge area helps AI assistants build 0-to-MVP projects. Score from 0-100.`;
}

export async function analyzeAllUnits(analysisUnits) {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-key-here') {
    console.log('🤖 AI analysis skipped (no API key)');
    return analysisUnits;
  }

  console.log(`🤖 Analyzing ${analysisUnits.length} areas for AI hallucination prevention & MVP quality...`);

  let completed = 0;
  for (const unit of analysisUnits) {
    completed++;
    console.log(`  [${completed}/${analysisUnits.length}] ${unit.topDir} → ${unit.parent ? unit.parent + ' → ' : ''}${unit.name}...`);

    const prompt = buildUnitPrompt(unit);
    const result = await callDeepSeek(prompt);

    if (result && !result.error) {
      unit.aiResult = result;

      if (typeof result.aiScore === 'number') {
        const staticScore = unit.stats?.avgQuality || 0;
        unit.stats.aiScore = result.aiScore;
        // Combined: 70% AI (hallucination prevention + quality) + 30% static (structure)
        unit.stats.combinedScore = Math.round(result.aiScore * 0.7 + staticScore * 0.3);
        console.log(`    → Score: ${result.aiScore} | Static: ${staticScore} | Combined: ${unit.stats.combinedScore}`);
        if (result.hallucinationRisks?.length) {
          console.log(`    → Hallucination risks: ${result.hallucinationRisks.join('; ')}`);
        }
      } else {
        unit.stats.combinedScore = unit.stats?.avgQuality || 0;
      }
    } else {
      unit.stats.combinedScore = unit.stats?.avgQuality || 0;
    }

    if (completed < analysisUnits.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log('✅ Analysis complete!');
  return analysisUnits;
}
