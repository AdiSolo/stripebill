'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ConnectionsPage() {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();
  const [connections, setConnections] = useState([]);
  const [form, setForm] = useState({
    name: '',
    stripeApiKey: '',
    smartbillEmail: '',
    smartbillToken: '',
    smartbillCIF: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchConnections() {
      const res = await fetch('/api/connections');
      if (res.ok) {
        setConnections(await res.json());
      } else if (res.status === 401) {
        router.push('/auth/signin');
      }
    }
    fetchConnections();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error adding connection');
    } else {
      setConnections(prev => [...prev, data]);
      setForm({ name: '', stripeApiKey: '', smartbillEmail: '', smartbillToken: '', smartbillCIF: '' });
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this connection?')) return;
    const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConnections(prev => prev.filter(c => c.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || 'Error deleting');
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Connections Dashboard</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <label className="block font-medium">Name</label>
          <input
            className="border p-2 mt-1 w-full"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-medium">Stripe API Key</label>
          <input
            className="border p-2 mt-1 w-full"
            value={form.stripeApiKey}
            onChange={e => setForm({ ...form, stripeApiKey: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-medium">SmartBill Email</label>
          <input
            className="border p-2 mt-1 w-full"
            value={form.smartbillEmail}
            onChange={e => setForm({ ...form, smartbillEmail: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-medium">SmartBill Token</label>
          <input
            className="border p-2 mt-1 w-full"
            value={form.smartbillToken}
            onChange={e => setForm({ ...form, smartbillToken: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block font-medium">SmartBill CIF</label>
          <input
            className="border p-2 mt-1 w-full"
            value={form.smartbillCIF}
            onChange={e => setForm({ ...form, smartbillCIF: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Adding...' : 'Add Connection'}
        </button>
      </form>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-left">Stripe Key</th>
            <th className="border p-2 text-left">SmartBill Email</th>
            <th className="border p-2 text-left">SmartBill Token</th>
            <th className="border p-2 text-left">SmartBill CIF</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {connections.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="border p-2">{c.name}</td>
              <td className="border p-2 font-mono text-sm truncate">{c.stripeApiKey}</td>
              <td className="border p-2 truncate">{c.smartbillEmail}</td>
              <td className="border p-2 font-mono text-sm truncate">{c.smartbillToken}</td>
              <td className="border p-2">{c.smartbillCIF}</td>
              <td className="border p-2 space-x-2">
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
