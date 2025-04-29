'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 10,
  });

  // Fetch connections
  useEffect(() => {
    if (status === 'loading') return;
    
    async function fetchConnections() {
      try {
        const res = await fetch('/api/connections');
        
        if (res.ok) {
          const data = await res.json();
          setConnections(data);
        } else {
          throw new Error('Failed to fetch connections');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load connections');
      }
    }

    fetchConnections();
  }, [status]);

  // Fetch payments
  useEffect(() => {
    if (status === 'loading') return;
    
    async function fetchPayments() {
      setLoading(true);
      try {
        const connectionParam = selectedConnection !== 'all' ? `connectionId=${selectedConnection}` : '';
        const res = await fetch(`/api/payments?${connectionParam}&page=${page}&limit=10`);
        
        if (res.ok) {
          const { data, pagination } = await res.json();
          setPayments(data);
          setPagination(pagination);
        } else {
          throw new Error('Failed to fetch payments');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load payments data');
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [status, selectedConnection, page]);

  // Handle connection change
  const handleConnectionChange = (e) => {
    setSelectedConnection(e.target.value);
    setPage(1); // Reset to first page when changing connection
  };

  // Format currency
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100); // Convert from cents
  };

  // Handle retry invoice creation
  const handleRetryInvoice = async (paymentId) => {
    try {
      const res = await fetch(`/api/invoices/retry/${paymentId}`, {
        method: 'POST',
      });
      
      if (res.ok) {
        // Refresh the payment list after retry
        const connectionParam = selectedConnection !== 'all' ? `connectionId=${selectedConnection}` : '';
        const refreshRes = await fetch(`/api/payments?${connectionParam}&page=${page}&limit=10`);
        
        if (refreshRes.ok) {
          const { data } = await refreshRes.json();
          setPayments(data);
          alert('Invoice creation queued for retry. Please check back soon.');
        }
      } else {
        throw new Error('Failed to retry invoice creation');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to retry invoice creation. Please try again.');
    }
  };

  // If loading session
  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Payments Dashboard</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      
      <div className="mb-6">
        <label htmlFor="connection" className="block mb-2 font-medium">Filter by Connection:</label>
        <select
          id="connection"
          value={selectedConnection}
          onChange={handleConnectionChange}
          className="border border-gray-300 rounded px-3 py-2 w-full max-w-md"
        >
          <option value="all">All Connections</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4">No payments found for this connection</p>
          <p>
            <Link href="/connections" className="text-blue-600 hover:underline">
              Manage your connections
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Connection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.connection.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.invoiceLink ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${payment.invoiceLink.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            payment.invoiceLink.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {payment.invoiceLink.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Not generated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.invoiceLink?.status === 'COMPLETED' ? (
                        <a 
                          href={`/api/invoices/download/${payment.invoiceLink.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Download
                        </a>
                      ) : payment.invoiceLink?.status === 'FAILED' ? (
                        <button 
                          onClick={() => handleRetryInvoice(payment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Retry
                        </button>
                      ) : payment.invoiceLink === null ? (
                        <button 
                          onClick={() => handleRetryInvoice(payment.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Generate
                        </button>
                      ) : (
                        <span className="text-gray-500">Processing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payments
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className={`px-3 py-1 rounded ${page >= pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
