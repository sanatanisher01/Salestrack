import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import api from '../../api/axios';

export default function CustomerProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/customer/products').then(({ data }) => setProducts(data.products)).catch(() => {});
  }, []);

  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products;

  return (
    <CustomerLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">{products.length} items available</p>
        </div>
        <Link to="/customer/order" className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700">
          Place Order
        </Link>
      </div>

      <input className="input mb-4" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="card flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-sm text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-400">{p.unit}</p>
            </div>
            <p className="font-bold text-emerald-600">₹{p.price}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p className="text-gray-500 font-medium">No products available</p>
            <p className="text-sm text-gray-400">Link to a supplier to see their products</p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
