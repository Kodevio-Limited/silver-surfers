import React, { useEffect, useState } from 'react';
import { adminListFaqs, adminCreateFaq, adminDeleteFaq } from '../api';

const AdminFaqs = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ question: '', answer: '', order: 0, published: true });
  const [error, setError] = useState('');

  const load = async () => {
    const res = await adminListFaqs();
    if (res.error) setError(res.error); else setItems(res.items || []);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    const res = await adminCreateFaq({ ...form, order: Number(form.order) || 0 });
    if (res.error) setError(res.error); else { setForm({ question: '', answer: '', order: 0, published: true }); load(); }
  };

  const onDelete = async (id) => {
    const res = await adminDeleteFaq(id);
    if (res.error) setError(res.error); else load();
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Manage FAQs</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={onCreate} style={{ marginBottom: 16 }}>
        <input placeholder="Question" value={form.question} onChange={e=>setForm({...form,question:e.target.value})} />{' '}
        <input placeholder="Order" type="number" value={form.order} onChange={e=>setForm({...form,order:e.target.value})} />{' '}
        <br />
        <textarea placeholder="Answer" value={form.answer} onChange={e=>setForm({...form,answer:e.target.value})} rows={4} cols={80} />
        <br />
        <label>
          <input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})} /> Published
        </label>{' '}
        <button type="submit">Create</button>
      </form>
      <ul>
        {items.map(i => (
          <li key={i._id}>
            <strong>#{i.order}</strong> {i.question} {i.published ? '✅' : '⏸️'}
            <button onClick={()=>onDelete(i._id)} style={{ marginLeft: 8 }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminFaqs;
