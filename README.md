# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/5713aabc-9ba0-4d47-b00d-a5e9fc50efc7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5713aabc-9ba0-4d47-b00d-a5e9fc50efc7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment variables

Create a `.env` (or `.env.local`) in the project root before running the dev server:

```bash
VITE_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=book_snap_shelf
```

- `VITE_GOOGLE_BOOKS_API_KEY` powers the ISBN lookup flow (Google Books API).  
  Without a key the lookup still works, but Google enforces a tiny anonymous quota.
- `MONGODB_URI` should point to the cluster you provisioned via the MCP MongoDB server (or Atlas/local).  
  A typical value looks like `mongodb+srv://<user>:<password>@cluster.example.mongodb.net`.
- `MONGODB_DB_NAME` defaults to `book_snap_shelf`; override it if you created a different database name.

### MongoDB setup

The API stores books in the `books` collection inside the configured database.  
Each document looks like:

```jsonc
{
  "_id": ObjectId,
  "user_id": "00000000-0000-0000-0000-000000000001",
  "title": "Book title",
  "author": "Author Name",
  "isbn": "978...",
  "cover_url": "https://...",
  "year": "2024",
  "publisher": "Publisher",
  "genre": "Fantasy",
  "description": "Optional summary",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

Create the `book_snap_shelf` database and an empty `books` collection in your MongoDB cluster (e.g., via the MCP server or Compass). The Vercel API routes will automatically handle inserts/updates/deletes once the collection exists.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5713aabc-9ba0-4d47-b00d-a5e9fc50efc7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
