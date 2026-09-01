import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Package, Plus, RefreshCw, Trash2 } from 'lucide-react'

type Product = { id: number; name: string; category: string; price: number; stock: number; image: string; active: boolean }
const empty = { name: '', category: '', price: '', stock: '0', image: '', description: '' }

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(empty)
  const [message, setMessage] = useState('')
  const load = useCallback(() => fetch('/api/admin/products').then(r => r.json()).then(setProducts).catch(() => setMessage('Start the API with npm run dev:server.')), [])
  useEffect(() => { load() }, [load])
  async function submit(event: FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!response.ok) return setMessage((await response.json()).error)
    setForm(empty); setMessage('Product added to the storefront.'); load()
  }
  async function remove(id: number) { await fetch(`/api/admin/products/${id}`, { method: 'DELETE' }); load() }
  return <div className="admin-page">
    <header><a className="brand" href="/"><span className="brand-mark">V</span>VOLT<span>CART</span></a><a className="admin-back" href="/"><ArrowLeft size={16}/> Storefront</a></header>
    <main className="admin-main">
      <div className="admin-heading"><div><span>STORE MANAGEMENT</span><h1>Products</h1><p>Add products, set prices and inventory, or remove items from your store.</p></div><button onClick={load}><RefreshCw size={17}/> Refresh</button></div>
      {message && <div className="admin-message">{message}</div>}
      <div className="admin-layout">
        <form className="product-form" onSubmit={submit}><h2><Plus size={19}/> Add a product</h2>
          <label>Product name<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})}/></label>
          <div className="form-row"><label>Category<input required value={form.category} onChange={e => setForm({...form, category:e.target.value})}/></label><label>Price (USD)<input required min="0" step="0.01" type="number" value={form.price} onChange={e => setForm({...form, price:e.target.value})}/></label></div>
          <label>Image URL<input required type="url" placeholder="https://..." value={form.image} onChange={e => setForm({...form, image:e.target.value})}/></label>
          <label>Stock quantity<input required min="0" type="number" value={form.stock} onChange={e => setForm({...form, stock:e.target.value})}/></label>
          <label>Description<textarea rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})}/></label>
          <button className="primary" type="submit">Add product <Plus size={17}/></button>
        </form>
        <section className="inventory"><div className="inventory-title"><h2>Inventory</h2><span>{products.length} products</span></div>
          {products.length === 0 ? <div className="inventory-empty"><Package/><p>No products loaded.</p></div> : products.map(product => <article className={!product.active ? 'inactive' : ''} key={product.id}><img src={product.image} alt=""/><div><small>{product.category}</small><b>{product.name}</b><span>${product.price.toFixed(2)} · {product.stock} in stock</span></div><button aria-label={`Remove ${product.name}`} onClick={() => remove(product.id)}><Trash2 size={17}/></button></article>)}
        </section>
      </div>
    </main>
  </div>
}
