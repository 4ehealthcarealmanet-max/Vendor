import { ReactNode } from "react"

export function ProfileGroup({ title, color, children }: { title: string; color: "violet" | "indigo" | "emerald"; children: ReactNode }) {
  const accent =
    color === "violet" ? "text-violet-700" :
      color === "emerald" ? "text-emerald-700" :
        "text-[#0f4fb6]"
  const border =
    color === "violet" ? "border-violet-100" :
      color === "emerald" ? "border-emerald-100" :
        "border-indigo-100"
  return (
    <div className={`rounded-2xl border bg-[#fafbff] p-4 space-y-3 ${border}`}>
      <h4 className={`text-[9px] font-black uppercase tracking-[0.25em] ${accent}`}>{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function InfoRow({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  const isEmpty = value === "-"
  return (
    <div className={`flex ${fullWidth ? "flex-col gap-0.5" : "items-center justify-between"} py-2 px-3 rounded-xl bg-white border border-[#eef2f8]`}>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-[11px] font-semibold tracking-tight ${isEmpty ? "text-slate-300 italic" : "text-[#0f172a]"} ${fullWidth ? "mt-0.5" : "text-right ml-2"}`}>
        {value}
      </span>
    </div>
  )
}

export function DocumentPreview({ label, dataUrl }: { label: string; dataUrl: string }) {
  const isPdf = dataUrl.startsWith("data:application/pdf")
  return (
    <div className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-xl mb-3 last:mb-0 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      {isPdf ? (
        <a href={dataUrl} download={`${label}.pdf`} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-2 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="18"/><line x1="15" y1="15" x2="12" y2="18"/></svg>
          Download PDF
        </a>
      ) : (
        <a href={dataUrl} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={label} className="w-full h-auto max-h-[160px] object-cover hover:opacity-80 transition-opacity" />
        </a>
      )}
    </div>
  )
}

export function AuditRow({ label, value, highlight, status }: { label: string; value: string; highlight?: boolean; status?: 'success' | 'warning' | 'danger' }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:border-[#0f4fb6]/20 ${status === 'success' ? 'bg-emerald-50/60 border-emerald-100' :
        status === 'danger' ? 'bg-rose-50/60 border-rose-100' :
          status === 'warning' ? 'bg-amber-50/60 border-amber-100' :
            'bg-[#f8faff] border-[#eef2f8]'
      }`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] font-black tracking-tight ${status === 'success' ? 'text-emerald-700' :
          status === 'danger' ? 'text-rose-600' :
            status === 'warning' ? 'text-amber-600' :
              highlight ? 'text-[#0f4fb6]' : 'text-[#0f172a]'
        }`}>
        {value}
      </span>
    </div>
  )
}
