import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../AppRoutes'

describe('App', () => {
  it('renders home page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    )
    const titles = screen.getAllByText('POLARIS')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders all 7 module names on home', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    )
    const moduleNames = [
      'World View',
      'Endogenous Drivers',
      'Exogenous Drivers',
      'Timing the Market',
      'Risk Management',
      'Execution & Costs',
      'Self-Awareness',
    ]
    moduleNames.forEach((name) => {
      const elements = screen.getAllByText(name)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders world view theory page', () => {
    render(
      <MemoryRouter initialEntries={['/world-view']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getAllByText('ESTRUCTURA DEL MODULO').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('DOCUMENTACION')).toBeInTheDocument()
    expect(screen.getAllByText('CHEATSHEET OPERATIVO').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('FUENTES')).toBeInTheDocument()
    expect(screen.getByText('MINIMO VIABLE (MVP)')).toBeInTheDocument()
    expect(screen.getByText('NICE TO HAVE')).toBeInTheDocument()
  })

  it('renders world view ops page', () => {
    render(
      <MemoryRouter initialEntries={['/world-view/operativa']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getByText('OPERATIVA — WORLD VIEW')).toBeInTheDocument()
    expect(screen.getByText('WorldView State Vector')).toBeInTheDocument()
  })
})





