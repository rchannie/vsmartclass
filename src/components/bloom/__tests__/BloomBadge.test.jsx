import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BloomBadge from '../BloomBadge'

describe('BloomBadge', () => {
  it('menampilkan kode level Bloom', () => {
    render(<BloomBadge code="C4" />)
    expect(screen.getByText('C4')).toBeInTheDocument()
  })

  it('menyertakan nama level saat withName=true', () => {
    render(<BloomBadge code="C6" withName />)
    expect(screen.getByText('C6')).toBeInTheDocument()
    expect(screen.getByText('Mencipta')).toBeInTheDocument()
  })

  it('kode tidak valid tidak merender apa pun (bukan crash)', () => {
    const { container } = render(<BloomBadge code="X9" />)
    expect(container).toBeEmptyDOMElement()
  })
})
