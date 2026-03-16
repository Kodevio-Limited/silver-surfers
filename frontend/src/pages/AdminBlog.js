import React, { useEffect, useState } from 'react';
import { adminListBlog, adminCreateBlog, adminDeleteBlog } from '../api';

const AdminBlog = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', published: false });
  const [error, setError] = useState('');

  const load = async () => {
    const res = await adminListBlog();
    if (res.error) setError(res.error); else setItems(res.items || []);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    const res = await adminCreateBlog(form);
    if (res.error) setError(res.error); else { setForm({ title: '', slug: '', excerpt: '', content: '', published: false }); load(); }
  };

  const onDelete = async (id) => {
    const res = await adminDeleteBlog(id);
    if (res.error) setError(res.error); else load();
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Manage Blog</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={onCreate} style={{ marginBottom: 16 }}>
        <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />{' '}
        <input placeholder="Slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase()})} />{' '}
        <input placeholder="Excerpt" value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})} />{' '}
        <br />
        <textarea placeholder="Content" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} rows={6} cols={80} />
        <br />
        <label>
          <input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})} /> Published
        </label>{' '}
        <button type="submit">Create</button>
      </form>
      <ul>
        {items.map(i => (
          <li key={i._id}>
            <strong>{i.title}</strong> ({i.slug}) {i.published ? '✅' : '⏸️'}
            <button onClick={()=>onDelete(i._id)} style={{ marginLeft: 8 }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminBlog;
