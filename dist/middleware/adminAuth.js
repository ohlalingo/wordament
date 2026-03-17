import { db } from "../db.js";
// Admin guard: prefer shared admin token, fall back to user id check.
export async function adminAuth(req, res, next) {
    // Allow AdminJS internal API (resources, dashboard) to be handled by its own auth/session middleware.
    const path = req.path || "";
    if (path.startsWith("/resources") || path.startsWith("/dashboard")) {
        return next();
    }
    // If AdminJS session is present, allow
    // (buildAuthenticatedRouter sets req.session.adminUser)
    const sessionUser = req?.session?.adminUser;
    if (sessionUser)
        return next();
    const token = req.header("x-admin-token");
    if (token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) {
        return next();
    }
    const userId = Number(req.header("x-user-id"));
    if (!userId) {
        return res.status(401).json({ error: "Missing x-user-id or x-admin-token header" });
    }
    try {
        const { rows } = await db.query("SELECT role FROM users WHERE id = $1", [userId]);
        if (!rows.length)
            return res.status(401).json({ error: "User not found" });
        // If role column exists and is set, enforce admin; otherwise allow (legacy schema)
        if (rows[0].hasOwnProperty("role") && rows[0].role && rows[0].role !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }
        return next();
    }
    catch (err) {
        if (err?.code === "42703") {
            console.warn("adminAuth: role column missing, allowing access");
            return next();
        }
        console.error("adminAuth error", err);
        return res.status(500).json({ error: "Auth check failed" });
    }
}
