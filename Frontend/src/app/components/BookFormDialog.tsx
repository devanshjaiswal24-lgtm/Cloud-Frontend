import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { requestJson } from "../api";

type BookRecord = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  status: "available" | "borrowed" | "reserved";
  cover: string;
  description: string;
  year: number;
  totalCopies: number;
  availableCopies: number;
  reservedCount: number;
  publisher: string;
  pdfUrl?: string;
  format?: "physical" | "digital";
};

type BookFormMode = "create" | "edit";

interface BookFormDialogProps {
  open: boolean;
  mode: BookFormMode;
  initialBook?: BookRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  description: "",
  totalCopies: "1",
  availableCopies: "1",
  publisher: "",
  year: "",
  status: "available" as BookRecord["status"],
  coverImage: "",
  pdfUrl: "",
  format: "physical" as BookRecord["format"],
};

export default function BookFormDialog({ open, mode, initialBook, onClose, onSaved }: BookFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialBook) {
      setForm({
        title: initialBook.title,
        author: initialBook.author,
        isbn: initialBook.isbn,
        category: initialBook.category,
        description: initialBook.description,
        totalCopies: String(initialBook.totalCopies ?? 1),
        availableCopies: String(initialBook.availableCopies ?? 1),
        publisher: initialBook.publisher ?? "",
        year: String(initialBook.year ?? ""),
        status: initialBook.status,
        coverImage: initialBook.cover,
        pdfUrl: initialBook.pdfUrl ?? "",
        format: initialBook.format ?? "physical",
      });
    } else {
      setForm(emptyForm);
    }

    setCoverFile(null);
    setPdfFile(null);
    setError("");
  }, [open, mode, initialBook]);

  const modalTitle = useMemo(() => (mode === "create" ? "Add New Book" : "Edit Book"), [mode]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("author", form.author);
      formData.append("isbn", form.isbn);
      formData.append("category", form.category);
      formData.append("description", form.description);
      formData.append("totalCopies", form.totalCopies);
      formData.append("availableCopies", form.availableCopies);
      formData.append("publisher", form.publisher);
      formData.append("year", form.year);
      formData.append("status", form.status);
      formData.append("format", form.format ?? "physical");
      if (form.pdfUrl) {
        formData.append("pdfUrl", form.pdfUrl);
      }

      if (coverFile) {
        formData.append("cover", coverFile);
      } else if (form.coverImage) {
        formData.append("coverImage", form.coverImage);
      }

      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      const path = mode === "create" ? "/api/books" : `/api/books/${initialBook?.id ?? ""}`;
      const method = mode === "create" ? "POST" : "PUT";

      await requestJson(path, {
        method,
        body: formData,
      });

      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save book");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(5px)" }}>
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>{modalTitle}</h2>
            <p className="text-sm text-slate-500">Connect a real book record to the backend.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-4 md:col-span-2">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Title</span>
                <input value={form.title} onChange={(e) => updateField("title", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Book title" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Author</span>
                <input value={form.author} onChange={(e) => updateField("author", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Author name" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">ISBN</span>
                <input value={form.isbn} onChange={(e) => updateField("isbn", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="978-..." />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Category</span>
                <input value={form.category} onChange={(e) => updateField("category", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Fiction" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Year</span>
                <input value={form.year} onChange={(e) => updateField("year", e.target.value)} type="number" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="2024" />
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Description</span>
              <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} className="w-full min-h-28 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Short synopsis of the book" />
            </label>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Total Copies</span>
                <input value={form.totalCopies} onChange={(e) => updateField("totalCopies", e.target.value)} type="number" min="0" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Available Copies</span>
                <input value={form.availableCopies} onChange={(e) => updateField("availableCopies", e.target.value)} type="number" min="0" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Status</span>
                <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="available">available</option>
                  <option value="borrowed">borrowed</option>
                  <option value="reserved">reserved</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Publisher</span>
                <input value={form.publisher} onChange={(e) => updateField("publisher", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Publisher name" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Book Format</span>
                <select value={form.format} onChange={(e) => updateField("format", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                </select>
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 flex items-center">
                Physical entries are for shelf/loan circulation. Digital entries can include a PDF.
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Cover Image URL</span>
                <input value={form.coverImage} onChange={(e) => updateField("coverImage", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="https://..." />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Upload Cover</span>
                <input onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} type="file" accept="image/*" className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">PDF URL</span>
                <input value={form.pdfUrl} onChange={(e) => updateField("pdfUrl", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="https://.../book.pdf" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Upload PDF</span>
                <input onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} type="file" accept="application/pdf" className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: "#1D4ED8" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1E40AF"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1D4ED8"; }}
          >
            {submitting ? "Saving..." : mode === "create" ? "Create Book" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}