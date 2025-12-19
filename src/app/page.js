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
  LogOut,      
  Lock,
  PieChart,
  Wallet, 
  ArrowRight,
  RefreshCcw // Icono para reinversión
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,                   
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
function LoginView() {
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
}

// --- Componente Principal ---
export default function AuraApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Estados de Datos
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  
  // Estado local del Carrito
  const [cart, setCart] = useState([]);
  const [notification, setNotification] = useState(null);

  // Estado para el Recibo
  const [receiptSale, setReceiptSale] = useState(null); 

  // Variable auxiliar para verificar si es Socio (Andy o Dafne)
  const isPartner = user?.email === 'andy@aurabeauty.com' || user?.email === 'dafne@aurabeauty.com';

  // 1. Efecto de Autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // LOGICA DE SEGURIDAD: Si detectamos un usuario anónimo (sesión antigua),
      // lo desconectamos forzosamente para pedir credenciales reales.
      if (currentUser && currentUser.isAnonymous) {
        await signOut(auth);
        setUser(null);
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Efecto de Datos (Productos)
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

  // 3. Efecto de Datos (Ventas)
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

  // 4. Efecto de Datos (Retiros/Gastos)
  useEffect(() => {
    if (!user) return;
    const withdrawalsRef = collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals');
    const unsubscribe = onSnapshot(withdrawalsRef, (snapshot) => {
      const wData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      wData.sort((a, b) => new Date(b.date) - new Date(a.date)); 
      setWithdrawals(wData);
    }, (error) => {
      console.error("Error fetching withdrawals:", error);
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

  const handleAddWithdrawal = async (withdrawalData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'withdrawals'), {
        ...withdrawalData,
        date: new Date().toISOString()
      });
      showNotification("Retiro registrado correctamente");
    } catch (error) {
      console.error("Error adding withdrawal:", error);
      showNotification("Error al registrar retiro", "error");
    }
  };

  const handleDeleteWithdrawal = async (id) => {
    if (!user) return;
    if (!window.confirm("¿Eliminar este registro? Si fue un pago a socio, se sumará de nuevo a su saldo pendiente.")) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'withdrawals', id));
      showNotification("Registro eliminado y saldo restaurado");
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
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
      case 'profits': 
        return isPartner ? <ProfitDistributionView sales={sales} withdrawals={withdrawals} onAddWithdrawal={handleAddWithdrawal} onDeleteWithdrawal={handleDeleteWithdrawal} /> : <DashboardView sales={sales} products={products} onDeleteSale={handleDeleteSale} onUpdateStatus={handleUpdateSaleStatus} onViewReceipt={setReceiptSale} />;
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
          
          {/* SECCIÓN SOLO VISIBLE PARA SOCIOS */}
          {isPartner && (
            <SidebarItem icon={<PieChart size={20} />} label="Socios / Ganancias" active={activeTab === 'profits'} onClick={() => setActiveTab('profits')} />
          )}
        </nav>

        <div className="p-4 border-t border-pink-50">
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
              {activeTab === 'profits' && 'Distribución de Socios'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
             <span className="hidden md:inline text-sm font-medium text-slate-500">{user.email}</span>
             <div className="h-8 w-8 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-500 font-bold">
                {user.email ? user.email[0].toUpperCase() : 'A'}
             </div>
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
        
        {isPartner && (
          <MobileNavItem icon={<PieChart size={24} />} label="Socios" active={activeTab === 'profits'} onClick={() => setActiveTab('profits')} />
        )}
      </nav>

      {receiptSale && (
        <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES (DEFINIDOS COMO FUNCIONES) ---

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-pink-50 text-pink-700 font-medium shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-lg w-full transition-colors ${active ? 'text-pink-600' : 'text-slate-400'}`}>
      {icon}
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, color, warning }) {
  return (
    <div className={`p-6 rounded-xl border ${warning ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-white'} shadow-sm flex items-center gap-4`}>
      <div className={`p-3 rounded-full ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <h3 className={`text-2xl font-bold ${warning ? 'text-orange-600' : 'text-slate-800'}`}>{value}</h3>
      </div>
    </div>
  );
}

// --- COMPONENTE DE RECIBO ---
function ReceiptModal({ sale, onClose }) {
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
}

// --- COMPONENTE DE RECIBO DE RETIRO ---
function WithdrawalReceiptModal({ data, onClose }) {
  const receiptRef = useRef(null);

  const handlePrint = () => {
    const content = receiptRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write('<html><head><title>Comprobante de Retiro</title>');
    printWindow.document.write('<style>body{font-family: monospace; padding: 20px;} .header{text-align:center; margin-bottom: 20px;} .total{border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 1.2em; text-align: right;} .footer{text-align:center; margin-top: 30px; font-size: 12px; border-top: 1px solid #ccc; padding-top: 10px; width: 80%; margin-left: auto; margin-right: auto;}</style>');
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
            <FileText size={18} /> Comprobante
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-white" ref={receiptRef}>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Aura Beauty</h2>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Comprobante de Egreso</p>
            <div className="w-full border-b border-dashed border-slate-300 my-4"></div>
            <p className="text-sm text-slate-600">Fecha: {new Date(data.date).toLocaleString()}</p>
            <p className="text-sm font-bold mt-2 text-slate-800 uppercase bg-slate-100 inline-block px-2 py-1 rounded">{data.type}</p>
          </div>

          <div className="space-y-3 text-sm text-slate-700 mt-4">
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Beneficiario:</span>
              <span>{data.beneficiary}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500">Concepto:</span>
              <span className="text-right max-w-[150px]">{data.description || '-'}</span>
            </div>
          </div>

          <div className="w-full border-b border-dashed border-slate-300 my-4"></div>

          <div className="flex justify-between items-center text-xl font-bold text-slate-800">
            <span>MONTO</span>
            <span>Q{parseFloat(data.amount).toFixed(2)}</span>
          </div>

          <div className="mt-12 text-center text-xs text-slate-400">
            <div className="border-t border-slate-300 w-3/4 mx-auto pt-2">
              Firma de Recibido
            </div>
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
}

// --- VISTA 4: DISTRIBUCIÓN DE GANANCIAS ---
function ProfitDistributionView({ sales, withdrawals, onAddWithdrawal, onDeleteWithdrawal }) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawType, setWithdrawType] = useState('Pago Socio');
  const [beneficiary, setBeneficiary] = useState('Andy');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  // Filtrar solo ventas completadas
  const relevantSales = sales.filter(sale => !sale.status || sale.status === 'Pagado' || sale.status === 'Entregado');

  // 1. Calcular Ganancias y Costos Recuperados
  const totalProfit = relevantSales.reduce((acc, sale) => acc + (sale.totalProfit || 0), 0);
  const totalRevenue = relevantSales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const totalCostRecovered = totalRevenue - totalProfit;
  
  // 2. Calcular Retiros y Gastos
  const totalWithdrawn = withdrawals.reduce((acc, w) => acc + parseFloat(w.amount), 0);
  // Gastos de empresa: Se restarán de la ganancia total antes de repartir
  const companyExpenses = withdrawals.filter(w => w.type === 'Gasto Empresa').reduce((acc, w) => acc + parseFloat(w.amount), 0);
  
  // Pagos ya realizados a socios
  const andyPaid = withdrawals.filter(w => w.beneficiary === 'Andy').reduce((acc, w) => acc + parseFloat(w.amount), 0);
  const dafnePaid = withdrawals.filter(w => w.beneficiary === 'Dafne').reduce((acc, w) => acc + parseFloat(w.amount), 0);

  // 3. Calcular Utilidad Repartible (Ganancia Venta - Gastos Empresa)
  const distributableProfit = totalProfit - companyExpenses;

  // 4. Calcular Participación Total (60% / 40% sobre la utilidad repartible)
  const andyTotalShare = distributableProfit * 0.60;
  const dafneTotalShare = distributableProfit * 0.40;
  
  // 5. Saldos Pendientes (Participación - Lo que ya se pagaron)
  const andyRemaining = andyTotalShare - andyPaid;
  const dafneRemaining = dafneTotalShare - dafnePaid;

  // 6. Dinero Físico en Caja (Ganancia Venta Total - Todo lo que ha salido)
  const cashInHand = totalProfit - totalWithdrawn;

  const handleSubmitWithdrawal = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    if (parseFloat(amount) > cashInHand) {
      if(!window.confirm("El monto supera el dinero disponible en caja (basado en ganancias). ¿Continuar igual?")) return;
    }

    const newWithdrawal = {
      type: withdrawType,
      beneficiary: withdrawType === 'Gasto Empresa' ? 'Empresa' : beneficiary,
      amount: parseFloat(amount),
      description: description,
    };

    onAddWithdrawal(newWithdrawal);
    setReceiptData({ ...newWithdrawal, date: new Date().toISOString() }); 
    
    setAmount('');
    setDescription('');
    setShowWithdrawModal(false);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TARJETA 1: CAPITAL RECUPERADO (COSTOS) */}
        <div className="bg-blue-900 p-8 rounded-2xl shadow-lg border border-blue-800 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-blue-300 mb-2 uppercase tracking-wide flex items-center justify-center gap-2">
              <RefreshCcw size={20}/> Capital Recuperado (Costo)
            </h3>
            <p className="text-5xl font-black text-white mb-2">Q{totalCostRecovered.toFixed(2)}</p>
            <p className="text-xs text-blue-200">Dinero para reinvertir en productos</p>
          </div>
          {/* Decoración Fondo */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* TARJETA 2: GANANCIA EN CAJA */}
        <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-slate-300 mb-2 uppercase tracking-wide flex items-center justify-center gap-2">
              <Wallet size={20}/> Ganancia Neta en Caja
            </h3>
            <p className="text-5xl font-black text-emerald-400 mb-2">Q{cashInHand.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mb-6">Utilidad Repartible: Q{distributableProfit.toFixed(2)}</p>
            
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-slate-100 transition-colors shadow-md flex items-center gap-2 mx-auto"
            >
              Retirar / Registrar Gasto <ArrowRight size={16} />
            </button>
          </div>
          {/* Decoración Fondo */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta de Andy */}
        <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 px-3 py-1 rounded-bl-xl font-bold text-xs">60%</div>
           <div className="flex items-center gap-3 mb-4">
             <div className="bg-purple-50 p-3 rounded-full text-purple-600"><User size={24} /></div>
             <div>
               <h4 className="font-bold text-lg text-slate-800">Andy</h4>
               <p className="text-xs text-slate-500">Saldo Pendiente de Cobro</p>
             </div>
           </div>
           
           <div className="flex justify-between items-end mb-2">
             <p className="text-3xl font-bold text-purple-700">Q{andyRemaining.toFixed(2)}</p>
             <div className="text-right">
                <p className="text-xs text-slate-400">Participación: Q{andyTotalShare.toFixed(2)}</p>
             </div>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((andyPaid / (andyTotalShare || 1)) * 100, 100)}%` }}
              ></div>
           </div>
           <p className="text-xs text-slate-400 mt-2 text-right">Pagado: Q{andyPaid.toFixed(2)}</p>
        </div>

        {/* Tarjeta de Dafne */}
        <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 bg-pink-100 text-pink-700 px-3 py-1 rounded-bl-xl font-bold text-xs">40%</div>
           <div className="flex items-center gap-3 mb-4">
             <div className="bg-pink-50 p-3 rounded-full text-pink-600"><User size={24} /></div>
             <div>
               <h4 className="font-bold text-lg text-slate-800">Dafne</h4>
               <p className="text-xs text-slate-500">Saldo Pendiente de Cobro</p>
             </div>
           </div>
           
           <div className="flex justify-between items-end mb-2">
             <p className="text-3xl font-bold text-pink-700">Q{dafneRemaining.toFixed(2)}</p>
             <div className="text-right">
                <p className="text-xs text-slate-400">Participación: Q{dafneTotalShare.toFixed(2)}</p>
             </div>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-pink-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((dafnePaid / (dafneTotalShare || 1)) * 100, 100)}%` }}
              ></div>
           </div>
           <p className="text-xs text-slate-400 mt-2 text-right">Pagado: Q{dafnePaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Historial de Retiros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="font-semibold text-lg text-slate-700">Historial de Movimientos</h3>
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium text-xs sticky top-0">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Beneficiario</th>
                <th className="px-6 py-3">Monto</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {withdrawals.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-400">No hay movimientos registrados.</td></tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">{new Date(w.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${w.type === 'Gasto Empresa' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{w.type}</span></td>
                    <td className="px-6 py-3 font-medium">{w.beneficiary}</td>
                    <td className="px-6 py-3 font-bold text-red-500">-Q{parseFloat(w.amount).toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setReceiptData(w)} className="text-slate-400 hover:text-slate-600" title="Ver Recibo"><Printer size={16}/></button>
                        <button onClick={() => onDeleteWithdrawal(w.id)} className="text-red-400 hover:text-red-600" title="Eliminar y Restaurar Saldo"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE RETIRO */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-xl text-slate-800 mb-4">Registrar Salida de Dinero</h3>
            
            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Tipo de Movimiento</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setWithdrawType('Pago Socio')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${withdrawType === 'Pago Socio' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-500'}`}>Pago a Socio</button>
                  <button type="button" onClick={() => setWithdrawType('Gasto Empresa')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${withdrawType === 'Gasto Empresa' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-slate-200 text-slate-500'}`}>Gasto Empresa</button>
                </div>
              </div>

              {withdrawType === 'Pago Socio' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">¿A quién se le paga?</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setBeneficiary('Andy')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${beneficiary === 'Andy' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200 text-slate-500'}`}>Andy</button>
                    <button type="button" onClick={() => setBeneficiary('Dafne')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${beneficiary === 'Dafne' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'border-slate-200 text-slate-500'}`}>Dafne</button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Monto (Q)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-lg font-bold text-slate-800" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Disponible en caja: Q{cashInHand.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Descripción / Notas</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" 
                  placeholder="Ej. Adelanto de utilidades, Pago de luz..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptData && (
        <WithdrawalReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </div>
  );
}