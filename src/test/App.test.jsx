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

  it('renders all 8 module names on home', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    )
    const moduleNames = [
      'World View',
      'Endogenous Drivers',
      'Exogenous Drivers',
      'Emerging Markets',
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
      <MemoryRouter initialEntries={['/world-view']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getByText('WORLD VIEW')).toBeInTheDocument()
  })

  it('renders data center hub page', () => {
    render(
      <MemoryRouter initialEntries={['/data']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getByText('Data Center')).toBeInTheDocument()
    expect(screen.getByText('Raw Data')).toBeInTheDocument()
    expect(screen.getByText('Coverage Matrix')).toBeInTheDocument()
    expect(screen.getByText('History Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Model Inputs')).toBeInTheDocument()
  })

  it('renders raw data page', () => {
    render(
      <MemoryRouter initialEntries={['/data/raw']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getByText('RAW DATA')).toBeInTheDocument()
    expect(screen.getByText('REFRESH TODO')).toBeInTheDocument()
  })
})





