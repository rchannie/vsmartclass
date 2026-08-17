// Setup global untuk Vitest + React Testing Library.
//
// Catatan: script npm test* menjalankan Node dengan
// NODE_OPTIONS=--no-experimental-webstorage. Tanpa ini, Node 22+ punya
// `localStorage` global bawaan sendiri yang bentrok dengan punya jsdom
// (versi Node-nya tidak berfungsi penuh — `.clear()` gagal) — kode di
// src/lib/demo.js memakai `localStorage` global apa adanya, jadi harus
// jsdom punya yang menang.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
