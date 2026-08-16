// Hiperparameter mesin adaptif (Modul 3) — satu sumber kebenaran untuk klien.
//
// Edge Function `update-bloom-profile` (Deno, runtime terpisah, tidak bisa
// import file dari src/) menduplikasi nilai MASTERY_* secara manual — bila
// angka di sini diubah, sinkronkan juga komentar di
// supabase/functions/update-bloom-profile/index.ts.

export const ADAPTIVE_CONFIG = {
  // Adaptasi makro antar-sesi (EWMA): new_c_n = old_c_n * OLD_WEIGHT + evidence_n * 100 * NEW_WEIGHT
  MASTERY_BLEND_OLD_WEIGHT: 0.6,
  MASTERY_BLEND_NEW_WEIGHT: 0.4,
  // current_level = level tertinggi n dengan c_n >= ambang ini
  MASTERY_THRESHOLD: 60,
  // Adaptasi mikro intra-sesi: target naik 1 level setelah N jawaban berturut-turut di/atas target
  STREAK_TO_LEVEL_UP: 2,
  // Jumlah soal per sesi adaptif
  SESSION_LENGTH: 6,
  // RF-11: level Bloom minimum opsi PG yang mewajibkan justifikasi tertulis
  JUSTIFICATION_MIN_BLOOM: 4,
  // Spaced review: topik dianggap "perlu diulang" bila belum disentuh selama ini (hari)
  // dan level topik itu belum tuntas (current_level < 6)
  SPACED_REVIEW_DAYS: 7,
}
