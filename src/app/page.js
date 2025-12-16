"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Minus, 
  DollarSign,
  ShoppingBag,
  X,
  Loader,
  Eye,
  User,
  FileText
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  increment // Importante para restaurar stock
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// ID fijo para tu tienda
const appId = 'aura-beauty-store';

// --- Componente Principal ---
export default function AuraApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Estados de Datos
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  
  // Estado local del Carrito
  const [cart, setCart] = useState([]);
  const [notification, setNotification] = useState(null);

  // 1. Efecto de Autenticación
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Efecto de Datos (Productos)
  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      showNotification("Error al cargar productos", "error");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Efecto de Datos (Ventas)
  useEffect(() => {
    if (!user) return;
    const salesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'sales');
    const unsubscribe = onSnapshot(salesRef, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      salesData.sort((a, b) => new Date(b.date) - new Date(a.date)); 
      setSales(salesData);
    }, (error) => {
      console.error("Error fetching sales:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Funciones de Base de Datos ---

  const handleAddProduct = async (productData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), productData);
      showNotification("Producto guardado correctamente");
    } catch (error) {
      console.error("Error adding product:", error);
      showNotification("Error al guardar producto", "error");
    }
  };

  const handleUpdateProduct = async (id, productData) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', id);
      await updateDoc(docRef, productData);
      showNotification("Producto actualizado");
    } catch (error) {
      console.error("Error updating product:", error);
      showNotification("Error al actualizar", "error");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', id));
      showNotification("Producto eliminado");
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // Modificado: Acepta customerName
  const handleProcessSale = async (cartItems, total, totalProfit, customerName) => {
    if (!user) return;
    
    try {
      const batch = writeBatch(db);

      // 1. Crear registro de venta con nombre de cliente
      const saleRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'sales'));
      batch.set(saleRef, {
        date: new Date().toISOString(),
        items: cartItems,
        total: total,
        totalProfit: totalProfit,
        customerName: customerName || "Cliente Casual" // Valor por defecto
      });

      // 2. Actualizar stock de cada producto (Resta)
      cartItems.forEach(item => {
        const productRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.id);
        // Usamos increment para restar de forma atómica y segura
        batch.update(productRef, { stock: increment(-item.quantity) });
      });

      await batch.commit();
      setCart([]);
      showNotification(`Venta registrada a ${customerName || "Cliente"}. Ganancia: Q${totalProfit.toFixed(2)}`);
    } catch (error) {
      console.error("Error processing sale:", error);
      showNotification("Error al procesar la venta", "error");
    }
  };

  // Nueva función: Eliminar Venta y Restaurar Stock
  const handleDeleteSale = async (sale) => {
    if (!user) return;
    // Confirmación simple del navegador (se podría hacer un modal custom pero esto es efectivo)
    if (!window.confirm(`¿Estás seguro de eliminar la venta de ${sale.customerName}? El stock será devuelto al inventario.`)) return;

    try {
      const batch = writeBatch(db);

      // 1. Restaurar stock (Suma)
      sale.items.forEach(item => {
        const productRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.id);
        // Sumamos la cantidad vendida de vuelta al stock
        batch.update(productRef, { stock: increment(item.quantity) });
      });

      // 2. Eliminar el documento de la venta
      const saleRef = doc(db, 'artifacts', appId, 'users', user.uid, 'sales', sale.id);
      batch.delete(saleRef);

      await batch.commit();
      showNotification("Venta eliminada y stock restaurado correctamente.");
    } catch (error) {
      console.error("Error deleting sale:", error);
      // Es posible que falle si el producto original fue borrado de la base de datos de productos
      showNotification("Error al eliminar (¿Quizás un producto ya no existe?)", "error");
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-pink-400">
          <Loader className="animate-spin mb-4" size={40} />
          <p>Cargando Aura...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView sales={sales} products={products} onDeleteSale={handleDeleteSale} />;
      case 'inventory':
        return <InventoryView 
          products={products} 
          onAdd={handleAddProduct} 
          onUpdate={handleUpdateProduct} 
          onDelete={handleDeleteProduct} 
          showNotification={showNotification} 
        />;
      case 'pos':
        return <POSView 
          products={products} 
          cart={cart} 
          setCart={setCart} 
          onCheckout={handleProcessSale}
          showNotification={showNotification} 
        />;
      default:
        return <DashboardView sales={sales} products={products} onDeleteSale={handleDeleteSale} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800">
      <aside className="w-64 bg-white border-r border-pink-100 flex flex-col shadow-sm">
        <div className="p-6 flex items-center justify-center border-b border-pink-50">
          <div className="flex items-center gap-2">
            <div className="bg-pink-500 text-white p-2 rounded-lg">
              <ShoppingBag size={24} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Aura
            </h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Panel General" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<ShoppingCart size={20} />} label="Punto de Venta" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
          <SidebarItem icon={<Package size={20} />} label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
        </nav>

        <div className="p-4 border-t border-pink-50">
          <p className="text-xs text-slate-400 text-center">Aura Beauty Store © 2025</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white p-6 border-b border-pink-50 shadow-sm flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-slate-700">
            {activeTab === 'dashboard' && 'Resumen del Negocio'}
            {activeTab === 'inventory' && 'Gestión de Productos'}
            {activeTab === 'pos' && 'Nueva Venta'}
          </h2>
          <div className="flex items-center gap-4">
             <span className="text-sm font-medium text-slate-500">{user ? 'Conectado' : 'Conectando...'}</span>
             <div className="h-8 w-8 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-400">
                <span className="text-xs font-bold">A</span>
             </div>
          </div>
        </header>

        <div className="p-8">
          {notification && (
            <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce text-white ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
              {notification.message}
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active ? 'bg-pink-50 text-pink-700 font-medium shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    {icon} <span>{label}</span>
  </button>
);

// --- VISTA 1: DASHBOARD / ANALYTICS (Actualizada) ---
const DashboardView = ({ sales, products, onDeleteSale }) => {
  const [selectedSale, setSelectedSale] = useState(null);

  const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalProfit = sales.reduce((acc, sale) => acc + sale.totalProfit, 0);
  const totalStockValue = products.reduce((acc, prod) => acc + (prod.cost * prod.stock), 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Ventas Totales" value={`Q${totalSales.toFixed(2)}`} icon={<DollarSign className="text-pink-500" />} color="bg-pink-50" />
        <StatCard title="Ganancia Neta" value={`Q${totalProfit.toFixed(2)}`} icon={<TrendingUp className="text-emerald-500" />} color="bg-emerald-50" />
        <StatCard title="Valor Inventario" value={`Q${totalStockValue.toFixed(2)}`} icon={<Package className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Stock Bajo" value={lowStockCount} icon={<Package className="text-orange-500" />} color="bg-orange-50" warning={lowStockCount > 0} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="font-semibold text-lg text-slate-700">Historial de Ventas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium text-xs">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Ganancia</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No hay ventas registradas aún.</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">
                       <div className="flex items-center gap-2">
                         <User size={16} className="text-pink-400"/>
                         {sale.customerName || "Cliente"}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(sale.date).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">Q{sale.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">+Q{sale.totalProfit.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => setSelectedSale(sale)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 text-xs font-medium"
                          title="Ver Detalles"
                        >
                          <Eye size={16} /> Ver
                        </button>
                        <button 
                          onClick={() => onDeleteSale(sale)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded flex items-center gap-1 text-xs font-medium"
                          title="Eliminar y Restaurar Stock"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALLES DE VENTA */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-pink-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText className="text-pink-600" size={20} />
                Detalle de Venta
              </h3>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm text-slate-500 border-b border-slate-100 pb-4">
                 <div>
                   <p className="font-medium text-slate-700">Cliente:</p>
                   <p>{selectedSale.customerName || "No registrado"}</p>
                 </div>
                 <div className="text-right">
                   <p className="font-medium text-slate-700">Fecha:</p>
                   <p>{new Date(selectedSale.date).toLocaleString()}</p>
                 </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-200">
                      <th className="pb-2 text-left font-medium">Producto</th>
                      <th className="pb-2 text-center font-medium">Cant.</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-slate-700">{item.name}</td>
                        <td className="py-2 text-center text-slate-500">x{item.quantity}</td>
                        <td className="py-2 text-right font-medium text-slate-700">Q{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                 <span className="text-slate-500 font-medium">Total Pagado</span>
                 <span className="text-2xl font-bold text-pink-600">Q{selectedSale.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button 
                onClick={() => setSelectedSale(null)}
                className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, warning }) => (
  <div className={`p-6 rounded-xl border ${warning ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-white'} shadow-sm flex items-center gap-4`}>
    <div className={`p-3 rounded-full ${color}`}> {icon} </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className={`text-2xl font-bold ${warning ? 'text-orange-600' : 'text-slate-800'}`}>{value}</h3>
    </div>
  </div>
);

// --- VISTA 2: INVENTARIO (Sin cambios mayores) ---
const InventoryView = ({ products, onAdd, onUpdate, onDelete, showNotification }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const initialFormState = { id: null, name: '', category: '', cost: '', price: '', stock: '' };
  const [formData, setFormData] = useState(initialFormState);

  const handleCostChange = (e) => {
    const costValue = parseFloat(e.target.value);
    setFormData(prev => ({
      ...prev,
      cost: e.target.value,
      price: costValue ? (costValue * 3.40).toFixed(2) : prev.price
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.cost || !formData.price) return;
    const productData = {
      name: formData.name,
      category: formData.category || 'General',
      cost: parseFloat(formData.cost),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
    };
    if (isEditing && formData.id) {
      onUpdate(formData.id, productData);
    } else {
      onAdd(productData);
    }
    setFormData(initialFormState);
    setIsEditing(false);
  };

  const startEdit = (product) => {
    setFormData({
      id: product.id,
      name: product.name,
      category: product.category,
      cost: product.cost,
      price: product.price,
      stock: product.stock
    });
    setIsEditing(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100 sticky top-24">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            {isEditing && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Modo Edición</span>}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
              <input type="text" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
              <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Costo (Q)</label>
                <input type="number" step="0.01" min="0" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 bg-slate-50" value={formData.cost} onChange={handleCostChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Stock</label>
                <input type="number" min="0" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
              <label className="block text-sm font-bold text-pink-800 mb-1">Precio Venta (Q)</label>
              <input type="number" step="0.01" min="0" required className="w-full px-4 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 font-bold text-slate-800" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              <p className="text-xs text-pink-600 mt-2">* Costo + 240% automático.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Save size={18} /> Guardar
              </button>
              {isEditing && (
                <button type="button" onClick={() => { setIsEditing(false); setFormData(initialFormState); }} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">Cancelar</button>
              )}
            </div>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex items-center px-4 py-3 gap-2">
          <Search size={20} className="text-slate-400" />
          <input type="text" placeholder="Buscar..." className="flex-1 outline-none text-slate-700 placeholder:text-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">P. Venta</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">Q{product.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">Q{product.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{product.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Package size={16} /></button>
                      <button onClick={() => onDelete(product.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- VISTA 3: PUNTO DE VENTA (POS - Actualizada) ---
const POSView = ({ products, cart, setCart, onCheckout, showNotification }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');

  const addToCart = (product) => {
    if (product.stock <= 0) { showNotification("¡Producto agotado!", "error"); return; }
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) { showNotification("Stock insuficiente", "error"); return; }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));
  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const product = products.find(p => p.id === id);
        if (newQty > product.stock) { showNotification("Stock insuficiente", "error"); return item; }
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartProfit = cart.reduce((acc, item) => acc + ((item.price - item.cost) * item.quantity), 0);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock > 0);

  const handleCompleteSale = () => {
    onCheckout(cart, cartTotal, cartProfit, customerName);
    setCustomerName(''); // Limpiar nombre después de venta
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      <div className="flex-1 flex flex-col">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 flex items-center gap-2">
          <Search className="text-slate-400" />
          <input type="text" placeholder="Buscar producto..." className="flex-1 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
          {filteredProducts.map(product => (
            <button key={product.id} onClick={() => addToCart(product)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-pink-300 hover:shadow-md transition-all text-left flex flex-col justify-between group h-32">
              <div>
                <h4 className="font-semibold text-slate-700 leading-tight line-clamp-2">{product.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{product.category}</p>
              </div>
              <div className="flex justify-between items-end mt-2">
                <span className="font-bold text-lg text-pink-600">Q{product.price.toFixed(2)}</span>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Stock: {product.stock}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full">
        <div className="p-4 border-b border-slate-100 bg-pink-50 rounded-t-xl">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={20} className="text-pink-600" /> Venta Actual</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <ShoppingBag size={48} /><p>Carrito vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-medium text-sm text-slate-700 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">Q{item.price.toFixed(2)} u.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white rounded border border-slate-200">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl space-y-4">
          {/* Input para Nombre del Cliente */}
          <div className="mb-4">
             <label className="text-xs font-semibold text-slate-500 uppercase">Cliente</label>
             <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 mt-1 focus-within:ring-2 focus-within:ring-pink-200">
                <User size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Nombre del cliente (Opcional)"
                  className="w-full outline-none text-sm text-slate-700"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-xl text-slate-800">Total</span>
              <span className="font-bold text-2xl text-pink-600">Q{cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-600 font-medium">
              <span>Ganancia estimada:</span><span>+Q{cartProfit.toFixed(2)}</span>
            </div>
          </div>
          <button 
            onClick={handleCompleteSale}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:shadow-pink-200 hover:scale-[1.02]'}`}
          >
            Completar Venta
          </button>
        </div>
      </div>
    </div>
  );
};