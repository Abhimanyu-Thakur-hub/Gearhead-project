import React, { useState, useEffect, useMemo, createContext, useContext, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  Bike, 
  Wrench, 
  DollarSign, 
  ShoppingBag, 
  Palette, 
  TrendingUp, 
  Trash2, 
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LogIn,
  User as UserIcon
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs,
  writeBatch,
  onSnapshot, 
  query, 
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { Vehicle, VehicleModel, Part, GameState } from './types';
import { VEHICLE_MODELS, PARTS, COLORS } from './constants';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white p-8 border border-red-200 shadow-xl rounded-2xl">
            <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
            <h2 className="text-xl font-bold text-red-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-700 mb-6">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Firebase Context ---
interface FirebaseContextType {
  user: FirebaseUser | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({ user: null, loading: true });

const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};

const INITIAL_STATE: GameState = {
  money: 10000,
  inventory: [],
  marketplace: [],
  day: 1
};

function Game() {
  const { user } = useContext(FirebaseContext);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'garage' | 'inventory' | 'profile'>('marketplace');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Splash screen effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Sync User Profile
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(prev => ({ ...prev, money: data.money, day: data.day }));
      } else {
        // Initialize user if not exists
        setDoc(userDocRef, { money: 10000, day: 1 })
          .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));

    return () => unsubscribe();
  }, [user]);

  // Sync Inventory
  useEffect(() => {
    if (!user) return;

    const inventoryRef = collection(db, 'users', user.uid, 'vehicles');
    const unsubscribe = onSnapshot(inventoryRef, (snapshot) => {
      const vehicles: Vehicle[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      setGameState(prev => ({ ...prev, inventory: vehicles }));
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/vehicles`));

    return () => unsubscribe();
  }, [user]);

  // Sync Marketplace
  useEffect(() => {
    if (!user) return;

    const marketplaceRef = collection(db, 'users', user.uid, 'marketplace');
    const unsubscribe = onSnapshot(marketplaceRef, (snapshot) => {
      const vehicles: Vehicle[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      setGameState(prev => ({ ...prev, marketplace: vehicles }));
      
      // If marketplace is empty, refresh it
      if (snapshot.empty) {
        refreshMarketplace();
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}/marketplace`));

    return () => unsubscribe();
  }, [user]);

  const refreshMarketplace = async () => {
    if (!user) return;

    try {
      const marketplaceRef = collection(db, 'users', user.uid, 'marketplace');
      const snapshot = await getDocs(marketplaceRef);
      
      const batch = writeBatch(db);
      
      // Delete old items
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });

      // Add new items
      const newItems = Array.from({ length: 4 }).map(() => {
        const model = VEHICLE_MODELS[Math.floor(Math.random() * VEHICLE_MODELS.length)];
        const condition = 0.2 + Math.random() * 0.7;
        const priceModifier = 0.8 + Math.random() * 0.4;
        
        return {
          modelId: model.id,
          type: model.type,
          name: model.name,
          basePrice: model.basePrice,
          condition,
          customization: {
            color: COLORS[0].value,
            installedParts: []
          },
          purchasePrice: Math.floor(model.basePrice * condition * priceModifier)
        };
      });

      newItems.forEach((item) => {
        const newDocRef = doc(marketplaceRef);
        batch.set(newDocRef, item);
      });

      // Increment day
      const userDocRef = doc(db, 'users', user.uid);
      batch.update(userDocRef, { day: gameState.day + 1 });

      await batch.commit();
      showNotification(`Day ${gameState.day + 1}: Marketplace Refreshed!`, "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `refreshMarketplace`);
    }
  };

  const buyVehicle = async (vehicle: Vehicle) => {
    if (!user) return;
    if (gameState.money < vehicle.purchasePrice) {
      showNotification("Not enough money!", "error");
      return;
    }

    try {
      // 1. Deduct money
      await updateDoc(doc(db, 'users', user.uid), {
        money: gameState.money - vehicle.purchasePrice
      });

      // 2. Add to inventory
      const { id, ...data } = vehicle;
      await addDoc(collection(db, 'users', user.uid, 'vehicles'), data);

      // 3. Remove from marketplace
      await deleteDoc(doc(db, 'users', user.uid, 'marketplace', vehicle.id));

      showNotification(`Bought ${vehicle.name}!`, "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `buyVehicle`);
    }
  };

  const sellVehicle = async (vehicle: Vehicle) => {
    if (!user) return;
    const salePrice = calculateValue(vehicle);

    try {
      // 1. Add money
      await updateDoc(doc(db, 'users', user.uid), {
        money: gameState.money + salePrice
      });

      // 2. Remove from inventory
      await deleteDoc(doc(db, 'users', user.uid, 'vehicles', vehicle.id));

      if (selectedVehicleId === vehicle.id) setSelectedVehicleId(null);
      showNotification(`Sold ${vehicle.name} for $${salePrice.toLocaleString()}!`, "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sellVehicle`);
    }
  };

  const calculateValue = (vehicle: Vehicle) => {
    let value = vehicle.basePrice * vehicle.condition;
    vehicle.customization.installedParts.forEach(partId => {
      const part = PARTS.find(p => p.id === partId);
      if (part) {
        value += part.price * 1.2;
        value += (part.appealBoost + part.performanceBoost) * 10;
      }
    });
    if (vehicle.customization.color !== COLORS[0].value) {
      value += 200;
    }
    return Math.floor(value);
  };

  const installPart = async (vehicleId: string, part: Part) => {
    if (!user) return;
    if (gameState.money < part.price) {
      showNotification("Not enough money!", "error");
      return;
    }

    const vehicle = gameState.inventory.find(v => v.id === vehicleId);
    if (!vehicle) return;

    if (vehicle.customization.installedParts.includes(part.id)) {
      showNotification("Part already installed!", "error");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        money: gameState.money - part.price
      });

      await updateDoc(doc(db, 'users', user.uid, 'vehicles', vehicleId), {
        'customization.installedParts': [...vehicle.customization.installedParts, part.id]
      });

      showNotification(`Installed ${part.name}!`, "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `installPart`);
    }
  };

  const changeColor = async (vehicleId: string, color: string) => {
    if (!user) return;
    const cost = 500;
    if (gameState.money < cost) {
      showNotification("Not enough money for paint job!", "error");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        money: gameState.money - cost
      });

      await updateDoc(doc(db, 'users', user.uid, 'vehicles', vehicleId), {
        'customization.color': color
      });

      showNotification("Paint job complete!", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `changeColor`);
    }
  };

  const repairVehicle = async (vehicle: Vehicle) => {
    if (!user) return;
    if (vehicle.condition >= 1) {
      showNotification("Vehicle is already in mint condition!", "success");
      return;
    }

    const repairCost = Math.floor(vehicle.basePrice * (1 - vehicle.condition) * 0.5);
    if (gameState.money < repairCost) {
      showNotification(`Need $${repairCost.toLocaleString()} to repair!`, "error");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        money: gameState.money - repairCost
      });

      await updateDoc(doc(db, 'users', user.uid, 'vehicles', vehicle.id), {
        condition: 1
      });

      showNotification("Vehicle restored to mint condition!", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `repairVehicle`);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const calculateStats = (vehicle: Vehicle) => {
    let performance = 0;
    let appeal = 0;
    vehicle.customization.installedParts.forEach(partId => {
      const part = PARTS.find(p => p.id === partId);
      if (part) {
        performance += part.performanceBoost;
        appeal += part.appealBoost;
      }
    });
    // Color bonus
    if (vehicle.customization.color !== COLORS[0].value) {
      appeal += 10;
    }
    return { performance, appeal };
  };

  const selectedVehicle = useMemo(() => 
    gameState.inventory.find(v => v.id === selectedVehicleId),
    [gameState.inventory, selectedVehicleId]
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-[#E4E3E0] p-6 overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <div className="text-8xl mb-8">🏎️</div>
          <h1 className="text-5xl font-bold tracking-tighter uppercase italic font-serif mb-2">Gearhead</h1>
          <h2 className="text-5xl font-bold tracking-tighter uppercase italic font-serif mb-6">Garage</h2>
          <div className="w-48 h-1 bg-[#E4E3E0]/20 mx-auto relative overflow-hidden rounded-full">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-[#E4E3E0]"
            />
          </div>
          <p className="mt-8 text-[10px] uppercase tracking-[0.3em] opacity-50 font-mono">Loading Workshop...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#141414]/5 p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] text-white flex items-center justify-center text-xl rounded-lg shadow-lg">🏎️</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase italic font-serif leading-none">Gearhead</h1>
            <p className="text-[8px] opacity-50 uppercase tracking-widest font-mono">Garage Tycoon</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="bg-[#141414] text-[#E4E3E0] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
              <DollarSign size={12} className="text-green-400" />
              <span className="text-sm font-bold font-mono">{gameState.money.toLocaleString()}</span>
            </div>
            <p className="text-[8px] uppercase font-mono mt-1 opacity-50">Day {gameState.day}</p>
          </div>
          <button onClick={logout} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'marketplace' && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl font-serif italic">Marketplace</h2>
                <button 
                  onClick={refreshMarketplace}
                  className="text-[10px] uppercase font-bold border border-[#141414] px-3 py-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                >
                  Refresh
                </button>
              </div>
              {gameState.marketplace.map((vehicle) => (
                <div key={vehicle.id} className="bg-white border border-[#141414]/5 p-5 rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-5xl">{vehicle.type === 'car' ? '🚗' : '🏍️'}</div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-mono opacity-50">Condition</p>
                      <p className="text-sm font-bold">{(vehicle.condition * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{vehicle.name}</h3>
                  <p className="text-xs mb-6 opacity-60 leading-relaxed">
                    {VEHICLE_MODELS.find(m => m.id === vehicle.modelId)?.description}
                  </p>
                  <div className="mt-auto pt-4 border-t border-[#141414]/5 flex justify-between items-center">
                    <span className="text-lg font-bold font-mono">${vehicle.purchasePrice.toLocaleString()}</span>
                    <button
                      onClick={() => buyVehicle(vehicle)}
                      disabled={gameState.inventory.length >= 5}
                      className="bg-[#141414] text-[#E4E3E0] px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {gameState.inventory.length >= 5 ? 'Full' : 'Buy'}
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-serif italic mb-6">My Garage</h2>
              {gameState.inventory.length === 0 ? (
                <div className="bg-white border border-[#141414]/5 p-12 text-center rounded-3xl shadow-sm">
                  <p className="opacity-40 uppercase tracking-widest text-xs">Garage is empty</p>
                  <button 
                    onClick={() => setActiveTab('marketplace')}
                    className="mt-4 text-xs font-bold underline uppercase tracking-widest"
                  >
                    Go Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {gameState.inventory.map((vehicle) => (
                    <div 
                      key={vehicle.id} 
                      className="bg-white border border-[#141414]/5 p-4 rounded-2xl flex items-center justify-between shadow-sm group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl" style={{ color: vehicle.customization.color }}>
                          {vehicle.type === 'car' ? '🚗' : '🏍️'}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{vehicle.name}</h3>
                          <p className="text-[10px] uppercase opacity-50 font-mono">
                            Value: ${calculateValue(vehicle).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedVehicleId(vehicle.id);
                            setActiveTab('garage');
                          }}
                          className="p-2 bg-[#f0f0f0] rounded-full hover:bg-[#141414] hover:text-white transition-all"
                        >
                          <Wrench size={16} />
                        </button>
                        <button
                          onClick={() => sellVehicle(vehicle)}
                          className="px-4 py-2 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-green-700 transition-all"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'garage' && (
            <motion.div
              key="garage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Vehicle Selection Horizontal Scroll */}
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {gameState.inventory.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    className={`flex-shrink-0 p-3 rounded-2xl border transition-all min-w-[100px] ${
                      selectedVehicleId === vehicle.id 
                        ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-lg' 
                        : 'bg-white border-[#141414]/5 hover:bg-[#f0f0f0]'
                    }`}
                  >
                    <div className="text-2xl mb-1" style={{ color: vehicle.id === selectedVehicleId ? '#fff' : vehicle.customization.color }}>
                      {vehicle.type === 'car' ? '🚗' : '🏍️'}
                    </div>
                    <p className="text-[8px] font-bold uppercase truncate">{vehicle.name}</p>
                  </button>
                ))}
              </div>

              {selectedVehicle ? (
                <div className="bg-white border border-[#141414]/5 p-6 rounded-3xl shadow-sm space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight uppercase italic">{selectedVehicle.name}</h2>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] uppercase font-mono bg-[#141414] text-[#E4E3E0] px-2 py-0.5 rounded">
                          {selectedVehicle.type}
                        </span>
                        <span className="text-[8px] uppercase font-mono border border-[#141414]/10 px-2 py-0.5 rounded">
                          {(selectedVehicle.condition * 100).toFixed(0)}% Condition
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase opacity-50 font-mono">Value</p>
                      <p className="text-xl font-bold font-mono text-green-600">${calculateValue(selectedVehicle).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f8f8f8] p-3 rounded-xl border border-[#141414]/5">
                      <p className="text-[8px] uppercase opacity-50 font-mono mb-1">Performance</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-blue-500" />
                        <span className="text-sm font-bold">{calculateStats(selectedVehicle).performance}</span>
                      </div>
                    </div>
                    <div className="bg-[#f8f8f8] p-3 rounded-xl border border-[#141414]/5">
                      <p className="text-[8px] uppercase opacity-50 font-mono mb-1">Appeal</p>
                      <div className="flex items-center gap-2">
                        <Palette size={14} className="text-purple-500" />
                        <span className="text-sm font-bold">{calculateStats(selectedVehicle).appeal}</span>
                      </div>
                    </div>
                  </div>

                  <div className="aspect-square bg-[#f8f8f8] rounded-2xl flex flex-col items-center justify-center relative overflow-hidden p-4">
                    <motion.div 
                      key={selectedVehicle.customization.color}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-9xl drop-shadow-2xl mb-4"
                      style={{ color: selectedVehicle.customization.color }}
                    >
                      {selectedVehicle.type === 'car' ? '🚗' : '🏍️'}
                    </motion.div>
                    
                    {selectedVehicle.condition < 1 && (
                      <button
                        onClick={() => repairVehicle(selectedVehicle)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg"
                      >
                        Restore to Mint (${Math.floor(selectedVehicle.basePrice * (1 - selectedVehicle.condition) * 0.5).toLocaleString()})
                      </button>
                    )}
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 opacity-50">
                        <Palette size={12} /> Paint Shop ($500)
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => changeColor(selectedVehicle.id, color.value)}
                            className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all ${
                              selectedVehicle.customization.color === color.value 
                                ? 'border-[#141414] scale-110' 
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color.value }}
                          />
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 opacity-50">
                        <Wrench size={12} /> Performance Parts
                      </h3>
                      <div className="space-y-3">
                        {PARTS.map((part) => {
                          const isInstalled = selectedVehicle.customization.installedParts.includes(part.id);
                          return (
                            <div 
                              key={part.id}
                              className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                                isInstalled ? 'bg-[#f8f8f8] border-transparent opacity-60' : 'bg-white border-[#141414]/5'
                              }`}
                            >
                              <div>
                                <p className="text-[10px] font-bold uppercase">{part.name}</p>
                                <p className="text-[8px] uppercase font-mono opacity-50">+{part.performanceBoost} Perf / +{part.appealBoost} Appeal</p>
                              </div>
                              {isInstalled ? (
                                <CheckCircle2 size={14} className="text-green-600" />
                              ) : (
                                <button
                                  onClick={() => installPart(selectedVehicle.id, part)}
                                  className="text-[10px] font-bold uppercase bg-[#141414] text-[#E4E3E0] px-4 py-1.5 rounded-full hover:bg-green-600 transition-colors"
                                >
                                  ${part.price}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#141414]/5 p-12 text-center rounded-3xl shadow-sm">
                  <Wrench size={32} className="mx-auto opacity-10 mb-4" />
                  <p className="opacity-40 uppercase tracking-widest text-[10px]">Select a vehicle to build</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-serif italic mb-6">Profile</h2>
              <div className="bg-white border border-[#141414]/5 p-8 rounded-3xl shadow-sm flex flex-col items-center text-center">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-24 h-24 rounded-full mb-4 border-4 border-[#141414]/5" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-24 h-24 bg-[#141414] text-white rounded-full flex items-center justify-center text-4xl mb-4">
                    <UserIcon size={48} />
                  </div>
                )}
                <h3 className="text-xl font-bold">{user?.displayName || 'Mechanic'}</h3>
                <p className="text-xs opacity-50 font-mono mb-8">{user?.email}</p>
                
                <div className="w-full grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-[#f8f8f8] p-4 rounded-2xl border border-[#141414]/5">
                    <p className="text-[8px] uppercase opacity-50 font-mono mb-1">Total Assets</p>
                    <p className="text-lg font-bold font-mono">
                      ${(gameState.money + gameState.inventory.reduce((acc, v) => acc + calculateValue(v), 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#f8f8f8] p-4 rounded-2xl border border-[#141414]/5">
                    <p className="text-[8px] uppercase opacity-50 font-mono mb-1">Vehicles</p>
                    <p className="text-lg font-bold font-mono">{gameState.inventory.length}/5</p>
                  </div>
                </div>

                <button 
                  onClick={logout}
                  className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-100 transition-all"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-4 right-4 p-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 ${
              notification.type === 'success' 
                ? 'bg-[#141414] text-white' 
                : 'bg-red-600 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <p className="text-xs font-bold uppercase tracking-tight">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#141414]/5 flex justify-around items-center p-2 pb-6 z-50 backdrop-blur-md bg-white/90">
        {[
          { id: 'marketplace', icon: ShoppingBag, label: 'Market' },
          { id: 'inventory', icon: TrendingUp, label: 'Garage' },
          { id: 'garage', icon: Wrench, label: 'Build' },
          { id: 'profile', icon: UserIcon, label: 'Profile' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-20 ${
              activeTab === tab.id 
                ? 'text-[#141414] scale-110' 
                : 'text-[#141414]/30 hover:text-[#141414]/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-[#141414] text-white shadow-lg' : ''}`}>
              <tab.icon size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="w-1 h-1 bg-[#141414] rounded-full mt-0.5" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Login() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setError(e.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-[#E4E3E0] p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-xs w-full space-y-12"
      >
        <div className="space-y-4">
          <div className="text-8xl mb-6">🏎️</div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase italic font-serif">Gearhead Garage</h1>
          <p className="text-xs opacity-50 uppercase tracking-[0.2em] font-mono">The Ultimate Tycoon Experience</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-[10px] uppercase font-bold tracking-widest">
              {error}
            </div>
          )}
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-[#E4E3E0] text-[#141414] py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl disabled:opacity-50"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-[#141414]/20 border-t-[#141414] rounded-full animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
          </button>
          <p className="text-[10px] opacity-30 uppercase tracking-widest leading-relaxed">
            Your progress will be saved to the cloud automatically.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useContext(FirebaseContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E4E3E0]/20 border-t-[#E4E3E0] rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Game /> : <Login />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <AppContent />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
