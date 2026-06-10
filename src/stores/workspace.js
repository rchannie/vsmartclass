import { create } from 'zustand'

const KEY = 'vsc-active-workspace'

// Kelas aktif — dipakai lintas halaman (generator, analitik, sesi siswa)
export const useWorkspaceStore = create((set) => ({
  activeId: localStorage.getItem(KEY) || null,
  setActive: (id) => {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
    set({ activeId: id })
  },
}))
