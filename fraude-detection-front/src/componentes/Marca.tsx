interface Props {
  claro?: boolean
}

/** Isotipo: barras que decrecen como la distribución de Benford; la del 1 en rojo sello. */
export function Marca({ claro = false }: Props) {
  return (
    <div className={`inline-flex items-baseline gap-2.5 ${claro ? 'text-papel' : 'text-tinta'}`}>
      <svg className="h-[18px] w-[22px] self-center fill-current" viewBox="0 0 22 18" aria-hidden="true">
        <rect x="0" y="0" width="4" height="18" className="fill-sello" />
        <rect x="6" y="7" width="4" height="11" />
        <rect x="12" y="10" width="4" height="8" />
        <rect x="18" y="12" width="4" height="6" />
      </svg>
      <span className="font-serif text-[1.7rem] leading-none tracking-tight italic">Benford</span>
      <span className="hidden font-mono text-[0.66rem] tracking-[0.16em] uppercase opacity-70 sm:inline">
        Auditoría de transacciones
      </span>
    </div>
  )
}
