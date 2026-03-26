import { Activity, RefreshCw, Radar, ShieldCheck, BrainCircuit, Thermometer, AlertTriangle } from 'lucide-react';

interface MetricIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function MetricIcon({ name, className, size = 20 }: MetricIconProps) {
  const p = { className, size } as const;
  switch (name) {
    case 'Activity':      return <Activity {...p} />;
    case 'RefreshCw':     return <RefreshCw {...p} />;
    case 'Radar':         return <Radar {...p} />;
    case 'ShieldCheck':   return <ShieldCheck {...p} />;
    case 'BrainCircuit':  return <BrainCircuit {...p} />;
    case 'Thermometer':   return <Thermometer {...p} />;
    case 'AlertTriangle': return <AlertTriangle {...p} />;
    default:              return <Activity {...p} />;
  }
}
