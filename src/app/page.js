"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
  Menu,
  ChevronLeft,
  Printer,     
  CheckCircle, 
  Clock,       
  Truck,
  LogOut,      // Nuevo icono para cerrar sesión
  Lock         // Icono para el login
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, // Usamos esto en lugar de Anónimo
  signOut,                   // Para cerrar sesión
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
  increment
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

// --- Componente de Login (Pantalla de Bloqueo) ---
const LoginView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El onAuthStateChanged en el componente principal manejará la redirección
    } catch (err) {
      console.error(err);
      setError('Credenciales incorrectas. Intenta de nuevo.');
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-pink-100">
        <div className="text-center mb-8">
          <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-500">
            <ShoppingBag size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Aura Beauty Store</h1>
          <p className="text-slate-500 text-sm mt-1">Acceso Administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-slate-900"
                placeholder="admin@aura.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all text-slate-900"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium animate-pulse">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loggingIn}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-pink-200 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loggingIn ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">Sistema Privado de Gestión</p>
        </div>
      </div>
    </div>
  );
};

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

  // Estado para el Recibo
  const [receiptSale, setReceiptSale] = useState(null); 

  // 1. Efecto de Autenticación
  useEffect(() => {
    // Ya no hacemos login anónimo automático
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Dejamos de cargar cuando Firebase nos dice si hay usuario o no
    });
    return () => unsubscribe();
  }, []);

  // 2. Efecto de Datos (Productos) - Solo si hay usuario
  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    }, (error) => {
      console.error("Error fetching products:", error);
      showNotification("Error al cargar productos", "error");
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Efecto de Datos (Ventas) - Solo si hay usuario
  useEffect(() => {
    if (!user) return;
    const salesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sales');
    const unsubscribe = onSnapshot(salesRef, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      salesData.sort((a, b) => new Date(b.date) - new Date(a.date)); 
      setSales(salesData);
    }, (error) => {
      console.error("Error fetching sales:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Funciones de Base de Datos ---

  const handleAddProduct = async (productData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), productData);
      showNotification("Producto guardado correctamente");
    } catch (error) {
      console.error("Error adding product:", error);
      showNotification("Error al guardar producto", "error");
    }
  };

  const handleUpdateProduct = async (id, productData) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', id);
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
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
      showNotification("Producto eliminado");
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleUpdateSaleStatus = async (saleId, newStatus) => {
    if (!user) return;
    try {
      const saleRef = doc(db, 'artifacts', appId, 'public', 'data', 'sales', saleId);
      await updateDoc(saleRef, { status: newStatus });
      showNotification(`Estado actualizado a: ${newStatus}`);
    } catch (error) {
      console.error("Error updating sale status:", error);
      showNotification("Error al cambiar estado", "error");
    }
  };

  const handleProcessSale = async (cartItems, total, totalProfit, customerName, status = 'Pagado') => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const newSaleId = doc(collection(db, 'artifacts', appId, 'public', 'data', 'sales')).id;
      const saleRef = doc(db, 'artifacts', appId, 'public', 'data', 'sales', newSaleId);
      
      const saleData = {
        id: newSaleId,
        date: new Date().toISOString(),
        items: cartItems,
        total: total,
        totalProfit: totalProfit,
        customerName: customerName || "Cliente Casual",
        status: status
      };

      batch.set(saleRef, saleData);

      cartItems.forEach(item => {
        const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id);
        batch.update(productRef, { stock: increment(-item.quantity) });
      });

      await batch.commit();
      setCart([]);
      setReceiptSale(saleData); 
      showNotification(`Venta registrada exitosamente.`);
    } catch (error) {
      console.error("Error processing sale:", error);
      showNotification("Error al procesar la venta", "error");
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!user) return;
    if (!window.confirm(`¿Estás seguro de eliminar la venta de ${sale.customerName}? El stock será devuelto al inventario.`)) return;

    try {
      const batch = writeBatch(db);
      sale.items.forEach(item => {
        const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id);
        batch.update(productRef, { stock: increment(item.quantity) });
      });
      const saleRef = doc(db, 'artifacts', appId, 'public', 'data', 'sales', sale.id);
      batch.delete(saleRef);
      await batch.commit();
      showNotification("Venta eliminada y stock restaurado correctamente.");
    } catch (error) {
      console.error("Error deleting sale:", error);
      showNotification("Error al eliminar", "error");
    }
  };

  // --- LÓGICA DE RENDERIZADO PRINCIPAL ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-pink-400 bg-pink-50">
        <Loader className="animate-spin mb-4" size={40} />
        <p className="text-slate-600 font-medium">Cargando Aura...</p>
      </div>
    );
  }

  // SI NO HAY USUARIO, MOSTRAR LOGIN
  if (!user) {
    return <LoginView />;
  }

  // SI HAY USUARIO, MOSTRAR APP
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView sales={sales} products={products} onDeleteSale={handleDeleteSale} onUpdateStatus={handleUpdateSaleStatus} onViewReceipt={setReceiptSale} />;
      case 'inventory':
        return <InventoryView products={products} onAdd={handleAddProduct} onUpdate={handleUpdateProduct} onDelete={handleDeleteProduct} showNotification={showNotification} />;
      case 'pos':
        return <POSView products={products} cart={cart} setCart={setCart} onCheckout={handleProcessSale} showNotification={showNotification} />;
      default:
        return <DashboardView sales={sales} products={products} onDeleteSale={handleDeleteSale} onUpdateStatus={handleUpdateSaleStatus} onViewReceipt={setReceiptSale} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-pink-100 flex-col shadow-sm">
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
           {/* Botón Cerrar Sesión Desktop */}
           <button 
             onClick={handleLogout}
             className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
           >
              <LogOut size={16} /> Cerrar Sesión
           </button>
           <p className="text-xs text-slate-300 text-center mt-4">Aura Beauty Store © 2025</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white p-4 md:p-6 border-b border-pink-50 shadow-sm flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="md:hidden bg-pink-500 text-white p-1.5 rounded-lg">
                <ShoppingBag size={20} />
             </div>
             <h2 className="text-lg md:text-xl font-semibold text-slate-700 truncate">
              {activeTab === 'dashboard' && 'Resumen'}
              {activeTab === 'inventory' && 'Inventario'}
              {activeTab === 'pos' && 'Caja'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
             <span className="hidden md:inline text-sm font-medium text-slate-500">{user.email}</span>
             <div className="h-8 w-8 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-500 font-bold">
                {user.email ? user.email[0].toUpperCase() : 'A'}
             </div>
             {/* Botón Logout Mobile */}
             <button onClick={handleLogout} className="md:hidden p-2 text-slate-400 hover:text-red-500">
                <LogOut size={20} />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          {notification && (
            <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce text-white ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
              {notification.message}
            </div>
          )}
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <MobileNavItem icon={<LayoutDashboard size={24} />} label="Panel" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<ShoppingCart size={24} />} label="Vender" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
        <MobileNavItem icon={<Package size={24} />} label="Items" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
      </nav>

      {/* MODAL DE RECIBO GLOBAL */}
      {receiptSale && (
        <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-pink-50 text-pink-700 font-medium shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
    {icon} <span>{label}</span>
  </button>
);

const MobileNavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-lg w-full transition-colors ${active ? 'text-pink-600' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, color, warning }) => (
  <div className={`p-6 rounded-xl border ${warning ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-white'} shadow-sm flex items-center gap-4`}>
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className={`text-2xl font-bold ${warning ? 'text-orange-600' : 'text-slate-800'}`}>{value}</h3>
    </div>
  </div>
);

