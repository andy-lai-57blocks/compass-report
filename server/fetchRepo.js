import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_REPO_PATH = '/Users/57block/57blocks/Compass';

async function fetchDir(dirPath) {
  const fullPath = path.join(LOCAL_REPO_PATH, dirPath);
  const items = fs.readdirSync(fullPath, { withFileTypes: true });
  return items
    .filter(item => item.name !== '.gitkeep' && item.name !== '.DS_Store')
    .map(item => ({
      name: item.name,
      path: dirPath ? `${dirPath}/${item.name}` : item.name,
      type: item.isDirectory() ? 'dir' : 'file',
      size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : 0,
    }));
}

async function fetchFileContent(filePath) {
  const fullPath = path.join(LOCAL_REPO_PATH, filePath);
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return '';
  }
}

function extractOwner(content) {
  if (!content) return null;
  const match = content.match(/Owner:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function analyzeFileQuality(content, category = 'convention') {
  if (!content) return { score: 0 };
  const lines = content.split('\n');
  const totalLines = lines.filter(l => l.trim()).length;
  
  // Detect language: strip code blocks and frontmatter for language analysis
  const body = content.replace(/^---[\s\S]*?---\n/, '').replace(/```[\s\S]*?```/g, '');
  const chineseChars = (body.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const totalChars = body.replace(/\s/g, '').length || 1;
  const chineseRatio = chineseChars / totalChars;
  const isEnglishOnly = chineseRatio < 0.15;

  // Common indicators for all categories
  const indicators = {
    hasYamlFrontmatter: /^---/.test(content.trim()),
    hasClearTitle: /^#\s+.+/m.test(content),
    hasSections: /^##|^###/m.test(content),
    hasCodeExamples: /```[a-z]*\n[\s\S]*?```/i.test(content),
    isEnglishOnly,
  };

  // Category-specific indicators
  if (category === 'convention') {
    // Conventions: prioritize rules, constraints, validation
    indicators.hasConcreteRules = /\b(must|always|never|required|mandatory)\b/i.test(content);
    indicators.hasValidationPatterns = /\b(validate?|check|verify|ensure|assert|test|spec|should|expect)\b/i.test(content) && /```[\s\S]*?```/i.test(content);
    indicators.hasEdgeCases = /\b(edge.?case|error.?handling|fallback|exception|timeout|null|undefined|empty)\b/i.test(content);
    indicators.hasConstraints = /\b(limit|constraint|boundary|restriction)\b/i.test(content) && /```/i.test(content);
    indicators.hasDecisionTree = /\b(if|when|depending|case|scenario)\b/i.test(content) && /- |\d+\./.test(content);
    indicators.hasInputOutputSpec = /\b(input|output|request|response|parameter|return|format)\b/i.test(content);
    indicators.hasQuickStart = /\b(quick.?start|getting.?started|setup|scaffold|template|starter)\b/i.test(content);
    indicators.hasReusablePatterns = /\b(pattern|template|recipe|snippet|boilerplate)\b/i.test(content);
    indicators.hasChecklist = /\b(checklist|tl;dr|summary|steps?)\b/i.test(content);
  } else {
    // Domain Knowledge: prioritize domain terminology, business scenarios, technical depth
    indicators.hasDomainTerms = /\b(protocol|specification|standard|schema|framework|architecture)\b/i.test(content);
    indicators.hasBusinessScenarios = /\b(use.?case|scenario|workflow|pipeline|integration|workflow)\b/i.test(content);
    indicators.hasTechStackDetail = /\b(api|sdk|library|version|config|dependency|endpoint)\b/i.test(content) && /```/i.test(content);
    indicators.hasComparisons = /\b(compared?|vs\.?|alternative|trade.?off|pros?|cons?)\b/i.test(content);
    indicators.hasDataModel = /\b(schema|field|attribute|property|payload|structure|format)\b/i.test(content);
    indicators.hasCompliance = /\b(compliant?|regulat|standard|audit|requirement|policy|gdpr|hipaa|pci)\b/i.test(content);
    indicators.hasIntegrationGuide = /\b(integration|setup|configur|deploy|install|onboard)\b/i.test(content);
    indicators.hasReferences = /\b(reference|see also|related|further|link|https?:\/\/)\b/i.test(content);
  }

  const lengthScore = Math.min(totalLines / 80, 1);
  let weightedScore;

  if (category === 'convention') {
    const structureCount = [indicators.hasYamlFrontmatter, indicators.hasClearTitle, indicators.hasSections].filter(Boolean).length;
    const halluCount = [indicators.hasConcreteRules, indicators.hasValidationPatterns, indicators.hasEdgeCases, indicators.hasConstraints].filter(Boolean).length;
    const qualityCount = [indicators.hasCodeExamples, indicators.hasDecisionTree, indicators.hasInputOutputSpec].filter(Boolean).length;
    const mvpCount = [indicators.hasQuickStart, indicators.hasReusablePatterns, indicators.hasChecklist].filter(Boolean).length;
    weightedScore = Math.round(
      (structureCount / 3) * 10 +
      (halluCount / 4) * 45 +
      (qualityCount / 3) * 20 +
      (mvpCount / 3) * 10 +
      (isEnglishOnly ? 8 : 0) +
      lengthScore * 7
    );
  } else {
    const structureCount = [indicators.hasYamlFrontmatter, indicators.hasClearTitle, indicators.hasSections].filter(Boolean).length;
    const domainCount = [indicators.hasDomainTerms, indicators.hasBusinessScenarios, indicators.hasTechStackDetail, indicators.hasComparisons].filter(Boolean).length;
    const specCount = [indicators.hasDataModel, indicators.hasCompliance, indicators.hasIntegrationGuide, indicators.hasReferences].filter(Boolean).length;
    weightedScore = Math.round(
      (structureCount / 3) * 10 +
      (domainCount / 4) * 35 +
      (specCount / 4) * 30 +
      (indicators.hasCodeExamples ? 12 : 0) +
      (isEnglishOnly ? 8 : 0) +
      lengthScore * 5
    );
  }

  return { score: Math.min(weightedScore, 100), indicators, language: isEnglishOnly ? 'en' : 'mixed' };
}

function summarizeContent(content, maxLen = 1500) {
  if (!content) return '';
  const cleaned = content.replace(/```[\s\S]*?```/g, '[code block]');
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.substring(0, maxLen) + '...(truncated)';
}

const targetDirs = [
  { path: 'Firm-Wide Conventions/Designer', owner: 'Kristy Luo', category: 'convention' },
  { path: 'Firm-Wide Conventions/PM', owner: 'Jacob Gong', category: 'convention' },
  { path: 'Firm-Wide Conventions/Engineering/AI', owner: 'Alpha Xiang', category: 'convention' },
  { path: 'Firm-Wide Conventions/Engineering/Backend', owner: 'Roy Xie', category: 'convention' },
  { path: 'Firm-Wide Conventions/Engineering/Frontend', owner: 'Marvin Luo', category: 'convention' },
  { path: 'Firm-Wide Conventions/Engineering/Mobile', owner: 'Colin Yang', category: 'convention' },
  { path: 'Firm-Wide Conventions/Engineering/OPS', owner: 'Sander Heng', category: 'convention' },
  { path: 'Firm-Wide Conventions/Engineering/QA', owner: 'Jia Chen', category: 'convention' },
  { path: 'Vertical Domain Knowledge/Adtech', owner: 'Andy Lai', category: 'domain' },
  { path: 'Vertical Domain Knowledge/Fintech', owner: 'Teki Yang', category: 'domain' },
  { path: 'Vertical Domain Knowledge/Healthtech', owner: 'Mandy Liu', category: 'domain' },
  { path: 'Vertical Domain Knowledge/Web3', owner: 'Bin Li', category: 'domain' },
];

/** Build a lookup from path to owner */
const ownerLookup = {};
for (const t of targetDirs) {
  ownerLookup[t.path] = t.owner;
}

/**
 * Recursively scan a directory for ALL .md files (any depth).
 * Each file gets the owner of its target directory (from targetDirs config),
 * falling back to content-extracted owner if present.
 */
async function scanDirRecursive(dirPath, dirOwner = null, fileCategory = 'convention') {
  let items;
  try {
    items = await fetchDir(dirPath);
  } catch (err) {
    console.warn(`    [WARN] Cannot fetch ${dirPath}: ${err.message}`);
    return { files: [], totalFiles: 0 };
  }

  const files = [];
  let total = 0;

  for (const item of items) {
    if (item.name === '.gitkeep' || item.name === '.DS_Store') continue;
    if (item.type === 'dir') {
      const sub = await scanDirRecursive(item.path, dirOwner, fileCategory);
      files.push(...sub.files);
      total += sub.totalFiles;
    } else if (item.type === 'file' && item.name.endsWith('.md')) {
      console.log(`      📄 ${item.path}`);
      let content = '', owner = null;
      try {
        content = await fetchFileContent(item.path);
        owner = extractOwner(content);
      } catch {}
      const quality = analyzeFileQuality(content, fileCategory);
      files.push({
        name: item.name, path: item.path, size: item.size,
        owner: owner || dirOwner,
        quality, contentPreview: summarizeContent(content),
      });
      total++;
    }
  }

  return { files, totalFiles: total };
}

/**
 * Fetch repository data for the 12 target directories, recursively scanning all sub-dirs for each.
 */
export async function fetchAndCompute() {
  console.log('📡 Fetching Compass repository (recursive scan of 12 target dirs)...');

  const rootDirs = ['Firm-Wide Conventions', 'Vertical Domain Knowledge'];
  const trees = [];

  for (const dir of rootDirs) {
    console.log(`  Fetching root: ${dir}...`);
    let rootItems;
    try {
      rootItems = await fetchDir(dir);
    } catch (err) {
      console.warn(`  [WARN] Cannot fetch root ${dir}: ${err.message}`);
      continue;
    }

    const tree = { name: dir, path: dir, depth: 0, children: [], files: [], totalFiles: 0 };
    const relevantPaths = targetDirs.filter(t => t.path.startsWith(dir + '/')).map(t => t.path);
    const relevantSecondLevels = [...new Set(relevantPaths.map(p => p.split('/')[1]))];

    for (const item of rootItems) {
      if (item.name === '.gitkeep' || item.name === '.DS_Store') continue;
      if (item.type !== 'dir' || !relevantSecondLevels.includes(item.name)) continue;

      console.log(`  Fetching: ${item.path}...`);
      let secondItems;
      try {
        secondItems = await fetchDir(item.path);
      } catch (err) {
        console.warn(`    [WARN] Cannot fetch ${item.path}: ${err.message}`);
        continue;
      }

      const childNode = { name: item.name, path: item.path, depth: 1, children: [], files: [], totalFiles: 0 };
      const relevantThirdLevels = relevantPaths.filter(p => p.startsWith(item.path + '/')).map(p => p.split('/')[2]);

      for (const sItem of secondItems) {
        if (sItem.name === '.gitkeep' || sItem.name === '.DS_Store') continue;

        if (sItem.type === 'dir') {
          const isEngineeringSubTarget = item.name === 'Engineering' && relevantThirdLevels.includes(sItem.name);
          const isVerticalTarget = item.name !== 'Engineering' && relevantThirdLevels.includes(sItem.name);
          const isSecondLevelTarget = relevantThirdLevels.length === 0;

          if (isEngineeringSubTarget || isVerticalTarget || isSecondLevelTarget) {
            // Determine the owner for this target directory
            let targetOwner = null;
            if (isEngineeringSubTarget) {
              targetOwner = ownerLookup[`${item.path}/${sItem.name}`] || null;
            } else if (isVerticalTarget) {
              targetOwner = ownerLookup[`${item.path}/${sItem.name}`] || null;
            }
            // For second-level targets (Designer, PM), the target path is item.path itself
            if (isSecondLevelTarget) {
              targetOwner = ownerLookup[item.path] || null;
            }

            console.log(`    Scanning: ${sItem.path} (owner: ${targetOwner || 'default'})...`);
            // Determine category for this target directory
            let targetCategory = 'convention';
            const targetInfo = targetDirs.find(t => {
              if (isSecondLevelTarget) return t.path === item.path;
              return t.path === `${item.path}/${sItem.name}`;
            });
            if (targetInfo) targetCategory = targetInfo.category || 'convention';

            const scanned = await scanDirRecursive(sItem.path, targetOwner, targetCategory);
            if (isEngineeringSubTarget) {
              const subNode = { name: sItem.name, path: sItem.path, depth: 2, children: [], files: scanned.files, totalFiles: scanned.totalFiles };
              childNode.children.push(subNode);
            } else {
              childNode.files.push(...scanned.files);
            }
            childNode.totalFiles += scanned.totalFiles;
          }
        } else if (sItem.type === 'file' && sItem.name.endsWith('.md')) {
          console.log(`    📄 ${sItem.path}`);
          let content = '', owner = null;
          try { content = await fetchFileContent(sItem.path); owner = extractOwner(content); } catch {}
          const quality = analyzeFileQuality(content);
          // For direct files in second-level dirs, find their owner
          const fileOwner = ownerLookup[item.path] || null;
          childNode.files.push({
            name: sItem.name, path: sItem.path, size: sItem.size,
            owner: owner || fileOwner, quality, contentPreview: summarizeContent(content),
          });
          childNode.totalFiles++;
        }
      }

      tree.children.push(childNode);
      tree.totalFiles += childNode.totalFiles;
    }

    trees.push(tree);
  }

  const totalFiles = trees.reduce((s, t) => s + t.totalFiles, 0);
  console.log(`  ✅ Total files found: ${totalFiles}`);

  function findNodeByPath(nodes, targetPath) {
    for (const node of nodes) {
      if (node.path === targetPath) return node;
      if (node.children) { const found = findNodeByPath(node.children, targetPath); if (found) return found; }
    }
    return null;
  }

  function computeNodeStats(node) {
    let totalScore = 0;
    let totalFileCount = 0;
    for (const f of node.files) {
      totalScore += f.quality?.score || 0;
      totalFileCount++;
    }
    for (const c of node.children) {
      computeNodeStats(c);
      if (c.stats) {
        totalScore += (c.stats.rawAvgQuality || c.stats.avgQuality || 0) * (c.stats.ownFileCount || 0);
        totalFileCount += c.stats.ownFileCount || 0;
      }
    }
    const ownerCount = {};
    for (const f of node.files) if (f.owner) ownerCount[f.owner] = (ownerCount[f.owner] || 0) + 1;
    for (const c of node.children)
      if (c.stats?.ownerCount)
        for (const [o, n] of Object.entries(c.stats.ownerCount)) ownerCount[o] = (ownerCount[o] || 0) + n;

    const rawAvg = totalFileCount > 0 ? Math.round(totalScore / totalFileCount) : 0;
    // Apply file count volume adjustment:
    //   - 0 files: no content at all → 0 (already handled)
    //   - 1-2 files: too few, AI lacks reference → -15 penalty
    //   - 3-5 files: thin but usable → -5 penalty
    //   - 6-15 files: good coverage → no adjustment
    //   - 16+ files: excellent coverage, high-quality content is more impactful → +5 bonus
    const fc = node.files.length + node.children.reduce((s, c) => s + (c.stats?.fileCount || 0), 0);
    let volumeAdjustment = 0;
    if (fc === 0) {
      volumeAdjustment = 0; // score will be 0 anyway
    } else if (fc <= 2) {
      volumeAdjustment = -15;
    } else if (fc <= 5) {
      volumeAdjustment = -5;
    } else if (fc >= 16) {
      volumeAdjustment = 5;
    }

    node.stats = {
      fileCount: fc,
      rawAvgQuality: rawAvg,
      avgQuality: Math.max(0, Math.min(100, rawAvg + volumeAdjustment)),
      ownFileCount: node.files.length,
      ownerCount,
    };
  }
  for (const tree of trees) computeNodeStats(tree);

  const analysisUnits = [];
  for (const target of targetDirs) {
    const targetPath = target.path;
    for (const tree of trees) {
      const node = findNodeByPath([tree], targetPath);
      if (node) {
        const parts = targetPath.split('/');
        analysisUnits.push({
          topDir: parts[0],
          parent: parts.length > 2 ? parts[1] : null,
          name: parts[parts.length - 1],
          owner: target.owner,
          category: target.category || 'convention',
          path: node.path,
          fileCount: node.stats?.fileCount || 0,
          files: node.files || [],
          children: node.children || [],
          stats: node.stats || { fileCount: 0, avgQuality: 0, ownerCount: {} },
        });
        break;
      }
    }
  }

  const allFiles = [];
  function flattenFiles(node) {
    for (const f of node.files) allFiles.push({ ...f, hierarchy: [node.path], dirName: node.name });
    for (const c of node.children) flattenFiles(c);
  }
  for (const tree of trees) flattenFiles(tree);

  const topSummary = {};
  for (const tree of trees) topSummary[tree.name] = tree.stats;

  console.log(`📊 Analysis units: ${analysisUnits.length}, Flat files: ${allFiles.length}`);
  return { trees, files: allFiles, analysisUnits, summary: { totalFiles, directories: topSummary } };
}
