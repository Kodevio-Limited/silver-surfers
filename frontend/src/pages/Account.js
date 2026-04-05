import React, { useEffect, useState } from 'react';
import { listMyAnalysis, listMyQuickScans, rerunMyAnalysis, rerunMyQuickScan, getMe, getSubscription } from '../api';
import { useNavigate } from 'react-router-dom';
import './About.css';

const StatusPill = ({ value }) => {
  const cls = value==='completed' ? 'bg-emerald-600/70' : value==='failed' ? 'bg-red-600/70' : value==='processing' ? 'bg-blue-600/70' : 'bg-gray-600/60';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls}`}>{String(value||'queued').toUpperCase()}</span>;
};

const EmailPill = ({ value }) => {
  const cls = value==='sent' ? 'bg-emerald-600/60' : value==='failed' ? 'bg-red-600/60' : value==='sending' ? 'bg-blue-600/60' : 'bg-gray-600/50';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls}`}>EMAIL {String(value||'pending').toUpperCase()}</span>;
};

const ScorePill = ({ value }) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  const cls = rounded >= 80 ? 'bg-emerald-600/60' : rounded >= 70 ? 'bg-amber-600/60' : 'bg-red-600/60';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls}`}>SILVER SCORE {rounded}</span>;
};

const RiskPill = ({ value }) => {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  const cls = normalized === 'low' ? 'bg-emerald-700/50' : normalized === 'medium' ? 'bg-amber-700/50' : 'bg-red-700/50';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls}`}>RISK {normalized.toUpperCase()}</span>;
};

const QUICK_SCAN_STEPS = ['Pending', 'Queued', 'Complete'];

const getQuickScanStepIndex = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'completed') return 2;
  if (normalized === 'queued' || normalized === 'processing') return 1;
  return 0;
};

const getQuickScanStatusLabel = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'processing') return 'Queued';
  if (normalized === 'failed') return 'Failed';
  if (normalized) return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return 'Pending';
};

