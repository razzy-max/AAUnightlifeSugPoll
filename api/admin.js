import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.ADMIN_ACCESS_PASSWORD;

console.log("🔐 Admin API loaded - password set:", !!adminPassword);

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const json = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const readBody = async (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
};

export default async function handler(req, res) {
  if (!supabase || !adminPassword) {
    return res.status(500).json({ error: "Server is missing Supabase or admin configuration." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = await readBody(req);
  const { password, action, payload = {} } = body;

  console.log("🔓 Password check:", { received: !!password, expected: !!adminPassword, match: password === adminPassword });

  if (password !== adminPassword) {
    return res.status(401).json({ error: "Invalid admin password" });
  }

  try {
    switch (action) {
      case "verify":
        return res.status(200).json({ ok: true });

      case "add-category": {
        const { data, error } = await supabase
          .from("categories")
          .insert({
            name: payload.name,
            desc: payload.desc || "",
            active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case "toggle-category": {
        const { data, error } = await supabase
          .from("categories")
          .update({ active: payload.active })
          .eq("id", payload.id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case "delete-category": {
        const { error } = await supabase.from("categories").delete().eq("id", payload.id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      case "add-candidate": {
        const { data, error } = await supabase
          .from("candidates")
          .insert({
            category_id: payload.category_id,
            name: payload.name,
            position: payload.position || "",
            image_url: payload.image_url || "",
            color_index: payload.color_index ?? 0,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ data });
      }

      case "delete-candidate": {
        const { error } = await supabase.from("candidates").delete().eq("id", payload.id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      case "reset-votes": {
        const { error } = await supabase.from("votes").delete().neq("id", 0);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unknown error" });
  }
}
