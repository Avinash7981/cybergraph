# CYBERGRAPH — Network Intrusion Path Analysis

A technically correct, data-driven graph-analysis platform for modelling and analysing network intrusion paths using BFS, DFS, and Dijkstra — implemented from scratch for a DAA hackathon.

> **Design principle:** REAL DATA → REAL GRAPH → REAL ALGORITHM → REAL RESULT  
> Every metric displayed is computed from the actual database. No fake data, no hardcoded numbers.

---

## Technology Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Frontend   | React 18, TypeScript, Vite  |
| Styling    | Tailwind CSS v4, Custom CSS Design System |
| Graph UI   | @xyflow/react (React Flow)  |
| Backend    | Node.js, Express, TypeScript |
| Database   | PostgreSQL                  |
| ORM        | Prisma 5                    |
| Testing    | Vitest                      |

---

## Project Structure

```
cybergraph/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── NodeForm.tsx     # Node add/edit modal with validation
│   │   │   └── EdgeForm.tsx     # Edge add/edit modal with validation
│   │   ├── graph/
│   │   │   ├── CyberNode.tsx    # Custom React Flow node renderer
│   │   │   ├── NetworkGraph.tsx # React Flow canvas (display only)
│   │   │   └── toReactFlow.ts   # DB data → React Flow format adapter
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── BuilderPage.tsx
│   │   │   └── AnalysisPage.tsx
│   │   ├── services/
│   │   │   └── api.ts           # All backend API calls
│   │   └── types/
│   │       └── index.ts         # Application-level types
│   └── vite.config.ts
│
└── server/                      # Express API server
    ├── src/
    │   ├── algorithms/          # Pure algorithm code (no HTTP, no DB)
    │   │   ├── types.ts         # Graph types
    │   │   ├── graph.ts         # Adjacency list builder
    │   │   ├── bfs.ts           # BFS implementation
    │   │   ├── dfs.ts           # DFS implementation
    │   │   ├── dijkstra.ts      # Dijkstra + MinHeap implementation
    │   │   └── pathReconstruction.ts
    │   ├── controllers/
    │   │   ├── networkController.ts
    │   │   ├── nodeController.ts
    │   │   ├── edgeController.ts
    │   │   └── analysisController.ts
    │   ├── routes/
    │   │   ├── networks.ts
    │   │   └── analysis.ts
    │   └── services/
    │       └── prisma.ts
    ├── prisma/
    │   └── schema.prisma
    └── tests/
        └── algorithms.test.ts   # 17 unit tests
```

---

## Setup Instructions

### Prerequisites

- Node.js ≥ 18
- PostgreSQL (running locally)
- npm ≥ 9

### 1. Database Setup

```bash
# Create the database
psql postgres -c "CREATE DATABASE cybergraph;"
```

### 2. Server Setup

```bash
cd server
npm install
```

Create `.env` file in `server/`:
```
DATABASE_URL="postgresql://<YOUR_USER>@localhost:5432/cybergraph"
PORT=3001
```

Replace `<YOUR_USER>` with your PostgreSQL username (run `psql postgres -c "SELECT current_user;"` to find it).

```bash
# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 3. Client Setup

```bash
cd client
npm install
```

---

## Running the Application

### Backend (port 3001)

```bash
cd server
npm run dev
```

### Frontend (port 5173)

```bash
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Running Tests

```bash
cd server
npm test
```

Output: 17 tests across 4 suites — all pass.

```
✓ BFS (5 tests)
✓ DFS (4 tests)
✓ Dijkstra (6 tests)
✓ reconstructPath (2 tests)
```

---

## Environment Variables

| Variable       | Location         | Description              |
|----------------|------------------|--------------------------|
| `DATABASE_URL` | `server/.env`    | PostgreSQL connection URL |
| `PORT`         | `server/.env`    | API server port (default 3001) |

---

## API Reference

### Networks

| Method | Path                               | Description         |
|--------|------------------------------------|---------------------|
| GET    | `/api/networks`                    | List all networks   |
| POST   | `/api/networks`                    | Create network      |
| GET    | `/api/networks/:id`                | Get network + nodes + edges |
| PUT    | `/api/networks/:id`                | Update network      |
| DELETE | `/api/networks/:id`                | Delete network      |
| GET    | `/api/networks/:id/export`         | Export as JSON      |

### Nodes

| Method | Path                                          | Description  |
|--------|-----------------------------------------------|--------------|
| GET    | `/api/networks/:networkId/nodes`              | List nodes   |
| POST   | `/api/networks/:networkId/nodes`              | Add node     |
| PUT    | `/api/networks/:networkId/nodes/:nodeId`      | Update node  |
| DELETE | `/api/networks/:networkId/nodes/:nodeId`      | Delete node  |

### Edges

| Method | Path                                          | Description  |
|--------|-----------------------------------------------|--------------|
| GET    | `/api/networks/:networkId/edges`              | List edges   |
| POST   | `/api/networks/:networkId/edges`              | Add edge     |
| PUT    | `/api/networks/:networkId/edges/:edgeId`      | Update edge  |
| DELETE | `/api/networks/:networkId/edges/:edgeId`      | Delete edge  |

### Analysis

