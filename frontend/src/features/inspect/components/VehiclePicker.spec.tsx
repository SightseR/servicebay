import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VehiclePicker } from './VehiclePicker';
import type { VehicleSelection } from './VehiclePicker';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function Harness() {
  const [selection, setSelection] = useState<VehicleSelection>(null);
  return <VehiclePicker selection={selection} onChange={setSelection} />;
}

describe('VehiclePicker', () => {
  afterEach(() => vi.restoreAllMocks());

  it('finds an existing vehicle by registration', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, {
      id: 'v1', regNumber: 'DW 769DN', brand: 'Toyota', model: 'Corolla', year: 2018,
      gearbox: 'AUTO', motivePower: 'PETROL', driveMode: 'FRONT', ownerName: 'Jane Doe', ownerPhone: null, ownerEmail: null,
    })));
    render(<Harness />);
    await userEvent.type(screen.getByPlaceholderText(/enter registration/i), 'DW769DN', { delay: 1 });
    expect(await screen.findByText('Toyota Corolla · 2018')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('offers to register a new vehicle when none is found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes(200, null)));
    render(<Harness />);
    await userEvent.type(screen.getByPlaceholderText(/enter registration/i), 'ZZ999', { delay: 1 });
    const registerBtn = await screen.findByRole('button', { name: /register as a new vehicle/i });
    await userEvent.click(registerBtn);
    expect(screen.getByText('New vehicle')).toBeInTheDocument();
    expect(screen.getByLabelText('Brand')).toBeInTheDocument();
  });

  it('"Change vehicle" clears the selection back to search', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, {
      id: 'v1', regNumber: 'DW 769DN', brand: 'Toyota', model: 'Corolla', year: null,
      gearbox: null, motivePower: null, driveMode: null, ownerName: null, ownerPhone: null, ownerEmail: null,
    })));
    render(<Harness />);
    await userEvent.type(screen.getByPlaceholderText(/enter registration/i), 'DW769DN', { delay: 1 });
    await screen.findByText(/Toyota Corolla/);
    await userEvent.click(screen.getByRole('button', { name: /change vehicle/i }));
    expect(screen.getByPlaceholderText(/enter registration/i)).toBeInTheDocument();
  });
});
