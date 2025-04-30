
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConnectionsPage() {
  const { data: session, status } = useSession({ required: true });
  console.log('Session is', session)
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
  const [webhookLoading, setWebhookLoading] = useState({});
  const [planLimitReached, setPlanLimitReached] = useState(false);
  
  // Fetch connections
  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch('/api/connections');
        if (res.ok) {
          const data = await res.json();
          setConnections(data);
          
          // Check if plan limit reached
          const plan = session?.user?.plan || 'BASIC';
          const limit = plan === 'PRO' ? 3 : 1;
          setPlanLimitReached(data.length >= limit);
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error fetching connections');
        }
      } catch (err) {
        console.error('Error loading connections:', err);
        setError(err.message || 'Failed to load connections');
      }
    }

    if (status === 'authenticated') {
      fetchConnections();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, session, router]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Validate form data
      if (!form.name || !form.stripeApiKey || !form.smartbillEmail || !form.smartbillToken || !form.smartbillCIF) {
        throw new Error('All fields are required');
      }
      
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      
      let responseData;
      try {
        responseData = await res.json();
      } catch (jsonError) {
        console.error('Error parsing response:', jsonError);
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (res.ok) {
        setConnections([...connections, responseData]);
        // Reset form
        setForm({
          name: '',
          stripeApiKey: '',
          smartbillEmail: '',
          smartbillToken: '',
          smartbillCIF: ''
        });
        
        // Check if plan limit reached with new connection
        const plan = session?.user?.plan || 'BASIC';
        const limit = plan === 'PRO' ? 3 : 1;
        setPlanLimitReached(connections.length + 1 >= limit);
      } else {
        throw new Error(responseData.error || 'Error creating connection');
      }
    } catch (err) {
      console.error('Error creating connection:', err);
      setError(err.message || 'Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  // Handle connection deletion
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/connections/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setConnections(connections.filter(c => c.id !== id));
        // Update plan limit status
        const plan = session?.user?.plan || 'BASIC';
        const limit = plan === 'PRO' ? 3 : 1;
        setPlanLimitReached(connections.length - 1 >= limit);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error deleting connection');
      }
    } catch (err) {
      console.error('Error deleting connection:', err);
      alert('Failed to delete connection: ' + (err.message || 'Unknown error'));
    }
  };

  // Handle webhook setup
  const handleSetupWebhook = async (id) => {
    setWebhookLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      const res = await fetch(`/api/connections/${id}/webhook`, {
        method: 'POST'
      });
      
      if (res.ok) {
        // Refresh connections to get updated webhook status
        const connectionsRes = await fetch('/api/connections');
        if (connectionsRes.ok) {
          const data = await connectionsRes.json();
          setConnections(data);
        }
        alert('Webhook successfully set up');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error setting up webhook');
      }
    } catch (err) {
      console.error('Error setting up webhook:', err);
      alert('Failed to set up webhook: ' + (err.message || 'Unknown error'));
    } finally {
      setWebhookLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Handle webhook deletion
  const handleDeleteWebhook = async (id) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }
    
    setWebhookLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      const res = await fetch(`/api/connections/${id}/webhook`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        // Refresh connections to get updated webhook status
        const connectionsRes = await fetch('/api/connections');
        if (connectionsRes.ok) {
          const data = await connectionsRes.json();
          setConnections(data);
        }
        alert('Webhook successfully deleted');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error deleting webhook');
      }
    } catch (err) {
      console.error('Error deleting webhook:', err);
      alert('Failed to delete webhook: ' + (err.message || 'Unknown error'));
    } finally {
      setWebhookLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // If loading session
  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Connections</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Plan limit warning */}
      {planLimitReached && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Plan Limit Reached</p>
          <p>
            You have reached the maximum number of connections for your current plan.
            {session?.user?.plan !== 'PRO' && (
              <span> Consider upgrading to PRO for more connections.</span>
            )}
          </p>
          {session?.user?.plan !== 'PRO' && (
            <Link href="/billing" className="mt-2 inline-block text-blue-600 hover:underline">
              Upgrade Plan
            </Link>
          )}
        </div>
      )}
      
      {/* Connection form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Connection</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Connection Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="My Business Connection"
              required
            />
          </div>
          
          <div>
            <label htmlFor="stripeApiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Stripe Secret API Key
            </label>
            <input
              type="text"
              id="stripeApiKey"
              name="stripeApiKey"
              value={form.stripeApiKey}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
              placeholder="sk_test_..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Your Stripe secret key is used to create webhooks and process payments.
            </p>
          </div>
          
          <div>
            <label htmlFor="smartbillEmail" className="block text-sm font-medium text-gray-700 mb-1">
              SmartBill Email
            </label>
            <input
              type="email"
              id="smartbillEmail"
              name="smartbillEmail"
              value={form.smartbillEmail}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="smartbillToken" className="block text-sm font-medium text-gray-700 mb-1">
              SmartBill API Token
            </label>
            <input
              type="text"
              id="smartbillToken"
              name="smartbillToken"
              value={form.smartbillToken}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
              placeholder="Your SmartBill API token"
              required
            />
          </div>
          
          <div>
            <label htmlFor="smartbillCIF" className="block text-sm font-medium text-gray-700 mb-1">
              Company CIF/VAT Code
            </label>
            <input
              type="text"
              id="smartbillCIF"
              name="smartbillCIF"
              value={form.smartbillCIF}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="RO12345678"
              required
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading || planLimitReached}
              className={`px-4 py-2 rounded font-medium ${
                loading || planLimitReached
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Adding...' : 'Add Connection'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Connections list */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Connections</h2>
        
        {connections.length === 0 ? (
          <p className="text-gray-500">No connections found. Add your first connection above.</p>
        ) : (
          <div className="space-y-6">
            {connections.map((connection) => (
              <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{connection.name}</h3>
                    <p className="text-sm text-gray-500">Created on {new Date(connection.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(connection.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Stripe Details</h4>
                    <div className="mt-1 text-sm text-gray-600">
                      <p className="truncate">API Key: {connection.stripeApiKey.substring(0, 10)}...</p>
                      <p className="mt-1">
                        Webhook Status: {' '}
                        {connection.stripeWebhookId ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-yellow-600">Not Set Up</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">SmartBill Details</h4>
                    <div className="mt-1 text-sm text-gray-600">
                      <p>Email: {connection.smartbillEmail}</p>
                      <p>CIF: {connection.smartbillCIF}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  {connection.stripeWebhookId ? (
                    <button
                      onClick={() => handleDeleteWebhook(connection.id)}
                      disabled={webhookLoading[connection.id]}
                      className={`px-3 py-1 text-sm rounded ${
                        webhookLoading[connection.id]
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {webhookLoading[connection.id] ? 'Working...' : 'Remove Webhook'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSetupWebhook(connection.id)}
                      disabled={webhookLoading[connection.id]}
                      className={`px-3 py-1 text-sm rounded ${
                        webhookLoading[connection.id]
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {webhookLoading[connection.id] ? 'Setting Up...' : 'Set Up Webhook'}
                    </button>
                  )}
                  
                  <a 
                    href={`/dashboard?connectionId=${connection.id}`}
                    className="ml-3 px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    View Payments
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
