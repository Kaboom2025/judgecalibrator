export function Footer() {
  return (
    <footer className="mt-auto w-full py-8 border-t border-zinc-900 bg-zinc-950">
      <div className="flex flex-col md:flex-row justify-between items-center px-8 lg:px-16 max-w-[1440px] mx-auto">
        <div className="font-mono text-[0.6875rem] uppercase tracking-tighter text-zinc-500">
          2024 JudgeCalibrator. Open-source LLM judge diagnostics.
        </div>
        <div className="flex gap-8 mt-4 md:mt-0 font-mono text-[0.6875rem] uppercase tracking-tighter">
          <a className="text-zinc-600 hover:text-zinc-100 transition-colors" href="#">Privacy</a>
          <a className="text-zinc-600 hover:text-zinc-100 transition-colors" href="#">Terms</a>
          <a className="text-zinc-600 hover:text-zinc-100 transition-colors" href="https://github.com/Kaboom2025/judgecalibrator">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
