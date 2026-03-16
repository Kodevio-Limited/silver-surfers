import React, { useEffect, useState } from 'react';
import { adminListServices, adminCreateService, adminDeleteService } from '../api';

const AdminServices = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', priceCents: 0, active: true });
  const [error, setError] = useState('');

  const load = async () => {
    const res = await adminListServices();
    if (res.error) setError(res.error); else setItems(res.items || []);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    const res = await adminCreateService({ ...form, priceCents: Number(form.priceCents) || 0 });
    if (res.error) setError(res.error); else { setForm({ name: '', slug: '', description: '', priceCents: 0, active: true }); load(); }
  };

  const onDelete = async (id) => {
    const res = await adminDeleteService(id);
    if (res.error) setError(res.error); else load();
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Manage Services</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={onCreate} style={{ marginBottom: 16 }}>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />{' '}
        <input placeholder="Slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase()})} />{' '}
        <input placeholder="Price (cents)" type="number" value={form.priceCents} onChange={e=>setForm({...form,priceCents:e.target.value})} />{' '}
        <br />
        <textarea placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={4} cols={80} />
        <br />
        <label>
          <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} /> Active
        </label>{' '}
        <button type="submit">Create</button>
      </form>
      <ul>
        {items.map(i => (
          <li key={i._id}>
            <strong>{i.name}</strong> ({i.slug}) - €{(i.priceCents/100).toFixed(2)} {i.active ? '✅' : '⏸️'}
            <button onClick={()=>onDelete(i._id)} style={{ marginLeft: 8 }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminServices;
