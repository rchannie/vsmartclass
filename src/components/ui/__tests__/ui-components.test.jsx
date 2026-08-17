import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatCard from '../StatCard'
import StatusTag from '../StatusTag'
import ProgressDots from '../ProgressDots'
import Segmented from '../Segmented'
import Avatar from '../Avatar'

describe('StatCard', () => {
  it('menampilkan label, nilai, dan sub opsional', () => {
    render(<StatCard label="Rata-rata kelas" value="C3.5" sub="≈ level C4" />)
    expect(screen.getByText('Rata-rata kelas')).toBeInTheDocument()
    expect(screen.getByText('C3.5')).toBeInTheDocument()
    expect(screen.getByText('≈ level C4')).toBeInTheDocument()
  })

  it('tidak merender sub bila tidak diberikan', () => {
    render(<StatCard label="Sesi" value={12} />)
    expect(screen.queryByText('≈')).not.toBeInTheDocument()
  })
})

describe('StatusTag', () => {
  it.each([
    ['on-track', 'On-track'],
    ['plateau', 'Plateau'],
    ['attention', 'Perlu perhatian'],
  ])('status %s menampilkan label %s', (status, label) => {
    render(<StatusTag status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('status tak dikenal fallback ke "Perlu perhatian"', () => {
    render(<StatusTag status="entah-apa" />)
    expect(screen.getByText('Perlu perhatian')).toBeInTheDocument()
  })
})

describe('ProgressDots', () => {
  it('label aria mencerminkan soal saat ini dari total', () => {
    render(<ProgressDots total={6} current={2} />)
    expect(screen.getByLabelText('Soal 3 dari 6')).toBeInTheDocument()
  })
})

describe('Segmented', () => {
  it('memanggil onChange dengan value opsi yang diklik', async () => {
    const onChange = vi.fn()
    render(
      <Segmented
        options={[{ value: 'mcq', label: 'Pilihan Ganda' }, { value: 'essay', label: 'Esai' }]}
        value="mcq"
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Esai' }))
    expect(onChange).toHaveBeenCalledWith('essay')
  })

  it('opsi aktif punya aria-selected=true', () => {
    render(<Segmented options={['X', 'XI', 'XII']} value="XI" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'XI' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'X' })).toHaveAttribute('aria-selected', 'false')
  })
})

describe('Avatar', () => {
  it('menampilkan inisial dari dua kata pertama nama', () => {
    render(<Avatar name="Aisyah Putri" />)
    expect(screen.getByText('AP')).toBeInTheDocument()
  })

  it('nama kosong fallback ke "?"', () => {
    render(<Avatar name="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('warna deterministik: nama yang sama menghasilkan warna yang sama', () => {
    const { container: c1 } = render(<Avatar name="Dimas Prasetyo" />)
    const { container: c2 } = render(<Avatar name="Dimas Prasetyo" />)
    expect(c1.firstChild.style.background).toBe(c2.firstChild.style.background)
  })
})
