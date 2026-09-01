import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Cpu, CreditCard, Headphones, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, Star, Truck, UserRound, X, Zap } from 'lucide-react'

type Product = { id: number; name: string; category: string; price: number; oldPrice?: number; rating: number; reviews: number; tag?: string; image: string }

const seedProducts: Product[] = [
  { id: 1, name: 'RTX 4070 SUPER 12GB', category: 'Graphics Cards', price: 599.99, oldPrice: 649.99, rating: 4.9, reviews: 128, tag: 'BEST SELLER', image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85' },
  { id: 2, name: 'Ryzen 7 7800X3D', category: 'Processors', price: 359.99, rating: 4.8, reviews: 94, tag: 'HOT', image: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=900&q=85' },
  { id: 3, name: 'Mechanical TKL Pro', category: 'Peripherals', price: 129.99, rating: 4.7, reviews: 76, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85' },
  { id: 4, name: 'NVMe Gen4 2TB SSD', category: 'Storage', price: 149.99, oldPrice: 179.99, rating: 4.9, reviews: 203, tag: 'SAVE $30', image: 'https://images.unsplash.com/photo-1628557118391-56cd62c9f2cb?auto=format&fit=crop&w=900&q=85' },
]

const categories = [
  { name: 'PC Components', count: '240+ products', icon: Cpu },
  { name: 'Peripherals', count: '180+ products', icon: Headphones },
  { name: 'Power & Cooling', count: '95+ products', icon: Zap },
]

const money = (value: number) => `$${value.toFixed(2)}`

export default function App() {
  const [products, setProducts] = useState<Product[]>(seedProducts)
  const [cart, setCart] = useState<number[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    fetch('/api/products').then(response => response.ok ? response.json() : Promise.reject()).then(rows => {
      setProducts(rows.map((row: Product) => ({ ...row, rating: row.rating ?? 4.8, reviews: row.reviews ?? 0 })))
    }).catch(() => undefined)
  }, [])
  const cartProducts = cart.map(id => products.find(product => product.id === id)!).filter(Boolean)
  const total = useMemo(() => cartProducts.reduce((sum, item) => sum + item.price, 0), [cartProducts])

  const add = (id: number) => { setCart(current => [...current, id]); setCartOpen(true) }
  const remove = (index: number) => setCart(current => current.filter((_, i) => i !== index))
  const scrollProducts = () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
  const checkoutWithStripe = async () => {
    const quantities = cart.reduce<Record<number, number>>((all, id) => ({ ...all, [id]: (all[id] ?? 0) + 1 }), {})
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Object.entries(quantities).map(([id, quantity]) => ({ id: Number(id), quantity })) }) })
    const result = await response.json()
    if (result.url) window.location.href = result.url
    else alert(result.error ?? 'Checkout could not be started.')
  }

  return <div className="app">
    <div className="announcement"><span>Free express delivery on orders over $150</span><span className="announcement-code">USE CODE: <b>POWERUP</b></span><button aria-label="Dismiss announcement"><X size={15}/></button></div>
    <header>
      <a className="brand" href="#"><span className="brand-mark"><Zap size={23} fill="currentColor"/></span>VOLT<span>CART</span></a>
      <nav className={menu ? 'nav-open' : ''}>
        <a href="#products">Components</a><a href="#products">Laptops</a><a href="#products">Peripherals</a><a href="#deals">Deals <span className="sale-dot">%</span></a>
      </nav>
      <div className="header-actions">
        <button aria-label="Search"><Search/></button><button className="user" aria-label="Account"><UserRound/></button>
        <button aria-label="Shopping cart" className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag/><span>{cart.length}</span></button>
        <button className="menu" onClick={() => setMenu(!menu)} aria-label="Menu"><Menu/></button>
      </div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span></span>BUILT FOR PERFORMANCE</div>
          <h1>Tech that keeps<br/>you <em>ahead.</em></h1>
          <p>Premium computer parts and electronics, curated for creators, gamers, and everyone who refuses to slow down.</p>
          <div className="hero-buttons"><button className="primary" onClick={scrollProducts}>Shop components <ArrowRight size={18}/></button><button className="text-button" onClick={() => document.getElementById('deals')?.scrollIntoView({behavior:'smooth'})}>Explore new arrivals <ArrowRight size={17}/></button></div>
          <div className="hero-proof"><div><div className="avatars"><span>A</span><span>J</span><span>M</span></div><div><div className="stars">★★★★★</div><small>4.9 from 2,000+ reviews</small></div></div><div className="line"></div><div><ShieldCheck/><small>2-year warranty<br/><b>on every product</b></small></div></div>
        </div>
        <div className="hero-visual">
          <div className="hero-glow"></div><div className="hero-grid"></div>
          <img src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=90" alt="High performance gaming computer"/>
          <div className="spec-card"><span><i></i>NEW RELEASE</span><b>RTX 40 SERIES</b><small>Uncompromised performance</small></div>
          <div className="scroll-cue">SCROLL TO EXPLORE <ChevronDown size={16}/></div>
        </div>
      </section>

      <section className="benefits"><div><Truck/><span><b>Free express delivery</b><small>On orders over $150</small></span></div><div><ShieldCheck/><span><b>2-year warranty</b><small>We've got you covered</small></span></div><div><PackageCheck/><span><b>30-day returns</b><small>Simple, no-hassle returns</small></span></div><div><CreditCard/><span><b>Secure checkout</b><small>Powered by Stripe</small></span></div></section>

      <section className="catalog" id="products">
        <div className="section-heading"><div><span className="kicker">FIND YOUR UPGRADE</span><h2>Shop by category</h2></div><button className="view-all">View all categories <ArrowRight size={17}/></button></div>
        <div className="category-grid">{categories.map((cat, index) => <article className={`category category-${index}`} key={cat.name}><div><cat.icon size={34}/><h3>{cat.name}</h3><p>{cat.count}</p></div><button aria-label={`Browse ${cat.name}`}><ArrowRight/></button></article>)}</div>

        <div className="section-heading products-heading" id="deals"><div><span className="kicker">WHAT'S TRENDING</span><h2>Popular right now</h2></div><div className="slider-buttons"><button><ChevronLeft/></button><button><ChevronRight/></button></div></div>
        <div className="product-grid">{products.map(product => <article className="product-card" key={product.id}>
          <div className="product-image">{product.tag && <span className="product-tag">{product.tag}</span>}<img src={product.image} alt={product.name}/><button className="quick-add" onClick={() => add(product.id)}><Plus size={18}/> Quick add</button></div>
          <p className="product-category">{product.category}</p><h3>{product.name}</h3><div className="rating"><Star size={14} fill="currentColor"/> {product.rating} <span>({product.reviews})</span></div><div className="price"><b>{money(product.price)}</b>{product.oldPrice && <del>{money(product.oldPrice)}</del>}</div>
        </article>)}</div>
      </section>
    </main>

    <footer><a className="brand" href="#"><span className="brand-mark"><Zap size={20} fill="currentColor"/></span>VOLT<span>CART</span></a><p>Powering your next big idea.</p><span>© 2026 VoltCart. Secure payments by Stripe.</span></footer>

    {cartOpen && <><div className="scrim" onClick={() => setCartOpen(false)}></div><aside className="cart-drawer">
      <div className="drawer-title"><div><span>YOUR CART</span><h2>Ready to power up?</h2></div><button onClick={() => setCartOpen(false)}><X/></button></div>
      {cartProducts.length === 0 ? <div className="empty-cart"><ShoppingBag/><h3>Your cart is empty</h3><p>Add some high-performance gear to get started.</p><button className="primary" onClick={() => {setCartOpen(false); scrollProducts()}}>Start shopping</button></div> : <>
        <div className="cart-items">{cartProducts.map((item, index) => <div className="cart-item" key={`${item.id}-${index}`}><img src={item.image} alt=""/><div><small>{item.category}</small><b>{item.name}</b><span>{money(item.price)}</span></div><button onClick={() => remove(index)}><Minus size={15}/></button></div>)}</div>
        <div className="cart-summary"><div><span>Subtotal</span><b>{money(total)}</b></div><p><Truck size={16}/> You qualify for free express delivery</p><button className="primary checkout-button" onClick={checkoutWithStripe}>Pay with Stripe <ArrowRight size={18}/></button><small><ShieldCheck size={14}/> Redirects to secure Stripe Checkout</small></div>
      </>}
    </aside></>}


  </div>
}