// --- COMPONENTE DE RECIBO ---
const ReceiptModal = ({ sale, onClose }) => {
  const receiptRef = useRef(null);

  const handlePrint = () => {
    const content = receiptRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write('<html><head><title>Recibo Aura</title>');
    printWindow.document.write('<style>body{font-family: monospace; padding: 20px;} .header{text-align:center; margin-bottom: 20px;} .item{display:flex; justify-content:space-between; margin-bottom: 5px;} .total{border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; display: flex; justify-content: space-between;} .footer{text-align:center; margin-top: 20px; font-size: 12px;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-4 bg-pink-50 border-b border-pink-100 flex justify-between items-center">
          <h3 className="font-bold text-pink-700 flex items-center gap-2">
            <Printer size={18} /> Recibo de Venta
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-white" ref={receiptRef}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-widest">Aura</h2>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Beauty Store</p>
            <div className="w-full border-b border-dashed border-slate-300 my-4"></div>
            <p className="text-sm text-slate-600">Fecha: {new Date(sale.date).toLocaleString()}</p>
            <p className="text-sm text-slate-600">Cliente: {sale.customerName}</p>
            <p className="text-sm font-bold mt-1 text-slate-800 uppercase">{sale.status || 'Pagado'}</p>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <span className="flex-1 mr-2">{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                <span className="font-mono">Q{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="w-full border-b border-dashed border-slate-300 my-4"></div>

          <div className="flex justify-between items-center text-lg font-bold text-slate-800">
            <span>TOTAL</span>
            <span>Q{sale.total.toFixed(2)}</span>
          </div>

          <div className="mt-8 text-center text-xs text-slate-400">
            <p>¡Gracias por tu compra!</p>
            <p>Vuelve pronto</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
            Cerrar
          </button>
          <button onClick={handlePrint} className="flex-1 py-3 bg-slate-800 text-white font-medium hover:bg-slate-900 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

// --- VISTA 1: DASHBOARD ---
const DashboardView = ({ sales, products, onDeleteSale, onUpdateStatus, onViewReceipt }) => {
  const [selectedSale, setSelectedSale] = useState(null);

  const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalProfit = sales.reduce((acc, sale) => acc + sale.totalProfit, 0);
  const totalStockValue = products.reduce((acc, prod) => acc + (prod.cost * prod.stock), 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  const StatusBadge = ({ status, onClick }) => {
    let colorClass = "bg-green-100 text-green-700 border-green-200";
    let icon = <CheckCircle size={12} />;
    
    if (status === 'Pendiente') {
      colorClass = "bg-amber-100 text-amber-700 border-amber-200";
      icon = <Clock size={12} />;
    } else if (status === 'Entregado') {
      colorClass = "bg-blue-100 text-blue-700 border-blue-200";
      icon = <Truck size={12} />;
    }

    return (
      <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass} hover:opacity-80 transition-opacity`}
      >
        {icon} {status || 'Pagado'}
      </button>
    );
  };

  const cycleStatus = (sale) => {
    const current = sale.status || 'Pagado';
    let next = 'Pagado';
    if (current === 'Pagado') next = 'Entregado';
    if (current === 'Entregado') next = 'Pendiente';
    if (current === 'Pendiente') next = 'Pagado';
    onUpdateStatus(sale.id, next);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Ventas Totales" value={`Q${totalSales.toFixed(2)}`} icon={<DollarSign className="text-pink-500" />} color="bg-pink-50" />
        <StatCard title="Ganancia Neta" value={`Q${totalProfit.toFixed(2)}`} icon={<TrendingUp className="text-emerald-500" />} color="bg-emerald-50" />
        <StatCard title="Valor Inventario" value={`Q${totalStockValue.toFixed(2)}`} icon={<Package className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Stock Bajo" value={lowStockCount} icon={<Package className="text-orange-500" />} color="bg-orange-50" warning={lowStockCount > 0} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-50">
          <h3 className="font-semibold text-lg text-slate-700">Historial de Ventas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium text-xs">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Fecha</th>
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
                    <td className="px-6 py-4">
                      <StatusBadge status={sale.status} onClick={() => cycleStatus(sale)} />
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">Q{sale.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(sale.date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => onViewReceipt(sale)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Ver Recibo"><Printer size={16} /></button>
                        <button onClick={() => setSelectedSale(sale)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Detalles"><Eye size={16} /></button>
                        <button onClick={() => onDeleteSale(sale)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Borrar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                   <p className="mt-1 font-bold text-xs uppercase text-slate-400">{selectedSale.status || 'Pagado'}</p>
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
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right flex gap-2 justify-end">
              <button onClick={() => { setSelectedSale(null); onViewReceipt(selectedSale); }} className="text-slate-600 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Printer size={16}/> Imprimir Recibo
              </button>
              <button onClick={() => setSelectedSale(null)} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- VISTA 2: INVENTARIO ---
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-100 lg:sticky lg:top-4">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
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
                      <div className="flex justify-center gap-2">
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
    </div>
  );
};

// --- VISTA 3: PUNTO DE VENTA (POS Responsive) ---
const POSView = ({ products, cart, setCart, onCheckout, showNotification }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleStatus, setSaleStatus] = useState('Pagado'); // Estado inicial
  const [showMobileCart, setShowMobileCart] = useState(false);

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
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCompleteSale = () => {
    onCheckout(cart, cartTotal, cartProfit, customerName, saleStatus);
    setCustomerName(''); 
    setSaleStatus('Pagado'); // Resetear a Pagado
    setShowMobileCart(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-140px)] gap-6 relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 flex items-center gap-2 shrink-0">
          <Search className="text-slate-400" />
          <input type="text" placeholder="Buscar producto..." className="flex-1 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 content-start pb-20 lg:pb-0">
          {filteredProducts.map(product => (
            <button key={product.id} onClick={() => addToCart(product)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-pink-300 hover:shadow-md transition-all text-left flex flex-col justify-between group h-32 relative active:scale-95 duration-100">
              <div>
                <h4 className="font-semibold text-slate-700 leading-tight line-clamp-2 text-sm md:text-base">{product.name}</h4>
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

      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-16 left-4 right-4 z-30">
          <button 
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-slate-900 text-white p-4 rounded-xl shadow-xl flex justify-between items-center"
          >
            <div className="flex items-center gap-2">
              <div className="bg-pink-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{cartItemCount}</div>
              <span className="font-medium">Ver Carrito</span>
            </div>
            <span className="font-bold text-lg">Q{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      <div className={`
        fixed inset-0 z-50 bg-white lg:static lg:bg-transparent lg:z-auto
        flex flex-col w-full lg:w-96 lg:rounded-xl lg:shadow-lg lg:border lg:border-slate-200 lg:h-full
        transition-transform duration-300 ease-in-out
        ${showMobileCart ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="lg:hidden p-4 border-b border-slate-100 flex justify-between items-center bg-pink-50">
           <h3 className="font-bold text-slate-800">Carrito de Venta</h3>
           <button onClick={() => setShowMobileCart(false)} className="p-2 bg-white rounded-full text-slate-500 shadow-sm"><X size={20}/></button>
        </div>

        <div className="hidden lg:block p-4 border-b border-slate-100 bg-pink-50 lg:rounded-t-xl">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={20} className="text-pink-600" /> Venta Actual</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
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
        <div className="p-6 bg-slate-50 border-t border-slate-100 lg:rounded-b-xl space-y-4">
          
          {/* Selector de Cliente */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-pink-200">
                <User size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Nombre del cliente (Opcional)"
                  className="w-full outline-none text-sm text-slate-700"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
             </div>
             
             {/* Selector de Estado */}
             <div className="flex gap-2">
                <button 
                  onClick={() => setSaleStatus('Pagado')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${saleStatus === 'Pagado' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  PAGADO
                </button>
                <button 
                  onClick={() => setSaleStatus('Pendiente')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${saleStatus === 'Pendiente' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  PENDIENTE
                </button>
             </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
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
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:shadow-pink-200 hover:scale-[1.02]'}`}
          >
             {saleStatus === 'Pendiente' ? 'Guardar Pedido' : 'Cobrar e Imprimir'}
          </button>
        </div>
      </div>
    </div>
  );
};