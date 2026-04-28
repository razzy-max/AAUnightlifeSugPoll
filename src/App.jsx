import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const ADMIN_PASSWORD = "definitelynotthepassword";

const VOTER_ID = (() => {
  try {
    const s = [navigator.userAgent, screen.width, screen.height, navigator.language, new Date().getTimezoneOffset()].join("|");
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  } catch {
    return Math.random().toString(36).slice(2);
  }
})();

const PALETTE = ["#1e3a5f", "#7f1d1d", "#14532d", "#4c1d95", "#713f12"];

const INIT_CATS = [
  { id: 1, name: "SUG President", desc: "Overall student body leader", active: true },
  { id: 2, name: "Vice President", desc: "Deputy student union leader", active: true },
  { id: 3, name: "General Secretary", desc: "Administrative officer", active: true },
  { id: 4, name: "Financial Secretary", desc: "Financial oversight officer", active: false },
];

const INIT_CANDS = [
  { id: 1, cat: 1, name: "Chukwuemeka Obi", pos: "Presidential Aspirant", img: "", ci: 0 },
  { id: 2, cat: 1, name: "Amaka Nwosu", pos: "Presidential Aspirant", img: "", ci: 1 },
  { id: 3, cat: 2, name: "Ibrahim Yusuf", pos: "Vice Presidential Aspirant", img: "", ci: 0 },
  { id: 4, cat: 2, name: "Blessing Eze", pos: "Vice Presidential Aspirant", img: "", ci: 1 },
  { id: 5, cat: 3, name: "Tunde Adeyemi", pos: "Gen. Secretary Aspirant", img: "", ci: 0 },
  { id: 6, cat: 3, name: "Ngozi Okafor", pos: "Gen. Secretary Aspirant", img: "", ci: 1 },
  { id: 7, cat: 4, name: "Emeka Uzo", pos: "Fin. Sec. Aspirant", img: "", ci: 0 },
  { id: 8, cat: 4, name: "Chioma Umeh", pos: "Fin. Sec. Aspirant", img: "", ci: 1 },
];

const INIT_VOTES = [
  ...Array(14).fill(null).map((_, i) => ({ vh: `s${i}`, cid: 1, catid: 1 })),
  ...Array(9).fill(null).map((_, i) => ({ vh: `q${i}`, cid: 2, catid: 1 })),
  ...Array(11).fill(null).map((_, i) => ({ vh: `r${i}`, cid: 3, catid: 2 })),
  ...Array(13).fill(null).map((_, i) => ({ vh: `t${i}`, cid: 4, catid: 2 })),
  ...Array(16).fill(null).map((_, i) => ({ vh: `u${i}`, cid: 5, catid: 3 })),
  ...Array(7).fill(null).map((_, i) => ({ vh: `v${i}`, cid: 6, catid: 3 })),
];

const initials = (n) => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

const mapCategoryRow = (row) => ({
  id: row.id,
  name: row.name,
  desc: row.description ?? "",
  active: Boolean(row.active),
});

const mapCandidateRow = (row) => ({
  id: row.id,
  cat: row.category_id,
  name: row.name,
  pos: row.position ?? "",
  img: row.image_url ?? "",
  ci: row.color_index ?? 0,
});

const mapVoteRow = (row) => ({
  id: row.id,
  vh: row.voter_hash,
  cid: row.candidate_id,
  catid: row.category_id,
});

const Avatar = ({ name, img, size = 44, ci = 0 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: PALETTE[ci % PALETTE.length], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
    {img ? <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={name} /> : <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.3, fontFamily: "inherit" }}>{initials(name)}</span>}
  </div>
);

