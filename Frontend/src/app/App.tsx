import { useEffect, useState } from "react";
import {
  BookOpen, LayoutDashboard, Bookmark, RotateCcw, Calendar,
  Receipt, Users, User, LogOut, Search, Bell, ChevronRight,
  CheckCircle, Clock, Eye, Trash2, Pencil, Plus, X,
  AlertCircle, ArrowLeft, Shield, Star, Download,
} from "lucide-react";
import { clearAuthSession, getAuthToken, getStoredUser, requestJson, saveAuthSession } from "./api";
import BookFormDialog from "./components/BookFormDialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type View =
  | "login" | "register" | "dashboard" | "books" | "book-detail"
  | "borrow" | "return" | "reservations" | "transactions" | "users" | "profile";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  status: "available" | "borrowed" | "reserved";
  cover: string;
  description: string;
  rating: number;
  year: number;
  totalCopies: number;
  availableCopies: number;
  reservedCount: number;
  publisher: string;
  pdfUrl?: string;
  format?: "physical" | "digital";
}

interface LibraryUser {
  id: string;
  name: string;
  email: string;
  role: "member" | "librarian" | "admin";
  status: "Active" | "Inactive";
  joined: string;
  avatar: string;
}

interface Transaction {
  id: string;
  user: string;
  book: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string;
  status: "Returned" | "Active" | "Overdue" | "Pending" | "Cancelled";
  fine?: number;
  type?: string;
}

interface Reservation {
  id: string;
  book: string;
  author: string;
  cover: string;
  reservedDate: string;
  status: "Pending" | "Ready" | "Expired" | "Cancelled";
}

interface BorrowedBook {
  id: string;
  title: string;
  author: string;
  borrowDate: string;
  dueDate: string;
  cover: string;
  fine: number;
}

const mapServerRole = (role: string): LibraryUser["role"] => {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "admin") return "admin";
  if (normalizedRole === "librarian") return "librarian";
  return "member";
};

const mapBook = (book: any): Book => ({
  id: String(book._id),
  title: book.title,
  author: book.author,
  isbn: book.isbn,
  category: book.category,
  status: book.status,
  cover: book.coverImage,
  description: book.description,
  rating: 4.5,
  year: book.year ?? new Date(book.createdAt ?? Date.now()).getFullYear(),
  totalCopies: book.totalCopies ?? 1,
  availableCopies: book.availableCopies ?? 1,
  reservedCount: book.reservedCount ?? 0,
  publisher: book.publisher ?? "",
  pdfUrl: book.pdfUrl ?? "",
  format: book.format ?? "physical",
});

const mapUser = (user: any): LibraryUser => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: mapServerRole(user.role),
  status: user.approved ? "Active" : "Inactive",
  joined: new Date(user.createdAt ?? Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
  avatar: user.avatar || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format",
});

