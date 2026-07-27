-- Seed data demo LIDM.
-- PRASYARAT: buat akun-akun berikut dulu lewat Supabase Auth (dashboard / admin API):
--   ratna@sma3bdg.sch.id (guru123), aisyah@siswa.com, dimas@siswa.com,
--   citra@siswa.com, bagas@siswa.com, elsa@siswa.com (semua: siswa123)
-- Script ini mengambil id mereka dari auth.users berdasarkan email.

do $$
declare
  v_guru uuid; v_aisyah uuid; v_dimas uuid; v_citra uuid; v_bagas uuid; v_elsa uuid;
  v_ws uuid;
begin
  select id into v_guru   from auth.users where email = 'ratna@sma3bdg.sch.id';
  select id into v_aisyah from auth.users where email = 'aisyah@siswa.com';
  select id into v_dimas  from auth.users where email = 'dimas@siswa.com';
  select id into v_citra  from auth.users where email = 'citra@siswa.com';
  select id into v_bagas  from auth.users where email = 'bagas@siswa.com';
  select id into v_elsa   from auth.users where email = 'elsa@siswa.com';

  if v_guru is null then
    raise exception 'Buat akun auth terlebih dahulu (lihat komentar di atas).';
  end if;

  insert into public.profiles (id, full_name, role) values
    (v_guru,   'Ratna Dewi, S.Pd.', 'guru'),
    (v_aisyah, 'Aisyah Putri',      'siswa'),
    (v_dimas,  'Dimas Prasetyo',    'siswa'),
    (v_citra,  'Citra Maharani',    'siswa'),
    (v_bagas,  'Bagas Saputra',     'siswa'),
    (v_elsa,   'Elsa Ramadhani',    'siswa')
  on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

  insert into public.workspaces (name, school, subject, join_code, created_by)
  values ('XI MIPA 2', 'SMA Negeri 3 Bandung', 'Matematika', 'VSC-7QK2', v_guru)
  on conflict (join_code) do nothing;

  select id into v_ws from public.workspaces where join_code = 'VSC-7QK2';

  insert into public.workspace_members (workspace_id, user_id, role) values
    (v_ws, v_guru, 'guru'), (v_ws, v_aisyah, 'siswa'), (v_ws, v_dimas, 'siswa'),
    (v_ws, v_citra, 'siswa'), (v_ws, v_bagas, 'siswa'), (v_ws, v_elsa, 'siswa')
  on conflict do nothing;

  -- bloom_profiles pre-filled — Matematika, "Sistem Persamaan Linear"
  insert into public.bloom_profiles
    (user_id, workspace_id, topic, c1, c2, c3, c4, c5, c6, current_level, trend, session_count)
  values
    (v_aisyah, v_ws, 'Sistem Persamaan Linear', 92, 84, 71, 60, 22, 10, 4,  1, 6),
    (v_dimas,  v_ws, 'Sistem Persamaan Linear', 88, 75, 60, 48, 20,  8, 3,  0, 6),
    (v_citra,  v_ws, 'Sistem Persamaan Linear', 95, 90, 85, 70, 50, 30, 5,  1, 6),
    (v_bagas,  v_ws, 'Sistem Persamaan Linear', 70, 55, 40, 20,  8,  2, 2,  0, 6),
    (v_elsa,   v_ws, 'Sistem Persamaan Linear', 50, 30, 18,  8,  3,  1, 1, -1, 6)
  on conflict (user_id, workspace_id, topic) do nothing;

  -- Riwayat sessions — supaya Trajectory Chart & Growth Bars (yang baca tabel
  -- sessions, bukan bloom_profiles) ikut terisi konsisten dengan angka di
  -- bloom_profiles di atas.
  insert into public.sessions (workspace_id, user_id, topic, subject, bloom_level, item_count, started_at, completed_at)
  values
    -- Aisyah — trend naik (akhir mendekati current_level 4)
    (v_ws, v_aisyah, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '24 days', now() - interval '24 days' + interval '12 minutes'),
    (v_ws, v_aisyah, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '19 days', now() - interval '19 days' + interval '12 minutes'),
    (v_ws, v_aisyah, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '14 days', now() - interval '14 days' + interval '12 minutes'),
    (v_ws, v_aisyah, 'Sistem Persamaan Linear', 'Matematika', 4, 6, now() - interval '9 days',  now() - interval '9 days'  + interval '12 minutes'),
    (v_ws, v_aisyah, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '5 days',  now() - interval '5 days'  + interval '12 minutes'),
    (v_ws, v_aisyah, 'Sistem Persamaan Linear', 'Matematika', 4, 6, now() - interval '2 days',  now() - interval '2 days'  + interval '12 minutes'),
    -- Dimas — trend datar/plateau (berkisar di current_level 3)
    (v_ws, v_dimas, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '25 days', now() - interval '25 days' + interval '12 minutes'),
    (v_ws, v_dimas, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '20 days', now() - interval '20 days' + interval '12 minutes'),
    (v_ws, v_dimas, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '15 days', now() - interval '15 days' + interval '12 minutes'),
    (v_ws, v_dimas, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '10 days', now() - interval '10 days' + interval '12 minutes'),
    (v_ws, v_dimas, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '6 days',  now() - interval '6 days'  + interval '12 minutes'),
    (v_ws, v_dimas, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '3 days',  now() - interval '3 days'  + interval '12 minutes'),
    -- Citra — trend naik (akhir mendekati current_level 5, paling unggul di kelas)
    (v_ws, v_citra, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '26 days', now() - interval '26 days' + interval '12 minutes'),
    (v_ws, v_citra, 'Sistem Persamaan Linear', 'Matematika', 4, 6, now() - interval '21 days', now() - interval '21 days' + interval '12 minutes'),
    (v_ws, v_citra, 'Sistem Persamaan Linear', 'Matematika', 4, 6, now() - interval '16 days', now() - interval '16 days' + interval '12 minutes'),
    (v_ws, v_citra, 'Sistem Persamaan Linear', 'Matematika', 5, 6, now() - interval '11 days', now() - interval '11 days' + interval '12 minutes'),
    (v_ws, v_citra, 'Sistem Persamaan Linear', 'Matematika', 4, 6, now() - interval '7 days',  now() - interval '7 days'  + interval '12 minutes'),
    (v_ws, v_citra, 'Sistem Persamaan Linear', 'Matematika', 5, 6, now() - interval '4 days',  now() - interval '4 days'  + interval '12 minutes'),
    -- Bagas — trend datar/plateau (berkisar di current_level 2)
    (v_ws, v_bagas, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '23 days', now() - interval '23 days' + interval '12 minutes'),
    (v_ws, v_bagas, 'Sistem Persamaan Linear', 'Matematika', 1, 6, now() - interval '18 days', now() - interval '18 days' + interval '12 minutes'),
    (v_ws, v_bagas, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '13 days', now() - interval '13 days' + interval '12 minutes'),
    (v_ws, v_bagas, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '8 days',  now() - interval '8 days'  + interval '12 minutes'),
    (v_ws, v_bagas, 'Sistem Persamaan Linear', 'Matematika', 1, 6, now() - interval '4 days',  now() - interval '4 days'  + interval '12 minutes'),
    (v_ws, v_bagas, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '1 days',  now() - interval '1 days'  + interval '12 minutes'),
    -- Elsa — trend turun (perlu perhatian, akhir di current_level 1)
    (v_ws, v_elsa, 'Sistem Persamaan Linear', 'Matematika', 3, 6, now() - interval '22 days', now() - interval '22 days' + interval '12 minutes'),
    (v_ws, v_elsa, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '17 days', now() - interval '17 days' + interval '12 minutes'),
    (v_ws, v_elsa, 'Sistem Persamaan Linear', 'Matematika', 2, 6, now() - interval '12 days', now() - interval '12 days' + interval '12 minutes'),
    (v_ws, v_elsa, 'Sistem Persamaan Linear', 'Matematika', 1, 6, now() - interval '7 days',  now() - interval '7 days'  + interval '12 minutes'),
    (v_ws, v_elsa, 'Sistem Persamaan Linear', 'Matematika', 1, 6, now() - interval '3 days',  now() - interval '3 days'  + interval '12 minutes'),
    (v_ws, v_elsa, 'Sistem Persamaan Linear', 'Matematika', 1, 6, now() - interval '1 days',  now() - interval '1 days'  + interval '12 minutes');

  -- 3 soal MCQ published (ringkas; versi lengkap ada di mode demo frontend)
  insert into public.questions (workspace_id, created_by, subject, topic, type, bloom_target, prompt, options, published)
  values
  (v_ws, v_guru, 'Matematika', 'Sistem Persamaan Linear', 'mcq', array['C1','C2','C3','C4'],
   'Diketahui sistem persamaan 2x + y = 7 dan x − y = 2. Mana pendekatan yang paling menggambarkan caramu memandang masalah ini?',
   '[{"id":"A","bloom":"C1","text":"Ini sistem persamaan linear dua variabel berbentuk ax + by = c.","indicator":"Mengenali bentuk dan istilah dasar dari memori.","feedback":"Kamu sudah mengenali bentuk dasarnya — fondasi yang penting."},
     {"id":"B","bloom":"C2","text":"Solusinya adalah titik potong dua garis pada bidang koordinat.","indicator":"Menerjemahkan bentuk aljabar ke makna geometris.","feedback":"Tepat — kamu memahami maknanya, bukan sekadar bentuknya."},
     {"id":"C","bloom":"C3","text":"Jumlahkan kedua persamaan agar y tereliminasi, lalu x = 3 dan y = 1.","indicator":"Menjalankan prosedur eliminasi sampai solusi ditemukan.","feedback":"Eliminasimu tepat. Kapan substitusi lebih efisien?"},
     {"id":"D","bloom":"C4","text":"Koefisien y berlawanan tanda, jadi eliminasi lebih efisien daripada substitusi di sistem ini.","indicator":"Menganalisis struktur sistem untuk memilih strategi.","feedback":"Analisis strukturmu kuat — ciri berpikir tingkat tinggi."}]'::jsonb,
   true),
  (v_ws, v_guru, 'Matematika', 'Sistem Persamaan Linear', 'mcq', array['C2','C3','C4','C5'],
   'Harga 2 buku dan 3 pensil Rp19.000; harga 1 buku dan 2 pensil Rp11.000. Bagaimana kamu menanggapi situasi ini?',
   '[{"id":"A","bloom":"C2","text":"Memodelkan sebagai SPL: 2b + 3p = 19000 dan b + 2p = 11000.","indicator":"Menerjemahkan cerita menjadi model matematika.","feedback":"Memodelkan situasi nyata adalah inti pemahaman."},
     {"id":"B","bloom":"C3","text":"Substitusi b = 11000 − 2p menghasilkan pensil Rp3.000 dan buku Rp5.000.","indicator":"Menerapkan substitusi pada model.","feedback":"Prosedurmu rapi. Apakah jawabannya masuk akal?"},
     {"id":"C","bloom":"C4","text":"Cek dulu apakah kedua persamaan independen sebelum menyelesaikan.","indicator":"Menguji struktur sistem.","feedback":"Menganalisis validitas sebelum menghitung — kebiasaan matematikawan."},
     {"id":"D","bloom":"C5","text":"Model hanya valid bila harga satuan konstan; diskon grosir membuatnya menyesatkan.","indicator":"Mengevaluasi batas keberlakuan model.","feedback":"Evaluasi kritis terhadap asumsi — satu langkah menuju mencipta."}]'::jsonb,
   true),
  (v_ws, v_guru, 'Matematika', 'Sistem Persamaan Linear', 'mcq', array['C3','C4','C5','C6'],
   'Sebuah SPL tiga variabel menghasilkan baris 0 = 0 saat dieliminasi. Bagaimana kamu menyikapinya?',
   '[{"id":"A","bloom":"C3","text":"Lanjutkan eliminasi dan nyatakan satu variabel sebagai parameter.","indicator":"Menjalankan prosedur lanjutan pada kasus khusus.","feedback":"Kamu tahu prosedur solusi parametrik."},
     {"id":"B","bloom":"C4","text":"Baris 0 = 0 berarti satu persamaan kombinasi linear dari yang lain.","indicator":"Menguraikan penyebab struktural.","feedback":"Analisismu menyentuh konsep dependensi linear."},
     {"id":"C","bloom":"C5","text":"Solusi tunggal mustahil; klaim satu jawaban pasti harus ditolak.","indicator":"Menilai kesimpulan yang sah dari kondisi sistem.","feedback":"Berani menolak jawaban tunggal adalah penalaran tingkat tinggi."},
     {"id":"D","bloom":"C6","text":"Merancang soal cerita baru yang sengaja menghasilkan sistem dependen.","indicator":"Mencipta artefak baru dari pemahaman struktur.","feedback":"Mencipta soal dari konsep adalah bukti penguasaan penuh."}]'::jsonb,
   true);
end $$;