export default function SUGPoll() {
  const getPageFromPath = () => {
    if (typeof window === "undefined") return "vote";
    if (window.location.pathname === "/control") return "admin";
    if (window.location.pathname === "/results") return "results";
    return "vote";
  };

  const [page, setPage] = useState(getPageFromPath);
  const [cats, setCats] = useState(() => (isSupabaseConfigured ? [] : INIT_CATS));
  const [cands, setCands] = useState(() => (isSupabaseConfigured ? [] : INIT_CANDS));
  const [votes, setVotes] = useState(() => (isSupabaseConfigured ? [] : INIT_VOTES));
  const [myVotes, setMyVotes] = useState({});
  const [activeCatTab, setActiveCatTab] = useState(1);
  const [toast, setToast] = useState("");

  const [adminPass, setAdminPass] = useState("");
  const [adminIn, setAdminIn] = useState(false);
  const [adminErr, setAdminErr] = useState(false);
  const [atab, setAtab] = useState("overview");
  const [newCat, setNewCat] = useState({ name: "", desc: "" });
  const [newCand, setNewCand] = useState({ cat: "", name: "", pos: "", img: "" });
  const [newCandFile, setNewCandFile] = useState(null);
  const [nextId, setNextId] = useState(200);
  const [confirmReset, setConfirmReset] = useState(false);
  const [loadingData, setLoadingData] = useState(isSupabaseConfigured);
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    const onPopState = () => setPage(getPageFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoadingData(false);
      return;
    }

    let cancelled = false;

    const loadRemoteData = async () => {
      setLoadingData(true);
      setDbError("");

      const [categoriesResult, candidatesResult, votesResult] = await Promise.all([
        supabase.from("categories").select("id,name,description,active,sort_order").order("sort_order", { ascending: true }).order("id", { ascending: true }),
        supabase.from("candidates").select("id,category_id,name,position,image_url,color_index").order("id", { ascending: true }),
        supabase.from("votes").select("id,voter_hash,category_id,candidate_id").order("id", { ascending: true }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (candidatesResult.error) throw candidatesResult.error;
      if (votesResult.error) throw votesResult.error;

      if (cancelled) return;

      const remoteCategories = (categoriesResult.data ?? []).map(mapCategoryRow);
      const remoteCandidates = (candidatesResult.data ?? []).map(mapCandidateRow);
      const remoteVotes = (votesResult.data ?? []).map(mapVoteRow);

      setCats(remoteCategories.length ? remoteCategories : INIT_CATS);
      setCands(remoteCandidates.length ? remoteCandidates : INIT_CANDS);
      setVotes(remoteVotes); // Use actual data from Supabase, empty array means reset/no votes
      setMyVotes(
        remoteVotes.reduce((acc, vote) => {
          if (vote.vh === VOTER_ID) acc[vote.catid] = vote.cid;
          return acc;
        }, {})
      );
      setLoadingData(false);
    };

    loadRemoteData().catch((error) => {
      console.error(error);
      if (cancelled) return;
      setDbError("Supabase is not available, so the local demo data is being used.");
      setCats(INIT_CATS);
      setCands(INIT_CANDS);
      setVotes(INIT_VOTES);
      setMyVotes({});
      setLoadingData(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const goToPage = (nextPage) => {
    const nextPath = nextPage === "admin" ? "/control" : nextPage === "results" ? "/results" : "/";
    window.history.pushState({}, "", nextPath);
    setPage(nextPage);
  };

  const refreshRemoteData = async () => {
    if (!supabase) return;

    const [categoriesResult, candidatesResult, votesResult] = await Promise.all([
      supabase.from("categories").select("id,name,description,active,sort_order").order("sort_order", { ascending: true }).order("id", { ascending: true }),
      supabase.from("candidates").select("id,category_id,name,position,image_url,color_index").order("id", { ascending: true }),
      supabase.from("votes").select("id,voter_hash,category_id,candidate_id").order("id", { ascending: true }),
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (candidatesResult.error) throw candidatesResult.error;
    if (votesResult.error) throw votesResult.error;

    const remoteCategories = (categoriesResult.data ?? []).map(mapCategoryRow);
    const remoteCandidates = (candidatesResult.data ?? []).map(mapCandidateRow);
    const remoteVotes = (votesResult.data ?? []).map(mapVoteRow);

    setCats(remoteCategories.length ? remoteCategories : INIT_CATS);
    setCands(remoteCandidates.length ? remoteCandidates : INIT_CANDS);
    setVotes(remoteVotes); // Use actual data from Supabase, empty array means reset/no votes
    setMyVotes(
      remoteVotes.reduce((acc, vote) => {
        if (vote.vh === VOTER_ID) acc[vote.catid] = vote.cid;
        return acc;
      }, {})
    );
  };

  const adminRequest = async (action, payload = {}) => {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPass, action, payload }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Admin request failed");
    }

    return result.data ?? result;
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const getResults = (catId) => {
    const cc = cands.filter(c => c.cat === catId);
    const total = votes.filter(v => v.catid === catId).length;
    return cc.map(c => ({
      ...c,
      count: votes.filter(v => v.cid === c.id).length,
      pct: total ? Math.round((votes.filter(v => v.cid === c.id).length / total) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  };

  const handleVote = async (candId, catId) => {
    if (myVotes[catId]) return;

    try {
      if (supabase) {
        const { error } = await supabase.from("votes").insert({
          voter_hash: VOTER_ID,
          candidate_id: candId,
          category_id: catId,
        });

        if (error) throw error;
        await refreshRemoteData();
      } else {
        setVotes(v => [...v, { vh: VOTER_ID, cid: candId, catid: catId }]);
        setMyVotes(m => ({ ...m, [catId]: candId }));
      }

      showToast("Vote cast successfully ✓");
    } catch (error) {
      showToast(error?.message || "Unable to cast vote");
    }
  };

  const exportCSV = () => {
    const rows = [["Category", "Candidate", "Position", "Votes", "Percentage"]];
    cats.forEach(cat => getResults(cat.id).forEach(r => rows.push([cat.name, r.name, r.pos, r.count, r.pct + "%"])));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "sug-results.csv"; a.click();
  };

  const handleAdminLogin = async () => {
    if (!adminPass.trim()) {
      setAdminErr(true);
      return;
    }

    if (!supabase) {
      if (adminPass === ADMIN_PASSWORD) {
        setAdminIn(true);
        setAdminErr(false);
      } else {
        setAdminErr(true);
      }
      return;
    }

    try {
      await adminRequest("verify");
      setAdminIn(true);
      setAdminErr(false);
    } catch {
      setAdminErr(true);
    }
  };

  const uploadCandidateFile = async (file) => {
    if (!supabase || !file) return "";

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`.replace(/\s+/g, "-");
    const { error } = await supabase.storage.from("candidate-media").upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from("candidate-media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const S = {
    page: { minHeight: "100dvh", background: "#f0f2f5", fontFamily: "'DM Sans', sans-serif", color: "#0d2137" },
    shell: { width: "100%", minHeight: "100dvh", display: "flex", flexDirection: "column" },
    section: { width: "100%", maxWidth: 1120, margin: "0 auto" },
    header: { background: "#0d2137", padding: "0 16px", position: "sticky", top: 0, zIndex: 200 },
    headerInner: { maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, minHeight: 68, width: "100%" },
    navBtn: (active) => ({ padding: "7px 18px", border: "none", background: active ? "rgba(240,165,0,0.18)" : "transparent", color: active ? "#f0a500" : "rgba(255,255,255,0.55)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, transition: "all 0.15s" }),
    card: { background: "#fff", border: "1px solid #e8eaed", borderRadius: 14, color: "#0d2137" },
    btn: (variant = "primary") => ({
      padding: "10px 22px", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", transition: "opacity 0.15s",
      ...(variant === "primary" ? { background: "#0d2137", color: "#fff" } : {}),
      ...(variant === "gold" ? { background: "#f0a500", color: "#0d2137" } : {}),
      ...(variant === "ghost" ? { background: "transparent", border: "1px solid #d1d5db", color: "#374151" } : {}),
      ...(variant === "danger" ? { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } : {}),
    }),
    input: { padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8, fontFamily: "inherit", fontSize: 14, outline: "none", background: "#fff", width: "100%", color: "#0f172a", caretColor: "#0f172a", WebkitTextFillColor: "#0f172a", appearance: "none" },
    select: { padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8, fontFamily: "inherit", fontSize: 14, outline: "none", background: "#fff", width: "100%", color: "#0f172a", caretColor: "#0f172a", appearance: "none" },
    bar: (pct, color) => ({ height: 8, width: `${pct}%`, background: color, borderRadius: 8, transition: "width 1s ease" }),
    barBg: { background: "#f0f2f5", borderRadius: 8, height: 8, overflow: "hidden" },
  };

  // ── VOTE PAGE ──────────────────────────────────────────────────────────────
  const renderVotePage = () => {
    const activeCat = cats.find(c => c.id === activeCatTab);
    const catCands = cands.filter(c => c.cat === activeCatTab);
    const voted = myVotes[activeCatTab];
    const results = getResults(activeCatTab);
    const total = votes.filter(v => v.catid === activeCatTab).length;

    return (
      <div>
        {/* Hero */}
        <div style={{ background: "#0d2137", padding: "48px 16px 40px", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 15% 85%, rgba(240,165,0,0.12) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(240,165,0,0.07) 0%, transparent 55%)" }} />
          <p style={{ color: "#f0a500", fontSize: 11, letterSpacing: 5, textTransform: "uppercase", margin: "0 0 14px" }}>AAU Nightlife · Ekpoma</p>
          <h1 style={{ color: "#fff", fontSize: 38, fontFamily: "'Playfair Display', serif", fontWeight: 700, margin: "0 0 10px", lineHeight: 1.15 }}>Pre-Election Popularity Poll</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: "0 0 28px" }}>Vote once per category. Results update after voting.</p>
          <div style={{ display: "inline-flex", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(240,165,0,0.12)", border: "1px solid rgba(240,165,0,0.25)", borderRadius: 20, padding: "7px 18px" }}>
              <span style={{ width: 7, height: 7, background: "#f0a500", borderRadius: "50%", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#f0a500", fontSize: 13 }}>{cats.filter(c => c.active).length} categories active · {votes.length} votes cast</span>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ background: "#091929", borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto" }}>
          <div style={{ display: "flex", maxWidth: 1120, margin: "0 auto", padding: "0 16px", width: "100%" }}>
            {cats.map(cat => (
              <button key={cat.id} onClick={() => setActiveCatTab(cat.id)} style={{ padding: "13px 22px", border: "none", background: "transparent", color: activeCatTab === cat.id ? "#f0a500" : "rgba(255,255,255,0.4)", borderBottom: `2px solid ${activeCatTab === cat.id ? "#f0a500" : "transparent"}`, cursor: "pointer", fontSize: 14, fontWeight: activeCatTab === cat.id ? 600 : 400, whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                {cat.name}
                {!cat.active && <span style={{ fontSize: 9, background: "#7f1d1d", color: "#fca5a5", padding: "2px 7px", borderRadius: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>Closed</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Category content */}
        <div style={{ ...S.section, padding: "28px 16px 56px" }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, margin: "0 0 5px", color: "#0d2137" }}>{activeCat?.name}</h2>
            <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>{activeCat?.desc} · {total} votes so far</p>
          </div>

          {!activeCat?.active ? (
            <div style={{ ...S.card, padding: 40, textAlign: "center", borderTop: "3px solid #dc2626" }}>
              <div style={{ width: 52, height: 52, background: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 22 }}>🔒</div>
              <p style={{ fontWeight: 600, fontSize: 16, color: "#dc2626", margin: "0 0 6px" }}>Poll Closed</p>
              <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>Voting for this category has been paused by the admin.</p>
            </div>
          ) : voted ? (
            <div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, background: "#16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, flexShrink: 0 }}>✓</div>
                <div>
                  <p style={{ color: "#166534", fontWeight: 700, margin: 0, fontSize: 14 }}>Vote cast — your choice has been recorded</p>
                  <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>You voted for <strong>{cands.find(c => c.id === voted)?.name}</strong> in this category.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {results.map((r, i) => {
                  const isLeading = i === 0 && total > 0;
                  const isMyVote = r.id === voted;
                  return (
                    <div key={r.id} style={{ ...S.card, padding: "20px 24px", borderLeft: `4px solid ${isMyVote ? "#f0a500" : isLeading ? "#f0a500" : PALETTE[r.ci % PALETTE.length]}`, position: "relative" }}>
                      {isLeading && <span style={{ position: "absolute", top: 14, right: 16, fontSize: 11, color: "#f0a500", fontWeight: 700 }}>🏆 Leading</span>}
                      {isMyVote && !isLeading && <span style={{ position: "absolute", top: 14, right: 16, fontSize: 11, color: "#6b7280" }}>Your vote</span>}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                        <Avatar name={r.name} img={r.img} size={44} ci={r.ci} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, margin: "0 0 2px", color: "#0d2137" }}>{r.name}</p>
                          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{r.pos}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 28, fontWeight: 700, color: "#0d2137", margin: 0, lineHeight: 1 }}>{r.pct}%</p>
                          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{r.count} votes</p>
                        </div>
                      </div>
                      <div style={S.barBg}>
                        <div style={S.bar(r.pct, isLeading ? "#f0a500" : PALETTE[r.ci % PALETTE.length])} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 22 }}>
              {catCands.map(cand => (
                <div key={cand.id} style={{ ...S.card, overflow: "hidden" }}>
                  <div style={{ background: PALETTE[cand.ci % PALETTE.length], height: 170, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {cand.img ? (
                      <img src={cand.img} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} alt={cand.name} />
                    ) : (
                      <>
                        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.35)", marginBottom: 8 }}>
                          <span style={{ color: "#fff", fontSize: 26, fontWeight: 700 }}>{initials(cand.name)}</span>
                        </div>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>No Photo</p>
                      </>
                    )}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#f0a500" }} />
                  </div>
                  <div style={{ padding: "18px 18px 22px" }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: "#0d2137", margin: "0 0 4px", lineHeight: 1.3 }}>{cand.name}</p>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 18px" }}>{cand.pos}</p>
                    <button onClick={() => handleVote(cand.id, activeCatTab)} style={{ ...S.btn("primary"), width: "100%", padding: "11px 0", fontSize: 14 }}>
                      Cast Vote
                    </button>
                  </div>
                </div>
              ))}
              {catCands.length === 0 && <p style={{ color: "#9ca3af", fontSize: 14, padding: "24px 0" }}>No candidates added to this category yet.</p>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RESULTS PAGE ───────────────────────────────────────────────────────────
  const renderResults = () => (
    <div style={{ ...S.section, maxWidth: 820, padding: "28px 16px 56px" }}>
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#0d2137", margin: "0 0 6px" }}>Current Results</h2>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Real-time tallies · Auto-updated on every vote</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {cats.map(cat => {
          const results = getResults(cat.id);
          const total = votes.filter(v => v.catid === cat.id).length;
          const leader = results[0];
          return (
            <div key={cat.id} style={S.card}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f2f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: "0 0 3px", color: "#0d2137" }}>{cat.name}</h3>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{total} total votes</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 20, background: cat.active ? "#f0fdf4" : "#f9fafb", color: cat.active ? "#16a34a" : "#9ca3af", border: `1px solid ${cat.active ? "#bbf7d0" : "#e5e7eb"}` }}>
                  {cat.active ? "● Live" : "Closed"}
                </span>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {results.map((r, i) => (
                  <div key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <Avatar name={r.name} img={r.img} size={36} ci={r.ci} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#0d2137", flex: 1 }}>{r.name}</span>
                      {i === 0 && total > 0 && <span style={{ fontSize: 12, color: "#f0a500" }}>🏆</span>}
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#0d2137", minWidth: 38, textAlign: "right" }}>{r.pct}%</span>
                      <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 55, textAlign: "right" }}>{r.count} votes</span>
                    </div>
                    <div style={S.barBg}>
                      <div style={S.bar(r.pct, i === 0 ? "#f0a500" : PALETTE[r.ci % PALETTE.length])} />
                    </div>
                  </div>
                ))}
                {results.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>No candidates yet</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── ADMIN LOGIN ─────────────────────────────────────────────────────────────
  const renderLogin = () => (
    <div style={{ maxWidth: 420, margin: "40px auto 0", padding: "0 16px" }}>
      <div style={{ ...S.card, padding: "44px 36px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, background: "#0d2137", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 22 }}>🔐</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#0d2137", margin: "0 0 6px" }}>Admin Access</h2>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 30px" }}>Enter password to manage the poll</p>
        <input
          type="password" placeholder="Password" value={adminPass}
          onChange={e => { setAdminPass(e.target.value); setAdminErr(false); }}
          onKeyDown={e => { if (e.key === "Enter") { handleAdminLogin(); } }}
          style={{ ...S.input, marginBottom: 10, border: `1px solid ${adminErr ? "#ef4444" : "#e5e7eb"}` }}
        />
        {adminErr && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 10px" }}>Incorrect password.</p>}
        <button onClick={handleAdminLogin} style={{ ...S.btn("primary"), width: "100%", padding: "12px 0" }}>
          Login
        </button>
        {!supabase && <p style={{ fontSize: 12, color: "#d1d5db", margin: "18px 0 0" }}>Demo password: <strong>aau2025</strong></p>}
      </div>
    </div>
  );

  // ── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
  const renderAdmin = () => {
    const totalVotes = votes.length;
    const activePollsCount = cats.filter(c => c.active).length;

    const addCat = async () => {
      if (!newCat.name.trim()) return;

      try {
        if (supabase) {
          await adminRequest("add-category", { name: newCat.name, desc: newCat.desc });
          await refreshRemoteData();
        } else {
          setCats(p => [...p, { id: nextId, name: newCat.name, desc: newCat.desc, active: true }]);
          setNextId(n => n + 1);
        }

        setNewCat({ name: "", desc: "" });
        showToast("Category added!");
      } catch (error) {
        showToast(error?.message || "Unable to add category");
      }
    };
    const deleteCat = async (id) => {
      try {
        if (supabase) {
          await adminRequest("delete-category", { id });
          await refreshRemoteData();
        } else {
          setCats(c => c.filter(x => x.id !== id));
          setCands(c => c.filter(x => x.cat !== id));
          setVotes(v => v.filter(x => x.catid !== id));
        }
        showToast("Category deleted");
      } catch (error) {
        showToast(error?.message || "Unable to delete category");
      }
    };
    const toggleCat = async (id) => {
      const nextActive = !cats.find(x => x.id === id)?.active;

      try {
        if (supabase) {
          await adminRequest("toggle-category", { id, active: nextActive });
          await refreshRemoteData();
        } else {
          setCats(c => c.map(x => x.id === id ? { ...x, active: !x.active } : x));
        }
      } catch (error) {
        showToast(error?.message || "Unable to update category");
      }
    };

    const addCand = async () => {
      if (!newCand.name.trim() || !newCand.cat) { showToast("Fill all required fields"); return; }
      const catId = parseInt(newCand.cat);

      try {
        let imageUrl = newCand.img;
        if (newCandFile) {
          imageUrl = await uploadCandidateFile(newCandFile);
        }

        if (supabase) {
          const countInCat = cands.filter(c => c.cat === catId).length;
          await adminRequest("add-candidate", {
            category_id: catId,
            name: newCand.name,
            position: newCand.pos,
            image_url: imageUrl,
            color_index: countInCat % PALETTE.length,
          });
          await refreshRemoteData();
        } else {
          const countInCat = cands.filter(c => c.cat === catId).length;
          setCands(p => [...p, { id: nextId, cat: catId, name: newCand.name, pos: newCand.pos, img: imageUrl, ci: countInCat % PALETTE.length }]);
          setNextId(n => n + 1);
        }

        setNewCand(p => ({ ...p, name: "", pos: "", img: "", cat: p.cat }));
        setNewCandFile(null);
        showToast("Candidate added!");
      } catch (error) {
        showToast(error?.message || "Unable to add candidate");
      }
    };
    const deleteCand = async (id) => {
      try {
        if (supabase) {
          await adminRequest("delete-candidate", { id });
          await refreshRemoteData();
        } else {
          setCands(c => c.filter(x => x.id !== id));
          setVotes(v => v.filter(x => x.cid !== id));
        }
        showToast("Candidate removed");
      } catch (error) {
        showToast(error?.message || "Unable to remove candidate");
      }
    };

    const tabStyle = (t) => ({ padding: "9px 20px", border: "none", background: atab === t ? "#0d2137" : "transparent", color: atab === t ? "#fff" : "#6b7280", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: atab === t ? 600 : 400, transition: "all 0.15s", whiteSpace: "nowrap" });

    return (
      <div style={{ ...S.section, padding: "28px 16px 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#0d2137", margin: "0 0 4px" }}>Admin Dashboard</h2>
            <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Manage categories, candidates, and poll settings</p>
          </div>
          <button onClick={() => setAdminIn(false)} style={{ ...S.btn("ghost"), alignSelf: "flex-end" }}>Logout</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#e8eaed", borderRadius: 12, padding: 5, width: "100%", overflowX: "auto" }}>
          {["overview", "categories", "candidates", "monitor"].map(t => (
            <button key={t} onClick={() => setAtab(t)} style={tabStyle(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {atab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[{ label: "Total Votes Cast", val: totalVotes, accent: "#f0a500" }, { label: "Active Polls", val: activePollsCount, accent: "#16a34a" }, { label: "Total Categories", val: cats.length, accent: "#6366f1" }, { label: "Candidates", val: cands.length, accent: "#0d2137" }].map(s => (
                <div key={s.label} style={{ ...S.card, padding: "22px 24px", borderTop: `3px solid ${s.accent}` }}>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#0d2137", margin: 0 }}>{s.val}</p>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, padding: 24 }}>
              <p style={{ fontWeight: 600, fontSize: 15, color: "#0d2137", margin: "0 0 16px" }}>Quick Actions</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={exportCSV} style={S.btn("primary")}>Export CSV</button>
                <button onClick={() => setAtab("categories")} style={S.btn("ghost")}>Manage Categories</button>
                <button onClick={() => setAtab("candidates")} style={S.btn("ghost")}>Manage Candidates</button>
                <button onClick={() => setConfirmReset(true)} style={S.btn("danger")}>Reset All Votes</button>
              </div>
              {confirmReset && (
                <div style={{ marginTop: 18, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 18 }}>
                  <p style={{ color: "#dc2626", fontWeight: 600, fontSize: 14, margin: "0 0 14px" }}>⚠️ This will permanently delete all {votes.length} votes. Are you sure?</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={async () => {
                      try {
                        if (supabase) {
                          await adminRequest("reset-votes");
                          await refreshRemoteData();
                        } else {
                          setVotes([]); setMyVotes({});
                        }
                        setConfirmReset(false); showToast("All votes have been reset");
                      } catch (error) {
                        showToast(error?.message || "Unable to reset votes");
                      }
                    }} style={{ ...S.btn("danger"), background: "#dc2626", color: "#fff" }}>Yes, Reset Everything</button>
                    <button onClick={() => setConfirmReset(false)} style={S.btn("ghost")}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Categories ── */}
        {atab === "categories" && (
          <div>
            <div style={{ ...S.card, padding: 22, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 15, color: "#0d2137", margin: "0 0 16px" }}>Add New Category</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} placeholder="Category name (e.g. SUG President) *" style={{ ...S.input, flex: "1 1 220px" }} />
                <input value={newCat.desc} onChange={e => setNewCat(p => ({ ...p, desc: e.target.value }))} placeholder="Short description (optional)" style={{ ...S.input, flex: "2 1 280px" }} />
                <button onClick={addCat} style={S.btn("primary")}>Add Category</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cats.map(cat => {
                const vc = votes.filter(v => v.catid === cat.id).length;
                return (
                  <div key={cat.id} style={{ ...S.card, padding: "16px 22px", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.active ? "#16a34a" : "#d1d5db", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: "#0d2137", margin: "0 0 2px" }}>{cat.name}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{cat.desc} · {vc} votes · {cands.filter(c => c.cat === cat.id).length} candidates</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: cat.active ? "#16a34a" : "#9ca3af" }}>{cat.active ? "Active" : "Paused"}</span>
                      <div onClick={() => toggleCat(cat.id)} style={{ width: 46, height: 26, borderRadius: 13, background: cat.active ? "#16a34a" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: cat.active ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </div>
                    </div>
                    <button onClick={() => deleteCat(cat.id)} style={S.btn("danger")}>Delete</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Candidates ── */}
        {atab === "candidates" && (
          <div>
            <div style={{ ...S.card, padding: 22, marginBottom: 24 }}>
              <p style={{ fontWeight: 600, fontSize: 15, color: "#0d2137", margin: "0 0 16px" }}>Add New Candidate</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
                <select value={newCand.cat} onChange={e => setNewCand(p => ({ ...p, cat: e.target.value }))} style={{ ...S.select, cursor: "pointer" }}>
                  <option value="">Select category *</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={newCand.name} onChange={e => setNewCand(p => ({ ...p, name: e.target.value }))} placeholder="Full name *" style={S.input} />
                <input value={newCand.pos} onChange={e => setNewCand(p => ({ ...p, pos: e.target.value }))} placeholder="Position / title" style={S.input} />
                <input value={newCand.img} onChange={e => setNewCand(p => ({ ...p, img: e.target.value }))} placeholder="Photo/Flyer URL (optional)" style={S.input} />
                <input type="file" accept="image/*" onChange={e => setNewCandFile(e.target.files?.[0] ?? null)} style={{ ...S.input, padding: "8px 12px" }} />
              </div>
              <button onClick={addCand} style={S.btn("primary")}>Add Candidate</button>
            </div>

            {cats.map(cat => {
              const cc = cands.filter(c => c.cat === cat.id);
              if (!cc.length) return null;
              return (
                <div key={cat.id} style={{ marginBottom: 24 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px", paddingLeft: 2 }}>{cat.name}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cc.map(cand => (
                      <div key={cand.id} style={{ ...S.card, padding: "13px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar name={cand.name} img={cand.img} size={38} ci={cand.ci} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: "#0d2137", margin: "0 0 2px" }}>{cand.name}</p>
                          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{cand.pos} · {votes.filter(v => v.cid === cand.id).length} votes</p>
                        </div>
                        {cand.img && <img src={cand.img} style={{ height: 38, width: 38, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }} alt="" onError={e => e.target.style.display = "none"} />}
                        <button onClick={() => deleteCand(cand.id)} style={S.btn("danger")}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Monitor ── */}
        {atab === "monitor" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 20 }}>
              <button onClick={exportCSV} style={S.btn("primary")}>Export CSV</button>
              <button onClick={() => setConfirmReset(true)} style={S.btn("danger")}>Reset Votes</button>
            </div>
            {confirmReset && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 18, marginBottom: 20 }}>
                <p style={{ color: "#dc2626", fontWeight: 600, fontSize: 14, margin: "0 0 14px" }}>⚠️ Delete all {votes.length} votes permanently?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setVotes([]); setMyVotes({}); setConfirmReset(false); showToast("All votes reset"); }} style={{ ...S.btn("danger"), background: "#dc2626", color: "#fff" }}>Confirm Reset</button>
                  <button onClick={() => setConfirmReset(false)} style={S.btn("ghost")}>Cancel</button>
                </div>
              </div>
            )}
            {cats.map(cat => {
              const results = getResults(cat.id);
              const total = votes.filter(v => v.catid === cat.id).length;
              return (
                <div key={cat.id} style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ padding: "14px 22px", background: "#f8fafc", borderBottom: "1px solid #e8eaed", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#0d2137" }}>{cat.name}</span>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>{total} votes</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: "#f8fafc" }}>
                      {["Candidate", "Position", "Votes", "Share"].map(h => <th key={h} style={{ fontFamily: "inherit", fontSize: 12, color: "#6b7280", fontWeight: 600, padding: "10px 22px", textAlign: "left", borderBottom: "1px solid #e8eaed" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                          <td style={{ padding: "13px 22px", fontSize: 14, color: "#0d2137", fontWeight: i === 0 && total > 0 ? 700 : 400 }}>{i === 0 && total > 0 ? "🏆 " : ""}{r.name}</td>
                          <td style={{ padding: "13px 22px", fontSize: 13, color: "#6b7280" }}>{r.pos}</td>
                          <td style={{ padding: "13px 22px", fontSize: 14, color: "#0d2137", fontWeight: 600 }}>{r.count}</td>
                          <td style={{ padding: "13px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ flex: 1, ...S.barBg, height: 6 }}><div style={{ ...S.bar(r.pct, i === 0 ? "#f0a500" : PALETTE[r.ci % PALETTE.length]), height: 6 }} /></div>
                              <span style={{ fontSize: 12, color: "#6b7280", minWidth: 34 }}>{r.pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {results.length === 0 && <tr><td colSpan={4} style={{ padding: "18px 22px", color: "#9ca3af", fontSize: 13 }}>No candidates yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: "#0d2137", color: "#fff", padding: "13px 22px", borderRadius: 12, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, background: "#f0a500", borderRadius: "50%", display: "inline-block" }} />
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <img src="/Nightlife%20logo.jpg" alt="AAU Nightlife logo" style={{ width: 38, height: 38, borderRadius: 9, objectFit: "cover", flexShrink: 0, background: "#f0a500" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1 }}>AAU NIGHTLIFE</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, margin: 0, lineHeight: 1.05, whiteSpace: "nowrap" }}>Ambrose Alli University</p>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {[{ k: "vote", l: "Vote" }, { k: "results", l: "Results" }].map(({ k, l }) => (
              <button key={k} onClick={() => goToPage(k)} style={S.navBtn(page === k)}>{l}</button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, width: "100%" }}>
        {loadingData && supabase && (
          <div style={{ margin: "16px auto 0", maxWidth: 1120, padding: "0 16px" }}>
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 12, padding: "10px 14px", fontSize: 13, textAlign: "left" }}>
              Loading live Supabase data...
            </div>
          </div>
        )}
        {dbError && (
          <div style={{ margin: "16px auto 0", maxWidth: 1120, padding: "0 16px" }}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: 12, padding: "10px 14px", fontSize: 13, textAlign: "left" }}>
              {dbError}
            </div>
          </div>
        )}
        {page === "vote" && renderVotePage()}
        {page === "results" && renderResults()}
        {page === "admin" && (adminIn ? renderAdmin() : renderLogin())}
      </main>

      <footer style={{ background: "#091929", padding: "22px 28px", marginTop: 40, textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
          AAU Nightlife Pre-Election Popularity Poll · Ambrose Alli University, Ekpoma · {new Date().getFullYear()}
        </p>
      </footer>
      </div>
    </div>
  );
}