const mapReservation = (reservation: any): Reservation => ({
  id: String(reservation._id),
  book: reservation.book?.title ?? "Unknown Book",
  author: reservation.book?.author ?? "Unknown Author",
  cover: reservation.book?.coverImage ?? "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=120&h=160&fit=crop&auto=format",
  reservedDate: new Date(reservation.createdAt ?? Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  status: reservation.status,
});

const mapTransaction = (transaction: any): Transaction => ({
  id: String(transaction._id),
  user: transaction.user?.name ?? transaction.user ?? "Unknown User",
  book: transaction.book?.title ?? transaction.book ?? "Unknown Book",
  borrowDate: transaction.borrowDate ? new Date(transaction.borrowDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
  dueDate: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
  returnDate: transaction.returnDate ? new Date(transaction.returnDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
  status: transaction.status,
  fine: transaction.fineAmount ?? 0,
  type: transaction.type,
});

const mapBorrowedBook = (transaction: any): BorrowedBook => ({
  id: String(transaction._id),
  title: transaction.book?.title ?? "Unknown Book",
  author: transaction.book?.author ?? "Unknown Author",
  borrowDate: transaction.borrowDate ? new Date(transaction.borrowDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
  dueDate: transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
  cover: transaction.book?.coverImage ?? "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=120&h=160&fit=crop&auto=format",
  fine: transaction.fineAmount ?? 0,
});


// ─── Shared Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    borrowed:   "bg-amber-50   text-amber-700   border-amber-200",
    reserved:   "bg-violet-50  text-violet-700  border-violet-200",
    Returned:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    Active:     "bg-blue-50    text-blue-700    border-blue-200",
    Overdue:    "bg-red-50     text-red-700     border-red-200",
    Pending:    "bg-amber-50   text-amber-700   border-amber-200",
    Ready:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    Expired:    "bg-slate-100  text-slate-500   border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono tracking-wide ${styles[status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Librarian: "bg-blue-50   text-blue-700   border-blue-200",
    Admin:     "bg-violet-50 text-violet-700 border-violet-200",
    Member:    "bg-slate-100 text-slate-600  border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[role] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {role}
    </span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",    label: "Dashboard",    icon: <LayoutDashboard size={17} /> },
  { id: "books",        label: "Books",        icon: <BookOpen size={17} /> },
  { id: "borrow",       label: "Borrow Books", icon: <Download size={17} /> },
  { id: "return",       label: "Return Books", icon: <RotateCcw size={17} /> },
  { id: "reservations", label: "Reservations", icon: <Bookmark size={17} /> },
  { id: "transactions", label: "Transactions", icon: <Receipt size={17} /> },
  { id: "users",        label: "Users",        icon: <Users size={17} /> },
  { id: "profile",      label: "Profile",      icon: <User size={17} /> },
];

function Sidebar({ current, setView, onLogout }: { current: View; setView: (v: View) => void; onLogout: () => void }) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden" style={{ backgroundColor: "#0F2952" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#3B82F6" }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>LibraryOS</p>
            <p className="text-xs mt-0.5" style={{ color: "#93C5FD" }}>Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: "rgba(147,197,253,0.5)" }}>Main Menu</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <li key={id}>
              <button
                onClick={() => setView(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  current === id
                    ? "text-white font-medium shadow-sm"
                    : "hover:text-white"
                }`}
                style={{
                  backgroundColor: current === id ? "#1D4ED8" : "transparent",
                  color: current === id ? "#fff" : "rgba(196,219,255,0.75)",
                }}
                onMouseEnter={(e) => { if (current !== id) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={(e) => { if (current !== id) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                {icon}
                <span className="flex-1 text-left">{label}</span>
                {current === id && <ChevronRight size={13} className="opacity-60" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
          style={{ color: "rgba(196,219,255,0.75)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.15)"; (e.currentTarget as HTMLElement).style.color = "#FCA5A5"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(196,219,255,0.75)"; }}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}

// ─── Shared Page Header ───────────────────────────────────────────────────────

function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 mt-0.5">{children}</div>}
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin, setView }: { onLogin: () => void; setView: (v: View) => void }) {
  const [email, setEmail] = useState("sarah.chen@university.edu");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await requestJson<{ user: { token: string; name: string; email: string; role: string; approved: boolean; avatar?: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveAuthSession(response.user.token, response.user);
      onLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-end relative overflow-hidden" style={{ backgroundColor: "#0F2952" }}>
        <img
          src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&h=1100&fit=crop&auto=format"
          alt="University library with tall bookshelves and reading lamps"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.3 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0F2952 40%, transparent)" }} />
        <div className="relative z-10 p-12 pb-14">
          <BookOpen size={36} className="mb-5" style={{ color: "#93C5FD" }} />
          <h2 className="text-4xl font-bold text-white leading-snug mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Where knowledge<br />finds its home.
          </h2>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "#93C5FD" }}>
            Access over 12,000 books, journals, and digital resources from one unified platform designed for students, librarians, and administrators.
          </p>
          <div className="flex gap-8 mt-8">
            {[["12K+", "Books"], ["3.4K", "Members"], ["98%", "Satisfaction"]].map(([n, l]) => (
              <div key={l}>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{n}</p>
                <p className="text-xs mt-0.5" style={{ color: "#93C5FD" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:mb-10">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1D4ED8" }}>
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>LibraryOS</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Welcome back</h1>
          <p className="text-sm text-slate-500 mb-8">Sign in to your library account to continue.</p>

          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ "--tw-ring-color": "#93C5FD" } as React.CSSProperties}
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button className="text-xs font-medium" style={{ color: "#1D4ED8" }}>Forgot password?</button>
              </div>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ backgroundColor: "#1D4ED8" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
            >
              {loading ? "Signing in..." : "Sign in to Library"}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to LibraryOS?{" "}
            <button onClick={() => setView("register")} className="font-semibold" style={{ color: "#1D4ED8" }}>
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────

function RegisterPage({ setView }: { setView: (v: View) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await requestJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, role, email, password }),
      });
      setView("login");
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1D4ED8" }}>
            <BookOpen size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>LibraryOS</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Create your account</h1>
        <p className="text-sm text-slate-500 mb-6">Join the library management system today.</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" placeholder="Sarah Chen" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition">
                <option>Member</option>
                <option>Librarian</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" placeholder="you@university.edu" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" placeholder="Min. 8 characters" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Confirm Password</label>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" placeholder="Repeat your password" />
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: "#1D4ED8" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{" "}
          <button onClick={() => setView("login")} className="font-semibold" style={{ color: "#1D4ED8" }}>Sign in</button>
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardPage({ setView, setSelectedBook }: { setView: (v: View) => void; setSelectedBook: (b: Book) => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [profileName, setProfileName] = useState("Sarah");
  const [profileAvatar, setProfileAvatar] = useState("https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [booksResponse, transactionsResponse, reservationsResponse, profileResponse] = await Promise.all([
          requestJson<{ books: any[] }>("/api/books?limit=100"),
          requestJson<{ transactions: any[] }>("/api/transactions/me?limit=100"),
          requestJson<{ reservations: any[] }>("/api/reservations/me?limit=100"),
          requestJson<{ user: any }>("/api/users/profile"),
        ]);

        setBooks(booksResponse.books.map(mapBook));
        setTransactions(transactionsResponse.transactions.map(mapTransaction));
        setReservations(reservationsResponse.reservations.map(mapReservation));
        setProfileName(profileResponse.user.name);
        setProfileAvatar(profileResponse.user.avatar || profileAvatar);
      } catch {
        setBooks([]);
        setTransactions([]);
        setReservations([]);
      }
    };

    loadDashboard();
  }, []);

  const stats = [
    { label: "Total Books", value: String(books.length), icon: <BookOpen size={19} />, delta: "+ live from API", bg: "bg-blue-50", fg: "text-blue-600" },
    { label: "Available", value: String(books.filter((book) => book.status === "available").length), icon: <CheckCircle size={19} />, delta: "Live inventory", bg: "bg-emerald-50", fg: "text-emerald-600" },
    { label: "Borrowed", value: String(transactions.filter((transaction) => transaction.type === "borrow" && transaction.status === "Active").length), icon: <Download size={19} />, delta: "Active loans", bg: "bg-amber-50", fg: "text-amber-600" },
    { label: "Reserved", value: String(reservations.filter((reservation) => reservation.status === "Pending" || reservation.status === "Ready").length), icon: <Bookmark size={19} />, delta: "Awaiting pickup", bg: "bg-violet-50", fg: "text-violet-600" },
  ];

  const activity = transactions.slice(0, 4).map((transaction) => ({
    user: transaction.user,
    action: transaction.type === "return" ? "returned" : transaction.type === "reservation" ? "reserved" : transaction.type === "borrow" ? "borrowed" : transaction.type ?? "updated",
    book: transaction.book,
    time: transaction.returnDate || transaction.borrowDate || "Recent",
    avatar: profileAvatar,
  }));

  const actionColor: Record<string, string> = {
    borrowed: "text-amber-600",
    returned: "text-emerald-600",
    reserved: "text-violet-600",
    cancellation: "text-slate-600",
    fine: "text-red-600",
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1 font-mono">Live dashboard</p>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>Good morning, {profileName}</h1>
          <p className="text-sm text-slate-500 mt-1">Here is what is happening in your library today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm">
            <Bell size={17} className="text-slate-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <img
            src={profileAvatar}
            alt={profileName} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} ${s.fg}`}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>Recent Activity</h2>
            <button className="text-xs font-medium" style={{ color: "#1D4ED8" }}>View all</button>
          </div>
          <ul className="divide-y divide-slate-50">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition">
                <img src={a.avatar} alt={a.user} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{a.user}</span>{" "}
                    <span className={`font-semibold ${actionColor[a.action]}`}>{a.action}</span>{" "}
                    <span className="italic text-slate-700">{a.book}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "Add New Book", icon: <Plus size={15} />, view: "books" as View, primary: true },
                { label: "Register New User", icon: <User size={15} />, view: "users" as View, primary: false },
                { label: "View Overdue Loans", icon: <AlertCircle size={15} />, view: "transactions" as View, primary: false },
                { label: "Manage Reservations", icon: <Bookmark size={15} />, view: "reservations" as View, primary: false },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => setView(a.view)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    a.primary
                      ? "text-white shadow-sm"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  style={a.primary ? { backgroundColor: "#1D4ED8" } : {}}
                  onMouseEnter={(e) => { if (a.primary) (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                  onMouseLeave={(e) => { if (a.primary) (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Popular This Week</h2>
            <ul className="space-y-3">
              {books.slice(0, 3).map((b, i) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-4 flex-shrink-0 text-right">{i + 1}</span>
                  <img src={b.cover} alt={b.title} className="w-8 h-10 object-cover rounded flex-shrink-0 bg-slate-100" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{b.title}</p>
                    <p className="text-xs text-slate-400 truncate">{b.author}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Books Catalog ────────────────────────────────────────────────────────────

function BooksPage({
  setView,
  setSelectedBook,
  booksRefreshKey,
  canManageBooks,
  canBorrowDigital,
  onCreateBook,
  onEditBook,
  onDigitalAccess,
}: {
  setView: (v: View) => void;
  setSelectedBook: (b: Book) => void;
  booksRefreshKey: number;
  canManageBooks: boolean;
  canBorrowDigital: boolean;
  onCreateBook: () => void;
  onEditBook: (book: Book) => void;
  onDigitalAccess: (book: Book) => void;
}) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [formatFilter, setFormatFilter] = useState("All");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const response = await requestJson<{ books: any[] }>("/api/books?limit=100");
      setBooks(response.books.map(mapBook));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [booksRefreshKey]);

  const categories = ["All", ...Array.from(new Set(books.map((book) => book.category)))];

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return (
      (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (cat === "All" || b.category === cat)
      && (formatFilter === "All" || b.format === formatFilter.toLowerCase())
    );
  });

  return (
    <div className="p-8">
      <PageHeader title="Book Catalog" subtitle={`${books.length} titles in the collection`}>
        {canManageBooks && (
          <button
            onClick={onCreateBook}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition"
            style={{ backgroundColor: "#1D4ED8" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
          >
            <Plus size={15} />
            Add Book
          </button>
        )}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
            placeholder="Search by title or author..."
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${cat === c ? "text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"}`}
              style={cat === c ? { backgroundColor: "#1D4ED8" } : {}}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        {(["All", "Physical", "Digital"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setFormatFilter(option)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${formatFilter === option ? "text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"}`}
            style={formatFilter === option ? { backgroundColor: "#0F766E" } : {}}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((book) => (
          <div key={book.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-shadow group">
            <div className="relative h-44 bg-slate-100">
              <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-2.5 left-2.5">
                <StatusBadge status={book.status} />
              </div>
              <div className="absolute top-2.5 right-2.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${book.format === "digital" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  {book.format === "digital" ? "Digital" : "Physical"}
                </span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-900 text-sm leading-snug mb-0.5 line-clamp-2" style={{ fontFamily: "'Playfair Display', serif" }}>{book.title}</h3>
              <p className="text-xs text-slate-500 mb-0.5">{book.author}</p>
              <p className="text-xs text-slate-400 font-mono mb-3">{book.category} · {book.year}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedBook(book); setView("book-detail"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
                >
                  <Eye size={11} /> Details
                </button>
                {canManageBooks && (
                  <button
                    onClick={() => onEditBook(book)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                )}
                {book.format === "digital" && canBorrowDigital ? (
                  <button
                    onClick={() => onDigitalAccess(book)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-white rounded-lg transition"
                    style={{ backgroundColor: "#0F766E" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#115E59"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#0F766E"; }}
                  >
                    <BookOpen size={11} /> Read
                  </button>
                ) : book.status === "available" ? (
                  <button
                    onClick={() => { setSelectedBook(book); setView("borrow"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-white rounded-lg transition"
                    style={{ backgroundColor: "#1D4ED8" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
                  >
                    <Download size={11} /> Borrow
                  </button>
                ) : (
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 rounded-lg transition hover:bg-violet-100">
                    <Bookmark size={11} /> Reserve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No books match your search.</p>
        </div>
      )}
    </div>
  );
}

// ─── Book Detail ──────────────────────────────────────────────────────────────

function BookDetailPage({
  book,
  setView,
  canManageBooks,
  canBorrowDigital,
  onEditBook,
  onDigitalAccess,
}: {
  book: Book | null;
  setView: (v: View) => void;
  canManageBooks: boolean;
  canBorrowDigital: boolean;
  onEditBook: (book: Book) => void;
  onDigitalAccess: (book: Book) => void;
}) {
  if (!book) return null;

  return (
    <div className="p-8">
      <button onClick={() => setView("books")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-7 transition font-medium">
        <ArrowLeft size={15} /> Back to Catalog
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid lg:grid-cols-[280px_1fr]">
          {/* Cover panel */}
          <div className="flex items-center justify-center p-10 border-r border-slate-100" style={{ backgroundColor: "#F8FAFC" }}>
            <img src={book.cover} alt={book.title} className="w-48 h-64 object-cover rounded-2xl shadow-xl" />
          </div>

          {/* Info */}
          <div className="p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge status={book.status} />
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {book.format === "digital" ? "Digital" : "Physical"}
              </span>
              <span className="flex items-center gap-1 text-sm text-amber-500 font-medium">
                <Star size={13} fill="currentColor" /> {book.rating}
              </span>
              <span className="text-xs text-slate-400 font-mono">{book.year}</span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-1.5 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{book.title}</h1>
            <p className="text-base text-slate-500 mb-1">by {book.author}</p>

            <div className="grid grid-cols-2 gap-3 my-7">
              {[
                { l: "ISBN",     v: book.isbn },
                { l: "Category", v: book.category },
                { l: "Year",     v: String(book.year) },
                { l: "Status",   v: book.status },
              ].map(({ l, v }) => (
                <div key={l} className="rounded-xl p-3.5" style={{ backgroundColor: "#F8FAFC", border: "1px solid rgba(15,23,42,0.07)" }}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{l}</p>
                  <p className="text-sm font-semibold text-slate-900 font-mono">{v}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-8">{book.description}</p>

            <div className="flex gap-3 flex-wrap">
              {canManageBooks && (
                <button
                  onClick={() => onEditBook(book)}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  <Pencil size={15} /> Edit Book
                </button>
              )}
              {book.format === "digital" && canBorrowDigital ? (
                <button
                  onClick={() => onDigitalAccess(book)}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition"
                  style={{ backgroundColor: "#0F766E" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#115E59"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#0F766E"; }}
                >
                  <BookOpen size={15} /> Read Digital Copy
                </button>
              ) : book.status === "available" ? (
                <button
                  onClick={() => setView("borrow")}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition"
                  style={{ backgroundColor: "#1D4ED8" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
                >
                  <Download size={15} /> Borrow this Book
                </button>
              ) : (
                <button className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm transition">
                  <Bookmark size={15} /> Reserve this Book
                </button>
              )}
              <button className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                <Star size={15} /> Add to Wishlist
              </button>
              {book.pdfUrl && (
                <a
                  href={book.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition"
                  style={{ backgroundColor: "#0F766E" }}
                >
                  <BookOpen size={15} /> Open PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Borrow Page ──────────────────────────────────────────────────────────────

function BorrowPage({ book, setView }: { book: Book | null; setView: (v: View) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!book) return null;

  const today = new Date();
  const due = new Date(today); due.setDate(due.getDate() + 14);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const handleBorrow = async () => {
    setLoading(true);
    setError("");

    try {
      await requestJson("/api/transactions/borrow", {
        method: "POST",
        body: JSON.stringify({ bookId: book.id }),
      });
      setShowModal(false);
      setView("dashboard");
    } catch (borrowError) {
      setError(borrowError instanceof Error ? borrowError.message : "Unable to borrow this book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <button onClick={() => setView("books")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-7 transition font-medium">
        <ArrowLeft size={15} /> Back
      </button>
      <PageHeader title="Borrow a Book" subtitle="Review the loan details before confirming." />

      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
          <div className="flex gap-5 pb-5 mb-5 border-b border-slate-100">
            <img src={book.cover} alt={book.title} className="w-16 h-24 object-cover rounded-xl shadow flex-shrink-0 bg-slate-100" />
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Selected Book</p>
              <h2 className="text-base font-bold text-slate-900 leading-snug mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>{book.title}</h2>
              <p className="text-sm text-slate-500">{book.author}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">{book.isbn}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-4 bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Calendar size={13} className="text-blue-500" />
                <span className="text-xs font-semibold text-blue-600">Borrow Date</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{fmt(today)}</p>
            </div>
            <div className="rounded-xl p-4 bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock size={13} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-600">Return By</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{fmt(due)}</p>
            </div>
          </div>

          <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-700 mb-2">Loan Terms</p>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>· Standard loan period: 14 days</li>
              <li>· Late return fine: $0.50 per day</li>
              <li>· Maximum renewals allowed: 2</li>
              <li>· Lost book replacement fee applies</li>
            </ul>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-sm transition"
          style={{ backgroundColor: "#1D4ED8" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
        >
          Confirm Borrow
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Confirm Loan</h3>
            <p className="text-sm text-slate-500 mb-6">
              You are borrowing <strong className="text-slate-800">{book.title}</strong>. Please return it by{" "}
              <strong className="text-slate-800">{fmt(due)}</strong> to avoid late fees.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button
                onClick={handleBorrow}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: "#1D4ED8" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
              >
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Return Page ──────────────────────────────────────────────────────────────

function ReturnPage({ setView }: { setView: (v: View) => void }) {
  const [confirming, setConfirming] = useState<BorrowedBook | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBorrowedBooks = async () => {
      try {
        const response = await requestJson<{ transactions: any[] }>("/api/transactions/me?type=borrow&status=Active&limit=100");
        setBorrowedBooks(response.transactions.map(mapBorrowedBook));
      } catch {
        setBorrowedBooks([]);
      } finally {
        setLoading(false);
      }
    };

    loadBorrowedBooks();
  }, []);

  const handleReturn = async (bookId: string) => {
    setError("");

    try {
      await requestJson("/api/transactions/return", {
        method: "POST",
        body: JSON.stringify({ bookId }),
      });
      setConfirming(null);
      const response = await requestJson<{ transactions: any[] }>("/api/transactions/me?type=borrow&status=Active&limit=100");
      setBorrowedBooks(response.transactions.map(mapBorrowedBook));
    } catch (returnError) {
      setError(returnError instanceof Error ? returnError.message : "Unable to return this book");
    }
  };

  return (
    <div className="p-8">
      <PageHeader title="Return Books" subtitle="Manage your currently borrowed books." />

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="max-w-2xl space-y-4">
        {!loading && borrowedBooks.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <img src={b.cover} alt={b.title} className="w-14 h-20 object-cover rounded-xl flex-shrink-0 bg-slate-100 shadow" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <h3 className="font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>{b.title}</h3>
                    <p className="text-sm text-slate-500">{b.author}</p>
                  </div>
                  {b.fine > 0 && (
                    <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg">
                      Fine: ${b.fine.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-mono">
                  <span>Borrowed: {b.borrowDate}</span>
                  <span>Due: {b.dueDate}</span>
                </div>
                {b.fine > 0 && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">Overdue — please return immediately to stop further charges.</p>
                )}
                <button
                  onClick={() => setConfirming(b)}
                  className={`mt-3 px-4 py-2 text-xs font-bold rounded-lg transition text-white ${b.fine > 0 ? "bg-red-600 hover:bg-red-700" : ""}`}
                  style={b.fine === 0 ? { backgroundColor: "#1D4ED8" } : {}}
                  onMouseEnter={(e) => { if (b.fine === 0) (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                  onMouseLeave={(e) => { if (b.fine === 0) (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
                >
                  {b.fine > 0 ? `Return & Pay $${b.fine.toFixed(2)}` : "Return Book"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirming && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Confirm Return</h3>
            <p className="text-sm text-slate-500 mb-6">
              Returning <strong className="text-slate-800">{confirming.title}</strong>.
              {confirming.fine > 0 && <> A late fee of <strong className="text-red-600">${confirming.fine.toFixed(2)}</strong> will be charged.</>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button
                onClick={() => handleReturn(confirming.id)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: "#1D4ED8" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reservations ─────────────────────────────────────────────────────────────

function ReservationsPage({ setView }: { setView: (v: View) => void }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReservations = async () => {
      try {
        const response = await requestJson<{ reservations: any[] }>("/api/reservations/me?limit=100");
        setReservations(response.reservations.map(mapReservation));
      } catch {
        setReservations([]);
      }
    };

    loadReservations();
  }, []);

  const handleCancel = async (reservationId: string) => {
    setError("");

    try {
      await requestJson(`/api/reservations/${reservationId}`, { method: "DELETE" });
      const response = await requestJson<{ reservations: any[] }>("/api/reservations/me?limit=100");
      setReservations(response.reservations.map(mapReservation));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel reservation");
    }
  };

  return (
    <div className="p-8">
      <PageHeader title="My Reservations" subtitle="Books you have reserved and their pickup status.">
        <button
          onClick={() => setView("books")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition"
          style={{ backgroundColor: "#1D4ED8" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
        >
          <Plus size={15} /> Reserve New Book
        </button>
      </PageHeader>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="max-w-2xl space-y-4">
        {reservations.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <img src={r.cover} alt={r.book} className="w-14 h-20 object-cover rounded-xl flex-shrink-0 bg-slate-100 shadow" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <h3 className="font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>{r.book}</h3>
                    <p className="text-sm text-slate-500">{r.author}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1.5">Reserved on {r.reservedDate}</p>
                {r.status === "Ready" && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1.5">Ready for pickup — visit the library desk with your ID.</p>
                )}
                {r.status === "Pending" && (
                  <p className="text-xs text-amber-600 mt-1.5">Waiting for a copy to become available.</p>
                )}
                <button onClick={() => handleCancel(r.id)} className="mt-3 px-4 py-1.5 text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition">
                  Cancel Reservation
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await requestJson<{ transactions: any[] }>("/api/transactions/me?limit=100");
        setTransactions(response.transactions.map(mapTransaction));
      } catch {
        setTransactions([]);
      }
    };

    loadTransactions();
  }, []);

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    return t.user.toLowerCase().includes(q) || t.book.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
  });

  return (
    <div className="p-8">
      <PageHeader title="Transaction History" subtitle="Complete record of all borrowing and return activity." />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              placeholder="Search transactions..."
            />
          </div>
          <p className="text-xs text-slate-400 font-mono flex-shrink-0">{filtered.length} records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100" style={{ backgroundColor: "#F8FAFC" }}>
                {["Transaction ID", "User", "Book", "Borrow Date", "Due Date", "Return Date", "Status", "Fine", "Action"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.id}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{t.user}</td>
                  <td className="px-5 py-4 text-slate-600">{t.book}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.borrowDate}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.dueDate}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{t.returnDate}</td>
                  <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-4">
                    {t.fine ? (
                      <span className="font-mono font-bold text-red-600">${t.fine.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button className="text-xs font-semibold hover:opacity-70 transition" style={{ color: "#1D4ED8" }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">{transactions.length} total records</p>
        </div>
      </div>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────

function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<LibraryUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await requestJson<{ users: any[] }>("/api/users");
        setUsers(response.users.map(mapUser));
      } catch {
        setUsers([]);
      }
    };

    loadUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    setError("");
    try {
      await requestJson(`/api/users/${userId}`, { method: "DELETE" });
      const response = await requestJson<{ users: any[] }>("/api/users");
      setUsers(response.users.map(mapUser));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete user");
    }
  };

  return (
    <div className="p-8">
      <PageHeader title="User Management" subtitle="Manage library members, librarians, and administrators.">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition"
          style={{ backgroundColor: "#1D4ED8" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
        >
          <Plus size={15} /> Add User
        </button>
      </PageHeader>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100" style={{ backgroundColor: "#F8FAFC" }}>
                {["Member", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                      <span className="font-semibold text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{u.email}</td>
                  <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400 font-mono">{u.joined}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>Add New User</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" placeholder="Full Name" />
              <input type="email" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" placeholder="Email address" />
              <select className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition">
                <option>Member</option>
                <option>Librarian</option>
                <option>Admin</option>
              </select>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                  style={{ backgroundColor: "#1D4ED8" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<LibraryUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDepartment, setFormDepartment] = useState("University Library Services");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await requestJson<{ user: any }>("/api/users/profile");
        const mappedProfile = mapUser(response.user);
        setProfile(mappedProfile);
        setFormName(mappedProfile.name);
        setFormEmail(mappedProfile.email);
      } catch {
        setProfile(null);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setError("");
    try {
      const response = await requestJson<{ user: any }>("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({ name: formName, email: formEmail }),
      });
      setProfile(mapUser(response.user));
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update profile");
    }
  };

  return (
    <div className="p-8">
      <PageHeader title="My Profile" subtitle="Manage your account information and security settings." />

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="max-w-2xl space-y-5">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
          <div className="flex items-start gap-6">
            <div className="relative flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&auto=format"
                alt="Sarah Chen"
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg"
              />
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow text-white transition" style={{ backgroundColor: "#1D4ED8" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
              >
                <Pencil size={10} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-1">
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>{profile?.name ?? "Sarah Chen"}</h2>
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex-shrink-0">
                  <Shield size={10} /> {profile?.role ?? "librarian"}
                </span>
              </div>
              <p className="text-sm text-slate-500">{profile?.email ?? "sarah.chen@university.edu"}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">Joined {profile?.joined ?? "January 2023"}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-7 pt-6 border-t border-slate-100">
            {[ ["—", "Books Borrowed"], ["—", "Active Loans"], ["—", "Reservations"]].map(([v, l]) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>{v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>Account Details</h3>
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition ${editing ? "text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              style={editing ? { backgroundColor: "#059669" } : {}}
            >
              {editing ? <><CheckCircle size={14} /> Save Changes</> : <><Pencil size={14} /> Edit Profile</>}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Full Name", value: formName, disabled: !editing, onChange: setFormName },
              { label: "Email", value: formEmail, disabled: !editing, onChange: setFormEmail },
              { label: "Department", value: formDepartment, disabled: !editing, onChange: setFormDepartment },
              { label: "Role", value: profile?.role ?? "librarian", disabled: true, onChange: undefined },
            ].map(({ label, value, disabled, onChange }) => (
              <div key={label}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
                <input
                  value={value}
                  onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                  disabled={disabled}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  style={{ borderColor: disabled ? "rgba(0,0,0,0.07)" : "#CBD5E1", backgroundColor: disabled ? "#F8FAFC" : "#fff", color: disabled ? "#94A3B8" : "#0F172A" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Change Password</h3>
          <div className="space-y-3">
            <input type="password" placeholder="Current password" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
            <input type="password" placeholder="New password" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
            <input type="password" placeholder="Confirm new password" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
            <button
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition shadow-sm"
              style={{ backgroundColor: "#1D4ED8" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [booksRefreshKey, setBooksRefreshKey] = useState(0);
  const [bookFormOpen, setBookFormOpen] = useState(false);
  const [bookFormMode, setBookFormMode] = useState<"create" | "edit">("create");
  const [bookFormBook, setBookFormBook] = useState<Book | null>(null);
  const currentUser = getStoredUser() as { role?: string } | null;
  const canManageBooks = currentUser?.role === "librarian" || currentUser?.role === "admin";
  const canBorrowDigital = currentUser?.role === "member";

  const openCreateBookForm = () => {
    setBookFormMode("create");
    setBookFormBook(null);
    setBookFormOpen(true);
  };

  const openEditBookForm = (book: Book) => {
    setSelectedBook(book);
    setBookFormMode("edit");
    setBookFormBook(book);
    setBookFormOpen(true);
    setView("book-detail");
  };

  const handleBookSaved = async () => {
    setBooksRefreshKey((value) => value + 1);

    if (bookFormMode === "edit" && bookFormBook && selectedBook?.id === bookFormBook.id) {
      try {
        const response = await requestJson<{ book: any }>(`/api/books/${bookFormBook.id}`);
        setSelectedBook(mapBook(response.book));
      } catch {
        // Keep the current selection if the refresh fails; the catalog will still reload.
      }
    }
  };

  const handleDigitalAccess = async (book: Book) => {
    try {
      await requestJson("/api/transactions/borrow", {
        method: "POST",
        body: JSON.stringify({ bookId: book.id }),
      });

      if (book.pdfUrl) {
        window.open(book.pdfUrl, "_blank", "noreferrer");
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to open this digital book");
    }
  };

  useEffect(() => {
    const storedToken = getAuthToken();
    if (storedToken) {
      setLoggedIn(true);
      setView("dashboard");
    }
  }, []);

  if (!loggedIn) {
    return view === "register"
      ? <RegisterPage setView={setView} />
      : <LoginPage onLogin={() => { setLoggedIn(true); setView("dashboard"); }} setView={setView} />;
  }

  const renderPage = () => {
    switch (view) {
      case "dashboard":    return <DashboardPage setView={setView} setSelectedBook={setSelectedBook} />;
      case "books":        return <BooksPage setView={setView} setSelectedBook={setSelectedBook} booksRefreshKey={booksRefreshKey} canManageBooks={canManageBooks} canBorrowDigital={canBorrowDigital} onCreateBook={openCreateBookForm} onEditBook={openEditBookForm} onDigitalAccess={handleDigitalAccess} />;
      case "book-detail":  return <BookDetailPage book={selectedBook} setView={setView} canManageBooks={canManageBooks} canBorrowDigital={canBorrowDigital} onEditBook={openEditBookForm} onDigitalAccess={handleDigitalAccess} />;
      case "borrow":       return <BorrowPage book={selectedBook} setView={setView} />;
      case "return":       return <ReturnPage setView={setView} />;
      case "reservations": return <ReservationsPage setView={setView} />;
      case "transactions": return <TransactionsPage />;
      case "users":        return <UsersPage />;
      case "profile":      return <ProfilePage />;
      default:             return <DashboardPage setView={setView} setSelectedBook={setSelectedBook} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar current={view} setView={setView} onLogout={() => { clearAuthSession(); setLoggedIn(false); setView("login"); setSelectedBook(null); }} />
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {renderPage()}
      </main>
      <BookFormDialog
        open={bookFormOpen}
        mode={bookFormMode}
        initialBook={bookFormBook}
        onClose={() => setBookFormOpen(false)}
        onSaved={handleBookSaved}
      />
    </div>
  );
}
