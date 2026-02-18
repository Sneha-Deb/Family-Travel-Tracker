import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

const port = process.env.PORT || process.env.APP_PORT || 3000;

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("DB connection failed", err);
    process.exit(1);
  } else {
    console.log("Database Connected");
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* Basic Production Protection */
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    if (req.method !== "GET") {
      const secret = req.headers["x-admin-key"];
      if (secret !== process.env.ADMIN_KEY) {
        return res.status(403).send("Demo Mode - Write access disabled");
      }
    }
  }
  next();
});

let currentUserId = 1;

async function checkVisited(userId) {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1",
    [userId],
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getAllUsers() {
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [
    currentUserId,
  ]);
  return result.rows[0];
}

// Default route
app.get("/", async (req, res) => {
  const error = req.query.error || null;
  const users = await getAllUsers();

  if (users.length === 0) {
    currentUserId = null;
    return res.render("index.ejs", {
      countries: [],
      total: 0,
      users,
      currentUser: null,
      color: "#000000",
      error,
    });
  }

  const userExists = users.find((user) => user.id === currentUserId);

  if (!userExists) {
    currentUserId = users[0].id;
  }

  const currentUser = users.find((u) => u.id === currentUserId);
  const countries = await checkVisited(currentUser.id);

  return res.render("index.ejs", {
    countries,
    total: countries.length,
    users,
    currentUser,
    color: currentUser?.color || "#000000",
    error,
  });
});

// route to add countries
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  if (!input || input.trim() === "") {
    return res.redirect("/?error=Invalid Input");
  }

  const currentUser = await getCurrentUser();
  try {
    const result = await db.query(
      "SELECT country_code FROM updated_countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return res.redirect("/?error=Country not found");
    }

    const data = result.rows[0];
    console.log(data);
    const countryCode = data.country_code;
    console.log(countryCode);
    try {
      const insertResult = await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2) ON CONFLICT (country_code, user_id) DO NOTHING RETURNING *",
        [countryCode, currentUser.id],
      );

      if (insertResult.rows.length === 0) {
        return res.redirect("/?error=Country already exist");
      }

      res.redirect("/");
    } catch (err) {
      console.log(err);
      return res.redirect("/Internal Server Error");
    }
  } catch (err) {
    console.log(err);
    return res.redirect("/?error=Internal Server Error");
  }
});

// route to render new user page
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = Number(req.body.user);
    res.redirect("/");
  }
});

// route to add new user
app.post("/new", async (req, res) => {
  //The RETURNING keyword can return the data that was inserted.
  const newUser = req.body.name;
  let color = req.body.color;

  if (newUser.trim() === "") {
    return res.redirect("/?error=Enter a name");
  }

  if (!color) {
    color = "#c1c1be";
  }

  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *;",
      [newUser, color],
    );

    currentUserId = result.rows[0].id;

    res.redirect("/");
  } catch (err) {
    console.log(err);
    if (err.code === "23505") {
      return res.redirect("/?error=User already exists");
    }
    return res.redirect("/?error=Something went wrong");
  }
});

// route to delete a user
app.post("/delete/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.redirect("/?error=Invalid id");
  }

  try {
    await db.query("DELETE FROM visited_countries WHERE user_id = $1", [id]);

    const result = await db.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.redirect("/?error=No user found");
    }

    if (currentUserId === id) {
      const fallback = await db.query("SELECT id FROM users LIMIT 1");
      currentUserId = fallback.rows[0]?.id || null;
    }

    res.redirect("/");
  } catch (err) {
    console.error(err);
    return res.redirect("/?error=Internal Server Error");
  }
});

// route to remove visited country
app.post("/remove", async (req, res) => {
  const { countryCode, userId } = req.body;

  if (!countryCode || !userId) {
    return res.redirect("/?error=Invalid Data");
  }

  try {
    await db.query(
      "DELETE FROM visited_countries WHERE country_code = $1 AND user_id = $2",
      [countryCode, userId],
    );

    res.status(200).json({ message: "Success" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