const QuickScanStatusLine = ({ value }) => {
  const activeIndex = getQuickScanStepIndex(value);
  const failed = String(value || '').toLowerCase() === 'failed';

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2 text-[11px] text-gray-300'>
        <span className='font-semibold uppercase tracking-[0.2em] text-gray-400'>Current status</span>
        <span className={failed ? 'text-red-300' : 'text-green-300'}>{getQuickScanStatusLabel(value)}</span>
      </div>
      <div className='grid grid-cols-3 gap-2'>
        {QUICK_SCAN_STEPS.map((step, index) => {
          const isActive = index <= activeIndex;
          return (
            <div key={step} className='flex items-center gap-2 min-w-0'>
              <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${failed && index === activeIndex ? 'bg-red-400' : isActive ? 'bg-green-400' : 'bg-white/15'}`} />
              <span className={`text-[11px] uppercase tracking-[0.18em] ${failed && index === activeIndex ? 'text-red-300' : isActive ? 'text-white' : 'text-gray-500'}`}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Account() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [quickScans, setQuickScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditError, setAuditError] = useState('');
  const [quickScanError, setQuickScanError] = useState('');
  const [rerunningKey, setRerunningKey] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [subscription, setSubscription] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setAuditError('');
    setQuickScanError('');
    const [analysisRes, quickScanRes] = await Promise.all([
      listMyAnalysis({ limit: 200 }),
      listMyQuickScans({ limit: 200 }),
    ]);

    if (analysisRes?.error) {
      setAuditError(analysisRes.error);
      setItems([]);
    } else {
      setItems(Array.isArray(analysisRes.items) ? analysisRes.items : []);
    }

    if (quickScanRes?.error) {
      setQuickScanError(quickScanRes.error);
      setQuickScans([]);
    } else {
      setQuickScans(Array.isArray(quickScanRes.items) ? quickScanRes.items : []);
    }

    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const me = await getMe();
      if (!me?.user) { setUser(null); setLoading(false); return; }
      setUser(me.user);
      
      // Load subscription data
      try {
        const subResult = await getSubscription();
        if (subResult.subscription) {
          setSubscription(subResult.subscription);
        }
      } catch (err) {
        console.log('No subscription found');
      }
      
      await load();
    })();
  }, []);

  const filtered = items.filter(r => {
    const matchQ = q ? ((r.url||'').toLowerCase().includes(q.toLowerCase()) || (r.taskId||'').toLowerCase().includes(q.toLowerCase())) : true;
    const matchStatus = status==='all' ? true : (r.status===status);
    return matchQ && matchStatus;
  });

  const filteredQuickScans = quickScans.filter(scan => {
    const matchQ = q
      ? ((scan.url || '').toLowerCase().includes(q.toLowerCase()) || (scan.email || '').toLowerCase().includes(q.toLowerCase()))
      : true;
    const matchStatus = status === 'all' ? true : (scan.status === status);
    return matchQ && matchStatus;
  });

  const handleRerunAnalysis = async (taskId) => {
    if (!taskId) return;
    setRerunningKey(`analysis:${taskId}`);
    setAuditError('');
    const result = await rerunMyAnalysis(taskId);
    setRerunningKey('');

    if (result?.error) {
      setAuditError(result.error);
      return;
    }

    await load();
  };

  const handleRerunQuickScan = async (quickScanId) => {
    if (!quickScanId) return;
    setRerunningKey(`quick:${quickScanId}`);
    setQuickScanError('');
    const result = await rerunMyQuickScan(quickScanId);
    setRerunningKey('');

    if (result?.error) {
      setQuickScanError(result.error);
      return;
    }

    await load();
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 md:px-10 bg-gradient-to-br from-gray-950 via-blue-950 to-green-950 text-white">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="heading-page font-bold tracking-tight bg-gradient-to-r from-blue-400 via-green-500 to-teal-400 text-transparent bg-clip-text">My Account</h1>
          <p className="text-sm text-gray-300 mt-2">Your full audits, quick scans, and their current delivery status.</p>
        </header>
        {!user && (
          <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-sm">Please log in to view your account.</div>
        )}
        {user && (
          <>
            {/* Start Audit Button for Active Subscribers */}
            {subscription && subscription.status === 'active' && (
              <div className="mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <h3 className="text-xl font-bold text-white mb-2">Ready to Start Your Audit?</h3>
                      <p className="text-gray-300 text-sm">
                        You have {subscription.isTeamMember ? 'team access to' : 'an active'} <span className="font-semibold text-green-400">{subscription.plan?.name}</span> subscription
                      </p>
                      {subscription.isTeamMember && (
                        <p className="text-yellow-300 text-xs mt-1">
                          👥 You're using a team plan
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('/checkout')}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 whitespace-nowrap"
                    >
                      Start Full Audit
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section className='space-y-4'>
              <div className='flex flex-col sm:flex-row gap-3 items-stretch sm:items-center'>
              <input value={q} onChange={e=> setQ(e.target.value)} placeholder='Search URL or taskId...' className='flex-1 px-3 py-2 rounded-lg bg-white/10 text-sm outline-none focus:ring-2 ring-green-500/50' />
              <select value={status} onChange={e=> setStatus(e.target.value)} className='px-3 py-2 rounded-lg bg-white/10 text-sm outline-none focus:ring-2 ring-green-500/50 text-white'>
                <option value='all' className='text-black'>All</option>
                <option value='queued' className='text-black'>Queued</option>
                <option value='processing' className='text-black'>Processing</option>
                <option value='completed' className='text-black'>Completed</option>
                <option value='failed' className='text-black'>Failed</option>
              </select>
              <button onClick={load} className='px-4 py-2 rounded-lg bg-green-600/80 hover:bg-green-500 text-xs font-semibold shadow'>Refresh</button>
            </div>

            {loading && <div className='text-sm text-gray-400'>Loading...</div>}

            <div className='space-y-8'>
              <section className='space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold text-white'>Full Audits</h2>
                    <p className='text-xs text-gray-400'>Detailed accessibility audit runs linked to your account.</p>
                  </div>
                  <span className='text-xs text-gray-400'>{filtered.length} shown</span>
                </div>

                {auditError && <div className='text-sm text-red-300'>{auditError}</div>}
                {!loading && filtered.length === 0 && (
                  <div className='text-sm text-gray-400 italic'>No full audits found.</div>
                )}

                <div className='space-y-3'>
                  {filtered.map(rec => (
                    <div key={rec._id || rec.taskId} className='p-4 rounded-lg bg-black/30 border border-white/10 hover:border-purple-400/40 transition'>
                      <div className='flex flex-wrap items-center justify-between gap-4'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap gap-2 items-center mb-1'>
                            <span className='font-medium break-all'>{rec.url}</span>
                            <StatusPill value={rec.status} />
                            <EmailPill value={rec.emailStatus} />
                            <ScorePill value={rec.score ?? rec.scoreCard?.overallScore} />
                            <RiskPill value={rec.scoreCard?.riskTier} />
                          </div>
                          <div className='text-[11px] text-gray-300 flex flex-wrap gap-4'>
                            <span>Task: {rec.taskId}</span>
                            {rec.createdAt && <span>Created {new Date(rec.createdAt).toLocaleString()}</span>}
                            {typeof rec.attachmentCount==='number' && <span>PDFs: {rec.attachmentCount}</span>}
                            {Array.isArray(rec.reportFiles) && rec.reportFiles.length > 0 && <span>Stored reports ready</span>}
                          </div>
                          {rec.failureReason && <div className='mt-1 text-[11px] text-red-300'>Reason: {rec.failureReason}</div>}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {rec.status === 'failed' && rec.taskId && (
                            <button
                              onClick={() => handleRerunAnalysis(rec.taskId)}
                              disabled={rerunningKey === `analysis:${rec.taskId}`}
                              className='rounded-lg bg-amber-600/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                              {rerunningKey === `analysis:${rec.taskId}` ? 'Re-running...' : 'Re-run'}
                            </button>
                          )}
                          {rec.taskId && (
                            <button
                              onClick={() => navigate(`/account/analysis/${rec.taskId}`)}
                              className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10'
                            >
                              {rec.attachmentCount > 0 ? 'View reports' : 'View details'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className='space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold text-white'>Quick Scans</h2>
                    <p className='text-xs text-gray-400'>Free scan requests with a live status line for pending, queued, and complete.</p>
                  </div>
                  <span className='text-xs text-gray-400'>{filteredQuickScans.length} shown</span>
                </div>

                {quickScanError && <div className='text-sm text-red-300'>{quickScanError}</div>}
                {!loading && filteredQuickScans.length === 0 && (
                  <div className='text-sm text-gray-400 italic'>No quick scans found.</div>
                )}

                <div className='space-y-3'>
                  {filteredQuickScans.map(scan => (
                    <div key={scan._id || `${scan.email}-${scan.url}-${scan.createdAt || scan.scanDate}`} className='p-4 rounded-lg bg-black/30 border border-white/10 hover:border-green-400/40 transition'>
                      <div className='flex flex-wrap items-start justify-between gap-4'>
                        <div className='min-w-0 flex-1 space-y-3'>
                          <div className='flex flex-wrap gap-2 items-center'>
                            <span className='font-medium break-all'>{scan.url}</span>
                            <StatusPill value={scan.status} />
                            <EmailPill value={scan.emailStatus} />
                            <ScorePill value={scan.scanScore} />
                          </div>

                          <QuickScanStatusLine value={scan.status} />

                          <div className='text-[11px] text-gray-300 flex flex-wrap gap-4'>
                            {scan.scanDate && <span>Scanned {new Date(scan.scanDate).toLocaleString()}</span>}
                            {scan.createdAt && <span>Requested {new Date(scan.createdAt).toLocaleString()}</span>}
                            {scan.reportGenerated && <span>Report generated</span>}
                            {Array.isArray(scan.reportFiles) && scan.reportFiles.length > 0 && <span>Stored reports ready</span>}
                          </div>

                          {scan.errorMessage && <div className='text-[11px] text-red-300'>Reason: {scan.errorMessage}</div>}
                          {scan.emailError && <div className='text-[11px] text-amber-300'>Email: {scan.emailError}</div>}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {scan.status === 'failed' && scan._id && (
                            <button
                              onClick={() => handleRerunQuickScan(scan._id)}
                              disabled={rerunningKey === `quick:${scan._id}`}
                              className='rounded-lg bg-amber-600/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                              {rerunningKey === `quick:${scan._id}` ? 'Re-running...' : 'Re-run'}
                            </button>
                          )}
                          {scan._id && (
                            <button
                              onClick={() => navigate(`/account/quick-scans/${scan._id}`)}
                              className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10'
                            >
                              View quick scan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
          </>
        )}
      </div>
    </div>
  );
}