| Method | Path                      | Body                                             |
|--------|---------------------------|--------------------------------------------------|
| POST   | `/api/analysis/bfs`       | `{ networkId, sourceNodeId }`                    |
| POST   | `/api/analysis/dfs`       | `{ networkId, sourceNodeId }`                    |
| POST   | `/api/analysis/dijkstra`  | `{ networkId, sourceNodeId, targetNodeId }`      |
| POST   | `/api/analysis/compare`   | `{ networkId, sourceNodeId, targetNodeId }`      |

---

## Algorithm Explanations

### BFS — Breadth-First Search

Explores the graph level by level using a **FIFO queue**. Finds the path with the fewest hops (unweighted shortest path).

**Implementation:** `server/src/algorithms/bfs.ts`

- Uses a queue (JavaScript array with `push`/`shift`)
- Tracks `visited` set to avoid revisiting nodes
- Records `parent` map for path reconstruction
- Returns: traversal order, visited nodes, parent relationships

| Complexity | Value   |
|------------|---------|
| Time       | O(V + E) |
| Space      | O(V)    |

### DFS — Depth-First Search

Explores as deep as possible before backtracking. Uses an **explicit stack** (iterative, no recursion) to handle large graphs without stack overflow.

**Implementation:** `server/src/algorithms/dfs.ts`

- Pushes neighbors in reverse order for consistent traversal
- Skips already-visited nodes when popped from stack
- Returns: traversal order, visited nodes, parent relationships

| Complexity | Value   |
|------------|---------|
| Time       | O(V + E) |
| Space      | O(V)    |

### Dijkstra's Shortest Path

Finds the minimum-cost weighted path from source to target using a **custom binary min-heap** as the priority queue.

**Implementation:** `server/src/algorithms/dijkstra.ts`

- `MinHeap` class with O(log n) insert and extract-min
- Lazy deletion for stale priority queue entries
- Early exit when target is dequeued
- Validates all edge costs are non-negative before running
- Returns: shortest path, total cost, visited nodes, distance map

| Complexity       | Value            |
|------------------|------------------|
| Time (binary heap)| O((V + E) log V) |
| Space            | O(V)             |

### Path Reconstruction

**Implementation:** `server/src/algorithms/pathReconstruction.ts`

Given the `previous[node]` map produced by BFS/Dijkstra, reconstructs the path from source to target by walking backwards. Returns `reachable: false` with empty path if target is unreachable (distance = Infinity).

---

## Data Model

### Network
- `id`, `name`, `description`, `createdAt`, `updatedAt`

### Node
- `id`, `networkId`, `name`, `type`, `criticality`, `vulnerabilityScore`, `positionX`, `positionY`
- **Types:** INTERNET, ROUTER, FIREWALL, SERVER, DATABASE, WORKSTATION, IOT, CLOUD, ENDPOINT
- **Criticality:** LOW, MEDIUM, HIGH, CRITICAL
- **vulnerabilityScore:** 0–10 (user-provided, never generated)

### Edge
- `id`, `networkId`, `sourceNodeId`, `targetNodeId`, `cost`, `risk`, `directed`, `status`
- **Status:** ACTIVE, ISOLATED
- **cost:** positive number (user-provided)
- **risk:** 0–10 (user-provided)

---

## Visual Identity

The application uses the **CyberGraph Industrial Security Console** aesthetic:

| Token           | Value     |
|-----------------|-----------|
| Background      | `#11100E` |
| Surface         | `#191714` |
| Border          | `#302A24` |
| Burnt Copper    | `#B66A3C` |
| Light Copper    | `#D18A57` |
| Warm Ivory      | `#E8E1D8` |
| Muted Text      | `#91887E` |
| Threat Red      | `#C94A45` |
| Healthy Olive   | `#71856A` |

Fonts: IBM Plex Mono (monospace) + Inter (sans-serif)

**No blue, no purple, no cyan, no AI glow effects.**

---

## Phase 1 Status

| Requirement                              | Status  |
|------------------------------------------|---------|
| Application starts successfully          | ✅      |
| PostgreSQL connection works              | ✅      |
| Prisma schema works                      | ✅      |
| User can create a network               | ✅      |
| User can add nodes                       | ✅      |
| User can edit nodes                      | ✅      |
| User can delete nodes                    | ✅      |
| User can create edges                    | ✅      |
| User can edit edges                      | ✅      |
| User can delete edges                    | ✅      |
| Graph renders from real database data    | ✅      |
| BFS works on actual graph                | ✅      |
| DFS works on actual graph                | ✅      |
| Dijkstra works on actual weighted graph  | ✅      |
| Path reconstruction works               | ✅      |
| Unreachable targets handled correctly    | ✅      |
| No dummy network exists                  | ✅      |
| No hardcoded metrics                     | ✅      |
| Page refresh preserves data              | ✅      |
| Unit tests pass (17/17)                  | ✅      |
| API validation works                     | ✅      |
| No blue/purple/cyan primary palette      | ✅      |
| Charcoal + copper visual identity        | ✅      |

## Known Limitations / Phase 2+

- Node drag position persistence (position save call is made but layout resets on re-fetch due to React Flow state sync)
- No import functionality yet (only export)
- No authentication layer
- No AI explanations, real-time monitoring, PDF reports
- No attack simulation
