import React, { useEffect, useState } from 'react';
import {
  adminListBlog, adminCreateBlog, adminDeleteBlog, adminUpdateBlog,
  adminListFaqs, adminCreateFaq, adminDeleteFaq, adminUpdateFaq,
  adminListAnalysis, adminRerunAnalysis, getMe,
  adminListContact, adminUpdateContact, adminDeleteContact
} from '../api';

const AdminContentManager = () => {
  const [view, setView] = useState('blog'); // 'blog' | 'faqs' | 'analysis' | 'contact'
  const [user, setUser] = useState(null);
  const [blog, setBlog] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [error, setError] = useState('');
  const [blogForm, setBlogForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', date: '', readTime: '', featured: false, published: false });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', order: 0, published: true });
  const [analysis, setAnalysis] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisQuery, setAnalysisQuery] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('all');
  // Blog view UI state
  const [postQuery, setPostQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', date: '', readTime: '', featured: false, published: false });
  // FAQ view UI state
  const [faqQuery, setFaqQuery] = useState('');
  const [showFaqCreate, setShowFaqCreate] = useState(false);
  const [faqEditingId, setFaqEditingId] = useState(null);
  const [faqEditForm, setFaqEditForm] = useState({ question: '', answer: '', order: 0, published: true });
  // Contact view state
  const [contact, setContact] = useState([]);
  const [contactStatus, setContactStatus] = useState('all');
  const [contactQuery, setContactQuery] = useState('');
  const loadContact = async () => {
    const params = {};
    if (contactStatus !== 'all') params.status = contactStatus;
    const res = await adminListContact(params);
    let items = res.items || [];
    if (contactQuery) {
      const q = contactQuery.toLowerCase();
      items = items.filter(m => [m.name,m.email,m.subject,m.message].some(v => (v||'').toLowerCase().includes(q)));
    }
    setContact(items);
  };

  const loadBlog = async () => {
    const res = await adminListBlog();
    if (res.error) setError(res.error); else setBlog(res.items || []);
  };
  const loadFaqs = async () => {
    const res = await adminListFaqs();
    if (res.error) setError(res.error); else setFaqs(res.items || []);
  };
  const loadAnalysis = async (status = analysisStatus) => {
    try {
      setAnalysisLoading(true); setAnalysisError('');
      const params = { limit: 200 };
      if (status && status !== 'all') params.status = status;
      const res = await adminListAnalysis(params);
      if (res.error) { setAnalysisError(res.error); setAnalysis([]); }
      else {
        let items = Array.isArray(res.items) ? res.items : [];
        if (analysisQuery) {
          const q = analysisQuery.toLowerCase();
          items = items.filter(r => (r.url||'').toLowerCase().includes(q) || (r.email||'').toLowerCase().includes(q) || (r.taskId||'').toLowerCase().includes(q));
        }
        setAnalysis(items);
      }
    } finally { setAnalysisLoading(false); }
  };

  useEffect(() => {
    (async () => {
      const me = await getMe();
      if (me?.user) setUser(me.user);
      if (!me?.user || me?.user?.role !== 'admin') {
        setError(me?.error || 'Not admin');
        return;
      }
      await Promise.allSettled([loadBlog(), loadFaqs(), loadContact()]);
    })();
  }, []);

  useEffect(() => {
    if (view === 'analysis') loadAnalysis();
    if (view === 'contact') loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, analysisStatus]);

  useEffect(() => {
    if (view === 'analysis') {
      // Refilter locally on query change without refetch
      loadAnalysis(analysisStatus);
    }
    if (view === 'contact') loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisQuery]);

  const submitBlog = async (e) => {
    e.preventDefault(); setError('');
    const payload = { ...blogForm };
    if (payload.date) payload.date = new Date(payload.date).toISOString();
    const res = await adminCreateBlog(payload);
    if (res.error) setError(res.error); else { setBlogForm({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', date: '', readTime: '', featured: false, published: false }); setShowCreate(false); loadBlog(); }
  };
  const removeBlog = async (id) => {
    const res = await adminDeleteBlog(id); if (res.error) setError(res.error); else loadBlog();
  };
  const startEdit = (item) => {
    setEditingId(item._id);
    setEditForm({
      title: item.title || '',
      slug: (item.slug || '').toLowerCase(),
      excerpt: item.excerpt || '',
      content: item.content || '',
      category: item.category || '',
      author: item.author || '',
      date: item.date ? new Date(item.date).toISOString().slice(0,10) : '',
      readTime: item.readTime || '',
      featured: !!item.featured,
      published: !!item.published,
    });
  };
  const cancelEdit = () => { setEditingId(null); };
  const saveEdit = async (id) => {
    setError('');
    const payload = { ...editForm, slug: (editForm.slug || '').toLowerCase() };
    if (payload.date) payload.date = new Date(payload.date).toISOString();
    const res = await adminUpdateBlog(id, payload);
    if (res?.error) { setError(res.error); return; }
    setEditingId(null);
    await loadBlog();
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const submitFaq = async (e) => {
    e.preventDefault(); setError('');
    const res = await adminCreateFaq({ ...faqForm, order: Number(faqForm.order) || 0 });
    if (res.error) setError(res.error); else { setFaqForm({ question: '', answer: '', order: 0, published: true }); setShowFaqCreate(false); loadFaqs(); }
  };
  const removeFaq = async (id) => {
    const res = await adminDeleteFaq(id); if (res.error) setError(res.error); else loadFaqs();
  };
  const startFaqEdit = (item) => {
    setFaqEditingId(item._id);
    setFaqEditForm({
      question: item.question || '',
      answer: item.answer || '',
      order: Number(item.order) || 0,
      published: !!item.published,
    });
  };
  const cancelFaqEdit = () => { setFaqEditingId(null); };
  const saveFaqEdit = async (id) => {
    setError('');
    const payload = { ...faqEditForm, order: Number(faqEditForm.order) || 0 };
    const res = await adminUpdateFaq(id, payload);
    if (res?.error) { setError(res.error); return; }
    setFaqEditingId(null);
    await loadFaqs();
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 md:px-10 bg-gradient-to-br from-gray-950 via-blue-950 to-green-950 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="heading-page font-bold tracking-tight bg-gradient-to-r from-blue-400 via-green-500 to-teal-400 text-transparent bg-clip-text">Content Administration</h1>
            <p className="text-sm text-gray-300 mt-2">Manage blog posts & FAQs. Review analysis queue and re-run jobs.</p>
          </div>
        </div>

        <div className='mb-10 flex justify-center'>
          <div className='relative'>
            <select
              value={view}
              onChange={e=> setView(e.target.value)}
              className='appearance-none w-72 md:w-96 text-lg font-semibold px-6 py-4 pr-12 rounded-2xl bg-gray-900/70 backdrop-blur border border-white/25 hover:bg-gray-900/80 focus:outline-none focus:ring-4 ring-blue-500/40 shadow-xl text-white tracking-wide'
            >
              <option value='blog' className='text-gray-900'>Blog Posts</option>
              <option value='faqs' className='text-gray-900'>FAQs</option>
              <option value='analysis' className='text-gray-900'>Analysis Queue</option>
              <option value='contact' className='text-gray-900'>Contact Messages</option>
            </select>
            <div className='pointer-events-none absolute inset-y-0 right-4 flex items-center text-blue-200'>
              <svg className='w-5 h-5' viewBox='0 0 24 24' stroke='currentColor' fill='none' strokeWidth='2'><path strokeLinecap='round' strokeLinejoin='round' d='M6 9l6 6 6-6'/></svg>
            </div>
          </div>
        </div>
        {error && <p className="text-red-300 text-sm mb-6 text-center">{error}</p>}

        {view==='blog' && (() => {
          const items = (postQuery
            ? blog.filter(b => (
                (b.title||'').toLowerCase().includes(postQuery.toLowerCase()) ||
                (b.slug||'').toLowerCase().includes(postQuery.toLowerCase()) ||
                (b.excerpt||'').toLowerCase().includes(postQuery.toLowerCase()) ||
                (b.content||'').toLowerCase().includes(postQuery.toLowerCase())
              ))
            : blog);
          return (
            <section className="space-y-6">
              <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold">Posts</h2>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="flex-1 md:w-96 relative">
                    <input value={postQuery} onChange={e=> setPostQuery(e.target.value)} placeholder="Search posts..." className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 outline-none focus:ring-2 ring-blue-500/50 placeholder-blue-200/70" />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/70">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103 10.5a7.5 7.5 0 0013.65 6.15z"/></svg>
                    </span>
                  </div>
                  <button onClick={() => setShowCreate(s => !s)} className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-700/20 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14"/></svg>
                    <span className="hidden sm:inline">Add</span>
                  </button>
                  <button onClick={() => { setPostQuery(''); setShowCreate(false); setEditingId(null); }} className="px-4 py-2.5 rounded-2xl bg-green-700/80 hover:bg-green-600 text-white font-semibold shadow flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>
              </header>

              {showCreate && (
                <div className="rounded-3xl p-5 bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                  <h3 className="font-semibold mb-3">Create Blog Post</h3>
                  <form onSubmit={submitBlog} className="grid md:grid-cols-2 gap-4">
                    <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:ring-2 ring-blue-500/40" placeholder="Title" value={blogForm.title} onChange={e=>setBlogForm({...blogForm,title:e.target.value})} />
                    <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:ring-2 ring-blue-500/40" placeholder="Slug" value={blogForm.slug} onChange={e=>setBlogForm({...blogForm,slug:e.target.value.toLowerCase()})} />
                    <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 md:col-span-2 focus:ring-2 ring-blue-500/40" placeholder="Excerpt" value={blogForm.excerpt} onChange={e=>setBlogForm({...blogForm,excerpt:e.target.value})} />
                    <textarea rows={6} className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 md:col-span-2 focus:ring-2 ring-blue-500/40" placeholder="Content" value={blogForm.content} onChange={e=>setBlogForm({...blogForm,content:e.target.value})} />
                    <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Category" value={blogForm.category} onChange={e=>setBlogForm({...blogForm,category:e.target.value})} />
                    <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Author" value={blogForm.author} onChange={e=>setBlogForm({...blogForm,author:e.target.value})} />
                    <input type="date" className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Date" value={blogForm.date} onChange={e=>setBlogForm({...blogForm,date:e.target.value})} />
                    <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Read time (e.g., '6 min read')" value={blogForm.readTime} onChange={e=>setBlogForm({...blogForm,readTime:e.target.value})} />
                    <div className="flex items-center gap-4 md:col-span-2">
                      <label className="text-sm"><input type="checkbox" className="mr-2" checked={blogForm.featured} onChange={e=>setBlogForm({...blogForm,featured:e.target.checked})} /> Featured</label>
                      <label className="text-sm"><input type="checkbox" className="mr-2" checked={blogForm.published} onChange={e=>setBlogForm({...blogForm,published:e.target.checked})} /> Published</label>
                      <div className="ml-auto flex gap-3">
                        <button type="button" onClick={()=> setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Close</button>
                        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-green-500">Create</button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(b => (
                  <div key={b._id} className="relative p-5 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-blue-400/30 transition shadow-lg">
                    <div className="flex gap-4">
                      <div className="min-w-0 flex-1">
                        {editingId === b._id ? (
                          <div className="space-y-2">
                            <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Title" value={editForm.title} onChange={e=> setEditForm({...editForm, title: e.target.value})} />
                            <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Slug" value={editForm.slug} onChange={e=> setEditForm({...editForm, slug: e.target.value.toLowerCase()})} />
                            <textarea rows={3} className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Excerpt" value={editForm.excerpt} onChange={e=> setEditForm({...editForm, excerpt: e.target.value})} />
                            <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Category" value={editForm.category} onChange={e=> setEditForm({...editForm, category: e.target.value})} />
                            <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Author" value={editForm.author} onChange={e=> setEditForm({...editForm, author: e.target.value})} />
                            <input type="date" className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Date" value={editForm.date} onChange={e=> setEditForm({...editForm, date: e.target.value})} />
                            <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Read time (e.g., '6 min read')" value={editForm.readTime} onChange={e=> setEditForm({...editForm, readTime: e.target.value})} />
                            <label className="text-sm block"><input type="checkbox" className="mr-2" checked={!!editForm.published} onChange={e=> setEditForm({...editForm, published: e.target.checked})} /> Published</label>
                            <label className="text-sm block"><input type="checkbox" className="mr-2" checked={!!editForm.featured} onChange={e=> setEditForm({...editForm, featured: e.target.checked})} /> Featured</label>
                            <div className="flex gap-3">
                              <button onClick={() => saveEdit(b._id)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold">Save</button>
                              <button onClick={cancelEdit} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-semibold leading-snug truncate" title={b.title}>{b.title}</h3>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-blue-200/90">
                              <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">{(b.slug||'').toUpperCase()}</span>
                              <span className={`px-2 py-0.5 rounded-full border ${b.published? 'bg-blue-600/60 border-blue-500/40' : 'bg-gray-600/50 border-white/10'}`}>{b.published? 'PUBLISHED' : 'DRAFT'}</span>
                              {b.featured && <span className="px-2 py-0.5 rounded-full bg-yellow-600/60 border border-yellow-500/40">FEATURED</span>}
                              {b.createdAt && <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">{formatDate(b.createdAt)}</span>}
                            </div>
                            {b.excerpt && <p className="mt-2 text-sm text-blue-100/90 line-clamp-3">{b.excerpt}</p>}
                            <div className="mt-2 text-xs text-blue-200/80 flex flex-wrap gap-2">
                              {b.category && <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">{b.category}</span>}
                              {b.author && <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">By {b.author}</span>}
                              {b.date && <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">{formatDate(b.date)}</span>}
                              {b.readTime && <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">{b.readTime}</span>}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        {editingId === b._id ? null : (
                          <>
                            <button onClick={() => startEdit(b)} className="p-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15" title="Edit">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487l3.651 3.651M4.5 19.5l4.2-.6 11.813-11.812a2.1 2.1 0 10-2.97-2.97L5.73 15.93l-.6 4.2z"/></svg>
                            </button>
                            <button onClick={() => { if (window.confirm('Delete this post?')) removeBlog(b._id); }} className="p-2 rounded-xl bg-white/10 border border-white/15 hover:bg-red-500/20 text-red-300" title="Delete">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 0v12a2 2 0 002 2h4a2 2 0 002-2V7"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {items.length===0 && <div className="text-sm text-gray-300">No posts</div>}
              </div>
            </section>
          );
        })()}

        {view==='faqs' && (() => {
          const items = (faqQuery
            ? faqs.filter(f => (
                (f.question||'').toLowerCase().includes(faqQuery.toLowerCase()) ||
                (String(f.order)||'').toLowerCase().includes(faqQuery.toLowerCase()) ||
                (f.answer||'').toLowerCase().includes(faqQuery.toLowerCase())
              ))
            : faqs);
          return (
            <section className="space-y-6">
              <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold">FAQs</h2>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="flex-1 md:w-96 relative">
                    <input value={faqQuery} onChange={e=> setFaqQuery(e.target.value)} placeholder="Search FAQs..." className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 outline-none focus:ring-2 ring-blue-500/50 placeholder-green-200/70" />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/70">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103 10.5a7.5 7.5 0 0013.65 6.15z"/></svg>
                    </span>
                  </div>
                  <button onClick={() => setShowFaqCreate(s => !s)} className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-700/20 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14"/></svg>
                    <span className="hidden sm:inline">Add</span>
                  </button>
                  <button onClick={() => { setFaqQuery(''); setShowFaqCreate(false); setFaqEditingId(null); }} className="px-4 py-2.5 rounded-2xl bg-green-700/80 hover:bg-green-600 text-white font-semibold shadow flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>
              </header>

              {showFaqCreate && (
                <div className="rounded-3xl p-5 bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                  <h3 className="font-semibold mb-3">Create FAQ</h3>
                  <form onSubmit={submitFaq} className="grid md:grid-cols-2 gap-4">
                    <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 md:col-span-2" placeholder="Question" value={faqForm.question} onChange={e=>setFaqForm({...faqForm,question:e.target.value})} />
                    <input type="number" className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Order" value={faqForm.order} onChange={e=>setFaqForm({...faqForm,order:e.target.value})} />
                    <textarea rows={4} className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 md:col-span-2" placeholder="Answer" value={faqForm.answer} onChange={e=>setFaqForm({...faqForm,answer:e.target.value})} />
                    <div className="flex items-center gap-4 md:col-span-2">
                      <label className="text-sm"><input type="checkbox" className="mr-2" checked={faqForm.published} onChange={e=>setFaqForm({...faqForm,published:e.target.checked})} /> Published</label>
                      <div className="ml-auto flex gap-3">
                        <button type="button" onClick={()=> setShowFaqCreate(false)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Close</button>
                        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-green-500">Create</button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(f => (
                  <div key={f._id} className="relative p-5 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-blue-400/30 transition shadow-lg">
                    <div className="flex gap-4">
                      <div className="min-w-0 flex-1">
                        {faqEditingId === f._id ? (
                          <div className="space-y-2">
                            <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Question" value={faqEditForm.question} onChange={e=> setFaqEditForm({...faqEditForm, question: e.target.value})} />
                            <input type="number" className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Order" value={faqEditForm.order} onChange={e=> setFaqEditForm({...faqEditForm, order: e.target.value})} />
                            <textarea rows={3} className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20" placeholder="Answer" value={faqEditForm.answer} onChange={e=> setFaqEditForm({...faqEditForm, answer: e.target.value})} />
                            <label className="text-sm block"><input type="checkbox" className="mr-2" checked={!!faqEditForm.published} onChange={e=> setFaqEditForm({...faqEditForm, published: e.target.checked})} /> Published</label>
                            <div className="flex gap-3">
                              <button onClick={() => saveFaqEdit(f._id)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold">Save</button>
                              <button onClick={cancelFaqEdit} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-semibold leading-snug" title={f.question}>#{f.order} {f.question}</h3>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-blue-200/90">
                              <span className={`px-2 py-0.5 rounded-full border ${f.published? 'bg-blue-600/60 border-blue-500/40' : 'bg-gray-600/50 border-white/10'}`}>{f.published? 'PUBLISHED' : 'DRAFT'}</span>
                              {f.createdAt && <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">{formatDate(f.createdAt)}</span>}
                            </div>
                            {f.answer && <p className="mt-2 text-sm text-blue-100/90 line-clamp-3">{f.answer}</p>}
                          </>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        {faqEditingId === f._id ? null : (
                          <>
                            <button onClick={() => startFaqEdit(f)} className="p-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15" title="Edit">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487l3.651 3.651M4.5 19.5l4.2-.6 11.813-11.812a2.1 2.1 0 10-2.97-2.97L5.73 15.93l-.6 4.2z"/></svg>
                            </button>
                            <button onClick={() => { if (window.confirm('Delete this FAQ?')) removeFaq(f._id); }} className="p-2 rounded-xl bg-white/10 border border-white/15 hover:bg-red-500/20 text-red-300" title="Delete">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 0v12a2 2 0 002 2h4a2 2 0 002-2V7"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {items.length===0 && <div className="text-sm text-gray-300">No FAQs</div>}
              </div>
            </section>
          );
        })()}

        {view==='analysis' && (
          <section className='relative mb-14 -mt-4'>
            <header className='flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between'>
              <h2 className='text-xl font-semibold flex items-center gap-3'>
                <span className='w-2 h-2 rounded-full bg-blue-400 animate-pulse'></span> Analysis Requests
              </h2>
              <div className='flex flex-col md:flex-row gap-3 w-full md:w-auto items-stretch md:items-center'>
                <div className='flex gap-3 w-full'>
                  <input value={analysisQuery} onChange={e=> setAnalysisQuery(e.target.value)} placeholder='Search (url, email, taskId)...' className='flex-1 md:w-80 px-3 py-2 rounded-lg bg-white/10 text-sm outline-none focus:ring-2 ring-blue-500/50' />
                  <select value={analysisStatus} onChange={e=> setAnalysisStatus(e.target.value)} className='px-3 py-2 rounded-lg bg-white/10 text-sm outline-none focus:ring-2 ring-blue-500/50 text-white'>
                    <option value='all' className='text-black'>All</option>
                    <option value='queued' className='text-black'>Queued</option>
                    <option value='processing' className='text-black'>Processing</option>
                    <option value='completed' className='text-black'>Completed</option>
                    <option value='failed' className='text-black'>Failed</option>
                  </select>
                </div>
                <button onClick={()=> loadAnalysis()} className='px-4 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-xs font-semibold shadow'>Refresh</button>
              </div>
            </header>
            {analysisError && <div className='text-sm text-red-300 mb-2'>{analysisError}</div>}
            <div className='rounded-xl bg-gradient-to-br from-white/10 to-white/5 p-4 border border-white/10 max-h-[36rem] overflow-y-auto space-y-4'>
              {analysis.map(rec => {
                const computedStatus = (rec.status || '');
                return (
                  <div key={rec._id || rec.taskId} className='p-4 rounded-lg bg-black/30 border border-white/10 hover:border-green-400/40 transition'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap gap-2 items-center mb-1'>
                          <span className='font-medium break-all'>{rec.url}</span>
                          <span className='text-xs px-2 py-0.5 rounded-full bg-white/10'>{rec.email}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${computedStatus==='completed'?'bg-blue-600/70': computedStatus==='failed'?'bg-red-600/70': computedStatus==='processing'?'bg-blue-600/70':'bg-gray-600/60'}`}>{(computedStatus||'').toUpperCase()}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${rec.emailStatus==='sent'?'bg-blue-600/60': rec.emailStatus==='failed'?'bg-red-600/60': rec.emailStatus==='sending'?'bg-blue-600/60':'bg-gray-600/50'}`}>EMAIL {(rec.emailStatus||'').toUpperCase()}</span>
                        </div>
                        <div className='text-[11px] text-gray-300 flex flex-wrap gap-4'>
                          <span>Task: {rec.taskId}</span>
                          <span>Created {rec.createdAt ? new Date(rec.createdAt).toLocaleString() : ''}</span>
                          {typeof rec.attachmentCount==='number' && <span>PDFs: {rec.attachmentCount}</span>}
                          {rec.reportDirectory && <span className='truncate max-w-xs'>Dir: {rec.reportDirectory}</span>}
                        </div>
                        {rec.failureReason && <div className='mt-1 text-[11px] text-red-300'>Reason: {rec.failureReason}</div>}
                        {rec.emailError && <div className='mt-1 text-[11px] text-red-400'>Email Error: {rec.emailError}</div>}
                      </div>
                      <div className='flex flex-col gap-2 shrink-0'>
                        {rec.email && rec.url && (
                          <button onClick={async ()=>{
                            if(!window.confirm('Re-run this analysis now?')) return;
                            const idOrTaskId = rec._id || rec.taskId;
                            const resp = await adminRerunAnalysis(idOrTaskId);
                            if(resp?.error){ alert(resp.error); }
                            else { alert('Re-run queued for existing record'); loadAnalysis(); }
                          }} className='px-3 py-1.5 rounded bg-green-600/70 hover:bg-green-500 text-[11px] font-semibold'>Re-run</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {analysis.length===0 && !analysisLoading && <div className='text-sm text-gray-400 italic'>No records.</div>}
              {analysisLoading && <div className='text-sm text-gray-400 italic'>Loading...</div>}
            </div>
          </section>
        )}

        {view==='contact' && (
          <section className='relative mb-14 -mt-4'>
            <header className='flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between'>
              <h2 className='text-xl font-semibold flex items-center gap-3'>
                <span className='w-2 h-2 rounded-full bg-green-400'></span> Contact Messages
              </h2>
              <div className='flex flex-col md:flex-row gap-3 w-full md:w-auto items-stretch md:items-center'>
                <div className='flex gap-3 w-full'>
                  <input value={contactQuery} onChange={e=> setContactQuery(e.target.value)} placeholder='Search (name, email, subject, message)...' className='flex-1 md:w-80 px-3 py-2 rounded-lg bg-white/10 text-sm outline-none focus:ring-2 ring-green-500/50' />
                  <select value={contactStatus} onChange={e=> setContactStatus(e.target.value)} className='px-3 py-2 rounded-lg bg-white/10 text-sm outline-none focus:ring-2 ring-green-500/50 text-white'>
                    <option value='all' className='text-black'>All</option>
                    <option value='new' className='text-black'>New</option>
                    <option value='read' className='text-black'>Read</option>
                    <option value='closed' className='text-black'>Closed</option>
                  </select>
                </div>
                <button onClick={()=> loadContact()} className='px-4 py-2 rounded-lg bg-green-600/80 hover:bg-green-500 text-xs font-semibold shadow'>Refresh</button>
              </div>
            </header>
            <div className='rounded-xl bg-gradient-to-br from-white/10 to-white/5 p-4 border border-white/10 max-h-[36rem] overflow-y-auto space-y-4'>
              {contact.map(msg => (
                <div key={msg._id} className='p-4 rounded-lg bg-black/30 border border-white/10 hover:border-green-400/40 transition'>
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap gap-2 items-center mb-1'>
                        <span className='font-medium break-all'>{msg.subject || 'No subject'}</span>
                        <span className='text-xs px-2 py-0.5 rounded-full bg-white/10'>{msg.email || 'Anonymous'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${msg.status==='new'?'bg-blue-600/70': msg.status==='read'?'bg-blue-600/70':'bg-gray-600/70'}`}>{(msg.status||'new').toUpperCase()}</span>
                        {msg.createdAt && <span className='text-[10px] px-2 py-0.5 rounded-full bg-white/10'>{new Date(msg.createdAt).toLocaleString()}</span>}
                      </div>
                      {msg.name && <div className='text-xs text-gray-300 mb-1'>From: {msg.name}</div>}
                      <div className='text-sm text-gray-200 whitespace-pre-wrap break-words'>{msg.message}</div>
                    </div>
                    <div className='flex flex-col gap-2 shrink-0'>
                      {msg.status !== 'read' && <button onClick={async ()=>{ await adminUpdateContact(msg._id, { status:'read' }); loadContact(); }} className='px-3 py-1.5 rounded bg-green-600/70 hover:bg-green-500 text-[11px] font-semibold'>Mark Read</button>}
                      {msg.status !== 'closed' && <button onClick={async ()=>{ await adminUpdateContact(msg._id, { status:'closed' }); loadContact(); }} className='px-3 py-1.5 rounded bg-blue-600/70 hover:bg-green-500 text-[11px] font-semibold'>Close</button>}
                      <button onClick={async ()=>{ if(!window.confirm('Delete this message?')) return; await adminDeleteContact(msg._id); loadContact(); }} className='px-3 py-1.5 rounded bg-red-600/70 hover:bg-red-500 text-[11px] font-semibold'>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {contact.length===0 && <div className='text-sm text-gray-400 italic'>No messages.</div>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminContentManager;

