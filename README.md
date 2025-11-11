#  Real-Time Collaborative Drawing Canvas

### Assignment Overview
This project implements a multi-user, real-time drawing application using **Vanilla JavaScript** (with HTML5 Canvas) and **Node.js** with **Socket.io**. The core challenge was achieving seamless, low-latency state synchronization and implementing a globally consistent undo/redo history.

---

##  Setup & Installation

This project requires Node.js and npm.

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd collaborative-canvas
```
```
2. Install Dependencies

npm install
```
```
3. Start the Server

npm start
```

The server will start on http://localhost:3000.

4. How to Test with Multiple Users
Open http://localhost:3000 in your primary browser (e.g., Chrome).

Open the same URL in a separate Incognito/Private Window OR a different browser (e.g., Firefox).

Both windows represent separate users. The Online: list should update immediately.

Test drawing, cursor movement, and the global undo feature across the two windows simultaneously.
