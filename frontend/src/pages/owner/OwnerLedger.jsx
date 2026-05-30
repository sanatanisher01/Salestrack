import { useEffect, useState } from 'react';
import OwnerLayout from '../../layouts/OwnerLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function formatDate(val) {
  if (!val) return '';
  if (val?._seconds) return format(new Date(val._seconds * 1000), 'dd MMM, hh:mm a');
  try { return format(new Date(val), 'dd MMM, hh:mm a'); } catch { return ''; }
}

export default function OwnerLedger() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // customer uid
  const [payments, setPayments] = useState([]);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', note: '' });
  const [paying, setPaying] = useState(false);

  const loadLedger = () => {
    api.get('/payments/ledger').then(({ data }) => setLedger(data.ledger)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadLedger(); }, []);

  const selectCustomer = async (c) => {
    setSelected(c);
    setShowPayForm(false);
    try {
      const { data } = await api.get(`/payments/customer/${c.uid}`);
      setPayments(data.payments);
    } catch { setPayments([]); }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || Number(payForm.amount) <= 0) { toast.error('Enter valid amount'); return; }
    setPaying(true);
    try {
      await api.post('/payments', { customerId: selected.uid, amount: Number(payForm.amount), method: payForm.method, note: payForm.note });
      toast.success('Payment recorded!');
      setPayForm({ amount: '', method: 'cash', note: '' });
      setShowPayForm(false);
      selectCustomer(selected); // Refresh payments
      loadLedger(); // Refresh balances
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setPaying(false);
    }
  };

  const totalBalance = ledger.reduce((s, c) => s + c.balance, 0);
  const totalReceived = ledger.reduce((s, c) => s + c.totalPaid, 0);

  return (
    <OwnerLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Payment Ledger</h1>
        <p className="text-sm text-gray-500">Track customer payments and balances</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-3xl p-4 border border-white">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Total Pending</p>
          <p className="text-2xl font-bold text-red-600 mt-1">₹{totalBalance.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl p-4 border border-white">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Total Received</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalReceived.toFixed(0)}</p>
        </div>
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {ledger.map((c) => (
          <div key={c.uid} onClick={() => selectCustomer(c)}
            className={`card cursor-pointer hover:shadow-md transition-all ${selected?.uid === c.uid ? 'border-2 border-indigo-300' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                  {c.shopName[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{c.shopName}</p>
                  <p className="text-xs text-gray-400">{c.orderCount} orders · {c.mobile}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${c.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {c.balance > 0 ? `₹${c.balance.toFixed(0)} due` : '✓ Paid'}
                </p>
                <p className="text-[10px] text-gray-400">of ₹{c.totalOrdered.toFixed(0)}</p>
              </div>
            </div>
          </div>
        ))}
        {ledger.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No customer orders yet</p>
          </div>
        )}
      </div>

      {/* Selected customer detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <p className="font-bold text-gray-900">{selected.shopName}</p>
                <p className="text-xs text-gray-400">{selected.ownerName} · {selected.mobile}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Balance summary */}
            <div className="p-5 bg-gray-50 flex-shrink-0">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-400">Ordered</p>
                  <p className="font-bold text-gray-800">₹{selected.totalOrdered.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Paid</p>
                  <p className="font-bold text-emerald-600">₹{selected.totalPaid.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Balance</p>
                  <p className={`font-bold ${selected.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₹{selected.balance.toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* Record payment button */}
            <div className="px-5 pt-4 flex-shrink-0">
              <button onClick={() => setShowPayForm(!showPayForm)}
                className="btn-primary w-full py-2.5 bg-emerald-600 hover:bg-emerald-700">
                + Record Payment
              </button>
            </div>

            {/* Payment form */}
            {showPayForm && (
              <form onSubmit={recordPayment} className="px-5 pt-3 space-y-2 flex-shrink-0">
                <div className="flex gap-2">
                  <input className="input flex-1" type="number" min="1" placeholder="Amount (₹)" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
                  <select className="input w-28" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <input className="input" placeholder="Note (optional)" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
                <button type="submit" disabled={paying} className="btn-primary w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-sm">
                  {paying ? 'Saving...' : 'Save Payment'}
                </button>
              </form>
            )}

            {/* Payment history */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Payment History</p>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No payments recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">₹{p.amount.toFixed(0)}</p>
                        <p className="text-[10px] text-gray-400">{p.method} · {formatDate(p.createdAt)}</p>
                        {p.note && <p className="text-[10px] text-gray-500 italic">{p.note}</p>}
                      </div>
                      <span className="badge text-xs bg-emerald-100 text-emerald-700">Paid</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
