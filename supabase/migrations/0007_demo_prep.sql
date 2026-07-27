-- Persiapan khusus demo lomba: pastikan ada satu siswa yang SUDAH C6 di topik
-- "Sistem Persamaan Linear" sebelum demo dimulai, supaya menu Proyek (Modul 6)
-- langsung terbuka saat Segmen 6 tanpa harus grinding adaptive session secara live.
-- Citra Maharani dipilih karena sudah paling unggul di seed.sql (current_level 5).

update public.bloom_profiles
set c6 = 65, current_level = 6, trend = 1
where topic = 'Sistem Persamaan Linear'
  and user_id = (select id from auth.users where email = 'citra@siswa.com');
