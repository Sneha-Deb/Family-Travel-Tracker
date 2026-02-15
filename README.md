# 🌍 Family Travel Tracker

A dynamic full-stack web application that allows family members to track their global travels. Each member gets a personalized profile with a unique color theme, and the world map updates in real-time as countries are added or removed.

## 🚀 Features

- **Multi-User Profiles:** Add family members with custom color themes (Red, Blue, Green, etc.).
- **Interactive SVG Map:** The map visually highlights visited countries using the user's specific color.
- **Smart Search:** Add countries by name with a backend search that maps names to ISO country codes.
- **Click-to-Remove:** Remove a visited country simply by clicking it directly on the map.
- **Data Persistence:** Powered by a PostgreSQL database to ensure your travel history is never lost.

---

## 🏗️ Architecture

The app follows a classic **Model-View-Controller (MVC)** pattern:

- **Frontend:** EJS (Embedded JavaScript) templates and CSS for styling.
- **Backend:** Node.js with Express.js handling RESTful routing.
- **Database:** PostgreSQL for relational data management.

---

## 🛠️ Installation & Setup

### 1. Database Configuration

Run the following commands in your PostgreSQL tool (like pgAdmin or psql) to set up the schema:

SQL

```
CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  name VARCHAR(15) UNIQUE NOT NULL,
  color VARCHAR(15)
);

CREATE TABLE updated_countries(
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  country_name VARCHAR(100)
);

CREATE TABLE visited_countries(
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(country_code, user_id)
);

```

### 2. Environment Variables

Create a `.env` file in the root directory:

Code snippet

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=your _DatabaseName_ here
DB_PASSWORD=your_password_here
DB_PORT=5432
APP_PORT=3000

```

### 3. Install Dependencies

Bash

```
npm install

```

### 4. Run the App

Bash

```
npm start

```

The app will be available at `http://localhost:3000`.

---

## 💡 Technical Implementation Details

### **SVG-Database Synchronization**

The core of the application relies on the `country_code` (ISO 3166-1 alpha-2). The `id` of each `<path>` in the SVG map corresponds exactly to the `country_code` stored in the `updated_countries` table.

### **The "India" Bug Fix**

In the original dataset, a search for "India" would sometimes return "British Indian Ocean Territory" (IO) because it contained the word "India". **Solution:** The database was pruned to match only the countries present in the SVG map, and the query logic was refined to prioritize exact matches and handle case-insensitivity using `LOWER()`.

### **User Context Switching**

When switching between users (Family Members), the app updates the `currentUserId`. The `checkVisited` function then performs a **JOIN** query to fetch only the countries visited by that specific ID:

JavaScript

```
"SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1"

```

---

## 🛡️ Future Enhancements

- [ ] **Statistics Page:** Display the percentage of the world each family member has covered.
- [ ] **Photo Gallery:** Upload a photo for each visited country.
- [ ] **Mobile Optimization:** Fully responsive design for tracking travels on the go.
