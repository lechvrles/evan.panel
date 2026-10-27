import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COLORS = [
  "#7b1fa2", "#c0392b", "#6d4c41", "#00838f", "#d84315",
  "#ef6c00", "#303f9f", "#33691e", "#757575",
];

const chipStyle = (color) => ({
  backgroundColor: `${color}22`,
  color,
  borderColor: `${color}66`,
});

function TagChip({ tag }) {
  return (
    <span
      style={chipStyle(tag.color)}
      className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium"
    >
      {tag.name}
    </span>
  );
}

export default function CustomerTags({ customerId }) {
  const [allTags, setAllTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list"); // list | form
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const [{ data: tags }, { data: links }] = await Promise.all([
        supabase.from("tags").select("*").order("created_at", { ascending: true }),
        supabase.from("customer_tags").select("tag_id").eq("customer_id", customerId),
      ]);
      if (!active) return;
      setAllTags(tags || []);
      setSelectedIds(new Set((links || []).map((l) => l.tag_id)));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [customerId]);

  const selectedTags = useMemo(
    () => allTags.filter((t) => selectedIds.has(t.id)),
    [allTags, selectedIds]
  );

  const visibleTags = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? allTags.filter((t) => t.name.toLowerCase().includes(q)) : allTags;
  }, [allTags, filter]);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) {
      setView("list");
      setFilter("");
      setError("");
    }
  };

  const toggleTag = async (tag) => {
    const has = selectedIds.has(tag.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      has ? next.delete(tag.id) : next.add(tag.id);
      return next;
    });
    const { error: err } = has
      ? await supabase
          .from("customer_tags")
          .delete()
          .eq("customer_id", customerId)
          .eq("tag_id", tag.id)
      : await supabase
          .from("customer_tags")
          .insert([{ customer_id: customerId, tag_id: tag.id }]);
    if (err) {
      // برگرداندن تغییر در صورت خطا
      setSelectedIds((prev) => {
        const next = new Set(prev);
        has ? next.add(tag.id) : next.delete(tag.id);
        return next;
      });
    }
  };

  const openForm = (tag = null) => {
    setEditing(tag);
    setName(tag?.name || "");
    setColor(tag?.color || COLORS[0]);
    setError("");
    setView("form");
  };

  const saveTag = async (e) => {
    e.preventDefault();
    const title = name.trim();
    if (!title) {
      setError("عنوان برچسب را وارد کنید");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editing) {
        const { data, error: err } = await supabase
          .from("tags")
          .update({ name: title, color })
          .eq("id", editing.id)
          .select()
          .single();
        if (err) throw err;
        setAllTags((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      } else {
        const { data, error: err } = await supabase
          .from("tags")
          .insert([{ name: title, color }])
          .select()
          .single();
        if (err) throw err;
        setAllTags((prev) => [...prev, data]);
        // برچسب جدید همان لحظه به این مشتری هم اضافه می‌شود
        const { error: linkErr } = await supabase
          .from("customer_tags")
          .insert([{ customer_id: customerId, tag_id: data.id }]);
        if (!linkErr) setSelectedIds((prev) => new Set(prev).add(data.id));
      }
      setView("list");
    } catch (err) {
      setError(
        err.code === "23505" ? "برچسبی با این عنوان وجود دارد" : err.message || "ذخیره ناموفق بود"
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteTag = async () => {
    if (!editing) return;
    if (!window.confirm(`برچسب «${editing.name}» از همه مشتریان حذف شود؟`)) return;
    setBusy(true);
    const { error: err } = await supabase.from("tags").delete().eq("id", editing.id);
    setBusy(false);
    if (err) {
      setError(err.message || "حذف ناموفق بود");
      return;
    }
    setAllTags((prev) => prev.filter((t) => t.id !== editing.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(editing.id);
      return next;
    });
    setView("list");
  };

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-full">
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      ) : (
        <>
          {selectedTags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}

          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="مدیریت برچسب‌ها"
                title="برچسب‌ها"
                className="w-6 h-6 rounded-md border border-border grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>

            <PopoverContent dir="rtl" align="center" className="w-72 p-3">
              {view === "list" ? (
                <div className="space-y-2">
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="فیلتر برچسب"
                    className="h-9"
                    autoFocus
                  />

                  <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-0.5">
                    {visibleTags.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        برچسبی پیدا نشد.
                      </p>
                    )}
                    {visibleTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent/60"
                      >
                        <Checkbox
                          checked={selectedIds.has(tag.id)}
                          onCheckedChange={() => toggleTag(tag)}
                        />
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="flex-1 text-right"
                        >
                          <TagChip tag={tag} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openForm(tag)}
                          className="w-7 h-7 rounded-md grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="ویرایش برچسب"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => openForm(null)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-primary hover:bg-accent/60 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    ایجاد برچسب جدید
                  </button>
                </div>
              ) : (
                <form onSubmit={saveTag} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="flex items-center gap-1 text-sm font-medium"
                  >
                    <ChevronRight className="w-4 h-4" />
                    مشخصات برچسب
                  </button>

                  <div className="space-y-1.5">
                    <Label>عنوان برچسب</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>انتخاب رنگ</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          aria-label={c}
                          style={{ backgroundColor: c }}
                          className={cn(
                            "w-6 h-6 rounded-full transition-transform",
                            color === c &&
                              "ring-2 ring-offset-2 ring-offset-popover ring-foreground scale-110"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-xs text-destructive">{error}</p>}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={busy}>
                        {busy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : editing ? (
                          "ذخیره"
                        ) : (
                          "ایجاد"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setView("list")}
                        disabled={busy}
                      >
                        انصراف
                      </Button>
                    </div>
                    {editing && (
                      <button
                        type="button"
                        onClick={deleteTag}
                        disabled={busy}
                        className="w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="حذف برچسب"
                        title="حذف برچسب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              )}
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
