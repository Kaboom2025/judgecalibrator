import React from 'react';
import { PrecomputedResult, ProbeResult } from '../types';

interface KeyFindingsProps {
  results: PrecomputedResult[];
}

function probeVal(result: PrecomputedResult, name: string): ProbeResult | undefined {
  return result.probes.find(p => p.probe_name === name);
}

function formatGrade(grade: string) {
  return grade.replace('_PLUS', '+');
}

export function KeyFindings({ results }: KeyFindingsProps) {
  if (results.length === 0) return null;

  // Finding 1: Models with significant positional bias
  const significantPositionalBias = results.filter(r => {
    const p = probeVal(r, 'positional_bias');
    return p && p.metric_value > 0.30;
  });

  // Finding 2: Highest verbosity bias
  let maxVerbosityModel: { judge: string; value: number } | null = null;
  for (const r of results) {
    const p = probeVal(r, 'verbosity_bias');
    if (p && (!maxVerbosityModel || p.metric_value > maxVerbosityModel.value)) {
      maxVerbosityModel = { judge: r.judge, value: p.metric_value };
    }
  }

  // Finding 3: Grade A judges count
  const gradeACount = results.filter(r => formatGrade(r.trust_grade) === 'A').length;

  // Finding 4: Average self-preference for OpenAI models
  const openaiModels = results.filter(r => r.judge.includes('GPT') || r.judge.includes('gpt'));
  let openaiAvgSelfPref = 0;
  if (openaiModels.length > 0) {
    const total = openaiModels.reduce((acc, r) => {
      const p = probeVal(r, 'self_preference');
      return acc + (p?.metric_value ?? 0.5);
    }, 0);
    openaiAvgSelfPref = total / openaiModels.length;
  }

  const findings = [
    {
      label: 'Significant Positional Bias',
      value: significantPositionalBias.length,
      total: results.length,
      color: 'bg-red-500/10 border-red-500/30 text-red-400',
      description: `${significantPositionalBias.length}/${results.length} models show >30% flip rate`,
    },
    maxVerbosityModel && {
      label: 'Highest Verbosity Bias',
      value: maxVerbosityModel.value,
      color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      description: `${maxVerbosityModel.judge} (+${maxVerbosityModel.value.toFixed(2)})`,
    },
    gradeACount > 0 && {
      label: 'Grade A Judges',
      value: gradeACount,
      color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      description: `${gradeACount} model${gradeACount !== 1 ? 's' : ''} trusted for production`,
    },
    openaiModels.length > 0 && {
      label: 'OpenAI Self-Preference',
      value: openaiAvgSelfPref,
      color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      description: `Avg: ${openaiAvgSelfPref.toFixed(2)} (0.50 = no bias)`,
    },
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      {findings.map((finding, i) => (
        <div
          key={i}
          className={`border rounded-lg p-6 backdrop-blur-sm ${finding.color}`}
        >
          <div className="text-3xl font-bold font-mono mb-2">
            {typeof finding.value === 'number' && Number.isInteger(finding.value)
              ? finding.value
              : typeof finding.value === 'number'
                ? finding.value.toFixed(2)
                : finding.value}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider mb-2 opacity-80">
            {finding.label}
          </div>
          <p className="text-xs opacity-70 leading-relaxed">{finding.description}</p>
        </div>
      ))}
    </div>
  );
}
