import { Layers } from 'lucide-react'

// UX rule #9: logo selalu di dalam badge gradien teal→warm, tidak telanjang
// di latar putih. Taruh file logo.png (putih transparan) di /public untuk
// menggantikan ikon fallback.
const SIZES = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }

export default function Logo({ size = 'md', withText = true, textClassName = '' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`inline-flex items-center justify-center rounded-md text-white ${SIZES[size]}`}
        style={{ background: 'linear-gradient(135deg, #0d9488, #e8803a)' }}
      >
        <img
          src="/logo.png"
          alt=""
          className="h-3/5 w-3/5 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextSibling.style.display = 'block'
          }}
        />
        <Layers size={size === 'lg' ? 26 : 18} style={{ display: 'none' }} />
      </span>
      {withText && (
        <span className={`font-extrabold tracking-tight ${textClassName}`}>
          VSmart<span className="text-accent">Class</span>
        </span>
      )}
    </span>
  )
}
