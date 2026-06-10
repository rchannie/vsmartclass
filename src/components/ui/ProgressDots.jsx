// Dot progress sesi — dot aktif melebar menjadi batang (ikuti prototipe)
export default function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Soal ${current + 1} dari ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-pill transition-all duration-300 ${
            i === current ? 'w-7 bg-accent' : i < current ? 'w-2 bg-accent opacity-50' : 'w-2 bg-line'
          }`}
        />
      ))}
    </div>
  )
}
